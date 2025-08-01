import { PluginSandbox, SandboxConfig } from './plugin-sandbox'
import { SecurityEventLogger } from './security-event-logger'
import { PluginManifest } from '../../shared/types/plugin'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs-extra'

describe('Plugin Security Sandbox', () => {
  let pluginSandbox: PluginSandbox
  let eventLogger: SecurityEventLogger
  let tempDir: string

  beforeEach(async () => {
    // Create temporary directory
    tempDir = path.join(__dirname, '../../../temp-test-sandbox', `test-${Date.now()}`)
    await fs.ensureDir(tempDir)

    // Initialize event logger
    eventLogger = new SecurityEventLogger()
    
    // Configure sandbox with strict security
    const config: SandboxConfig = {
      maxMemoryMB: 50,
      maxExecutionTimeMs: 5000,
      maxCpuUsagePercent: 25,
      allowedModules: ['lodash'], // Only allow safe modules
      enableNetworking: false,
      enableFileSystemAccess: false,
      maxFileSize: 1024 * 1024, // 1MB
      tempDirectory: tempDir
    }

    pluginSandbox = new PluginSandbox(config, eventLogger)
    await pluginSandbox.initialize()
  })

  afterEach(async () => {
    await pluginSandbox.shutdown()
    
    // Clean up temp directory
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir)
    }
  })

  it('should execute safe plugin code successfully', async () => {
    const manifest: PluginManifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: 'Test Author',
      permissions: {}, // No special permissions required
      main: 'index.js'
    }

    const pluginCode = `
      // Simple calculation that should work
      const result = 2 + 2;
      result;
    `

    const result = await pluginSandbox.executePlugin('test-plugin', pluginCode, manifest)

    expect(result.success).toBe(true)
    expect(result.result).toBe(4)
    expect(result.securityViolations).toHaveLength(0)
    expect(result.resourceUsage.executionTimeMs).toBeLessThan(1000)
  })

  it('should block plugin with filesystem access when permission denied', async () => {
    const manifest: PluginManifest = {
      id: 'fs-plugin',
      name: 'Filesystem Plugin',
      version: '1.0.0',
      description: 'A plugin that tries to access filesystem',
      author: 'Test Author',
      permissions: {
        filesystem: true // Request filesystem access
      },
      main: 'index.js'
    }

    const pluginCode = `
      // Try to access filesystem
      const fs = require('fs');
      fs.readFileSync('/etc/passwd');
    `

    const result = await pluginSandbox.executePlugin('fs-plugin', pluginCode, manifest)

    expect(result.success).toBe(false)
    expect(result.error).toContain('File system access not permitted')
    expect(result.securityViolations).toContain('File system access not permitted')
  })

  it('should block plugin with network access when permission denied', async () => {
    const manifest: PluginManifest = {
      id: 'net-plugin',
      name: 'Network Plugin',
      version: '1.0.0',
      description: 'A plugin that tries to access network',
      author: 'Test Author',
      permissions: {
        network: true // Request network access
      },
      main: 'index.js'
    }

    const pluginCode = `
      // Try to access network (this would fail even if allowed since http isn't in allowedModules)
      const http = require('http');
      http.get('http://example.com');
    `

    const result = await pluginSandbox.executePlugin('net-plugin', pluginCode, manifest)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Network access not permitted')
    expect(result.securityViolations).toContain('Network access not permitted')
  })

  it('should block unauthorized module access', async () => {
    const manifest: PluginManifest = {
      id: 'dangerous-plugin',
      name: 'Dangerous Plugin',
      version: '1.0.0',
      description: 'A plugin that tries to access dangerous modules',
      author: 'Test Author',
      permissions: {},
      main: 'index.js'
    }

    const pluginCode = `
      // Try to access unauthorized module
      const child_process = require('child_process');
      child_process.exec('ls');
    `

    const result = await pluginSandbox.executePlugin('dangerous-plugin', pluginCode, manifest)

    expect(result.success).toBe(false)
    expect(result.error).toContain('child_process')
    expect(result.error).toContain('not allowed in sandbox')
  })

  it('should handle plugin execution timeout', async () => {
    const manifest: PluginManifest = {
      id: 'slow-plugin',
      name: 'Slow Plugin',
      version: '1.0.0',
      description: 'A plugin that runs too long',
      author: 'Test Author',
      permissions: {},
      main: 'index.js'
    }

    const pluginCode = `
      // Infinite loop should be terminated
      while (true) {
        // This will run until timeout
      }
    `

    const result = await pluginSandbox.executePlugin('slow-plugin', pluginCode, manifest)

    expect(result.success).toBe(false)
    expect(result.error).toContain('timeout')
    expect(result.resourceUsage.executionTimeMs).toBeGreaterThan(4900) // Close to the 5000ms timeout
  })

  it('should sanitize plugin context safely', async () => {
    const manifest: PluginManifest = {
      id: 'context-plugin',
      name: 'Context Plugin',
      version: '1.0.0',
      description: 'A plugin that uses context',
      author: 'Test Author',
      permissions: {},
      main: 'index.js'
    }

    const pluginCode = `
      // Access safe context data
      context.message + ' World';
    `

    const unsafeContext = {
      message: 'Hello',
      _secret: 'should be removed',
      dangerousFunction: () => 'should be removed',
      nested: {
        safe: 'data',
        _private: 'should be removed'
      }
    }

    const result = await pluginSandbox.executePlugin('context-plugin', pluginCode, manifest, unsafeContext)

    expect(result.success).toBe(true)
    expect(result.result).toBe('Hello World')
  })

  it('should provide secure console logging', async () => {
    const manifest: PluginManifest = {
      id: 'log-plugin',
      name: 'Logging Plugin',
      version: '1.0.0',
      description: 'A plugin that logs messages',
      author: 'Test Author',
      permissions: {},
      main: 'index.js'
    }

    const pluginCode = `
      console.log('Test message');
      console.warn('Warning message');
      console.error('Error message');
      'done';
    `

    const result = await pluginSandbox.executePlugin('log-plugin', pluginCode, manifest)

    expect(result.success).toBe(true)
    expect(result.result).toBe('done')
    // The logs should be captured by the security event logger
  })

  it('should track resource usage accurately', async () => {
    const manifest: PluginManifest = {
      id: 'resource-plugin',
      name: 'Resource Plugin',
      version: '1.0.0',
      description: 'A plugin that uses resources',
      author: 'Test Author',
      permissions: {},
      main: 'index.js'
    }

    const pluginCode = `
      // Do some work that takes time
      let sum = 0;
      for (let i = 0; i < 100000; i++) {
        sum += i;
      }
      sum;
    `

    const result = await pluginSandbox.executePlugin('resource-plugin', pluginCode, manifest)

    expect(result.success).toBe(true)
    expect(result.resourceUsage.executionTimeMs).toBeGreaterThan(0)
    expect(result.resourceUsage.memoryUsageMB).toBeGreaterThan(0)
    expect(result.resourceUsage.cpuUsagePercent).toBeGreaterThan(0)
  })

  it('should provide sandbox status information', async () => {
    const status = pluginSandbox.getStatus()

    expect(status).toHaveProperty('activeExecutions')
    expect(status).toHaveProperty('totalExecutions')
    expect(status).toHaveProperty('config')
    expect(status.config.maxMemoryMB).toBe(50)
    expect(status.config.maxExecutionTimeMs).toBe(5000)
  })
}) 