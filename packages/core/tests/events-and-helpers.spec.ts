import { describe, it, expect } from 'vitest';
import {
  getOverlayName,
  getInstanceOverlayName,
} from '../src/utils/component.helpers';
import {
  isOpenEvent,
  isShowEvent,
  isHideEvent,
  isUpdateEvent,
  isRemoveEvent,
} from '../src/manager/events.types';
import { defineOverlay } from '../src/defineOverlay';
import { createOverlayManager } from '../src/createOverlayManager';
import type { OverlayComponent } from '../src/types';
import { createElement } from 'react';

describe('helpers and event type guards', () => {
  it('getOverlayName handles functions, named and displayName overrides', () => {
    function Named() {
      return null as any;
    }
    (Named as any).displayName = 'Display';
    expect(getOverlayName(Named)).toBe('Display');
    delete (Named as any).displayName;
    expect(getOverlayName(Named)).toBe('Named');

    const Obj: any = { displayName: 'ObjDisplay' };
    expect(getOverlayName(Obj)).toBe('ObjDisplay');

    expect(getOverlayName(123)).toBe('Component');
  });

  it('getInstanceOverlayName returns component name', async () => {
    const Comp: OverlayComponent<object, void> = defineOverlay<object, void>(
      () => (() => null) as unknown as any
    );
    const overlays = createOverlayManager({ dlg: Comp });
    const p = overlays.open('dlg');
    const inst = overlays.getInstance(p.id)!;
    expect(getInstanceOverlayName(inst)).toBe(getOverlayName(Comp));
  });

  it('event type guards discriminate event unions', () => {
    const open = {
      type: 'OPEN',
      id: 'overlay_1' as unknown as import('../src/types').OverlayId,
      component: (() => null) as unknown as OverlayComponent<any, any>,
    } as const;
    const show = {
      type: 'SHOW',
      id: 'overlay_1' as unknown as import('../src/types').OverlayId,
    } as const;
    const hide = {
      type: 'HIDE',
      id: 'overlay_1' as unknown as import('../src/types').OverlayId,
    } as const;
    const update = {
      type: 'UPDATE',
      id: 'overlay_1' as unknown as import('../src/types').OverlayId,
      props: { a: 1 },
    } as const;
    const remove = {
      type: 'REMOVE',
      id: 'overlay_1' as unknown as import('../src/types').OverlayId,
    } as const;

    expect(isOpenEvent(open)).toBe(true);
    expect(isShowEvent(show)).toBe(true);
    expect(isHideEvent(hide)).toBe(true);
    expect(isUpdateEvent(update)).toBe(true);
    expect(isRemoveEvent(remove)).toBe(true);

    // Negatives
    expect(isOpenEvent(show as unknown as any)).toBe(false);
    expect(isShowEvent(hide as unknown as any)).toBe(false);
    expect(isHideEvent(update as unknown as any)).toBe(false);
    expect(isUpdateEvent(remove as unknown as any)).toBe(false);
    expect(isRemoveEvent(open as unknown as any)).toBe(false);
  });

  it('defineOverlay sets displayName in development mode', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const Comp = defineOverlay<{}, void>(() => createElement('div'));
    expect((Comp as unknown as { displayName: string }).displayName).toContain(
      'defineOverlay'
    );
    process.env.NODE_ENV = prev;
  });
});
