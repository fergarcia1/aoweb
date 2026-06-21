import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  console.log("[db:migrate] DATABASE_URL not set; skipping schema migration.");
  process.exit(0);
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(scriptDir, "..", "db", "schema.sql");
const schemaSql = await readFile(schemaPath, "utf8");
const pool = new pg.Pool({ connectionString });

try {
  await pool.query(schemaSql);
  console.log(`[db:migrate] schema applied from ${schemaPath}`);
} finally {
  await pool.end();
}
