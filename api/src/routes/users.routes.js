const { Router } = require('express');
const { registerUser, subscribeUser, loginUser } = require('../controllers/users.controller');

const router = Router();

router.post('/register',   registerUser);
router.post('/login',      loginUser);
router.post('/subscribe',  subscribeUser);

module.exports = router;
