"use strict";

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { domainToUnicode } = require("url");
const {
  criarClinicaComAdministrador,
} = require("../services/postgres-cadastro-clinica");
const {
  buscarUsuarioLogin,
  buscarUsuarioAtual,
  buscarPermissoesUsuario,
  listarUsuariosDaClinica,
} = require("../services/postgres-auth");
const criarAutenticacaoPostgres = require("../middleware/postgres-auth");

function emailParaExibicao(email) {
  if (typeof email !== "string") return email;
  const separador = email.lastIndexOf("@");
  if (separador < 0) return email;
  const usuario = email.slice(0, separador);
  const dominio = email.slice(separador + 1);
  return `${usuario}@${domainToUnicode(dominio) || dominio}`;
}

/**
 * Cria as rotas de autenticação PostgreSQL sem acoplar o servidor atual ao
 * novo banco. A montagem deve ocorrer somente quando as demais rotas também
 * estiverem prontas para PostgreSQL.
 */
function criarRotasAuthPostgres(options = {}) {
  const {
    pool,
    secret = process.env.JWT_SECRET,
    permitirCadastroMultiplo = process.env.ALLOW_PUBLIC_SIGNUP !== "false",
    autenticar,
    autenticarSemAssinatura,
    buscarLogin = buscarUsuarioLogin,
    buscarAtual = buscarUsuarioAtual,
    buscarPermissoes = buscarPermissoesUsuario,
    listarUsuarios = listarUsuariosDaClinica,
    criarClinica = criarClinicaComAdministrador,
    hashSenha = (senha) => bcrypt.hash(senha, 12),
    compararSenha = bcrypt.compare,
    assinarToken = (payload, chave) => jwt.sign(payload, chave, { expiresIn: "24h" }),
    limiteCadastro,
    limiteLogin,
    limiteGeral,
  } = options;

  if (!pool || typeof pool.query !== "function") {
    throw new TypeError("Pool PostgreSQL é obrigatório para as rotas de autenticação.");
  }
  if (!secret) {
    throw new Error("JWT_SECRET não configurado para as rotas PostgreSQL.");
  }

  const router = express.Router();
  const auth = autenticar || criarAutenticacaoPostgres({ pool, secret });
  const authSemAssinatura = autenticarSemAssinatura ||
    criarAutenticacaoPostgres({ pool, secret, ignorarAssinatura: true });

  const cadastroLimiter = limiteCadastro || rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { erro: "Muitas contas criadas. Tente novamente em 1 hora." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false, trustProxy: false },
  });
  const loginLimiter = limiteLogin || rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { erro: "Muitas tentativas de login. Tente novamente em 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  const geralLimiter = limiteGeral || rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { erro: "Muitas requisições. Aguarde um momento." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false, trustProxy: false },
  });

  router.post("/register", cadastroLimiter, async (req, res) => {
    try {
      const { nome, email, senha } = req.body || {};
      if (!email || !senha) {
        return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
      }
      if (typeof senha !== "string" || senha.length < 8) {
        return res.status(400).json({ erro: "A senha deve ter no mínimo 8 caracteres." });
      }

      const emailNormalizado = String(email).trim().toLowerCase();
      const nomeNormalizado = String(nome || "").trim().slice(0, 120);
      if (!nomeNormalizado) {
        return res.status(400).json({ erro: "Nome é obrigatório." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
        return res.status(400).json({ erro: "Informe um e-mail válido." });
      }

      const hash = await hashSenha(senha);
      const slugBase = nomeNormalizado
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        .slice(0, 45) || "clinica";
      const slug = `${slugBase}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

      const cadastro = await criarClinica(pool, {
        nomeClinica: `${nomeNormalizado} - Clínica`,
        slug,
        nomeUsuario: nomeNormalizado,
        email: emailNormalizado,
        senhaHash: hash,
      }, { permitirCadastroMultiplo });

      const token = assinarToken({
        id: cadastro.usuarioId,
        nome: nomeNormalizado,
        email: emailNormalizado,
      }, secret);

      return res.status(201).json({
        mensagem: "Conta criada. Complete agora os dados da sua clínica.",
        id: cadastro.usuarioId,
        clinica_id: cadastro.clinicaId,
        token,
        usuario: {
          id: cadastro.usuarioId,
          nome: nomeNormalizado,
          email: emailParaExibicao(emailNormalizado),
        },
      });
    } catch (error) {
      if (error && error.code === "23505") {
        return res.status(409).json({ erro: "E-mail já cadastrado ou identificador da clínica indisponível." });
      }
      if (error && error.code === "PUBLIC_SIGNUP_CLOSED") {
        return res.status(403).json({ erro: "O cadastro público está temporariamente fechado." });
      }
      if (error && error.code === "ADMIN_ROLE_UNAVAILABLE") {
        return res.status(503).json({ erro: "Perfil Administrador indisponível. Tente novamente mais tarde." });
      }
      console.error("Falha no cadastro PostgreSQL:", error && error.message);
      return res.status(500).json({ erro: "Não foi possível concluir o cadastro." });
    }
  });

  router.post("/login", loginLimiter, async (req, res) => {
    try {
      const { email, senha } = req.body || {};
      if (!email || !senha) {
        return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
      }

      const user = await buscarLogin(pool, String(email).trim().toLowerCase());
      if (!user) {
        return res.status(401).json({ erro: "E-mail ou senha inválidos." });
      }
      if (!(await compararSenha(senha, user.senha))) {
        return res.status(401).json({ erro: "E-mail ou senha inválidos." });
      }
      if (!user.role_id || Number(user.role_ativo) !== 1) {
        return res.status(403).json({ erro: "Seu perfil está indisponível. Contate o administrador." });
      }
      if (!user.clinica_id || user.clinica_status !== "ativa") {
        return res.status(403).json({ erro: "A clínica não está ativa ou não está vinculada ao usuário." });
      }
      if (Number(user.role_protegido) !== 1 &&
          Number(user.role_clinica_id) !== Number(user.clinica_id)) {
        return res.status(403).json({ erro: "O perfil de acesso não pertence a esta clínica." });
      }

      const { verificarAcessoAssinaturaPostgres } = require("../services/postgres-assinaturas");
      const acesso = await (options.verificarAssinatura || verificarAcessoAssinaturaPostgres)(pool, user.clinica_id);
      if (!acesso.permitido) {
        return res.status(403).json({ erro: acesso.mensagem });
      }

      const token = assinarToken({
        id: user.id,
        nome: user.nome,
        email: user.email,
      }, secret);

      return res.json({
        token,
        usuario: {
          id: user.id,
          nome: user.nome || "Administrador",
          email: emailParaExibicao(user.email),
        },
      });
    } catch (error) {
      console.error("Falha no login PostgreSQL:", error && error.message);
      return res.status(500).json({ erro: "Erro interno ao autenticar usuário." });
    }
  });

  router.get("/permissoes", geralLimiter, authSemAssinatura, async (req, res) => {
    try {
      const resultado = await buscarPermissoes(pool, req.user.id, req.user.clinica_id);
      if (!resultado.encontrado) {
        return res.status(403).json({ erro: "Perfil inexistente ou desativado." });
      }
      return res.json({
        administrador: resultado.administrador,
        permissoes: resultado.permissoes,
      });
    } catch (error) {
      console.error("Falha ao consultar permissões PostgreSQL:", error && error.message);
      return res.status(500).json({ erro: "Não foi possível consultar permissões." });
    }
  });

  router.get("/me", geralLimiter, authSemAssinatura, async (req, res) => {
    try {
      const user = await buscarAtual(pool, req.user.id, req.user.clinica_id);
      if (!user) {
        return res.status(401).json({ erro: "Usuário não encontrado nesta clínica." });
      }
      return res.json({ usuario: { ...user, email: emailParaExibicao(user.email) } });
    } catch (error) {
      console.error("Falha ao consultar sessão PostgreSQL:", error && error.message);
      return res.status(500).json({ erro: "Erro ao consultar usuário." });
    }
  });

  router.get("/usuarios", geralLimiter, auth, async (req, res) => {
    try {
      return res.json(await listarUsuarios(pool, req.user.clinica_id));
    } catch (error) {
      console.error("Falha ao listar usuários PostgreSQL:", error && error.message);
      return res.status(500).json({ erro: "Erro ao buscar profissionais da clínica." });
    }
  });

  router.put("/perfil", geralLimiter, auth, async (req, res) => {
    const nome = req.body && req.body.nome;
    if (typeof nome !== "string" || !nome.trim()) {
      return res.status(400).json({ erro: "Nome é obrigatório." });
    }
    try {
      const result = await pool.query(
        "UPDATE usuarios SET nome = $1 WHERE id = $2 AND clinica_id = $3 RETURNING id",
        [nome.trim(), req.user.id, req.user.clinica_id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ erro: "Usuário não encontrado nesta clínica." });
      }
      return res.json({ mensagem: "Perfil atualizado com sucesso." });
    } catch (error) {
      console.error("Falha ao atualizar perfil PostgreSQL:", error && error.message);
      return res.status(500).json({ erro: "Erro ao atualizar perfil." });
    }
  });

  router.put("/alterar-senha", geralLimiter, auth, async (req, res) => {
    const { senha_atual, nova_senha } = req.body || {};
    if (!senha_atual || !nova_senha) {
      return res.status(400).json({ erro: "Senha atual e nova senha são obrigatórias." });
    }
    if (typeof nova_senha !== "string" || nova_senha.length < 6) {
      return res.status(400).json({ erro: "A nova senha deve ter no mínimo 6 caracteres." });
    }
    try {
      const atual = await pool.query(
        "SELECT id, senha FROM usuarios WHERE id = $1 AND clinica_id = $2",
        [req.user.id, req.user.clinica_id]
      );
      if (!atual.rows[0]) {
        return res.status(404).json({ erro: "Usuário não encontrado nesta clínica." });
      }
      if (!(await compararSenha(senha_atual, atual.rows[0].senha))) {
        return res.status(401).json({ erro: "Senha atual incorreta." });
      }
      const hash = await bcrypt.hash(nova_senha, 10);
      const atualizado = await pool.query(
        "UPDATE usuarios SET senha = $1 WHERE id = $2 AND clinica_id = $3 RETURNING id",
        [hash, req.user.id, req.user.clinica_id]
      );
      if (atualizado.rowCount === 0) {
        return res.status(404).json({ erro: "Usuário não encontrado nesta clínica." });
      }
      return res.json({ mensagem: "Senha alterada com sucesso." });
    } catch (error) {
      console.error("Falha ao alterar senha PostgreSQL:", error && error.message);
      return res.status(500).json({ erro: "Erro ao alterar senha." });
    }
  });

  return router;
}

module.exports = criarRotasAuthPostgres;
