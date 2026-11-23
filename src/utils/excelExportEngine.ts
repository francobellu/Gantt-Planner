import * as XLSX from 'xlsx';
import {
  ComputedGanttItem,
  GanttProject,
  Release,
} from '../types/gantt';
import { checkTaskReleaseCompliance, getReleaseDateSpan } from './releaseEngine';
import { groupItemsByProject, groupItemsByReleaseAndProject, normalizePlatform } from './ganttEngine';

export interface CronogramaReportRow {
  rowId: string;
  itemId?: string;
  level: 'RELEASE' | 'PROYECTO' | 'TAREA' | 'HITO';
  hierarchyLabel: string;
  displayId: string;
  wbsCode: string;
  name: string;
  releaseCode: string;
  releaseId?: string;
  projectName: string;
  projectId?: string;
  platform: string;
  team: string;
  alertLevel?: number;
  type: string;
  startDate: string;
  endDate: string;
  duration: number;
  slack: number;
  progress: string;
  dependency: string;
  dependencyPredecessorName?: string;
  isCritical: boolean;
  isExternal: boolean;
  compliance: string;
  notes: string;
  isDepRow?: boolean;
}

export interface ProjectSummaryReportRow {
  projectId?: string;
  code: string;
  projectName: string;
  platform: string;
  team: string;
  alertLevel: number;
  alertLevelLabel: string;
  releaseCode: string;
  startDate: string;
  endDate: string;
  duration: number;
  progress: number;
  tasksCount: number;
  milestonesCount: number;
  description: string;
}

export interface ReleaseSummaryReportRow {
  code: string;
  name: string;
  month: string;
  startDate: string;
  endDate: string;
  duration: number;
  assignedProjects: string;
  keyMilestones: string;
  releaseId?: string;
  projectIds?: string[];
  platforms?: string[];
  alertLevels?: number[];
}

export const CRONOGRAMA_HEADER = [
  'Jerarquía',
  'Código WBS',
  'Nombre',
  'Release Asignada',
  'Proyecto',
  'Plataforma',
  'Equipo',
  'Nivel de Alerta',
  'Tipo',
  'Fecha Inicio',
  'Fecha Fin',
  'Duración (Días)',
  'Holgura / Slack (Días)',
  'Progreso (%)',
  'Dependencia (Predecesora)',
  'Ruta Crítica',
  'Hito Externo',
  'Cumplimiento Release',
  'Notas / Descripción',
];

export const PROJECT_SUMMARY_HEADER = [
  'Código',
  'Proyecto',
  'Plataforma',
  'Equipo',
  'Nivel de Alerta',
  'Release Asignada',
  'Fecha Inicio',
  'Fecha Fin',
  'Duración (Días)',
  'Progreso (%)',
  'Total Tareas',
  'Total Hitos',
  'Descripción',
];

export const RELEASE_SUMMARY_HEADER = [
  'Código',
  'Nombre',
  'Mes',
  'Fecha Inicio',
  'Fecha Fin',
  'Duración (Días)',
  'Proyectos Asignados',
  'Hitos Clave',
];

/**
 * Resolves a dependency ID to the predecessor element's human-readable name,
 * replacing raw code identifiers with descriptive element names.
 */
export function resolveDependencyName(
  depId: string,
  allItems: ComputedGanttItem[],
  item: ComputedGanttItem
): string {
  const target = allItems.find(
    (it) => it.id === depId || String(it.wbs ?? '') === depId
  );
  const depType = item.dependencyTypes?.[depId] || 'FS';
  if (target) {
    return `${target.name} (${depType})`;
  }
  return `${depId} (${depType})`;
}

export function collectProjectTeams(items: ComputedGanttItem[]): string {
  const uniqueTeams = Array.from(
    new Set(items.map((it) => (it.assignee ? it.assignee.trim() : '')).filter(Boolean))
  );
  return uniqueTeams.length > 0 ? uniqueTeams.join(', ') : '—';
}

/**
 * Generates structured rows for the full hierarchical schedule (Sheet 1).
 * Each task/item produces exactly 1 row. When an element has multiple dependencies,
 * they are grouped in the dependency cell displaying predecessor names.
 */
export function generateCronogramaCompletoRows(
  releases: Release[],
  projects: GanttProject[],
  items: ComputedGanttItem[]
): CronogramaReportRow[] {
  const rows: CronogramaReportRow[] = [];

  if (releases && releases.length > 0) {
    const releaseGroups = groupItemsByReleaseAndProject(items, projects, releases);

    for (const rg of releaseGroups) {
      // Release Row
      rows.push({
        rowId: `rel-${rg.release.id}`,
        level: 'RELEASE',
        hierarchyLabel: 'RELEASE',
        displayId: rg.release.code,
        wbsCode: rg.release.code,
        name: rg.release.name,
        releaseCode: rg.release.code,
        releaseId: rg.release.id,
        projectName: '—',
        platform: '—',
        team: '—',
        alertLevel: undefined,
        type: 'Release',
        startDate: rg.startDate,
        endDate: rg.endDate,
        duration: rg.duration,
        slack: 0,
        progress: `${rg.progress}%`,
        dependency: '—',
        dependencyPredecessorName: '—',
        isCritical: false,
        isExternal: false,
        compliance: 'Conforme',
        notes: '—',
      });

      for (const pg of rg.projectGroups) {
        const platformLabel = normalizePlatform(pg.project.platform) || 'iOS/Android';
        // Project Row
        rows.push({
          rowId: `proj-${pg.project.id}`,
          level: 'PROYECTO',
          hierarchyLabel: '  └─ PROYECTO',
          displayId: `P${pg.projectIndex}`,
          wbsCode: `P${pg.projectIndex}`,
          name: pg.project.name,
          releaseCode: rg.release.code,
          releaseId: rg.release.id,
          projectName: pg.project.name,
          projectId: pg.project.id,
          platform: platformLabel,
          team: collectProjectTeams(pg.items),
          alertLevel: pg.project.alertLevel ?? 0,
          type: 'Proyecto',
          startDate: pg.startDate,
          endDate: pg.endDate,
          duration: pg.duration,
          slack: 0,
          progress: `${pg.progress}%`,
          dependency: '—',
          dependencyPredecessorName: '—',
          isCritical: false,
          isExternal: false,
          compliance: 'Conforme',
          notes: pg.project.description?.trim() || '—',
        });

        for (const item of pg.items) {
          const isMilestone = item.type === 'milestone';
          const typeLabel = isMilestone ? 'Hito' : 'Tarea';
          const levelLabel = isMilestone ? '      └─ HITO' : '      └─ TAREA';
          const wbsCode = String(item.wbs ?? item.id);
          const isCritical = Boolean(item.isCritical);
          const isExternal = Boolean(item.isExternal);

          const effectiveRel = item.releaseId
            ? releases.find((r) => r.id === item.releaseId) || rg.release
            : rg.release;
          const effectiveReleaseCode = effectiveRel?.code || rg.release.code;
          const effectiveReleaseId = effectiveRel?.id || rg.release.id;

          const violations = checkTaskReleaseCompliance(item, pg.project, effectiveRel);
          const complianceLabel =
            violations.length === 0
              ? 'Conforme'
              : `Alerta: ${violations[0].milestoneCode} (+${violations[0].daysLate}d)`;

          const deps = item.dependencies || [];
          const depNames = deps.map((depId) => resolveDependencyName(depId, items, item));
          const depTargetNames = deps.map((depId) => {
            const targetItem = items.find(
              (it) => it.id === depId || String(it.wbs ?? '') === depId
            );
            return targetItem ? targetItem.name : depId;
          });

          rows.push({
            rowId: `${item.id}-0`,
            itemId: item.id,
            level: isMilestone ? 'HITO' : 'TAREA',
            hierarchyLabel: levelLabel,
            displayId: item.displayId || (item.projectId ? `P${pg.projectIndex}T${item.taskIndex || item.wbs}` : `T${item.taskIndex || item.wbs}`),
            wbsCode,
            name: item.name,
            releaseCode: effectiveReleaseCode,
            releaseId: effectiveReleaseId,
            projectName: pg.project.name,
            projectId: pg.project.id,
            platform: normalizePlatform(item.platform) || platformLabel,
            team: item.assignee?.trim() || '—',
            alertLevel: item.alertLevel ?? pg.project.alertLevel ?? 0,
            type: typeLabel,
            startDate: item.startDate,
            endDate: item.endDate,
            duration: item.duration,
            slack: item.slack || 0,
            progress: `${item.progress || 0}%`,
            dependency: depNames.length > 0 ? depNames.join(', ') : '—',
            dependencyPredecessorName: depTargetNames.length > 0 ? depTargetNames.join(', ') : '—',
            isCritical,
            isExternal,
            compliance: complianceLabel,
            notes: item.notes?.trim() || '—',
            isDepRow: false,
          });
        }
      }
    }
  } else {
    // Fallback: group by projects only
    const projectGroups = groupItemsByProject(items, projects);
    for (const pg of projectGroups) {
      const platformLabel = normalizePlatform(pg.project.platform) || 'iOS/Android';
      rows.push({
        rowId: `proj-${pg.project.id}`,
        level: 'PROYECTO',
        hierarchyLabel: 'PROYECTO',
        displayId: `P${pg.projectIndex}`,
        wbsCode: `P${pg.projectIndex}`,
        name: pg.project.name,
        releaseCode: '—',
        projectName: pg.project.name,
        projectId: pg.project.id,
        platform: platformLabel,
        team: collectProjectTeams(pg.items),
        alertLevel: pg.project.alertLevel ?? 0,
        type: 'Proyecto',
        startDate: pg.startDate,
        endDate: pg.endDate,
        duration: pg.duration,
        slack: 0,
        progress: `${pg.progress}%`,
        dependency: '—',
        dependencyPredecessorName: '—',
        isCritical: false,
        isExternal: false,
        compliance: 'Conforme',
        notes: pg.project.description?.trim() || '—',
      });

      for (const item of pg.items) {
        const isMilestone = item.type === 'milestone';
        const typeLabel = isMilestone ? 'Hito' : 'Tarea';
        const levelLabel = isMilestone ? '  └─ HITO' : '  └─ TAREA';
        const wbsCode = String(item.wbs ?? item.id);
        const isCritical = Boolean(item.isCritical);
        const isExternal = Boolean(item.isExternal);

        const deps = item.dependencies || [];
        const depNames = deps.map((depId) => resolveDependencyName(depId, items, item));
        const depTargetNames = deps.map((depId) => {
          const targetItem = items.find(
            (it) => it.id === depId || String(it.wbs ?? '') === depId
          );
          return targetItem ? targetItem.name : depId;
        });

        rows.push({
          rowId: `${item.id}-0`,
          itemId: item.id,
          level: isMilestone ? 'HITO' : 'TAREA',
          hierarchyLabel: levelLabel,
          displayId: item.displayId || (item.projectId ? `P${pg.projectIndex}T${item.taskIndex || item.wbs}` : `T${item.taskIndex || item.wbs}`),
          wbsCode,
          name: item.name,
          releaseCode: '—',
          projectName: pg.project.name,
          projectId: pg.project.id,
          platform: normalizePlatform(item.platform) || platformLabel,
          team: item.assignee?.trim() || '—',
          alertLevel: item.alertLevel ?? pg.project.alertLevel ?? 0,
          type: typeLabel,
          startDate: item.startDate,
          endDate: item.endDate,
          duration: item.duration,
          slack:
            item.slack > 0
              ? item.slack
              : typeof (item as any).freeSlack === 'number'
              ? (item as any).freeSlack
              : item.slack || 0,
          progress: `${item.progress || 0}%`,
          dependency: depNames.length > 0 ? depNames.join(', ') : '—',
          dependencyPredecessorName: depTargetNames.length > 0 ? depTargetNames.join(', ') : '—',
          isCritical,
          isExternal,
          compliance: 'Conforme',
          notes: item.notes?.trim() || '—',
          isDepRow: false,
        });
      }
    }
  }

  return rows;
}

/**
 * Generates project summary report rows (Sheet 2).
 */
export function generateProjectSummaryRows(
  releases: Release[],
  projects: GanttProject[],
  items: ComputedGanttItem[]
): ProjectSummaryReportRow[] {
  const pGroups = groupItemsByProject(items, projects);
  const rows: ProjectSummaryReportRow[] = [];

  for (const pg of pGroups) {
    const assignedRelease = releases.find((r) => r.id === pg.project.releaseId);
    const taskCount = pg.items.filter((it) => it.type !== 'milestone').length;
    const milestoneCount = pg.items.filter((it) => it.type === 'milestone').length;
    const alertLevel = pg.project.alertLevel ?? 0;

    const projDesc = (pg.project.description || '').trim();
    const taskLines: string[] = [];
    for (const it of pg.items) {
      const itDesc = (it.notes || (it as any).description || '').trim().replace(/\r?\n+/g, ' ');
      if (itDesc) {
        taskLines.push(`* ${it.name} ${itDesc}`);
      } else {
        taskLines.push(`* ${it.name}`);
      }
    }

    let description = '';
    if (projDesc && taskLines.length > 0) {
      description = `${projDesc}\n\n${taskLines.join('\n')}`;
    } else if (projDesc) {
      description = projDesc;
    } else if (taskLines.length > 0) {
      description = taskLines.join('\n');
    }

    rows.push({
      projectId: pg.project.id,
      code: `P${pg.projectIndex}`,
      projectName: pg.project.name,
      platform: normalizePlatform(pg.project.platform) || 'iOS/Android',
      team: collectProjectTeams(pg.items),
      alertLevel,
      alertLevelLabel: `Nivel ${alertLevel}`,
      releaseCode: assignedRelease ? assignedRelease.code : 'Sin asignar',
      startDate: pg.startDate,
      endDate: pg.endDate,
      duration: pg.duration,
      progress: pg.progress,
      tasksCount: taskCount,
      milestonesCount: milestoneCount,
      description,
    });
  }

  return rows;
}

/**
 * Generates releases catalog report rows (Sheet 3).
 */
export function generateReleaseSummaryRows(
  releases: Release[],
  projects: GanttProject[]
): ReleaseSummaryReportRow[] {
  const rows: ReleaseSummaryReportRow[] = [];

  for (const rel of releases) {
    const relProjects = projects.filter((p) => p.releaseId === rel.id);
    const assignedProjs = relProjects
      .map((p) => p.name)
      .join(', ');
    const keyMilestones = rel.milestones
      .map((m) => `${m.code} (${m.date})`)
      .join('; ');

    const span = getReleaseDateSpan(rel);
    rows.push({
      code: rel.code,
      name: rel.name,
      month: rel.month || '—',
      startDate: span.startDate,
      endDate: span.endDate,
      duration: span.duration || 0,
      assignedProjects: assignedProjs || 'Ninguno',
      keyMilestones: keyMilestones || 'Sin hitos',
      releaseId: rel.id,
      projectIds: relProjects.map((p) => p.id),
      platforms: relProjects.map((p) => normalizePlatform(p.platform) || 'iOS/Android'),
      alertLevels: relProjects.map((p) => p.alertLevel ?? 0),
    });
  }

  return rows;
}

/**
 * Builds a comprehensive, well-structured Excel workbook presenting releases,
 * projects, and tasks in a clean, easily readable hierarchy.
 */
export function exportFullGanttToWorkbook(
  releases: Release[],
  projects: GanttProject[],
  items: ComputedGanttItem[]
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. SHEET 1: Cronograma Completo
  const cronoRows = generateCronogramaCompletoRows(releases, projects, items);
  const cronoAoa: (string | number)[][] = [
    CRONOGRAMA_HEADER,
    ...cronoRows.map((r) => [
      r.hierarchyLabel,
      r.wbsCode,
      r.name,
      r.releaseCode,
      r.projectName,
      r.platform,
      r.team,
      r.alertLevel !== undefined ? `Nivel ${r.alertLevel}` : '—',
      r.type,
      r.startDate,
      r.endDate,
      r.duration,
      r.slack,
      r.progress,
      r.dependency,
      r.isCritical ? 'SÍ' : 'NO',
      r.isExternal ? 'SÍ' : 'NO',
      r.compliance,
      r.notes,
    ]),
  ];
  const wsHierarchy = XLSX.utils.aoa_to_sheet(cronoAoa);
  wsHierarchy['!cols'] = [
    { wch: 18 }, // Jerarquía
    { wch: 14 }, // Código WBS
    { wch: 38 }, // Nombre
    { wch: 16 }, // Release Asignada
    { wch: 28 }, // Proyecto
    { wch: 18 }, // Plataforma
    { wch: 18 }, // Equipo
    { wch: 14 }, // Nivel de Alerta
    { wch: 12 }, // Tipo
    { wch: 14 }, // Fecha Inicio
    { wch: 14 }, // Fecha Fin
    { wch: 14 }, // Duración
    { wch: 18 }, // Holgura
    { wch: 14 }, // Progreso
    { wch: 36 }, // Dependencia (Predecesora)
    { wch: 12 }, // Ruta Crítica
    { wch: 12 }, // Hito Externo
    { wch: 30 }, // Cumplimiento Release
    { wch: 42 }, // Notas / Descripción
  ];
  XLSX.utils.book_append_sheet(wb, wsHierarchy, 'Cronograma Completo');

  // 2. SHEET 2: Resumen Proyectos
  const projRows = generateProjectSummaryRows(releases, projects, items);
  const projAoa: (string | number)[][] = [
    PROJECT_SUMMARY_HEADER,
    ...projRows.map((r) => [
      r.code,
      r.projectName,
      r.platform,
      r.team,
      `Nivel ${r.alertLevel}`,
      r.releaseCode,
      r.startDate,
      r.endDate,
      r.duration,
      `${r.progress}%`,
      r.tasksCount,
      r.milestonesCount,
      r.description,
    ]),
  ];
  const wsProjects = XLSX.utils.aoa_to_sheet(projAoa);
  wsProjects['!cols'] = [
    { wch: 10 },
    { wch: 32 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 45 },
  ];
  XLSX.utils.book_append_sheet(wb, wsProjects, 'Resumen Proyectos');

  // 3. SHEET 3: Catálogo Releases
  if (releases && releases.length > 0) {
    const relRows = generateReleaseSummaryRows(releases, projects);
    const relAoa: (string | number)[][] = [
      RELEASE_SUMMARY_HEADER,
      ...relRows.map((r) => [
        r.code,
        r.name,
        r.month,
        r.startDate,
        r.endDate,
        r.duration,
        r.assignedProjects,
        r.keyMilestones,
      ]),
    ];
    const wsReleases = XLSX.utils.aoa_to_sheet(relAoa);
    wsReleases['!cols'] = [
      { wch: 16 },
      { wch: 30 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 40 },
      { wch: 50 },
    ];
    XLSX.utils.book_append_sheet(wb, wsReleases, 'Catálogo Releases');
  }

  return wb;
}

/**
 * Downloads the full Gantt Excel workbook in the browser.
 */
export function downloadGanttExcelFile(
  releases: Release[],
  projects: GanttProject[],
  items: ComputedGanttItem[],
  filename = 'GanttFlow_Cronograma_Completo.xlsx'
): void {
  const wb = exportFullGanttToWorkbook(releases, projects, items);
  XLSX.writeFile(wb, filename);
}
