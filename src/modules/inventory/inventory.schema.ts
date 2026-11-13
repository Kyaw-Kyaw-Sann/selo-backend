import z from "zod";

export const listInventoryQuerySchema = z.object({
    search: z.string().trim().max(200).default(""),
    status: z
    .enum(["ALL", "LOW_STOCK", "OUT_OF_STOCK", "IN_STOCK"])
    .default("ALL"),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export type ListInventoryQuery = z.infer<typeof listInventoryQuerySchema>

export const listMovementsQuerySchema = z
  .object({
    productId: z
      .string()
      .regex(/^[1-9]\d*$/, "Invalid product ID")
      .max(19)
      .refine(
        (value) => value.length < 19 || value <= "9223372036854775807",
        "Invalid product ID",
      )
      .optional(),
    movementType: z
      .enum([
        "ALL",
        "OPENING",
        "PURCHASE",
        "SALE",
        "RETURN",
        "ADJUSTMENT",
      ])
      .default("ALL"),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  .refine(
    (query) => !query.from || !query.to || query.from <= query.to,
    {
      message: "From date must not be after to date",
      path: ["to"],
    },
  );

export type ListMovementsQuery = z.infer<
  typeof listMovementsQuerySchema
>;

export const movementIdParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/, "Invalid movement ID")
    .max(19, "Invalid movement ID")
    .refine(
      (value) => value.length < 19 || value <= "9223372036854775807",
      "Invalid movement ID",
    ),
});

export const createAdjustmentSchema = z
  .object({
    productId: z
      .string()
      .regex(/^[1-9]\d*$/, "Invalid product ID")
      .max(19)
      .refine(
        (value) => value.length < 19 || value <= "9223372036854775807",
        "Invalid product ID",
      ),
    quantityChange: z
      .number()
      .int()
      .min(-2147483647)
      .max(2147483647)
      .refine(
        (value) => value !== 0,
        "Quantity change must not be zero",
      ),
    reason: z.string().trim().min(1).max(255),
    operationKey: z.uuid(),
  })
  .strict();

export type CreateAdjustmentInput = z.infer<
  typeof createAdjustmentSchema
>;
