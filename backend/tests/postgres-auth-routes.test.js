"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const criarRotasAuthPostgres = require("../routes/postgres-auth");

async function iniciarServidor(router) {
  const app = express();
  app.use(express.json());
  app.use("/auth", router);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const address = server.address();
  return {
    server,
    url: `http://127.0.0.1:${address.port}/auth`,
    async fechar() {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    },
  };
}

function autenticacaoFake(req, res, next) {
  req.user = { id: 72, nome: "Admin", email: "admin@exemplo.com", clinica_id: 41 };
  next();
}

test("POST /register cria clínica SaaS e permite múltiplos cadastros por padrão", async () => {
  let dadosCriacao;
  let opcoesCriacao;
  const router = criarRotasAuthPostgres({
    pool: { async query() { return { rows: [], rowCount: 0 }; } },
    secret: "segredo-teste",
    hashSenha: async () => "hash-seguro",
    assinarToken: () => "token-teste",
    criarClinica: async (_pool, dados, options) => {
      dadosCriacao = dados;
      opcoesCriacao = options;
      return { clinicaId: 41, usuarioId: 72, planoId: 91 };
    },
  });
  const servidor = await iniciarServidor(router);
  try {
    const resposta = await fetch(`${servidor.url}/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nome: "  Clínica São José  ",
        email: " ADMIN@EXEMPLO.COM ",
        senha: "senha-segura-123",
      }),
    });
    const body = await resposta.json();

    assert.equal(resposta.status, 201);
    assert.equal(body.clinica_id, 41);
    assert.equal(body.id, 72);
    assert.equal(body.token, "token-teste");
    assert.equal(body.usuario.email, "ADMIN@EXEMPLO.COM".toLowerCase());
    assert.equal(dadosCriacao.email, "admin@exemplo.com");
    assert.equal(dadosCriacao.nomeUsuario, "Clínica São José");
    assert.equal(dadosCriacao.senhaHash, "hash-seguro");
    assert.equal(opcoesCriacao.permitirCadastroMultiplo, true);
  } finally {
    await servidor.fechar();
  }
});

test("POST /login valida vínculo do perfil antes de emitir token", async () => {
  const router = criarRotasAuthPostgres({
    pool: { async query() { return { rows: [], rowCount: 0 }; } },
    secret: "segredo-teste",
    buscarLogin: async () => ({
      id: 72,
      nome: "Admin",
      email: "admin@exemplo.com",
      senha: "hash",
      role_id: 1,
      role_ativo: 1,
      role_clinica_id: 99,
      role_protegido: 0,
      clinica_id: 41,
      clinica_status: "ativa",
    }),
    compararSenha: async () => true,
    assinarToken: () => "nao-deve-ser-emitido",
  });
  const servidor = await iniciarServidor(router);
  try {
    const resposta = await fetch(`${servidor.url}/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@exemplo.com", senha: "senha" }),
    });
    const body = await resposta.json();
    assert.equal(resposta.status, 403);
    assert.match(body.erro, /não pertence a esta clínica/);
  } finally {
    await servidor.fechar();
  }
});

test("rotas de sessão e permissões usam o clinica_id validado pelo middleware", async () => {
  const chamadas = [];
  const pool = {
    async query(sql, params) {
      chamadas.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
      return { rows: [], rowCount: 1 };
    },
  };
  const router = criarRotasAuthPostgres({
    pool,
    secret: "segredo-teste",
    autenticar: autenticacaoFake,
    autenticarSemAssinatura: autenticacaoFake,
    buscarAtual: async (_pool, id, clinicaId) => {
      assert.equal(id, 72);
      assert.equal(clinicaId, 41);
      return { id, nome: "Admin", email: "admin@exemplo.com" };
    },
    buscarPermissoes: async (_pool, id, clinicaId) => {
      assert.equal(id, 72);
      assert.equal(clinicaId, 41);
      return { encontrado: true, administrador: true, permissoes: [{ modulo: "agenda", acao: "listar" }] };
    },
    listarUsuarios: async (_pool, clinicaId) => {
      assert.equal(clinicaId, 41);
      return [{ id: 72, nome: "Admin" }];
    },
  });
  const servidor = await iniciarServidor(router);
  try {
    const [me, permissoes, usuarios] = await Promise.all([
      fetch(`${servidor.url}/me`),
      fetch(`${servidor.url}/permissoes`),
      fetch(`${servidor.url}/usuarios`),
    ]);
    assert.equal(me.status, 200);
    assert.equal((await me.json()).usuario.email, "admin@exemplo.com");
    assert.equal(permissoes.status, 200);
    assert.equal((await permissoes.json()).administrador, true);
    assert.equal(usuarios.status, 200);
    assert.deepEqual(await usuarios.json(), [{ id: 72, nome: "Admin" }]);
    assert.equal(chamadas.length, 0);
  } finally {
    await servidor.fechar();
  }
});
