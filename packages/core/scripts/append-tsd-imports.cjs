#!/usr/bin/env node
/* eslint-env node */
/* global __dirname, process */
const fs = require('fs');
const path = require('path');

const distIndex = path.join(__dirname, '..', 'dist', 'index.test-d.ts');
if (!fs.existsSync(distIndex)) process.exit(0);

const needed = [
  './overlay-manager-props.test-d',
  './events-and-default-manager.test-d',
  './ids-and-openoptions.test-d',
  './any-instance-narrowing.test-d',
];

let src = fs.readFileSync(distIndex, 'utf8');
const lines = src.trim().split(/\n/g);
const has = (n) => lines.some((l) => l.includes(n));
const toAdd = needed.filter((n) => !has(n));
if (toAdd.length) {
  const additions = toAdd.map((n) => `import '${n}';`).join('\n');
  src = src.replace(/\s*$/, '\n' + additions + '\n');
  fs.writeFileSync(distIndex, src, 'utf8');
}
