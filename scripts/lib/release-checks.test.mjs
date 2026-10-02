import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { describe, it } from 'node:test';
import {
  checkProvenance,
  checkRegistryVersion,
  classifyNpmFailure,
  parseVerifierArgs,
  readPublishPlan,
  retryPropagation,
  satisfiesRange,
  sha256Integrity,
  SLSA_PROVENANCE,
} from './release-checks.mjs';

const core = '@react-overlay-manager/core';
const devtools = '@react-overlay-manager/devtools';

describe('parseVerifierArgs', () => {
  it('keeps the local mode by default', () => {
    assert.equal(parseVerifierArgs([]).published, false);
  });

  it('accepts exact versions in published mode', () => {
    const options = parseVerifierArgs([
      '--published',
      '--core',
      '0.5.0',
      '--devtools',
      '0.2.4',
    ]);
    assert.deepEqual(options.versions, { core: '0.5.0', devtools: '0.2.4' });
  });

  it('rejects ranges, tags and missing values', () => {
    for (const value of ['^0.5.0', 'latest', '0.5', '']) {
      assert.throws(
        () => parseVerifierArgs(['--published', '--core', value]),
        /exact version|needs a value/
      );
    }
    assert.throws(() => parseVerifierArgs(['--published', '--core']));
  });

  it('rejects published options without --published', () => {
    assert.throws(() => parseVerifierArgs(['--core', '0.5.0']), /--published/);
    assert.throws(() => parseVerifierArgs(['--pack-dir', '/tmp/x']));
  });

  it('rejects malformed exact versions', () => {
    for (const version of ['01.2.3', '1.2.3-.', '1.2.3-a..b', '1.2.3-01']) {
      assert.throws(() =>
        parseVerifierArgs(['--published', '--core', version])
      );
    }
  });

  it('rejects invalid npm dist-tags', () => {
    for (const tag of ['1.2.3', 'has space', 'https://evil.test']) {
      assert.throws(() =>
        parseVerifierArgs(['--published', '--dist-tag', tag])
      );
    }
  });

  it('rejects unknown options and invalid retry bounds', () => {
    assert.throws(() => parseVerifierArgs(['--publish']), /Unknown option/);
    assert.throws(() => parseVerifierArgs(['--attempts', '0']));
    assert.throws(() => parseVerifierArgs(['--delay-ms', '-1']));
  });
});

describe('satisfiesRange', () => {
  it('handles caret ranges on 0.x versions', () => {
    assert.equal(satisfiesRange('0.5.0', '^0.5.0'), true);
    assert.equal(satisfiesRange('0.5.3', '^0.5.0'), true);
    assert.equal(satisfiesRange('0.6.0', '^0.5.0'), false);
    assert.equal(satisfiesRange('0.4.1', '^0.5.0'), false);
  });

  it('rejects a new core against the old exact devtools peer', () => {
    assert.equal(satisfiesRange('0.5.0', '0.4.1'), false);
    assert.equal(satisfiesRange('0.4.1', '0.4.1'), true);
  });

  it('handles the React peer union', () => {
    const range = '^18.0.0 || ^19.0.0';
    assert.equal(satisfiesRange('18.3.1', range), true);
    assert.equal(satisfiesRange('19.3.0', range), true);
    assert.equal(satisfiesRange('20.0.0', range), false);
    assert.equal(satisfiesRange('17.0.2', range), false);
  });

  it('does not match prereleases through a caret', () => {
    assert.equal(satisfiesRange('0.5.1-beta.0', '^0.5.0'), false);
  });

  it('fails on range syntax it does not understand', () => {
    assert.throws(() => satisfiesRange('0.5.0', '>=0.5.0'), /Unsupported/);
    assert.throws(() => satisfiesRange('0.5.0', 'workspace:^'), /Unsupported/);
  });
});

describe('classifyNpmFailure', () => {
  it('treats only a missing package or version as propagation', () => {
    assert.equal(classifyNpmFailure('npm error code E404'), 'missing');
    assert.equal(
      classifyNpmFailure('404 No match found for version 0.5.0'),
      'missing'
    );
    assert.equal(classifyNpmFailure('npm error code ETARGET'), 'missing');
  });

  it('never treats authentication or network failures as propagation', () => {
    assert.equal(classifyNpmFailure('npm error code E401'), 'auth');
    assert.equal(classifyNpmFailure('npm error code E403'), 'auth');
    assert.equal(classifyNpmFailure('npm error code ENEEDAUTH'), 'auth');
    assert.equal(classifyNpmFailure('getaddrinfo ENOTFOUND'), 'network');
    assert.equal(classifyNpmFailure('npm error code ETIMEDOUT'), 'network');
    assert.equal(classifyNpmFailure('npm error code E503'), 'network');
    assert.equal(classifyNpmFailure('something else broke'), 'unknown');
  });
});

describe('checkRegistryVersion', () => {
  const meta = (overrides = {}) => ({
    name: devtools,
    version: '0.2.4',
    versions: ['0.2.3', '0.2.4'],
    'dist-tags': { latest: '0.2.4' },
    dist: { integrity: 'sha512-abc' },
    peerDependencies: {
      react: '^18.0.0 || ^19.0.0',
      [core]: '^0.5.0',
    },
    ...overrides,
  });
  const expected = {
    name: devtools,
    version: '0.2.4',
    distTag: 'latest',
    peers: { react: ['18.3.1', '19.3.0'], [core]: '0.5.0' },
  };

  it('accepts a matching release', () => {
    assert.deepEqual(checkRegistryVersion(meta(), expected), {
      pending: [],
      problems: [],
    });
  });

  it('reports a lagging dist-tag as pending', () => {
    const result = checkRegistryVersion(
      meta({ 'dist-tags': { latest: '0.2.3' } }),
      expected
    );
    assert.deepEqual(result.problems, []);
    assert.match(result.pending[0], /latest points to 0.2.3/);
  });

  it('waits for required provenance metadata to appear before accepting a release', async () => {
    const required = { ...expected, requireProvenance: true };
    const first = checkRegistryVersion(meta(), required);
    assert.deepEqual(first.problems, []);
    assert.ok(first.pending.length > 0, 'Missing attestations must be pending');
    let reads = 0;
    const visible = await retryPropagation(
      async () => {
        const current =
          ++reads === 1
            ? meta()
            : meta({
                dist: {
                  integrity: 'sha512-abc',
                  attestations: {
                    url: 'https://registry.npmjs.org/attestations/test',
                  },
                },
              });
        return { value: current, ...checkRegistryVersion(current, required) };
      },
      { attempts: 2, delayMs: 0, sleep: async () => {} }
    );
    assert.equal(reads, 2);
    assert.ok(visible.dist.attestations.url);
  });

  it('accepts unchanged packages without requiring new attestations', () => {
    assert.deepEqual(
      checkRegistryVersion(meta(), { ...expected, requireProvenance: false }),
      { pending: [], problems: [] }
    );
  });

  it('reports a different version, dangling tag and missing integrity', () => {
    assert.match(
      checkRegistryVersion(meta({ version: '0.2.3' }), expected).problems[0],
      /registry returned/
    );
    assert.match(
      checkRegistryVersion(
        meta({ 'dist-tags': { latest: '0.2.4', next: '9.9.9' } }),
        expected
      ).problems[0],
      /next points to unpublished 9.9.9/
    );
    assert.match(
      checkRegistryVersion(meta({ dist: {} }), expected).problems[0],
      /no sha512 integrity/
    );
  });

  it('reports peer incompatibility', () => {
    const exactOldPeer = meta({
      peerDependencies: { react: '^18.0.0 || ^19.0.0', [core]: '0.4.1' },
    });
    assert.match(
      checkRegistryVersion(exactOldPeer, expected).problems[0],
      /excludes 0.5.0/
    );
    const noReact18 = meta({
      peerDependencies: { react: '^19.0.0', [core]: '^0.5.0' },
    });
    assert.match(
      checkRegistryVersion(noReact18, expected).problems[0],
      /excludes 18.3.1/
    );
    const missingPeer = meta({ peerDependencies: { react: '^19.0.0' } });
    assert.ok(
      checkRegistryVersion(missingPeer, expected).problems.some((problem) =>
        problem.includes(`missing peer dependency ${core}`)
      )
    );
  });
});

describe('readPublishPlan', () => {
  it('returns only published entries', () => {
    const releases = readPublishPlan({
      version: 1,
      plan: [
        [
          {
            kind: 'publish',
            name: core,
            version: '0.5.0',
            tarball: { path: 'packages/core.tgz', integrity: 'sha256-x' },
          },
        ],
        [{ kind: 'tag-only', name: devtools, version: '0.2.3' }],
      ],
    });
    assert.deepEqual([...releases.keys()], [core]);
  });

  it('keeps the dist-tag of each release and rejects invalid ones', () => {
    const entry = (tag) => ({
      version: 1,
      plan: [
        [
          {
            kind: 'publish',
            name: core,
            version: '0.6.0-beta.0',
            tag,
            tarball: { path: 'packages/core.tgz', integrity: 'sha256-x' },
          },
        ],
      ],
    });
    assert.equal(readPublishPlan(entry('next')).get(core).tag, 'next');
    assert.throws(() => readPublishPlan(entry('1.2.3')), /invalid dist-tag/);
  });

  it('rejects unknown formats and missing integrity', () => {
    assert.throws(() => readPublishPlan({ version: 2, plan: [] }));
    assert.throws(() =>
      readPublishPlan({
        version: 1,
        plan: [[{ kind: 'publish', name: core, version: '0.5.0' }]],
      })
    );
  });
});

describe('sha256Integrity', () => {
  it('uses the publish plan format', () => {
    assert.equal(
      sha256Integrity(Buffer.from('')),
      'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='
    );
  });
});

describe('checkProvenance', () => {
  const expected = {
    name: core,
    version: '0.5.0',
    sha512Hex: 'aa11',
    repository: 'https://github.com/Maku4/react-overlay-manager',
    workflowPath: '.github/workflows/release.yml',
  };
  const statement = (overrides = {}) => ({
    predicateType: SLSA_PROVENANCE,
    subject: [
      {
        name: 'pkg:npm/%40react-overlay-manager/core@0.5.0',
        digest: { sha512: 'aa11' },
      },
    ],
    predicate: {
      buildDefinition: {
        externalParameters: {
          workflow: {
            repository: expected.repository,
            path: expected.workflowPath,
          },
        },
      },
    },
    ...overrides,
  });

  it('accepts provenance from the release workflow', () => {
    assert.deepEqual(checkProvenance([statement()], expected), []);
  });

  it('requires SLSA provenance', () => {
    assert.match(
      checkProvenance([statement({ predicateType: 'other' })], expected)[0],
      /no SLSA provenance/
    );
    assert.match(checkProvenance([], expected)[0], /no SLSA provenance/);
  });

  it('rejects a release workflow run from another branch', () => {
    const fromBranch = statement();
    fromBranch.predicate.buildDefinition.externalParameters.workflow.ref =
      'refs/heads/feature';
    const release = { ...expected, workflowRef: 'refs/heads/main' };
    assert.match(
      checkProvenance([fromBranch], release)[0],
      /ran on refs\/heads\/feature, expected refs\/heads\/main/
    );
    const fromMain = statement();
    fromMain.predicate.buildDefinition.externalParameters.workflow.ref =
      'refs/heads/main';
    assert.deepEqual(checkProvenance([fromMain], release), []);
  });

  it('rejects a different tarball, repository or workflow', () => {
    assert.match(
      checkProvenance([statement()], { ...expected, sha512Hex: 'bb22' })[0],
      /subject does not match/
    );
    assert.match(
      checkProvenance([statement()], {
        ...expected,
        repository: 'https://github.com/someone/fork',
      })[0],
      /repository is/
    );
    assert.match(
      checkProvenance([statement()], {
        ...expected,
        workflowPath: '.github/workflows/other.yml',
      })[0],
      /workflow is/
    );
  });

  for (const caseName of ['different', 'missing'])
    it(`rejects a ${caseName} source commit in provenance`, () => {
      const sourceCommit = 'a'.repeat(40);
      const withCommit = (commit) => {
        const value = statement();
        value.predicate.buildDefinition.resolvedDependencies = [
          {
            uri: `git+${expected.repository}@refs/heads/main`,
            digest: { gitCommit: commit },
          },
        ];
        return value;
      };
      const release = { ...expected, sourceCommit };
      assert.deepEqual(
        checkProvenance([withCommit(sourceCommit)], release),
        []
      );
      const invalid =
        caseName === 'different' ? withCommit('b'.repeat(40)) : statement();
      assert.ok(
        checkProvenance([invalid], release).length > 0,
        `${caseName} source commit must fail even with a matching tarball and workflow`
      );
    });
});

describe('retryPropagation', () => {
  const run = (results, attempts = 3) => {
    const sleeps = [];
    let calls = 0;
    const promise = retryPropagation(
      async () => {
        const result = results[Math.min(calls++, results.length - 1)];
        if (result instanceof Error) throw result;
        return result;
      },
      { attempts, delayMs: 5, sleep: async (ms) => sleeps.push(ms) }
    );
    return { promise, sleeps, calls: () => calls };
  };
  const ok = { value: 'done', pending: [], problems: [] };
  const missing = Object.assign(new Error('E404'), { kind: 'missing' });

  it('waits for pending propagation, then returns', async () => {
    const { promise, sleeps } = run([
      { pending: ['latest is old'], problems: [] },
      missing,
      ok,
    ]);
    assert.equal(await promise, 'done');
    assert.deepEqual(sleeps, [5, 5]);
  });

  it('fails when propagation does not finish within the bound', async () => {
    const { promise, calls } = run([missing], 3);
    await assert.rejects(promise, /Still not visible after 3 attempts/);
    assert.equal(calls(), 3);
  });

  it('fails immediately on authentication and network errors', async () => {
    for (const kind of ['auth', 'network', 'unknown']) {
      const error = Object.assign(new Error(kind), { kind });
      const { promise, sleeps, calls } = run([error, ok]);
      await assert.rejects(promise, new RegExp(kind));
      assert.equal(calls(), 1);
      assert.deepEqual(sleeps, []);
    }
  });

  it('fails immediately on problems that waiting cannot fix', async () => {
    const { promise, calls } = run([
      { pending: [], problems: ['peer excludes 0.5.0'] },
      ok,
    ]);
    await assert.rejects(promise, /peer excludes 0.5.0/);
    assert.equal(calls(), 1);
  });
});
