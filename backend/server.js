const express = require("express");
const cors = require("cors");

const pacientesRoutes = require("./routes/pacientes");
const consultasRoutes = require("./routes/consultas");
const anamnesesRoutes = require("./routes/anamneses");
const orcamentosRoutes = require("./routes/orcamentos");
const arquivosRoutes = require("./routes/arquivos");
const documentosRoutes = require("./routes/documentos");
const authRoutes = require("./routes/auth");

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
app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});