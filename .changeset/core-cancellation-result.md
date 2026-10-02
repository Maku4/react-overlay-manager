---
'@react-overlay-manager/core': minor
---

`open()` result types now include `undefined`. An overlay that closes without a result, through `close()`, `closeAll()` or the DevTools Close button, already resolved its promise with `undefined`, but the types did not show it. This applies to registry keys, components passed directly, lazy components, the shared `overlays` manager and the injected `manager.open()`. `OverlayResult` includes `undefined` in the same way. `void` and `unknown` results stay unchanged, and a `never` result becomes `undefined`. Runtime behavior is unchanged.

This can break compilation where a result is used without a check. Add `| undefined` to annotations such as `PromiseWithId<boolean>` and `.then()` callback parameters, and handle `undefined` before using the value. See "Upgrading from 0.4" in the README.
