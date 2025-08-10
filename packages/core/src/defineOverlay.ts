import React from 'react';
import type { OverlayComponent, InjectedOverlayProps } from './types';

/**
 * Helper function to define overlay components with proper typing.
 * This ensures that the component receives the correct injected props
 * and returns the proper OverlayComponent type.
 *
 * @example
 * ```tsx
 * export interface MyDialogProps {
 *   title: string;
 *   message: string;
 * }
 *
 * export const MyDialog = defineOverlay<MyDialogProps, boolean>(
 *   ({ title, message, visible, close, onExitComplete }) => {
 *     // Component implementation
 *     return <div>...</div>;
 *   }
 * );
 * ```
 */
export function defineOverlay<TProps = object, TResult = void>(
  component: (
    props: TProps & InjectedOverlayProps<TResult>
  ) => React.JSX.Element
): OverlayComponent<TProps, TResult> {
  const wrappedComponent = component as OverlayComponent<TProps, TResult>;

  if (process.env.NODE_ENV === 'development') {
    const originalName = component.name || 'AnonymousOverlay';
    Object.defineProperty(wrappedComponent, 'displayName', {
      value: `defineOverlay(${originalName})`,
      writable: false,
    });
  }

  return wrappedComponent;
}
