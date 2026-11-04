import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.resolve(__dirname, '../package.json');
const typesPath = path.resolve(__dirname, '../src/types/gantt.ts');
const testPath = path.resolve(__dirname, '../tests/ganttEngine.test.mjs');

const bumpType = process.argv[2] || 'patch'; // 'patch' | 'minor' | 'major'

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version || '1.0.0';
const parts = currentVersion.split('.').map(Number);

if (bumpType === 'major') {
  parts[0] += 1;
  parts[1] = 0;
  parts[2] = 0;
} else if (bumpType === 'minor') {
  parts[1] += 1;
  parts[2] = 0;
} else {
  // patch
  parts[2] += 1;
}

const newVersion = parts.join('.');
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// Update src/types/gantt.ts
let typesContent = fs.readFileSync(typesPath, 'utf8');
typesContent = typesContent.replace(
  /export const APP_VERSION = '[^']+';/,
  `export const APP_VERSION = '${newVersion}';`
);
fs.writeFileSync(typesPath, typesContent, 'utf8');

// Update tests/ganttEngine.test.mjs
if (fs.existsSync(testPath)) {
  let testContent = fs.readFileSync(testPath, 'utf8');
  testContent = testContent
    .replaceAll(`'${currentVersion}'`, `'${newVersion}'`)
    .replaceAll(`v${currentVersion}`, `v${newVersion}`);
  fs.writeFileSync(testPath, testContent, 'utf8');
}

console.log(`Version bumped from ${currentVersion} to ${newVersion} across package.json, src/types/gantt.ts, and tests`);
