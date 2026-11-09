"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  comTransacao,
  verificarConexao,
  encerrarPool,
} = require("../database/postgres");

function poolFalso({ falharEm } = {}) {
  const comandos = [];
  let liberado = false;
  const client = {
    async query(sql) {
      comandos.push(sql);
      if (sql === falharEm) throw new Error("falha simulada");
      return { rows: [], rowCount: 0 };
    },
    release() { liberado = true; },
  };
  return {
    comandos,
    get liberado() { return liberado; },
    async connect() { return client; },
    async query(sql) {
      comandos.push(sql);
      if (sql === falharEm) throw new Error("falha simulada");
      return { rows: [{ conectado: 1 }], rowCount: 1 };
    },
    async end() { comandos.push("POOL_END"); },
  };
}

test("comTransacao confirma e libera a conexão", async () => {
  const pool = poolFalso();
  const value = await comTransacao(pool, async (client) => {
    await client.query("SELECT 1");
    return "ok";
  });

  assert.equal(value, "ok");
  assert.deepEqual(pool.comandos, ["BEGIN", "SELECT 1", "COMMIT"]);
  assert.equal(pool.liberado, true);
});

test("comTransacao reverte quando a operação falha", async () => {
  const pool = poolFalso();
  await assert.rejects(
    comTransacao(pool, async (client) => {
      await client.query("UPDATE teste SET valor = 1");
      throw new Error("erro da operação");
    }),
    /erro da operação/
  );

  assert.deepEqual(pool.comandos, ["BEGIN", "UPDATE teste SET valor = 1", "ROLLBACK"]);
  assert.equal(pool.liberado, true);
});

test("comTransacao valida o nível de isolamento antes de iniciar", async () => {
  const pool = poolFalso();
  await assert.rejects(
    comTransacao(pool, async () => {}, { isolationLevel: "READ UNCOMMITTED; DROP TABLE usuarios" }),
    /Nível de isolamento/
  );
  assert.deepEqual(pool.comandos, []);
  assert.equal(pool.liberado, true);
});

test("verificarConexao valida a resposta do banco", async () => {
  assert.equal(await verificarConexao(poolFalso()), true);
});

test("encerrarPool fecha o pool quando disponível", async () => {
  const pool = poolFalso();
  await encerrarPool(pool);
  assert.equal(pool.comandos.at(-1), "POOL_END");
});
