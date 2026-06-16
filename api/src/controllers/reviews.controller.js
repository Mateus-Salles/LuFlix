const pool = require('../db');

/**
 * POST /reviews
 * Chama: pr_insert_review
 * Body: { user_id, rating, comment?, movie_id?, episode_id? }
 */
async function insertReview(req, res) {
  const { user_id, rating, comment = null, movie_id = null, episode_id = null } = req.body;

  if (!user_id || !rating) {
    return res.status(400).json({ error: 'Campos obrigatórios: user_id, rating.' });
  }

  if (movie_id && episode_id) {
    return res.status(400).json({ error: 'Informe apenas movie_id ou episode_id, não ambos.' });
  }

  if (!movie_id && !episode_id) {
    return res.status(400).json({ error: 'Informe ao menos movie_id ou episode_id.' });
  }

  try {
    await pool.query(
      `CALL pr_insert_review($1, $2, $3, $4, $5)`,
      [user_id, rating, comment, movie_id, episode_id]
    );

    return res.status(201).json({ message: 'Review cadastrada com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { insertReview };
