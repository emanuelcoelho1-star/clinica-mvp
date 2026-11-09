"use strict";

/**
 * Infraestrutura PostgreSQL isolada da camada SQLite legada.
 *
 * Este módulo ainda não é importado pelo server.js. A aplicação só deve
 * alternar para PostgreSQL depois que rotas e serviços forem migrados.
 */
function criarPoolPostgres(options = {}) {
  const { Pool } = require("pg");
  const connectionString = options.connectionString || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL não configurado para PostgreSQL.");
  }

  const sslMode = String(process.env.PGSSLMODE || "").toLowerCase();
  const ssl = options.ssl !== undefined
    ? options.ssl
    : (sslMode === "require" || process.env.PGSSL === "true")
      ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined;

  return new Pool({
    connectionString,
    ...(ssl ? { ssl } : {}),
    max: Number(process.env.PG_POOL_MAX) > 0 ? Number(process.env.PG_POOL_MAX) : 10,
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) > 0
      ? Number(process.env.PG_IDLE_TIMEOUT_MS)
      : 30000,
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) > 0
      ? Number(process.env.PG_CONNECTION_TIMEOUT_MS)
      : 5000,
    application_name: "sorrisa-api",
    ...options.poolOptions,
  });
}

/**
 * Executa uma operação atômica em uma conexão exclusiva do pool.
 * Nunca usar pool.query para BEGIN/COMMIT: comandos de uma transação
 * precisam permanecer no mesmo client.
 */
async function comTransacao(pool, callback, options = {}) {
  if (!pool || typeof pool.connect !== "function") {
    throw new TypeError("Um pool PostgreSQL válido é obrigatório.");
  }
  if (typeof callback !== "function") {
    throw new TypeError("A operação da transação deve ser uma função.");
  }

  const client = await pool.connect();
  let transacaoIniciada = false;

  try {
    await client.query(options.isolationLevel
      ? `BEGIN ISOLATION LEVEL ${validarIsolationLevel(options.isolationLevel)}`
      : "BEGIN");
    transacaoIniciada = true;

    const resultado = await callback(client);
    await client.query("COMMIT");
    transacaoIniciada = false;
    return resultado;
  } catch (error) {
    if (transacaoIniciada) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        error.rollbackError = rollbackError;
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

function validarIsolationLevel(value) {
  const allowed = new Set([
    "READ COMMITTED",
    "REPEATABLE READ",
    "SERIALIZABLE",
  ]);
  const normalized = String(value).trim().toUpperCase();
  if (!allowed.has(normalized)) {
    throw new Error("Nível de isolamento PostgreSQL inválido.");
  }
  return normalized;
}

async function verificarConexao(pool) {
  const result = await pool.query("SELECT 1 AS conectado");
  return result.rows[0]?.conectado === 1;
}

async function encerrarPool(pool) {
  if (pool && typeof pool.end === "function") {
    await pool.end();
  }
}

module.exports = {
  criarPoolPostgres,
  comTransacao,
  verificarConexao,
  encerrarPool,
};
