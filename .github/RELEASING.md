# Releasing

Releases run from `.github/workflows/release.yml` on every push to `main`. Versions change only through changesets. Validation gates the release before anything is published. After publication, a read-only job checks what npm serves. A version published to npm cannot be replaced, so a problem found after publication needs a maintainer decision.

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
2. Merge the stacked pull requests into `main` in order. A push without pending changesets selects no work. Once changesets are on `main`, each push runs the `version` job, which opens or updates the "Version Packages" PR. Nothing is published.
3. Leave the "Version Packages" PR open until the last stacked PR is merged. Before approving it, check that the release workflow run for that last merge has finished and updated the PR.
4. Review its final commit:
   - `packages/core/package.json` has version 0.5.0.
   - `packages/devtools/package.json` has version 0.2.4 and keeps the peer `workspace:^`.
   - Both changelogs list the expected changes.
   - `.changeset/` holds only `config.json` and `README.md`.
5. Validate that exact commit. See [CI on the Version Packages PR](#ci-on-the-version-packages-pr).
6. Merge the PR. The workflow on the merge commit packs, publishes and verifies.
7. Run the checks in [After publishing](#after-publishing).

## CI on the Version Packages PR

The `version` job pushes the PR with the workflow's `GITHUB_TOKEN`. When a workflow opens, updates or reopens a pull request with that token, GitHub creates its CI runs in an approval-required state. See [Triggering a workflow from a workflow](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

A pending check is not a pass. Before merging:

1. Select "Approve workflows to run" in the merge box, as a user with write access.
2. Wait until CI passes on the current PR head commit.
3. If the runs cannot be approved, check out the PR head and run `pnpm install --frozen-lockfile` and `pnpm validate` instead.

Merge only the commit you validated. If the workflow updates the PR afterwards, validate again.

## After publishing

`verify-published` checks the released commit's versions on public npm:

- the exact versions exist, the dist-tag each version was published with points to it and the DevTools peer accepts the released core
- every newly published tarball matches the SHA256 of the tarball the `pack` job built
- newly published versions have SLSA provenance from this repository's `release.yml`, run on `main`, that names the exact released commit
- `npm audit signatures` passes
- React 18 and 19 consumers that install the exact versions from npm pass the same contracts as `pnpm verify:packages`

Each registry step, such as reading a package's metadata, waits up to about 5 minutes for npm to show new data: 10 attempts, 30 seconds apart. A request for attestations times out after 30 seconds. Authentication, network and timeout errors fail the job immediately. A package the release did not publish is checked as well, without a provenance requirement.

A failure here cannot roll back the publication. To repeat the check, use "Re-run failed jobs" on the original run while the pack artifact exists (30 days), or run it from a checkout of the released commit:

```bash
pnpm install --frozen-lockfile
pnpm verify:published
```

Without options it takes the versions from the package manifests and expects `latest` to point to them. `--core <version>` and `--devtools <version>` check other exact versions. `--dist-tag <tag>` expects another tag, and `--dist-tag none` skips the check, for example after a later release has moved `latest`.

What a run proves depends on `--pack-dir`:

- Without it: registry metadata and integrity, dist-tags, peer ranges, signatures and the consumer contracts. It does not compare with the release artifact or check the provenance repository, workflow, branch or source commit.
- With `--pack-dir <dir>`, pointing at the downloaded `changeset-pack` artifact: also the artifact SHA256 and provenance for each version the release published. Provenance must name the commit given by `--source-commit <sha>`, or the checked-out commit without that option. Each version is expected under the dist-tag recorded in the artifact's publish plan.

Check the release three times:

1. When the workflow finishes: `verify-published` passed, and the tags and GitHub releases exist.
2. About 24 hours later: run the check from a checkout of the released commit or its release tag, with the original pack artifact, and read new issues:

   ```bash
   git checkout <released commit>
   pnpm install --frozen-lockfile
   pnpm verify:published --pack-dir <artifact dir> --source-commit <released commit>
   ```

   Use the released commit, not a later `main`. Later consumer contracts can describe newer behavior and fail a correct earlier release.

3. About 72 hours later: repeat the same check.

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
- Environment: `npm-publish`, the environment of the `publish` job in `release.yml`. npm rejects the publish if the two differ.
- Allowed actions: allow `npm publish`. The workflow publishes directly and does not use staged publishing.

Set this under Package settings, Trusted publishing for each package. After the first successful release, the `NPM_TOKEN` repository secret is no longer used and can be removed.

The publish job requests `id-token: write` and runs npm 11.5.1 or later on Node 24. The repository is public, so npm adds provenance automatically.

## Prerequisites on GitHub

- Settings, Actions, General: enable "Allow GitHub Actions to create and approve pull requests". The version job needs it to open the version PR.
- The `publish` job runs in the `npm-publish` environment. GitHub creates it on the first run if it does not exist. Protection rules set on it, such as required reviewers, apply before publishing.
