// Nodemon configuration integration
require('dotenv').config();

const app  = require('./app');
const pool = require('./db');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await pool.query('SELECT 1'); // testa a conexão com o banco
    console.log('✅ Conexão com o PostgreSQL estabelecida.');

    app.listen(PORT, () => {
      console.log(`🚀 LuFlix API rodando em http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err.message);
    process.exit(1);
  }
}

start();
