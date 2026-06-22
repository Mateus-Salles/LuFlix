const { Router } = require('express');
const {
  insertDirector,
  insertActors,
  getDirectors,
  getActors,
  updateDirector,
  deleteDirector,
  updateActor,
  deleteActor
} = require('../controllers/people.controller');

const router = Router();

router.post('/directors', insertDirector);
router.get('/directors',  getDirectors);
router.put('/directors/:id', updateDirector);
router.delete('/directors/:id', deleteDirector);

router.post('/actors',    insertActors);
router.get('/actors',     getActors);
router.put('/actors/:id', updateActor);
router.delete('/actors/:id', deleteActor);

module.exports = router;
