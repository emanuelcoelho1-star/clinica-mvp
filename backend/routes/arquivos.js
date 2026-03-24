const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const db = require("../database");
const auth = require("../middleware/auth");

const router = express.Router();

/* ═══════════════════════════════════════════════════════════
   CONFIGURAÇÃO DO MULTER (upload de arquivos)
   ═══════════════════════════════════════════════════════════ */
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/* ═══════════════════════════════════════════════════════════
   LISTAR ARQUIVOS DO PACIENTE
   GET /arquivos/paciente/:pacienteId
   ═══════════════════════════════════════════════════════════ */
router.get("/paciente/:pacienteId", auth, (req, res) => {
  const { pacienteId } = req.params;
  db.all(
    "SELECT * FROM arquivos WHERE paciente_id = ? ORDER BY created_at DESC",
    [pacienteId],
    (err, rows) => {
      if (err) return res.status(500).json({ erro: err.message });
      res.json(rows || []);
    }
  );
});

/* ═══════════════════════════════════════════════════════════
   UPLOAD DE ARQUIVO
   POST /arquivos
   body (multipart/form-data): arquivo, paciente_id, categoria, descricao
   ═══════════════════════════════════════════════════════════ */
router.post("/", auth, upload.single("arquivo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: "Nenhum arquivo enviado." });
  }

  const { paciente_id, categoria, descricao } = req.body;

  if (!paciente_id) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ erro: "paciente_id é obrigatório." });
  }

  const sql = `
    INSERT INTO arquivos (paciente_id, nome_original, nome_salvo, tamanho, mimetype, categoria, descricao)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      paciente_id,
      req.file.originalname,
      req.file.filename,
      req.file.size,
      req.file.mimetype,
      categoria || "outro",
      descricao || "",
    ],
    function (err) {
      if (err) {
        fs.unlinkSync(req.file.path);
        return res.status(500).json({ erro: err.message });
      }
      res.status(201).json({
        id: this.lastID,
        nome_original: req.file.originalname,
        nome_salvo: req.file.filename,
        tamanho: req.file.size,
        mimetype: req.file.mimetype,
        categoria: categoria || "outro",
        descricao: descricao || "",
        mensagem: "Arquivo enviado com sucesso.",
      });
    }
  );
});

/* ═══════════════════════════════════════════════════════════
   DOWNLOAD / VISUALIZAR ARQUIVO
   GET /arquivos/:id/download?token=xxx
   (token via query string para poder abrir em nova aba)
   ═══════════════════════════════════════════════════════════ */
router.get("/:id/download", (req, res) => {
  const token = req.query.token || req.headers["authorization"];
  if (!token) return res.status(401).json({ erro: "Token não fornecido" });

  try {
    jwt.verify(token, "segredo_super_secreto");
  } catch {
    return res.status(401).json({ erro: "Token inválido" });
  }

  const { id } = req.params;
  db.get("SELECT * FROM arquivos WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ erro: err.message });
    if (!row) return res.status(404).json({ erro: "Arquivo não encontrado." });

    const filePath = path.join(uploadDir, row.nome_salvo);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ erro: "Arquivo não encontrado no disco." });
    }

    res.setHeader("Content-Type", row.mimetype || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${row.nome_original}"`);
    res.sendFile(filePath);
  });
});

/* ═══════════════════════════════════════════════════════════
   EXCLUIR ARQUIVO
   DELETE /arquivos/:id
   ═══════════════════════════════════════════════════════════ */
router.delete("/:id", auth, (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM arquivos WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ erro: err.message });
    if (!row) return res.status(404).json({ erro: "Arquivo não encontrado." });

    // Remove do disco
    const filePath = path.join(uploadDir, row.nome_salvo);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove do banco
    db.run("DELETE FROM arquivos WHERE id = ?", [id], function (delErr) {
      if (delErr) return res.status(500).json({ erro: delErr.message });
      res.json({ mensagem: "Arquivo excluído com sucesso." });
    });
  });
});

module.exports = router;