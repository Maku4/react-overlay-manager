import { expect, it, vi } from 'vitest';
import { createOverlayManager, defineOverlay } from '../src';

it('reopens a closing overlay independently of its old promise and callbacks', async () => {
  vi.useFakeTimers();

  try {
    const Dialog = defineOverlay<{ label: string }, string>(() => null);
    const manager = createOverlayManager({ dialog: Dialog });
    const original = manager.open('dialog', {
      label: 'original',
      exitDuration: 100,
    });
    const oldInstance = manager.getInstance(original.id)!;

    oldInstance.hide();
    expect(
      manager.open('dialog', { id: original.id, label: 'shown again' })
    ).toBe(original);

    oldInstance.close('old result');
    await expect(original).resolves.toBe('old result');

    const reopened = manager.open('dialog', {
      id: original.id,
      label: 'reopened',
      exitDuration: null,
    });
    expect(reopened).not.toBe(original);
    expect(reopened.id).toBe(original.id);
    const newInstance = manager.getInstance(reopened.id)!;
    expect(newInstance).not.toBe(oldInstance);
    expect(newInstance).toMatchObject({
      visible: true,
      isClosing: false,
      props: { label: 'reopened' },
    });

    const resolved = vi.fn();
    reopened.then(resolved);

    vi.advanceTimersByTime(100);
    expect(manager.getInstance(reopened.id)).toBe(newInstance);

    oldInstance.hide();
    oldInstance.close('stale result');
    oldInstance.onExitComplete();
    await Promise.resolve();
    expect(manager.getInstance(reopened.id)).toBe(newInstance);
    expect(manager.getState().overlayStack).toEqual([reopened.id]);
    expect(newInstance.visible).toBe(true);
    expect(resolved).not.toHaveBeenCalled();
    await expect(original).resolves.toBe('old result');

    newInstance.close('new result');
    await expect(reopened).resolves.toBe('new result');
    newInstance.onExitComplete();
    expect(manager.getInstance(reopened.id)).toBeUndefined();
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
  }
});
