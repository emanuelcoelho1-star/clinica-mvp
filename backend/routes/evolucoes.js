const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");

/* ── Listar evoluções de um paciente ─────────── */
router.get("/paciente/:pacienteId", auth, (req, res) => {
  const { pacienteId } = req.params;
  db.all(
    "SELECT * FROM evolucoes WHERE paciente_id = ? ORDER BY data DESC, id DESC",
    [pacienteId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Erro ao buscar evoluções." });
      res.json(rows || []);
    }
  );
});

/* ── Buscar evolução por ID ──────────────────── */
router.get("/:id", auth, (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM evolucoes WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: "Erro ao buscar evolução." });
    if (!row) return res.status(404).json({ error: "Evolução não encontrada." });
    res.json(row);
  });
});

/* ── Criar evolução ──────────────────────────── */
router.post("/", auth, (req, res) => {
  const { paciente_id, data, procedimento, dente, descricao, observacoes, profissional } = req.body;
  if (!paciente_id || !data) {
    return res.status(400).json({ error: "paciente_id e data são obrigatórios." });
  }
  db.run(
    `INSERT INTO evolucoes (paciente_id, data, procedimento, dente, descricao, observacoes, profissional)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [paciente_id, data, procedimento || null, dente || null, descricao || null, observacoes || null, profissional || null],
    function (err) {
      if (err) return res.status(500).json({ error: "Erro ao criar evolução." });
      res.status(201).json({ id: this.lastID });
    }
  );
});

/* ── Atualizar evolução ──────────────────────── */
router.put("/:id", auth, (req, res) => {
  const { id } = req.params;
  const { data, procedimento, dente, descricao, observacoes, profissional } = req.body;
  if (!data) {
    return res.status(400).json({ error: "data é obrigatória." });
  }
  db.run(
    `UPDATE evolucoes SET data = ?, procedimento = ?, dente = ?, descricao = ?, observacoes = ?, profissional = ? WHERE id = ?`,
    [data, procedimento || null, dente || null, descricao || null, observacoes || null, profissional || null, id],
    function (err) {
      if (err) return res.status(500).json({ error: "Erro ao atualizar evolução." });
      if (this.changes === 0) return res.status(404).json({ error: "Evolução não encontrada." });
      res.json({ message: "Evolução atualizada com sucesso." });
    }
  );
});

/* ── Excluir evolução ────────────────────────── */
router.delete("/:id", auth, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM evolucoes WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: "Erro ao excluir evolução." });
    if (this.changes === 0) return res.status(404).json({ error: "Evolução não encontrada." });
    res.json({ message: "Evolução excluída com sucesso." });
  });
});

module.exports = router;