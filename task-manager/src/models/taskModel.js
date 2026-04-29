const { v4: uuidv4 } = require('uuid');

let tasks = [];

const TaskModel = {
  getAll() {
    return tasks;
  },

  getById(id) {
    return tasks.find(task => task.id === id) || null;
  },

  create({ title, description = '', priority = 'medium' }) {
    if (!title || title.trim() === '') {
      throw new Error('Title is required');
    }

    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      throw new Error('Priority must be low, medium, or high');
    }

    const task = {
      id: uuidv4(),
      title: title.trim(),
      description: description.trim(),
      priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    tasks.push(task);
    return task;
  },

  update(id, { title, description, priority, status }) {
    const index = tasks.findIndex(task => task.id === id);
    if (index === -1) return null;

    const validStatuses = ['pending', 'in-progress', 'done'];
    if (status && !validStatuses.includes(status)) {
      throw new Error('Status must be pending, in-progress, or done');
    }

    const validPriorities = ['low', 'medium', 'high'];
    if (priority && !validPriorities.includes(priority)) {
      throw new Error('Priority must be low, medium, or high');
    }

    tasks[index] = {
      ...tasks[index],
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(priority !== undefined && { priority }),
      ...(status !== undefined && { status }),
      updatedAt: new Date().toISOString()
    };

    return tasks[index];
  },

  delete(id) {
    const index = tasks.findIndex(task => task.id === id);
    if (index === -1) return false;
    tasks.splice(index, 1);
    return true;
  },

  getStats() {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const done = tasks.filter(t => t.status === 'done').length;
    const highPriority = tasks.filter(t => t.priority === 'high').length;

    return { total, pending, inProgress, done, highPriority };
  },

  // Reset
  _reset() {
    tasks = [];
  }
};

module.exports = TaskModel;