const express = require('express');
const router = express.Router();
const { savePlayerResponse } = require('../controllers/responseController');

router.post('/responses', savePlayerResponse);

module.exports = router;