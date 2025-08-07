import { expectError } from 'tsd';
import {
  createOverlayManager,
  defineOverlay,
  type InjectedOverlayProps,
} from '../src';

const Comp = defineOverlay<{ a: number }, void>(
  (_: { a: number } & InjectedOverlayProps<void>) => null as any
);

// Numeric keys
const mgrNum = createOverlayManager({ 123: Comp });
expectError(mgrNum.open(123)); // requires options
mgrNum.open(123, { a: 1 });

// Symbol keys
const sym = Symbol('s');
const mgrSym = createOverlayManager({ [sym]: Comp });
expectError(mgrSym.open(sym)); // requires options
mgrSym.open(sym, { a: 1 });
