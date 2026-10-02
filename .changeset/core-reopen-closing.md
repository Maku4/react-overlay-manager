---
'@react-overlay-manager/core': patch
---

Opening an overlay with the ID of one that is still closing now creates a fresh instance with a new promise. Previously it returned the already resolved promise, and the old exit timer or callbacks could remove or close the reopened overlay. Reopening a hidden overlay still returns its original promise.

`OverlayManager` now remounts the overlay component when a closing ID is reopened, so its state and mount effects start fresh. A hidden overlay that is shown again keeps its state.

Closing an overlay no longer removes a new overlay that a `subscribe` listener opened under the same ID while handling the close.

An explicit empty-string `id` now follows the same rules as any other ID: opening it twice throws `OverlayAlreadyOpenError`, and reopening it while hidden shows the existing overlay.

Generated IDs now skip values already taken by an overlay opened with an explicit `id`, instead of replacing it.

Registry keys that are symbols, `0` or `''` now work with `open` and `getInstancesByKey`. Symbol keys used to be treated as components, and `0` or `''` keys were dropped from the instance.
