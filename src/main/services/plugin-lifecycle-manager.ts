import { EventEmitter } from 'events';
import { PluginData, PluginManifest, PluginState } from '../../shared/types/plugin';
import { SecurityEventLogger } from './security-event-logger';
import { PluginManager } from './plugin-manager';
import { PluginSandbox } from './plugin-sandbox';
import { HealthMonitor } from './health-monitor';
import * as fs from 'fs-extra';
import * as path from 'path';
import { PlatformUtils } from '../utils/platform';

export interface PluginLifecycleState {
  state: 'installing' | 'starting' | 'running' | 'stopping' | 'stopped' | 'updating' | 'error' | 'uninstalling';
  previousState?: PluginLifecycleState['state'];
  timestamp: Date;
  error?: string;
  details?: Record<string, any>;
}

export interface PluginDependency {
  pluginId: string;
  version: string;
  required: boolean;
  satisfied: boolean;
}

export interface PluginUpdateInfo {
  currentVersion: string;
  availableVersion: string;
  changelog?: string;
  critical: boolean;
  downloadUrl: string;
  signature?: string;
}

export interface PluginHealthStatus {
  healthy: boolean;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  errors: number;
  lastError?: string;
  performance: {
    avgResponseTime: number;
    successRate: number;
    totalRequests: number;
  };
}

export interface PluginLifecycleEvents {
  'state-changed': (pluginId: string, state: PluginLifecycleState) => void;
  'dependency-resolved': (pluginId: string, dependency: PluginDependency) => void;
  'dependency-failed': (pluginId: string, dependency: PluginDependency) => void;
  'health-check': (pluginId: string, health: PluginHealthStatus) => void;
  'update-available': (pluginId: string, updateInfo: PluginUpdateInfo) => void;
  'error': (pluginId: string, error: Error) => void;
  'recovery-attempted': (pluginId: string, success: boolean) => void;
}

export class PluginLifecycleManager extends EventEmitter<PluginLifecycleEvents> {
  private pluginStates = new Map<string, PluginLifecycleState>();
  private pluginDependencies = new Map<string, PluginDependency[]>();
  private pluginHealth = new Map<string, PluginHealthStatus>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private updateCheckInterval: NodeJS.Timeout | null = null;
  private recoveryAttempts = new Map<string, number>();
  private readonly maxRecoveryAttempts = 3;
  private readonly healthCheckIntervalMs = 30000; // 30 seconds
  private readonly updateCheckIntervalMs = 300000; // 5 minutes

  constructor(
    private pluginManager: PluginManager,
    private pluginSandbox: PluginSandbox,
    private eventLogger: SecurityEventLogger,
    private healthMonitor: HealthMonitor
  ) {
    super();
    this.setupEventListeners();
  }

  async initialize(): Promise<void> {
    console.log('Initializing Plugin Lifecycle Manager...');
    
    // Initialize existing plugins
    const plugins = this.pluginManager.list();
    for (const plugin of plugins) {
      await this.initializePluginState(plugin);
    }

    // Start health monitoring
    this.startHealthMonitoring();
    
    // Start update checking
    this.startUpdateChecking();

    this.eventLogger.log({
      type: 'security',
      severity: 'low',
      description: 'Plugin Lifecycle Manager initialized',
      timestamp: new Date(),
      details: {
        managedPlugins: this.pluginStates.size,
        healthCheckInterval: this.healthCheckIntervalMs,
        updateCheckInterval: this.updateCheckIntervalMs
      }
    });
  }

  private setupEventListeners(): void {
    this.on('state-changed', (pluginId, state) => {
      this.eventLogger.log({
        type: 'security',
        severity: state.state === 'error' ? 'high' : 'low',
        description: `Plugin ${pluginId} state changed to ${state.state}`,
        timestamp: new Date(),
        details: { pluginId, state: state.state, previousState: state.previousState }
      });
    });

    this.on('error', (pluginId, error) => {
      this.handlePluginError(pluginId, error);
    });
  }

  private async initializePluginState(plugin: PluginData): Promise<void> {
    const initialState: PluginLifecycleState = {
      state: plugin.enabled ? 'running' : 'stopped',
      timestamp: new Date(),
      details: { initialized: true }
    };

    this.pluginStates.set(plugin.id, initialState);
    
    // Initialize dependencies
    await this.resolveDependencies(plugin);
    
    // Initialize health status
    this.pluginHealth.set(plugin.id, {
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
    });
  }

  async installPlugin(pluginPath: string): Promise<void> {
    try {
      const pluginId = path.basename(pluginPath, path.extname(pluginPath));
      
      // Set installing state
      await this.updatePluginState(pluginId, 'installing');
      
      // Install via plugin manager
      const plugin = await this.pluginManager.install(pluginPath);
      
      // Initialize lifecycle state
      await this.initializePluginState(plugin);
      
      // Check dependencies
      const dependenciesOk = await this.checkDependencies(plugin.id);
      if (!dependenciesOk) {
        await this.updatePluginState(plugin.id, 'error', {
          error: 'Dependency resolution failed'
        });
        return;
      }
      
      // Set to stopped (installed but not started)
      await this.updatePluginState(plugin.id, 'stopped');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.eventLogger.log({
        type: 'security',
        severity: 'high',
        description: `Plugin installation failed: ${errorMessage}`,
        timestamp: new Date(),
        details: { pluginPath, error: errorMessage }
      });
      throw error;
    }
  }

  async startPlugin(pluginId: string): Promise<void> {
    const plugin = this.pluginManager.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    try {
      // Set starting state
      await this.updatePluginState(pluginId, 'starting');
      
      // Check dependencies
      const dependenciesOk = await this.checkDependencies(pluginId);
      if (!dependenciesOk) {
        await this.updatePluginState(pluginId, 'error', {
          error: 'Dependencies not satisfied'
        });
        return;
      }
      
      // Enable plugin
      await this.pluginManager.enable(pluginId);
      
      // Initialize plugin in sandbox
      await this.initializePluginInSandbox(plugin);
      
      // Set running state
      await this.updatePluginState(pluginId, 'running');
      
      // Reset recovery attempts
      this.recoveryAttempts.delete(pluginId);
      
    } catch (error) {
      await this.updatePluginState(pluginId, 'error', {
        error: error instanceof Error ? error.message : String(error)
      });
      this.emit('error', pluginId, error instanceof Error ? error : new Error(String(error)));
    }
  }

  async stopPlugin(pluginId: string): Promise<void> {
    const plugin = this.pluginManager.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    try {
      // Set stopping state
      await this.updatePluginState(pluginId, 'stopping');
      
      // Cleanup plugin resources
      await this.cleanupPluginResources(pluginId);
      
      // Disable plugin
      await this.pluginManager.disable(pluginId);
      
      // Set stopped state
      await this.updatePluginState(pluginId, 'stopped');
      
    } catch (error) {
      await this.updatePluginState(pluginId, 'error', {
        error: error instanceof Error ? error.message : String(error)
      });
      this.emit('error', pluginId, error instanceof Error ? error : new Error(String(error)));
    }
  }

  async updatePlugin(pluginId: string, updateInfo: PluginUpdateInfo): Promise<void> {
    const plugin = this.pluginManager.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    try {
      // Set updating state
      await this.updatePluginState(pluginId, 'updating');
      
      // Stop plugin if running
      const currentState = this.pluginStates.get(pluginId);
      const wasRunning = currentState?.state === 'running';
      
      if (wasRunning) {
        await this.stopPlugin(pluginId);
      }
      
      // Download and verify update
      const updatePath = await this.downloadPluginUpdate(updateInfo);
      
      // Backup current plugin
      const backupPath = await this.backupPlugin(pluginId);
      
      try {
        // Install update
        await this.installPlugin(updatePath);
        
        // Restart if it was running
        if (wasRunning) {
          await this.startPlugin(pluginId);
        }
        
        // Cleanup backup
        await fs.remove(backupPath);
        
      } catch (error) {
        // Rollback on failure
        await this.rollbackPlugin(pluginId, backupPath);
        throw error;
      }
      
    } catch (error) {
      await this.updatePluginState(pluginId, 'error', {
        error: error instanceof Error ? error.message : String(error)
      });
      this.emit('error', pluginId, error instanceof Error ? error : new Error(String(error)));
    }
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    try {
      // Set uninstalling state
      await this.updatePluginState(pluginId, 'uninstalling');
      
      // Stop plugin if running
      const currentState = this.pluginStates.get(pluginId);
      if (currentState?.state === 'running') {
        await this.stopPlugin(pluginId);
      }
      
      // Check for dependent plugins
      const dependents = await this.findDependentPlugins(pluginId);
      if (dependents.length > 0) {
        throw new Error(`Cannot uninstall plugin ${pluginId}: ${dependents.length} plugins depend on it`);
      }
      
      // Cleanup resources
      await this.cleanupPluginResources(pluginId);
      
      // Uninstall via plugin manager
      await this.pluginManager.uninstall(pluginId);
      
      // Cleanup lifecycle state
      this.pluginStates.delete(pluginId);
      this.pluginDependencies.delete(pluginId);
      this.pluginHealth.delete(pluginId);
      this.recoveryAttempts.delete(pluginId);
      
    } catch (error) {
      await this.updatePluginState(pluginId, 'error', {
        error: error instanceof Error ? error.message : String(error)
      });
      this.emit('error', pluginId, error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async resolveDependencies(plugin: PluginData): Promise<void> {
    const dependencies: PluginDependency[] = [];
    
    // Parse dependencies from manifest
    if (plugin.manifest?.dependencies) {
      for (const [depId, version] of Object.entries(plugin.manifest.dependencies)) {
        const depPlugin = this.pluginManager.get(depId);
        const satisfied = depPlugin !== undefined && this.isVersionSatisfied(depPlugin.version, version);
        
        const dependency: PluginDependency = {
          pluginId: depId,
          version,
          required: true,
          satisfied
        };
        
        dependencies.push(dependency);
        
        if (satisfied) {
          this.emit('dependency-resolved', plugin.id, dependency);
        } else {
          this.emit('dependency-failed', plugin.id, dependency);
        }
      }
    }
    
    this.pluginDependencies.set(plugin.id, dependencies);
  }

  private async checkDependencies(pluginId: string): Promise<boolean> {
    const dependencies = this.pluginDependencies.get(pluginId) || [];
    
    for (const dependency of dependencies) {
      if (dependency.required && !dependency.satisfied) {
        return false;
      }
    }
    
    return true;
  }

  private async findDependentPlugins(pluginId: string): Promise<string[]> {
    const dependents: string[] = [];
    
    for (const [id, dependencies] of this.pluginDependencies) {
      if (dependencies.some(dep => dep.pluginId === pluginId && dep.required)) {
        dependents.push(id);
      }
    }
    
    return dependents;
  }

  private isVersionSatisfied(currentVersion: string, requiredVersion: string): boolean {
    // Simple version comparison - in production, use semver
    return currentVersion >= requiredVersion;
  }

  private async initializePluginInSandbox(plugin: PluginData): Promise<void> {
    const pluginDir = path.join(PlatformUtils.getPluginsPath(), plugin.id);
    const mainFile = path.join(pluginDir, plugin.manifest?.main || 'index.js');
    
    if (await fs.pathExists(mainFile)) {
      const pluginCode = await fs.readFile(mainFile, 'utf8');
      
      const result = await this.pluginSandbox.executePlugin(
        plugin.id,
        pluginCode,
        plugin.manifest!,
        { initialize: true }
      );
      
      if (!result.success) {
        throw new Error(`Plugin initialization failed: ${result.error}`);
      }
    }
  }

  private async cleanupPluginResources(pluginId: string): Promise<void> {
    // Cleanup sandbox resources
    // In a real implementation, this would cleanup active sandbox instances
    
    // Cleanup temporary files
    const tempDir = path.join(PlatformUtils.getPluginsPath(), `${pluginId}_temp`);
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  }

  private async downloadPluginUpdate(updateInfo: PluginUpdateInfo): Promise<string> {
    // In a real implementation, this would download from updateInfo.downloadUrl
    // For now, return a placeholder path
    return '/tmp/plugin-update.zip';
  }

  private async backupPlugin(pluginId: string): Promise<string> {
    const pluginDir = path.join(PlatformUtils.getPluginsPath(), pluginId);
    const backupDir = path.join(PlatformUtils.getPluginsPath(), `${pluginId}_backup_${Date.now()}`);
    
    await fs.copy(pluginDir, backupDir);
    return backupDir;
  }

  private async rollbackPlugin(pluginId: string, backupPath: string): Promise<void> {
    const pluginDir = path.join(PlatformUtils.getPluginsPath(), pluginId);
    
    // Remove failed update
    if (await fs.pathExists(pluginDir)) {
      await fs.remove(pluginDir);
    }
    
    // Restore backup
    await fs.copy(backupPath, pluginDir);
    
    // Cleanup backup
    await fs.remove(backupPath);
  }

  private async updatePluginState(
    pluginId: string,
    state: PluginLifecycleState['state'],
    details?: Record<string, any>
  ): Promise<void> {
    const previousState = this.pluginStates.get(pluginId);
    
    const newState: PluginLifecycleState = {
      state,
      previousState: previousState?.state,
      timestamp: new Date(),
      details
    };
    
    this.pluginStates.set(pluginId, newState);
    this.emit('state-changed', pluginId, newState);
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.healthCheckIntervalMs);
  }

  private startUpdateChecking(): void {
    this.updateCheckInterval = setInterval(async () => {
      await this.checkForUpdates();
    }, this.updateCheckIntervalMs);
  }

  private async performHealthChecks(): Promise<void> {
    for (const [pluginId, state] of this.pluginStates) {
      if (state.state === 'running') {
        await this.checkPluginHealth(pluginId);
      }
    }
  }

  private async checkPluginHealth(pluginId: string): Promise<void> {
    const plugin = this.pluginManager.get(pluginId);
    if (!plugin) return;

    try {
      const health = this.pluginHealth.get(pluginId);
      if (!health) return;

      // Update health metrics
      health.uptime = Date.now() - (this.pluginStates.get(pluginId)?.timestamp.getTime() || 0);
      
      // Check if plugin is responsive
      const isHealthy = await this.pingPlugin(pluginId);
      
      if (!isHealthy && health.healthy) {
        // Plugin became unhealthy
        health.healthy = false;
        health.errors++;
        
        this.emit('health-check', pluginId, health);
        
        // Attempt recovery
        await this.attemptPluginRecovery(pluginId);
      } else if (isHealthy && !health.healthy) {
        // Plugin recovered
        health.healthy = true;
        this.emit('health-check', pluginId, health);
      }
      
    } catch (error) {
      this.emit('error', pluginId, error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async pingPlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.pluginManager.get(pluginId);
      if (!plugin) return false;

      const pluginDir = path.join(PlatformUtils.getPluginsPath(), pluginId);
      const healthCheckCode = `
        try {
          if (typeof healthCheck === 'function') {
            healthCheck();
          }
          'healthy';
        } catch (error) {
          'unhealthy';
        }
      `;

      const result = await this.pluginSandbox.executePlugin(
        pluginId,
        healthCheckCode,
        plugin.manifest!,
        { healthCheck: true }
      );

      return result.success && result.result === 'healthy';
    } catch (error) {
      return false;
    }
  }

  private async attemptPluginRecovery(pluginId: string): Promise<void> {
    const attempts = this.recoveryAttempts.get(pluginId) || 0;
    
    if (attempts >= this.maxRecoveryAttempts) {
      this.eventLogger.log({
        type: 'security',
        severity: 'high',
        description: `Plugin ${pluginId} max recovery attempts reached`,
        timestamp: new Date(),
        details: { pluginId, attempts }
      });
      
      await this.updatePluginState(pluginId, 'error', {
        error: 'Max recovery attempts reached'
      });
      return;
    }
    
    try {
      this.recoveryAttempts.set(pluginId, attempts + 1);
      
      // Try to restart the plugin
      await this.stopPlugin(pluginId);
      await this.startPlugin(pluginId);
      
      this.emit('recovery-attempted', pluginId, true);
      
    } catch (error) {
      this.emit('recovery-attempted', pluginId, false);
      this.emit('error', pluginId, error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async checkForUpdates(): Promise<void> {
    // In a real implementation, this would check a plugin registry
    // For now, just log that update checking is active
    this.eventLogger.log({
      type: 'security',
      severity: 'low',
      description: 'Plugin update check completed',
      timestamp: new Date(),
      details: { pluginCount: this.pluginStates.size }
    });
  }

  private async handlePluginError(pluginId: string, error: Error): Promise<void> {
    const health = this.pluginHealth.get(pluginId);
    if (health) {
      health.errors++;
      health.lastError = error.message;
      health.healthy = false;
    }
    
    this.eventLogger.log({
      type: 'security',
      severity: 'high',
      description: `Plugin error: ${pluginId}`,
      timestamp: new Date(),
      details: {
        pluginId,
        error: error.message,
        stack: error.stack
      }
    });
    
    // Attempt recovery
    await this.attemptPluginRecovery(pluginId);
  }

  // Public API methods
  
  getPluginState(pluginId: string): PluginLifecycleState | undefined {
    return this.pluginStates.get(pluginId);
  }

  getPluginDependencies(pluginId: string): PluginDependency[] {
    return this.pluginDependencies.get(pluginId) || [];
  }

  getPluginHealth(pluginId: string): PluginHealthStatus | undefined {
    return this.pluginHealth.get(pluginId);
  }

  getAllPluginStates(): Map<string, PluginLifecycleState> {
    return new Map(this.pluginStates);
  }

  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }
    
    // Stop all running plugins
    for (const [pluginId, state] of this.pluginStates) {
      if (state.state === 'running') {
        await this.stopPlugin(pluginId);
      }
    }
    
    this.eventLogger.log({
      type: 'security',
      severity: 'low',
      description: 'Plugin Lifecycle Manager shutdown completed',
      timestamp: new Date(),
      details: {}
    });
  }
}