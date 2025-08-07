import { expectType, expectError } from 'tsd';
import {
  createOverlayManager,
  defineOverlay,
  type OverlayComponent,
  type OpenOptions,
  type InjectedOverlayProps,
  type OverlayId,
  type PromiseWithId,
} from '../src';

// This variable usage is just to keep the import, not actually used in tests
const _keepOpenOptions: OpenOptions<object> = {};
void _keepOpenOptions; // Mark as used

type ConfirmProps = { message: string };
type ConfirmResult = boolean;

const Confirm: OverlayComponent<ConfirmProps, ConfirmResult> = defineOverlay<
  ConfirmProps,
  ConfirmResult
>((_: ConfirmProps & InjectedOverlayProps<ConfirmResult>) => {
  // implementation irrelevant for type tests
  return null as any;
});

const overlays = createOverlayManager({ confirm: Confirm });

// 1) Open by key enforces props - missing required prop message
expectError(overlays.open('confirm', {})); // ✓ Should error: missing required 'message' prop

expectError(overlays.open('confirm')); // ✓ Should error: expect 2 arguments

// 2) Correct usage with required prop
const p1 = overlays.open('confirm', { message: 'Are you sure?' });
expectType<PromiseWithId<boolean>>(p1);

// 3) Wrong prop types rejected - number not assignable to string
expectError(overlays.open('confirm', { message: 123 })); // ✓ TypeScript correctly rejects this

// 4) Unknown props rejected
expectError(overlays.open('confirm', { message: 'ok', unknownProp: true })); // ✓ TypeScript correctly rejects unknown props

// 5) OpenOptions extras: id, exitDuration, portalTarget, stackingBehavior
const p2 = overlays.open('confirm', {
  message: 'hello',
  id: 'overlay_custom' as OverlayId,
  exitDuration: 200,
  portalTarget: document.body,
  stackingBehavior: 'hide-previous',
});
expectType<PromiseWithId<boolean>>(p2);

// 6) exitDuration can be null (manual completion)
const p3 = overlays.open('confirm', { message: 'hi', exitDuration: null });
expectType<PromiseWithId<boolean>>(p3);

// 7) stackingBehavior literal types - invalid value
// For tsd, we let TypeScript naturally reject the invalid literal
expectError(
  overlays.open('confirm', {
    message: 'x',
    stackingBehavior: 'invalid', // TypeScript knows this isn't 'stack' | 'hide-previous'
  })
);

// 8) portalTarget accepts HTMLElement | null
const p4 = overlays.open('confirm', { message: 'x', portalTarget: null });
expectType<PromiseWithId<boolean>>(p4);

// 9) Open by component directly uses component prop type
const p5 = overlays.open(Confirm, { message: 'direct' });
expectType<PromiseWithId<boolean>>(p5);

// 10) For empty-props overlay, options should be optional
type EmptyProps = object;
const EmptyOverlay: OverlayComponent<EmptyProps, void> = defineOverlay<
  EmptyProps,
  void
>((_: EmptyProps & InjectedOverlayProps<void>) => null as any);
const mgr2 = createOverlayManager({ empty: EmptyOverlay });
const pEmpty = mgr2.open('empty'); // no options needed
expectType<PromiseWithId<void>>(pEmpty);
