import { expectError } from 'tsd';
import {
  createOverlayManager,
  defineOverlay,
  type InjectedOverlayProps,
  type OverlayComponent,
} from '../src';

const Comp: OverlayComponent<{}, void> = defineOverlay<{}, void>(
  (_: {} & InjectedOverlayProps<void>) => null as any
);

const mgr = createOverlayManager({ c: Comp });

// id must be an OverlayId; plain string should be rejected
expectError(
  mgr.open('c', {
    // @ts-expect-error - string is not OverlayId
    id: 'plain-string',
  })
);
