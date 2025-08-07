import { describe, it, expect } from 'vitest';
import React from 'react';
import { defineOverlay } from '../src/defineOverlay';
import { OverlayManagerCore } from '../src/manager/OverlayManagerCore';
import type { OverlayComponent, PromiseWithId } from '../src/types';

type NoProps = object;
type VoidResult = void;

const Dummy: OverlayComponent<NoProps, VoidResult> = defineOverlay<
  NoProps,
  void
>(() => React.createElement('div'));

describe('OverlayManagerCore - misc behaviors', () => {
  it('getInstancesByKey returns instances per registry key', () => {
    const manager = new OverlayManagerCore({ dummy: Dummy });
    const a: PromiseWithId<void> = manager.open('dummy');
    const b: PromiseWithId<void> = manager.open('dummy');
    const insts = manager.getInstancesByKey('dummy');
    expect(insts.map((i) => i.id)).toEqual([a.id, b.id]);
    expect(insts.every((i) => i.key === 'dummy')).toBe(true);
  });

  it('closing non-topmost overlay does not affect the current top visibility', () => {
    const manager = new OverlayManagerCore({ dummy: Dummy });
    const a: PromiseWithId<void> = manager.open('dummy');
    const b: PromiseWithId<void> = manager.open('dummy');
    // a is hidden by default hide-previous, b visible
    expect(manager.getInstance(a.id)!.visible).toBe(false);
    expect(manager.getInstance(b.id)!.visible).toBe(true);

    // Close non-topmost (a) should remove a and keep b visible
    manager.defaultExitDuration = 0;
    manager.getInstance(a.id)!.close();
    // flush immediate
    expect(manager.isOpen(a.id)).toBe(false);
    expect(manager.getInstance(b.id)!.visible).toBe(true);
  });
});
