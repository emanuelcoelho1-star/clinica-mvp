# Plano de migração PostgreSQL — autenticação e isolamento

## Estado

Esta etapa é uma análise do fluxo atual e um contrato para a implementação. Ela não troca o driver, não altera rotas e não habilita PostgreSQL no servidor. O backend continua usando SQLite.

## Fluxos que precisam ser preservados

### Cadastro de clínica

O endpoint `POST /auth/register` atualmente:

1. Valida nome, e-mail e senha e gera o hash com bcrypt.
2. Inicia uma transação SQLite com `BEGIN IMMEDIATE`.
3. Conta usuários para bloquear novos cadastros públicos, salvo quando `ALLOW_PUBLIC_SIGNUP=true`.
4. Obtém o perfil protegido de administrador.
5. Cria a clínica, o usuário administrador, a assinatura trial de 7 dias e copia o plano Particular, procedimentos e preços da clínica-modelo.
6. Confirma a transação e emite um JWT.

**Requisito PostgreSQL:** todas as gravações acima devem ocorrer em uma única conexão transacional obtida do pool. Qualquer falha deve fazer rollback de todos os registros. O JWT só pode ser emitido depois do COMMIT.

**Concorrência:** o teste de primeiro cadastro não pode depender apenas de `SELECT COUNT(*)` em uma transação READ COMMITTED. Duas requisições simultâneas poderiam observar zero usuários. A implementação deverá serializar essa decisão (por exemplo, advisory lock transacional com chave fixa para o cadastro inicial) e revalidar a condição dentro da transação. O modo `ALLOW_PUBLIC_SIGNUP=true` deve manter o comportamento de permitir múltiplas clínicas.

**IDs:** usar `INSERT ... RETURNING id`; não usar `lastID`.

### Cópia do plano Particular

A cópia do catálogo deve permanecer vinculada à clínica recém-criada:

- localizar o plano Particular da clínica-modelo;
- inserir o plano Particular da nova clínica e obter o ID com `RETURNING`;
- copiar os procedimentos para a nova clínica;
- relacionar procedimentos e preços ao plano recém-criado;
- não reutilizar IDs da clínica-modelo;
- executar tudo na mesma transação do cadastro.

A correspondência de procedimentos por nome deve ser determinística. Antes de implementar, validar se existem nomes duplicados após normalização na clínica-modelo; se existirem, a cópia deve usar uma chave estável ou falhar com rollback, em vez de relacionar registros arbitrariamente.

### Login

O endpoint `POST /auth/login` precisa preservar:

- busca do usuário e validação bcrypt;
- validação do perfil ativo;
- validação de vínculo e status da clínica;
- validação de que perfil não protegido pertence à mesma clínica;
- validação de assinatura;
- emissão do JWT somente após todas as verificações.

O e-mail atualmente é globalmente único no schema SQLite e a consulta de login procura por e-mail sem `clinica_id`. A migração deve preservar essa regra inicialmente; não alterar para e-mail único por clínica sem uma decisão de produto e uma migração de dados explícita.

### Middleware

O middleware consulta o usuário novamente a cada requisição protegida. Deve continuar verificando no banco, e não confiar apenas em dados de clínica contidos no JWT:

- usuário existente;
- perfil ativo;
- clínica vinculada e ativa;
- perfil protegido global ou perfil personalizado pertencente à clínica;
- assinatura válida, exceto nas rotas que usam `semAssinatura`.

A atribuição de `req.user.clinica_id` deve vir do registro consultado no banco.

### Assinaturas

A validação atual trata trial, assinatura ativa, cobrança pendente durante trial válido e expiração. A comparação de datas usa funções SQLite. No PostgreSQL, definir explicitamente o fuso horário de negócio e converter a comparação para tipos/funções PostgreSQL. Não misturar datas sem fuso, timestamps e strings sem testes de limite.

A atualização para `expirada` deve ser atômica e limitada à clínica e aos status elegíveis. A resposta de acesso negado deve continuar igual.

## Contrato SQL para PostgreSQL

- Placeholders: `$1`, `$2`, etc.
- INSERT que precisa do ID: `RETURNING id`.
- UPDATE cujo resultado precisa indicar alteração: usar `RETURNING id` e verificar `rowCount`.
- Transações: usar exclusivamente o client recebido por `comTransacao`; nunca usar o pool global no meio de uma transação.
- Datas: escolher e documentar tipos e timezone antes de converter a lógica de trial/assinatura.
- Erros de unicidade: identificar `error.code === '23505'`; não depender de procurar a palavra `UNIQUE` na mensagem.

## Testes de aceitação obrigatórios

1. Cadastro inicial cria exatamente uma clínica, um administrador, uma assinatura e um catálogo Particular completo.
2. Falha ao inserir usuário, assinatura ou catálogo não deixa nenhum registro parcial.
3. Duas requisições simultâneas ao primeiro cadastro: apenas uma é concluída quando signup público está desabilitado.
4. Com `ALLOW_PUBLIC_SIGNUP=true`, cadastros concorrentes criam clínicas independentes.
5. E-mail duplicado retorna conflito sem deixar clínica órfã.
6. Login rejeita senha incorreta, perfil inativo, clínica suspensa e perfil de outra clínica.
7. Login aceita perfil protegido global e perfil personalizado da própria clínica.
8. Middleware rejeita usuário removido, clínica suspensa e perfil desativado.
9. Middleware nunca obtém `clinica_id` do cliente/token como fonte de autoridade.
10. Trial válido, trial expirado, assinatura ativa, assinatura expirada e cobrança pendente durante trial têm o mesmo comportamento do SQLite.
11. Rotas `/auth/me`, `/auth/permissoes`, `/auth/usuarios`, `/auth/perfil` e `/auth/alterar-senha` mantêm isolamento e respostas atuais.

## Bloqueios antes da implementação

- O pacote `pg` e o lockfile ainda não foram adicionados.
- O servidor ainda importa `backend/database.js` (SQLite).
- O serviço de assinatura e o middleware ainda usam callbacks SQLite.
- Não há ambiente PostgreSQL real conectado nesta etapa.
- O schema PostgreSQL precisa ser conferido contra as tabelas reais e dados legados antes de qualquer importação.

**Regra de segurança:** não habilitar PostgreSQL no servidor nem executar importação em produção até os testes de integração acima passarem em um banco PostgreSQL descartável e houver backup restaurável do SQLite.
