# React Overlay Manager

A lightweight, **type-safe** overlay system for React with a zero dependency and built-in DevTools.

- 📦 **Headless** – bring your own styles / animations
- 🔒 **Fully typed** – compile-time safety for props and results
- 🛠 **DevTools** – inspect the overlay stack in development
- ⚡️ **Fast** – minimal state, `useSyncExternalStore` under the hood
- 📏 **Small** – ~2.6 kB gzipped

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [React Hook: `useOverlayStore`](#react-hook-useoverlaystore)
- [Exit Behavior & Animations](#exit-behavior--animations)
- [Stacking Behavior](#stacking-behavior)
- [DevTools](#devtools)
- [Examples](#examples)
  - [CSS Transitions](#css-transitions)
  - [Framer Motion](#framer-motion)
- [TypeScript Guide](#typescript-guide)
  - [Async/Await and `PromiseWithId`](#asyncawait-and-promisewithid)
  - [Compile-time Errors for Wrong Props](#compile-time-errors-for-wrong-props)
- [Advanced Patterns](#advanced-patterns)
  - [Central Registry with `React.lazy`](#central-registry-with-reactlazy)
  - [Using `open()` without `await`](#using-open-without-await)
- [Edge Cases & Error Handling](#edge-cases--error-handling)
- [SSR / Next.js](#ssr--nextjs)
- [Accessibility](#accessibility)
- [Troubleshooting](#troubleshooting)
- [Bundling & Versioning](#bundling--versioning)
- [Quality & Coverage](#quality--coverage)
- [License](#license)

---

## Installation

```bash
pnpm add @react-overlay-manager/core           # or yarn / npm
```

---

## Quick Start

### 1. Define an overlay component

Use the `defineOverlay` helper for full type-safety. It injects props like `visible` (for animations) and `close` (to return a result).

```tsx
// src/components/ConfirmDialog.tsx
import { defineOverlay } from '@react-overlay-manager/core';
import cx from 'clsx';

interface ConfirmDialogProps {
  message: string;
}

export const ConfirmDialog = defineOverlay<ConfirmDialogProps, boolean>(
  ({ message, visible, close }) => {
    const dialogClass = cx(
      '... transition-opacity duration-300',
      visible
        ? 'opacity-100 pointer-events-auto'
        : 'opacity-0 pointer-events-none'
    );

    return (
      <div className={dialogClass}>
        <div className="...">
          <p>{message}</p>
          <button onClick={() => close(true)}>Confirm</button>
          <button onClick={() => close(false)}>Cancel</button>
        </div>
      </div>
    );
  }
);
```

### 2. Create a manager

A manager holds the registry of your overlays.

```tsx
// src/services/overlayManager.ts
import { createOverlayManager } from '@react-overlay-manager/core';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const overlayManager = createOverlayManager({
  confirm: ConfirmDialog,
});
```

### 3. Render the manager at your app's root

The `<OverlayManager>` component is responsible for rendering your overlays into the DOM. You must always include it in your app's root.

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

> **Note:** For overlays without CSS animations, you may want to add `defaultExitDuration={0}` to ensure they are removed from the DOM after closing. See the [Exit Behavior](#exit-behavior--animations) section for details.

### 4. Open an overlay from anywhere

Call `manager.open()` from any component, hook, or service. It's fully async and type-safe.

```tsx
// inside any component / service
import { overlayManager } from '../services/overlayManager';

async function deleteItem() {
  const confirmed = await overlayManager.open('confirm', {
    message: 'Delete this item?',
  }); // `confirmed` is typed as `boolean`

  if (confirmed) {
    // ...delete logic
  }
}
```

### 5. Open a component directly (no registry needed)

You can also open components on-the-fly without registering them first.

```tsx
import { overlayManager } from '../services/overlayManager';
import { TempDialog } from '../components/TempDialog';

await overlayManager.open(TempDialog, { title: 'One-off dialog' });
```

### Alternative: Simplified Setup (No Registry)

If you don't intend to use a component registry and only want to open components directly, you can import a pre-configured, shared manager instance.

**You still must render the `<OverlayManager>` component** and pass this default instance to it.

```tsx
// src/App.tsx
import { OverlayManager, overlays } from '@react-overlay-manager/core';
import { MyPage } from './MyPage';

export default function App() {
  return (
    <>
      <MyPage />
      {/* Render the manager, passing the default 'overlays' instance */}
      <OverlayManager manager={overlays} />
    </>
  );
}

// Then, from any other file:
import { overlays } from '@react-overlay-manager/core';
import { MyDialog } from './components/MyDialog';

function handleClick() {
  overlays.open(MyDialog, { title: 'Hello' });
}
```

---

## API Reference

### Manager Methods

| Method              | Signature                | Notes                                                                                     |
| :------------------ | :----------------------- | :---------------------------------------------------------------------------------------- |
| `open`              | `open(keyOrComp, opts?)` | Opens an overlay. Returns a `PromiseWithId` that resolves when `close(result)` is called. |
| `hide`              | `hide(id)`               | Hides an overlay by setting `visible=false`. The component remains mounted.               |
| `show`              | `show(id)`               | Re-shows a hidden overlay. Throws `OverlayNotFoundError` if the ID is invalid.            |
| `update`            | `update(id, props)`      | Merges new props into an existing overlay, triggering a re-render.                        |
| `closeAll`          | `closeAll()`             | Closes all open overlays, respecting their individual exit animations.                    |
| `isOpen`            | `isOpen(id)`             | Returns `true` if an overlay with the given ID exists in the manager.                     |
| `getInstance`       | `getInstance(id)`        | Returns the runtime instance (`{ id, props, visible, ... }`) or `undefined`.              |
| `getInstancesByKey` | `getInstancesByKey(key)` | Returns an array of all instances opened from a specific registry key.                    |
| `getOpenCount`      | `getOpenCount()`         | Returns the number of overlays currently in the stack.                                    |

### Injected Overlay Props

These props are automatically passed to every overlay component.

| Prop               | Type                | Purpose                                                                         |
| :----------------- | :------------------ | :------------------------------------------------------------------------------ |
| `id`               | `OverlayId`         | A unique, stable identifier for the overlay instance.                           |
| `visible`          | `boolean`           | `true` when the overlay should be visible. Drives enter/exit animations.        |
| `hide()`           | `() => void`        | Hides the overlay without unmounting it or resolving its promise.               |
| `close()`          | `(result?) => void` | Resolves the `open()` promise and begins the exit/removal process.              |
| `onExitComplete()` | `() => void`        | Manually tells the manager the exit animation is done, causing instant removal. |

---

### `<OverlayManager />` Props

| Prop                  | Type                           | Default                                 | Purpose                                                                                                  |
| :-------------------- | :----------------------------- | :-------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| `manager`             | `OverlayManagerCore`           | —                                       | The manager instance created by `createOverlayManager` (or the shared `overlays`).                       |
| `zIndexBase`          | `number`                       | `100`                                   | Base `z-index` applied to the first overlay container; each subsequent overlay uses `base + index`.      |
| `defaultExitDuration` | `number` \| `null`             | `undefined`                             | Global fallback for exit removal. `0` = remove immediately. `null` = disable timer, use events/callback. |
| `portalTarget`        | `HTMLElement` \| `null`        | `document.body` (client) / `null` (SSR) | Default portal element for all overlays. Can be overridden per `open()` call.                            |
| `stackingBehavior`    | `'stack'` \| `'hide-previous'` | `'hide-previous'`                       | Global stacking mode; can be overridden per `open()` call.                                               |

---

### `open()` Options (OpenOptions)

The second argument to `open()` merges your component props with a few manager options:

| Option             | Type                           | Purpose                                                                                         |
| :----------------- | :----------------------------- | :---------------------------------------------------------------------------------------------- |
| `id`               | `OverlayId`                    | Optional explicit ID. If omitted, a unique one is generated.                                    |
| `exitDuration`     | `number` \| `null`             | Per-instance exit timer. `0` = remove immediately. `null` = disable timer, use events/callback. |
| `portalTarget`     | `HTMLElement` \| `null`        | Per-instance portal target. Overrides `<OverlayManager portalTarget={...} />`.                  |
| `stackingBehavior` | `'stack'` \| `'hide-previous'` | Per-instance stacking mode. Overrides global `stackingBehavior`.                                |

## React Hook: `useOverlayStore`

For building custom UI that reacts to the overlay state, `useOverlayStore` provides an efficient way to subscribe to changes. It's powered by `useSyncExternalStore` and only triggers re-renders when the selected state changes.

```tsx
import { useOverlayStore } from '@react-overlay-manager/core';
import { overlayManager } from './services/overlayManager';

function GlobalBlocker() {
  const isAnyOverlayOpen = useOverlayStore(
    overlayManager,
    (state) => state.overlayStack.length > 0
  );

  // Block background scroll when any overlay is open
  useEffect(() => {
    document.body.style.overflow = isAnyOverlayOpen ? 'hidden' : 'auto';
  }, [isAnyOverlayOpen]);

  return null;
}
```

---

## Exit Behavior & Animations

When you call `close()`, the manager sets `visible = false` and waits to unmount the component. By default, if you **do not** provide any `exitDuration`, the manager relies on CSS events to remove the overlay.

Unmounting happens on the **first** of these events to occur:

1.  **CSS Event (Default)**: A `transitionend` or `animationend` event fires on the overlay's root container. This is the "happy path" for CSS-based animations.
2.  **Timer**: A timeout completes. This is a fallback or primary method if you don't use CSS animations.
3.  **Manual Callback**: You explicitly call the injected `onExitComplete()` function. This is required for animation libraries like Framer Motion.

> **Warning:** If your component has no CSS transitions/animations on its root element, and you don't set an `exitDuration`/`defaultExitDuration`, the overlay will become invisible after `close()` but will **never be removed from the DOM**. To avoid this, either add a CSS transition, set an `exitDuration`/`defaultExitDuration`, or call `onExitComplete()` manually.

The precedence for timers is:

1. `options.exitDuration === null`: Disables the timer completely. Relies solely on CSS events or `onExitComplete`.
2. `options.exitDuration` (number): Uses the per-instance duration.
3. `<OverlayManager defaultExitDuration={...} />`: Uses the global fallback duration.

> **Important**: The manager listens for `transitionend`/`animationend` on the **container `<div>` it renders**, not on your component's nested elements. These events do bubble, so child animations will usually be detected. Some libraries or patterns may not emit native events; in that case, set a timer or call `onExitComplete()` manually. The library safely handles multiple redundant events, so you don't have to worry about race conditions.

---

## Stacking Behavior

You can control how overlays behave when new ones are opened on top of them.

The precedence is: `open()` options > `<OverlayManager />` prop > default (`'hide-previous'`).

| Behavior                        | Description                                                                                                                    | Use Case                                                       |
| :------------------------------ | :----------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| **`'hide-previous'`** (Default) | Opening a new overlay sets `visible = false` on the one below it. Closing the top one automatically re-shows the previous one. | Modal dialogs, where only one should be interactive at a time. |
| **`'stack'`**                   | New overlays open on top, and previous ones remain visible.                                                                    | Toasts, notifications, or non-modal pop-ups.                   |

**Example:**

```tsx
// Globally set all overlays to stack
<OverlayManager manager={overlayManager} stackingBehavior="stack" />;

// But override for a specific modal
overlayManager.open('confirm', {
  message: 'Are you sure?',
  stackingBehavior: 'hide-previous', // This one will hide overlays beneath it
});
```

---

## DevTools

Install the DevTools package to inspect your overlay stack in development.

```bash
pnpm add -D @react-overlay-manager/devtools
```

Render the component next to your `OverlayManager`. It automatically does nothing in production.

```tsx
import { OverlayManagerDevtools } from '@react-overlay-manager/devtools';

function App() {
  return (
    <>
      <OverlayManager manager={overlayManager} />
      {/* DevTools will only render in development builds */}
      <OverlayManagerDevtools manager={overlayManager} />
    </>
  );
}
```

Toggle with **`Ctrl/Cmd + Shift + O`**.

> **Warning**: Ensure you pass the **exact same `manager` instance** to both `<OverlayManager />` and `<OverlayManagerDevtools />`. Using different instances is a common cause for the DevTools appearing empty. Props shown in DevTools may contain sensitive data; its use is intended for development only.

---

## Examples

### CSS Transitions

A minimal example using pure CSS class toggle to drive animations. The manager's built-in `transitionend` listener handles removal automatically because the `transition` property is on the root element.

```tsx
// Spinner.tsx
import { defineOverlay } from '@react-overlay-manager/core';
import './spinner.css';

export const Spinner = defineOverlay<{}, void>(({ visible }) => {
  // Apply 'enter' or 'exit' class based on the `visible` prop
  return (
    <div className={`backdrop ${visible ? 'enter' : 'exit'}`}>
      <div className="spinner" />
    </div>
  );
});
```

```css
/* spinner.css */
/* The transition must be on the root element that OverlayItem renders */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 200ms ease; /* This transition is key */
}
.backdrop.enter {
  opacity: 1;
}
.backdrop.exit {
  opacity: 0;
}
/* ... spinner styles ... */
```

### Framer Motion

For animation libraries, use `AnimatePresence` and call `onExitComplete` when the animation finishes. This gives you precise control and instant removal.

```tsx
// MotionDialog.tsx
import { defineOverlay } from '@react-overlay-manager/core';
import { AnimatePresence, motion } from 'framer-motion';

export const MotionDialog = defineOverlay<{ title: string }, void>(
  ({ title, visible, close, onExitComplete }) => {
    return (
      <AnimatePresence onExitComplete={onExitComplete}>
        {visible && <motion.div /* ... */>{/* ... */}</motion.div>}
      </AnimatePresence>
    );
  }
);
```

To rely solely on `onExitComplete`, disable the fallback timer:

```tsx
// Option 1: Per-call
await overlayManager.open(MotionDialog, {
  title: 'Welcome',
  exitDuration: null, // Disables the timer for this instance
});

// Option 2: Globally (recommended for animation libraries)
<OverlayManager manager={overlayManager} defaultExitDuration={null} />;
```

---

## TypeScript Guide

### Async/Await and `PromiseWithId`

The `open()` method returns a `PromiseWithId<TResult>`, which is a standard `Promise` with an added `id` property. This lets you access the overlay's ID immediately, even if you `await` the result later.

```ts
// Get the ID synchronously, then await the result
const promise = overlayManager.open('confirm', { message: 'Proceed?' });
const id = promise.id; // `id` is typed as OverlayId

const ok = await promise; // `ok` is typed as boolean

// Or with async/await, though you lose direct access to the promise object
const result: boolean = await overlayManager.open('confirm', {
  message: 'Again?',
});
```

### Compile-time Errors for Wrong Props

The manager enforces props at compile time, preventing common bugs.

```ts
// Assuming 'confirm' expects: { message: string }
overlayManager.open('confirm', {
  message: 123, // ❌ Type 'number' is not assignable to type 'string'.
  unknownProp: true, // ❌ Object literal may only specify known properties.
});
```

---

## Advanced Patterns

### Central Registry with `React.lazy`

For better code-splitting, use `React.lazy` in your registry. Wrap your `<OverlayManager>` in a single `<Suspense>` at the app root to handle loading states without flicker.

```tsx
// overlays.ts
import { createOverlayManager } from '@react-overlay-manager/core';
import React, { lazy } from 'react';

export const overlays = createOverlayManager({
  confirm: lazy(() => import('./dialogs/ConfirmDialog')),
  settings: lazy(() => import('./dialogs/SettingsModal')),
});

// App.tsx
<Suspense fallback={<GlobalSpinner />}>
  <OverlayManager manager={overlays} />
</Suspense>;
```

### Using `open()` without `await`

Sometimes you want to fire-and-forget an overlay, like a loading spinner. You can grab the `id` to close it programmatically later.

```tsx
// Show a spinner and don't wait for a result
const spinner = overlayManager.open('spinner');

try {
  await someAsyncTask();
} finally {
  // Close the spinner by its ID when the task is done
  overlayManager.getInstance(spinner.id)?.close();
}
```

### Nested overlays with the injected manager (concise and type-safe)

Overlays receive a `manager` prop. Use it to open other overlays (nested modals) and keep
key-based typing by narrowing with `manager.as<...>()`. This avoids circular imports when the
overlay is part of the same registry.

- **Why**
  - Avoids circular types/imports
  - Keeps nested `open('key', ...)` fully type-safe

Define your manager in a separate module and export its type:

```ts
import { createOverlayManager } from '@react-overlay-manager/core';
import { ValidationModal } from '../components/ValidationModal';
// ...other overlays

export const overlayManager = createOverlayManager({
  validationModal: ValidationModal,
  // confirmModal: ConfirmModal, ...
});

export type AppOverlayManager = typeof overlayManager;
```

````ts
import type { AppOverlayManager } from '../services/overlayManager';

export const ValidationModal = defineOverlay<ValidationModalProps, void>(
  ({ manager, ...props }) => {
    manager
      .as<AppOverlayManager['registry']>()
      .open('confirmModal', { /* ... */ });

    // or open by component directly (no key)
    // manager.open(ConfirmModal, { /* ... */ });
    return null;
  }
);

You can also dynamically import the manager to avoid circular imports:

```ts
const { overlayManager } = await import('../services/overlayManager');
overlayManager.open('confirmModal', { /* ... */ });
````

---

## Edge Cases & Error Handling

- **`OverlayAlreadyOpenError`**: Thrown if you call `open()` with an `id` that is already visible.
  - **Solution**: Omit the `id` to let the manager auto-generate a unique one. Alternatively, calling `open()` with the ID of a _hidden_ overlay will show and update it instead of throwing an error.
- **`OverlayNotFoundError`**: Thrown if you call `hide()`, `show()`, or `update()` on an ID that has already been closed and removed.
  - **Solution**: In complex async flows, guard your calls: `if (manager.isOpen(id)) manager.hide(id);` or wrap them in a `try/catch` block.

---

## SSR / Next.js

The library is SSR-safe. It avoids accessing `window` or `document` on the server.

- **`portalTarget`**: On the server, overlays render inline as `defaultPortalTarget` is `null`. On the client, it defaults to `document.body`. You can provide a stable portal element for better DOM structure.
- **Code-splitting**: Use `next/dynamic` to prevent overlay components from being included in the initial server bundle.

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        {/* A dedicated portal target for overlays */}
        <div id="overlay-portal" />
      </body>
    </html>
  );
}

// app/Providers.tsx
('use client');
import { OverlayManager } from '@react-overlay-manager/core';
import { overlays } from './overlays';

export function Providers({ children }) {
  return (
    <>
      {children}
      <OverlayManager
        manager={overlays}
        portalTarget={document.getElementById('overlay-portal')}
      />
    </>
  );
}
```

---

## Accessibility

This library is headless and unopinionated about your markup. It is your responsibility to make your overlay components accessible. Key considerations include:

- **Roles**: Use `role="dialog"` or `role="alertdialog"`.
- **Labels**: Provide an accessible name with `aria-labelledby` and/or `aria-describedby`.
- **Modality**: Use `aria-modal="true"` for modal dialogs.
- **Focus Management**: Trap focus within the overlay while it's open and return focus to the trigger element when it closes.
- **Keyboard Navigation**: Allow closing with the `Escape` key.

Consider using the native HTML `<dialog>` element.

---

## Troubleshooting

1.  **Overlay doesn't disappear after animation:**
    - Ensure your CSS `transition` or `animation` is on the **root element** of your overlay component.
    - If animations are nested or you don't use CSS animations, you must either set an `exitDuration`/`defaultExitDuration` or call `onExitComplete()` manually.
2.  **`OverlayAlreadyOpenError`:**
    - You are trying to `open()` an overlay with an `id` that is already visible. Let the manager generate IDs automatically by omitting the `id` option.
3.  **Overlays appear behind other content:**
    - Check for parent elements with a `z-index` and `position` that create a new stacking context. The `<OverlayManager zIndexBase={...} />` prop can help, but portals are the best solution. Render overlays into a dedicated portal element at the end of `<body>`.

---

## Bundling & Versioning

- The library ships with CJS and ESM formats, with type definitions (`.d.ts`).
- `react` and `react-dom` are listed as `external` dependencies.

- The current version is available as an export: `import { version } from '@react-overlay-manager/core'`.

## Quality & Coverage

- **Runtime tests**: 66 tests across 22 files, with overall coverage: **Statements 96.64%**, **Branches 85.25%**, **Functions 93.67%**, **Lines 96.64%**.
- **Type-level tests (tsd)**: 15 focused specs across core and devtools verifying generics and API contracts:
  - `open()` overloads and argument optionality (by key and by component)
  - `OverlayManagerProps` shape and constraints
  - Helper types: `ComponentProps<T>`, `OverlayResult<T>`
  - `AnyOverlayInstance` narrowing and typed instances
  - Event typing (`ManagerEvent<T>`) and default manager usage
  - Branded `OverlayId` in `OpenOptions.id`

These checks run in CI to prevent regressions and ensure the library remains safe to adopt.

## License

[MIT](LICENSE)
