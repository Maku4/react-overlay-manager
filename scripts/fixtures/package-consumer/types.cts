import React = require('react');
import core = require('@react-overlay-manager/core');
import devtools = require('@react-overlay-manager/devtools');

const Dialog = core.defineOverlay<{ title: string }, boolean>(() =>
  React.createElement('div')
);
const manager = core.createOverlayManager({ dialog: Dialog });
const result: core.PromiseWithId<boolean | undefined> = manager.open('dialog', {
  title: 'Hello',
});
React.createElement(core.OverlayManager<typeof manager.registry>, { manager });
function DevtoolsForManager(props: { manager: typeof manager }) {
  return devtools.OverlayManagerDevtools(props);
}
React.createElement(DevtoolsForManager, { manager });
result.then((value: boolean | undefined) => {
  // @ts-expect-error The overlay can close without a result.
  value.valueOf();
  if (value !== undefined) value.valueOf();
});
// @ts-expect-error The required dialog title cannot be omitted.
manager.open('dialog');
// @ts-expect-error Closing without a result resolves undefined.
const unguarded: core.PromiseWithId<boolean> = result;
void unguarded;
// @ts-expect-error The dialog result is boolean or undefined.
const invalid: core.PromiseWithId<string> = result;
void invalid;
