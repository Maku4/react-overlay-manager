import assert from 'node:assert/strict';
import console from 'node:console';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkProvenance,
  checkRegistryVersion,
  classifyNpmFailure,
  PACKAGES,
  parseVerifierArgs,
  PUBLIC_REGISTRY,
  readPublishPlan,
  retryPropagation,
  sha256Integrity,
  sha512Integrity,
} from './lib/release-checks.mjs';

// Default: pack the local workspace. With --published, download the exact
// versions from public npm instead. See .github/RELEASING.md.
const options = parseVerifierArgs(process.argv.slice(2));
const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(join(tmpdir(), 'overlay-packages-'));
const failures = [];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const registryArgs = options.published
  ? [`--registry=${PUBLIC_REGISTRY}`, '--prefer-online']
  : [];

function command(executable, args, cwd, env = {}) {
  try {
    return execFileSync(executable, args, {
      cwd,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
      timeout: 180_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const failure = new Error(
      `${executable} ${args.join(' ')} failed\n${String(error.stdout ?? '') + String(error.stderr ?? '')}`
    );
    failure.kind = classifyNpmFailure(failure.message);
    throw failure;
  }
}

async function check(label, action) {
  try {
    await action();
    console.log(`PASS ${label}`);
    return true;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    failures.push(label);
    console.error(`FAIL ${label}\n${detail.slice(0, 4000)}`);
    return false;
  }
}

// Consumers install without a lockfile, so every package they pull in is
// pinned to an exact version. Overrides cover the transitive dependencies.
const esbuildVersion = '0.28.2';
const consumers = {
  18: {
    react: '18.3.1',
    'react-dom': '18.3.1',
    '@types/react': '18.3.31',
    '@types/react-dom': '18.3.7',
    overrides: {
      scheduler: '0.23.2',
      'loose-envify': '1.4.0',
      'js-tokens': '4.0.0',
      csstype: '3.2.3',
      '@types/prop-types': '15.7.15',
    },
  },
  19: {
    react: '19.3.0',
    'react-dom': '19.3.0',
    '@types/react': '19.3.0',
    '@types/react-dom': '19.3.0',
    overrides: {
      scheduler: '0.28.0',
      csstype: '3.2.3',
    },
  },
};

function installedVersions(tree, found = new Map()) {
  for (const [name, node] of Object.entries(tree.dependencies ?? {})) {
    // Optional packages for other platforms are listed without a version.
    // A missing required package already makes `npm ls` fail.
    if (!node.version) continue;
    if (!found.has(name)) found.set(name, new Set());
    found.get(name).add(node.version);
    installedVersions(node, found);
  }
  return found;
}

const readManifest = async (name) =>
  JSON.parse(
    await readFile(join(repository, `packages/${name}/package.json`), 'utf8')
  );
const coreManifest = await readManifest('core');
const devtoolsManifest = await readManifest('devtools');
// Released manifests define the expected versions unless given explicitly
const versions = {
  core: options.versions.core ?? coreManifest.version,
  devtools: options.versions.devtools ?? devtoolsManifest.version,
};
// owner/repo URL that release provenance must name
const sourceRepository = coreManifest.repository.url
  .replace(/^git\+/, '')
  .replace(/\.git$/, '');
const plan = options.packDir
  ? readPublishPlan(
      JSON.parse(
        await readFile(join(options.packDir, 'publish-plan.json'), 'utf8')
      )
    )
  : new Map();
const retry = { attempts: options.attempts, delayMs: options.delayMs, sleep };

async function fetchAttestations(url) {
  let response;
  try {
    response = await globalThis.fetch(url);
  } catch (error) {
    throw Object.assign(new Error(`${url}: ${error.message}`), {
      kind: 'network',
    });
  }
  if (response.status === 404) {
    throw Object.assign(new Error(`${url}: not found yet`), {
      kind: 'missing',
    });
  }
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const body = await response.json();
  return body.attestations.map((attestation) =>
    JSON.parse(
      Buffer.from(attestation.bundle.dsseEnvelope.payload, 'base64').toString()
    )
  );
}

// Downloads one exact version from public npm and checks it against the
// registry metadata, the release artifact and its provenance
async function downloadPublished(name, destination) {
  const packageName = PACKAGES[name];
  const version = versions[name];
  const id = `${packageName}@${version}`;
  const peers = {
    react: Object.values(consumers).map((consumer) => consumer.react),
    'react-dom': Object.values(consumers).map(
      (consumer) => consumer['react-dom']
    ),
  };
  if (name === 'devtools') peers[PACKAGES.core] = versions.core;
  const meta = await retryPropagation(async () => {
    const value = JSON.parse(
      command(npm, ['view', id, '--json', ...registryArgs], temporary)
    );
    return {
      value,
      ...checkRegistryVersion(value, {
        name: packageName,
        version,
        distTag: options.distTag === 'none' ? undefined : options.distTag,
        peers,
      }),
    };
  }, retry);
  for (const [peer, range] of Object.entries(meta.peerDependencies ?? {})) {
    console.log(`${id} peer ${peer} ${range}`);
  }
  console.log(`${id} dist-tags ${JSON.stringify(meta['dist-tags'])}`);

  const packed = await retryPropagation(async () => {
    const value = JSON.parse(
      command(
        npm,
        ['pack', id, '--pack-destination', destination, '--json'].concat(
          registryArgs
        ),
        temporary
      )
    );
    return { value, pending: [], problems: [] };
  }, retry);
  const tarball = join(destination, packed[0].filename);
  const contents = await readFile(tarball);
  assert.equal(
    sha512Integrity(contents),
    meta.dist.integrity,
    `${id} download does not match the registry integrity`
  );

  const released = plan.get(packageName);
  if (options.packDir && !released) {
    console.log(`${id} was not published by this release`);
  }
  if (released) {
    assert.equal(released.version, version, `${id} differs from the plan`);
    const artifact = await readFile(join(options.packDir, released.tarball));
    assert.equal(
      sha256Integrity(artifact),
      released.integrity,
      `${id} release artifact does not match its publish plan`
    );
    assert.equal(
      sha256Integrity(contents),
      released.integrity,
      `${id} on npm is not the tarball the release packed`
    );
    const statements = await retryPropagation(async () => {
      const url = meta.dist.attestations?.url;
      if (!url) {
        return { pending: [`${id}: no attestations yet`], problems: [] };
      }
      return { value: await fetchAttestations(url), pending: [], problems: [] };
    }, retry);
    const problems = checkProvenance(statements, {
      name: packageName,
      version,
      sha512Hex: Buffer.from(
        meta.dist.integrity.slice('sha512-'.length),
        'base64'
      ).toString('hex'),
      repository: sourceRepository,
      workflowPath: '.github/workflows/release.yml',
    });
    assert.deepEqual(problems, [], problems.join('\n'));
  }
  return tarball;
}

let acquired = true;
try {
  console.log(
    options.published
      ? `Published package verification of core ${versions.core} and devtools ${versions.devtools} on Node ${process.version}`
      : `Packed consumer verification on Node ${process.version}`
  );
  const tarballs = {};
  for (const name of ['core', 'devtools']) {
    const destination = join(temporary, name);
    await mkdir(destination);
    if (options.published) {
      acquired =
        (await check(
          `${name} ${versions[name]} registry metadata and integrity${plan.has(PACKAGES[name]) ? ', release artifact and provenance' : ''}`,
          async () => {
            tarballs[name] = await downloadPublished(name, destination);
          }
        )) && acquired;
      if (!tarballs[name]) continue;
    } else {
      command(
        pnpm,
        ['pack', '--pack-destination', destination],
        join(repository, 'packages', name)
      );
      const files = await readdir(destination);
      const tarball = files.find((file) => file.endsWith('.tgz'));
      assert.ok(tarball, `No ${name} tarball created`);
      tarballs[name] = join(destination, tarball);
    }
    await check(`${name} tarball excludes tests and source`, () => {
      const entries = command('tar', ['-tzf', tarballs[name]], temporary).split(
        '\n'
      );
      const leaked = entries.filter((file) =>
        /(?:\/tests?\/|\/types-tests\/|\/src\/|\.(?:test|spec)(?:-d)?\.)/.test(
          file
        )
      );
      assert.deepEqual(leaked, []);
    });
  }

  const workspaceRequire = createRequire(join(repository, 'package.json'));
  const compilerVersion = workspaceRequire('typescript/package.json').version;

  // Without both tarballs there is nothing to install
  for (const major of acquired ? [18, 19] : []) {
    const consumer = join(temporary, `react-${major}`);
    await cp(join(repository, 'scripts/fixtures/package-consumer'), consumer, {
      recursive: true,
    });
    const {
      react: reactVersion,
      'react-dom': domVersion,
      '@types/react': reactTypesVersion,
      '@types/react-dom': domTypesVersion,
      overrides,
    } = consumers[major];
    await writeFile(
      join(consumer, 'package.json'),
      JSON.stringify(
        {
          private: true,
          type: 'module',
          dependencies: {
            // Published mode installs the exact versions from npm itself
            '@react-overlay-manager/core': options.published
              ? versions.core
              : `file:${tarballs.core}`,
            '@react-overlay-manager/devtools': options.published
              ? versions.devtools
              : `file:${tarballs.devtools}`,
            react: reactVersion,
            'react-dom': domVersion,
          },
          devDependencies: {
            '@types/react': reactTypesVersion,
            '@types/react-dom': domTypesVersion,
            typescript: compilerVersion,
            esbuild: esbuildVersion,
          },
          overrides,
        },
        null,
        2
      )
    );
    const expected = {
      '@react-overlay-manager/core': versions.core,
      '@react-overlay-manager/devtools': versions.devtools,
      react: reactVersion,
      'react-dom': domVersion,
      '@types/react': reactTypesVersion,
      '@types/react-dom': domTypesVersion,
      typescript: compilerVersion,
      esbuild: esbuildVersion,
      ...overrides,
    };

    const installed = await check(
      `React ${major} isolated install and peers`,
      () => {
        command(
          npm,
          [
            'install',
            '--ignore-scripts',
            '--no-audit',
            '--no-fund',
            '--loglevel=error',
            ...registryArgs,
          ],
          consumer
        );
        command(npm, ['ls', '--omit=dev'], consumer);
        const tree = JSON.parse(
          command(npm, ['ls', '--all', '--json'], consumer)
        );
        for (const [name, found] of installedVersions(tree)) {
          // esbuild pins its platform binary packages to its own version
          const pinned = name.startsWith('@esbuild/')
            ? esbuildVersion
            : expected[name];
          assert.ok(pinned, `${name} is installed but not pinned`);
          assert.deepEqual([...found], [pinned], `${name} version`);
        }
        // Verifies registry signatures and provenance attestations
        if (options.published) {
          command(
            npm,
            ['audit', 'signatures', `--registry=${PUBLIC_REGISTRY}`],
            consumer
          );
        }
      }
    );
    if (!installed) continue;
    console.log(
      `React ${major} consumer uses react ${reactVersion}, react-dom ${domVersion}, @types/react ${reactTypesVersion}, @types/react-dom ${domTypesVersion}, TypeScript ${compilerVersion}, esbuild ${esbuildVersion}`
    );
    for (const environment of ['development', 'production']) {
      await check(
        `React ${major} ${environment} ESM/CJS exports, version and SSR`,
        () => {
          command(process.execPath, ['runtime.mjs'], consumer, {
            NODE_ENV: environment,
            EXPECTED_CORE_VERSION: versions.core,
          });
        }
      );
    }

    const require = createRequire(join(consumer, 'package.json'));
    await check(`React ${major} NodeNext .mts/.cts consumer types`, () => {
      command(
        process.execPath,
        [
          require.resolve('typescript/bin/tsc'),
          '--noEmit',
          '--strict',
          '--module',
          'NodeNext',
          '--moduleResolution',
          'NodeNext',
          '--target',
          'ES2022',
          'types.mts',
          'types.cts',
        ],
        consumer
      );
    });
    for (const name of ['core', 'devtools']) {
      await check(
        `React ${major} ${name} conditional ESM/CJS declarations`,
        () => {
          const ts = require('typescript');
          for (const [extension, mode] of [
            ['mts', ts.ModuleKind.ESNext],
            ['cts', ts.ModuleKind.CommonJS],
          ]) {
            const resolved = ts.resolveModuleName(
              `@react-overlay-manager/${name}`,
              join(consumer, `types.${extension}`),
              {
                moduleResolution: ts.ModuleResolutionKind.NodeNext,
                module: ts.ModuleKind.NodeNext,
              },
              ts.sys,
              undefined,
              undefined,
              mode
            ).resolvedModule;
            assert.ok(
              resolved,
              `${name} declarations do not resolve for ${extension}`
            );
            assert.ok(
              extension === 'mts'
                ? /\.d\.(?:ts|mts)$/.test(resolved.resolvedFileName)
                : resolved.resolvedFileName.endsWith('.d.cts'),
              `${name} ${extension} resolves ${resolved.resolvedFileName}`
            );
          }
        }
      );
    }

    await check(
      `React ${major} package bundles keep React external`,
      async () => {
        const esbuild = require('esbuild');
        for (const name of ['core', 'devtools']) {
          const result = await esbuild.build({
            stdin: {
              contents: `export * from '@react-overlay-manager/${name}';`,
              resolveDir: consumer,
            },
            bundle: true,
            platform: 'node',
            format: 'esm',
            external:
              name === 'core'
                ? ['react', 'react-dom']
                : ['react', 'react-dom', '@react-overlay-manager/core'],
            metafile: true,
            write: false,
            treeShaking: false,
          });
          const imports = Object.values(result.metafile.outputs).flatMap(
            (output) => output.imports
          );
          assert.ok(
            imports.some((item) => item.external && item.path === 'react'),
            `${name} does not use external React`
          );
        }
      }
    );
    await check(
      `React ${major} documented production app excludes DevTools UI`,
      async () => {
        const esbuild = require('esbuild');
        const result = await esbuild.build({
          entryPoints: [join(consumer, 'production.mjs')],
          absWorkingDir: consumer,
          bundle: true,
          platform: 'browser',
          format: 'esm',
          minify: true,
          treeShaking: true,
          external: ['react', 'react-dom'],
          define: { 'process.env.NODE_ENV': '"production"' },
          write: false,
        });
        const output = result.outputFiles[0].text;
        for (const marker of [
          'Copy props JSON',
          'Close DevTools',
          'rom-panel',
          'Details:',
          'Open Overlay Manager DevTools',
        ])
          assert.ok(
            !output.includes(marker),
            `Production bundle contains ${marker}`
          );
      }
    );
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}

if (failures.length) {
  console.error(
    `${failures.length} package contracts failed: ${failures.join(', ')}`
  );
  process.exitCode = 1;
} else {
  console.log(
    options.published
      ? `All published package contracts passed for core ${versions.core} and devtools ${versions.devtools}.`
      : 'All packed package consumer contracts passed.'
  );
}
