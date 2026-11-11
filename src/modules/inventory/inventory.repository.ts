import type { RowDataPacket } from "mysql2";
import pool from "../../config/db.js";
import type { ListInventoryQuery, ListMovementsQuery } from "./inventory.schema.js";
import type { PoolConnection } from "mysql2/promise";

interface InventoryRow extends RowDataPacket {
  product_id: string;
  sku: string;
  product_name: string;
  base_unit_id: string;
  base_unit_name: string;
  stock_quantity: number;
  min_stock_level: number;
  is_active: 0 | 1;
}

interface InventoryCountRow extends RowDataPacket {
  total: number | string;
}

interface MovementRow extends RowDataPacket {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  base_unit_name: string;
  movement_type: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_type: string | null;
  reference_id: string | null;
  reason: string | null;
  performed_by: string;
  performed_by_name: string;
  created_at: Date;
}

interface MovementCountRow extends RowDataPacket {
  total: number | string;
}

interface MovementDetailRow extends MovementRow {
  operation_key: string;
}
interface StockProductRow extends RowDataPacket {
  id: string;
  stock_quantity: number;
}


export async function listInventory(
  query: ListInventoryQuery,
  offset: number,
) {
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (query.search) {
    conditions.push("(p.name LIKE ? OR p.sku LIKE ?)");

    const pattern = `%${query.search}%`;
    values.push(pattern, pattern);
  }

  if (query.status === "OUT_OF_STOCK") {
    conditions.push("p.stock_quantity = 0");
  }

  if (query.status === "LOW_STOCK") {
    conditions.push(
      "p.stock_quantity > 0 AND p.stock_quantity <= p.min_stock_level",
    );
  }

  if (query.status === "IN_STOCK") {
    conditions.push("p.stock_quantity > p.min_stock_level");
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [rows] = await pool.query<InventoryRow[]>(
    `SELECT
       p.id AS product_id,
       p.sku,
       p.name AS product_name,
       p.base_unit_id,
       u.name AS base_unit_name,
       p.stock_quantity,
       p.min_stock_level,
       p.is_active
     FROM products p
     JOIN units u ON u.id = p.base_unit_id
     ${where}
     ORDER BY p.id DESC
     LIMIT ? OFFSET ?`,
    [...values, query.limit, offset],
  );

  const [countRows] = await pool.execute<InventoryCountRow[]>(
    `SELECT COUNT(*) AS total
     FROM products p
     ${where}`,
    values,
  );

  return {
    rows,
    total: Number(countRows[0]!.total),
  };
}

export async function listMovements(
  query: ListMovementsQuery,
  offset: number,
) {
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (query.productId !== undefined) {
    conditions.push("m.product_id = ?");
    values.push(query.productId);
  }

  if (query.movementType !== "ALL") {
    conditions.push("m.movement_type = ?");
    values.push(query.movementType);
  }

  if (query.from !== undefined) {
    conditions.push("m.created_at >= ?");
    values.push(`${query.from} 00:00:00.000`);
  }

  if (query.to !== undefined) {
    conditions.push("m.created_at < DATE_ADD(?, INTERVAL 1 DAY)");
    values.push(query.to);
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [rows] = await pool.query<MovementRow[]>(
    `SELECT
       m.id,
       m.product_id,
       p.sku,
       p.name AS product_name,
       u.name AS base_unit_name,
       m.movement_type,
       m.quantity_change,
       m.quantity_before,
       m.quantity_after,
       m.reference_type,
       m.reference_id,
       m.reason,
       m.performed_by,
       staff.name AS performed_by_name,
       m.created_at
     FROM inventory_movements m
     JOIN products p ON p.id = m.product_id
     JOIN units u ON u.id = p.base_unit_id
     JOIN users staff ON staff.id = m.performed_by
     ${where}
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT ? OFFSET ?`,
    [...values, query.limit, offset],
  );

  const [countRows] = await pool.execute<MovementCountRow[]>(
    `SELECT COUNT(*) AS total
     FROM inventory_movements m
     ${where}`,
    values,
  );

  return {
    rows,
    total: Number(countRows[0]!.total),
  };
}

export async function getMovementById(
  id: string,
): Promise<MovementDetailRow | null> {
  const [rows] = await pool.execute<MovementDetailRow[]>(
    `SELECT
       m.id,
       m.product_id,
       p.sku,
       p.name AS product_name,
       u.name AS base_unit_name,
       m.movement_type,
       m.quantity_change,
       m.quantity_before,
       m.quantity_after,
       m.reference_type,
       m.reference_id,
       m.reason,
       m.performed_by,
       staff.name AS performed_by_name,
       m.operation_key,
       m.created_at
     FROM inventory_movements m
     JOIN products p ON p.id = m.product_id
     JOIN units u ON u.id = p.base_unit_id
     JOIN users staff ON staff.id = m.performed_by
     WHERE m.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

interface StockProductRow extends RowDataPacket {
  id: string;
  stock_quantity: number;
}

export async function getProductForAdjustment(
  connection: PoolConnection,
  productId: string,
): Promise<StockProductRow | null> {
  const [rows] = await connection.execute<StockProductRow[]>(
    `SELECT id, stock_quantity
     FROM products
     WHERE id = ?
     FOR UPDATE`,
    [productId],
  );

  return rows[0] ?? null;
}

export async function updateProductStock(
  connection: PoolConnection,
  productId: string,
  quantityAfter: number,
): Promise<void> {
  await connection.execute(
    `UPDATE products
     SET stock_quantity = ?,
         updated_at = UTC_TIMESTAMP(3)
     WHERE id = ?`,
    [quantityAfter, productId],
  );
}

export async function createAdjustmentMovement(
  connection: PoolConnection,
  data: {
    productId: string;
    quantityChange: number;
    quantityBefore: number;
    quantityAfter: number;
    reason: string;
    performedBy: string;
    operationKey: string;
  },
): Promise<string> {
  await connection.execute(
    `INSERT INTO inventory_movements (
       product_id,
       movement_type,
       quantity_change,
       quantity_before,
       quantity_after,
       reference_type,
       reference_id,
       reason,
       performed_by,
       operation_key,
       created_at
     )
     VALUES (
       ?, 'ADJUSTMENT', ?, ?, ?, 'MANUAL', NULL,
       ?, ?, ?, UTC_TIMESTAMP(3)
     )`,
    [
      data.productId,
      data.quantityChange,
      data.quantityBefore,
      data.quantityAfter,
      data.reason,
      data.performedBy,
      data.operationKey,
    ],
  );

  const [rows] = await connection.execute<
    (RowDataPacket & { id: string })[]
  >(
    "SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id",
  );

  return rows[0]!.id;
}

// CREATE TABLE inventory_movements (
//     id BIGINT NOT NULL AUTO_INCREMENT,
//     product_id BIGINT NOT NULL,
//     movement_type VARCHAR(20) NOT NULL,
//     quantity_change INT NOT NULL,
//     quantity_before INT NOT NULL,
//     quantity_after INT NOT NULL,
//     reference_type VARCHAR(30) NULL,
//     reference_id BIGINT NULL,
//     reason VARCHAR(255) NULL,
//     performed_by BIGINT NOT NULL,
//     operation_key VARCHAR(150) NOT NULL,
//     created_at DATETIME(3) NOT NULL,

//     PRIMARY KEY (id),
//     UNIQUE KEY uq_inventory_movements_operation_key (operation_key),
//     KEY idx_inventory_movements_product_created_at (
//         product_id,
//         created_at
//     ),
//     KEY idx_inventory_movements_reference (reference_type, reference_id),

//     CONSTRAINT fk_inventory_movements_product
//         FOREIGN KEY (product_id) REFERENCES products(id),

//     CONSTRAINT fk_inventory_movements_performed_by
//         FOREIGN KEY (performed_by) REFERENCES users(id)
// ) ENGINE = InnoDB;