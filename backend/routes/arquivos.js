const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const db = require("../database");
const auth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");

const router = express.Router();

// A autorização é validada na API, não apenas na interface.
router.use(auth, requirePermission("arquivos"));

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

const TIPOS_PERMITIDOS = new Map([
  [".pdf", new Set(["application/pdf"])],
  [".jpg", new Set(["image/jpeg"])],
  [".jpeg", new Set(["image/jpeg"])],
  [".png", new Set(["image/png"])],
  [".gif", new Set(["image/gif"])],
  [".webp", new Set(["image/webp"])],
  [".doc", new Set(["application/msword", "application/octet-stream"])],
  [".docx", new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/octet-stream"])],
  [".xls", new Set(["application/vnd.ms-excel", "application/octet-stream"])],
  [".xlsx", new Set(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip", "application/octet-stream"])],
  [".txt", new Set(["text/plain", "application/octet-stream"])],
]);

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const allowedMimes = TIPOS_PERMITIDOS.get(extension);
    const mime = String(file.mimetype || "").toLowerCase().split(";")[0].trim();

    if (!allowedMimes || !allowedMimes.has(mime)) {
      const error = new Error("Tipo de arquivo não permitido. Envie PDF, imagem comum, documento Office ou TXT.");
      error.status = 400;
      return cb(error);
    }
    cb(null, true);
  },
});

/* ═══════════════════════════════════════════════════════════
   LISTAR ARQUIVOS DO PACIENTE
   GET /arquivos/paciente/:pacienteId
   ═══════════════════════════════════════════════════════════ */
router.get("/paciente/:pacienteId", auth, (req, res) => {
  const { pacienteId } = req.params;
  db.all(
    "SELECT * FROM arquivos WHERE paciente_id = ? AND clinica_id = ? ORDER BY created_at DESC",
    [pacienteId, req.user.clinica_id],
    (err, rows) => {
      if (err) return res.status(500).json({ erro: "Não foi possível processar o arquivo. Tente novamente." });
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

  const nomeOriginal = path.basename(req.file.originalname || "arquivo").replace(/[\\r\\n\\0]/g, "").slice(0, 180);
  const sql = `
    INSERT INTO arquivos (paciente_id, nome_original, nome_salvo, tamanho, mimetype, categoria, descricao, clinica_id)
    SELECT p.id, ?, ?, ?, ?, ?, ?, ?
    FROM pacientes p
    WHERE p.id = ? AND p.clinica_id = ?
  `;

  db.run(
    sql,
    [
      nomeOriginal,
      req.file.filename,
      req.file.size,
      req.file.mimetype,
      categoria || "outro",
      descricao || "",
      req.user.clinica_id,
      paciente_id,
      req.user.clinica_id,
    ],
    function (err) {
      if (err || this.changes === 0) {
        fs.unlink(req.file.path, () => {});
        if (err) return res.status(500).json({ erro: "Não foi possível processar o arquivo. Tente novamente." });
        return res.status(404).json({ erro: "Paciente não encontrado nesta clínica." });
      }
      res.status(201).json({
        id: this.lastID,
        nome_original: nomeOriginal,
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
   GET /arquivos/:id/download
   O token deve ser enviado no cabeçalho Authorization, nunca na URL.
   ═══════════════════════════════════════════════════════════ */
router.get("/:id/download", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;
  const secret = process.env.JWT_SECRET;

  if (!token) return res.status(401).json({ erro: "Token não fornecido." });
  if (!secret) return res.status(500).json({ erro: "Autenticação indisponível." });

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }

  if (!decoded || !decoded.id) {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }

  // Downloads abertos em nova aba também precisam validar a conta no banco.
  db.get(
    `SELECT u.id, u.clinica_id, r.ativo AS role_ativo,
            r.clinica_id AS role_clinica_id, r.protegido AS role_protegido,
            c.status AS clinica_status
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN clinicas c ON c.id = u.clinica_id
     WHERE u.id = ?`,
    [decoded.id],
    (userErr, user) => {
      if (userErr) return res.status(500).json({ erro: "Não foi possível validar a sessão." });
      if (!user) return res.status(401).json({ erro: "Sessão inválida. Faça login novamente." });
      if (Number(user.role_ativo) !== 1) {
        return res.status(403).json({ erro: "Este perfil está desativado. Contate o administrador." });
      }
      if (!user.clinica_id) {
        return res.status(403).json({ erro: "Usuário sem clínica vinculada. Contate o administrador." });
      }
      if (user.clinica_status !== "ativa") {
        return res.status(403).json({ erro: "A clínica não está ativa. Contate o administrador." });
      }
      if (Number(user.role_protegido) !== 1 && Number(user.role_clinica_id) !== Number(user.clinica_id)) {
        return res.status(403).json({ erro: "O perfil de acesso não pertence a esta clínica." });
      }

      const { id } = req.params;
      db.get("SELECT * FROM arquivos WHERE id = ? AND clinica_id = ?", [id, user.clinica_id], (err, row) => {
        if (err) return res.status(500).json({ erro: "Erro ao buscar arquivo." });
        if (!row) return res.status(404).json({ erro: "Arquivo não encontrado." });

        const filePath = path.join(uploadDir, path.basename(row.nome_salvo));
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ erro: "Arquivo não encontrado no disco." });
        }

        // Apenas formatos seguros para visualização inline; demais tipos são baixados.
        const inlineTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"]);
        const storedType = String(row.mimetype || "").toLowerCase().split(";")[0].trim();
        const contentType = inlineTypes.has(storedType) ? storedType : "application/octet-stream";
        const disposition = inlineTypes.has(storedType) ? "inline" : "attachment";
        const originalName = String(row.nome_original || "arquivo").replace(/[\\r\\n\\0]/g, "").slice(0, 180);
        const fallbackName = originalName.replace(/[^\\x20-\\x7E]/g, "_").replace(/["\\\\]/g, "_") || "arquivo";

        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("Content-Type", contentType);
        res.setHeader(
          "Content-Disposition",
          `${disposition}; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(originalName || "arquivo")}`
        );
        res.sendFile(filePath);
      });
    }
  );
});

/* ═══════════════════════════════════════════════════════════
   EXCLUIR ARQUIVO
   DELETE /arquivos/:id
   ═══════════════════════════════════════════════════════════ */
router.delete("/:id", auth, (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM arquivos WHERE id = ? AND clinica_id = ?", [id, req.user.clinica_id], (err, row) => {
    if (err) return res.status(500).json({ erro: "Não foi possível processar o arquivo. Tente novamente." });
    if (!row) return res.status(404).json({ erro: "Arquivo não encontrado." });

    // Remove do disco
    const filePath = path.join(uploadDir, row.nome_salvo);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove do banco
    db.run("DELETE FROM arquivos WHERE id = ? AND clinica_id = ?", [id, req.user.clinica_id], function (delErr) {
      if (delErr) return res.status(500).json({ erro: "Não foi possível processar o arquivo. Tente novamente." });
      res.json({ mensagem: "Arquivo excluído com sucesso." });
    });
  });
});

module.exports = router;