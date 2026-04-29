const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/taskController');

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks (optional filter: ?status=pending&priority=high)
 */
router.get('/', TaskController.getAllTasks);

/**
 * @route   GET /api/tasks/stats
 * @desc    Get task statistics
 */
router.get('/stats', TaskController.getStats);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get task by ID
 */
router.get('/:id', TaskController.getTaskById);

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @body    { title, description, priority }
 */
router.post('/', TaskController.createTask);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update a task
 * @body    { title, description, priority, status }
 */
router.put('/:id', TaskController.updateTask);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task
 */
router.delete('/:id', TaskController.deleteTask);

module.exports = router;