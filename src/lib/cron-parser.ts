/**
 * Cron expression parser for Hermes Agent OS.
 *
 * Supports:
 * - Standard 5-field cron: minute hour day-of-month month day-of-week
 *   e.g. star-slash-5 star star star star (every 5 minutes)
 *   e.g. "0 9 star star 1-5" (9am on weekdays)
 * - Shorthand aliases: @yearly, @monthly, @weekly, @daily, @hourly, @every_Ns
 * - Human-readable schedule descriptions
 */

export interface CronFields {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[]; // 0=Sun, 6=Sat
}

const SHORTHANDS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

/**
 * Parse a cron expression into its component fields.
 */
export function parseCronExpression(expr: string): CronFields {
  const normalized = expr.trim().toLowerCase();

  // Handle @every_Ns pattern (e.g., @every_30s, @every_5m)
  if (normalized.startsWith('@every_')) {
    return parseEveryShorthand(normalized);
  }

  // Handle standard shorthands
  const expanded = SHORTHANDS[normalized] || normalized;

  const parts = expanded.split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: "${expr}". Expected 5 fields (minute hour day month weekday) or a shorthand.`);
  }

  return {
    minute: parseField(parts[0], 0, 59),
    hour: parseField(parts[1], 0, 23),
    dayOfMonth: parseField(parts[2], 1, 31),
    month: parseField(parts[3], 1, 12),
    dayOfWeek: parseField(parts[4], 0, 6),
  };
}

// Parse a single cron field: step syntax (star/5), lists (1,15), ranges (1-5), range-step (0-23/2)
function parseField(field: string, min: number, max: number): number[] {
  const values = new Set<number>();

  for (const part of field.split(',')) {
    const [rangeStr, stepStr] = part.split('/');
    const step = stepStr ? parseInt(stepStr, 10) : 1;

    let rangeMin = min;
    let rangeMax = max;

    if (rangeStr === '*') {
      // Use full range
    } else if (rangeStr.includes('-')) {
      const [startStr, endStr] = rangeStr.split('-');
      rangeMin = parseInt(startStr, 10);
      rangeMax = parseInt(endStr, 10);
    } else {
      rangeMin = parseInt(rangeStr, 10);
      rangeMax = rangeMin;
    }

    for (let i = rangeMin; i <= rangeMax; i += step) {
      values.add(i);
    }
  }

  return Array.from(values).sort((a, b) => a - b).filter(v => v >= min && v <= max);
}

/**
 * Parse @every_Ns or @every_Nm shorthand.
 */
function parseEveryShorthand(expr: string): CronFields {
  const match = expr.match(/^@every_(\d+)([smh])$/);
  if (!match) {
    throw new Error(`Invalid @every shorthand: "${expr}". Use @every_30s, @every_5m, or @every_1h`);
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2];

  // Convert to minute-aligned schedule
  if (unit === 'h') {
    return { minute: [0], hour: parseField(`*/${amount}`, 0, 23), dayOfMonth: [1], month: [1], dayOfWeek: [0, 1, 2, 3, 4, 5, 6] };
  } else if (unit === 'm') {
    if (amount < 1 || amount > 59) throw new Error('Minutes must be 1-59');
    return { minute: parseField(`*/${amount}`, 0, 59), hour: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23], dayOfMonth: [1], month: [1], dayOfWeek: [0,1,2,3,4,5,6] };
  } else {
    // Seconds — we approximate to the nearest minute since cron is minute-based
    const minutes = Math.max(1, Math.ceil(amount / 60));
    return { minute: parseField(`*/${minutes}`, 0, 59), hour: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23], dayOfMonth: [1], month: [1], dayOfWeek: [0,1,2,3,4,5,6] };
  }
}

/**
 * Calculate the next run time after a given date.
 * Uses brute-force minute-by-minute search (efficient enough for cron).
 */
export function getNextRun(cron: CronFields, after: Date = new Date()): Date {
  const d = new Date(after.getTime());
  d.setSeconds(0, 0); // Align to start of minute
  d.setMinutes(d.getMinutes() + 1); // Start from next minute

  // Search up to 4 years ahead (covers yearly schedules)
  const maxTime = new Date(after.getTime() + 4 * 365.25 * 24 * 60 * 60 * 1000);

  while (d < maxTime) {
    if (
      cron.month.includes(d.getMonth() + 1) &&
      cron.dayOfMonth.includes(d.getDate()) &&
      cron.dayOfWeek.includes(d.getDay()) &&
      cron.hour.includes(d.getHours()) &&
      cron.minute.includes(d.getMinutes())
    ) {
      return d;
    }

    // Skip ahead intelligently
    if (!cron.month.includes(d.getMonth() + 1)) {
      // Skip to next matching month
      d.setMonth(d.getMonth() + 1, 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    if (!cron.dayOfMonth.includes(d.getDate()) || !cron.dayOfWeek.includes(d.getDay())) {
      // Skip to next day
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    if (!cron.hour.includes(d.getHours())) {
      // Skip to next hour
      d.setHours(d.getHours() + 1, 0, 0, 0);
      continue;
    }

    // Try next minute
    d.setMinutes(d.getMinutes() + 1);
  }

  // Fallback: far future
  return new Date(after.getTime() + 365 * 24 * 60 * 60 * 1000);
}

/**
 * Generate a human-readable description of a cron schedule.
 */
export function describeCron(expr: string): string {
  const normalized = expr.trim().toLowerCase();

  // Shorthand descriptions
  const descriptions: Record<string, string> = {
    '@yearly': 'Once a year (Jan 1, midnight)',
    '@annually': 'Once a year (Jan 1, midnight)',
    '@monthly': 'Monthly on the 1st at midnight',
    '@weekly': 'Weekly on Sunday at midnight',
    '@daily': 'Every day at midnight',
    '@midnight': 'Every day at midnight',
    '@hourly': 'Every hour at :00',
  };

  if (descriptions[normalized]) return descriptions[normalized];

  if (normalized.startsWith('@every_')) {
    const match = normalized.match(/^@every_(\d+)([smh])$/);
    if (match) {
      const n = match[1];
      const unit = match[2] === 's' ? 'second' : match[2] === 'm' ? 'minute' : 'hour';
      return `Every ${n} ${unit}${parseInt(n) > 1 ? 's' : ''}`;
    }
  }

  // Parse standard expression
  try {
    const parts = normalized.split(/\s+/);
    if (parts.length !== 5) return `Custom: ${expr}`;

    const [minute, hour, dom, month, dow] = parts;

    // Common patterns
    if (minute === '*/1' && hour === '*') return 'Every minute';
    if (minute === '*/5' && hour === '*') return 'Every 5 minutes';
    if (minute === '*/10' && hour === '*') return 'Every 10 minutes';
    if (minute === '*/15' && hour === '*') return 'Every 15 minutes';
    if (minute === '*/30' && hour === '*') return 'Every 30 minutes';
    if (minute === '0' && hour === '*/1') return 'Every hour';
    if (minute === '0' && hour === '*/2') return 'Every 2 hours';
    if (minute === '0' && hour === '*/6') return 'Every 6 hours';
    if (minute === '0' && hour === '9' && dom === '*' && month === '*' && dow === '1-5') return 'Weekdays at 9:00 AM';
    if (minute === '0' && hour === '9' && dom === '*' && month === '*' && dow === '*') return 'Daily at 9:00 AM';
    if (minute === '30' && hour === '9' && dom === '*' && month === '*' && dow === '1-5') return 'Weekdays at 9:30 AM';

    return `Custom schedule: ${expr}`;
  } catch {
    return `Custom: ${expr}`;
  }
}

/**
 * Validate a cron expression. Returns null if valid, or an error message.
 */
export function validateCronExpression(expr: string): string | null {
  if (!expr || !expr.trim()) return 'Schedule is required';
  try {
    parseCronExpression(expr);
    // Also verify we can calculate next run
    const fields = parseCronExpression(expr);
    getNextRun(fields);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Invalid cron expression';
  }
}

/**
 * Common schedule presets for the UI.
 */
export const SCHEDULE_PRESETS = [
  { label: 'Every minute', value: '*/1 * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at midnight', value: '@daily' },
  { label: 'Daily at 9 AM', value: '0 9 * * *' },
  { label: 'Weekdays at 9 AM', value: '0 9 * * 1-5' },
  { label: 'Weekly on Monday', value: '0 0 * * 1' },
  { label: 'Monthly on the 1st', value: '@monthly' },
] as const;
