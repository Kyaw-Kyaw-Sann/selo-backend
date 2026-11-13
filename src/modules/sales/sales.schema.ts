import z from "zod";
import { id } from "zod/locales";

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