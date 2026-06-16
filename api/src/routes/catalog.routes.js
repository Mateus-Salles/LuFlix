const { Router } = require('express');
const {
  insertMovie,
  insertSerie,
  insertEpisode,
  insertContentGenres,
  insertContentCast,
  insertContentDirectors,
} = require('../controllers/catalog.controller');

const router = Router();

// Conteúdo
router.post('/movies',    insertMovie);
router.post('/series',    insertSerie);
router.post('/episodes',  insertEpisode);

// Metadados
router.post('/genres',    insertContentGenres);
router.post('/cast',      insertContentCast);
router.post('/directors', insertContentDirectors);

module.exports = router;
