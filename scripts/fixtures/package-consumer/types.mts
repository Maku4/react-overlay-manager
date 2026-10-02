import { createElement } from 'react';
import {
  createOverlayManager,
  defineOverlay,
  OverlayManager,
  type PromiseWithId,
} from '@react-overlay-manager/core';
import { OverlayManagerDevtools } from '@react-overlay-manager/devtools';

const Dialog = defineOverlay<{ title: string }, boolean>(() =>
  createElement('div')
);
const manager = createOverlayManager({ dialog: Dialog });
const result = manager.open('dialog', {
  title: 'Hello',
});
createElement(OverlayManager<typeof manager.registry>, { manager });
function DevtoolsForManager(props: { manager: typeof manager }) {
  return OverlayManagerDevtools(props);
}
createElement(DevtoolsForManager, { manager });
const compatible: PromiseWithId<boolean | undefined> = result;
void compatible;
result.then((value) => {
  // @ts-expect-error The overlay can close without a result.
  value.valueOf();
  if (value !== undefined) value.valueOf();
});
async function useAwaitedResult() {
  const value = await result;
  // @ts-expect-error Inferred results require checking cancellation.
  value.valueOf();
  if (value !== undefined) {
    const confirmed: boolean = value;
    void confirmed;
  }
}
void useAwaitedResult;
// @ts-expect-error The required dialog title cannot be omitted.
manager.open('dialog');
// @ts-expect-error Closing without a result resolves undefined.
const unguarded: PromiseWithId<boolean> = result;
void unguarded;
// @ts-expect-error The dialog result is boolean or undefined.
const invalid: PromiseWithId<string> = result;
void invalid;
