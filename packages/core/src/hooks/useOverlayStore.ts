'use client';
import { useSyncExternalStore, useRef, useCallback } from 'react';
import { OverlayState, OverlayRegistry } from '../types';
import { OverlayManagerCore } from '../manager/OverlayManagerCore';

/**
 * React hook for subscribing to overlay manager state changes.
 * It's highly optimized and will only re-render the component
 * if the selected state changes.
 *
 * @param manager The overlay manager instance.
 * @param selector A function to select a part of the state.
 * @returns The selected state.
 *
 * @example
 * ```tsx
 * const overlayCount = useOverlayStore(manager, state => state.overlayStack.length);
 * const isModalOpen = useOverlayStore(manager, state => state.instances.has('modal-1'));
 * ```
 */
export function useOverlayStore<
  TRegistry extends OverlayRegistry,
  TSelected = OverlayState<TRegistry>,
>(
  manager: OverlayManagerCore<TRegistry>,
  selector: (state: OverlayState<TRegistry>) => TSelected = (s) =>
    s as TSelected
): TSelected {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return manager.subscribeWithSelector(
        (state) => selectorRef.current(state),
        onStoreChange
      );
    },
    [manager]
  );

  const getSnapshot = useCallback(
    () => selector(manager.getState()),
    [manager, selector]
  );

  const getServerSnapshot = useCallback(
    () => selector(manager.getState()),
    [manager, selector]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
