"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const pathModule = require("node:path");

const habilitado = Boolean(process.env.DATABASE_URL);

test("integra schema, RBAC, cadastro, autenticação, assinatura e isolamento no PostgreSQL real", {
  skip: !habilitado,
}, async () => {
  const { Pool } = require("pg");
  const { semearRBAC } = require("../migrations/postgresql/seed-rbac");
  const { criarClinicaComAdministrador } = require("../services/postgres-cadastro-clinica");
  const {
    buscarUsuarioLogin,
    buscarUsuarioSessao,
    buscarUsuarioAtual,
  } = require("../services/postgres-auth");
  const { verificarAcessoAssinaturaPostgres } = require("../services/postgres-assinaturas");
  const criarAutenticacaoPostgres = require("../middleware/postgres-auth");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Banco exclusivo do job de CI: começa sempre com schema limpo.
    await pool.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public");

    const migrationDir = pathModule.join(__dirname, "../migrations/postgresql");
    for (const file of ["001_schema.sql", "002_saas_compatibility.sql"]) {
      await pool.query(fs.readFileSync(pathModule.join(migrationDir, file), "utf8"));
    }

    const rbac = await semearRBAC(pool);
    assert.ok(rbac.roleId > 0);
    assert.ok(rbac.permissoes > 0);

    const modelo = await pool.query(
      `INSERT INTO clinicas (nome, slug, status, plano, trial_ate)
       VALUES ('Clínica modelo', 'modelo-ci', 'ativa', 'trial',
               (CURRENT_TIMESTAMP + INTERVAL '30 days')::text)
       RETURNING id`
    );
    const modeloId = modelo.rows[0].id;

    const planoModelo = await pool.query(
      `INSERT INTO planos (clinica_id, nome, tipo, descricao, ativo)
       VALUES ($1, 'Particular', 'particular', 'Plano padrão de teste', 1)
       RETURNING id`,
      [modeloId]
    );
    const procedimentoModelo = await pool.query(
      `INSERT INTO procedimentos_catalogo
         (clinica_id, nome, categoria, ativo, aceita_faces, custo_tratamento, usar_na_frente)
       VALUES ($1, 'Consulta inicial', 'Avaliação', 1, 0, 5, 1)
       RETURNING id`,
      [modeloId]
    );
    await pool.query(
      `INSERT INTO plano_procedimentos (clinica_id, plano_id, procedimento_id, valor)
       VALUES ($1, $2, $3, 120)`,
      [modeloId, planoModelo.rows[0].id, procedimentoModelo.rows[0].id]
    );

    const cadastro = await criarClinicaComAdministrador(pool, {
      nomeClinica: "Clínica integração",
      slug: "clinica-integracao-ci",
      nomeUsuario: "Administrador integração",
      email: "admin-integracao@sorrisa.test",
      senhaHash: "hash-de-teste",
    }, { permitirCadastroMultiplo: true });

    assert.ok(cadastro.clinicaId > modeloId);
    assert.ok(cadastro.usuarioId > 0);
    assert.ok(cadastro.planoId > 0);

    const copia = await pool.query(
      `SELECT p.nome, pp.valor, pc.nome AS procedimento
       FROM planos p
       INNER JOIN plano_procedimentos pp
         ON pp.plano_id = p.id AND pp.clinica_id = p.clinica_id
       INNER JOIN procedimentos_catalogo pc
         ON pc.id = pp.procedimento_id AND pc.clinica_id = pp.clinica_id
       WHERE p.id = $1 AND p.clinica_id = $2`,
      [cadastro.planoId, cadastro.clinicaId]
    );
    assert.equal(copia.rowCount, 1);
    assert.equal(copia.rows[0].nome, "Particular");
    assert.equal(copia.rows[0].procedimento, "Consulta inicial");
    assert.equal(Number(copia.rows[0].valor), 120);

    const login = await buscarUsuarioLogin(pool, " ADMIN-INTEGRACAO@sorrisa.test ");
    assert.equal(login.id, cadastro.usuarioId);
    assert.equal(Number(login.clinica_id), cadastro.clinicaId);
    assert.equal(login.senha, "hash-de-teste");

    const sessao = await buscarUsuarioSessao(pool, cadastro.usuarioId);
    assert.equal(Number(sessao.clinica_id), cadastro.clinicaId);
    assert.equal(sessao.clinica_status, "ativa");

    assert.ok(await buscarUsuarioAtual(pool, cadastro.usuarioId, cadastro.clinicaId));
    assert.equal(await buscarUsuarioAtual(pool, cadastro.usuarioId, modeloId), null);

    const acesso = await verificarAcessoAssinaturaPostgres(pool, cadastro.clinicaId);
    assert.equal(acesso.permitido, true);

    const middleware = criarAutenticacaoPostgres({
      pool,
      secret: "segredo-de-integracao",
      verificarToken: () => ({ id: cadastro.usuarioId, clinica_id: modeloId }),
    });
    const req = { headers: { authorization: "Bearer token-de-teste" } };
    const res = {
      statusCode: 200,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    let autorizado = false;
    await middleware(req, res, () => { autorizado = true; });
    assert.equal(autorizado, true);
    assert.equal(res.statusCode, 200);
    assert.equal(Number(req.user.clinica_id), cadastro.clinicaId);

    await pool.query(
      `UPDATE clinicas
       SET trial_ate = (CURRENT_TIMESTAMP - INTERVAL '1 day')::text
       WHERE id = $1`,
      [cadastro.clinicaId]
    );
    await pool.query(
      `UPDATE assinaturas
       SET periodo_fim = (CURRENT_TIMESTAMP - INTERVAL '1 day')::text
       WHERE clinica_id = $1`,
      [cadastro.clinicaId]
    );
    const expirado = await verificarAcessoAssinaturaPostgres(pool, cadastro.clinicaId);
    assert.equal(expirado.permitido, false);
    const status = await pool.query(
      "SELECT status FROM assinaturas WHERE clinica_id = $1",
      [cadastro.clinicaId]
    );
    assert.equal(status.rows[0].status, "expirada");
  } finally {
    await pool.end();
  }
});
