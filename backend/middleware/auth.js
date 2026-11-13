const jwt = require("jsonwebtoken");
const db = require("../database");
const verificarAcessoAssinatura = require("../services/assinaturas");

/* ── SECRET centralizado (mesmo do routes/auth.js) ── */
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error("JWT_SECRET não configurado. Defina a variável de ambiente antes de iniciar a API.");
}

function criarAutenticacao({ ignorarAssinatura = false } = {}) {
  return (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ erro: "Token não fornecido." });
  }

  // Suporta tanto "Bearer <token>" quanto "<token>" direto
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!token) {
    return res.status(401).json({ erro: "Token não fornecido." });
  }

  try {
    const decoded = jwt.verify(token, SECRET);

    if (!decoded.id) {
      return res.status(401).json({ erro: "Token inválido." });
    }

    // Confere se a conta ainda existe antes de autorizar qualquer rota protegida.
    db.get(
      `SELECT u.id, u.nome, u.email, u.clinica_id,
              r.ativo AS role_ativo, r.clinica_id AS role_clinica_id,
              r.protegido AS role_protegido, c.status AS clinica_status
       FROM usuarios u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN clinicas c ON c.id = u.clinica_id
       WHERE u.id = ?`,
      [decoded.id],
      (err, user) => {
        if (err) {
          return res.status(500).json({ erro: "Não foi possível validar a sessão." });
        }

        if (!user) {
          return res.status(401).json({ erro: "Sessão inválida. Faça login novamente." });
        }

        // O e-mail faz parte do token emitido no login. Se ele mudou no banco,
        // invalida automaticamente todas as sessões abertas com o e-mail antigo.
        if (
          typeof decoded.email !== "string" ||
          decoded.email.trim().toLowerCase() !== String(user.email || "").trim().toLowerCase()
        ) {
          return res.status(401).json({ erro: "Sua sessão foi encerrada porque os dados de acesso da conta foram alterados. Entre novamente." });
        }

        if (Number(user.role_ativo) !== 1) {
          return res.status(403).json({ erro: "Este perfil está desativado. Contate o administrador." });
        }

        if (!user.clinica_id) {
          return res.status(403).json({ erro: "Usuário sem clínica vinculada. Contate o administrador." });
        }

        if (user.clinica_status !== "ativa") {
          return res.status(403).json({ erro: "A clínica não está ativa. Contate o administrador." });
        }

        // O perfil protegido pode ser global; perfis personalizados devem ser da clínica do usuário.
        if (Number(user.role_protegido) !== 1 && Number(user.role_clinica_id) !== Number(user.clinica_id)) {
          return res.status(403).json({ erro: "O perfil de acesso não pertence a esta clínica." });
        }

        const continuar = () => {
          req.user = { ...decoded, nome: user.nome, email: user.email, clinica_id: user.clinica_id };
          return next();
        };
        if (ignorarAssinatura) return continuar();

        verificarAcessoAssinatura(user.clinica_id, (assinaturaErr, acesso) => {
          if (assinaturaErr) {
            console.error("Falha ao validar assinatura da clínica:", assinaturaErr.message);
            return res.status(500).json({ erro: "Não foi possível validar a assinatura da clínica." });
          }
          if (!acesso.permitido) return res.status(403).json({ erro: acesso.mensagem });
          return continuar();
        });
      }
    );
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ erro: "Token expirado. Faça login novamente." });
    }
    return res.status(401).json({ erro: "Token inválido." });
  }
  };
}

module.exports = criarAutenticacao();
module.exports.semAssinatura = criarAutenticacao({ ignorarAssinatura: true });