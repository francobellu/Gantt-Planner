#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const pkgPath = path.join(repoRoot, 'package.json');

const bumpType = process.argv[2] || 'patch';
const titleArg = process.argv[3];
const featuresArg = process.argv[4];

const ALLOWED_BUMPS = new Set(['patch', 'minor', 'major']);
if (!ALLOWED_BUMPS.has(bumpType)) {
  console.error(`❌ Tipo de bump inválido: '${bumpType}'. Usa 'patch', 'minor' o 'major'.`);
  process.exit(1);
}

const runGit = (args, opts = {}) =>
  execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    ...opts,
  });

const currentBranch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
if (currentBranch !== 'main') {
  console.error(
    `❌ Publicación cancelada: la rama actual es '${currentBranch}'. Cambia a 'main' antes de publicar.`
  );
  process.exit(1);
}

const getDirtyLines = () =>
  runGit(['status', '--porcelain'])
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

const hasOriginMain = () => {
  try {
    runGit(['rev-parse', '--verify', 'origin/main'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const originMainExists = hasOriginMain();
const initialDirty = getDirtyLines();
const initialAhead = originMainExists
  ? Number(runGit(['rev-list', '--count', 'origin/main..HEAD']).trim()) || 0
  : 0;

if (initialDirty.length === 0 && initialAhead === 0) {
  console.log('Nada que publicar: el árbol está limpio y sincronizado con origin/main.');
  process.exit(0);
}

const readLocalVersion = () => {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg.version || '';
};

const readRemoteVersion = () => {
  if (!originMainExists) return null;
  try {
    const raw = runGit(['show', 'origin/main:package.json']);
    const pkg = JSON.parse(raw);
    return pkg.version || '';
  } catch {
    return null;
  }
};

const localVersion = readLocalVersion();
const remoteVersion = readRemoteVersion();

if (remoteVersion === null || localVersion === remoteVersion) {
  const bumpArgs = [path.join(repoRoot, 'scripts', 'bump-version.mjs'), bumpType];
  if (titleArg !== undefined) bumpArgs.push(titleArg);
  if (featuresArg !== undefined) bumpArgs.push(featuresArg);
  execFileSync('node', bumpArgs, { cwd: repoRoot, stdio: 'inherit' });
} else {
  console.log(
    `ℹ️ Versión local (${localVersion}) ya incrementada respecto a origin/main (${remoteVersion}); se omite bump.`
  );
}

const finalVersion = readLocalVersion();

console.log(`\n▶ Ejecutando tests para v${finalVersion}...`);
execFileSync('npm', ['test'], { cwd: repoRoot, stdio: 'inherit' });

console.log(`\n▶ Ejecutando build de producción para v${finalVersion}...`);
execFileSync('npm', ['run', 'build'], { cwd: repoRoot, stdio: 'inherit' });

const dirtyAfterChecks = getDirtyLines();
if (dirtyAfterChecks.length > 0) {
  const commitTitle = (titleArg && titleArg.trim()) || `Actualización v${finalVersion}`;
  const commitMsg = `v${finalVersion}: ${commitTitle}`;
  console.log(`\n▶ Creando commit '${commitMsg}'...`);
  execFileSync('git', ['add', '-A'], { cwd: repoRoot, stdio: 'inherit' });
  execFileSync('git', ['commit', '-m', commitMsg], { cwd: repoRoot, stdio: 'inherit' });
}

console.log(`\n▶ Subiendo v${finalVersion} a origin/main...`);
execFileSync('git', ['push', 'origin', 'main'], { cwd: repoRoot, stdio: 'inherit' });

const shortSha = runGit(['rev-parse', '--short', 'HEAD']).trim();
console.log(`\nPublicado v${finalVersion} (${shortSha}) en origin/main`);
