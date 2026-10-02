import assert from 'node:assert/strict';
import console from 'node:console';
import process from 'node:process';
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
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(join(tmpdir(), 'overlay-packages-'));
const failures = [];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

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
    throw new Error(
      `${executable} ${args.join(' ')} failed\n${String(error.stdout ?? '') + String(error.stderr ?? '')}`
    );
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

function latest(packageName, major) {
  const versions = JSON.parse(
    command(
      npm,
      ['view', `${packageName}@${major}`, 'version', '--json'],
      temporary
    )
  );
  return Array.isArray(versions) ? versions.at(-1) : versions;
}

try {
  console.log(`Packed consumer verification on Node ${process.version}`);
  const tarballs = {};
  for (const name of ['core', 'devtools']) {
    const destination = join(temporary, name);
    await mkdir(destination);
    command(
      pnpm,
      ['pack', '--pack-destination', destination],
      join(repository, 'packages', name)
    );
    const files = await readdir(destination);
    const tarball = files.find((file) => file.endsWith('.tgz'));
    assert.ok(tarball, `No ${name} tarball created`);
    tarballs[name] = join(destination, tarball);
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

  const coreManifest = JSON.parse(
    await readFile(join(repository, 'packages/core/package.json'), 'utf8')
  );
  const workspaceRequire = createRequire(join(repository, 'package.json'));
  const compilerVersion = workspaceRequire('typescript/package.json').version;
  const esbuildVersion = JSON.parse(
    command(npm, ['view', 'esbuild', 'version', '--json'], temporary)
  );

  for (const major of [18, 19]) {
    const consumer = join(temporary, `react-${major}`);
    await cp(join(repository, 'scripts/fixtures/package-consumer'), consumer, {
      recursive: true,
    });
    const reactVersion = latest('react', major);
    const domVersion = latest('react-dom', major);
    const reactTypesVersion = latest('@types/react', major);
    const domTypesVersion = latest('@types/react-dom', major);
    await writeFile(
      join(consumer, 'package.json'),
      JSON.stringify(
        {
          private: true,
          type: 'module',
          dependencies: {
            '@react-overlay-manager/core': `file:${tarballs.core}`,
            '@react-overlay-manager/devtools': `file:${tarballs.devtools}`,
            react: reactVersion,
            'react-dom': domVersion,
          },
          devDependencies: {
            '@types/react': reactTypesVersion,
            '@types/react-dom': domTypesVersion,
            typescript: compilerVersion,
            esbuild: esbuildVersion,
          },
        },
        null,
        2
      )
    );

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
          ],
          consumer
        );
        command(npm, ['ls', '--omit=dev'], consumer);
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
            EXPECTED_CORE_VERSION: coreManifest.version,
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
  console.log('All packed package consumer contracts passed.');
}
