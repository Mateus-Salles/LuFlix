const pool = require('../db');

// ─────────────────────────────────────────────
//  INSERÇÃO DE CONTEÚDO
// ─────────────────────────────────────────────

/**
 * POST /catalog/movies
 * Chama: pr_insert_movie_or_serie (type=movie)
 * Body: {
 *   release_year, content_rating_id, directors_id[],
 *   number_rating?, rating?,
 *   title, synopsis, duration
 * }
 */
async function insertMovie(req, res) {
  const {
    release_year,
    content_rating_id,
    directors_id,
    number_rating = 0,
    rating = 0,
    title,
    synopsis,
    duration,
  } = req.body;

  if (!release_year || !content_rating_id || !directors_id?.length || !title || !synopsis || !duration) {
    return res.status(400).json({
      error: 'Campos obrigatórios: release_year, content_rating_id, directors_id[], title, synopsis, duration.',
    });
  }

  try {
    await pool.query(
      `CALL pr_insert_movie_or_serie(
        p_type              => 'movie',
        p_release_year      => $1,
        p_content_rating_id => $2,
        p_directors_id      => $3,
        p_number_rating     => $4,
        p_rating            => $5,
        p_duration          => $6,
        p_movie_title       => $7,
        p_movie_synopsis    => $8
      )`,
      [release_year, content_rating_id, directors_id, number_rating, rating, duration, title, synopsis]
    );

    return res.status(201).json({ message: `Filme "${title}" inserido com sucesso.` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * POST /catalog/series
 * Chama: pr_insert_movie_or_serie (type=serie)
 * Body: {
 *   release_year, content_rating_id,
 *   rating?, title, synopsis
 * }
 */
async function insertSerie(req, res) {
  const {
    release_year,
    content_rating_id,
    rating = 0,
    title,
    synopsis,
  } = req.body;

  if (!release_year || !content_rating_id || !title || !synopsis) {
    return res.status(400).json({
      error: 'Campos obrigatórios: release_year, content_rating_id, title, synopsis.',
    });
  }

  try {
    await pool.query(
      `CALL pr_insert_movie_or_serie(
        p_type              => 'serie',
        p_release_year      => $1,
        p_content_rating_id => $2,
        p_rating            => $3,
        p_serie_title       => $4,
        p_serie_synopsis    => $5
      )`,
      [release_year, content_rating_id, rating, title, synopsis]
    );

    return res.status(201).json({ message: `Série "${title}" inserida com sucesso.` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * POST /catalog/episodes
 * Chama: pr_insert_movie_or_serie (type=episode)
 * Body: {
 *   release_year, content_rating_id, directors_id[],
 *   number_rating?, rating?,
 *   serie_id?,
 *   duration,
 *   episode_title, episode_synopsis,
 *   serie_title?, serie_synopsis?,
 *   season_number
 * }
 */
async function insertEpisode(req, res) {
  const {
    release_year,
    content_rating_id,
    directors_id,
    number_rating = 0,
    rating = 0,
    serie_id = null,
    duration,
    episode_title,
    episode_synopsis,
    serie_title = null,
    serie_synopsis = null,
    season_number,
  } = req.body;

  if (!release_year || !content_rating_id || !directors_id?.length || !duration || !episode_title || !episode_synopsis || !season_number) {
    return res.status(400).json({
      error: 'Campos obrigatórios: release_year, content_rating_id, directors_id[], duration, episode_title, episode_synopsis, season_number.',
    });
  }

  if (!serie_id && (!serie_title || !serie_synopsis)) {
    return res.status(400).json({
      error: 'Informe serie_id de uma série existente ou os campos serie_title e serie_synopsis para criar uma nova.',
    });
  }

  try {
    await pool.query(
      `CALL pr_insert_movie_or_serie(
        p_type              => 'episode',
        p_release_year      => $1,
        p_content_rating_id => $2,
        p_directors_id      => $3,
        p_number_rating     => $4,
        p_rating            => $5,
        p_serie_id          => $6,
        p_duration          => $7,
        p_episode_title     => $8,
        p_episode_synopsis  => $9,
        p_serie_title       => $10,
        p_serie_synopsis    => $11,
        p_season_number     => $12
      )`,
      [
        release_year, content_rating_id, directors_id,
        number_rating, rating, serie_id, duration,
        episode_title, episode_synopsis,
        serie_title, serie_synopsis, season_number,
      ]
    );

    return res.status(201).json({ message: `Episódio "${episode_title}" inserido com sucesso.` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ─────────────────────────────────────────────
//  GÊNEROS
// ─────────────────────────────────────────────

/**
 * POST /catalog/genres
 * Chama: fn_insert_content_genres
 * Body: { content_type: 'movie'|'serie', content_id, genre_ids[] }
 */
async function insertContentGenres(req, res) {
  const { content_type, content_id, genre_ids } = req.body;

  if (!content_type || !content_id || !Array.isArray(genre_ids) || genre_ids.length === 0) {
    return res.status(400).json({ error: 'Campos obrigatórios: content_type, content_id, genre_ids[].' });
  }

  try {
    await pool.query(
      `SELECT fn_insert_content_genres($1, $2, $3)`,
      [content_type, content_id, genre_ids]
    );

    return res.status(201).json({ message: 'Gêneros vinculados com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ─────────────────────────────────────────────
//  ELENCO
// ─────────────────────────────────────────────

/**
 * POST /catalog/cast
 * Chama: fn_insert_content_cast
 * Body: {
 *   content_type: 'movie'|'episode',
 *   content_id,
 *   actor_ids[],
 *   character_names[]
 * }
 */
async function insertContentCast(req, res) {
  const { content_type, content_id, actor_ids, character_names } = req.body;

  if (
    !content_type || !content_id ||
    !Array.isArray(actor_ids) || actor_ids.length === 0 ||
    !Array.isArray(character_names) || character_names.length === 0
  ) {
    return res.status(400).json({
      error: 'Campos obrigatórios: content_type, content_id, actor_ids[], character_names[].',
    });
  }

  if (actor_ids.length !== character_names.length) {
    return res.status(400).json({ error: 'actor_ids e character_names devem ter o mesmo tamanho.' });
  }

  try {
    await pool.query(
      `SELECT fn_insert_content_cast($1, $2, $3, $4)`,
      [content_type, content_id, actor_ids, character_names]
    );

    return res.status(201).json({ message: 'Elenco vinculado com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ─────────────────────────────────────────────
//  DIRETORES DE CONTEÚDO
// ─────────────────────────────────────────────

/**
 * POST /catalog/directors
 * Chama: fn_insert_content_directors
 * Body: {
 *   content_type: 'movie'|'episode',
 *   content_id,
 *   directors_ids[]
 * }
 */
async function insertContentDirectors(req, res) {
  const { content_type, content_id, directors_ids } = req.body;

  if (!content_type || !content_id || !Array.isArray(directors_ids) || directors_ids.length === 0) {
    return res.status(400).json({
      error: 'Campos obrigatórios: content_type, content_id, directors_ids[].',
    });
  }

  try {
    await pool.query(
      `SELECT fn_insert_content_directors($1, $2, $3)`,
      [content_type, content_id, directors_ids]
    );

    return res.status(201).json({ message: 'Diretor(es) vinculado(s) ao conteúdo com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  insertMovie,
  insertSerie,
  insertEpisode,
  insertContentGenres,
  insertContentCast,
  insertContentDirectors,
};
