"use strict";

const { criarPoolPostgres, comTransacao, encerrarPool } = require("../../database/postgres");

const PERMISSOES = [
  ["pacientes", "listar", "Listar pacientes"],
  ["pacientes", "criar", "Cadastrar pacientes"],
  ["pacientes", "editar", "Editar pacientes"],
  ["pacientes", "excluir", "Excluir pacientes"],
  ["pacientes", "ver_prontuario", "Ver prontuário do paciente"],
  ["agenda", "listar", "Ver agenda"],
  ["agenda", "criar", "Agendar consultas"],
  ["agenda", "editar", "Editar agendamentos"],
  ["agenda", "excluir", "Cancelar agendamentos"],
  ["anamneses", "listar", "Ver anamneses"],
  ["anamneses", "criar", "Criar anamneses"],
  ["anamneses", "editar", "Editar anamneses"],
  ["anamneses", "excluir", "Excluir anamneses"],
  ["orcamentos", "listar", "Ver orçamentos"],
  ["orcamentos", "criar", "Criar orçamentos"],
  ["orcamentos", "editar", "Editar orçamentos"],
  ["orcamentos", "excluir", "Excluir orçamentos"],
  ["documentos", "listar", "Ver documentos"],
  ["documentos", "criar", "Criar documentos"],
  ["documentos", "editar", "Editar documentos"],
  ["documentos", "excluir", "Excluir documentos"],
  ["arquivos", "listar", "Ver e baixar arquivos"],
  ["arquivos", "criar", "Enviar arquivos"],
  ["arquivos", "excluir", "Excluir arquivos"],
  ["pagamentos", "listar", "Ver pagamentos"],
  ["pagamentos", "criar", "Registrar pagamentos"],
  ["pagamentos", "editar", "Editar pagamentos"],
  ["pagamentos", "excluir", "Excluir pagamentos"],
  ["evolucoes", "listar", "Ver evoluções clínicas"],
  ["evolucoes", "criar", "Registrar evoluções clínicas"],
  ["evolucoes", "editar", "Editar evoluções clínicas"],
  ["evolucoes", "excluir", "Excluir evoluções clínicas"],
  ["tratamentos", "listar", "Ver tratamentos"],
  ["tratamentos", "criar", "Criar tratamentos"],
  ["tratamentos", "editar", "Editar tratamentos"],
  ["tratamentos", "excluir", "Excluir tratamentos"],
  ["financeiro", "listar", "Ver informações financeiras"],
  ["financeiro", "criar", "Criar lançamentos financeiros"],
  ["financeiro", "editar", "Editar lançamentos financeiros"],
  ["financeiro", "excluir", "Excluir lançamentos financeiros"],
  ["financeiro", "exportar", "Exportar relatórios financeiros"],
  ["planos", "listar", "Acessar e gerenciar a aba Planos nas configurações"],
  ["configuracoes", "gerenciar_usuarios", "Gerenciar usuários"],
  ["configuracoes", "gerenciar_roles", "Gerenciar perfis de acesso"],
  ["configuracoes", "gerenciar_permissoes", "Gerenciar permissões"],
];

async function semearRBAC(pool) {
  return comTransacao(pool, async (client) => {
    await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [20261110]);
    await client.query(
      `INSERT INTO roles (nome, descricao, cor, protegido, ativo, clinica_id)
       SELECT 'Administrador', 'Acesso total ao sistema', '#2563eb', 1, 1, NULL
       WHERE NOT EXISTS (
         SELECT 1 FROM roles
         WHERE clinica_id IS NULL AND protegido = 1
           AND LOWER(BTRIM(nome)) = 'administrador'
       )`
    );

    for (const [modulo, acao, descricao] of PERMISSOES) {
      await client.query(
        `INSERT INTO permissoes (modulo, acao, descricao)
         VALUES ($1, $2, $3)
         ON CONFLICT (modulo, acao) DO NOTHING`,
        [modulo, acao, descricao]
      );
    }

    const role = await client.query(
      `SELECT id FROM roles
       WHERE clinica_id IS NULL AND protegido = 1
         AND LOWER(BTRIM(nome)) = 'administrador'
       ORDER BY id LIMIT 1`
    );

    if (role.rowCount !== 1) {
      throw new Error("Não foi possível garantir um perfil Administrador global único.");
    }

    return { roleId: role.rows[0].id, permissoes: PERMISSOES.length };
  });
}

async function main() {
  const pool = criarPoolPostgres();
  try {
    const resultado = await semearRBAC(pool);
    process.stdout.write(
      `RBAC PostgreSQL preparado. Perfil Administrador ID ${resultado.roleId}; ${resultado.permissoes} permissões verificadas.\\n`
    );
  } finally {
    await encerrarPool(pool);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Falha ao preparar RBAC PostgreSQL:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { semearRBAC, PERMISSOES };
