# Contributing

This repository is a pnpm workspace with two published packages:

- `packages/core` is `@react-overlay-manager/core`.
- `packages/devtools` is `@react-overlay-manager/devtools`. It depends on core through the workspace.

## Setup

Use the Node.js version in `.nvmrc` and the pnpm version in the `packageManager` field of `package.json`. With Corepack enabled, pnpm picks up the pinned version on its own.

```bash
pnpm install --frozen-lockfile
pnpm build
```

Build before running tests or type checks. DevTools import core from its build output.

## Checks

Run these from the repository root before opening a pull request:

| Command             | What it runs                                |
| :------------------ | :------------------------------------------ |
| `pnpm build`        | Builds every package                        |
| `pnpm test`         | Vitest runtime tests for all packages       |
| `pnpm type-check`   | `tsc --noEmit` in each package              |
| `pnpm test:types`   | Type-level tests with `tsd` in each package |
| `pnpm lint`         | ESLint                                      |
| `pnpm format:check` | Prettier                                    |

To run one test file, pass its path to Vitest:

```bash
pnpm exec vitest run packages/devtools/tests/keyboard-selection.spec.tsx
```

`pnpm test:coverage` prints a coverage report.

Runtime tests live in `packages/*/tests`. Type-level tests live in `packages/*/types-tests`.

## Changes

- Add a regression test that fails without your fix.
- Keep public API changes typed and covered by a type-level test.
- Update the README when behavior that users depend on changes.

## Changesets

Every change that affects a published package needs a changeset:

```bash
pnpm changeset
```

Pick the affected packages and the bump type, then describe the change from a user's point of view. Commit the generated file in `.changeset/` with your change. Maintainers version and publish packages from `main`.

## Reporting security issues

Do not describe a vulnerability in a public issue. Follow [SECURITY.md](SECURITY.md).
