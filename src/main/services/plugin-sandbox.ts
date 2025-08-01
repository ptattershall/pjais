import * as vm from 'vm'
import { SecurityEventLogger } from './security-event-logger'
import { PluginManifest } from '../../shared/types/plugin'
import * as fs from 'fs/promises'

export interface SandboxConfig {
  maxMemoryMB: number
  maxExecutionTimeMs: number
  maxCpuUsagePercent: number
  allowedModules: string[]
  enableNetworking: boolean
  enableFileSystemAccess: boolean
  maxFileSize: number
  tempDirectory: string
}

export interface ResourceUsage {
  memoryUsageMB: number
  cpuUsagePercent: number
  executionTimeMs: number
  networkRequests: number
  fileOperations: number
}

export interface SandboxResult<T = any> {
  success: boolean
  result?: T
  error?: string
  resourceUsage: ResourceUsage
  securityViolations: string[]
}

export class PluginSandbox {
  private config: SandboxConfig
  private eventLogger: SecurityEventLogger
  private activeExecutions = new Map<string, { startTime: number }>()
  private resourceMonitor: NodeJS.Timeout | null = null

  constructor(config: SandboxConfig, eventLogger: SecurityEventLogger) {
    this.config = config
    this.eventLogger = eventLogger
  }

  async initialize(): Promise<void> {
    // Ensure temp directory exists
    await fs.mkdir(this.config.tempDirectory, { recursive: true })
    
    // Start resource monitoring
    this.startResourceMonitoring()
    
    this.eventLogger.log({
      type: 'security',
      severity: 'low',
      description: 'Plugin sandbox initialized',
      timestamp: new Date(),
      details: {
        maxMemoryMB: this.config.maxMemoryMB,
        maxExecutionTimeMs: this.config.maxExecutionTimeMs,
        allowedModules: this.config.allowedModules.length
      }
    })
  }

  async executePlugin(
    pluginId: string,
    pluginCode: string,
    manifest: PluginManifest,
    context: any = {}
  ): Promise<SandboxResult> {
    const executionId = `${pluginId}_${Date.now()}`
    const startTime = Date.now()
    
    // Track execution
    this.activeExecutions.set(executionId, { startTime })
    
    try {
      // Validate permissions
      const permissionCheck = this.validatePermissions(manifest)
      if (!permissionCheck.allowed) {
        return {
          success: false,
          error: `Permission denied: ${permissionCheck.reason}`,
          resourceUsage: this.createEmptyResourceUsage(),
          securityViolations: [permissionCheck.reason]
        }
      }

      // Create secure execution context
      const sandboxContext = this.createSandboxContext(manifest, context)
      
      // Execute in VM with timeout
      const result = await this.executeInVM(pluginCode, sandboxContext, this.config.maxExecutionTimeMs)
      
      const executionTime = Date.now() - startTime
      const resourceUsage = await this.getResourceUsage(executionTime)
      
      // Check resource violations
      const violations = this.checkResourceViolations(resourceUsage)
      
      this.eventLogger.log({
        type: 'security',
        severity: violations.length > 0 ? 'high' : 'low',
        description: `Plugin execution completed: ${pluginId}`,
        timestamp: new Date(),
        details: {
          pluginId,
          executionTimeMs: executionTime,
          memoryUsageMB: resourceUsage.memoryUsageMB,
          violations: violations.length
        }
      })

      return {
        success: true,
        result,
        resourceUsage,
        securityViolations: violations
      }
      
    } catch (error) {
      const executionTime = Date.now() - startTime
      const resourceUsage = await this.getResourceUsage(executionTime)
      
      this.eventLogger.log({
        type: 'security',
        severity: 'high',
        description: `Plugin execution failed: ${pluginId}`,
        timestamp: new Date(),
        details: {
          pluginId,
          error: error instanceof Error ? error.message : String(error),
          executionTimeMs: executionTime
        }
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        resourceUsage,
        securityViolations: ['execution_error']
      }
      
    } finally {
      this.activeExecutions.delete(executionId)
    }
  }

  private validatePermissions(manifest: PluginManifest): { allowed: boolean; reason: string } {
    // Check required permissions against sandbox config
    for (const [permission, required] of Object.entries(manifest.permissions)) {
      if (!required) continue // Skip permissions that are not required
      
      switch (permission) {
        case 'network':
          if (!this.config.enableNetworking) {
            return { allowed: false, reason: 'Network access not permitted' }
          }
          break
          
        case 'filesystem':
          if (!this.config.enableFileSystemAccess) {
            return { allowed: false, reason: 'File system access not permitted' }
          }
          break
          
        case 'memory_access':
          // Always require explicit approval for memory access
          return { allowed: false, reason: 'Memory access requires elevated permissions' }
          
        default:
          // Unknown permission
          return { allowed: false, reason: `Unknown permission: ${permission}` }
      }
    }
    
    return { allowed: true, reason: '' }
  }

  private createSandboxContext(manifest: PluginManifest, userContext: any): any {
    // Create minimal, secure context for plugin execution
    const sandboxContext = {
      // Safe globals
      console: {
        log: (...args: any[]) => this.sandboxLog('log', args),
        warn: (...args: any[]) => this.sandboxLog('warn', args),
        error: (...args: any[]) => this.sandboxLog('error', args)
      },
      
      // User-provided context (sanitized)
      context: this.sanitizeContext(userContext),
      
      // Plugin metadata
      manifest: {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version
      },
      
      // Restricted require function
      require: this.createRestrictedRequire(manifest.permissions),
      
      // Timeout helpers
      setTimeout: (fn: () => void, delay: number) => {
        if (delay > 5000) delay = 5000 // Max 5 second timeout
        return setTimeout(fn, delay)
      },
      
      // No access to process, global, etc.
      process: undefined,
      global: undefined,
      Buffer: undefined
    }

    return sandboxContext
  }

  private createRestrictedRequire(permissions: Record<string, boolean>) {
    return (moduleName: string) => {
      // Only allow specific safe modules
      const allowedModules = this.config.allowedModules
      
      if (!allowedModules.includes(moduleName)) {
        throw new Error(`Module '${moduleName}' is not allowed in sandbox`)
      }
      
      // Check if permission is required
      if (moduleName.includes('fs') && !permissions['filesystem']) {
        throw new Error(`Module '${moduleName}' requires filesystem permission`)
      }
      
      if (moduleName.includes('net') && !permissions['network']) {
        throw new Error(`Module '${moduleName}' requires network permission`)
      }
      
      return require(moduleName)
    }
  }

  private async executeInVM(code: string, context: any, timeoutMs: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Plugin execution timeout after ${timeoutMs}ms`))
      }, timeoutMs)

      try {
        // Create isolated VM context
        const vmContext = vm.createContext(context)
        
        // Execute code in VM
        const result = vm.runInContext(code, vmContext, {
          timeout: timeoutMs - 100, // Ensure our timeout triggers first
          displayErrors: true
        })
        
        clearTimeout(timeout)
        resolve(result)
        
      } catch (error) {
        clearTimeout(timeout)
        // Convert VM timeout errors to our standard format
        if (error instanceof Error && error.message.includes('timed out')) {
          reject(new Error(`Plugin execution timeout after ${timeoutMs}ms`))
        } else {
          reject(error)
        }
      }
    })
  }

  private sandboxLog(level: string, args: any[]): void {
    // Secure logging for plugins - prevent information leakage
    const sanitizedArgs = args.map(arg => {
      try {
        if (typeof arg === 'object' && arg !== null) {
          const jsonStr = JSON.stringify(arg, null, 2)
          return jsonStr.length > 500 ? jsonStr.substring(0, 500) + '...' : jsonStr
        }
        const stringArg = String(arg)
        return stringArg.length > 200 ? stringArg.substring(0, 200) + '...' : stringArg
      } catch (error) {
        return '[Unserializable object]'
      }
    })
    
    this.eventLogger.log({
      type: 'security',
      severity: 'low',
      description: `Plugin ${level}: ${sanitizedArgs.join(' ')}`,
      timestamp: new Date(),
      details: { level, args: sanitizedArgs }
    })
  }

  private sanitizeContext(context: any): any {
    try {
      // Remove dangerous properties and limit depth
      const jsonStr = JSON.stringify(context, null, 2)
      const limitedStr = jsonStr.length > 10000 ? jsonStr.substring(0, 10000) : jsonStr
      const sanitized = JSON.parse(limitedStr)
      
      // Remove function references and other dangerous types
      const clean = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(clean)
        }
        
        if (obj && typeof obj === 'object') {
          const cleaned: any = {}
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value !== 'function' && !key.startsWith('_') && key !== '__proto__') {
              cleaned[key] = clean(value)
            }
          }
          return cleaned
        }
        
        return obj
      }
      
      return clean(sanitized)
    } catch (error) {
      // If sanitization fails, return empty object
      this.eventLogger.log({
        type: 'security',
        severity: 'medium',
        description: 'Failed to sanitize plugin context',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      })
      return {}
    }
  }

  private async getResourceUsage(executionTimeMs: number): Promise<ResourceUsage> {
    // In a real implementation, this would measure actual resource usage
    // For now, return estimated values
    return {
      memoryUsageMB: Math.min(50, this.config.maxMemoryMB), // Estimated
      cpuUsagePercent: Math.min(30, this.config.maxCpuUsagePercent), // Estimated
      executionTimeMs,
      networkRequests: 0, // Would track actual network requests
      fileOperations: 0   // Would track actual file operations
    }
  }

  private checkResourceViolations(usage: ResourceUsage): string[] {
    const violations: string[] = []
    
    if (usage.memoryUsageMB > this.config.maxMemoryMB) {
      violations.push(`Memory usage exceeded: ${usage.memoryUsageMB}MB > ${this.config.maxMemoryMB}MB`)
    }
    
    if (usage.cpuUsagePercent > this.config.maxCpuUsagePercent) {
      violations.push(`CPU usage exceeded: ${usage.cpuUsagePercent}% > ${this.config.maxCpuUsagePercent}%`)
    }
    
    if (usage.executionTimeMs > this.config.maxExecutionTimeMs) {
      violations.push(`Execution time exceeded: ${usage.executionTimeMs}ms > ${this.config.maxExecutionTimeMs}ms`)
    }
    
    return violations
  }

  private createEmptyResourceUsage(): ResourceUsage {
    return {
      memoryUsageMB: 0,
      cpuUsagePercent: 0,
      executionTimeMs: 0,
      networkRequests: 0,
      fileOperations: 0
    }
  }

  private startResourceMonitoring(): void {
    // Monitor active executions every second
    this.resourceMonitor = setInterval(() => {
      const now = Date.now()
      
      for (const [executionId, execution] of this.activeExecutions) {
        const runTime = now - execution.startTime
        
        if (runTime > this.config.maxExecutionTimeMs) {
          this.eventLogger.log({
            type: 'security',
            severity: 'high',
            description: `Plugin execution timeout detected: ${executionId}`,
            timestamp: new Date(),
            details: { executionId, runTimeMs: runTime }
          })
          
          this.activeExecutions.delete(executionId)
        }
      }
    }, 1000)
  }

  async shutdown(): Promise<void> {
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor)
      this.resourceMonitor = null
    }
    
    this.activeExecutions.clear()
    
    this.eventLogger.log({
      type: 'security',
      severity: 'low',
      description: 'Plugin sandbox shutdown completed',
      timestamp: new Date(),
      details: {}
    })
  }

  // Get current sandbox status
  getStatus(): {
    activeExecutions: number
    totalExecutions: number
    config: SandboxConfig
  } {
    return {
      activeExecutions: this.activeExecutions.size,
      totalExecutions: this.activeExecutions.size, // Would track total in real implementation
      config: { ...this.config }
    }
  }
} 