import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineOverlay } from '../src/defineOverlay';
import { OverlayManagerCore } from '../src/manager/OverlayManagerCore';
import type { OverlayComponent } from '../src/types';

vi.useFakeTimers();

type NoProps = object;
type VoidResult = void;

const Dummy: OverlayComponent<NoProps, VoidResult> = defineOverlay<
  NoProps,
  void
>(() => {
  // headless - not actually rendered in these manager-level tests
  return null as unknown as any;
});

describe('exit behavior', () => {
  let manager: OverlayManagerCore<{ dummy: typeof Dummy }>;

  beforeEach(() => {
    manager = new OverlayManagerCore({ dummy: Dummy });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('removes after defaultExitDuration when local is undefined', async () => {
    manager.defaultExitDuration = 300;
    const p = manager.open('dummy'); // no local exitDuration
    const id = (p as any).id;
    expect(manager.isOpen(id)).toBe(true);

    manager.getInstance(id)?.close(); // trigger close

    // immediately after close, remains mounted but hidden
    expect(manager.isOpen(id)).toBe(true);

    vi.advanceTimersByTime(299);
    expect(manager.isOpen(id)).toBe(true);

    vi.advanceTimersByTime(1);
    expect(manager.isOpen(id)).toBe(false);
  });

  it('uses local exitDuration override', async () => {
    manager.defaultExitDuration = 300;
    const p = manager.open('dummy', { exitDuration: 200 });
    const id = (p as any).id;

    manager.getInstance(id)?.close();

    vi.advanceTimersByTime(199);
    expect(manager.isOpen(id)).toBe(true);

    vi.advanceTimersByTime(1);
    expect(manager.isOpen(id)).toBe(false);
  });

  it('when exitDuration is null, waits for onExitComplete', async () => {
    const p = manager.open('dummy', { exitDuration: null });
    const id = (p as any).id;

    const inst = manager.getInstance(id);
    expect(inst).toBeTruthy();

    inst!.close();

    // no auto removal scheduled
    vi.advanceTimersByTime(10000);
    expect(manager.isOpen(id)).toBe(true);

    // manual complete
    inst!.onExitComplete();
    expect(manager.isOpen(id)).toBe(false);
  });

  it('clears pending timeout if onExitComplete is called earlier', async () => {
    const p = manager.open('dummy', { exitDuration: 500 });
    const id = (p as any).id;
    const inst = manager.getInstance(id)!;

    inst.close();

    vi.advanceTimersByTime(200);
    // call manual completion early
    inst.onExitComplete();
    expect(manager.isOpen(id)).toBe(false);

    // even if timers continue, it must not rethrow or attempt removing again
    vi.advanceTimersByTime(10000);
    expect(manager.isOpen(id)).toBe(false);
  });

  it('guards duplicate close calls gracefully', async () => {
    manager.defaultExitDuration = 100;
    const p = manager.open('dummy');
    const id = (p as any).id;
    const inst = manager.getInstance(id)!;

    inst.close();
    // second close should be no-op
    expect(() => inst.close()).not.toThrow();

    vi.advanceTimersByTime(100);
    expect(manager.isOpen(id)).toBe(false);
  });

  // New edge cases below

  it('exitDuration = 0 removes immediately', () => {
    const p = manager.open('dummy', { exitDuration: 0 });
    const id = (p as any).id;
    const spy = vi.fn();
    const unsub = manager.subscribe((e) => {
      if (e.type === 'REMOVE') spy();
    });

    manager.getInstance(id)!.close();

    // 0 ms => immediate remove (no advance needed but ensure timers flushed)
    vi.advanceTimersByTime(0);

    expect(manager.isOpen(id)).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('negative exitDuration behaves as immediate removal (defensive)', () => {
    // force a negative value via type cast to simulate erroneous input
    const p = manager.open('dummy', { exitDuration: -10 as unknown as number });
    const id = (p as any).id;

    manager.getInstance(id)!.close();

    vi.advanceTimersByTime(0);
    expect(manager.isOpen(id)).toBe(false);
  });

  it('onExitComplete after removal is a safe no-op', () => {
    const p = manager.open('dummy', { exitDuration: 0 });
    const id = (p as any).id;
    const inst = manager.getInstance(id)!;

    inst.close();
    vi.advanceTimersByTime(0);
    expect(manager.isOpen(id)).toBe(false);

    // Call again after removal
    expect(() => inst.onExitComplete()).not.toThrow();
    expect(manager.isOpen(id)).toBe(false);
  });

  it('closeAll handles mixed strategies (timer and manual)', () => {
    const a = manager.open('dummy', { exitDuration: 10 });
    const idA = (a as any).id;

    const b = manager.open('dummy', { exitDuration: null });
    const idB = (b as any).id;

    // closeAll schedules removal for A (10ms) and marks B closing but requires onExitComplete
    manager.closeAll();

    // Before timers advance, both still present but hidden
    expect(manager.isOpen(idA)).toBe(true);
    expect(manager.isOpen(idB)).toBe(true);

    // A times out
    vi.advanceTimersByTime(10);
    expect(manager.isOpen(idA)).toBe(false);
    expect(manager.isOpen(idB)).toBe(true);

    // Complete B manually
    const instB = manager.getInstance(idB)!;
    instB.onExitComplete();
    expect(manager.isOpen(idB)).toBe(false);
  });
});
