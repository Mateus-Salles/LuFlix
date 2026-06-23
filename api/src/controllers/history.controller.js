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

/**
 * GET /history/:user_id
 * Retorna o histórico de visualização do usuário com detalhes dos filmes e episódios assistidos
 */
async function getWatchHistory(req, res) {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ error: 'ID do usuário é obrigatório.' });
  }

  try {
    const query = `
      SELECT
        wh.history_id,
        wh.user_id,
        wh.movie_id,
        wh.episode_id,
        wh.watched_minutes,
        wh.watched_seconds,
        wh.watched_at,
        mv.title AS movie_title,
        mv.duration AS movie_duration,
        mv.rating AS movie_rating,
        mv.release_year AS movie_release_year,
        mv.synopsis AS movie_synopsis,
        ep.title AS episode_title,
        ep.duration AS episode_duration,
        ep.rating AS episode_rating,
        ep.episode_number AS episode_number,
        sea.season_number AS season_number,
        ser.title AS serie_title,
        ser.release_year AS serie_release_year,
        ser.serie_id AS serie_id
      FROM "watch_history" wh
      LEFT JOIN "movies" mv ON wh.movie_id = mv.movie_id
      LEFT JOIN "episodes" ep ON wh.episode_id = ep.episode_id
      LEFT JOIN "seasons" sea ON ep.season_id = sea.season_id
      LEFT JOIN "series" ser ON sea.serie_id = ser.serie_id
      WHERE wh.user_id = $1
      ORDER BY wh.watched_at DESC
    `;
    const result = await pool.query(query, [Number(user_id)]);

    const { getMediaEntry } = require('../utils/manifest');

    const rows = result.rows.map(row => {
      let media_path = null;
      let thumb_path = null;
      if (row.movie_id) {
        const entry = getMediaEntry('movies', row.movie_id);
        media_path = entry.media_path;
        thumb_path = entry.thumb_path;
      } else if (row.episode_id) {
        const entry = getMediaEntry('episodes', row.episode_id);
        media_path = entry.media_path;
        thumb_path = entry.thumb_path;
      }
      return {
        ...row,
        media_path,
        thumb_path
      };
    });

    return res.status(200).json({ total: result.rowCount, data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { addToWatchHistory, getWatchHistory };

