const pool = require('../db');

/**
 * POST /favorites
 * Verifica se já existe o favorito.
 * Se sim, remove executando pr_remove_favorite.
 * Se não, adiciona executando pr_add_favorite.
 * Body: { user_id, movie_id?, episode_id?, serie_id? }
 */
async function addFavorite(req, res) {
  const user_id = req.body.user_id ? Number(req.body.user_id) : null;
  const movie_id = req.body.movie_id ? Number(req.body.movie_id) : null;
  const episode_id = req.body.episode_id ? Number(req.body.episode_id) : null;
  const serie_id = req.body.serie_id ? Number(req.body.serie_id) : null;

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
    let checkQuery = '';
    let queryParams = [];

    if (movie_id) {
      checkQuery = 'SELECT 1 FROM "favorites" WHERE user_id = $1 AND movie_id = $2';
      queryParams = [user_id, movie_id];
    } else if (episode_id) {
      checkQuery = 'SELECT 1 FROM "favorites" WHERE user_id = $1 AND episode_id = $2';
      queryParams = [user_id, episode_id];
    } else if (serie_id) {
      checkQuery = 'SELECT 1 FROM "favorites" WHERE user_id = $1 AND serie_id = $2';
      queryParams = [user_id, serie_id];
    }

    const checkResult = await pool.query(checkQuery, queryParams);

    if (checkResult.rows.length > 0) {
      await pool.query(
        `CALL pr_remove_favorite($1, $2, $3, $4)`,
        [user_id, movie_id, episode_id, serie_id]
      );
      return res.status(200).json({ message: 'Favorito removido com sucesso.', action: 'removed' });
    } else {
      await pool.query(
        `CALL pr_add_favorite($1, $2, $3, $4)`,
        [user_id, movie_id, episode_id, serie_id]
      );
      return res.status(201).json({ message: 'Favorito adicionado com sucesso.', action: 'added' });
    }
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
  const user_id = req.body.user_id ? Number(req.body.user_id) : null;
  const movie_id = req.body.movie_id ? Number(req.body.movie_id) : null;
  const episode_id = req.body.episode_id ? Number(req.body.episode_id) : null;
  const serie_id = req.body.serie_id ? Number(req.body.serie_id) : null;

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

/**
 * GET /favorites/:user_id
 * Retorna todos os favoritos de um usuário.
 */
async function getUserFavorites(req, res) {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ error: 'Campo obrigatório: user_id.' });
  }

  try {
    const result = await pool.query(
      `SELECT movie_id, episode_id, serie_id FROM "favorites" WHERE user_id = $1`,
      [user_id]
    );

    return res.status(200).json({ data: result.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /favorites/details/:user_id
 * Retorna os filmes e séries favoritados de um usuário com todos os seus detalhes
 */
async function getDetailedFavorites(req, res) {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ error: 'ID do usuário é obrigatório.' });
  }

  try {
    const moviesQuery = `
      SELECT mv.* FROM "favorites" fav
      JOIN "vw_show_movies_data" mv ON fav.movie_id = mv.id_filme
      WHERE fav.user_id = $1
    `;
    const seriesQuery = `
      SELECT ser.* FROM "favorites" fav
      JOIN "vw_show_series_data" ser ON fav.serie_id = ser.serie_id
      WHERE fav.user_id = $1
    `;

    const moviesResult = await pool.query(moviesQuery, [Number(user_id)]);
    const seriesResult = await pool.query(seriesQuery, [Number(user_id)]);

    const { getMediaManifest } = require('../utils/manifest');
    const movieManifest = getMediaManifest('movies');
    
    const movies = moviesResult.rows.map(row => ({
      ...row,
      media_path: movieManifest[String(row.id_filme)] || null
    }));

    return res.status(200).json({
      movies,
      series: seriesResult.rows
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { addFavorite, removeFavorite, getUserFavorites, getDetailedFavorites };


