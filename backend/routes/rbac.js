const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");

/* ══════════════════════════════════════════════════════════════
   RBAC — Rotas de Permissões & Acessos
   ══════════════════════════════════════════════════════════════ */

/* ── GET /rbac/roles — Listar todos os perfis ────────────── */
router.get("/roles", auth, (req, res) => {
  const sql = `
    SELECT r.*,
           (SELECT COUNT(*) FROM usuarios u WHERE u.role_id = r.id) AS total_usuarios
    FROM roles r
    ORDER BY r.protegido DESC, r.nome ASC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ erro: "Erro ao buscar perfis." });
    res.json(rows);
  });
});

/* ── POST /rbac/roles — Criar perfil ─────────────────────── */
router.post("/roles", auth, (req, res) => {
  const { nome, descricao, cor } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: "Nome do perfil é obrigatório." });
  }

  db.run(
    "INSERT INTO roles (nome, descricao, cor) VALUES (?, ?, ?)",
    [nome.trim(), descricao || "", cor || "#64748b"],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(409).json({ erro: "Já existe um perfil com esse nome." });
        }
        return res.status(500).json({ erro: "Erro ao criar perfil." });
      }
      res.status(201).json({ id: this.lastID, mensagem: "Perfil criado com sucesso." });
    }
  );
});

/* ── PUT /rbac/roles/:id — Editar perfil ─────────────────── */
router.put("/roles/:id", auth, (req, res) => {
  const { id } = req.params;
  const { nome, descricao, cor } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: "Nome do perfil é obrigatório." });
  }

  // Não permitir editar perfil protegido
  db.get("SELECT protegido FROM roles WHERE id = ?", [id], (err, role) => {
    if (err) return res.status(500).json({ erro: "Erro interno." });
    if (!role) return res.status(404).json({ erro: "Perfil não encontrado." });
    if (role.protegido) return res.status(403).json({ erro: "Este perfil é protegido e não pode ser editado." });

    db.run(
      "UPDATE roles SET nome = ?, descricao = ?, cor = ? WHERE id = ?",
      [nome.trim(), descricao || "", cor || "#64748b", id],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE")) {
            return res.status(409).json({ erro: "Já existe um perfil com esse nome." });
          }
          return res.status(500).json({ erro: "Erro ao atualizar perfil." });
        }
        res.json({ mensagem: "Perfil atualizado com sucesso." });
      }
    );
  });
});

/* ── DELETE /rbac/roles/:id — Excluir perfil ─────────────── */
router.delete("/roles/:id", auth, (req, res) => {
  const { id } = req.params;

  db.get("SELECT protegido FROM roles WHERE id = ?", [id], (err, role) => {
    if (err) return res.status(500).json({ erro: "Erro interno." });
    if (!role) return res.status(404).json({ erro: "Perfil não encontrado." });
    if (role.protegido) return res.status(403).json({ erro: "Este perfil é protegido e não pode ser excluído." });

    // Mover usuários deste perfil para o perfil padrão (id=1 Administrador)
    db.run("UPDATE usuarios SET role_id = 1 WHERE role_id = ?", [id], (err) => {
      if (err) return res.status(500).json({ erro: "Erro ao reatribuir usuários." });

      db.run("DELETE FROM roles WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ erro: "Erro ao excluir perfil." });
        res.json({ mensagem: "Perfil excluído com sucesso." });
      });
    });
  });
});

/* ── GET /rbac/roles/:id/permissoes — Permissões de um perfil */
router.get("/roles/:id/permissoes", auth, (req, res) => {
  const { id } = req.params;

  db.get("SELECT protegido FROM roles WHERE id = ?", [id], (err, role) => {
    if (err) return res.status(500).json({ erro: "Erro interno." });
    if (!role) return res.status(404).json({ erro: "Perfil não encontrado." });

    // Administrador protegido → retorna TODAS as permissões
    if (role.protegido) {
      db.all("SELECT * FROM permissoes ORDER BY modulo, acao", [], (err, rows) => {
        if (err) return res.status(500).json({ erro: "Erro ao buscar permissões." });
        res.json(rows);
      });
      return;
    }

    const sql = `
      SELECT p.*
      FROM permissoes p
      INNER JOIN role_permissoes rp ON rp.permissao_id = p.id
      WHERE rp.role_id = ?
      ORDER BY p.modulo, p.acao
    `;
    db.all(sql, [id], (err, rows) => {
      if (err) return res.status(500).json({ erro: "Erro ao buscar permissões." });
      res.json(rows);
    });
  });
});

/* ── PUT /rbac/roles/:id/permissoes — Salvar permissões ──── */
router.put("/roles/:id/permissoes", auth, (req, res) => {
  const { id } = req.params;
  const { permissao_ids } = req.body; // Array de IDs

  db.get("SELECT protegido FROM roles WHERE id = ?", [id], (err, role) => {
    if (err) return res.status(500).json({ erro: "Erro interno." });
    if (!role) return res.status(404).json({ erro: "Perfil não encontrado." });
    if (role.protegido) return res.status(403).json({ erro: "Permissões do Administrador não podem ser alteradas." });

    // Limpar permissões anteriores
    db.run("DELETE FROM role_permissoes WHERE role_id = ?", [id], (err) => {
      if (err) return res.status(500).json({ erro: "Erro ao limpar permissões." });

      if (!permissao_ids || permissao_ids.length === 0) {
        return res.json({ mensagem: "Permissões atualizadas (todas removidas)." });
      }

      const stmt = db.prepare("INSERT INTO role_permissoes (role_id, permissao_id) VALUES (?, ?)");
      let erroInserir = false;

      permissao_ids.forEach((permId) => {
        stmt.run([id, permId], (err) => {
          if (err) erroInserir = true;
        });
      });

      stmt.finalize((err) => {
        if (err || erroInserir) {
          return res.status(500).json({ erro: "Erro ao salvar algumas permissões." });
        }
        res.json({ mensagem: "Permissões atualizadas com sucesso." });
      });
    });
  });
});

/* ══════════════════════════════════════════════════════════════
   PERMISSÕES
   ══════════════════════════════════════════════════════════════ */

/* ── GET /rbac/permissoes — Listar todas as permissões ───── */
router.get("/permissoes", auth, (req, res) => {
  db.all("SELECT * FROM permissoes ORDER BY modulo, acao", [], (err, rows) => {
    if (err) return res.status(500).json({ erro: "Erro ao buscar permissões." });
    res.json(rows);
  });
});

/* ══════════════════════════════════════════════════════════════
   USUÁRIOS (gestão RBAC)
   ══════════════════════════════════════════════════════════════ */

/* ── GET /rbac/usuarios — Listar usuários com seus perfis ── */
router.get("/usuarios", auth, (req, res) => {
  const sql = `
    SELECT u.id, u.nome, u.email, u.role_id, u.created_at,
           r.nome AS role_nome, r.cor AS role_cor
    FROM usuarios u
    LEFT JOIN roles r ON r.id = u.role_id
    ORDER BY u.nome ASC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ erro: "Erro ao buscar usuários." });
    res.json(rows);
  });
});

/* ── PUT /rbac/usuarios/:id/role — Alterar perfil do user ── */
router.put("/usuarios/:id/role", auth, (req, res) => {
  const { id } = req.params;
  const { role_id } = req.body;

  if (!role_id) {
    return res.status(400).json({ erro: "role_id é obrigatório." });
  }

  db.get("SELECT id FROM roles WHERE id = ?", [role_id], (err, role) => {
    if (err) return res.status(500).json({ erro: "Erro interno." });
    if (!role) return res.status(404).json({ erro: "Perfil não encontrado." });

    db.run("UPDATE usuarios SET role_id = ? WHERE id = ?", [role_id, id], function (err) {
      if (err) return res.status(500).json({ erro: "Erro ao atualizar perfil do usuário." });
      if (this.changes === 0) return res.status(404).json({ erro: "Usuário não encontrado." });
      res.json({ mensagem: "Perfil do usuário atualizado." });
    });
  });
});

/* ── DELETE /rbac/usuarios/:id — Excluir usuário ─────────── */
router.delete("/usuarios/:id", auth, (req, res) => {
  const { id } = req.params;

  // Não permitir excluir a si mesmo
  if (parseInt(id) === req.user.id) {
    return res.status(403).json({ erro: "Você não pode excluir sua própria conta." });
  }

  db.run("DELETE FROM usuarios WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ erro: "Erro ao excluir usuário." });
    if (this.changes === 0) return res.status(404).json({ erro: "Usuário não encontrado." });
    res.json({ mensagem: "Usuário excluído com sucesso." });
  });
});

module.exports = router;