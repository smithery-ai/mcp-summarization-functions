import { jest } from '@jest/globals';

// Mock console.error to avoid noise in test output
jest.spyOn(console, 'error').mockImplementation(() => {});

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});