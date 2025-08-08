import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { defineOverlay } from '../src/defineOverlay';
import { OverlayManagerCore } from '../src/manager/OverlayManagerCore';
import type { OverlayComponent, PromiseWithId, OverlayId } from '../src/types';
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
>(() => React.createElement('div'));

describe('OverlayManagerCore - open/close basics', () => {
  let manager: OverlayManagerCore<{ dummy: typeof Dummy }>;

  beforeEach(() => {
    manager = new OverlayManagerCore({ dummy: Dummy });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('opens by key and returns PromiseWithId', async () => {
    const p: PromiseWithId<void> = manager.open('dummy');
    expect(p).toHaveProperty('id');
    const id = p.id;
    expect(typeof id).toBe('string');
    expect(manager.isOpen(id)).toBe(true);
  });

  it('opens by component directly', async () => {
    const p: PromiseWithId<void> = manager.open(Dummy);
    const id = p.id;
    expect(manager.isOpen(id)).toBe(true);
  });

  it('close resolves the promise', async () => {
    const p: PromiseWithId<void> = manager.open('dummy');
    const id = p.id;
    const inst = manager.getInstance(id)!;

    const resolved = vi.fn();
    p.then(resolved);

    inst.close();

    // defaultExitDuration undefined - removal depends on events/timers/manual; but promise resolves immediately on close
    await Promise.resolve(); // flush microtasks
    expect(resolved).toHaveBeenCalledTimes(1);
  });

  it('update merges props and emits UPDATE', async () => {
    const p: PromiseWithId<void> = manager.open('dummy', {
      id: 'overlay_abc' as OverlayId,
    });
    const id = p.id;
    const spy = vi.fn();
    const unsub = manager.subscribe(spy);

    manager.update(id, { title: 'Hello' });

    const inst = manager.getInstance(id)!;
    expect((inst.props as Record<string, unknown>).title).toBe('Hello');
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'UPDATE', id })
    );

    unsub();
  });

  it('hide does not resolve the promise, show re-displays', async () => {
    const p: PromiseWithId<void> = manager.open('dummy');
    const id = p.id;
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
    expect(() => manager.show('unknown' as unknown as OverlayId)).toThrow(
      OverlayNotFoundError
    );
  });

  it('duplicate id when visible throws OverlayAlreadyOpenError', () => {
    const p1: PromiseWithId<void> = manager.open('dummy', {
      id: 'dup' as OverlayId,
    });
    const id1 = p1.id;
    expect(id1).toBe('dup');

    expect(() => manager.open('dummy', { id: 'dup' as OverlayId })).toThrow(
      OverlayAlreadyOpenError
    );
  });

  it('reopen hidden overlay with same id shows and updates props without throwing', () => {
    const p: PromiseWithId<void> = manager.open('dummy', {
      id: 'same' as OverlayId,
    });
    const id = p.id;
    const inst = manager.getInstance(id)!;

    inst.hide();
    expect(manager.getInstance(id)!.visible).toBe(false);

    const p2 = manager.open('dummy', {
      id: 'same' as OverlayId,
      foo: 'bar',
    } as Record<string, unknown>);
    expect(p2).toBe(p);
    const inst2 = manager.getInstance(id)!;
    expect(inst2.visible).toBe(true);
    expect((inst2.props as Record<string, unknown>).foo).toBe('bar');
  });

  it('closeAll triggers close on all instances', () => {
    const p1: PromiseWithId<void> = manager.open('dummy');
    const p2: PromiseWithId<void> = manager.open('dummy');

    expect(manager.getOpenCount()).toBe(2);

    manager.defaultExitDuration = 0;
    manager.closeAll();

    // 0ms duration removes immediately
    vi.advanceTimersByTime(0);

    expect(manager.getOpenCount()).toBe(0);
    expect(manager.isOpen(p1.id)).toBe(false);
    expect(manager.isOpen(p2.id)).toBe(false);
  });
});
