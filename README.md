# React Overlay Manager

A type-safe overlay system for React 18 and 19 with optional DevTools.

- Headless. You bring the markup, styles and animations.
- Typed. `open()` checks props and infers the result type for each overlay.
- Small API. A manager object, one `<OverlayManager>` component and a `useOverlayStore` hook built on `useSyncExternalStore`.
- No runtime dependencies besides React and React DOM.

---

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [API reference](#api-reference)
- [React hook: `useOverlayStore`](#react-hook-useoverlaystore)
- [Exit behavior and animations](#exit-behavior-and-animations)
- [Stacking behavior](#stacking-behavior)
- [DevTools](#devtools)
- [Examples](#examples)
  - [CSS transitions](#css-transitions)
  - [Framer Motion](#framer-motion)
- [TypeScript guide](#typescript-guide)
  - [`PromiseWithId`](#promisewithid)
  - [Results and cancellation](#results-and-cancellation)
  - [Upgrading from 0.4](#upgrading-from-04)
  - [Compile-time errors for wrong props](#compile-time-errors-for-wrong-props)
- [Advanced patterns](#advanced-patterns)
  - [Lazy registry entries](#lazy-registry-entries)
  - [Using `open()` without `await`](#using-open-without-await)
  - [Nested overlays with the injected manager](#nested-overlays-with-the-injected-manager)
- [IDs, reopening and errors](#ids-reopening-and-errors)
- [SSR and Next.js](#ssr-and-nextjs)
- [Accessibility](#accessibility)
- [Troubleshooting](#troubleshooting)
- [Bundling and versioning](#bundling-and-versioning)
- [Contributing and security](#contributing-and-security)
- [License](#license)

---

## Installation

```bash
pnpm add @react-overlay-manager/core   # or npm / yarn
```

---

## Quick start

### 1. Define an overlay component

Wrap the component in `defineOverlay`. The first type argument is your props and the second is the result `close()` resolves with. The manager injects `visible`, `close` and the other props listed in [Injected overlay props](#injected-overlay-props).

```tsx
// src/components/ConfirmDialog.tsx
import { defineOverlay } from '@react-overlay-manager/core';

export interface ConfirmDialogProps {
  message: string;
}

export const ConfirmDialog = defineOverlay<ConfirmDialogProps, boolean>(
  ({ message, visible, close }) => (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 200ms',
      }}
    >
      <p>{message}</p>
      <button onClick={() => close(true)}>Confirm</button>
      <button onClick={() => close(false)}>Cancel</button>
    </div>
  )
);
```

The function passed to `defineOverlay` must return a JSX element. To render nothing while hidden, return an empty element such as `<></>` instead of `null`.

### 2. Create a manager

A manager holds the registry of your overlays and their state.

```tsx
// src/services/overlayManager.ts
import { createOverlayManager } from '@react-overlay-manager/core';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const overlayManager = createOverlayManager({
  confirm: ConfirmDialog,
});
```

A module-level manager is fine in a client-only app. In a server-rendered app, create one manager per provider instead. See [SSR and Next.js](#ssr-and-nextjs).

### 3. Render the manager at your app's root

`<OverlayManager>` renders the open overlays into a portal. Overlays do not appear without it.

```tsx
// src/App.tsx
import { OverlayManager } from '@react-overlay-manager/core';
import { overlayManager } from './services/overlayManager';
import { MyPage } from './MyPage';

export default function App() {
  return (
    <>
      <MyPage />
      <OverlayManager manager={overlayManager} />
    </>
  );
}
```

> **Note:** An overlay whose root element has no CSS transition or animation is never removed after `close()` unless you set an exit duration. Add `defaultExitDuration={0}` to remove such overlays immediately. See [Exit behavior and animations](#exit-behavior-and-animations).

### 4. Open an overlay

Call `open()` from a component, hook or service. It returns a promise that resolves with the value passed to `close(result)`, or with `undefined` when the overlay closes without a result.

```tsx
import { overlayManager } from '../services/overlayManager';

async function deleteItem() {
  const confirmed = await overlayManager.open('confirm', {
    message: 'Delete this item?',
  }); // `confirmed` is `boolean | undefined`

  if (confirmed === true) {
    // ...delete logic
  }
}
```

Here, answering "no" and closing the dialog without an answer both skip the deletion. When they need different handling, see [Results and cancellation](#results-and-cancellation).

### 5. Open a component directly

Components can be opened without a registry entry.

```tsx
import { overlayManager } from '../services/overlayManager';
import { TempDialog } from '../components/TempDialog';

await overlayManager.open(TempDialog, { title: 'One-off dialog' });
```

### Shared default manager

The package also exports `overlays`, a shared manager with an empty registry. It suits client-only apps that open components directly. You still render `<OverlayManager>` with it. Do not use it in server-rendered apps, because the module-level instance is shared by every request on the server.

```tsx
// src/App.tsx
import { OverlayManager, overlays } from '@react-overlay-manager/core';
import { MyPage } from './MyPage';

export default function App() {
  return (
    <>
      <MyPage />
      <OverlayManager manager={overlays} />
    </>
  );
}
```

```tsx
// Any other file
import { overlays } from '@react-overlay-manager/core';
import { MyDialog } from './components/MyDialog';

function handleClick() {
  overlays.open(MyDialog, { title: 'Hello' });
}
```

---

## API reference

### Manager methods

| Method              | Signature                | Notes                                                                                                                                                                                                                                          |
| :------------------ | :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`              | `open(keyOrComp, opts?)` | Opens an overlay and returns a `PromiseWithId` that resolves with the `close(result)` value, or `undefined` without one. See [Results and cancellation](#results-and-cancellation) and [IDs, reopening and errors](#ids-reopening-and-errors). |
| `hide`              | `hide(id)`               | Sets `visible` to `false`. The component stays mounted and the promise stays pending. Does nothing if the ID is unknown.                                                                                                                       |
| `show`              | `show(id)`               | Sets `visible` to `true`. Throws `OverlayNotFoundError` if the ID is unknown.                                                                                                                                                                  |
| `update`            | `update(id, props)`      | Merges props into an open overlay. Throws `OverlayNotFoundError` if the ID is unknown.                                                                                                                                                         |
| `closeAll`          | `closeAll()`             | Calls `close()` on every overlay, so each promise resolves with `undefined`. Exit animations still run.                                                                                                                                        |
| `isOpen`            | `isOpen(id)`             | `true` while an overlay with this ID is in the manager, including while it is hidden or playing its exit animation.                                                                                                                            |
| `getInstance`       | `getInstance(id)`        | Returns the runtime instance (`{ id, props, visible, ... }`) or `undefined`. Its `close` accepts the result type of any registry entry; it is not narrowed by the ID. See [Results and cancellation](#results-and-cancellation).               |
| `getInstancesByKey` | `getInstancesByKey(key)` | Returns every instance opened from one registry key.                                                                                                                                                                                           |
| `getOpenCount`      | `getOpenCount()`         | Number of overlays in the stack, including hidden ones and ones still exiting.                                                                                                                                                                 |

### Injected overlay props

The manager passes these props to every overlay component.

| Prop               | Type                 | Purpose                                                                                                           |
| :----------------- | :------------------- | :---------------------------------------------------------------------------------------------------------------- |
| `id`               | `OverlayId`          | The overlay's ID.                                                                                                 |
| `visible`          | `boolean`            | `true` while the overlay should be shown. Use it to drive enter and exit animations.                              |
| `hide()`           | `() => void`         | Hides the overlay without unmounting it or resolving its promise.                                                 |
| `close()`          | `(result?) => void`  | Resolves the `open()` promise with `result`, or `undefined` without one, and starts the exit and removal process. |
| `onExitComplete()` | `() => void`         | Tells the manager the exit animation has finished, which removes the overlay immediately.                         |
| `manager`          | `OverlayManagerBase` | The manager that opened this overlay. See [Nested overlays](#nested-overlays-with-the-injected-manager).          |

### `<OverlayManager />` props

| Prop                  | Type                           | Default                       | Purpose                                                                                                       |
| :-------------------- | :----------------------------- | :---------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `manager`             | `OverlayManagerCore`           | Required                      | The manager from `createOverlayManager`, or the shared `overlays`.                                            |
| `zIndexBase`          | `number`                       | `100`                         | `z-index` of the first overlay container. Each later overlay uses `zIndexBase + index`.                       |
| `defaultExitDuration` | `number` \| `null`             | `undefined`                   | Fallback exit timer in milliseconds. `0` removes immediately. `null` disables the timer.                      |
| `portalTarget`        | `HTMLElement` \| `null`        | `document.body` on the client | Default portal element for overlays opened after this value is applied. `open()` can override it per overlay. |
| `stackingBehavior`    | `'stack'` \| `'hide-previous'` | `'hide-previous'`             | Default stacking mode. `open()` can override it per overlay.                                                  |

`<OverlayManager>` renders nothing on the server and on the first client render. Overlays appear after it mounts.

### `open()` options

The second argument to `open()` holds the component's props plus these options:

| Option             | Type                           | Purpose                                                                          |
| :----------------- | :----------------------------- | :------------------------------------------------------------------------------- |
| `id`               | `OverlayId`                    | Explicit ID. If omitted, the manager generates one.                              |
| `exitDuration`     | `number` \| `null`             | Exit timer for this overlay. `0` removes immediately. `null` disables the timer. |
| `portalTarget`     | `HTMLElement` \| `null`        | Portal element for this overlay. `null` renders nothing for it.                  |
| `stackingBehavior` | `'stack'` \| `'hide-previous'` | Stacking mode for this overlay.                                                  |

---

## React hook: `useOverlayStore`

`useOverlayStore` subscribes a component to a slice of the manager state. The component re-renders only when the selected value changes, compared with `Object.is`.

```tsx
import { useEffect } from 'react';
import { useOverlayStore } from '@react-overlay-manager/core';
import { overlayManager } from './services/overlayManager';

function ScrollLock() {
  const isAnyOverlayOpen = useOverlayStore(
    overlayManager,
    (state) => state.overlayStack.length > 0
  );

  useEffect(() => {
    document.body.style.overflow = isAnyOverlayOpen ? 'hidden' : '';
  }, [isAnyOverlayOpen]);

  return null;
}
```

Return primitives or stable references from the selector. A selector that builds a new array or object on every call re-renders on every manager change.

---

## Exit behavior and animations

`close()` resolves the promise, sets `visible` to `false` and keeps the overlay mounted until one of these happens first:

1. A `transitionend` or `animationend` event reaches the container `<div>` the manager renders around your component. Events from nested elements bubble up to it.
2. The exit timer runs out.
3. Your component calls `onExitComplete()`. Animation libraries such as Framer Motion need this.

The exit timer comes from the first of these that is set:

1. `exitDuration` passed to `open()`. `null` disables the timer for that overlay.
2. `defaultExitDuration` on `<OverlayManager>`.

> **Warning:** With no exit timer, no CSS transition or animation and no `onExitComplete()` call, the overlay becomes invisible after `close()` but stays in the DOM and in the stack.

Redundant events and calls are safe. The overlay is removed once.

---

## Stacking behavior

The stacking mode is taken from `open()` options first, then the `<OverlayManager>` prop, then the default `'hide-previous'`.

| Behavior                    | Effect                                                                                                | Typical use                                 |
| :-------------------------- | :---------------------------------------------------------------------------------------------------- | :------------------------------------------ |
| `'hide-previous'` (default) | Opening an overlay hides the top one. Closing it shows the nearest overlay below that is not closing. | Modal dialogs where one is active at a time |
| `'stack'`                   | New overlays open on top and earlier ones stay visible.                                               | Toasts and non-modal popups                 |

```tsx
// Stack every overlay by default
<OverlayManager manager={overlayManager} stackingBehavior="stack" />
```

```tsx
// Override the mode for one modal
overlayManager.open('confirm', {
  message: 'Are you sure?',
  stackingBehavior: 'hide-previous',
});
```

---

## DevTools

The DevTools package adds a floating panel that lists open overlays and their props.

```bash
pnpm add -D @react-overlay-manager/devtools
```

Render it next to `<OverlayManager>` and pass the same manager instance. With a different instance the panel stays empty.

```tsx
import { OverlayManager } from '@react-overlay-manager/core';
import { OverlayManagerDevtools } from '@react-overlay-manager/devtools';

function App() {
  return (
    <>
      <OverlayManager manager={overlayManager} />
      <OverlayManagerDevtools manager={overlayManager} />
    </>
  );
}
```

Toggle the panel with `Ctrl/Cmd + Shift + O`. `OverlayManagerDevtools` renders nothing when `process.env.NODE_ENV` is not `'development'`. The panel shows overlay props, so it can display sensitive data. See the [DevTools README](https://github.com/Maku4/react-overlay-manager/blob/main/packages/devtools/README.md) for details.

---

## Examples

### CSS transitions

Put the transition on the root element of your overlay. The manager removes the overlay when the `transitionend` event bubbles up to its container.

```tsx
// Spinner.tsx
import { defineOverlay } from '@react-overlay-manager/core';
import './spinner.css';

export const Spinner = defineOverlay<object, void>(({ visible }) => (
  <div className={`backdrop ${visible ? 'enter' : 'exit'}`}>
    <div className="spinner" />
  </div>
));
```

```css
/* spinner.css */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 200ms ease;
}
.backdrop.enter {
  opacity: 1;
}
.backdrop.exit {
  opacity: 0;
}
```

### Framer Motion

Use `AnimatePresence` and pass it the injected `onExitComplete`.

```tsx
// MotionDialog.tsx
import { defineOverlay } from '@react-overlay-manager/core';
import { AnimatePresence, motion } from 'framer-motion';

export const MotionDialog = defineOverlay<{ title: string }, void>(
  ({ title, visible, close, onExitComplete }) => (
    <AnimatePresence onExitComplete={onExitComplete}>
      {visible && (
        <motion.div
          role="dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <h2>{title}</h2>
          <button onClick={() => close()}>Close</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
);
```

To rely only on `onExitComplete`, disable the exit timer for one overlay or for all of them:

```tsx
await overlayManager.open(MotionDialog, {
  title: 'Welcome',
  exitDuration: null,
});
```

```tsx
<OverlayManager manager={overlayManager} defaultExitDuration={null} />
```

---

## TypeScript guide

### `PromiseWithId`

`open()` returns a `PromiseWithId<TResult | undefined>`: a regular `Promise` with an `id` property. It resolves with `undefined` when the overlay closes without a result. The ID is available before the promise settles.

```ts
const promise = overlayManager.open('confirm', { message: 'Proceed?' });
const id = promise.id; // OverlayId

const ok = await promise; // boolean | undefined
```

### Results and cancellation

The `open()` promise resolves with the value passed to `close(result)`. It resolves with `undefined` when the overlay closes without a result:

- `close()` called with no argument, for example by your backdrop click handler
- `closeAll()`
- the Close button in DevTools

The result type includes this case. An overlay defined with `defineOverlay<Props, boolean>` opens as `PromiseWithId<boolean | undefined>`. Result types that already accept `undefined`, such as `void` and `unknown`, stay as they are. A `never` result becomes `undefined`. `OverlayResult<typeof Component>` gives the same type.

Check for `undefined` when closing without an answer means something different from a `false` answer:

```ts
const choice = await overlayManager.open('confirm', {
  message: 'Save your changes?',
});

if (choice === undefined) return; // closed without an answer, keep editing
if (choice) save();
else discard();
```

Inside an overlay, the injected `close` only accepts that overlay's result type. Outside an overlay, `getInstancesByKey(key)` returns instances whose `close` checks the result type of that registry entry. `getInstance(id)` is typed for any overlay in the manager, because an ID does not record which overlay it belongs to. In a registry with different result types, its `close` accepts the result type of any entry. Prefer the injected `close` or `getInstancesByKey(key)` when the result value matters.

### Upgrading from 0.4

In 0.5, `open()` result types include `undefined`. The runtime behavior is unchanged: closing without a result already resolved `undefined` in 0.4, but the types hid it. Code that used the result without a check can now fail to compile.

Before:

```ts
const pending: PromiseWithId<boolean> = overlayManager.open('confirm', {
  message: 'Proceed?',
});
const ok = await pending;
ok.valueOf(); // compiled, but threw a TypeError after closeAll()
```

After:

```ts
const pending: PromiseWithId<boolean | undefined> = overlayManager.open(
  'confirm',
  { message: 'Proceed?' }
);
const ok = await pending;
if (ok !== undefined) ok.valueOf();
```

To upgrade:

- Add `| undefined` to annotations of `open()` results, including `PromiseWithId<...>` and `.then()` callback parameters.
- Handle `undefined` before using a result. A truthiness check such as `if (ok)` treats closing without an answer like `false`. Compare with `undefined` when the two need different handling.
- Code that uses `OverlayResult<typeof Component>` now receives `undefined` as well.
- `defineOverlay<Props, Result>` declarations and calls to `close(result)` need no changes.

### Compile-time errors for wrong props

```ts
// 'confirm' expects { message: string }
overlayManager.open('confirm', {
  message: 123, // Type 'number' is not assignable to type 'string'.
  unknownProp: true, // Object literal may only specify known properties.
});
```

---

## Advanced patterns

### Lazy registry entries

Registry entries can be `React.lazy` components. Wrap `<OverlayManager>` in a `<Suspense>` boundary.

```tsx
// overlayManager.ts
import { lazy } from 'react';
import { createOverlayManager } from '@react-overlay-manager/core';

export const overlayManager = createOverlayManager({
  confirm: lazy(() => import('./dialogs/ConfirmDialog')),
  settings: lazy(() => import('./dialogs/SettingsModal')),
});
```

```tsx
// App.tsx
<Suspense fallback={null}>
  <OverlayManager manager={overlayManager} />
</Suspense>
```

### Using `open()` without `await`

Keep the returned promise when you need the ID later, for example to close a loading spinner registered as `spinner`.

```tsx
const spinner = overlayManager.open('spinner');

try {
  await someAsyncTask();
} finally {
  overlayManager.getInstance(spinner.id)?.close();
}
```

### Nested overlays with the injected manager

Every overlay receives the `manager` that opened it. Use it to open another overlay from an event handler. `manager.as<Registry>()` restores key-based typing without importing the manager value, which avoids a circular import when both overlays are in the same registry. `as()` is a type-level cast with no runtime effect.

```ts
// src/services/overlayManager.ts
import { createOverlayManager } from '@react-overlay-manager/core';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ValidationModal } from '../components/ValidationModal';

export const overlayManager = createOverlayManager({
  confirm: ConfirmDialog,
  validation: ValidationModal,
});

export type AppRegistry = typeof overlayManager.registry;
```

```tsx
// src/components/ValidationModal.tsx
import { defineOverlay } from '@react-overlay-manager/core';
import type { AppRegistry } from '../services/overlayManager';

export interface ValidationModalProps {
  errors: string[];
}

export const ValidationModal = defineOverlay<ValidationModalProps, void>(
  ({ errors, manager, close }) => {
    async function discard() {
      const confirmed = await manager
        .as<AppRegistry>()
        .open('confirm', { message: 'Discard your changes?' });
      if (confirmed) close();
    }

    return (
      <div role="dialog" aria-label="Validation errors">
        <ul>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
        <button onClick={discard}>Discard</button>
      </div>
    );
  }
);
```

`manager.open(ConfirmDialog, { ... })` also works and needs no registry type.

---

## IDs, reopening and errors

Generated IDs look like `overlay_0`, and `promise.id` is already typed as `OverlayId`. To address an overlay by a name you choose, pass `id` to `open()`. `OverlayId` is a branded string type, so a custom name needs an `as OverlayId` assertion:

```ts
import type { OverlayId } from '@react-overlay-manager/core';
import { overlayManager } from '../services/overlayManager';

const CONFIRM_DELETE_ID = 'confirm-delete' as OverlayId;

const confirmed = await overlayManager.open('confirm', {
  id: CONFIRM_DELETE_ID,
  message: 'Delete this item?',
});
```

What `open()` does with an existing ID depends on the overlay's state:

| State of the overlay with that ID                      | Result of `open()` with the same `id`                                                                  |
| :----------------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| Visible                                                | Throws `OverlayAlreadyOpenError`.                                                                      |
| Hidden by `hide()` or by `'hide-previous'` stacking    | Merges the new props, shows it and returns the original promise.                                       |
| Closing (`close()` was called, exit animation running) | Removes the exiting overlay and opens a new one with a new promise. Old callbacks no longer affect it. |
| Removed                                                | Opens a new overlay with a new promise.                                                                |

`show()` and `update()` throw `OverlayNotFoundError` for an ID that is not in the manager. `hide()` ignores unknown IDs. In async flows, check `isOpen(id)` first or catch the error.

---

## SSR and Next.js

`<OverlayManager>` and `<OverlayManagerDevtools>` use hooks and browser APIs, so render them from a client component. In the Next.js App Router, that file must start with the `'use client'` directive.

Follow these rules when rendering on the server:

- Create the manager inside a provider with `useState`, not at module level. A module-level manager on the server is shared by every request.
- Do not read `document`, `window` or `sessionStorage` during render. Read them in an effect.
- `<OverlayManager>` renders nothing on the server and on the first client render, so hydration matches. Overlays appear after mount.
- DevTools also render closed on the server and restore a panel left open in the same browser tab after mount.

```tsx
// app/overlays.tsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  createOverlayManager,
  OverlayManager,
} from '@react-overlay-manager/core';
import { OverlayManagerDevtools } from '@react-overlay-manager/devtools';
import { ConfirmDialog } from './ConfirmDialog';

const createAppOverlays = () =>
  createOverlayManager({ confirm: ConfirmDialog });
type AppOverlays = ReturnType<typeof createAppOverlays>;

const OverlaysContext = createContext<AppOverlays | null>(null);

export function useOverlays() {
  const manager = useContext(OverlaysContext);
  if (!manager) throw new Error('useOverlays needs <OverlaysProvider>');
  return manager;
}

export function OverlaysProvider({ children }: { children: ReactNode }) {
  // One manager per provider instance, so server requests never share state
  const [manager] = useState(createAppOverlays);
  const [portalTarget, setPortalTarget] = useState<HTMLElement>();

  useEffect(() => {
    setPortalTarget(document.getElementById('overlay-portal') ?? undefined);
  }, []);

  return (
    <OverlaysContext.Provider value={manager}>
      {children}
      <OverlayManager manager={manager} portalTarget={portalTarget} />
      <OverlayManagerDevtools manager={manager} />
    </OverlaysContext.Provider>
  );
}
```

```tsx
// app/layout.tsx
import type { ReactNode } from 'react';
import { OverlaysProvider } from './overlays';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <OverlaysProvider>{children}</OverlaysProvider>
        <div id="overlay-portal" />
      </body>
    </html>
  );
}
```

```tsx
// app/DeleteButton.tsx
'use client';

import { useOverlays } from './overlays';

export function DeleteButton() {
  const overlays = useOverlays();

  async function onClick() {
    if (await overlays.open('confirm', { message: 'Delete this item?' })) {
      // ...delete logic
    }
  }

  return <button onClick={onClick}>Delete</button>;
}
```

Passing `undefined` as `portalTarget` until the element is found keeps the default `document.body`. An overlay keeps the portal target it was opened with.

---

## Accessibility

The library renders no dialog markup of its own, so accessibility is up to your overlay components:

- Use `role="dialog"` or `role="alertdialog"`.
- Give the dialog an accessible name with `aria-labelledby` or `aria-label`, and use `aria-describedby` for its description.
- Set `aria-modal="true"` on modal dialogs.
- Move focus into the overlay when it opens, keep it there while it is modal and return it to the trigger when it closes.
- Close on `Escape`.

The native `<dialog>` element covers several of these.

The container the manager renders around each overlay gets `aria-hidden="true"` while the overlay is hidden.

---

## Troubleshooting

1. **The overlay stays in the DOM after closing.**
   - Put the CSS `transition` or `animation` on the root element of the overlay component.
   - Otherwise set `exitDuration` or `defaultExitDuration`, or call `onExitComplete()`.
2. **`OverlayAlreadyOpenError`.**
   - An overlay with that `id` is visible. Omit `id` to get a generated one, or close the visible overlay first.
3. **Overlays appear behind other content.**
   - A parent with `position` and `z-index` can create a stacking context. Render overlays into a portal element at the end of `<body>` and adjust `zIndexBase` if needed.
4. **DevTools show no overlays.**
   - Pass the same manager instance to `<OverlayManager>` and `<OverlayManagerDevtools>`.

---

## Bundling and versioning

- Each package ships CommonJS and ES module builds with TypeScript declarations.
- `react` and `react-dom` are peer dependencies and are not bundled.
- The core package exports its version: `import { version } from '@react-overlay-manager/core'`.

## Contributing and security

See [CONTRIBUTING.md](https://github.com/Maku4/react-overlay-manager/blob/main/CONTRIBUTING.md) for setup, checks and the server-rendered demo app, and [SECURITY.md](https://github.com/Maku4/react-overlay-manager/blob/main/SECURITY.md) to report a vulnerability.

## License

[MIT](LICENSE)
