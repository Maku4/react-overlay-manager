---
'@react-overlay-manager/core': patch
---

Opening an overlay with the ID of one that is still closing now creates a fresh instance with a new promise. Previously it returned the already resolved promise, and the old exit timer or callbacks could remove or close the reopened overlay. Reopening a hidden overlay still returns its original promise.
