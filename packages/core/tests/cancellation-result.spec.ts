import { createElement } from 'react';
import { expect, it } from 'vitest';
import { createOverlayManager, defineOverlay } from '../src';

it('resolves cancellation as undefined and preserves an explicit false result', async () => {
  const Confirm = defineOverlay<object, boolean>(() => createElement('div'));
  const manager = createOverlayManager({ confirm: Confirm });
  const cancelled = manager.open('confirm', { exitDuration: 0 });
  manager.getInstance(cancelled.id)!.close();
  await expect(cancelled).resolves.toBeUndefined();

  const first = manager.open('confirm', { exitDuration: 0 });
  const second = manager.open('confirm', { exitDuration: 0 });
  manager.closeAll();
  await expect(first).resolves.toBeUndefined();
  await expect(second).resolves.toBeUndefined();

  const declined = manager.open('confirm', { exitDuration: 0 });
  manager.getInstance(declined.id)!.close(false);
  await expect(declined).resolves.toBe(false);
  expect(manager.getOpenCount()).toBe(0);
});
