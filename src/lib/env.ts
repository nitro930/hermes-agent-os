/**
 * Environment variable validation and access.
 * Validates required environment variables at startup time.
 *
 * Production: Exits process on missing required variables.
 * Development: Logs warnings but continues.
 */

const requiredEnvVars: string[] = [
  'DATABASE_URL',
];

/**
 * Variables that SHOULD be set in production for security.
 * If missing, a warning is logged but the app still starts.
 */
const recommendedProdEnvVars: string[] = [
  'ADMIN_SECRET',
];

let validated = false;

export function validateEnv(): void {
  if (validated) return;
  validated = true;

  // Check required variables
  const missing = requiredEnvVars.filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    console.error(
      `[FATAL] Missing required environment variables: ${missing.join(', ')}`
    );
    console.error('Please set them in your .env file or environment.');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  // Warn about recommended production variables
  if (process.env.NODE_ENV === 'production') {
    const missingRecommended = recommendedProdEnvVars.filter(
      (key) => !process.env[key]
    );

    if (missingRecommended.length > 0) {
      console.warn(
        `[WARN] Recommended production environment variables not set: ${missingRecommended.join(', ')}`
      );
      console.warn(
        '  ADMIN_SECRET — Protects the /api/seed endpoint. Without it, anyone can reset your data.'
      );
    }
  }
}

/** Get an environment variable, throwing if missing in production */
export function getEnv(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined && process.env.NODE_ENV === 'production') {
    console.error(`[FATAL] Missing environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

/** Check if an env var is set (non-empty) */
export function hasEnv(key: string): boolean {
  return !!process.env[key] && process.env[key]!.length > 0;
}

// Auto-validate on import in production
if (process.env.NODE_ENV === 'production') {
  validateEnv();
}
