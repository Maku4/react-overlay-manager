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

`pnpm validate` runs the build, both type checks, lint and formatting, then the tests with coverage and `pnpm audit`. CI runs it on pull requests.

To run one test file, pass its path to Vitest:

```bash
pnpm exec vitest run packages/devtools/tests/keyboard-selection.spec.tsx
```

`pnpm test:coverage` prints a coverage report.

Runtime tests live in `packages/*/tests`. Type-level tests live in `packages/*/types-tests`.

## Demo

`demo/` is a small app that the server renders with `renderToString` and the browser hydrates. It imports the built packages, so build them first:

```bash
pnpm build
node demo/server.mjs
```

Open http://localhost:5173/. Set `PORT` or `HOST` to use a different address. After changing package source, run `pnpm build` again and restart the server.

The page shows whether hydration finished and how many recoverable hydration errors React reported. Use it to check:

- opening, hiding, showing, closing and reopening a dialog with the same ID,
- a nested confirmation (`'hide-previous'`) and a stacked help dialog (`'stack'`),
- removal after the exit transition, or after the 400 ms fallback with reduced motion turned on,
- keyboard use: Tab stays in the top dialog, Escape closes it and focus returns to the opener,
- the DevTools panel, including keyboard row selection, BigInt and circular props, and a reload with the panel open.

The dialog focus handling lives in `demo/src/Dialog.tsx`. The library does not trap or restore focus.

## Changes

- Add a regression test that fails without your fix.
- Keep public API changes typed and covered by a type-level test.
- Update the README when behavior that users depend on changes.

## Changesets

Every change that affects a published package needs a changeset:

```bash
pnpm changeset
```

Pick the affected packages and the bump type, then describe the change from a user's point of view. Commit the generated file in `.changeset/` with your change. Maintainers version and publish packages from `main`. See [.github/RELEASING.md](.github/RELEASING.md).

## Reporting security issues

Do not describe a vulnerability in a public issue. Follow [SECURITY.md](SECURITY.md).
