const request = require('supertest');
const app = require('../server');

describe('WorkPlan API', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Route not found');
  });

  it('should return 401 for protected routes without token', async () => {
    const res = await request(app).get('/api/companies');
    expect(res.statusCode).toBe(401);
  });
});