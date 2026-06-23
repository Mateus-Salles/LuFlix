const pool = require('../db');
const { getMediaManifest } = require('../utils/manifest');

/**
 * GET /views/movies
 * Retorna: vw_show_movies_data
 * Query params opcionais: id (filtro exato), title (busca parcial), rating_min, rating_max, release_year
 */
async function getMovies(req, res) {
  const { id, title, rating_min, rating_max, release_year } = req.query;

  let query  = `SELECT * FROM vw_show_movies_data WHERE 1=1`;
  const params = [];

  if (id) {
    params.push(Number(id));
    query += ` AND id_filme = $${params.length}`;
  }

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
    
    // Mesclar media_path e thumb_path do manifesto
    const manifest = getMediaManifest('movies');
    const rows = result.rows.map(row => {
      const entry = manifest[String(row.id_filme)];
      let media_path = null;
      let thumb_path = null;
      if (entry) {
        if (typeof entry === 'object') {
          media_path = entry.media_path || null;
          thumb_path = entry.thumb_path || null;
        } else {
          media_path = entry;
        }
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

/**
 * GET /views/series
 * Retorna: vw_show_series_data
 * Query params opcionais: id (filtro exato), title (busca parcial), rating_min, rating_max, release_year
 */
async function getSeries(req, res) {
  const { id, title, rating_min, rating_max, release_year } = req.query;

  let query  = `SELECT * FROM vw_show_series_data WHERE 1=1`;
  const params = [];

  if (id) {
    params.push(Number(id));
    query += ` AND serie_id = $${params.length}`;
  }

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
    
    // Mesclar thumb_path do manifesto de series
    const manifest = getMediaManifest('series');
    const rows = result.rows.map(row => {
      const entry = manifest[String(row.serie_id)];
      let thumb_path = null;
      if (entry) {
        if (typeof entry === 'object') {
          thumb_path = entry.thumb_path || null;
        } else {
          thumb_path = entry;
        }
      }
      return {
        ...row,
        thumb_path
      };
    });

    return res.status(200).json({ total: result.rowCount, data: rows });
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

/**
 * GET /views/episodes
 * Retorna dados mesclados da tabela episodes com temporadas e séries.
 * Query params opcionais: id (filtro exato), serie_id (filtro exato), season_number (filtro exato), title (busca parcial), rating_min, rating_max, release_year
 */
async function getEpisodes(req, res) {
  const { id, serie_id, season_number, title, rating_min, rating_max, release_year } = req.query;

  let query = `
    SELECT
      ep.episode_id,
      ep.title AS episode_title,
      ep.rating,
      ep.synopsis,
      ep.duration,
      ep.episode_number,
      sea.season_number,
      ser.title AS serie_title,
      ser.release_year
    FROM "episodes" ep
    JOIN "seasons" sea ON ep.season_id = sea.season_id
    JOIN "series" ser ON sea.serie_id = ser.serie_id
    WHERE 1=1
  `;
  const params = [];

  if (id) {
    params.push(Number(id));
    query += ` AND ep.episode_id = $${params.length}`;
  }

  if (serie_id) {
    params.push(Number(serie_id));
    query += ` AND ser.serie_id = $${params.length}`;
  }

  if (season_number) {
    params.push(Number(season_number));
    query += ` AND sea.season_number = $${params.length}`;
  }

  if (title) {
    params.push(`%${title}%`);
    query += ` AND ep.title ILIKE $${params.length}`;
  }

  if (rating_min !== undefined) {
    params.push(Number(rating_min));
    query += ` AND ep.rating >= $${params.length}`;
  }

  if (rating_max !== undefined) {
    params.push(Number(rating_max));
    query += ` AND ep.rating <= $${params.length}`;
  }

  if (release_year !== undefined) {
    params.push(Number(release_year));
    query += ` AND ser.release_year = $${params.length}`;
  }

  query += ` ORDER BY ep.episode_id ASC`;

  try {
    const result = await pool.query(query, params);
    
    // Mesclar media_path e thumb_path do manifesto
    const manifest = getMediaManifest('episodes');
    const rows = result.rows.map(row => {
      const entry = manifest[String(row.episode_id)];
      let media_path = null;
      let thumb_path = null;
      if (entry) {
        if (typeof entry === 'object') {
          media_path = entry.media_path || null;
          thumb_path = entry.thumb_path || null;
        } else {
          media_path = entry;
        }
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

module.exports = { getMovies, getSeries, getSeasons, getEpisodes };
