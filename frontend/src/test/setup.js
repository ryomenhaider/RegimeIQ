import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock window.matchMedia for components that use it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollIntoView for lazy loading components
Element.prototype.scrollIntoView = jest.fn();

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
  writable: true,
});

// Mock crypto.subtle for JWT handling
Object.defineProperty(crypto, 'subtle', {
  value: {
    sign: jest.fn(),
    verify: jest.fn(),
    digest: jest.fn(),
    generateKey: jest.fn(),
    importKey: jest.fn(),
    exportKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
  writable: true,
});

// Mock Intl.RelativeTimeFormat
global.Intl = {
  ...global.Intl,
  RelativeTimeFormat: class {
    format(value, unit) {
      return `${value} ${unit}`;
    }
  },
  DateTimeFormat: () => ({
    resolvedOptions: () => ({ timeZone: 'UTC' }),
    format: () => '2024-01-01',
  }),
};