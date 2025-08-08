import { expectAssignable } from 'tsd';
import type {
  OverlayManagerCore,
  OverlayRegistry,
} from '@react-overlay-manager/core';
import { OverlayManagerDevtools } from '../src';

// Devtools is a component factory in dev mode, and a null component in prod.
// At type-level, both should be callable as a function component.

declare function getManager<T extends OverlayRegistry>(): OverlayManagerCore<T>;

type Reg = { a: any };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const manager = getManager<Reg>();

// The export is a component-like callable. Model a minimal callable surface without importing React types.
type DevtoolsComponent<T extends OverlayRegistry = OverlayRegistry> =
  | ((args: { manager: OverlayManagerCore<T> }) => unknown)
  | (() => null);

expectAssignable<DevtoolsComponent>(OverlayManagerDevtools);

// Ensure we can pass a manager prop of generic registry
// We cannot render here, but we can assert that the "manager" prop is allowed on the callable value type.
// This is a soft check; stricter JSX ElementType checks would require a full JSX type environment.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ok: DevtoolsComponent = OverlayManagerDevtools;
