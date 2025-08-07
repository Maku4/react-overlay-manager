import { useEffect, useState } from 'react';
import { useOverlayStore } from '../hooks/useOverlayStore';
import { OverlayManagerCore } from '../manager/OverlayManagerCore';
import { OverlayRegistry, StackingBehavior } from '../types';
import { OverlayItem } from './OverlayItem';

const DEFAULT_Z_INDEX_BASE = 100 as const;

/**
 * Props for the OverlayManager component.
 */
export interface OverlayManagerProps<TRegistry extends OverlayRegistry> {
  manager: OverlayManagerCore<TRegistry>;
  zIndexBase?: number;
  /**
   * Default exit animation duration in milliseconds for all overlays.
   * - Set to a number to enable the fallback timer.
   * - Set to `null` to disable the fallback timer globally and rely on `onExitComplete`.
   * Can be overridden by the `exitDuration` option in `manager.open()`.
   */
  defaultExitDuration?: number | null;
  /**
   * Global portal target for all overlays. Can be overridden per `open()` call.
   * @default document.body
   */
  portalTarget?: HTMLElement | null;
  /**
   * Defines the global stacking behavior when a new overlay is opened.
   * - `stack`: New overlays are rendered on top, previous ones remain visible.
   * - `hide-previous`: New overlays hide the one directly beneath them.
   * @default 'hide-previous'
   */
  stackingBehavior?: StackingBehavior;
}

/**
 * Manages the overlay stack and renders active overlays.
 * This component should be placed near the root of your application.
 *
 * @example
 * ```tsx
 * const overlays = createOverlayManager({
 *   confirm: ConfirmDialog,
 * });
 *
 * function App() {
 *   return (
 *     <div>
 *       <YourAppContent />
 *       <OverlayManager manager={overlays} />
 *     </div>
 *   );
 * }
 * ```
 */
export function OverlayManager<TRegistry extends OverlayRegistry>({
  manager,
  zIndexBase = DEFAULT_Z_INDEX_BASE,
  defaultExitDuration,
  portalTarget,
  stackingBehavior,
}: OverlayManagerProps<TRegistry>) {
  // Ensures we only attempt to portal on the client, preventing SSR issues.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // Synchronize props with the imperative manager instance.
  useEffect(() => {
    manager.defaultExitDuration = defaultExitDuration;
    if (portalTarget !== undefined) {
      manager.defaultPortalTarget = portalTarget;
    }
    manager.stackingBehavior = stackingBehavior ?? 'hide-previous';
  }, [manager, defaultExitDuration, portalTarget, stackingBehavior]);

  const overlayStack = useOverlayStore(manager, (state) => state.overlayStack);

  if (!isMounted || overlayStack.length === 0) {
    return null;
  }

  return (
    <>
      {overlayStack.map((id, index) => (
        <OverlayItem
          key={id}
          id={id}
          manager={manager}
          zIndex={zIndexBase + index}
        />
      ))}
    </>
  );
}
