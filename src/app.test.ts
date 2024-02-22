// src/app.test.ts
import request from 'supertest';
import app from './app';

describe('GET /', () => {
  it('should respond with Hello World!', async () => {
    const response = await request(app).get('/');
    expect(response.text).toEqual('Hello World!');
    expect(response.statusCode).toBe(200);
  });
});
