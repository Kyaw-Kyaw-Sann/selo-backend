import { randomUUID } from "node:crypto";
import type { PoolConnection } from "mysql2/promise";
import pool from "../../config/db.js";
import type { CreateSaleInput, ListSalesQuery } from "./sales.schema.js";
import * as salesRepository from "./sales.repository.js";
import { AppError } from "../../utils/app.error.js";

const MAX_MONEY = 999999999999999999n;
const MAX_BASE_QUANTITY = 2147483647n;

function toMinorUnits(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function formatMoney(value: bigint) {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, "0")}`;
}

function checkoutResponse(row: NonNullable<Awaited<ReturnType<typeof salesRepository.getCheckoutByKey>>>) {
  return {
    id: row.id,
    saleNo: row.sale_no,
    subtotal: row.subtotal,
    totalPayable: row.total_payable,
    completedAt: row.completed_at,
    payment: {
      method: row.payment_method,
      amount: row.payment_amount,
      tenderedAmount: row.tendered_amount,
      changeAmount: row.change_amount,
      referenceNo: row.reference_no,
    },
  };
}

async function findSaleReplay(db: PoolConnection, input: CreateSaleInput, cashierId: string) {
  const sale = await salesRepository.getCheckoutByKey(db, input.idempotencyKey);
  if (!sale) return null;

  const payment = input.payment;
  const samePayment = sale.payment_method === payment.method && (
    payment.method === "CASH"
      ? sale.tendered_amount !== null &&
        toMinorUnits(sale.tendered_amount) === toMinorUnits(payment.tenderedAmount)
      : sale.reference_no === payment.referenceNo
  );
  if (sale.cashier_id !== cashierId || sale.customer_id !== null || !samePayment) {
    throw new AppError("Idempotency key was used for a different request", 409, "IDEMPOTENCY_CONFLICT");
  }

  const items = await salesRepository.getSaleItem(sale.id, db);
  if (items.length !== input.items.length || !items.every((item, index) =>
    item.product_unit_id === input.items[index].productUnitId &&
    item.quantity === input.items[index].quantity
  )) {
    throw new AppError("Idempotency key was used for a different request", 409, "IDEMPOTENCY_CONFLICT");
  }

  return { sale: checkoutResponse(sale), replayed: true };
}

export async function createSale(input: CreateSaleInput, cashierId: string) {
  const db = await pool.getConnection();
  try {
    const replay = await findSaleReplay(db, input, cashierId);
    if (replay) return replay;

    await db.beginTransaction();
    // Reserve the unique key before locking stock so a concurrent retry waits
    // for this checkout to commit or roll back, even if it uses up the stock.
    const saleId = await salesRepository.reserveSale(db, `SAL-${randomUUID()}`, cashierId, input.idempotencyKey);
    const unitIds = [...new Set(input.items.map((item) => item.productUnitId))];
    const references = await salesRepository.getSaleUnitReferences(db, unitIds);
    if (references.length !== unitIds.length) {
      throw new AppError("Product unit not found", 404, "PRODUCT_UNIT_NOT_FOUND");
    }

    const productIds = [...new Set(references.map((row) => row.product_id))]
      .sort((a, b) => a.length - b.length || a.localeCompare(b));
    const products = new Map<string, NonNullable<Awaited<ReturnType<typeof salesRepository.lockSaleProduct>>>>();
    for (const id of productIds) {
      const product = await salesRepository.lockSaleProduct(db, id);
      if (!product) throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
      if (!product.is_active) throw new AppError("Product is inactive", 409, "PRODUCT_INACTIVE");
      products.set(id, product);
    }

    const units = new Map(
      (await salesRepository.getSellingUnits(db, unitIds)).map((unit) => [unit.id, unit]),
    );
    let subtotal = 0n;
    const lines = input.items.map((item) => {
      const unit = units.get(item.productUnitId);
      if (!unit) throw new AppError("Product unit not found", 404, "PRODUCT_UNIT_NOT_FOUND");
      const unitPrice = toMinorUnits(unit.selling_price);
      if (!unit.can_sell || !unit.is_active || !unit.shared_unit_active || unitPrice <= 0n) {
        throw new AppError("Product unit is unavailable for selling", 409, "SALE_UNIT_UNAVAILABLE");
      }
      const product = products.get(unit.product_id);
      if (!product) throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");

      const baseQuantity = BigInt(item.quantity) * BigInt(unit.conversion_factor);
      if (baseQuantity > MAX_BASE_QUANTITY) {
        throw new AppError("Base quantity exceeds the supported limit", 400, "QUANTITY_LIMIT_EXCEEDED");
      }
      const before = product.stock_quantity;
      const after = before - Number(baseQuantity);
      if (after < 0) throw new AppError("Insufficient stock", 409, "INSUFFICIENT_STOCK");
      product.stock_quantity = after;

      const lineTotal = unitPrice * BigInt(item.quantity);
      subtotal += lineTotal;
      return { item, unit, product, baseQuantity: Number(baseQuantity), lineTotal, before, after };
    });

    if (subtotal > MAX_MONEY) {
      throw new AppError("Sale total exceeds the supported limit", 400, "AMOUNT_LIMIT_EXCEEDED");
    }
    const tendered = input.payment.method === "CASH" ? toMinorUnits(input.payment.tenderedAmount) : null;
    if (tendered !== null && tendered < subtotal) {
      throw new AppError("Cash tendered is less than the amount payable", 400, "INSUFFICIENT_TENDERED_AMOUNT");
    }
    const payment = {
      method: input.payment.method,
      amount: formatMoney(subtotal),
      tenderedAmount: tendered === null ? null : formatMoney(tendered),
      changeAmount: formatMoney(tendered === null ? 0n : tendered - subtotal),
      referenceNo: input.payment.method === "QR" ? input.payment.referenceNo : null,
    };

    for (const { item, unit, product, baseQuantity, lineTotal, before, after } of lines) {
      const saleItemId = await salesRepository.insertSaleItem(db, {
        saleId,
        productId: product.id,
        productUnitId: unit.id,
        productName: product.name,
        unitName: unit.unit_name,
        quantity: item.quantity,
        conversionFactor: unit.conversion_factor,
        baseQuantity,
        unitPrice: unit.selling_price,
        lineTotal: formatMoney(lineTotal),
        unitCost: product.latest_purchase_cost,
      });
      await salesRepository.deductSaleStock(db, { productId: product.id, saleItemId, before, after, cashierId });
    }

    await salesRepository.finalizeSale(db, saleId, cashierId, payment);
    const sale = await salesRepository.getCheckoutByKey(db, input.idempotencyKey);
    if (!sale) throw new AppError("Internal server error", 500, "INTERNAL_SERVER_ERROR");
    await db.commit();
    return { sale: checkoutResponse(sale), replayed: false };
  } catch (error) {
    await db.rollback();
    if (error instanceof Error && "code" in error && error.code === "ER_DUP_ENTRY") {
      const replay = await findSaleReplay(db, input, cashierId);
      if (replay) return replay;
    }
    throw error;
  } finally {
    db.release();
  }
}

export async function listSales(query: ListSalesQuery) {
  const offset = (query.page - 1) * query.limit;

  const results = await salesRepository.listSales(query, offset);

  return {
    sales: results.rows.map((sale) => ({
      id: sale.id,
      saleNo: sale.sale_no,
      cashierId: sale.cashier_id,
      cashierName: sale.cashier_name,
      subtotal: sale.subtotal,
      totalPayable: sale.total_payable,
      paymentMethod: sale.payment_method,
      completedAt: sale.completed_at,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: results.total,
      totalPages: Math.ceil(results.total / query.limit),
    },
  };
}

export async function getSaleById(id: string, role: "OWNER" | "CASHIER"){
    const sale = await salesRepository.getSaleById(id)

    if(!sale){
        throw new AppError(
            "Sale not found",
      404,
      "SALE_NOT_FOUND",
        )
    }

    const items = await salesRepository.getSaleItem(id)

   return {
    id: sale.id,
    saleNo: sale.sale_no,
    cashierId: sale.cashier_id,
    cashierName: sale.cashier_name,
    subtotal: sale.subtotal,
    totalPayable: sale.total_payable,
    completedAt: sale.completed_at,
    createdAt: sale.created_at,
    payment:
      sale.payment_id === null
        ? null
        : {
            id: sale.payment_id,
            method: sale.payment_method,
            amount: sale.payment_amount,
            tenderedAmount: sale.tendered_amount,
            changeAmount: sale.change_amount,
            referenceNo: sale.reference_no,
            confirmedBy: sale.confirmed_by,
            confirmedAt: sale.confirmed_at,
          },
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      productUnitId: item.product_unit_id,
      productName: item.product_name_snapshot,
      unitName: item.unit_name_snapshot,
      quantity: item.quantity,
      conversionFactor: item.conversion_factor,
      baseQuantity: item.base_quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
      ...(role === "OWNER"
        ? { unitCostSnapshot: item.unit_cost_snapshot }
        : {}),
    })),
  };


}
