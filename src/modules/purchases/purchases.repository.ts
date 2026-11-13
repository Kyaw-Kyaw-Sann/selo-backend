import type { RowDataPacket } from "mysql2";
import type { ListPurchaseQuery } from "./purchases.schema.js";
import pool from "../../config/db.js";
import type { PoolConnection } from "mysql2/promise";


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

interface ReceivedPurchaseRow extends RowDataPacket {
  id: string;
  purchase_no: string;
  supplier_id: string | null;
  total_amount: string;
  notes: string | null;
  received_by: string;
  received_at: Date;
}

interface SupplierReceivingRow extends RowDataPacket {
  id: string;
  is_active: 0 | 1;
}

interface PurchaseStockRow extends RowDataPacket {
  id: string;
  name: string;
  stock_quantity: number;
  is_active: 0 | 1;
}

interface ReceivingUnitRow extends RowDataPacket {
  id: string;
  product_id: string;
  conversion_factor: number;
  can_purchase: 0 | 1;
  is_active: 0 | 1;
  unit_name: string;
  shared_unit_active: 0 | 1;
}

interface PurchaseInsertData {
  purchaseNo: string;
  supplierId: string | null;
  totalAmount: string;
  notes: string | null;
  receivedBy: string;
  idempotencyKey: string;
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

export async function getPurchaseItems(
  purchaseId: string,
  connection?: PoolConnection,
): Promise<PurchaseItemRow[]> {
  const db = connection ?? pool;

  const [rows] = await db.execute<PurchaseItemRow[]>(
    `SELECT
       id, product_id, product_unit_id,
       product_name_snapshot, unit_name_snapshot,
       quantity, conversion_factor, base_quantity,
       unit_cost, line_total
     FROM purchase_items
     WHERE purchase_id = ?
     ORDER BY id`,
    [purchaseId],
  );

  return rows;
}

export async function getPurchaseByKey(
  connection: PoolConnection,
  key: string,
): Promise<ReceivedPurchaseRow | null> {
  const [rows] = await connection.execute<ReceivedPurchaseRow[]>(
    `SELECT
       id, purchase_no, supplier_id, total_amount,
       notes, received_by, received_at
     FROM purchases
     WHERE idempotency_key = ?
     LIMIT 1`,
    [key],
  );

  return rows[0] ?? null;
}

export async function getSupplierForReceiving(
  connection: PoolConnection,
  id: string,
): Promise<SupplierReceivingRow | null> {
  const [rows] = await connection.execute<SupplierReceivingRow[]>(
    `SELECT id, is_active
     FROM suppliers
     WHERE id = ?
     FOR SHARE`,
    [id],
  );

  return rows[0] ?? null;
}

interface PurchaseReferenceRow extends RowDataPacket {
  id: string;
  product_id: string;
}

export async function getPurchaseUnitReferences(
  connection: PoolConnection,
  ids: string[],
): Promise<PurchaseReferenceRow[]> {
  const placeholders = ids.map(() => "?").join(", ");

  const [rows] = await connection.execute<PurchaseReferenceRow[]>(
    `SELECT id, product_id
     FROM product_units
     WHERE id IN (${placeholders})`,
    ids,
  );

  return rows;
}

export async function lockProductForReceiving(
  connection: PoolConnection,
  id: string,
): Promise<PurchaseStockRow | null> {
  const [rows] = await connection.execute<PurchaseStockRow[]>(
    `SELECT id, name, stock_quantity, is_active
     FROM products
     WHERE id = ?
     FOR UPDATE`,
    [id],
  );

  return rows[0] ?? null;
}

export async function getUnitsForReceiving(
  connection: PoolConnection,
  ids: string[],
): Promise<ReceivingUnitRow[]> {
  const placeholders = ids.map(() => "?").join(", ");

  const [rows] = await connection.execute<ReceivingUnitRow[]>(
    `SELECT
       pu.id,
       pu.product_id,
       pu.conversion_factor,
       pu.can_purchase,
       pu.is_active,
       u.name AS unit_name,
       u.is_active AS shared_unit_active
     FROM product_units pu
     JOIN units u ON u.id = pu.unit_id
     WHERE pu.id IN (${placeholders})
     ORDER BY pu.id
     FOR SHARE`,
    ids,
  );

  return rows;
}

async function lastInsertId(
  connection: PoolConnection,
): Promise<string> {
  const [rows] = await connection.execute<
    (RowDataPacket & { id: string })[]
  >("SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id");

  return rows[0]!.id;
}


export async function insertPurchase(
  connection: PoolConnection,
  data: PurchaseInsertData,
) {
  await connection.execute(
    `INSERT INTO purchases (
       purchase_no, supplier_id, total_amount,
       notes, received_by, received_at,
       idempotency_key, created_at
     )
     VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(3), ?, UTC_TIMESTAMP(3))`,
    [
      data.purchaseNo,
      data.supplierId,
      data.totalAmount,
      data.notes,
      data.receivedBy,
      data.idempotencyKey,
    ],
  );

  return lastInsertId(connection);
}

export async function insertPurchaseItem(
  connection: PoolConnection,
  data: {
    purchaseId: string;
    productId: string;
    productUnitId: string;
    productName: string;
    unitName: string;
    quantity: number;
    conversionFactor: number;
    baseQuantity: number;
    unitCost: string;
    lineTotal: string;
  },
): Promise<string> {
  await connection.execute(
    `INSERT INTO purchase_items (
       purchase_id, product_id, product_unit_id,
       product_name_snapshot, unit_name_snapshot,
       quantity, conversion_factor, base_quantity,
       unit_cost, line_total
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.purchaseId,
      data.productId,
      data.productUnitId,
      data.productName,
      data.unitName,
      data.quantity,
      data.conversionFactor,
      data.baseQuantity,
      data.unitCost,
      data.lineTotal,
    ],
  );

  return lastInsertId(connection);
}

export async function updateReceivedStock(
  connection: PoolConnection,
  productId: string,
  quantityAfter: number,
  baseUnitCost: string,
): Promise<void> {
  await connection.execute(
    `UPDATE products
     SET stock_quantity = ?,
         latest_purchase_cost = ?,
         updated_at = UTC_TIMESTAMP(3)
     WHERE id = ?`,
    [quantityAfter, baseUnitCost, productId],
  );
}

export async function insertPurchaseMovement(
  connection: PoolConnection,
  data: {
    productId: string;
    purchaseItemId: string;
    baseQuantity: number;
    quantityBefore: number;
    quantityAfter: number;
    performedBy: string;
  },
): Promise<void> {
  await connection.execute(
    `INSERT INTO inventory_movements (
       product_id, movement_type, quantity_change,
       quantity_before, quantity_after,
       reference_type, reference_id,
       performed_by, operation_key, created_at
     )
     VALUES (
       ?, 'PURCHASE', ?, ?, ?,
       'PURCHASE_ITEM', ?, ?, ?, UTC_TIMESTAMP(3)
     )`,
    [
      data.productId,
      data.baseQuantity,
      data.quantityBefore,
      data.quantityAfter,
      data.purchaseItemId,
      data.performedBy,
      `purchase:${data.purchaseItemId}`,
    ],
  );
}

