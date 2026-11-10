import type { RowDataPacket } from "mysql2";
import pool from "../../config/db.js";


interface UnitRow extends RowDataPacket {
  id: string;
  name: string;
  code: string;
  is_active: 0 | 1;
}

interface UnitCountRow extends RowDataPacket {
  total: number | string;
}

export async function listUnits(
    search: string,
    limit: number,
    offset: number
){
    const pattern = `%${search}%`

    const [rows] = await pool.query<UnitRow[]>(
        `SELECT id, name, code, is_active
        FROM units
        WHERE name LIKE ? OR code LIKE ?
        ORDER BY id DESC
        LIMIT ? OFFSET ?`,
        [pattern, pattern, limit, offset]
    )

    const [countRows] = await pool.execute<UnitCountRow[]>(
        `SELECT COUNT(*) AS total
        FROM units
        WHERE name LIKE ? OR code LIKE ?`,
        [pattern, pattern]
    )

    return {
        rows,
        total: Number(countRows[0]!.total)
    }
}
 
export async function createUnit(
    name: string,
    code: string
): Promise<void> {
    await pool.execute(
        `INSERT INTO units (name, code) VALUES (?, ?)`,
        [name, code]
    )
}

export async function getUnitByCode(
    code: string
): Promise<UnitRow | null>{

    const [rows] = await pool.execute<UnitRow[]>(
        `SELECT id, name, code, is_active
        FROM units 
        WHERE code = ?
        LIMIT 1`,
        [code]
    )

    return rows[0] ?? null
}

export async function getUnitById(id: string){
    const [rows] = await pool.execute<UnitRow[]>(
        `SELECT id, name, code, is_active
        FROM units
        WHERE id=?
        LIMIT 1`,
        [id]
    )

    return rows[0] ?? null
}

export async function updateUnit(
    id: string,
    data: {
        name?: string,
        code?: string
    }
){
    await pool.execute(
    `UPDATE units
     SET name = COALESCE(?, name),
         code = COALESCE(?, code)
     WHERE id = ?`,
    [data.name ?? null, data.code ?? null, id],
  );
}

export async function updateUnitStatus(
    id: string,
    isActive: boolean
): Promise<void>{
    await pool.execute(
        `UPDATE units
        SET is_active=? WHERE id=?`,
        [isActive, id]
    )
}






// CREATE TABLE units (
//     id BIGINT NOT NULL AUTO_INCREMENT,
//     name VARCHAR(80) NOT NULL,
//     code VARCHAR(30) NOT NULL,
//     is_active BOOLEAN NOT NULL DEFAULT TRUE,

//     PRIMARY KEY (id),
//     UNIQUE KEY uq_units_code (code)
// ) ENGINE = InnoDB;