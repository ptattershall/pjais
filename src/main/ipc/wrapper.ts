import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { RateLimiter } from '../utils/rate-limiter';
import { SecurityManager } from '../services/security-manager';
import { Services } from '../services';
import { SecurityEvent } from '../../shared/types/security';

interface HandlerOptions {
  rateLimit?: {
    points: number;
    duration: number;
  };
  audit?: {
    type: SecurityEvent['type'];
    severity?: SecurityEvent['severity'];
  };
}

// A generic rate limiter for all IPC calls
const generalRateLimiter = new RateLimiter({ windowMs: 1000, max: 20 }); // 20 requests per second

export function handle<T extends unknown[], R>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: T) => R | Promise<R>,
  services: Services,
  options: HandlerOptions = {}
) {
  const { rateLimit, audit } = options;

  // Specific rate limiter for this channel if configured
  const specificRateLimiter = rateLimit
    ? new RateLimiter({ windowMs: rateLimit.duration * 1000, max: rateLimit.points })
    : null;

  ipcMain.handle(channel, async (event: IpcMainInvokeEvent, ...args: T) => {
    const windowId = event.sender.id;
    const generalKey = `${channel}-${windowId}`;
    const specificKey = `${channel}-${windowId}`;

    // 1. General Rate Limiting
    if (!generalRateLimiter.check(generalKey)) {
      const rateLimitInfo = generalRateLimiter.getRateLimitInfo(generalKey);
      
      if (audit && services.securityManager) {
        services.securityManager.logEvent({
          type: 'security',
          severity: 'medium',
          description: `Rate limit exceeded for channel: ${channel}`,
          details: {
            channel,
            windowId,
            rateLimitInfo,
            args: args.length // Don't log actual args for security
          },
        });
      }
      
      throw new Error(`Rate limit exceeded for channel: ${channel}. Try again in ${Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000)} seconds.`);
    }

    // 2. Specific Rate Limiting
    if (specificRateLimiter && !specificRateLimiter.check(specificKey)) {
      const rateLimitInfo = specificRateLimiter.getRateLimitInfo(specificKey);
      
      if (audit && services.securityManager) {
        services.securityManager.logEvent({
          type: 'security',
          severity: 'high',
          description: `Specific rate limit exceeded for channel: ${channel}`,
          details: {
            channel,
            windowId,
            rateLimitInfo,
            args: args.length // Don't log actual args for security
          },
        });
      }
      
      throw new Error(`Rate limit exceeded for channel: ${channel}. Try again in ${Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000)} seconds.`);
    }
    
    // 3. Execute the actual handler and audit the outcome
    const startTime = Date.now();
    let success = false;
    
    try {
      const result = await handler(event, ...args);
      success = true;
      
      // Update rate limiters with success status
      generalRateLimiter.check(generalKey, true);
      if (specificRateLimiter) {
        specificRateLimiter.check(specificKey, true);
      }
      
      if (audit && services.securityManager) {
        services.securityManager.logEvent({
          type: audit.type,
          severity: audit.severity || 'low',
          description: `IPC channel invoked and succeeded: ${channel}`,
          details: { 
            args: args.length, // Don't log actual args for security
            durationMs: Date.now() - startTime,
            outcome: 'success',
          },
        });
      }
      return result;
    } catch (error) {
      // Update rate limiters with failure status
      generalRateLimiter.check(generalKey, false);
      if (specificRateLimiter) {
        specificRateLimiter.check(specificKey, false);
      }
      
      if (audit && services.securityManager) {
        services.securityManager.logEvent({
          type: audit.type,
          severity: 'high', // Always high for errors
          description: `IPC channel invoked and failed: ${channel}`,
          details: { 
            args: args.length, // Don't log actual args for security
            durationMs: Date.now() - startTime,
            outcome: 'failure',
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
      console.error(`[IPC-ERROR] on channel ${channel}:`, error);
      // Re-throw the error to be caught by the renderer process
      throw error;
    }
  });
} 