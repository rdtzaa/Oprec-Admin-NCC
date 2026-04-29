const request = require('supertest');
const app = require('../src/app');
const TaskModel = require('../src/models/taskModel');

beforeEach(() => {
  TaskModel._reset();
});

afterAll(() => {
  TaskModel._reset();
});

// ─── Health Check ───────────────────────────────────────────────────────────
describe('GET /health', () => {
  test('should return 200 with status OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
  });
});

// ─── POST /api/tasks ─────────────────────────────────────────────────────────
describe('POST /api/tasks', () => {
  test('should create a task with valid data', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Setup Jenkins', description: 'Install and configure', priority: 'high' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Setup Jenkins');
    expect(res.body.data.priority).toBe('high');
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('createdAt');
  });

  test('should create task with default priority (medium)', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Default priority task' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.priority).toBe('medium');
  });

  test('should return 400 if title is missing', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ description: 'No title here' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/title/i);
  });

  test('should return 400 if title is empty string', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: '   ' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('should return 400 for invalid priority', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Bad priority', priority: 'critical' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/tasks ───────────────────────────────────────────────────────────
describe('GET /api/tasks', () => {
  test('should return empty array when no tasks', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  test('should return all tasks', async () => {
    await request(app).post('/api/tasks').send({ title: 'Task A' });
    await request(app).post('/api/tasks').send({ title: 'Task B' });

    const res = await request(app).get('/api/tasks');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.count).toBe(2);
  });

  test('should filter tasks by status', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'Filter test' });
    const id = created.body.data.id;

    await request(app).put(`/api/tasks/${id}`).send({ status: 'done' });
    await request(app).post('/api/tasks').send({ title: 'Still pending' });

    const res = await request(app).get('/api/tasks?status=done');
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].status).toBe('done');
  });

  test('should filter tasks by priority', async () => {
    await request(app).post('/api/tasks').send({ title: 'High task', priority: 'high' });
    await request(app).post('/api/tasks').send({ title: 'Low task', priority: 'low' });

    const res = await request(app).get('/api/tasks?priority=high');
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].priority).toBe('high');
  });
});

// ─── GET /api/tasks/:id ───────────────────────────────────────────────────────
describe('GET /api/tasks/:id', () => {
  test('should return task by ID', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'Find me' });
    const id = created.body.data.id;

    const res = await request(app).get(`/api/tasks/${id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(id);
    expect(res.body.data.title).toBe('Find me');
  });

  test('should return 404 for non-existent ID', async () => {
    const res = await request(app).get('/api/tasks/nonexistent-id');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ─── PUT /api/tasks/:id ───────────────────────────────────────────────────────
describe('PUT /api/tasks/:id', () => {
  test('should update task title', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'Original' });
    const id = created.body.data.id;

    const res = await request(app).put(`/api/tasks/${id}`).send({ title: 'Updated' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Updated');
  });

  test('should update task status to in-progress', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'Status test' });
    const id = created.body.data.id;

    const res = await request(app).put(`/api/tasks/${id}`).send({ status: 'in-progress' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('in-progress');
  });

  test('should update task status to done', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'Done test' });
    const id = created.body.data.id;

    const res = await request(app).put(`/api/tasks/${id}`).send({ status: 'done' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('done');
  });

  test('should return 400 for invalid status', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'Bad status' });
    const id = created.body.data.id;

    const res = await request(app).put(`/api/tasks/${id}`).send({ status: 'completed' });
    expect(res.statusCode).toBe(400);
  });

  test('should return 404 for non-existent task', async () => {
    const res = await request(app).put('/api/tasks/fake-id').send({ title: 'Ghost' });
    expect(res.statusCode).toBe(404);
  });
});

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────
describe('DELETE /api/tasks/:id', () => {
  test('should delete a task successfully', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'Delete me' });
    const id = created.body.data.id;

    const res = await request(app).delete(`/api/tasks/${id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await request(app).get(`/api/tasks/${id}`);
    expect(check.statusCode).toBe(404);
  });

  test('should return 404 for non-existent task', async () => {
    const res = await request(app).delete('/api/tasks/ghost-id');
    expect(res.statusCode).toBe(404);
  });
});

// ─── GET /api/tasks/stats ─────────────────────────────────────────────────────
describe('GET /api/tasks/stats', () => {
  test('should return zeroed stats when no tasks', async () => {
    const res = await request(app).get('/api/tasks/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ total: 0, pending: 0, inProgress: 0, done: 0, highPriority: 0 });
  });

  test('should return correct stats after creating tasks', async () => {
    await request(app).post('/api/tasks').send({ title: 'T1', priority: 'high' });
    await request(app).post('/api/tasks').send({ title: 'T2', priority: 'low' });
    const t3 = await request(app).post('/api/tasks').send({ title: 'T3' });
    await request(app).put(`/api/tasks/${t3.body.data.id}`).send({ status: 'done' });

    const res = await request(app).get('/api/tasks/stats');
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.done).toBe(1);
    expect(res.body.data.highPriority).toBe(1);
    expect(res.body.data.pending).toBe(2);
  });
});

// ─── 404 Route ────────────────────────────────────────────────────────────────
describe('Unknown routes', () => {
  test('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});