import type { CreatePurchaseInput, ListPurchaseQuery } from "./purchases.schema.js";
import * as purchaseRepository from "./purchases.repository.js";
import { AppError } from "../../utils/app.error.js";
import pool from "../../config/db.js";
import type { PoolConnection } from "mysql2/promise";
import { ne } from "zod/locales";
import { randomUUID } from "node:crypto";

export async function listPurchases(query: ListPurchaseQuery) {
  const offset = (query.page - 1) * query.limit;

  const result = await purchaseRepository.listPurchases(query, offset);

  return {
    purchases: result.rows.map((purchase) => ({
      id: purchase.id,
      purchaseNo: purchase.purchase_no,
      supplierId: purchase.supplier_id,
      supplierName: purchase.supplier_name,
      totalAmount: purchase.total_amount,
      receivedBy: purchase.received_by,
      receivedByName: purchase.received_by_name,
      receivedAt: purchase.received_at,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
     totalPages: Math.ceil(result.total / query.limit),
    },
  };
}

export async function getPurchaseById(id: string) {
  const purchase = await purchaseRepository.getPurchaseById(id);

  if (!purchase) {
    throw new AppError("Purchase not found", 404, "PURCHASE_NOT_FOUND");
  }

  const items = await purchaseRepository.getPurchaseItems(id);

  return {
    id: purchase.id,
    purchaseNo: purchase.purchase_no,
    supplierId: purchase.supplier_id,
    supplierName: purchase.supplier_name,
    totalAmount: purchase.total_amount,
    notes: purchase.notes,
    receivedBy: purchase.received_by,
    receivedByName: purchase.received_by_name,
    receivedAt: purchase.received_at,
    createdAt: purchase.created_at,
    items: items.map((item)=>(
        {
            id: item.id,
            productId: item.product_id,
            productUnitId: item.product_unit_id,
            productName: item.product_name_snapshot,
            unitName: item.unit_name_snapshot,
            quantity: item.quantity,
            conversionFactor: item.conversion_factor,
            baseQuantity: item.base_quantity,
            unitCost: item.unit_cost,
            lineTotal: item.line_total
        }
    ))
  };
}

const MAX_DECIMAL_VALUE = 999999999999999999n;
const MAX_STOCK = 2147483647n;

function toCents(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");

  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function formatDecimal(value: bigint, places: number): string {
  const scale = 10n ** BigInt(places);

  return `${value / scale}.${(value % scale)
    .toString()
    .padStart(places, "0")}`;
}

export async function findPurchaseReplay(connection: PoolConnection, input: CreatePurchaseInput, receivedBy: string){
  const purchase = await purchaseRepository.getPurchaseByKey(connection, input.idempotencyKey)

  if(!purchase) return null

  const items = await purchaseRepository.getPurchaseItems(purchase.id, connection)

  const sameRequest =
    purchase.supplier_id === input.supplierId &&
    purchase.notes === input.notes &&
    purchase.received_by === receivedBy &&
    items.length === input.items.length &&
    items.every((item, index) => {
      const requested = input.items[index]!;

      return (
        item.product_unit_id === requested.productUnitId &&
        item.quantity === requested.quantity &&
        toCents(item.unit_cost) === toCents(requested.unitCost)
      );
    });

    if(!sameRequest){
      throw new AppError(
        "Idempotency key was used for a different request",
      409,
      "IDEMPOTENCY_CONFLICT",
      )
    }

    return{
      id: purchase.id,
      purchaseNo: purchase.purchase_no,
      totalAmount: purchase.total_amount,
      receivedAt: purchase.received_at

    }

}

export async function createPurchase(input: CreatePurchaseInput, receivedBy: string){
  const connection = await pool.getConnection()

  try{
    await connection.beginTransaction()

    ////////////////////////////////

    const replay = await findPurchaseReplay(connection, input, receivedBy)

    if(replay){
       await connection.commit();
  return { purchase: replay, replayed: true };
    }
    ////////////////////////////

    if(input.supplierId !== null){
      const supplier = await purchaseRepository.getSupplierForReceiving(connection, input.supplierId)

      if(!supplier){
         throw new AppError(
          "Supplier not found",
          404,
          "SUPPLIER_NOT_FOUND",
         );
      }

      if(!supplier.is_active){
        throw new AppError(
          "Supplier is inactive",
          409,
          "SUPPLIER_INACTIVE",
        )
      }
    }

      ////////////////////////////////
      // Product Units နဲ့ Products ကို ရှာပြီး Lock လုပ်ခြင်း

      const unitIds = [
      ...new Set(input.items.map((item) => item.productUnitId)),
    ];

    const references =
      await purchaseRepository.getPurchaseUnitReferences(
        connection,
        unitIds,
      );

    if (references.length !== unitIds.length) {
      throw new AppError(
        "Product unit not found",
        404,
        "PRODUCT_UNIT_NOT_FOUND",
      );
    }

    const productIds = [
      ...new Set(references.map((row) => row.product_id)),
    ].sort((a, b) => {
      if (BigInt(a) < BigInt(b)) return -1;
      if (BigInt(a) > BigInt(b)) return 1;
      return 0;
    });

    const products = [];

    for (const productId of productIds) {
      const product =
        await purchaseRepository.lockProductForReceiving(
          connection,
          productId,
        );

      if (!product) {
        throw new AppError(
          "Product not found",
          404,
          "PRODUCT_NOT_FOUND",
        );
      }

      if (!product.is_active) {
        throw new AppError(
          "Product is inactive",
          409,
          "PRODUCT_INACTIVE",
        );
      }

      products.push(product);
    }

    ///////////////////////////////////////

    const units = await purchaseRepository.getUnitsForReceiving(
      connection, unitIds
    )

      for (const item of input.items) {
      const unit = units.find(
        (row) => row.id === item.productUnitId,
      );

      if (!unit) {
        throw new AppError(
          "Product unit not found",
          404,
          "PRODUCT_UNIT_NOT_FOUND",
        );
      }

      if (
        !unit.is_active ||
        !unit.shared_unit_active ||
        !unit.can_purchase
      ) {
        throw new AppError(
          "Product unit is unavailable for purchasing",
          409,
          "PURCHASE_UNIT_UNAVAILABLE",
        );
      }
    }

    //////////////////////////////
    
    let totalCents = 0n;

    for (const item of input.items) {
      totalCents += toCents(item.unitCost) * BigInt(item.quantity);
    }

    if (totalCents > MAX_DECIMAL_VALUE) {
      throw new AppError(
        "Purchase total exceeds the supported limit",
        400,
        "AMOUNT_LIMIT_EXCEEDED",
      );
    }

    const purchaseId = await purchaseRepository.insertPurchase(
      connection,
      {
        purchaseNo: `PUR-${randomUUID()}`,
        supplierId: input.supplierId,
        totalAmount: formatDecimal(totalCents, 2),
        notes: input.notes,
        receivedBy,
        idempotencyKey: input.idempotencyKey,
      },
    );

    /////////////////////////////////////
    // Purchase Items, Stock နဲ့ Movement သိမ်းခြင်း

    for (const item of input.items) {
      const unit = units.find(
        (row) => row.id === item.productUnitId,
      )!;

      const product = products.find(
        (row) => row.id === unit.product_id,
      )!;

      const factor = BigInt(unit.conversion_factor);
      const baseQuantity = BigInt(item.quantity) * factor;

      if (baseQuantity <= 0n || baseQuantity > MAX_STOCK) {
        throw new AppError(
          "Base quantity exceeds the supported limit",
          400,
          "QUANTITY_LIMIT_EXCEEDED",
        );
      }

      const quantityBefore = product.stock_quantity;
      const quantityAfter = quantityBefore + Number(baseQuantity);

      if (quantityAfter > Number(MAX_STOCK)) {
        throw new AppError(
          "Receiving would exceed the stock limit",
          409,
          "STOCK_LIMIT_EXCEEDED",
        );
      }

      const costCents = toCents(item.unitCost);
      const lineTotalCents = costCents * BigInt(item.quantity);

      // Cents → six-decimal MMK, divided by conversion factor.
      // Round to nearest micro-MMK; ties round up.
      const baseCostMicros =
        (costCents * 10000n + factor / 2n) / factor;

      if (baseCostMicros > MAX_DECIMAL_VALUE) {
        throw new AppError(
          "Base-unit cost exceeds the supported limit",
          400,
          "COST_LIMIT_EXCEEDED",
        );
      }

      const purchaseItemId =
        await purchaseRepository.insertPurchaseItem(connection, {
          purchaseId,
          productId: product.id,
          productUnitId: unit.id,
          productName: product.name,
          unitName: unit.unit_name,
          quantity: item.quantity,
          conversionFactor: unit.conversion_factor,
          baseQuantity: Number(baseQuantity),
          unitCost: formatDecimal(costCents, 2),
          lineTotal: formatDecimal(lineTotalCents, 2),
        });

      await purchaseRepository.updateReceivedStock(
        connection,
        product.id,
        quantityAfter,
        formatDecimal(baseCostMicros, 6),
      );

      await purchaseRepository.insertPurchaseMovement(connection, {
        productId: product.id,
        purchaseItemId,
        baseQuantity: Number(baseQuantity),
        quantityBefore,
        quantityAfter,
        performedBy: receivedBy,
      });

      // Same product may occur on another line in this request.
      product.stock_quantity = quantityAfter;
    }

    const purchase = await purchaseRepository.getPurchaseByKey(
      connection,
      input.idempotencyKey,
    );

    if (!purchase) {
      throw new AppError(
        "Failed to retrieve received purchase",
        500,
        "INTERNAL_SERVER_ERROR",
      );
    }

    await connection.commit();

    return {
      purchase: {
        id: purchase.id,
        purchaseNo: purchase.purchase_no,
        totalAmount: purchase.total_amount,
        receivedAt: purchase.received_at,
      },
      replayed: false,
    };

    await connection.commit()

    return{
     
    }
  } catch(error){
    await connection.rollback()

    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY"
    ) {
      const replay = await findPurchaseReplay(
        connection,
        input,
        receivedBy,
      );

      if (replay) {
        return { purchase: replay, replayed: true };
      }
    }

    throw error;

  } finally{

    connection.release()
  }
}


