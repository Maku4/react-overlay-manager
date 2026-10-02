import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  target: 'es2020',
  // Keeps the panel in its own module so production bundles can drop it
  unbundle: true,
  fixedExtension: false,
  dts: { sourcemap: false },
  sourcemap: false,
  clean: true,
  // Unbundled output keeps each module's directive, so this warning does not apply
  checks: { moduleLevelDirective: false },
  deps: {
    neverBundle: [
      /^react($|\/)/,
      /^react-dom($|\/)/,
      /^@react-overlay-manager\/core($|\/)/,
    ],
  },
});
