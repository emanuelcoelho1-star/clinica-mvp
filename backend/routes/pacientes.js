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
router.post("/", auth, (req, res) => {
  const {
    nome,
    telefone,
    email,
    comoConheceu,
    profissao,
    genero,
    dataNascimento,
    cpf,
    observacoes,
  } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: "Nome é obrigatório." });
  }

  const sql = `
    INSERT INTO pacientes
    (nome, telefone, email, como_conheceu, profissao, genero, data_nascimento, cpf, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      nome,
      telefone || "",
      email || "",
      comoConheceu || "",
      profissao || "",
      genero || "",
      dataNascimento || "",
      cpf || "",
      observacoes || "",
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        nome,
        telefone,
        email,
        comoConheceu,
        profissao,
        genero,
        dataNascimento,
        cpf,
        observacoes,
      });
    }
  );
});

// Atualizar paciente
router.put("/:id", auth, (req, res) => {
  const { id } = req.params;

  const {
    nome,
    telefone,
    email,
    comoConheceu,
    profissao,
    genero,
    dataNascimento,
    cpf,
    observacoes,
  } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: "Nome é obrigatório." });
  }

  const sql = `
    UPDATE pacientes
    SET nome = ?, telefone = ?, email = ?, como_conheceu = ?, profissao = ?, genero = ?, data_nascimento = ?, cpf = ?, observacoes = ?
    WHERE id = ?
  `;

  db.run(
    sql,
    [
      nome,
      telefone || "",
      email || "",
      comoConheceu || "",
      profissao || "",
      genero || "",
      dataNascimento || "",
      cpf || "",
      observacoes || "",
      id,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      res.json({ message: "Paciente atualizado com sucesso" });
    }
  );
});

// Deletar paciente
router.delete("/:id", auth, (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM pacientes WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ erro: err.message });
    }

    res.json({ message: "Paciente deletado com sucesso" });
  });
});

module.exports = router;