import { useSyncExternalStore } from 'react';
import type {
  OverlayRegistry,
  OverlayState,
} from '@react-overlay-manager/core';
import type { OverlayManagerCore } from '@react-overlay-manager/core';

export function useDevtoolsStore<
  TRegistry extends OverlayRegistry,
  TSelected = OverlayState<TRegistry>,
>(
  manager: OverlayManagerCore<TRegistry>,
  selector: (state: OverlayState<TRegistry>) => TSelected
): TSelected {
  return useSyncExternalStore(
    (onStoreChange) => manager.subscribe(() => onStoreChange()),
    () => selector(manager.getState()),
    () => selector(manager.getState())
  );
}
