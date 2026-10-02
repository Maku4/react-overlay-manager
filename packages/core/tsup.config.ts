import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  // tsup sets baseUrl for declaration builds, which TypeScript 6 deprecates
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  splitting: false,
  sourcemap: false,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom'],
});
