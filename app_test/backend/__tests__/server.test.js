const request = require('supertest');
const express = require('express');
const session = require('express-session');
const supertestSession = require('supertest-session');

// Import your server app
let app;

// Mock axios for testing
jest.mock('axios');
const axios = require('axios');

const isTestEnv = process.env.NODE_ENV === 'test';

describe('Backend API Tests', () => {
  beforeAll(async () => {
    // Import the app after mocking
    app = require('../server');
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Basic Endpoints', () => {
    test('GET / should return server status', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.text).toBe('Backend server is running.');
    });
  });

  describe('Authentication Endpoints', () => {
    test('GET /auth/login should redirect to Backlog OAuth', async () => {
      const response = await request(app)
        .get('/auth/login')
        .expect(302); // Redirect status
      
      expect(response.headers.location).toContain('OAuth2AccessRequest.action');
      expect(response.headers.location).toContain('response_type=code');
      expect(response.headers.location).toContain('client_id=');
    });

    test('GET /auth/callback should handle missing code', async () => {
      const response = await request(app)
        .get('/auth/callback')
        .expect(400);
      
      expect(response.text).toBe('Missing code');
    });

    test('GET /auth/callback should handle OAuth error', async () => {
      // Mock axios to throw an error
      axios.post.mockRejectedValue(new Error('OAuth error'));

      const response = await request(app)
        .get('/auth/callback?code=test_code')
        .expect(500);
      
      expect(response.text).toContain('OAuth callback error');
    });

    test('POST /auth/logout should destroy session', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(200);
      
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('API Endpoints - Unauthenticated', () => {
    test('GET /api/issues should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/issues')
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });
  });

  describe('Rate Limiting', () => {
    (isTestEnv ? test.skip : test)('Should limit auth requests', async () => {
      // Make 6 requests to trigger rate limit (limit is 5)
      for (let i = 0; i < 5; i++) {
        await request(app).get('/auth/login');
      }
      
      const response = await request(app)
        .get('/auth/login')
        .expect(429);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Too many authentication attempts');
    });

    (isTestEnv ? test.skip : test)('Should limit search requests', async () => {
      // Mock session with token
      const mockSession = {
        backlog_token: 'test_token',
        backlog_refresh_token: 'test_refresh_token'
      };

      // Mock axios for successful response
      axios.get.mockResolvedValue({ data: [] });

      // Make 31 requests to trigger rate limit (limit is 30)
      for (let i = 0; i < 30; i++) {
        await request(app)
          .get('/api/issues')
          .set('Cookie', [`connect.sid=${JSON.stringify(mockSession)}`]);
      }
      
      const response = await request(app)
        .get('/api/issues')
        .set('Cookie', [`connect.sid=${JSON.stringify(mockSession)}`])
        .expect(429);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Too many search requests');
    });
  });

  describe('API Endpoints - Authenticated', () => {
    let testSession;

    beforeEach(async () => {
      testSession = supertestSession(app);
      await testSession
        .post('/test/session')
        .send({
          backlog_token: 'test_access_token',
          backlog_refresh_token: 'test_refresh_token',
        });
    });

    test('GET /api/issues should return issues when authenticated', async () => {
      const mockIssues = [
        { id: 1, summary: 'Test Issue 1' },
        { id: 2, summary: 'Test Issue 2' }
      ];

      axios.get.mockResolvedValue({ data: mockIssues });

      const response = await testSession
        .get('/api/issues')
        .expect(200);
      
      expect(response.body).toEqual(mockIssues);
    });

    test('GET /api/issues should handle Backlog API errors', async () => {
      axios.get.mockRejectedValue(new Error('Backlog API error'));

      const response = await testSession
        .get('/api/issues')
        .expect(500);
      
      expect(response.body).toHaveProperty('error', 'Failed to fetch issues');
    });
  });

  describe('Token Refresh', () => {
    let testSession;

    beforeEach(async () => {
      testSession = supertestSession(app);
      await testSession
        .post('/test/session')
        .send({
          backlog_token: 'expired_token',
          backlog_refresh_token: 'valid_refresh_token',
        });
    });

    test('Should refresh token when access token expires', async () => {
      const mockIssues = [{ id: 1, summary: 'Test Issue' }];
      const newAccessToken = 'new_access_token';

      // First call fails with 401, second succeeds after refresh
      axios.get
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce({ data: mockIssues });

      // Mock refresh token call
      axios.post.mockResolvedValue({
        data: { access_token: newAccessToken }
      });

      const response = await testSession
        .get('/api/issues')
        .expect(200);
      
      expect(response.body).toEqual(mockIssues);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/oauth2/token'),
        expect.stringContaining('grant_type=refresh_token'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );
    });

    test('Should handle refresh token expiration', async () => {
      // Mock failed refresh
      axios.get.mockRejectedValue({ response: { status: 401 } });
      axios.post.mockRejectedValue({ response: { status: 400 } });

      const response = await testSession
        .get('/api/issues')
        .expect(401);
      
      expect(response.body).toHaveProperty('error', 'Session expired, please re-authenticate.');
    });
  });

  describe('Query Parameters', () => {
    let testSession;
    beforeEach(async () => {
      testSession = supertestSession(app);
      await testSession
        .post('/test/session')
        .send({
          backlog_token: 'test_token',
          backlog_refresh_token: 'test_refresh_token',
        });
    });

    test('GET /api/issues should forward query parameters to Backlog API', async () => {
      axios.get.mockResolvedValue({ data: [] });

      await testSession
        .get('/api/issues?keyword=test&count=50')
        .expect(200);
      
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('keyword=test'),
        expect.any(Object)
      );
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('count=50'),
        expect.any(Object)
      );
    });
  });
}); 