import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  target: 'es2020',
  // One output file per source module keeps 'use client' on the client
  // components, so server-safe exports stay importable from server code
  unbundle: true,
  fixedExtension: false,
  dts: { sourcemap: false },
  sourcemap: false,
  clean: true,
  // Unbundled output keeps each module's directive, so this warning does not apply
  checks: { moduleLevelDirective: false },
  deps: {
    neverBundle: [/^react($|\/)/, /^react-dom($|\/)/],
  },
});
