import React = require('react');
import core = require('@react-overlay-manager/core');
import devtools = require('@react-overlay-manager/devtools');

const Dialog = core.defineOverlay<{ title: string }, boolean>(() =>
  React.createElement('div')
);
const manager = core.createOverlayManager({ dialog: Dialog });
const result = manager.open('dialog', {
  title: 'Hello',
});
React.createElement(core.OverlayManager<typeof manager.registry>, { manager });
function DevtoolsForManager(props: { manager: typeof manager }) {
  return devtools.OverlayManagerDevtools(props);
}
React.createElement(DevtoolsForManager, { manager });
const compatible: core.PromiseWithId<boolean | undefined> = result;
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
const unguarded: core.PromiseWithId<boolean> = result;
void unguarded;
// @ts-expect-error The dialog result is boolean or undefined.
const invalid: core.PromiseWithId<string> = result;
void invalid;
