require("dotenv").config();

const express = require("express");
const routes = require("./routes");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

// Prefixo geral da API
app.use("/api/v1", routes);

// Rota de health-check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Handler de rotas não encontradas
app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada." }));

// Handler de erros globais
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno no servidor." });
});

module.exports = app;
