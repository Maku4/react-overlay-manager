import { expectType } from 'tsd';
import {
  createOverlayManager,
  defineOverlay,
  type InjectedOverlayProps,
  type OverlayId,
  type RegistryInstance,
} from '../src';

// --- Setup ---
type ConfirmProps = { message: string; title?: string };
type ConfirmResult = boolean;
const ConfirmDialog = defineOverlay<ConfirmProps, ConfirmResult>(
  (_: ConfirmProps & InjectedOverlayProps<ConfirmResult>) => null as any
);

type AlertProps = { content: string };
const AlertDialog = defineOverlay<AlertProps, void>(
  (_: AlertProps & InjectedOverlayProps<void>) => null as any
);

const manager = createOverlayManager({
  confirm: ConfirmDialog,
  alert: AlertDialog,
});

const p = manager.open('confirm', { message: 'Test' });
const id: OverlayId = p.id;

// --- Tests ---

// 1. update()
manager.update(id, { title: 'New Title' });

// 2. getInstancesByKey()
const confirmInstances = manager.getInstancesByKey('confirm');
expectType<Array<RegistryInstance<(typeof manager)['registry'], 'confirm'>>>(
  confirmInstances
);

if (confirmInstances.length > 0) {
  const firstConfirm = confirmInstances[0];
  expectType<'confirm'>(firstConfirm.key);
  expectType<ConfirmProps>(firstConfirm.props);
  expectType<(result?: ConfirmResult) => void>(firstConfirm.close);
}

// 3. getOpenCount() and isOpen()
expectType<number>(manager.getOpenCount());
expectType<boolean>(manager.isOpen(id));
