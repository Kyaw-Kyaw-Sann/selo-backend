import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import pool from "../../config/db.js";
import type { CreateProductInput, ListProductsQuery } from "./products.schema.js";

interface ProductRow extends RowDataPacket {
  id: string;
  sku: string;
  name: string;
  category_id: string | null;
  base_unit_id: string;
  image_path: string | null;
  stock_quantity: number;
  min_stock_level: number;
  is_active: 0 | 1;
}

interface ProductCountRow extends RowDataPacket {
  total: number | string;
}

interface ProductDetailRow extends ProductRow {
  category_name: string | null;
  base_unit_name: string;
  base_unit_code: string;
  latest_purchase_cost: string;
}

interface StoredProductUnitRow extends RowDataPacket {
  id: string;
  unit_id: string;
  conversion_factor: number;
  barcode: string | null;
  selling_price: string;
  can_purchase: 0 | 1;
  can_sell: 0 | 1;
  is_active: 0 | 1;
}

interface ProductUnitRow extends StoredProductUnitRow {
  unit_name: string;
  unit_code: string;
}

export async function listProducts(query: ListProductsQuery, offset: number) {
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (query.search) {
    conditions.push(`(
      p.name LIKE ?
      OR p.sku LIKE ?
      OR EXISTS (
        SELECT 1 FROM product_units pu
        WHERE pu.product_id = p.id AND pu.barcode = ?
      )
    )`);
    const pattern = `%${query.search}%`;
    values.push(pattern, pattern, query.search);
  }

  if (query.categoryId !== undefined) {
    conditions.push("p.category_id = ?");
    values.push(query.categoryId);
  }

  if (query.status !== "ALL") {
    conditions.push("p.is_active = ?");
    values.push(query.status === "ACTIVE" ? 1 : 0);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query<ProductRow[]>(
    `SELECT
       p.id, p.sku, p.name, p.category_id, p.base_unit_id,
       p.image_path, p.stock_quantity, p.min_stock_level, p.is_active
     FROM products p
     ${where}
     ORDER BY p.id DESC
     LIMIT ? OFFSET ?`,
    [...values, query.limit, offset],
  );

  const [countRows] = await pool.execute<ProductCountRow[]>(
    `SELECT COUNT(*) AS total FROM products p ${where}`,
    values,
  );

  return { rows, total: Number(countRows[0]!.total) };
}

export async function getProductById(id: string): Promise<ProductDetailRow | null> {
  const [rows] = await pool.execute<ProductDetailRow[]>(
    `SELECT
       p.id, p.sku, p.name, p.category_id, p.base_unit_id,
       p.image_path, p.stock_quantity, p.min_stock_level, p.is_active,
       p.latest_purchase_cost,
       c.name AS category_name,
       u.name AS base_unit_name, u.code AS base_unit_code
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     JOIN units u ON u.id = p.base_unit_id
     WHERE p.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function getProductUnits(productId: string): Promise<ProductUnitRow[]> {
  const [rows] = await pool.execute<ProductUnitRow[]>(
    `SELECT
       pu.id, pu.unit_id, pu.conversion_factor, pu.barcode,
       pu.selling_price, pu.can_purchase, pu.can_sell, pu.is_active,
       u.name AS unit_name, u.code AS unit_code
     FROM product_units pu
     JOIN units u ON u.id = pu.unit_id
     WHERE pu.product_id = ?
     ORDER BY pu.conversion_factor, pu.id`,
    [productId],
  );

  return rows;
}

interface ActiveReferenceRow extends RowDataPacket {
  id: string;
  is_active: 0 | 1;
}

export async function getCategoryForCreate(connection: PoolConnection, id: string) {
  const [rows] = await connection.execute<ActiveReferenceRow[]>(
    `SELECT id, is_active FROM categories WHERE id = ? FOR SHARE`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getUnitsForCreate(connection: PoolConnection, ids: string[]) {
  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await connection.execute<ActiveReferenceRow[]>(
    `SELECT id, is_active FROM units WHERE id IN (${placeholders}) ORDER BY id FOR SHARE`,
    ids,
  );
  return rows;
}

export async function createProduct(connection: PoolConnection, input: CreateProductInput) {
  await connection.execute(
    `INSERT INTO products (
       sku, name, category_id, base_unit_id, image_path, min_stock_level,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
    [input.sku, input.name, input.categoryId, input.baseUnitId, input.imagePath, input.minStockLevel],
  );

  const [rows] = await connection.execute<(RowDataPacket & { id: string })[]>(
    "SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id",
  );
  return rows[0]!.id;
}

export async function createProductUnit(
  connection: PoolConnection,
  productId: string,
  unit: CreateProductInput["units"][number] & { isActive?: boolean },
): Promise<void> {
  await connection.execute(
    `INSERT INTO product_units (
       product_id, unit_id, conversion_factor, barcode, selling_price,
       can_purchase, can_sell, is_active, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
    [productId, unit.unitId, unit.conversionFactor, unit.barcode, unit.sellingPrice, unit.canPurchase, unit.canSell, unit.isActive ?? true],
  );
}

export async function getProductForUpdate(connection: PoolConnection, id: string) {
  const [rows] = await connection.execute<ProductRow[]>(
    `SELECT id, sku, name, category_id, base_unit_id, image_path,
       stock_quantity, min_stock_level, is_active
     FROM products WHERE id = ? FOR UPDATE`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getProductUnitsForUpdate(connection: PoolConnection, productId: string) {
  const [rows] = await connection.execute<StoredProductUnitRow[]>(
    `SELECT id, unit_id, conversion_factor, barcode, selling_price,
       can_purchase, can_sell, is_active
     FROM product_units WHERE product_id = ? ORDER BY id FOR UPDATE`,
    [productId],
  );
  return rows;
}

export async function hasProductUnitHistory(connection: PoolConnection, productUnitId: string) {
  const [rows] = await connection.execute<(RowDataPacket & { used: number | string })[]>(
    `SELECT (
       EXISTS(SELECT 1 FROM purchase_items WHERE product_unit_id = ?)
       OR EXISTS(SELECT 1 FROM sale_items WHERE product_unit_id = ?)
     ) AS used`,
    [productUnitId, productUnitId],
  );
  return Number(rows[0]!.used) === 1;
}

export async function updateProduct(
  connection: PoolConnection,
  id: string,
  data: { sku: string; name: string; categoryId: string | null; imagePath: string | null; minStockLevel: number },
): Promise<void> {
  await connection.execute(
    `UPDATE products SET sku = ?, name = ?, category_id = ?, image_path = ?,
       min_stock_level = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`,
    [data.sku, data.name, data.categoryId, data.imagePath, data.minStockLevel, id],
  );
}

export async function updateProductUnit(
  connection: PoolConnection,
  id: string,
  data: CreateProductInput["units"][number] & { isActive: boolean },
): Promise<void> {
  await connection.execute(
    `UPDATE product_units SET conversion_factor = ?, barcode = ?, selling_price = ?,
       can_purchase = ?, can_sell = ?, is_active = ?, updated_at = UTC_TIMESTAMP(3)
     WHERE id = ?`,
    [data.conversionFactor, data.barcode, data.sellingPrice, data.canPurchase, data.canSell, data.isActive, id],
  );
}

export async function updateProductStatus(id: string, isActive: boolean): Promise<void> {
  await pool.execute(
    `UPDATE products SET is_active = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?`,
    [isActive, id],
  );
}
