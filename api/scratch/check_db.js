const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool = require('../src/db');

async function check() {
  try {
    const moviesCols = await pool.query("SELECT column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'movies'");
    console.log("movies columns:", moviesCols.rows.map(r => r.column_name));
    
    const episodesCols = await pool.query("SELECT column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'episodes'");
    console.log("episodes columns:", episodesCols.rows.map(r => r.column_name));

    const moviesSample = await pool.query("SELECT * FROM movies LIMIT 1");
    console.log("movies sample:", moviesSample.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
