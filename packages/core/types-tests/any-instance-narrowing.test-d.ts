import { expectError, expectType } from 'tsd';
import {
  createOverlayManager,
  defineOverlay,
  type InjectedOverlayProps,
  type AnyOverlayInstance,
} from '../src';

type ConfirmProps = { message: string };
const Confirm = defineOverlay<ConfirmProps, boolean>(
  (_: ConfirmProps & InjectedOverlayProps<boolean>) => null as any
);

const mgr = createOverlayManager({ confirm: Confirm });

const maybeInst = mgr.getInstance('overlay_123' as any);

if (maybeInst) {
  expectType<AnyOverlayInstance<(typeof mgr)['registry']>>(maybeInst);

  if ('key' in maybeInst) {
    // When 'key' exists, it must be the registry key type
    expectType<'confirm'>(maybeInst.key);
  } else {
    // Non-registry instances should not have 'key'
    // @ts-expect-error - key should not exist here
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    maybeInst.key;
  }
}
