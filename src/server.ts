import app from "./app.js";
import pool from "./config/db.js";
import { env } from "./config/env.js";

async function startServer() {
  try {
    await pool.query("SELECT 1");
    console.log("Database connected successfully.");

    const server = app.listen(env.PORT, () => {
      console.log(`Server is running at http://localhost:${env.PORT}`);
    });

    server.on("error", (error) => {
      console.error("Server failed to start:", error.message);
      process.exit(1);
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";

    console.error("Database connection error:", message);
    process.exit(1);
  }
}

startServer();