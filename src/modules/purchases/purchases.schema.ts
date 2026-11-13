import z from "zod";


export const listPurchasesQuerySchema = z
.object({
    search: z.string().trim().max(50).default(""),
    supplierId: z
      .string()
      .regex(/^[1-9]\d*$/, "Invalid supplier ID")
      .max(19)
      .refine(
        (value) => value.length < 19 || value <= "9223372036854775807",
        "Invalid supplier ID",
      )
      .optional(),
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

export type ListPurchaseQuery = z.infer<typeof listPurchasesQuerySchema>

export const purchasesIdParamsSchema = z.object({
    id: z
    .string()
    .regex(/^[1-9]\d*$/, "Invalid purchase ID")
    .max(19, "Invalid purchase ID")
    .refine(
      (value) => value.length < 19 || value <= "9223372036854775807",
      "Invalid purchase ID",
    ),
}
)

const purchaseReferenceIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "Invalid reference ID")
  .max(19)
  .refine(
    (value) => value.length < 19 || value <= "9223372036854775807",
    "Invalid reference ID",
  );

export const createPurchseSchema = z
.object({
    supplierId: purchaseReferenceIdSchema.nullable().default(null),
    notes: z.string().trim().min(1).max(5000).nullable().default(null),
    idempotencyKey: z.string().trim().min(1).max(150),
    items: z
      .array(
        z
          .object({
            productUnitId: purchaseReferenceIdSchema,
            quantity: z.number().int().min(1).max(2147483647),
            unitCost: z
              .string()
              .regex(
                /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/,
                "Unit cost must be a decimal string with at most 2 decimal places",
              )
              .refine(
                (value) => Number(value) > 0,
                "Unit cost must be positive",
              ),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();


export type CreatePurchaseInput = z.infer<typeof createPurchseSchema>
