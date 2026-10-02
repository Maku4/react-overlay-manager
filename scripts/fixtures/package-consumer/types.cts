import React = require('react');
import core = require('@react-overlay-manager/core');
import devtools = require('@react-overlay-manager/devtools');

const Dialog = core.defineOverlay<{ title: string }, boolean>(() =>
  React.createElement('div')
);
const manager = core.createOverlayManager({ dialog: Dialog });
const result: core.PromiseWithId<boolean> = manager.open('dialog', {
  title: 'Hello',
});
React.createElement(core.OverlayManager<typeof manager.registry>, { manager });
function DevtoolsForManager(props: { manager: typeof manager }) {
  return devtools.OverlayManagerDevtools(props);
}
React.createElement(DevtoolsForManager, { manager });
result.then((value: boolean) => value);
// @ts-expect-error The required dialog title cannot be omitted.
manager.open('dialog');
// @ts-expect-error The dialog result is boolean.
const invalid: core.PromiseWithId<string> = result;
void invalid;
