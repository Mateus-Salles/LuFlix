const pool = require('../db');

/**
 * POST /reviews
 * Chama: pr_insert_review
 * Body: { user_id, rating, comment?, movie_id?, episode_id? }
 */
async function insertReview(req, res) {
  const { user_id, rating, comment = null, movie_id = null, episode_id = null } = req.body;

  if (!user_id || !rating) {
    return res.status(400).json({ error: 'Campos obrigatórios: user_id, rating.' });
  }

  if (movie_id && episode_id) {
    return res.status(400).json({ error: 'Informe apenas movie_id ou episode_id, não ambos.' });
  }

  if (!movie_id && !episode_id) {
    return res.status(400).json({ error: 'Informe ao menos movie_id ou episode_id.' });
  }

  try {
    await pool.query(
      `CALL pr_insert_review($1, $2, $3, $4, $5)`,
      [user_id, rating, comment, movie_id, episode_id]
    );

    return res.status(201).json({ message: 'Review cadastrada com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /reviews
 * Query: { movie_id?, episode_id?, page?, limit? }
 */
async function getReviews(req, res) {
  const { movie_id, episode_id, page = 1, limit = 10 } = req.query;

  const mId = movie_id ? Number(movie_id) : null;
  const eId = episode_id ? Number(episode_id) : null;

  if (!mId && !eId) {
    return res.status(400).json({ error: 'Informe ao menos movie_id ou episode_id.' });
  }

  const pNum = Math.max(1, Number(page));
  const lNum = Math.max(1, Number(limit));
  const offset = (pNum - 1) * lNum;

  try {
    // 1. Get total count of matching reviews
    const countRes = await pool.query(
      `SELECT COUNT(*)::int as total FROM "reviews"
       WHERE ($1::int IS NULL OR movie_id = $1)
         AND ($2::int IS NULL OR episode_id = $2)`,
      [mId, eId]
    );
    const total = countRes.rows[0]?.total || 0;

    // 2. Fetch page reviews
    const reviewsRes = await pool.query(
      `SELECT r.review_id, r.rating, r.comment, r.created_at, u.name as user_name
       FROM "reviews" r
       JOIN "users" u ON r.user_id = u.user_id
       WHERE ($1::int IS NULL OR r.movie_id = $1)
         AND ($2::int IS NULL OR r.episode_id = $2)
       ORDER BY r.created_at DESC
       LIMIT $3 OFFSET $4`,
      [mId, eId, lNum, offset]
    );

    return res.status(200).json({
      total,
      data: reviewsRes.rows,
      page: pNum,
      limit: lNum
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { insertReview, getReviews };

