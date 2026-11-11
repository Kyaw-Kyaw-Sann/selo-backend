import type { RowDataPacket } from "mysql2";
import type {
  CreateSupplierInput,
  ListSuppliersQuery,
  UpdateSupplierInput,
  UpdateSupplierStatusInput,
} from "./suppliers.schema.js";
import pool from "../../config/db.js";

interface SupplierRow extends RowDataPacket {
  id: string;
  name: string;
  phone: string | null;
  contact_person: string | null;
  is_active: 0 | 1;
}

interface SupplierCountRow extends RowDataPacket {
  total: number | string;
}

interface SupplierDetailRow extends SupplierRow {
  address: string | null;
  notes: string | null;
}

export async function listSuppliers(query: ListSuppliersQuery, offset: number) {
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (query.search) {
    conditions.push("(name LIKE ? OR phone LIKE ? OR contact_person LIKE ?)");

    const pattern = `%${query.search}%`;
    values.push(pattern, pattern, pattern);
  }

  if (query.status !== "ALL") {
    conditions.push("is_active = ?");
    values.push(query.status === "ACTIVE" ? 1 : 0);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query<SupplierRow[]>(
    `SELECT id, name, phone, contact_person, is_active
     FROM suppliers
     ${where}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [...values, query.limit, offset],
  );

  const [countRows] = await pool.execute<SupplierCountRow[]>(
    `SELECT COUNT(*) AS total
     FROM suppliers
     ${where}`,
    values,
  );

  return {
    rows,
    total: Number(countRows[0]!.total),
  };
}

export async function getSupplierById(
  id: string,
): Promise<SupplierDetailRow | null> {
  const [rows] = await pool.execute<SupplierDetailRow[]>(
    `SELECT
       id, name, phone, contact_person,
       address, notes, is_active
     FROM suppliers
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function createSupplier(
  input: CreateSupplierInput,
): Promise<SupplierDetailRow> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO suppliers (
         name, phone, contact_person, address, notes,
         created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
      [
        input.name,
        input.phone,
        input.contactPerson,
        input.address,
        input.notes,
      ],
    );

    const [rows] = await connection.execute<SupplierDetailRow[]>(
      `SELECT
         id, name, phone, contact_person,
         address, notes, is_active
       FROM suppliers
       WHERE id = LAST_INSERT_ID()`,
    );

    await connection.commit();

    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateSupplier(
  id: string,
  input: UpdateSupplierInput,
): Promise<void> {
  const fields = [
    ["name", "name"],
    ["phone", "phone"],
    ["contactPerson", "contact_person"],
    ["address", "address"],
    ["notes", "notes"],
  ] as const;

  const assignments: string[] = [];
  const values: (string | null)[] = [];

  for (const [field, column] of fields) {
    if (input[field] !== undefined) {
      assignments.push(`${column} = ?`);
      values.push(input[field]);
    }
  }

  await pool.execute(
    `UPDATE suppliers
     SET ${assignments.join(", ")},
         updated_at = UTC_TIMESTAMP(3)
     WHERE id = ?`,
    [...values, id],
  );
}

export async function updateSupplierStatus(
  id: string,
  input: UpdateSupplierStatusInput,
): Promise<void> {
  await pool.execute(
    `UPDATE suppliers
   SET is_active = ?,
       updated_at = UTC_TIMESTAMP(3)
   WHERE id = ?`,
    [input.isActive, id],
  );
}

// CREATE TABLE suppliers (
//     id BIGINT NOT NULL AUTO_INCREMENT,
//     name VARCHAR(200) NOT NULL,
//     phone VARCHAR(40) NULL,
//     contact_person VARCHAR(150) NULL,
//     address TEXT NULL,
//     notes TEXT NULL,
//     is_active BOOLEAN NOT NULL DEFAULT TRUE,
//     created_at DATETIME(3) NOT NULL,
//     updated_at DATETIME(3) NOT NULL,

//     PRIMARY KEY (id)
// ) ENGINE = InnoDB;
