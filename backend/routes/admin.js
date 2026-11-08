const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const db = require("../database");

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Aguarde 15 minutos." },
});

const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "emanuelcoelho1@gmail.com").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "";

function compararSeguramente(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function exigirAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !ADMIN_JWT_SECRET) {
    return res.status(401).json({ erro: "Acesso administrativo não autorizado." });
  }
  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET);
    if (payload.tipo !== "sorrisa_superadmin" || payload.email !== ADMIN_EMAIL) {
      return res.status(403).json({ erro: "Acesso administrativo não autorizado." });
    }
    req.admin = payload;
    return next();
  } catch {
    return res.status(401).json({ erro: "Sessão administrativa expirada." });
  }
}

router.post("/login", loginLimiter, (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const senha = typeof req.body?.senha === "string" ? req.body.senha : "";

  if (!ADMIN_PASSWORD || !ADMIN_JWT_SECRET) {
    return res.status(503).json({
      erro: "Acesso administrativo ainda não configurado. Defina ADMIN_PASSWORD e ADMIN_JWT_SECRET no backend/.env.",
    });
  }
  if (!compararSeguramente(email, ADMIN_EMAIL) || !compararSeguramente(senha, ADMIN_PASSWORD)) {
    return res.status(401).json({ erro: "E-mail ou senha inválidos." });
  }

  const token = jwt.sign(
    { tipo: "sorrisa_superadmin", email: ADMIN_EMAIL },
    ADMIN_JWT_SECRET,
    { expiresIn: "8h", issuer: "sorrisa-admin" }
  );
  return res.json({ token, administrador: { email: ADMIN_EMAIL } });
});

router.get("/dashboard", exigirAdmin, (req, res) => {
  const sql = `
    SELECT
      c.id, c.nome, c.email_contato,
      (SELECT GROUP_CONCAT(DISTINCT TRIM(u.email), ', ')
       FROM usuarios u
       WHERE u.clinica_id = c.id AND TRIM(COALESCE(u.email, '')) <> '') AS email_login,
      c.status, c.plano, c.trial_ate, c.created_at,
      (SELECT COUNT(*) FROM usuarios u WHERE u.clinica_id = c.id) AS total_usuarios,
      (SELECT COUNT(*) FROM usuarios u WHERE u.clinica_id = c.id
       AND TRIM(COALESCE(u.email, '')) <> '') AS usuarios_com_email,
      (SELECT COUNT(*) FROM arquivos a WHERE a.clinica_id = c.id) AS total_arquivos,
      (SELECT COALESCE(SUM(a.tamanho), 0) FROM arquivos a WHERE a.clinica_id = c.id) AS armazenamento_bytes,
      s.status AS assinatura_status, s.periodo_inicio, s.periodo_fim,
      s.provedor
    FROM clinicas c
    LEFT JOIN assinaturas s ON s.clinica_id = c.id
    ORDER BY c.created_at DESC, c.id DESC
  `;

  db.all(sql, [], (err, clinicas) => {
    if (err) {
      console.error("Falha ao carregar painel administrativo:", err.message);
      return res.status(500).json({ erro: "Não foi possível carregar os dados administrativos." });
    }
    const lista = clinicas || [];
    const totalUsuarios = lista.reduce((soma, item) => soma + Number(item.total_usuarios || 0), 0);
    const armazenamentoBytes = lista.reduce((soma, item) => soma + Number(item.armazenamento_bytes || 0), 0);
    return res.json({
      indicadores: {
        total_clinicas: lista.length,
        clinicas_ativas: lista.filter((c) => c.status === "ativa").length,
        total_usuarios: totalUsuarios,
        armazenamento_bytes: armazenamentoBytes,
        assinaturas_trial: lista.filter((c) => (c.assinatura_status || c.plano) === "trial").length,
        assinaturas_ativas: lista.filter((c) => c.assinatura_status === "ativa").length,
        assinaturas_pendentes: lista.filter((c) => ["pendente", "past_due", "inadimplente"].includes(String(c.assinatura_status || "").toLowerCase())).length,
      },
      clinicas: lista,
    });
  });
});

module.exports = router;
