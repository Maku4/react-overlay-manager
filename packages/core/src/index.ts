declare const __VERSION__: string;

// Core factory
export { createOverlayManager, overlays } from './createOverlayManager';

// Core component and hook
export { OverlayManager } from './components/OverlayManager';
export { useOverlayStore } from './hooks/useOverlayStore';

// Component definition helper
export { defineOverlay } from './defineOverlay';

// Internal exports (for DevTools or advanced usage)
export type { ManagerEvent } from './manager/events.types';
export { OverlayManagerCore } from './manager/OverlayManagerCore';

// Devtools-safe helpers
export {
  getInstanceOverlayName,
  getOverlayName,
} from './utils/component.helpers';

// Public type exports
export type {
  AnyOverlayInstance,
  ComponentProps,
  InjectedOverlayProps,
  // Props/result helpers
  OpenOptions,
  OverlayComponent,
  // Core public types
  OverlayId,
  OverlayInstance,
  OverlayRegistry,
  OverlayResult,
  OverlayState,
  PromiseWithId,
  // Typed instances
  RegistryInstance,
} from './types';

export type { OverlayManagerProps } from './components/OverlayManager';

// Error exports
export { OverlayAlreadyOpenError, OverlayNotFoundError } from './utils/errors';

// Version
export const version = __VERSION__;
