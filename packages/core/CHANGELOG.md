# @react-overlay-manager/core

## 0.5.0

### Minor Changes

- 8bab65c: `open()` result types now include `undefined`. An overlay that closes without a result, through `close()`, `closeAll()` or the DevTools Close button, already resolved its promise with `undefined`, but the types did not show it. This applies to registry keys, components passed directly, lazy components, the shared `overlays` manager and the injected `manager.open()`. `OverlayResult` includes `undefined` in the same way. `void` and `unknown` results stay unchanged, and a `never` result becomes `undefined`. Runtime behavior is unchanged.

  This can break compilation where a result is used without a check. Add `| undefined` to annotations such as `PromiseWithId<boolean>` and `.then()` callback parameters, and handle `undefined` before using the value. See "Upgrading from 0.4" in the README.

### Patch Changes

- 387a42f: The README links to an agent skill for coding agents that build overlays with this package, with the command to install it.
- 6ad08ce: Opening an overlay with the ID of one that is still closing now creates a fresh instance with a new promise. Previously it returned the already resolved promise, and the old exit timer or callbacks could remove or close the reopened overlay. Reopening a hidden overlay still returns its original promise.

  `OverlayManager` now remounts the overlay component when a closing ID is reopened, so its state and mount effects start fresh. A hidden overlay that is shown again keeps its state.

  Closing an overlay no longer removes a new overlay that a `subscribe` listener opened under the same ID while handling the close.

  An explicit empty-string `id` now follows the same rules as any other ID: opening it twice throws `OverlayAlreadyOpenError`, and reopening it while hidden shows the existing overlay.

  Generated IDs now skip values already taken by an overlay opened with an explicit `id`, instead of replacing it.

  Registry keys that are symbols, `0` or `''` now work with `open` and `getInstancesByKey`. Symbol keys used to be treated as components, and `0` or `''` keys were dropped from the instance.

- e87a319: The exported `version` now matches the published package version. It was stuck at `0.1.0`.
- a3cc692: CommonJS consumers now get CommonJS type declarations (`.d.cts`) through `exports`. Before, `require` resolved to ESM types.

  Each module is now built to its own file, so the published code keeps `'use client'` on `OverlayManager`, `OverlayItem` and `useOverlayStore`. The build used to drop it. Manager APIs such as `createOverlayManager` stay free of the directive and can still be imported from server code.

  DevTools now declares `exports` and `sideEffects: false`, so production builds leave out the DevTools UI. It accepts any compatible `@react-overlay-manager/core` version (`^`) instead of one exact version, and no longer ships type test files or source maps.

## 0.4.1

### Patch Changes

- Patch release to pick up the React 19.2.1 security update and related dependency bumps.

## 0.4.0

### Minor Changes

- Add manager.as<T>() for typed nested overlays

## 0.3.1

### Patch Changes

- docs update

## 0.3.0

### Minor Changes

- correctly reveal nearest nonclosing overlay when closing topmost overlay

## 0.2.2

### Patch Changes

- e302014: Bind public instance methods on `OverlayManagerCore` to preserve `this` when methods are destructured or passed as callbacks. Fixes runtime error when calling `open` with lost context (undefined `_createAndAddInstance`).

## 0.2.1

### Patch Changes

- chore: optimize unpacked size

## 0.2.0

### Minor Changes

- remove immer, optimize bundle size

## 0.1.1

### Patch Changes

- 92c6a42: add more tests, update documentation

## 0.1.0

### Patch Changes

- Initial release of version 0.1.0
