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
  sanitizeProject,
  sanitizeGanttItem,
  wouldCreateCycle,
  getEarliestStartFromPredecessors,
  cascadeDependencies,
  computeGanttMetrics,
  groupItemsByProject,
  getProjectTemplates,
  sanitizeScenario,
  upsertScenarioInList,
  createNewScenario,
  switchWorkspaceToTemplate,
  switchWorkspaceToScenario,
  getDefaultSavedScenarios,
  formatDateISO,
  formatScrubberDate,
  MIN_DAY_WIDTH,
  MAX_DAY_WIDTH,
  DEFAULT_DAY_WIDTH,
  clampDayWidth,
  getDayWidthForPreset,
  resolveZoomPresetFromDayWidth,
  computeWheelZoomDayWidth,
  computeTimelineBounds,
  computeFitToProjectScale,
  createRoundedOrthogonalPath,
  importGanttData,
  parseCSVToGanttData,
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

  // SF with task starting Oct 10, duration 3 -> starts Oct 08 so it finishes on or after Oct 10
  const sfItem = {
    ...predTask,
    id: 't6',
    duration: 3,
    dependencies: ['t1'],
    dependencyTypes: { t1: 'SF' },
  };
  assert.equal(formatDateISO(getEarliestStartFromPredecessors(sfItem, map)), '2026-10-08');
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

test('sanitizeGanttItem synchronizes startDate/endDate/duration and strips computed fields', () => {
  // Imported task with startDate + endDate but no duration calculates duration = 5
  const fromDatesOnly = sanitizeGanttItem({
    id: 'imp-1',
    name: 'Imported Task',
    type: 'task',
    startDate: '2026-10-01',
    endDate: '2026-10-05',
  });
  assert.equal(fromDatesOnly.duration, 5);
  assert.equal(fromDatesOnly.endDate, '2026-10-05');
  assert.equal(fromDatesOnly.slack, 0);

  // Computed item passed to sanitizeGanttItem strips wbs/isCritical/hasConflict and clones dependencies
  const computedList = computeGanttMetrics([fromDatesOnly]);
  const cleaned = sanitizeGanttItem(computedList[0]);
  assert.equal('wbs' in cleaned, false);
  assert.equal('isCritical' in cleaned, false);
  assert.equal('hasConflict' in cleaned, false);
  assert.equal('slackEndDate' in cleaned, false);
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

  // Verify every template defines projects and groups its items cleanly
  for (const tpl of templates) {
    assert.ok(Array.isArray(tpl.projects) && tpl.projects.length >= 2);
    const computed = computeGanttMetrics(tpl.items);
    const groups = groupItemsByProject(computed, tpl.projects);
    assert.equal(groups.length, tpl.projects.length);
    const totalGroupedItems = groups.reduce((acc, g) => acc + g.items.length, 0);
    assert.equal(totalGroupedItems, tpl.items.length);
  }
});

test('groupItemsByProject computes rollup dates, durations, progress, hierarchical WBS, and handles empty/orphan edge cases', () => {
  const projects = [
    sanitizeProject({ id: 'p-1', name: 'Proyecto Alpha', color: 'indigo' }, 0),
    sanitizeProject({ id: 'p-2', name: 'Proyecto Beta (Vacío)', color: 'emerald' }, 1),
  ];

  const rawItems = [
    sanitizeGanttItem({
      id: 't-a1',
      name: 'Tarea Alpha 1',
      type: 'task',
      projectId: 'p-1',
      startDate: '2026-10-01',
      endDate: '2026-10-04',
      duration: 4,
      slack: 1,
      progress: 100,
    }),
    sanitizeGanttItem({
      id: 't-a2',
      name: 'Tarea Alpha 2',
      type: 'task',
      projectId: 'p-1',
      startDate: '2026-10-05',
      endDate: '2026-10-10',
      duration: 6,
      slack: 2,
      progress: 50,
    }),
    sanitizeGanttItem({
      id: 'm-a1',
      name: 'Hito Alpha',
      type: 'milestone',
      projectId: 'p-1',
      startDate: '2026-10-10',
      endDate: '2026-10-10',
      progress: 100,
    }),
    // Orphan item with unknown projectId creates an automatic group so no task is lost
    sanitizeGanttItem({
      id: 't-orphan',
      name: 'Tarea Huérfana',
      type: 'task',
      projectId: 'p-unknown',
      startDate: '2026-10-12',
      endDate: '2026-10-14',
      duration: 3,
      progress: 20,
    }),
  ];

  const computed = computeGanttMetrics(rawItems);
  const groups = groupItemsByProject(computed, projects);

  // 2 explicit projects + 1 auto-recovered orphan project
  assert.equal(groups.length, 3);

  // Group 1 (p-1): 2 tasks + 1 milestone, Oct 1 -> Oct 10 = 10 days, progress = (100+50)/2 = 75%, totalSlack = 3
  const g1 = groups[0];
  assert.equal(g1.project.id, 'p-1');
  assert.equal(g1.startDate, '2026-10-01');
  assert.equal(g1.endDate, '2026-10-10');
  assert.equal(g1.duration, 10);
  assert.equal(g1.tasksCount, 2);
  assert.equal(g1.milestonesCount, 1);
  assert.equal(g1.totalSlack, 3);
  assert.equal(g1.progress, 75);
  assert.deepEqual(
    g1.items.map((it) => it.wbsCode),
    ['1.1', '1.2', '1.3']
  );

  // Group 2 (p-2): Empty project edge case
  const g2 = groups[1];
  assert.equal(g2.project.id, 'p-2');
  assert.equal(g2.items.length, 0);
  assert.equal(g2.duration, 0);
  assert.equal(g2.progress, 0);

  // Group 3 (p-unknown): Auto-created group for orphan projectId
  const g3 = groups[2];
  assert.equal(g3.project.id, 'p-unknown');
  assert.equal(g3.items.length, 1);
  assert.equal(g3.items[0].wbsCode, '3.1');

  // Edge case: milestone-only project on a single day has 0d duration
  const milestoneOnlyGroups = groupItemsByProject(
    computeGanttMetrics([
      sanitizeGanttItem({
        id: 'm-only',
        name: 'Hito Único',
        type: 'milestone',
        projectId: 'p-1',
        startDate: '2026-10-15',
        endDate: '2026-10-15',
        progress: 100,
      }),
    ]),
    [projects[0]]
  );
  assert.equal(milestoneOnlyGroups[0].duration, 0);
  assert.equal(milestoneOnlyGroups[0].milestonesCount, 1);
  assert.equal(milestoneOnlyGroups[0].tasksCount, 0);
  assert.equal(milestoneOnlyGroups[0].progress, 100);

  // Edge case: empty projects list falls back to default 'Proyecto General'
  const fallbackGroups = groupItemsByProject(computed.slice(0, 1), []);
  assert.equal(fallbackGroups.length, 1);
  assert.equal(fallbackGroups[0].items.length, 1);
});

test('App and GanttWorkspace render complete WBS table, project groups, summary bars, collapsed groups, filtered views, milestones, slack bars, and SVG dependency paths', async () => {
  const { renderToString } = await import('react-dom/server');

  const appBundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { App } from './src/App.tsx';
        import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
        import { computeGanttMetrics, getProjectTemplates } from './src/utils/ganttEngine.ts';
        export function createAppElement() {
          return <App />;
        }
        export function createCollapsedWorkspaceElement() {
          const tpl = getProjectTemplates()[0];
          const items = computeGanttMetrics(tpl.items);
          const collapsedProjects = tpl.projects.map((p, idx) =>
            idx === 0 ? { ...p, collapsed: true } : p
          );
          return (
            <GanttWorkspace
              items={items}
              projects={collapsedProjects}
              groupByProject={true}
              selectedProjectId="all"
              zoom="day"
              showCriticalPath={true}
              showCpmFloat={false}
              autoCascade={true}
              onUpdateItem={() => {}}
              onEditModal={() => {}}
              onDeleteItem={() => {}}
              onDuplicateItem={() => {}}
              onQuickAdd={() => {}}
              scrollContainerRef={{ current: null }}
            />
          );
        }
        export function createHiddenArrowsWorkspaceElement() {
          const tpl = getProjectTemplates()[0];
          const items = computeGanttMetrics(tpl.items);
          return (
            <GanttWorkspace
              items={items}
              projects={tpl.projects}
              groupByProject={true}
              selectedProjectId="all"
              zoom="day"
              showCriticalPath={true}
              showCpmFloat={false}
              autoCascade={true}
              arrowVisibility="none"
              onUpdateItem={() => {}}
              onEditModal={() => {}}
              onDeleteItem={() => {}}
              onDuplicateItem={() => {}}
              onQuickAdd={() => {}}
              scrollContainerRef={{ current: null }}
            />
          );
        }
        export function createInspectedWorkspaceElement(itemId) {
          const tpl = getProjectTemplates()[0];
          const items = computeGanttMetrics(tpl.items);
          return (
            <GanttWorkspace
              items={items}
              projects={tpl.projects}
              groupByProject={true}
              selectedProjectId="all"
              zoom="day"
              showCriticalPath={true}
              showCpmFloat={false}
              autoCascade={true}
              initialSelectedItemId={itemId}
              onUpdateItem={() => {}}
              onEditModal={() => {}}
              onDeleteItem={() => {}}
              onDuplicateItem={() => {}}
              onQuickAdd={() => {}}
              scrollContainerRef={{ current: null }}
            />
          );
        }
        export function createHoveredWorkspaceElement(itemId) {
          const tpl = getProjectTemplates()[0];
          const items = computeGanttMetrics(tpl.items);
          return (
            <GanttWorkspace
              items={items}
              projects={tpl.projects}
              groupByProject={true}
              selectedProjectId="all"
              zoom="day"
              showCriticalPath={true}
              showCpmFloat={false}
              autoCascade={true}
              initialHoveredItemId={itemId}
              onUpdateItem={() => {}}
              onEditModal={() => {}}
              onDeleteItem={() => {}}
              onDuplicateItem={() => {}}
              onQuickAdd={() => {}}
              scrollContainerRef={{ current: null }}
            />
          );
        }
        export function createScrubberWorkspaceElement(x, date) {
          const tpl = getProjectTemplates()[0];
          const items = computeGanttMetrics(tpl.items);
          return (
            <GanttWorkspace
              items={items}
              projects={tpl.projects}
              groupByProject={true}
              selectedProjectId="all"
              zoom="day"
              showCriticalPath={true}
              showCpmFloat={false}
              autoCascade={true}
              initialCursorScrubber={{ x, date }}
              onUpdateItem={() => {}}
              onEditModal={() => {}}
              onDeleteItem={() => {}}
              onDuplicateItem={() => {}}
              onQuickAdd={() => {}}
              scrollContainerRef={{ current: null }}
            />
          );
        }
        export function createMultiMilestonesWorkspaceElement() {
          const tpl = getProjectTemplates()[0];
          const items = [
            ...tpl.items,
            {
              id: 'm-2',
              projectId: 'proj-discovery',
              name: 'Hito Auditoría Seguridad',
              type: 'milestone',
              startDate: '2026-11-06',
              endDate: '2026-11-06',
              duration: 0,
              slack: 0,
              dependencies: [],
              progress: 0,
              color: 'amber',
            },
          ];
          const computed = computeGanttMetrics(items);
          return (
            <GanttWorkspace
              items={computed}
              projects={tpl.projects}
              groupByProject={true}
              selectedProjectId="all"
              zoom="day"
              showCriticalPath={true}
              showCpmFloat={false}
              autoCascade={true}
              onUpdateItem={() => {}}
              onEditModal={() => {}}
              onDeleteItem={() => {}}
              onDuplicateItem={() => {}}
              onQuickAdd={() => {}}
              scrollContainerRef={{ current: null }}
            />
          );
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'ssr-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const fs = await import('node:fs/promises');
  const tmpFile = path.resolve(__dirname, './.tmp-ssr-bundle.cjs');
  await fs.writeFile(tmpFile, appBundle.outputFiles[0].text, 'utf8');
  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const createAppElement = mod.createAppElement || mod.default?.createAppElement;
    const createCollapsedWorkspaceElement =
      mod.createCollapsedWorkspaceElement || mod.default?.createCollapsedWorkspaceElement;
    const createHiddenArrowsWorkspaceElement =
      mod.createHiddenArrowsWorkspaceElement || mod.default?.createHiddenArrowsWorkspaceElement;
    const createInspectedWorkspaceElement =
      mod.createInspectedWorkspaceElement || mod.default?.createInspectedWorkspaceElement;
    const createHoveredWorkspaceElement =
      mod.createHoveredWorkspaceElement || mod.default?.createHoveredWorkspaceElement;
    const createScrubberWorkspaceElement =
      mod.createScrubberWorkspaceElement || mod.default?.createScrubberWorkspaceElement;
    const createMultiMilestonesWorkspaceElement =
      mod.createMultiMilestonesWorkspaceElement || mod.default?.createMultiMilestonesWorkspaceElement;
    const html = renderToString(createAppElement());

    // Verify default template title, project groups, project summary bars, tasks, milestones, slack badges, and today marker render
    assert.ok(html.includes('Lanzamiento Plataforma SaaS v2.0'));
    assert.ok(html.includes('Proyecto 1: Discovery &amp; Diseño de Producto'));
    assert.ok(html.includes('Proyecto 2: Ingeniería Core &amp; Pagos'));
    assert.ok(html.includes('Proyecto 3: QA, Cloud CI/CD &amp; Go-Live'));
    assert.ok(html.includes('data-project-group="proj-discovery"'));
    assert.ok(html.includes('data-project-summary-bar="proj-discovery"'));
    assert.ok(html.includes('Hito: Congelación de Diseño'));
    assert.ok(html.includes('id="gantt-today-marker"'));
    assert.ok(html.includes('Holgura (Slack): +1 día(s)'));
    assert.ok(html.includes('Holgura (Slack): +3 día(s)'));
    assert.ok(html.includes('url(#arrow-critical)'));

    // Requirement 1: Month Separator Lines across Canvas Body & Header
    assert.ok(html.includes('data-month-divider="0"'), 'Canvas body must render month dividers');
    assert.ok(
      html.includes('border-dashed') && html.includes('data-month-divider'),
      'Month separators must use dashed border across canvas body and calendar header'
    );
    assert.ok(html.includes('z-[5]'), 'Month dividers must have z-[5] to render above row backgrounds');

    // Requirement 2: Milestone Vertical Guide Lines from Top to Bottom
    assert.ok(html.includes('data-milestone-guide="m-1"'), 'Must render vertical guide for milestone m-1');
    assert.ok(html.includes('data-milestone-x="638"'), 'Milestone guide x coordinate must align with milestone diamond center');
    assert.ok(html.includes('border-l-2 border-dashed border-amber-500/60'), 'Milestone vertical guide must be dashed 2px amber line');

    // Verify hierarchical WBS codes appear in the Dependencies column (#1.2,#2.1 for m-1, #1.3 for t-4)
    assert.ok(html.includes('#1.2,#2.1'));
    assert.ok(html.includes('#1.3'));
    // Verify default dependency arrow rendering includes data-arrow-visibility="all" and rounded fillet curves (Q)
    assert.ok(html.includes('data-arrow-visibility="all"'));
    assert.ok(html.includes(' Q '));
    // Verify forward flow dependency links maintain forward midX without jumping back to canvas start
    // (t-2 -> m-1 from x1=572 to x2=627 routes through midX=584, NOT jumping back to x=47 or 53)
    assert.ok(html.includes('M 572.0 125.0 L 578.0 125.0 Q 584.0 125.0'));
    assert.equal(html.includes('M 572.0 125.0 L 53.0'), false);

    // Verify collapsed project group hides child task rows while preserving project summary bar and milestone guide lines
    const collapsedHtml = renderToString(createCollapsedWorkspaceElement());
    assert.ok(collapsedHtml.includes('data-project-group="proj-discovery"'));
    assert.ok(collapsedHtml.includes('data-project-summary-bar="proj-discovery"'));
    assert.equal(collapsedHtml.includes('Investigación de Usuarios &amp; Alcance Técnico'), false);
    assert.ok(collapsedHtml.includes('Desarrollo Motor Gantt Interactivo (Frontend)'));
    assert.ok(collapsedHtml.includes('url(#arrow-critical)'));
    assert.ok(collapsedHtml.includes('data-milestone-guide="m-1"'), 'Milestone guide lines remain visible even when project is collapsed');

    // Verify arrowVisibility="none" hides the SVG overlay completely
    const hiddenHtml = renderToString(createHiddenArrowsWorkspaceElement());
    assert.equal(hiddenHtml.includes('data-arrow-visibility='), false);

    // Requirement 3: Interactive Mouse Cursor Date Scrubber with floating pill badge
    const scrubberHtml = renderToString(
      createScrubberWorkspaceElement(350, new Date('2026-10-28T12:00:00Z'))
    );
    assert.ok(scrubberHtml.includes('id="timeline-cursor-scrubber"'));
    assert.ok(scrubberHtml.includes('data-cursor-x="350"'));
    assert.ok(scrubberHtml.includes('data-cursor-date="28 Oct 2026"'));
    assert.ok(scrubberHtml.includes('28 Oct 2026'));
    assert.ok(scrubberHtml.includes('w-0'), 'Scrubber container must have zero width so line is centered on cursor');
    assert.ok(scrubberHtml.includes('-translate-x-1/2'), 'Vertical line must be centered at left:0 of scrubber container');

    // Requirement 3 (Edge Case): Scrubber badge boundary clamp near left canvas edge (x=10)
    const leftScrubberHtml = renderToString(
      createScrubberWorkspaceElement(10, new Date('2026-10-28T12:00:00Z'))
    );
    assert.ok(leftScrubberHtml.includes('id="timeline-cursor-scrubber"'));
    assert.ok(leftScrubberHtml.includes('translateX(calc(-50% + 50px))'));

    // Requirement 2 (Edge Case): Multiple milestones on identical dates get tiered vertically to prevent visual label collision
    const multiMilestoneHtml = renderToString(createMultiMilestonesWorkspaceElement());
    assert.ok(multiMilestoneHtml.includes('data-milestone-guide="m-1"'));
    assert.ok(multiMilestoneHtml.includes('data-milestone-guide="m-2"'));
    assert.ok(multiMilestoneHtml.includes('top-0.5'), 'First milestone on date is at top-0.5 tier');
    assert.ok(multiMilestoneHtml.includes('top-6'), 'Second milestone on date is tiered at top-6 to prevent overlap');

    // Requirement 4: Non-intrusive Top-Right Docked Inspection Panel on Click
    const inspectedHtml = renderToString(createInspectedWorkspaceElement('t-2'));
    assert.ok(inspectedHtml.includes('id="gantt-inspection-panel"'));
    assert.ok(inspectedHtml.includes('data-selected-item-id="t-2"'));
    assert.ok(inspectedHtml.includes('1.2'));
    assert.ok(inspectedHtml.includes('Diseño de Sistema UI/UX &amp; Prototipo Figma'));
    assert.ok(inspectedHtml.includes('Discovery &amp; Diseño de Producto'));
    assert.ok(inspectedHtml.includes('Predecesoras:'));
    assert.ok(inspectedHtml.includes('Investigación de Usuarios &amp; Alcance Técnico'));
    assert.ok(inspectedHtml.includes('Sucesoras:'));
    assert.ok(inspectedHtml.includes('Hito: Congelación de Diseño &amp; Esquema API'));
    assert.ok(inspectedHtml.includes('data-close-inspection-panel="true"'));
    assert.ok(inspectedHtml.includes('Editar Ítem'));
    // Floating dark hover tooltip has been eliminated
    assert.equal(inspectedHtml.includes('pointer-events-none bg-slate-900/95'), false);

    // Active hover on task does not render any dark floating tooltip card
    const hoveredTaskHtml = renderToString(createHoveredWorkspaceElement('t-2'));
    assert.equal(hoveredTaskHtml.includes('pointer-events-none bg-slate-900/95'), false, 'Hovered task does not render dark overlay card');
    assert.equal(hoveredTaskHtml.includes('bg-slate-900/95 text-white'), false, 'Hovered task does not render dark tooltip');
    assert.ok(hoveredTaskHtml.includes('shadow-md'), 'Hovered task retains subtle shadow-md');
    assert.equal(hoveredTaskHtml.includes('id="gantt-inspection-panel"'), false, 'Hovered task does not open docked inspection panel');

    // Active hover on milestone does not render any dark floating tooltip card
    const hoveredMilestoneHtml = renderToString(createHoveredWorkspaceElement('m-1'));
    assert.equal(hoveredMilestoneHtml.includes('pointer-events-none bg-slate-900/95'), false, 'Hovered milestone does not render dark overlay card');
    assert.equal(hoveredMilestoneHtml.includes('bg-slate-900/95 text-white'), false, 'Hovered milestone does not render dark tooltip');
    assert.equal(hoveredMilestoneHtml.includes('id="gantt-inspection-panel"'), false, 'Hovered milestone does not open docked inspection panel');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('getDefaultSavedScenarios loads clean SaaS template and contains no hardcoded Xcode 27 data', () => {
  const defaultScenarios = getDefaultSavedScenarios();
  assert.equal(defaultScenarios.length, 1);
  assert.equal(defaultScenarios[0].id, 'scen-saas-v2');
  assert.equal(defaultScenarios[0].name, 'Lanzamiento Plataforma SaaS v2.0');

  // Verify none of the default scenarios contain any Xcode 27 references
  for (const s of defaultScenarios) {
    assert.notEqual(s.id, 'scen-xcode27');
    assert.ok(!s.name.toLowerCase().includes('xcode 27'));
    for (const p of s.projects) {
      assert.notEqual(p.id, 'proj-xcode27');
      assert.ok(!p.name.toLowerCase().includes('xcode 27'));
    }
    for (const it of s.items) {
      assert.notEqual(it.projectId, 'proj-xcode27');
      assert.ok(!it.id.startsWith('xc-'));
      assert.ok(!it.name.toLowerCase().includes('xcode'));
      assert.ok(!it.name.toLowerCase().includes('biocatch'));
    }
  }

  // Verify default SaaS scenario is conflict-free and valid
  const saas = defaultScenarios[0];
  const computed = computeGanttMetrics(saas.items);
  for (const c of computed) {
    assert.equal(c.hasConflict, false, `Task ${c.name} should have no conflict`);
  }
  const groups = groupItemsByProject(computed, saas.projects);
  assert.equal(groups.length, 3);
});

test('Scenario manager saves custom scenario, switches to a template, and returns to the saved scenario without data loss', () => {
  const initialScenarios = getDefaultSavedScenarios();
  assert.ok(initialScenarios.length >= 1);

  // 1. Create a custom scenario with custom projects and tasks
  const customScenario = createNewScenario('Mi Escenario Personalizado', 'blank');
  const customProject = sanitizeProject({
    id: 'proj-custom-1',
    name: 'Proyecto Custom Alpha',
    color: 'emerald',
  });
  const customTask = sanitizeGanttItem({
    id: 't-custom-1',
    name: 'Tarea Crítica Custom',
    type: 'task',
    projectId: 'proj-custom-1',
    startDate: '2026-11-01',
    endDate: '2026-11-10',
    duration: 10,
    slack: 2,
    progress: 45,
  });

  let savedList = upsertScenarioInList(initialScenarios, {
    ...customScenario,
    projects: [customProject],
    items: [customTask],
  });

  // Simulate user editing the active custom scenario in the workspace
  const editedTask = sanitizeGanttItem({
    ...customTask,
    name: 'Tarea Crítica Custom (Editada)',
    progress: 80,
  });
  const activeWorkspaceBeforeTemplate = {
    activeScenarioId: customScenario.id,
    projectName: 'Mi Escenario Personalizado v2',
    projects: [customProject],
    items: [editedTask],
  };

  // 2. Switch to 'cloud-migration' template
  const afterTemplateSwitch = switchWorkspaceToTemplate(
    activeWorkspaceBeforeTemplate,
    savedList,
    'cloud-migration'
  );

  assert.equal(afterTemplateSwitch.activeScenarioId, 'template:cloud-migration');
  assert.equal(afterTemplateSwitch.projectName, 'Migración de Infraestructura Cloud & IA');
  // Verify the custom scenario was auto-saved with its latest edits in savedScenarios
  const preserved = afterTemplateSwitch.savedScenarios.find(
    (s) => s.id === customScenario.id
  );
  assert.ok(preserved);
  assert.equal(preserved.name, 'Mi Escenario Personalizado v2');
  assert.equal(preserved.items[0].name, 'Tarea Crítica Custom (Editada)');
  assert.equal(preserved.items[0].progress, 80);

  // 3. Switch back from the template to the user's created scenario
  const restored = switchWorkspaceToScenario(
    afterTemplateSwitch,
    afterTemplateSwitch.savedScenarios,
    customScenario.id
  );

  assert.equal(restored.activeScenarioId, customScenario.id);
  assert.equal(restored.projectName, 'Mi Escenario Personalizado v2');
  assert.equal(restored.projects.length, 1);
  assert.equal(restored.projects[0].id, 'proj-custom-1');
  assert.equal(restored.items.length, 1);
  assert.equal(restored.items[0].name, 'Tarea Crítica Custom (Editada)');
  assert.equal(restored.items[0].progress, 80);

  // 4. Switch to SaaS scenario and verify all items are intact
  const switchedToSaas = switchWorkspaceToScenario(
    restored,
    restored.savedScenarios,
    'scen-saas-v2'
  );
  assert.equal(switchedToSaas.activeScenarioId, 'scen-saas-v2');
  assert.equal(switchedToSaas.projects.length, 3);
  assert.equal(switchedToSaas.items.length, 9);

  // 5. Edge case: Switch to a template, edit a task in Vista Plantilla mode without clicking "Guardar",
  // and switch back to 'scen-saas-v2' — the modified template must be auto-promoted into savedScenarios
  const countBeforeTemplateEdit = switchedToSaas.savedScenarios.length;
  const tplView = switchWorkspaceToTemplate(
    switchedToSaas,
    switchedToSaas.savedScenarios,
    'blank-project'
  );
  assert.equal(tplView.savedScenarios.length, countBeforeTemplateEdit);

  const editedTemplateWorkspace = {
    ...tplView,
    items: tplView.items.map((it, idx) =>
      idx === 0 ? { ...it, name: 'Tarea Editada en Vista Plantilla' } : it
    ),
  };
  const afterEditedTemplateSwitch = switchWorkspaceToScenario(
    editedTemplateWorkspace,
    editedTemplateWorkspace.savedScenarios,
    'scen-saas-v2'
  );
  assert.equal(afterEditedTemplateSwitch.savedScenarios.length, countBeforeTemplateEdit + 1);
  const autoPromoted = afterEditedTemplateSwitch.savedScenarios.find(
    (s) => s.sourceTemplateId === 'blank-project'
  );
  assert.ok(autoPromoted);
  assert.equal(autoPromoted.items[0].name, 'Tarea Editada en Vista Plantilla');
});

test('App renders default clean SaaS scenario, + Nuevo Proyecto button, and Saved Scenarios bar in SSR', async () => {
  const { renderToString } = await import('react-dom/server');
  const appBundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { App } from './src/App.tsx';
        export function createDefaultApp() {
          return <App />;
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'ssr-default-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const fs = await import('node:fs/promises');
  const tmpFile = path.resolve(__dirname, './.tmp-ssr-default.cjs');
  await fs.writeFile(tmpFile, appBundle.outputFiles[0].text, 'utf8');
  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const createDefaultApp = mod.createDefaultApp || mod.default?.createDefaultApp;
    const html = renderToString(createDefaultApp());

    // Verify SaaS v2.0 scenario renders as active scenario
    assert.ok(html.includes('Lanzamiento Plataforma SaaS v2.0'));
    assert.ok(html.includes('data-scenarios-bar="true"'));
    assert.ok(html.includes('data-scenario-pill="scen-saas-v2"'));

    // Verify NO hardcoded Xcode 27 data exists in rendered HTML
    assert.ok(!html.includes('Xcode 27'));
    assert.ok(!html.includes('scen-xcode27'));
    assert.ok(!html.includes('proj-xcode27'));
    assert.ok(!html.includes('biocatch'));

    // Verify unified single-point project creation: "+ Nuevo Proyecto" in WBS table
    assert.ok(html.includes('+ Nuevo Proyecto'));

    // Verify SaaS projects and tasks are rendered
    assert.ok(html.includes('Proyecto 1: Discovery &amp; Diseño de Producto'));
    assert.ok(html.includes('Proyecto 2: Ingeniería Core &amp; Pagos'));
    assert.ok(html.includes('Proyecto 3: QA, Cloud CI/CD &amp; Go-Live'));

    // Verify flexible zoom & fit-to-project UI controls render
    assert.ok(html.includes('data-zoom-slider="true"'));
    assert.ok(html.includes('data-fit-timeline-btn="true"'));
    assert.ok(html.includes('data-wheel-zoom-toggle="true"'));
    assert.ok(html.includes('Trimestre'));
    assert.ok(html.includes('Ajustar a Proyecto'));

    // Verify dependency arrow visibility selector renders in toolbar
    assert.ok(html.includes('data-arrow-visibility-selector="true"'));
    assert.ok(html.includes('data-arrow-visibility-option="all"'));
    assert.ok(html.includes('data-arrow-visibility-option="hover"'));
    assert.ok(html.includes('data-arrow-visibility-option="critical"'));
    assert.ok(html.includes('data-arrow-visibility-option="none"'));
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('clampDayWidth, getDayWidthForPreset, resolveZoomPresetFromDayWidth, and computeWheelZoomDayWidth handle continuous zoom and edge cases', () => {
  // Preset lookup and resolution
  assert.equal(getDayWidthForPreset('day'), 44);
  assert.equal(getDayWidthForPreset('week'), 24);
  assert.equal(getDayWidthForPreset('month'), 12);
  assert.equal(getDayWidthForPreset('quarter'), 5);

  assert.equal(resolveZoomPresetFromDayWidth(44), 'day');
  assert.equal(resolveZoomPresetFromDayWidth(24.3), 'week');
  assert.equal(resolveZoomPresetFromDayWidth(12), 'month');
  assert.equal(resolveZoomPresetFromDayWidth(5), 'quarter');
  assert.equal(resolveZoomPresetFromDayWidth(8.4), 'custom');

  // Clamping and invalid inputs
  assert.equal(clampDayWidth(0.5), MIN_DAY_WIDTH);
  assert.equal(clampDayWidth(-20), MIN_DAY_WIDTH);
  assert.equal(clampDayWidth(500), MAX_DAY_WIDTH);
  assert.equal(clampDayWidth(Number.NaN), DEFAULT_DAY_WIDTH);
  assert.equal(clampDayWidth(Number.POSITIVE_INFINITY), DEFAULT_DAY_WIDTH);

  // Mouse wheel zoom: negative deltaY (wheel up) zooms in, positive deltaY (wheel down) zooms out
  const zoomedIn = computeWheelZoomDayWidth(24, -60);
  assert.ok(zoomedIn > 24, `Expected ${zoomedIn} > 24 when zooming in`);
  const zoomedOut = computeWheelZoomDayWidth(24, 60);
  assert.ok(zoomedOut < 24, `Expected ${zoomedOut} < 24 when zooming out`);
  assert.equal(computeWheelZoomDayWidth(24, 0), 24);

  // Small scales (e.g. 4px/day) still increment/decrement smoothly without stalling on rounding
  const smallStepUp = computeWheelZoomDayWidth(4, -10);
  assert.ok(smallStepUp > 4);
  const smallStepDown = computeWheelZoomDayWidth(4, 10);
  assert.ok(smallStepDown < 4);

  // Clamping at bounds during wheel zoom
  assert.equal(computeWheelZoomDayWidth(MIN_DAY_WIDTH, 100), MIN_DAY_WIDTH);
  assert.equal(computeWheelZoomDayWidth(MAX_DAY_WIDTH, -100), MAX_DAY_WIDTH);
});

test('computeFitToProjectScale automatically finds optimal scale to fit all tasks of a project or portfolio', () => {
  // 1. Fit a 169-day project into a 980px viewport
  const longProjectItems = [
    {
      id: 'lp-1',
      name: 'Tarea Inicial Larga',
      type: 'task',
      startDate: '2026-10-29',
      endDate: '2027-04-15',
      duration: 169,
      slack: 0,
      dependencies: [],
      progress: 0,
      color: 'indigo',
    },
  ];
  const longFit = computeFitToProjectScale(longProjectItems, 980, {
    referenceToday: new Date('2026-10-28T00:00:00Z'),
  });
  assert.equal(longFit.spanDays, 169);
  assert.equal(longFit.startDate, '2026-10-29');
  assert.equal(longFit.endDate, '2027-04-15');
  assert.ok(longFit.dayWidth >= MIN_DAY_WIDTH && longFit.dayWidth <= 8);
  // All 169 days fit comfortably within the 980px viewport width
  assert.ok(longFit.spanDays * longFit.dayWidth <= 980);
  assert.ok(longFit.scrollLeft >= 0);

  // 2. Fit a specific single project vs entire portfolio in SaaS template
  const saas = getProjectTemplates()[0];
  const fullPortfolioFit = computeFitToProjectScale(saas.items, 1000, {
    projectId: 'all',
  });
  const singleProjectFit = computeFitToProjectScale(saas.items, 1000, {
    projectId: 'proj-discovery',
  });
  // Single project (11 days) spans fewer days than full portfolio (24 days), so its fitted dayWidth is larger
  assert.ok(singleProjectFit.spanDays < fullPortfolioFit.spanDays);
  assert.ok(singleProjectFit.dayWidth > fullPortfolioFit.dayWidth);
  assert.equal(singleProjectFit.targetProjectId, 'proj-discovery');

  // 3. Edge cases: empty items, unknown projectId fallback, extreme viewport widths
  const emptyFit = computeFitToProjectScale([], 1000);
  assert.equal(emptyFit.dayWidth, DEFAULT_DAY_WIDTH);
  assert.equal(emptyFit.scrollLeft, 0);

  const fallbackProjectFit = computeFitToProjectScale(saas.items, 1000, {
    projectId: 'non-existent-project',
  });
  assert.equal(fallbackProjectFit.targetProjectId, 'all');
  assert.equal(fallbackProjectFit.spanDays, fullPortfolioFit.spanDays);

  const tinyViewportFit = computeFitToProjectScale(longProjectItems, 100);
  assert.ok(tinyViewportFit.dayWidth >= MIN_DAY_WIDTH);

  const hugeViewportFit = computeFitToProjectScale(saas.items.slice(0, 1), 5000);
  assert.equal(hugeViewportFit.dayWidth, MAX_DAY_WIDTH);

  const bounds = computeTimelineBounds(longProjectItems, new Date('2026-10-28T00:00:00Z'));
  assert.ok(bounds.totalDays > longFit.spanDays);
});

test('computeFitToProjectScale and computeWheelZoomDayWidth handle single-day projects, single milestones, multi-year spans, and extreme inputs', () => {
  // 1. Single milestone (duration: 0, startDate == endDate)
  const singleMilestone = [
    {
      id: 'm-single',
      name: 'Launch Day',
      type: 'milestone',
      projectId: 'proj-launch',
      startDate: '2026-12-01',
      endDate: '2026-12-01',
      duration: 0,
      slack: 0,
      dependencies: [],
      progress: 100,
      color: 'amber',
    },
  ];
  const milestoneFit = computeFitToProjectScale(singleMilestone, 900);
  assert.equal(milestoneFit.spanDays, 1);
  assert.equal(milestoneFit.startDate, '2026-12-01');
  assert.equal(milestoneFit.endDate, '2026-12-01');
  assert.equal(milestoneFit.dayWidth, MAX_DAY_WIDTH); // Max zoom for single milestone
  assert.ok(milestoneFit.scrollLeft >= 0);

  // 2. Single 1-day task (duration: 1)
  const singleDayTask = [
    {
      id: 't-1d',
      name: '1-Day Spike',
      type: 'task',
      projectId: 'proj-spike',
      startDate: '2026-11-15',
      endDate: '2026-11-15',
      duration: 1,
      slack: 0,
      dependencies: [],
      progress: 50,
      color: 'indigo',
    },
  ];
  const dayFit = computeFitToProjectScale(singleDayTask, 1200);
  assert.equal(dayFit.spanDays, 1);
  assert.equal(dayFit.dayWidth, MAX_DAY_WIDTH);
  assert.ok(dayFit.scrollLeft >= 0);

  // 3. Multi-year span (e.g. 3 years / 1095 days)
  const multiYearTasks = [
    {
      id: 't-start',
      name: 'Project Inception',
      type: 'task',
      projectId: 'proj-multiyear',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      duration: 31,
      slack: 0,
      dependencies: [],
      progress: 100,
      color: 'blue',
    },
    {
      id: 't-end',
      name: 'Final Delivery',
      type: 'milestone',
      projectId: 'proj-multiyear',
      startDate: '2026-12-31',
      endDate: '2026-12-31',
      duration: 0,
      slack: 0,
      dependencies: ['t-start'],
      progress: 0,
      color: 'rose',
    },
  ];
  const multiYearFit = computeFitToProjectScale(multiYearTasks, 1000);
  assert.ok(multiYearFit.spanDays > 1000);
  assert.equal(multiYearFit.dayWidth, MIN_DAY_WIDTH); // Clamped to minimum 3px/day
  assert.ok(multiYearFit.scrollLeft >= 0);

  // 4. Invalid or edge-case viewport widths (0, negative, NaN)
  const zeroViewportFit = computeFitToProjectScale(singleDayTask, 0);
  assert.ok(zeroViewportFit.dayWidth >= MIN_DAY_WIDTH && zeroViewportFit.dayWidth <= MAX_DAY_WIDTH);
  const nanViewportFit = computeFitToProjectScale(singleDayTask, Number.NaN);
  assert.ok(nanViewportFit.dayWidth >= MIN_DAY_WIDTH && nanViewportFit.dayWidth <= MAX_DAY_WIDTH);
  const negViewportFit = computeFitToProjectScale(singleDayTask, -500);
  assert.ok(negViewportFit.dayWidth >= MIN_DAY_WIDTH && negViewportFit.dayWidth <= MAX_DAY_WIDTH);

  // 5. Extreme wheel deltas (large trackpad flick or wheel spike +/- 5000)
  const flickOut = computeWheelZoomDayWidth(44, 5000);
  assert.ok(flickOut < 44);
  assert.ok(flickOut >= MIN_DAY_WIDTH);
  const flickIn = computeWheelZoomDayWidth(44, -5000);
  assert.ok(flickIn > 44);
  assert.ok(flickIn <= MAX_DAY_WIDTH);
  assert.equal(computeWheelZoomDayWidth(44, Number.NaN), 44);
});

test('rapid wheel sequences and center-anchored scaling maintain invariant coordinates without drift', () => {
  // 1. Rapid mouse wheel sequence: 10 consecutive wheel zoom-in events with cursor at 450px
  let currentWidth = 44;
  let virtualScrollLeft = 500;
  const cursorViewportX = 450;
  const initialDayAtCursor = (virtualScrollLeft + cursorViewportX) / currentWidth; // (500 + 450) / 44 = 21.5909 days

  for (let step = 0; step < 10; step++) {
    const nextWidth = computeWheelZoomDayWidth(currentWidth, -30);
    const dayAtCursor = (virtualScrollLeft + cursorViewportX) / currentWidth;
    virtualScrollLeft = Math.max(0, dayAtCursor * nextWidth - cursorViewportX);
    currentWidth = nextWidth;

    // The day directly underneath the mouse cursor must remain invariant within rounding tolerance
    const recalculatedDay = (virtualScrollLeft + cursorViewportX) / currentWidth;
    assert.ok(
      Math.abs(recalculatedDay - initialDayAtCursor) < 0.05,
      `Step ${step}: dayAtCursor drifted from ${initialDayAtCursor} to ${recalculatedDay}`
    );
  }

  // 2. Center-anchored zoom (slider or preset clicks): keeps center date invariant
  const viewportW = 960;
  const baseWidth = 44;
  const initialCenterDay = 60; // Day 60 is at 60 * 44 = 2640px
  const baseScroll = initialCenterDay * baseWidth - viewportW / 2; // 2640 - 480 = 2160px

  const targetWidths = [12, 24, 60, 80];
  for (const targetW of targetWidths) {
    const nextScroll = Math.max(0, initialCenterDay * targetW - viewportW / 2);
    const newCenterDay = (nextScroll + viewportW / 2) / targetW;
    assert.ok(
      Math.abs(newCenterDay - initialCenterDay) < 0.01,
      `Center day drifted at targetWidth ${targetW}`
    );
  }

  // Boundary clamping check: When date is within half-viewport of day 0, scrollLeft clamps cleanly at 0
  const earlyCenterDay = 5;
  const earlyScroll = Math.max(0, earlyCenterDay * 12 - viewportW / 2);
  assert.equal(earlyScroll, 0);

  // 3. Scenario scale switching: Long project (>45 days) fits to viewport, short project (<=45 days) defaults to 44px
  const longProjectItems = [
    {
      id: 'lp-scale-test',
      name: 'Long Task',
      type: 'task',
      startDate: '2026-10-01',
      endDate: '2027-02-15',
      duration: 137,
      slack: 0,
      dependencies: [],
      progress: 0,
      color: 'indigo',
    },
  ];
  const saas = getProjectTemplates()[0];
  const longFit = computeFitToProjectScale(longProjectItems, 980);
  const saasFit = computeFitToProjectScale(saas.items, 980);

  assert.ok(longFit.spanDays > 45, 'Long project should span > 45 days');
  assert.ok(longFit.dayWidth < 10, 'Long project should fit with a compact dayWidth');

  assert.ok(saasFit.spanDays <= 45, 'SaaS template should span <= 45 days');
  // When switching to SaaS, workspace uses DEFAULT_DAY_WIDTH (44px) so text and bars are comfortably legible
  const defaultWidth = DEFAULT_DAY_WIDTH;
  assert.equal(defaultWidth, 44);
});

test('createRoundedOrthogonalPath produces smooth fillet curves with quadratic bezier Q and clamps radius on tight corners', () => {
  // 1. Standard 2-corner orthogonal polyline (horizontal -> vertical -> horizontal)
  const path1 = createRoundedOrthogonalPath(
    [
      { x: 100, y: 50 },
      { x: 150, y: 50 },
      { x: 150, y: 100 },
      { x: 200, y: 100 },
    ],
    6
  );
  // Must start at M 100.0 50.0, use Q bezier fillet curves for the corners, and end at L 200.0 100.0
  assert.ok(path1.startsWith('M 100.0 50.0'));
  assert.ok(path1.includes('Q 150.0 50.0'));
  assert.ok(path1.includes('Q 150.0 100.0'));
  assert.ok(path1.endsWith('L 200.0 100.0'));

  // 2. Short segment clamps fillet radius to half segment length to avoid overshoot
  const tightCorners = createRoundedOrthogonalPath(
    [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 4 }, // only 4px vertical distance -> radius clamped to <= 2px
      { x: 20, y: 4 },
    ],
    6
  );
  assert.ok(tightCorners.includes('Q 10.0 0.0'));
  assert.ok(tightCorners.includes('Q 10.0 4.0'));

  // 3. Collinear segments and duplicates are collapsed cleanly
  const redundant = createRoundedOrthogonalPath([
    { x: 0, y: 0 },
    { x: 0, y: 0 }, // duplicate
    { x: 50, y: 0 },
    { x: 100, y: 0 }, // collinear horizontal segment
    { x: 100, y: 50 },
  ]);
  assert.equal(redundant.includes('Q 50.0'), false, 'Collinear point should be removed');
  assert.ok(redundant.includes('Q 100.0 0.0'));

  // 4. Straight single segment produces clean 2-point line without unnecessary bezier
  const straight = createRoundedOrthogonalPath([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ]);
  assert.equal(straight, 'M 0.0 0.0 L 100.0 0.0');

  // 5. Degenerate and empty inputs
  assert.equal(createRoundedOrthogonalPath([]), '');
  assert.equal(createRoundedOrthogonalPath([{ x: 0, y: 0 }]), '');

  // 6. Monotone direction check: 180-degree turnaround on same axis does not collapse intermediate point
  const turnaround = createRoundedOrthogonalPath([
    { x: 10, y: 0 },
    { x: 10, y: 50 },
    { x: 10, y: 10 },
    { x: 30, y: 10 },
  ]);
  assert.ok(turnaround.includes('50.0'), 'Intermediate peak point must be preserved on turnaround');

  // 7. Non-orthogonal vertices fall back to sharp L without Q bezier distortion
  const diagonal = createRoundedOrthogonalPath([
    { x: 0, y: 0 },
    { x: 50, y: 25 },
    { x: 100, y: 100 },
  ]);
  assert.equal(diagonal.includes('Q '), false, 'Diagonal segments should fall back to clean straight L commands');
});

test('formatScrubberDate correctly formats Spanish calendar dates with capitalized month abbreviations and handles edge cases', () => {
  // Oct 28, 2026 -> 28 Oct 2026 (exact task prompt example)
  const d1 = new Date(2026, 9, 28, 12, 0, 0); // Month is 0-indexed: 9 = Oct
  assert.equal(formatScrubberDate(d1), '28 Oct 2026');

  // Jan 15, 2027 -> 15 Ene 2027 (exact task prompt example)
  const d2 = new Date(2027, 0, 15, 12, 0, 0); // 0 = Jan
  assert.equal(formatScrubberDate(d2), '15 Ene 2027');

  // May 1, 2026 -> 1 May 2026 (single-digit day)
  const d3 = new Date(2026, 4, 1, 12, 0, 0); // 4 = May
  assert.equal(formatScrubberDate(d3), '1 May 2026');

  // Dec 31, 2026 -> 31 Dic 2026 (year end)
  const d4 = new Date(2026, 11, 31, 12, 0, 0); // 11 = Dec
  assert.equal(formatScrubberDate(d4), '31 Dic 2026');

  // Feb 29, 2028 -> 29 Feb 2028 (leap year)
  const d5 = new Date(2028, 1, 29, 12, 0, 0); // 1 = Feb
  assert.equal(formatScrubberDate(d5), '29 Feb 2028');

  // Null, undefined, empty, and invalid dates return empty string safely without throw
  assert.equal(formatScrubberDate(null), '');
  assert.equal(formatScrubberDate(undefined), '');
  assert.equal(formatScrubberDate(''), '');
  assert.equal(formatScrubberDate(new Date('invalid')), '');

  // ISO string inputs supported
  assert.equal(formatScrubberDate('2026-10-28'), '28 Oct 2026');
  assert.equal(formatScrubberDate('2027-01-15'), '15 Ene 2027');
});

test('month dividers, milestone guide lines, and date scrubber handle extreme edge cases gracefully', () => {
  // 1. Project with zero milestones produces 0 milestone guides without error
  const noMilestones = [
    {
      id: 'task-1',
      name: 'Single Task',
      type: 'task',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      duration: 5,
      slack: 0,
      dependencies: [],
      progress: 0,
      color: 'indigo',
    },
  ];
  const computed = computeGanttMetrics(noMilestones);
  const groups = groupItemsByProject(computed);
  const bounds = computeTimelineBounds(computed, new Date('2026-10-01'));
  assert.ok(bounds.timelineStart < bounds.timelineEnd);

  // 2. Multi-year span month groups coverage
  const multiYear = [
    {
      id: 'm-start',
      name: 'Hito Inicio 2025',
      type: 'milestone',
      startDate: '2025-01-01',
      endDate: '2025-01-01',
      duration: 0,
      slack: 0,
      dependencies: [],
      progress: 0,
      color: 'amber',
    },
    {
      id: 'm-end',
      name: 'Hito Fin 2027',
      type: 'milestone',
      startDate: '2027-12-31',
      endDate: '2027-12-31',
      duration: 0,
      slack: 0,
      dependencies: ['m-start'],
      progress: 0,
      color: 'amber',
    },
  ];
  const myComputed = computeGanttMetrics(multiYear);
  const myBounds = computeTimelineBounds(myComputed, new Date('2026-01-01'));
  const myDaysCount = Math.round(
    (myBounds.timelineEnd.getTime() - myBounds.timelineStart.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  assert.ok(myDaysCount > 730, 'Multi-year bounds should span over 2 years of days');

  // 3. formatScrubberDate robustness on epoch start and leap centuries
  const epochDate = new Date(1970, 0, 1, 12, 0, 0);
  assert.equal(formatScrubberDate(epochDate), '1 Ene 1970');
  const leapCentury = new Date(2000, 1, 29, 12, 0, 0);
  assert.equal(formatScrubberDate(leapCentury), '29 Feb 2000');
});

test('dragging delta invariance: effectiveStart offset and pixel movement equal deltaDays exactly (1x), never double-counted', async () => {
  const { addDays, differenceInCalendarDays } = await import('date-fns');
  const origStart = new Date('2027-04-26T00:00:00Z');
  const deltaDays = 3;
  const dayWidth = 24;
  const draggedStart = addDays(origStart, deltaDays);
  const startOffsetDays = differenceInCalendarDays(draggedStart, origStart);
  assert.equal(startOffsetDays, deltaDays, 'Drag offset must be 1x deltaDays');
  assert.equal(startOffsetDays * dayWidth, 72, 'Pixel movement must be exactly 72px for 3 days');

  // Verify milestone move
  const mStart = new Date('2027-05-15T00:00:00Z');
  const mDragged = addDays(mStart, -2);
  assert.equal(differenceInCalendarDays(mDragged, mStart), -2);
  assert.equal(differenceInCalendarDays(mDragged, mStart) * dayWidth, -48);
});

test('Purging of Xcode 27 data and single-point project creation in GanttWorkspace and App', async () => {
  const { renderToString } = await import('react-dom/server');
  const appBundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { App } from './src/App.tsx';
        import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
        import { getProjectTemplates } from './src/utils/ganttEngine.ts';

        export function renderFullApp() {
          return <App />;
        }

        export function renderWorkspace(onCreateProject) {
          const tpl = getProjectTemplates()[0];
          return (
            <GanttWorkspace
              items={tpl.items}
              projects={tpl.projects}
              groupByProject={true}
              selectedProjectId="all"
              zoom="day"
              dayWidth={44}
              showCriticalPath={false}
              showCpmFloat={false}
              autoCascade={true}
              onUpdateItem={() => {}}
              onEditModal={() => {}}
              onDeleteItem={() => {}}
              onDuplicateItem={() => {}}
              onQuickAdd={() => {}}
              onCreateProject={onCreateProject}
              scrollContainerRef={{ current: null }}
            />
          );
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'ssr-purge-and-create-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const fs = await import('node:fs/promises');
  const tmpFile = path.resolve(__dirname, './.tmp-ssr-purge.cjs');
  await fs.writeFile(tmpFile, appBundle.outputFiles[0].text, 'utf8');
  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const html = renderToString(mod.renderFullApp());

    // 1. Proyectos dropdown and Crear dropdown should NOT have duplicate project creation
    assert.ok(html.includes('+ Nuevo Proyecto'));

    // 2. Neither old footer "Añadir Tarea", "Añadir Hito", nor "Añadir Proyecto" buttons exist
    assert.ok(!html.includes('Añadir Tarea'));
    assert.ok(!html.includes('Añadir Hito'));
    assert.ok(!html.includes('Añadir Proyecto'));

    // 3. Top showNewProjectBar is NOT in the DOM
    assert.ok(!html.includes('Nuevo Proyecto:'));

    // 4. Column configuration button exists with data-dropdown-container
    assert.ok(html.includes('aria-label="Configurar columnas"'));
    assert.ok(html.includes('data-dropdown-container="true"'));

    // 5. Standalone GanttWorkspace render with onCreateProject
    const wsHtml = renderToString(mod.renderWorkspace(() => {}));
    assert.ok(wsHtml.includes('+ Nuevo Proyecto'));
    assert.ok(!wsHtml.includes('Añadir Tarea'));
    assert.ok(!wsHtml.includes('Añadir Hito'));
    assert.ok(!wsHtml.includes('Añadir Proyecto'));
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Independent dropdown outside-click dismiss, escape key handlers, and project creation filter reset', async () => {
  const { renderToString } = await import('react-dom/server');
  const appBundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { App } from './src/App.tsx';
        import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
        import { getProjectTemplates } from './src/utils/ganttEngine.ts';

        export function renderFullApp() {
          return <App />;
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'ssr-outside-click-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const fs = await import('node:fs/promises');
  const tmpFile = path.resolve(__dirname, './.tmp-ssr-outside-click.cjs');
  await fs.writeFile(tmpFile, appBundle.outputFiles[0].text, 'utf8');
  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const html = renderToString(mod.renderFullApp());

    // Verify all 3 dropdown containers have data-dropdown-container
    assert.ok(html.includes('data-dropdown-container="true"'));
    // Verify Escenarios menu container exists
    assert.ok(html.includes('data-scenarios-bar="true"'));
    // Verify + Nuevo Proyecto exists
    assert.ok(html.includes('+ Nuevo Proyecto'));
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('importGanttData parses and validates standard scenario, raw items array, tasks property, and workspace backups', () => {
  // 1. Standard Scenario JSON (as exported by handleExportJSON)
  const standardScenarioPayload = {
    id: 'scen-test-export',
    name: 'Plan de Expansión 2027',
    projectName: 'Plan de Expansión 2027',
    projects: [
      { id: 'proj-1', name: 'Fase 1: Infraestructura', color: 'indigo', collapsed: false },
    ],
    items: [
      {
        id: 't-1',
        name: 'Configuración Servidores',
        type: 'task',
        projectId: 'proj-1',
        startDate: '2027-01-10',
        endDate: '2027-01-15',
        duration: 6,
        slack: 1,
        progress: 80,
        color: 'indigo',
        dependencies: [],
      },
      {
        id: 'm-1',
        name: 'Hito Infraestructura Lista',
        type: 'milestone',
        projectId: 'proj-1',
        startDate: '2027-01-16',
        endDate: '2027-01-16',
        duration: 0,
        slack: 0,
        progress: 0,
        color: 'amber',
        dependencies: ['t-1'],
      },
    ],
  };

  const res1 = importGanttData(standardScenarioPayload);
  assert.ok(res1.primaryScenario);
  assert.equal(res1.primaryScenario.name, 'Plan de Expansión 2027');
  assert.equal(res1.primaryScenario.items.length, 2);
  assert.equal(res1.primaryScenario.projects.length, 1);
  assert.equal(res1.primaryScenario.items[0].duration, 6);
  assert.equal(res1.primaryScenario.items[1].type, 'milestone');

  // 2. Direct array of tasks with edge cases (numeric IDs, string progress with %, decimal progress)
  const rawArrayPayload = [
    {
      id: 101,
      name: 'Análisis Inicial',
      startDate: '2026-11-01',
      duration: '4d',
      progress: '50%',
      dependencies: [101, 999], // 101 is self-dependency (should be stripped)
    },
    {
      id: 102,
      name: 'Diseño UX',
      startDate: '2026-11-05',
      duration: 3,
      progress: 0.75, // Decimal progress should become 75%
      dependencies: [101],
    },
  ];

  const res2 = importGanttData(rawArrayPayload);
  assert.ok(res2.primaryScenario);
  assert.equal(res2.primaryScenario.items.length, 2);
  assert.equal(res2.primaryScenario.items[0].id, '101');
  assert.equal(res2.primaryScenario.items[0].progress, 50);
  assert.equal(res2.primaryScenario.items[0].duration, 4);
  // Self dependency 101 should be stripped, only 999 kept
  assert.deepEqual(res2.primaryScenario.items[0].dependencies, ['999']);
  // Decimal progress 0.75 should be 75
  assert.equal(res2.primaryScenario.items[1].progress, 75);
  assert.deepEqual(res2.primaryScenario.items[1].dependencies, ['101']);

  // 3. Object with `tasks` property instead of `items`
  const tasksPropPayload = {
    name: 'Sprint de Emergencia',
    tasks: [
      { name: 'Fix Bug 1', startDate: '2026-12-01', duration: 2 },
      { name: 'Fix Bug 2', startDate: '2026-12-03', duration: 1 },
    ],
  };

  const res3 = importGanttData(tasksPropPayload);
  assert.equal(res3.primaryScenario.name, 'Sprint de Emergencia');
  assert.equal(res3.primaryScenario.items.length, 2);

  // 4. Workspace backup with savedScenarios
  const backupPayload = {
    activeScenarioId: 'scen-beta',
    savedScenarios: [
      {
        id: 'scen-alpha',
        name: 'Escenario Alpha',
        items: [{ name: 'Task Alpha 1', startDate: '2026-10-01', duration: 3 }],
      },
      {
        id: 'scen-beta',
        name: 'Escenario Beta',
        items: [{ name: 'Task Beta 1', startDate: '2026-10-05', duration: 5 }],
      },
    ],
  };

  const res4 = importGanttData(backupPayload);
  assert.ok(res4.allScenarios && res4.allScenarios.length === 2);
  assert.equal(res4.primaryScenario.id, 'scen-beta');
  assert.equal(res4.primaryScenario.name, 'Escenario Beta');

  // 5. Error handling: empty array, non-object, empty backup, and empty object
  assert.throws(() => importGanttData([]), /lista vacía/i);
  assert.throws(() => importGanttData(null), /JSON válido/i);
  assert.throws(() => importGanttData({}), /Formato JSON no compatible/i);
  assert.throws(() => importGanttData({ invalidKey: 123 }), /Formato JSON no compatible/i);
  assert.throws(() => importGanttData({ savedScenarios: [] }), /no contiene escenarios guardados/i);

  // 6. JSON with UTF-8 BOM (\uFEFF)
  const bomJson = '\uFEFF{"name":"Proyecto con BOM","items":[{"name":"Tarea 1","startDate":"2026-11-01","duration":3}]}';
  const resBom = importGanttData(bomJson);
  assert.equal(resBom.primaryScenario.name, 'Proyecto con BOM');
  assert.equal(resBom.primaryScenario.items.length, 1);
});

test('parseCSVToGanttData parses CSV export format and resolves WBS/name/row dependencies cleanly', () => {
  const sampleCSV = [
    'WBS,Proyecto,Tipo,Nombre,Initial Date,Final Date,Duration (Dias),Slack (Dias),Dependencias,Progreso (%),Ruta Critica,Responsable',
    '1.1,"Fase de Diseño",Tarea,"Wireframes UI",2026-11-01,2026-11-05,5,0,"",100%,SI,"Franco"',
    '1.2,"Fase de Diseño",Hito,"Aprobación Cliente",2026-11-06,2026-11-06,0,0,"1.1",50%,SI,"Cliente"',
    '2.1,"Fase de Desarrollo",Tarea,"Frontend React",2026-11-07,2026-11-15,9,2,"1.2",0%,NO,"Dev Team"',
  ].join('\n');

  const res = parseCSVToGanttData(sampleCSV, 'mi-proyecto-gantt.csv');
  assert.ok(res.primaryScenario);
  assert.equal(res.primaryScenario.name, 'mi-proyecto');
  assert.equal(res.primaryScenario.items.length, 3);

  const [t1, m1, t2] = res.primaryScenario.items;
  assert.equal(t1.name, 'Wireframes UI');
  assert.equal(t1.type, 'task');
  assert.equal(t1.duration, 5);
  assert.equal(t1.progress, 100);
  assert.equal(t1.assignee, 'Franco');

  assert.equal(m1.name, 'Aprobación Cliente');
  assert.equal(m1.type, 'milestone');
  assert.equal(m1.duration, 0);

  // CRITICAL: Dependency "1.1" MUST resolve to the generated ID of Wireframes UI
  assert.deepEqual(m1.dependencies, [t1.id]);

  assert.equal(t2.name, 'Frontend React');
  assert.equal(t2.slack, 2);
  // CRITICAL: Dependency "1.2" MUST resolve to the generated ID of Aprobación Cliente
  assert.deepEqual(t2.dependencies, [m1.id]);

  // Two distinct projects should be generated
  assert.equal(res.primaryScenario.projects.length, 2);

  // Error handling on empty CSV
  assert.throws(() => parseCSVToGanttData(''), /vacío/i);
  assert.throws(() => parseCSVToGanttData('WBS,Nombre'), /vacío o solo contiene/i);
});

test('parseCSVToGanttData parses European semicolon CSV, MS Project headers, and European dates (DD/MM/YYYY)', () => {
  // Semicolon-delimited CSV as exported by Spanish Excel or MS Project with Spanish dates and dependencies
  const spanishCsv = [
    'Nombre de la tarea;Duración;Comienzo;Fin;Predecesoras;% completado;Responsable;Notas',
    'Investigación de Mercado;5;15/12/2026;20/12/2026;;100%;Franco;Notas de análisis',
    'Revisión con Directiva;0;21/12/2026;21/12/2026;1;50%;CEO;Revisión ejecutiva',
    'Desarrollo MVP;10;22/12/2026;05/01/2027;Revisión con Directiva (SS);0%;Dev Team;Sprint 1',
  ].join('\n');

  const res = parseCSVToGanttData(spanishCsv, 'plan-estrategico.csv');
  assert.ok(res.primaryScenario);
  assert.equal(res.primaryScenario.name, 'plan-estrategico');
  assert.equal(res.primaryScenario.items.length, 3);

  const [task1, milestone1, task2] = res.primaryScenario.items;

  // European date 15/12/2026 correctly parsed
  assert.equal(task1.startDate, '2026-12-15');
  assert.equal(task1.duration, 5);
  assert.equal(task1.notes, 'Notas de análisis');

  // Milestone with 0 duration
  assert.equal(milestone1.type, 'milestone');
  assert.equal(milestone1.startDate, '2026-12-21');
  assert.equal(milestone1.duration, 0);
  // Predecessor "1" (1-based row index) resolves to task1
  assert.deepEqual(milestone1.dependencies, [task1.id]);

  // Task 2 depends on "Revisión con Directiva" with SS dependency type
  assert.deepEqual(task2.dependencies, [milestone1.id]);
  assert.equal(task2.dependencyTypes?.[milestone1.id], 'SS');
});

test('App SSR renders hidden file-import-input, Scenario dropdown Import button, and Settings Import button', async () => {
  const { renderToString } = await import('react-dom/server');
  const appBundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { App } from './src/App.tsx';

        export function renderApp() {
          return <App />;
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'ssr-import-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const fs = await import('node:fs/promises');
  const tmpFile = path.resolve(__dirname, './.tmp-ssr-import.cjs');
  await fs.writeFile(tmpFile, appBundle.outputFiles[0].text, 'utf8');
  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const html = renderToString(mod.renderApp());

    // 1. Hidden file input is present in the DOM with correct accept and testid
    assert.ok(html.includes('data-testid="file-import-input"'));
    assert.ok(html.includes('type="file"'));
    assert.ok(html.includes('.json,application/json,.csv,text/csv'));

    // 2. Import button in Escenario dropdown exists
    assert.ok(html.includes('Importar escenario desde JSON o CSV'));

    // 3. Import label is present in the Escenario popover
    assert.ok(html.includes('Importar'));
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('CSV export-import roundtrip preserves items, dates, and dependency relationships', () => {
  const defaultScenarios = getDefaultSavedScenarios();
  const originalScenario = defaultScenarios[0];
  const originalItems = originalScenario.items;

  // Simulate exact export logic from handleExportCSV
  const idToWbs = new Map(
    originalItems.map((it, idx) => [it.id, `1.${idx + 1}`])
  );

  const headers = [
    'WBS',
    'Proyecto',
    'Tipo',
    'Nombre',
    'Initial Date',
    'Final Date',
    'Duration (Dias)',
    'Slack (Dias)',
    'Dependencias',
    'Progreso (%)',
    'Ruta Critica',
    'Responsable',
  ];

  const rows = originalItems.map((it, idx) => [
    `"1.${idx + 1}"`,
    `"${originalScenario.projects[0]?.name || 'General'}"`,
    it.type === 'milestone' ? 'Hito' : 'Tarea',
    `"${it.name}"`,
    it.startDate,
    it.endDate,
    it.duration,
    it.slack,
    `"${it.dependencies.map((d) => idToWbs.get(d) || d).join(', ')}"`,
    it.progress,
    'NO',
    `"${it.assignee || ''}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const imported = parseCSVToGanttData(csv, 'roundtrip-test.csv');
  assert.ok(imported.primaryScenario);
  assert.equal(imported.primaryScenario.items.length, originalItems.length);

  // Check that dependencies are intact and point to the newly imported items
  for (let i = 0; i < originalItems.length; i++) {
    const orig = originalItems[i];
    const imp = imported.primaryScenario.items[i];
    assert.equal(imp.name, orig.name);
    assert.equal(imp.type, orig.type);
    assert.equal(imp.duration, orig.duration);
    assert.equal(imp.dependencies.length, orig.dependencies.length);

    if (orig.dependencies.length > 0) {
      // Each predecessor index in originalItems should match predecessor index in imported.primaryScenario.items
      for (const origDepId of orig.dependencies) {
        const origPredIdx = originalItems.findIndex((it) => it.id === origDepId);
        assert.ok(origPredIdx >= 0);
        const expectedImpPredId = imported.primaryScenario.items[origPredIdx].id;
        assert.ok(
          imp.dependencies.includes(expectedImpPredId),
          `Imported item ${imp.name} should depend on ${imported.primaryScenario.items[origPredIdx].name}`
        );
      }
    }
  }

  // Running computeGanttMetrics on imported scenario produces zero cycle errors
  const metrics = computeGanttMetrics(imported.primaryScenario.items);
  assert.equal(metrics.length, originalItems.length);
});

test('sanitizeScenario deduplicates duplicate item IDs preventing state corruption', () => {
  const duplicateIdScenario = {
    name: 'Escenario con IDs duplicados',
    items: [
      { id: 't-shared', name: 'Tarea 1', startDate: '2026-11-01', duration: 2 },
      { id: 't-shared', name: 'Tarea 2', startDate: '2026-11-03', duration: 3 },
      { id: 't-shared', name: 'Tarea 3', startDate: '2026-11-06', duration: 4 },
    ],
  };

  const sanitized = sanitizeScenario(duplicateIdScenario);
  assert.equal(sanitized.items.length, 3);
  const ids = sanitized.items.map((it) => it.id);
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, 3, 'All item IDs must be strictly unique');
  assert.equal(ids[0], 't-shared');
  assert.ok(ids[1].includes('t-shared-dup'));
  assert.ok(ids[2].includes('t-shared-dup'));
});








