const path = require("path");
const pool = require("../db");

function getRelativeMediaPath(filePath) {
  if (!filePath) return null;
  return path
    .relative(path.resolve(__dirname, "../../"), filePath)
    .replace(/\\/g, "/");
}

function isPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function normalizeIds(rawValue) {
  if (Array.isArray(rawValue))
    return rawValue.filter(
      (item) => item !== undefined && item !== null && item !== "",
    );
  if (rawValue === undefined || rawValue === null || rawValue === "") return [];
  return [rawValue];
}

function badRequest(res, error) {
  return res.status(400).json({ error });
}

async function rollbackClient(client) {
  if (!client) return;
  try {
    await client.query("ROLLBACK");
  } catch (_err) {
    // ignore rollback failure and preserve original error
  }
}

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
    directors_id: rawDirectorsId,
    number_rating = 0,
    rating = 0,
    title,
    synopsis,
    duration,
  } = req.body;

  const directors_id = normalizeIds(rawDirectorsId).map(Number);
  const numericReleaseYear = Number(release_year);
  const numericContentRatingId = Number(content_rating_id);
  const numericDuration = Number(duration);

  if (
    !isPositiveInteger(numericReleaseYear) ||
    !isPositiveInteger(numericContentRatingId) ||
    directors_id.length === 0 ||
    !title ||
    !synopsis ||
    !isPositiveInteger(numericDuration)
  ) {
    return badRequest(
      res,
      "Campos obrigatórios: release_year, content_rating_id, directors_id[], title, synopsis, duration.",
    );
  }

  if (directors_id.some((id) => !isPositiveInteger(id))) {
    return badRequest(
      res,
      "directors_id deve conter ids válidos e maiores que zero.",
    );
  }

  if (!req.file) {
    return badRequest(
      res,
      'Arquivo de mídia obrigatório: envie o campo "media".',
    );
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
      [
        release_year,
        content_rating_id,
        directors_id,
        number_rating,
        rating,
        duration,
        title,
        synopsis,
      ],
    );

    const mediaPath = getRelativeMediaPath(req.file?.path);
    const response = { message: `Filme "${title}" inserido com sucesso.` };
    if (mediaPath) response.media_path = mediaPath;

    return res.status(201).json(response);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ─────────────────────────────────────────────
//  ATUALIZAÇÃO E EXCLUSÃO (SQL no JS)
// ─────────────────────────────────────────────

async function updateMovie(req, res) {
  const movie_id = req.params.id || req.body.movie_id;
  if (!isPositiveInteger(movie_id))
    return badRequest(
      res,
      "movie_id é obrigatório e deve ser um inteiro maior que zero.",
    );
  const allowed = [
    "title",
    "release_year",
    "duration",
    "synopsis",
    "rating",
    "content_rating_id",
  ];
  const fields = [];
  const values = [];
  let idx = 1;
  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      fields.push(
        `${k === "content_rating_id" ? "content_rating_id" : k} = $${idx++}`,
      );
      values.push(req.body[k]);
    }
  }
  if (fields.length === 0)
    return badRequest(res, "Nenhum campo para atualizar.");
  values.push(movie_id);
  const sql = `UPDATE movies SET ${fields.join(", ")} WHERE movie_id = $${idx}`;
  try {
    await pool.query(sql, values);
    const mediaPath = getRelativeMediaPath(req.file?.path);
    const response = { message: "Filme atualizado com sucesso." };
    if (mediaPath) response.media_path = mediaPath;
    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function deleteMovie(req, res) {
  const id = req.params.id || req.body.id || req.body.movie_id || req.query.id;
  if (!isPositiveInteger(id))
    return badRequest(
      res,
      "movie_id é obrigatório no path, body ou query e deve ser um inteiro maior que zero.",
    );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM directors_movies WHERE movie_id = $1", [
      id,
    ]);
    await client.query("DELETE FROM movie_genres WHERE movie_id = $1", [id]);
    await client.query("DELETE FROM movie_cast WHERE movie_id = $1", [id]);
    await client.query("DELETE FROM reviews WHERE movie_id = $1", [id]);
    await client.query("DELETE FROM favorites WHERE movie_id = $1", [id]);
    await client.query("DELETE FROM watch_history WHERE movie_id = $1", [id]);
    await client.query("DELETE FROM movies WHERE movie_id = $1", [id]);
    await client.query("COMMIT");
    return res.status(200).json({ message: "Filme removido com sucesso." });
  } catch (err) {
    await rollbackClient(client);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

async function updateSerie(req, res) {
  const serie_id = req.params.id || req.body.serie_id;
  if (!isPositiveInteger(serie_id))
    return badRequest(
      res,
      "serie_id é obrigatório e deve ser um inteiro maior que zero.",
    );
  const allowed = [
    "title",
    "release_year",
    "rating",
    "synopsis",
    "is_finished",
    "content_rating_id",
  ];
  const fields = [];
  const values = [];
  let idx = 1;
  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      fields.push(`${k} = $${idx++}`);
      values.push(req.body[k]);
    }
  }
  if (fields.length === 0)
    return badRequest(res, "Nenhum campo para atualizar.");
  values.push(serie_id);
  const sql = `UPDATE series SET ${fields.join(", ")} WHERE serie_id = $${idx}`;
  try {
    await pool.query(sql, values);
    return res.status(200).json({ message: "Série atualizada com sucesso." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function deleteSerie(req, res) {
  const id = req.params.id || req.body.id || req.body.serie_id || req.query.id;
  if (!isPositiveInteger(id))
    return badRequest(
      res,
      "serie_id é obrigatório no path, body ou query e deve ser um inteiro maior que zero.",
    );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM serie_genres WHERE serie_id = $1", [id]);
    await client.query("DELETE FROM favorites WHERE serie_id = $1", [id]);
    const seasonsRes = await client.query(
      "SELECT season_id FROM seasons WHERE serie_id = $1",
      [id],
    );
    const seasonIds = seasonsRes.rows.map((r) => r.season_id);
    if (seasonIds.length > 0) {
      await client.query(
        "DELETE FROM episode_cast WHERE episode_id IN (SELECT episode_id FROM episodes WHERE season_id = ANY($1::int[]))",
        [seasonIds],
      );
      await client.query(
        "DELETE FROM reviews WHERE episode_id IN (SELECT episode_id FROM episodes WHERE season_id = ANY($1::int[]))",
        [seasonIds],
      );
      await client.query(
        "DELETE FROM watch_history WHERE episode_id IN (SELECT episode_id FROM episodes WHERE season_id = ANY($1::int[]))",
        [seasonIds],
      );
      await client.query(
        "DELETE FROM episodes WHERE season_id = ANY($1::int[])",
        [seasonIds],
      );
      await client.query(
        "DELETE FROM seasons WHERE season_id = ANY($1::int[])",
        [seasonIds],
      );
    }
    await client.query("DELETE FROM series WHERE serie_id = $1", [id]);
    await client.query("COMMIT");
    return res.status(200).json({ message: "Série removida com sucesso." });
  } catch (err) {
    await rollbackClient(client);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

async function updateEpisode(req, res) {
  const episode_id = req.params.id || req.body.episode_id;
  if (!isPositiveInteger(episode_id))
    return badRequest(
      res,
      "episode_id é obrigatório e deve ser um inteiro maior que zero.",
    );
  const allowed = ["title", "episode_number", "duration", "synopsis", "rating"];
  const fields = [];
  const values = [];
  let idx = 1;
  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      fields.push(`${k} = $${idx++}`);
      values.push(req.body[k]);
    }
  }
  if (fields.length === 0)
    return badRequest(res, "Nenhum campo para atualizar.");
  values.push(episode_id);
  const sql = `UPDATE episodes SET ${fields.join(", ")} WHERE episode_id = $${idx}`;
  try {
    await pool.query(sql, values);
    const mediaPath = getRelativeMediaPath(req.file?.path);
    const response = { message: "Episódio atualizado com sucesso." };
    if (mediaPath) response.media_path = mediaPath;
    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function deleteEpisode(req, res) {
  const id =
    req.params.id || req.body.id || req.body.episode_id || req.query.id;
  if (!isPositiveInteger(id))
    return badRequest(
      res,
      "episode_id é obrigatório no path, body ou query e deve ser um inteiro maior que zero.",
    );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM directors_episodes WHERE episode_id = $1", [
      id,
    ]);
    await client.query("DELETE FROM episode_cast WHERE episode_id = $1", [id]);
    await client.query("DELETE FROM reviews WHERE episode_id = $1", [id]);
    await client.query("DELETE FROM favorites WHERE episode_id = $1", [id]);
    await client.query("DELETE FROM watch_history WHERE episode_id = $1", [id]);
    await client.query("DELETE FROM episodes WHERE episode_id = $1", [id]);
    await client.query("COMMIT");
    return res.status(200).json({ message: "Episódio removido com sucesso." });
  } catch (err) {
    await rollbackClient(client);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
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

  const numericReleaseYear = Number(release_year);
  const numericContentRatingId = Number(content_rating_id);

  if (
    !isPositiveInteger(numericReleaseYear) ||
    !isPositiveInteger(numericContentRatingId) ||
    !title ||
    !synopsis
  ) {
    return badRequest(
      res,
      "Campos obrigatórios: release_year, content_rating_id, title, synopsis.",
    );
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
      [release_year, content_rating_id, rating, title, synopsis],
    );

    return res
      .status(201)
      .json({ message: `Série "${title}" inserida com sucesso.` });
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
    directors_id: rawDirectorsId,
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

  const directors_id = normalizeIds(rawDirectorsId).map(Number);
  const numericReleaseYear = Number(release_year);
  const numericContentRatingId = Number(content_rating_id);
  const numericDuration = Number(duration);
  const numericSeasonNumber = Number(season_number);
  const numericSerieId =
    serie_id === null || serie_id === undefined ? null : Number(serie_id);

  if (
    !isPositiveInteger(numericReleaseYear) ||
    !isPositiveInteger(numericContentRatingId) ||
    directors_id.length === 0 ||
    !isPositiveInteger(numericDuration) ||
    !episode_title ||
    !episode_synopsis ||
    !isPositiveInteger(numericSeasonNumber)
  ) {
    return badRequest(
      res,
      "Campos obrigatórios: release_year, content_rating_id, directors_id[], duration, episode_title, episode_synopsis, season_number.",
    );
  }

  if (directors_id.some((id) => !isPositiveInteger(id))) {
    return badRequest(
      res,
      "directors_id deve conter ids válidos e maiores que zero.",
    );
  }

  if (!req.file) {
    return badRequest(
      res,
      'Arquivo de mídia obrigatório: envie o campo "media".',
    );
  }

  if (numericSerieId !== null && !isPositiveInteger(numericSerieId)) {
    return badRequest(
      res,
      "serie_id deve ser um inteiro válido quando informado.",
    );
  }

  if (numericSerieId === null && (!serie_title || !serie_synopsis)) {
    return badRequest(
      res,
      "Informe serie_id de uma série existente ou os campos serie_title e serie_synopsis para criar uma nova.",
    );
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
        release_year,
        content_rating_id,
        directors_id,
        number_rating,
        rating,
        serie_id,
        duration,
        episode_title,
        episode_synopsis,
        serie_title,
        serie_synopsis,
        season_number,
      ],
    );

    const mediaPath = getRelativeMediaPath(req.file?.path);
    const response = {
      message: `Episódio "${episode_title}" inserido com sucesso.`,
    };
    if (mediaPath) response.media_path = mediaPath;

    return res.status(201).json(response);
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

  const numericContentId = Number(content_id);

  if (
    !content_type ||
    !isPositiveInteger(numericContentId) ||
    !Array.isArray(genre_ids) ||
    genre_ids.length === 0
  ) {
    return badRequest(
      res,
      "Campos obrigatórios: content_type, content_id, genre_ids[].",
    );
  }

  try {
    await pool.query(`SELECT fn_insert_content_genres($1, $2, $3)`, [
      content_type,
      content_id,
      genre_ids,
    ]);

    return res.status(201).json({ message: "Gêneros vinculados com sucesso." });
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

  const numericContentId = Number(content_id);

  if (
    !content_type ||
    !isPositiveInteger(numericContentId) ||
    !Array.isArray(actor_ids) ||
    actor_ids.length === 0 ||
    !Array.isArray(character_names) ||
    character_names.length === 0
  ) {
    return badRequest(
      res,
      "Campos obrigatórios: content_type, content_id, actor_ids[], character_names[].",
    );
  }

  if (!actor_ids.every(isPositiveInteger)) {
    return badRequest(
      res,
      "actor_ids deve conter ids válidos e maiores que zero.",
    );
  }

  if (actor_ids.length !== character_names.length) {
    return badRequest(res, {
      error: "actor_ids e character_names devem ter o mesmo tamanho.",
    });
  }

  try {
    await pool.query(`SELECT fn_insert_content_cast($1, $2, $3, $4)`, [
      content_type,
      content_id,
      actor_ids,
      character_names,
    ]);

    return res.status(201).json({ message: "Elenco vinculado com sucesso." });
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

  const numericContentId = Number(content_id);

  if (
    !content_type ||
    !isPositiveInteger(numericContentId) ||
    !Array.isArray(directors_ids) ||
    directors_ids.length === 0
  ) {
    return badRequest(
      res,
      "Campos obrigatórios: content_type, content_id, directors_ids[].",
    );
  }

  if (!directors_ids.every(isPositiveInteger)) {
    return badRequest(
      res,
      "directors_ids deve conter ids válidos e maiores que zero.",
    );
  }

  try {
    await pool.query(`SELECT fn_insert_content_directors($1, $2, $3)`, [
      content_type,
      content_id,
      directors_ids,
    ]);

    return res
      .status(201)
      .json({ message: "Diretor(es) vinculado(s) ao conteúdo com sucesso." });
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
  updateMovie,
  deleteMovie,
  updateSerie,
  deleteSerie,
  updateEpisode,
  deleteEpisode,
};
