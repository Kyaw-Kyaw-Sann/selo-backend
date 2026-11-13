import type { RowDataPacket } from "mysql2";
import type { ListPurchaseQuery } from "./purchases.schema.js";
import pool from "../../config/db.js";


interface PurchaseRow extends RowDataPacket {
  id: string;
  purchase_no: string;
  supplier_id: string | null;
  supplier_name: string | null;
  total_amount: string;
  received_by: string;
  received_by_name: string;
  received_at: Date;
}

interface PurchaseCountRow extends RowDataPacket {
  total: number | string;
}

interface PurchaseDetailRow extends PurchaseRow {
  notes: string | null;
  created_at: Date;
}

interface PurchaseItemRow extends RowDataPacket {
  id: string;
  product_id: string;
  product_unit_id: string;
  product_name_snapshot: string;
  unit_name_snapshot: string;
  quantity: number;
  conversion_factor: number;
  base_quantity: number;
  unit_cost: string;
  line_total: string;
}

export async function listPurchases(query: ListPurchaseQuery, offset: number){
    const conditions: string[] = []
    const values: (string | number)[] = []

    if(query.search){
        conditions.push("p.purchase_no LIKE ?");
        values.push(`%${query.search}%`)
    }

    if(query.supplierId !== undefined){
        conditions.push("p.supplier_id = ?");
    values.push(query.supplierId);
    }

    if (query.from !== undefined) {
    conditions.push("p.received_at >= ?");
    values.push(`${query.from} 00:00:00.000`);
  }

  if (query.to !== undefined) {
    conditions.push("p.received_at < DATE_ADD(?, INTERVAL 1 DAY)");
    values.push(query.to);
  }

  const where = conditions.length? `WHERE ${conditions.join(" AND ")}` : ""

    const [rows] = await pool.execute<PurchaseRow[]>(
        `SELECT
       p.id,
       p.purchase_no,
       p.supplier_id,
       s.name AS supplier_name,
       p.total_amount,
       p.received_by,
       staff.name AS received_by_name,
       p.received_at
     FROM purchases p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     JOIN users staff ON staff.id = p.received_by
     ${where}
     ORDER BY p.received_at DESC, p.id DESC
     LIMIT ? OFFSET ?`,
    [...values, query.limit, offset],
    )

    const [countRows] = await pool.execute<PurchaseCountRow[]>(
        `SELECT COUNT(*) AS total
     FROM purchases p
     ${where}`,
    values,
    )

    return{
        rows,
        total: Number(countRows[0].total)
    }
}

export async function getPurchaseById(id: string): Promise<PurchaseDetailRow | null>{
    const [rows] = await pool.execute<PurchaseDetailRow[]>(
        `SELECT
       p.id,
       p.purchase_no,
       p.supplier_id,
       s.name AS supplier_name,
       p.total_amount,
       p.notes,
       p.received_by,
       staff.name AS received_by_name,
       p.received_at,
       p.created_at
     FROM purchases p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     JOIN users staff ON staff.id = p.received_by
     WHERE p.id = ?
     LIMIT 1`,
    [id],
    )

    return rows[0] ?? null
}

export async function getPurchaseItem(purchaseId: string): Promise<PurchaseItemRow[] | null>{
    const [rows] = await pool.execute<PurchaseItemRow[]>(
        `SELECT
       id,
       product_id,
       product_unit_id,
       product_name_snapshot,
       unit_name_snapshot,
       quantity,
       conversion_factor,
       base_quantity,
       unit_cost,
       line_total
     FROM purchase_items
     WHERE purchase_id = ?
     ORDER BY id`,
    [purchaseId],
    )

    return rows ?? null
}