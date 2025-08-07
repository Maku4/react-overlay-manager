// Type-level tests for PromiseWithId typing and inference.
// Run with tsd.

import { expectType } from 'tsd';
import {
  createOverlayManager,
  defineOverlay,
  type OverlayComponent,
  type InjectedOverlayProps,
  type PromiseWithId,
  type OverlayId,
} from '../src';

type Result = { ok: true };
type Props = { title: string };

const Comp: OverlayComponent<Props, Result> = defineOverlay<Props, Result>(
  (_: Props & InjectedOverlayProps<Result>) => ({}) as any
);

const mgr = createOverlayManager({ comp: Comp });

// 1) open returns PromiseWithId<Result>
const p = mgr.open('comp', { title: 'x' });
expectType<PromiseWithId<Result>>(p);

// 2) promise.id has OverlayId type
expectType<OverlayId>(p.id);

// 3) awaited result is Result
async function testAwait() {
  const r = await mgr.open('comp', { title: 'y' });
  expectType<Result>(r);
}
// reference to avoid no-unused warning in tsd
void testAwait;

// 4) then chain infers Result
mgr.open('comp', { title: 'z' }).then((r) => {
  expectType<Result>(r);
});

// 5) open by component directly preserves types
const p2 = mgr.open(Comp, { title: 'k' });
expectType<PromiseWithId<Result>>(p2);
expectType<OverlayId>(p2.id);
