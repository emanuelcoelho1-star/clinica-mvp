const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationsDir = path.join(__dirname, "..", "migrations", "postgresql");
const compatibilitySql = fs.readFileSync(
  path.join(migrationsDir, "002_saas_compatibility.sql"),
  "utf8"
);
const runner = fs.readFileSync(
  path.join(migrationsDir, "apply-schema.js"),
  "utf8"
);

test("a migração SaaS adiciona clinica_id às tabelas usadas no isolamento", () => {
  const tabelas = [
    "usuarios", "pacientes", "consultas", "odontogramas", "anamneses",
    "orcamentos", "orcamento_itens", "arquivos", "documentos", "pagamentos",
    "evolucoes", "tratamentos", "profissionais", "categorias_financeiras",
    "contas_pagar", "contas_receber", "comissoes", "fluxo_caixa",
    "centros_custo", "formas_pagamento_config", "metas_financeiras",
    "planos", "procedimentos_catalogo", "plano_procedimentos",
    "roles", "permissoes", "role_permissoes",
  ];

  for (const tabela of tabelas) {
    assert.match(
      compatibilitySql,
      new RegExp("ALTER TABLE " + tabela + " ADD COLUMN IF NOT EXISTS clinica_id", "i"),
      "clinica_id ausente em " + tabela
    );
  }
});

test("a migração preserva campos adicionados posteriormente no SQLite", () => {
  for (const fragmento of [
    "arquivos ADD COLUMN IF NOT EXISTS pasta_id",
    "pacientes ADD COLUMN IF NOT EXISTS foto_url",
    "orcamentos ADD COLUMN IF NOT EXISTS descricao",
    "orcamentos ADD COLUMN IF NOT EXISTS dentista_responsavel",
    "orcamentos ADD COLUMN IF NOT EXISTS plano_id",
    "orcamento_itens ADD COLUMN IF NOT EXISTS faces",
    "tratamentos ADD COLUMN IF NOT EXISTS origem_orcamento_item_id",
    "procedimentos_catalogo ADD COLUMN IF NOT EXISTS aceita_faces",
    "procedimentos_catalogo ADD COLUMN IF NOT EXISTS custo_tratamento",
    "procedimentos_catalogo ADD COLUMN IF NOT EXISTS usar_na_frente",
  ]) {
    assert.ok(compatibilitySql.includes(fragmento), "campo ausente: " + fragmento);
  }
});

test("o runner aplica as duas migrações em ordem e registra cada versão", () => {
  assert.match(runner, /version: "001_schema", file: "001_schema\.sql"/);
  assert.match(runner, /version: "002_saas_compatibility", file: "002_saas_compatibility\.sql"/);
  assert.match(runner, /sorrisa_schema_migrations/);
  assert.match(runner, /await client\.query\("BEGIN"\)/);
  assert.match(runner, /await client\.query\("COMMIT"\)/);
  assert.match(runner, /await client\.query\("ROLLBACK"\)/);
});
