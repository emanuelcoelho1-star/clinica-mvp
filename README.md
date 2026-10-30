# OdontoPro — Sistema de gestão odontológica

Aplicação em React + Vite, Node.js/Express e SQLite.

## Executar localmente no Windows

### 1. Requisitos

- Node.js LTS instalado (inclui npm).
- Git instalado.
- Terminal PowerShell ou terminal integrado do VS Code.

### 2. Baixar o projeto

Se ainda não tiver o projeto no computador, abra o PowerShell e execute:

```powershell
git clone -b security/initial-hardening https://github.com/emanuelcoelho1-star/clinica-mvp.git
cd clinica-mvp
```

Se já tiver uma cópia local, entre na pasta do projeto e atualize a branch:

```powershell
git fetch origin
git checkout security/initial-hardening
git pull origin security/initial-hardening
```

### 3. Configurar a chave local da API

No PowerShell, dentro da pasta do projeto:

```powershell
cd backend
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copie o valor gerado. Crie um arquivo chamado `.env` dentro da pasta `backend` com este conteúdo, substituindo o texto de exemplo pela chave gerada:

```env
JWT_SECRET=COLE_AQUI_A_CHAVE_ALEATORIA_GERADA
ALLOW_PUBLIC_SIGNUP=true
```

Não publique nem compartilhe esse arquivo. Ele já deve ser ignorado pelo Git.

`ALLOW_PUBLIC_SIGNUP=true` permite cadastrar clínicas adicionais para testes locais. Mantenha essa opção desativada ou remova-a em ambientes publicados na internet; ela abre o cadastro de novas clínicas.

### 4. Instalar dependências e iniciar a API

Em um terminal, a partir da pasta raiz do projeto:

```powershell
cd backend
npm install
npm run dev
```

A API deve informar que está rodando em `http://localhost:3001`. Na primeira inicialização, aguarde as mensagens de criação das tabelas e da migração SaaS antes de cadastrar a conta.

Não feche esse terminal enquanto estiver usando o sistema.

### 5. Iniciar o frontend

Abra um **segundo terminal** na pasta raiz do projeto:

```powershell
cd frontend
npm install
npm run dev
```

Abra no navegador o endereço que o Vite mostrar — normalmente `http://localhost:5173`.

### 6. Criar a conta local de teste

1. Na tela do OdontoPro, selecione **Criar conta**.
2. Informe seu nome, e-mail e uma senha com pelo menos **8 caracteres**.
3. O primeiro cadastro cria a clínica de teste, o usuário Administrador e um período de avaliação de 14 dias.
4. Depois do cadastro, entre usando o mesmo e-mail e senha.

Por segurança, o cadastro público inicial só funciona quando ainda não existe nenhum usuário no banco local. Se já houver usuários no banco, a tela não criará uma nova conta. Para começar com um banco limpo, pare a API e faça uma cópia de segurança antes de renomear ou remover `backend/database.db`; ao iniciar novamente, o SQLite criará um banco novo. **Isso apaga os dados locais antigos se você os excluir.**

### 7. Verificar se a API responde

Com a API ligada, abra `http://localhost:3001/`. A resposta esperada é um JSON com a mensagem `API da clínica rodando.`.

## Observações importantes

- A base SQLite fica em `backend/database.db`.
- A API usa a porta `3001`; o frontend usa a porta mostrada pelo Vite.
- Se a porta 3001 estiver ocupada, encerre o outro processo que a utiliza antes de iniciar a API.
- Se aparecer `JWT_SECRET não configurado`, confira se o arquivo `backend/.env` existe e contém a chave.
- Este fluxo serve para teste local. Antes de disponibilizar cadastro público na internet, é necessário revisar o processo de provisionamento, controle de acesso, migrações e testes automatizados.
