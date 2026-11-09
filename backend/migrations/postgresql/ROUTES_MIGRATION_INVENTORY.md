# Inventário de migração das rotas para PostgreSQL

Branch de trabalho: `migration/postgresql`

## Estado atual

O servidor continua usando SQLite. Nenhuma rota PostgreSQL está montada no `server.js`. O adaptador `routes/postgres-auth.js` é isolado e não altera o funcionamento local atual.

A inspeção das rotas existentes identificou 17 módulos ainda dependentes de `../database` (SQLite). A contagem abaixo é uma estimativa estática de chamadas diretas a `db.get/all/run/serialize/prepare/exec`; não inclui chamadas indiretas a serviços.

| Módulo | Chamadas SQLite diretas | Complexidade / dependências |
|---|---:|---|
| auth | — | Adaptador PostgreSQL isolado criado; validar contrato e dependências |
| pacientes | 15 | Entidade central; isolamento por clínica e odontograma/foto |
| consultas | 10 | Agenda, horários de funcionamento e duração |
| anamneses | 5 | Dependente de pacientes |
| documentos | 5 | Dependente de pacientes e arquivos/PDF |
| evolucoes | 5 | Dependente de pacientes |
| tratamentos | 6 | Dependente de pacientes e financeiro |
| orcamentos | 22 | Dependente de pacientes, usuários, planos e procedimentos |
| pagamentos | 6 | Dependente de pacientes/orçamentos e financeiro |
| arquivos | 14 | Upload/download, pastas e armazenamento no filesystem |
| planos | 48 | Catálogo, procedimentos, valores e vínculo por clínica |
| rbac | 32 | Perfis, permissões, usuários e isolamento por clínica |
| clinica | 3 | Dados cadastrais da clínica autenticada |
| financeiro | 3 | Muitos endpoints; depende de várias tabelas e regras |
| medicamentos | 2 | Catálogo por clínica |
| assinaturas | 18 | Checkout e status de assinatura |
| webhooks | 2 | Eventos externos e idempotência |
| admin | 27 | Painel global de administração; autorização distinta da clínica |

## Ordem sugerida de migração

1. **Fundação e contratos** — driver `pg`, configuração do pool, transações, erros, autenticação e seleção explícita do banco.
2. **Identidade e clínica** — auth, RBAC e dados da clínica.
3. **Cadastros clínicos** — pacientes, consultas, anamneses, documentos, evoluções e tratamentos.
4. **Planejamento e cobrança clínica** — planos, orçamentos e pagamentos.
5. **Arquivos e catálogo** — arquivos, medicamentos e armazenamento.
6. **Financeiro** — migrar por grupos de endpoints e testar consistência entre contas, fluxo, comissões e exportações.
7. **SaaS e operações** — assinaturas, webhooks e admin global.
8. **Integração final** — selecionar PostgreSQL explicitamente, executar suíte completa, validar backup/restauração e só então planejar migração de dados e deploy.

## Requisitos transversais para cada módulo

- Todas as consultas e alterações de dados de clínica devem restringir por `clinica_id` obtido da sessão validada no banco.
- Nunca aceitar `clinica_id` do corpo, query string ou token como fonte de autoridade.
- Usar placeholders PostgreSQL (`$1`, `$2`...), `RETURNING` quando necessário e transações com uma única conexão.
- Preservar status HTTP, mensagens e formato JSON consumidos pelo frontend.
- Preservar uploads, caminhos de arquivos e downloads; não presumir que migrar SQL também migra o armazenamento binário.
- Criar testes de isolamento entre duas clínicas para cada grupo de endpoints.
- Não montar módulos parcialmente migrados no servidor de produção.

## Decisão de produto pendente: cadastro público

Há uma diferença que precisa ser resolvida explicitamente antes de ativar PostgreSQL:

- A rota SQLite atual só permite novos cadastros quando `ALLOW_PUBLIC_SIGNUP=true`; por padrão, após o primeiro usuário, bloqueia cadastros.
- O adaptador PostgreSQL permite múltiplos cadastros por padrão e só bloqueia com `ALLOW_PUBLIC_SIGNUP=false`.

A intenção SaaS de criar uma clínica independente por cadastro aponta para signup público, mas a configuração padrão atual do SQLite é restritiva. Definir uma única política e documentá-la para os dois bancos antes de trocar o backend. Não alterar silenciosamente esse comportamento.

## Bloqueios conhecidos

- `pg@8.16.3` ainda não está declarado como dependência de runtime em `backend/package.json` e `backend/package-lock.json`.
- O adaptador PostgreSQL de autenticação não está montado no servidor.
- Os outros módulos listados ainda usam SQLite diretamente.
- A suíte atual valida preparação e autenticação isolada; não significa que o produto inteiro esteja pronto para PostgreSQL.

**Regra:** manter SQLite como padrão, preservar `main`, não fazer merge, não migrar dados de produção e não publicar até todas as rotas e operações críticas estarem cobertas por testes PostgreSQL reais.
