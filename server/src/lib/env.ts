const REQUIRED_IN_PROD = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

const WARN_IF_MISSING = [
  'ANTHROPIC_API_KEY',
  'R2_ACCOUNT_ID',
  'SMTP_HOST',
];

export function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const missing: string[] = [];

  for (const key of REQUIRED_IN_PROD) {
    if (!process.env[key]) {
      if (isProd) missing.push(key);
      else console.warn(`[Env] Missing ${key} — required in production`);
    }
  }

  if (missing.length > 0) {
    console.error(`[Env] Fatal: missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  for (const key of WARN_IF_MISSING) {
    if (!process.env[key]) {
      console.warn(`[Env] ${key} not set — some features will be disabled`);
    }
  }
}
