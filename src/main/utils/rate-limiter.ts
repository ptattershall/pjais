export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (key: string) => string;
  onLimitReached?: (key: string, hitCount: number) => void;
}

interface RateLimitInfo {
  hits: number[];
  consecutiveFailures: number;
  lastFailureTime?: number;
  totalRequests: number;
  blockedRequests: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitInfo>();
  private options: RateLimiterOptions;
  private cleanupInterval: NodeJS.Timeout;

  constructor(options: RateLimiterOptions) {
    this.options = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...options
    };

    // More frequent cleanup to prevent memory leaks
    this.cleanupInterval = setInterval(() => this.cleanup(), Math.min(this.options.windowMs, 30000));
  }

  public check(key: string, success: boolean = true): boolean {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    const processedKey = this.options.keyGenerator ? this.options.keyGenerator(key) : key;

    let info = this.store.get(processedKey);
    if (!info) {
      info = {
        hits: [],
        consecutiveFailures: 0,
        totalRequests: 0,
        blockedRequests: 0
      };
      this.store.set(processedKey, info);
    }

    info.totalRequests++;

    // Filter out old hits
    info.hits = info.hits.filter(timestamp => timestamp > windowStart);

    // Check if we should skip this request type
    if ((success && this.options.skipSuccessfulRequests) || 
        (!success && this.options.skipFailedRequests)) {
      return true;
    }

    // Enhanced rate limiting with failure tracking
    const currentHits = info.hits.length;
    const isBlocked = currentHits >= this.options.max;
    
    // Additional blocking for consecutive failures
    if (!success) {
      info.consecutiveFailures++;
      info.lastFailureTime = now;
      
      // More aggressive rate limiting for repeated failures
      if (info.consecutiveFailures > 5) {
        const failureWindowStart = now - 60000; // 1 minute window for failures
        if (info.lastFailureTime && info.lastFailureTime > failureWindowStart) {
          console.warn(`[RATE-LIMIT] Key "${processedKey}" blocked due to consecutive failures.`);
          info.blockedRequests++;
          return false;
        }
      }
    } else {
      // Reset consecutive failures on success
      info.consecutiveFailures = 0;
    }

    if (isBlocked) {
      console.warn(`[RATE-LIMIT] Key "${processedKey}" rate limited. Hits: ${currentHits}/${this.options.max}`);
      info.blockedRequests++;
      
      if (this.options.onLimitReached) {
        this.options.onLimitReached(processedKey, currentHits);
      }
      
      return false;
    }

    info.hits.push(now);
    return true;
  }

  public getRateLimitInfo(key: string): {
    hits: number;
    remaining: number;
    resetTime: number;
    totalRequests: number;
    blockedRequests: number;
  } {
    const processedKey = this.options.keyGenerator ? this.options.keyGenerator(key) : key;
    const info = this.store.get(processedKey);
    
    if (!info) {
      return {
        hits: 0,
        remaining: this.options.max,
        resetTime: Date.now() + this.options.windowMs,
        totalRequests: 0,
        blockedRequests: 0
      };
    }

    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    const recentHits = info.hits.filter(timestamp => timestamp > windowStart);

    return {
      hits: recentHits.length,
      remaining: Math.max(0, this.options.max - recentHits.length),
      resetTime: recentHits.length > 0 ? recentHits[0] + this.options.windowMs : now + this.options.windowMs,
      totalRequests: info.totalRequests,
      blockedRequests: info.blockedRequests
    };
  }

  public reset(key?: string): void {
    if (key) {
      const processedKey = this.options.keyGenerator ? this.options.keyGenerator(key) : key;
      this.store.delete(processedKey);
    } else {
      this.store.clear();
    }
  }

  public getStats(): {
    totalKeys: number;
    totalRequests: number;
    totalBlocked: number;
    memoryUsage: number;
  } {
    let totalRequests = 0;
    let totalBlocked = 0;

    for (const info of this.store.values()) {
      totalRequests += info.totalRequests;
      totalBlocked += info.blockedRequests;
    }

    return {
      totalKeys: this.store.size,
      totalRequests,
      totalBlocked,
      memoryUsage: this.store.size * 200 // Rough estimate in bytes
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    const keysToDelete: string[] = [];

    for (const [key, info] of this.store.entries()) {
      // Filter recent hits
      info.hits = info.hits.filter(ts => ts > windowStart);
      
      // Remove entries that haven't been accessed recently and have no recent hits
      if (info.hits.length === 0 && info.totalRequests === 0) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.store.delete(key));
  }

  public shutdown(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
} 