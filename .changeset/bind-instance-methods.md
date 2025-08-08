---
"@react-overlay-manager/core": patch
---

Bind public instance methods on `OverlayManagerCore` to preserve `this` when methods are destructured or passed as callbacks. Fixes runtime error when calling `open` with lost context (undefined `_createAndAddInstance`).
