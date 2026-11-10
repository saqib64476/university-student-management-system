const express = require('express');
const router = express.Router();
const marksController = require('../controllers/marksController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.use(isAuthenticated);

router.get('/enrollments', marksController.getEnrollments);
router.post('/enroll', marksController.enrollStudent);
router.delete('/enrollments/:id', marksController.unenrollStudent);
router.post('/evaluate', marksController.saveMarks);
router.get('/grading-scale', marksController.getGradingScale);
router.get('/transcript/:studentId', marksController.getTranscript);

module.exports = router;
