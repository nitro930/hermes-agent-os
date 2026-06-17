/**
 * Lightweight in-memory rate limiter for production use.
 *
 * For a single-instance deployment this is sufficient. For multi-instance
 * deployments, swap this for a Redis-backed limiter (the interface is the
 * same — see `check()` below).
 *
 * Default policy:
 *   - 60 requests per minute per IP for API routes
 *   - 10 Fusion requests per minute per IP (Fusion is expensive)
 *   - 30 chat messages per minute per IP
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const POLICIES: Record<string, { limit: number; windowMs: number }> = {
  default: { limit: 60, windowMs: 60_000 },
  fusion: { limit: 10, windowMs: 60_000 },
  chat: { limit: 30, windowMs: 60_000 },
  webhook: { limit: 30, windowMs: 60_000 },
};

export type RateLimitPolicy = keyof typeof POLICIES | 'default';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  identifier: string,
  policy: RateLimitPolicy = 'default',
): RateLimitResult {
  const { limit, windowMs } = POLICIES[policy] || POLICIES.default;
  const key = `${policy}:${identifier}`;
  const now = Date.now();
  const existing = buckets.get(key);

  let bucket: Bucket;
  if (!existing || existing.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  } else {
    bucket = existing;
  }

  bucket.count += 1;
  const allowed = bucket.count <= limit;

  // Opportunistic cleanup — remove expired buckets occasionally
  if (Math.random() < 0.01) {
    for (const [k, b] of buckets.entries()) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }

  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

/** Helper for Next.js API routes — returns a Response-like object on block. */
export function rateLimitResponse(result: RateLimitResult): Response | null {
  if (result.allowed) return null;
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      limit: result.limit,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
        'Retry-After': String(retryAfter),
      },
    },
  );
}

/** Get client IP from a Next.js request, accounting for proxies. */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}
