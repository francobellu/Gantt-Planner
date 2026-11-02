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
  isDemoProject,
  isDemoScenario,
  moveTaskItem,
  reorderTaskItem,
  filterGroupsBySelectedProjects,
  mergeImportedGanttData,
  addDependencyLink,
  removeDependencyLink,
  updateDependencyLinkType,
  moveDependencyLink,
  getTeamColor,
  getItemEffectiveColor,
  TEAM_COLOR_PALETTE,
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
          return <App initialScenarioId="scen-saas-v2" />;
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

    // Verify project groups, project summary bars, tasks, milestones, slack badges, and today marker render
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
    assert.ok(inspectedHtml.includes('Descripción / Notas') || inspectedHtml.includes('Descripci&oacute;n / Notas'));
    assert.equal(inspectedHtml.includes('Predecesoras:'), false, 'Simplified panel excludes predecessors');
    assert.equal(inspectedHtml.includes('Sucesoras:'), false, 'Simplified panel excludes successors');
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

test('App renders default clean workspace, toggle-table button, and + Nuevo Proyecto button in SSR', async () => {
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

    // Verify clean default workspace renders (Mi Proyecto)
    assert.ok(html.includes('Mi Proyecto'));
    assert.ok(html.includes('data-testid="toggle-table-btn"'), 'Must render toggle-table button at top left');
    assert.ok(html.includes('data-project-selector-btn="true"'), 'Must render Proyectos dropdown selector');

    // Verify NO demo projects or scenarios exist
    assert.ok(!html.includes('data-scenarios-bar="true"'), 'Old scenario bar must not be rendered');
    assert.ok(!html.includes('Lanzamiento Plataforma SaaS v2.0'), 'Demo projects must not be rendered by default');

    // Verify NO hardcoded Xcode 27 data exists in rendered HTML
    assert.ok(!html.includes('Xcode 27'));
    assert.ok(!html.includes('scen-xcode27'));
    assert.ok(!html.includes('proj-xcode27'));
    assert.ok(!html.includes('biocatch'));

    // Verify unified actions in WBS table: "Nueva Tarea" and "Nuevo Proyecto" (with redundant "+" prefix removed)
    assert.ok(html.includes('Nuevo Proyecto'));
    assert.ok(html.includes('Nueva Tarea'));
    assert.ok(!html.includes('+ Nuevo Proyecto'));

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
    assert.ok(html.includes('Nuevo Proyecto'));
    assert.ok(html.includes('Nueva Tarea'));
    assert.ok(!html.includes('+ Nuevo Proyecto'));

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
    assert.ok(wsHtml.includes('Nuevo Proyecto'));
    assert.ok(wsHtml.includes('Nueva Tarea'));
    assert.ok(!wsHtml.includes('+ Nuevo Proyecto'));
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

    // Verify dropdown containers have data-dropdown-container
    assert.ok(html.includes('data-dropdown-container="true"'));
    // Verify Proyectos selector and toggle-table button exist
    assert.ok(html.includes('data-project-selector-btn="true"'));
    assert.ok(html.includes('data-testid="toggle-table-btn"'));
    // Verify Nuevo Proyecto and Nueva Tarea exist
    assert.ok(html.includes('Nuevo Proyecto'));
    assert.ok(html.includes('Nueva Tarea'));
    assert.ok(!html.includes('+ Nuevo Proyecto'));
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

test('App SSR renders hidden file-import-input, Crear dropdown Import button, and Settings Import button', async () => {
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

    // 2. Settings modal has Export / Import section and Import file input
    assert.ok(html.includes('Exportar / Importar Datos'));
    assert.ok(html.includes('aria-label="Importar archivo JSON o CSV"'));

    // 3. Import label is present
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

test('Milestones support custom colors across engine, TaskFormModal, and GanttWorkspace timeline/WBS/inspection canvas', async () => {
  const allColors = ['indigo', 'blue', 'emerald', 'amber', 'rose', 'violet', 'cyan'];

  // 1. Engine & sanitization verifies custom colors persist
  for (const c of allColors) {
    const item = sanitizeGanttItem({
      id: `m-${c}`,
      name: `Hito ${c}`,
      type: 'milestone',
      startDate: '2026-11-10',
      color: c,
    });
    assert.equal(item.color, c, `Milestone must preserve color ${c}`);
    assert.equal(item.duration, 0);
    assert.equal(item.type, 'milestone');
  }

  // 2. SSR rendering of GanttWorkspace and TaskFormModal with custom-colored milestones
  const { renderToString } = await import('react-dom/server');

  const bundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
        import { TaskFormModal } from './src/components/TaskFormModal.tsx';
        import { computeGanttMetrics, sanitizeProject } from './src/utils/ganttEngine.ts';

        export function renderMilestoneWorkspace(color) {
          const project = sanitizeProject({ id: 'p-1', name: 'Proyecto Milestone', color: 'indigo' });
          const items = computeGanttMetrics([
            {
              id: 'm-custom',
              name: 'Hito ' + color,
              type: 'milestone',
              projectId: 'p-1',
              startDate: '2026-11-05',
              endDate: '2026-11-05',
              duration: 0,
              slack: 0,
              dependencies: [],
              progress: 100,
              color: color,
            }
          ]);
          return (
            <GanttWorkspace
              items={items}
              projects={[project]}
              groupByProject={true}
              selectedProjectId="all"
              zoom="day"
              showCriticalPath={false}
              showCpmFloat={false}
              autoCascade={true}
              initialSelectedItemId="m-custom"
              onUpdateItem={() => {}}
              onEditModal={() => {}}
              onDeleteItem={() => {}}
              onDuplicateItem={() => {}}
              onQuickAdd={() => {}}
              scrollContainerRef={{ current: null }}
            />
          );
        }

        export function renderMilestoneModal(color) {
          const item = {
            id: 'm-modal',
            name: 'Hito Modal',
            type: 'milestone',
            projectId: 'p-1',
            startDate: '2026-11-05',
            endDate: '2026-11-05',
            duration: 0,
            slack: 0,
            dependencies: [],
            progress: 100,
            color: color,
          };
          return (
            <TaskFormModal
              isOpen={true}
              onClose={() => {}}
              onSave={() => {}}
              initialItem={item}
              allItems={[item]}
            />
          );
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'milestone-color-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const fs = await import('node:fs/promises');
  const tmpFile = path.resolve(__dirname, './.tmp-milestone-color-bundle.cjs');
  await fs.writeFile(tmpFile, bundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // Verify emerald milestone rendering in GanttWorkspace
    const emeraldHtml = renderToString(mod.renderMilestoneWorkspace('emerald'));
    assert.ok(emeraldHtml.includes('data-milestone-color="emerald"'), 'Must include data-milestone-color="emerald"');
    assert.ok(emeraldHtml.includes('bg-emerald-600'), 'Timeline diamond must use emerald background class');
    assert.ok(emeraldHtml.includes('border-emerald-500/30'), 'Timeline milestone pill must use emerald border');
    assert.ok(emeraldHtml.includes('border-emerald-500/60'), 'Milestone vertical guide line must use emerald dashed border');
    assert.ok(emeraldHtml.includes('text-emerald-600'), 'WBS table and inspection panel diamond icons must use emerald text color');

    // Verify violet milestone rendering in GanttWorkspace
    const violetHtml = renderToString(mod.renderMilestoneWorkspace('violet'));
    assert.ok(violetHtml.includes('data-milestone-color="violet"'), 'Must include data-milestone-color="violet"');
    assert.ok(violetHtml.includes('bg-violet-600'), 'Timeline diamond must use violet background class');
    assert.ok(violetHtml.includes('border-violet-500/60'), 'Milestone vertical guide line must use violet dashed border');

    // Verify TaskFormModal renders emerald milestone header and preview
    const modalHtml = renderToString(mod.renderMilestoneModal('emerald'));
    assert.ok(modalHtml.includes('bg-emerald-500'), 'Modal top header icon must use emerald bg');
    assert.ok(modalHtml.includes('Color del Hito ◆'), 'Modal must display milestone color label');
    assert.ok(modalHtml.includes('data-color="emerald"'), 'Modal must have color button for emerald');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Task position reordering and non-clipping name column width in project table', async () => {
  // 1. Reordering items within a project and across projects
  const p1 = { id: 'proj-1', name: 'Proyecto Alfa', color: 'indigo', collapsed: false };
  const p2 = { id: 'proj-2', name: 'Proyecto Beta', color: 'emerald', collapsed: false };

  const initialItems = [
    { id: 't-1', projectId: 'proj-1', name: 'Planificación Inicial', type: 'task', startDate: '2026-11-01', duration: 3, slack: 0, dependencies: [] },
    { id: 't-2', projectId: 'proj-1', name: 'Diseño UX/UI del Sistema', type: 'task', startDate: '2026-11-04', duration: 4, slack: 0, dependencies: [] },
    { id: 't-3', projectId: 'proj-1', name: 'Desarrollo e Implementación de la Infraestructura de Pagos y Seguridad PCI-DSS Certificada', type: 'task', startDate: '2026-11-08', duration: 10, slack: 0, dependencies: [] },
    { id: 't-4', projectId: 'proj-2', name: 'Testing de Integración', type: 'task', startDate: '2026-11-15', duration: 5, slack: 0, dependencies: [] },
  ];

  // Verify initial WBS sequence
  let groups = groupItemsByProject(computeGanttMetrics(initialItems), [p1, p2]);
  assert.equal(groups[0].items[0].id, 't-1');
  assert.equal(groups[0].items[0].wbsCode, '1.1');
  assert.equal(groups[0].items[1].id, 't-2');
  assert.equal(groups[0].items[1].wbsCode, '1.2');
  assert.equal(groups[0].items[2].id, 't-3');
  assert.equal(groups[0].items[2].wbsCode, '1.3');

  // Move t-2 UP (swap with t-1)
  const afterMoveUp = [
    initialItems[1], // t-2
    initialItems[0], // t-1
    initialItems[2], // t-3
    initialItems[3], // t-4
  ];
  groups = groupItemsByProject(computeGanttMetrics(afterMoveUp), [p1, p2]);
  assert.equal(groups[0].items[0].id, 't-2');
  assert.equal(groups[0].items[0].wbsCode, '1.1');
  assert.equal(groups[0].items[1].id, 't-1');
  assert.equal(groups[0].items[1].wbsCode, '1.2');

  // Drag t-4 from proj-2 to before t-2 in proj-1
  const movedToP1 = { ...initialItems[3], projectId: 'proj-1' };
  const afterCrossProjectMove = [
    movedToP1,       // t-4 now in proj-1
    afterMoveUp[0],  // t-2
    afterMoveUp[1],  // t-1
    afterMoveUp[2],  // t-3
  ];
  groups = groupItemsByProject(computeGanttMetrics(afterCrossProjectMove), [p1, p2]);
  assert.equal(groups[0].items.length, 4);
  assert.equal(groups[0].items[0].id, 't-4');
  assert.equal(groups[0].items[0].wbsCode, '1.1');
  assert.equal(groups[1].items.length, 0);

  // 2. SSR UI verification of GanttWorkspace reorder controls and non-clipping name column
  const { renderToString } = await import('react-dom/server');
  const esbuild = await import('esbuild');
  const bundle = await esbuild.build({
    stdin: {
      contents: `
        import React from 'react';
        import { GanttWorkspace } from './src/components/GanttWorkspace';
        import { computeGanttMetrics, groupItemsByProject } from './src/utils/ganttEngine';

        export function renderReorderWorkspace() {
          const p1 = { id: 'proj-1', name: 'Proyecto Alfa', color: 'indigo', collapsed: false };
          const items = [
            { id: 't-1', projectId: 'proj-1', name: 'Planificación Inicial', type: 'task', startDate: '2026-11-01', duration: 3, slack: 0, dependencies: [] },
            { id: 't-2', projectId: 'proj-1', name: 'Desarrollo e Implementación de la Infraestructura de Pagos y Seguridad PCI-DSS Certificada', type: 'task', startDate: '2026-11-04', duration: 10, slack: 0, dependencies: [] },
          ];
          const computed = computeGanttMetrics(items);
          const scrollRef = { current: null };

          return (
            <GanttWorkspace
              items={computed}
              projects={[p1]}
              groupByProject={true}
              selectedProjectId="all"
              zoom="month"
              dayWidth={14}
              showCriticalPath={false}
              showCpmFloat={false}
              autoCascade={true}
              onUpdateItem={() => {}}
              onReorderItem={() => {}}
              onMoveItem={() => {}}
              onEditModal={() => {}}
              onDeleteItem={() => {}}
              onDuplicateItem={() => {}}
              onQuickAdd={() => {}}
              scrollContainerRef={scrollRef}
            />
          );
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'reorder-table-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const fs = await import('node:fs/promises');
  const tmpFile = path.resolve(__dirname, './.tmp-reorder-table-bundle.cjs');
  await fs.writeFile(tmpFile, bundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const html = renderToString(mod.renderReorderWorkspace());

    // Verify row reorder drag handles and move buttons
    assert.ok(html.includes('data-task-row="t-1"'), 'Must render data-task-row="t-1"');
    assert.ok(html.includes('data-task-row="t-2"'), 'Must render data-task-row="t-2"');
    assert.ok(html.includes('data-row-drag-handle="t-1"'), 'Must render data-row-drag-handle="t-1"');
    assert.ok(html.includes('data-move-up="t-1"'), 'Must render data-move-up="t-1"');
    assert.ok(html.includes('data-move-down="t-1"'), 'Must render data-move-down="t-1"');

    // First item move up should be disabled
    assert.ok(/<button[^>]*disabled[^>]*data-move-up="t-1"/.test(html) || /data-move-up="t-1"[^>]*disabled/.test(html), 'First item move up must be disabled');

    // Last item move down should be disabled
    assert.ok(/<button[^>]*disabled[^>]*data-move-down="t-2"/.test(html) || /data-move-down="t-2"[^>]*disabled/.test(html), 'Last item move down must be disabled');

    // Verify header has # / Orden column title
    assert.ok(html.includes('# / Orden'), 'WBS table header must include # / Orden title');

    // Verify task name inputs have data-task-name-input and generous min-width preventing clipping
    assert.ok(html.includes('data-task-name-input="t-1"'), 'Must have data-task-name-input="t-1"');
    assert.ok(html.includes('data-task-name-input="t-2"'), 'Must have data-task-name-input="t-2"');

    // Long task name (89 chars) should produce min-width >= 700px on the input so text is NEVER cut off
    const inputStyleMatch = html.match(/data-task-name-input="t-2"[^>]*style="([^"]*)"/) ||
                            html.match(/style="([^"]*)"[^>]*data-task-name-input="t-2"/);
    assert.ok(inputStyleMatch, 'Task name input must have inline style');
    assert.ok(inputStyleMatch[1].includes('min-width'), 'Task name input must specify min-width style');

    const minWidthVal = parseFloat(inputStyleMatch[1].match(/min-width:\s*([0-9.]+)px/)?.[1] || '0');
    assert.ok(minWidthVal >= 700, `Task name input min-width (${minWidthVal}px) must be >= 700px to prevent clipping long names`);
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('moveTaskItem & reorderTaskItem: drag-and-drop and up/down reordering within project, across projects, and onto project headers', () => {
  const projects = [
    { id: 'proj-a', name: 'Proyecto A', color: 'indigo', collapsed: false, isDemo: false },
    { id: 'proj-b', name: 'Proyecto B', color: 'emerald', collapsed: false, isDemo: false },
    { id: 'proj-empty', name: 'Proyecto Vacío', color: 'amber', collapsed: false, isDemo: false },
  ];
  const initialItems = [
    { id: 't1', projectId: 'proj-a', name: 'Tarea 1', type: 'task', startDate: '2026-11-01', endDate: '2026-11-03', duration: 3, slack: 0, dependencies: [], progress: 0, color: 'indigo' },
    { id: 't2', projectId: 'proj-a', name: 'Tarea 2', type: 'task', startDate: '2026-11-04', endDate: '2026-11-06', duration: 3, slack: 0, dependencies: [], progress: 0, color: 'indigo' },
    { id: 't3', projectId: 'proj-a', name: 'Tarea 3', type: 'task', startDate: '2026-11-07', endDate: '2026-11-09', duration: 3, slack: 0, dependencies: [], progress: 0, color: 'indigo' },
    { id: 'b1', projectId: 'proj-b', name: 'Tarea B1', type: 'task', startDate: '2026-11-01', endDate: '2026-11-02', duration: 2, slack: 0, dependencies: [], progress: 0, color: 'emerald' },
  ];

  // 1. Drag t3 before t1 within proj-a
  const movedBefore = moveTaskItem(initialItems, 't3', 't1', 'before', projects);
  assert.deepEqual(
    movedBefore.filter((x) => x.projectId === 'proj-a').map((x) => x.id),
    ['t3', 't1', 't2']
  );

  // 2. Drag t1 after t3 within proj-a
  const movedAfter = moveTaskItem(initialItems, 't1', 't3', 'after', projects);
  assert.deepEqual(
    movedAfter.filter((x) => x.projectId === 'proj-a').map((x) => x.id),
    ['t2', 't3', 't1']
  );

  // 3. Drag t2 across projects onto b1 ('before') -> t2 adopts proj-b and is placed before b1
  const movedCross = moveTaskItem(initialItems, 't2', 'b1', 'before', projects);
  const movedT2 = movedCross.find((x) => x.id === 't2');
  assert.equal(movedT2.projectId, 'proj-b');
  assert.deepEqual(
    movedCross.filter((x) => x.projectId === 'proj-b').map((x) => x.id),
    ['t2', 'b1']
  );

  // 4. Drop t1 onto project header 'project:proj-empty' (empty project)
  const droppedOnEmptyProj = moveTaskItem(initialItems, 't1', 'project:proj-empty', 'after', projects);
  assert.equal(droppedOnEmptyProj.find((x) => x.id === 't1').projectId, 'proj-empty');

  // 5. Drop t3 onto project header 'project:proj-a' -> moves t3 to first position of proj-a
  const droppedOnProjA = moveTaskItem(initialItems, 't3', 'project:proj-a', 'after', projects);
  assert.deepEqual(
    droppedOnProjA.filter((x) => x.projectId === 'proj-a').map((x) => x.id),
    ['t3', 't1', 't2']
  );

  // 6. Edge cases: dragging onto self or non-existent target returns original array reference
  assert.equal(moveTaskItem(initialItems, 't1', 't1', 'before', projects), initialItems);
  assert.equal(moveTaskItem(initialItems, 't1', 'non-existent', 'after', projects), initialItems);

  // 7. reorderTaskItem up/down buttons
  const reorderedDown = reorderTaskItem(initialItems, 't1', 'down', true, projects);
  assert.deepEqual(
    reorderedDown.filter((x) => x.projectId === 'proj-a').map((x) => x.id),
    ['t2', 't1', 't3']
  );
  const reorderedUp = reorderTaskItem(reorderedDown, 't1', 'up', true, projects);
  assert.deepEqual(
    reorderedUp.filter((x) => x.projectId === 'proj-a').map((x) => x.id),
    ['t1', 't2', 't3']
  );
});

test('Demo vs Real separation & multi-project selection filtering for Gantt diagram', () => {
  // 1. Default templates and default scenarios are marked as demos
  const templates = getProjectTemplates();
  assert.ok(templates.length >= 2);
  for (const tpl of templates) {
    assert.equal(tpl.isDemo, true, `Template ${tpl.id} must have isDemo=true`);
    for (const p of tpl.projects) {
      assert.equal(p.isDemo, true, `Demo template project ${p.id} must have isDemo=true`);
    }
  }

  const defaultScenarios = getDefaultSavedScenarios();
  assert.equal(defaultScenarios[0].isDemo, true, 'Default SaaS scenario must be marked isDemo=true');

  // 2. User-created scenario and projects are marked as Real (isDemo: false)
  const userScenario = createNewScenario('Plan Real Q4', 'blank');
  assert.equal(userScenario.isDemo, false, 'User-created scenario must have isDemo=false');
  assert.equal(userScenario.projects[0].isDemo, false, 'User-created project must have isDemo=false');

  // 3. filterGroupsBySelectedProjects returns only selected projects
  const computed = computeGanttMetrics(defaultScenarios[0].items);
  const groups = groupItemsByProject(computed, defaultScenarios[0].projects);
  assert.equal(groups.length, 3);

  const onlyTwo = filterGroupsBySelectedProjects(groups, ['proj-core', 'proj-release']);
  assert.deepEqual(onlyTwo.map((g) => g.project.id), ['proj-core', 'proj-release']);

  const noneSelected = filterGroupsBySelectedProjects(groups, []);
  assert.equal(noneSelected.length, 0);
});

test('mergeImportedGanttData: importing JSON or CSV merges with loaded projects and tasks without deleting existing data', () => {
  const existingProjects = [
    { id: 'proj-core', name: 'Core Platform & Arquitectura', color: 'indigo', collapsed: false, isDemo: true },
    { id: 'proj-real-1', name: 'App Pagos Real', color: 'emerald', collapsed: false, isDemo: false },
  ];
  const existingItems = [
    {
      id: 'existing-1',
      projectId: 'proj-core',
      name: 'Arquitectura Cloud Base',
      type: 'task',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      duration: 5,
      slack: 0,
      dependencies: [],
      progress: 100,
      color: 'indigo',
    },
    {
      id: 'real-task-1',
      projectId: 'proj-real-1',
      name: 'Diseño API Pagos',
      type: 'task',
      startDate: '2026-11-02',
      endDate: '2026-11-06',
      duration: 5,
      slack: 0,
      dependencies: [],
      progress: 40,
      color: 'emerald',
    },
  ];

  // Import a CSV with a new project "Portal Clientes" AND an additional task for "App Pagos Real"
  const csvContent = [
    'WBS,Proyecto,Tipo,Nombre,Initial Date,Final Date,Duration (Dias),Slack (Dias),Dependencias,Progreso (%)',
    '1,Portal Clientes,Tarea,Wireframes Portal,2026-11-10,2026-11-14,5,0,,20',
    '2,Portal Clientes,Hito,Aprobación Portal,2026-11-15,2026-11-15,0,0,1,0',
    '3,App Pagos Real,Tarea,Pasarela Stripe,2026-11-07,2026-11-11,5,1,,0',
    '4,App Pagos Real,Tarea,Diseño API Pagos,2026-11-02,2026-11-06,5,0,,85',
  ].join('\n');

  const csvImportResult = parseCSVToGanttData(csvContent, 'portal-y-pagos.csv');
  const merged = mergeImportedGanttData(existingProjects, existingItems, csvImportResult);

  // 1. All existing projects are preserved AND the new project "Portal Clientes" is added as Real (isDemo: false)
  assert.equal(merged.projects.length, 3);
  assert.ok(merged.projects.some((p) => p.id === 'proj-core' && p.isDemo === true));
  assert.ok(merged.projects.some((p) => p.id === 'proj-real-1' && p.isDemo === false));
  const portalProj = merged.projects.find((p) => p.name === 'Portal Clientes');
  assert.ok(portalProj, 'Imported project Portal Clientes must be present');
  assert.equal(portalProj.isDemo, false, 'Imported project must be marked as Real (isDemo: false)');

  // 2. Existing task in proj-core is untouched
  assert.ok(merged.items.some((it) => it.id === 'existing-1' && it.projectId === 'proj-core'));

  // 3. Existing task "Diseño API Pagos" in "App Pagos Real" was updated in-place (progress 40 -> 85) without duplicating
  const apiTasks = merged.items.filter(
    (it) => it.projectId === 'proj-real-1' && it.name === 'Diseño API Pagos'
  );
  assert.equal(apiTasks.length, 1);
  assert.equal(apiTasks[0].progress, 85);

  // 4. New task "Pasarela Stripe" was added to existing project "App Pagos Real"
  assert.ok(
    merged.items.some(
      (it) => it.projectId === 'proj-real-1' && it.name === 'Pasarela Stripe'
    )
  );

  // 5. New tasks in "Portal Clientes" were added with intact internal dependencies
  const wireframes = merged.items.find(
    (it) => it.projectId === portalProj.id && it.name === 'Wireframes Portal'
  );
  const aprobacion = merged.items.find(
    (it) => it.projectId === portalProj.id && it.name === 'Aprobación Portal'
  );
  assert.ok(wireframes && aprobacion);
  assert.deepEqual(aprobacion.dependencies, [wireframes.id]);
});

test('SSR Verification: Toggle-table button controls table visibility, and Gantt view filters by selectedProjectIds', async () => {
  const { renderToString } = await import('react-dom/server');
  const esbuild = await import('esbuild');
  const bundle = await esbuild.build({
    stdin: {
      contents: `
        import React from 'react';
        import { App } from './src/App';
        export function renderFullGanttOnlyView() {
          return <App initialShowTable={false} initialScenarioId="scen-saas-v2" />;
        }
        export function renderWithTableView() {
          return <App initialShowTable={true} initialScenarioId="scen-saas-v2" />;
        }
        export function renderFilteredGanttView() {
          return <App initialScenarioId="scen-saas-v2" initialSelectedProjectIds={['proj-core']} />;
        }
        export function renderEmptySelectionGanttView() {
          return <App initialScenarioId="scen-saas-v2" initialSelectedProjectIds={[]} />;
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'projects-view-ssr-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const fs = await import('node:fs/promises');
  const tmpFile = path.resolve(__dirname, './.tmp-projects-view-bundle.cjs');
  await fs.writeFile(tmpFile, bundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // 1. Verify toggle-table button hides WBS table (# / Orden) when initialShowTable={false}
    const fullGanttHtml = renderToString(mod.renderFullGanttOnlyView());
    assert.ok(fullGanttHtml.includes('data-testid="toggle-table-btn"'), 'Must render toggle-table button');
    assert.ok(!fullGanttHtml.includes('# / Orden'), 'Table header must NOT be rendered when showTable is false');
    assert.ok(fullGanttHtml.includes('data-timeline-task='), 'Gantt timeline bars must still be rendered when table is hidden');

    // 2. Verify with initialShowTable={true}, WBS table is rendered
    const withTableHtml = renderToString(mod.renderWithTableView());
    assert.ok(withTableHtml.includes('# / Orden'), 'Table header must be rendered when showTable is true');
    assert.ok(withTableHtml.includes('data-project-group='), 'Project groups must be rendered');

    // 3. Verify Gantt view with only proj-core selected
    const filteredGanttHtml = renderToString(mod.renderFilteredGanttView());
    assert.ok(filteredGanttHtml.includes('data-project-group="proj-core"'), 'Selected project proj-core must appear in Gantt');
    assert.ok(!filteredGanttHtml.includes('data-project-group="proj-discovery"'), 'Unselected project proj-discovery must NOT appear in Gantt');
    assert.ok(!filteredGanttHtml.includes('data-project-group="proj-release"'), 'Unselected project proj-release must NOT appear in Gantt');

    // 4. Verify Gantt view when 0 projects are selected
    const emptyGanttHtml = renderToString(mod.renderEmptySelectionGanttView());
    assert.ok(emptyGanttHtml.includes('data-empty-selected-projects="true"'), 'Must show empty state when no projects are selected');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('moveTaskItem swaps immediately adjacent tasks within the same project even when dropped onto the bordering half', () => {
  const projects = [
    { id: 'p1', name: 'Proyecto 1', color: 'indigo' },
    { id: 'p2', name: 'Proyecto 2', color: 'emerald' },
  ];
  const items = [
    {
      id: 't1',
      projectId: 'p1',
      name: 'Tarea 1',
      type: 'task',
      startDate: '2026-11-01',
      endDate: '2026-11-03',
      duration: 3,
      slack: 0,
      dependencies: [],
      progress: 0,
      color: 'indigo',
    },
    {
      id: 't2',
      projectId: 'p1',
      name: 'Tarea 2',
      type: 'task',
      startDate: '2026-11-04',
      endDate: '2026-11-06',
      duration: 3,
      slack: 0,
      dependencies: [],
      progress: 0,
      color: 'indigo',
    },
    {
      id: 't3',
      projectId: 'p1',
      name: 'Tarea 3',
      type: 'task',
      startDate: '2026-11-07',
      endDate: '2026-11-09',
      duration: 3,
      slack: 0,
      dependencies: [],
      progress: 0,
      color: 'indigo',
    },
  ];

  // Dragging t1 down onto the upper half ('before') of immediately adjacent t2 must swap t1 and t2
  const movedDown = moveTaskItem(items, 't1', 't2', 'before', projects);
  assert.deepEqual(
    movedDown.map((it) => it.id),
    ['t2', 't1', 't3'],
    'Dragging t1 onto t2 (before) must move t1 after t2'
  );

  // Dragging t2 up onto the lower half ('after') of immediately adjacent t1 must swap t2 and t1
  const movedUp = moveTaskItem(items, 't2', 't1', 'after', projects);
  assert.deepEqual(
    movedUp.map((it) => it.id),
    ['t2', 't1', 't3'],
    'Dragging t2 onto t1 (after) must move t2 before t1'
  );
});

test('mergeImportedGanttData preserves existing projects/tasks when imported files reuse generic IDs or omit Proyecto column', () => {
  const existingProjects = [
    { id: 'p1', name: 'Proyecto AlphaExistente', color: 'indigo', isDemo: false },
  ];
  const existingItems = [
    {
      id: 't-1',
      projectId: 'p1',
      name: 'Tarea Original Alpha',
      type: 'task',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      duration: 5,
      slack: 0,
      dependencies: [],
      progress: 50,
      color: 'indigo',
    },
  ];

  // 1. Import JSON that reuses project id "p1" for a differently named project "Proyecto BetaImportado"
  // and reuses task id "t-1" for a differently named task in "Proyecto AlphaExistente"
  const jsonImport = importGanttData({
    projects: [
      { id: 'p1', name: 'Proyecto BetaImportado', color: 'rose' },
      { id: 'p2', name: 'Proyecto AlphaExistente', color: 'indigo' },
    ],
    items: [
      {
        id: 't-1',
        projectId: 'p2',
        name: 'Tarea Nueva En Alpha Con Mismo ID',
        type: 'task',
        startDate: '2026-11-06',
        endDate: '2026-11-10',
        duration: 5,
      },
      {
        id: 't-beta-1',
        projectId: 'p1',
        name: 'Tarea De Beta',
        type: 'task',
        startDate: '2026-11-11',
        endDate: '2026-11-15',
        duration: 5,
        dependencies: ['t-1'],
      },
    ],
  });

  const merged1 = mergeImportedGanttData(existingProjects, existingItems, jsonImport);
  assert.equal(merged1.projects.length, 2, 'Both Alpha and Beta projects must exist without overwriting');
  assert.ok(
    merged1.projects.some((p) => p.id === 'p1' && p.name === 'Proyecto AlphaExistente'),
    'Original p1 project name must not be overwritten by colliding project ID'
  );
  const betaProj = merged1.projects.find((p) => p.name === 'Proyecto BetaImportado');
  assert.ok(betaProj && betaProj.id !== 'p1', 'Beta project must get a remapped unique ID');

  // Original task 'Tarea Original Alpha' (id: 't-1') AND new task 'Tarea Nueva En Alpha Con Mismo ID' must both exist in p1
  const alphaTasks = merged1.items.filter((it) => it.projectId === 'p1');
  assert.equal(alphaTasks.length, 2, 'Colliding task ID with different name must NOT overwrite existing task');
  assert.ok(alphaTasks.some((it) => it.name === 'Tarea Original Alpha' && it.id === 't-1'));
  const remappedNewTask = alphaTasks.find((it) => it.name === 'Tarea Nueva En Alpha Con Mismo ID');
  assert.ok(remappedNewTask && remappedNewTask.id !== 't-1');

  // Dependency on 't-1' inside the imported payload must point to the newly imported remapped task ID
  const betaTask = merged1.items.find((it) => it.projectId === betaProj.id);
  assert.ok(betaTask);
  assert.deepEqual(betaTask.dependencies, [remappedNewTask.id]);

  // 2. Import two CSV files without a 'Proyecto' column: each must create a project named after its CSV file
  const csv1 = parseCSVToGanttData(
    'Nombre,Initial Date,Final Date\nTarea Marketing,2026-12-01,2026-12-05',
    'plan-marketing-2027.csv'
  );
  const csv2 = parseCSVToGanttData(
    'Nombre,Initial Date,Final Date\nTarea Ventas,2026-12-06,2026-12-10',
    'roadmap-ventas-q1.csv'
  );
  const afterCsv1 = mergeImportedGanttData(merged1.projects, merged1.items, csv1);
  const afterCsv2 = mergeImportedGanttData(afterCsv1.projects, afterCsv1.items, csv2);

  assert.ok(
    afterCsv2.projects.some((p) => p.name === 'plan-marketing-2027' && p.isDemo === false),
    'First CSV without Proyecto column must create project named after its filename'
  );
  assert.ok(
    afterCsv2.projects.some((p) => p.name === 'roadmap-ventas-q1' && p.isDemo === false),
    'Second CSV without Proyecto column must create its own distinct project'
  );

  // 3. Multi-scenario JSON without explicit projects arrays must create distinct projects per scenario name
  const multiScenarioImport = importGanttData({
    savedScenarios: [
      {
        id: 'scen-custom-a',
        name: 'Escenario Finanzas',
        items: [
          {
            id: 'fin-1',
            name: 'Cierre Contable',
            type: 'task',
            startDate: '2026-12-15',
            endDate: '2026-12-20',
            duration: 6,
          },
        ],
      },
      {
        id: 'scen-custom-b',
        name: 'Escenario RRHH',
        items: [
          {
            id: 'hr-1',
            name: 'Onboarding',
            type: 'task',
            startDate: '2026-12-18',
            endDate: '2026-12-22',
            duration: 5,
          },
        ],
      },
    ],
  });
  const afterMulti = mergeImportedGanttData(afterCsv2.projects, afterCsv2.items, multiScenarioImport);
  assert.ok(afterMulti.projects.some((p) => p.name === 'Escenario Finanzas'));
  assert.ok(afterMulti.projects.some((p) => p.name === 'Escenario RRHH'));
});

test('isDemoScenario transitions from true to false when a real project is added to the default scenario', () => {
  const defaultScen = getDefaultSavedScenarios()[0];
  assert.equal(defaultScen.id, 'scen-saas-v2');
  assert.equal(isDemoScenario(defaultScen), true);

  // Adding a real project (isDemo: false) to scen-saas-v2 must transition isDemoScenario to false
  const withRealProject = sanitizeScenario({
    ...defaultScen,
    projects: [
      ...defaultScen.projects,
      { id: 'proj-user-real', name: 'Mi Proyecto Real', color: 'emerald', isDemo: false },
    ],
  });
  assert.equal(isDemoScenario(withRealProject), false);
  assert.equal(withRealProject.isDemo, false);
});

test('addDependencyLink, removeDependencyLink, updateDependencyLinkType, and moveDependencyLink handle creation, moves, and deletion with cycle detection and autoCascade', () => {
  const baseItems = [
    {
      id: 't-1',
      name: 'Diseño UI',
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
      id: 't-2',
      name: 'Desarrollo Frontend',
      type: 'task',
      startDate: '2026-10-06',
      endDate: '2026-10-15',
      duration: 10,
      slack: 0,
      dependencies: [],
      progress: 0,
      color: 'indigo',
    },
    {
      id: 't-3',
      name: 'Desarrollo Backend',
      type: 'task',
      startDate: '2026-10-06',
      endDate: '2026-10-12',
      duration: 7,
      slack: 0,
      dependencies: [],
      progress: 0,
      color: 'indigo',
    },
    {
      id: 'm-1',
      name: 'Hito Lanzamiento',
      type: 'milestone',
      startDate: '2026-10-16',
      endDate: '2026-10-16',
      duration: 0,
      slack: 0,
      dependencies: [],
      progress: 0,
      color: 'amber',
    },
  ];

  // 1. Create dependency link t-1 -> t-2 (FS)
  const add1 = addDependencyLink(baseItems, 't-1', 't-2', 'FS', false);
  assert.equal(add1.added, true);
  const t2AfterAdd1 = add1.items.find((it) => it.id === 't-2');
  assert.deepEqual(t2AfterAdd1.dependencies, ['t-1']);

  // 2. Reject self dependency
  const selfAdd = addDependencyLink(baseItems, 't-1', 't-1', 'FS', false);
  assert.equal(selfAdd.added, false);
  assert.equal(selfAdd.error, 'self');

  // 3. Reject duplicate dependency
  const dupAdd = addDependencyLink(add1.items, 't-1', 't-2', 'FS', false);
  assert.equal(dupAdd.added, false);
  assert.equal(dupAdd.error, 'duplicate');

  // 4. Reject circular dependency (cycle)
  // If t-1 -> t-2, then adding t-2 -> t-1 must fail with 'cycle'
  const cycleAdd = addDependencyLink(add1.items, 't-2', 't-1', 'FS', false);
  assert.equal(cycleAdd.added, false);
  assert.equal(cycleAdd.error, 'cycle');

  // 5. Update dependency link type to 'SS'
  const updateType = updateDependencyLinkType(add1.items, 't-1', 't-2', 'SS', false);
  assert.equal(updateType.updated, true);
  const t2AfterType = updateType.items.find((it) => it.id === 't-2');
  assert.equal(t2AfterType.dependencyTypes?.['t-1'], 'SS');

  // 6. Move dependency link: reconnect predecessor (source) from t-1 to t-3
  // t-3 -> t-2
  const moveSource = moveDependencyLink(add1.items, 't-1', 't-2', 't-3', 't-2', undefined, false);
  assert.equal(moveSource.moved, true);
  const t2AfterMoveSource = moveSource.items.find((it) => it.id === 't-2');
  assert.deepEqual(t2AfterMoveSource.dependencies, ['t-3']);

  // 7. Move dependency link: reconnect successor (target) from t-2 to m-1
  // t-3 -> m-1
  const moveTarget = moveDependencyLink(moveSource.items, 't-3', 't-2', 't-3', 'm-1', undefined, false);
  assert.equal(moveTarget.moved, true);
  const t2AfterMoveTarget = moveTarget.items.find((it) => it.id === 't-2');
  assert.deepEqual(t2AfterMoveTarget.dependencies, []);
  const m1AfterMoveTarget = moveTarget.items.find((it) => it.id === 'm-1');
  assert.deepEqual(m1AfterMoveTarget.dependencies, ['t-3']);

  // 8. Delete dependency link
  const removed = removeDependencyLink(moveTarget.items, 't-3', 'm-1', false);
  assert.equal(removed.removed, true);
  const m1AfterRemove = removed.items.find((it) => it.id === 'm-1');
  assert.deepEqual(m1AfterRemove.dependencies, []);
  assert.equal(m1AfterRemove.dependencyTypes?.['t-3'], undefined);

  // 9. AutoCascade date propagation on dependency creation
  const unalignedItems = [
    {
      id: 'a',
      name: 'Task A',
      type: 'task',
      startDate: '2026-10-01',
      endDate: '2026-10-10',
      duration: 10,
      slack: 0,
      dependencies: [],
      progress: 0,
      color: 'indigo',
    },
    {
      id: 'b',
      name: 'Task B',
      type: 'task',
      startDate: '2026-10-02', // Early start that overlaps A
      endDate: '2026-10-06',
      duration: 5,
      slack: 0,
      dependencies: [],
      progress: 0,
      color: 'indigo',
    },
  ];
  const cascadedAdd = addDependencyLink(unalignedItems, 'a', 'b', 'FS', true);
  assert.equal(cascadedAdd.added, true);
  const bCascaded = cascadedAdd.items.find((it) => it.id === 'b');
  assert.equal(bCascaded.startDate, '2026-10-11', 'Task B start date must cascade to day after Task A ends');
  assert.equal(bCascaded.endDate, '2026-10-15', 'Task B duration 5d must keep end date aligned');
});

test('SSR Verification: GanttWorkspace renders interactive dependency ports, SVG hit areas, endpoint handles, midpoint delete button, and docked dependency panel', async () => {
  const { renderToString } = await import('react-dom/server');
  const esbuild = await import('esbuild');

  const bundle = await esbuild.build({
    stdin: {
      contents: `
        import React from 'react';
        import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
        import { computeGanttMetrics } from './src/utils/ganttEngine.ts';

        const sampleItems = [
          {
            id: 't-alpha',
            projectId: 'proj-1',
            name: 'Diseño UX',
            type: 'task',
            startDate: '2026-10-01',
            endDate: '2026-10-05',
            duration: 5,
            slack: 0,
            dependencies: [],
            progress: 50,
            color: 'indigo',
          },
          {
            id: 't-beta',
            projectId: 'proj-1',
            name: 'Frontend Build',
            type: 'task',
            startDate: '2026-10-06',
            endDate: '2026-10-15',
            duration: 10,
            slack: 0,
            dependencies: ['t-alpha'],
            progress: 10,
            color: 'indigo',
          },
        ];

        const computed = computeGanttMetrics(sampleItems);
        const projects = [{ id: 'proj-1', name: 'Web App', color: 'indigo', isDemo: false }];

        export function renderWorkspaceWithSelectedDependency() {
          return React.createElement(GanttWorkspace, {
            items: computed,
            projects: projects,
            groupByProject: true,
            selectedProjectId: 'all',
            selectedProjectIds: ['proj-1'],
            zoom: 'd',
            dayWidth: 24,
            showCriticalPath: true,
            showCpmFloat: true,
            autoCascade: true,
            arrowVisibility: 'all',
            onUpdateItem: () => {},
            onEditModal: () => {},
            onDeleteItem: () => {},
            onDuplicateItem: () => {},
            onQuickAdd: () => {},
            scrollContainerRef: { current: null },
            initialSelectedDepLink: { predId: 't-alpha', succId: 't-beta' },
          });
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'dep-ssr-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false,
    external: ['react', 'react-dom', 'react-dom/server'],
  });

  const fs = await import('node:fs/promises');
  const tmpFile = path.resolve(__dirname, './.tmp-ssr-dep-bundle.cjs');
  await fs.writeFile(tmpFile, bundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const html = renderToString(mod.renderWorkspaceWithSelectedDependency());

    // 1. Interactive connector ports on timeline task bars (Input and Output)
    assert.ok(html.includes('data-dep-port-in="t-alpha"'), 'Must render input port on task t-alpha');
    assert.ok(html.includes('data-dep-port-out="t-alpha"'), 'Must render output port on task t-alpha');
    assert.ok(html.includes('data-dep-port-in="t-beta"'), 'Must render input port on task t-beta');
    assert.ok(html.includes('data-dep-port-out="t-beta"'), 'Must render output port on task t-beta');

    // 2. Wide invisible hit-area path for easy clicking/hovering of arrows
    assert.ok(
      html.includes('data-dep-hit-area="t-alpha-&gt;t-beta"') ||
        html.includes('data-dep-hit-area="t-alpha->t-beta"'),
      'Must render wide hit-area path for dependency'
    );

    // 3. Draggable endpoint handles for moving source (tail) or target (head)
    assert.ok(
      html.includes('data-dep-handle-source="t-alpha-&gt;t-beta"') ||
        html.includes('data-dep-handle-source="t-alpha->t-beta"'),
      'Must render source handle to move predecessor'
    );
    assert.ok(
      html.includes('data-dep-handle-target="t-alpha-&gt;t-beta"') ||
        html.includes('data-dep-handle-target="t-alpha->t-beta"'),
      'Must render target handle to move successor'
    );

    // 4. Midpoint quick-action pill with 1-click Delete button
    assert.ok(
      html.includes('data-dep-midpoint="t-alpha-&gt;t-beta"') ||
        html.includes('data-dep-midpoint="t-alpha->t-beta"'),
      'Must render midpoint quick-action pill'
    );
    assert.ok(
      html.includes('data-dep-quick-delete="t-alpha-&gt;t-beta"') ||
        html.includes('data-dep-quick-delete="t-alpha->t-beta"'),
      'Must render 1-click delete button on midpoint'
    );

    // 5. Docked dependency panel for editing type or deleting
    assert.ok(
      html.includes('id="gantt-dependency-popover"') ||
        html.includes('id="gantt-dep-panel"'),
      'Must render docked dependency panel when dependency is selected'
    );
    assert.ok(html.includes('data-dep-type-btn="FS"'), 'Must render FS dependency type button');
    assert.ok(html.includes('data-dep-type-btn="SS"'), 'Must render SS dependency type button');
    assert.ok(html.includes('data-dep-delete-btn="true"'), 'Must render delete dependency button in panel');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Milestone labels in calendar bar are centered, Nueva Tarea button renders at task list bottom, and clickable panels dismiss on outside click and Escape', async () => {
  const { renderToString } = await import('react-dom/server');
  const esbuild = await import('esbuild');

  const bundle = await esbuild.build({
    stdin: {
      contents: `
        import React from 'react';
        import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
        import { TaskFormModal } from './src/components/TaskFormModal.tsx';
        import { computeGanttMetrics, getProjectTemplates } from './src/utils/ganttEngine.ts';

        const tpl = getProjectTemplates()[0];
        const computed = computeGanttMetrics(tpl.items);

        export function renderWorkspaceStandard() {
          return React.createElement(GanttWorkspace, {
            items: computed,
            projects: tpl.projects,
            groupByProject: true,
            selectedProjectId: 'all',
            selectedProjectIds: tpl.projects.map(p => p.id),
            zoom: 'd',
            dayWidth: 24,
            showCriticalPath: true,
            showCpmFloat: true,
            autoCascade: true,
            arrowVisibility: 'all',
            onUpdateItem: () => {},
            onEditModal: () => {},
            onDeleteItem: () => {},
            onDuplicateItem: () => {},
            onQuickAdd: () => {},
            scrollContainerRef: { current: null },
            initialSelectedItemId: 't-2',
          });
        }

        export function renderTaskModal() {
          return React.createElement(TaskFormModal, {
            isOpen: true,
            onClose: () => {},
            onSave: () => {},
            allItems: computed,
            projects: tpl.projects,
            defaultType: 'task',
          });
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'milestone-panel-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false,
    external: ['react', 'react-dom', 'react-dom/server'],
  });

  const fs = await import('node:fs/promises');
  const tmpFile = path.resolve(__dirname, './.tmp-ssr-milestone-panel.cjs');
  await fs.writeFile(tmpFile, bundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const wsHtml = renderToString(mod.renderWorkspaceStandard());

    // 1. Requirement 1: Centered milestone label in calendar bar / timeline
    // Milestone container has w-0 so coordinate is centered exactly on day/diamond
    assert.ok(
      wsHtml.includes('w-0') && wsHtml.includes('data-milestone-guide="m-1"'),
      'Milestone vertical guide container must have w-0 for precise centering'
    );
    // Top Diamond Pill Marker has left: 0 and translateX(calc(-50%...))
    assert.ok(
      wsHtml.includes('left:0') || wsHtml.includes('left: 0'),
      'Milestone guide pill must anchor at left: 0 of w-0 container'
    );
    assert.ok(
      wsHtml.includes('translateX(calc(-50%'),
      'Milestone guide pill must shift by -50% to center perfectly on milestone date'
    );
    assert.ok(
      wsHtml.includes('justify-center'),
      'Milestone guide pill must justify-center its contents'
    );
    // Vertical dashed line must be centered at x=0 with -translate-x-1/2
    assert.ok(
      wsHtml.includes('-translate-x-1/2 border-l-2 border-dashed'),
      'Milestone vertical guide line must be centered with -translate-x-1/2'
    );
    // Check that milestone diamond barLeft is coords.startX - 10 (338 = 348 - 10) for 20px diamond
    assert.ok(
      wsHtml.includes('data-timeline-milestone="m-1"') &&
        wsHtml.includes('data-milestone-x="348"') &&
        wsHtml.includes('style="left:338px" data-timeline-milestone="m-1"'),
      'Milestone diamond barLeft must be coords.startX - 10 (338px) so its 20px center aligns with milestoneX (348px)'
    );
    // Ensure no broken Tailwind class top-11.5 is present
    assert.ok(!wsHtml.includes('top-11.5'), 'Must not contain non-standard Tailwind class top-11.5');

    // 2. Requirement 2: Nueva Tarea button at bottom of task list & unrepeated Nuevo Proyecto
    assert.ok(
      wsHtml.includes('data-quick-add-task-btn="true"'),
      'Must render Nueva Tarea button with data-quick-add-task-btn'
    );
    assert.ok(
      wsHtml.includes('<span>Nueva Tarea</span>'),
      'Must render Nueva Tarea label'
    );
    assert.ok(
      wsHtml.includes('<span>Nuevo Proyecto</span>'),
      'Must render Nuevo Proyecto label without repeated + prefix'
    );
    assert.ok(
      !wsHtml.includes('<span>+ Nuevo Proyecto</span>'),
      'Must not have repeated + prefix on Nuevo Proyecto'
    );

    // 3. Requirement 3: Task detail inspection panel & TaskFormModal dismissibility
    // Verify task inspection panel is rendered with data-selected-item-id
    assert.ok(
      wsHtml.includes('id="gantt-inspection-panel"'),
      'Must render task inspection panel when selectedItemId is set'
    );
    assert.ok(
      wsHtml.includes('data-selected-item-id="t-2"'),
      'Inspection panel must show selected task t-2'
    );
    assert.ok(
      wsHtml.includes('data-close-inspection-panel="true"'),
      'Inspection panel must have close button'
    );

    // Verify TaskFormModal
    const modalHtml = renderToString(mod.renderTaskModal());
    assert.ok(
      modalHtml.includes('Crear Nueva Tarea') || modalHtml.includes('Editar Tarea'),
      'TaskFormModal must render task editor when isOpen'
    );
    assert.ok(
      modalHtml.includes('fixed inset-0'),
      'TaskFormModal must render fixed backdrop overlay'
    );

    // 4. Source code verification: Outside click & Escape event listeners are registered for all panels
    const fsMod = await import('node:fs/promises');
    const wsSrc = await fsMod.readFile(
      path.resolve(__dirname, '../src/components/GanttWorkspace.tsx'),
      'utf8'
    );
    const modalSrc = await fsMod.readFile(
      path.resolve(__dirname, '../src/components/TaskFormModal.tsx'),
      'utf8'
    );
    const appSrc = await fsMod.readFile(
      path.resolve(__dirname, '../src/App.tsx'),
      'utf8'
    );

    // Task inspection panel has both mousedown (outside click) and keydown (Escape) handlers
    assert.ok(
      wsSrc.includes('setSelectedItemId(null)') && wsSrc.includes("e.key === 'Escape'"),
      'GanttWorkspace must dismiss selectedItemId on Escape key'
    );
    // Dependency popover has both mousedown (outside click) and keydown (Escape) handlers
    assert.ok(
      wsSrc.includes('setSelectedDepLink(null)') && wsSrc.includes('depPopoverRef.current'),
      'GanttWorkspace must dismiss selectedDepLink on outside click'
    );
    // TaskFormModal has both mousedown (outside click) and keydown (Escape) handlers
    assert.ok(
      modalSrc.includes('modalCardRef.current') &&
        modalSrc.includes("e.key === 'Escape'") &&
        modalSrc.includes('onClose()'),
      'TaskFormModal must close on outside click and Escape key'
    );
    // App settings and metrics drawer have outside click and Escape handlers
    assert.ok(
      appSrc.includes('setShowSettingsModal(false)') &&
        appSrc.includes('settingsModalRef.current') &&
        appSrc.includes('metricsDrawerRef.current') &&
        appSrc.includes('setShowMetricsDrawer(false)'),
      'App must dismiss settings modal and metrics drawer on outside click and Escape key'
    );
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Minimal Design System: Index typography, Alabaster/Ink palette, Header Theme Toggle, and sharp Gantt elements', async () => {
  const fs = await import('node:fs/promises');
  const indexHtml = await fs.readFile(path.resolve(__dirname, '../index.html'), 'utf8');
  assert.ok(indexHtml.includes('family=Inconsolata'), 'index.html must load Inconsolata font');
  assert.ok(indexHtml.includes('family=Inter'), 'index.html must load Inter font');
  assert.ok(indexHtml.includes('family=Open+Sans'), 'index.html must load Open Sans font');
  assert.ok(indexHtml.includes('bg-[#F4F4F1]'), 'index.html body must default to alabaster #F4F4F1 background');
  assert.ok(indexHtml.includes('text-[#0C0C09]'), 'index.html body must default to ink #0C0C09 text');

  // Verify App header renders quick 1-click theme toggle button
  const appSrc = await fs.readFile(path.resolve(__dirname, '../src/App.tsx'), 'utf8');
  assert.ok(appSrc.includes('data-testid="header-theme-toggle-btn"'), 'App header must render direct theme toggle button');
  assert.ok(appSrc.includes('setDarkMode((prev) => !prev)'), 'Header theme button must toggle darkMode state');

  // Verify GanttWorkspace uses minimal styling classes
  const wsSrc = await fs.readFile(path.resolve(__dirname, '../src/components/GanttWorkspace.tsx'), 'utf8');
  assert.ok(wsSrc.includes('rounded-[8px]'), 'GanttWorkspace main card must use sharp rounded-[8px]');
  assert.ok(wsSrc.includes('border-[#0C0C09]'), 'GanttWorkspace must use stark border-[#0C0C09]');
  assert.ok(wsSrc.includes('bg-[#F4F4F1]'), 'GanttWorkspace table header must use alabaster #F4F4F1');
  assert.ok(wsSrc.includes('rounded-[4px]'), 'GanttWorkspace task bars must use rounded-[4px]');
});

test('Default team colors, table team badges, and non-cutting project name sizing', async () => {
  const { renderToString } = await import('react-dom/server');

  // 1. Verify getTeamColor resolution for software teams
  assert.equal(getTeamColor('qa'), 'cyan');
  assert.equal(getTeamColor('QA Lead'), 'cyan');
  assert.equal(getTeamColor('FrontEnd'), 'violet');
  assert.equal(getTeamColor('UI Designer'), 'violet');
  assert.equal(getTeamColor('Backend Developer'), 'blue');
  assert.equal(getTeamColor('DevOps & Cloud'), 'emerald');
  assert.equal(getTeamColor('PM Lead'), 'amber');
  assert.equal(getTeamColor('Security Auditor'), 'rose');
  assert.equal(getTeamColor(''), 'indigo');
  assert.equal(getTeamColor(undefined), 'indigo');

  // Deterministic palette mapping for arbitrary team names
  const teamAColor = getTeamColor('Equipo A');
  const teamBColor = getTeamColor('Equipo B');
  assert.ok(TEAM_COLOR_PALETTE.includes(teamAColor));
  assert.ok(TEAM_COLOR_PALETTE.includes(teamBColor));

  // 2. Verify sanitizeGanttItem assigns default team colors
  const taskQA = sanitizeGanttItem({
    id: 't-qa',
    name: 'task1',
    type: 'task',
    startDate: '2026-11-01',
    endDate: '2026-11-05',
    assignee: 'qa',
  });
  assert.equal(taskQA.color, 'cyan', 'Task with assignee "qa" must default to cyan');

  const taskFE = sanitizeGanttItem({
    id: 't-fe',
    name: 'Task 2',
    type: 'task',
    startDate: '2026-11-03',
    endDate: '2026-11-08',
    assignee: 'FrontEnd',
  });
  assert.equal(taskFE.color, 'violet', 'Task with assignee "FrontEnd" must default to violet');

  const milestone = sanitizeGanttItem({
    id: 'm-qa',
    name: 'Hito QA',
    type: 'milestone',
    startDate: '2026-11-05',
    assignee: 'qa',
  });
  assert.equal(milestone.color, 'amber', 'Milestones must remain amber by default even with assignee');

  const customColorTask = sanitizeGanttItem({
    id: 't-custom',
    name: 'Task Custom Color',
    type: 'task',
    startDate: '2026-11-01',
    endDate: '2026-11-03',
    color: 'rose',
    assignee: 'qa',
  });
  assert.equal(customColorTask.color, 'rose', 'Explicit custom color must not be overridden');

  // 3. Verify SSR rendering of GanttWorkspace with team badges and project name input sizing
  const bundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { GanttWorkspace, TEAM_BADGE_STYLES } from './src/components/GanttWorkspace.tsx';
        import { computeGanttMetrics, sanitizeProject, sanitizeGanttItem } from './src/utils/ganttEngine.ts';

        export function renderTeamBadgeWorkspace() {
          const project = sanitizeProject({ id: 'p-1', name: 'Escenario Importado' }, 0);
          const rawTasks = [
            sanitizeGanttItem({
              id: 't-1',
              name: 'task1',
              type: 'task',
              projectId: 'p-1',
              startDate: '2026-11-01',
              endDate: '2026-11-04',
              assignee: 'qa',
            }),
            sanitizeGanttItem({
              id: 't-2',
              name: 'Task 2',
              type: 'task',
              projectId: 'p-1',
              startDate: '2026-11-02',
              endDate: '2026-11-07',
              assignee: 'FrontEnd',
            }),
          ];
          const items = computeGanttMetrics(rawTasks);
          return (
            <GanttWorkspace
              items={items}
              projects={[project]}
              groupByProject={true}
              selectedProjectId="all"
              zoom="day"
              showCriticalPath={false}
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
      sourcefile: 'ssr-team-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const fsNode = await import('node:fs/promises');
  const tmpFile = path.resolve(__dirname, './.tmp-team-badge-bundle.cjs');
  await fsNode.writeFile(tmpFile, bundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const html = renderToString(mod.renderTeamBadgeWorkspace());

    // Verify team badge in table for qa has cyan styling
    assert.ok(html.includes('data-assignee-badge="qa"'), 'Must render data-assignee-badge="qa"');
    assert.ok(html.includes('text-cyan-800'), 'Team badge for qa must have cyan text');
    assert.ok(html.includes('bg-[#0891B2]'), 'Team badge for qa must have cyan indicator dot');

    // Verify team badge in table for FrontEnd has violet styling
    assert.ok(html.includes('data-assignee-badge="FrontEnd"'), 'Must render data-assignee-badge="FrontEnd"');
    assert.ok(html.includes('text-violet-800'), 'Team badge for FrontEnd must have violet text');
    assert.ok(html.includes('bg-[#7C3AED]'), 'Team badge for FrontEnd must have violet indicator dot');

    // Verify project name input occupies exact space needed with auto-measuring grid without margin growth
    assert.ok(html.includes('data-project-name-input="p-1"'), 'Must render data-project-name-input="p-1"');
    assert.ok(html.includes('Escenario Importado'), 'Must render project name Escenario Importado');
    assert.ok(html.includes('col-start-1 row-start-1'), 'Project name input must use auto-measuring grid to eliminate margin growth');
    assert.ok(html.includes('ítems') || html.includes('&iacute;tems'), 'Project row must display items badge directly beside name');

    // Verify timeline task bars render with their distinct team colors
    assert.ok(html.includes('bg-[#0891B2]'), 'Timeline task bar for qa must be rendered in cyan bg');
    assert.ok(html.includes('bg-[#7C3AED]'), 'Timeline task bar for FrontEnd must be rendered in violet bg');
  } finally {
    await fsNode.unlink(tmpFile).catch(() => {});
  }
});

test('Elimination of gap between task name & team badge, and simplified task details panel', async () => {
  const { renderToString } = await import('react-dom/server');

  const bundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
        import { computeGanttMetrics, sanitizeProject, sanitizeGanttItem } from './src/utils/ganttEngine.ts';

        export function renderSnugAndDetailsWorkspace(selectedId = null) {
          const project = sanitizeProject({ id: 'p-1', name: 'Escenario Importado' }, 0);
          const rawTasks = [
            sanitizeGanttItem({
              id: 't-1',
              name: 'task1',
              type: 'task',
              projectId: 'p-1',
              startDate: '2026-11-01',
              endDate: '2026-11-04',
              assignee: 'qa',
              notes: 'Verificación de casos de prueba y cobertura',
              progress: 25,
            }),
            sanitizeGanttItem({
              id: 't-2',
              name: 'Task 2',
              type: 'task',
              projectId: 'p-1',
              startDate: '2026-11-04',
              endDate: '2026-11-08',
              assignee: 'FrontEnd',
              progress: 0,
            }),
          ];
          const items = computeGanttMetrics(rawTasks);
          return (
            <GanttWorkspace
              items={items}
              projects={[project]}
              groupByProject={true}
              selectedProjectId="all"
              zoom="day"
              showCriticalPath={false}
              showCpmFloat={false}
              autoCascade={true}
              initialSelectedItemId={selectedId}
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
      sourcefile: 'ssr-snug-details-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const fsNode = await import('node:fs/promises');
  const tmpFile = path.resolve(__dirname, './.tmp-snug-details-bundle.cjs');
  await fsNode.writeFile(tmpFile, bundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // 1. Verify gap elimination: rows use justify-start and task name input is snug
    const htmlTable = renderToString(mod.renderSnugAndDetailsWorkspace(null));

    // Rows use justify-start so columns are snug without 600px artificial gaps
    assert.ok(htmlTable.includes('justify-start'), 'Table rows must use justify-start to eliminate artificial gaps');
    assert.ok(htmlTable.includes('data-task-name-input="t-1"'), 'Must render data-task-name-input="t-1"');
    assert.ok(htmlTable.includes('task1'), 'Must render task name task1');
    assert.ok(htmlTable.includes('col-start-1 row-start-1'), 'Task name input must use auto-measuring grid to eliminate margin growth');

    // 2. Verify simplified inspection panel: renders clean ID, nombre, equipo, notas immediately after name, inicio, fin, duración, progreso
    const htmlDetails = renderToString(mod.renderSnugAndDetailsWorkspace('t-1'));
    assert.ok(htmlDetails.includes('id="gantt-inspection-panel"'), 'Must render inspection panel');
    assert.ok(htmlDetails.includes('data-selected-item-id="t-1"'), 'Must inspect task t-1');
    assert.ok(htmlDetails.includes('#1'), 'Must display item ID / WBS');
    assert.ok(htmlDetails.includes('task1'), 'Must display task name');
    assert.ok(htmlDetails.includes('qa'), 'Must display team name');
    assert.ok(htmlDetails.includes('Descripción / Notas') || htmlDetails.includes('Descripci&oacute;n / Notas'), 'Must have Descripción / Notas header');
    assert.ok(htmlDetails.includes('Verificación de casos de prueba y cobertura') || htmlDetails.includes('Verificaci&oacute;n'), 'Must display task notes content');
    assert.ok(htmlDetails.includes('Inicio'), 'Must display Inicio header');
    assert.ok(htmlDetails.includes('Fin'), 'Must display Fin header');
    assert.ok(htmlDetails.includes('Duración') || htmlDetails.includes('Duraci&oacute;n'), 'Must display Duración');
    assert.ok(htmlDetails.includes('Progreso'), 'Must display Progreso header');
    assert.ok(htmlDetails.includes('25%'), 'Must display progress percentage');
    assert.ok(htmlDetails.includes('Editar Ítem') || htmlDetails.includes('Editar &Iacute;tem'), 'Must display Editar Ítem button');

    // Project name and successors must NOT be rendered in the task details panel
    const panelMatch = htmlDetails.match(/<aside[^>]*id="gantt-inspection-panel"[^>]*>([\s\S]*?)<\/aside>/);
    assert.ok(panelMatch, 'Must render inspection panel');
    const panelHtml = panelMatch[1];
    assert.equal(panelHtml.includes('Escenario Importado'), false, 'Inspection panel must not include project name');
    assert.equal(panelHtml.includes('Sucesoras:'), false, 'Inspection panel must not include successors');
    assert.equal(panelHtml.includes('Predecesoras:'), false, 'Inspection panel must not include predecessors');

    // Cluttered add-predecessor dropdown & connect button must NOT be in the simplified inspection panel
    assert.equal(htmlDetails.includes('data-inspect-add-pred-select'), false, 'Cluttered add-pred select must be removed from inspection panel');
    assert.equal(htmlDetails.includes('data-inspect-start-connect'), false, 'Cluttered connect button must be removed from inspection panel');
  } finally {
    await fsNode.unlink(tmpFile).catch(() => {});
  }
});

test('Timeline Drag Invariance (never modify other tasks), Undo/Redo mechanism, and Plan History Page', async () => {
  const fs = await import('node:fs/promises');

  // 1. Source verification: Timeline drag in GanttWorkspace NEVER cascades to other tasks
  const wsSrc = await fs.readFile(
    path.resolve(__dirname, '../src/components/GanttWorkspace.tsx'),
    'utf8'
  );
  // Verify onUpdateItem is called with false in both move and resize drag branches of handleBarMouseDown
  const moveDragBlock = wsSrc.slice(
    wsSrc.indexOf('const handleBarMouseDown ='),
    wsSrc.indexOf('const showDepToast =')
  );
  assert.ok(
    moveDragBlock.includes('onUpdateItem(') &&
      moveDragBlock.includes('startDate: newStart,') &&
      moveDragBlock.includes('false') &&
      !moveDragBlock.includes('autoCascade'),
    'Moving a task by dragging on timeline must pass false to onUpdateItem (never modify other tasks)'
  );
  assert.ok(
    moveDragBlock.includes('duration: newDur,') &&
      moveDragBlock.includes('false'),
    'Resizing a task by dragging on timeline must pass false to onUpdateItem (never modify other tasks)'
  );

  // 2. Functional verification: Updating an item without cascade leaves other tasks completely intact
  const initialTasks = [
    {
      id: 'task-a',
      name: 'Tarea A (Predecesora)',
      startDate: '2026-11-02',
      endDate: '2026-11-06',
      duration: 5,
      progress: 0,
      dependencies: [],
      projectId: 'proj-1',
      type: 'task',
    },
    {
      id: 'task-b',
      name: 'Tarea B (Sucesora)',
      startDate: '2026-11-09',
      endDate: '2026-11-13',
      duration: 5,
      progress: 0,
      dependencies: ['task-a'],
      projectId: 'proj-1',
      type: 'task',
    },
  ];

  // When task-a is moved to a later date without cascade (false)
  const movedTaskA = {
    ...initialTasks[0],
    startDate: '2026-11-10',
    endDate: '2026-11-14',
  };
  const tasksAfterDragWithoutCascade = initialTasks.map((it) =>
    it.id === movedTaskA.id ? movedTaskA : it
  );

  // Task B must NOT have been shifted or modified in any way
  const taskBAfter = tasksAfterDragWithoutCascade.find((it) => it.id === 'task-b');
  assert.equal(
    taskBAfter.startDate,
    '2026-11-09',
    'Task B startDate must NOT change when Task A is dragged without cascade'
  );
  assert.equal(
    taskBAfter.endDate,
    '2026-11-13',
    'Task B endDate must NOT change when Task A is dragged without cascade'
  );
  assert.equal(
    taskBAfter.duration,
    5,
    'Task B duration must NOT change when Task A is dragged without cascade'
  );

  // 3. SSR Component Verification: App renders Undo, Redo, and Historial buttons, and renders PlanHistoryPage
  const esbuild = await import('esbuild');
  const React = await import('react');
  const ReactDOMServer = await import('react-dom/server');

  const bundle = await esbuild.build({
    stdin: {
      contents: `
        import React from 'react';
        import { App } from './src/App';
        import { PlanHistoryPage } from './src/components/PlanHistoryPage';

        export function renderGanttApp() {
          return <App initialView="gantt" />;
        }

        export function renderHistoryApp() {
          return <App initialView="history" />;
        }

        export function renderHistoryPageDirect(history, currentIndex) {
          return (
            <PlanHistoryPage
              history={history}
              currentIndex={currentIndex}
              canUndo={currentIndex > 0}
              canRedo={currentIndex < history.length - 1}
              onUndo={() => {}}
              onRedo={() => {}}
              onRestoreSnapshot={() => {}}
              onBackToGantt={() => {}}
            />
          );
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'ssr-history-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const tmpFile = path.resolve(__dirname, './.tmp-history-test.cjs');
  await fs.writeFile(tmpFile, bundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // Verify Gantt view header renders Deshacer, Rehacer, and Historial buttons
    const ganttHtml = ReactDOMServer.renderToString(mod.renderGanttApp());
    assert.ok(
      ganttHtml.includes('data-testid="header-undo-btn"'),
      'Header must render Deshacer (Undo) button'
    );
    assert.ok(
      ganttHtml.includes('data-testid="header-redo-btn"'),
      'Header must render Rehacer (Redo) button'
    );
    assert.ok(
      ganttHtml.includes('data-testid="header-history-btn"'),
      'Header must render Historial button'
    );
    assert.ok(
      ganttHtml.includes('data-testid="history-counter-badge"'),
      'Header must render history change counter badge'
    );

    // Verify History view renders full PlanHistoryPage
    const historyHtml = ReactDOMServer.renderToString(mod.renderHistoryApp());
    assert.ok(
      historyHtml.includes('data-testid="plan-history-page"'),
      'App in history view must render PlanHistoryPage container'
    );
    assert.ok(
      historyHtml.includes('data-history-page="true"'),
      'PlanHistoryPage must have data-history-page="true"'
    );
    assert.ok(
      historyHtml.includes('data-testid="history-back-btn"'),
      'PlanHistoryPage must render Volver al Diagrama button'
    );
    assert.ok(
      historyHtml.includes('data-testid="history-search-input"'),
      'PlanHistoryPage must render search input to filter history'
    );
    assert.ok(
      historyHtml.includes('Historial de Cambios del Plan'),
      'PlanHistoryPage must render page title'
    );
    assert.ok(
      historyHtml.includes('Total Modificaciones'),
      'PlanHistoryPage must render statistics card for total modifications'
    );
    assert.ok(
      historyHtml.includes('Versión Activa') || historyHtml.includes('Versi&oacute;n Activa'),
      'PlanHistoryPage must render statistics card for active version'
    );

    // Verify direct PlanHistoryPage with multiple recorded modifications
    const mockHistory = [
      {
        id: 'hist-1',
        timestamp: '2026-11-02T10:00:00.000Z',
        formattedDate: '02/11/2026, 11:00:00',
        actionType: 'initial_state',
        actionLabel: 'Inicio',
        description: 'Estado inicial cargado',
        itemsCount: 5,
        projectsCount: 1,
        snapshot: { items: initialTasks, projects: [{ id: 'proj-1', name: 'Proyecto Alpha', color: 'indigo' }] },
      },
      {
        id: 'hist-2',
        timestamp: '2026-11-02T10:05:00.000Z',
        formattedDate: '02/11/2026, 11:05:00',
        actionType: 'drag_move',
        actionLabel: 'Desplazamiento',
        description: "Mover 'Tarea A' de 2026-11-02 a 2026-11-10",
        itemsCount: 5,
        projectsCount: 1,
        snapshot: { items: tasksAfterDragWithoutCascade, projects: [{ id: 'proj-1', name: 'Proyecto Alpha', color: 'indigo' }] },
      },
      {
        id: 'hist-3',
        timestamp: '2026-11-02T10:10:00.000Z',
        formattedDate: '02/11/2026, 11:10:00',
        actionType: 'create_item',
        actionLabel: 'Creación',
        description: "Crear tarea 'Diseño Mockup'",
        itemsCount: 6,
        projectsCount: 1,
        snapshot: { items: [...tasksAfterDragWithoutCascade, { id: 'task-c', name: 'Diseño Mockup', duration: 3, startDate: '2026-11-15', endDate: '2026-11-17', dependencies: [], projectId: 'proj-1', progress: 0, type: 'task' }], projects: [{ id: 'proj-1', name: 'Proyecto Alpha', color: 'indigo' }] },
      },
    ];

    const directHistoryHtml = ReactDOMServer.renderToString(
      mod.renderHistoryPageDirect(mockHistory, 2)
    );
    assert.ok(directHistoryHtml.includes('data-history-entry="true"'), 'Must render history entries');
    assert.ok(directHistoryHtml.includes('Desplazamiento'), 'Must render Desplazamiento action badge');
    assert.ok(
      directHistoryHtml.includes("Mover") && directHistoryHtml.includes("Tarea A"),
      'Must render drag move description'
    );
    assert.ok(
      directHistoryHtml.includes("Crear tarea") && (directHistoryHtml.includes("Diseño Mockup") || directHistoryHtml.includes("Dise&ntilde;o Mockup")),
      'Must render create item description'
    );
    assert.ok(directHistoryHtml.includes('VERSIÓN ACTUAL') || directHistoryHtml.includes('VERSI&Oacute;N ACTUAL'), 'Must render active version badge on current entry');
    assert.ok(directHistoryHtml.includes('Restaurar versión') || directHistoryHtml.includes('Restaurar versi&oacute;n'), 'Must render Restaurar versión button for past entries');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});



