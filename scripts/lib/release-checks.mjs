// Pure helpers for verifying packages published to npm. They take parsed
// registry data and return problems, so the failure paths can be tested
// without network access.
import { createHash } from 'node:crypto';

export const PUBLIC_REGISTRY = 'https://registry.npmjs.org/';
export const PACKAGES = {
  core: '@react-overlay-manager/core',
  devtools: '@react-overlay-manager/devtools',
};
export const SLSA_PROVENANCE = 'https://slsa.dev/provenance/v1';

// SemVer 2.0 release or prerelease without build metadata: no leading zeros
// in numeric identifiers and no empty prerelease identifiers
const NUMBER = '(0|[1-9]\\d*)';
const PRERELEASE_ID = '(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)';
const EXACT_VERSION = new RegExp(
  `^${NUMBER}\\.${NUMBER}\\.${NUMBER}(?:-(${PRERELEASE_ID}(?:\\.${PRERELEASE_ID})*))?$`
);
// npm dist-tag names. A tag that looks like a version would be read as one.
const DIST_TAG = /^[A-Za-z][0-9A-Za-z._-]*$/;
const GIT_COMMIT = /^[0-9a-f]{40}$/;

export function isExactVersion(value) {
  return typeof value === 'string' && EXACT_VERSION.test(value);
}

export function isDistTag(value) {
  return (
    typeof value === 'string' && DIST_TAG.test(value) && !/^v\d/.test(value)
  );
}

/**
 * Reads verifier options. Without `--published` the verifier packs the local
 * workspace, and published-only options are rejected.
 */
export function parseVerifierArgs(argv) {
  const options = {
    published: false,
    versions: {},
    packDir: undefined,
    sourceCommit: undefined,
    distTag: 'latest',
    attempts: 10,
    delayMs: 30_000,
  };
  const valueAfter = (index, flag) => {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${flag} needs a value`);
    }
    return value;
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    switch (flag) {
      case '--published':
        options.published = true;
        break;
      case '--core':
      case '--devtools': {
        const version = valueAfter(i++, flag);
        if (!isExactVersion(version)) {
          throw new Error(`${flag} needs an exact version, got "${version}"`);
        }
        options.versions[flag.slice(2)] = version;
        break;
      }
      case '--pack-dir':
        options.packDir = valueAfter(i++, flag);
        break;
      case '--dist-tag': {
        const tag = valueAfter(i++, flag);
        if (!isDistTag(tag)) {
          throw new Error(`${flag} needs an npm dist-tag name, got "${tag}"`);
        }
        options.distTag = tag;
        break;
      }
      case '--source-commit': {
        const commit = valueAfter(i++, flag);
        if (!GIT_COMMIT.test(commit)) {
          throw new Error(`${flag} needs a full 40-character commit SHA`);
        }
        options.sourceCommit = commit;
        break;
      }
      case '--attempts':
      case '--delay-ms': {
        const number = Number(valueAfter(i++, flag));
        const min = flag === '--attempts' ? 1 : 0;
        if (!Number.isInteger(number) || number < min) {
          throw new Error(`${flag} needs an integer of at least ${min}`);
        }
        options[flag === '--attempts' ? 'attempts' : 'delayMs'] = number;
        break;
      }
      default:
        throw new Error(`Unknown option ${flag}`);
    }
  }
  const publishedOnly = [
    '--core',
    '--devtools',
    '--pack-dir',
    '--dist-tag',
    '--source-commit',
  ];
  if (!options.published && argv.some((arg) => publishedOnly.includes(arg))) {
    throw new Error(`${publishedOnly.join(', ')} need --published`);
  }
  if (options.sourceCommit && !options.packDir) {
    throw new Error('--source-commit needs --pack-dir');
  }
  return options;
}

function parseVersion(value) {
  const match = EXACT_VERSION.exec(value);
  if (!match) return undefined;
  return {
    parts: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4],
  };
}

function compareParts(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

/**
 * Checks a version against the peer range forms these packages publish:
 * exact versions, caret ranges and `||` unions. Other syntax throws, so an
 * unexpected range is reported instead of passing.
 */
export function satisfiesRange(version, range) {
  const target = parseVersion(version);
  if (!target) throw new Error(`Not an exact version: ${version}`);
  return range.split('||').some((part) => {
    const trimmed = part.trim();
    const caret = trimmed.startsWith('^');
    const bound = parseVersion(caret ? trimmed.slice(1) : trimmed);
    if (!bound) throw new Error(`Unsupported peer range: ${range}`);
    const identical =
      compareParts(target.parts, bound.parts) === 0 &&
      target.prerelease === bound.prerelease;
    // Prereleases only match the identical version. This can report a
    // compatible prerelease as a failure, but never passes an incompatible one.
    if (!caret || target.prerelease || bound.prerelease) return identical;
    if (compareParts(target.parts, bound.parts) < 0) return false;
    const [major, minor] = bound.parts;
    if (major > 0) return target.parts[0] === major;
    if (minor > 0) return target.parts[0] === 0 && target.parts[1] === minor;
    return compareParts(target.parts, bound.parts) === 0;
  });
}

export function sha256Integrity(buffer) {
  return `sha256-${createHash('sha256').update(buffer).digest('base64')}`;
}

export function sha512Integrity(buffer) {
  return `sha512-${createHash('sha512').update(buffer).digest('base64')}`;
}

/**
 * Sorts an npm CLI failure. Only a missing package or version can be a
 * propagation delay. Authentication, network and unknown failures are fatal.
 */
export function classifyNpmFailure(output) {
  const text = String(output);
  if (/\b(E401|E403|ENEEDAUTH|EOTP)\b/.test(text)) return 'auth';
  if (
    /\b(ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|EHOSTUNREACH|ENETUNREACH|E5\d\d)\b|socket hang up/i.test(
      text
    )
  ) {
    return 'network';
  }
  if (/\b(E404|ETARGET)\b|No match found for version/.test(text)) {
    return 'missing';
  }
  return 'unknown';
}

/**
 * Compares `npm view <name>@<version> --json` output with what the release
 * should have published. `pending` lists differences that registry
 * propagation can explain. `problems` lists failures that waiting cannot fix.
 */
export function checkRegistryVersion(meta, expected) {
  const pending = [];
  const problems = [];
  const id = `${expected.name}@${expected.version}`;
  if (meta.name !== expected.name || meta.version !== expected.version) {
    problems.push(`${id}: registry returned ${meta.name}@${meta.version}`);
    return { pending, problems };
  }
  if (!meta.dist?.integrity?.startsWith('sha512-')) {
    problems.push(`${id}: registry has no sha512 integrity`);
  }
  // A version published by this release must gain an attestation URL. Until
  // then the metadata is fetched again.
  if (expected.requireProvenance && !meta.dist?.attestations?.url) {
    pending.push(`${id}: no attestations yet`);
  }
  if (expected.distTag) {
    const tagged = meta['dist-tags']?.[expected.distTag];
    if (tagged !== expected.version) {
      pending.push(
        `${id}: dist-tag ${expected.distTag} points to ${tagged ?? 'nothing'}`
      );
    }
  }
  for (const [tag, version] of Object.entries(meta['dist-tags'] ?? {})) {
    if (!meta.versions?.includes(version)) {
      problems.push(`${id}: dist-tag ${tag} points to unpublished ${version}`);
    }
  }
  // Each peer maps to the versions consumers are expected to install
  for (const [peer, wanted] of Object.entries(expected.peers ?? {})) {
    const range = meta.peerDependencies?.[peer];
    if (!range) {
      problems.push(`${id}: missing peer dependency ${peer}`);
      continue;
    }
    for (const version of [wanted].flat()) {
      let ok;
      try {
        ok = satisfiesRange(version, range);
      } catch (error) {
        problems.push(`${id}: ${error.message}`);
        break;
      }
      if (!ok)
        problems.push(`${id}: peer ${peer} ${range} excludes ${version}`);
    }
  }
  return { pending, problems };
}

/**
 * Reads the expected tarballs from a `changeset pack` publish plan. Only
 * entries the release published are returned.
 */
export function readPublishPlan(plan) {
  if (plan?.version !== 1 || !Array.isArray(plan.plan)) {
    throw new Error('Unsupported publish plan format');
  }
  const releases = new Map();
  for (const release of plan.plan.flat()) {
    if (release.kind !== 'publish') continue;
    if (!release.tarball?.integrity?.startsWith('sha256-')) {
      throw new Error(`${release.name} has no sha256 tarball integrity`);
    }
    releases.set(release.name, {
      version: release.version,
      tarball: release.tarball.path,
      integrity: release.tarball.integrity,
    });
  }
  return releases;
}

/**
 * Checks decoded provenance statements from the npm attestations endpoint
 * against the downloaded tarball and the expected release workflow. This
 * reads the statements. Signature verification is left to
 * `npm audit signatures`.
 */
export function checkProvenance(statements, expected) {
  const id = `${expected.name}@${expected.version}`;
  const provenance = statements.find(
    (statement) => statement.predicateType === SLSA_PROVENANCE
  );
  if (!provenance) return [`${id}: no SLSA provenance attestation`];
  const problems = [];
  const subject = `pkg:npm/${expected.name.replace('@', '%40')}@${expected.version}`;
  const digest = provenance.subject?.find((item) => item.name === subject)
    ?.digest?.sha512;
  if (digest !== expected.sha512Hex) {
    problems.push(`${id}: provenance subject does not match the tarball`);
  }
  const workflow =
    provenance.predicate?.buildDefinition?.externalParameters?.workflow;
  if (workflow?.repository !== expected.repository) {
    problems.push(
      `${id}: provenance repository is ${workflow?.repository ?? 'missing'}`
    );
  }
  if (workflow?.path !== expected.workflowPath) {
    problems.push(
      `${id}: provenance workflow is ${workflow?.path ?? 'missing'}`
    );
  }
  if (expected.sourceCommit) {
    // The source checkout of this repository, not any other dependency
    const source =
      provenance.predicate?.buildDefinition?.resolvedDependencies?.find(
        (dependency) =>
          dependency.uri?.startsWith(`git+${expected.repository}@`)
      );
    const commit = source?.digest?.gitCommit;
    if (commit !== expected.sourceCommit) {
      problems.push(
        `${id}: provenance source commit is ${commit ?? 'missing'}, expected ${expected.sourceCommit}`
      );
    }
  }
  return problems;
}

/**
 * Runs `attempt` until it reports no pending differences. Problems and
 * errors stop immediately, except errors marked as `missing`, which can be
 * registry propagation. Running out of attempts is a failure.
 */
export async function retryPropagation(attempt, { attempts, delayMs, sleep }) {
  let last = [];
  for (let i = 1; i <= attempts; i++) {
    let result;
    try {
      result = await attempt();
    } catch (error) {
      if (error?.kind !== 'missing') throw error;
      last = [error.message];
      result = undefined;
    }
    if (result) {
      if (result.problems.length) {
        throw new Error(result.problems.join('\n'));
      }
      if (!result.pending.length) return result.value;
      last = result.pending;
    }
    if (i < attempts) await sleep(delayMs);
  }
  throw new Error(
    `Still not visible after ${attempts} attempts:\n${last.join('\n')}`
  );
}
