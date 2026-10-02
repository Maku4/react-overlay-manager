import { expect, it } from 'vitest';
import { createElement } from 'react';
import { createOverlayManager, defineOverlay } from '../src';

it('generates a fresh ID when its next generated value is already occupied', () => {
  const Dialog = defineOverlay<{ label: string }, void>(() =>
    createElement('div')
  );
  const probe = createOverlayManager({ dialog: Dialog });
  const occupiedId = probe.open('dialog', { label: 'probe' }).id;

  const manager = createOverlayManager({ dialog: Dialog });
  manager.open('dialog', { id: occupiedId, label: 'explicit ID' });
  const generated = manager.open('dialog', { label: 'generated ID' });

  expect(generated.id).not.toBe(occupiedId);
  expect(manager.getInstance(occupiedId)?.props.label).toBe('explicit ID');
  expect(manager.getInstance(generated.id)?.props.label).toBe('generated ID');
  expect(manager.getState().overlayStack).toEqual([occupiedId, generated.id]);
});
