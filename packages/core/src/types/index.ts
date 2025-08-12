import { ComponentType } from 'react';
import type { OverlayManagerCore } from '../manager/OverlayManagerCore';

/* ---------------------------------------------------------------- *\
 *  Core Primitives
\* ---------------------------------------------------------------- */

/**
 * A branded type for overlay IDs to ensure type safety.
 * @example 'overlay_123'
 */
export type OverlayId = string & { readonly __brand: 'OverlayId' };

/**
 * A Promise that includes the ID of the overlay it's associated with.
 * @template T The result type of the promise.
 */
export interface PromiseWithId<T> extends Promise<T> {
  id: OverlayId;
}

export interface OverlayManagerBase {
  open<P, R>(
    component: OverlayComponent<P, R>,
    options: OpenOptions<P>
  ): PromiseWithId<R>;
  /**
   * Narrow this manager to a typed `OverlayManagerCore` with a known registry.
   * This is a purely type-level helper and has no runtime cost.
   */
  as<TReg extends OverlayRegistry>(): OverlayManagerCore<TReg>;
}

/**
 * Props that are automatically injected into every overlay component by the manager.
 * @template TResult The type of the result that the overlay's `close` function will resolve with.
 */
export interface InjectedOverlayProps<TResult = unknown> {
  /** The unique ID of the overlay instance. */
  id: OverlayId;
  /** Whether the overlay is currently visible. Use this to trigger animations. */
  visible: boolean;
  /** A function to hide the overlay without destroying it. The overlay remains in the DOM. */
  hide: () => void;
  /** A function to close the overlay, optionally returning a result. This initiates the removal process. */
  close: (result?: TResult) => void;
  /**
   * A callback to signal that the exit animation has completed.
   * Required for manual removal when not using `exitDuration`.
   */
  onExitComplete: () => void;
  manager: OverlayManagerBase;
}

/**
 * The base type for any component that can be used as an overlay.
 * It's a React component that accepts its own props plus the `InjectedOverlayProps`.
 * @template P The component's own props.
 * @template R The result type the component's `close` function will resolve with.
 */
export type OverlayComponent<P = object, R = void> = ComponentType<
  P & InjectedOverlayProps<R>
>;

/* ---------------------------------------------------------------- *\
 *  Type Helpers
\* ---------------------------------------------------------------- */

/**
 * Defines the stacking behavior when a new overlay is opened.
 * - `stack`: New overlays are rendered on top, previous ones remain visible. (e.g., for toasts)
 * - `hide-previous`: New overlays hide the one directly beneath them. (e.g., for modals)
 */
export type StackingBehavior = 'stack' | 'hide-previous';

/**
 * Extracts the user-defined props from an `OverlayComponent`,
 * excluding the automatically `InjectedOverlayProps`.
 * @template T The `OverlayComponent` type.
 */
export type ComponentProps<T> =
  T extends OverlayComponent<infer P, infer R>
    ? Omit<P, keyof InjectedOverlayProps<R>>
    : never;

/**
 * Extracts the result type from an `OverlayComponent`.
 * @template T The `OverlayComponent` type.
 */
export type OverlayResult<T> =
  T extends ComponentType<infer P>
    ? P extends InjectedOverlayProps<infer R>
      ? R
      : never
    : never;

/**
 * A helper type that "flattens" an object type to improve IntelliSense.
 * @internal
 */
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Defines the options for the `manager.open()` method by merging component props
 * with manager-specific options. The optionality of this entire argument is
 * determined by the `open()` method signature itself.
 *
 * @template P The component's props type (`ComponentProps<T>`).
 */
export type OpenOptions<P> = Prettify<
  P & {
    id?: OverlayId;
    exitDuration?: number | null;
    /** Custom portal target for this specific overlay. Overrides the manager's default. */
    portalTarget?: HTMLElement | null;
    /** Overrides the global stacking behavior for this specific overlay. */
    stackingBehavior?: StackingBehavior;
  }
>;

/**
 * A map of string keys to `OverlayComponent`s, defining the overlay registry.
 */
export type OverlayRegistry = Record<
  string | number | symbol,
  OverlayComponent<any, any>
>;

/* ---------------------------------------------------------------- *\
 *  Store & Instance Shapes
\* ---------------------------------------------------------------- */

/**
 * Represents a single, active overlay instance within the manager's state.
 * @template P The component's own props.
 * @template R The component's result type.
 */
export interface OverlayInstance<
  P = object,
  R = unknown,
  TRegistry extends OverlayRegistry = any,
> {
  id: OverlayId;
  component: OverlayComponent<P, R>;
  props: P;
  visible: boolean;
  isClosing: boolean;
  hide: () => void;
  close: (result?: R) => void;
  onExitComplete: () => void;
  /** The DOM element where the overlay is rendered. */
  portalTarget: HTMLElement | null;
  /** The stacking behavior used for this specific overlay instance. */
  stackingBehavior: StackingBehavior;
  manager: OverlayManagerCore<TRegistry>;
}

/**
 * Represents the complete state of the overlay manager.
 * @template TReg The application's `OverlayRegistry`.
 */
export interface OverlayState<TReg extends OverlayRegistry = OverlayRegistry> {
  instances: Map<OverlayId, AnyOverlayInstance<TReg>>;
  overlayStack: OverlayId[];
}

/**
 * A typed `OverlayInstance` that is tied to a key in the `OverlayRegistry`.
 * It includes a `key` property.
 * @template TReg The application's `OverlayRegistry`.
 * @template K The key within the `OverlayRegistry`.
 */
export type RegistryInstance<
  TReg extends OverlayRegistry,
  K extends keyof TReg,
> = OverlayInstance<ComponentProps<TReg[K]>, OverlayResult<TReg[K]>> & {
  key: K;
};

/**
 * A union of all possible `OverlayInstance` types, whether from the registry or opened directly.
 * @template TReg The application's `OverlayRegistry`.
 */
export type AnyOverlayInstance<TReg extends OverlayRegistry> =
  | RegistryInstance<TReg, keyof TReg>
  | OverlayInstance<any, any>;

/**
 * Helper type to resolve the actual component type from the input
 * @template T The input type (key or component).
 * @template TRegistry The application's `OverlayRegistry`.
 */
export type ResolveComponent<
  T,
  TRegistry extends OverlayRegistry,
> = T extends keyof TRegistry ? TRegistry[T] : T;
