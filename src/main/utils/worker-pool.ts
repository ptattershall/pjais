import { Worker } from 'worker_threads';
import * as path from 'path';
import * as os from 'os';
import { loggers } from './logger';

export interface WorkerPoolConfig {
  maxWorkers: number;
  workerScript: string;
  workerData?: any;
  timeout?: number;
}

export interface WorkerTask<T = any> {
  id: string;
  type: string;
  payload: T;
  timeout?: number;
}

export interface WorkerResult<T = any> {
  success: boolean;
  result?: T;
  error?: string;
  metrics?: {
    processingTime: number;
    memoryUsage: number;
    itemsProcessed: number;
  };
}

interface WorkerInstance {
  worker: Worker;
  busy: boolean;
  taskId: string | null;
  createdAt: Date;
  tasksCompleted: number;
  lastUsed: Date;
}

interface PendingTask {
  task: WorkerTask;
  resolve: (result: WorkerResult) => void;
  reject: (error: Error) => void;
  timeout?: NodeJS.Timeout;
}

export class WorkerPool {
  private workers: WorkerInstance[] = [];
  private taskQueue: PendingTask[] = [];
  private config: WorkerPoolConfig;
  private isShuttingDown: boolean = false;
  private workerIdCounter: number = 0;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: WorkerPoolConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default timeout
      ...config,
      maxWorkers: Math.max(1, config.maxWorkers || os.cpus().length - 1)
    };

    // Start with one worker
    this.createWorker();
    
    // Start health check
    this.startHealthCheck();
  }

  async executeTask<T = any>(task: WorkerTask<T>): Promise<WorkerResult<T>> {
    if (this.isShuttingDown) {
      throw new Error('Worker pool is shutting down');
    }

    return new Promise((resolve, reject) => {
      const pendingTask: PendingTask = {
        task,
        resolve,
        reject
      };

      // Set up timeout
      const timeout = task.timeout || this.config.timeout;
      if (timeout) {
        pendingTask.timeout = setTimeout(() => {
          this.handleTaskTimeout(task.id);
          reject(new Error(`Task ${task.id} timed out after ${timeout}ms`));
        }, timeout);
      }

      this.taskQueue.push(pendingTask);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.taskQueue.length === 0) return;

    // Try to find an available worker
    let availableWorker = this.workers.find(w => !w.busy);
    
    // If no worker available and we can create more, create one
    if (!availableWorker && this.workers.length < this.config.maxWorkers) {
      availableWorker = await this.createWorker();
    }

    // If still no worker available, wait
    if (!availableWorker) return;

    const pendingTask = this.taskQueue.shift();
    if (!pendingTask) return;

    this.assignTaskToWorker(availableWorker, pendingTask);
  }

  private async createWorker(): Promise<WorkerInstance> {
    const workerId = ++this.workerIdCounter;
    loggers.worker.info(`Creating worker ${workerId} (total: ${this.workers.length + 1}/${this.config.maxWorkers})`, {});

    const worker = new Worker(this.config.workerScript, {
      workerData: {
        workerId,
        ...this.config.workerData
      }
    });

    const workerInstance: WorkerInstance = {
      worker,
      busy: false,
      taskId: null,
      createdAt: new Date(),
      tasksCompleted: 0,
      lastUsed: new Date()
    };

    // Set up error handling
    worker.on('error', (error) => {
      loggers.worker.error('Worker error', { workerId: String(workerId) }, error as Error);
      this.handleWorkerError(workerInstance, error as Error);
    });

    worker.on('exit', (code) => {
      loggers.worker.info(`Worker ${workerId} exited with code ${code}`, {});
      this.removeWorker(workerInstance);
    });

    // Wait for worker to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Worker ${workerId} failed to initialize within timeout`));
      }, 10000);

      worker.once('message', (message) => {
        clearTimeout(timeout);
        if (message.type === 'ready') {
          resolve();
        } else {
          reject(new Error(`Worker ${workerId} sent unexpected initialization message`));
        }
      });
    });

    this.workers.push(workerInstance);
    return workerInstance;
  }

  private assignTaskToWorker(worker: WorkerInstance, pendingTask: PendingTask): void {
    worker.busy = true;
    worker.taskId = pendingTask.task.id;
    worker.lastUsed = new Date();

    // Set up one-time message handler for this task
    const messageHandler = (result: WorkerResult) => {
      worker.worker.off('message', messageHandler);
      
      // Clear timeout
      if (pendingTask.timeout) {
        clearTimeout(pendingTask.timeout);
      }

      // Update worker state
      worker.busy = false;
      worker.taskId = null;
      worker.tasksCompleted++;

      // Resolve the task
      pendingTask.resolve(result);

      // Process next task in queue
      this.processQueue();
    };

    worker.worker.on('message', messageHandler);
    worker.worker.postMessage(pendingTask.task);
  }

  private handleTaskTimeout(taskId: string): void {
    loggers.worker.warn(`Task ${taskId} timed out`, {});
    
    // Find the worker handling this task
    const worker = this.workers.find(w => w.taskId === taskId);
    if (worker) {
      loggers.worker.warn(`Terminating worker ${worker.worker.threadId} due to timeout for task ${taskId}`, {});
      this.terminateWorker(worker);
    }
  }

  private handleWorkerError(worker: WorkerInstance, error: Error): void {
    loggers.worker.error('Worker error occurred', { workerId: String(worker.worker.threadId) }, error);
    
    // If worker was handling a task, reject it
    const pendingTask = this.taskQueue.find(t => t.task.id === worker.taskId);
    if (pendingTask) {
      pendingTask.reject(error);
    }

    // Terminate and replace the worker
    this.terminateWorker(worker);
  }

  private terminateWorker(worker: WorkerInstance): void {
    worker.worker.terminate();
    this.removeWorker(worker);
    
    // Create a new worker to replace it if not shutting down
    if (!this.isShuttingDown && this.workers.length < this.config.maxWorkers) {
      this.createWorker().catch(error => {
        loggers.worker.error('Failed to create replacement worker', {}, error);
      });
    }
  }

  private removeWorker(worker: WorkerInstance): void {
    const index = this.workers.indexOf(worker);
    if (index > -1) {
      this.workers.splice(index, 1);
    }
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Check every minute
  }

  private performHealthCheck(): void {
    const now = new Date();
    const maxIdleTime = 10 * 60 * 1000; // 10 minutes

    // Remove idle workers beyond the minimum
    const idleWorkers = this.workers.filter(w => 
      !w.busy && 
      (now.getTime() - w.lastUsed.getTime()) > maxIdleTime
    );

    // Keep at least one worker
    const workersToRemove = idleWorkers.slice(0, Math.max(0, this.workers.length - 1));
    
    workersToRemove.forEach(worker => {
      const idleSeconds = Math.round((now.getTime() - worker.lastUsed.getTime()) / 1000);
      loggers.worker.info(`Removing idle worker ${worker.worker.threadId} (idle for ${idleSeconds} seconds)`, {});
      this.terminateWorker(worker);
    });
  }

  getStats(): {
    totalWorkers: number;
    busyWorkers: number;
    queuedTasks: number;
    completedTasks: number;
    averageTasksPerWorker: number;
  } {
    const busyWorkers = this.workers.filter(w => w.busy).length;
    const completedTasks = this.workers.reduce((sum, w) => sum + w.tasksCompleted, 0);
    const averageTasksPerWorker = this.workers.length > 0 ? completedTasks / this.workers.length : 0;

    return {
      totalWorkers: this.workers.length,
      busyWorkers,
      queuedTasks: this.taskQueue.length,
      completedTasks,
      averageTasksPerWorker
    };
  }

  async shutdown(): Promise<void> {
    loggers.worker.info(`Shutting down worker pool (${this.workers.length} workers)`, {});
    this.isShuttingDown = true;

    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Cancel all pending tasks
    this.taskQueue.forEach(pendingTask => {
      if (pendingTask.timeout) {
        clearTimeout(pendingTask.timeout);
      }
      pendingTask.reject(new Error('Worker pool is shutting down'));
    });
    this.taskQueue = [];

    // Terminate all workers
    const shutdownPromises = this.workers.map(worker => {
      return new Promise<void>((resolve) => {
        worker.worker.once('exit', () => resolve());
        worker.worker.terminate();
      });
    });

    await Promise.allSettled(shutdownPromises);
    this.workers = [];
    
    loggers.worker.info('Worker pool shutdown complete');
  }
}

// Convenience function to create a worker pool for memory optimization
export function createMemoryOptimizationWorkerPool(config?: Partial<WorkerPoolConfig>): WorkerPool {
  return new WorkerPool({
    maxWorkers: Math.max(1, os.cpus().length - 1),
    workerScript: path.join(__dirname, '../workers/memory-optimization-worker.js'),
    timeout: 60000, // 1 minute timeout for memory optimization tasks
    ...config
  });
}
