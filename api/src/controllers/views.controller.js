const pool = require('../db');

/**
 * GET /views/movies
 * Retorna: vw_show_movies_data
 * Query params opcionais: title (busca parcial), rating_min, rating_max, release_year
 */
async function getMovies(req, res) {
  const { title, rating_min, rating_max, release_year } = req.query;

  let query  = `SELECT * FROM vw_show_movies_data WHERE 1=1`;
  const params = [];

  if (title) {
    params.push(`%${title}%`);
    query += ` AND titulo ILIKE $${params.length}`;
  }

  if (rating_min !== undefined) {
    params.push(Number(rating_min));
    query += ` AND nota >= $${params.length}`;
  }

  if (rating_max !== undefined) {
    params.push(Number(rating_max));
    query += ` AND nota <= $${params.length}`;
  }

  if (release_year !== undefined) {
    params.push(Number(release_year));
    query += ` AND ano_lancamento = $${params.length}`;
  }

  query += ` ORDER BY nota DESC`;

  try {
    const result = await pool.query(query, params);
    return res.status(200).json({ total: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /views/series
 * Retorna: vw_show_series_data
 * Query params opcionais: title (busca parcial), rating_min, rating_max, release_year
 */
async function getSeries(req, res) {
  const { title, rating_min, rating_max, release_year } = req.query;

  let query  = `SELECT * FROM vw_show_series_data WHERE 1=1`;
  const params = [];

  if (title) {
    params.push(`%${title}%`);
    query += ` AND title ILIKE $${params.length}`;
  }

  if (rating_min !== undefined) {
    params.push(Number(rating_min));
    query += ` AND nota >= $${params.length}`;
  }

  if (rating_max !== undefined) {
    params.push(Number(rating_max));
    query += ` AND nota <= $${params.length}`;
  }

  if (release_year !== undefined) {
    params.push(Number(release_year));
    query += ` AND ano_lancamento = $${params.length}`;
  }

  query += ` ORDER BY nota DESC`;

  try {
    const result = await pool.query(query, params);
    return res.status(200).json({ total: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /views/seasons
 * Retorna: vw_show_seasons_data
 * Query params opcionais: serie_title (busca parcial)
 */
async function getSeasons(req, res) {
  const { serie_title } = req.query;

  let query  = `SELECT * FROM vw_show_seasons_data WHERE 1=1`;
  const params = [];

  if (serie_title) {
    params.push(`%${serie_title}%`);
    query += ` AND serie_title ILIKE $${params.length}`;
  }

  query += ` ORDER BY serie_title, season_number`;

  try {
    const result = await pool.query(query, params);
    return res.status(200).json({ total: result.rowCount, data: result.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { getMovies, getSeries, getSeasons };
