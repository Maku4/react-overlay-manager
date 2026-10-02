import { createElement, lazy } from 'react';
import { expectError, expectType } from 'tsd';
import {
  createOverlayManager,
  defineOverlay,
  overlays,
  type OverlayId,
  type PromiseWithId,
} from '../src';

const Confirm = defineOverlay<{ message: string }, boolean>(({ close }) => {
  close();
  return createElement('div');
});
const manager = createOverlayManager({ confirm: Confirm });

// Cancellation can resolve without a result even for a boolean overlay.
const pending = manager.open('confirm', { message: 'Continue?' });
expectType<PromiseWithId<boolean | undefined>>(pending);

async function useResult() {
  const answer = await pending;
  expectType<boolean | undefined>(answer);
  // @ts-expect-error Cancellation requires checking for undefined first.
  answer.valueOf();
  if (answer !== undefined) answer.valueOf();
}
void useResult;

expectType<OverlayId>(pending.id);
expectType<PromiseWithId<boolean | undefined>>(
  manager.open(Confirm, { message: 'Direct' })
);
const LazyConfirm = lazy(async () => ({ default: Confirm }));
const lazyManager = createOverlayManager({ confirm: LazyConfirm });
expectType<PromiseWithId<boolean | undefined>>(
  lazyManager.open('confirm', { message: 'Lazy key' })
);
expectType<PromiseWithId<boolean | undefined>>(
  lazyManager.open(LazyConfirm, { message: 'Lazy direct' })
);
expectType<PromiseWithId<boolean | undefined>>(
  overlays.open(Confirm, { message: 'Shared manager' })
);
const Opener = defineOverlay(({ manager: injected }) => {
  expectType<PromiseWithId<boolean | undefined>>(
    injected.open(Confirm, { message: 'Injected manager' })
  );
  expectError(injected.open(Confirm, {}));
  return createElement('div');
});
void Opener;

const Optional = defineOverlay<{ label?: string }, boolean>(() =>
  createElement('div')
);
expectType<PromiseWithId<boolean | undefined>>(overlays.open(Optional));
const Explicit = defineOverlay<object, boolean | undefined>(() =>
  createElement('div')
);
const Nothing = defineOverlay<object, undefined>(() => createElement('div'));
const Void = defineOverlay<object, void>(() => createElement('div'));
const Unknown = defineOverlay<object, unknown>(() => createElement('div'));
const Never = defineOverlay<object, never>(() => createElement('div'));
expectType<PromiseWithId<boolean | undefined>>(overlays.open(Explicit));
expectType<PromiseWithId<undefined>>(overlays.open(Nothing));
expectType<PromiseWithId<void>>(overlays.open(Void));
expectType<PromiseWithId<unknown>>(overlays.open(Unknown));
expectType<PromiseWithId<undefined>>(overlays.open(Never));

expectError(manager.open('confirm'));
expectError(manager.open('confirm', { message: 42 }));
expectError(manager.open('confirm', { message: 'x', extra: true }));
expectError(manager.open('confirm', { message: 'x', id: 'plain' }));
expectError(manager.open('missing', { message: 'x' }));
const CheckedClose = defineOverlay<object, boolean>(({ close }) => {
  close(false);
  close();
  expectError(close('wrong'));
  return createElement('div');
});
void CheckedClose;
