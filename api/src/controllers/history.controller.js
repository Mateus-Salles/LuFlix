const pool = require('../db');

/**
 * POST /history
 * Registra ou atualiza o progresso no histórico de visualização usando SQL puro (Raiz)
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
    // 1. Verificar se já existe histórico para este usuário e conteúdo
    let checkQuery = '';
    let queryParams = [];

    if (movie_id) {
      checkQuery = 'SELECT history_id FROM "watch_history" WHERE user_id = $1 AND movie_id = $2';
      queryParams = [user_id, movie_id];
    } else {
      checkQuery = 'SELECT history_id FROM "watch_history" WHERE user_id = $1 AND episode_id = $2';
      queryParams = [user_id, episode_id];
    }

    const checkResult = await pool.query(checkQuery, queryParams);

    if (checkResult.rows.length > 0) {
      // 2. Se já existe, atualizar os minutos/segundos
      let updateQuery = '';
      if (movie_id) {
        updateQuery = 'UPDATE "watch_history" SET watched_at = NOW(), watched_minutes = $3, watched_seconds = $4 WHERE user_id = $1 AND movie_id = $2';
      } else {
        updateQuery = 'UPDATE "watch_history" SET watched_at = NOW(), watched_minutes = $3, watched_seconds = $4 WHERE user_id = $1 AND episode_id = $2';
      }
      await pool.query(updateQuery, [user_id, movie_id || episode_id, watched_minutes, watched_seconds]);
    } else {
      // 3. Se não existe, inserir novo registro
      const insertQuery = 'INSERT INTO "watch_history" (user_id, movie_id, episode_id, watched_at, watched_minutes, watched_seconds) VALUES ($1, $2, $3, NOW(), $4, $5)';
      await pool.query(insertQuery, [user_id, movie_id, episode_id, watched_minutes, watched_seconds]);
    }

    return res.status(200).json({ message: 'Histórico de visualização atualizado com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { addToWatchHistory };

