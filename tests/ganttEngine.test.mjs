import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Bundle ganttEngine.ts in-memory using esbuild so we test the exact TypeScript source
const bundle = await build({
  entryPoints: [path.resolve(__dirname, '../src/utils/ganttEngine.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
});

const codeUrl = `data:text/javascript;base64,${Buffer.from(
  bundle.outputFiles[0].text
).toString('base64')}`;

const {
  calculateEndDateFromDuration,
  calculateDurationFromDates,
  wouldCreateCycle,
  getEarliestStartFromPredecessors,
  cascadeDependencies,
  computeGanttMetrics,
  getProjectTemplates,
  formatDateISO,
} = await import(codeUrl);

test('calculateEndDateFromDuration & calculateDurationFromDates handle tasks and milestones', () => {
  // 1-day task starts and ends on the same calendar day
  assert.equal(calculateEndDateFromDuration('2026-10-28', 1, 'task'), '2026-10-28');
  // 5-day task starting Oct 28 ends Nov 1
  assert.equal(calculateEndDateFromDuration('2026-10-28', 5, 'task'), '2026-11-01');
  // Milestone always has 0 duration and same endDate as startDate
  assert.equal(calculateEndDateFromDuration('2026-10-28', 0, 'milestone'), '2026-10-28');
  assert.equal(calculateDurationFromDates('2026-10-28', '2026-11-01', 'task'), 5);
  assert.equal(calculateDurationFromDates('2026-10-28', '2026-10-28', 'milestone'), 0);
  // Boundary: endDate earlier than startDate clamps to minimum 1 day for task
  assert.equal(calculateDurationFromDates('2026-10-28', '2026-10-20', 'task'), 1);
});

test('wouldCreateCycle detects direct and transitive cycles in dependency graph', () => {
  const items = [
    { id: 'A', dependencies: [] },
    { id: 'B', dependencies: ['A'] },
    { id: 'C', dependencies: ['B'] },
  ];

  // Self-dependency
  assert.equal(wouldCreateCycle(items, 'A', 'A'), true);
  // Direct 2-node cycle (A depending on B when B depends on A)
  assert.equal(wouldCreateCycle(items, 'A', 'B'), true);
  // Transitive 3-node cycle (A depending on C when C -> B -> A)
  assert.equal(wouldCreateCycle(items, 'A', 'C'), true);
  // Valid dependency (C depending on A)
  assert.equal(wouldCreateCycle(items, 'C', 'A'), false);
});

test('getEarliestStartFromPredecessors supports FS, SS, FF, SF and milestones', () => {
  const predTask = {
    id: 't1',
    name: 'Task 1',
    type: 'task',
    startDate: '2026-10-10',
    endDate: '2026-10-14',
    duration: 5,
    slack: 0,
    dependencies: [],
    progress: 0,
    color: 'indigo',
  };
  const predMilestone = {
    id: 'm1',
    name: 'Milestone 1',
    type: 'milestone',
    startDate: '2026-10-14',
    endDate: '2026-10-14',
    duration: 0,
    slack: 0,
    dependencies: [],
    progress: 0,
    color: 'amber',
  };
  const map = new Map([
    ['t1', predTask],
    ['m1', predMilestone],
  ]);

  // FS after task ending Oct 14 -> Oct 15
  const fsItem = {
    ...predTask,
    id: 't2',
    duration: 3,
    dependencies: ['t1'],
    dependencyTypes: { t1: 'FS' },
  };
  assert.equal(formatDateISO(getEarliestStartFromPredecessors(fsItem, map)), '2026-10-15');

  // FS after milestone on Oct 14 -> Oct 15
  const fsAfterMilestone = {
    ...predTask,
    id: 't3',
    duration: 3,
    dependencies: ['m1'],
  };
  assert.equal(
    formatDateISO(getEarliestStartFromPredecessors(fsAfterMilestone, map)),
    '2026-10-15'
  );

  // SS with task starting Oct 10 -> Oct 10
  const ssItem = {
    ...predTask,
    id: 't4',
    duration: 3,
    dependencies: ['t1'],
    dependencyTypes: { t1: 'SS' },
  };
  assert.equal(formatDateISO(getEarliestStartFromPredecessors(ssItem, map)), '2026-10-10');

  // FF with task ending Oct 14, duration 3 -> starts Oct 12 so it finishes Oct 14
  const ffItem = {
    ...predTask,
    id: 't5',
    duration: 3,
    dependencies: ['t1'],
    dependencyTypes: { t1: 'FF' },
  };
  assert.equal(formatDateISO(getEarliestStartFromPredecessors(ffItem, map)), '2026-10-12');
});

test('cascadeDependencies propagates dates forward along dependency chain', () => {
  const raw = [
    {
      id: '1',
      name: 'Fase 1',
      type: 'task',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      duration: 5,
      slack: 0,
      dependencies: [],
      progress: 0,
      color: 'indigo',
    },
    {
      id: '2',
      name: 'Fase 2 (overlapping)',
      type: 'task',
      startDate: '2026-10-02',
      endDate: '2026-10-04',
      duration: 3,
      slack: 2,
      dependencies: ['1'],
      progress: 0,
      color: 'blue',
    },
    {
      id: '3',
      name: 'Hito Final',
      type: 'milestone',
      startDate: '2026-10-03',
      endDate: '2026-10-03',
      duration: 0,
      slack: 0,
      dependencies: ['2'],
      progress: 0,
      color: 'amber',
    },
  ];

  const cascaded = cascadeDependencies(raw);
  assert.equal(cascaded[1].startDate, '2026-10-06');
  assert.equal(cascaded[1].endDate, '2026-10-08');
  assert.equal(cascaded[2].startDate, '2026-10-09');
  assert.equal(cascaded[2].endDate, '2026-10-09');
});

test('computeGanttMetrics computes slackEndDate, critical path, and conflicts', () => {
  assert.deepEqual(computeGanttMetrics([]), []);

  const items = [
    {
      id: 'A',
      name: 'Critical Task A',
      type: 'task',
      startDate: '2026-10-01',
      endDate: '2026-10-04',
      duration: 4,
      slack: 0,
      dependencies: [],
      progress: 100,
      color: 'indigo',
    },
    {
      id: 'B',
      name: 'Non-Critical Task B with Slack',
      type: 'task',
      startDate: '2026-10-01',
      endDate: '2026-10-02',
      duration: 2,
      slack: 2,
      dependencies: [],
      progress: 50,
      color: 'emerald',
    },
    {
      id: 'C',
      name: 'Critical Task C',
      type: 'task',
      startDate: '2026-10-05',
      endDate: '2026-10-08',
      duration: 4,
      slack: 0,
      dependencies: ['A', 'B'],
      progress: 0,
      color: 'rose',
    },
  ];

  const computed = computeGanttMetrics(items);
  assert.equal(computed[0].isCritical, true);
  assert.equal(computed[0].cpmTotalFloat, 0);

  assert.equal(computed[1].isCritical, false);
  assert.equal(computed[1].slack, 2);
  assert.equal(computed[1].slackEndDate, '2026-10-04');
  assert.equal(computed[1].cpmTotalFloat, 2);

  assert.equal(computed[2].isCritical, true);
  assert.equal(computed[2].hasConflict, false);
});

test('getProjectTemplates returns valid conflict-free templates with tasks, slack, and milestones', () => {
  const templates = getProjectTemplates();
  assert.ok(templates.length >= 3);
  for (const tpl of templates) {
    const metrics = computeGanttMetrics(tpl.items);
    assert.ok(metrics.length > 0);
    assert.ok(metrics.some((m) => m.type === 'milestone'));
    assert.ok(metrics.some((m) => m.slack > 0));
    for (const m of metrics) {
      assert.equal(
        m.hasConflict,
        false,
        `Template ${tpl.id} item ${m.id} should not have schedule conflict`
      );
    }
  }

  // Verify SaaS Launch critical path chain (t-1 -> t-3 -> m-1 -> t-4 -> t-7 -> m-2)
  const saasMetrics = computeGanttMetrics(templates[0].items);
  const criticalIds = saasMetrics.filter((m) => m.isCritical).map((m) => m.id);
  assert.deepEqual(criticalIds, ['t-1', 't-3', 'm-1', 't-4', 't-7', 'm-2']);
});
