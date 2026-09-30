const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/teacher/:teacherId', reportController.getTeacherReport);

module.exports = router;