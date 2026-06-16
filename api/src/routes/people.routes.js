const { Router } = require('express');
const { insertDirector, insertActors } = require('../controllers/people.controller');

const router = Router();

router.post('/directors', insertDirector);
router.post('/actors',    insertActors);

module.exports = router;
