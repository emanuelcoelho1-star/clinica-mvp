const jwt = require("jsonwebtoken");
const db = require("../database");

/* ── SECRET centralizado (mesmo do routes/auth.js) ── */
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error("JWT_SECRET não configurado. Defina a variável de ambiente antes de iniciar a API.");
}

module.exports = (req, res, next) => {
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
      `SELECT u.id, u.nome, u.email, u.clinica_id, r.ativo AS role_ativo,
              c.status AS clinica_status
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

        if (Number(user.role_ativo) !== 1) {
          return res.status(403).json({ erro: "Este perfil está desativado. Contate o administrador." });
        }

        if (!user.clinica_id) {
          return res.status(403).json({ erro: "Usuário sem clínica vinculada. Contate o administrador." });
        }

        if (user.clinica_status !== "ativa") {
          return res.status(403).json({ erro: "A clínica não está ativa. Contate o administrador." });
        }

        req.user = { ...decoded, nome: user.nome, email: user.email, clinica_id: user.clinica_id };
        next();
      }
    );
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ erro: "Token expirado. Faça login novamente." });
    }
    return res.status(401).json({ erro: "Token inválido." });
  }
};