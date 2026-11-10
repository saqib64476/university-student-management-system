const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.use(isAuthenticated);

router.get('/', studentController.getAll);
router.get('/:id', studentController.getById);
router.post('/', studentController.create);
router.put('/:id', studentController.update);
router.delete('/:id', studentController.delete);

module.exports = router;
