import { expectType } from 'tsd';
import {
  defineOverlay,
  type OverlayComponent,
  type ComponentProps,
  type OverlayResult,
  type InjectedOverlayProps,
} from '../src';

type Props = { a: number; b?: string };
type Result = { ok: true };

const Comp: OverlayComponent<Props, Result> = defineOverlay<Props, Result>(
  (_: Props & InjectedOverlayProps<Result>) => null as any
);

// ComponentProps extracts the user-defined props
expectType<Props>({} as ComponentProps<typeof Comp>);

// OverlayResult extracts the result type
expectType<Result>({} as OverlayResult<typeof Comp>);
