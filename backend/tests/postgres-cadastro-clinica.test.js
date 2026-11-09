const test = require("node:test");
const assert = require("node:assert/strict");
const {
  criarClinicaComAdministrador,
} = require("../services/postgres-cadastro-clinica");

function criarPoolSimulado({ duplicados = false, totalUsuarios = 0 } = {}) {
  const comandos = [];
  let liberado = false;
  let conectado = false;

  const client = {
    async query(sql, params = []) {
      const normalizado = sql.replace(/\s+/g, " ").trim();
      comandos.push({ sql: normalizado, params });

      if (normalizado === "BEGIN") return { rows: [], rowCount: 0 };
      if (normalizado === "COMMIT" || normalizado === "ROLLBACK") {
        return { rows: [], rowCount: 0 };
      }
      if (normalizado.startsWith("SELECT pg_advisory_xact_lock")) {
        return { rows: [{}], rowCount: 1 };
      }
      if (normalizado.startsWith("SELECT COUNT(*)::int AS total FROM usuarios")) {
        return { rows: [{ total: totalUsuarios }], rowCount: 1 };
      }
      if (normalizado.startsWith("SELECT id FROM roles")) {
        return { rows: [{ id: 1 }], rowCount: 1 };
      }
      if (normalizado.startsWith("INSERT INTO clinicas")) {
        return { rows: [{ id: 41 }], rowCount: 1 };
      }
      if (normalizado.startsWith("INSERT INTO usuarios")) {
        return { rows: [{ id: 72 }], rowCount: 1 };
      }
      if (normalizado.startsWith("INSERT INTO assinaturas")) {
        return { rows: [], rowCount: 1 };
      }
      if (normalizado.startsWith("SELECT id, descricao FROM planos")) {
        return { rows: [{ id: 1, descricao: "Plano modelo" }], rowCount: 1 };
      }
      if (normalizado.startsWith("SELECT LOWER(BTRIM(nome))")) {
        return duplicados
          ? { rows: [{ nome_normalizado: "limpeza", total: 2 }], rowCount: 1 }
          : { rows: [], rowCount: 0 };
      }
      if (normalizado.startsWith("INSERT INTO planos")) {
        return { rows: [{ id: 91 }], rowCount: 1 };
      }
      if (normalizado.startsWith("INSERT INTO procedimentos_catalogo")) {
        return { rows: [], rowCount: 3 };
      }
      if (normalizado.startsWith("INSERT INTO plano_procedimentos")) {
        return { rows: [], rowCount: 3 };
      }
      throw new Error("Consulta inesperada no teste: " + normalizado);
    },
    release() {
      liberado = true;
    },
  };

  return {
    comandos,
    get liberado() { return liberado; },
    get conectado() { return conectado; },
    async connect() {
      conectado = true;
      return client;
    },
  };
}

const dados = {
  nomeClinica: "Clínica Exemplo",
  slug: "clinica-exemplo-abc123",
  nomeUsuario: "Administrador",
  email: "admin@exemplo.com",
  senhaHash: "hash-de-teste",
};

test("cria clínica, administrador, trial e catálogo na mesma transação", async () => {
  const pool = criarPoolSimulado();
  const resultado = await criarClinicaComAdministrador(pool, dados);

  assert.deepEqual(resultado, { clinicaId: 41, usuarioId: 72, planoId: 91 });
  const sql = pool.comandos.map((item) => item.sql);
  assert.equal(sql[0], "BEGIN");
  assert.ok(sql.some((item) => item.startsWith("SELECT pg_advisory_xact_lock")));
  assert.equal(sql.at(-1), "COMMIT");
  assert.equal(sql.includes("ROLLBACK"), false);
  assert.equal(pool.liberado, true);
});

test("aborta a transação se o catálogo-modelo tiver nomes duplicados", async () => {
  const pool = criarPoolSimulado({ duplicados: true });

  await assert.rejects(
    criarClinicaComAdministrador(pool, dados),
    /nomes duplicados/
  );

  const sql = pool.comandos.map((item) => item.sql);
  assert.equal(sql.at(-1), "ROLLBACK");
  assert.equal(sql.includes("COMMIT"), false);
  assert.equal(pool.liberado, true);
});

test("bloqueia o segundo cadastro quando o signup público está desabilitado", async () => {
  const pool = criarPoolSimulado({ totalUsuarios: 1 });

  await assert.rejects(
    criarClinicaComAdministrador(pool, dados),
    (erro) => erro.code === "PUBLIC_SIGNUP_CLOSED"
  );

  const sql = pool.comandos.map((item) => item.sql);
  assert.equal(sql.at(-1), "ROLLBACK");
  assert.equal(sql.some((item) => item.startsWith("INSERT INTO clinicas")), false);
  assert.equal(pool.liberado, true);
});


test("permite cadastros independentes de novas clínicas por padrão SaaS", async () => {
  const pool = criarPoolSimulado({ totalUsuarios: 3 });
  const resultado = await criarClinicaComAdministrador(pool, {
    ...dados,
    slug: "segunda-clinica-exemplo",
    email: "admin2@exemplo.com",
  });

  assert.equal(resultado.clinicaId, 41);
  assert.ok(pool.comandos.some((item) => item.sql.startsWith("INSERT INTO clinicas")));
  assert.equal(pool.comandos.at(-1).sql, "COMMIT");
});
