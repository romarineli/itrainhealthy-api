import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().optional(),
  API_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  GARMIN_CLIENT_ID: z.string().optional().default(''),
  GARMIN_CLIENT_SECRET: z.string().optional().default(''),
  GARMIN_REDIRECT_URI: z.string().url().optional(),
  GARMIN_AUTHORIZATION_URL: z.string().url().default('https://connect.garmin.com/oauth2Confirm'),
  GARMIN_TOKEN_URL: z.string().url().default('https://connectapi.garmin.com/di-oauth2-service/oauth/token'),
  GARMIN_API_BASE_URL: z.string().url().default('https://apis.garmin.com'),
  GARMIN_SUCCESS_REDIRECT_URL: z.string().url().optional(),
  GARMIN_ERROR_REDIRECT_URL: z.string().url().optional(),
  GARMIN_STATE_SECRET: z.string().optional().default(''),
  GARMIN_TOKEN_ENCRYPTION_KEY: z.string().optional().default(''),
  WHATSAPP_PROVIDER: z.string().default('stub'),
  WHATSAPP_ACCESS_TOKEN: z.string().optional().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(''),
});

export const env = envSchema.parse(process.env);
