import { z } from 'zod';

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('VALUEOUS'),
  NEXT_PUBLIC_PILOT_LABEL: z
    .string()
    .default('Business & Influencer Promo-Code Marketplace'),
  NEXT_PUBLIC_DEFAULT_TIMEZONE: z.string().min(1).default('Asia/Kolkata'),
  NEXT_PUBLIC_DEMO_MODE: z.string().optional().default('true'),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  DATABASE_FILE: z.string().min(1, 'DATABASE_FILE must point to a SQLite database file'),
  TEST_DATABASE_FILE: z.string().optional(),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters for cryptographic safety'),
  CLAIM_CODE_SECRET: z
    .string()
    .min(32, 'CLAIM_CODE_SECRET must be at least 32 characters for HMAC hashing'),
  CRON_SECRET: z.string().optional().default('dev-cron-housekeeping-secret-2026'),
  PLATFORM_FEE_PERCENT: z.coerce.number().int().min(0).max(50).default(10),
  MIN_PAYOUT_RUPEES: z.coerce.number().int().min(50).default(200),
  COOKIE_PARTITIONED_PREVIEW: z.string().optional().default('true'),
  CSP_FRAME_ANCESTORS: z.string().optional().default("'none'"),
  ALLOW_DEV_SEED: z.string().optional().default('false'),
  EMAIL_PROVIDER: z.enum(['local', 'webhook']).default('local'),
  EMAIL_FROM: z.string().default('no-reply@VALUEOUS.local'),
  EMAIL_WEBHOOK_URL: z.string().optional().default(''),
  EMAIL_API_KEY: z.string().optional().default(''),
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  S3_ENDPOINT: z.string().optional().default(''),
  S3_BUCKET: z.string().optional().default(''),
  S3_REGION: z.string().optional().default('auto'),
  S3_ACCESS_KEY_ID: z.string().optional().default(''),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(''),
  S3_PUBLIC_BASE_URL: z.string().optional().default(''),
  ERROR_MONITORING_DSN: z.string().optional().default(''),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const fieldIssues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${fieldIssues}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function resetEnvCacheForTests(): void {
  cachedEnv = null;
}
