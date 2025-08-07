import { expectError } from 'tsd';
import {
  createOverlayManager,
  defineOverlay,
  type InjectedOverlayProps,
} from '../src';

interface TestModalProps {
  title: string;
  msg: string;
}

const TestModal = defineOverlay<TestModalProps, void>(
  (_: TestModalProps & InjectedOverlayProps<void>) => null as any
);

const localManager = createOverlayManager({ testModal: TestModal });

// Using the component directly: should require options
expectError(localManager.open(TestModal));

// Using the registry key: should require options as well
expectError(localManager.open('testModal'));

// Missing required prop should error (component)
expectError(localManager.open(TestModal, { title: 't' }));
// Missing required prop should error (key)
expectError(localManager.open('testModal', { title: 't' }));

// Wrong prop type should error (component)
expectError(localManager.open(TestModal, { title: 123, msg: 'm' }));
// Wrong prop type should error (key)
expectError(localManager.open('testModal', { title: 't', msg: 456 }));

// Correct usages
localManager.open(TestModal, { title: 't', msg: 'm' });
localManager.open('testModal', { title: 't', msg: 'm' });
