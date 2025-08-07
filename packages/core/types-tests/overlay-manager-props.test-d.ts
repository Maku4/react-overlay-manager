import { expectAssignable, expectError, expectType } from 'tsd';
import {
  createOverlayManager,
  type OverlayManagerProps,
  type OverlayRegistry,
  type OverlayManagerCore,
} from '../src';

// Manager and registry types
const manager = createOverlayManager();
type Reg = (typeof manager)['registry'];

// OverlayManagerProps shape
type Props = OverlayManagerProps<Reg>;

// Assignable minimal props
expectAssignable<Props>({ manager });

// Assignable with all optional props
expectAssignable<Props>({
  manager,
  zIndexBase: 500,
  defaultExitDuration: 0,
  portalTarget: document.body,
  stackingBehavior: 'stack',
});

// Accepts nulls where allowed
expectAssignable<Props>({
  manager,
  defaultExitDuration: null,
  portalTarget: null,
  stackingBehavior: 'hide-previous',
});

// Invalid literal for stackingBehavior should be rejected
// @ts-expect-error - invalid stackingBehavior
expectError<Props>({ manager, stackingBehavior: 'invalid' });

// Ensure property types are as expected
expectType<number | undefined>(({} as Props).zIndexBase);
expectType<number | null | undefined>(({} as Props).defaultExitDuration);
expectType<HTMLElement | null | undefined>(({} as Props).portalTarget);

// Generic flow: ensure a different registry compiles
declare function acceptProps<T extends OverlayRegistry>(
  p: OverlayManagerProps<T>
): void;
declare const otherManager: OverlayManagerCore<{ x: any }>;
acceptProps<{ x: any }>({ manager: otherManager });
