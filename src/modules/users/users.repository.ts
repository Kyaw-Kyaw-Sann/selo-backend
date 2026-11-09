import type { RowDataPacket } from "mysql2";
import pool from "../../config/db.js";
import type { PoolConnection } from "mysql2/promise";

interface UserRow extends RowDataPacket {
  id: string;
  name: string;
  username: string;
  role: "OWNER" | "CASHIER";
  is_active: 0 | 1;
}

interface UserCountRow extends RowDataPacket {
  total: number | string;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const [rows] = await pool.execute<UserRow[]>(
    `SELECT id, name, username, role, is_active
        FROM users
        WHERE id=?
        LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function listUsers(search: string, limit: number, offset: number) {
  const searchPattern = `%${search}%`;

  const [rows] = await pool.query<UserRow[]>(
    `SELECT id, name, username, role, is_active
     FROM users
     WHERE name LIKE ? OR username LIKE ?
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [searchPattern, searchPattern, limit, offset],
  );

  const [countRows] = await pool.execute<UserCountRow[]>(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE name LIKE ? OR username LIKE ?`,
    [searchPattern, searchPattern],
  );

  return {
    rows,
    total: Number(countRows[0]!.total),
  };
}

interface CreateUserData {
  name: string;
  username: string;
  passwordHash: string;
  role: "OWNER" | "CASHIER";
}

export async function createUser(data: CreateUserData): Promise<void> {
  await pool.execute(
    `INSERT INTO users (
       name,
       username,
       password_hash,
       role,
       created_at,
       updated_at
     )
     VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
    [data.name, data.username, data.passwordHash, data.role],
  );
}

export async function getUserByUsername(
  username: string,
): Promise<UserRow | null> {
  const [rows] = await pool.execute<UserRow[]>(
    `SELECT id, name, username, role, is_active
     FROM users
     WHERE username = ?
     LIMIT 1`,
    [username],
  );

  return rows[0] ?? null;
}

export async function getUsersForUpdate(
  connection: PoolConnection,
): Promise<UserRow[]> {
  const [rows] = await connection.execute<UserRow[]>(
    `SELECT id, name, username, role, is_active
     FROM users
     ORDER BY id
     FOR UPDATE`,
  );

  return rows;
}

export async function updateUser(
  connection: PoolConnection,
  id: string,
  data: {
    name: string;
    username: string;
    role: "OWNER" | "CASHIER";
  },
): Promise<void> {
  await connection.execute(
    `UPDATE users
     SET name = ?,
         username = ?,
         role = ?,
         updated_at = UTC_TIMESTAMP(3)
     WHERE id = ?`,
    [data.name, data.username, data.role, id],
  );
}

export async function updateUserStatus(
  connection: PoolConnection,
  id: string,
  isActive: boolean,
): Promise<void> {
  await connection.execute(
    `UPDATE users
     SET is_active = ?,
         updated_at = UTC_TIMESTAMP(3)
     WHERE id = ?`,
    [isActive, id],
  );
}

// CREATE TABLE users (
//     id BIGINT NOT NULL AUTO_INCREMENT,
//     name VARCHAR(150) NOT NULL,
//     username VARCHAR(80) NOT NULL,
//     password_hash VARCHAR(255) NOT NULL,
//     role VARCHAR(20) NOT NULL,
//     is_active BOOLEAN NOT NULL DEFAULT TRUE,
//     created_at DATETIME(3) NOT NULL,
//     updated_at DATETIME(3) NOT NULL,

//     PRIMARY KEY (id),
//     UNIQUE KEY uq_users_username (username)
// ) ENGINE = InnoDB;
