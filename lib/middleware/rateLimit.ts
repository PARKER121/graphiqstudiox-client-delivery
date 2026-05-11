import "server-only";

const ratelimitStore = new Map<
  string,
  { count: number; resetTime: number }
>();

const CLEANUP_INTERVAL = 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    for (const [key, value] of ratelimitStore.entries()) {
      if (value.resetTime < now) {
        ratelimitStore.delete(key);
      }
    }
    lastCleanup = now;
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetTime: number } {
  cleanup();

  const now = Date.now();
  const existing = ratelimitStore.get(key);

  if (!existing || existing.resetTime < now) {
    ratelimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: now + windowMs,
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);

  return {
    allowed: existing.count <= limit,
    remaining,
    resetTime: existing.resetTime,
  };
}
