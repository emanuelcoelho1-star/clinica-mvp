const express = require("express");
const router = express.Router();
const db = require("../database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SECRET = "segredo_super_secreto";

// Cadastro
router.post("/register", async (req, res) => {
  const { email, senha } = req.body;

  const hash = await bcrypt.hash(senha, 10);

  db.run(
    "INSERT INTO usuarios (email, senha) VALUES (?, ?)",
    [email, hash],
    function (err) {
      if (err) {
        return res.status(400).json({ erro: "Usuário já existe" });
      }
      res.json({ mensagem: "Usuário criado" });
    }
  );
});

// Login
router.post("/login", (req, res) => {
  const { email, senha } = req.body;

  db.get(
    "SELECT * FROM usuarios WHERE email = ?",
    [email],
    async (err, user) => {
      if (!user) {
        return res.status(400).json({ erro: "Usuário não encontrado" });
      }

      const valido = await bcrypt.compare(senha, user.senha);

      if (!valido) {
        return res.status(401).json({ erro: "Senha inválida" });
      }

      const token = jwt.sign({ id: user.id }, SECRET, {
        expiresIn: "1d",
      });

      res.json({ token });
    }
  );
});

module.exports = router;