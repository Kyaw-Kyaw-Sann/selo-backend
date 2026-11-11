import pool from "../../config/db.js";
import { AppError } from "../../utils/app.error.js";
import * as inventoryRepository from "./inventory.repository.js";
import type { CreateAdjustmentInput, ListInventoryQuery, ListMovementsQuery } from "./inventory.schema.js";

export async function listInventory(query: ListInventoryQuery) {
  const offset = (query.page - 1) * query.limit;
  const result = await inventoryRepository.listInventory(query, offset);

  return {
    inventory: result.rows.map((row) => {
      let stockStatus: "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK";

      if (row.stock_quantity === 0) {
        stockStatus = "OUT_OF_STOCK";
      } else if (row.stock_quantity <= row.min_stock_level) {
        stockStatus = "LOW_STOCK";
      } else {
        stockStatus = "IN_STOCK";
      }

      return {
        productId: row.product_id,
        sku: row.sku,
        productName: row.product_name,
        baseUnitId: row.base_unit_id,
        baseUnitName: row.base_unit_name,
        stockQuantity: row.stock_quantity,
        minStockLevel: row.min_stock_level,
        stockStatus,
        isActive: Boolean(row.is_active),
      };
    }),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  };
}

export async function listMovements(query: ListMovementsQuery) {
  const offset = (query.page - 1) * query.limit;
  const result = await inventoryRepository.listMovements(query, offset);

  return {
    movements: result.rows.map((movement) => ({
      id: movement.id,
      productId: movement.product_id,
      sku: movement.sku,
      productName: movement.product_name,
      baseUnitName: movement.base_unit_name,
      movementType: movement.movement_type,
      quantityChange: movement.quantity_change,
      quantityBefore: movement.quantity_before,
      quantityAfter: movement.quantity_after,
      referenceType: movement.reference_type,
      referenceId: movement.reference_id,
      reason: movement.reason,
      performedBy: movement.performed_by,
      performedByName: movement.performed_by_name,
      createdAt: movement.created_at,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    },
  };
}

export async function getMovementById(id: string) {
  const movement = await inventoryRepository.getMovementById(id);

  if (!movement) {
    throw new AppError(
      "Inventory movement not found",
      404,
      "MOVEMENT_NOT_FOUND",
    );
  }

  return {
    id: movement.id,
    productId: movement.product_id,
    sku: movement.sku,
    productName: movement.product_name,
    baseUnitName: movement.base_unit_name,
    movementType: movement.movement_type,
    quantityChange: movement.quantity_change,
    quantityBefore: movement.quantity_before,
    quantityAfter: movement.quantity_after,
    referenceType: movement.reference_type,
    referenceId: movement.reference_id,
    reason: movement.reason,
    performedBy: movement.performed_by,
    performedByName: movement.performed_by_name,
    operationKey: movement.operation_key,
    createdAt: movement.created_at,
  };
}

export async function createAdjustment(
  input: CreateAdjustmentInput,
  performedBy: string,
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const product = await inventoryRepository.getProductForAdjustment(
      connection,
      input.productId,
    );

    if (!product) {
      throw new AppError(
        "Product not found",
        404,
        "PRODUCT_NOT_FOUND",
      );
    }

    const quantityBefore = product.stock_quantity;
    const quantityAfter = quantityBefore + input.quantityChange;

    if (quantityAfter < 0) {
      throw new AppError(
        "Adjustment would make stock negative",
        409,
        "INSUFFICIENT_STOCK",
      );
    }

    if (quantityAfter > 2147483647) {
      throw new AppError(
        "Stock quantity exceeds the supported limit",
        409,
        "STOCK_LIMIT_EXCEEDED",
      );
    }

    const operationKey = `manual:${input.operationKey}`;

    await inventoryRepository.updateProductStock(
      connection,
      product.id,
      quantityAfter,
    );

    const movementId =
      await inventoryRepository.createAdjustmentMovement(connection, {
        productId: product.id,
        quantityChange: input.quantityChange,
        quantityBefore,
        quantityAfter,
        reason: input.reason,
        performedBy,
        operationKey,
      });

    await connection.commit();

    return {
      id: movementId,
      productId: product.id,
      quantityChange: input.quantityChange,
      quantityBefore,
      quantityAfter,
      reason: input.reason,
      performedBy,
      operationKey,
    };
  } catch (error) {
    await connection.rollback();

    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY"
    ) {
      throw new AppError(
        "Operation key has already been used",
        409,
        "OPERATION_KEY_EXISTS",
      );
    }

    throw error;
  } finally {
    connection.release();
  }
}
