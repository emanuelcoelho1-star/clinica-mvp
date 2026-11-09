const test = require("node:test");
const assert = require("node:assert/strict");
const criarAutenticacaoPostgres = require("../middleware/postgres-auth");

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

function criarReq(token = "valid") {
  return { headers: token === null ? {} : { authorization: "Bearer " + token } };
}

function user(overrides = {}) {
  return {
    id: 7,
    nome: "Admin",
    email: "admin@exemplo.com",
    role_id: 1,
    clinica_id: 12,
    role_ativo: 1,
    role_clinica_id: null,
    role_protegido: 1,
    clinica_status: "ativa",
    ...overrides,
  };
}

function middleware({ usuario = user(), assinatura = { permitido: true }, erroSessao, erroAssinatura } = {}) {
  const chamadas = [];
  const pool = { async query() { return { rows: [], rowCount: 0 }; } };
  const handler = criarAutenticacaoPostgres({
    pool,
    secret: "segredo-de-teste",
    verificarToken(token, secret) {
      assert.equal(secret, "segredo-de-teste");
      if (token === "expired") {
        const error = new Error("expired");
        error.name = "TokenExpiredError";
        throw error;
      }
      if (token !== "valid") throw new Error("invalid");
      return { id: 7, clinica_id: 999 };
    },
    async buscarSessao(_pool, id) {
      chamadas.push(["sessao", id]);
      if (erroSessao) throw erroSessao;
      return usuario;
    },
    async verificarAssinatura(_pool, id) {
      chamadas.push(["assinatura", id]);
      if (erroAssinatura) throw erroAssinatura;
      return assinatura;
    },
  });
  return { handler, chamadas };
}

test("rejeita ausência, token inválido e expirado", async () => {
  const { handler } = middleware();
  let res = response();
  await handler(criarReq(null), res, () => assert.fail("não deveria avançar"));
  assert.equal(res.statusCode, 401);

  res = response();
  await handler(criarReq("bad"), res, () => assert.fail("não deveria avançar"));
  assert.equal(res.statusCode, 401);
  assert.match(res.body.erro, /inválido/);

  res = response();
  await handler(criarReq("expired"), res, () => assert.fail("não deveria avançar"));
  assert.equal(res.statusCode, 401);
  assert.match(res.body.erro, /expirado/);
});

test("rejeita usuário inexistente, perfil inativo e clínica inativa", async () => {
  for (const usuario of [
    null,
    user({ role_ativo: 0 }),
    user({ clinica_status: "suspensa" }),
  ]) {
    const { handler } = middleware({ usuario });
    const res = response();
    await handler(criarReq(), res, () => assert.fail("não deveria avançar"));
    assert.ok([401, 403].includes(res.statusCode));
  }
});

test("rejeita perfil personalizado pertencente a outra clínica", async () => {
  const { handler } = middleware({
    usuario: user({ role_protegido: 0, role_clinica_id: 44 }),
  });
  const res = response();
  await handler(criarReq(), res, () => assert.fail("não deveria avançar"));
  assert.equal(res.statusCode, 403);
  assert.match(res.body.erro, /não pertence/);
});

test("carrega clínica do banco, ignora clínica adulterada no JWT e valida assinatura", async () => {
  const { handler, chamadas } = middleware();
  const req = criarReq();
  const res = response();
  let avancou = false;
  await handler(req, res, () => { avancou = true; });

  assert.equal(avancou, true);
  assert.equal(res.statusCode, 200);
  assert.equal(req.user.clinica_id, 12);
  assert.equal(req.user.id, 7);
  assert.deepEqual(chamadas, [["sessao", 7], ["assinatura", 12]]);
});

test("bloqueia assinatura expirada e permite rota sem assinatura quando solicitado", async () => {
  const bloqueado = middleware({
    assinatura: { permitido: false, mensagem: "Assinatura expirada." },
  });
  const resBloqueado = response();
  await bloqueado.handler(criarReq(), resBloqueado, () => assert.fail("não deveria avançar"));
  assert.equal(resBloqueado.statusCode, 403);

  const livre = middleware({ assinatura: { permitido: false, mensagem: "expirada" } });
  const semAssinatura = criarAutenticacaoPostgres({
    pool: { async query() { return { rows: [], rowCount: 0 }; } },
    secret: "segredo",
    ignorarAssinatura: true,
    verificarToken: () => ({ id: 7 }),
    buscarSessao: async () => user(),
    verificarAssinatura: async () => {
      assert.fail("não deve consultar assinatura");
    },
  });
  const req = criarReq();
  const res = response();
  let avancou = false;
  await semAssinatura(req, res, () => { avancou = true; });
  assert.equal(avancou, true);
  assert.equal(req.user.clinica_id, 12);
  assert.equal(livre.chamadas.length, 0);
});

test("converte falha de banco em erro 500 sem autorizar a requisição", async () => {
  const { handler } = middleware({ erroSessao: new Error("database down") });
  const res = response();
  await handler(criarReq(), res, () => assert.fail("não deveria avançar"));
  assert.equal(res.statusCode, 500);
  assert.match(res.body.erro, /validar a sessão/);
});
