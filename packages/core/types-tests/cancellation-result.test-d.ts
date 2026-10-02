import { createElement } from 'react';
import { expectError, expectType } from 'tsd';
import {
  createOverlayManager,
  defineOverlay,
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
  expectError(answer.valueOf());
  if (answer !== undefined) answer.valueOf();
}
void useResult;
