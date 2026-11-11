import z from "zod";

export const listSuppliersQuerySchema = z.object({
  search: z.string().trim().max(200).default(""),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;

export const supplierIdParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/, "Invalid supplier ID")
    .max(19, "Invalid supplier ID")
    .refine(
      (value) => value.length < 19 || value <= "9223372036854775807",
      "Invalid supplier ID",
    ),
});

export const createSupplierSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    phone: z.string().trim().min(1).max(40).nullable().default(null),
    contactPerson: z.string().trim().min(1).max(150).nullable().default(null),
    address: z.string().trim().min(1).max(5000).nullable().default(null),
    notes: z.string().trim().min(1).max(5000).nullable().default(null),
  })
  .strict();

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    phone: z.string().trim().min(1).max(40).nullable().optional(),
    contactPerson: z.string().trim().min(1).max(150).nullable().optional(),
    address: z.string().trim().min(1).max(5000).nullable().optional(),
    notes: z.string().trim().min(1).max(5000).nullable().optional(),
  })
  .strict()
  .refine(
    (input) => Object.keys(input).length > 0,
    "Provide at least one field to update",
  );

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const updateSupplierStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export type UpdateSupplierStatusInput = z.infer<
  typeof updateSupplierStatusSchema
>;

// CREATE TABLE suppliers (
//     id BIGINT NOT NULL AUTO_INCREMENT,
//     name VARCHAR(200) NOT NULL,
//     phone VARCHAR(40) NULL,
//     contact_person VARCHAR(150) NULL,
//     address TEXT NULL,
//     notes TEXT NULL,
//     is_active BOOLEAN NOT NULL DEFAULT TRUE,
//     created_at DATETIME(3) NOT NULL,
//     updated_at DATETIME(3) NOT NULL,

//     PRIMARY KEY (id)
// ) ENGINE = InnoDB;
