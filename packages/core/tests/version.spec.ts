import { expect, it } from 'vitest';
import { version } from '../src';
import packageJson from '../package.json';

it('exports the current core package version', () => {
  expect(version).toBe(packageJson.version);
});
