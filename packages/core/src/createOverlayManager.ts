import { OverlayManagerCore } from './manager/OverlayManagerCore';
import { OverlayRegistry } from './types';

interface CreateOverlayManagerFn {
  /**
   * Creates a new overlay manager instance with a type-safe registry.
   * @param registry A map of string keys to OverlayComponents.
   */
  <T extends OverlayRegistry>(registry: T): OverlayManagerCore<T>;
  /**
   * Creates a new overlay manager instance without a registry.
   * Useful when you only want to use components directly with `manager.open(Component, ...)`.
   */
  (): OverlayManagerCore<Record<never, never>>;
}

const implementation = <T extends OverlayRegistry = Record<never, never>>(
  registry?: T
): OverlayManagerCore<T> => {
  return new OverlayManagerCore(registry || ({} as T));
};

/**
 * Creates a new overlay manager instance with type-safe registry.
 *
 * @example
 * ```tsx
 * const overlays = createOverlayManager({
 *   confirm: ConfirmDialog,
 *   alert: AlertDialog,
 * });
 *
 * // Using registry key
 * const result = await overlays.open('confirm', {
 *   message: 'Are you sure?'
 * });
 *
 * // Using component directly
 * const result = await overlays.open(CustomDialog, {
 *   title: 'Custom Dialog'
 * });
 * ```
 */
export const createOverlayManager: CreateOverlayManagerFn = implementation;

/**
 * A default, shared overlay manager instance without a registry.
 * Useful for simple applications or for getting started quickly.
 *
 * @example
 * import { overlays } from 'react-overlay-manager';
 * overlays.open(MyDialog, { title: 'Hello' });
 */
export const overlays = createOverlayManager();
