# Migração PostgreSQL da Sorrisa

Esta pasta inicia a preparação do PostgreSQL sem alterar o banco SQLite atual.

## Estado desta etapa

- `001_schema.sql`: estrutura-base convertida do banco atual, com tabelas SaaS, financeiras, RBAC, administração e agenda.
- `002_saas_compatibility.sql`: adiciona as colunas de isolamento por clínica e campos que o SQLite atual cria por migrações posteriores (foto do paciente, orçamento, faces e catálogo de procedimentos).
- `apply-schema.js`: aplica, em ordem e com controle de versão, as migrações `001_schema` e `002_saas_compatibility`.
- `import-sqlite.js`: ferramenta de importação conservadora. Só importa para tabelas vazias; não apaga nem sobrescreve dados no destino.
- `../database/postgres.js`: infraestrutura isolada para pool, health check e transações PostgreSQL.
- `../tests/postgres-database.test.js`: testes unitários do contrato de transações e liberação de conexão.
- `../services/postgres-cadastro-clinica.js`: serviço isolado para criar clínica, administrador, trial e catálogo Particular numa única transação PostgreSQL.
- `../services/postgres-assinaturas.js`: validação isolada de acesso por status da clínica, trial, assinatura e cobrança pendente, com datas no fuso de São Paulo.
- `seed-rbac.js`: prepara o perfil Administrador global e as permissões padrão no PostgreSQL vazio, de forma transacional e idempotente.
- `../tests/postgres-seed-rbac.test.js`: verifica o seed RBAC e seu rollback.
- `../tests/postgres-assinaturas.test.js`: verifica regras de acesso e expiração da assinatura.
- `../tests/postgres-cadastro-clinica.test.js`: testes com pool simulado para commit, rollback, bloqueio de cadastro duplicado e validação do catálogo.
- O backend principal **ainda usa SQLite** nesta etapa. O módulo PostgreSQL ainda não é importado pelo `server.js`. Não configure o domínio nem aponte produção para este banco até concluir a adaptação das rotas e os testes.
- A dependência `pg` ainda precisa ser adicionada ao projeto e ao lockfile antes de executar os scripts PostgreSQL.

## Pré-requisitos

Node.js compatível com o projeto, PostgreSQL e as dependências `pg` e `sqlite3` instaladas no backend.

Configure `DATABASE_URL` no ambiente, sem colocar credenciais no Git. Exemplo de formato:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/sorrisa
```

Opções da conexão (todas opcionais):

- `PG_POOL_MAX`: máximo de conexões no pool (padrão 10).
- `PG_IDLE_TIMEOUT_MS`: tempo até liberar conexões ociosas (padrão 30000).
- `PG_CONNECTION_TIMEOUT_MS`: timeout para conectar (padrão 5000).
- `PGSSLMODE=require` ou `PGSSL=true`: habilita SSL. Por padrão, a validação do certificado permanece ativa; só altere `PGSSL_REJECT_UNAUTHORIZED=false` se o provedor exigir e após avaliar o certificado.

## Testes da camada de conexão

Na pasta `backend`:

```bash
npm run test:postgres-prep
```

Os testes atuais usam pools simulados para verificar transações, rollback, validação do nível de isolamento, liberação de conexão, cadastro inicial e seed das permissões. Eles não substituem testes de integração contra um PostgreSQL real.

## Aplicar a estrutura

Na pasta `backend`, depois de instalar a dependência `pg`:

```bash
node migrations/postgresql/apply-schema.js
node migrations/postgresql/seed-rbac.js
```

## Importar os dados locais

Faça primeiro um backup do arquivo `backend/database.db`. Aponte `DATABASE_URL` para um banco PostgreSQL vazio e execute:

```bash
node migrations/postgresql/import-sqlite.js
```

Para indicar outro arquivo SQLite, defina `SQLITE_PATH`.

## Cuidados

1. Não execute a importação em um banco com dados: o script interrompe a operação se encontrar registros.
2. A importação ocorre em uma transação e preserva o arquivo SQLite de origem.
3. Esta primeira versão é uma base de migração, não uma declaração de compatibilidade total. Consultas e transações específicas do SQLite ainda precisam ser adaptadas no backend antes de trocar o driver da aplicação.
4. O helper `comTransacao` usa uma conexão exclusiva por transação. Não use `pool.query("BEGIN")` seguido de outras chamadas ao pool para simular uma transação.
5. Revise a estrutura e valide contagens, chaves estrangeiras, IDs e dados clínicos antes de qualquer mudança de produção.
6. A conexão PostgreSQL ainda não foi testada contra um servidor real nesta etapa.
