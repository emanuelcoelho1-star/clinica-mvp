const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const MIGRATIONS = [
  { version: "001_schema", file: "001_schema.sql" },
  { version: "002_saas_compatibility", file: "002_saas_compatibility.sql" },
];

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

    for (const migration of MIGRATIONS) {
      const alreadyApplied = await client.query(
        "SELECT version FROM sorrisa_schema_migrations WHERE version = $1",
        [migration.version]
      );

      if (alreadyApplied.rowCount) {
        console.log(`Migração ${migration.version} já aplicada.`);
        continue;
      }

      const sqlPath = path.join(__dirname, migration.file);
      const sql = fs.readFileSync(sqlPath, "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO sorrisa_schema_migrations (version) VALUES ($1)",
          [migration.version]
        );
        await client.query("COMMIT");
        console.log(`Migração ${migration.version} aplicada com sucesso.`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Falha na migração ${migration.version}: ${error.message}`);
      }
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
