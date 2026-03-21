const express = require("express");
const cors = require("cors");

const pacientesRoutes = require("./routes/pacientes");
const consultasRoutes = require("./routes/consultas");
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
app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});