import { expectError, expectType } from 'tsd';
import {
  createOverlayManager,
  defineOverlay,
  type OverlayManagerCore,
  type InjectedOverlayProps,
} from '../src';

// --- Setup ---
const MyComponent = defineOverlay<{}, void>(
  (_: InjectedOverlayProps<void>) => null as any
);

// --- Tests ---

// 1. Manager without a registry
const emptyManager = createOverlayManager();
expectType<OverlayManagerCore<Record<never, never>>>(emptyManager);

// 1.1. Opening by key should be impossible (key is 'never')
expectError(emptyManager.open('any-key', {}));

// 1.2. Opening by component should still work
emptyManager.open(MyComponent, {});

// 2. Manager with a registry
const registry = { myComp: MyComponent };
const managerWithRegistry = createOverlayManager(registry);

// 2.1. Opening by a valid key should work
managerWithRegistry.open('myComp');

// 2.2. Opening by a non-existent key should fail
expectError(managerWithRegistry.open('non-existent-key'));

// 3. Manager with numeric keys in registry
const numericRegistry = { 123: MyComponent };
const managerWithNumericKeys = createOverlayManager(numericRegistry);

// 3.1. Opening by a valid numeric key should work
managerWithNumericKeys.open(123);

// 3.2. Opening by a non-existent numeric key should fail
expectError(managerWithNumericKeys.open(456));
