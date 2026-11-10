import type { RowDataPacket } from "mysql2";
import pool from "../../config/db.js";
import type { PoolConnection } from "mysql2/promise";


interface CategoryRow extends RowDataPacket {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: 0 | 1;
}

interface CategoryCountRow extends RowDataPacket {
  total: number | string;
}

export async function listCategories(limit: number, offset: number){
    const [roots] = await pool.execute<CategoryRow[]>(
        `SELECT id, name, parent_id, is_active
        FROM categories
        WHERE parent_id IS NULL
        ORDER BY id DESC
        LIMIT ? OFFSET ?`,
        [limit, offset]
    )

    const [countRows] = await pool.execute<CategoryCountRow[]>(
        `SELECT COUNT(*) AS total
        FROM categories
        WHERE parent_id IS NULL`
    )

    let children: CategoryRow[] = []

    if (roots.length > 0) {
    const rootIds = roots.map((root) => root.id);
    const placeholders = rootIds.map(() => "?").join(", ");

    const [rows] = await pool.execute<CategoryRow[]>(
      `SELECT id, name, parent_id, is_active
       FROM categories
       WHERE parent_id IN (${placeholders})
       ORDER BY id`,
      rootIds,
    );

    children = rows;
  }

  return{
    roots,
    children,
    total: Number(countRows[0].total)
  }
}

export async function getCategoriesForUpdate(
  connection: PoolConnection,
): Promise<CategoryRow[]> {
  const [rows] = await connection.execute<CategoryRow[]>(
    `SELECT id, name, parent_id, is_active
     FROM categories
     ORDER BY id
     FOR UPDATE`,
  );

  return rows;
}

export async function createCategory(
  connection: PoolConnection,
  name: string,
  parentId: string | null,
): Promise<CategoryRow> {
  await connection.execute(
    `INSERT INTO categories (
       name, parent_id, created_at, updated_at
     )
     VALUES (?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
    [name, parentId],
  );

  const [rows] = await connection.execute<CategoryRow[]>(
    `SELECT id, name, parent_id, is_active
     FROM categories
     WHERE id = LAST_INSERT_ID()`,
  );

  return rows[0]!;
}

export async function updateCategory(
  connection: PoolConnection,
  id: string,
  data: {
    name: string;
    parentId: string | null;
  },
): Promise<void> {
  await connection.execute(
    `UPDATE categories
     SET name = ?,
         parent_id = ?,
         updated_at = UTC_TIMESTAMP(3)
     WHERE id = ?`,
    [data.name, data.parentId, id],
  );
}

export async function getCategoryById(
  id: string,
): Promise<CategoryRow | null> {
  const [rows] = await pool.execute<CategoryRow[]>(
    `SELECT id, name, parent_id, is_active
     FROM categories
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function updateCategoryStatus(
  id: string,
  isActive: boolean,
): Promise<void> {
  await pool.execute(
    `UPDATE categories
     SET is_active = ?,
         updated_at = UTC_TIMESTAMP(3)
     WHERE id = ?`,
    [isActive, id],
  );
}






// CREATE TABLE categories (
//     id BIGINT NOT NULL AUTO_INCREMENT,
//     name VARCHAR(150) NOT NULL,
//     parent_id BIGINT NULL,
//     is_active BOOLEAN NOT NULL DEFAULT TRUE,
//     created_at DATETIME(3) NOT NULL,
//     updated_at DATETIME(3) NOT NULL,

//     PRIMARY KEY (id),
//     CONSTRAINT fk_categories_parent
//         FOREIGN KEY (parent_id) REFERENCES categories(id)
// ) ENGINE = InnoDB;