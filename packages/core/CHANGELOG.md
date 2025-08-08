# @react-overlay-manager/core

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
