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

  const logo = typeof dados.logo_url === "string" ? dados.logo_url.trim() : "";
  if (logo && logo.startsWith("data:") && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo)) {
    return res.status(400).json({ erro: "O logo enviado precisa ser uma imagem PNG, JPG ou WEBP válida." });
  }
  if (logo.startsWith("data:image/") && logo.length > 700000) {
    return res.status(413).json({ erro: "O logo é muito grande. Envie uma imagem de até 500 KB." });
  }
  if (logo && !logo.startsWith("data:image/")) {
    try {
      const url = new URL(logo);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Protocolo inválido");
    } catch {
      return res.status(400).json({ erro: "Informe um link válido para a imagem do logo." });
    }
  }

  const valores = CAMPOS.map((campo) => {
    const valor = dados[campo];
    const limite = campo === "logo_url" ? 700000 : campo === "nome" ? 180 : 250;
    return typeof valor === "string" ? valor.trim().slice(0, limite) : "";
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
