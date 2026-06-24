require('dotenv').config();

const express = require('express');
const path = require('path');
const routes = require('./routes');
const cors = require('cors')

const app = express();

//const corsOptions = {
//  origin: ['http://localhost:5500', 'http://127.0.0.1:5500'], // Libera exatamente a porta do seu front-end
//  methods: ['GET', 'POST', 'PUT', 'DELETE'],
//  allowedHeaders: ['Content-Type', 'Authorization']
//};

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Prefixo geral da API
app.use('/api/v1', routes);

// Rota de health-check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Handler de rotas não encontradas
app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

// Handler de erros globais
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno no servidor.' });
});

module.exports = app;
