import type { RequestHandler } from "express";
import { createPurchseSchema, listPurchasesQuerySchema, purchasesIdParamsSchema, type CreatePurchaseInput } from "./purchases.schema.js";
import { AppError } from "../../utils/app.error.js";
import * as purchaseService from './purchases.service.js'

export const listPurchases: RequestHandler = async(req, res) => {
    const result = listPurchasesQuerySchema.safeParse(req.query)

    if(!result.success){
        throw new AppError(
            result.error.issues[0]?.message ?? "Invalid query",
      400,
      "VALIDATION_ERROR",
        )
    }

    const supplier = await purchaseService.listPurchases(result.data)

    res.status(200).json({
        success: true,
        data: supplier.purchases,
        pagination: supplier.pagination
    })
}

export const getPurchaseById: RequestHandler = async(req, res) => {
    const result = purchasesIdParamsSchema.safeParse(req.params)

    if(!result.success){
        throw new AppError(
            "Invalid purchase ID",
      400,
      "VALIDATION_ERROR",
        )
    }

    const purchase = await purchaseService.getPurchaseById(result.data.id)

    res.status(200).json({
        success: true,
        message: "Purchase detail is retrieved successfully.",
        data: purchase
    })
}

export const createPurchase: RequestHandler = async (req, res) => {
  if (!req.user) {
    throw new AppError(
      "Authentication required",
      401,
      "UNAUTHENTICATED",
    );
  }

  const input: CreatePurchaseInput = req.body;

  const result = await purchaseService.createPurchase(
    input,
    req.user.id,
  );

  res.status(result.replayed ? 200 : 201).json({
    success: true,
    message: result.replayed
      ? "Purchase already received"
      : "Purchase received successfully",
    data: result.purchase,
  });
};