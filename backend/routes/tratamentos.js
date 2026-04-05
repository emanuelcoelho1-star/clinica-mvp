const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");

/* ── Listar todos os tratamentos ─────────────── */
router.get("/", auth, (req, res) => {
  const sql = `
    SELECT tratamentos.*, pacientes.nome AS paciente_nome
    FROM tratamentos
    LEFT JOIN pacientes ON tratamentos.paciente_id = pacientes.id
    ORDER BY tratamentos.data_inicio DESC, tratamentos.id DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Erro ao buscar tratamentos." });
    res.json(rows || []);
  });
});

/* ── Listar tratamentos de um paciente ────────── */
router.get("/paciente/:pacienteId", auth, (req, res) => {
  const { pacienteId } = req.params;
  db.all(
    "SELECT * FROM tratamentos WHERE paciente_id = ? ORDER BY data_inicio DESC, id DESC",
    [pacienteId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Erro ao buscar tratamentos." });
      res.json(rows || []);
    }
  );
});

/* ── Buscar tratamento por ID ─────────────────── */
router.get("/:id", auth, (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM tratamentos WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: "Erro ao buscar tratamento." });
    if (!row) return res.status(404).json({ error: "Tratamento não encontrado." });
    res.json(row);
  });
});

/* ── Criar tratamento ─────────────────────────── */
router.post("/", auth, (req, res) => {
  const {
    paciente_id, data_inicio, data_fim, procedimento,
    dente, status, valor, profissional, descricao, observacoes
  } = req.body;

  if (!paciente_id || !data_inicio || !procedimento) {
    return res.status(400).json({ error: "paciente_id, data_inicio e procedimento são obrigatórios." });
  }

  db.run(
    `INSERT INTO tratamentos
       (paciente_id, data_inicio, data_fim, procedimento, dente, status, valor, profissional, descricao, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      paciente_id,
      data_inicio,
      data_fim || null,
      procedimento,
      dente || null,
      status || "em_andamento",
      valor || 0,
      profissional || null,
      descricao || null,
      observacoes || null
    ],
    function (err) {
      if (err) return res.status(500).json({ error: "Erro ao criar tratamento." });
      res.status(201).json({ id: this.lastID });
    }
  );
});

/* ── Atualizar tratamento ─────────────────────── */
router.put("/:id", auth, (req, res) => {
  const { id } = req.params;
  const {
    paciente_id, data_inicio, data_fim, procedimento,
    dente, status, valor, profissional, descricao, observacoes
  } = req.body;

  if (!paciente_id || !data_inicio || !procedimento) {
    return res.status(400).json({ error: "paciente_id, data_inicio e procedimento são obrigatórios." });
  }

  db.run(
    `UPDATE tratamentos SET
       paciente_id = ?, data_inicio = ?, data_fim = ?, procedimento = ?,
       dente = ?, status = ?, valor = ?, profissional = ?, descricao = ?, observacoes = ?
     WHERE id = ?`,
    [
      paciente_id,
      data_inicio,
      data_fim || null,
      procedimento,
      dente || null,
      status || "em_andamento",
      valor || 0,
      profissional || null,
      descricao || null,
      observacoes || null,
      id
    ],
    function (err) {
      if (err) return res.status(500).json({ error: "Erro ao atualizar tratamento." });
      if (this.changes === 0) return res.status(404).json({ error: "Tratamento não encontrado." });
      res.json({ message: "Tratamento atualizado com sucesso." });
    }
  );
});

/* ── Excluir tratamento ───────────────────────── */
router.delete("/:id", auth, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM tratamentos WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: "Erro ao excluir tratamento." });
    if (this.changes === 0) return res.status(404).json({ error: "Tratamento não encontrado." });
    res.json({ message: "Tratamento excluído com sucesso." });
  });
});

module.exports = router;