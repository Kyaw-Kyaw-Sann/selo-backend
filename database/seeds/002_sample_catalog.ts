import bcrypt from "bcrypt";
import type { RowDataPacket } from "mysql2";
import pool from "../../src/config/db.js";
import { env } from "../../src/config/env.js";
import { createProductSchema } from "../../src/modules/products/products.schema.js";
import * as productsRepository from "../../src/modules/products/products.repository.js";

// Local demo accounts only. Existing accounts and catalog rows are never overwritten.
const demoPassword = "SeloDemo123!";
const users = [
  { name: "Thandar Win", username: "demo.owner", role: "OWNER", active: true },
  { name: "Aung Min", username: "demo.aung", role: "CASHIER", active: true },
  { name: "Hnin Ei", username: "demo.hnin", role: "CASHIER", active: true },
  { name: "Ko Ko", username: "demo.koko", role: "CASHIER", active: true },
  { name: "May Thu", username: "demo.may", role: "CASHIER", active: true },
  { name: "Zaw Lin", username: "demo.zaw", role: "CASHIER", active: false },
];

const categories = [
  { key: "beverages", name: "Beverages", parent: null },
  { key: "coffee", name: "Coffee & Tea", parent: "beverages" },
  { key: "drinks", name: "Water & Soft Drinks", parent: "beverages" },
  { key: "groceries", name: "Groceries", parent: null },
  { key: "snacks", name: "Biscuits & Snacks", parent: "groceries" },
  { key: "staples", name: "Rice & Sugar", parent: "groceries" },
  { key: "household", name: "Household", parent: null },
  { key: "cleaning", name: "Cleaning Supplies", parent: "household" },
];

const units = [
  { name: "Sachet", code: "sachet" },
  { name: "Pack", code: "pack" },
  { name: "Carton", code: "carton" },
  { name: "Bottle", code: "bottle" },
  { name: "Bag", code: "bag" },
  { name: "Bar", code: "bar" },
];

interface DemoProduct {
  sku: string;
  name: string;
  category: string;
  base: string;
  minimum: number;
  units: { code: string; factor: number; price: string }[];
}

const products: DemoProduct[] = [
  { sku: "DEMO-COF-001", name: "3-in-1 Coffee Mix", category: "coffee", base: "sachet", minimum: 30,
    units: [{ code: "sachet", factor: 1, price: "500.00" }, { code: "pack", factor: 10, price: "4800.00" }, { code: "carton", factor: 100, price: "46000.00" }] },
  { sku: "DEMO-TEA-001", name: "Instant Milk Tea", category: "coffee", base: "sachet", minimum: 20,
    units: [{ code: "sachet", factor: 1, price: "600.00" }, { code: "pack", factor: 20, price: "11500.00" }, { code: "carton", factor: 200, price: "110000.00" }] },
  { sku: "DEMO-WAT-001", name: "Purified Drinking Water 600ml", category: "drinks", base: "bottle", minimum: 24,
    units: [{ code: "bottle", factor: 1, price: "700.00" }, { code: "carton", factor: 12, price: "8000.00" }] },
  { sku: "DEMO-DRK-001", name: "Orange Soda 350ml", category: "drinks", base: "bottle", minimum: 24,
    units: [{ code: "bottle", factor: 1, price: "1500.00" }, { code: "carton", factor: 24, price: "34000.00" }] },
  { sku: "DEMO-BIS-001", name: "Butter Biscuits 150g", category: "snacks", base: "pack", minimum: 12,
    units: [{ code: "pack", factor: 1, price: "2200.00" }, { code: "carton", factor: 24, price: "50000.00" }] },
  { sku: "DEMO-RIC-001", name: "Paw San Rice 5kg", category: "staples", base: "bag", minimum: 5,
    units: [{ code: "bag", factor: 1, price: "22000.00" }] },
  { sku: "DEMO-SUG-001", name: "White Sugar 1kg", category: "staples", base: "bag", minimum: 10,
    units: [{ code: "bag", factor: 1, price: "4500.00" }, { code: "carton", factor: 20, price: "86000.00" }] },
  { sku: "DEMO-SOP-001", name: "Laundry Soap 200g", category: "cleaning", base: "bar", minimum: 18,
    units: [{ code: "bar", factor: 1, price: "1800.00" }, { code: "pack", factor: 6, price: "10200.00" }, { code: "carton", factor: 72, price: "118000.00" }] },
];

interface IdRow extends RowDataPacket { id: string }
interface ActiveRow extends IdRow { is_active: 0 | 1 }

async function seedSampleCatalog() {
  if (env.NODE_ENV === "production") {
    throw new Error("Sample catalog seed is for local development only");
  }

  const connection = await pool.getConnection();
  const inserted = { users: 0, categories: 0, units: 0, products: 0, product_units: 0 };

  try {
    await connection.beginTransaction();

    for (const user of users) {
      const [existing] = await connection.execute<IdRow[]>(
        "SELECT id FROM users WHERE username = ? LIMIT 1", [user.username],
      );
      if (existing.length) continue;

      const hash = await bcrypt.hash(demoPassword, 12);
      await connection.execute(
        `INSERT INTO users (name, username, password_hash, role, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
        [user.name, user.username, hash, user.role, user.active],
      );
      inserted.users++;
    }

    const categoryIds = new Map<string, string>();
    for (const category of categories) {
      const parentId = category.parent === null ? null : categoryIds.get(category.parent);
      if (parentId === undefined) throw new Error("Seed category parent is missing");
      const [existing] = await connection.execute<ActiveRow[]>(
        "SELECT id, is_active FROM categories WHERE name = ? AND parent_id <=> ? ORDER BY id LIMIT 1",
        [category.name, parentId],
      );
      if (existing[0]) {
        if (!existing[0].is_active) throw new Error(`Existing category is inactive: ${category.name}`);
        categoryIds.set(category.key, existing[0].id);
        continue;
      }
      await connection.execute(
        `INSERT INTO categories (name, parent_id, created_at, updated_at)
         VALUES (?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
        [category.name, parentId],
      );
      const [rows] = await connection.execute<IdRow[]>("SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id");
      categoryIds.set(category.key, rows[0]!.id);
      inserted.categories++;
    }

    const unitIds = new Map<string, string>();
    for (const unit of units) {
      const [existing] = await connection.execute<ActiveRow[]>(
        "SELECT id, is_active FROM units WHERE code = ? LIMIT 1", [unit.code],
      );
      if (existing[0]) {
        if (!existing[0].is_active) throw new Error(`Existing unit is inactive: ${unit.code}`);
        unitIds.set(unit.code, existing[0].id);
        continue;
      }
      await connection.execute("INSERT INTO units (name, code) VALUES (?, ?)", [unit.name, unit.code]);
      const [rows] = await connection.execute<IdRow[]>("SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id");
      unitIds.set(unit.code, rows[0]!.id);
      inserted.units++;
    }

    for (const product of products) {
      const [existing] = await connection.execute<IdRow[]>(
        "SELECT id FROM products WHERE sku = ? LIMIT 1", [product.sku],
      );
      if (existing.length) continue;

      const input = createProductSchema.parse({
        sku: product.sku,
        name: product.name,
        categoryId: categoryIds.get(product.category),
        baseUnitId: unitIds.get(product.base),
        minStockLevel: product.minimum,
        units: product.units.map((unit) => ({
          unitId: unitIds.get(unit.code),
          conversionFactor: unit.factor,
          sellingPrice: unit.price,
          barcode: `${product.sku}-${unit.code.toUpperCase()}`,
          canPurchase: true,
          canSell: true,
        })),
      });

      const productId = await productsRepository.createProduct(connection, input);
      for (const unit of input.units) {
        await productsRepository.createProductUnit(connection, productId, unit);
        inserted.product_units++;
      }
      inserted.products++;
    }

    await connection.commit();
    console.log(JSON.stringify({ inserted, demoUsernames: users.map((user) => user.username) }, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

seedSampleCatalog()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Sample seed failed");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
