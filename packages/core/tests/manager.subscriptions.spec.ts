import { describe, it, expect, beforeEach } from 'vitest';
import { defineOverlay } from '../src/defineOverlay';
import { OverlayManagerCore } from '../src/manager/OverlayManagerCore';
import type { OverlayComponent } from '../src/types';

type NoProps = object;
type VoidResult = void;

const Dummy: OverlayComponent<NoProps, VoidResult> = defineOverlay<
  NoProps,
  void
>(() => {
  return null as unknown as any;
});

describe('OverlayManagerCore - subscriptions and selectors', () => {
  let manager: OverlayManagerCore<{ dummy: typeof Dummy }>;

  beforeEach(() => {
    manager = new OverlayManagerCore({ dummy: Dummy });
  });

  it('subscribe receives event sequence for OPEN/HIDE/SHOW/UPDATE/REMOVE', () => {
    const events: any[] = [];
    const unsub = manager.subscribe((e) => events.push(e));

    const p = manager.open('dummy', { id: 'id1' as any });
    const id = (p as any).id;

    manager.hide(id);
    manager.show(id);
    manager.update(id, { a: 1 });

    manager.defaultExitDuration = 0;
    manager.getInstance(id)!.close();

    expect(events.map((e) => e.type)).toEqual([
      'OPEN',
      'HIDE',
      'SHOW',
      'UPDATE',
      'HIDE',
      'REMOVE',
    ]);

    unsub();
  });

  it('subscribeWithSelector only triggers when selected value changes (overlayStack length)', () => {
    let calls = 0;
    const unsub = manager.subscribeWithSelector(
      (s) => s.overlayStack.length,
      () => {
        calls += 1;
      }
    );

    // open -> length 1 (fires)
    const p1 = manager.open('dummy');
    // update props should NOT change length (no fire)
    manager.update((p1 as any).id, { foo: 'bar' } as any);
    // open second -> length 2 (fires)
    manager.open('dummy');

    expect(calls).toBe(2);

    unsub();
  });
});
