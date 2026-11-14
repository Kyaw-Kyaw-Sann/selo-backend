import z from "zod";

export const listUnitsQuerySchema = z.object({
  search: z.string().trim().max(80).default(""),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ListUnitsQuery = z.infer<typeof listUnitsQuerySchema>;

export const createUnitSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    code: z.string().trim().min(1).max(30),
  })
  .strict();

export type CreateUnitInput = z.infer<typeof createUnitSchema>;

export const unitIdParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/, "Invalid unit ID")
    .max(19, "Invalid unit ID")
    .refine(
      (value) => value.length < 19 || value <= "9223372036854775807",
      "Invalid unit ID",
    ),
});

export const updateUnitSchema = createUnitSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update",
  );

export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

export const updateUnitStatusScheme = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export type UpdateUnitStatusInput = z.infer<typeof updateUnitStatusScheme>

// CREATE TABLE units (
//     id BIGINT NOT NULL AUTO_INCREMENT,
//     name VARCHAR(80) NOT NULL,
//     code VARCHAR(30) NOT NULL,
//     is_active BOOLEAN NOT NULL DEFAULT TRUE,

//     PRIMARY KEY (id),
//     UNIQUE KEY uq_units_code (code)
// ) ENGINE = InnoDB;
