import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.resolve(__dirname, '../package.json');
const typesPath = path.resolve(__dirname, '../src/types/gantt.ts');
const testPath = path.resolve(__dirname, '../tests/ganttEngine.test.mjs');
const releaseNotesPath = path.resolve(__dirname, '../src/data/releaseNotes.ts');

const bumpType = process.argv[2] || 'patch'; // 'patch' | 'minor' | 'major'
const titleArg = process.argv[3];
const featuresArg = process.argv[4];

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

// Compile and update src/data/releaseNotes.ts
if (fs.existsSync(releaseNotesPath)) {
  let notesContent = fs.readFileSync(releaseNotesPath, 'utf8');
  // Remove existing isLatest: true flags
  notesContent = notesContent.replace(/    isLatest: true,\n/g, '');

  if (!notesContent.includes(`version: '${newVersion}'`)) {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    const formattedDate = `${day} ${month} ${year}`;

    const featuresList = featuresArg
      ? featuresArg.split(';').map((f) => `      '${f.trim().replace(/'/g, "\\'")}',`).join('\n')
      : `      'Actualización y mejoras del sistema en la versión ${newVersion}.',`;

    const titleText = (titleArg || `Actualización v${newVersion}`).replace(/'/g, "\\'");

    const newEntry = `  {
    version: '${newVersion}',
    date: '${formattedDate}',
    title: '${titleText}',
    isLatest: true,
    features: [
${featuresList}
    ],
  },\n`;

    const insertAnchor = 'export const RELEASE_NOTES: ReleaseNoteEntry[] = [\n';
    if (notesContent.includes(insertAnchor)) {
      notesContent = notesContent.replace(insertAnchor, `${insertAnchor}${newEntry}`);
    }
  }

  fs.writeFileSync(releaseNotesPath, notesContent, 'utf8');
}

console.log(`Version bumped from ${currentVersion} to ${newVersion} across package.json, src/types/gantt.ts, tests, and releaseNotes.ts`);
