import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});

Element.prototype.scrollIntoView = () => {};

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: async () => {},
    readText: async () => '',
  },
  writable: true,
});

Object.defineProperty(crypto, 'subtle', {
  value: {
    sign: async () => new ArrayBuffer(0),
    verify: async () => true,
    digest: async () => new ArrayBuffer(0),
    generateKey: async () => ({}),
    importKey: async () => ({}),
    exportKey: async () => new ArrayBuffer(0),
    encrypt: async () => new ArrayBuffer(0),
    decrypt: async () => new ArrayBuffer(0),
  },
  writable: true,
});

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