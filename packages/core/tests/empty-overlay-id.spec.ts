import { expect, it } from 'vitest';
import { createElement } from 'react';
import {
  createOverlayManager,
  defineOverlay,
  OverlayAlreadyOpenError,
  type OverlayId,
} from '../src';

it('applies duplicate and hidden-reopen rules to an empty-string overlay ID', () => {
  const Dialog = defineOverlay(() => createElement('div'));
  const manager = createOverlayManager({ dialog: Dialog });
  const id = '' as OverlayId;
  const original = manager.open('dialog', { id });

  expect(original.id).toBe(id);
  expect(() => manager.open('dialog', { id })).toThrow(OverlayAlreadyOpenError);
  manager.getInstance(id)!.hide();
  expect(manager.open('dialog', { id })).toBe(original);
  expect(manager.getInstance(id)?.visible).toBe(true);
  expect(manager.getState().overlayStack).toEqual([id]);
});
