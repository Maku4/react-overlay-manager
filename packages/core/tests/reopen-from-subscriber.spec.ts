import { expect, it } from 'vitest';
import { createElement } from 'react';
import {
  createOverlayManager,
  defineOverlay,
  type PromiseWithId,
} from '../src';

it('keeps a new generation reopened by a synchronous close subscriber', async () => {
  const Dialog = defineOverlay<object, string>(() => createElement('div'));
  const manager = createOverlayManager({ dialog: Dialog });
  const original = manager.open('dialog', { exitDuration: 0 });
  let reopened: PromiseWithId<string> | undefined;
  let handled = false;
  const unsubscribe = manager.subscribe((event) => {
    if (event.type === 'HIDE' && event.id === original.id && !handled) {
      handled = true;
      reopened = manager.open('dialog', {
        id: original.id,
        exitDuration: null,
      });
    }
  });

  try {
    manager.getInstance(original.id)!.close('old result');
    await expect(original).resolves.toBe('old result');
    expect(reopened).toBeDefined();
    expect(reopened).not.toBe(original);
    const fresh = manager.getInstance(original.id);
    expect(fresh).toMatchObject({ visible: true, isClosing: false });
    expect(manager.getState().overlayStack).toEqual([original.id]);

    fresh!.close('new result');
    await expect(reopened).resolves.toBe('new result');
  } finally {
    unsubscribe();
  }
});
