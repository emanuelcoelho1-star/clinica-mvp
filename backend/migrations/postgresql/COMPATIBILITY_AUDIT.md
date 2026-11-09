# Auditoria de compatibilidade SQLite → PostgreSQL

## Escopo

Auditoria estática da branch `migration/postgresql`, baseada no backend atual. Esta etapa não altera o driver em uso e não executa consultas em um servidor PostgreSQL.

## Resultado

A aplicação não está pronta para trocar `sqlite3` por `pg` diretamente. O uso do SQLite está espalhado pelo inicializador do banco, rotas e serviços. Uma camada de compatibilidade superficial poderia até iniciar a API, mas falhar em operações de gravação, transações ou concorrência.

### Dependências encontradas

| Área | Dependência observada | Impacto na migração |
|---|---|---|
| Inicialização | `PRAGMA table_info`, `db.serialize`, `ALTER TABLE` condicional | Reescrever verificações de schema e migrations para PostgreSQL |
| Escritas | `this.lastID`, `this.changes` | Usar `RETURNING` e resultados explícitos do PostgreSQL |
| Consultas | placeholders `?` | Converter para parâmetros `$1`, `$2` etc. |
| Datas | `datetime('now','localtime')` | Definir política de timezone e usar tipos/funções PostgreSQL |
| Inserções idempotentes | `INSERT OR IGNORE` | Definir conflito esperado e usar `ON CONFLICT` |
| Comparação textual | `COLLATE NOCASE` | Definir comparação sem distinção de caixa de forma explícita |
| Transações | `BEGIN`, `COMMIT`, `ROLLBACK` via callbacks | Usar uma conexão dedicada por transação; não compartilhar transações no pool |

### Arquivos e ocorrências que exigem atenção

Auditoria estática das rotas e serviços:

- `routes/rbac.js`: transações, `serialize`, `prepare`, `lastID` e `changes`.
- `routes/planos.js`: várias cadeias transacionais, `serialize`, `lastID`, `changes` e comparações `COLLATE NOCASE`.
- `routes/assinaturas.js` e `routes/webhooks.js`: transações e `INSERT OR IGNORE`; exigem cuidado com idempotência de cobranças e eventos.
- `routes/financeiro.js`: módulo extenso, com múltiplos usos de `lastID`; requer migração e testes específicos.
- `routes/consultas.js`: `PRAGMA`, alteração automática de schema e verificação de conflito de horários.
- `routes/admin.js`: datas SQLite e comparação textual.
- `routes/arquivos.js` e `routes/medicamentos.js`: comparações `COLLATE NOCASE`.
- `server.js`: cria tabelas de cobrança/webhook durante a inicialização; essa responsabilidade precisa ir para migrations versionadas.
- `database.js`: concentra a criação do schema e alterações incrementais; não deve continuar executando DDL SQLite no modo PostgreSQL.

Também foram identificados usos de `lastID` e `changes` em rotas de pacientes, anamneses, documentos, pagamentos, evoluções e tratamentos.

## Estratégia de migração segura

1. **Infraestrutura de banco:** criar conexão PostgreSQL separada, configuração por ambiente, encerramento do pool e migrations versionadas. Manter SQLite como padrão até a validação.
2. **Contrato de acesso a dados:** padronizar execução de consultas, resultados de INSERT/UPDATE e transações com conexão dedicada. Não simular `db.serialize` globalmente.
3. **Autenticação e isolamento:** migrar cadastro, login, usuários, clínicas, permissões e testes negativos de acesso cruzado entre clínicas.
4. **Operação clínica:** migrar pacientes, agenda, anamneses, odontograma, documentos, arquivos, evoluções e tratamentos.
5. **Planos e financeiro:** migrar planos, procedimentos, orçamentos, pagamentos e financeiro.
6. **Assinaturas e administração:** migrar Asaas, webhooks, cobranças, administração e idempotência.
7. **Validação final:** executar testes de integração em PostgreSQL real, comparar contagens e relacionamentos com SQLite e ensaiar backup/restauração antes de qualquer corte.

## Critérios para considerar a migração pronta

- Todas as rotas e serviços operam exclusivamente no PostgreSQL em ambiente de teste.
- Testes de isolamento multi-tenant comprovam que uma clínica não lê nem altera dados de outra.
- Cadastro e autenticação funcionam com concorrência e rollback.
- Agenda impede sobreposição de horários sob requisições simultâneas.
- Webhooks e cobranças são idempotentes.
- Importação preserva IDs, relacionamentos, dados clínicos e sequências.
- Backup e restauração foram testados.
- Nenhum segredo ou credencial de banco está versionado.

## Limites desta auditoria

Esta é uma análise estática dos arquivos. Não prova compatibilidade do schema PostgreSQL já preparado, não valida a importação de dados reais e não substitui testes automatizados. O backend principal continua usando SQLite. Não execute os scripts de preparação em produção e não altere a branch `main` com base apenas nesta auditoria.


## Atualização da auditoria — compatibilidade SaaS

A comparação direta com `backend/database.js` confirmou que a estrutura SQLite recebe colunas SaaS/RBAC em migrações posteriores à criação das tabelas. A estrutura PostgreSQL inicial não continha todas elas. Foi criada a migração aditiva `002_saas_compatibility.sql`, que inclui:

- `clinica_id` nas tabelas de usuários, pacientes, agenda, prontuário, financeiro, catálogo e RBAC;
- `arquivos.pasta_id` e `pacientes.foto_url`;
- campos adicionais de orçamento, faces e origem do tratamento;
- `aceita_faces`, `custo_tratamento` e `usar_na_frente` em `procedimentos_catalogo`;
- `clinicas.cpf`;
- índices para filtros por clínica e índice único de nome de perfil por clínica.

O runner agora aplica as versões 001 e 002 separadamente, cada uma com transação e registro próprio. A alteração resolve diferenças estruturais identificadas nesta revisão, mas ainda exige aplicação e validação num PostgreSQL descartável, seguida de comparação de colunas e contagens após importação. Não representa autorização para conectar a aplicação ou produção.
