// Carrega variáveis de backend/.env antes de importar rotas que exigem JWT_SECRET.
// Não sobrescreve variáveis já definidas no ambiente (por exemplo, na hospedagem).
const fs = require("fs");
const path = require("path");
const envPath = path.join(__dirname, ".env");

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split(String.fromCharCode(10))) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const pacientesRoutes = require("./routes/pacientes");
const consultasRoutes = require("./routes/consultas");
const anamnesesRoutes = require("./routes/anamneses");
const orcamentosRoutes = require("./routes/orcamentos");
const arquivosRoutes = require("./routes/arquivos");
const documentosRoutes = require("./routes/documentos");
const medicamentosRoutes = require("./routes/medicamentos");
const pagamentosRoutes = require("./routes/pagamentos");
const evolucoesRoutes = require("./routes/evolucoes");
const tratamentosRoutes = require("./routes/tratamentos");
const authRoutes = require("./routes/auth");
const financeiroRoutes = require("./routes/financeiro");
const rbacRoutes = require("./routes/rbac");
const clinicaRoutes = require("./routes/clinica");

const db = require("./database");

const app = express();
const PORT = 3001;

// Em desenvolvimento, aceita as origens locais mais comuns do Vite/React.
// Em produção, defina CORS_ORIGINS com a lista de origens confiáveis separadas por vírgula.
const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : defaultOrigins;

app.use(cors({
  origin(origin, callback) {
    // Permite ferramentas locais/servidor a servidor sem cabeçalho Origin.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "1mb" }));

// Cabeçalhos básicos de segurança para todas as respostas da API.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

/* ═══════════════════════════════════════════════════════════
   RATE LIMIT GLOBAL — 100 requisições por IP a cada 1 minuto
   Protege toda a API contra abuso / DDoS básico
   ═══════════════════════════════════════════════════════════ */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { erro: "Muitas requisições. Aguarde um momento e tente novamente." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
});

app.use(globalLimiter);

app.get("/", (req, res) => {
  res.json({ mensagem: "API da clínica rodando." });
});

app.use("/pacientes", pacientesRoutes);
app.use("/consultas", consultasRoutes);
app.use("/anamneses", anamnesesRoutes);
app.use("/orcamentos", orcamentosRoutes);
app.use("/arquivos", arquivosRoutes);
app.use("/documentos", documentosRoutes);
app.use("/medicamentos", medicamentosRoutes);
app.use("/pagamentos", pagamentosRoutes);
app.use("/evolucoes", evolucoesRoutes);
app.use("/tratamentos", tratamentosRoutes);
app.use("/auth", authRoutes);
app.use("/financeiro", financeiroRoutes);
app.use("/rbac", rbacRoutes);
app.use("/clinica", clinicaRoutes);

// Respostas consistentes para rotas inexistentes e erros inesperados.
// Não expõe stack traces, caminhos locais ou detalhes internos da API.
app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ erro: "O arquivo excede o limite de 10 MB." });
  }
  if (err && err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({ erro: "Envie no máximo 5 arquivos por vez." });
  }

  const status = Number(err && (err.status || err.statusCode));
  if (status >= 400 && status < 500) {
    return res.status(status).json({ erro: err.message || "Requisição inválida." });
  }

  console.error("Erro inesperado na API:", req.method, req.path);
  return res.status(500).json({ erro: "Erro interno do servidor." });
});

db.pronto.then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error("Servidor não iniciado: falha ao preparar o banco de dados:", err.message);
  process.exitCode = 1;
});