import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-undef
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
