import { PerformanceMonitor } from '../utils/performance';
import { performanceService } from '../services/performance-service';
import { ipcMain, IpcMainInvokeEvent } from 'electron';

// Enhanced performance metrics getter - fixes the original error
export const getPerformanceMetrics = async () => {
  return await PerformanceMonitor.getMetrics();
};

// Legacy method for compatibility
export const getPerformanceSummary = () => {
  return PerformanceMonitor.getPerformanceSummary();
};

/**
 * Setup IPC handlers for performance monitoring
 */
export const setupPerformanceIPC = () => {
  // Main performance metrics
  ipcMain.handle('performance:getMetrics', async (_event: IpcMainInvokeEvent) => {
    try {
      return await performanceService.getMetrics();
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      throw error;
    }
  });

  // Performance statistics
  ipcMain.handle('performance:getStats', async (_event: IpcMainInvokeEvent) => {
    try {
      return await performanceService.getPerformanceStats();
    } catch (error) {
      console.error('Failed to get performance stats:', error);
      throw error;
    }
  });

  // Performance alerts
  ipcMain.handle('performance:getAlerts', async (_event: IpcMainInvokeEvent) => {
    try {
      return await performanceService.checkAlerts();
    } catch (error) {
      console.error('Failed to get performance alerts:', error);
      throw error;
    }
  });

  // Start/stop monitoring
  ipcMain.handle('performance:startMonitoring', async (_event: IpcMainInvokeEvent, intervalMs?: number) => {
    try {
      performanceService.startMonitoring(intervalMs);
      return { success: true };
    } catch (error) {
      console.error('Failed to start performance monitoring:', error);
      throw error;
    }
  });

  ipcMain.handle('performance:stopMonitoring', async (_event: IpcMainInvokeEvent) => {
    try {
      performanceService.stopMonitoring();
      return { success: true };
    } catch (error) {
      console.error('Failed to stop performance monitoring:', error);
      throw error;
    }
  });

  // Clear performance data
  ipcMain.handle('performance:clearData', async (_event: IpcMainInvokeEvent) => {
    try {
      performanceService.clearPerformanceData();
      return { success: true };
    } catch (error) {
      console.error('Failed to clear performance data:', error);
      throw error;
    }
  });

  // Measure operation (for renderer-initiated measurements)
  ipcMain.handle('performance:measureOperation', async (_event: IpcMainInvokeEvent, operationName: string) => {
    try {
      // Start timing for renderer operation
      PerformanceMonitor.startTiming(operationName);
      return { success: true, startTime: Date.now() };
    } catch (error) {
      console.error('Failed to start operation measurement:', error);
      throw error;
    }
  });

  ipcMain.handle('performance:endMeasurement', async (_event: IpcMainInvokeEvent, operationName: string) => {
    try {
      const duration = PerformanceMonitor.endTiming(operationName);
      return { success: true, duration };
    } catch (error) {
      console.error('Failed to end operation measurement:', error);
      throw error;
    }
  });

  console.log('📊 Performance IPC handlers registered');
};

// Initialize performance service on module load
performanceService.initialize({
  enableContinuousMonitoring: true,
  monitoringInterval: 30000 // 30 seconds
}).catch(error => {
  console.error('Failed to initialize performance service:', error);
}); 