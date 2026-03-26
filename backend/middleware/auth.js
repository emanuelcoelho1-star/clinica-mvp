const jwt = require("jsonwebtoken");

/* ── SECRET centralizado (mesmo do routes/auth.js) ── */
const SECRET = process.env.JWT_SECRET || "segredo_super_secreto_clinica_2025";

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
    req.user = decoded; // { id, nome, email }
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ erro: "Token expirado. Faça login novamente." });
    }
    return res.status(401).json({ erro: "Token inválido." });
  }
};