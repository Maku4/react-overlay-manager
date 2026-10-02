#!/usr/bin/env node
/* global process, console */
// Publishes the tarballs produced by `changeset pack` with the npm CLI, which
// handles npm trusted publishing (OIDC). Tarballs come from `pnpm pack`, so
// `workspace:` ranges are already replaced with real versions.
//
// Usage: PACK_DIR=<changeset pack output> node .github/scripts/publish-packed.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const MIN_NPM_VERSION = [11, 5, 1];

const packDir = process.env.PACK_DIR;
if (!packDir) {
  throw new Error('PACK_DIR must point to the `changeset pack` output.');
}

const npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' })
  .trim()
  .split('.')
  .map(Number);
function isAtLeast(actual, min) {
  for (let i = 0; i < min.length; i++) {
    const part = actual[i] ?? 0;
    if (part !== min[i]) return part > min[i];
  }
  return true;
}
if (!isAtLeast(npmVersion, MIN_NPM_VERSION)) {
  throw new Error(
    `Trusted publishing needs npm ${MIN_NPM_VERSION.join('.')} or later, found ${npmVersion.join('.')}.`
  );
}

const planFile = JSON.parse(
  readFileSync(path.join(packDir, 'publish-plan.json'), 'utf8')
);
if (planFile.version !== 1) {
  throw new Error(`Unsupported publish plan version: ${planFile.version}`);
}

function isPublished(name, version) {
  try {
    const out = execFileSync('npm', ['view', `${name}@${version}`, 'version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return out.trim() === version;
  } catch (error) {
    // A package that was never published returns E404
    if (String(error.stderr).includes('E404')) return false;
    throw error;
  }
}

// Groups are ordered so dependencies publish before their dependents
for (const group of planFile.plan) {
  for (const release of group) {
    if (release.kind !== 'publish') continue;
    const id = `${release.name}@${release.version}`;

    if (!release.tarball) {
      throw new Error(`${id} has no packed tarball in the publish plan.`);
    }
    const tarball = path.join(packDir, release.tarball.path);
    const integrity = `sha256-${createHash('sha256')
      .update(readFileSync(tarball))
      .digest('base64')}`;
    if (integrity !== release.tarball.integrity) {
      throw new Error(`${id} tarball does not match the publish plan.`);
    }

    // Lets a rerun finish after a partial publish
    if (isPublished(release.name, release.version)) {
      console.log(`${id} is already published, skipping.`);
      continue;
    }

    console.log(`Publishing ${id} with dist-tag ${release.tag}`);
    execFileSync(
      'npm',
      ['publish', tarball, '--access', release.access, '--tag', release.tag],
      { stdio: 'inherit' }
    );
  }
}
