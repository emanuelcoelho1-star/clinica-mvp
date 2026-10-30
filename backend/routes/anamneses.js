const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");

// A autorização é validada na API, não apenas na interface.
router.use(auth, requirePermission("anamneses"));


// =========================
// LISTAR ANAMNESES POR PACIENTE
// =========================
router.get("/paciente/:paciente_id", auth, (req, res) => {
  const { paciente_id } = req.params;

  db.all(
    "SELECT * FROM anamneses WHERE paciente_id = ? AND clinica_id = ? ORDER BY data DESC, id DESC",
    [paciente_id, req.user.clinica_id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      }
      res.json(rows);
    }
  );
});


// =========================
// BUSCAR ANAMNESE POR ID
// =========================
router.get("/:id", auth, (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM anamneses WHERE id = ? AND clinica_id = ?", [id, req.user.clinica_id], (err, row) => {
    if (err) {
      return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
    }
    if (!row) {
      return res.status(404).json({ erro: "Anamnese não encontrada." });
    }
    res.json(row);
  });
});


// =========================
// CRIAR ANAMNESE
// =========================
router.post("/", auth, (req, res) => {
  const {
    paciente_id, data, queixa_principal, historia_medica,
    medicamentos, alergias, cirurgias_anteriores, doencas_cronicas,
    habitos, historico_familiar, observacoes,
    pressao_arterial, frequencia_cardiaca, glicemia,
  } = req.body;

  if (!paciente_id || !data) {
    return res.status(400).json({ erro: "Paciente e data são obrigatórios." });
  }

  const sql = `
    INSERT INTO anamneses (
      paciente_id, data, queixa_principal, historia_medica,
      medicamentos, alergias, cirurgias_anteriores, doencas_cronicas,
      habitos, historico_familiar, observacoes,
      pressao_arterial, frequencia_cardiaca, glicemia, clinica_id
    )
    SELECT p.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    FROM pacientes p
    WHERE p.id = ? AND p.clinica_id = ?
  `;

  db.run(sql, [
    data, queixa_principal || "", historia_medica || "",
    medicamentos || "", alergias || "", cirurgias_anteriores || "", doencas_cronicas || "",
    habitos || "", historico_familiar || "", observacoes || "",
    pressao_arterial || "", frequencia_cardiaca || "", glicemia || "",
    req.user.clinica_id, paciente_id, req.user.clinica_id,
  ], function (err) {
    if (err) {
      return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
    }
    if (this.changes === 0) {
      return res.status(404).json({ erro: "Paciente não encontrado nesta clínica." });
    }
    res.status(201).json({ id: this.lastID, mensagem: "Anamnese criada com sucesso." });
  });
});


// =========================
// ATUALIZAR ANAMNESE
// =========================
router.put("/:id", auth, (req, res) => {
  const { id } = req.params;
  const {
    paciente_id, data, queixa_principal, historia_medica,
    medicamentos, alergias, cirurgias_anteriores, doencas_cronicas,
    habitos, historico_familiar, observacoes,
    pressao_arterial, frequencia_cardiaca, glicemia,
  } = req.body;

  if (!paciente_id || !data) {
    return res.status(400).json({ erro: "Paciente e data são obrigatórios." });
  }

  const sql = `
    UPDATE anamneses SET
      paciente_id = ?, data = ?, queixa_principal = ?, historia_medica = ?,
      medicamentos = ?, alergias = ?, cirurgias_anteriores = ?, doencas_cronicas = ?,
      habitos = ?, historico_familiar = ?, observacoes = ?,
      pressao_arterial = ?, frequencia_cardiaca = ?, glicemia = ?
    WHERE id = ? AND clinica_id = ?
      AND EXISTS (
        SELECT 1 FROM pacientes p
        WHERE p.id = ? AND p.clinica_id = ?
      )
  `;

  db.run(sql, [
    paciente_id, data, queixa_principal || "", historia_medica || "",
    medicamentos || "", alergias || "", cirurgias_anteriores || "", doencas_cronicas || "",
    habitos || "", historico_familiar || "", observacoes || "",
    pressao_arterial || "", frequencia_cardiaca || "", glicemia || "",
    id, req.user.clinica_id, paciente_id, req.user.clinica_id,
  ], function (err) {
    if (err) {
      return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
    }
    if (this.changes === 0) {
      return res.status(404).json({ erro: "Anamnese não encontrada." });
    }
    res.json({ mensagem: "Anamnese atualizada com sucesso." });
  });
});


// =========================
// DELETAR ANAMNESE
// =========================
router.delete("/:id", auth, (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM anamneses WHERE id = ? AND clinica_id = ?", [id, req.user.clinica_id], function (err) {
    if (err) {
      return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
    }
    if (this.changes === 0) {
      return res.status(404).json({ erro: "Anamnese não encontrada." });
    }
    res.json({ mensagem: "Anamnese excluída com sucesso." });
  });
});


module.exports = router;