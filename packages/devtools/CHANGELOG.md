# @react-overlay-manager/devtools

## 0.2.4

### Patch Changes

- 7f248b6: The details view no longer crashes on props that JSON cannot serialize. BigInt values, circular references, functions, React elements and throwing getters show as readable placeholders, and the injected `manager` prop shows as `[OverlayManager]` instead of being expanded. Ordinary JSON data is shown in full. Copy JSON copies the same text the view shows.

  The floating button can be dragged again after the panel is closed, including when the panel was restored open from session storage. Releasing the button after a drag no longer opens the panel. A plain click still does. A drag released outside the button no longer blocks the next Enter or Space press on it.

  Overlay rows are now buttons. Tab reaches each row, Enter or Space selects it, the selected row is marked with `aria-current`, and keyboard focus shows a visible outline.

  Server-rendered apps no longer hit a hydration mismatch when the panel was left open. DevTools renders closed on the server and on the first client render, then reopens the panel from session storage after mount.

  The Show and Close actions are disabled for an overlay that is already closing, because its promise has resolved and it is waiting for removal. Show still works for a hidden overlay that is not closing.

  The DevTools entry point now starts with `'use client'`, so a Next.js App Router server component can render `OverlayManagerDevtools` directly. Production builds still leave out the DevTools UI.

- a3cc692: CommonJS consumers now get CommonJS type declarations (`.d.cts`) through `exports`. Before, `require` resolved to ESM types.

  Each module is now built to its own file, so the published code keeps `'use client'` on `OverlayManager`, `OverlayItem` and `useOverlayStore`. The build used to drop it. Manager APIs such as `createOverlayManager` stay free of the directive and can still be imported from server code.

  DevTools now declares `exports` and `sideEffects: false`, so production builds leave out the DevTools UI. It accepts any compatible `@react-overlay-manager/core` version (`^`) instead of one exact version, and no longer ships type test files or source maps.

- Updated dependencies [8bab65c]
- Updated dependencies [387a42f]
- Updated dependencies [6ad08ce]
- Updated dependencies [e87a319]
- Updated dependencies [a3cc692]
  - @react-overlay-manager/core@0.5.0

## 0.2.3

### Patch Changes

- Patch release to pick up the React 19.2.1 security update and related dependency bumps.
- Updated dependencies
  - @react-overlay-manager/core@0.4.1

## 0.2.2

### Patch Changes

- Updated dependencies
  - @react-overlay-manager/core@0.4.0

## 0.2.1

### Patch Changes

- docs update
- Updated dependencies
  - @react-overlay-manager/core@0.3.1

## 0.2.0

### Minor Changes

- devtools ui/ux upgrade

## 0.1.5

### Patch Changes

- Updated dependencies
  - @react-overlay-manager/core@0.3.0

## 0.1.4

### Patch Changes

- Updated dependencies [e302014]
  - @react-overlay-manager/core@0.2.2

## 0.1.3

### Patch Changes

- Updated dependencies
  - @react-overlay-manager/core@0.2.1

## 0.1.2

### Patch Changes

- Updated dependencies
  - @react-overlay-manager/core@0.2.0

## 0.1.1

### Patch Changes

- 92c6a42: add more tests, update documentation
- Updated dependencies [92c6a42]
  - @react-overlay-manager/core@0.1.1

## 0.1.0

### Patch Changes

- Initial release of version 0.1.0
- Updated dependencies
  - @react-overlay-manager/core@0.1.0
