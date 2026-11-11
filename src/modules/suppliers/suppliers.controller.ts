import type { RequestHandler } from "express";
import {
  listSuppliersQuerySchema,
  supplierIdParamsSchema,
  updateSupplierSchema,
  updateSupplierStatusSchema,
  type CreateSupplierInput,
  type UpdateSupplierInput,
  type UpdateSupplierStatusInput,
} from "./suppliers.schema.js";
import { AppError } from "../../utils/app.error.js";
import * as supplierService from "./suppliers.service.js";
import { success } from "zod";

export const listSuppliers: RequestHandler = async (req, res) => {
  const result = listSuppliersQuerySchema.safeParse(req.query);

  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ?? "Invalid query",
      400,
      "VALIDATION_ERROR",
    );
  }

  const supplier = await supplierService.listSuppliers(result.data);

  res.status(200).json({
    success: true,
    data: supplier.suppliers,
    pagination: supplier.pagination,
  });
};

export const getSupplierById: RequestHandler = async (req, res) => {
  const result = supplierIdParamsSchema.safeParse(req.params);

  if (!result.success) {
    throw new AppError("Invalid supplier ID", 400, "VALIDATION_ERROR");
  }

  const supplier = await supplierService.getSupplierById(result.data.id);

  res.status(200).json({
    success: true,
    message: "Supplier is retieved successfully.",
    data: supplier,
  });
};

export const createSupplier: RequestHandler = async (req, res) => {
  const input: CreateSupplierInput = req.body;

  const supplier = await supplierService.createSupplier(input);

  res.status(201).json({
    success: true,
    message: "Supplier is created successfully.",
    data: supplier,
  });
};

export const updateSupplier: RequestHandler = async (req, res) => {
  const result = supplierIdParamsSchema.safeParse(req.params);

  if (!result.success) {
    throw new AppError("Invalid supplier ID", 400, "VALIDATION_ERROR");
  }

  const input: UpdateSupplierInput = req.body;

  const supplier = await supplierService.updateSupplier(result.data.id, input);

  res.status(200).json({
    success: true,
    message: "Supplier is updated successfully.",
    data: supplier,
  });
};

export const updateSupplierStatus: RequestHandler = async (req, res) => {
  const result = supplierIdParamsSchema.safeParse(req.params);

  if (!result.success) {
    throw new AppError("Invalid supplier ID", 400, "VALIDATION_ERROR");
  }

  const input: UpdateSupplierStatusInput = req.body;

  const supplier = await supplierService.updateSupplierStatus(
    result.data.id,
    input,
  );

  res.status(200).json({
    success: true,
    message: "Supplier status is updated successfully.",
    data: supplier,
  });
};
