import { EventEmitter } from 'events'
import * as fs from 'fs-extra'
import * as path from 'path'
import { app } from 'electron'

export enum PluginState {
  INSTALLING = 'installing',
  STARTING = 'starting', 
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  UPDATING = 'updating',
  ERROR = 'error',
  UNINSTALLING = 'uninstalling'
}

export interface PluginDependency {
  pluginId: string
  version: string
  required: boolean
  satisfied: boolean
}

export interface PluginHealthStatus {
  healthy: boolean
  uptime: number
  memoryUsage: number
  cpuUsage: number
  errors: number
  lastError?: string
  performance: {
    avgResponseTime: number
    successRate: number
    totalRequests: number
  }
}

export interface PluginUpdateInfo {
  currentVersion: string
  availableVersion: string
  changelog?: string
  critical: boolean
  downloadUrl: string
  signature?: string
}

export interface PluginInstance {
  id: string
  name: string
  version: string
  path: string
  manifest: PluginManifest
  state: PluginState
  dependencies: PluginDependency[]
  healthStatus: PluginHealthStatus
  lastStateChange: Date
  recoveryAttempts: number
}

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  main: string
  dependencies?: Record<string, string>
  permissions?: string[]
  hooks?: Record<string, string>
}

export interface PluginLifecycleConfig {
  pluginDirectory: string
  maxRecoveryAttempts: number
  healthCheckInterval: number
  updateCheckInterval: number
  enableAutoRecovery: boolean
  enableAutoUpdates: boolean
}

/**
 * Comprehensive Plugin Lifecycle Manager
 * Handles advanced plugin lifecycle states, dependency resolution,
 * health monitoring, and automated recovery mechanisms
 */
export class PluginLifecycleManager extends EventEmitter {
  private plugins: Map<string, PluginInstance> = new Map()
  private lifecycleStates: Map<string, PluginState> = new Map()
  private healthCheckTimer?: NodeJS.Timeout
  private updateCheckTimer?: NodeJS.Timeout
  private config: PluginLifecycleConfig

  constructor(config?: Partial<PluginLifecycleConfig>) {
    super()
    
    this.config = {
      pluginDirectory: path.join(app.getPath('userData'), 'plugins'),
      maxRecoveryAttempts: 3,
      healthCheckInterval: 30000, // 30 seconds
      updateCheckInterval: 300000, // 5 minutes
      enableAutoRecovery: true,
      enableAutoUpdates: false,
      ...config
    }

    this.initializePluginDirectory()
    this.startMonitoring()
  }

  /**
   * Install a plugin from a local path or URL
   */
  async installPlugin(pluginPath: string): Promise<void> {
    const pluginId = path.basename(pluginPath, '.zip')
    
    try {
      this.setPluginState(pluginId, PluginState.INSTALLING)
      this.emit('plugin-installing', { pluginId, path: pluginPath })

      // Extract and validate plugin
      const extractedPath = await this.extractPlugin(pluginPath, pluginId)
      const manifest = await this.validatePluginManifest(extractedPath)
      
      // Check dependencies
      const dependencies = await this.resolveDependencies(manifest.dependencies || {})
      
      // Create plugin instance
      const pluginInstance: PluginInstance = {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        path: extractedPath,
        manifest,
        state: PluginState.STOPPED,
        dependencies,
        healthStatus: this.createInitialHealthStatus(),
        lastStateChange: new Date(),
        recoveryAttempts: 0
      }

      this.plugins.set(pluginInstance.id, pluginInstance)
      this.setPluginState(pluginInstance.id, PluginState.STOPPED)
      
      this.emit('plugin-installed', { pluginId: pluginInstance.id, plugin: pluginInstance })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.emit('plugin-error', { pluginId, error: errorMessage, operation: 'install' })
      throw error
    }
  }

  /**
   * Start a plugin
   */
  async startPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    if (plugin.state === PluginState.RUNNING) {
      return // Already running
    }

    try {
      this.setPluginState(pluginId, PluginState.STARTING)
      this.emit('plugin-starting', { pluginId, plugin })

      // Check dependencies are satisfied
      const unsatisfiedDeps = plugin.dependencies.filter(dep => !dep.satisfied)
      if (unsatisfiedDeps.length > 0) {
        throw new Error(`Unsatisfied dependencies: ${unsatisfiedDeps.map(d => d.pluginId).join(', ')}`)
      }

      // Load and initialize plugin
      await this.loadPlugin(plugin)
      
      plugin.healthStatus.uptime = Date.now()
      plugin.recoveryAttempts = 0
      
      this.setPluginState(pluginId, PluginState.RUNNING)
      this.emit('plugin-started', { pluginId, plugin })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      plugin.healthStatus.errors++
      plugin.healthStatus.lastError = errorMessage
      
      this.setPluginState(pluginId, PluginState.ERROR)
      this.emit('plugin-error', { pluginId, error: errorMessage, operation: 'start' })
      
      // Attempt recovery if enabled
      if (this.config.enableAutoRecovery) {
        this.attemptRecovery(pluginId)
      }
      
      throw error
    }
  }

  /**
   * Stop a plugin
   */
  async stopPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    if (plugin.state === PluginState.STOPPED) {
      return // Already stopped
    }

    try {
      this.setPluginState(pluginId, PluginState.STOPPING)
      this.emit('plugin-stopping', { pluginId, plugin })

      // Check if other plugins depend on this one
      const dependentPlugins = this.findDependentPlugins(pluginId)
      if (dependentPlugins.length > 0) {
        const running = dependentPlugins.filter(p => p.state === PluginState.RUNNING)
        if (running.length > 0) {
          throw new Error(`Cannot stop plugin: ${running.map(p => p.id).join(', ')} depend on it`)
        }
      }

      // Unload plugin
      await this.unloadPlugin(plugin)
      
      this.setPluginState(pluginId, PluginState.STOPPED)
      this.emit('plugin-stopped', { pluginId, plugin })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      plugin.healthStatus.errors++
      plugin.healthStatus.lastError = errorMessage
      
      this.setPluginState(pluginId, PluginState.ERROR)
      this.emit('plugin-error', { pluginId, error: errorMessage, operation: 'stop' })
      
      throw error
    }
  }

  /**
   * Update a plugin to the latest version
   */
  async updatePlugin(pluginId: string, force: boolean = false): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    try {
      this.setPluginState(pluginId, PluginState.UPDATING)
      this.emit('plugin-updating', { pluginId, plugin })

      const updateInfo = await this.checkForUpdates(pluginId)
      if (!updateInfo && !force) {
        this.setPluginState(pluginId, plugin.state)
        return // No update available
      }

      // Create backup before update
      const backupPath = await this.createBackup(plugin)
      
      try {
        // Download and install update
        const newPluginPath = await this.downloadUpdate(updateInfo!)
        await this.installUpdate(plugin, newPluginPath)
        
        // Remove backup on success
        await fs.remove(backupPath)
        
        this.emit('plugin-updated', { pluginId, plugin, previousVersion: updateInfo!.currentVersion })
        
      } catch (updateError) {
        // Rollback on failure
        await this.rollbackUpdate(plugin, backupPath)
        throw updateError
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      plugin.healthStatus.errors++
      plugin.healthStatus.lastError = errorMessage
      
      this.setPluginState(pluginId, PluginState.ERROR)
      this.emit('plugin-error', { pluginId, error: errorMessage, operation: 'update' })
      
      throw error
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    try {
      this.setPluginState(pluginId, PluginState.UNINSTALLING)
      this.emit('plugin-uninstalling', { pluginId, plugin })

      // Stop plugin if running
      if (plugin.state === PluginState.RUNNING) {
        await this.stopPlugin(pluginId)
      }

      // Check dependent plugins
      const dependentPlugins = this.findDependentPlugins(pluginId)
      if (dependentPlugins.length > 0) {
        throw new Error(`Cannot uninstall: ${dependentPlugins.map(p => p.id).join(', ')} depend on it`)
      }

      // Remove plugin files
      await fs.remove(plugin.path)
      
      // Remove from registry
      this.plugins.delete(pluginId)
      this.lifecycleStates.delete(pluginId)
      
      this.emit('plugin-uninstalled', { pluginId })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      plugin.healthStatus.errors++
      plugin.healthStatus.lastError = errorMessage
      
      this.setPluginState(pluginId, PluginState.ERROR)
      this.emit('plugin-error', { pluginId, error: errorMessage, operation: 'uninstall' })
      
      throw error
    }
  }

  /**
   * Get plugin health status
   */
  getPluginHealth(pluginId: string): PluginHealthStatus {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    return { ...plugin.healthStatus }
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId)
  }

  /**
   * Get plugins by state
   */
  getPluginsByState(state: PluginState): PluginInstance[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.state === state)
  }

  /**
   * Check for available updates
   */
  async checkForUpdates(_pluginId?: string): Promise<PluginUpdateInfo | null> {
    // Implementation would integrate with plugin registry
    // For now, return null (no updates)
    return null
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {}
    
    for (const plugin of this.plugins.values()) {
      graph[plugin.id] = plugin.dependencies.map(dep => dep.pluginId)
    }
    
    return graph
  }

  /**
   * Validate dependency resolution
   */
  private async resolveDependencies(dependencies: Record<string, string>): Promise<PluginDependency[]> {
    const resolved: PluginDependency[] = []
    
    for (const [pluginId, version] of Object.entries(dependencies)) {
      const dependentPlugin = this.plugins.get(pluginId)
      const satisfied = dependentPlugin && this.versionMatches(dependentPlugin.version, version)
      
      resolved.push({
        pluginId,
        version,
        required: true,
        satisfied: !!satisfied
      })
    }
    
    return resolved
  }

  /**
   * Find plugins that depend on the given plugin
   */
  private findDependentPlugins(pluginId: string): PluginInstance[] {
    return Array.from(this.plugins.values()).filter(plugin =>
      plugin.dependencies.some(dep => dep.pluginId === pluginId)
    )
  }

  /**
   * Attempt automatic recovery for a failed plugin
   */
  private async attemptRecovery(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return

    if (plugin.recoveryAttempts >= this.config.maxRecoveryAttempts) {
      this.emit('plugin-recovery-failed', { pluginId, maxAttempts: this.config.maxRecoveryAttempts })
      return
    }

    plugin.recoveryAttempts++
    this.emit('plugin-recovery-attempt', { pluginId, attempt: plugin.recoveryAttempts })

    // Wait before retry (exponential backoff)
    const delay = Math.pow(2, plugin.recoveryAttempts) * 1000
    setTimeout(async () => {
      try {
        await this.startPlugin(pluginId)
        this.emit('plugin-recovered', { pluginId, attempts: plugin.recoveryAttempts })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        this.emit('plugin-recovery-failed', { pluginId, error: errorMessage })
      }
    }, delay)
  }

  /**
   * Set plugin state and update timestamps
   */
  private setPluginState(pluginId: string, state: PluginState): void {
    const plugin = this.plugins.get(pluginId)
    if (plugin) {
      plugin.state = state
      plugin.lastStateChange = new Date()
    }
    
    this.lifecycleStates.set(pluginId, state)
    this.emit('plugin-state-changed', { pluginId, state, timestamp: new Date() })
  }

  /**
   * Start monitoring systems
   */
  private startMonitoring(): void {
    // Health monitoring
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks()
    }, this.config.healthCheckInterval)

    // Update checking
    this.updateCheckTimer = setInterval(() => {
      if (this.config.enableAutoUpdates) {
        this.checkAllPluginsForUpdates()
      }
    }, this.config.updateCheckInterval)
  }

  /**
   * Perform health checks on all running plugins
   */
  private performHealthChecks(): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.state === PluginState.RUNNING) {
        this.updatePluginHealth(plugin)
      }
    }
  }

  /**
   * Update plugin health metrics
   */
  private updatePluginHealth(plugin: PluginInstance): void {
    // Update health status based on plugin performance
    const currentTime = Date.now()
    const uptime = currentTime - plugin.healthStatus.uptime
    
    // Check if plugin is responding (simplified implementation)
    const isHealthy = plugin.state === PluginState.RUNNING && plugin.healthStatus.errors === 0
    
    plugin.healthStatus.healthy = isHealthy
    plugin.healthStatus.uptime = uptime

    this.emit('plugin-health-updated', { pluginId: plugin.id, health: plugin.healthStatus })
  }

  /**
   * Check all plugins for updates
   */
  private async checkAllPluginsForUpdates(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      try {
        const updateInfo = await this.checkForUpdates(plugin.id)
        if (updateInfo && updateInfo.critical) {
          await this.updatePlugin(plugin.id, true)
        }
      } catch (error) {
        console.error(`Failed to check updates for plugin ${plugin.id}:`, error)
      }
    }
  }

  /**
   * Initialize plugin directory structure
   */
  private async initializePluginDirectory(): Promise<void> {
    await fs.ensureDir(this.config.pluginDirectory)
  }

  /**
   * Extract plugin from archive
   */
  private async extractPlugin(pluginPath: string, pluginId: string): Promise<string> {
    const extractPath = path.join(this.config.pluginDirectory, pluginId)
    
    // Implementation would extract ZIP/TAR files
    // For now, assume it's already extracted
    await fs.ensureDir(extractPath)
    
    return extractPath
  }

  /**
   * Validate plugin manifest
   */
  private async validatePluginManifest(pluginPath: string): Promise<PluginManifest> {
    const manifestPath = path.join(pluginPath, 'manifest.json')
    
    if (!await fs.pathExists(manifestPath)) {
      throw new Error('Plugin manifest.json not found')
    }

    const manifest = await fs.readJSON(manifestPath)
    
    // Validate required fields
    const required = ['id', 'name', 'version', 'main']
    for (const field of required) {
      if (!manifest[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    return manifest
  }

  /**
   * Load plugin into runtime
   */
  private async loadPlugin(plugin: PluginInstance): Promise<void> {
    // Implementation would load plugin module and initialize
    // This is a simplified placeholder
    const mainFile = path.join(plugin.path, plugin.manifest.main)
    
    if (!await fs.pathExists(mainFile)) {
      throw new Error(`Plugin main file not found: ${plugin.manifest.main}`)
    }

    // Plugin loading logic would go here
    console.log(`Loading plugin: ${plugin.id}`)
  }

  /**
   * Unload plugin from runtime
   */
  private async unloadPlugin(plugin: PluginInstance): Promise<void> {
    // Implementation would unload plugin module and cleanup
    console.log(`Unloading plugin: ${plugin.id}`)
  }

  /**
   * Create backup of plugin before update
   */
  private async createBackup(plugin: PluginInstance): Promise<string> {
    const backupPath = path.join(this.config.pluginDirectory, 'backups', `${plugin.id}-${Date.now()}`)
    await fs.copy(plugin.path, backupPath)
    return backupPath
  }

  /**
   * Download plugin update
   */
  private async downloadUpdate(updateInfo: PluginUpdateInfo): Promise<string> {
    // Implementation would download from registry
    // Return path to downloaded update
    return updateInfo.downloadUrl
  }

  /**
   * Install plugin update
   */
  private async installUpdate(plugin: PluginInstance, _updatePath: string): Promise<void> {
    // Implementation would replace plugin files with update
    console.log(`Installing update for plugin: ${plugin.id}`)
  }

  /**
   * Rollback plugin update
   */
  private async rollbackUpdate(plugin: PluginInstance, backupPath: string): Promise<void> {
    await fs.remove(plugin.path)
    await fs.copy(backupPath, plugin.path)
  }

  /**
   * Create initial health status
   */
  private createInitialHealthStatus(): PluginHealthStatus {
    return {
      healthy: true,
      uptime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      errors: 0,
      performance: {
        avgResponseTime: 0,
        successRate: 100,
        totalRequests: 0
      }
    }
  }

  /**
   * Check if version matches requirement
   */
  private versionMatches(installed: string, required: string): boolean {
    // Simplified version matching - would use semver in real implementation
    return installed === required
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }
    if (this.updateCheckTimer) {
      clearInterval(this.updateCheckTimer)
    }
    
    this.removeAllListeners()
  }
}

// Register service with factory
export function createPluginLifecycleManager(config?: Partial<PluginLifecycleConfig>): PluginLifecycleManager {
  return new PluginLifecycleManager(config)
}
