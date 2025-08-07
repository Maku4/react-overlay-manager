import type {
  AnyOverlayInstance,
  OverlayComponent,
  OverlayInstance,
  OverlayRegistry,
} from '../types';

/**
 * Safely derive component display name without using any casts at call sites.
 * Preference order: displayName -> function name -> 'Component'
 */
export function getOverlayName(c: unknown): string {
  try {
    if (c && typeof c === 'function') {
      type NamedFn = { displayName?: string; name?: string };
      const fn = c as NamedFn;
      return (
        (fn.displayName && fn.displayName.length > 0
          ? fn.displayName
          : fn.name) || 'Component'
      );
    }
    if (c && typeof c === 'object') {
      const obj = c as { displayName?: string; name?: string };
      if (typeof obj.displayName === 'string' && obj.displayName.length > 0) {
        return obj.displayName;
      }
      if (typeof obj.name === 'string' && obj.name.length > 0) {
        return obj.name;
      }
    }
  } catch {
    // noop
  }
  return 'Component';
}

/**
 * Get component name from an overlay instance safely.
 */
export function getInstanceOverlayName<
  TRegistry extends OverlayRegistry = OverlayRegistry,
>(
  inst: OverlayInstance<unknown, unknown> | AnyOverlayInstance<TRegistry>
): string {
  const component = (inst as OverlayInstance<unknown, unknown>)
    .component as OverlayComponent<unknown, unknown>;
  return getOverlayName(component);
}
