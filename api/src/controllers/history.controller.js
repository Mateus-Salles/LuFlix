const pool = require('../db');

/**
 * POST /history
 * Chama: pr_add_to_watch_history
 * Body: {
 *   user_id,
 *   movie_id?,
 *   episode_id?,
 *   watched_minutes,
 *   watched_seconds
 * }
 */
async function addToWatchHistory(req, res) {
  const {
    user_id,
    movie_id = null,
    episode_id = null,
    watched_minutes,
    watched_seconds,
  } = req.body;

  if (!user_id || watched_minutes === undefined || watched_seconds === undefined) {
    return res.status(400).json({
      error: 'Campos obrigatórios: user_id, watched_minutes, watched_seconds.',
    });
  }

  if (movie_id && episode_id) {
    return res.status(400).json({ error: 'Informe apenas movie_id ou episode_id, não ambos.' });
  }

  if (!movie_id && !episode_id) {
    return res.status(400).json({ error: 'Informe ao menos movie_id ou episode_id.' });
  }

  try {
    await pool.query(
      `CALL pr_add_to_watch_history($1, $2, $3, $4, $5)`,
      [user_id, movie_id, episode_id, watched_minutes, watched_seconds]
    );

    return res.status(200).json({ message: 'Histórico de visualização atualizado com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { addToWatchHistory };
