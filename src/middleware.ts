import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Production security middleware for Hermes Agent OS.
 * - Adds security headers to all responses
 * - Rate limits API endpoints (in-memory sliding window)
 * - Protects destructive endpoints (seed) with admin secret
 * - CORS policy for API routes
 * - Request logging for API routes
 * - Request size limiting
 */

// ─── Rate Limiter (in-memory, per-IP sliding window) ────────────────────────

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false; // Rate limited
  }

  entry.count++;
  return true;
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetTime) rateLimitMap.delete(key);
  }
}, 300000);

// ─── Security Headers ───────────────────────────────────────────────────────

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Permitted-Cross-Domain-Policies': 'none',
};

// ─── Allowed Origins for CORS ───────────────────────────────────────────────

function getAllowedOrigins(): string[] {
  const base = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  // Allow custom origins from env
  const extraOrigins = process.env.CORS_ORIGINS;
  if (extraOrigins) {
    base.push(...extraOrigins.split(',').map(o => o.trim()));
  }

  return base;
}

// ─── Request Size Limit ─────────────────────────────────────────────────────

const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB

// ─── Middleware ──────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;
  const startTime = Date.now();
  const response = NextResponse.next();

  // 1. Add security headers to all responses
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Remove X-Powered-By header (Next.js adds this by default)
  response.headers.delete('X-Powered-By');

  // 2. CORS for API routes
  if (pathname.startsWith('/api')) {
    const allowedOrigins = getAllowedOrigins();
    const requestOrigin = request.headers.get('origin') || '';
    const isAllowed = allowedOrigins.includes(requestOrigin) ||
      requestOrigin.endsWith('.space-z.ai') ||
      requestOrigin.endsWith('.vercel.app');

    if (request.method === 'OPTIONS') {
      // Preflight request
      const corsResponse = new NextResponse(null, { status: 204 });
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        corsResponse.headers.set(key, value);
      }
      corsResponse.headers.set('Access-Control-Allow-Origin', isAllowed ? requestOrigin : '');
      corsResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      corsResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Secret');
      corsResponse.headers.set('Access-Control-Max-Age', '86400');
      return corsResponse;
    }

    if (isAllowed) {
      response.headers.set('Access-Control-Allow-Origin', requestOrigin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }

  // 3. Rate limiting for API routes
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (pathname.startsWith('/api/')) {
    // Skip rate limiting for health checks
    const isHealthCheck = pathname === '/api/health';

    if (!isHealthCheck) {
      // Stricter limits for expensive endpoints
      const isAIEndpoint = pathname.includes('/run') ||
        pathname.includes('/chat') ||
        pathname.includes('/generate') ||
        pathname.includes('/asr') ||
        pathname.includes('/tts');

      const isSSEStream = pathname.includes('/stream') || pathname.includes('/live');

      // SSE streams are long-lived — rate limit the connection, not per-event
      const limit = isAIEndpoint ? 20 : isSSEStream ? 30 : 100;
      const windowMs = 60000; // 1 minute window

      if (!rateLimit(ip, limit, windowMs)) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': '60', ...SECURITY_HEADERS } }
        );
      }
    }
  }

  // 4. Protect destructive endpoints with admin secret
  if (pathname === '/api/seed' && request.method === 'POST') {
    const adminSecret = request.headers.get('x-admin-secret') ||
      request.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.ADMIN_SECRET;

    if (process.env.NODE_ENV === 'production') {
      // In production, ADMIN_SECRET MUST be set and MUST match
      if (!expectedSecret) {
        console.error('[SECURITY] ADMIN_SECRET not set — seed endpoint blocked in production');
        return NextResponse.json(
          { error: 'Server misconfiguration: ADMIN_SECRET not set. Seed endpoint is disabled.' },
          { status: 503, headers: SECURITY_HEADERS }
        );
      }
      if (adminSecret !== expectedSecret) {
        console.warn(`[SECURITY] Unauthorized seed attempt from IP: ${ip}`);
        return NextResponse.json(
          { error: 'Unauthorized. Provide X-Admin-Secret header or ?secret= query param.' },
          { status: 403, headers: SECURITY_HEADERS }
        );
      }
    } else {
      // In development, allow without secret but warn if it doesn't match
      if (expectedSecret && adminSecret !== expectedSecret) {
        return NextResponse.json(
          { error: 'Unauthorized. Provide X-Admin-Secret header or ?secret= query param.' },
          { status: 403, headers: SECURITY_HEADERS }
        );
      }
    }
  }

  // 5. Request size limit for POST/PATCH/PUT
  if (['POST', 'PATCH', 'PUT'].includes(request.method)) {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large. Maximum size is 10MB.' },
        { status: 413, headers: SECURITY_HEADERS }
      );
    }
  }

  // 6. Request logging for API routes (structured)
  if (pathname.startsWith('/api/') && process.env.NODE_ENV === 'production') {
    const duration = Date.now() - startTime;
    const method = request.method;
    // Don't log health checks or SSE streams (too noisy)
    const isNoisy = pathname === '/api/health' ||
      pathname.includes('/stream') ||
      pathname.includes('/live');

    if (!isNoisy) {
      console.log(
        `[API] ${method} ${pathname} ip=${ip} duration=${duration}ms`
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
