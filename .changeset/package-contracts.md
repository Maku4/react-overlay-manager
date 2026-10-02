---
'@react-overlay-manager/core': patch
'@react-overlay-manager/devtools': patch
---

CommonJS consumers now get CommonJS type declarations (`.d.cts`) through `exports`. Before, `require` resolved to ESM types.

Each module is now built to its own file, so the published code keeps `'use client'` on `OverlayManager`, `OverlayItem` and `useOverlayStore`. The build used to drop it. Manager APIs such as `createOverlayManager` stay free of the directive and can still be imported from server code.

DevTools now declares `exports` and `sideEffects: false`, so production builds leave out the DevTools UI. It accepts any compatible `@react-overlay-manager/core` version (`^`) instead of one exact version, and no longer ships type test files or source maps.
