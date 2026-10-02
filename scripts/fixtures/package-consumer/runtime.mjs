import assert from 'node:assert/strict';
import process from 'node:process';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToString } from 'react-dom/server';
import * as esm from '@react-overlay-manager/core';
import * as devtoolsEsm from '@react-overlay-manager/devtools';

const require = createRequire(import.meta.url);
const cjs = require('@react-overlay-manager/core');
const devtoolsCjs = require('@react-overlay-manager/devtools');
const expectedVersion = process.env.EXPECTED_CORE_VERSION;
const exports = [
  'createOverlayManager',
  'defineOverlay',
  'OverlayManager',
  'OverlayManagerCore',
  'useOverlayStore',
  'overlays',
  'getOverlayName',
  'getInstanceOverlayName',
  'OverlayAlreadyOpenError',
  'OverlayNotFoundError',
  'version',
];

for (const core of [esm, cjs]) {
  assert.equal(core.version, expectedVersion);
  for (const name of exports) assert.ok(name in core, `Missing export ${name}`);
  const Dialog = core.defineOverlay(() => React.createElement('div'));
  const manager = core.createOverlayManager({ dialog: Dialog });
  manager.open('dialog');
  assert.equal(
    renderToString(React.createElement(core.OverlayManager, { manager })),
    ''
  );
}
assert.deepEqual(Object.keys(esm).sort(), Object.keys(cjs).sort());

for (const devtools of [devtoolsEsm, devtoolsCjs]) {
  const html = renderToString(
    React.createElement(devtools.OverlayManagerDevtools, {
      manager: esm.createOverlayManager(),
    })
  );
  if (process.env.NODE_ENV === 'production') assert.equal(html, '');
  else assert.match(html, /Open Overlay Manager DevTools/);
}
