import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL no está configurada.");
  }

  const schemaPath = resolve(process.cwd(), "db", "schema.sql");
  const schemaSql = await readFile(schemaPath, "utf8");
  const pool = new Pool({ connectionString });
  try {
    await pool.query(schemaSql);
    console.log(`[db:migrate] schema aplicado desde ${schemaPath}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[db:migrate] error:", error);
  process.exit(1);
});

