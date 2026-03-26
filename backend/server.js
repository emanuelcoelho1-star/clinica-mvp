const express = require("express");
const cors = require("cors");

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
const financeiroRoutes = require("./routes/financeiro"); // ← NOVO

require("./database");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

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
app.use("/financeiro", financeiroRoutes); // ← NOVO

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});