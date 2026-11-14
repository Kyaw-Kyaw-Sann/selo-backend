import type { RequestHandler } from "express";
import { listSalesQuerySchema, saleIdParamsSchema } from "./sales.schema.js";
import { AppError } from "../../utils/app.error.js";
import * as salesService from './sales.service.js'
import { success } from "zod";

export const listSales: RequestHandler = async (req, res) => {
    const result = listSalesQuerySchema.safeParse(req.query)

    if(!result.success){
        throw new AppError(
             result.error.issues[0]?.message ?? "Invalid query",
      400,
      "VALIDATION_ERROR",
        )
    }

    const data = await salesService.listSales(result.data)

    res.status(200).json({
        success: true,
        message: "Sales retrieved successfully",
        data: data.sales,
        pagination: data.pagination
    })
}

export const getSaleById: RequestHandler = async (req, res) => {
    const result = saleIdParamsSchema.safeParse(req.params)

    if(!result.success){
        throw new AppError(
             "Invalid sale ID",
      400,
      "VALIDATION_ERROR",
        )
    }

    if(!req.user){
        throw new AppError(
            "Authentication required",
      401,
      "UNAUTHENTICATED",
        )
    }

    const sale = await salesService.getSaleById(result.data.id, req.user.role)

    res.status(200).json({
        success: true,
        message: "Sale retrieved successfully",
        data: sale
    })

}