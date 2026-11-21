const REDACTED_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'newpassword',
  'currentpassword',
  'token',
  'tokenhash',
  'token_hash',
  'resettoken',
  'sessiontoken',
  'code',
  'claimcode',
  'redemptioncode',
  'rawcode',
  'secret',
  'authorization',
  'cookie',
  'set-cookie',
]);

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[Truncated]';
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      const normalized = k.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (REDACTED_KEYS.has(normalized)) {
        sanitized[k] = '[REDACTED]';
      } else {
        sanitized[k] = sanitizeValue(v, depth + 1);
      }
    }
    return sanitized;
  }
  return value;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function sanitizeForLog(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta) return {};
  return sanitizeValue(meta) as Record<string, unknown>;
}

function emit(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'test' && level !== 'error') {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitizeForLog(meta),
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
    const dsn = process.env.ERROR_MONITORING_DSN;
    if (dsn && dsn.startsWith('https://')) {
      // Non-blocking error monitoring webhook hook (no secrets or PII included)
      fetch(dsn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: line,
      }).catch(() => undefined);
    }
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
};
