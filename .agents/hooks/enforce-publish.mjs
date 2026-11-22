#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NO_PUBLISH_INTENT_RE =
  /\b(no\s+publi(?:ques|car)|sin\s+publicar|no\s+hagas\s+push|don'?t\s+publish|no\s+push|skip\s+publish)\b/i;

const allowStop = () => {
  process.stdout.write('{}\n');
  process.exit(0);
};

const readStdin = () => {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
};

try {
  if (process.env.SKIP_AUTO_PUBLISH === '1') {
    allowStop();
  }

  const rawInput = readStdin();
  let payload = {};
  if (rawInput && rawInput.trim()) {
    try {
      payload = JSON.parse(rawInput);
    } catch {
      payload = {};
    }
  }

  if (payload.terminationReason && payload.terminationReason !== 'NO_TOOL_CALL') {
    allowStop();
  }
  if (payload.fullyIdle === false) {
    allowStop();
  }
  if (typeof payload.lastUserInput === 'string' && NO_PUBLISH_INTENT_RE.test(payload.lastUserInput)) {
    allowStop();
  }

  const repoRoot = payload.cwd || path.resolve(__dirname, '../..');

  const runGit = (args) =>
    execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

  let branch = '';
  try {
    branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  } catch {
    allowStop();
  }

  if (branch !== 'main') {
    allowStop();
  }

  const dirtyLines = runGit(['status', '--porcelain'])
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => {
      if (!line) return false;
      const filePart = line.slice(3).trim();
      return !filePart.includes('tests/tmp_') && !filePart.includes('.tmp-');
    });

  let aheadCount = 0;
  try {
    runGit(['rev-parse', '--verify', 'origin/main']);
    aheadCount = Number(runGit(['rev-list', '--count', 'origin/main..HEAD']).trim()) || 0;
  } catch {
    aheadCount = 0;
  }

  if (dirtyLines.length === 0 && aheadCount === 0) {
    allowStop();
  }

  let headSha = 'UNBORN';
  try {
    headSha = runGit(['rev-parse', 'HEAD']).trim();
  } catch {
    headSha = 'UNBORN';
  }

  const signature = crypto
    .createHash('sha1')
    .update(`${repoRoot}|${headSha}|${dirtyLines.join('\n')}`)
    .digest('hex');

  const stateFile =
    process.env.ENFORCE_PUBLISH_STATE_FILE ||
    path.join(os.tmpdir(), 'gantt-planner-stop-publish-guard.json');

  const now = Date.now();
  const ONE_HOUR_MS = 60 * 60 * 1000;
  let stateMap = {};
  try {
    if (fs.existsSync(stateFile)) {
      const parsed = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed)) {
          if (v && typeof v === 'object' && typeof v.updatedAt === 'number' && now - v.updatedAt < ONE_HOUR_MS) {
            stateMap[k] = v;
          }
        }
      }
    }
  } catch {
    stateMap = {};
  }

  const guardKey = `${payload.conversationId || 'default'}:${signature}`;
  const currentEntry = stateMap[guardKey];
  const currentCount = currentEntry && typeof currentEntry.count === 'number' ? currentEntry.count : 0;

  if (currentCount >= 2) {
    allowStop();
  }

  stateMap[guardKey] = {
    count: currentCount + 1,
    updatedAt: now,
  };
  try {
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    fs.writeFileSync(stateFile, JSON.stringify(stateMap, null, 2), 'utf8');
  } catch {
    // Non-fatal if guard file cannot be written
  }

  const summaryParts = [];
  if (dirtyLines.length > 0) {
    summaryParts.push(`${dirtyLines.length} archivo(s) modificados`);
  }
  if (aheadCount > 0) {
    summaryParts.push(`${aheadCount} commit(s) pendientes de push`);
  }
  const summary = summaryParts.join(', ');

  const output = {
    decision: 'continue',
    reason:
      `AUTO-PUBLISH GATE (.agents/hooks/enforce-publish.mjs): Hay cambios locales o commits pendientes de publicar en 'main' (${summary}). ` +
      `Antes de finalizar tu respuesta, ejecuta el comando determinístico \`node scripts/publish.mjs patch "<Título breve en español>" "<Descripción clara>"\` ` +
      `(o \`minor\`/\`major\` según corresponda) para incrementar versión, pasar tests/build, hacer commit y subir a origin/main.`,
  };

  process.stdout.write(JSON.stringify(output) + '\n');
} catch {
  process.stdout.write('{}\n');
}
