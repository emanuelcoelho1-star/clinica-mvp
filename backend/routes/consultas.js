const express = require("express");
const router = express.Router();
const db = require("../database");

router.get("/", (req, res) => {
  const sql = `
    SELECT consultas.*, pacientes.nome AS paciente_nome
    FROM consultas
    LEFT JOIN pacientes ON consultas.paciente_id = pacientes.id
    ORDER BY consultas.data ASC, consultas.horario ASC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ erro: err.message });
    }

    res.json(rows);
  });
});

router.post("/", (req, res) => {
  const { paciente_id, data, horario, procedimento, status } = req.body;

  if (!paciente_id || !data || !horario) {
    return res
      .status(400)
      .json({ erro: "Paciente, data e horário são obrigatórios." });
  }

  const sql = `
    INSERT INTO consultas (paciente_id, data, horario, procedimento, status)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [paciente_id, data, horario, procedimento || "", status || "agendado"],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      res.status(201).json({
        mensagem: "Consulta cadastrada com sucesso.",
        id: this.lastID,
      });
    }
  );
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { paciente_id, data, horario, procedimento, status } = req.body;

  if (!paciente_id || !data || !horario) {
    return res
      .status(400)
      .json({ erro: "Paciente, data e horário são obrigatórios." });
  }

  const sql = `
    UPDATE consultas
    SET paciente_id = ?, data = ?, horario = ?, procedimento = ?, status = ?
    WHERE id = ?
  `;

  db.run(
    sql,
    [paciente_id, data, horario, procedimento || "", status || "agendado", id],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ erro: "Consulta não encontrada." });
      }

      res.json({ mensagem: "Consulta atualizada com sucesso." });
    }
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM consultas WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ erro: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ erro: "Consulta não encontrada." });
    }

    res.json({ mensagem: "Consulta excluída com sucesso." });
  });
});

module.exports = router;