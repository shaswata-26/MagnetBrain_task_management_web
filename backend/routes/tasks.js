const express = require('express');
const { body } = require('express-validator');
const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskPriority,
  getUserTasks
} = require('../controllers/taskController');
const { auth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Validation rules
const taskValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title must be less than 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('dueDate')
    .isISO8601()
    .withMessage('Please provide a valid due date'),
  body('priority')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high')
];

// Apply auth middleware to all routes
router.use(auth);

router.post('/', taskValidation, handleValidationErrors, createTask);
router.get('/', getTasks);
router.get('/my-tasks', getUserTasks);
router.get('/:id', getTask);
router.put('/:id', taskValidation, handleValidationErrors, updateTask);
router.patch('/:id/status', 
  body('status').isIn(['pending', 'in-progress', 'completed']),
  handleValidationErrors, 
  updateTaskStatus
);
router.patch('/:id/priority',
  body('priority').isIn(['low', 'medium', 'high']),
  handleValidationErrors,
  updateTaskPriority
);
router.delete('/:id', deleteTask);

module.exports = router;