const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");

// O catálogo é compartilhado entre todos os profissionais da mesma clínica.
router.use(auth, requirePermission("documentos"));

const UNIDADES = ["Ampola(s)", "Caixa(s)", "Comprimido(s)", "Frasco(s)", "Pacote(s)", "Tubo(s)", "Cápsula(s)"];

router.get("/", (req, res) => {
  const termo = String(req.query.busca || "").trim();
  db.all(
    `SELECT id, tipo_uso, nome, quantidade, unidade, posologia, receita_controlada
     FROM medicamentos
     WHERE clinica_id = ? AND ativo = 1 AND nome LIKE ?
     ORDER BY nome COLLATE NOCASE ASC LIMIT 30`,
    [req.user.clinica_id, `%${termo}%`],
    (err, rows) => {
      if (err) return res.status(500).json({ erro: "Não foi possível buscar os medicamentos." });
      res.json(rows || []);
    }
  );
});

router.post("/", (req, res) => {
  const tipoUso = String(req.body?.tipo_uso || "").trim();
  const nome = String(req.body?.nome || "").trim().slice(0, 160);
  const quantidade = String(req.body?.quantidade || "").trim().slice(0, 40);
  const unidade = String(req.body?.unidade || "").trim();
  const posologia = String(req.body?.posologia || "").trim().slice(0, 2000);
  const receitaControlada = req.body?.receita_controlada ? 1 : 0;

  if (!["interno", "externo"].includes(tipoUso)) {
    return res.status(400).json({ erro: "Selecione uso interno ou externo." });
  }
  if (!nome || !quantidade || !unidade || !posologia) {
    return res.status(400).json({ erro: "Preencha todos os campos do medicamento." });
  }
  if (!UNIDADES.includes(unidade)) {
    return res.status(400).json({ erro: "Selecione uma unidade de medida válida." });
  }

  db.run(
    `INSERT INTO medicamentos
      (clinica_id, tipo_uso, nome, quantidade, unidade, posologia, receita_controlada)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.user.clinica_id, tipoUso, nome, quantidade, unidade, posologia, receitaControlada],
    function (err) {
      if (err) {
        if (String(err.message || "").includes("UNIQUE")) {
          return res.status(409).json({ erro: "Este medicamento já está cadastrado nesta clínica." });
        }
        return res.status(500).json({ erro: "Não foi possível cadastrar o medicamento." });
      }
      res.status(201).json({
        id: this.lastID, tipo_uso: tipoUso, nome, quantidade, unidade,
        posologia, receita_controlada: receitaControlada,
        mensagem: "Medicamento cadastrado com sucesso."
      });
    }
  );
});

module.exports = router;
