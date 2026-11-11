import type { RequestHandler } from "express";
import { AppError } from "../../utils/app.error.js";
import { listProductsQuerySchema, productIdParamsSchema, type CreateProductInput, type UpdateProductInput, type UpdateProductStatusInput } from "./products.schema.js";
import * as productsService from "./products.service.js";

export const listProducts: RequestHandler = async (req, res) => {
  const result = listProductsQuerySchema.safeParse(req.query);

  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ?? "Invalid query",
      400,
      "VALIDATION_ERROR",
    );
  }

  const data = await productsService.listProducts(result.data);

  res.status(200).json({
    success: true,
    data: data.products,
    pagination: data.pagination,
  });
};

export const getProductById: RequestHandler = async (req, res) => {
  const result = productIdParamsSchema.safeParse(req.params);

  if (!result.success) {
    throw new AppError("Invalid product ID", 400, "VALIDATION_ERROR");
  }

  if (!req.user) {
    throw new AppError("Authentication required", 401, "UNAUTHENTICATED");
  }

  const product = await productsService.getProductById(
    result.data.id,
    req.user.role,
  );

  res.status(200).json({ success: true, data: product });
};

export const createProduct: RequestHandler = async (req, res) => {
  const input: CreateProductInput = req.body;
  const product = await productsService.createProduct(input);

  res.status(201).json({
    success: true,
    message: "Product created successfully",
    data: product,
  });
};

export const updateProduct: RequestHandler = async (req, res) => {
  const result = productIdParamsSchema.safeParse(req.params);
  if (!result.success) {
    throw new AppError("Invalid product ID", 400, "VALIDATION_ERROR");
  }

  const input: UpdateProductInput = req.body;
  const product = await productsService.updateProduct(result.data.id, input);
  res.status(200).json({
    success: true,
    message: "Product updated successfully",
    data: product,
  });
};

export const updateProductStatus: RequestHandler = async (req, res) => {
  const result = productIdParamsSchema.safeParse(req.params);
  if (!result.success) {
    throw new AppError("Invalid product ID", 400, "VALIDATION_ERROR");
  }

  const input: UpdateProductStatusInput = req.body;
  const product = await productsService.updateProductStatus(result.data.id, input.isActive);

  res.status(200).json({
    success: true,
    message: "Product status updated successfully",
    data: product,
  });
};
