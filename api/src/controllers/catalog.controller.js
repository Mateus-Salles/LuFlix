const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { exec } = require("child_process");
const { setMediaPath } = require("../utils/manifest");

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
    actors_id: rawActorsId,
    genres_id: rawGenresId,
    number_rating = 0,
    rating = 0,
    title,
    synopsis,
    duration,
    media_path,
    thumb_path: rawThumbPath,
    extracted_thumb_path,
  } = req.body;

  const directors_id = normalizeIds(rawDirectorsId).map(Number);
  const actors_id = normalizeIds(rawActorsId).map(Number);
  const genres_id = normalizeIds(rawGenresId).map(Number);
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

  if (actors_id.some((id) => !isPositiveInteger(id))) {
    return badRequest(
      res,
      "actors_id deve conter ids válidos e maiores que zero.",
    );
  }

  if (genres_id.some((id) => !isPositiveInteger(id))) {
    return badRequest(
      res,
      "genres_id deve conter ids válidos e maiores que zero.",
    );
  }

  const mediaFile = req.files && req.files['media'] ? req.files['media'][0] : null;
  const thumbFile = req.files && req.files['thumb'] ? req.files['thumb'][0] : null;

  if (!mediaFile && !media_path) {
    return badRequest(
      res,
      'Arquivo de mídia obrigatório: envie o campo "media" ou envie "media_path".',
    );
  }

  try {
    let finalPlaylistPath = '';
    if (mediaFile) {
      const originalPath = mediaFile.path;
      const ext = path.extname(originalPath);
      const outputDirName = `${path.basename(originalPath, ext)}-hls`;
      const outputDir = path.join(path.dirname(originalPath), outputDirName);
      finalPlaylistPath = path.join(outputDir, "index.m3u8");

      // Frame extraction if no custom thumb is provided
      if (!thumbFile && !extracted_thumb_path && !rawThumbPath) {
        try {
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          const extractedPath = path.join(outputDir, "thumb.jpg");
          await extractMiddleFrame(originalPath, extractedPath);
          req.body.extracted_thumb_path = getRelativeMediaPath(extractedPath);
        } catch (errFrame) {
          console.error("[Movie] Erro ao extrair frame do vídeo:", errFrame.message);
        }
      }

      console.log(`[Movie] Convertendo arquivo enviado diretamente para HLS: ${originalPath}`);
      await convertToHLS(originalPath, finalPlaylistPath);
      try {
        fs.unlinkSync(originalPath);
      } catch (e) {
        console.warn(`[Movie] Erro ao deletar arquivo temporário original:`, e.message);
      }
    }

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

    const mediaPath = mediaFile ? getRelativeMediaPath(finalPlaylistPath) : media_path;
    
    let resolvedThumbPath = null;
    if (thumbFile) {
      resolvedThumbPath = getRelativeMediaPath(thumbFile.path);
    } else if (extracted_thumb_path) {
      resolvedThumbPath = extracted_thumb_path;
    } else if (req.body.extracted_thumb_path) {
      resolvedThumbPath = req.body.extracted_thumb_path;
    } else if (rawThumbPath) {
      resolvedThumbPath = rawThumbPath;
    }

    let insertedId = null;
    try {
      const movieResult = await pool.query('SELECT movie_id FROM movies WHERE title = $1', [title]);
      insertedId = movieResult.rows[0]?.movie_id;
    } catch (errDb) {
      console.error("Erro ao obter id do filme inserido:", errDb.message);
    }

    if (insertedId) {
      if (actors_id.length > 0) {
        try {
          await pool.query(
            `INSERT INTO "movie_cast" (movie_id, actor_id)
             SELECT $1, actor_id FROM UNNEST($2::int[]) AS actors_data(actor_id)
             ON CONFLICT DO NOTHING`,
            [insertedId, actors_id]
          );
        } catch (errActors) {
          console.error("Erro ao vincular atores ao filme:", errActors.message);
        }
      }

      if (genres_id.length > 0) {
        try {
          await pool.query(
            `INSERT INTO "movie_genres" (movie_id, genre_id)
             SELECT $1, genre_id FROM UNNEST($2::int[]) AS genres_data(genre_id)
             ON CONFLICT DO NOTHING`,
            [insertedId, genres_id]
          );
        } catch (errGen) {
          console.error("Erro ao vincular gêneros ao filme:", errGen.message);
        }
      }

      if (mediaPath || resolvedThumbPath) {
        try {
          const { setMediaEntry } = require('../utils/manifest');
          setMediaEntry('movies', insertedId, mediaPath, resolvedThumbPath);
        } catch (errDb) {
          console.error("Erro ao persistir media_path/thumb_path no manifesto de filme:", errDb.message);
        }
      }
    }

    const response = { message: `Filme "${title}" inserido com sucesso.` };
    if (mediaPath) response.media_path = mediaPath;
    if (resolvedThumbPath) response.thumb_path = resolvedThumbPath;

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
  
  const directors_id = req.body.directors_id !== undefined ? normalizeIds(req.body.directors_id).map(Number) : null;
  const actors_id = req.body.actors_id !== undefined ? normalizeIds(req.body.actors_id).map(Number) : null;
  const genres_id = req.body.genres_id !== undefined ? normalizeIds(req.body.genres_id).map(Number) : null;

  if (directors_id && directors_id.some((id) => !isPositiveInteger(id))) {
    return badRequest(res, "directors_id deve conter ids válidos.");
  }
  if (actors_id && actors_id.some((id) => !isPositiveInteger(id))) {
    return badRequest(res, "actors_id deve conter ids válidos.");
  }
  if (genres_id && genres_id.some((id) => !isPositiveInteger(id))) {
    return badRequest(res, "genres_id deve conter ids válidos.");
  }

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
  if (
    fields.length === 0 &&
    !req.file &&
    !req.body.media_path &&
    directors_id === null &&
    actors_id === null &&
    genres_id === null
  ) {
    return badRequest(res, "Nenhum campo para atualizar.");
  }
  
  try {
    if (fields.length > 0) {
      values.push(movie_id);
      const sql = `UPDATE movies SET ${fields.join(", ")} WHERE movie_id = $${idx}`;
      await pool.query(sql, values);
    }

    if (directors_id !== null) {
      await pool.query('DELETE FROM "directors_movies" WHERE movie_id = $1', [movie_id]);
      if (directors_id.length > 0) {
        await pool.query(
          `INSERT INTO "directors_movies" (movie_id, director_id)
           SELECT $1, director_id FROM UNNEST($2::int[]) AS directors_data(director_id)
           ON CONFLICT DO NOTHING`,
          [movie_id, directors_id]
        );
      }
    }

    if (actors_id !== null) {
      await pool.query('DELETE FROM "movie_cast" WHERE movie_id = $1', [movie_id]);
      if (actors_id.length > 0) {
        await pool.query(
          `INSERT INTO "movie_cast" (movie_id, actor_id)
           SELECT $1, actor_id FROM UNNEST($2::int[]) AS actors_data(actor_id)
           ON CONFLICT DO NOTHING`,
          [movie_id, actors_id]
        );
      }
    }

    if (genres_id !== null) {
      await pool.query('DELETE FROM "movie_genres" WHERE movie_id = $1', [movie_id]);
      if (genres_id.length > 0) {
        await pool.query(
          `INSERT INTO "movie_genres" (movie_id, genre_id)
           SELECT $1, genre_id FROM UNNEST($2::int[]) AS genres_data(genre_id)
           ON CONFLICT DO NOTHING`,
          [movie_id, genres_id]
        );
      }
    }
    
    if (req.file) {
      const originalPath = req.file.path;
      const ext = path.extname(originalPath);
      const outputDirName = `${path.basename(originalPath, ext)}-hls`;
      const outputDir = path.join(path.dirname(originalPath), outputDirName);
      const playlistPath = path.join(outputDir, "index.m3u8");
      console.log(`[Movie Update] Convertendo arquivo enviado diretamente para HLS: ${originalPath}`);
      await convertToHLS(originalPath, playlistPath);
      try {
        fs.unlinkSync(originalPath);
      } catch (e) {
        console.warn(`[Movie Update] Erro ao deletar arquivo temporário original:`, e.message);
      }
      req.file.path = playlistPath;
    }

    const mediaPath = req.file ? getRelativeMediaPath(req.file.path) : req.body.media_path;
    
    if (mediaPath) {
      setMediaPath('movies', movie_id, mediaPath);
    }

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

  const genres_id = req.body.genres_id !== undefined ? normalizeIds(req.body.genres_id).map(Number) : null;

  if (genres_id && genres_id.some((id) => !isPositiveInteger(id))) {
    return badRequest(res, "genres_id deve conter ids válidos.");
  }

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

  if (fields.length === 0 && genres_id === null)
    return badRequest(res, "Nenhum campo para atualizar.");

  try {
    if (fields.length > 0) {
      values.push(serie_id);
      const sql = `UPDATE series SET ${fields.join(", ")} WHERE serie_id = $${idx}`;
      await pool.query(sql, values);
    }

    if (genres_id !== null) {
      await pool.query('DELETE FROM "serie_genres" WHERE serie_id = $1', [serie_id]);
      if (genres_id.length > 0) {
        await pool.query(
          `INSERT INTO "serie_genres" (serie_id, genre_id)
           SELECT $1, genre_id FROM UNNEST($2::int[]) AS genres_data(genre_id)
           ON CONFLICT DO NOTHING`,
          [serie_id, genres_id]
        );
      }
    }

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
  
  const directors_id = req.body.directors_id !== undefined ? normalizeIds(req.body.directors_id).map(Number) : null;
  const actors_id = req.body.actors_id !== undefined ? normalizeIds(req.body.actors_id).map(Number) : null;

  if (directors_id && directors_id.some((id) => !isPositiveInteger(id))) {
    return badRequest(res, "directors_id deve conter ids válidos.");
  }
  if (actors_id && actors_id.some((id) => !isPositiveInteger(id))) {
    return badRequest(res, "actors_id deve conter ids válidos.");
  }

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
  if (
    fields.length === 0 &&
    !req.file &&
    !req.body.media_path &&
    directors_id === null &&
    actors_id === null
  ) {
    return badRequest(res, "Nenhum campo para atualizar.");
  }
  
  try {
    if (fields.length > 0) {
      values.push(episode_id);
      const sql = `UPDATE episodes SET ${fields.join(", ")} WHERE episode_id = $${idx}`;
      await pool.query(sql, values);
    }

    if (directors_id !== null) {
      await pool.query('DELETE FROM "directors_episodes" WHERE episode_id = $1', [episode_id]);
      if (directors_id.length > 0) {
        await pool.query(
          `INSERT INTO "directors_episodes" (episode_id, director_id)
           SELECT $1, director_id FROM UNNEST($2::int[]) AS directors_data(director_id)
           ON CONFLICT DO NOTHING`,
          [episode_id, directors_id]
        );
      }
    }

    if (actors_id !== null) {
      await pool.query('DELETE FROM "episode_cast" WHERE episode_id = $1', [episode_id]);
      if (actors_id.length > 0) {
        await pool.query(
          `INSERT INTO "episode_cast" (episode_id, actor_id)
           SELECT $1, actor_id FROM UNNEST($2::int[]) AS actors_data(actor_id)
           ON CONFLICT DO NOTHING`,
          [episode_id, actors_id]
        );
      }
    }
    
    if (req.file) {
      const originalPath = req.file.path;
      const ext = path.extname(originalPath);
      const outputDirName = `${path.basename(originalPath, ext)}-hls`;
      const outputDir = path.join(path.dirname(originalPath), outputDirName);
      const playlistPath = path.join(outputDir, "index.m3u8");
      console.log(`[Episode Update] Convertendo arquivo enviado diretamente para HLS: ${originalPath}`);
      await convertToHLS(originalPath, playlistPath);
      try {
        fs.unlinkSync(originalPath);
      } catch (e) {
        console.warn(`[Episode Update] Erro ao deletar arquivo temporário original:`, e.message);
      }
      req.file.path = playlistPath;
    }

    const mediaPath = req.file ? getRelativeMediaPath(req.file.path) : req.body.media_path;
    
    if (mediaPath) {
      setMediaPath('episodes', episode_id, mediaPath);
    }

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
    genres_id: rawGenresId,
    rating = 0,
    title,
    synopsis,
  } = req.body;

  const genres_id = normalizeIds(rawGenresId).map(Number);
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

  if (genres_id.some((id) => !isPositiveInteger(id))) {
    return badRequest(
      res,
      "genres_id deve conter ids válidos e maiores que zero.",
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

    let insertedSerieId = null;
    try {
      const seriesResult = await pool.query(
        'SELECT serie_id FROM series WHERE title = $1 ORDER BY serie_id DESC LIMIT 1',
        [title]
      );
      insertedSerieId = seriesResult.rows[0]?.serie_id;
    } catch (errDb) {
      console.error("Erro ao obter id da série inserida:", errDb.message);
    }

    if (insertedSerieId && genres_id.length > 0) {
      try {
        await pool.query(
          `INSERT INTO "serie_genres" (serie_id, genre_id)
           SELECT $1, genre_id FROM UNNEST($2::int[]) AS genres_data(genre_id)
           ON CONFLICT DO NOTHING`,
          [insertedSerieId, genres_id]
        );
      } catch (errGen) {
        console.error("Erro ao vincular gêneros à série:", errGen.message);
      }
    }

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
    actors_id: rawActorsId,
    genres_id: rawGenresId,
    number_rating = 0,
    rating = 0,
    serie_id = null,
    duration,
    episode_title,
    episode_synopsis,
    serie_title = null,
    serie_synopsis = null,
    season_number,
    media_path,
    thumb_path: rawThumbPath,
    extracted_thumb_path,
    serie_thumb_path,
  } = req.body;

  const directors_id = normalizeIds(rawDirectorsId).map(Number);
  const actors_id = normalizeIds(rawActorsId).map(Number);
  const genres_id = normalizeIds(rawGenresId).map(Number);
  const numericReleaseYear = Number(release_year);
  const numericContentRatingId = Number(content_rating_id);
  const numericDuration = Number(duration);
  const numericSeasonNumber = Number(season_number);
  const numericSerieId =
    serie_id === null || serie_id === undefined || serie_id === "" ? null : Number(serie_id);

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

  if (actors_id.some((id) => !isPositiveInteger(id))) {
    return badRequest(
      res,
      "actors_id deve conter ids válidos e maiores que zero.",
    );
  }

  if (genres_id.some((id) => !isPositiveInteger(id))) {
    return badRequest(
      res,
      "genres_id deve conter ids válidos e maiores que zero.",
    );
  }

  const mediaFile = req.files && req.files['media'] ? req.files['media'][0] : null;
  const thumbFile = req.files && req.files['thumb'] ? req.files['thumb'][0] : null;
  const serieThumbFile = req.files && req.files['serie_thumb'] ? req.files['serie_thumb'][0] : null;

  if (!mediaFile && !media_path) {
    return badRequest(
      res,
      'Arquivo de mídia obrigatório: envie o campo "media" ou envie "media_path".',
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

  // Validate that series thumbnail is provided for a new series
  if (numericSerieId === null && !serieThumbFile && !serie_thumb_path) {
    return badRequest(
      res,
      "A imagem de miniatura da série é obrigatória para novas séries.",
    );
  }

  try {
    let finalPlaylistPath = '';
    if (mediaFile) {
      const originalPath = mediaFile.path;
      const ext = path.extname(originalPath);
      const outputDirName = `${path.basename(originalPath, ext)}-hls`;
      const outputDir = path.join(path.dirname(originalPath), outputDirName);
      finalPlaylistPath = path.join(outputDir, "index.m3u8");

      // Extract middle frame as thumbnail fallback
      if (!thumbFile && !extracted_thumb_path && !rawThumbPath) {
        try {
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          const extractedPath = path.join(outputDir, "thumb.jpg");
          await extractMiddleFrame(originalPath, extractedPath);
          req.body.extracted_thumb_path = getRelativeMediaPath(extractedPath);
        } catch (errFrame) {
          console.error("[Episode] Erro ao extrair frame do vídeo:", errFrame.message);
        }
      }

      console.log(`[Episode] Convertendo arquivo enviado diretamente para HLS: ${originalPath}`);
      await convertToHLS(originalPath, finalPlaylistPath);
      try {
        fs.unlinkSync(originalPath);
      } catch (e) {
        console.warn(`[Episode] Erro ao deletar arquivo temporário original:`, e.message);
      }
    }

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
        numericSerieId,
        duration,
        episode_title,
        episode_synopsis,
        serie_title,
        serie_synopsis,
        season_number,
      ],
    );

    const { setMediaEntry } = require('../utils/manifest');

    // If new series was created, set series thumbnail in manifest and associate genres
    if (numericSerieId === null) {
      try {
        const seriesResult = await pool.query(
          'SELECT serie_id FROM series WHERE title = $1 ORDER BY serie_id DESC LIMIT 1',
          [serie_title]
        );
        const insertedSerieId = seriesResult.rows[0]?.serie_id;
        const resolvedSerieThumbPath = serieThumbFile ? getRelativeMediaPath(serieThumbFile.path) : serie_thumb_path;
        if (insertedSerieId) {
          if (resolvedSerieThumbPath) {
            setMediaEntry('series', insertedSerieId, null, resolvedSerieThumbPath);
          }
          if (genres_id.length > 0) {
            await pool.query(
              `INSERT INTO "serie_genres" (serie_id, genre_id)
               SELECT $1, genre_id FROM UNNEST($2::int[]) AS genres_data(genre_id)
               ON CONFLICT DO NOTHING`,
              [insertedSerieId, genres_id]
            );
          }
        }
      } catch (errSerDb) {
        console.error("Erro ao persistir miniatura/gêneros no manifesto de série:", errSerDb.message);
      }
    }

    // Set episode media and thumbnail in manifest
    const mediaPath = mediaFile ? getRelativeMediaPath(finalPlaylistPath) : media_path;
    
    let resolvedThumbPath = null;
    if (thumbFile) {
      resolvedThumbPath = getRelativeMediaPath(thumbFile.path);
    } else if (extracted_thumb_path) {
      resolvedThumbPath = extracted_thumb_path;
    } else if (req.body.extracted_thumb_path) {
      resolvedThumbPath = req.body.extracted_thumb_path;
    } else if (rawThumbPath) {
      resolvedThumbPath = rawThumbPath;
    }

    let insertedId = null;
    try {
      const epResult = await pool.query(
        'SELECT episode_id FROM episodes WHERE title = $1 ORDER BY episode_id DESC LIMIT 1',
        [episode_title]
      );
      insertedId = epResult.rows[0]?.episode_id;
    } catch (errDb) {
      console.error("Erro ao obter id do episódio inserido:", errDb.message);
    }

    if (insertedId) {
      if (actors_id.length > 0) {
        try {
          await pool.query(
            `INSERT INTO "episode_cast" (episode_id, actor_id)
             SELECT $1, actor_id FROM UNNEST($2::int[]) AS actors_data(actor_id)
             ON CONFLICT DO NOTHING`,
            [insertedId, actors_id]
          );
        } catch (errActors) {
          console.error("Erro ao vincular atores ao episódio:", errActors.message);
        }
      }

      if (mediaPath || resolvedThumbPath) {
        try {
          setMediaEntry('episodes', insertedId, mediaPath, resolvedThumbPath);
        } catch (errDb) {
          console.error("Erro ao persistir media_path/thumb_path no manifesto de episódio:", errDb.message);
        }
      }
    }

    const response = {
      message: `Episódio "${episode_title}" inserido com sucesso.`,
    };
    if (mediaPath) response.media_path = mediaPath;
    if (resolvedThumbPath) response.thumb_path = resolvedThumbPath;

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

function getFFmpegPath() {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\mateu', 'AppData', 'Local');
  const wingetPackagesDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
  
  if (fs.existsSync(wingetPackagesDir)) {
    try {
      const packages = fs.readdirSync(wingetPackagesDir);
      for (const pkg of packages) {
        if (pkg.includes('Gyan.FFmpeg')) {
          const pkgPath = path.join(wingetPackagesDir, pkg);
          const subdirs = fs.readdirSync(pkgPath);
          for (const subdir of subdirs) {
            if (subdir.startsWith('ffmpeg-')) {
              const ffmpegExe = path.join(pkgPath, subdir, 'bin', 'ffmpeg.exe');
              if (fs.existsSync(ffmpegExe)) {
                return `"${ffmpegExe}"`;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar ffmpeg nas pastas do WinGet:", e.message);
    }
  }
  return 'ffmpeg';
}

function getFFprobePath() {
  const ffmpeg = getFFmpegPath();
  if (ffmpeg.includes('ffmpeg.exe')) {
    const unquoted = ffmpeg.replace(/^"|"$/g, '');
    const ffprobe = unquoted.replace('ffmpeg.exe', 'ffprobe.exe');
    return `"${ffprobe}"`;
  }
  return 'ffprobe';
}

function getVideoDuration(videoPath) {
  return new Promise((resolve) => {
    const ffprobe = getFFprobePath();
    const safePath = videoPath.replace(/\\/g, "/");
    const cmd = `${ffprobe} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${safePath}"`;
    console.log(`[FFprobe] Buscando duração do vídeo: ${cmd}`);
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.warn(`[FFprobe] Erro ao obter duração:`, err.message);
        resolve(0);
      } else {
        const duration = parseFloat(stdout.trim());
        resolve(isNaN(duration) ? 0 : duration);
      }
    });
  });
}

function extractMiddleFrame(videoPath, outputImagePath) {
  return new Promise(async (resolve, reject) => {
    try {
      const duration = await getVideoDuration(videoPath);
      const middleTime = duration > 0 ? duration / 2 : 1;
      const ffmpeg = getFFmpegPath();
      const safeVideoPath = videoPath.replace(/\\/g, "/");
      const safeOutputPath = outputImagePath.replace(/\\/g, "/");
      
      const cmd = `${ffmpeg} -y -ss ${middleTime} -i "${safeVideoPath}" -vframes 1 -q:v 2 "${safeOutputPath}"`;
      console.log(`[FFmpeg] Extraindo frame do meio (tempo: ${middleTime}s): ${cmd}`);
      
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          console.error(`[FFmpeg] Falha ao extrair frame. Erro:`, err.message);
          // Don't completely fail, but log it
          resolve();
        } else {
          console.log(`[FFmpeg] Frame extraído com sucesso em: ${outputImagePath}`);
          resolve();
        }
      });
    } catch (e) {
      console.error(`[FFmpeg] Exceção durante extração de frame:`, e.message);
      resolve();
    }
  });
}

function convertToHLS(inputPath, outputPlaylistPath) {
  return new Promise((resolve, reject) => {
    const ffmpeg = getFFmpegPath();
    const outputDir = path.dirname(outputPlaylistPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const segmentFilename = path.join(outputDir, "segment_%03d.ts").replace(/\\/g, "/");
    const safeOutputPlaylistPath = outputPlaylistPath.replace(/\\/g, "/");
    const safeInputPath = inputPath.replace(/\\/g, "/");

    const cmdNvenc = `${ffmpeg} -y -i "${safeInputPath}" -c:v hevc_nvenc -preset fast -c:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${segmentFilename}" "${safeOutputPlaylistPath}"`;
    console.log(`[FFmpeg] Executando conversão HLS NVENC: ${cmdNvenc}`);
    
    exec(cmdNvenc, (err, stdout, stderr) => {
      if (err) {
        console.warn(`[FFmpeg] HLS NVENC falhou, realizando fallback para CPU. Detalhe:`, err.message);
        const cmdCpu = `${ffmpeg} -y -i "${safeInputPath}" -c:v libx265 -preset ultrafast -c:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${segmentFilename}" "${safeOutputPlaylistPath}"`;
        console.log(`[FFmpeg] Executando conversão HLS CPU: ${cmdCpu}`);
        
        exec(cmdCpu, (errCpu, stdoutCpu, stderrCpu) => {
          if (errCpu) {
            console.error(`[FFmpeg] Conversão HLS CPU também falhou. Erro:`, errCpu.message);
            reject(errCpu);
          } else {
            console.log(`[FFmpeg] Conversão HLS CPU finalizada com sucesso.`);
            resolve();
          }
        });
      } else {
        console.log(`[FFmpeg] Conversão HLS NVENC finalizada com sucesso.`);
        resolve();
      }
    });
  });
}

// Wrapper for backwards compatibility
function compressVideo(inputPath, outputPath) {
  let finalPlaylistPath = outputPath;
  if (outputPath.endsWith(".mp4")) {
    const ext = path.extname(outputPath);
    const outputDirName = `${path.basename(outputPath, ext)}-hls`;
    const outputDir = path.join(path.dirname(outputPath), outputDirName);
    finalPlaylistPath = path.join(outputDir, "index.m3u8");
  }
  return convertToHLS(inputPath, finalPlaylistPath);
}

async function handleUploadChunk(req, res) {
  const { uploadId, chunkIndex, totalChunks, filename, type } = req.body;

  if (!uploadId || chunkIndex === undefined || !totalChunks || !filename) {
    return res.status(400).json({ error: "Parâmetros de fatia ausentes (uploadId, chunkIndex, totalChunks, filename)." });
  }

  const chunkIdx = Number(chunkIndex);
  const total = Number(totalChunks);

  try {
    const chunkUploadDir = path.resolve(__dirname, "../../uploads/chunks");
    
    const allChunksPresent = [];
    for (let i = 0; i < total; i++) {
      const chunkPath = path.join(chunkUploadDir, `${uploadId}_${i}`);
      if (fs.existsSync(chunkPath)) {
        allChunksPresent.push(chunkPath);
      }
    }

    if (allChunksPresent.length === total) {
      const contentType = type === "episodes" ? "episodes" : "movies";
      const destDir = path.resolve(__dirname, `../../uploads/${contentType}`);
      
      const ext = path.extname(filename) || ".mp4";
      const finalFileName = `${Date.now()}-${uploadId}`;
      const tempMergedPath = path.join(destDir, `temp-${finalFileName}${ext}`);
      
      const outputDirName = `${finalFileName}-hls`;
      const outputDir = path.join(destDir, outputDirName);
      const finalPlaylistPath = path.join(outputDir, "index.m3u8");

      console.log(`[Upload] Iniciando junção de ${total} fatias para o arquivo: ${tempMergedPath}`);
      
      const writeStream = fs.createWriteStream(tempMergedPath);
      for (const chunkPath of allChunksPresent) {
        const data = fs.readFileSync(chunkPath);
        writeStream.write(data);
      }
      writeStream.end();

      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      console.log(`[Upload] Junção concluída. Excluindo fatias temporárias...`);
      for (const chunkPath of allChunksPresent) {
        try {
          fs.unlinkSync(chunkPath);
        } catch (e) {
          console.warn(`[Upload] Não foi possível excluir a fatia ${chunkPath}:`, e.message);
        }
      }

      console.log(`[Upload] Iniciando conversão HLS...`);
      await convertToHLS(tempMergedPath, finalPlaylistPath);

      let extracted_thumb_path = null;
      try {
        const thumbOutPath = path.join(outputDir, "thumb.jpg");
        await extractMiddleFrame(tempMergedPath, thumbOutPath);
        extracted_thumb_path = getRelativeMediaPath(thumbOutPath);
      } catch (errFrame) {
        console.error("[Upload] Erro ao extrair frame de miniatura:", errFrame.message);
      }

      try {
        if (fs.existsSync(tempMergedPath)) {
          fs.unlinkSync(tempMergedPath);
        }
      } catch (e) {
        console.warn(`[Upload] Não foi possível excluir o temporário de merge ${tempMergedPath}:`, e.message);
      }

      const media_path = getRelativeMediaPath(finalPlaylistPath);
      console.log(`[Upload] Processamento concluído com sucesso. Media Path: ${media_path}`);
      
      return res.status(200).json({
        status: "completed",
        media_path,
        extracted_thumb_path
      });
    }

    return res.status(200).json({
      status: "chunk_uploaded",
      chunkIndex: chunkIdx
    });
  } catch (err) {
    console.error("Erro no processamento da fatia:", err);
    return res.status(500).json({ error: err.message });
  }
}

async function getGenres(req, res) {
  try {
    const result = await pool.query('SELECT genre_id, name FROM "genres" ORDER BY name ASC');
    return res.status(200).json({ data: result.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getGenres,
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
  handleUploadChunk,
  compressVideo, // also export for use in main controllers
  convertToHLS,
  isPositiveInteger,
  normalizeIds,
  getRelativeMediaPath,
  getVideoDuration,
  extractMiddleFrame,
};
