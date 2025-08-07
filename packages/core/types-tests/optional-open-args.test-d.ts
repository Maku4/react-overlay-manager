import { expectError } from 'tsd';
import {
  createOverlayManager,
  defineOverlay,
  type InjectedOverlayProps,
} from '../src';

// Overlay with only optional props
type OptProps = { a?: number; b?: string };
const OptionalOnly = defineOverlay<OptProps, void>(
  (_: OptProps & InjectedOverlayProps<void>) => null as any
);
const m1 = createOverlayManager({ opt: OptionalOnly });
// options arg should be optional
m1.open('opt');
m1.open(OptionalOnly);

// Overlay with at least one required prop
type ReqProps = { a: number; b?: string };
const RequiredOne = defineOverlay<ReqProps, void>(
  (_: ReqProps & InjectedOverlayProps<void>) => null as any
);
const m2 = createOverlayManager({ req: RequiredOne });
// options arg should be required here
expectError(m2.open('req'));
expectError(m2.open(RequiredOne));
