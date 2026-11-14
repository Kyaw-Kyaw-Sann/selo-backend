import { z } from "zod";

export const userIdParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/, "Invalid user ID")
    .max(19, "Invalid user ID")
    .refine(
      (value) => value.length < 19 || value <= "9223372036854775807",
      "Invalid user ID",
    ),
});

export const listUsersQuerySchema = z.object({
  search: z.string().trim().max(150).default(""),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(150),
  username: z.string().trim().min(1).max(80),
  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .refine(
      (value) => Buffer.byteLength(value, "utf8") <= 72,
      "Password must not exceed 72 bytes",
    ),
  role: z.enum(["OWNER", "CASHIER"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema
  .pick({
    name: true,
    username: true,
    role: true,
  })
  .partial()
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update",
  );

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const updateUserStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export type UpdateUserStatusInput = z.infer<
  typeof updateUserStatusSchema
>;
