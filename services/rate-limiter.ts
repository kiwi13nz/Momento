// services/rate-limiter.ts
/**
 * Client-side rate limiter to prevent button spam
 * Prevents excessive API calls and improves UX
 */

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

export class RateLimiter {
    private timestamps: number[] = [];
    private config: RateLimitConfig;

    constructor(config: RateLimitConfig) {
        this.config = config;
    }

    /**
     * Try to acquire a token. Returns true if allowed, false if rate limited.
     */
    tryAcquire(): boolean {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        // Remove timestamps outside the current window
        this.timestamps = this.timestamps.filter((ts) => ts > windowStart);

        // Check if under limit
        if (this.timestamps.length < this.config.maxRequests) {
            this.timestamps.push(now);
            return true;
        }

        return false;
    }

    /**
     * Get milliseconds until rate limit resets
     */
    getTimeUntilReset(): number {
        if (this.timestamps.length === 0) return 0;

        const oldestTimestamp = this.timestamps[0];
        const resetTime = oldestTimestamp + this.config.windowMs;
        return Math.max(0, resetTime - Date.now());
    }

    /**
     * Reset the rate limiter
     */
    reset(): void {
        this.timestamps = [];
    }

    /**
     * Factory method to create common rate limiters
     */
    static create(
        type: 'upload' | 'reaction' | 'notification',
        maxRequests?: number,
        windowMs?: number
    ): RateLimiter {
        const configs = {
            upload: { maxRequests: 5, windowMs: 60000 }, // 5 uploads per minute
            reaction: { maxRequests: 30, windowMs: 60000 }, // 30 reactions per minute
            notification: { maxRequests: 10, windowMs: 60000 }, // 10 notifications per minute
        };

        const config = configs[type];
        return new RateLimiter({
            maxRequests: maxRequests ?? config.maxRequests,
            windowMs: windowMs ?? config.windowMs,
        });
    }
}