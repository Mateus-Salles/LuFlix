const { Router } = require('express');
const { registerUser, subscribeUser } = require('../controllers/users.controller');

const router = Router();

router.post('/register',   registerUser);
router.post('/subscribe',  subscribeUser);

module.exports = router;
