import * as XLSX from 'xlsx';
import {
  ComputedGanttItem,
  GanttProject,
  Release,
} from '../types/gantt';
import { checkTaskReleaseCompliance, getReleaseDateSpan } from './releaseEngine';
import { groupItemsByProject, groupItemsByReleaseAndProject } from './ganttEngine';

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

  // 1. SHEET 1: Cronograma Jerárquico (Full Hierarchy)
  const hierarchyRows: (string | number)[][] = [];

  // Header row
  hierarchyRows.push([
    'Jerarquía',
    'Código WBS',
    'Nombre',
    'Release Asignada',
    'Proyecto',
    'Plataforma',
    'Tipo',
    'Fecha Inicio',
    'Fecha Fin',
    'Duración (Días)',
    'Holgura / Slack (Días)',
    'Progreso (%)',
    'Dependencias (Predecesoras)',
    'Ruta Crítica',
    'Hito Externo',
    'Cumplimiento Release',
  ]);

  if (releases && releases.length > 0) {
    const releaseGroups = groupItemsByReleaseAndProject(items, projects, releases);

    for (const rg of releaseGroups) {
      // Release Row
      hierarchyRows.push([
        'RELEASE',
        rg.release.code,
        rg.release.name,
        rg.release.code,
        '—',
        '—',
        'Release',
        rg.startDate,
        rg.endDate,
        rg.duration,
        0,
        `${rg.progress}%`,
        '—',
        '—',
        '—',
        'Conforme',
      ]);

      for (const pg of rg.projectGroups) {
        // Project Row
        const platformLabel = pg.project.platform || 'Multiplataforma';
        hierarchyRows.push([
          '  └─ PROYECTO',
          `P${pg.projectIndex}`,
          pg.project.name,
          rg.release.code,
          pg.project.name,
          platformLabel,
          'Proyecto',
          pg.startDate,
          pg.endDate,
          pg.duration,
          0,
          `${pg.progress}%`,
          '—',
          '—',
          '—',
          'Conforme',
        ]);

        for (const item of pg.items) {
          // Task or Milestone Row
          const isMilestone = item.type === 'milestone';
          const typeLabel = isMilestone ? 'Hito' : 'Tarea';
          const levelLabel = isMilestone ? '      └─ HITO' : '      └─ TAREA';
          const wbsCode = item.wbs || item.id;
          const depsLabel =
            item.dependencies && item.dependencies.length > 0
              ? item.dependencies.join(', ')
              : '—';
          const isCriticalLabel = item.isCritical ? 'SÍ' : 'NO';
          const isExternalLabel = item.isExternal ? 'SÍ' : 'NO';

          const violations = checkTaskReleaseCompliance(item, pg.project, rg.release);
          const complianceLabel =
            violations.length === 0
              ? 'Conforme'
              : `Alerta: ${violations[0].milestoneCode} (+${violations[0].daysLate}d)`;

          hierarchyRows.push([
            levelLabel,
            wbsCode,
            item.name,
            rg.release.code,
            pg.project.name,
            platformLabel,
            typeLabel,
            item.startDate,
            item.endDate,
            item.duration,
            item.slack || 0,
            `${item.progress || 0}%`,
            depsLabel,
            isCriticalLabel,
            isExternalLabel,
            complianceLabel,
          ]);
        }
      }
    }
  } else {
    // Fallback: group by projects only if no releases defined
    const projectGroups = groupItemsByProject(items, projects);
    for (const pg of projectGroups) {
      const platformLabel = pg.project.platform || 'Multiplataforma';
      hierarchyRows.push([
        'PROYECTO',
        `P${pg.projectIndex}`,
        pg.project.name,
        '—',
        pg.project.name,
        platformLabel,
        'Proyecto',
        pg.startDate,
        pg.endDate,
        pg.duration,
        0,
        `${pg.progress}%`,
        '—',
        '—',
        '—',
        'Conforme',
      ]);

      for (const item of pg.items) {
        const isMilestone = item.type === 'milestone';
        const typeLabel = isMilestone ? 'Hito' : 'Tarea';
        const levelLabel = isMilestone ? '  └─ HITO' : '  └─ TAREA';
        const wbsCode = item.wbs || item.id;
        const depsLabel =
          item.dependencies && item.dependencies.length > 0
            ? item.dependencies.join(', ')
            : '—';
        const isCriticalLabel = item.isCritical ? 'SÍ' : 'NO';
        const isExternalLabel = item.isExternal ? 'SÍ' : 'NO';

        hierarchyRows.push([
          levelLabel,
          wbsCode,
          item.name,
          '—',
          pg.project.name,
          platformLabel,
          typeLabel,
          item.startDate,
          item.endDate,
          item.duration,
          item.slack || 0,
          `${item.progress || 0}%`,
          depsLabel,
          isCriticalLabel,
          isExternalLabel,
          'Conforme',
        ]);
      }
    }
  }

  const wsHierarchy = XLSX.utils.aoa_to_sheet(hierarchyRows);
  // Auto-size columns
  wsHierarchy['!cols'] = [
    { wch: 18 }, // Jerarquía
    { wch: 14 }, // Código WBS
    { wch: 38 }, // Nombre
    { wch: 16 }, // Release Asignada
    { wch: 28 }, // Proyecto
    { wch: 18 }, // Plataforma
    { wch: 12 }, // Tipo
    { wch: 14 }, // Fecha Inicio
    { wch: 14 }, // Fecha Fin
    { wch: 14 }, // Duración
    { wch: 18 }, // Holgura
    { wch: 14 }, // Progreso
    { wch: 24 }, // Dependencias
    { wch: 12 }, // Ruta Crítica
    { wch: 12 }, // Hito Externo
    { wch: 30 }, // Cumplimiento Release
  ];
  XLSX.utils.book_append_sheet(wb, wsHierarchy, 'Cronograma Completo');

  // 2. SHEET 2: Resumen de Proyectos y Plataformas
  const projectSummaryRows: (string | number)[][] = [];
  projectSummaryRows.push([
    'Código',
    'Proyecto',
    'Plataforma',
    'Release Asignada',
    'Fecha Inicio',
    'Fecha Fin',
    'Duración (Días)',
    'Progreso (%)',
    'Total Tareas',
    'Total Hitos',
    'Descripción',
  ]);

  const pGroups = groupItemsByProject(items, projects);
  for (const pg of pGroups) {
    const assignedRelease = releases.find((r) => r.id === pg.project.releaseId);
    const taskCount = pg.items.filter((it) => it.type !== 'milestone').length;
    const milestoneCount = pg.items.filter((it) => it.type === 'milestone').length;

    projectSummaryRows.push([
      `P${pg.projectIndex}`,
      pg.project.name,
      pg.project.platform || 'Multiplataforma',
      assignedRelease ? assignedRelease.code : 'Sin asignar',
      pg.startDate,
      pg.endDate,
      pg.duration,
      `${pg.progress}%`,
      taskCount,
      milestoneCount,
      pg.project.description || '',
    ]);
  }

  const wsProjects = XLSX.utils.aoa_to_sheet(projectSummaryRows);
  wsProjects['!cols'] = [
    { wch: 10 },
    { wch: 32 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsProjects, 'Resumen Proyectos');

  // 3. SHEET 3: Catálogo de Releases
  if (releases && releases.length > 0) {
    const releaseSummaryRows: (string | number)[][] = [];
    releaseSummaryRows.push([
      'Código',
      'Nombre',
      'Mes',
      'Fecha Inicio',
      'Fecha Fin',
      'Duración (Días)',
      'Proyectos Asignados',
      'Hitos Clave',
    ]);

    for (const rel of releases) {
      const assignedProjs = projects
        .filter((p) => p.releaseId === rel.id)
        .map((p) => p.name)
        .join(', ');
      const keyMilestones = rel.milestones
        .map((m) => `${m.code} (${m.date})`)
        .join('; ');

      const span = getReleaseDateSpan(rel);
      releaseSummaryRows.push([
        rel.code,
        rel.name,
        rel.month || '—',
        span.startDate,
        span.endDate,
        span.duration || 0,
        assignedProjs || 'Ninguno',
        keyMilestones || 'Sin hitos',
      ]);
    }

    const wsReleases = XLSX.utils.aoa_to_sheet(releaseSummaryRows);
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
