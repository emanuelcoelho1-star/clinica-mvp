const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");

// A autorização é validada na API, não apenas na interface.
router.use(auth, requirePermission("documentos"));


// =========================
// LISTAR DOCUMENTOS POR PACIENTE
// =========================
router.get("/paciente/:paciente_id", auth, (req, res) => {
  const { paciente_id } = req.params;

  db.all(
    "SELECT * FROM documentos WHERE paciente_id = ? AND clinica_id = ? ORDER BY data DESC, id DESC",
    [paciente_id, req.user.clinica_id],
    (err, rows) => {
      if (err) return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      res.json(rows);
    }
  );
});


// =========================
// BUSCAR DOCUMENTO POR ID
// =========================
router.get("/:id", auth, (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM documentos WHERE id = ? AND clinica_id = ?", [id, req.user.clinica_id], (err, row) => {
    if (err) return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
    if (!row) return res.status(404).json({ erro: "Documento não encontrado." });
    res.json(row);
  });
});


// =========================
// CRIAR DOCUMENTO
// =========================
router.post("/", auth, (req, res) => {
  const { paciente_id, tipo, titulo, conteudo, data, profissional, observacoes } = req.body;

  if (!paciente_id || !data || !titulo) {
    return res.status(400).json({ erro: "Paciente, data e título são obrigatórios." });
  }

  const sql = `
    INSERT INTO documentos (paciente_id, tipo, titulo, conteudo, data, profissional, observacoes, clinica_id)
    SELECT p.id, ?, ?, ?, ?, ?, ?, ?
    FROM pacientes p
    WHERE p.id = ? AND p.clinica_id = ?
  `;

  db.run(sql, [
    tipo || "atestado",
    titulo,
    conteudo || "",
    data,
    profissional || "",
    observacoes || "",
    req.user.clinica_id,
    paciente_id,
    req.user.clinica_id,
  ], function (err) {
    if (err) return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
    if (this.changes === 0) return res.status(404).json({ erro: "Paciente não encontrado." });
    res.status(201).json({ id: this.lastID, mensagem: "Documento criado com sucesso." });
  });
});


// =========================
// ATUALIZAR DOCUMENTO
// =========================
router.put("/:id", auth, (req, res) => {
  const { id } = req.params;
  const { paciente_id, tipo, titulo, conteudo, data, profissional, observacoes } = req.body;

  if (!paciente_id || !data || !titulo) {
    return res.status(400).json({ erro: "Paciente, data e título são obrigatórios." });
  }

  const sql = `
    UPDATE documentos SET
      paciente_id = ?, tipo = ?, titulo = ?, conteudo = ?,
      data = ?, profissional = ?, observacoes = ?
    WHERE id = ? AND clinica_id = ?
      AND EXISTS (
        SELECT 1 FROM pacientes p
        WHERE p.id = ? AND p.clinica_id = ?
      )
  `;

  db.run(sql, [
    paciente_id,
    tipo || "atestado",
    titulo,
    conteudo || "",
    data,
    profissional || "",
    observacoes || "",
    id,
    req.user.clinica_id,
    paciente_id,
    req.user.clinica_id,
  ], function (err) {
    if (err) return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
    if (this.changes === 0) return res.status(404).json({ erro: "Documento não encontrado." });
    res.json({ mensagem: "Documento atualizado com sucesso." });
  });
});


// =========================
// DELETAR DOCUMENTO
// =========================
router.delete("/:id", auth, (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM documentos WHERE id = ? AND clinica_id = ?", [id, req.user.clinica_id], function (err) {
    if (err) return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
    if (this.changes === 0) return res.status(404).json({ erro: "Documento não encontrado." });
    res.json({ mensagem: "Documento excluído com sucesso." });
  });
});


module.exports = router;