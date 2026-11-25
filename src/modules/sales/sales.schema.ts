import z from "zod";

export const listSalesQuerySchema = z.object({
    search: z.string().trim().max(50).default(""),
    paymentMethod: z.enum(["ALL", "CASH", "QR"]).default("ALL"),
    cashierId: z
      .string()
      .regex(/^[1-9]\d*$/, "Invalid cashier ID")
      .max(19)
      .refine(
        (value) => value.length < 19 || value <= "9223372036854775807",
        "Invalid cashier ID",
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

export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>

const saleProductUnitIdSchema = z.string()
  .regex(/^[1-9]\d*$/, "Invalid product unit ID")
  .max(19, "Invalid product unit ID")
  .refine(
    (value) => value.length < 19 || value <= "9223372036854775807",
    "Invalid product unit ID",
  );

export const createSaleSchema = z.strictObject({
  idempotencyKey: z.string().trim().min(1, "Idempotency key is required").max(150),
  items: z.array(z.strictObject({
    productUnitId: saleProductUnitIdSchema,
    quantity: z.number().int().min(1, "Quantity must be greater than zero").max(2147483647),
  })).min(1, "At least one sale item is required").max(100),
  payment: z.discriminatedUnion("method", [
    z.strictObject({
      method: z.literal("CASH"),
      tenderedAmount: z.string().regex(
        /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/,
        "Tendered amount must be a decimal string with at most 2 decimal places",
      ),
    }),
    z.strictObject({
      method: z.literal("QR"),
      manuallyConfirmed: z.literal(true, "QR payment must be manually confirmed"),
      referenceNo: z.string().trim().min(1).max(100).nullable().default(null),
    }),
  ]),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const saleIdParamsSchema = z.object({
   id: z
    .string()
    .regex(/^[1-9]\d*$/, "Invalid sale ID")
    .max(19, "Invalid sale ID")
    .refine(
      (value) => value.length < 19 || value <= "9223372036854775807",
      "Invalid sale ID",
    ),
})
