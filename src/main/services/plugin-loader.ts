import { join } from 'path';
import { promises as fs } from 'fs';
import { PluginData, PluginManifest } from '../../shared/types/plugin';
import { PlatformUtils } from '../utils/platform';

export class PluginLoader {
  private readonly pluginsPath: string;

  constructor() {
    this.pluginsPath = PlatformUtils.getPluginsPath();
  }

  async loadPlugins(): Promise<Map<string, PluginData>> {
    const plugins = new Map<string, PluginData>();
    try {
      const entries = await fs.readdir(this.pluginsPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginDir = join(this.pluginsPath, entry.name);
          try {
            const dataPath = join(pluginDir, 'plugin.json');
            const content = await fs.readFile(dataPath, 'utf8');
            const plugin: PluginData = JSON.parse(content);
            plugins.set(plugin.id, plugin);
          } catch (error) {
            console.warn(`Failed to load plugin from ${pluginDir}:`, error);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        console.error('Error loading plugins:', error);
      }
    }
    return plugins;
  }

  async savePlugin(plugin: PluginData): Promise<void> {
    try {
      const pluginDir = join(this.pluginsPath, plugin.id);
      await fs.mkdir(pluginDir, { recursive: true });
      const dataPath = join(pluginDir, 'plugin.json');
      await fs.writeFile(dataPath, JSON.stringify(plugin, null, 2), 'utf8');
    } catch (error) {
      console.error(`Failed to save plugin data for ${plugin.id}:`, error);
    }
  }

  async deletePlugin(pluginId: string): Promise<void> {
    try {
      const pluginDir = join(this.pluginsPath, pluginId);
      await fs.rm(pluginDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to delete plugin directory for ${pluginId}:`, error);
    }
  }
} 