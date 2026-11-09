const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Defina DATABASE_URL com a string de conexão do PostgreSQL.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS sorrisa_schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const version = "001_schema";
    const alreadyApplied = await client.query(
      "SELECT version FROM sorrisa_schema_migrations WHERE version = $1",
      [version]
    );

    if (alreadyApplied.rowCount) {
      console.log(`Migração ${version} já aplicada.`);
      return;
    }

    const sqlPath = path.join(__dirname, "001_schema.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO sorrisa_schema_migrations (version) VALUES ($1)",
        [version]
      );
      await client.query("COMMIT");
      console.log(`Migração ${version} aplicada com sucesso.`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Falha ao preparar o PostgreSQL:", error.message);
  process.exitCode = 1;
});
