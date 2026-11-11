import { z } from "zod";

export const listProductsQuerySchema = z.object({
  search: z.string().trim().max(200).default(""),
  categoryId: z
    .string()
    .regex(/^[1-9]\d*$/, "Invalid category ID")
    .max(19)
    .optional(),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export const productIdParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/, "Invalid product ID")
    .max(19, "Invalid product ID")
    .refine(
      (value) => value.length < 19 || value <= "9223372036854775807",
      "Invalid product ID",
    ),
});

const referenceIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "Invalid reference ID")
  .max(19)
  .refine((value) => value.length < 19 || value <= "9223372036854775807");

const sellingPriceSchema = z.string().regex(
  /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/,
  "Selling price must be a nonnegative decimal string with at most 2 decimal places",
);

const createProductUnitSchema = z
  .object({
    unitId: referenceIdSchema,
    conversionFactor: z.number().int().min(1).max(2147483647),
    barcode: z.string().trim().min(1).max(100).nullable().default(null),
    sellingPrice: sellingPriceSchema,
    canPurchase: z.boolean().default(true),
    canSell: z.boolean().default(true),
  })
  .strict()
  .refine((unit) => !unit.canSell || Number(unit.sellingPrice) > 0, {
    message: "Sellable units must have a positive selling price",
    path: ["sellingPrice"],
  });

export const createProductSchema = z
  .object({
    sku: z.string().trim().min(1).max(80),
    name: z.string().trim().min(1).max(200),
    categoryId: referenceIdSchema.nullable().default(null),
    baseUnitId: referenceIdSchema,
    imagePath: z.string().trim().min(1).max(500).nullable().default(null),
    minStockLevel: z.number().int().min(0).max(2147483647).default(0),
    units: z.array(createProductUnitSchema).min(1).max(3),
  })
  .strict()
  .superRefine((product, context) => {
    if (new Set(product.units.map((unit) => unit.unitId)).size !== product.units.length) {
      context.addIssue({ code: "custom", path: ["units"], message: "Product units must not repeat" });
    }

    const baseUnit = product.units.find((unit) => unit.unitId === product.baseUnitId);
    if (!baseUnit || baseUnit.conversionFactor !== 1) {
      context.addIssue({ code: "custom", path: ["units"], message: "Include the base unit with conversion factor 1" });
    }

    const barcodes = product.units.flatMap((unit) => unit.barcode === null ? [] : [unit.barcode]);
    if (new Set(barcodes).size !== barcodes.length) {
      context.addIssue({ code: "custom", path: ["units"], message: "Product barcodes must not repeat" });
    }
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;

const updateProductUnitSchema = z.object({
  unitId: referenceIdSchema,
  conversionFactor: z.number().int().min(1).max(2147483647).optional(),
  barcode: z.string().trim().min(1).max(100).nullable().optional(),
  sellingPrice: sellingPriceSchema.optional(),
  canPurchase: z.boolean().optional(),
  canSell: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).strict();

export const updateProductSchema = z.object({
  sku: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  categoryId: referenceIdSchema.nullable().optional(),
  baseUnitId: referenceIdSchema.optional(),
  imagePath: z.string().trim().min(1).max(500).nullable().optional(),
  minStockLevel: z.number().int().min(0).max(2147483647).optional(),
  units: z.array(updateProductUnitSchema).min(1).max(3).optional(),
}).strict()
  .refine((input) => Object.keys(input).length > 0, "Provide at least one field to update")
  .refine(
    (input) => !input.units || new Set(input.units.map((unit) => unit.unitId)).size === input.units.length,
    { message: "Product units must not repeat", path: ["units"] },
  );

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const updateProductStatusSchema = z.object({
  isActive: z.boolean(),
}).strict();

export type UpdateProductStatusInput = z.infer<typeof updateProductStatusSchema>;
