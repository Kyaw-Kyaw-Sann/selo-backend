import type { RowDataPacket } from "mysql2";
import pool from "../../config/db.js";
interface AuthUserRow extends RowDataPacket {
  id: string;
  name: string;
  username: string;
  password_hash: string;
  role: "OWNER" | "CASHIER";
  is_active: 0 | 1;
}

interface SessionUserRow extends RowDataPacket {
  id: string;
  name: string;
  username: string;
  role: "OWNER" | "CASHIER";
  is_active: 0 | 1;
}

export async function getUserByUsername(
  username: string,
): Promise<AuthUserRow | null> {
  const [rows] = await pool.execute<AuthUserRow[]>(
    `SELECT 
        id,
        name,
        username,
        password_hash,
        role,
        is_active 
        FROM users
        WHERE username=?
        LIMIT 1`,
    [username],
  );

  return rows[0] ?? null;
}

export async function getUserById(
    id: string
): Promise<SessionUserRow | null> {
    const [rows] = await pool.execute<SessionUserRow[]>(
        `SELECT id, name, username, role, is_active
        FROM users
        WHERE id=?
        LIMIT 1`,
        [id]
    )

    return rows[0] ?? null
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
