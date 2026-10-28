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
  getXcode27Scenario,
  getDefaultSavedScenarios,
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
    // Verify hierarchical WBS codes appear in the Dependencies column (#1.2,#2.1 for m-1, #1.3 for t-4)
    assert.ok(html.includes('#1.2,#2.1'));
    assert.ok(html.includes('#1.3'));

    // Verify collapsed project group hides child task rows while preserving project summary bar and cross-project SVG dependency arrows
    const collapsedHtml = renderToString(createCollapsedWorkspaceElement());
    assert.ok(collapsedHtml.includes('data-project-group="proj-discovery"'));
    assert.ok(collapsedHtml.includes('data-project-summary-bar="proj-discovery"'));
    assert.equal(collapsedHtml.includes('Investigación de Usuarios &amp; Alcance Técnico'), false);
    assert.ok(collapsedHtml.includes('Desarrollo Motor Gantt Interactivo (Frontend)'));
    assert.ok(collapsedHtml.includes('url(#arrow-critical)'));
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});

test('getXcode27Scenario defines 1 project with all 7 tasks (actions), teams, and exact deadlines conflict-free', () => {
  const xcode = getXcode27Scenario();
  assert.equal(xcode.id, 'scen-xcode27');
  assert.equal(xcode.projects.length, 1);
  assert.equal(xcode.projects[0].id, 'proj-xcode27');
  assert.equal(xcode.items.length, 7);

  // Every action is configured as a task ('task') in the single project
  for (const item of xcode.items) {
    assert.equal(item.type, 'task');
    assert.equal(item.projectId, 'proj-xcode27');
  }

  // Verify exact task names, assignees (Equipo), and endDates (Deadline)
  const expected = [
    {
      name: 'SDK ARQ, + biocatch, onetrust, RSA actualizados',
      assignee: 'Arquitectura',
      endDate: '2026-11-27',
    },
    {
      name: 'Nuevas Maquinas Mac operativas (apple silicon)',
      assignee: 'AWS/Devops',
      endDate: '2026-12-02',
    },
    {
      name: 'Generación build',
      assignee: 'RM Canales',
      endDate: '2026-12-02',
    },
    {
      name: 'QA termina las pruebas',
      assignee: 'QA',
      endDate: '2027-01-07',
    },
    {
      name: 'Fixing',
      assignee: 'Desarrollo',
      endDate: '2027-01-15',
    },
    {
      name: 'QG5 27.2',
      assignee: 'RM',
      endDate: '2027-01-15',
    },
    {
      name: 'Deadline Xcode27',
      assignee: 'Apple',
      endDate: '2027-04-15',
    },
  ];

  assert.deepEqual(
    xcode.items.map((it) => ({
      name: it.name,
      assignee: it.assignee,
      endDate: it.endDate,
    })),
    expected
  );

  // Verify zero dependency conflicts and valid rollup group
  const computed = computeGanttMetrics(xcode.items);
  for (const c of computed) {
    assert.equal(c.hasConflict, false, `Task ${c.name} should have no conflict`);
  }
  const groups = groupItemsByProject(computed, xcode.projects);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].items.length, 7);
  assert.equal(groups[0].endDate, '2027-04-15');
});

test('Scenario manager saves custom scenario, switches to a template, and returns to the saved scenario without data loss', () => {
  const initialScenarios = getDefaultSavedScenarios();
  assert.ok(initialScenarios.length >= 2);

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

  // 4. Switch to Xcode 27 scenario and verify all 7 tasks are intact
  const switchedToXcode = switchWorkspaceToScenario(
    restored,
    restored.savedScenarios,
    'scen-xcode27'
  );
  assert.equal(switchedToXcode.activeScenarioId, 'scen-xcode27');
  assert.equal(switchedToXcode.projects.length, 1);
  assert.equal(switchedToXcode.items.length, 7);
});

test('App renders Xcode 27 scenario and Saved Scenarios bar in SSR', async () => {
  const { renderToString } = await import('react-dom/server');
  const appBundle = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { App } from './src/App.tsx';
        export function createXcodeApp() {
          return <App initialScenarioId="scen-xcode27" />;
        }
      `,
      resolveDir: path.resolve(__dirname, '..'),
      sourcefile: 'ssr-xcode-test.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['react', 'react-dom'],
    write: false,
  });

  const fs = await import('node:fs/promises');
  const tmpFile = path.resolve(__dirname, './.tmp-ssr-xcode.cjs');
  await fs.writeFile(tmpFile, appBundle.outputFiles[0].text, 'utf8');
  try {
    const mod = await import(`${tmpFile}?t=${Date.now()}`);
    const createXcodeApp = mod.createXcodeApp || mod.default?.createXcodeApp;
    const html = renderToString(createXcodeApp());

    assert.ok(html.includes('Plan Xcode 27 &amp; QG5 27.2'));
    assert.ok(html.includes('data-scenarios-bar="true"'));
    assert.ok(html.includes('data-scenario-pill="scen-xcode27"'));
    assert.ok(html.includes('data-scenario-pill="scen-saas-v2"'));
    assert.ok(html.includes('SDK ARQ, + biocatch, onetrust, RSA actualizados'));
    assert.ok(html.includes('Nuevas Maquinas Mac operativas (apple silicon)'));
    assert.ok(html.includes('Generación build'));
    assert.ok(html.includes('QA termina las pruebas'));
    assert.ok(html.includes('Fixing'));
    assert.ok(html.includes('QG5 27.2'));
    assert.ok(html.includes('Deadline Xcode27'));
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
});




