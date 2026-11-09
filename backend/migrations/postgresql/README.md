# Migração PostgreSQL da Sorrisa

Esta pasta inicia a preparação do PostgreSQL sem alterar o banco SQLite atual.

## Estado desta etapa

- `001_schema.sql`: estrutura-base convertida do banco atual, com tabelas SaaS, financeiras, RBAC, administração e agenda.
- `apply-schema.js`: aplica a estrutura em um banco PostgreSQL vazio e registra a versão aplicada.
- `import-sqlite.js`: ferramenta de importação conservadora. Só importa para tabelas vazias; não apaga nem sobrescreve dados no destino.
- O backend principal **ainda usa SQLite** nesta etapa. Não configure o domínio nem aponte produção para este banco até concluir a adaptação das rotas e os testes.

## Pré-requisitos

Node.js compatível com o projeto, PostgreSQL e as dependências `pg` e `sqlite3` instaladas no backend.

Configure `DATABASE_URL` no ambiente, sem colocar credenciais no Git. Exemplo de formato:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/sorrisa
```

## Aplicar a estrutura

Na pasta `backend`, depois de instalar a dependência `pg`:

```bash
node migrations/postgresql/apply-schema.js
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
4. Revise a estrutura e valide contagens, chaves estrangeiras, IDs e dados clínicos antes de qualquer mudança de produção.
