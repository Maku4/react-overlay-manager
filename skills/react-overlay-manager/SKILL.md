---
name: react-overlay-manager
description: Add, fix or review dialogs, modals, drawers and toasts in React apps that use @react-overlay-manager/core, with optional @react-overlay-manager/devtools. Covers overlay definitions, manager setup, awaiting results, cancellation, exit timing, stacking and SSR.
---

# React Overlay Manager

The package README is the authoritative reference. Read `node_modules/@react-overlay-manager/core/README.md` for the installed version, or the [online README](https://github.com/Maku4/react-overlay-manager#readme), before using an API not shown here.

This guidance targets core 0.5. In core 0.4.x the declared `open()` result type omits `undefined`, but an overlay closed without a result still resolves `undefined` at runtime. Handle it the same way in both versions.

## Usage model

1. Define each overlay with `defineOverlay<Props, Result>`. `Props` are what callers pass. `Result` is what `close(result)` sends back.
2. Create one typed manager with `createOverlayManager({ key: Component })` and keep the same instance for the app's lifetime.
3. Render one `<OverlayManager manager={manager} />` for that manager near the app root. Overlays do not appear without it.
4. Call `open()` from event handlers or async flows, await the result and branch on it.

```tsx
import {
  createOverlayManager,
  defineOverlay,
  OverlayManager,
} from '@react-overlay-manager/core';

// AppDialog stands for the app's existing accessible dialog component
export const ConfirmDialog = defineOverlay<{ message: string }, boolean>(
  ({ message, visible, close }) => (
    <AppDialog open={visible} onDismiss={() => close()}>
      <p>{message}</p>
      <button onClick={() => close(true)}>Delete</button>
      <button onClick={() => close(false)}>Keep</button>
    </AppDialog>
  )
);

export const overlays = createOverlayManager({ confirm: ConfirmDialog });

// Rendered once, near the root
export const OverlayHost = () => <OverlayManager manager={overlays} />;

async function onDelete() {
  const answer = await overlays.open('confirm', { message: 'Delete file?' });
  if (answer === undefined) return; // dismissed without an answer
  if (answer) await deleteFile();
}
```

The library is headless. Markup, styling, focus handling, `Escape` and ARIA belong to the overlay component. Prefer the app's existing accessible dialog, drawer or toast component and drive it with `visible` and `close`.

## Rules

| Situation                         | Do this                                                                                                                                                                                                                                                                                                           |
| :-------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Creating the manager              | Module level is fine in client-only apps. With SSR or Next.js, create it per provider with `useState` in a `'use client'` file and share it through context. Never create it during render, and never share a module-level manager on the server. See [references/ssr-provider.md](references/ssr-provider.md).   |
| Passing options to `open()`       | Pass the component's own props plus `id`, `exitDuration`, `portalTarget` or `stackingBehavior`. The manager injects `id`, `visible`, `hide`, `close`, `onExitComplete` and `manager`, so never pass those as props.                                                                                               |
| Using the result                  | `undefined` means the overlay closed without a result: `close()`, `closeAll()` or the DevTools Close action. Compare with `undefined` when that differs from a `false` answer. Do not cast it away with `!` or `as`. On 0.4.x, annotate as `PromiseWithId<Result \| undefined>` to keep the check.                |
| Hiding or closing                 | `hide()` keeps the component mounted with its state and leaves the promise pending. `close()` resolves the promise first, then the overlay plays its exit and is removed.                                                                                                                                         |
| Overlay not removed after close   | Removal waits for a `transitionend` or `animationend` on the overlay root, the exit timer or `onExitComplete()`. Without any animation, set `defaultExitDuration={0}` on `<OverlayManager>`. With an animation library, call `onExitComplete()`. Set an exit timer as a fallback when the animation may not fire. |
| Several overlays at once          | The default `'hide-previous'` hides the overlay below while a new one is open. Use `stackingBehavior: 'stack'` for toasts and other non-modal overlays.                                                                                                                                                           |
| Controlling an overlay later      | Keep `promise.id` from `open()`. Opening an ID that is hidden shows it and returns the original promise. Opening an ID that is closing creates a new overlay and promise. Opening a visible ID throws `OverlayAlreadyOpenError`.                                                                                  |
| Closing from outside with a value | `getInstance(id)` is not narrowed to that overlay's result type. Use the injected `close` inside the overlay, or `getInstancesByKey(key)`, when the result value matters.                                                                                                                                         |
| Opening from inside an overlay    | Use the injected `manager` instead of importing a global manager. For key-based typing, export `type AppRegistry = typeof overlays.registry` and call `manager.as<AppRegistry>().open(...)`. `manager.open(Component, props)` needs no registry type.                                                             |
| Rendering nothing                 | The `defineOverlay` component must return a JSX element. Return `<></>` instead of `null`.                                                                                                                                                                                                                        |
| DevTools                          | Install `@react-overlay-manager/devtools` as a dev dependency and render `<OverlayManagerDevtools manager={manager} />` next to `<OverlayManager>` with the same manager. It renders only when `process.env.NODE_ENV` is `'development'`. It shows overlay props, so keep it out of production.                   |
