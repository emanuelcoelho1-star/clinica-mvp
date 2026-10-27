const express = require("express");
const router = express.Router();
const db = require("../database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");

/* ── SECRET centralizado ──────────────────────── */
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error("JWT_SECRET não configurado. Defina a variável de ambiente antes de iniciar a API.");
}

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

/* ── Cadastro inicial local ───────────────────── */
router.post("/register", registerLimiter, async (req, res) => {
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

    const hash = await bcrypt.hash(senha, 12);
    const slugBase = nomeNormalizado
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      .slice(0, 45) || "clinica";
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    // O primeiro cadastro cria a clínica e seu administrador numa transação.
    // O cadastro público continua bloqueado depois da criação da primeira conta.
    db.serialize(() => {
      db.run("BEGIN IMMEDIATE TRANSACTION", (beginErr) => {
        if (beginErr) return res.status(500).json({ erro: "Não foi possível iniciar o cadastro." });

        const rollback = (status, message) => {
          db.run("ROLLBACK", () => res.status(status).json({ erro: message }));
        };

        db.get("SELECT COUNT(*) AS total FROM usuarios", [], (countErr, count) => {
          if (countErr) return rollback(500, "Erro ao verificar o cadastro inicial.");
          // Por padrão, somente o primeiro cadastro é permitido.
          // Para testar múltiplas clínicas localmente, habilite ALLOW_PUBLIC_SIGNUP=true no .env.
          const cadastroMultiploHabilitado = process.env.ALLOW_PUBLIC_SIGNUP === "true";
          if (count.total > 0 && !cadastroMultiploHabilitado) {
            return rollback(403, "O cadastro inicial já foi realizado. Para cadastrar outra clínica em ambiente local, configure ALLOW_PUBLIC_SIGNUP=true no arquivo backend/.env e reinicie a API.");
          }

          db.get("SELECT id FROM roles WHERE protegido = 1 AND ativo = 1 ORDER BY id LIMIT 1", [], (roleErr, role) => {
            if (roleErr || !role) return rollback(503, "Perfil Administrador indisponível. Reinicie a API e tente novamente.");

            db.run(
              "INSERT INTO clinicas (nome, slug, plano, status, trial_ate) VALUES (?, ?, 'trial', 'ativa', date('now', '+14 days'))",
              [`${nomeNormalizado} - Clínica`, slug],
              function (clinicErr) {
                if (clinicErr) {
                  if (clinicErr.message.includes("UNIQUE")) return rollback(409, "Não foi possível registrar esta clínica. Tente novamente.");
                  return rollback(500, "Erro ao criar a clínica.");
                }
                const clinicaId = this.lastID;

                db.run(
                  "INSERT INTO usuarios (nome, email, senha, role_id, clinica_id) VALUES (?, ?, ?, ?, ?)",
                  [nomeNormalizado, emailNormalizado, hash, role.id, clinicaId],
                  function (userErr) {
                    if (userErr) {
                      if (userErr.message.includes("UNIQUE")) return rollback(409, "E-mail já cadastrado.");
                      return rollback(500, "Erro ao criar o usuário administrador.");
                    }
                    const usuarioId = this.lastID;

                    db.run(
                      "INSERT INTO assinaturas (clinica_id, plano, status, periodo_inicio, periodo_fim) VALUES (?, 'trial', 'trial', date('now'), date('now', '+14 days'))",
                      [clinicaId],
                      (subscriptionErr) => {
                        if (subscriptionErr) return rollback(500, "Erro ao preparar o período de teste.");

                        db.run("COMMIT", (commitErr) => {
                          if (commitErr) return rollback(500, "Não foi possível concluir o cadastro.");
                          return res.status(201).json({
                            mensagem: "Conta criada. Agora entre com seu e-mail e senha.",
                            id: usuarioId,
                            clinica_id: clinicaId,
                          });
                        });
                      }
                    );
                  }
                );
              }
            );
          });
        });
      });
    });
  } catch (error) {
    return res.status(500).json({ erro: "Erro interno no servidor." });
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
      `SELECT u.*, r.ativo AS role_ativo, r.clinica_id AS role_clinica_id,\n              r.protegido AS role_protegido, c.status AS clinica_status\n       FROM usuarios u\n       LEFT JOIN roles r ON r.id = u.role_id\n       LEFT JOIN clinicas c ON c.id = u.clinica_id\n       WHERE u.email = ?`,
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

        if (!user.role_id || Number(user.role_ativo) !== 1) {
          return res.status(403).json({ erro: "Seu perfil está indisponível. Contate o administrador." });
        }

        if (!user.clinica_id || user.clinica_status !== "ativa") {
          return res.status(403).json({ erro: "A clínica não está ativa ou não está vinculada ao usuário." });
        }

        // Perfis personalizados devem pertencer à mesma clínica do usuário.
        // O perfil protegido de Administrador pode ser global (clinica_id NULL).
        if (Number(user.role_protegido) !== 1 && Number(user.role_clinica_id) !== Number(user.clinica_id)) {
          return res.status(403).json({ erro: "O perfil de acesso não pertence a esta clínica." });
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
router.get("/me", authGeneralLimiter, auth, (req, res) => {
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
router.put("/perfil", authGeneralLimiter, auth, (req, res) => {
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
router.put("/alterar-senha", authGeneralLimiter, auth, (req, res) => {
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