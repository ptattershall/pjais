import log from 'electron-log';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

export interface LogContext {
  service?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  duration?: number;
  metadata?: Record<string, any>;
  result?: string;
  securityEvent?: string;
  severity?: string;
  channel?: string;
  direction?: string;
  plugin?: string;
  action?: string;
  tier?: string;
  workerId?: string;
}

export interface LogMessage {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  timestamp?: Date;
}

class Logger {
  private component: string;

  constructor(component: string) {
    this.component = component;
  }

  private formatMessage(message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
    return `[${timestamp}] [${this.component}] ${message}${contextStr}`;
  }

  private logWithLevel(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const formattedMessage = this.formatMessage(message, context);
    
    if (error) {
      log[level](formattedMessage, error);
    } else {
      log[level](formattedMessage);
    }
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.logWithLevel('error', message, context, error);
  }

  warn(message: string, context?: LogContext): void {
    this.logWithLevel('warn', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.logWithLevel('info', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.logWithLevel('debug', message, context);
  }

  verbose(message: string, context?: LogContext): void {
    this.logWithLevel('verbose', message, context);
  }

  // Performance logging
  time(operation: string, context?: LogContext): () => void {
    const startTime = Date.now();
    this.debug(`Starting operation: ${operation}`, context);

    return () => {
      const duration = Date.now() - startTime;
      this.info(`Completed operation: ${operation}`, { ...context, duration });
    };
  }

  // Database operation logging
  dbOperation(operation: string, table?: string, context?: LogContext): {
    success: (result?: any) => void;
    error: (error: Error) => void;
    end: () => void;
  } {
    const startTime = Date.now();
    const operationContext = { ...context, operation, table };
    
    this.debug(`Database operation started: ${operation}`, operationContext);

    return {
      success: (result?: any) => {
        const duration = Date.now() - startTime;
        this.info(`Database operation completed: ${operation}`, { 
          ...operationContext, 
          duration,
          result: result ? 'success' : 'completed'
        });
      },
      error: (error: Error) => {
        const duration = Date.now() - startTime;
        this.error(`Database operation failed: ${operation}`, { 
          ...operationContext, 
          duration 
        }, error);
      },
      end: () => {
        const duration = Date.now() - startTime;
        this.debug(`Database operation ended: ${operation}`, { 
          ...operationContext, 
          duration 
        });
      }
    };
  }

  // Service lifecycle logging
  serviceLifecycle(service: string, action: 'initializing' | 'initialized' | 'starting' | 'started' | 'stopping' | 'stopped' | 'error', context?: LogContext): void {
    const level = action === 'error' ? 'error' : action.includes('ing') ? 'debug' : 'info';
    this.logWithLevel(level, `Service ${service} ${action}`, { ...context, service });
  }

  // Security logging
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    const message = `SECURITY [${severity.toUpperCase()}]: ${event}`;
    const level = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
    this.logWithLevel(level, message, { ...context, securityEvent: event, severity });
  }

  // IPC logging
  ipc(channel: string, direction: 'request' | 'response', context?: LogContext): void {
    this.debug(`IPC ${direction}: ${channel}`, { ...context, channel, direction });
  }

  // Plugin logging
  plugin(plugin: string, action: string, context?: LogContext): void {
    this.info(`Plugin ${plugin}: ${action}`, { ...context, plugin, action });
  }

  // Memory operation logging
  memory(operation: string, tier?: string, context?: LogContext): void {
    this.debug(`Memory operation: ${operation}`, { ...context, operation, tier });
  }

  // Worker thread logging
  worker(workerId: string, action: string, context?: LogContext): void {
    this.debug(`Worker ${workerId}: ${action}`, { ...context, workerId, action });
  }
}

// Factory function to create loggers for different components
export function createLogger(component: string): Logger {
  return new Logger(component);
}

// Pre-configured loggers for common components
export const loggers = {
  database: createLogger('Database'),
  security: createLogger('Security'),
  memory: createLogger('Memory'),
  plugin: createLogger('Plugin'),
  ipc: createLogger('IPC'),
  worker: createLogger('Worker'),
  service: createLogger('Service'),
  app: createLogger('App')
};

// Export default logger for general use
export default createLogger('Main');