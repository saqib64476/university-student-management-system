const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.use(isAuthenticated);

router.get('/', departmentController.getAll);
router.get('/:id', departmentController.getById);
router.post('/', departmentController.create);
router.put('/:id', departmentController.update);
router.delete('/:id', departmentController.delete);

module.exports = router;
