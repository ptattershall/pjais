import { SecurityManager } from './security-manager';
import { PluginStore } from './plugin-store';
import { PluginLoader } from './plugin-loader';
import { PluginData, PluginManifest } from '../../shared/types/plugin';
import { ServiceHealth } from '../../shared/types/system';
import { PlatformUtils } from '../utils/platform';
import * as fs from 'fs-extra';
import * as path from 'path';
import extract from 'extract-zip';

export class PluginManager {
  private store: PluginStore;
  private loader: PluginLoader;
  private securityManager: SecurityManager;
  private isInitialized = false;

  constructor(securityManager: SecurityManager) {
    this.securityManager = securityManager;
    this.store = new PluginStore();
    this.loader = new PluginLoader();
  }

  async initialize(): Promise<void> {
    console.log('Initializing PluginManager...');
    try {
      const loadedPlugins = await this.loader.loadPlugins();
      loadedPlugins.forEach(plugin => this.store.set(plugin));
      this.isInitialized = true;
      console.log(`Loaded ${this.store.size} plugins`);
    } catch (error) {
      console.error('Failed to initialize PluginManager:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down PluginManager...');
    for (const plugin of this.store.list()) {
      if (plugin.enabled) {
        await this.disable(plugin.id);
      }
    }
    this.store.clear();
    this.isInitialized = false;
  }

  async install(pluginPath: string): Promise<PluginData> {
    this.ensureInitialized();
    console.log(`Installing plugin from: ${pluginPath}`);

    const tempDir = path.join(PlatformUtils.getPluginsPath(), 'temp', `plugin_${Date.now()}`);
    await fs.ensureDir(tempDir);

    try {
      await extract(pluginPath, { dir: tempDir });

      const manifestPath = path.join(tempDir, 'manifest.json');
      if (!await fs.pathExists(manifestPath)) {
        throw new Error('Plugin is missing a manifest.json file.');
      }

      const manifest: PluginManifest = await fs.readJson(manifestPath);

      // Validate the manifest against a schema and perform security scan
      const scanResult = await this.securityManager.scanPlugin(tempDir, manifest);
      
      // Handle security scan results
      if (!scanResult.safe) {
        throw new Error(`Plugin security scan failed: ${scanResult.threats.join(', ')}`);
      }
      
      // Log warnings if any
      if (scanResult.warnings.length > 0) {
        console.warn(`Plugin security warnings for ${manifest.id}:`, scanResult.warnings);
      }
      
      // Check if plugin is too risky to install
      if (scanResult.securityLevel === 'high_risk') {
        throw new Error(`Plugin ${manifest.id} poses high security risk and cannot be installed`);
      }

      const finalDir = path.join(PlatformUtils.getPluginsPath(), manifest.id);
      if (await fs.pathExists(finalDir)) {
        throw new Error(`Plugin with ID ${manifest.id} is already installed.`);
      }

      await fs.move(tempDir, finalDir);
      
      const plugin: PluginData = { ...manifest, enabled: false, permissions: [] }; // Permissions should come from manifest
      this.store.set(plugin);
      await this.loader.savePlugin(plugin);

      console.log(`Plugin installed: ${plugin.name} (${plugin.id})`);
      return plugin;
    } catch (error) {
      console.error('Plugin installation failed:', error);
      throw error;
    } finally {
      await fs.remove(tempDir); // Clean up temp directory
    }
  }

  async uninstall(pluginId: string): Promise<boolean> {
    this.ensureInitialized();
    const plugin = this.store.get(pluginId);
    if (!plugin) {
      return false;
    }

    if (plugin.enabled) {
      await this.disable(pluginId);
    }

    this.store.delete(pluginId);
    await this.loader.deletePlugin(pluginId);
    console.log(`Plugin uninstalled: ${plugin.name} (${pluginId})`);
    return true;
  }

  async enable(pluginId: string): Promise<boolean> {
    this.ensureInitialized();
    const plugin = this.store.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }
    if (plugin.enabled) {
      return true;
    }
    plugin.enabled = true;
    this.store.set(plugin);
    await this.loader.savePlugin(plugin);
    console.log(`Plugin enabled: ${plugin.name} (${pluginId})`);
    return true;
  }

  async disable(pluginId: string): Promise<boolean> {
    this.ensureInitialized();
    const plugin = this.store.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }
    if (!plugin.enabled) {
      return true;
    }
    plugin.enabled = false;
    this.store.set(plugin);
    await this.loader.savePlugin(plugin);
    console.log(`Plugin disabled: ${plugin.name} (${pluginId})`);
    return true;
  }

  async list(): Promise<PluginData[]> {
    this.ensureInitialized();
    return this.store.list();
  }

  async getDetails(pluginId: string): Promise<PluginData | null> {
    this.ensureInitialized();
    return this.store.get(pluginId) || null;
  }

  async getHealth(): Promise<ServiceHealth> {
    this.ensureInitialized();
    const enabledPlugins = this.store.list().filter(p => p.enabled).length;
    return {
      service: 'PluginManager',
      status: this.isInitialized ? 'ok' : 'initializing',
      details: {
        totalPlugins: this.store.size,
        enabledPlugins,
      },
    };
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('PluginManager not initialized');
    }
  }
} 