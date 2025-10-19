// jest.setup.js
import '@testing-library/jest-dom'

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  // Uncomment to suppress logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  error: jest.fn(),
}
