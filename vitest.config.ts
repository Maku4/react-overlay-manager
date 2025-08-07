import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['packages/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    setupFiles: ['./packages/core/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/**/src/**/*.{js,ts,jsx,tsx}'],
      exclude: ['packages/**/*.d.ts', 'packages/**/tests', 'packages/**/dist'],
    },
  },
});
