const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buscarUsuarioLogin,
  buscarUsuarioSessao,
  buscarUsuarioAtual,
  buscarPermissoesUsuario,
  listarUsuariosDaClinica,
} = require("../services/postgres-auth");

function fakePool(respostas) {
  const chamadas = [];
  return {
    chamadas,
    async query(sql, params = []) {
      chamadas.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
      const resposta = respostas.shift();
      if (!resposta) throw new Error("Resposta simulada não configurada.");
      return resposta;
    },
  };
}

test("busca login por e-mail normalizado e inclui vínculo de perfil e clínica", async () => {
  const usuario = { id: 8, email: "teste@exemplo.com", clinica_id: 3, role_ativo: 1 };
  const pool = fakePool([{ rows: [usuario], rowCount: 1 }]);
  assert.deepEqual(await buscarUsuarioLogin(pool, " TESTE@EXEMPLO.COM "), usuario);
  assert.match(pool.chamadas[0].sql, /LOWER\(BTRIM\(u.email\)\)/);
  assert.deepEqual(pool.chamadas[0].params, [" TESTE@EXEMPLO.COM "]);
});

test("busca sessão sempre no banco e não usa clínica informada pelo token", async () => {
  const usuario = { id: 8, clinica_id: 3, role_ativo: 1, clinica_status: "ativa" };
  const pool = fakePool([{ rows: [usuario], rowCount: 1 }]);
  assert.deepEqual(await buscarUsuarioSessao(pool, 8), usuario);
  assert.deepEqual(pool.chamadas[0].params, [8]);
});

test("consulta usuário atual com filtro obrigatório de clínica", async () => {
  const usuario = { id: 8, nome: "Admin", email: "admin@exemplo.com" };
  const pool = fakePool([{ rows: [usuario], rowCount: 1 }]);
  assert.deepEqual(await buscarUsuarioAtual(pool, 8, 3), usuario);
  assert.match(pool.chamadas[0].sql, /id = \$1 AND clinica_id = \$2/);
  assert.deepEqual(pool.chamadas[0].params, [8, 3]);
});

test("retorna todas as permissões para perfil protegido", async () => {
  const permissoes = [{ modulo: "agenda", acao: "listar" }];
  const pool = fakePool([
    { rows: [{ protegido: 1 }], rowCount: 1 },
    { rows: permissoes, rowCount: 1 },
  ]);
  assert.deepEqual(await buscarPermissoesUsuario(pool, 8, 3), {
    encontrado: true, administrador: true, permissoes,
  });
  assert.equal(pool.chamadas.length, 2);
});

test("filtra permissões de perfil comum pelo vínculo da clínica", async () => {
  const permissoes = [{ modulo: "pacientes", acao: "listar" }];
  const pool = fakePool([
    { rows: [{ protegido: 0 }], rowCount: 1 },
    { rows: permissoes, rowCount: 1 },
  ]);
  assert.deepEqual(await buscarPermissoesUsuario(pool, 8, 3), {
    encontrado: true, administrador: false, permissoes,
  });
  assert.match(pool.chamadas[1].sql, /rp\.clinica_id = u\.clinica_id/);
  assert.deepEqual(pool.chamadas[1].params, [8, 3]);
});

test("não lista profissionais de outra clínica", async () => {
  const usuarios = [{ id: 8, nome: "Dentista" }];
  const pool = fakePool([{ rows: usuarios, rowCount: 1 }]);
  assert.deepEqual(await listarUsuariosDaClinica(pool, 3), usuarios);
  assert.match(pool.chamadas[0].sql, /u\.clinica_id = \$1/);
  assert.deepEqual(pool.chamadas[0].params, [3]);
});
