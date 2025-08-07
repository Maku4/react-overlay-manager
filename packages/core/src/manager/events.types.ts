import { OverlayComponent, OverlayId, OverlayRegistry } from '../types';

export type ManagerEvent<TRegistry extends OverlayRegistry> =
  | {
      type: 'OPEN';
      id: OverlayId;
      key?: keyof TRegistry;
      component: OverlayComponent<any, any>;
    }
  | { type: 'SHOW'; id: OverlayId }
  | { type: 'HIDE'; id: OverlayId }
  | { type: 'UPDATE'; id: OverlayId; props: any }
  | { type: 'REMOVE'; id: OverlayId };

export function isOpenEvent<TReg extends OverlayRegistry>(
  e: ManagerEvent<TReg>
): e is Extract<ManagerEvent<TReg>, { type: 'OPEN' }> {
  return e.type === 'OPEN';
}

export function isShowEvent<TReg extends OverlayRegistry>(
  e: ManagerEvent<TReg>
): e is Extract<ManagerEvent<TReg>, { type: 'SHOW' }> {
  return e.type === 'SHOW';
}

export function isHideEvent<TReg extends OverlayRegistry>(
  e: ManagerEvent<TReg>
): e is Extract<ManagerEvent<TReg>, { type: 'HIDE' }> {
  return e.type === 'HIDE';
}

export function isUpdateEvent<TReg extends OverlayRegistry>(
  e: ManagerEvent<TReg>
): e is Extract<ManagerEvent<TReg>, { type: 'UPDATE' }> {
  return e.type === 'UPDATE';
}

export function isRemoveEvent<TReg extends OverlayRegistry>(
  e: ManagerEvent<TReg>
): e is Extract<ManagerEvent<TReg>, { type: 'REMOVE' }> {
  return e.type === 'REMOVE';
}
