import { expectError, expectType } from 'tsd';
import { createOverlayManager, overlays, type ManagerEvent } from '../src';

const m = createOverlayManager();

// subscribe() listener event typing
m.subscribe((e) => {
  expectType<ManagerEvent<(typeof m)['registry']>>(e);
});

// default 'overlays' has an empty registry; opening by key should be rejected
expectError(
  // @ts-expect-error - no registry keys available
  overlays.open('anything')
);

// But opening by component is allowed; we do not need to assert here at type-level.
