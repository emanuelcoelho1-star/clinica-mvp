const test = require("node:test");
const assert = require("node:assert/strict");
const {
  verificarAcessoAssinaturaPostgres,
  MENSAGEM_ASSINATURA_EXPIRADA,
} = require("../services/postgres-assinaturas");

function poolFake(row, expirou = 0) {
  const chamadas = [];
  return {
    chamadas,
    async query(sql, params) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      chamadas.push({ sql: normalized, params });
      if (normalized.startsWith("SELECT c.status AS clinica_status")) {
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      }
      if (normalized.startsWith("SELECT CASE")) {
        return { rows: [{ expirou }], rowCount: 1 };
      }
      if (normalized.startsWith("UPDATE assinaturas")) {
        return { rows: [], rowCount: 1 };
      }
      throw new Error("Consulta inesperada: " + normalized);
    },
  };
}

test("nega clínica inexistente ou suspensa", async () => {
  const ausente = poolFake(null);
  const r1 = await verificarAcessoAssinaturaPostgres(ausente, 99);
  assert.equal(r1.permitido, false);
  assert.match(r1.mensagem, /Clínica não encontrada/);

  const suspensa = poolFake({ clinica_status: "suspensa" });
  const r2 = await verificarAcessoAssinaturaPostgres(suspensa, 1);
  assert.equal(r2.permitido, false);
  assert.match(r2.mensagem, /suspensa/);
  assert.equal(suspensa.chamadas.length, 1);
});

test("permite trial válido e cobrança pendente durante trial vigente", async () => {
  const trial = poolFake({
    clinica_status: "ativa",
    plano_clinica: "trial",
    assinatura_status: "trial",
    trial_ate: "2027-01-01 12:00:00",
    periodo_fim: "2027-01-01 12:00:00",
  });
  assert.deepEqual(await verificarAcessoAssinaturaPostgres(trial, 1), { permitido: true });

  const pendente = poolFake({
    clinica_status: "ativa",
    plano_clinica: "mensal",
    assinatura_status: "pendente",
    trial_ate: "2027-01-01",
    periodo_fim: "2026-01-01",
  });
  assert.deepEqual(await verificarAcessoAssinaturaPostgres(pendente, 2), { permitido: true });
  assert.match(pendente.chamadas[1].sql, /America\/Sao_Paulo/);
  assert.match(pendente.chamadas[1].sql, /::timestamptz/);
  assert.match(pendente.chamadas[1].sql, /CURRENT_TIMESTAMP/);
  assert.equal(pendente.chamadas.length, 2);
});

test("marca assinatura trial/ativa expirada e mantém a mensagem atual", async () => {
  const pool = poolFake({
    clinica_status: "ativa",
    plano_clinica: "mensal",
    assinatura_status: "ativa",
    periodo_fim: "2026-01-01 10:00:00",
  }, 1);

  const result = await verificarAcessoAssinaturaPostgres(pool, 7);
  assert.deepEqual(result, { permitido: false, mensagem: MENSAGEM_ASSINATURA_EXPIRADA });
  assert.equal(pool.chamadas.length, 3);
  assert.match(pool.chamadas[2].sql, /status IN \('trial', 'ativa'\)/);
  assert.deepEqual(pool.chamadas[2].params, [7]);
});

test("não libera assinatura sem status elegível ou sem data final", async () => {
  const semData = poolFake({
    clinica_status: "ativa",
    plano_clinica: "mensal",
    assinatura_status: "ativa",
    periodo_fim: null,
    trial_ate: null,
  });
  const result = await verificarAcessoAssinaturaPostgres(semData, 3);
  assert.deepEqual(result, { permitido: false, mensagem: MENSAGEM_ASSINATURA_EXPIRADA });
  assert.equal(semData.chamadas.length, 1);
});
