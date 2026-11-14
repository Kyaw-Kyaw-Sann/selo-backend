import type { RequestHandler } from "express";
import { AppError } from "../../utils/app.error.js";
import { categoryIdParamsSchema, listCategoriesQuerySchema, type CreateCategoryInput, type UpdateCategoryInput, type UpdateCategoryStatusInput } from "./categories.schema.js";
import * as categoriesService from "./categories.service.js";

export const listCategories: RequestHandler = async (req, res) => {
  const result = listCategoriesQuerySchema.safeParse(req.query);

  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ?? "Invalid query",
      400,
      "VALIDATION_ERROR",
    );
  }

  const data = await categoriesService.listCategories(result.data);

  res.status(200).json({
    success: true,
    message: "Categories retrieved successfully",
    data: data.categories,
    pagination: data.pagination,
  });
};

export const createCategory: RequestHandler = async (req, res) => {
  const input: CreateCategoryInput = req.body;
  const category = await categoriesService.createCategory(input);

  res.status(201).json({
    success: true,
    message: "Category created successfully",
    data: category,
  });
};

export const updateCategory: RequestHandler = async (req, res) => {
  const result = categoryIdParamsSchema.safeParse(req.params);

  if (!result.success) {
    throw new AppError(
      "Invalid category ID",
      400,
      "VALIDATION_ERROR",
    );
  }

  const input: UpdateCategoryInput = req.body;
  const category = await categoriesService.updateCategory(
    result.data.id,
    input,
  );

  res.status(200).json({
    success: true,
    message: "Category updated successfully",
    data: category,
  });
};

export const updateCategoryStatus: RequestHandler = async (req, res) => {
  const result = categoryIdParamsSchema.safeParse(req.params);

  if (!result.success) {
    throw new AppError(
      "Invalid category ID",
      400,
      "VALIDATION_ERROR",
    );
  }

  const input: UpdateCategoryStatusInput = req.body;

  const category = await categoriesService.updateCategoryStatus(
    result.data.id,
    input.isActive,
  );

  res.status(200).json({
    success: true,
    message: "Category status updated successfully",
    data: category,
  });
};