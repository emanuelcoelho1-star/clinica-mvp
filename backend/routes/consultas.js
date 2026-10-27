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
      INSERT INTO consultas (paciente_id, data, horario, procedimento, status)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.run(sql, [paciente_id, data, horario, procedimento || "", statusConsulta], function (err) {
      if (err) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      }

      res.status(201).json({
        mensagem: "Consulta cadastrada com sucesso.",
        id: this.lastID,
      });
    });
  };

  if (statusConsulta === "cancelado") return inserirConsulta();
  db.get(
    "SELECT paciente_id, horario FROM consultas WHERE data = ? AND horario = ? AND status != 'cancelado' LIMIT 1",
    [data, horario],
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
      WHERE id = ?
    `;

    db.run(sql, [paciente_id, data, horario, procedimento || "", statusConsulta, id], function (err) {
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
    "SELECT id FROM consultas WHERE data = ? AND horario = ? AND status != 'cancelado' AND id != ? LIMIT 1",
    [data, horario, id],
    (err, conflito) => {
      if (err) return res.status(500).json({ erro: "Não foi possível validar a disponibilidade do horário." });
      if (conflito) return res.status(409).json({ erro: "Este horário já está ocupado por outra consulta. Escolha outro horário." });
      atualizarConsulta();
    }
  );
});

router.delete("/:id", auth, (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM consultas WHERE id = ?", [id], function (err) {
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