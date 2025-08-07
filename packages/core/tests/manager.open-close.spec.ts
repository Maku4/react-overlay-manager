import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineOverlay } from '../src/defineOverlay';
import { OverlayManagerCore } from '../src/manager/OverlayManagerCore';
import type { OverlayComponent } from '../src/types';
import {
  OverlayAlreadyOpenError,
  OverlayNotFoundError,
} from '../src/utils/errors';

vi.useFakeTimers();

type NoProps = object;
type VoidResult = void;

const Dummy: OverlayComponent<NoProps, VoidResult> = defineOverlay<
  NoProps,
  void
>(() => {
  return null as unknown as any;
});

describe('OverlayManagerCore - open/close basics', () => {
  let manager: OverlayManagerCore<{ dummy: typeof Dummy }>;

  beforeEach(() => {
    manager = new OverlayManagerCore({ dummy: Dummy });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('opens by key and returns PromiseWithId', async () => {
    const p = manager.open('dummy');
    expect(p).toHaveProperty('id');
    const id = (p as any).id;
    expect(typeof id).toBe('string');
    expect(manager.isOpen(id)).toBe(true);
  });

  it('opens by component directly', async () => {
    const p = manager.open(Dummy);
    const id = (p as any).id;
    expect(manager.isOpen(id)).toBe(true);
  });

  it('close resolves the promise', async () => {
    const p = manager.open('dummy');
    const id = (p as any).id;
    const inst = manager.getInstance(id)!;

    const resolved = vi.fn();
    p.then(resolved);

    inst.close();

    // defaultExitDuration undefined - removal depends on events/timers/manual; but promise resolves immediately on close
    await Promise.resolve(); // flush microtasks
    expect(resolved).toHaveBeenCalledTimes(1);
  });

  it('update merges props and emits UPDATE', async () => {
    const p = manager.open('dummy', { id: 'overlay_abc' as any });
    const id = (p as any).id;
    const spy = vi.fn();
    const unsub = manager.subscribe(spy);

    manager.update(id, { title: 'Hello' });

    const inst = manager.getInstance(id)!;
    expect((inst.props as any).title).toBe('Hello');
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'UPDATE', id })
    );

    unsub();
  });

  it('hide does not resolve the promise, show re-displays', async () => {
    const p = manager.open('dummy');
    const id = (p as any).id;
    const inst = manager.getInstance(id)!;

    const resolved = vi.fn();
    p.then(resolved);

    inst.hide();
    expect(manager.getInstance(id)!.visible).toBe(false);

    manager.show(id);
    expect(manager.getInstance(id)!.visible).toBe(true);

    expect(resolved).not.toHaveBeenCalled();
  });

  it('show on unknown id throws OverlayNotFoundError', () => {
    expect(() => manager.show('unknown' as any)).toThrow(OverlayNotFoundError);
  });

  it('duplicate id when visible throws OverlayAlreadyOpenError', () => {
    const p1 = manager.open('dummy', { id: 'dup' as any });
    const id1 = (p1 as any).id;
    expect(id1).toBe('dup');

    expect(() => manager.open('dummy', { id: 'dup' as any })).toThrow(
      OverlayAlreadyOpenError
    );
  });

  it('reopen hidden overlay with same id shows and updates props without throwing', () => {
    const p = manager.open('dummy', { id: 'same' as any });
    const id = (p as any).id;
    const inst = manager.getInstance(id)!;

    inst.hide();
    expect(manager.getInstance(id)!.visible).toBe(false);

    const p2 = manager.open('dummy', { id: 'same' as any, foo: 'bar' } as any);
    expect(p2).toBe(p);
    const inst2 = manager.getInstance(id)!;
    expect(inst2.visible).toBe(true);
    expect((inst2.props as any).foo).toBe('bar');
  });

  it('closeAll triggers close on all instances', () => {
    const p1 = manager.open('dummy');
    const p2 = manager.open('dummy');

    expect(manager.getOpenCount()).toBe(2);

    manager.defaultExitDuration = 0;
    manager.closeAll();

    // 0ms duration removes immediately
    vi.advanceTimersByTime(0);

    expect(manager.getOpenCount()).toBe(0);
    expect(manager.isOpen((p1 as any).id)).toBe(false);
    expect(manager.isOpen((p2 as any).id)).toBe(false);
  });
});
