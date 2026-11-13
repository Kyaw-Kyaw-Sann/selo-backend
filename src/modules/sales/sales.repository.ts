import type { RowDataPacket } from "mysql2";
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
): Promise<SaleItemRow[]> {
  const [rows] = await pool.execute<SaleItemRow[]>(
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
