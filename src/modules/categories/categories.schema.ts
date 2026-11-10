import z from "zod";

export const listCategoriesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export type ListCategoryQuery = z.infer<typeof listCategoriesQuerySchema>

export const createCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    parentId: z
      .string()
      .regex(/^[1-9]\d*$/, "Invalid parent category ID")
      .max(19)
      .nullable()
      .default(null),
  })
  .strict();

export type CreateCategoryInput = z.infer<
  typeof createCategorySchema
>;

export const categoryIdParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/, "Invalid category ID")
    .max(19, "Invalid category ID"),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    parentId: z
      .string()
      .regex(/^[1-9]\d*$/, "Invalid parent category ID")
      .max(19)
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update",
  );

export type UpdateCategoryInput = z.infer<
  typeof updateCategorySchema
>;

export const updateCategoryStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export type UpdateCategoryStatusInput = z.infer<
  typeof updateCategoryStatusSchema
>;




// CREATE TABLE categories (
//     id BIGINT NOT NULL AUTO_INCREMENT,
//     name VARCHAR(150) NOT NULL,
//     parent_id BIGINT NULL,
//     is_active BOOLEAN NOT NULL DEFAULT TRUE,
//     created_at DATETIME(3) NOT NULL,
//     updated_at DATETIME(3) NOT NULL,

//     PRIMARY KEY (id),
//     CONSTRAINT fk_categories_parent
//         FOREIGN KEY (parent_id) REFERENCES categories(id)
// ) ENGINE = InnoDB;