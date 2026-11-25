import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import type { ListSalesQuery } from "./sales.schema.js";
import pool from "../../config/db.js";

interface SaleRow extends RowDataPacket {
  id: string;
  sale_no: string;
  cashier_id: string;
  cashier_name: string;
  subtotal: string;
  total_payable: string;
  payment_method: "CASH" | "QR" | null;
  completed_at: Date;
}

interface SaleCountRow extends RowDataPacket {
  total: number | string;
}

interface SaleDetailRow extends SaleRow {
  created_at: Date;
  payment_id: string | null;
  payment_amount: string | null;
  tendered_amount: string | null;
  change_amount: string | null;
  reference_no: string | null;
  confirmed_by: string | null;
  confirmed_at: Date | null;
}

interface SaleItemRow extends RowDataPacket {
  id: string;
  product_id: string;
  product_unit_id: string;
  product_name_snapshot: string;
  unit_name_snapshot: string;
  quantity: number;
  conversion_factor: number;
  base_quantity: number;
  unit_price: string;
  line_total: string;
  unit_cost_snapshot: string;
}

export async function listSales(query: ListSalesQuery, offset: number) {
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (query.search) {
    conditions.push("s.sale_no LIKE ?");
    values.push(`%${query.search}%`);
  }

  if (query.paymentMethod !== "ALL") {
    conditions.push("payment.method = ?");
    values.push(query.paymentMethod);
  }

  if (query.cashierId !== undefined) {
    conditions.push("s.cashier_id = ?");
    values.push(query.cashierId);
  }

  if (query.from !== undefined) {
    conditions.push("s.completed_at >= ?");
    values.push(`${query.from} 00:00:00.000`);
  }

  if (query.to !== undefined) {
    conditions.push("s.completed_at < DATE_ADD(?, INTERVAL 1 DAY)");
    values.push(query.to);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.execute<SaleRow[]>(
    `SELECT
       s.id,
       s.sale_no,
       s.cashier_id,
       staff.name AS cashier_name,
       s.subtotal,
       s.total_payable,
       payment.method AS payment_method,
       s.completed_at
     FROM sales s
     JOIN users staff ON staff.id = s.cashier_id
     LEFT JOIN sale_payments payment ON payment.sale_id = s.id
     ${where}
     ORDER BY s.completed_at DESC, s.id DESC
     LIMIT ? OFFSET ?`,
    [...values, query.limit, offset],
  );

  const [countRows] = await pool.execute<SaleCountRow[]>(
    `SELECT COUNT(*) AS total
     FROM sales s
     LEFT JOIN sale_payments payment ON payment.sale_id = s.id
     ${where}`,
    values,
  );

  return {
    rows,
    total: Number(countRows[0].total),
  };
}

export async function getSaleById(id: string): Promise<SaleDetailRow | null> {
  const [rows] = await pool.execute<SaleDetailRow[]>(
    `SELECT
       s.id,
       s.sale_no,
       s.cashier_id,
       staff.name AS cashier_name,
       s.subtotal,
       s.total_payable,
       s.completed_at,
       s.created_at,
       payment.id AS payment_id,
       payment.method AS payment_method,
       payment.amount AS payment_amount,
       payment.tendered_amount,
       payment.change_amount,
       payment.reference_no,
       payment.confirmed_by,
       payment.confirmed_at
     FROM sales s
     JOIN users staff ON staff.id = s.cashier_id
     LEFT JOIN sale_payments payment ON payment.sale_id = s.id
     WHERE s.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function getSaleItem(
  saleId: string,
  db: PoolConnection | typeof pool = pool,
): Promise<SaleItemRow[]> {
  const [rows] = await db.execute<SaleItemRow[]>(
    `SELECT
       id,
       product_id,
       product_unit_id,
       product_name_snapshot,
       unit_name_snapshot,
       quantity,
       conversion_factor,
       base_quantity,
       unit_price,
       line_total,
       unit_cost_snapshot
     FROM sale_items
     WHERE sale_id = ?
     ORDER BY id`,
    [saleId],
  );

  return rows;
}

type CheckoutRow = RowDataPacket & Pick<SaleDetailRow,
  "id" | "sale_no" | "cashier_id" | "subtotal" | "total_payable" |
  "completed_at" | "payment_method" | "payment_amount" | "tendered_amount" |
  "change_amount" | "reference_no"
> & { customer_id: string | null };

export async function getCheckoutByKey(db: PoolConnection, key: string) {
  const [rows] = await db.execute<CheckoutRow[]>(
    `SELECT s.id, s.sale_no, s.cashier_id, s.customer_id, s.subtotal,
            s.total_payable, s.completed_at, p.method AS payment_method,
            p.amount AS payment_amount, p.tendered_amount, p.change_amount, p.reference_no
     FROM sales s
     LEFT JOIN sale_payments p ON p.sale_id = s.id
     WHERE s.idempotency_key = ?`,
    [key],
  );
  return rows[0] ?? null;
}

async function lastInsertId(db: PoolConnection) {
  const [rows] = await db.execute<(RowDataPacket & { id: string })[]>(
    "SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id",
  );
  return rows[0]!.id;
}

export async function reserveSale(db: PoolConnection, saleNo: string, cashierId: string, key: string) {
  await db.execute(
    `INSERT INTO sales (
       sale_no, cashier_id, subtotal, total_payable, idempotency_key, completed_at, created_at
     ) VALUES (?, ?, 0, 0, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
    [saleNo, cashierId, key],
  );
  return lastInsertId(db);
}

export async function getSaleUnitReferences(db: PoolConnection, ids: string[]) {
  const [rows] = await db.execute<(RowDataPacket & { product_id: string })[]>(
    `SELECT product_id FROM product_units WHERE id IN (${ids.map(() => "?").join(", ")})`,
    ids,
  );
  return rows;
}

export async function lockSaleProduct(db: PoolConnection, id: string) {
  const [rows] = await db.execute<(RowDataPacket & {
    id: string;
    name: string;
    stock_quantity: number;
    latest_purchase_cost: string;
    is_active: number;
  })[]>(
    `SELECT id, name, stock_quantity, latest_purchase_cost, is_active
     FROM products WHERE id = ? FOR UPDATE`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getSellingUnits(db: PoolConnection, ids: string[]) {
  const [rows] = await db.execute<(RowDataPacket & {
    id: string;
    product_id: string;
    conversion_factor: number;
    selling_price: string;
    can_sell: number;
    is_active: number;
    unit_name: string;
    shared_unit_active: number;
  })[]>(
    `SELECT pu.id, pu.product_id, pu.conversion_factor, pu.selling_price,
            pu.can_sell, pu.is_active, u.name AS unit_name, u.is_active AS shared_unit_active
     FROM product_units pu JOIN units u ON u.id = pu.unit_id
     WHERE pu.id IN (${ids.map(() => "?").join(", ")})
     ORDER BY pu.id FOR SHARE`,
    ids,
  );
  return rows;
}

export async function insertSaleItem(db: PoolConnection, item: {
  saleId: string;
  productId: string;
  productUnitId: string;
  productName: string;
  unitName: string;
  quantity: number;
  conversionFactor: number;
  baseQuantity: number;
  unitPrice: string;
  lineTotal: string;
  unitCost: string;
}) {
  await db.execute(
    `INSERT INTO sale_items (
       sale_id, product_id, product_unit_id, product_name_snapshot, unit_name_snapshot,
       quantity, conversion_factor, base_quantity, unit_price, line_total, unit_cost_snapshot
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.saleId, item.productId, item.productUnitId, item.productName, item.unitName,
      item.quantity, item.conversionFactor, item.baseQuantity, item.unitPrice, item.lineTotal, item.unitCost],
  );
  return lastInsertId(db);
}

export async function deductSaleStock(db: PoolConnection, movement: {
  productId: string;
  saleItemId: string;
  before: number;
  after: number;
  cashierId: string;
}) {
  await db.execute(
    "UPDATE products SET stock_quantity = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?",
    [movement.after, movement.productId],
  );
  await db.execute(
    `INSERT INTO inventory_movements (
       product_id, movement_type, quantity_change, quantity_before, quantity_after,
       reference_type, reference_id, performed_by, operation_key, created_at
     ) VALUES (?, 'SALE', ?, ?, ?, 'SALE_ITEM', ?, ?, ?, UTC_TIMESTAMP(3))`,
    [movement.productId, movement.after - movement.before, movement.before, movement.after,
      movement.saleItemId, movement.cashierId, `sale:${movement.saleItemId}`],
  );
}

export async function finalizeSale(db: PoolConnection, saleId: string, cashierId: string, payment: {
  method: "CASH" | "QR";
  amount: string;
  tenderedAmount: string | null;
  changeAmount: string;
  referenceNo: string | null;
}) {
  await db.execute(
    "UPDATE sales SET subtotal = ?, total_payable = ?, completed_at = UTC_TIMESTAMP(3) WHERE id = ?",
    [payment.amount, payment.amount, saleId],
  );
  await db.execute(
    `INSERT INTO sale_payments (
       sale_id, method, amount, tendered_amount, change_amount, reference_no, confirmed_by, confirmed_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`,
    [saleId, payment.method, payment.amount, payment.tenderedAmount,
      payment.changeAmount, payment.referenceNo, cashierId],
  );
}

// interface SaleDetailRow extends SaleRow {
//   created_at: Date;
//   payment_id: string | null;
//   payment_amount: string | null;
//   tendered_amount: string | null;
//   change_amount: string | null;
//   reference_no: string | null;
//   confirmed_by: string | null;
//   confirmed_at: Date | null;
// }

// interface SaleItemRow extends RowDataPacket {
//   id: string;
//   product_id: string;
//   product_unit_id: string;
//   product_name_snapshot: string;
//   unit_name_snapshot: string;
//   quantity: number;
//   conversion_factor: number;
//   base_quantity: number;
//   unit_price: string;
//   line_total: string;
//   unit_cost_snapshot: string;
// }
