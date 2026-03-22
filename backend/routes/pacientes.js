const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");


// =========================
// LISTAR PACIENTES
// =========================
router.get("/", auth, (req, res) => {
  db.all("SELECT * FROM pacientes ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ erro: err.message });
    }

    res.json(rows);
  });
});


// =========================
// BUSCAR PACIENTE POR ID
// =========================
router.get("/:id", auth, (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM pacientes WHERE id = ?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({ erro: err.message });
    }

    if (!row) {
      return res.status(404).json({ erro: "Paciente não encontrado" });
    }

    res.json(row);
  });
});


// =========================
// BUSCAR ODONTOGRAMA
// =========================
router.get("/:id/odontograma", auth, (req, res) => {
  const { id } = req.params;

  db.get(
    "SELECT mapa FROM odontogramas WHERE paciente_id = ?",
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      if (!row || !row.mapa) {
        return res.json({});
      }

      try {
        return res.json(JSON.parse(row.mapa));
      } catch {
        return res.json({});
      }
    }
  );
});


// =========================
// SALVAR ODONTOGRAMA
// =========================
router.put("/:id/odontograma", auth, (req, res) => {
  const { id } = req.params;
  const { mapa } = req.body;

  const mapaString = JSON.stringify(mapa || {});

  db.get(
    "SELECT id FROM odontogramas WHERE paciente_id = ?",
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      if (row) {
        db.run(
          "UPDATE odontogramas SET mapa = ? WHERE paciente_id = ?",
          [mapaString, id],
          function (updateErr) {
            if (updateErr) {
              return res.status(500).json({ erro: updateErr.message });
            }

            res.json({ message: "Odontograma atualizado com sucesso" });
          }
        );
      } else {
        db.run(
          "INSERT INTO odontogramas (paciente_id, mapa) VALUES (?, ?)",
          [id, mapaString],
          function (insertErr) {
            if (insertErr) {
              return res.status(500).json({ erro: insertErr.message });
            }

            res.json({ message: "Odontograma salvo com sucesso" });
          }
        );
      }
    }
  );
});


// =========================
// CADASTRAR PACIENTE
// =========================
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
    cep,
    rua,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    responsavelNome,
    responsavelCpf,
    responsavelDataNascimento,
    responsavelTelefone,
  } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: "Nome é obrigatório." });
  }

  if (!telefone) {
    return res.status(400).json({ erro: "Telefone é obrigatório." });
  }

  if (!cpf) {
    return res.status(400).json({ erro: "CPF é obrigatório." });
  }

  const sql = `
    INSERT INTO pacientes (
      nome,
      telefone,
      email,
      como_conheceu,
      profissao,
      genero,
      data_nascimento,
      cpf,
      observacoes,
      cep,
      rua,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      responsavel_nome,
      responsavel_cpf,
      responsavel_data_nascimento,
      responsavel_telefone
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      cep || "",
      rua || "",
      numero || "",
      complemento || "",
      bairro || "",
      cidade || "",
      estado || "",
      responsavelNome || "",
      responsavelCpf || "",
      responsavelDataNascimento || "",
      responsavelTelefone || "",
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        nome,
      });
    }
  );
});


// =========================
// ATUALIZAR PACIENTE
// =========================
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
    cep,
    rua,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    responsavelNome,
    responsavelCpf,
    responsavelDataNascimento,
    responsavelTelefone,
  } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: "Nome é obrigatório." });
  }

  if (!telefone) {
    return res.status(400).json({ erro: "Telefone é obrigatório." });
  }

  if (!cpf) {
    return res.status(400).json({ erro: "CPF é obrigatório." });
  }

  const sql = `
    UPDATE pacientes
    SET
      nome = ?,
      telefone = ?,
      email = ?,
      como_conheceu = ?,
      profissao = ?,
      genero = ?,
      data_nascimento = ?,
      cpf = ?,
      observacoes = ?,
      cep = ?,
      rua = ?,
      numero = ?,
      complemento = ?,
      bairro = ?,
      cidade = ?,
      estado = ?,
      responsavel_nome = ?,
      responsavel_cpf = ?,
      responsavel_data_nascimento = ?,
      responsavel_telefone = ?
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
      cep || "",
      rua || "",
      numero || "",
      complemento || "",
      bairro || "",
      cidade || "",
      estado || "",
      responsavelNome || "",
      responsavelCpf || "",
      responsavelDataNascimento || "",
      responsavelTelefone || "",
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


// =========================
// DELETAR PACIENTE
// =========================
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