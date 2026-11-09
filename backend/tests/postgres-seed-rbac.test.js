const test = require("node:test");
const assert = require("node:assert/strict");
const { semearRBAC, PERMISSOES } = require("../migrations/postgresql/seed-rbac");

test("prepara o perfil Administrador global e todas as permissões dentro de transação", async () => {
  const comandos = [];
  const client = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      comandos.push({ sql: normalized, params });
      if (normalized === "BEGIN" || normalized === "COMMIT" || normalized === "ROLLBACK") {
        return { rows: [], rowCount: 0 };
      }
      if (normalized.startsWith("SELECT pg_advisory_xact_lock")) return { rows: [{}], rowCount: 1 };
      if (normalized.startsWith("INSERT INTO roles")) {
        return { rows: [], rowCount: 1 };
      }
      if (normalized.startsWith("INSERT INTO permissoes")) {
        return { rows: [], rowCount: 1 };
      }
      if (normalized.startsWith("SELECT id FROM roles")) {
        return { rows: [{ id: 1 }], rowCount: 1 };
      }
      throw new Error("Consulta inesperada: " + normalized);
    },
    release() { comandos.push({ sql: "RELEASE" }); },
  };
  const pool = { async connect() { return client; } };

  const result = await semearRBAC(pool);
  assert.deepEqual(result, { roleId: 1, permissoes: PERMISSOES.length });
  assert.equal(comandos[0].sql, "BEGIN");
  assert.equal(comandos.at(-2).sql, "COMMIT");
  assert.equal(comandos.at(-1).sql, "RELEASE");
  assert.equal(comandos.filter((item) => item.sql.startsWith("INSERT INTO permissoes")).length, PERMISSOES.length);
});

test("faz rollback se o perfil Administrador não puder ser confirmado", async () => {
  const comandos = [];
  const client = {
    async query(sql) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      comandos.push(normalized);
      if (normalized === "BEGIN" || normalized === "COMMIT" || normalized === "ROLLBACK") {
        return { rows: [], rowCount: 0 };
      }
      if (normalized.startsWith("SELECT pg_advisory_xact_lock")) return { rows: [{}], rowCount: 1 };
      if (normalized.startsWith("INSERT INTO roles") || normalized.startsWith("INSERT INTO permissoes")) {
        return { rows: [], rowCount: 1 };
      }
      if (normalized.startsWith("SELECT id FROM roles")) {
        return { rows: [], rowCount: 0 };
      }
      throw new Error("Consulta inesperada: " + normalized);
    },
    release() {},
  };
  const pool = { async connect() { return client; } };

  await assert.rejects(semearRBAC(pool), /Administrador global único/);
  assert.equal(comandos.at(-1), "ROLLBACK");
  assert.equal(comandos.includes("COMMIT"), false);
});
