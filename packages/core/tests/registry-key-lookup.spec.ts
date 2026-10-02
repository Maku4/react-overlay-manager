import { expect, it } from 'vitest';
import { createElement } from 'react';
import { createOverlayManager, defineOverlay } from '../src';

it.each([
  ['a symbol', Symbol('dialog')],
  ['numeric zero', 0],
  ['an empty string', ''],
] as const)('opens and retrieves an overlay registered under %s', (_, key) => {
  const Dialog = defineOverlay(() => createElement('div'));
  const registry: Record<PropertyKey, typeof Dialog> = { [key]: Dialog };
  const manager = createOverlayManager(registry);

  const opened = manager.open(key);

  expect(manager.getInstance(opened.id)?.component).toBe(Dialog);
  expect(manager.getInstancesByKey(key).map((instance) => instance.id)).toEqual(
    [opened.id]
  );
});
