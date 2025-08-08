#!/usr/bin/env node
/* eslint-env node */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
const out = path.join(distDir, 'index.test-d.ts');
const content = "import '../types-tests/index.test-d';\n";
fs.writeFileSync(out, content, 'utf8');
console.log('Generated', out);
