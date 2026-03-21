const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");

// Listar pacientes
router.get("/", auth, (req, res) => {
  db.all("SELECT * FROM pacientes ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ erro: err.message });
    }

    res.json(rows);
  });
});

// Cadastrar paciente
router.post("/", (req, res) => {
  const { nome, telefone, observacoes } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: "Nome é obrigatório." });
  }

  const sql = `
    INSERT INTO pacientes (nome, telefone, observacoes)
    VALUES (?, ?, ?)
  `;

  db.run(sql, [nome, telefone || "", observacoes || ""], function (err) {
    if (err) {
      return res.status(500).json({ erro: err.message });
    }

    res.status(201).json({
      id: this.lastID,
      nome,
      telefone,
      observacoes,
    });
  });
});

// Atualizar paciente
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { nome, telefone } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: "Nome é obrigatório." });
  }

  db.run(
    "UPDATE pacientes SET nome = ?, telefone = ? WHERE id = ?",
    [nome, telefone || "", id],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      res.json({ message: "Paciente atualizado com sucesso" });
    }
  );
});

// Deletar paciente
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM pacientes WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ erro: err.message });
    }

    res.json({ message: "Paciente deletado com sucesso" });
  });
});

module.exports = router;