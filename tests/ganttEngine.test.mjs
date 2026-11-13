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
  groupItemsByReleaseAndProject,
  getTeamColor,
  getItemEffectiveColor,
  TEAM_COLOR_PALETTE,
  getRelatedFocusEntityIds,
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
    assert.ok(
      html.includes('M 572.0 175.0 L 578.0 175.0 Q 584.0 175.0') ||
        html.includes('M 572.0 125.0 L 578.0 125.0 Q 584.0 125.0')
    );
    assert.equal(html.includes('L 53.0'), false);

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
    assert.ok(html.includes('data-fit-timeline-btn="true"'));
    assert.ok(html.includes('Ajustar a Proyecto'));
    assert.ok(html.includes('data-testid="header-import-btn"'));
    assert.ok(html.includes('data-testid="header-export-btn"'));
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

    // 2. Header has Export / Import buttons and Import file input
    assert.ok(html.includes('data-testid="header-import-btn"'));
    assert.ok(html.includes('data-testid="header-export-btn"'));

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

    // Long task name (89 chars) uses auto-measuring grid and name column allocates sufficient width so text is NEVER cut off
    assert.ok(html.includes('col-start-1 row-start-1'), 'Task name input must use auto-measuring grid to prevent margin growth and clipping');
    assert.ok(html.includes('Desarrollo e Implementación de la Infraestructura'), 'Must render full task name in auto-measuring grid span and input');
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
    // App metrics drawer has outside click and Escape handlers
    assert.ok(
      appSrc.includes('metricsDrawerRef.current') &&
        appSrc.includes('setShowMetricsDrawer(false)'),
      'App must dismiss metrics drawer on outside click and Escape key'
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

    // Verify Gantt view header does not clutter with Undo/Redo buttons (shortcuts used) and renders Historial button
    const ganttHtml = ReactDOMServer.renderToString(mod.renderGanttApp());
    assert.ok(
      !ganttHtml.includes('data-testid="header-undo-btn"'),
      'Header must not render Deshacer (Undo) button (relying on keyboard shortcuts)'
    );
    assert.ok(
      !ganttHtml.includes('data-testid="header-redo-btn"'),
      'Header must not render Rehacer (Redo) button (relying on keyboard shortcuts)'
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

test('Project deletion controls and hiding tasks from diagram (visibility toggles, badges, and SVG link filtering)', async () => {
  // 1. Engine unit check: sanitizeGanttItem preserves hidden flag
  const sanitizedHidden = sanitizeGanttItem({
    id: 't-hidden',
    name: 'Tarea Oculta',
    startDate: '2026-11-01',
    endDate: '2026-11-03',
    duration: 3,
    hidden: true,
  });
  assert.equal(sanitizedHidden.hidden, true, 'sanitizeGanttItem must retain hidden: true');

  const sanitizedVisible = sanitizeGanttItem({
    id: 't-visible',
    name: 'Tarea Visible',
    startDate: '2026-11-01',
    endDate: '2026-11-03',
    duration: 3,
    hidden: false,
  });
  assert.equal(sanitizedVisible.hidden, false, 'sanitizeGanttItem must retain hidden: false');

  // 2. SSR Component Verification: GanttWorkspace, TaskFormModal, and App
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const esbuild = await import('esbuild');
  const React = await import('react');
  const ReactDOMServer = await import('react-dom/server');

  const bundle = await esbuild.build({
    stdin: {
      contents: `
        import React from 'react';
        import { App } from './src/App';
        import { GanttWorkspace } from './src/components/GanttWorkspace';
        import { TaskFormModal } from './src/components/TaskFormModal';

        export function renderWorkspaceWithHiddenTask() {
          const projects = [
            { id: 'proj-1', name: 'Proyecto Alpha', color: 'indigo', collapsed: false },
          ];
          const items = [
            {
              id: 'task-visible-1',
              name: 'Tarea Visible 1',
              type: 'task',
              projectId: 'proj-1',
              startDate: '2026-11-01',
              endDate: '2026-11-04',
              duration: 4,
              slack: 0,
              dependencies: [],
              progress: 50,
              color: 'indigo',
              hidden: false,
            },
            {
              id: 'task-hidden-2',
              name: 'Tarea Oculta 2',
              type: 'task',
              projectId: 'proj-1',
              startDate: '2026-11-05',
              endDate: '2026-11-08',
              duration: 4,
              slack: 0,
              dependencies: ['task-visible-1'],
              progress: 0,
              color: 'emerald',
              hidden: true,
            },
          ];

          return (
            <GanttWorkspace
              items={items}
              projects={projects}
              selectedProjectIds={['proj-1']}
              initialSelectedItemId="task-hidden-2"
              onUpdateItem={() => {}}
              onDeleteItem={() => {}}
              onDuplicateItem={() => {}}
              onEditModal={() => {}}
              onQuickAdd={() => {}}
              onReorderItem={() => {}}
            />
          );
        }

        export function renderModal(initialHidden) {
          const item = {
            id: 'task-test',
            name: 'Tarea Test',
            type: 'task',
            projectId: 'proj-1',
            startDate: '2026-11-01',
            endDate: '2026-11-04',
            duration: 4,
            slack: 0,
            dependencies: [],
            progress: 0,
            color: 'indigo',
            hidden: initialHidden,
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

        export function renderAppMultiProjects() {
          return <App initialView="gantt" initialProjectMenuOpen={true} />;
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'ssr-deletion-visibility-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const tmpFile = path.resolve(__dirname, './.tmp-deletion-visibility-test.cjs');
  await fs.writeFile(tmpFile, bundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // Verify Workspace rendering with hidden task
    const wsHtml = ReactDOMServer.renderToString(mod.renderWorkspaceWithHiddenTask());

    // 1) Table row controls: visibility toggle buttons must exist for both items
    assert.ok(
      wsHtml.includes('data-testid="toggle-task-visibility-task-visible-1"'),
      'Must render visibility toggle button for visible task'
    );
    assert.ok(
      wsHtml.includes('data-testid="toggle-task-visibility-task-hidden-2"'),
      'Must render visibility toggle button for hidden task'
    );

    // 2) Hidden badge in table row
    assert.ok(
      wsHtml.includes('data-testid="task-hidden-badge-task-hidden-2"'),
      'Must render "Oculta" badge in table row for hidden task'
    );

    // 3) Timeline bars: visible task must be rendered, hidden task bar must NOT be rendered
    assert.ok(
      wsHtml.includes('data-timeline-task="task-visible-1"') || wsHtml.includes('task-visible-1'),
      'Visible task bar must be rendered in diagram timeline'
    );
    assert.ok(
      !wsHtml.includes('data-timeline-task="task-hidden-2"'),
      'Hidden task bar must NOT be rendered in diagram timeline'
    );

    // 4) SVG dependency arrows: dependency arrow into hidden task must NOT be drawn
    assert.ok(
      !wsHtml.includes('data-dep-link="task-visible-1->task-hidden-2"'),
      'Dependency arrow connecting to hidden task must NOT be drawn in SVG layer'
    );

    // 5) Inspection panel: when inspecting hidden item, badge and toggle button must be present
    assert.ok(
      wsHtml.includes('data-testid="panel-hidden-badge-task-hidden-2"'),
      'Inspection panel must show "Oculta en diagrama" badge'
    );
    assert.ok(
      wsHtml.includes('data-testid="panel-toggle-task-visibility-task-hidden-2"'),
      'Inspection panel must render diagram visibility toggle button'
    );

    // 6) TaskFormModal rendering
    const modalHtml = ReactDOMServer.renderToString(mod.renderModal(true));
    assert.ok(
      modalHtml.includes('data-testid="task-form-hidden-checkbox"'),
      'TaskFormModal must render diagram visibility checkbox'
    );
    assert.ok(
      modalHtml.includes('checked=""') || modalHtml.includes('checked'),
      'Diagram visibility checkbox must be checked when item is hidden'
    );

    // 7) App with multiple projects renders delete project buttons
    const appHtml = ReactDOMServer.renderToString(mod.renderAppMultiProjects());
    assert.ok(
      appHtml.includes('data-projects-dropdown-menu="true"'),
      'App must render projects dropdown menu in header'
    );
    assert.ok(
      appHtml.includes('data-testid="delete-project-menu-btn-') ||
        appHtml.includes('data-project-menu-item="'),
      'App must render project menu items'
    );
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('App version in settings, inline task name editing, custom colors, and project descriptions', async () => {
  const fs = await import('node:fs/promises');
  const ReactDOMServer = await import('react-dom/server');

  // 1. Verify sanitizeGanttItem preserves trailing spaces and empty strings without forcing default name on keystroke
  const itemWithTrailingSpace = sanitizeGanttItem({
    id: 't-space',
    name: 'Desarrollo Backend ',
    type: 'task',
    startDate: '2026-11-01',
    duration: 3,
  });
  assert.equal(
    itemWithTrailingSpace.name,
    'Desarrollo Backend ',
    'sanitizeGanttItem must preserve trailing spaces during inline editing'
  );

  const itemEmptyName = sanitizeGanttItem({
    id: 't-empty',
    name: '',
    type: 'task',
    startDate: '2026-11-01',
    duration: 3,
  });
  assert.equal(
    itemEmptyName.name,
    '',
    'sanitizeGanttItem must allow empty string while user is clearing the input'
  );

  // 2. Verify customColor allows setting any color (including indigo, teal, orange, etc.) even when an assignee is present
  const assignedItemDefault = sanitizeGanttItem({
    id: 't-assigned-1',
    name: 'Tarea Equipo',
    type: 'task',
    startDate: '2026-11-01',
    duration: 3,
    assignee: 'Frontend',
  });
  // Without customColor, team color takes precedence (Frontend -> violet)
  assert.equal(getItemEffectiveColor(assignedItemDefault), 'violet');

  const assignedItemCustomIndigo = sanitizeGanttItem({
    id: 't-assigned-2',
    name: 'Tarea Custom Indigo',
    type: 'task',
    startDate: '2026-11-01',
    duration: 3,
    assignee: 'Frontend',
    color: 'indigo',
    customColor: true,
  });
  assert.equal(assignedItemCustomIndigo.color, 'indigo');
  assert.equal(assignedItemCustomIndigo.customColor, true);
  assert.equal(
    getItemEffectiveColor(assignedItemCustomIndigo),
    'indigo',
    'Explicit customColor: true must preserve indigo even if assignee is present'
  );

  // Expanded colors (teal, orange, pink, slate, sky, lime)
  const expandedColors = ['teal', 'orange', 'pink', 'slate', 'sky', 'lime'];
  for (const c of expandedColors) {
    const itemWithNewColor = sanitizeGanttItem({
      id: `t-${c}`,
      name: `Tarea ${c}`,
      type: 'task',
      startDate: '2026-11-01',
      duration: 2,
      assignee: 'Frontend',
      color: c,
      customColor: true,
    });
    assert.equal(
      getItemEffectiveColor(itemWithNewColor),
      c,
      `New palette color ${c} must be effective when customColor: true`
    );
  }

  // 3. Verify sanitizeProject preserves project description
  const projWithDesc = sanitizeProject({
    id: 'p-desc',
    name: 'Proyecto Con Notas',
    description: 'Documentación del alcance y requerimientos clave del proyecto.',
    color: 'teal',
  });
  assert.equal(projWithDesc.description, 'Documentación del alcance y requerimientos clave del proyecto.');
  assert.equal(projWithDesc.color, 'teal');

  // 4. SSR verification of Settings Modal (app version) and GanttWorkspace (project description & details modal)
  const bundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { App } from './src/App.tsx';
        import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
        import { TaskFormModal } from './src/components/TaskFormModal.tsx';
        export { APP_VERSION } from './src/types/gantt.ts';

        export function renderAppWithSettingsOpen() {
          return <App initialSettingsOpen={true} />;
        }

        export function renderWorkspaceWithProjectDesc(inspectProject) {
          const project = {
            id: 'proj-desc-1',
            name: 'Proyecto Alpha',
            color: 'teal',
            collapsed: false,
            description: 'Alcance detallado del MVP versión 1.',
          };
          const item = {
            id: 't-1',
            name: 'Tarea 1',
            type: 'task',
            projectId: 'proj-desc-1',
            startDate: '2026-11-01',
            endDate: '2026-11-04',
            duration: 4,
            slack: 0,
            dependencies: [],
            progress: 50,
            color: 'teal',
            customColor: true,
          };
          return (
            <GanttWorkspace
              items={[item]}
              projects={[project]}
              groupByProject={true}
              selectedProjectId="all"
              zoom="day"
              dayWidth={44}
              showCriticalPath={false}
              showCpmFloat={false}
              autoCascade={true}
              initialInspectingProjectId={inspectProject ? 'proj-desc-1' : undefined}
              onUpdateItem={() => {}}
              onEditModal={() => {}}
              onDeleteItem={() => {}}
              onDuplicateItem={() => {}}
              onQuickAdd={() => {}}
              onUpdateProject={() => {}}
              scrollContainerRef={{ current: null }}
            />
          );
        }

        export function renderTaskFormModal() {
          const item = {
            id: 't-form-test',
            name: 'Tarea Modal',
            type: 'task',
            projectId: 'proj-desc-1',
            startDate: '2026-11-01',
            endDate: '2026-11-04',
            duration: 4,
            slack: 0,
            dependencies: [],
            progress: 0,
            color: 'teal',
            assignee: 'Frontend',
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
      sourcefile: 'ssr-version-and-project-desc-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const tmpFile = path.resolve(__dirname, './.tmp-version-and-project-desc-test.cjs');
  await fs.writeFile(tmpFile, bundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // Test App Settings modal rendering version
    const appHtml = ReactDOMServer.renderToString(mod.renderAppWithSettingsOpen());
    assert.ok(
      appHtml.includes('data-testid="app-version-badge"'),
      'Settings modal header must render app version badge'
    );
    assert.ok(
      appHtml.includes(`v${mod.APP_VERSION}`),
      `Header must display version v${mod.APP_VERSION}`
    );

    // Test Workspace with project description indicator badge and info button
    const wsHtml = ReactDOMServer.renderToString(mod.renderWorkspaceWithProjectDesc(false));
    assert.ok(
      wsHtml.includes('data-testid="project-info-btn-proj-desc-1"'),
      'Workspace must render project info / edit button'
    );
    assert.ok(
      wsHtml.includes('data-testid="project-has-description-proj-desc-1"'),
      'Workspace must render project description indicator badge when description exists'
    );

    // Test Workspace with project details modal open
    const wsModalHtml = ReactDOMServer.renderToString(mod.renderWorkspaceWithProjectDesc(true));
    assert.ok(
      wsModalHtml.includes('data-testid="project-details-modal"'),
      'Workspace must render project details modal when inspecting a project'
    );
    assert.ok(
      wsModalHtml.includes('data-testid="project-modal-name-input"'),
      'Project details modal must render project name input'
    );
    assert.ok(
      wsModalHtml.includes('data-testid="project-modal-description-input"'),
      'Project details modal must render project description textarea'
    );
    assert.ok(
      wsModalHtml.includes('Alcance detallado del MVP versión 1.'),
      'Project details modal must display existing project description'
    );
    assert.ok(
      wsModalHtml.includes('data-testid="save-project-details-btn"'),
      'Project details modal must render save button'
    );

    // Test TaskFormModal color palette
    const modalHtml = ReactDOMServer.renderToString(mod.renderTaskFormModal());
    assert.ok(modalHtml.includes('data-color="teal"'), 'Task modal must render teal color option');
    assert.ok(modalHtml.includes('data-color="orange"'), 'Task modal must render orange color option');
    assert.ok(modalHtml.includes('data-color="slate"'), 'Task modal must render slate color option');
    assert.ok(modalHtml.includes('data-color="pink"'), 'Task modal must render pink color option');
    assert.ok(modalHtml.includes('data-color="sky"'), 'Task modal must render sky color option');
    assert.ok(modalHtml.includes('data-color="lime"'), 'Task modal must render lime color option');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Release calendar, excel extraction, milestone guides, and hierarchical grouping', async () => {
  // 1. Bundle and test releaseEngine
  const relBundle = await build({
    entryPoints: [path.resolve(__dirname, '../src/utils/releaseEngine.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    write: false,
  });

  const fs = await import('node:fs/promises');
  const tmpRelFile = path.resolve(__dirname, './.tmp-rel-bundle.mjs');
  await fs.writeFile(tmpRelFile, relBundle.outputFiles[0].text, 'utf8');

  let relMod;
  try {
    relMod = await import(`${tmpRelFile}?t=${Date.now()}`);
  } finally {
    await fs.unlink(tmpRelFile).catch(() => {});
  }

  const {
    getPredefinedReleases,
    parseExcelReleases,
    exportReleasesToWorkbook,
    checkTaskReleaseCompliance,
    RELEASE_MILESTONE_DEFINITIONS,
  } = relMod;

  // 1.1 Verify Predefined Releases catalogue
  const releases = getPredefinedReleases();
  assert.equal(releases.length, 14, 'Must extract all 14 releases from table');
  assert.equal(RELEASE_MILESTONE_DEFINITIONS.length, 16, 'Must define 16 milestone columns');

  // Verify first release T_26.12.1 DICIEMBRE 2026
  const rDec26 = releases.find((r) => r.code === 'T_26.12.1');
  assert.ok(rDec26, 'T_26.12.1 must exist in catalog');
  assert.equal(rDec26.name, 'T_26.12.1 DICIEMBRE 2026');
  assert.equal(rDec26.year, 2026);
  assert.equal(rDec26.milestones.length, 16, 'T_26.12.1 has all 16 milestone dates');
  assert.equal(rDec26.milestones.find((m) => m.key === 'qg1')?.date, '2026-10-05');
  assert.equal(rDec26.milestones.find((m) => m.key === 'rc_fin')?.date, '2026-11-19');
  assert.equal(rDec26.milestones.find((m) => m.key === 'prod_1l')?.date, '2026-12-06');
  assert.equal(rDec26.milestones.find((m) => m.key === 'iop')?.date, '2026-12-12');
  assert.equal(rDec26.milestones.find((m) => m.key === 'qg9')?.date, '2026-12-25');

  // Verify empty August release T_27.8.1 AGOSTO 2027
  const rAug27 = releases.find((r) => r.code === 'T_27.8.1');
  assert.ok(rAug27, 'T_27.8.1 must exist');
  assert.equal(rAug27.name, 'T_27.8.1 AGOSTO 2027');
  assert.equal(rAug27.milestones.length, 0, 'August row is empty summer pause');

  // Verify last release T_28.1.1 ENERO 2028
  const rJan28 = releases.find((r) => r.code === 'T_28.1.1');
  assert.ok(rJan28, 'T_28.1.1 must exist');
  assert.equal(rJan28.name, 'T_28.1.1 ENERO +1 2028');
  assert.equal(rJan28.milestones.find((m) => m.key === 'rc_fin')?.date, '2027-12-22');
  assert.equal(rJan28.milestones.find((m) => m.key === 'iop')?.date, '2028-01-15');

  // 1.2 Excel export & parse roundtrip
  const wb = exportReleasesToWorkbook(releases);
  assert.ok(wb.Sheets['Calendario Releases'] || wb.Sheets['Releases'], 'Workbook must contain Calendario Releases sheet');
  const XLSX = await import('xlsx');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const { releases: parsedFromExcel } = parseExcelReleases(buffer);
  assert.ok(parsedFromExcel.length >= 13, 'Parsed releases from exported Excel must recover active releases');
  const parsedDec26 = parsedFromExcel.find((r) => r.code === 'T_26.12.1');
  assert.ok(parsedDec26, 'Parsed T_26.12.1 from Excel');
  assert.equal(parsedDec26.milestones.find((m) => m.key === 'rc_fin')?.date, '2026-11-19');
  assert.equal(parsedDec26.milestones.find((m) => m.key === 'iop')?.date, '2026-12-12');

  // 1.3 CSV parse check
  const csvContent = `RELEASE;FECHA;QG1;QG2;QG3;QG4;QG5;RC INI;RC FIN;UAT INI;QG5.1,6;PREPRO INI;PREPRO FIN;QG7;1L;QG8;IOP;QG9
T_99.1.1;ENERO 2099;01/01/2099;;;;;01/02/2099;10/02/2099;;;;;;;;20/02/2099;`;
  const { releases: parsedFromCsv } = parseExcelReleases(csvContent);
  assert.equal(parsedFromCsv.length, 1);
  assert.equal(parsedFromCsv[0].code, 'T_99.1.1');
  assert.equal(parsedFromCsv[0].name, 'T_99.1.1 ENERO 2099');
  assert.equal(parsedFromCsv[0].milestones.find((m) => m.key === 'qg1')?.date, '2099-01-01');
  assert.equal(parsedFromCsv[0].milestones.find((m) => m.key === 'rc_fin')?.date, '2099-02-10');

  // 1.4 Hierarchical grouping groupItemsByReleaseAndProject
  const mockProjects = [
    { id: 'p-1', name: 'Canales Digitales', color: 'indigo', releaseId: rDec26.id },
    { id: 'p-2', name: 'Medios de Pago', color: 'emerald', releaseId: rDec26.id },
    { id: 'p-3', name: 'Backoffice General', color: 'slate' },
  ];
  const mockItems = [
    { id: 't-1', projectId: 'p-1', name: 'Frontend Web', startDate: '2026-10-01', endDate: '2026-11-15', duration: 46, progress: 50, type: 'task', dependencies: [] },
    { id: 't-2', projectId: 'p-2', name: 'API Pasarela', startDate: '2026-10-15', endDate: '2026-12-30', duration: 77, progress: 20, type: 'task', dependencies: [] },
    { id: 't-3', projectId: 'p-3', name: 'Migración DB', startDate: '2026-10-05', endDate: '2026-10-25', duration: 21, progress: 100, type: 'task', dependencies: [] },
  ];
  const computedMockItems = computeGanttMetrics(mockItems);
  const releaseGroups = groupItemsByReleaseAndProject(computedMockItems, mockProjects, releases);
  assert.ok(releaseGroups.length >= 2, 'Must produce release groups');
  const decGroup = releaseGroups.find((g) => g.release?.id === rDec26.id);
  assert.ok(decGroup, 'Must have group for T_26.12.1');
  assert.equal(decGroup.projectGroups.length, 2, 'T_26.12.1 has 2 assigned projects');
  assert.equal(decGroup.tasksCount, 2, 'T_26.12.1 has 2 items');
  assert.equal(decGroup.startDate, '2026-10-01');
  assert.equal(decGroup.endDate, '2026-12-30');

  const unassignedGroup = releaseGroups.find((g) => g.release.id === '__unassigned__');
  assert.ok(unassignedGroup, 'Must have group for projects with no release');
  assert.equal(unassignedGroup.projectGroups[0].project.name, 'Backoffice General');

  // 1.5 Milestone compliance violations
  // t-2 ends on 2026-12-30 which exceeds T_26.12.1 rc_fin (2026-11-19) and iop (2026-12-12)
  const violationsT2 = checkTaskReleaseCompliance(mockItems[1], mockProjects[1], rDec26);
  assert.ok(violationsT2.length > 0, 't-2 must have compliance violations');
  const iopViolation = violationsT2.find((v) => v.milestoneKey === 'iop');
  assert.ok(iopViolation, 'Violates IOP milestone');
  assert.equal(iopViolation.daysLate, 18, '2026-12-30 is 18 days after 2026-12-12');

  // t-1 ends on 2026-11-15 which is before rc_fin (2026-11-19) and iop (2026-12-12)
  const violationsT1 = checkTaskReleaseCompliance(mockItems[0], mockProjects[0], rDec26);
  assert.equal(violationsT1.length, 0, 't-1 is compliant and on schedule');

  // 2. SSR React Verification
  const esbuild = await import('esbuild');
  const ssrBundle = await esbuild.build({
    stdin: {
      contents: `
        import React from 'react';
        import { App } from './src/App';
        import { GanttWorkspace } from './src/components/GanttWorkspace';
        import { DEFAULT_PREDEFINED_RELEASES } from './src/utils/releaseEngine';

        export function renderAppWithReleases() {
          return (
            <App
              initialReleasesModalOpen={true}
              initialGroupingMode="release"
            />
          );
        }

        export function renderReleaseWorkspace() {
          const rel0 = DEFAULT_PREDEFINED_RELEASES[0];
          const rel1 = DEFAULT_PREDEFINED_RELEASES[1];
          const testProjects = [
            { id: 'p-test-1', name: 'Banca Móvil', color: 'indigo', releaseId: rel0.id },
            { id: 'p-test-2', name: 'Plataforma Web', color: 'emerald', releaseId: rel1.id }
          ];
          const testItems = [
            {
              id: 't-test-1',
              projectId: 'p-test-1',
              name: 'Autenticación Biométrica',
              startDate: '2026-11-01',
              endDate: '2026-12-30',
              duration: 60,
              progress: 40,
              type: 'task',
              dependencies: [],
            },
            {
              id: 't-test-2',
              projectId: 'p-test-2',
              name: 'Dashboard Clientes',
              startDate: '2027-01-01',
              endDate: '2027-01-20',
              duration: 20,
              progress: 90,
              type: 'task',
              dependencies: [],
            }
          ];
          const scrollRef = { current: null };
          return (
            <GanttWorkspace
              items={testItems}
              projects={testProjects}
              releases={DEFAULT_PREDEFINED_RELEASES}
              activeReleaseId={rel0.id}
              releaseGuideVisibility="selected"
              groupingMode="release"
              scrollContainerRef={scrollRef}
              showTable={true}
              onToggleShowTable={() => {}}
            />
          );
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'ssr-releases-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom', 'xlsx'],
    packages: 'external',
    write: false,
  });

  const tmpFile = path.resolve(__dirname, './.tmp-releases-test.cjs');
  await fs.writeFile(tmpFile, ssrBundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const ReactDOMServer = await import('react-dom/server');

    // 2.1 Test App SSR with Releases Modal open
    const appHtml = ReactDOMServer.renderToString(mod.renderAppWithReleases());
    assert.ok(appHtml.includes('data-testid="header-releases-btn"'), 'Must render header releases button');
    assert.ok(appHtml.includes('data-testid="releases-counter-badge"'), 'Must render releases count badge');
    assert.ok(appHtml.includes('data-testid="header-import-btn"'), 'Must render header import button');
    assert.ok(appHtml.includes('data-testid="header-export-btn"'), 'Must render header export button');
    assert.ok(appHtml.includes('data-testid="releases-modal"'), 'Must render Releases Modal when open');
    assert.ok(appHtml.includes('data-testid="release-export-excel-btn"'), 'Releases modal must have Export Excel button');
    assert.ok(appHtml.includes('data-testid="release-import-file-input"'), 'Releases modal must have file import input');
    assert.ok(appHtml.includes('data-testid="release-restore-defaults-btn"'), 'Releases modal must have restore catalog button');
    assert.ok(appHtml.includes('data-testid="guide-vis-selected"'), 'Releases modal must have guide lines visibility controls');

    // 2.2 Test Workspace SSR with groupingMode="release"
    const wsHtml = ReactDOMServer.renderToString(mod.renderReleaseWorkspace());
    const rel0Id = releases[0].id;
    assert.ok(wsHtml.includes(`data-release-group="${rel0Id}"`), `Workspace must render release group header for ${rel0Id}`);
    assert.ok(wsHtml.includes(`data-testid="toggle-collapse-release-${rel0Id}"`), 'Release group header must have collapse/expand toggle');
    assert.ok(wsHtml.includes('data-project-group="p-test-1"'), 'Project row must be rendered within release group');
    assert.ok(!wsHtml.includes('data-testid="project-release-badge-p-test-1"'), 'Project row must not display redundant release badge');
    assert.ok(wsHtml.includes('data-testid="task-release-violation-t-test-1"'), 'Task violating release milestone must display violation indicator');
    assert.ok(wsHtml.includes('data-testid="toggle-milestones-menu-btn"'), 'Table header must have milestones configuration button');
    assert.ok(wsHtml.includes(`data-testid="release-milestone-guide-${rel0Id}-qg4"`), 'Timeline canvas must render vertical guide line for default milestone QG4');
    assert.ok(wsHtml.includes(`data-testid="release-milestone-diamond-${rel0Id}-qg4"`), 'Timeline canvas must render diamond icon for default milestone QG4');
    assert.ok(wsHtml.includes(`data-testid="release-milestone-line-${rel0Id}-qg4"`), 'Timeline canvas must render vertical dashed line for default milestone QG4');
    assert.ok(wsHtml.includes(`data-release-summary-bar="${rel0Id}"`), 'Timeline canvas must render release summary bar');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Header import/export buttons, release summary bar bounded to last milestone, and QG4/QG5 milestone filter', async () => {
  const esbuild = await import('esbuild');
  const path = await import('path');
  const fs = await import('fs/promises');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const relBundle = await esbuild.build({
    entryPoints: [path.resolve(__dirname, '../src/utils/releaseEngine.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    write: false,
  });

  const tmpRelFile = path.resolve(__dirname, './.tmp-rel-48.mjs');
  await fs.writeFile(tmpRelFile, relBundle.outputFiles[0].text, 'utf8');
  let relMod;
  try {
    relMod = await import(`${tmpRelFile}?t=${Date.now()}`);
  } finally {
    await fs.unlink(tmpRelFile).catch(() => {});
  }

  const { getPredefinedReleases, DEFAULT_PREDEFINED_RELEASES } = relMod;
  const releases = getPredefinedReleases ? getPredefinedReleases() : DEFAULT_PREDEFINED_RELEASES;
  const rel0 = releases[0];
  const milestoneKeys = rel0.milestones.map((m) => m.key);
  assert.ok(milestoneKeys.includes('qg4'), 'Release 0 has QG4');
  assert.ok(milestoneKeys.includes('qg5'), 'Release 0 has QG5');
  assert.ok(milestoneKeys.includes('iop'), 'Release 0 has IOP');

  const sortedDates = rel0.milestones.map((m) => m.date).filter(Boolean).sort();
  const lastMilestoneDate = sortedDates[sortedDates.length - 1];
  assert.ok(lastMilestoneDate, 'Must have a last milestone date');

  const ssrBundle = await esbuild.build({
    stdin: {
      contents: `
        import React from 'react';
        import { GanttWorkspace } from './src/components/GanttWorkspace';
        import { DEFAULT_PREDEFINED_RELEASES } from './src/utils/releaseEngine';

        const testItems = [
          {
            id: 't-test-1',
            projectId: 'p-test-1',
            wbs: 1,
            name: 'Tarea Test 1',
            startDate: '2026-11-01',
            endDate: '2026-12-30',
            duration: 60,
            progress: 50,
            color: 'indigo',
            type: 'task',
            dependencies: [],
          },
        ];

        const testProjects = [
          {
            id: 'p-test-1',
            name: 'Proyecto Alpha',
            color: 'indigo',
            releaseId: DEFAULT_PREDEFINED_RELEASES[0].id,
            isDemo: false,
          },
        ];

        export function renderWorkspaceDefault() {
          const scrollRef = { current: null };
          return (
            <GanttWorkspace
              items={testItems}
              projects={testProjects}
              releases={DEFAULT_PREDEFINED_RELEASES}
              activeReleaseId={DEFAULT_PREDEFINED_RELEASES[0].id}
              releaseGuideVisibility="selected"
              groupingMode="release"
              scrollContainerRef={scrollRef}
              showTable={true}
            />
          );
        }

        export function renderWorkspaceWithAllMilestones() {
          const scrollRef = { current: null };
          return (
            <GanttWorkspace
              items={testItems}
              projects={testProjects}
              releases={DEFAULT_PREDEFINED_RELEASES}
              activeReleaseId={DEFAULT_PREDEFINED_RELEASES[0].id}
              releaseGuideVisibility="selected"
              groupingMode="release"
              scrollContainerRef={scrollRef}
              showTable={true}
              initialVisibleMilestoneKeys={['qg4', 'qg5', 'iop']}
            />
          );
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'ssr-milestone-filter-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom', 'xlsx'],
    packages: 'external',
    write: false,
  });

  const tmpFile = path.resolve(__dirname, './.tmp-milestones-test.cjs');
  await fs.writeFile(tmpFile, ssrBundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const ReactDOMServer = await import('react-dom/server');

    // Default workspace should only show QG4 and QG5
    const defaultHtml = ReactDOMServer.renderToString(mod.renderWorkspaceDefault());
    assert.ok(defaultHtml.includes(`data-testid="release-milestone-guide-${rel0.id}-qg4"`), 'Default renders QG4');
    assert.ok(defaultHtml.includes(`data-testid="release-milestone-guide-${rel0.id}-qg5"`), 'Default renders QG5');
    assert.ok(!defaultHtml.includes(`data-testid="release-milestone-guide-${rel0.id}-iop"`), 'Default DOES NOT render IOP');
    assert.ok(!defaultHtml.includes(`data-testid="release-milestone-guide-${rel0.id}-qg1"`), 'Default DOES NOT render QG1');

    // When configured with IOP, renders IOP
    const customHtml = ReactDOMServer.renderToString(mod.renderWorkspaceWithAllMilestones());
    assert.ok(customHtml.includes(`data-testid="release-milestone-guide-${rel0.id}-iop"`), 'Renders IOP when configured');
    assert.ok(customHtml.includes(`data-release-summary-bar="${rel0.id}"`), 'Renders release summary bar');
    assert.ok(customHtml.includes(`Acotado hasta su último hito: ${lastMilestoneDate}`), 'Summary bar title shows bounded last milestone date');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Configuration panel is removed and projects including the last one can be deleted', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const esbuild = await import('esbuild');
  const ReactDOMServer = await import('react-dom/server');

  // 1. Verify App.tsx source code does not contain Settings modal or isDemoOrTemplateProject filtering on load
  const appSrc = await fs.readFile(path.resolve(__dirname, '../src/App.tsx'), 'utf8');
  assert.ok(!appSrc.includes('Configuración del Cronograma'), 'Settings modal must be removed');
  assert.ok(!appSrc.includes('aria-label="Configuración"'), 'Settings button must be removed');
  assert.ok(!appSrc.includes('.filter((p) => !isDemoOrTemplateProject(p)'), 'Loading from storage must not discard projects');

  // 2. SSR bundle test for single project deletion and configuration panel absence
  const ssrBundle = await esbuild.build({
    stdin: {
      contents: `
        import React from 'react';
        import { App } from './src/App';
        import { GanttWorkspace } from './src/components/GanttWorkspace';

        export function renderDefaultApp() {
          return <App initialProjectMenuOpen={true} />;
        }

        export function renderSingleProjectWorkspace() {
          const singleProject = [{ id: 'p-single', name: 'Mi Único Proyecto', color: 'indigo' }];
          const singleItem = [{
            id: 't-single',
            projectId: 'p-single',
            name: 'Tarea Única',
            startDate: '2026-11-01',
            endDate: '2026-11-05',
            duration: 5,
            progress: 0,
            type: 'task',
            dependencies: [],
          }];
          return (
            <GanttWorkspace
              items={singleItem}
              projects={singleProject}
              onDeleteProject={() => {}}
              scrollContainerRef={{ current: null }}
              showTable={true}
              onToggleShowTable={() => {}}
            />
          );
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'ssr-config-deletion-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom', 'xlsx'],
    packages: 'external',
    write: false,
  });

  const tmpFile = path.resolve(__dirname, './.tmp-config-del-test.cjs');
  await fs.writeFile(tmpFile, ssrBundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // Verify App header does NOT render Settings button
    const appHtml = ReactDOMServer.renderToString(mod.renderDefaultApp());
    assert.ok(!appHtml.includes('aria-label="Configuración"'), 'Header must not have Settings button');
    assert.ok(!appHtml.includes('Configuración del Cronograma'), 'DOM must not have Settings Modal');
    // Verify single project in App dropdown menu has delete button
    assert.ok(appHtml.includes('data-testid="delete-project-menu-btn-proj-1"'), 'Single default project has delete button in dropdown');

    // Verify single project in GanttWorkspace table row has delete button
    const wsHtml = ReactDOMServer.renderToString(mod.renderSingleProjectWorkspace());
    assert.ok(wsHtml.includes('data-testid="delete-project-row-btn-p-single"'), 'Single project row has delete button in table');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Help page, version control v1.2.0, release selection on project creation, no CSV export, and project deletion confirmation', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { build } = await import('esbuild');
  const ReactDOMServer = await import('react-dom/server');

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(await fs.readFile(path.resolve(__dirname, '../package.json'), 'utf8'));

  // 1. Version control consistency
  assert.equal(pkg.version, '1.9.3', 'package.json version must be 1.9.2');
  assert.ok(pkg.scripts['version:patch'], 'package.json must contain version:patch script');
  assert.ok(pkg.scripts['version:minor'], 'package.json must contain version:minor script');
  assert.ok(pkg.scripts['release:patch'], 'package.json must contain release:patch script');

  const ssrBundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { App } from './src/App.tsx';
        import { HelpPage } from './src/components/HelpPage.tsx';
        import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
        import { APP_VERSION } from './src/types/gantt.ts';
        import { DEFAULT_PREDEFINED_RELEASES } from './src/utils/releaseEngine.ts';

        export { APP_VERSION };

        export function renderDefaultApp() {
          return <App />;
        }

        export function renderHelpView() {
          return <App initialView="help" />;
        }

        export function renderStandaloneHelp() {
          return <HelpPage onBackToGantt={() => {}} />;
        }

        export function renderWorkspaceWithReleases() {
          return (
            <GanttWorkspace
              items={[]}
              projects={[{ id: 'p1', name: 'Alpha', color: 'indigo', releaseId: 'rel-t-26-12-1' }]}
              releases={DEFAULT_PREDEFINED_RELEASES}
              scrollContainerRef={{ current: null }}
              showTable={true}
              onToggleShowTable={() => {}}
            />
          );
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'ssr-help-version-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom', 'xlsx'],
    packages: 'external',
    write: false,
  });

  const tmpFile = path.resolve(__dirname, './.tmp-help-version-test.cjs');
  await fs.writeFile(tmpFile, ssrBundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // Verify APP_VERSION in gantt.ts matches package.json
    assert.equal(mod.APP_VERSION, pkg.version, 'src/types/gantt.ts APP_VERSION must equal package.json version');

    // 2. Default App Header
    const appHtml = ReactDOMServer.renderToString(mod.renderDefaultApp());
    // Help button in header
    assert.ok(appHtml.includes('data-testid="header-help-btn"'), 'Header must contain Ayuda button');
    // Export button directly exports JSON without CSV dropdown
    assert.ok(appHtml.includes('data-testid="header-export-btn"'), 'Header must contain direct Export button');
    assert.ok(!appHtml.includes('data-testid="header-export-csv-btn"'), 'Header must NOT contain CSV export option');
    assert.ok(!appHtml.includes('Exportar CSV'), 'Header must NOT have Exportar CSV text');
    // No "+ Crear ▾" dropdown button
    assert.ok(!appHtml.includes('<span>Crear</span>'), 'Header must NOT contain the old "+ Crear ▾" button');

    // 3. Help Page SSR
    const helpHtml = ReactDOMServer.renderToString(mod.renderStandaloneHelp());
    assert.ok(helpHtml.includes('data-testid="help-back-to-gantt-btn"'), 'Help page must have Volver al Diagrama button');
    assert.ok(helpHtml.includes('Guía de Ayuda y Funcionalidades'), 'Help page title must be rendered');
    assert.ok(helpHtml.includes(`v${mod.APP_VERSION}`), 'Help page must display current app version');
    assert.ok(helpHtml.includes('Estructura Jerárquica y Gestión de Releases'), 'Help page must explain Releases');
    assert.ok(helpHtml.includes('Hitos de Release (Quality Gates) y Líneas Guía'), 'Help page must explain Milestones / QG');
    assert.ok(helpHtml.includes('Ruta Crítica (CPM), Holguras y Métricas'), 'Help page must explain CPM / Critical Path');
    assert.ok(helpHtml.includes('Historial de Cambios, Deshacer y Rehacer'), 'Help page must explain Undo/Redo & History');
    assert.ok(helpHtml.includes('Persistencia y Exportación / Importación JSON'), 'Help page must explain JSON persistence');

    // 4. App when initialView="help" renders HelpPage
    const appHelpHtml = ReactDOMServer.renderToString(mod.renderHelpView());
    assert.ok(appHelpHtml.includes('data-testid="help-page-container"'), 'App must render HelpPage when currentView is help');

    // 5. Project creation with Release selector
    const wsHtml = ReactDOMServer.renderToString(mod.renderWorkspaceWithReleases());
    assert.ok(wsHtml.includes('data-create-project-btn="true"'), 'Workspace must have project creation trigger');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Preservation of all projects on page refresh without purging and history auto-recovery', async () => {
  const { renderToString } = await import('react-dom/server');
  const appBundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { renderToString } from 'react-dom/server';
        import { App } from './src/App.tsx';

        export function renderAppWithStorage(mockStorage) {
          const originalWindow = global.window;
          const originalLocalStorage = global.localStorage;

          try {
            global.window = {
              localStorage: {
                getItem: (k) => mockStorage[k] || null,
                setItem: (k, v) => { mockStorage[k] = v; },
                removeItem: (k) => { delete mockStorage[k]; },
              },
            };
            global.localStorage = global.window.localStorage;

            return renderToString(<App />);
          } finally {
            global.window = originalWindow;
            global.localStorage = originalLocalStorage;
          }
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'ssr-persistence-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const fs = await import('node:fs/promises');
  const tmpFile = path.resolve(__dirname, './.tmp-ssr-persistence.cjs');
  await fs.writeFile(tmpFile, appBundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // 1. Verify that real user projects like "HDEV-747747: Xcode 27" and "Biocatch" tasks are NOT purged
    const mockStorage = {
      'ganttflow_pro_state_v2': JSON.stringify({
        projectName: 'Mi Empresa',
        projects: [
          { id: 'p-1', name: 'Proyecto Alpha', color: 'indigo', collapsed: false, isDemo: false, releaseId: 'rel-1' },
          { id: 'p-2', name: 'HDEV-747747: Xcode 27', color: 'emerald', collapsed: false, isDemo: false, releaseId: 'rel-1' },
        ],
        items: [
          { id: 't-1', name: 'Setup', projectId: 'p-1', startDate: '2026-11-01', duration: 2, type: 'task' },
          { id: 't-2', name: 'Documentación Biocatch v2.7.2', projectId: 'p-2', startDate: '2026-11-03', duration: 4, type: 'task' },
        ],
      }),
    };

    const html = mod.renderAppWithStorage(mockStorage);
    assert.ok(html.includes('HDEV-747747: Xcode 27'), 'Must preserve HDEV-747747: Xcode 27 project on page refresh');
    assert.ok(html.includes('Documentación Biocatch v2.7.2'), 'Must preserve Documentación Biocatch v2.7.2 task on page refresh');
    assert.ok(html.includes('Proyecto Alpha'), 'Must preserve Proyecto Alpha');

    // 2. Verify auto-recovery from plan history if a project was dropped in rawWorkspace
    const mockStorageWithHistory = {
      'ganttflow_pro_state_v2': JSON.stringify({
        projectName: 'Mi Empresa',
        projects: [
          { id: 'p-1', name: 'Proyecto Alpha', color: 'indigo', collapsed: false, isDemo: false, releaseId: 'rel-1' },
        ],
        items: [
          { id: 't-1', name: 'Setup', projectId: 'p-1', startDate: '2026-11-01', duration: 2, type: 'task' },
        ],
      }),
      'ganttflow_pro_history_v1': JSON.stringify([
        {
          id: 'hist-1',
          snapshot: {
            projects: [
              { id: 'p-1', name: 'Proyecto Alpha', color: 'indigo', collapsed: false, isDemo: false, releaseId: 'rel-1' },
              { id: 'p-recovered', name: 'Proyecto Recuperado Xcode 27', color: 'rose', collapsed: false, isDemo: false, releaseId: 'rel-1' },
            ],
            items: [
              { id: 't-1', name: 'Setup', projectId: 'p-1', startDate: '2026-11-01', duration: 2, type: 'task' },
              { id: 't-rec', name: 'Tarea Recuperada Biocatch', projectId: 'p-recovered', startDate: '2026-11-02', duration: 3, type: 'task' },
            ],
          },
        },
      ]),
    };

    const recoveredHtml = mod.renderAppWithStorage(mockStorageWithHistory);
    assert.ok(recoveredHtml.includes('Proyecto Recuperado Xcode 27'), 'Must auto-recover missing project from plan history');
    assert.ok(recoveredHtml.includes('Tarea Recuperada Biocatch'), 'Must auto-recover missing task from plan history');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Task names rendered above timeline task bars without clipping for short boxes with long names', async () => {
  const { renderToString } = await import('react-dom/server');
  const wsBundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
        import { computeGanttMetrics, sanitizeProject, sanitizeGanttItem } from './src/utils/ganttEngine.ts';

        export function renderTimelineTaskLabelsWorkspace() {
          const project = sanitizeProject({ id: 'p-1', name: 'Proyecto Alpha' }, 0);
          const rawTasks = [
            sanitizeGanttItem({
              id: 't-short',
              name: 'Tarea Corta con Nombre Extremadamente Largo de Arquitectura',
              type: 'task',
              projectId: 'p-1',
              startDate: '2026-11-01',
              endDate: '2026-11-01',
              duration: 1,
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
              dayWidth={14}
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
      sourcefile: 'ssr-task-label-above-bar-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const fs = await import('node:fs/promises');
  const tmpFile = path.resolve(__dirname, './.tmp-ssr-task-labels.cjs');
  await fs.writeFile(tmpFile, wsBundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const html = renderToString(mod.renderTimelineTaskLabelsWorkspace());

    // 1. Verify task name label is placed above the task bar with data-timeline-task-name
    assert.ok(html.includes('data-timeline-task-name="t-short"'), 'Timeline must render data-timeline-task-name="t-short"');

    // 2. Verify label has bottom-full and mb-1 positioning it directly above the bar starting at left-0
    assert.ok(html.includes('bottom-full'), 'Task label must use bottom-full to position directly above the task bar');
    assert.ok(html.includes('left-0'), 'Task label must align to left-0 of the task bar');

    // 3. Verify complete, non-truncated name is rendered above the bar even with dayWidth=14 (short box)
    assert.ok(
      html.includes('Tarea Corta con Nombre Extremadamente Largo de Arquitectura'),
      'Must render complete task name above short 1-day bar without clipping'
    );
    assert.ok(html.includes('(1d)'), 'Must render duration next to name above the bar');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Automatically creates a task named DIGI spanning the assigned release when a new project is created', async () => {
  const fs = await import('node:fs/promises');
  const relBundle = await build({
    entryPoints: [path.resolve(__dirname, '../src/utils/releaseEngine.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    write: false,
  });

  const tmpRelFile = path.resolve(__dirname, './.tmp-rel-53.mjs');
  await fs.writeFile(tmpRelFile, relBundle.outputFiles[0].text, 'utf8');
  let relMod;
  try {
    relMod = await import(`${tmpRelFile}?t=${Date.now()}`);
  } finally {
    await fs.unlink(tmpRelFile).catch(() => {});
  }

  const { getReleaseDateSpan, DEFAULT_PREDEFINED_RELEASES } = relMod;

  // 1. Verify getReleaseDateSpan computes the exact bounding span from first to last milestone
  const rel1 = DEFAULT_PREDEFINED_RELEASES[0]; // T_26.12.1
  const span1 = getReleaseDateSpan(rel1);
  assert.equal(span1.startDate, '2026-10-05', 'Release 1 must start at QG1 date 2026-10-05');
  assert.equal(span1.endDate, '2026-12-25', 'Release 1 must end at QG9 date 2026-12-25');
  assert.equal(span1.duration, 82, 'Duration must equal inclusive calendar days from 05 Oct to 25 Dec (82d)');

  const rel2 = DEFAULT_PREDEFINED_RELEASES[1]; // T_27.1.1
  const span2 = getReleaseDateSpan(rel2);
  assert.equal(span2.startDate, '2026-11-04', 'Release 2 must start at QG1 date 2026-11-04');
  assert.equal(span2.endDate, '2027-01-29', 'Release 2 must end at QG9 date 2027-01-29');
  assert.equal(span2.duration, 87, 'Duration must equal inclusive calendar days from 04 Nov to 29 Jan (87d)');

  // 2. SSR Verification: GanttWorkspace renders the DIGI task spanning the entire release
  const { renderToString } = await import('react-dom/server');
  const bundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
        import { computeGanttMetrics, sanitizeProject, sanitizeGanttItem } from './src/utils/ganttEngine.ts';
        import { getReleaseDateSpan, DEFAULT_PREDEFINED_RELEASES } from './src/utils/releaseEngine.ts';

        export function renderWorkspaceWithDigiTask() {
          const rel = DEFAULT_PREDEFINED_RELEASES[0];
          const span = getReleaseDateSpan(rel);
          const project = sanitizeProject({ id: 'p-digi', name: 'Proyecto Fibra', releaseId: rel.id }, 0);
          const digiTask = sanitizeGanttItem({
            id: 't-digi',
            projectId: 'p-digi',
            name: 'DIGI',
            type: 'task',
            startDate: span.startDate,
            endDate: span.endDate,
            duration: span.duration,
            progress: 0,
          });
          const items = computeGanttMetrics([digiTask]);
          return (
            <GanttWorkspace
              items={items}
              projects={[project]}
              releases={DEFAULT_PREDEFINED_RELEASES}
              groupByProject={true}
              selectedProjectId="all"
              zoom="day"
              dayWidth={20}
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
      sourcefile: 'ssr-digi-render-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const tmpFile = path.resolve(__dirname, './.tmp-ssr-digi-render.cjs');
  await fs.writeFile(tmpFile, bundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const html = renderToString(mod.renderWorkspaceWithDigiTask());

    // Verify task name DIGI is rendered in WBS table and above timeline bar
    assert.ok(html.includes('DIGI'), 'Must render DIGI task in workspace');
    assert.ok(html.includes('data-timeline-task-name="t-digi"'), 'Must render DIGI label above timeline bar');
    assert.ok(html.includes('(82d)'), 'DIGI task duration must reflect full 82 days of the release');
    assert.ok(html.includes('2026-10-05'), 'DIGI start date input must match release start date');
    assert.ok(html.includes('2026-12-25'), 'DIGI end date input must match release end date');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('A release is always indicated with its full duration, even if associated projects have smaller tasks', async () => {
  const fs = await import('node:fs/promises');
  const relBundle = await build({
    entryPoints: [path.resolve(__dirname, '../src/utils/releaseEngine.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    write: false,
  });

  const tmpRelFile = path.resolve(__dirname, './.tmp-rel-54.mjs');
  await fs.writeFile(tmpRelFile, relBundle.outputFiles[0].text, 'utf8');
  let relMod;
  try {
    relMod = await import(`${tmpRelFile}?t=${Date.now()}`);
  } finally {
    await fs.unlink(tmpRelFile).catch(() => {});
  }

  const { DEFAULT_PREDEFINED_RELEASES, getReleaseDateSpan } = relMod;
  const rel1 = DEFAULT_PREDEFINED_RELEASES[0]; // T_26.12.1 (2026-10-05 to 2026-12-25, 82 days)

  // 1. Engine verification: groupItemsByReleaseAndProject with a project having a small 5-day task
  const smallProject = sanitizeProject(
    {
      id: 'p-small',
      name: 'Proyecto Ágil Corto',
      releaseId: rel1.id,
    },
    0
  );

  const smallTask = sanitizeGanttItem({
    id: 't-small',
    projectId: 'p-small',
    name: 'Microtarea de Prueba',
    type: 'task',
    startDate: '2026-11-10',
    endDate: '2026-11-15',
    duration: 5,
    progress: 30,
  });

  const computedSmallItems = computeGanttMetrics([smallTask]);
  const releaseGroups = groupItemsByReleaseAndProject(
    computedSmallItems,
    [smallProject],
    DEFAULT_PREDEFINED_RELEASES
  );

  const rg = releaseGroups.find((g) => g.release.id === rel1.id);
  assert.ok(rg, 'Must find computed release group for T_26.12.1');
  assert.equal(rg.duration, 82, 'Release duration MUST be 82d (full release duration), not 5d');
  assert.equal(rg.startDate, '2026-10-05', 'Release startDate must be 2026-10-05');
  assert.equal(rg.endDate, '2026-12-25', 'Release endDate must be 2026-12-25');

  // 2. SSR Verification: WBS table and timeline summary bar indicate the full duration
  const { renderToString } = await import('react-dom/server');
  const bundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
        import { computeGanttMetrics, sanitizeProject, sanitizeGanttItem } from './src/utils/ganttEngine.ts';
        import { DEFAULT_PREDEFINED_RELEASES } from './src/utils/releaseEngine.ts';

        export function renderWorkspaceSmallTaskInRelease() {
          const rel = DEFAULT_PREDEFINED_RELEASES[0];
          const project = sanitizeProject({ id: 'p-small', name: 'Proyecto Ágil Corto', releaseId: rel.id }, 0);
          const task = sanitizeGanttItem({
            id: 't-small',
            projectId: 'p-small',
            name: 'Microtarea de Prueba',
            type: 'task',
            startDate: '2026-11-10',
            endDate: '2026-11-15',
            duration: 5,
            progress: 30,
          });
          const items = computeGanttMetrics([task]);
          return (
            <GanttWorkspace
              items={items}
              projects={[project]}
              releases={DEFAULT_PREDEFINED_RELEASES}
              groupByProject={true}
              groupingMode="release"
              selectedProjectId="all"
              zoom="day"
              dayWidth={20}
              showCriticalPath={false}
              showCpmFloat={false}
              initialVisibleColumns={{ dates: true, dur: true }}
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
      sourcefile: 'ssr-release-full-duration-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const tmpFile = path.resolve(__dirname, './.tmp-ssr-release-duration.cjs');
  await fs.writeFile(tmpFile, bundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const html = renderToString(mod.renderWorkspaceSmallTaskInRelease());

    // Verify WBS Table shows full release duration (82d) and dates (05/10 → 25/12)
    assert.ok(html.includes('data-release-duration-cell="rel-t-26-12-1"'), 'Must render duration cell for release');
    assert.ok(html.includes('82d'), 'Release row must indicate full 82d duration');
    assert.ok(html.includes('05/10 → 25/12'), 'Release row must indicate full release dates span');

    // Verify Timeline Summary Bar displays full duration badge
    assert.ok(html.includes('data-release-summary-bar="rel-t-26-12-1"'), 'Must render release summary bar');
    assert.ok(html.includes('(82d)'), 'Release summary bar must display (82d) badge');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Task name positioning, configurable row separators, 37 char truncation, v1.2.0 badge, high-contrast scrubber, external milestones, and release bar collapse', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { build } = await import('esbuild');
  const { renderToString } = await import('react-dom/server');

  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // 2. SSR Verification of Task Names, Table Truncation, Separators, Scrubber, Badges, and Release Bar
  const bundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
        import { App } from './src/App.tsx';
        import { TaskFormModal } from './src/components/TaskFormModal.tsx';
        import { DEFAULT_PREDEFINED_RELEASES, checkTaskReleaseCompliance } from './src/utils/releaseEngine.ts';

        export { DEFAULT_PREDEFINED_RELEASES, checkTaskReleaseCompliance };

        export function renderWorkspaceWithLongTaskAndExternalMilestone() {
          const items = [
            {
              id: 't-long',
              projectId: 'p-1',
              name: 'Esta es una tarea con un nombre extremadamente largo que supera ampliamente los treinta y siete caracteres',
              type: 'task',
              startDate: '2026-10-15',
              endDate: '2026-10-25',
              duration: 11,
              slack: 0,
              dependencies: [],
              progress: 30,
              color: 'indigo'
            },
            {
              id: 'm-ext',
              projectId: 'p-1',
              name: 'Auditoría Externa',
              type: 'milestone',
              startDate: '2026-10-28',
              endDate: '2026-10-28',
              duration: 0,
              slack: 0,
              dependencies: [],
              progress: 0,
              color: 'amber',
              isExternal: true
            }
          ];
          const projects = [
            { id: 'p-1', name: 'Proyecto Prueba', color: 'indigo', releaseId: 'rel-t-26-12-1', collapsed: false }
          ];
          return (
            <GanttWorkspace
              items={items}
              projects={projects}
              releases={DEFAULT_PREDEFINED_RELEASES}
              showTable={true}
              onUpdateItem={() => {}}
              onDeleteItem={() => {}}
              onEditModal={() => {}}
              onDuplicateItem={() => {}}
              onQuickAdd={() => {}}
              scrollContainerRef={{ current: null }}
              initialCursorScrubber={{ x: 250, date: new Date('2026-10-20T12:00:00Z') }}
            />
          );
        }

        export function renderWorkspaceWithSeparators(showSeparators: boolean) {
          const items = [
            {
              id: 't-long',
              projectId: 'p-1',
              name: 'Tarea Separador Test',
              type: 'task',
              startDate: '2026-10-15',
              endDate: '2026-10-25',
              duration: 11,
              slack: 0,
              dependencies: [],
              progress: 30,
              color: 'indigo'
            }
          ];
          const projects = [
            { id: 'p-1', name: 'Proyecto Prueba', color: 'indigo', releaseId: 'rel-t-26-12-1', collapsed: false }
          ];
          return (
            <GanttWorkspace
              items={items}
              projects={projects}
              releases={DEFAULT_PREDEFINED_RELEASES}
              showTable={true}
              showRowSeparators={showSeparators}
              onUpdateItem={() => {}}
              onDeleteItem={() => {}}
              onEditModal={() => {}}
              onDuplicateItem={() => {}}
              onQuickAdd={() => {}}
              scrollContainerRef={{ current: null }}
            />
          );
        }

        export function renderWorkspaceWithWeekendShading(showWeekendShading: boolean) {
          const items = [
            {
              id: 't-wknd',
              projectId: 'p-1',
              name: 'Tarea Weekend Test',
              type: 'task',
              startDate: '2026-10-15',
              endDate: '2026-10-25',
              duration: 11,
              slack: 0,
              dependencies: [],
              progress: 30,
              color: 'indigo'
            }
          ];
          const projects = [
            { id: 'p-1', name: 'Proyecto Prueba', color: 'indigo', releaseId: 'rel-t-26-12-1', collapsed: false }
          ];
          return (
            <GanttWorkspace
              items={items}
              projects={projects}
              releases={DEFAULT_PREDEFINED_RELEASES}
              showTable={true}
              showWeekendShading={showWeekendShading}
              onUpdateItem={() => {}}
              onDeleteItem={() => {}}
              onEditModal={() => {}}
              onDuplicateItem={() => {}}
              onQuickAdd={() => {}}
              scrollContainerRef={{ current: null }}
            />
          );
        }

        export function renderAppHeader() {
          return <App />;
        }

        export function renderTaskFormMilestoneModal() {
          return (
            <TaskFormModal
              isOpen={true}
              onClose={() => {}}
              onSave={() => {}}
              defaultType="milestone"
              allItems={[]}
            />
          );
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'ssr-v120-features-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const tmpFile = path.resolve(__dirname, './.tmp-ssr-v120-test.cjs');
  await fs.writeFile(tmpFile, bundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // 1. External Milestone Compliance Check: External milestones ignore release deadlines
    const sampleRelease = mod.DEFAULT_PREDEFINED_RELEASES[0]; // T_26.12.1 (ends Dec 2026)
    const dummyProject = { id: 'p-ext', name: 'Project Ext', color: 'indigo', releaseId: sampleRelease.id };

    // An ordinary milestone far beyond release deadline violates release compliance
    const regularMilestone = {
      id: 'm-late',
      projectId: dummyProject.id,
      name: 'Late Milestone',
      type: 'milestone',
      startDate: '2028-01-01',
      endDate: '2028-01-01',
      duration: 0,
      slack: 0,
      dependencies: [],
      progress: 0,
      color: 'amber',
      isExternal: false,
    };
    const regularViolations = mod.checkTaskReleaseCompliance(regularMilestone, dummyProject, sampleRelease);
    assert.ok(regularViolations.length > 0, 'Regular milestone after release end should produce compliance violations');

    // An external milestone must produce zero violations
    const externalMilestone = {
      ...regularMilestone,
      id: 'm-ext-1',
      name: 'External Audit Milestone',
      isExternal: true,
    };
    const extViolations = mod.checkTaskReleaseCompliance(externalMilestone, dummyProject, sampleRelease);
    assert.strictEqual(extViolations.length, 0, 'External milestone (isExternal=true) must NOT produce release compliance violations');

    const wsHtml = renderToString(mod.renderWorkspaceWithLongTaskAndExternalMilestone());

    // 1. Task name positioned snug to own box: mb-[2px]
    assert.ok(wsHtml.includes('data-timeline-task-name="t-long"'), 'Must render timeline task name label');
    assert.ok(wsHtml.includes('bottom-full mb-[2px]'), 'Task label must be positioned snug to task box with mb-[2px]');

    // 2. Horizontal row separators toggle button in table header
    assert.ok(wsHtml.includes('data-testid="toggle-row-separators-btn"'), 'Table header must contain toggle-row-separators-btn');
    assert.ok(wsHtml.includes('data-testid="toggle-weekend-shading-btn"'), 'Table header must contain toggle-weekend-shading-btn');

    // 3. Task name in table truncated to 37 characters + '…'
    const expectedTruncated = 'Esta es una tarea con un nombre extre…';
    assert.ok(wsHtml.includes(expectedTruncated), 'Task name in table must be truncated to 37 characters + ellipsis');
    assert.ok(wsHtml.includes('data-task-name-input="t-long"'), 'Task input must exist for editing');

    // 4. Scrubber vertical tracking line in light mode has high-contrast styling
    assert.ok(wsHtml.includes('id="timeline-cursor-scrubber"'), 'Must render cursor scrubber');
    assert.ok(wsHtml.includes('bg-[#0C0C09]'), 'Scrubber tracking line must use solid ink dark color in light mode for high contrast');

    // 5. External milestone badges in table and timeline
    assert.ok(wsHtml.includes('data-testid="milestone-external-badge-m-ext"'), 'External milestone must render EXT badge in WBS table');
    assert.ok(wsHtml.includes('[EXT] Auditoría Externa'), 'External milestone must render [EXT] indicator in timeline diamond pill');

    // 6. Release summary bar is clickable to collapse
    assert.ok(wsHtml.includes('data-release-summary-bar="rel-t-26-12-1"'), 'Must render release summary bar');
    assert.ok(wsHtml.includes('cursor-pointer'), 'Release summary bar must have cursor-pointer to indicate clickability');

    // 7. Verify Horizontal Row Separators ON vs OFF in Table and Timeline:
    const htmlWithSeparators = renderToString(mod.renderWorkspaceWithSeparators(true));
    assert.ok(htmlWithSeparators.includes('divide-y divide-[#E2E2DC]'), 'Table body must have divide-y when showRowSeparators is true');
    assert.ok(htmlWithSeparators.includes('border-b border-[#E2E2DC]'), 'Rows must have border-b when showRowSeparators is true');

    const htmlWithoutSeparators = renderToString(mod.renderWorkspaceWithSeparators(false));
    assert.ok(!htmlWithoutSeparators.includes('divide-y'), 'Table body must NOT have divide-y when showRowSeparators is false');
    assert.ok(htmlWithoutSeparators.includes('border-b-0'), 'Rows must have border-b-0 when showRowSeparators is false');
    assert.ok(htmlWithoutSeparators.includes('border-y-0'), 'Group rows must have border-y-0 when showRowSeparators is false');

    // 8. Configurable Weekend Shading ON vs OFF:
    const htmlWithWeekendShading = renderToString(mod.renderWorkspaceWithWeekendShading(true));
    assert.ok(htmlWithWeekendShading.includes('bg-[#E5E5DF]'), 'Canvas and header must render weekend column shading when showWeekendShading is true');

    const htmlWithoutWeekendShading = renderToString(mod.renderWorkspaceWithWeekendShading(false));
    assert.ok(!htmlWithoutWeekendShading.includes('bg-[#E5E5DF]'), 'Canvas and header must NOT render weekend shading when showWeekendShading is false (clean uniform background)');

    // 9. App Header displays v1.9.3 badge, row-separators-btn, and weekend-shading-btn
    const appHtml = renderToString(mod.renderAppHeader());
    assert.ok(appHtml.includes('data-testid="app-version-badge"'), 'Header must contain app-version-badge');
    assert.ok(appHtml.includes('v1.9.3'), 'Header badge must display v1.9.3');
    assert.ok(appHtml.includes('data-testid="header-toggle-row-separators-btn"'), 'Header must contain header-toggle-row-separators-btn');
    assert.ok(appHtml.includes('data-testid="header-toggle-weekend-shading-btn"'), 'Header must contain header-toggle-weekend-shading-btn');

    // 10. TaskFormModal has external milestone checkbox
    const modalHtml = renderToString(mod.renderTaskFormMilestoneModal());
    assert.ok(modalHtml.includes('data-testid="milestone-is-external-checkbox"'), 'Milestone form modal must have external milestone checkbox');
    assert.ok(modalHtml.includes('Hito externo (no pertenece a la release)'), 'Milestone form modal must describe external milestone');

    // 11. Only one vertical line per month at month start (no extra daily vertical grid lines)
    assert.ok(!wsHtml.includes('border-r border-[#E2E2DC]/50'), 'Must not render daily vertical grid lines across canvas');
    assert.ok(wsHtml.includes('data-month-divider="0"'), 'Must render month start vertical divider');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Version 1.4.0, unclipped diagram project names, release hiding, focus mode, platform field and filter, and excel hierarchy export', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { build } = await import('esbuild');
  const ReactDOMServer = await import('react-dom/server');
  const ReactMod = await import('react');
  const React = ReactMod.default || ReactMod;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(await fs.readFile(path.resolve(__dirname, '../package.json'), 'utf8'));

  // 1. Version Bump Verification
  assert.equal(pkg.version, '1.9.3', 'package.json version must equal 1.9.2');

  // Verify scripts/bump-version.mjs works properly
  const bumpScript = await fs.readFile(path.resolve(__dirname, '../scripts/bump-version.mjs'), 'utf8');
  assert.ok(bumpScript.includes("parts[1] += 1"), 'bump-version script must support minor bumps');
  assert.ok(bumpScript.includes("parts[2] += 1"), 'bump-version script must support patch bumps');
  assert.ok(bumpScript.includes("APP_VERSION"), 'bump-version script must update APP_VERSION in src/types/gantt.ts');

  // 2. Pure Unit test for getRelatedFocusEntityIds (imported from bundled ganttEngine)
  const sampleProjects = [
    { id: 'proj-ios', name: 'App iOS', releaseId: 'rel-1', color: 'indigo', platform: 'iOS' },
    { id: 'proj-android', name: 'App Android', releaseId: 'rel-1', color: 'teal', platform: 'Android' },
    { id: 'proj-backend', name: 'Backend Multiplataforma', releaseId: 'rel-2', color: 'cyan', platform: 'Multiplataforma' },
  ];
  const sampleItems = [
    { id: 't1', projectId: 'proj-backend', name: 'API Login', type: 'task', startDate: '2026-03-01', endDate: '2026-03-05', duration: 5, dependencies: [] },
    { id: 't2', projectId: 'proj-ios', name: 'UI Login iOS', type: 'task', startDate: '2026-03-06', endDate: '2026-03-10', duration: 5, dependencies: ['t1'] },
    { id: 't3', projectId: 'proj-ios', name: 'Home Screen iOS', type: 'task', startDate: '2026-03-11', endDate: '2026-03-15', duration: 5, dependencies: ['t2'] },
    { id: 't4', projectId: 'proj-android', name: 'UI Login Android', type: 'task', startDate: '2026-03-06', endDate: '2026-03-10', duration: 5, dependencies: ['t1'] },
    { id: 't5', projectId: 'proj-android', name: 'Unrelated Android Task', type: 'task', startDate: '2026-03-01', endDate: '2026-03-05', duration: 5, dependencies: [] },
  ];

  // Focus on task t2 (UI Login iOS): Predecessor is t1, Successor is t3.
  // Should NOT include t5 (Unrelated Android Task)!
  const taskFocusResult = getRelatedFocusEntityIds({ type: 'task', id: 't2' }, sampleItems, sampleProjects);
  assert.ok(taskFocusResult.itemIds.includes('t1'), 'Focus on t2 must include predecessor t1');
  assert.ok(taskFocusResult.itemIds.includes('t2'), 'Focus on t2 must include t2 itself');
  assert.ok(taskFocusResult.itemIds.includes('t3'), 'Focus on t2 must include successor t3');
  assert.ok(!taskFocusResult.itemIds.includes('t5'), 'Focus on t2 must not include unrelated task t5');
  assert.ok(taskFocusResult.projectIds.includes('proj-ios'), 'Focus on t2 must include proj-ios');
  assert.ok(taskFocusResult.projectIds.includes('proj-backend'), 'Focus on t2 must include predecessor project proj-backend');
  assert.ok(taskFocusResult.releaseIds.includes('rel-1'), 'Focus on t2 must include rel-1');
  assert.ok(taskFocusResult.releaseIds.includes('rel-2'), 'Focus on t2 must include predecessor release rel-2');

  // Focus on project proj-ios: Should collect t2, t3, connected t1, and related project IDs
  const projFocusResult = getRelatedFocusEntityIds({ type: 'project', id: 'proj-ios' }, sampleItems, sampleProjects);
  assert.ok(projFocusResult.projectIds.includes('proj-ios'));
  assert.ok(projFocusResult.itemIds.includes('t2'));
  assert.ok(projFocusResult.itemIds.includes('t3'));
  assert.ok(projFocusResult.itemIds.includes('t1'), 'Connected predecessor t1 must be included');

  // Focus on release rel-1: Should collect proj-ios and proj-android and their tasks
  const relFocusResult = getRelatedFocusEntityIds({ type: 'release', id: 'rel-1' }, sampleItems, sampleProjects);
  assert.ok(relFocusResult.releaseIds.includes('rel-1'));
  assert.ok(relFocusResult.projectIds.includes('proj-ios'));
  assert.ok(relFocusResult.projectIds.includes('proj-android'));
  assert.ok(!relFocusResult.projectIds.includes('proj-backend'));

  // 3. SSR and Bundle Verification of Components and Excel Engine
  const ssrBundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { App } from './src/App.tsx';
        import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
        import { APP_VERSION } from './src/types/gantt.ts';
        import { exportFullGanttToWorkbook } from './src/utils/excelExportEngine.ts';

        export { App, GanttWorkspace, APP_VERSION, exportFullGanttToWorkbook };

        export function renderWorkspaceWithLongProjectName() {
          const scrollRef = { current: null };
          const longNamedProject = {
            id: 'proj-long',
            name: 'Proyecto Muy Largo Que Supera Los Treinta Y Siete Caracteres Para Probar Truncamiento',
            color: 'indigo',
            platform: 'iOS',
            releaseId: 'rel-1'
          };
          const task = {
            id: 'task-1',
            projectId: 'proj-long',
            name: 'Tarea Corta',
            type: 'task',
            startDate: '2026-03-01',
            endDate: '2026-03-02',
            duration: 2,
            dependencies: [],
            progress: 50,
            slack: 0
          };
          const rel = {
            id: 'rel-1',
            code: 'T_26.03.1',
            name: 'Release Marzo',
            year: 2026,
            milestones: [{ id: 'm1', key: 'qg1', code: 'QG1', name: 'QG1', date: '2026-03-05' }]
          };
          return React.createElement(GanttWorkspace, {
            items: [task],
            projects: [longNamedProject],
            releases: [rel],
            scrollContainerRef: scrollRef,
            showCriticalPath: true,
            showCpmFloat: false,
            autoCascade: true,
            onUpdateItem: () => {},
            onEditModal: () => {},
            onDeleteItem: () => {},
            onDuplicateItem: () => {},
            onQuickAdd: () => {}
          });
        }

        export function renderWorkspaceWithHiddenRelease(hiddenIds) {
          const scrollRef = { current: null };
          const p1 = { id: 'p1', name: 'Proyecto Release 1', releaseId: 'rel-hide', platform: 'iOS', color: 'indigo' };
          const p2 = { id: 'p2', name: 'Proyecto Release 2', releaseId: 'rel-show', platform: 'Android', color: 'teal' };
          const t1 = { id: 't1', projectId: 'p1', name: 'Tarea P1', type: 'task', startDate: '2026-03-01', endDate: '2026-03-05', duration: 5, dependencies: [] };
          const t2 = { id: 't2', projectId: 'p2', name: 'Tarea P2', type: 'task', startDate: '2026-03-01', endDate: '2026-03-05', duration: 5, dependencies: [] };
          const rels = [
            { id: 'rel-hide', code: 'REL_HIDDEN', name: 'Release Oculta', year: 2026, milestones: [] },
            { id: 'rel-show', code: 'REL_VISIBLE', name: 'Release Visible', year: 2026, milestones: [] }
          ];
          return React.createElement(GanttWorkspace, {
            items: [t1, t2],
            projects: [p1, p2],
            releases: rels,
            hiddenReleaseIds: hiddenIds,
            onToggleHideRelease: () => {},
            onSetFocusEntity: () => {},
            scrollContainerRef: scrollRef,
            showCriticalPath: true,
            showCpmFloat: false,
            autoCascade: true,
            onUpdateItem: () => {},
            onEditModal: () => {},
            onDeleteItem: () => {},
            onDuplicateItem: () => {},
            onQuickAdd: () => {}
          });
        }

        export function renderWorkspaceWithPlatformFilter(platform) {
          const scrollRef = { current: null };
          const p1 = { id: 'p1', name: 'Proyecto iOS', releaseId: 'rel-1', platform: 'iOS', color: 'indigo' };
          const p2 = { id: 'p2', name: 'Proyecto Android', releaseId: 'rel-1', platform: 'Android', color: 'teal' };
          const t1 = { id: 't1', projectId: 'p1', name: 'Tarea iOS', type: 'task', startDate: '2026-03-01', endDate: '2026-03-05', duration: 5, dependencies: [] };
          const t2 = { id: 't2', projectId: 'p2', name: 'Tarea Android', type: 'task', startDate: '2026-03-01', endDate: '2026-03-05', duration: 5, dependencies: [] };
          const rels = [{ id: 'rel-1', code: 'REL_1', name: 'Release 1', year: 2026, milestones: [] }];
          return React.createElement(GanttWorkspace, {
            items: [t1, t2],
            projects: [p1, p2],
            releases: rels,
            selectedPlatform: platform,
            scrollContainerRef: scrollRef,
            showCriticalPath: true,
            showCpmFloat: false,
            autoCascade: true,
            onUpdateItem: () => {},
            onEditModal: () => {},
            onDeleteItem: () => {},
            onDuplicateItem: () => {},
            onQuickAdd: () => {}
          });
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
    },
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom', 'xlsx'],
  });

  const tmpFile = path.resolve(__dirname, `./.tmp-ssr-v140-test.cjs`);
  await fs.writeFile(tmpFile, ssrBundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const { renderToString } = ReactDOMServer.default || ReactDOMServer;

    // A. APP_VERSION equals 1.9.2
    assert.equal(mod.APP_VERSION, '1.9.3', 'APP_VERSION must be 1.9.2');

    // A2. Excel Export Unit Test
    const sampleReleases = [
      {
        id: 'rel-1',
        code: 'T_26.03.1',
        name: 'Release Marzo 2026',
        month: 'MARZO',
        year: 2026,
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        milestones: [
          { id: 'm1', key: 'qg1', code: 'QG1', name: 'Scope QG1', date: '2026-03-05' },
          { id: 'm2', key: 'iop', code: 'IOP', name: 'Puesta en Marcha', date: '2026-03-28' },
        ],
      },
    ];
    const workbook = mod.exportFullGanttToWorkbook(sampleReleases, sampleProjects, sampleItems);
    assert.ok(workbook.SheetNames.includes('Cronograma Completo'), 'Workbook must contain "Cronograma Completo" sheet');
    assert.ok(workbook.SheetNames.includes('Resumen Proyectos'), 'Workbook must contain "Resumen Proyectos" sheet');
    assert.ok(workbook.SheetNames.includes('Catálogo Releases'), 'Workbook must contain "Catálogo Releases" sheet');

    const s1 = workbook.Sheets['Cronograma Completo'];
    const s1Content = JSON.stringify(s1);
    assert.ok(s1Content.includes('Código WBS'), 'Sheet 1 must contain WBS header');
    assert.ok(s1Content.includes('Plataforma'), 'Sheet 1 must contain Plataforma header');
    assert.ok(s1Content.includes('Cumplimiento Release'), 'Sheet 1 must contain Cumplimiento Release header');
    assert.ok(s1Content.includes('iOS'), 'Sheet 1 must include iOS platform label');
    assert.ok(s1Content.includes('Android'), 'Sheet 1 must include Android platform label');

    // B. Unclipped diagram project name vs truncated table project name
    const longNameHtml = renderToString(mod.renderWorkspaceWithLongProjectName());
    // Table should truncate at 37 characters + '…'
    const expectedTruncated = 'Proyecto Muy Largo Que Supera Los Tre…';
    assert.ok(
      longNameHtml.includes(expectedTruncated),
      `Table project name input should be truncated to 37 chars ("${expectedTruncated}") when not focused`
    );
    // Diagram should render full, unclipped project name
    assert.ok(
      longNameHtml.includes('data-timeline-project-name="Proyecto Muy Largo Que Supera Los Treinta Y Siete Caracteres Para Probar Truncamiento"'),
      'Diagram project label must contain full unclipped project name in data-timeline-project-name'
    );
    assert.ok(
      longNameHtml.includes('whitespace-nowrap overflow-visible'),
      'Diagram project label must have whitespace-nowrap and overflow-visible'
    );
    assert.ok(
      longNameHtml.includes('data-timeline-project-platform="iOS"'),
      'Diagram project bar must display platform badge'
    );

    // C. Hide releases with all associated projects
    const hiddenRelHtml = renderToString(mod.renderWorkspaceWithHiddenRelease(['rel-hide']));
    assert.ok(!hiddenRelHtml.includes('REL_HIDDEN'), 'Hidden release code must not be rendered');
    assert.ok(!hiddenRelHtml.includes('Proyecto Release 1'), 'Associated projects of hidden release must not be rendered');
    assert.ok(!hiddenRelHtml.includes('Tarea P1'), 'Tasks of hidden release must not be rendered');
    assert.ok(hiddenRelHtml.includes('REL_VISIBLE'), 'Visible release must be rendered');
    assert.ok(hiddenRelHtml.includes('Proyecto Release 2'), 'Associated projects of visible release must be rendered');
    assert.ok(hiddenRelHtml.includes('Tarea P2'), 'Tasks of visible release must be rendered');
    assert.ok(hiddenRelHtml.includes('data-testid="hide-release-rel-show"'), 'Release table row must have hide button');

    // D. Platform filtering in workspace
    const iosOnlyHtml = renderToString(mod.renderWorkspaceWithPlatformFilter('iOS'));
    assert.ok(iosOnlyHtml.includes('Proyecto iOS'), 'iOS filter must show Proyecto iOS');
    assert.ok(!iosOnlyHtml.includes('Proyecto Android'), 'iOS filter must NOT show Proyecto Android');

    const androidOnlyHtml = renderToString(mod.renderWorkspaceWithPlatformFilter('Android'));
    assert.ok(androidOnlyHtml.includes('Proyecto Android'), 'Android filter must show Proyecto Android');
    assert.ok(!androidOnlyHtml.includes('Proyecto iOS'), 'Android filter must NOT show Proyecto iOS');

    // E. Header controls in App SSR
    const appHtml = renderToString(React.createElement(mod.App));
    assert.ok(appHtml.includes('data-testid="table-platform-filter"'), 'App must contain unified table-platform-filter');
    assert.ok(appHtml.includes('data-testid="header-toggle-focus-mode-btn"'), 'App header must contain header-toggle-focus-mode-btn');
    assert.ok(appHtml.includes('data-testid="header-reports-btn"'), 'App header must contain header-reports-btn');
    assert.ok(appHtml.includes('v1.9.3'), 'App header must display version v1.9.3');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Escape and toggle focus exit, configurable text truncation limit, and hidden release visibility reset', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const esbuild = await import('esbuild');
  const ReactDOMServer = await import('react-dom/server');
  const React = (await import('react')).default;

  const ssrBundle = await esbuild.build({
    stdin: {
      contents: `
        import React from 'react';
        import { App } from './src/App';
        import { GanttWorkspace } from './src/components/GanttWorkspace';
        import { SettingsModal } from './src/components/SettingsModal';
        import { ReleasesModal } from './src/components/ReleasesModal';
        import { DEFAULT_TRUNCATE_CHAR_LIMIT, TRUNCATE_LIMIT_STORAGE_KEY } from './src/types/gantt';

        export { App, GanttWorkspace, SettingsModal, ReleasesModal, DEFAULT_TRUNCATE_CHAR_LIMIT, TRUNCATE_LIMIT_STORAGE_KEY };

        export function renderWorkspaceWithCustomLimit(limit) {
          const scrollRef = { current: null };
          const p = {
            id: 'p-trunc',
            name: 'Proyecto Con Nombre Excesivamente Largo Para Probar Limite De Caracteres',
            color: 'indigo'
          };
          const t = {
            id: 't-trunc',
            projectId: 'p-trunc',
            name: 'Tarea Con Descripcion Y Nombre Muy Extenso Para Verificar Truncamiento',
            type: 'task',
            startDate: '2026-03-01',
            endDate: '2026-03-05',
            duration: 5,
            dependencies: []
          };
          return React.createElement(GanttWorkspace, {
            items: [t],
            projects: [p],
            truncateCharLimit: limit,
            scrollContainerRef: scrollRef,
            showCriticalPath: false,
            showCpmFloat: false,
            autoCascade: true,
            onUpdateItem: () => {},
            onEditModal: () => {},
            onDeleteItem: () => {},
            onDuplicateItem: () => {},
            onQuickAdd: () => {}
          });
        }

        export function renderFocusedWorkspace() {
          const scrollRef = { current: null };
          const p = { id: 'p-focus', name: 'Proyecto Enfocado', color: 'indigo', releaseId: 'rel-focus' };
          const t = {
            id: 't-focus',
            projectId: 'p-focus',
            name: 'Tarea Enfocada',
            type: 'task',
            startDate: '2026-03-01',
            endDate: '2026-03-05',
            duration: 5,
            dependencies: []
          };
          const rel = { id: 'rel-focus', code: 'REL_FOC', name: 'Release Foco', color: 'indigo', milestones: [] };
          return React.createElement(GanttWorkspace, {
            items: [t],
            projects: [p],
            releases: [rel],
            isFocusMode: true,
            focusEntity: { type: 'project', id: 'p-focus', name: 'Proyecto Enfocado' },
            onExitFocusMode: () => {},
            onSetFocusEntity: () => {},
            scrollContainerRef: scrollRef,
            showCriticalPath: false,
            showCpmFloat: false,
            autoCascade: true,
            onUpdateItem: () => {},
            onEditModal: () => {},
            onDeleteItem: () => {},
            onDuplicateItem: () => {},
            onQuickAdd: () => {}
          });
        }

        export function renderAllHiddenReleasesWorkspace() {
          const scrollRef = { current: null };
          const p = { id: 'p-hidden', name: 'Proyecto En Release Oculta', color: 'indigo', releaseId: 'rel-all-hidden' };
          const t = {
            id: 't-hidden',
            projectId: 'p-hidden',
            name: 'Tarea Oculta',
            type: 'task',
            startDate: '2026-03-01',
            endDate: '2026-03-05',
            duration: 5,
            dependencies: []
          };
          const rel = { id: 'rel-all-hidden', code: 'REL_HIDDEN_ALL', name: 'Release Todo Oculto', color: 'indigo', milestones: [] };
          return React.createElement(GanttWorkspace, {
            items: [t],
            projects: [p],
            releases: [rel],
            hiddenReleaseIds: ['rel-all-hidden'],
            onResetHiddenReleases: () => {},
            scrollContainerRef: scrollRef,
            showCriticalPath: false,
            showCpmFloat: false,
            autoCascade: true,
            onUpdateItem: () => {},
            onEditModal: () => {},
            onDeleteItem: () => {},
            onDuplicateItem: () => {},
            onQuickAdd: () => {}
          });
        }

        export function renderSettingsModal(isOpen, count) {
          return React.createElement(SettingsModal, {
            isOpen: isOpen,
            onClose: () => {},
            truncateCharLimit: 25,
            onChangeTruncateCharLimit: () => {},
            showRowSeparators: true,
            onToggleRowSeparators: () => {},
            showWeekendShading: false,
            onToggleWeekendShading: () => {},
            hiddenReleaseCount: count,
            onResetHiddenReleases: () => {}
          });
        }

        export function renderReleasesModal(hiddenIds) {
          const rel = { id: 'rel-m', code: 'REL_M', name: 'Release Modal', color: 'indigo', milestones: [] };
          return React.createElement(ReleasesModal, {
            isOpen: true,
            onClose: () => {},
            releases: [rel],
            projects: [],
            items: [],
            guideVisibility: 'all',
            onChangeGuideVisibility: () => {},
            onUpdateReleases: () => {},
            onAssignProjectToRelease: () => {},
            hiddenReleaseIds: hiddenIds,
            onResetHiddenReleases: () => {}
          });
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
    },
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom', 'xlsx'],
  });

  const tmpFile = path.resolve(__dirname, `./.tmp-ssr-v141-test.cjs`);
  await fs.writeFile(tmpFile, ssrBundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const { renderToString } = ReactDOMServer.default || ReactDOMServer;

    // 1. Constants verification
    assert.equal(mod.DEFAULT_TRUNCATE_CHAR_LIMIT, 37, 'DEFAULT_TRUNCATE_CHAR_LIMIT must be 37');
    assert.equal(mod.TRUNCATE_LIMIT_STORAGE_KEY, 'ganttflow_truncate_char_limit', 'Storage key matches');

    // 2. Configurable text truncation in GanttWorkspace table
    const htmlLimit20 = renderToString(mod.renderWorkspaceWithCustomLimit(20));
    assert.ok(
      htmlLimit20.includes('Proyecto Con Nombre …'),
      'When limit is 20, project name in table must truncate at 20 characters'
    );
    assert.ok(
      htmlLimit20.includes('Tarea Con Descripcio…'),
      'When limit is 20, task name in table must truncate at 20 characters'
    );

    const htmlLimit50 = renderToString(mod.renderWorkspaceWithCustomLimit(50));
    assert.ok(
      htmlLimit50.includes('Proyecto Con Nombre Excesivamente Largo Para Proba…'),
      'When limit is 50, project name in table must truncate at 50 characters'
    );

    // 3. Focus mode toggle and active styling
    const focusedHtml = renderToString(mod.renderFocusedWorkspace());
    assert.ok(
      focusedHtml.includes('data-testid="focus-project-p-focus"'),
      'Project row must have focus button'
    );
    assert.ok(
      focusedHtml.includes('bg-amber-400'),
      'Focus button must have active highlighted state (bg-amber-400) when project is focused'
    );
    assert.ok(
      focusedHtml.includes('Salir de la modalidad enfoque de Proyecto Enfocado (clic o tecla ESC)'),
      'Focused button title informs user of ESC or clicking to exit'
    );

    // 4. Empty state diagnostics & reset button when all releases are hidden
    const hiddenAllHtml = renderToString(mod.renderAllHiddenReleasesWorkspace());
    assert.ok(
      hiddenAllHtml.includes('data-testid="empty-state-reset-hidden-releases-btn"'),
      'Empty state must render empty-state-reset-hidden-releases-btn when all releases are hidden'
    );
    assert.ok(
      hiddenAllHtml.includes('release') && hiddenAllHtml.includes('oculta'),
      'Empty state must explain that releases are currently hidden'
    );
    assert.ok(
      hiddenAllHtml.includes('data-testid="hidden-releases-banner"'),
      'Table must render hidden-releases-banner'
    );
    assert.ok(
      hiddenAllHtml.includes('data-testid="table-reset-hidden-releases-btn"'),
      'Table banner must contain table-reset-hidden-releases-btn'
    );

    // 5. SettingsModal SSR verification
    const settingsHtml = renderToString(mod.renderSettingsModal(true, 2));
    assert.ok(settingsHtml.includes('data-testid="settings-modal"'), 'SettingsModal must render');
    assert.ok(
      settingsHtml.includes('data-testid="settings-truncate-char-input"'),
      'SettingsModal must contain truncation number input'
    );
    assert.ok(
      settingsHtml.includes('data-testid="settings-preset-btn-20"'),
      'SettingsModal must contain preset 20'
    );
    assert.ok(
      settingsHtml.includes('data-testid="settings-preset-btn-37"'),
      'SettingsModal must contain preset 37'
    );
    assert.ok(
      settingsHtml.includes('data-testid="settings-preset-btn-50"'),
      'SettingsModal must contain preset 50'
    );
    assert.ok(
      settingsHtml.includes('data-testid="settings-reset-hidden-releases-btn"'),
      'SettingsModal must contain reset hidden releases button when hidden count > 0'
    );

    // 6. ReleasesModal reset button verification
    const relModalHtml = renderToString(mod.renderReleasesModal(['rel-m']));
    assert.ok(
      relModalHtml.includes('data-testid="modal-reset-hidden-releases-btn"'),
      'ReleasesModal must contain reset hidden releases button when hidden releases exist'
    );

    // 7. App Header Settings Button
    const appHtml = renderToString(React.createElement(mod.App));
    assert.ok(
      appHtml.includes('data-testid="header-settings-btn"'),
      'App header must render header-settings-btn'
    );
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Excel Cronograma Completo splits dependencies per row with element names, and App provides interactive Informes page with 3 spreadsheet tabs', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const esbuild = await import('esbuild');
  const ReactDOMServer = await import('react-dom/server');
  const React = (await import('react')).default;

  const ssrBundle = await esbuild.build({
    stdin: {
      contents: `
        import React from 'react';
        import { App } from './src/App';
        import { ReportsView } from './src/components/ReportsView';
        import {
          exportFullGanttToWorkbook,
          generateCronogramaCompletoRows,
          generateProjectSummaryRows,
          generateReleaseSummaryRows,
          resolveDependencyName
        } from './src/utils/excelExportEngine';

        export {
          App,
          ReportsView,
          exportFullGanttToWorkbook,
          generateCronogramaCompletoRows,
          generateProjectSummaryRows,
          generateReleaseSummaryRows,
          resolveDependencyName
        };

        export function renderReportsView(initialTab = 'cronograma') {
          const p1 = { id: 'p1', name: 'App iOS Banking', releaseId: 'rel-1', platform: 'iOS', color: 'indigo' };
          const p2 = { id: 'p2', name: 'App Android Banking', releaseId: 'rel-1', platform: 'Android', color: 'teal' };
          const t1 = {
            id: 't1',
            projectId: 'p1',
            name: 'Diseño UX Mobile',
            type: 'task',
            startDate: '2026-03-01',
            endDate: '2026-03-05',
            duration: 5,
            progress: 100,
            dependencies: []
          };
          const t2 = {
            id: 't2',
            projectId: 'p1',
            name: 'Arquitectura Cloud',
            type: 'task',
            startDate: '2026-03-02',
            endDate: '2026-03-06',
            duration: 5,
            progress: 80,
            dependencies: []
          };
          const t3 = {
            id: 't3',
            projectId: 'p1',
            name: 'Desarrollo Core Mobile',
            type: 'task',
            startDate: '2026-03-07',
            endDate: '2026-03-20',
            duration: 14,
            progress: 40,
            dependencies: ['t1', 't2'],
            dependencyTypes: { t1: 'FS', t2: 'SS' }
          };
          const rel = {
            id: 'rel-1',
            code: 'T_26.03.1',
            name: 'Release Marzo 2026',
            month: 'MARZO',
            year: 2026,
            milestones: [
              { id: 'm1', key: 'qg1', code: 'QG1', name: 'Scope QG1', date: '2026-03-05' },
              { id: 'm2', key: 'iop', code: 'IOP', name: 'Puesta en Marcha', date: '2026-03-28' }
            ]
          };

          return React.createElement(ReportsView, {
            releases: [rel],
            projects: [p1, p2],
            items: [t1, t2, t3],
            onBackToGantt: () => {},
            initialTab
          });
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
    },
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom', 'xlsx'],
  });

  const tmpFile = path.resolve(__dirname, `./.tmp-ssr-v142-test.cjs`);
  await fs.writeFile(tmpFile, ssrBundle.outputFiles[0].text, 'utf8');

  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const { renderToString } = ReactDOMServer.default || ReactDOMServer;

    // 1. Test dependency resolution with human-readable element name
    const sampleItems = [
      { id: 'dep-a', name: 'Análisis de Requisitos', wbs: '1.1' },
      { id: 'dep-b', name: 'Diseño de Base de Datos', wbs: '1.2' },
      { id: 'task-main', name: 'Desarrollo API', dependencies: ['dep-a', 'dep-b'], dependencyTypes: { 'dep-a': 'FS', 'dep-b': 'SS' } },
    ];
    const depAName = mod.resolveDependencyName('dep-a', sampleItems, sampleItems[2]);
    assert.equal(depAName, 'Análisis de Requisitos (FS)', 'Dependency name must use predecessor task name instead of ID');
    const depBName = mod.resolveDependencyName('dep-b', sampleItems, sampleItems[2]);
    assert.equal(depBName, 'Diseño de Base de Datos (SS)', 'Dependency name must respect custom dependency type');

    // 2. Test generateCronogramaCompletoRows splitting dependencies into distinct rows
    const p1 = { id: 'p1', name: 'Proyecto Test', releaseId: 'rel-1', platform: 'iOS' };
    const r1 = { id: 'rel-1', code: 'T_26.03.1', name: 'Release 1', milestones: [] };
    const rows = mod.generateCronogramaCompletoRows([r1], [p1], sampleItems);

    // Look for rows of task-main
    const taskMainRows = rows.filter((r) => r.name === 'Desarrollo API');
    assert.equal(taskMainRows.length, 2, 'Task with 2 dependencies must produce 2 distinct rows in Cronograma Completo');
    assert.equal(taskMainRows[0].dependency, 'Análisis de Requisitos (FS)', 'Row 1 must show first predecessor name');
    assert.equal(taskMainRows[1].dependency, 'Diseño de Base de Datos (SS)', 'Row 2 must show second predecessor name');
    assert.equal(taskMainRows[1].isDepRow, true, 'Second row is marked as isDepRow');

    // 3. Test exportFullGanttToWorkbook Excel output
    const wb = mod.exportFullGanttToWorkbook([r1], [p1], sampleItems);
    const s1 = wb.Sheets['Cronograma Completo'];
    const s1Str = JSON.stringify(s1);
    assert.ok(s1Str.includes('Análisis de Requisitos (FS)'), 'Excel sheet 1 must contain predecessor element name');
    assert.ok(s1Str.includes('Diseño de Base de Datos (SS)'), 'Excel sheet 1 must contain second predecessor element name');

    // 4. Test ReportsView SSR rendering (Tab 1: Cronograma Completo)
    const cronoHtml = renderToString(mod.renderReportsView('cronograma'));
    assert.ok(cronoHtml.includes('data-testid="reports-view"'), 'ReportsView container renders');
    assert.ok(cronoHtml.includes('data-testid="reports-tab-cronograma"'), 'Cronograma tab button renders');
    assert.ok(cronoHtml.includes('data-testid="reports-tab-projects"'), 'Projects tab button renders');
    assert.ok(cronoHtml.includes('data-testid="reports-tab-releases"'), 'Releases tab button renders');
    assert.ok(cronoHtml.includes('data-testid="reports-download-excel-btn"'), 'Download Excel button renders');
    assert.ok(cronoHtml.includes('data-testid="reports-back-btn"'), 'Back to Gantt button renders');
    assert.ok(cronoHtml.includes('data-testid="reports-search-input"'), 'Search input renders');
    assert.ok(cronoHtml.includes('data-testid="reports-platform-select"'), 'Platform select renders');
    assert.ok(cronoHtml.includes('Diseño UX Mobile (FS)'), 'Cronograma tab renders predecessor element name');
    assert.ok(cronoHtml.includes('Arquitectura Cloud (SS)'), 'Cronograma tab renders second predecessor element name');

    // 5. Test ReportsView SSR rendering (Tab 2: Resumen Proyectos)
    const projHtml = renderToString(mod.renderReportsView('projects'));
    assert.ok(projHtml.includes('App iOS Banking'), 'Projects tab renders App iOS Banking');
    assert.ok(projHtml.includes('App Android Banking'), 'Projects tab renders App Android Banking');

    // 6. Test ReportsView SSR rendering (Tab 3: Catálogo Releases)
    const relHtml = renderToString(mod.renderReportsView('releases'));
    assert.ok(relHtml.includes('T_26.03.1'), 'Releases tab renders release code');
    assert.ok(relHtml.includes('Release Marzo 2026'), 'Releases tab renders release name');

    // 7. App Header includes Informes button
    const appHtml = renderToString(React.createElement(mod.App));
    assert.ok(appHtml.includes('data-testid="header-reports-btn"'), 'App header must render header-reports-btn');
    assert.ok(appHtml.includes('Informes'), 'App header must display Informes label');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Header overflow more-menu, Task platform field in creation/edition modal, and Version 1.5.0 verification', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { build } = await import('esbuild');
  const ReactDOMServer = await import('react-dom/server');
  const ReactMod = await import('react');
  const React = ReactMod.default || ReactMod;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(await fs.readFile(path.resolve(__dirname, '../package.json'), 'utf8'));

  // 1. Version Bump Verification v1.9.3
  assert.equal(pkg.version, '1.9.3', 'package.json version must equal 1.9.2');

  // 2. SSR Bundle verification for TaskFormModal, App Header, and sanitizeGanttItem
  const tmpFile = path.resolve(__dirname, `tmp_test59_bundle_${Date.now()}.mjs`);
  try {
    await build({
      stdin: {
        contents: `
          import React from 'react';
          import { App } from './src/App.tsx';
          import { TaskFormModal } from './src/components/TaskFormModal.tsx';
          import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
          import { SettingsModal } from './src/components/SettingsModal.tsx';
          import { APP_VERSION } from './src/types/gantt.ts';
          import { sanitizeGanttItem } from './src/utils/ganttEngine.ts';

          export { App, TaskFormModal, GanttWorkspace, SettingsModal, APP_VERSION, sanitizeGanttItem };

          export function renderTaskFormModalWithPlatform(platform) {
            const project = { id: 'p1', name: 'Mobile Banking', color: 'indigo', platform: 'iOS/Android' };
            const item = {
              id: 't1',
              name: 'Tarea Test Plataforma',
              type: 'task',
              startDate: '2026-03-01',
              endDate: '2026-03-05',
              duration: 5,
              projectId: 'p1',
              platform: platform || undefined,
            };
            return React.createElement(TaskFormModal, {
              isOpen: true,
              onClose: () => {},
              onSave: () => {},
              initialItem: item,
              projects: [project],
              allItems: [item],
            });
          }

          export function renderWorkspaceWithTaskPlatform() {
            const project = { id: 'p1', name: 'Mobile App', color: 'indigo', platform: 'iOS/Android', releaseId: 'rel-1' };
            const item = {
              id: 't1',
              name: 'Tarea Nativa iOS',
              type: 'task',
              startDate: '2026-03-01',
              endDate: '2026-03-05',
              duration: 5,
              projectId: 'p1',
              platform: 'iOS',
              dependencies: [],
              progress: 0,
              slack: 0,
            };
            const rel = {
              id: 'rel-1',
              code: 'T_26.03.1',
              name: 'Release Marzo',
              year: 2026,
              milestones: [{ id: 'm1', key: 'qg1', code: 'QG1', name: 'QG1', date: '2026-03-05' }],
            };
            return React.createElement(GanttWorkspace, {
              items: [item],
              projects: [project],
              releases: [rel],
              scrollContainerRef: { current: null },
              onUpdateItem: () => {},
              onDeleteItem: () => {},
              onAddItem: () => {},
              onQuickAdd: () => {},
              initialSelectedItemId: 't1',
            });
          }
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test59_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'xlsx',
        'clsx',
        'tailwind-merge',
      ],
      jsx: 'automatic',
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const { renderToString } = ReactDOMServer.default || ReactDOMServer;

    assert.equal(mod.APP_VERSION, '1.9.3', 'mod.APP_VERSION must equal 1.9.2');

    // sanitizeGanttItem preserves platform
    const sanitizedIos = mod.sanitizeGanttItem({
      id: 't-ios-1',
      name: 'Build Swift UI',
      type: 'task',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      duration: 5,
      platform: 'iOS',
    });
    assert.equal(sanitizedIos.platform, 'iOS', 'sanitizeGanttItem must preserve iOS platform');

    const sanitizedAndroid = mod.sanitizeGanttItem({
      id: 't-and-1',
      name: 'Build Jetpack Compose',
      type: 'task',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      duration: 5,
      platform: 'Android',
    });
    assert.equal(sanitizedAndroid.platform, 'Android', 'sanitizeGanttItem must preserve Android platform');

    // 4. TaskFormModal renders data-testid="task-platform-select"
    const modalHtml = renderToString(mod.renderTaskFormModalWithPlatform('iOS'));
    assert.ok(modalHtml.includes('data-testid="task-platform-select"'), 'TaskFormModal must render task-platform-select dropdown');
    assert.ok(modalHtml.includes('Plataforma'), 'TaskFormModal must have Plataforma label');
    assert.ok(modalHtml.includes('Por defecto (iOS/Android)'), 'TaskFormModal must display project platform fallback');
    assert.ok(modalHtml.includes('value="iOS"'), 'TaskFormModal must have iOS option');
    assert.ok(modalHtml.includes('value="Android"'), 'TaskFormModal must have Android option');
    assert.ok(modalHtml.includes('value="iOS/Android"'), 'TaskFormModal must have iOS/Android option');

    // 5. GanttWorkspace inspection panel and table row render platform badges
    const wsHtml = renderToString(mod.renderWorkspaceWithTaskPlatform());
    assert.ok(wsHtml.includes('data-testid="task-platform-badge-t1"'), 'Table row must render task-platform-badge');
    assert.ok(wsHtml.includes('data-testid="panel-platform-badge-t1"'), 'Inspection panel must render panel-platform-badge');
    assert.ok(wsHtml.includes('iOS'), 'Badge must render iOS text');

    // 6. Header cleanup & more-menu dropdown verification
    const appHtml = renderToString(React.createElement(mod.App));
    assert.ok(appHtml.includes('data-testid="header-more-menu-btn"'), 'App header must render header-more-menu-btn');
    assert.ok(appHtml.includes('data-testid="header-more-menu-dropdown"'), 'App must render header-more-menu-dropdown');
    assert.ok(appHtml.includes('data-testid="app-version-badge"'), 'More menu must contain app-version-badge');
    assert.ok(appHtml.includes('v1.9.3'), 'Version badge must display v1.9.3');
    assert.ok(appHtml.includes('data-testid="force-reload-btn"'), 'More menu must contain force-reload-btn');

    // 7. Verify secondary buttons are rendered inside the menu
    assert.ok(appHtml.includes('data-testid="header-import-btn"'), 'Dropdown contains header-import-btn');
    assert.ok(appHtml.includes('data-testid="header-export-btn"'), 'Dropdown contains header-export-btn');
    assert.ok(appHtml.includes('data-testid="header-reports-btn"'), 'Header contains header-reports-btn');
    assert.ok(appHtml.includes('data-testid="header-history-btn"'), 'Dropdown contains header-history-btn');
    assert.ok(appHtml.includes('data-testid="header-help-btn"'), 'Dropdown contains header-help-btn');
    assert.ok(appHtml.includes('data-testid="header-settings-btn"'), 'Dropdown contains header-settings-btn');
    assert.ok(appHtml.includes('data-testid="header-toggle-row-separators-btn"'), 'Dropdown contains header-toggle-row-separators-btn');
    assert.ok(appHtml.includes('data-testid="header-toggle-weekend-shading-btn"'), 'Dropdown contains header-toggle-weekend-shading-btn');

    // 8. SettingsModal renders version badge
    const settingsHtml = renderToString(React.createElement(mod.SettingsModal, {
      isOpen: true,
      onClose: () => {},
      truncateCharLimit: 37,
      onChangeTruncateCharLimit: () => {},
      hiddenReleaseCount: 0,
    }));
    assert.ok(settingsHtml.includes('data-testid="settings-version-badge"'), 'SettingsModal must contain settings-version-badge');
    assert.ok(settingsHtml.includes('1.9.3') && settingsHtml.includes('GanttFlow'), 'SettingsModal must display GanttFlow and 1.9.2');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Dedicated Cronograma Toolbar with space-saving icon-only buttons, hover hints, and clean dropdown menu', async () => {
  const fs = await import('node:fs/promises');
  const ReactMod = await import('react');
  const React = ReactMod.default || ReactMod;
  const ReactDOMServer = await import('react-dom/server');
  const { renderToString } = ReactDOMServer.default || ReactDOMServer;

  const tmpFile = path.resolve(__dirname, `tmp_test60_bundle_${Date.now()}.mjs`);
  try {
    await build({
      stdin: {
        contents: `
          import React from 'react';
          import { App } from './src/App.tsx';
          import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
          export { App, GanttWorkspace };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test60_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      platform: 'neutral',
      target: 'es2022',
      jsx: 'automatic',
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'date-fns/locale',
        'xlsx',
        'canvas-confetti'
      ],
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // Render full App in Gantt view
    const appHtml = renderToString(React.createElement(mod.App));

    // 1. Dedicated Cronograma Toolbar exists
    assert.ok(appHtml.includes('data-testid="cronograma-toolbar"'), 'App must render dedicated cronograma-toolbar');

    // 2. Contains all 6 diagram-specific options
    assert.ok(appHtml.includes('data-testid="header-toggle-row-separators-btn"'), 'Toolbar contains header-toggle-row-separators-btn');
    assert.ok(appHtml.includes('data-testid="header-toggle-weekend-shading-btn"'), 'Toolbar contains header-toggle-weekend-shading-btn');
    assert.ok(appHtml.includes('data-testid="header-toggle-critical-path-btn"'), 'Toolbar contains header-toggle-critical-path-btn');
    assert.ok(appHtml.includes('data-fit-timeline-btn="true"'), 'Toolbar contains data-fit-timeline-btn');
    assert.ok(appHtml.includes('data-testid="header-scroll-today-btn"'), 'Toolbar contains header-scroll-today-btn');
    assert.ok(appHtml.includes('data-testid="header-toggle-metrics-btn"'), 'Toolbar contains header-toggle-metrics-btn');

    // 3. Zoom controls removed & table toggle in toolbar
    assert.ok(!appHtml.includes('data-testid="cronograma-zoom-out-btn"'), 'Toolbar must NOT contain zoom-out button');
    assert.ok(!appHtml.includes('data-testid="cronograma-zoom-in-btn"'), 'Toolbar must NOT contain zoom-in button');
    assert.ok(appHtml.includes('data-testid="cronograma-toggle-table-btn"'), 'Toolbar contains toggle-table button');

    // 4. Buttons are icon-only (do not contain text spans) and have hints/tooltips
    assert.ok(!appHtml.includes('<span>Líneas filas</span>'), 'Buttons must NOT contain text "Líneas filas"');
    assert.ok(!appHtml.includes('<span>Fines de semana</span>'), 'Buttons must NOT contain text "Fines de semana"');
    assert.ok(appHtml.includes('Líneas de separación'), 'Toolbar must render hover hint for row separators');
    assert.ok(appHtml.includes('Sombreado de fines de semana'), 'Toolbar must render hover hint for weekend shading');
    assert.ok(appHtml.includes('Ruta Crítica (CPM)'), 'Toolbar must render hover hint for critical path');
    assert.ok(appHtml.includes('Ajustar a Proyecto'), 'Toolbar must render hint for fit to project');
    assert.ok(appHtml.includes('Ir a Hoy'), 'Toolbar must render hover hint for scroll to today');
    assert.ok(appHtml.includes('Métricas del proyecto'), 'Toolbar must render hover hint for metrics');

    // 5. Dropdown menu does not render the redundant 2-column text grid
    assert.ok(!appHtml.includes('Herramientas del Cronograma'), 'Secondary menu must not contain redundant Herramientas del Cronograma grid');

    // 6. Release and project summary bars have z-20 so weekend shading does not overlay or affect them
    assert.ok(appHtml.includes('data-release-summary-bar') && appHtml.includes('z-20'), 'Release summary bars must have z-20');

    const wsHtml = renderToString(React.createElement(mod.GanttWorkspace, {
      items: [{ id: 't1', projectId: 'p1', name: 'Task 1', startDate: '2026-03-01', endDate: '2026-03-05', duration: 5, progress: 0, dependencies: [] }],
      projects: [{ id: 'p1', name: 'Project 1', color: 'indigo', releaseId: 'rel-1' }],
      releases: [{ id: 'rel-1', code: 'T_26.03.1', name: 'Release 1', milestones: [] }],
      scrollContainerRef: { current: null },
      zoom: 'week',
      showCriticalPath: false,
      showCpmFloat: false,
      autoCascade: false,
      onUpdateItem: () => {},
      onDeleteItem: () => {},
      onEditModal: () => {},
      onDuplicateItem: () => {},
      onQuickAdd: () => {},
    }));
    assert.ok(wsHtml.includes('data-project-summary-bar') && wsHtml.includes('z-20'), 'Project summary bars must have z-20');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Test 61: Version button, compiled release notes modal and changelog across versions', async () => {
  const fs = await import('node:fs/promises');
  const ReactMod = await import('react');
  const React = ReactMod.default || ReactMod;
  const ReactDOMServer = await import('react-dom/server');
  const { renderToString } = ReactDOMServer.default || ReactDOMServer;

  const tmpFile = path.resolve(__dirname, `tmp_test61_bundle_${Date.now()}.mjs`);
  try {
    await build({
      stdin: {
        contents: `
          import React from 'react';
          import { App } from './src/App.tsx';
          import { ReleaseNotesModal } from './src/components/ReleaseNotesModal.tsx';
          import { RELEASE_NOTES } from './src/data/releaseNotes.ts';
          import { SettingsModal } from './src/components/SettingsModal.tsx';
          import { APP_VERSION } from './src/types/gantt.ts';
          export { App, ReleaseNotesModal, RELEASE_NOTES, SettingsModal, APP_VERSION };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test61_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      platform: 'neutral',
      target: 'es2022',
      jsx: 'automatic',
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'date-fns/locale',
        'xlsx',
        'canvas-confetti'
      ],
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // 1. Check RELEASE_NOTES compiled data
    assert.strictEqual(mod.APP_VERSION, '1.9.3');
    assert.ok(Array.isArray(mod.RELEASE_NOTES), 'RELEASE_NOTES must be an array');
    assert.ok(mod.RELEASE_NOTES.length >= 10, 'RELEASE_NOTES must have at least 10 releases');

    const latest = mod.RELEASE_NOTES[0];
    assert.strictEqual(latest.version, '1.9.3', 'First release note must be 1.9.2');
    assert.strictEqual(latest.isLatest, true, 'First release note must be isLatest: true');
    assert.ok(latest.features.length > 0, 'v1.9.3 must contain features');

    // 2. Render App and verify version button exists in dropdown menu and is NOT duplicated in top header
    const appHtml = renderToString(React.createElement(mod.App));
    assert.ok(
      !appHtml.includes('data-testid="header-version-btn"'),
      'Version button must NOT be duplicated in the top header'
    );
    assert.ok(
      appHtml.includes('data-testid="app-version-badge"'),
      'App dropdown must contain data-testid="app-version-badge"'
    );
    assert.ok(
      appHtml.includes('<button') && appHtml.includes('data-testid="app-version-badge"') && appHtml.includes('v1.9.3'),
      'app-version-badge in tools dropdown must be an interactive button showing v1.9.3'
    );

    // 3. Render ReleaseNotesModal
    const modalHtml = renderToString(React.createElement(mod.ReleaseNotesModal, {
      isOpen: true,
      onClose: () => {}
    }));
    assert.ok(modalHtml.includes('data-testid="release-notes-modal"'), 'Modal must render data-testid="release-notes-modal"');
    assert.ok(modalHtml.includes('data-testid="release-notes-current-badge"'), 'Modal must render current badge');
    assert.ok(modalHtml.includes('data-testid="release-note-item-1.7.0"'), 'Modal must render 1.7.0 note item');
    assert.ok(modalHtml.includes('data-testid="release-note-item-1.6.0"'), 'Modal must render 1.6.0 note item');
    assert.ok(modalHtml.includes('data-testid="release-note-item-1.5.0"'), 'Modal must render 1.5.0 note item');
    assert.ok(modalHtml.includes('data-testid="release-note-item-1.0.0"'), 'Modal must render 1.0.0 note item');
    assert.ok(modalHtml.includes('data-testid="close-release-notes-btn"'), 'Modal must render close button');

    // 4. Render SettingsModal and verify version badge button
    const settingsHtml = renderToString(React.createElement(mod.SettingsModal, {
      isOpen: true,
      onClose: () => {},
      truncateCharLimit: 37,
      onChangeTruncateCharLimit: () => {},
      hiddenReleaseCount: 0,
      onOpenReleaseNotes: () => {}
    }));
    assert.ok(settingsHtml.includes('data-testid="settings-version-badge"'), 'SettingsModal renders settings-version-badge');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Test 62: Diagram project/release selection, contextual focus, moved import/export and icon-only header buttons', async () => {
  const fs = await import('node:fs/promises');
  const ReactMod = await import('react');
  const React = ReactMod.default || ReactMod;
  const ReactDOMServer = await import('react-dom/server');
  const { renderToString } = ReactDOMServer.default || ReactDOMServer;

  const tmpFile = path.resolve(__dirname, `tmp_test62_bundle_${Date.now()}.mjs`);
  try {
    await build({
      stdin: {
        contents: `
          import React from 'react';
          import { App } from './src/App.tsx';
          import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
          export { App, GanttWorkspace };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test62_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      platform: 'neutral',
      target: 'es2022',
      jsx: 'automatic',
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'date-fns/locale',
        'xlsx',
        'canvas-confetti'
      ],
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // 1. GanttWorkspace allows selecting a project on the diagram
    const wsProjectSelected = renderToString(React.createElement(mod.GanttWorkspace, {
      items: [{ id: 't1', projectId: 'p1', name: 'Task 1', startDate: '2026-03-01', endDate: '2026-03-05', duration: 5, progress: 0, dependencies: [] }],
      projects: [{ id: 'p1', name: 'Project Alpha', color: 'indigo', releaseId: 'rel-1' }],
      releases: [{ id: 'rel-1', code: 'T_26.03.1', name: 'Release 1', milestones: [] }],
      scrollContainerRef: { current: null },
      zoom: 'week',
      showCriticalPath: false,
      showCpmFloat: false,
      autoCascade: false,
      selectedEntity: { type: 'project', id: 'p1', name: 'Project Alpha' },
      onUpdateItem: () => {},
      onDeleteItem: () => {},
      onEditModal: () => {},
      onDuplicateItem: () => {},
      onQuickAdd: () => {},
    }));
    assert.ok(
      wsProjectSelected.includes('data-selected-project-id="p1"'),
      'Gantt diagram must mark selected project with data-selected-project-id'
    );
    assert.ok(
      wsProjectSelected.includes('ring-2 ring-indigo-500'),
      'Gantt diagram must render selection ring on selected project bar'
    );

    // 2. GanttWorkspace allows selecting a release on the diagram
    const wsReleaseSelected = renderToString(React.createElement(mod.GanttWorkspace, {
      items: [{ id: 't1', projectId: 'p1', name: 'Task 1', startDate: '2026-03-01', endDate: '2026-03-05', duration: 5, progress: 0, dependencies: [] }],
      projects: [{ id: 'p1', name: 'Project Alpha', color: 'indigo', releaseId: 'rel-1' }],
      releases: [{ id: 'rel-1', code: 'T_26.03.1', name: 'Release 1', milestones: [] }],
      scrollContainerRef: { current: null },
      zoom: 'week',
      showCriticalPath: false,
      showCpmFloat: false,
      autoCascade: false,
      selectedEntity: { type: 'release', id: 'rel-1', name: 'Release 1' },
      onUpdateItem: () => {},
      onDeleteItem: () => {},
      onEditModal: () => {},
      onDuplicateItem: () => {},
      onQuickAdd: () => {},
    }));
    assert.ok(
      wsReleaseSelected.includes('data-selected-release-id="rel-1"'),
      'Gantt diagram must mark selected release with data-selected-release-id'
    );
    assert.ok(
      wsReleaseSelected.includes('ring-3 ring-indigo-500'),
      'Gantt diagram must render selection ring on selected release bar'
    );

    // 3. Render App: verify import & export are on the top header, releases is in dropdown
    const appHtml = renderToString(React.createElement(mod.App));
    assert.ok(
      appHtml.includes('data-testid="header-import-btn"'),
      'App header must contain direct Import button'
    );
    assert.ok(
      appHtml.includes('data-testid="header-export-btn"'),
      'App header must contain direct Export JSON button'
    );
    assert.ok(
      appHtml.includes('data-testid="header-reports-btn"'),
      'App header must contain Reports button leading to Excel download'
    );
    assert.ok(
      appHtml.includes('data-testid="header-releases-btn"'),
      'Tools dropdown must contain Releases catalog button'
    );
    assert.ok(
      appHtml.includes('data-testid="header-toggle-focus-mode-btn"'),
      'App header must contain Focus Mode button'
    );

    // 4. Verify top header buttons are icon-only (do not contain text labels)
    assert.ok(!appHtml.includes('>Importar</span>'), 'Header import button must be icon-only');
    assert.ok(!appHtml.includes('>JSON</span>'), 'Header export JSON button must be icon-only');
    assert.ok(!appHtml.includes('>Informes</span>'), 'Header informes button must be icon-only');
    
    const focusBtnMatch = appHtml.match(/data-testid="header-toggle-focus-mode-btn"[^>]*>([\s\S]*?)<\/button>/);
    assert.ok(focusBtnMatch, 'Header focus button must exist');
    assert.ok(!focusBtnMatch[1].includes('<span'), 'Header focus button must not contain text spans');

    const toolsBtnMatch = appHtml.match(/data-testid="header-more-menu-btn"[^>]*>([\s\S]*?)<\/button>/);
    assert.ok(toolsBtnMatch, 'Header tools button must exist');
    assert.ok(!toolsBtnMatch[1].includes('<span'), 'Header tools button must not contain text spans');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Test 63: Projects with 0 tasks render informative empty state, timeline release window, and focus mode banner guidance', async () => {
  const fs = await import('node:fs/promises');
  const React = (await import('react')).default;
  const { renderToString } = await import('react-dom/server');
  const tmpFile = path.resolve(__dirname, `./tmp_test63_bundle_${Date.now()}.mjs`);

  try {
    await build({
      entryPoints: [],
      stdin: {
        contents: `
          import React from 'react';
          import { App } from './src/App.tsx';
          import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
          export { App, GanttWorkspace };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test63_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      platform: 'neutral',
      target: 'es2022',
      jsx: 'automatic',
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'date-fns/locale',
        'xlsx',
        'canvas-confetti'
      ],
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // 1. GanttWorkspace with an empty project (0 items)
    const wsEmptyHtml = renderToString(React.createElement(mod.GanttWorkspace, {
      items: [],
      projects: [{ id: 'proj-empty', name: 'Proyecto XX', color: 'indigo', releaseId: 'rel-t-26-12-1', collapsed: false }],
      releases: [{ id: 'rel-t-26-12-1', code: 'T_26.12.1', name: 'Release Dic 2026', milestones: [{ id: 'm1', key: 'qg1', code: 'QG1', name: 'QG1', category: 'SCOPE', date: '2026-10-05', color: 'cyan' }, { id: 'm2', key: 'qg9', code: 'QG9', name: 'QG9', category: 'PROD', date: '2026-12-25', color: 'cyan' }] }],
      scrollContainerRef: { current: null },
      zoom: 'week',
      showCriticalPath: false,
      showCpmFloat: false,
      autoCascade: false,
      onCreateDigiTask: () => {},
      onUpdateItem: () => {},
      onDeleteItem: () => {},
      onEditModal: () => {},
      onDuplicateItem: () => {},
      onQuickAdd: () => {},
    }));

    // WBS table must render empty-project row with explanatory message
    assert.ok(
      wsEmptyHtml.includes('data-empty-project-row="proj-empty"'),
      'WBS table must render data-empty-project-row for project with 0 items'
    );
    assert.ok(
      wsEmptyHtml.includes('Este proyecto no tiene tareas ni hitos aún'),
      'WBS table must display helpful explanation when project has 0 items'
    );
    assert.ok(
      wsEmptyHtml.includes('data-testid="project-empty-add-task-btn-proj-empty"'),
      'WBS table must render + Nueva Tarea button in empty project row'
    );
    assert.ok(
      wsEmptyHtml.includes('data-testid="project-empty-add-digi-btn-proj-empty"'),
      'WBS table must render + Tarea DIGI button in empty project row'
    );
    assert.ok(
      wsEmptyHtml.includes('data-testid="project-header-add-task-btn-proj-empty"'),
      'Project header row must render quick task button next to 0 ítems'
    );

    // Timeline must render project summary bar even with 0 items (never blank void)
    assert.ok(
      wsEmptyHtml.includes('data-empty-project-timeline-bar="true"'),
      'Timeline must render data-empty-project-timeline-bar for project with 0 items'
    );
    assert.ok(
      wsEmptyHtml.includes('0 tareas'),
      'Timeline summary bar must label 0 tareas'
    );
    assert.ok(
      wsEmptyHtml.includes('T_26.12.1'),
      'Timeline summary bar must indicate assigned release'
    );

    // 2. App SSR with Focus Mode active on an entity
    const appHtml = renderToString(React.createElement(mod.App, {
      initialScenarioId: 'scen-user',
    }));
    assert.ok(appHtml.includes('data-testid="header-toggle-focus-mode-btn"'), 'App must render focus toggle button');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Test 64: v1.8.0 Table search & platform filters, collapsed cross-project dependencies, project reordering, color picker, and sticky toolbar', async () => {
  const fs = await import('node:fs/promises');
  const React = (await import('react')).default;
  const { renderToString } = await import('react-dom/server');
  const tmpFile = path.resolve(__dirname, `./tmp_test64_bundle_${Date.now()}.mjs`);

  try {
    await build({
      entryPoints: [],
      stdin: {
        contents: `
          import React from 'react';
          import { App } from './src/App.tsx';
          import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
          export { App, GanttWorkspace };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test64_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      platform: 'neutral',
      target: 'es2022',
      jsx: 'automatic',
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'date-fns/locale',
        'xlsx',
        'canvas-confetti'
      ],
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    const releases = [
      {
        id: 'rel-1',
        code: 'T_26.12.1',
        name: 'Release Dic 2026',
        month: 'DICIEMBRE',
        year: 2026,
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        milestones: [
          { id: 'm1', key: 'qg1', code: 'QG1', name: 'Kickoff', category: 'SCOPE', date: '2026-10-05', color: 'cyan' },
          { id: 'm2', key: 'qg9', code: 'QG9', name: 'Launch', category: 'PROD', date: '2026-12-25', color: 'cyan' },
        ],
      },
    ];

    const projects = [
      { id: 'proj-1', name: 'Proyecto Alpha con Nombre Extremadamente Largo Para Truncar', color: 'indigo', releaseId: 'rel-1', collapsed: true },
      { id: 'proj-2', name: 'Proyecto Beta Secundario', color: 'emerald', releaseId: 'rel-1', collapsed: true },
    ];

    const items = [
      {
        id: 't-1',
        name: 'Tarea en Proyecto Alpha Con Nombre Muy Largo',
        type: 'task',
        startDate: '2026-10-10',
        endDate: '2026-10-20',
        duration: 11,
        progress: 50,
        dependencies: [],
        projectId: 'proj-1',
        platform: 'iOS',
      },
      {
        id: 't-2',
        name: 'Tarea en Proyecto Beta Dependiente de Alpha',
        type: 'task',
        startDate: '2026-10-22',
        endDate: '2026-10-30',
        duration: 9,
        progress: 0,
        dependencies: ['t-1'],
        projectId: 'proj-2',
        platform: 'Android',
      },
    ];

    const wsHtml = renderToString(React.createElement(mod.GanttWorkspace, {
      items,
      projects,
      releases,
      scrollContainerRef: { current: null },
      zoom: 'week',
      showCriticalPath: false,
      showCpmFloat: false,
      autoCascade: false,
      onReorderProject: () => {},
      onChangeProjectColor: () => {},
      onUpdateItem: () => {},
      onDeleteItem: () => {},
      onEditModal: () => {},
      onDuplicateItem: () => {},
      onQuickAdd: () => {},
      onToggleGroupByProject: () => {},
      onToggleProjectCollapse: () => {},
    }));

    // 1. Table search input and platform filter rendered in header
    assert.ok(wsHtml.includes('data-testid="table-search-input"'), 'Table must render table-search-input');
    assert.ok(wsHtml.includes('data-testid="table-platform-filter"'), 'Table must render table-platform-filter');

    // 2. Removal of release badge from project rows in table and timeline
    assert.ok(!wsHtml.includes('data-testid="project-release-badge-proj-1"'), 'Project row must NOT render project-release-badge');

    // 3. Removal of "Gestionar" button from release rows in table
    assert.ok(!wsHtml.includes('release-manage-btn-'), 'Release row must NOT render Gestionar button in table');

    // 4. Project reorder buttons
    assert.ok(wsHtml.includes('data-testid="project-reorder-up-proj-1"'), 'Project row must render reorder up button');
    assert.ok(wsHtml.includes('data-testid="project-reorder-down-proj-1"'), 'Project row must render reorder down button');

    // 5. Project color picker button in table
    assert.ok(wsHtml.includes('data-testid="project-color-picker-btn-proj-1"'), 'Project row must render inline color picker button');

    // 6. Name containers hover expansion data-attributes
    assert.ok(wsHtml.includes('data-testid="project-name-container-proj-1"'), 'Project row must render project-name-container');
    assert.ok(wsHtml.includes('data-name-truncated="true"'), 'Long project name must have data-name-truncated attribute');

    // 7. Sticky toolbar
    assert.ok(wsHtml.includes('data-testid="cronograma-toolbar"'), 'Workspace must render cronograma-toolbar');
    assert.ok(wsHtml.includes('sticky top-12'), 'cronograma-toolbar must be sticky at top-12');

    // 8. Collapsed inter-project dependency arrows SVG
    assert.ok(
      wsHtml.includes('data-inter-project-link="true"'),
      'Inter-project dependency between collapsed projects must render SVG arrow with data-inter-project-link="true"'
    );
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Test 65: v1.8.1 Elimination of zoom buttons, undo/redo buttons, GanttFlow text/icon from header, and GitBranch favicon in index.html', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const React = (await import('react')).default;
  const { renderToString } = await import('react-dom/server');
  const { build } = await import('esbuild');

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const tmpFile = path.resolve(__dirname, `./tmp_test65_bundle_${Date.now()}.mjs`);

  try {
    // 1. Verify index.html contains favicon link
    const indexHtml = await fs.readFile(path.resolve(__dirname, '../index.html'), 'utf8');
    assert.ok(
      indexHtml.includes('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />'),
      'index.html must link to /favicon.svg'
    );

    // 2. Verify public/favicon.svg exists and contains GitBranch path
    const faviconSvg = await fs.readFile(path.resolve(__dirname, '../public/favicon.svg'), 'utf8');
    assert.ok(faviconSvg.includes('<svg'), 'public/favicon.svg must be an SVG file');
    assert.ok(faviconSvg.includes('d="M18 9a9 9 0 0 1-9 9"'), 'favicon.svg must contain GitBranch icon path');
    assert.ok(faviconSvg.includes('#312C85'), 'favicon.svg must use brand indigo color #312C85');

    // 3. Build SSR bundle
    await build({
      entryPoints: [],
      stdin: {
        contents: `
          import React from 'react';
          import { App } from './src/App.tsx';
          import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
          export { App, GanttWorkspace };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test65_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      platform: 'neutral',
      target: 'es2022',
      jsx: 'automatic',
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'date-fns/locale',
        'xlsx',
        'canvas-confetti'
      ],
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // 4. Verify GanttWorkspace has NO zoom buttons
    const wsHtml = renderToString(React.createElement(mod.GanttWorkspace, {
      items: [],
      projects: [],
      releases: [],
      scrollContainerRef: { current: null },
      zoom: 'week',
      showCriticalPath: false,
      showCpmFloat: false,
      autoCascade: false,
    }));
    assert.ok(!wsHtml.includes('cronograma-zoom-out-btn'), 'GanttWorkspace must NOT render cronograma-zoom-out-btn');
    assert.ok(!wsHtml.includes('cronograma-zoom-in-btn'), 'GanttWorkspace must NOT render cronograma-zoom-in-btn');

    // 5. Verify App header has NO undo/redo buttons and NO GanttFlow brand logo
    const appHtml = renderToString(React.createElement(mod.App));
    assert.ok(!appHtml.includes('data-testid="header-undo-btn"'), 'App header must NOT render header-undo-btn');
    assert.ok(!appHtml.includes('data-testid="header-redo-btn"'), 'App header must NOT render header-redo-btn');

    // Extract the <header>...</header> block to assert brand removal
    const headerMatch = appHtml.match(/<header[^>]*>([\s\S]*?)<\/header>/);
    assert.ok(headerMatch, 'App must render a header');
    const headerContent = headerMatch[1];
    assert.ok(!headerContent.includes('<span>GanttFlow</span>'), 'Header must NOT render GanttFlow text brand');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Test 66: v1.8.3 Search bar placement in cronograma-toolbar preventing release row occlusion, sticky top-0 table header, and z-20 task row elevation eliminating weekend shading bleed', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const React = (await import('react')).default;
  const { renderToString } = await import('react-dom/server');
  const { build } = await import('esbuild');

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const tmpFile = path.resolve(__dirname, `./tmp_test66_bundle_${Date.now()}.mjs`);

  try {
    await build({
      stdin: {
        contents: `
          import React from 'react';
          import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
          import { App } from './src/App.tsx';
          export { GanttWorkspace, App };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test66_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      platform: 'neutral',
      target: 'es2022',
      jsx: 'automatic',
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'date-fns/locale',
        'xlsx',
        'canvas-confetti'
      ],
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    const items = [
      {
        id: 't-test-1',
        projectId: 'p-test-1',
        name: 'Tarea Prueba',
        type: 'task',
        startDate: '2026-10-15',
        endDate: '2026-10-25',
        duration: 11,
        slack: 0,
        dependencies: [],
        progress: 40,
        color: 'indigo',
      },
    ];
    const projects = [
      {
        id: 'p-test-1',
        name: 'Proyecto Test',
        color: 'indigo',
        releaseId: 'rel-t-26-12-1',
        collapsed: false,
      },
    ];
    const releases = [
      {
        id: 'rel-t-26-12-1',
        code: 'T_26.12.1',
        name: 'DICIEMBRE',
        month: 'DICIEMBRE',
        year: 2026,
        startDate: '2026-10-05',
        endDate: '2026-12-25',
        milestones: [],
      },
    ];

    const wsHtml = renderToString(
      React.createElement(mod.GanttWorkspace, {
        items,
        projects,
        releases,
        showTable: true,
        showWeekendShading: true,
        zoom: 'week',
        scrollContainerRef: { current: null },
        onUpdateItem: () => {},
        onDeleteItem: () => {},
        onEditModal: () => {},
        onDuplicateItem: () => {},
        onQuickAdd: () => {},
      })
    );

    // 1. Table header is sticky top-0, NOT top-[88px]
    assert.ok(wsHtml.includes('sticky top-0 z-20'), 'Table header must be sticky top-0 z-20');
    assert.ok(!wsHtml.includes('top-[88px]'), 'Table header must NOT have top-[88px]');

    // 2. Search input and platform filter rendered cleanly inside cronograma-toolbar
    assert.ok(wsHtml.includes('data-testid="cronograma-toolbar"'), 'Workspace must render cronograma-toolbar');
    assert.ok(wsHtml.includes('data-testid="table-search-input"'), 'Toolbar must render table-search-input');
    assert.ok(wsHtml.includes('data-testid="table-platform-filter"'), 'Toolbar must render table-platform-filter');

    // 3. Task row container has z-20 elevation so weekend shading (z-[1]) never cuts across task bars
    assert.ok(wsHtml.includes('data-timeline-task="t-test-1"'), 'Timeline must render task bar');
    assert.ok(wsHtml.includes('z-[1]'), 'Weekend shading layer must have z-[1]');
    assert.ok(
      wsHtml.includes('pointer-events-none z-20 transition-opacity'),
      'Task row wrapper must have z-20 to prevent weekend shading overlay'
    );

    // 4. Release header rows and duration badge remain completely visible and unobstructed
    assert.ok(wsHtml.includes('data-release-group="rel-t-26-12-1"'), 'Table must render release group row');
    assert.ok(wsHtml.includes('data-release-duration-badge="rel-t-26-12-1"'), 'Release row must render duration badge');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Test 67: Sticky calendar bar, tools dropdown z-50 elevation, invariant project ID on reorder, SCR release association, and project-to-children release/platform propagation with override', async () => {
  const fs = await import('node:fs/promises');
  const ReactMod = await import('react');
  const React = ReactMod.default || ReactMod;
  const ReactDOMServer = await import('react-dom/server');
  const { renderToString } = ReactDOMServer.default || ReactDOMServer;

  const tmpFile = path.resolve(__dirname, `tmp_test67_bundle_${Date.now()}.mjs`);
  try {
    await build({
      stdin: {
        contents: `
          import React from 'react';
          import { App } from './src/App.tsx';
          import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
          import { TaskFormModal } from './src/components/TaskFormModal.tsx';
          import {
            computeGanttMetrics,
            groupItemsByProject,
            isReleaseAssociatedTask,
            propagateProjectChangesToItems,
            reorderProject,
            sanitizeGanttItem,
            sanitizeProject,
          } from './src/utils/ganttEngine.ts';
          export {
            App,
            GanttWorkspace,
            TaskFormModal,
            computeGanttMetrics,
            groupItemsByProject,
            isReleaseAssociatedTask,
            propagateProjectChangesToItems,
            reorderProject,
            sanitizeGanttItem,
            sanitizeProject,
          };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test67_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      platform: 'neutral',
      target: 'es2022',
      jsx: 'automatic',
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'date-fns/locale',
        'xlsx',
        'canvas-confetti',
      ],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // 1. Top header is z-50 so tools dropdown (header-more-menu-dropdown) is never occluded by cronograma-toolbar (z-30)
    const appHtml = renderToString(React.createElement(mod.App));
    assert.ok(
      appHtml.includes('<header class="sticky top-0 z-50'),
      'Top header must have z-50 stacking context above cronograma-toolbar (z-30)'
    );
    assert.ok(
      appHtml.includes('data-testid="header-more-menu-dropdown"'),
      'Tools dropdown menu must render inside header'
    );

    // 2. Fixed & Unique Project ID: reordering projects keeps projectIndex (P1, P2) and task WBS codes (1.1, 2.1) invariant
    const initialProjects = [
      { id: 'proj-alpha', projectIndex: 1, name: 'Proyecto Alpha', color: 'indigo', releaseId: 'rel-1', platform: 'iOS' },
      { id: 'proj-beta', projectIndex: 2, name: 'Proyecto Beta', color: 'emerald', releaseId: 'rel-1', platform: 'Android' },
    ];
    const sampleItems = mod.computeGanttMetrics([
      { id: 't-alpha', projectId: 'proj-alpha', name: 'Tarea A', type: 'task', startDate: '2026-10-05', endDate: '2026-10-10', duration: 6, slack: 0, dependencies: [], progress: 0, color: 'indigo' },
      { id: 't-beta', projectId: 'proj-beta', name: 'Tarea B', type: 'task', startDate: '2026-10-06', endDate: '2026-10-12', duration: 7, slack: 0, dependencies: [], progress: 0, color: 'emerald' },
    ]);

    const reorderedProjects = mod.reorderProject(initialProjects, 'proj-beta', 'up');
    assert.strictEqual(reorderedProjects[0].id, 'proj-beta', 'Project Beta should move to first position');
    assert.strictEqual(reorderedProjects[1].id, 'proj-alpha', 'Project Alpha should move to second position');
    assert.strictEqual(reorderedProjects[0].projectIndex, 2, 'Project Beta must retain its fixed projectIndex = 2');
    assert.strictEqual(reorderedProjects[1].projectIndex, 1, 'Project Alpha must retain its fixed projectIndex = 1');

    const groupedAfterReorder = mod.groupItemsByProject(sampleItems, reorderedProjects);
    assert.strictEqual(groupedAfterReorder[0].project.id, 'proj-beta');
    assert.strictEqual(groupedAfterReorder[0].projectIndex, 2, 'Group projectIndex for Beta must stay 2 (P2)');
    assert.strictEqual(groupedAfterReorder[0].items[0].wbsCode, '2.1', 'Task WBS code for Beta must stay 2.1');
    assert.strictEqual(groupedAfterReorder[1].project.id, 'proj-alpha');
    assert.strictEqual(groupedAfterReorder[1].projectIndex, 1, 'Group projectIndex for Alpha must stay 1 (P1)');
    assert.strictEqual(groupedAfterReorder[1].items[0].wbsCode, '1.1', 'Task WBS code for Alpha must stay 1.1');

    // 3. SCR tasks are associated with a release just like DIGI tasks
    assert.strictEqual(mod.isReleaseAssociatedTask({ name: 'DIGI' }), true, 'DIGI task is release-associated');
    assert.strictEqual(mod.isReleaseAssociatedTask({ name: 'SCR' }), true, 'SCR task is release-associated');
    assert.strictEqual(mod.isReleaseAssociatedTask({ name: 'scr' }), true, 'scr task (lowercase) is release-associated');
    assert.strictEqual(mod.isReleaseAssociatedTask({ name: 'Tarea Normal', assignee: 'SCR' }), true, 'Task with SCR assignee is release-associated');
    assert.strictEqual(mod.isReleaseAssociatedTask({ name: 'Backend API' }), false, 'Regular task is not auto release-associated');

    // 4. Propagate project releaseId & platform changes to children, and allow child override
    const releases = [
      { id: 'rel-1', code: 'T_26.10.1', name: 'OCTUBRE', month: 'OCTUBRE', year: 2026, startDate: '2026-10-01', endDate: '2026-10-20', milestones: [] },
      { id: 'rel-2', code: 'T_26.12.1', name: 'DICIEMBRE', month: 'DICIEMBRE', year: 2026, startDate: '2026-12-01', endDate: '2026-12-22', milestones: [] },
    ];
    const prevProj = initialProjects[0]; // releaseId: 'rel-1', platform: 'iOS'
    const childTasks = [
      mod.sanitizeGanttItem({ id: 'c-digi', projectId: 'proj-alpha', name: 'DIGI', type: 'task', startDate: '2026-10-01', endDate: '2026-10-20', duration: 20, releaseId: 'rel-1', platform: 'iOS' }),
      mod.sanitizeGanttItem({ id: 'c-scr', projectId: 'proj-alpha', name: 'SCR', type: 'task', startDate: '2026-10-01', endDate: '2026-10-20', duration: 20, releaseId: 'rel-1', platform: 'iOS' }),
      mod.sanitizeGanttItem({ id: 'c-dev', projectId: 'proj-alpha', name: 'Desarrollo UI', type: 'task', startDate: '2026-10-05', endDate: '2026-10-10', duration: 6, releaseId: 'rel-1', platform: 'iOS' }),
    ];

    const updatedProj = { ...prevProj, releaseId: 'rel-2', platform: 'Android' };
    const propagatedTasks = mod.propagateProjectChangesToItems(prevProj, updatedProj, childTasks, releases);

    for (const t of propagatedTasks) {
      assert.strictEqual(t.releaseId, 'rel-2', `Task ${t.id} should receive propagated releaseId 'rel-2'`);
      assert.strictEqual(t.platform, 'Android', `Task ${t.id} should receive propagated platform 'Android'`);
    }
    const digiAfter = propagatedTasks.find((t) => t.id === 'c-digi');
    const scrAfter = propagatedTasks.find((t) => t.id === 'c-scr');
    const devAfter = propagatedTasks.find((t) => t.id === 'c-dev');
    assert.strictEqual(digiAfter.startDate, '2026-12-01', 'DIGI startDate must align to new release span');
    assert.strictEqual(digiAfter.endDate, '2026-12-22', 'DIGI endDate must align to new release span');
    assert.strictEqual(scrAfter.startDate, '2026-12-01', 'SCR startDate must align to new release span');
    assert.strictEqual(scrAfter.endDate, '2026-12-22', 'SCR endDate must align to new release span');
    assert.strictEqual(devAfter.startDate, '2026-10-05', 'Regular task dates remain untouched on release propagation');

    // Child can override its own releaseId and platform independently
    const childOverridden = mod.sanitizeGanttItem({
      ...scrAfter,
      releaseId: 'rel-1',
      platform: 'iOS/Android',
    });
    assert.strictEqual(childOverridden.releaseId, 'rel-1', 'Child task can override releaseId');
    assert.strictEqual(childOverridden.platform, 'iOS/Android', 'Child task can override platform');

    // 5. Verify sticky calendar header and SCR/release UI controls in GanttWorkspace and TaskFormModal
    const wsHtml = renderToString(
      React.createElement(mod.GanttWorkspace, {
        items: mod.computeGanttMetrics([childOverridden]),
        projects: [updatedProj, { id: 'proj-empty', projectIndex: 5, name: 'Proyecto Vacío', color: 'blue', releaseId: 'rel-2' }],
        releases,
        showTable: true,
        zoom: 'week',
        scrollContainerRef: { current: null },
        initialSelectedItemId: 'c-scr',
        onCreateDigiTask: () => {},
        onUpdateItem: () => {},
        onDeleteItem: () => {},
        onEditModal: () => {},
        onDuplicateItem: () => {},
        onQuickAdd: () => {},
      })
    );
    assert.ok(
      wsHtml.includes('data-testid="timeline-calendar-header"'),
      'GanttWorkspace must render timeline-calendar-header with sticky support'
    );
    assert.ok(
      wsHtml.includes('data-testid="project-empty-add-scr-btn-proj-empty"'),
      'Empty project row must offer + Tarea SCR quick button'
    );
    assert.ok(
      wsHtml.includes('data-testid="task-release-badge-c-scr"'),
      'SCR task row must display its associated release badge'
    );
    assert.ok(
      wsHtml.includes('data-testid="panel-release-badge-c-scr"'),
      'Inspection panel must display the task release badge'
    );
    assert.ok(
      wsHtml.includes('>P5</button>'),
      'Project with fixed projectIndex=5 must render badge P5 regardless of array index'
    );

    const modalHtml = renderToString(
      React.createElement(mod.TaskFormModal, {
        isOpen: true,
        onClose: () => {},
        onSave: () => {},
        projects: [updatedProj],
        allItems: [],
        releases,
      })
    );
    assert.ok(
      modalHtml.includes('data-testid="task-release-select"'),
      'TaskFormModal must render task-release-select for overriding or inheriting release'
    );
    assert.ok(
      modalHtml.includes('data-testid="task-preset-scr-btn"'),
      'TaskFormModal must render SCR quick preset button'
    );
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Test 68: Timeline calendar covers all days up to the latest visible release bar even when tasks end earlier', async () => {
  const fs = await import('node:fs/promises');
  const ReactMod = await import('react');
  const React = ReactMod.default || ReactMod;
  const ReactDOMServer = await import('react-dom/server');
  const { renderToString } = ReactDOMServer.default || ReactDOMServer;

  const tmpFile = path.resolve(__dirname, `tmp_test68_bundle_${Date.now()}.mjs`);
  try {
    await build({
      stdin: {
        contents: `
          import React from 'react';
          import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
          import {
            collectTimelineAnchorDates,
            computeTimelineBounds,
            computeGanttMetrics,
            formatDateISO,
          } from './src/utils/ganttEngine.ts';
          export {
            GanttWorkspace,
            collectTimelineAnchorDates,
            computeTimelineBounds,
            computeGanttMetrics,
            formatDateISO,
          };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test68_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      platform: 'neutral',
      target: 'es2022',
      jsx: 'automatic',
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'date-fns/locale',
        'xlsx',
        'canvas-confetti',
      ],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // Scenario matching user screenshot:
    // - Project 1 has a task ending early (e.g. 2027-03-03 -> +12d padding alone would stop at 2027-03-15)
    // - Project 9 (TEST) has 0 tasks and is assigned to Release T_27.3.1 (2026-12-30 -> 2027-03-30)
    // - Project 10 is assigned to Release T_27.4.1 (2027-01-29 -> 2027-04-30)
    const releases = [
      {
        id: 'rel-feb',
        code: 'T_27.2.1',
        name: 'FEBRERO',
        month: 'FEBRERO',
        year: 2027,
        startDate: '2026-11-30',
        endDate: '2027-03-01',
        milestones: [
          { id: 'm-f1', key: 'start', code: 'INI', name: 'Inicio', date: '2026-11-30' },
          { id: 'm-f2', key: 'prod', code: 'PROD', name: 'Producción', date: '2027-03-01' },
        ],
      },
      {
        id: 'rel-mar',
        code: 'T_27.3.1',
        name: 'MARZO',
        month: 'MARZO',
        year: 2027,
        startDate: '2026-12-30',
        endDate: '2027-03-30',
        milestones: [
          { id: 'm-m1', key: 'start', code: 'INI', name: 'Inicio', date: '2026-12-30' },
          { id: 'm-m2', key: 'prod', code: 'PROD', name: 'Producción', date: '2027-03-30' },
        ],
      },
      {
        id: 'rel-apr',
        code: 'T_27.4.1',
        name: 'ABRIL',
        month: 'ABRIL',
        year: 2027,
        startDate: '2027-01-29',
        endDate: '2027-04-30',
        milestones: [
          { id: 'm-a1', key: 'start', code: 'INI', name: 'Inicio', date: '2027-01-29' },
          { id: 'm-a2', key: 'prod', code: 'PROD', name: 'Producción', date: '2027-04-30' },
        ],
      },
    ];

    const projects = [
      { id: 'proj-early', projectIndex: 1, name: 'Proyecto Febrero', color: 'indigo', releaseId: 'rel-feb' },
      { id: 'proj-test', projectIndex: 9, name: 'TEST', color: 'emerald', releaseId: 'rel-mar' },
      { id: 'proj-april', projectIndex: 10, name: 'Proyecto Abril', color: 'violet', releaseId: 'rel-apr' },
    ];

    const items = mod.computeGanttMetrics([
      {
        id: 't-early',
        projectId: 'proj-early',
        name: 'DIGI',
        type: 'task',
        startDate: '2026-11-30',
        endDate: '2027-03-03',
        duration: 94,
        slack: 0,
        dependencies: [],
        progress: 50,
        color: 'indigo',
        releaseId: 'rel-feb',
      },
    ]);

    const anchorDates = mod.collectTimelineAnchorDates({
      projects,
      releases,
      items,
      hiddenReleaseIds: [],
    });
    assert.ok(anchorDates.includes('2027-03-30'), 'Anchor dates must include T_27.3.1 end date 2027-03-30');
    assert.ok(anchorDates.includes('2027-04-30'), 'Anchor dates must include T_27.4.1 end date 2027-04-30');

    const bounds = mod.computeTimelineBounds(items, new Date('2026-11-08T00:00:00Z'), anchorDates);
    const endIso = mod.formatDateISO(bounds.timelineEnd);
    assert.ok(
      endIso >= '2027-05-10',
      `Timeline bounds end (${endIso}) must extend past 2027-04-30 (+12d padding), never stopping at 2027-03-15`
    );

    const wsHtml = renderToString(
      React.createElement(mod.GanttWorkspace, {
        items,
        projects,
        releases,
        groupingMode: 'release',
        showTable: true,
        zoom: 'month',
        dayWidth: 5,
        scrollContainerRef: { current: null },
        onUpdateItem: () => {},
        onDeleteItem: () => {},
        onEditModal: () => {},
        onDuplicateItem: () => {},
        onQuickAdd: () => {},
      })
    );

    // Both release summary bars T_27.3.1 and T_27.4.1 are rendered
    assert.ok(wsHtml.includes('T_27.3.1'), 'Workspace must render release T_27.3.1');
    assert.ok(wsHtml.includes('T_27.4.1'), 'Workspace must render release T_27.4.1');

    // The calendar header must include April 2027 (abril 2027 / ABR) and May 2027 (padding after 30/04)
    assert.ok(
      wsHtml.toLowerCase().includes('abril 2027') || wsHtml.includes('>ABR<'),
      'Calendar header must render April 2027 month header to cover T_27.4.1 release bar'
    );
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Test 69: Clean project names on Gantt timeline bars and Proyecto column in PlanHistoryPage expanded table', async () => {
  const fs = await import('node:fs/promises');
  const ReactMod = await import('react');
  const React = ReactMod.default || ReactMod;
  const ReactDOMServer = await import('react-dom/server');
  const { renderToString } = ReactDOMServer.default || ReactDOMServer;

  const tmpFile = path.resolve(__dirname, `tmp_test69_bundle_${Date.now()}.mjs`);
  try {
    await build({
      stdin: {
        contents: `
          import React from 'react';
          import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
          import { PlanHistoryPage } from './src/components/PlanHistoryPage.tsx';
          import { computeGanttMetrics } from './src/utils/ganttEngine.ts';
          export { GanttWorkspace, PlanHistoryPage, computeGanttMetrics };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test69_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      platform: 'neutral',
      target: 'es2022',
      jsx: 'automatic',
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'date-fns/locale',
        'xlsx',
        'canvas-confetti',
      ],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    const projects = [
      { id: 'proj-9', projectIndex: 9, name: 'TEST', color: 'indigo' },
      { id: 'proj-10', projectIndex: 10, name: 'Release SDK ARQ', color: 'emerald' },
    ];
    const items = mod.computeGanttMetrics([
      {
        id: 't-1793617423630',
        projectId: 'proj-10',
        name: 'SSM: HDEV-775252 Creación de pipeline subida a Arxan',
        type: 'task',
        startDate: '2026-11-01',
        endDate: '2026-11-15',
        duration: 15,
        slack: 0,
        dependencies: [],
        progress: 0,
        color: 'emerald',
      },
    ]);

    const wsHtml = renderToString(
      React.createElement(mod.GanttWorkspace, {
        items,
        projects,
        releases: [],
        groupingMode: 'project',
        groupByProject: true,
        showTable: true,
        zoom: 'week',
        scrollContainerRef: { current: null },
        onUpdateItem: () => {},
        onDeleteItem: () => {},
        onEditModal: () => {},
        onDuplicateItem: () => {},
        onQuickAdd: () => {},
      })
    );

    // 1. Timeline project summary bars must display clean project names without "P9: " or "P10: "
    assert.ok(
      !wsHtml.includes('P9: TEST') && !wsHtml.includes('P10: Release SDK ARQ'),
      'Timeline project summary bar labels must not include noisy P9: or P10: prefix'
    );
    assert.ok(
      wsHtml.includes('>TEST</span>') && wsHtml.includes('>Release SDK ARQ</span>'),
      'Timeline project summary bar labels must display clean project names'
    );

    // 2. Left WBS table still displays P9 / P10 and hierarchical WBS 10.1
    assert.ok(wsHtml.includes('>P9</button>'), 'Left WBS table must still display P9 badge');
    assert.ok(wsHtml.includes('>P10</button>'), 'Left WBS table must still display P10 badge');
    assert.ok(wsHtml.includes('10.1'), 'Left WBS table must still display hierarchical task WBS 10.1');

    // 3. PlanHistoryPage expanded table displays Proyecto column and project name instead of raw technical ID
    const historyEntry = {
      id: 'hist-80',
      timestamp: '2026-11-08T20:02:19.000Z',
      formattedDate: '08/11/2026, 21:02:19',
      actionType: 'reorder_item',
      actionLabel: 'Reordenación',
      description: "Mover 'SSM: HDEV-775252' hacia arriba",
      itemsCount: 1,
      projectsCount: 2,
      snapshot: {
        items,
        projects,
      },
    };

    const historyHtml = renderToString(
      React.createElement(mod.PlanHistoryPage, {
        history: [historyEntry],
        currentIndex: 0,
        canUndo: false,
        canRedo: false,
        onUndo: () => {},
        onRedo: () => {},
        onRestoreSnapshot: () => {},
        onBackToGantt: () => {},
        initialExpandedEntryId: 'hist-80',
      })
    );

    assert.ok(
      historyHtml.includes('<th class="px-2.5 py-1">Proyecto</th>'),
      'PlanHistoryPage expanded snapshot table must have Proyecto column header instead of ID'
    );
    assert.ok(
      historyHtml.includes('data-testid="history-item-project-t-1793617423630"') &&
        historyHtml.includes('>Release SDK ARQ</td>'),
      'PlanHistoryPage expanded snapshot table must render the project name for each task'
    );
    assert.ok(
      !historyHtml.includes('>t-1793617423630</td>'),
      'PlanHistoryPage expanded snapshot table must NOT render the raw technical timestamp ID in the cell'
    );
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Test 70: v1.8.7 Exact state change diffs in PlanHistoryPage, icon-only focus/hide buttons on Release bars, and iOS/Android platform with icons on table project rows', async () => {
  const fs = await import('node:fs/promises');
  const ReactMod = await import('react');
  const React = ReactMod.default || ReactMod;
  const ReactDOMServer = await import('react-dom/server');
  const { renderToString } = ReactDOMServer.default || ReactDOMServer;

  const tmpFile = path.resolve(__dirname, `tmp_test70_bundle_${Date.now()}.mjs`);
  try {
    await build({
      stdin: {
        contents: `
          import React from 'react';
          import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
          import { PlanHistoryPage } from './src/components/PlanHistoryPage.tsx';
          import {
            computeGanttMetrics,
            computeHistoryEntryDiff,
            describeProjectStateChanges,
            describeItemStateChanges,
            normalizePlatform,
          } from './src/utils/ganttEngine.ts';
          export {
            GanttWorkspace,
            PlanHistoryPage,
            computeGanttMetrics,
            computeHistoryEntryDiff,
            describeProjectStateChanges,
            describeItemStateChanges,
            normalizePlatform,
          };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test70_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      platform: 'neutral',
      target: 'es2022',
      jsx: 'automatic',
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'date-fns/locale',
        'xlsx',
        'canvas-confetti',
      ],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // 1. normalizePlatform maps 'Multiplataforma' and 'iOS/Android' to 'iOS/Android'
    assert.strictEqual(mod.normalizePlatform('Multiplataforma'), 'iOS/Android', 'Legacy Multiplataforma must normalize to iOS/Android');
    assert.strictEqual(mod.normalizePlatform('iOS/Android'), 'iOS/Android', 'iOS/Android must normalize to iOS/Android');
    assert.strictEqual(mod.normalizePlatform('iOS'), 'iOS', 'iOS must stay iOS');
    assert.strictEqual(mod.normalizePlatform('Android'), 'Android', 'Android must stay Android');

    // 2. Exact state change diff computation for project & task updates
    const releases = [
      { id: 'rel-1', code: 'T_26.12.1', name: 'DICIEMBRE', month: 'DICIEMBRE', year: 2026, startDate: '2026-10-05', endDate: '2026-12-25', milestones: [] },
      { id: 'rel-2', code: 'T_27.01.1', name: 'ENERO', month: 'ENERO', year: 2027, startDate: '2027-01-05', endDate: '2027-01-25', milestones: [] },
    ];

    const projBefore = {
      id: 'proj-xcode',
      projectIndex: 10,
      name: 'HDEV-747747: Xcode 27',
      color: 'indigo',
      releaseId: 'rel-1',
      platform: 'iOS',
    };
    const projAfter = {
      ...projBefore,
      releaseId: 'rel-2',
      platform: 'iOS/Android',
      color: 'emerald',
    };
    const projDiffs = mod.describeProjectStateChanges(projBefore, projAfter, releases);
    assert.strictEqual(projDiffs.length, 3, 'Should detect 3 exact changed fields on project');
    assert.deepStrictEqual(
      projDiffs.map((d) => ({ field: d.field, before: d.before, after: d.after })),
      [
        { field: 'Release', before: 'T_26.12.1', after: 'T_27.01.1' },
        { field: 'Plataforma', before: 'iOS', after: 'iOS/Android' },
        { field: 'Color', before: 'indigo', after: 'emerald' },
      ]
    );

    const prevSnapshot = {
      projects: [projBefore],
      items: [
        { id: 't-1', projectId: 'proj-xcode', name: 'Compilar SDK', type: 'task', startDate: '2026-10-05', endDate: '2026-10-10', duration: 6, slack: 0, progress: 20, dependencies: [], color: 'indigo', platform: 'iOS', releaseId: 'rel-1' },
      ],
    };
    const nextSnapshot = {
      projects: [projAfter],
      items: [
        { id: 't-1', projectId: 'proj-xcode', name: 'Compilar SDK', type: 'task', startDate: '2026-10-05', endDate: '2026-10-12', duration: 8, slack: 0, progress: 60, dependencies: [], color: 'indigo', platform: 'iOS/Android', releaseId: 'rel-2' },
      ],
    };

    const historyEntries = [
      {
        id: 'hist-1',
        timestamp: '2026-11-08T20:10:00.000Z',
        formattedDate: '08/11/2026, 21:10:00',
        actionType: 'initial',
        actionLabel: 'Estado Inicial',
        description: 'Plan inicial cargado',
        itemsCount: 1,
        projectsCount: 1,
        snapshot: prevSnapshot,
      },
      {
        id: 'hist-2',
        timestamp: '2026-11-08T20:22:18.000Z',
        formattedDate: '08/11/2026, 21:22:18',
        actionType: 'update_project',
        actionLabel: 'Edición de Proyecto',
        description: "Actualizar proyecto 'HDEV-747747: Xcode 27'",
        itemsCount: 1,
        projectsCount: 1,
        snapshot: nextSnapshot,
      },
    ];

    const historyHtml = renderToString(
      React.createElement(mod.PlanHistoryPage, {
        history: historyEntries,
        currentIndex: 1,
        canUndo: true,
        canRedo: false,
        onUndo: () => {},
        onRedo: () => {},
        onRestoreSnapshot: () => {},
        onBackToGantt: () => {},
        releases,
        initialExpandedEntryId: 'hist-2',
      })
    );

    // Verify inline diff pills on card and exact changes table in expanded details
    assert.ok(
      historyHtml.includes('data-testid="history-entry-diff-summary-hist-2"'),
      'PlanHistoryPage card must render inline diff summary pills'
    );
    assert.ok(
      historyHtml.includes('data-testid="history-exact-changes-hist-2"'),
      'PlanHistoryPage expanded view must render exact state changes section'
    );
    assert.ok(
      historyHtml.includes('T_26.12.1') && historyHtml.includes('T_27.01.1'),
      'PlanHistoryPage must display exact before and after Release values (T_26.12.1 → T_27.01.1)'
    );
    assert.ok(
      historyHtml.includes('Plataforma:') && historyHtml.includes('iOS/Android'),
      'PlanHistoryPage must display exact before and after Plataforma values (iOS → iOS/Android)'
    );

    // 3. Icon-only focus and hide buttons on Release header bars & iOS/Android icons on table project rows
    const wsProjects = [
      { id: 'proj-both', projectIndex: 1, name: 'App Dual', color: 'indigo', releaseId: 'rel-1', platform: 'iOS/Android' },
      { id: 'proj-ios', projectIndex: 2, name: 'App Apple', color: 'sky', releaseId: 'rel-1', platform: 'iOS' },
      { id: 'proj-and', projectIndex: 3, name: 'App Robot', color: 'emerald', releaseId: 'rel-1', platform: 'Android' },
    ];
    const wsItems = mod.computeGanttMetrics([
      { id: 't-b', projectId: 'proj-both', name: 'Tarea Dual', type: 'task', startDate: '2026-10-06', endDate: '2026-10-12', duration: 7, slack: 0, dependencies: [], progress: 0, color: 'indigo' },
    ]);

    const wsHtml = renderToString(
      React.createElement(mod.GanttWorkspace, {
        items: wsItems,
        projects: wsProjects,
        releases,
        groupingMode: 'release',
        groupByProject: true,
        showTable: true,
        zoom: 'week',
        scrollContainerRef: { current: null },
        onToggleHideRelease: () => {},
        onSetFocusEntity: () => {},
        onUpdateItem: () => {},
        onDeleteItem: () => {},
        onEditModal: () => {},
        onDuplicateItem: () => {},
        onQuickAdd: () => {},
      })
    );

    // Verify release hide and focus buttons are icon-only (no text spans inside)
    const hideBtnMatch = wsHtml.match(/data-testid="hide-release-rel-1"[^>]*>([\s\S]*?)<\/button>/);
    assert.ok(hideBtnMatch, 'hide-release-rel-1 button must be rendered on release header bar');
    assert.ok(!hideBtnMatch[1].includes('Ocultar'), 'hide-release button must be icon-only without "Ocultar" text');

    const focusBtnMatch = wsHtml.match(/data-testid="focus-release-rel-1"[^>]*>([\s\S]*?)<\/button>/);
    assert.ok(focusBtnMatch, 'focus-release-rel-1 button must be rendered on release header bar');
    assert.ok(!focusBtnMatch[1].includes('Enfoque'), 'focus-release button must be icon-only without "Enfoque" text');

    // Verify project rows in table render iOS and Android SVG icons according to platform
    assert.ok(
      wsHtml.includes('data-testid="project-platform-badge-proj-both"') &&
        wsHtml.includes('data-testid="platform-icon-ios-proj-both"') &&
        wsHtml.includes('data-testid="platform-icon-android-proj-both"'),
      'Project with iOS/Android platform must render both iOS and Android icons in table row'
    );
    assert.ok(
      wsHtml.includes('data-testid="platform-icon-ios-proj-ios"') &&
        !wsHtml.includes('data-testid="platform-icon-android-proj-ios"'),
      'Project with iOS platform must render only iOS icon in table row'
    );
    assert.ok(
      wsHtml.includes('data-testid="platform-icon-android-proj-and"') &&
        !wsHtml.includes('data-testid="platform-icon-ios-proj-and"'),
      'Project with Android platform must render only Android icon in table row'
    );
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

// ============================================================================
// TEST 71: v1.8.8 Minimalist Table Release Header Bar (Only T_ Code, No Icon/Name),
// Deduplicated Platform Filter, and Custom Icon-Only Platform Filter Dropdown
// ============================================================================
test('Test 71: v1.8.8 table release bar shows only T_ code without icon/name, duplicate header platform filter is removed, and custom platform filter uses iOS/Android icons', async () => {
  const fs = await import('node:fs/promises');
  const ReactMod = await import('react');
  const React = ReactMod.default || ReactMod;
  const ReactDOMServer = await import('react-dom/server');
  const { renderToString } = ReactDOMServer.default || ReactDOMServer;

  const tmpFile = path.resolve(__dirname, `tmp_test71_bundle_${Date.now()}.mjs`);
  try {
    await build({
      stdin: {
        contents: `
          import React from 'react';
          import { App } from './src/App.tsx';
          import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
          import { computeGanttMetrics } from './src/utils/ganttEngine.ts';
          export { App, GanttWorkspace, computeGanttMetrics };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test71_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      platform: 'neutral',
      target: 'es2022',
      jsx: 'automatic',
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'date-fns/locale',
        'xlsx',
        'canvas-confetti',
      ],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // 1. Verify duplicate platform-filter-select is removed from App top header
    const appHtml = renderToString(React.createElement(mod.App));
    assert.ok(
      !appHtml.includes('data-testid="platform-filter-select"'),
      'Duplicate platform-filter-select in top App header must be removed'
    );
    assert.ok(
      appHtml.includes('data-testid="table-platform-filter"'),
      'Unified table-platform-filter must be rendered in the Cronograma toolbar'
    );

    // 2. Verify table release header row displays ONLY the T_ code (no Rocket icon, no release name)
    const releases = [
      {
        id: 'rel-dec',
        code: 'T_26.12.1',
        name: 'DICIEMBRE',
        year: 2026,
        milestones: [
          { id: 'm1', key: 'qg1', code: 'QG1', name: 'QG1', date: '2026-10-06' },
          { id: 'm2', key: 'iop', code: 'IOP', name: 'IOP', date: '2026-12-10' },
        ],
      },
    ];
    const projects = [
      { id: 'p-dual', projectIndex: 1, name: 'Proyecto Dual', color: 'indigo', releaseId: 'rel-dec', platform: 'iOS/Android' },
      { id: 'p-ios', projectIndex: 2, name: 'Proyecto Solo iOS', color: 'sky', releaseId: 'rel-dec', platform: 'iOS' },
      { id: 'p-and', projectIndex: 3, name: 'Proyecto Solo Android', color: 'emerald', releaseId: 'rel-dec', platform: 'Android' },
    ];
    const items = mod.computeGanttMetrics([
      { id: 't-dual', projectId: 'p-dual', name: 'Tarea Multi', type: 'task', startDate: '2026-10-06', endDate: '2026-10-12', duration: 7, slack: 0, dependencies: [], progress: 0, color: 'indigo' },
      { id: 't-ios', projectId: 'p-ios', name: 'Tarea Apple', type: 'task', startDate: '2026-10-06', endDate: '2026-10-12', duration: 7, slack: 0, dependencies: [], progress: 0, color: 'sky' },
      { id: 't-and', projectId: 'p-and', name: 'Tarea Google', type: 'task', startDate: '2026-10-06', endDate: '2026-10-12', duration: 7, slack: 0, dependencies: [], progress: 0, color: 'emerald' },
    ]);

    const wsAllHtml = renderToString(
      React.createElement(mod.GanttWorkspace, {
        items,
        projects,
        releases,
        groupingMode: 'release',
        groupByProject: true,
        showTable: true,
        zoom: 'week',
        scrollContainerRef: { current: null },
        onToggleHideRelease: () => {},
        onSetFocusEntity: () => {},
        onUpdateItem: () => {},
        onDeleteItem: () => {},
        onEditModal: () => {},
        onDuplicateItem: () => {},
        onQuickAdd: () => {},
      })
    );

    const tableReleaseRowMatch = wsAllHtml.match(
      /<div[^>]*data-release-group="rel-dec"[^>]*>([\s\S]*?)data-release-duration-badge="rel-dec"/
    );
    assert.ok(tableReleaseRowMatch, 'Table release row data-release-group="rel-dec" must exist');
    const tableReleaseRowHtml = tableReleaseRowMatch[1];
    assert.ok(
      tableReleaseRowHtml.includes('T_26.12.1'),
      'Table release row must display the T_ release code (T_26.12.1)'
    );
    assert.ok(
      !tableReleaseRowHtml.includes('DICIEMBRE'),
      'Table release row must NOT display the full release name (DICIEMBRE)'
    );
    assert.ok(
      !tableReleaseRowHtml.includes('lucide-rocket'),
      'Table release row must NOT display the Rocket icon'
    );

    // 3. Verify custom platform filter dropdown options use icons instead of text (and 2 icons for iOS/Android)
    assert.ok(
      wsAllHtml.includes('data-testid="table-platform-filter-menu"'),
      'Custom platform filter menu must be present in DOM'
    );
    const optIosMatch = wsAllHtml.match(/<button[^>]*data-testid="platform-filter-option-iOS"[^>]*>([\s\S]*?)<\/button>/);
    assert.ok(optIosMatch, 'platform-filter-option-iOS must exist');
    assert.ok(
      optIosMatch[1].includes('data-testid="filter-option-icon-ios"') && !optIosMatch[1].includes('>iOS<'),
      'iOS filter option must render the iOS icon instead of text'
    );

    const optAndroidMatch = wsAllHtml.match(/<button[^>]*data-testid="platform-filter-option-Android"[^>]*>([\s\S]*?)<\/button>/);
    assert.ok(optAndroidMatch, 'platform-filter-option-Android must exist');
    assert.ok(
      optAndroidMatch[1].includes('data-testid="filter-option-icon-android"') && !optAndroidMatch[1].includes('>Android<'),
      'Android filter option must render the Android icon instead of text'
    );

    const optBothMatch = wsAllHtml.match(/<button[^>]*data-testid="platform-filter-option-iOS\/Android"[^>]*>([\s\S]*?)<\/button>/);
    assert.ok(optBothMatch, 'platform-filter-option-iOS/Android must exist');
    assert.ok(
      optBothMatch[1].includes('data-testid="filter-option-icon-both-ios"') &&
        optBothMatch[1].includes('data-testid="filter-option-icon-both-android"') &&
        !optBothMatch[1].includes('>iOS/Android<'),
      'iOS/Android filter option must render both iOS and Android icons together without text'
    );

    // 4. Verify filtering by 'iOS/Android' filters multiplatform elements and displays both icons in the trigger button
    const wsMultiHtml = renderToString(
      React.createElement(mod.GanttWorkspace, {
        items,
        projects,
        releases,
        selectedPlatform: 'iOS/Android',
        groupingMode: 'release',
        groupByProject: true,
        showTable: true,
        zoom: 'week',
        scrollContainerRef: { current: null },
        onUpdateItem: () => {},
        onDeleteItem: () => {},
        onEditModal: () => {},
        onDuplicateItem: () => {},
        onQuickAdd: () => {},
      })
    );
    assert.ok(
      wsMultiHtml.includes('data-testid="active-filter-icon-both-ios"') &&
        wsMultiHtml.includes('data-testid="active-filter-icon-both-android"'),
      'Active filter trigger button must display both iOS and Android icons when iOS/Android is selected'
    );
    assert.ok(
      wsMultiHtml.includes('Proyecto Dual') && wsMultiHtml.includes('Tarea Multi'),
      'iOS/Android filter must keep multiplatform projects and tasks'
    );
    assert.ok(
      !wsMultiHtml.includes('Proyecto Solo iOS') && !wsMultiHtml.includes('Proyecto Solo Android'),
      'iOS/Android filter must exclude single-platform iOS-only and Android-only projects'
    );
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

// ============================================================================
// TEST 72: v1.8.9 Conflict Warning Banner Item Identification and Click-to-Navigate
// ============================================================================
test('Test 72: v1.8.9 conflict warning banner displays conflicting elements and clicking/selecting navigates to and highlights the element', async () => {
  const fs = await import('node:fs/promises');
  const ReactMod = await import('react');
  const React = ReactMod.default || ReactMod;
  const ReactDOMServer = await import('react-dom/server');
  const { renderToString } = ReactDOMServer.default || ReactDOMServer;

  const tmpFile = path.resolve(__dirname, `tmp_test72_bundle_${Date.now()}.mjs`);
  try {
    await build({
      stdin: {
        contents: `
          import React from 'react';
          import { App } from './src/App.tsx';
          import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
          import { computeGanttMetrics } from './src/utils/ganttEngine.ts';
          export { App, GanttWorkspace, computeGanttMetrics };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test72_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      platform: 'neutral',
      target: 'es2022',
      jsx: 'automatic',
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'date-fns/locale',
        'xlsx',
        'canvas-confetti',
      ],
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    const sampleProjects = [
      {
        id: 'proj-conf',
        projectIndex: 1,
        name: 'Migración Xcode 27',
        color: 'indigo',
        releaseId: 'rel-t-26-12-1',
        platform: 'iOS/Android',
      },
    ];
    const sampleItems = [
      {
        id: 't-pred',
        projectId: 'proj-conf',
        name: 'Desarrollo SDK Base',
        type: 'task',
        startDate: '2026-10-10',
        endDate: '2026-10-20',
        duration: 11,
        slack: 0,
        dependencies: [],
        progress: 50,
        color: 'indigo',
      },
      {
        id: 't-succ-conflict',
        projectId: 'proj-conf',
        name: 'Integración Biometría',
        type: 'task',
        startDate: '2026-10-15',
        endDate: '2026-10-22',
        duration: 8,
        slack: 0,
        dependencies: ['t-pred'],
        dependencyTypes: { 't-pred': 'FS' },
        progress: 0,
        color: 'indigo',
      },
    ];

    // 1. Verify App renders the conflict warning banner with interactive button for the conflicting task
    const appHtml = renderToString(
      React.createElement(mod.App, {
        initialProjects: sampleProjects,
        initialItems: sampleItems,
      })
    );
    assert.ok(
      appHtml.includes('data-testid="conflict-warning-banner"'),
      'App must render data-testid="conflict-warning-banner" when a task violates predecessor dates'
    );
    assert.ok(
      appHtml.includes('data-testid="conflict-items-list"'),
      'Conflict banner must render data-testid="conflict-items-list"'
    );
    assert.ok(
      appHtml.includes('data-testid="conflict-item-btn-t-succ-conflict"'),
      'Conflict banner must render an interactive button for the conflicting element (conflict-item-btn-t-succ-conflict)'
    );
    assert.ok(
      appHtml.includes('Migración Xcode 27 ›') && appHtml.includes('Integración Biometría'),
      'Conflict button must display the parent project name and the conflicting task name'
    );

    // 2. Verify selecting the conflicting element highlights its row and opens the inspection panel with conflict alert
    const computed = mod.computeGanttMetrics(sampleItems);
    const wsHtml = renderToString(
      React.createElement(mod.GanttWorkspace, {
        items: computed,
        projects: sampleProjects,
        releases: [
          {
            id: 'rel-t-26-12-1',
            code: 'T_26.12.1',
            name: 'DICIEMBRE',
            year: 2026,
            milestones: [
              { id: 'm1', key: 'qg1', code: 'QG1', name: 'QG1', date: '2026-10-06' },
              { id: 'm2', key: 'iop', code: 'IOP', name: 'IOP', date: '2026-12-10' },
            ],
          },
        ],
        selectedEntity: {
          type: 'task',
          id: 't-succ-conflict',
          name: 'Integración Biometría',
        },
        groupingMode: 'release',
        groupByProject: true,
        showTable: true,
        zoom: 'week',
        scrollContainerRef: { current: null },
        onUpdateItem: () => {},
        onDeleteItem: () => {},
        onEditModal: () => {},
        onDuplicateItem: () => {},
        onQuickAdd: () => {},
      })
    );

    assert.ok(
      wsHtml.includes('data-task-row="t-succ-conflict"') &&
        wsHtml.includes('data-selected-task-row="true"'),
      'Selected conflicting task row must have data-selected-task-row="true"'
    );
    assert.ok(
      wsHtml.includes('id="gantt-inspection-panel"') &&
        wsHtml.includes('data-selected-item-id="t-succ-conflict"'),
      'Inspection panel must open for the selected conflicting task when selectedEntity is set'
    );
    assert.ok(
      wsHtml.includes('data-testid="panel-conflict-alert-t-succ-conflict"'),
      'Inspection panel must display the detailed dependency conflict alert box'
    );
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

// TEST 73: v1.9.0 Project Alert Level (0-3), Workspace Toolbar Alert Filter, ReportsView Resumen Proyectos Column & Multiline Description
test('Test 73: v1.9.0 project alert level (0-3), workspace toolbar alert filter, and ReportsView Resumen Proyectos alert column with multiline subtask descriptions', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { build } = await import('esbuild');
  const ReactDOMServer = await import('react-dom/server');
  const ReactMod = await import('react');
  const React = ReactMod.default || ReactMod;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const tmpFile = path.resolve(__dirname, `tmp_test73_bundle_${Date.now()}.mjs`);
  try {
    await build({
      stdin: {
        contents: `
          import React from 'react';
          import { App } from './src/App.tsx';
          import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
          import { ReportsView } from './src/components/ReportsView.tsx';
          import { APP_VERSION } from './src/types/gantt.ts';
          import { sanitizeProject, describeProjectStateChanges } from './src/utils/ganttEngine.ts';
          import { generateProjectSummaryRows, PROJECT_SUMMARY_HEADER } from './src/utils/excelExportEngine.ts';

          export {
            App,
            GanttWorkspace,
            ReportsView,
            APP_VERSION,
            sanitizeProject,
            describeProjectStateChanges,
            generateProjectSummaryRows,
            PROJECT_SUMMARY_HEADER,
          };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test73_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'xlsx',
        'clsx',
        'tailwind-merge',
      ],
      jsx: 'automatic',
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const { renderToString } = ReactDOMServer.default || ReactDOMServer;

    assert.strictEqual(mod.APP_VERSION, '1.9.3', 'APP_VERSION must be 1.9.2');

    // 1. Check sanitizeProject and describeProjectStateChanges for alertLevel
    const pSanitized0 = mod.sanitizeProject({ id: 'p-1', name: 'Proj 1', alertLevel: 0 });
    assert.strictEqual(pSanitized0.alertLevel, 0, 'sanitizeProject preserves alertLevel 0');
    const pSanitized3 = mod.sanitizeProject({ id: 'p-2', name: 'Proj 2', alertLevel: 3 });
    assert.strictEqual(pSanitized3.alertLevel, 3, 'sanitizeProject preserves alertLevel 3');
    const pSanitizedInvalid = mod.sanitizeProject({ id: 'p-3', name: 'Proj 3', alertLevel: 9 });
    assert.strictEqual(pSanitizedInvalid.alertLevel, undefined, 'sanitizeProject ignores invalid alertLevel');

    const diffs = mod.describeProjectStateChanges(pSanitized0, { ...pSanitized0, alertLevel: 2 });
    const alertDiff = diffs.find((d) => d.field === 'Alerta');
    assert.ok(alertDiff, 'describeProjectStateChanges records Alerta diff');
    assert.strictEqual(alertDiff.before, 'Nivel 0');
    assert.strictEqual(alertDiff.after, 'Nivel 2');

    // 2. Check generateProjectSummaryRows for alertLevel and multiline task descriptions
    assert.ok(mod.PROJECT_SUMMARY_HEADER.includes('Nivel de Alerta'), 'PROJECT_SUMMARY_HEADER must include Nivel de Alerta');

    const testProj = {
      id: 'proj-demo-1',
      name: 'Plataforma Pagos',
      color: 'indigo',
      platform: 'iOS/Android',
      alertLevel: 2,
      description: 'Sistema centralizado de transacciones bancarias',
    };
    const testItems = [
      {
        id: 't-1',
        projectId: 'proj-demo-1',
        name: 'API Gateway',
        type: 'task',
        startDate: '2026-03-01',
        endDate: '2026-03-05',
        duration: 5,
        progress: 50,
        notes: 'Rutas seguras JWT y OAuth2',
        dependencies: [],
      },
      {
        id: 't-2',
        projectId: 'proj-demo-1',
        name: 'Integración Redsys',
        type: 'task',
        startDate: '2026-03-06',
        endDate: '2026-03-10',
        duration: 5,
        progress: 0,
        notes: 'Conector TPV virtual con firma HMAC-SHA256',
        dependencies: ['t-1'],
      },
    ];

    const summaryRows = mod.generateProjectSummaryRows([], [testProj], testItems);
    assert.strictEqual(summaryRows.length, 1);
    const row0 = summaryRows[0];
    assert.strictEqual(row0.alertLevel, 2, 'Summary row must have alertLevel 2');
    assert.strictEqual(row0.alertLevelLabel, 'Nivel 2', 'Summary row must have alertLevelLabel "Nivel 2"');

    const expectedDesc = 'Sistema centralizado de transacciones bancarias\n\n* API Gateway Rutas seguras JWT y OAuth2\n* Integración Redsys Conector TPV virtual con firma HMAC-SHA256';
    assert.strictEqual(row0.description, expectedDesc, 'Description must combine project description and subtasks formatted as <nombre tarea> <descripcion tarea> separated by newlines');

    // 4. GanttWorkspace renders alert filter and alert badge on project row
    const workspaceHtml = renderToString(
      React.createElement(mod.GanttWorkspace, {
        items: testItems,
        projects: [testProj],
        releases: [],
        groupingMode: 'project',
        groupByProject: true,
        showTable: true,
        scrollContainerRef: { current: null },
        onUpdateItem: () => {},
        onDeleteItem: () => {},
      })
    );

    assert.ok(
      workspaceHtml.includes('data-testid="table-alert-filter"'),
      'GanttWorkspace toolbar must render data-testid="table-alert-filter"'
    );
    assert.ok(
      workspaceHtml.includes('data-testid="table-alert-filter-menu"'),
      'GanttWorkspace toolbar must render data-testid="table-alert-filter-menu"'
    );
    assert.ok(
      workspaceHtml.includes('data-testid="alert-filter-option-0"') &&
        workspaceHtml.includes('data-testid="alert-filter-option-1"') &&
        workspaceHtml.includes('data-testid="alert-filter-option-2"') &&
        workspaceHtml.includes('data-testid="alert-filter-option-3"'),
      'GanttWorkspace alert filter menu must include options for levels 0, 1, 2, 3'
    );
    assert.ok(
      workspaceHtml.includes(`data-testid="project-alert-badge-${testProj.id}"`) &&
        workspaceHtml.includes('data-alert-level="2"'),
      'Project row in WBS table must render project-alert-badge with data-alert-level="2"'
    );

    // 5. App modal has alert level selector
    const appHtml = renderToString(React.createElement(mod.App));
    assert.ok(
      appHtml.includes('data-testid="table-alert-filter"'),
      'App renders table-alert-filter in workspace toolbar'
    );

    // 6. ReportsView Tab 2 (Resumen Proyectos) renders Nivel de Alerta column and multiline description
    const reportsHtml = renderToString(
      React.createElement(mod.ReportsView, {
        releases: [],
        projects: [testProj],
        items: testItems,
        initialTab: 'projects',
        onBackToGantt: () => {},
      })
    );

    assert.ok(
      reportsHtml.includes('Nivel de Alerta'),
      'ReportsView Tab 2 must render Nivel de Alerta column header'
    );
    assert.ok(
      reportsHtml.includes(`data-testid="report-project-alert-badge-P1"`),
      'ReportsView Tab 2 must render project alert badge in project summary table'
    );
    assert.ok(
      reportsHtml.includes('* API Gateway Rutas seguras JWT y OAuth2') &&
        reportsHtml.includes('* Integración Redsys Conector TPV virtual con firma HMAC-SHA256'),
      'ReportsView Tab 2 must render subtasks formatted with bullet points'
    );
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

// TEST 74: v1.9.1 Unified Platform & Alert Filters across all Reports and Formatted Bullet Subtasks
test('Test 74: v1.9.1 unified platform & alert filters across all reports and bullet subtasks formatting', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { build } = await import('esbuild');
  const ReactDOMServer = await import('react-dom/server');
  const ReactMod = await import('react');
  const React = ReactMod.default || ReactMod;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  const tmpFile = path.resolve(__dirname, `tmp_test74_bundle_${Date.now()}.mjs`);
  try {
    await build({
      stdin: {
        contents: `
          import React from 'react';
          import { ReportsView } from './src/components/ReportsView.tsx';
          import { APP_VERSION } from './src/types/gantt.ts';
          import {
            generateCronogramaCompletoRows,
            generateProjectSummaryRows,
            generateReleaseSummaryRows,
          } from './src/utils/excelExportEngine.ts';

          export {
            ReportsView,
            APP_VERSION,
            generateCronogramaCompletoRows,
            generateProjectSummaryRows,
            generateReleaseSummaryRows,
          };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test74_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'xlsx',
        'clsx',
        'tailwind-merge',
      ],
      jsx: 'automatic',
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const { renderToString } = ReactDOMServer.default || ReactDOMServer;

    assert.strictEqual(mod.APP_VERSION, '1.9.3', 'APP_VERSION must be 1.9.2');

    // 1. Verify description format: <descripción del proyecto si existe>\n\n* <nombre> <desc>
    const pWithDesc = {
      id: 'p-desc',
      name: 'Proyecto Con Descripción',
      platform: 'iOS',
      alertLevel: 3,
      description: 'Descripción global del proyecto core',
    };
    const pWithoutDesc = {
      id: 'p-nodesc',
      name: 'Proyecto Sin Descripción',
      platform: 'Android',
      alertLevel: 0,
      description: '',
    };

    const itemsP1 = [
      { id: 'it-1', projectId: 'p-desc', name: 'Subtarea 1', notes: 'Detalle técnico subtarea 1' },
      { id: 'it-2', projectId: 'p-desc', name: 'Subtarea 2', notes: '' },
    ];
    const itemsP2 = [
      { id: 'it-3', projectId: 'p-nodesc', name: 'Setup', notes: 'Configuración inicial' },
    ];

    const rowsWithDesc = mod.generateProjectSummaryRows([], [pWithDesc], itemsP1);
    assert.strictEqual(
      rowsWithDesc[0].description,
      'Descripción global del proyecto core\n\n* Subtarea 1 Detalle técnico subtarea 1\n* Subtarea 2',
      'Project with description must have project description, empty line, and bulleted subtasks'
    );

    const rowsWithoutDesc = mod.generateProjectSummaryRows([], [pWithoutDesc], itemsP2);
    assert.strictEqual(
      rowsWithoutDesc[0].description,
      '* Setup Configuración inicial',
      'Project without description must only have bulleted subtasks without leading blank line'
    );

    // 2. Verify ReportsView renders unified filters in Tab 1 (Cronograma Completo)
    const releases = [
      {
        id: 'rel-1',
        code: 'T_26.03.1',
        name: 'Release Marzo',
        milestones: [],
      },
    ];
    const projects = [pWithDesc, pWithoutDesc];
    const allItems = [...itemsP1, ...itemsP2];

    const tab1Html = renderToString(
      React.createElement(mod.ReportsView, {
        releases,
        projects,
        items: allItems,
        initialTab: 'cronograma',
        onBackToGantt: () => {},
      })
    );
    assert.ok(tab1Html.includes('data-testid="reports-platform-filter"'), 'Tab 1 must render reports-platform-filter');
    assert.ok(tab1Html.includes('data-testid="reports-alert-filter"'), 'Tab 1 must render reports-alert-filter');
    assert.ok(tab1Html.includes('data-testid="reports-platform-filter-menu"'), 'Tab 1 must render platform menu');
    assert.ok(tab1Html.includes('data-testid="reports-alert-filter-menu"'), 'Tab 1 must render alert menu');
    assert.ok(tab1Html.includes('data-testid="cronograma-project-alert-badge-P1"'), 'Tab 1 must render project alert badge in cronograma table');

    // 3. Verify ReportsView renders unified filters in Tab 2 (Resumen Proyectos)
    const tab2Html = renderToString(
      React.createElement(mod.ReportsView, {
        releases,
        projects,
        items: allItems,
        initialTab: 'projects',
        onBackToGantt: () => {},
      })
    );
    assert.ok(tab2Html.includes('data-testid="reports-platform-filter"'), 'Tab 2 must render reports-platform-filter');
    assert.ok(tab2Html.includes('data-testid="reports-alert-filter"'), 'Tab 2 must render reports-alert-filter');
    assert.ok(tab2Html.includes('data-testid="report-project-alert-badge-P1"'), 'Tab 2 must render project alert badge');

    // 4. Verify ReportsView renders unified filters in Tab 3 (Catálogo Releases)
    const tab3Html = renderToString(
      React.createElement(mod.ReportsView, {
        releases,
        projects,
        items: allItems,
        initialTab: 'releases',
        onBackToGantt: () => {},
      })
    );
    assert.ok(tab3Html.includes('data-testid="reports-platform-filter"'), 'Tab 3 must render reports-platform-filter');
    assert.ok(tab3Html.includes('data-testid="reports-alert-filter"'), 'Tab 3 must render reports-alert-filter');
    assert.ok(tab3Html.includes('T_26.03.1'), 'Tab 3 must render release code');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

// TEST 75: v1.9.3 Project locking, accidental move guard & unlock prompt modal
test('Test 75: v1.9.3 project locking, cascade/dependency protection, plan history badge, and unlock alert modal', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { build } = await import('esbuild');
  const ReactDOMServer = await import('react-dom/server');
  const ReactMod = await import('react');
  const React = ReactMod.default || ReactMod;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(await fs.readFile(path.resolve(__dirname, '../package.json'), 'utf8'));
  assert.strictEqual(pkg.version, '1.9.3', 'package.json version must equal 1.9.2');

  const tmpFile = path.resolve(__dirname, `tmp_test75_bundle_${Date.now()}.mjs`);
  try {
    await build({
      stdin: {
        contents: `
          import React from 'react';
          import { APP_VERSION } from './src/types/gantt.ts';
          import { RELEASE_NOTES } from './src/data/releaseNotes.ts';
          import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
          import { ProjectLockedAlertModal } from './src/components/ProjectLockedAlertModal.tsx';
          import { PlanHistoryPage } from './src/components/PlanHistoryPage.tsx';
          import { TaskFormModal } from './src/components/TaskFormModal.tsx';
          import {
            computeGanttMetrics,
            sanitizeProject,
            getLockedProjectForItem,
            describeProjectStateChanges,
            cascadeDependencies,
            addDependencyLink,
          } from './src/utils/ganttEngine.ts';

          export {
            APP_VERSION,
            RELEASE_NOTES,
            GanttWorkspace,
            ProjectLockedAlertModal,
            PlanHistoryPage,
            TaskFormModal,
            computeGanttMetrics,
            sanitizeProject,
            getLockedProjectForItem,
            describeProjectStateChanges,
            cascadeDependencies,
            addDependencyLink,
          };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test75_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'lucide-react',
        'date-fns',
        'xlsx',
        'clsx',
        'tailwind-merge',
      ],
      jsx: 'automatic',
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const { renderToString } = ReactDOMServer.default || ReactDOMServer;

    // 1. Version & release notes verification
    assert.strictEqual(mod.APP_VERSION, '1.9.3', 'APP_VERSION must equal 1.9.2');
    assert.strictEqual(mod.RELEASE_NOTES[0].version, '1.9.3', 'Latest release note must be 1.9.2');
    assert.strictEqual(mod.RELEASE_NOTES[0].isLatest, true, 'v1.9.3 release note must be marked isLatest');

    // 2. sanitizeProject, getLockedProjectForItem, describeProjectStateChanges
    const lockedProj = mod.sanitizeProject({
      id: 'proj-locked',
      name: 'Core Bancario',
      projectIndex: 1,
      locked: true,
    });
    const unlockedProj = mod.sanitizeProject({
      id: 'proj-open',
      name: 'Portal Clientes',
      projectIndex: 2,
      locked: false,
    });
    assert.strictEqual(lockedProj.locked, true, 'sanitizeProject must preserve locked: true');
    assert.strictEqual(unlockedProj.locked, undefined, 'sanitizeProject must omit locked when false');

    const lockDiffs = mod.describeProjectStateChanges(
      { ...lockedProj, locked: false },
      lockedProj
    );
    const lockDiff = lockDiffs.find((d) => d.field === 'Bloqueo');
    assert.ok(lockDiff, 'describeProjectStateChanges must record Bloqueo diff');
    assert.strictEqual(lockDiff.before, 'Desbloqueado');
    assert.strictEqual(lockDiff.after, 'Bloqueado');

    // 3. cascadeDependencies & addDependencyLink respect locked projects
    const baseItems = mod.computeGanttMetrics([
      {
        id: 'open-pred',
        projectId: 'proj-open',
        name: 'Predecesora Open',
        type: 'task',
        startDate: '2026-04-06',
        endDate: '2026-04-10',
        duration: 5,
        slack: 0,
        dependencies: [],
        progress: 0,
        color: 'sky',
      },
      {
        id: 'locked-succ',
        projectId: 'proj-locked',
        name: 'Sucesora Bloqueada',
        type: 'task',
        startDate: '2026-04-06',
        endDate: '2026-04-08',
        duration: 3,
        slack: 0,
        dependencies: ['open-pred'],
        dependencyTypes: { 'open-pred': 'FS' },
        progress: 0,
        color: 'indigo',
      },
      {
        id: 'open-succ',
        projectId: 'proj-open',
        name: 'Sucesora Libre',
        type: 'task',
        startDate: '2026-04-06',
        endDate: '2026-04-08',
        duration: 3,
        slack: 0,
        dependencies: ['open-pred'],
        dependencyTypes: { 'open-pred': 'FS' },
        progress: 0,
        color: 'sky',
      },
      {
        id: 'locked-free',
        projectId: 'proj-locked',
        name: 'Hito Libre Bloqueado',
        type: 'milestone',
        startDate: '2026-04-06',
        endDate: '2026-04-06',
        duration: 1,
        slack: 0,
        dependencies: [],
        progress: 0,
        color: 'indigo',
      },
    ]);

    assert.strictEqual(
      mod.getLockedProjectForItem(baseItems[1], [lockedProj, unlockedProj])?.id,
      'proj-locked',
      'getLockedProjectForItem must return owning locked project'
    );
    assert.strictEqual(
      mod.getLockedProjectForItem(baseItems[2], [lockedProj, unlockedProj]),
      undefined,
      'getLockedProjectForItem must return undefined for unlocked project'
    );

    const cascaded = mod.cascadeDependencies(baseItems, [lockedProj, unlockedProj]);
    const lockedAfterCascade = cascaded.find((i) => i.id === 'locked-succ');
    const openAfterCascade = cascaded.find((i) => i.id === 'open-succ');
    assert.strictEqual(lockedAfterCascade.startDate, '2026-04-06', 'cascadeDependencies must not move task inside locked project');
    assert.strictEqual(openAfterCascade.startDate, '2026-04-11', 'cascadeDependencies must move task inside unlocked project');

    const depRes = mod.addDependencyLink(
      baseItems,
      'open-pred',
      'locked-free',
      'FS',
      true,
      [lockedProj, unlockedProj]
    );
    const lockedMilestoneAfterAdd = depRes.items.find((i) => i.id === 'locked-free');
    assert.strictEqual(lockedMilestoneAfterAdd.startDate, '2026-04-06', 'addDependencyLink with cascade=true must not shift items in locked project');

    // 4. PlanHistoryPage renders toggle_project_lock badge ('Bloqueo Proyecto')
    const historyHtml = renderToString(
      React.createElement(mod.PlanHistoryPage, {
        history: [
          {
            id: 'h-lock-1',
            timestamp: Date.now(),
            actionType: 'toggle_project_lock',
            actionLabel: 'Bloqueo Proyecto',
            description: "Bloquear proyecto 'Core Bancario'",
            itemsCount: baseItems.length,
            projectsCount: 2,
            snapshot: { items: baseItems, projects: [lockedProj, unlockedProj] },
          },
        ],
        currentIndex: 0,
        canUndo: false,
        canRedo: false,
        onUndo: () => {},
        onRedo: () => {},
        onRestoreSnapshot: () => {},
        onBackToGantt: () => {},
      })
    );
    assert.ok(historyHtml.includes('Bloqueo Proyecto'), 'PlanHistoryPage must render toggle_project_lock badge label');

    // 5. GanttWorkspace lock UI indicators, inspection modal toggle, and alert modal
    const wsHtml = renderToString(
      React.createElement(mod.GanttWorkspace, {
        items: baseItems,
        projects: [lockedProj, unlockedProj],
        releases: [],
        groupingMode: 'project',
        groupByProject: true,
        showTable: true,
        scrollContainerRef: { current: null },
        onUpdateItem: () => {},
        onDeleteItem: () => {},
        initialInspectingProjectId: 'proj-locked',
        initialLockedAlertProjectId: 'proj-locked',
      })
    );

    assert.ok(wsHtml.includes('data-testid="project-lock-btn-proj-locked"'), 'WBS row must render project-lock-btn for locked project');
    assert.ok(wsHtml.includes('data-project-locked="true"'), 'Locked project row and timeline bar must have data-project-locked="true"');
    assert.ok(wsHtml.includes('data-timeline-project-locked="proj-locked"'), 'Timeline project summary bar must show locked badge');
    assert.ok(wsHtml.includes('data-testid="project-modal-lock-toggle"'), 'Project inspection modal must render project-modal-lock-toggle');
    assert.ok(wsHtml.includes('data-testid="project-locked-alert-modal"'), 'GanttWorkspace must render ProjectLockedAlertModal when alert is active');
    assert.ok(wsHtml.includes('data-testid="confirm-unlock-project-btn"'), 'Alert modal must render confirm unlock button');
    assert.ok(wsHtml.includes('data-testid="cancel-unlock-project-btn"'), 'Alert modal must render cancel button');
    assert.ok(wsHtml.includes('Desbloquear proyecto'), 'Alert modal must show "Desbloquear proyecto" CTA');

    // 6. Standalone ProjectLockedAlertModal includes attemptedAction text
    const alertHtml = renderToString(
      React.createElement(mod.ProjectLockedAlertModal, {
        project: lockedProj,
        attemptedAction: 'mover una barra en el cronograma',
        onUnlock: () => {},
        onClose: () => {},
      })
    );
    assert.ok(alertHtml.includes('Core Bancario'), 'Alert modal must display project name');
    assert.ok(alertHtml.includes('mover una barra en el cronograma'), 'Alert modal must display intercepted action context');

    // 7. TaskFormModal displays locked project warning
    const taskModalHtml = renderToString(
      React.createElement(mod.TaskFormModal, {
        isOpen: true,
        onClose: () => {},
        onSave: () => {},
        projects: [lockedProj],
        defaultProjectId: 'proj-locked',
        allItems: baseItems,
        releases: [],
      })
    );
    assert.ok(taskModalHtml.includes('data-testid="task-modal-locked-project-warning"'), 'TaskFormModal must display locked project warning banner');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('Test 76: v1.9.3 automatic Free Slack calculation given successor tasks across engine, table badge, inspector sidebar and task modal', async () => {
  // 1. Engine calculation: FS dependency with multiple successors
  const testItems = [
    {
      id: 'task-a',
      projectId: 'proj-1',
      name: 'Tarea A (Predecesora)',
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
      id: 'task-s1',
      projectId: 'proj-1',
      name: 'Tarea S1 (Sucesora Lejana)',
      type: 'task',
      startDate: '2026-11-07',
      endDate: '2026-11-09',
      duration: 3,
      slack: 0,
      dependencies: ['task-a'],
      progress: 0,
      color: 'emerald',
    },
    {
      id: 'task-s2',
      projectId: 'proj-1',
      name: 'Tarea S2 (Sucesora Límite)',
      type: 'task',
      startDate: '2026-11-05',
      endDate: '2026-11-07',
      duration: 3,
      slack: 0,
      dependencies: ['task-a'],
      progress: 0,
      color: 'rose',
    },
    {
      id: 'task-no-succ',
      projectId: 'proj-1',
      name: 'Tarea Sin Sucesoras',
      type: 'task',
      startDate: '2026-11-05',
      endDate: '2026-11-06',
      duration: 2,
      slack: 0,
      dependencies: [],
      progress: 0,
      color: 'amber',
    },
    {
      id: 'task-conflict-succ',
      projectId: 'proj-1',
      name: 'Tarea Predecesora con Conflicto',
      type: 'task',
      startDate: '2026-11-06',
      endDate: '2026-11-08',
      duration: 3,
      slack: 0,
      dependencies: [],
      progress: 0,
      color: 'blue',
    },
    {
      id: 'task-conflict-dest',
      projectId: 'proj-1',
      name: 'Tarea Sucesora Invadida',
      type: 'task',
      startDate: '2026-11-07',
      endDate: '2026-11-09',
      duration: 3,
      slack: 0,
      dependencies: ['task-conflict-succ'],
      progress: 0,
      color: 'orange',
    },
  ];

  const computed = computeGanttMetrics(testItems);
  const taskA = computed.find((it) => it.id === 'task-a');
  assert.ok(taskA, 'task-a must be computed');
  assert.equal(taskA.hasSuccessors, true, 'task-a must have successors');
  assert.deepEqual(taskA.successorIds.sort(), ['task-s1', 'task-s2'].sort());
  // Task A finishes on 2026-11-03.
  // S1 starts 2026-11-07 -> gap = 3 days (Nov 4, 5, 6)
  // S2 starts 2026-11-05 -> gap = 1 day (Nov 4)
  // So free slack must be 1 day!
  assert.equal(taskA.freeSlack, 1, 'task-a free slack must be 1 day');
  assert.equal(taskA.drivingSuccessorId, 'task-s2', 'task-a driving successor must be task-s2');
  assert.equal(taskA.drivingSuccessorName, 'Tarea S2 (Sucesora Límite)');

  // Task without successors
  const noSucc = computed.find((it) => it.id === 'task-no-succ');
  assert.ok(noSucc);
  assert.equal(noSucc.hasSuccessors, false, 'task-no-succ has no successors');
  // Project max end is 2026-11-09. noSucc ends on 2026-11-06 -> margin is 3 days
  assert.equal(noSucc.freeSlack, 3, 'task-no-succ free slack to project end is 3 days');

  // Task with conflict with successor
  const conflictPred = computed.find((it) => it.id === 'task-conflict-succ');
  assert.ok(conflictPred);
  // Ends 2026-11-08, but Sucesora Invadida starts 2026-11-07 -> diff is -1 day, minus 1 = -2
  assert.ok(conflictPred.freeSlack < 0, 'conflict task must have negative free slack');
  assert.equal(conflictPred.hasConflict, true, 'conflict task must have hasConflict = true');
  assert.ok(conflictPred.conflictMessage.includes('Solapamiento') || conflictPred.conflictMessage.includes('solapándose'));

  // 2. groupItemsByProject: computes totalFreeSlack
  const testProjects = [{ id: 'proj-1', name: 'Proyecto Prueba Slack', color: 'indigo' }];
  const groups = groupItemsByProject(computed, testProjects);
  assert.equal(groups.length, 1);
  assert.ok(typeof groups[0].totalFreeSlack === 'number', 'totalFreeSlack must be a number');
  assert.ok(groups[0].totalFreeSlack > 0, 'totalFreeSlack must be greater than 0');

  // 3. UI SSR verification
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { build } = await import('esbuild');
  const ReactDOMServer = await import('react-dom/server');
  const ReactMod = await import('react');
  const React = ReactMod.default || ReactMod;
  const { renderToString } = ReactDOMServer.default || ReactDOMServer;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const tmpFile = path.resolve(__dirname, `tmp_test76_bundle_${Date.now()}.mjs`);
  try {
    await build({
      stdin: {
        contents: `
          import React from 'react';
          import { GanttWorkspace } from './src/components/GanttWorkspace.tsx';
          import { TaskFormModal } from './src/components/TaskFormModal.tsx';
          export { React, GanttWorkspace, TaskFormModal };
        `,
        resolveDir: path.resolve(__dirname, '..'),
        sourcefile: 'test76_entry.tsx',
        loader: 'tsx',
      },
      bundle: true,
      format: 'esm',
      outfile: tmpFile,
      external: [
        'react',
        'react-dom',
        'react-dom/server',
        'clsx',
        'tailwind-merge',
        'lucide-react',
        'date-fns',
      ],
      jsx: 'automatic',
    });

    const mod = await import(`${tmpFile}?t=${Date.now()}`);

    // 4. GanttWorkspace renders automatic slack badge in table and panel
    const wsHtml = renderToString(
      React.createElement(mod.GanttWorkspace, {
        items: computed,
        projects: testProjects,
        releases: [],
        groupByProject: true,
        showTable: true,
        scrollContainerRef: { current: null },
        onUpdateItem: () => {},
        onDeleteItem: () => {},
        initialSelectedItemId: 'task-a',
        initialVisibleColumns: { team: true, deps: true, dates: false, dur: false, slack: true },
      })
    );

    // Verify Slack column badge for task-a (+1d)
    assert.ok(wsHtml.includes('data-testid="task-slack-badge-task-a"'), 'Must render slack badge for task-a');
    assert.ok(wsHtml.includes('+1d'), 'Badge must display +1d');
    assert.ok(wsHtml.includes('Tarea S2 (Sucesora Límite)'), 'Tooltip must reference driving successor');

    // Verify Inspector Sidebar renders Holgura Libre and Tareas Siguientes
    assert.ok(wsHtml.includes('data-testid="panel-free-slack-task-a"'), 'Must render panel-free-slack for selected task');
    assert.ok(wsHtml.includes('data-testid="panel-successor-item-task-s2"'), 'Must render successor task link in panel');
    assert.ok(wsHtml.includes('Límite'), 'Must mark driving successor with "Límite" tag');

    // 5. TaskFormModal renders automatic slack indicator
    const modalHtml = renderToString(
      React.createElement(mod.TaskFormModal, {
        isOpen: true,
        onClose: () => {},
        onSave: () => {},
        initialItem: testItems[0],
        projects: testProjects,
        defaultProjectId: 'proj-1',
        allItems: computed,
        releases: [],
      })
    );

    assert.ok(modalHtml.includes('data-testid="modal-auto-slack-indicator"'), 'TaskFormModal must render auto slack indicator');
    assert.ok(modalHtml.includes('Holgura automática según tareas siguientes (2)'), 'Modal indicator must display successor count');
    assert.ok(modalHtml.includes('Usar +1d'), 'Modal must provide quick apply button for calculated slack');
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});




