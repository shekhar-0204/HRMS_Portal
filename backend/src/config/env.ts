import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  FRONTEND_ORIGIN: z.string().url(),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(12),
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().optional(),
  API_RATE_LIMIT: z.coerce.number().int().positive().optional(),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
  UPLOAD_DIR: z.string().default("./storage/documents"),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(5),
  SEED_DEFAULT_PASSWORD: z.string().min(10).default("ChangeMe@12345"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
