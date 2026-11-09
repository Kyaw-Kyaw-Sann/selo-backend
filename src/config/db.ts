import mysql from "mysql2/promise";
import { env } from "./env.js";

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000,
  timezone: "Z",
  supportBigNumbers: true,
  bigNumberStrings: true,
});

export default pool
