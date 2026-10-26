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
const pagamentosRoutes = require("./routes/pagamentos");
const evolucoesRoutes = require("./routes/evolucoes");
const tratamentosRoutes = require("./routes/tratamentos");
const authRoutes = require("./routes/auth");
const financeiroRoutes = require("./routes/financeiro");
const rbacRoutes = require("./routes/rbac");

require("./database");

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
app.use("/pagamentos", pagamentosRoutes);
app.use("/evolucoes", evolucoesRoutes);
app.use("/tratamentos", tratamentosRoutes);
app.use("/auth", authRoutes);
app.use("/financeiro", financeiroRoutes);
app.use("/rbac", rbacRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});