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
const result: PromiseWithId<boolean> = manager.open('dialog', {
  title: 'Hello',
});
createElement(OverlayManager<typeof manager.registry>, { manager });
function DevtoolsForManager(props: { manager: typeof manager }) {
  return OverlayManagerDevtools(props);
}
createElement(DevtoolsForManager, { manager });
result.then((value: boolean) => value);
// @ts-expect-error The required dialog title cannot be omitted.
manager.open('dialog');
// @ts-expect-error The dialog result is boolean.
const invalid: PromiseWithId<string> = result;
void invalid;
