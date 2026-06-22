const { Router } = require('express');
const { insertReview }      = require('../controllers/reviews.controller');
const { addFavorite, removeFavorite, getUserFavorites } = require('../controllers/favorites.controller');
const { addToWatchHistory } = require('../controllers/history.controller');
const { getMovies, getSeries, getSeasons, getEpisodes } = require('../controllers/views.controller');

const usersRouter   = require('./users.routes');
const peopleRouter  = require('./people.routes');
const catalogRouter = require('./catalog.routes');

const router = Router();

// ── Usuários e assinaturas
router.use('/users',   usersRouter);

// ── Pessoas (diretores e atores)
router.use('/people',  peopleRouter);

// ── Catálogo (filmes, séries, episódios, gêneros, elenco, diretores)
router.use('/catalog', catalogRouter);

// ── Reviews
router.post('/reviews', insertReview);

// ── Favoritos
router.post('/favorites',   addFavorite);
router.delete('/favorites', removeFavorite);
router.get('/favorites/:user_id', getUserFavorites);

// ── Histórico de visualização
router.post('/history', addToWatchHistory);

// ── Views (consultas)
router.get('/views/movies',   getMovies);
router.get('/views/series',   getSeries);
router.get('/views/seasons',  getSeasons);
router.get('/views/episodes', getEpisodes);

module.exports = router;
