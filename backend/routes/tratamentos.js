const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");

// A autorização é validada na API, não apenas na interface.
router.use(auth, requirePermission("tratamentos"));

/* ── Listar todos os tratamentos ─────────────── */
router.get("/", auth, (req, res) => {
  const sql = `
    SELECT tratamentos.*, pacientes.nome AS paciente_nome
    FROM tratamentos
    LEFT JOIN pacientes ON tratamentos.paciente_id = pacientes.id AND pacientes.clinica_id = tratamentos.clinica_id
    WHERE tratamentos.clinica_id = ?
    ORDER BY tratamentos.data_inicio DESC, tratamentos.id DESC
  `;
  db.all(sql, [req.user.clinica_id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Erro ao buscar tratamentos." });
    res.json(rows || []);
  });
});

/* ── Listar tratamentos de um paciente ────────── */
router.get("/paciente/:pacienteId", auth, (req, res) => {
  const { pacienteId } = req.params;
  db.all(
    "SELECT * FROM tratamentos WHERE paciente_id = ? AND clinica_id = ? ORDER BY data_inicio DESC, id DESC",
    [pacienteId, req.user.clinica_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Erro ao buscar tratamentos." });
      res.json(rows || []);
    }
  );
});

/* ── Buscar tratamento por ID ─────────────────── */
router.get("/:id", auth, (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM tratamentos WHERE id = ? AND clinica_id = ?", [id, req.user.clinica_id], (err, row) => {
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
       (paciente_id, data_inicio, data_fim, procedimento, dente, status, valor, profissional, descricao, observacoes, clinica_id)
     SELECT p.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM pacientes p WHERE p.id = ? AND p.clinica_id = ?`,
    [
      data_inicio,
      data_fim || null,
      procedimento,
      dente || null,
      status || "em_andamento",
      valor || 0,
      profissional || null,
      descricao || null,
      observacoes || null,
      req.user.clinica_id,
      paciente_id,
      req.user.clinica_id
    ],
    function (err) {
      if (err) return res.status(500).json({ error: "Erro ao criar tratamento." });
      if (this.changes === 0) {
        return res.status(404).json({ error: "Paciente não encontrado nesta clínica." });
      }
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
     WHERE id = ? AND clinica_id = ?
       AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = ? AND p.clinica_id = ?)`,
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
      id,
      req.user.clinica_id,
      paciente_id,
      req.user.clinica_id
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
  db.run("DELETE FROM tratamentos WHERE id = ? AND clinica_id = ?", [id, req.user.clinica_id], function (err) {
    if (err) return res.status(500).json({ error: "Erro ao excluir tratamento." });
    if (this.changes === 0) return res.status(404).json({ error: "Tratamento não encontrado." });
    res.json({ message: "Tratamento excluído com sucesso." });
  });
});

module.exports = router;