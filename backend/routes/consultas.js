const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");

// A autorização é validada na API, não apenas na interface.
router.use(auth, requirePermission("agenda"));

router.get("/", auth, (req, res) => {
  const sql = `
    SELECT consultas.*, pacientes.nome AS paciente_nome
    FROM consultas
    LEFT JOIN pacientes ON consultas.paciente_id = pacientes.id AND pacientes.clinica_id = consultas.clinica_id
    WHERE consultas.clinica_id = ?
    ORDER BY consultas.data ASC, consultas.horario ASC
  `;

  db.all(sql, [req.user.clinica_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
    }

    res.json(rows);
  });
});

router.post("/", auth, (req, res) => {
  const { paciente_id, data, horario, procedimento, status } = req.body;

  if (!paciente_id || !data || !horario) {
    return res
      .status(400)
      .json({ erro: "Paciente, data e horário são obrigatórios." });
  }

  const statusConsulta = status || "agendado";
  const inserirConsulta = () => {
    const sql = `
      INSERT INTO consultas (paciente_id, data, horario, procedimento, status, clinica_id)
      SELECT p.id, ?, ?, ?, ?, ? FROM pacientes p WHERE p.id = ? AND p.clinica_id = ?
    `;

    db.run(sql, [data, horario, procedimento || "", statusConsulta, req.user.clinica_id, paciente_id, req.user.clinica_id], function (err) {
      if (err) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      }

      if (this.changes === 0) {
        return res.status(404).json({ erro: "Paciente não encontrado nesta clínica." });
      }

      res.status(201).json({
        mensagem: "Consulta cadastrada com sucesso.",
        id: this.lastID,
      });
    });
  };

  if (statusConsulta === "cancelado") return inserirConsulta();
  db.get(
    "SELECT paciente_id, horario FROM consultas WHERE clinica_id = ? AND data = ? AND horario = ? AND status != 'cancelado' LIMIT 1",
    [req.user.clinica_id, data, horario],
    (err, conflito) => {
      if (err) return res.status(500).json({ erro: "Não foi possível validar a disponibilidade do horário." });
      if (conflito) return res.status(409).json({ erro: "Este horário já está ocupado por outra consulta. Escolha outro horário." });
      inserirConsulta();
    }
  );
});

router.put("/:id", auth, (req, res) => {
  const { id } = req.params;
  const { paciente_id, data, horario, procedimento, status } = req.body;

  if (!paciente_id || !data || !horario) {
    return res
      .status(400)
      .json({ erro: "Paciente, data e horário são obrigatórios." });
  }

  const statusConsulta = status || "agendado";
  const atualizarConsulta = () => {
    const sql = `
      UPDATE consultas
      SET paciente_id = ?, data = ?, horario = ?, procedimento = ?, status = ?
      WHERE id = ? AND clinica_id = ?
        AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = ? AND p.clinica_id = ?)
    `;

    db.run(sql, [paciente_id, data, horario, procedimento || "", statusConsulta, id, req.user.clinica_id, paciente_id, req.user.clinica_id], function (err) {
      if (err) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      }

      if (this.changes === 0) {
        return res.status(404).json({ erro: "Consulta não encontrada." });
      }

      res.json({ mensagem: "Consulta atualizada com sucesso." });
    });
  };

  if (statusConsulta === "cancelado") return atualizarConsulta();
  db.get(
    "SELECT id FROM consultas WHERE clinica_id = ? AND data = ? AND horario = ? AND status != 'cancelado' AND id != ? LIMIT 1",
    [req.user.clinica_id, data, horario, id],
    (err, conflito) => {
      if (err) return res.status(500).json({ erro: "Não foi possível validar a disponibilidade do horário." });
      if (conflito) return res.status(409).json({ erro: "Este horário já está ocupado por outra consulta. Escolha outro horário." });
      atualizarConsulta();
    }
  );
});

router.delete("/:id", auth, (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM consultas WHERE id = ? AND clinica_id = ?", [id, req.user.clinica_id], function (err) {
    if (err) {
      return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
    }

    if (this.changes === 0) {
      return res.status(404).json({ erro: "Consulta não encontrada." });
    }

    res.json({ mensagem: "Consulta excluída com sucesso." });
  });
});

module.exports = router;