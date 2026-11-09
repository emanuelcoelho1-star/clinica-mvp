"use strict";

const jwt = require("jsonwebtoken");
const {
  buscarUsuarioSessao,
} = require("../services/postgres-auth");
const {
  verificarAcessoAssinaturaPostgres,
} = require("../services/postgres-assinaturas");

/**
 * Middleware PostgreSQL isolado. Não substitui o middleware SQLite atual:
 * só deve ser montado por uma aplicação cuja camada de dados inteira já use PG.
 */
function criarAutenticacaoPostgres({
  pool,
  secret = process.env.JWT_SECRET,
  ignorarAssinatura = false,
  verificarToken = (token, chave) => jwt.verify(token, chave),
  buscarSessao = buscarUsuarioSessao,
  verificarAssinatura = verificarAcessoAssinaturaPostgres,
} = {}) {
  if (!pool || typeof pool.query !== "function") {
    throw new TypeError("Pool PostgreSQL é obrigatório.");
  }
  if (!secret) {
    throw new Error("JWT_SECRET não configurado para autenticação PostgreSQL.");
  }

  return async function autenticacaoPostgres(req, res, next) {
    const authHeader = req.headers && req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ erro: "Token não fornecido." });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
    if (!token) {
      return res.status(401).json({ erro: "Token não fornecido." });
    }

    let decoded;
    try {
      decoded = verificarToken(token, secret);
    } catch (error) {
      if (error && error.name === "TokenExpiredError") {
        return res.status(401).json({ erro: "Token expirado. Faça login novamente." });
      }
      return res.status(401).json({ erro: "Token inválido." });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({ erro: "Token inválido." });
    }

    try {
      // A clínica e o perfil são sempre obtidos do banco, nunca do token.
      const user = await buscarSessao(pool, decoded.id);
      if (!user) {
        return res.status(401).json({ erro: "Sessão inválida. Faça login novamente." });
      }
      if (!user.role_id || Number(user.role_ativo) !== 1) {
        return res.status(403).json({ erro: "Este perfil está desativado. Contate o administrador." });
      }
      if (!user.clinica_id) {
        return res.status(403).json({ erro: "Usuário sem clínica vinculada. Contate o administrador." });
      }
      if (user.clinica_status !== "ativa") {
        return res.status(403).json({ erro: "A clínica não está ativa. Contate o administrador." });
      }
      if (
        Number(user.role_protegido) !== 1 &&
        Number(user.role_clinica_id) !== Number(user.clinica_id)
      ) {
        return res.status(403).json({ erro: "O perfil de acesso não pertence a esta clínica." });
      }

      if (!ignorarAssinatura) {
        const acesso = await verificarAssinatura(pool, user.clinica_id);
        if (!acesso.permitido) {
          return res.status(403).json({ erro: acesso.mensagem });
        }
      }

      req.user = {
        ...decoded,
        id: user.id,
        nome: user.nome,
        email: user.email,
        clinica_id: user.clinica_id,
      };
      return next();
    } catch (error) {
      console.error("Falha ao validar sessão PostgreSQL:", error.message);
      return res.status(500).json({ erro: "Não foi possível validar a sessão." });
    }
  };
}

module.exports = criarAutenticacaoPostgres;
