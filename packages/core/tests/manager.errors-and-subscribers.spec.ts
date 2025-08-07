import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { OverlayManagerCore } from '../src/manager/OverlayManagerCore';
import { defineOverlay } from '../src/defineOverlay';
import type { OverlayComponent, OverlayId } from '../src/types';
import { OverlayNotFoundError } from '../src/utils/errors';

type NoProps = object;
type VoidResult = void;

const Dummy: OverlayComponent<NoProps, VoidResult> = defineOverlay<
  NoProps,
  void
>(() => React.createElement('div'));

describe('OverlayManagerCore - error paths and subscriber resilience', () => {
  it('show/update throws on unknown id; hide on unknown is no-op', () => {
    const manager = new OverlayManagerCore({ dummy: Dummy });
    expect(() => manager.show('missing' as unknown as OverlayId)).toThrow(
      OverlayNotFoundError
    );
    expect(() =>
      manager.update(
        'missing' as unknown as OverlayId,
        { a: 1 } as Record<string, number>
      )
    ).toThrow(OverlayNotFoundError);
    expect(() => manager.hide('missing' as unknown as OverlayId)).not.toThrow();
  });

  it('subscribeWithSelector continues when selector throws (logs error)', () => {
    const manager = new OverlayManagerCore({ dummy: Dummy });

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let shouldThrow = false;
    const unsub = manager.subscribeWithSelector(
      () => {
        if (shouldThrow) throw new Error('selector boom');
        return manager.getState().overlayStack.length;
      },
      () => {
        // should not crash
      }
    );

    // trigger a state change to invoke notifySubscribers
    shouldThrow = true;
    manager.open('dummy');

    expect(spy).toHaveBeenCalled();
    unsub();
    spy.mockRestore();
  });
});
