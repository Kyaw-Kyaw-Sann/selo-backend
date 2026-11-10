import type { RequestHandler } from "express";
import * as unitsService from "./units.service.js";
import {
  listUnitsQuerySchema,
  unitIdParamsSchema,
  type CreateUnitInput,
  type UpdateUnitInput,
  type UpdateUnitStatusInput,
} from "./units.schema.js";
import { AppError } from "../../utils/app.error.js";

export const listUnits: RequestHandler = async (req, res) => {
  const result = listUnitsQuerySchema.safeParse(req.query);

  if (!result.success) {
    throw new AppError(
      result.error.issues[0].message ?? "Invalid Query",
      400,
      "VALIDATION_ERROR",
    );
  }

  const data = await unitsService.listUnits(result.data);

  res.status(200).json({
    success: true,
    data: data.units,
    pagination: data.pagination,
  });
};

export const createUnit: RequestHandler = async (req, res) => {
  const input: CreateUnitInput = req.body;
  const unit = await unitsService.createUnit(input);

  res.status(201).json({
    success: true,
    message: "Unit is created successfully.",
    data: unit,
  });
};

export const updateUnit: RequestHandler = async (req, res) => {
  const result = unitIdParamsSchema.safeParse(req.params);

  if (!result.success) {
    throw new AppError("Invalid unit ID", 400, "VALIDATION_ERROR");
  }

  const input: UpdateUnitInput = req.body;
  const unit = await unitsService.updateUnit(result.data.id, input);

  res.status(200).json({
    success: true,
    message: "Unit is updated successfully.",
    data: unit,
  });
};

export const updateUnitStatus: RequestHandler = async (req, res) => {
  const result = unitIdParamsSchema.safeParse(req.params);

  if (!result.success) {
    throw new AppError("Invalid unit ID", 400, "VALIDATION_ERROR");
  }

  const input: UpdateUnitStatusInput = req.body;
  const unit = await unitsService.updateUnitStatus(
    result.data.id,
    input.isActive,
  );

  res.status(200).json({
    success: true,
    message: "Unit status is updated successfully.",
    data: unit,
  });
};
