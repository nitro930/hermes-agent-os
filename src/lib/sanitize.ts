/**
 * Input sanitization utilities for Hermes Agent OS.
 * Prevents XSS, injection, and malformed data from reaching the database.
 */

/**
 * Strip HTML tags from a string to prevent XSS.
 * Allows safe plain text through unchanged.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

/**
 * Sanitize a string for safe storage — removes null bytes and control chars.
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
    .trim();
}

/**
 * Sanitize an object's string fields recursively.
 * Only sanitizes own enumerable string properties, skips nested objects/arrays.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else if (value !== null && typeof value === 'object') {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Validate that a string doesn't contain suspicious patterns.
 * Returns an array of detected issues (empty = clean).
 */
export function detectSuspiciousPatterns(input: string): string[] {
  const issues: string[] = [];

  // Check for script injection
  if (/<script[\s>]/i.test(input)) {
    issues.push('script_tag');
  }

  // Check for event handler injection
  if (/\bon\w+\s*=/i.test(input)) {
    issues.push('event_handler');
  }

  // Check for data URI with script content
  if (/data\s*:\s*text\/html/i.test(input)) {
    issues.push('data_uri_html');
  }

  // Check for javascript: protocol
  if (/javascript\s*:/i.test(input)) {
    issues.push('javascript_protocol');
  }

  // Check for SQL injection patterns (basic detection)
  if (/(\bUNION\b.*\bSELECT\b|\bDROP\b\s+\bTABLE\b|\bDELETE\b.*\bFROM\b)/i.test(input)) {
    issues.push('sql_injection_pattern');
  }

  return issues;
}

/**
 * Rate at which to log suspicious input warnings.
 * Used in API routes to flag potentially malicious requests.
 */
export function logSuspiciousInput(
  source: string,
  field: string,
  value: string,
  issues: string[]
): void {
  if (issues.length > 0) {
    console.warn(
      `[SECURITY] Suspicious input detected in ${source}.${field}: ` +
      `issues=[${issues.join(',')}] ` +
      `preview=${value.slice(0, 100)}${value.length > 100 ? '...' : ''}`
    );
  }
}
