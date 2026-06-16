const pool = require('../db');

/**
 * POST /favorites
 * Chama: pr_add_favorite
 * Body: { user_id, movie_id?, episode_id?, serie_id? }
 */
async function addFavorite(req, res) {
  const { user_id, movie_id = null, episode_id = null, serie_id = null } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'Campo obrigatório: user_id.' });
  }

  if (!movie_id && !episode_id && !serie_id) {
    return res.status(400).json({ error: 'Informe ao menos movie_id, episode_id ou serie_id.' });
  }

  const filled = [movie_id, episode_id, serie_id].filter(Boolean).length;
  if (filled > 1) {
    return res.status(400).json({ error: 'Informe apenas um de: movie_id, episode_id ou serie_id.' });
  }

  try {
    await pool.query(
      `CALL pr_add_favorite($1, $2, $3, $4)`,
      [user_id, movie_id, episode_id, serie_id]
    );

    return res.status(201).json({ message: 'Favorito adicionado com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /favorites
 * Chama: pr_remove_favorite
 * Body: { user_id, movie_id?, episode_id?, serie_id? }
 */
async function removeFavorite(req, res) {
  const { user_id, movie_id = null, episode_id = null, serie_id = null } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'Campo obrigatório: user_id.' });
  }

  if (!movie_id && !episode_id && !serie_id) {
    return res.status(400).json({ error: 'Informe ao menos movie_id, episode_id ou serie_id.' });
  }

  const filled = [movie_id, episode_id, serie_id].filter(Boolean).length;
  if (filled > 1) {
    return res.status(400).json({ error: 'Informe apenas um de: movie_id, episode_id ou serie_id.' });
  }

  try {
    await pool.query(
      `CALL pr_remove_favorite($1, $2, $3, $4)`,
      [user_id, movie_id, episode_id, serie_id]
    );

    return res.status(200).json({ message: 'Favorito removido com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { addFavorite, removeFavorite };
