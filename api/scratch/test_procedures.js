require('dotenv').config();
const pool = require('../src/db');

async function testProcedures() {
  const userId = "7";
  const movieId = "3";

  try {
    console.log('--- TESTING WITH STRING ARGUMENTS ---');
    await pool.query('DELETE FROM "favorites" WHERE user_id = 7 AND movie_id = 3');

    console.log('Calling pr_add_favorite with strings...');
    await pool.query('CALL pr_add_favorite($1, $2, $3, $4)', [userId, movieId, null, null]);
    let res = await pool.query('SELECT * FROM "favorites" WHERE user_id = 7 AND movie_id = 3');
    console.log('Add result count:', res.rows.length);

    console.log('Calling pr_remove_favorite with strings...');
    await pool.query('CALL pr_remove_favorite($1, $2, $3, $4)', [userId, movieId, null, null]);
    res = await pool.query('SELECT * FROM "favorites" WHERE user_id = 7 AND movie_id = 3');
    console.log('Remove result count:', res.rows.length);

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await pool.end();
  }
}

testProcedures();
