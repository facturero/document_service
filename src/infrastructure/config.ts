import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3003),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  LOCAL_STORAGE_PATH: z.string().default('./uploads'),

  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_PUBLIC_ENDPOINT: z.string().default(''),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('cmr-documents'),
  S3_ACCESS_KEY_ID: z.string().default(''),
  S3_SECRET_ACCESS_KEY: z.string().default(''),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default('true')
    .transform((v) => v === 'true' || v === '1'),

  CLAMAV_HOST: z.string().default('localhost'),
  CLAMAV_PORT: z.coerce.number().int().positive().default(3310),

  UPLOAD_MAX_SIZE: z.coerce.number().int().positive().default(104857600),

  CORS_ORIGIN: z.string().default('*'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[document-service] Error en configuración:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

export interface AppConfig {
  NODE_ENV: string;
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  STORAGE_DRIVER: 'local' | 's3';
  LOCAL_STORAGE_PATH: string;
  S3_ENDPOINT: string;
  S3_PUBLIC_ENDPOINT: string;
  S3_REGION: string;
  S3_BUCKET: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_FORCE_PATH_STYLE: boolean;
  CLAMAV_HOST: string;
  CLAMAV_PORT: number;
  UPLOAD_MAX_SIZE: number;
  CORS_ORIGIN: string;
}

export const config: AppConfig = {
  NODE_ENV: env.NODE_ENV,
  PORT: env.PORT,
  DB_HOST: env.DB_HOST,
  DB_PORT: env.DB_PORT,
  DB_USER: env.DB_USER,
  DB_PASSWORD: env.DB_PASSWORD,
  DB_NAME: env.DB_NAME,
  STORAGE_DRIVER: env.STORAGE_DRIVER,
  LOCAL_STORAGE_PATH: env.LOCAL_STORAGE_PATH,
  S3_ENDPOINT: env.S3_ENDPOINT,
  S3_PUBLIC_ENDPOINT: env.S3_PUBLIC_ENDPOINT,
  S3_REGION: env.S3_REGION,
  S3_BUCKET: env.S3_BUCKET,
  S3_ACCESS_KEY_ID: env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: env.S3_SECRET_ACCESS_KEY,
  S3_FORCE_PATH_STYLE: env.S3_FORCE_PATH_STYLE,
  CLAMAV_HOST: env.CLAMAV_HOST,
  CLAMAV_PORT: env.CLAMAV_PORT,
  UPLOAD_MAX_SIZE: env.UPLOAD_MAX_SIZE,
  CORS_ORIGIN: env.CORS_ORIGIN,
};
