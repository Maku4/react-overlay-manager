import { expectType } from 'tsd';
import {
  createOverlayManager,
  useOverlayStore,
  type AnyOverlayInstance,
  type OverlayId,
  type OverlayState,
} from '../src';

// --- Setup ---
const manager = createOverlayManager();
type Registry = (typeof manager)['registry'];

// --- Tests ---

// 1. Selector argument 'state' should be correctly typed
useOverlayStore(manager, (state) => {
  expectType<OverlayState<Registry>>(state);
  expectType<Map<OverlayId, AnyOverlayInstance<Registry>>>(state.instances);
  expectType<OverlayId[]>(state.overlayStack);
});

// 2. Return type of the hook should be inferred from the selector
const isAnyOpen = useOverlayStore(
  manager,
  (state) => state.overlayStack.length > 0
);
expectType<boolean>(isAnyOpen);

const firstId = useOverlayStore(manager, (state) => state.overlayStack[0]);
expectType<OverlayId>(firstId);

// 3. Selector can return complex types
const allInstances = useOverlayStore(manager, (state) =>
  Array.from(state.instances.values())
);
expectType<AnyOverlayInstance<Registry>[]>(allInstances);

// 4. Hook without a selector should return the full state
const fullState = useOverlayStore(manager);
expectType<OverlayState<Registry>>(fullState);
