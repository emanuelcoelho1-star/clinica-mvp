const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { Pool } = require("pg");

// Importação única e conservadora: nunca apaga dados do PostgreSQL.
const TABLES = [
  "pacientes", "consultas", "usuarios", "odontogramas", "anamneses",
  "orcamentos", "orcamento_itens", "arquivos", "pastas_arquivos",
  "documentos", "medicamentos", "planos", "procedimentos_catalogo",
  "plano_procedimentos", "pagamentos", "evolucoes", "tratamentos",
  "profissionais", "categorias_financeiras", "contas_pagar",
  "contas_receber", "comissoes", "fluxo_caixa", "centros_custo",
  "formas_pagamento_config", "metas_financeiras", "roles", "permissoes",
  "role_permissoes", "clinicas", "assinaturas", "auditoria",
  "saas_migracoes", "admin_payment_settings", "admin_clinica_notas",
  "agenda_funcionamento", "sorrisa_assinatura_cobrancas",
  "sorrisa_asaas_checkouts", "sorrisa_asaas_webhook_eventos"
];

const quote = (identifier) => '"' + identifier.replace(/"/g, '""') + '"';
const sqliteAll = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
});

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Defina DATABASE_URL com a string de conexão do PostgreSQL.");
  }

  const sqlitePath = process.env.SQLITE_PATH || path.join(__dirname, "..", "database.db");
  const sqlite = new sqlite3.Database(sqlitePath, sqlite3.OPEN_READONLY);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const dbTables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()"
    );
    const available = new Set(dbTables.rows.map((row) => row.table_name));
    for (const table of TABLES) {
      if (!available.has(table)) throw new Error(`A tabela ${table} não existe no PostgreSQL. Aplique 001_schema.sql primeiro.`);
    }

    const existing = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ANY($1)",
      [TABLES]
    );
    for (const { table_name } of existing.rows) {
      const count = await client.query(`SELECT EXISTS (SELECT 1 FROM ${quote(table_name)} LIMIT 1) AS has_rows`);
      if (count.rows[0].has_rows) {
        throw new Error(`A tabela ${table_name} já contém dados. A importação foi interrompida para evitar sobrescrita.`);
      }
    }

    await client.query("BEGIN");
    try {
      for (const table of TABLES) {
        const sqliteColumns = await sqliteAll(sqlite, `PRAGMA table_info(${quote(table)})`);
        if (!sqliteColumns.length) continue;
        const pgColumnsResult = await client.query(
          "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 ORDER BY ordinal_position",
          [table]
        );
        const pgColumns = new Set(pgColumnsResult.rows.map((row) => row.column_name));
        const columns = sqliteColumns.map((column) => column.name).filter((name) => pgColumns.has(name));
        if (!columns.length) continue;

        const orderBy = columns.includes("id") ? " ORDER BY " + quote("id") : "";
        const rows = await sqliteAll(sqlite, `SELECT ${columns.map(quote).join(", ")} FROM ${quote(table)}${orderBy}`);
        for (let offset = 0; offset < rows.length; offset += 250) {
          const batch = rows.slice(offset, offset + 250);
          for (const row of batch) {
            const values = columns.map((column) => row[column]);
            const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
            await client.query(
              `INSERT INTO ${quote(table)} (${columns.map(quote).join(", ")}) VALUES (${placeholders})`,
              values
            );
          }
        }

        if (pgColumns.has("id")) {
          const sequence = await client.query("SELECT pg_get_serial_sequence($1, 'id') AS name", [table]);
          if (sequence.rows[0].name) {
            await client.query(
              "SELECT setval($1::regclass, GREATEST(COALESCE((SELECT MAX(id) FROM " + quote(table) + "), 1), 1), EXISTS (SELECT 1 FROM " + quote(table) + "))",
              [sequence.rows[0].name]
            );
          }
        }
        console.log(`${table}: ${rows.length} registro(s) importado(s).`);
      }
      await client.query("COMMIT");
      console.log("Importação concluída. O arquivo SQLite original foi preservado.");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    sqlite.close();
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Falha na importação SQLite → PostgreSQL:", error.message);
  process.exitCode = 1;
});
