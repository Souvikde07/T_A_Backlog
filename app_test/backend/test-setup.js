// Load environment variables for testing
require('dotenv').config();

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console.log to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}; 