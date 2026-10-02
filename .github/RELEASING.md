# Releasing

Releases run from `.github/workflows/release.yml` on every push to `main`. Versions change only through changesets. A version published to npm cannot be replaced, so every check happens before publication and every later problem needs a maintainer decision.

Use Node 24, at least 24.15, and pnpm 12.8.1, as pinned in `.nvmrc` and `package.json`.

## Flow

1. `select-mode` checks the state of `main`.
   - Pending changesets: the `version` job opens or updates the "Version Packages" PR.
   - A package version that is not on npm yet: the `pack`, `publish` and `verify-published` jobs run.
   - Neither: nothing else runs, and no versions change.
2. `pack` runs `pnpm validate` on the commit being released, then packs the packages with `pnpm pack`. If validation fails, nothing is published.
3. `publish` publishes those tarballs with the npm CLI through trusted publishing. It then tags the new versions and creates GitHub releases.
4. `verify-published` downloads the released versions from npm and checks them. It only reads. See [After publishing](#after-publishing).

`pnpm validate` is the same gate CI runs on pull requests: build, type checks, type tests, lint, formatting, tests with coverage, release script tests, packed package checks with React 18 and 19 consumers, and `pnpm audit`.

## First release from this workflow

The pending changesets plan these versions:

- `@react-overlay-manager/core` 0.5.0
- `@react-overlay-manager/devtools` 0.2.4, with the peer dependency `@react-overlay-manager/core` `^0.5.0`

The repository declares that peer as `workspace:^`. `pnpm pack` turns it into `^0.5.0`.

1. Configure the npm trusted publisher for both packages, as listed in [Prerequisites on npm](#prerequisites-on-npm). The publish job fails without it.
2. Merge the stacked pull requests into `main` in order. Each push runs the release workflow in `version` mode, which opens or updates the "Version Packages" PR. Nothing is published.
3. Leave the "Version Packages" PR open until the last stacked PR is merged. The workflow rewrites it after every push to `main`.
4. Review its final commit:
   - `packages/core/package.json` has version 0.5.0.
   - `packages/devtools/package.json` has version 0.2.4 and keeps the peer `workspace:^`.
   - Both changelogs list the expected changes.
   - `.changeset/` holds only `config.json` and `README.md`.
5. Validate that exact commit. See [CI on the Version Packages PR](#ci-on-the-version-packages-pr).
6. Merge the PR. The workflow on the merge commit packs, publishes and verifies.
7. Run the checks in [After publishing](#after-publishing).

## CI on the Version Packages PR

The `version` job pushes the PR with the workflow's `GITHUB_TOKEN`. GitHub does not start workflow runs for events caused by that token, except that it is rolling out approval-required runs for pull requests it opens or updates. CI on this PR either does not start or waits for "Approve workflows to run" in the merge box.

A missing or pending check is not a pass. Before merging, do one of these on the PR head commit:

- Approve the waiting runs and wait until CI passes on that commit.
- Check out the PR head and run `pnpm install --frozen-lockfile` and `pnpm validate`.

Merge only the commit you validated. If the workflow updates the PR afterwards, validate again.

## After publishing

`verify-published` checks the released commit's versions on public npm:

- the exact versions exist, `latest` points to them and the DevTools peer accepts the released core
- every newly published tarball matches the SHA256 of the tarball the `pack` job built
- newly published versions have SLSA provenance from this repository's `release.yml`, and `npm audit signatures` passes
- React 18 and 19 consumers that install the exact versions from npm pass the same contracts as `pnpm verify:packages`

It waits up to about 5 minutes for npm to show new versions. Authentication and network errors fail the job immediately. A package the release did not publish is checked as well, without a provenance requirement.

A failure here cannot roll back the publication. To repeat the check, use "Re-run failed jobs" on the original run while the pack artifact exists (30 days), or run it from a checkout of the released commit:

```bash
pnpm install --frozen-lockfile
pnpm verify:published
```

Without options it takes the versions from the package manifests. `--core <version>` and `--devtools <version>` check other exact versions. `--pack-dir <dir>` adds the artifact and provenance checks for a downloaded `changeset-pack` artifact. `--dist-tag none` skips the `latest` check after a later release has moved it.

Check the release three times:

1. When the workflow finishes: `verify-published` passed, and the tags and GitHub releases exist.
2. About 24 hours later: run `pnpm verify:published --core 0.5.0 --devtools 0.2.4`, and read new issues.
3. About 72 hours later: repeat the same checks.

## When something fails

- **Before `publish`:** nothing reached npm. Fix the problem on `main` with a new commit.
- **During `publish`:** see [Recovering a partial release](#recovering-a-partial-release).
- **After publication:** keep the failing output and decide before acting. A version number can never be reused. Do not unpublish as a rollback, because it breaks installs that already resolved the version. The options are:
  - Release a fix in a new patch version through a changeset.
  - Point `latest` back to the previous version with `npm dist-tag add <package>@<version> latest`.
  - Mark the broken version with `npm deprecate`.

  Moving a dist-tag, deprecating or releasing a hotfix needs a maintainer's decision and npm access. The workflow does none of these.

## Recovering a partial release

If the `publish` job published to npm but failed later, while tagging or creating GitHub releases, open the original workflow run and use "Re-run failed jobs". The re-run uses the same commit and the tarballs from the original `pack` job. It skips versions that are already on npm, then tags and releases the rest, and runs `verify-published`. This works while the pack artifact exists, which is 30 days.

Do not start a new run for this. A new run sees the versions on npm, selects no work and creates no tags.

The re-run skips tags that already exist. If a tag was pushed but its GitHub release is missing, or the artifact has expired, create the missing tag and release by hand from the released commit and the package `CHANGELOG.md`. Tags use the form `@react-overlay-manager/core@0.5.0`.

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
