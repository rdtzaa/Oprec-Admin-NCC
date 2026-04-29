const TaskModel = require('../models/taskModel');

const TaskController = {
  getAllTasks(req, res) {
    try {
      const { status, priority } = req.query;
      let tasks = TaskModel.getAll();

      if (status) {
        tasks = tasks.filter(t => t.status === status);
      }
      if (priority) {
        tasks = tasks.filter(t => t.priority === priority);
      }

      res.json({ success: true, data: tasks, count: tasks.length });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  getTaskById(req, res) {
    try {
      const task = TaskModel.getById(req.params.id);
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      res.json({ success: true, data: task });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  createTask(req, res) {
    try {
      const task = TaskModel.create(req.body);
      res.status(201).json({ success: true, data: task, message: 'Task created successfully' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  updateTask(req, res) {
    try {
      const task = TaskModel.update(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      res.json({ success: true, data: task, message: 'Task updated successfully' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  deleteTask(req, res) {
    try {
      const deleted = TaskModel.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      res.json({ success: true, message: 'Task deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  getStats(req, res) {
    try {
      const stats = TaskModel.getStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
};

module.exports = TaskController;