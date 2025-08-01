import { PluginData } from '../../shared/types/plugin';

export class PluginStore {
  private plugins: Map<string, PluginData> = new Map();

  get(pluginId: string): PluginData | undefined {
    return this.plugins.get(pluginId);
  }

  set(plugin: PluginData): void {
    this.plugins.set(plugin.id, plugin);
  }

  delete(pluginId: string): boolean {
    return this.plugins.delete(pluginId);
  }

  list(): PluginData[] {
    return Array.from(this.plugins.values());
  }

  clear(): void {
    this.plugins.clear();
  }

  get size(): number {
    return this.plugins.size;
  }
} 