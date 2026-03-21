const express = require("express");
const router = express.Router();
const db = require("../database");

// Listar consultas com nome do paciente
router.get("/", (req, res) => {
  const sql = `
    SELECT 
      consultas.id,
      consultas.data,
      consultas.horario,
      consultas.procedimento,
      consultas.status,
      consultas.paciente_id,
      pacientes.nome AS paciente_nome
    FROM consultas
    INNER JOIN pacientes ON consultas.paciente_id = pacientes.id
    ORDER BY consultas.data ASC, consultas.horario ASC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ erro: err.message });
    }

    res.json(rows);
  });
});

// Cadastrar consulta
router.post("/", (req, res) => {
  const { paciente_id, data, horario, procedimento, status } = req.body;

  if (!paciente_id || !data || !horario) {
    return res.status(400).json({
      erro: "paciente_id, data e horario são obrigatórios."
    });
  }

  const sql = `
    INSERT INTO consultas (paciente_id, data, horario, procedimento, status)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      paciente_id,
      data,
      horario,
      procedimento || "",
      status || "agendado"
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        paciente_id,
        data,
        horario,
        procedimento,
        status: status || "agendado"
      });
    }
  );
});

module.exports = router;