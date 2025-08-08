import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { defineOverlay } from '../src/defineOverlay';
import { OverlayManagerCore } from '../src/manager/OverlayManagerCore';
import type { OverlayComponent, PromiseWithId, OverlayId } from '../src/types';

vi.useFakeTimers();

type NoProps = object;
type VoidResult = void;

const Dummy: OverlayComponent<NoProps, VoidResult> = defineOverlay<
  NoProps,
  void
>(() => React.createElement('div'));

describe('OverlayManagerCore - stacking behavior', () => {
  let manager: OverlayManagerCore<{ dummy: typeof Dummy }>;

  beforeEach(() => {
    manager = new OverlayManagerCore({ dummy: Dummy });
  });

  it('default is hide-previous: opening hides previous, closing shows previous', async () => {
    const p1: PromiseWithId<void> = manager.open('dummy');
    const id1: OverlayId = p1.id;

    const p2: PromiseWithId<void> = manager.open('dummy'); // default hide-previous
    const id2: OverlayId = p2.id;

    // After second open, first should be hidden
    expect(manager.getInstance(id1)!.visible).toBe(false);
    expect(manager.getInstance(id2)!.visible).toBe(true);

    // Close topmost (id2) with immediate removal
    manager.defaultExitDuration = 0;
    manager.getInstance(id2)!.close();
    vi.advanceTimersByTime(0);

    // id1 should be visible again
    expect(manager.getInstance(id1)!.visible).toBe(true);
    expect(manager.isOpen(id2)).toBe(false);
  });

  it('stack mode: opening does not hide previous; closing top does not alter others', () => {
    const p1: PromiseWithId<void> = manager.open('dummy', {
      stackingBehavior: 'stack',
    });
    const id1: OverlayId = p1.id;

    const p2: PromiseWithId<void> = manager.open('dummy', {
      stackingBehavior: 'stack',
    });
    const id2: OverlayId = p2.id;

    // Both visible
    expect(manager.getInstance(id1)!.visible).toBe(true);
    expect(manager.getInstance(id2)!.visible).toBe(true);

    // Close topmost (id2)
    manager.defaultExitDuration = 0;
    manager.getInstance(id2)!.close();
    vi.advanceTimersByTime(0);

    // id1 remains visible, id2 removed
    expect(manager.getInstance(id1)!.visible).toBe(true);
    expect(manager.isOpen(id2)).toBe(false);
  });

  it('per-open stackingBehavior overrides global', () => {
    // Set global to 'stack'
    manager.stackingBehavior = 'stack';

    const p1: PromiseWithId<void> = manager.open('dummy'); // inherits global stack
    const id1: OverlayId = p1.id;

    const p2: PromiseWithId<void> = manager.open('dummy', {
      stackingBehavior: 'hide-previous',
    }); // override
    const id2: OverlayId = p2.id;

    // Because second used hide-previous, first gets hidden now
    expect(manager.getInstance(id1)!.visible).toBe(false);
    expect(manager.getInstance(id2)!.visible).toBe(true);

    // When closing topmost, first is shown again due to hide-previous behavior on top
    manager.defaultExitDuration = 0;
    manager.getInstance(id2)!.close();
    vi.advanceTimersByTime(0);

    expect(manager.getInstance(id1)!.visible).toBe(true);
  });

  it('closing top finds nearest non-closing previous even if an intermediate overlay is closing', () => {
    // Open A, then B; B hides A. Then open C; C hides B.
    const a: PromiseWithId<void> = manager.open('dummy');
    const idA: OverlayId = a.id;
    const b: PromiseWithId<void> = manager.open('dummy');
    const idB: OverlayId = b.id;
    const c: PromiseWithId<void> = manager.open('dummy');
    const idC: OverlayId = c.id;

    // Close B so it becomes invisible and isClosing=true, but keep it on stack (no timer yet)
    manager.getInstance(idB)!.close();

    // Now close C (topmost). We expect A to become visible, not B (which is closing)
    manager.defaultExitDuration = 0;
    manager.getInstance(idC)!.close();
    vi.advanceTimersByTime(0);

    expect(manager.isOpen(idC)).toBe(false);
    expect(manager.getInstance(idA)!.visible).toBe(true);
  });

  it('closeAll respects removal across mixed strategies', () => {
    // First opens with stack (visible), second with hide-previous (hides first), third with stack (keeps second visible)
    const a: PromiseWithId<void> = manager.open('dummy', {
      stackingBehavior: 'stack',
    });
    const idA: OverlayId = a.id;
    const b: PromiseWithId<void> = manager.open('dummy', {
      stackingBehavior: 'hide-previous',
    });
    const idB: OverlayId = b.id;
    const c: PromiseWithId<void> = manager.open('dummy', {
      stackingBehavior: 'stack',
    });
    const idC: OverlayId = c.id;

    expect(manager.getInstance(idA)!.visible).toBe(false); // hidden by b
    expect(manager.getInstance(idB)!.visible).toBe(true);
    expect(manager.getInstance(idC)!.visible).toBe(true);

    manager.defaultExitDuration = 0;
    manager.closeAll();
    vi.advanceTimersByTime(0);

    expect(manager.isOpen(idA)).toBe(false);
    expect(manager.isOpen(idB)).toBe(false);
    expect(manager.isOpen(idC)).toBe(false);
    expect(manager.getOpenCount()).toBe(0);
  });
});
