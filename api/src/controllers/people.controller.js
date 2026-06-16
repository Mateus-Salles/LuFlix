const pool = require('../db');

/**
 * POST /people/directors
 * Chama: fn_insert_director
 * Body: { first_name, last_name, nationality, birth }
 */
async function insertDirector(req, res) {
  const { first_name, last_name, nationality, birth = null } = req.body;

  if (!first_name || !last_name || !nationality) {
    return res.status(400).json({ error: 'Campos obrigatórios: first_name, last_name, nationality.' });
  }

  try {
    // fn_insert_director recebe um composite type movie_person
    const result = await pool.query(
      `SELECT fn_insert_director(ROW($1, $2, $3, $4)::movie_person) AS director_id`,
      [first_name, last_name, nationality, birth]
    );

    const director_id = result.rows[0]?.director_id;

    return res.status(201).json({ message: 'Diretor cadastrado com sucesso.', director_id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * POST /people/actors
 * Chama: pr_insert_actors_array
 * Body: { actors: [{ first_name, last_name, nationality, birth }] }
 */
async function insertActors(req, res) {
  const { actors } = req.body;

  if (!Array.isArray(actors) || actors.length === 0) {
    return res.status(400).json({ error: 'Informe um array "actors" com ao menos um ator.' });
  }

  for (const a of actors) {
    if (!a.first_name || !a.last_name || !a.nationality || !a.birth) {
      return res.status(400).json({
        error: 'Cada ator deve ter: first_name, last_name, nationality, birth.',
      });
    }
  }

  try {
    // Monta um array de composite types movie_person para o PostgreSQL
    const pgArray =
      'ARRAY[' +
      actors.map((_, i) => {
        const base = i * 4;
        return `ROW($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})::movie_person`;
      }).join(', ') +
      ']';

    const values = actors.flatMap((a) => [a.first_name, a.last_name, a.nationality, a.birth]);

    await pool.query(`CALL pr_insert_actors_array(${pgArray})`, values);

    return res.status(201).json({ message: `${actors.length} ator(es) cadastrado(s) com sucesso.` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { insertDirector, insertActors };
