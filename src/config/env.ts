import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DB_HOST: z.string().trim().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().trim().min(1),
  DB_PASSWORD: z.string(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const invalidFields = result.error.issues
    .map((issue) => issue.path.join("."))
    .join(", ");

  throw new Error(`Invalid environment configuration: ${invalidFields}`);
}

export const env = result.data;
