import { MemoryManager } from './memory-manager';
import { PluginManager } from './plugin-manager';
import { SecurityManager } from './security-manager';
import { PersonaManager } from './persona-manager';
import {
  ServiceHealth,
  SystemHealthReport,
  ServiceStatus,
} from '../../shared/types/system';

export class ServiceManager {
  private services: {
    personaManager: PersonaManager;
    memoryManager: MemoryManager;
    pluginManager: PluginManager;
    securityManager: SecurityManager;
  };

  constructor(
    personaManager: PersonaManager,
    memoryManager: MemoryManager,
    pluginManager: PluginManager,
    securityManager: SecurityManager
  ) {
    this.services = {
      personaManager,
      memoryManager,
      pluginManager,
      securityManager,
    };
  }

  async getSystemHealth(): Promise<SystemHealthReport> {
    const healthChecks = await Promise.all(
      Object.values(this.services).map(service => service.getHealth())
    );

    const overallStatus = this.calculateOverallStatus(healthChecks);

    return {
      overallStatus,
      services: healthChecks,
      timestamp: new Date(),
    };
  }

  private calculateOverallStatus(healthChecks: ServiceHealth[]): ServiceStatus {
    if (healthChecks.some(h => h.status === 'error')) {
      return 'error';
    }
    if (healthChecks.some(h => h.status === 'degraded')) {
      return 'degraded';
    }
    if (healthChecks.some(h => h.status === 'initializing')) {
      return 'initializing';
    }
    return 'ok';
  }
} 