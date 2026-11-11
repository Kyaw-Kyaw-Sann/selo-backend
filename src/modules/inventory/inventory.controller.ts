import type { RequestHandler } from "express";
import { AppError } from "../../utils/app.error.js";
import { listInventoryQuerySchema, listMovementsQuerySchema, movementIdParamsSchema, type CreateAdjustmentInput } from "./inventory.schema.js";
import * as inventoryService from "./inventory.service.js";

export const listInventory: RequestHandler = async (req, res) => {
  const result = listInventoryQuerySchema.safeParse(req.query);

  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ?? "Invalid query",
      400,
      "VALIDATION_ERROR",
    );
  }

  const data = await inventoryService.listInventory(result.data);

  res.status(200).json({
    success: true,
    data: data.inventory,
    pagination: data.pagination,
  });
};

export const listMovements: RequestHandler = async (req, res) => {
  const result = listMovementsQuerySchema.safeParse(req.query);

  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ?? "Invalid query",
      400,
      "VALIDATION_ERROR",
    );
  }

  const data = await inventoryService.listMovements(result.data);

  res.status(200).json({
    success: true,
    data: data.movements,
    pagination: data.pagination,
  });
};

export const getMovementById: RequestHandler = async (req, res) => {
  const result = movementIdParamsSchema.safeParse(req.params);

  if (!result.success) {
    throw new AppError(
      "Invalid movement ID",
      400,
      "VALIDATION_ERROR",
    );
  }

  const movement = await inventoryService.getMovementById(
    result.data.id,
  );

  res.status(200).json({
    success: true,
    data: movement,
  });
};

export const createAdjustment: RequestHandler = async (req, res) => {
  if (!req.user) {
    throw new AppError(
      "Authentication required",
      401,
      "UNAUTHENTICATED",
    );
  }

  const input: CreateAdjustmentInput = req.body;

  const adjustment = await inventoryService.createAdjustment(
    input,
    req.user.id,
  );

  res.status(201).json({
    success: true,
    message: "Inventory adjusted successfully",
    data: adjustment,
  });
};