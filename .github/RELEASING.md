# Releasing

Releases run from `.github/workflows/release.yml` on every push to `main`. Versions change only through changesets.

## Flow

1. `select-mode` checks the state of `main`.
   - Pending changesets: the `version` job opens or updates the "Version Packages" PR.
   - A package version that is not on npm yet: the `pack` and `publish` jobs run.
   - Neither: nothing else runs, and no versions change.
2. `pack` runs `pnpm validate` on the commit being released, then packs the packages with `pnpm pack`. If validation fails, nothing is published.
3. `publish` publishes those tarballs with the npm CLI through trusted publishing. It then tags the new versions and creates GitHub releases.

`pnpm validate` is the same gate CI runs on pull requests: build, type checks, type tests, lint, formatting, tests with coverage and `pnpm audit`.

## Recovering a partial release

If the `publish` job published to npm but failed later, while tagging or creating GitHub releases, open the original workflow run and use "Re-run failed jobs". The re-run uses the same commit and the tarballs from the original `pack` job. It skips versions that are already on npm, then tags and releases the rest. This works while the pack artifact exists, which is 30 days.

Do not start a new run for this. A new run sees the versions on npm, selects no work and creates no tags.

The re-run skips tags that already exist. If a tag was pushed but its GitHub release is missing, or the artifact has expired, create the missing tag and release by hand from the released commit and the package `CHANGELOG.md`. Tags use the form `@react-overlay-manager/core@0.4.2`.

## Prerequisites on npm

Publishing uses npm trusted publishing (OIDC), so the workflow needs no npm token. Before the first release from this workflow, each package needs a trusted publisher on npmjs.com:

- Packages: `@react-overlay-manager/core` and `@react-overlay-manager/devtools`
- Provider: GitHub Actions
- Organization or user: `Maku4`
- Repository: `react-overlay-manager`
- Workflow filename: `release.yml`
- Environment: leave empty
- Allowed actions: allow `npm publish`. The workflow publishes directly and does not use staged publishing.

Set this under Package settings, Trusted publishing for each package. After the first successful release, the `NPM_TOKEN` repository secret is no longer used and can be removed.

The publish job requests `id-token: write` and runs npm 11.5.1 or later on Node 24. The repository is public, so npm adds provenance automatically.

## Prerequisites on GitHub

- Settings, Actions, General: enable "Allow GitHub Actions to create and approve pull requests". The version job needs it to open the version PR.
