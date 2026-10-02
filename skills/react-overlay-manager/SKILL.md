---
name: react-overlay-manager
description: Add, fix or review dialogs, modals, drawers and toasts in React apps that use @react-overlay-manager/core, with optional @react-overlay-manager/devtools. Covers overlay definitions, manager setup, awaiting results, cancellation, exit timing, stacking and SSR.
---

# React Overlay Manager

The package README is the authoritative reference. Read `node_modules/@react-overlay-manager/core/README.md` for the installed version, or the [online README](https://github.com/Maku4/react-overlay-manager#readme), before using an API not shown here.

These rules describe core 0.5. Core 0.4.x differs in two ways:

- The declared `open()` result type omits `undefined`, although closing without a result still resolves `undefined`. Handle it the same way.
- Reopening an ID while it is closing returns the old, already resolved promise. Wait until the overlay is removed, or use a new ID.

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

export const ConfirmDialog = defineOverlay<{ message: string }, boolean>(
  ({ message, visible, close }) => (
    // Inline markup with no portal of its own. To use the app's dialog
    // component here, map `visible` and `close` to its actual props.
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Confirm"
      hidden={!visible}
    >
      <p>{message}</p>
      <button onClick={() => close(true)}>Delete</button>
      <button onClick={() => close(false)}>Keep</button>
      <button onClick={() => close()}>Cancel</button>
    </div>
  )
);

export const overlays = createOverlayManager({ confirm: ConfirmDialog });

// Rendered once, near the root. This overlay has no exit animation, so it is
// removed as soon as it closes.
export const OverlayHost = () => (
  <OverlayManager manager={overlays} defaultExitDuration={0} />
);

async function onDelete() {
  const answer = await overlays.open('confirm', { message: 'Delete file?' });
  if (answer === undefined) return; // closed without an answer
  if (answer) await deleteFile(); // deleteFile is the app's own code
}
```

The library is headless. Markup, styling, focus handling, `Escape` and ARIA belong to the overlay component. The inline example above shows only the wiring. It does not move or trap focus, handle `Escape` or return focus. Prefer the app's existing accessible dialog, drawer or toast component and drive it with `visible` and `close`.

## Rules

| Situation                            | Do this                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| :----------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Creating the manager                 | Module level is fine in client-only apps. With SSR or Next.js, create it per provider with `useState` in a `'use client'` file and share it through context. Never create it during render, and never share a module-level manager on the server. See [references/ssr-provider.md](references/ssr-provider.md).                                                                                                                                                                                                                                                                |
| Calling `open()`                     | The second argument holds the component's own props plus the manager options `id`, `exitDuration`, `portalTarget` and `stackingBehavior`. The overlay component receives its `id`, `visible`, `hide`, `close`, `onExitComplete` and `manager` from the manager. Never declare those in `Props`.                                                                                                                                                                                                                                                                                |
| Choosing an ID                       | Use the generated `promise.id` to address an overlay later. For a fixed name, pass the `id` option typed with the exported `OverlayId` brand: `import type { OverlayId }` and `const DELETE_ID = 'delete-confirm' as OverlayId`.                                                                                                                                                                                                                                                                                                                                               |
| Using the result                     | `undefined` means the overlay closed without a result: `close()`, `closeAll()` or the DevTools Close action. Compare with `undefined` when that differs from a `false` answer. Do not cast it away with `!` or `as`. On 0.4.x, annotate as `PromiseWithId<Result \| undefined>` to keep the check.                                                                                                                                                                                                                                                                             |
| Hiding or closing                    | `hide()` keeps the component mounted with its state and leaves the promise pending. `close()` resolves the promise first, then the overlay plays its exit and is removed. A UI primitive may unmount its own content while `visible` is `false`, so keep editable draft state in the `defineOverlay` component, above the dialog content.                                                                                                                                                                                                                                      |
| Removing closed overlays             | Removal waits for a `transitionend` or `animationend` on the overlay root, the exit timer or `onExitComplete()`. Without an exit animation, set `defaultExitDuration={0}` on `<OverlayManager>`. With an animation, set an exit timer that matches its length as a fallback, or call `onExitComplete()` when it finishes.                                                                                                                                                                                                                                                      |
| Dialog component with its own portal | The manager renders each overlay into a full-screen container in its own portal. A dialog that portals itself elsewhere can end up under that container, so clicks hit the empty container and count as outside clicks. Render the dialog inline in the container instead: with Radix, render `Dialog.Overlay` and `Dialog.Content` without `Dialog.Portal`. If a second portal is unavoidable, check in the browser that the dialog sits above the container and that clicks, keyboard focus, hiding and reopening still work. Lowering `zIndexBase` is not a general fix.    |
| Focus                                | The app owns focus. When a modal overlay opens, move focus into it and keep it there while it is modal. Treat `Escape` as dismissal: `close()` without a result. Keep a reference to the control that opened the overlay, and after `close()` or `hide()` return focus to it, including when a nested overlay closes back to its parent. That control can rerender or be disabled during the async flow, so focus it once it is mounted and enabled again. A dialog primitive may handle the trap, but check where focus lands after the manager hides or removes the overlay. |
| Several overlays at once             | The default `'hide-previous'` hides the overlay below while a new one is open. Use `stackingBehavior: 'stack'` for toasts and other non-modal overlays.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Reopening an ID                      | Opening a hidden ID shows it and returns the original promise. Opening an ID that is closing creates a new overlay and promise. Opening a visible ID throws `OverlayAlreadyOpenError`.                                                                                                                                                                                                                                                                                                                                                                                         |
| Closing from outside with a value    | `getInstance(id)` is not narrowed to that overlay's result type. Use the injected `close` inside the overlay, or `getInstancesByKey(key)`, when the result value matters.                                                                                                                                                                                                                                                                                                                                                                                                      |
| Opening from inside an overlay       | Use the injected `manager` instead of importing a global manager. For key-based typing, export the registry type, for example `type AppRegistry = typeof overlays.registry` or, with a per-provider manager, `AppOverlays['registry']`. Import it with `import type` and call `manager.as<AppRegistry>().open(...)`. `manager.open(Component, props)` needs no registry type.                                                                                                                                                                                                  |
| Rendering nothing                    | The `defineOverlay` component must return a JSX element. Return `<></>` instead of `null`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| DevTools                             | Install `@react-overlay-manager/devtools` as a dev dependency and render `<OverlayManagerDevtools manager={manager} />` next to `<OverlayManager>` with the same manager. It renders only when `process.env.NODE_ENV` is `'development'`. It shows overlay props, so keep it out of production.                                                                                                                                                                                                                                                                                |
