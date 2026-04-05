const express = require("express");
const router = express.Router();
const db = require("../database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

/* ── SECRET centralizado ──────────────────────── */
const SECRET = process.env.JWT_SECRET || "segredo_super_secreto_clinica_2025";

/* ═══════════════════════════════════════════════════════════
   RATE LIMITERS — Proteção contra brute force
   ═══════════════════════════════════════════════════════════ */

/* ── Login: máximo 5 tentativas por IP a cada 15 minutos ── */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { erro: "Muitas tentativas de login. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    return ip + ":" + (req.body.email || "").toLowerCase().trim();
  },
  validate: { ip: false, trustProxy: false },
});

/* ── Registro: máximo 3 contas por IP a cada hora ───────── */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { erro: "Muitas contas criadas. Tente novamente em 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false, trustProxy: false },
});

/* ── Geral (me, perfil, senha): 30 req por minuto ───────── */
const authGeneralLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { erro: "Muitas requisições. Aguarde um momento." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false, trustProxy: false },
});

/* ── Cadastro ─────────────────────────────────── */
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
    }

    if (senha.length < 6) {
      return res.status(400).json({ erro: "A senha deve ter no mínimo 6 caracteres." });
    }

    db.get("SELECT id FROM usuarios WHERE email = ?", [email.toLowerCase().trim()], async (err, existing) => {
      if (err) {
        return res.status(500).json({ erro: "Erro interno ao verificar e-mail." });
      }

      if (existing) {
        return res.status(409).json({ erro: "Este e-mail já está cadastrado." });
      }

      const hash = await bcrypt.hash(senha, 10);

      db.run(
        "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
        [nome || "Administrador", email.toLowerCase().trim(), hash],
        function (err) {
          if (err) {
            return res.status(500).json({ erro: "Erro ao criar usuário." });
          }
          res.status(201).json({
            mensagem: "Usuário criado com sucesso.",
            id: this.lastID,
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

/* ── Login ────────────────────────────────────── */
router.post("/login", loginLimiter, (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
    }

    db.get(
      "SELECT * FROM usuarios WHERE email = ?",
      [email.toLowerCase().trim()],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ erro: "Erro interno ao buscar usuário." });
        }

        if (!user) {
          return res.status(401).json({ erro: "E-mail ou senha inválidos." });
        }

        const valido = await bcrypt.compare(senha, user.senha);

        if (!valido) {
          return res.status(401).json({ erro: "E-mail ou senha inválidos." });
        }

        const token = jwt.sign(
          { id: user.id, nome: user.nome, email: user.email },
          SECRET,
          { expiresIn: "7d" }
        );

        res.json({
          token,
          usuario: {
            id: user.id,
            nome: user.nome || "Administrador",
            email: user.email,
          },
        });
      }
    );
  } catch (error) {
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

/* ── Verificar token (me) ─────────────────────── */
router.get("/me", authGeneralLimiter, (req, res) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ erro: "Token não fornecido." });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  try {
    const decoded = jwt.verify(token, SECRET);

    db.get(
      "SELECT id, nome, email FROM usuarios WHERE id = ?",
      [decoded.id],
      (err, user) => {
        if (err || !user) {
          return res.status(401).json({ erro: "Usuário não encontrado." });
        }
        res.json({ usuario: user });
      }
    );
  } catch (error) {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }
});

/* ── Atualizar perfil ─────────────────────────── */
router.put("/perfil", authGeneralLimiter, (req, res) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ erro: "Token não fornecido." });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  try {
    const decoded = jwt.verify(token, SECRET);
    const { nome } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ erro: "Nome é obrigatório." });
    }

    db.run("UPDATE usuarios SET nome = ? WHERE id = ?", [nome.trim(), decoded.id], function (err) {
      if (err) {
        return res.status(500).json({ erro: "Erro ao atualizar perfil." });
      }
      if (this.changes === 0) {
        return res.status(404).json({ erro: "Usuário não encontrado." });
      }
      res.json({ mensagem: "Perfil atualizado com sucesso." });
    });
  } catch (error) {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }
});

/* ── Alterar senha ────────────────────────────── */
router.put("/alterar-senha", authGeneralLimiter, (req, res) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ erro: "Token não fornecido." });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  try {
    const decoded = jwt.verify(token, SECRET);

    const { senha_atual, nova_senha } = req.body;

    if (!senha_atual || !nova_senha) {
      return res.status(400).json({ erro: "Senha atual e nova senha são obrigatórias." });
    }

    if (nova_senha.length < 6) {
      return res.status(400).json({ erro: "A nova senha deve ter no mínimo 6 caracteres." });
    }

    db.get("SELECT * FROM usuarios WHERE id = ?", [decoded.id], async (err, user) => {
      if (err || !user) {
        return res.status(404).json({ erro: "Usuário não encontrado." });
      }

      const senhaValida = await bcrypt.compare(senha_atual, user.senha);
      if (!senhaValida) {
        return res.status(401).json({ erro: "Senha atual incorreta." });
      }

      const novoHash = await bcrypt.hash(nova_senha, 10);

      db.run("UPDATE usuarios SET senha = ? WHERE id = ?", [novoHash, decoded.id], function (err) {
        if (err) {
          return res.status(500).json({ erro: "Erro ao alterar senha." });
        }
        res.json({ mensagem: "Senha alterada com sucesso." });
      });
    });
  } catch (error) {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }
});

module.exports = router;