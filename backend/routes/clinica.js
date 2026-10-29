const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");

router.use(auth);

function exigirAdministrador(req, res, next) {
  db.get(
    "SELECT protegido FROM roles WHERE id = (SELECT role_id FROM usuarios WHERE id = ? AND clinica_id = ?)",
    [req.user.id, req.user.clinica_id],
    (err, role) => {
      if (err) return res.status(500).json({ erro: "Não foi possível validar as permissões." });
      if (!role || Number(role.protegido) !== 1) {
        return res.status(403).json({ erro: "Somente o administrador pode alterar os dados da clínica." });
      }
      next();
    }
  );
}

const CAMPOS = [
  "nome", "nome_fantasia", "razao_social", "cnpj", "email_contato", "telefone",
  "telefone_secundario", "cep", "rua", "numero", "complemento", "bairro",
  "cidade", "estado", "logo_url", "responsavel_tecnico", "cro", "site"
];

router.get("/", exigirAdministrador, (req, res) => {
  db.get(
    `SELECT id, nome, nome_fantasia, razao_social, cnpj, email_contato, telefone,
            telefone_secundario, cep, rua, numero, complemento, bairro, cidade,
            estado, logo_url, responsavel_tecnico, cro, site
     FROM clinicas WHERE id = ?`,
    [req.user.clinica_id],
    (err, clinica) => {
      if (err) return res.status(500).json({ erro: "Não foi possível carregar os dados da clínica." });
      if (!clinica) return res.status(404).json({ erro: "Clínica não encontrada." });
      res.json({ clinica });
    }
  );
});

router.put("/", exigirAdministrador, (req, res) => {
  const dados = req.body || {};
  const nome = String(dados.nome || "").trim();
  if (!nome) return res.status(400).json({ erro: "O nome da clínica é obrigatório." });

  const valores = CAMPOS.map((campo) => {
    const valor = dados[campo];
    return typeof valor === "string" ? valor.trim().slice(0, campo === "logo_url" ? 1500 : 250) : "";
  });
  valores[0] = nome.slice(0, 180);
  const camposSql = CAMPOS.map((campo) => `${campo} = ?`).join(", ");

  db.run(
    `UPDATE clinicas SET ${camposSql}, updated_at = datetime('now','localtime') WHERE id = ?`,
    [...valores, req.user.clinica_id],
    function (err) {
      if (err) return res.status(500).json({ erro: "Não foi possível salvar os dados da clínica." });
      if (!this.changes) return res.status(404).json({ erro: "Clínica não encontrada." });
      res.json({ mensagem: "Dados da clínica salvos com sucesso." });
    }
  );
});

module.exports = router;
