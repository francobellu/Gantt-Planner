import {
  addDays,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ComputedGanttItem,
  ComputedProjectGroup,
  DependencyType,
  GanttItem,
  GanttProject,
  ProjectTemplate,
  SavedScenario,
  TaskColor,
} from '../types/gantt';

export function parseDateSafe(dateStr: string): Date {
  const parsed = parseISO(dateStr);
  if (isValid(parsed)) {
    return startOfDay(parsed);
  }
  return startOfDay(new Date());
}

export function formatDateISO(date: Date): string {
  return format(startOfDay(date), 'yyyy-MM-dd');
}

export function formatDateDisplay(dateStr: string, fmt = 'dd MMM yyyy'): string {
  const d = parseDateSafe(dateStr);
  return format(d, fmt, { locale: es });
}

/**
 * Given startDate and duration (inclusive calendar days for tasks, 0 for milestones),
 * calculates endDate.
 * Convention:
 * - Milestone: duration = 0, startDate === endDate
 * - Task: duration >= 1. A 1-day task starting on 2026-10-28 ends on 2026-10-28 (occupies 1 full day cell).
 *   A 5-day task starting on 2026-10-28 ends on 2026-11-01 (28, 29, 30, 31, 1 = 5 days).
 */
export function calculateEndDateFromDuration(
  startDate: string,
  duration: number,
  type: 'task' | 'milestone' = 'task'
): string {
  const start = parseDateSafe(startDate);
  if (type === 'milestone' || duration <= 0) {
    return formatDateISO(start);
  }
  const safeDuration = Math.max(1, Math.round(duration));
  return formatDateISO(addDays(start, safeDuration - 1));
}

/**
 * Given startDate and endDate, calculates inclusive duration in days.
 */
export function calculateDurationFromDates(
  startDate: string,
  endDate: string,
  type: 'task' | 'milestone' = 'task'
): number {
  if (type === 'milestone') return 0;
  const start = parseDateSafe(startDate);
  const end = parseDateSafe(endDate);
  const diff = differenceInCalendarDays(end, start) + 1;
  return Math.max(1, diff);
}

const VALID_COLORS = new Set<TaskColor>([
  'indigo',
  'blue',
  'emerald',
  'amber',
  'rose',
  'violet',
  'cyan',
]);

export function sanitizeProject(
  raw: Partial<GanttProject>,
  fallbackIndex = 0
): GanttProject {
  const palette: TaskColor[] = ['indigo', 'violet', 'emerald', 'blue', 'amber', 'rose', 'cyan'];
  const color: TaskColor =
    raw.color && VALID_COLORS.has(raw.color)
      ? raw.color
      : palette[fallbackIndex % palette.length];

  return {
    id: raw.id?.trim() || `proj-${fallbackIndex + 1}-${Date.now()}`,
    name: (raw.name || '').trim() || `Proyecto ${fallbackIndex + 1}`,
    color,
    description: raw.description?.trim() || undefined,
    collapsed: Boolean(raw.collapsed),
  };
}

/**
 * Normalizes a partial or computed Gantt item into a clean GanttItem with
 * consistent startDate, endDate, duration, slack, and deep-cloned dependencies.
 */
export function sanitizeGanttItem(
  raw: Partial<GanttItem>,
  fallbackIndex = 0
): GanttItem {
  const type = raw.type === 'milestone' ? 'milestone' : 'task';
  const startDate = formatDateISO(
    parseDateSafe(raw.startDate || formatDateISO(new Date()))
  );

  let duration = 0;
  let endDate = startDate;

  if (type === 'task') {
    const hasExplicitDuration =
      raw.duration !== undefined &&
      raw.duration !== null &&
      Number.isFinite(Number(raw.duration)) &&
      Number(raw.duration) >= 1;

    if (hasExplicitDuration && !raw.endDate) {
      duration = Math.max(1, Math.round(Number(raw.duration)));
      endDate = calculateEndDateFromDuration(startDate, duration, 'task');
    } else if (raw.endDate) {
      const expectedFromDur = hasExplicitDuration
        ? calculateEndDateFromDuration(
            startDate,
            Math.max(1, Math.round(Number(raw.duration))),
            'task'
          )
        : null;
      if (hasExplicitDuration && expectedFromDur === raw.endDate) {
        duration = Math.max(1, Math.round(Number(raw.duration)));
        endDate = expectedFromDur;
      } else if (hasExplicitDuration) {
        duration = Math.max(1, Math.round(Number(raw.duration)));
        endDate = calculateEndDateFromDuration(startDate, duration, 'task');
      } else {
        duration = calculateDurationFromDates(startDate, raw.endDate, 'task');
        endDate = calculateEndDateFromDuration(startDate, duration, 'task');
      }
    } else {
      duration = 1;
      endDate = startDate;
    }
  }

  const color =
    raw.color && VALID_COLORS.has(raw.color) ? raw.color : type === 'milestone' ? 'amber' : 'indigo';

  const result: GanttItem = {
    id: raw.id || `${type === 'milestone' ? 'm' : 't'}-${fallbackIndex}-${Date.now()}`,
    name: (raw.name || '').trim() || `Elemento ${fallbackIndex + 1}`,
    type,
    startDate,
    endDate,
    duration,
    slack: Math.max(0, Math.round(Number(raw.slack) || 0)),
    dependencies: Array.isArray(raw.dependencies) ? [...raw.dependencies] : [],
    dependencyTypes:
      raw.dependencyTypes && typeof raw.dependencyTypes === 'object'
        ? { ...raw.dependencyTypes }
        : undefined,
    progress: Math.min(100, Math.max(0, Math.round(Number(raw.progress) || 0))),
    color,
    assignee: raw.assignee?.trim() || undefined,
    notes: raw.notes?.trim() || undefined,
  };

  if (raw.projectId && raw.projectId.trim()) {
    result.projectId = raw.projectId.trim();
  }

  return result;
}


/**
 * Detects if adding `candidatePredecessorId` as a dependency of `taskId`
 * would create a cycle in the dependency graph.
 */
export function wouldCreateCycle(
  items: GanttItem[],
  taskId: string,
  candidatePredecessorId: string
): boolean {
  if (taskId === candidatePredecessorId) return true;
  const itemMap = new Map(items.map((it) => [it.id, it]));
  const visited = new Set<string>();

  function dfs(currentId: string): boolean {
    if (currentId === taskId) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);
    const item = itemMap.get(currentId);
    if (!item) return false;
    for (const predId of item.dependencies) {
      if (dfs(predId)) return true;
    }
    return false;
  }

  return dfs(candidatePredecessorId);
}

/**
 * Calculates the earliest allowed start date for a task based on its predecessors
 * and dependency types (FS, SS, FF, SF).
 */
export function getEarliestStartFromPredecessors(
  item: GanttItem,
  itemMap: Map<string, GanttItem>
): Date | null {
  if (!item.dependencies || item.dependencies.length === 0) return null;

  let maxRequiredStart: Date | null = null;

  for (const predId of item.dependencies) {
    const pred = itemMap.get(predId);
    if (!pred) continue;

    const depType: DependencyType = item.dependencyTypes?.[predId] || 'FS';
    const predStart = parseDateSafe(pred.startDate);
    const predEnd = parseDateSafe(pred.endDate);

    let requiredStart: Date;
    switch (depType) {
      case 'FS':
        // Finish-to-Start: successor starts the day after predecessor finishes
        requiredStart = addDays(predEnd, 1);
        break;
      case 'SS':
        requiredStart = predStart;
        break;
      case 'FF': {
        const offset = item.type === 'milestone' ? 0 : Math.max(0, item.duration - 1);
        requiredStart = addDays(predEnd, -offset);
        break;
      }
      case 'SF': {
        const offset = item.type === 'milestone' ? 0 : Math.max(0, item.duration - 1);
        requiredStart = addDays(predStart, -offset);
        break;
      }
      default:
        requiredStart = addDays(predEnd, 1);
    }

    if (!maxRequiredStart || requiredStart > maxRequiredStart) {
      maxRequiredStart = requiredStart;
    }
  }

  return maxRequiredStart;
}

/**
 * Propagates schedule changes forward through dependents when auto-cascade is enabled
 * or when the user clicks "Auto-Ajustar Dependencias".
 */
export function cascadeDependencies(items: GanttItem[]): GanttItem[] {
  const cloned: GanttItem[] = items.map((it) => ({
    ...it,
    dependencies: [...it.dependencies],
    dependencyTypes: it.dependencyTypes ? { ...it.dependencyTypes } : undefined,
  }));
  const itemMap = new Map(cloned.map((it) => [it.id, it]));

  // Topological relaxation passes (up to N passes to propagate through chain)
  for (let pass = 0; pass < cloned.length; pass++) {
    let changed = false;
    for (const item of cloned) {
      const requiredStart = getEarliestStartFromPredecessors(item, itemMap);
      if (requiredStart) {
        const currentStart = parseDateSafe(item.startDate);
        if (currentStart < requiredStart) {
          const newStartStr = formatDateISO(requiredStart);
          item.startDate = newStartStr;
          item.endDate = calculateEndDateFromDuration(newStartStr, item.duration, item.type);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  return cloned;
}

/**
 * Computes Critical Path Method (CPM), Slack End Date, WBS numbers, and dependency conflicts.
 */
export function computeGanttMetrics(items: GanttItem[]): ComputedGanttItem[] {
  if (items.length === 0) return [];

  const itemMap = new Map(items.map((it) => [it.id, it]));

  // Project bounds
  let minStart = parseDateSafe(items[0].startDate);
  let maxEnd = parseDateSafe(items[0].endDate);

  for (const it of items) {
    const s = parseDateSafe(it.startDate);
    const e = parseDateSafe(it.endDate);
    if (s < minStart) minStart = s;
    if (e > maxEnd) maxEnd = e;
  }

  const projectTotalSpan = differenceInCalendarDays(maxEnd, minStart) + 1;

  // Build adjacency list for successors
  const successorsMap = new Map<string, string[]>();
  for (const it of items) {
    successorsMap.set(it.id, []);
  }
  for (const it of items) {
    for (const predId of it.dependencies) {
      if (successorsMap.has(predId)) {
        successorsMap.get(predId)!.push(it.id);
      }
    }
  }

  // Calculate CPM Total Float using backward pass from project end date
  const lateFinishMap = new Map<string, Date>();

  // Initialize all items with maxEnd
  for (const it of items) {
    lateFinishMap.set(it.id, maxEnd);
  }

  // Backward relaxation passes
  for (let pass = 0; pass < items.length; pass++) {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const itDur = it.type === 'milestone' ? 0 : Math.max(1, it.duration);
      const succIds = successorsMap.get(it.id) || [];
      if (succIds.length === 0) {
        lateFinishMap.set(it.id, maxEnd);
      } else {
        let minAllowedPredFinish: Date | null = null;
        for (const sId of succIds) {
          const succ = itemMap.get(sId);
          if (!succ) continue;
          const succLateFinish = lateFinishMap.get(sId) || maxEnd;
          const succDur = succ.type === 'milestone' ? 0 : Math.max(1, succ.duration);
          const succLateStart =
            succ.type === 'milestone'
              ? succLateFinish
              : addDays(succLateFinish, -(succDur - 1));
          const depType: DependencyType = succ.dependencyTypes?.[it.id] || 'FS';

          let allowedPredFinish: Date;
          switch (depType) {
            case 'FS':
              allowedPredFinish = addDays(succLateStart, -1);
              break;
            case 'SS':
              allowedPredFinish =
                it.type === 'milestone'
                  ? succLateStart
                  : addDays(succLateStart, itDur - 1);
              break;
            case 'FF':
              allowedPredFinish = succLateFinish;
              break;
            case 'SF':
              allowedPredFinish =
                it.type === 'milestone'
                  ? succLateFinish
                  : addDays(succLateFinish, itDur - 1);
              break;
            default:
              allowedPredFinish = addDays(succLateStart, -1);
          }

          if (!minAllowedPredFinish || allowedPredFinish < minAllowedPredFinish) {
            minAllowedPredFinish = allowedPredFinish;
          }
        }
        if (minAllowedPredFinish) {
          lateFinishMap.set(it.id, minAllowedPredFinish);
        }
      }
    }
  }

  return items.map((item, idx) => {
    const start = parseDateSafe(item.startDate);
    const end = parseDateSafe(item.endDate);
    const safeSlack = Math.max(0, Number(item.slack) || 0);
    const slackEnd = addDays(end, safeSlack);

    const lateFinish = lateFinishMap.get(item.id) || maxEnd;
    const cpmTotalFloat = Math.max(0, differenceInCalendarDays(lateFinish, end));

    // Check dependency conflict
    const earliestAllowed = getEarliestStartFromPredecessors(item, itemMap);
    const hasConflict = earliestAllowed !== null && start < earliestAllowed;
    const conflictMessage =
      hasConflict && earliestAllowed
        ? `Inicia antes que finalice su predecesora (debería iniciar el ${formatDateDisplay(
            formatDateISO(earliestAllowed),
            'dd MMM'
          )} o después)`
        : undefined;

    // A task is on the critical path if its user-configured slack is 0 AND its CPM float is 0
    // (either it reaches the end of the project or drives a chain that reaches the end of the project)
    const isCritical =
      safeSlack === 0 && cpmTotalFloat <= 0 && projectTotalSpan > 0;

    return {
      ...item,
      wbs: idx + 1,
      slack: safeSlack,
      slackEndDate: formatDateISO(slackEnd),
      cpmTotalFloat,
      isCritical,
      hasConflict,
      conflictMessage,
      earliestAllowedStart: earliestAllowed ? formatDateISO(earliestAllowed) : undefined,
    };
  });
}

/**
 * Groups computed Gantt items by project, computing rolled-up summary dates,
 * durations, progress percentages, slack totals, and hierarchical WBS codes (e.g. 1.1, 1.2, 2.1).
 */
export function groupItemsByProject(
  items: ComputedGanttItem[],
  projects: GanttProject[]
): ComputedProjectGroup[] {
  const effectiveProjects: GanttProject[] = projects.map((p, i) =>
    sanitizeProject(p, i)
  );

  const projectMap = new Map<string, GanttProject>();
  for (const p of effectiveProjects) {
    projectMap.set(p.id, p);
  }

  // Ensure any orphan projectId referenced by items has a project entry,
  // or create a default project if no projects were provided
  for (const item of items) {
    if (item.projectId && !projectMap.has(item.projectId)) {
      const extraProj = sanitizeProject(
        { id: item.projectId, name: `Proyecto ${effectiveProjects.length + 1}` },
        effectiveProjects.length
      );
      effectiveProjects.push(extraProj);
      projectMap.set(extraProj.id, extraProj);
    } else if (!item.projectId && effectiveProjects.length === 0) {
      const defProj: GanttProject = {
        id: 'proj-default',
        name: 'Proyecto General',
        color: 'indigo',
        collapsed: false,
      };
      effectiveProjects.push(defProj);
      projectMap.set(defProj.id, defProj);
    }
  }

  if (effectiveProjects.length === 0) {
    const defProj: GanttProject = {
      id: 'proj-default',
      name: 'Proyecto General',
      color: 'indigo',
      collapsed: false,
    };
    effectiveProjects.push(defProj);
    projectMap.set(defProj.id, defProj);
  }

  const fallbackProjectId = effectiveProjects[0].id;

  const bucketMap = new Map<string, ComputedGanttItem[]>();
  for (const p of effectiveProjects) {
    bucketMap.set(p.id, []);
  }

  for (const item of items) {
    const targetPid =
      item.projectId && bucketMap.has(item.projectId)
        ? item.projectId
        : fallbackProjectId;
    bucketMap.get(targetPid)!.push(item);
  }

  const todayStr = formatDateISO(new Date());

  return effectiveProjects.map((project, pIdx) => {
    const projectIndex = pIdx + 1;
    const rawGroupItems = bucketMap.get(project.id) || [];

    const enrichedItems: ComputedGanttItem[] = rawGroupItems.map((it, itemIdx) => ({
      ...it,
      projectId: project.id,
      wbsCode: `${projectIndex}.${itemIdx + 1}`,
    }));

    if (enrichedItems.length === 0) {
      return {
        project,
        projectIndex,
        items: [],
        startDate: todayStr,
        endDate: todayStr,
        slackEndDate: todayStr,
        duration: 0,
        progress: 0,
        tasksCount: 0,
        milestonesCount: 0,
        criticalCount: 0,
        totalSlack: 0,
        hasConflict: false,
      };
    }

    let minStart = parseDateSafe(enrichedItems[0].startDate);
    let maxEnd = parseDateSafe(enrichedItems[0].endDate);
    let maxSlackEnd = parseDateSafe(
      enrichedItems[0].slackEndDate || enrichedItems[0].endDate
    );

    let tasksCount = 0;
    let milestonesCount = 0;
    let criticalCount = 0;
    let totalSlack = 0;
    let taskProgressSum = 0;
    let milestoneProgressSum = 0;
    let hasConflict = false;

    for (const it of enrichedItems) {
      const s = parseDateSafe(it.startDate);
      const e = parseDateSafe(it.endDate);
      const se = parseDateSafe(it.slackEndDate || it.endDate);
      if (s < minStart) minStart = s;
      if (e > maxEnd) maxEnd = e;
      if (se > maxSlackEnd) maxSlackEnd = se;

      if (it.type === 'milestone') {
        milestonesCount++;
        milestoneProgressSum += it.progress || 0;
      } else {
        tasksCount++;
        totalSlack += it.slack || 0;
        taskProgressSum += it.progress || 0;
      }

      if (it.isCritical) criticalCount++;
      if (it.hasConflict) hasConflict = true;
    }

    const startDate = formatDateISO(minStart);
    const endDate = formatDateISO(maxEnd);
    const slackEndDate = formatDateISO(maxSlackEnd);
    const rawSpanDays = differenceInCalendarDays(maxEnd, minStart);
    const duration =
      tasksCount === 0 && rawSpanDays === 0 ? 0 : Math.max(1, rawSpanDays + 1);
    const progress =
      tasksCount > 0
        ? Math.round(taskProgressSum / tasksCount)
        : milestonesCount > 0
        ? Math.round(milestoneProgressSum / milestonesCount)
        : 0;

    return {
      project,
      projectIndex,
      items: enrichedItems,
      startDate,
      endDate,
      slackEndDate,
      duration,
      progress,
      tasksCount,
      milestonesCount,
      criticalCount,
      totalSlack,
      hasConflict,
    };
  });
}

/**
 * Generates default realistic project templates shifted around the current date
 * so the user immediately sees an impressive, rich Gantt chart with tasks grouped into projects,
 * slack, dependencies, and milestones.
 */
export function getProjectTemplates(): ProjectTemplate[] {
  const base = startOfDay(new Date());
  const d = (offset: number) => formatDateISO(addDays(base, offset));

  return [
    {
      id: 'saas-launch',
      name: 'Lanzamiento Plataforma SaaS v2.0',
      description:
        'Portafolio completo agrupado en 3 proyectos (Discovery & Diseño, Ingeniería Core y QA & Lanzamiento) con ruta crítica, holguras (slack) e hitos.',
      projects: [
        {
          id: 'proj-discovery',
          name: 'Proyecto 1: Discovery & Diseño de Producto',
          color: 'violet',
          description: 'Investigación UX, diseño de interfaz y congelación de alcance.',
          collapsed: false,
        },
        {
          id: 'proj-core',
          name: 'Proyecto 2: Ingeniería Core & Pagos',
          color: 'indigo',
          description: 'Arquitectura backend, motor Gantt interactivo e integración Stripe.',
          collapsed: false,
        },
        {
          id: 'proj-release',
          name: 'Proyecto 3: QA, Cloud CI/CD & Go-Live',
          color: 'emerald',
          description: 'Pruebas automatizadas, pipeline GitHub Actions + Vercel y salida a producción.',
          collapsed: false,
        },
      ],
      items: [
        {
          id: 't-1',
          name: 'Investigación de Usuarios & Alcance Técnico',
          type: 'task',
          projectId: 'proj-discovery',
          startDate: d(-7),
          endDate: d(-4),
          duration: 4,
          slack: 0,
          dependencies: [],
          progress: 100,
          color: 'indigo',
          assignee: 'Ana M. (PM)',
          notes: 'Definición de requerimientos funcionales y métricas de éxito.',
        },
        {
          id: 't-2',
          name: 'Diseño de Sistema UI/UX & Prototipo Figma',
          type: 'task',
          projectId: 'proj-discovery',
          startDate: d(-3),
          endDate: d(1),
          duration: 5,
          slack: 1,
          dependencies: ['t-1'],
          progress: 85,
          color: 'violet',
          assignee: 'Carlos R. (UX)',
          notes: 'Incluye 1 día de holgura (slack) para iteración con stakeholders.',
        },
        {
          id: 't-3',
          name: 'Arquitectura de Base de Datos & API GraphQL',
          type: 'task',
          projectId: 'proj-core',
          startDate: d(-3),
          endDate: d(2),
          duration: 6,
          slack: 0,
          dependencies: ['t-1'],
          progress: 70,
          color: 'blue',
          assignee: 'Diego L. (Backend)',
          notes: 'Tarea en ruta crítica sin margen de retraso.',
        },
        {
          id: 'm-1',
          name: 'Hito: Congelación de Diseño & Esquema API',
          type: 'milestone',
          projectId: 'proj-discovery',
          startDate: d(3),
          endDate: d(3),
          duration: 0,
          slack: 0,
          dependencies: ['t-2', 't-3'],
          progress: 100,
          color: 'amber',
          assignee: 'Equipo Core',
          notes: 'Gate de aprobación técnica antes del desarrollo intensivo.',
        },
        {
          id: 't-4',
          name: 'Desarrollo Motor Gantt Interactivo (Frontend)',
          type: 'task',
          projectId: 'proj-core',
          startDate: d(4),
          endDate: d(10),
          duration: 7,
          slack: 0,
          dependencies: ['m-1'],
          progress: 35,
          color: 'indigo',
          assignee: 'Elena V. (Frontend)',
          notes: 'Renderizado de barras, líneas de dependencias ortogonales y zoom.',
        },
        {
          id: 't-5',
          name: 'Integración Pasarela de Pagos Stripe & Webhooks',
          type: 'task',
          projectId: 'proj-core',
          startDate: d(4),
          endDate: d(7),
          duration: 4,
          slack: 3,
          dependencies: ['m-1'],
          progress: 50,
          color: 'emerald',
          assignee: 'Diego L. (Backend)',
          notes: 'Cuenta con 3 días de slack (holgura) antes de las pruebas E2E.',
        },
        {
          id: 't-6',
          name: 'Pruebas QA Automatizadas, Seguridad & Load Testing',
          type: 'task',
          projectId: 'proj-release',
          startDate: d(11),
          endDate: d(14),
          duration: 4,
          slack: 1,
          dependencies: ['t-4', 't-5'],
          progress: 0,
          color: 'cyan',
          assignee: 'Sofía P. (QA)',
          notes: 'Pruebas de regresión y rendimiento en entorno staging.',
        },
        {
          id: 't-7',
          name: 'Configuración CI/CD GitHub Actions & Deploy Vercel',
          type: 'task',
          projectId: 'proj-release',
          startDate: d(11),
          endDate: d(15),
          duration: 5,
          slack: 0,
          dependencies: ['t-4'],
          progress: 20,
          color: 'rose',
          assignee: 'Marco T. (DevOps)',
          notes: 'Pipeline automatizada con preview y producción.',
        },
        {
          id: 'm-2',
          name: 'Hito: Go-Live Producción & Lanzamiento Oficial',
          type: 'milestone',
          projectId: 'proj-release',
          startDate: d(16),
          endDate: d(16),
          duration: 0,
          slack: 0,
          dependencies: ['t-6', 't-7'],
          progress: 0,
          color: 'emerald',
          assignee: 'Dirección',
          notes: 'Lanzamiento público en producción.',
        },
      ],
    },
    {
      id: 'cloud-migration',
      name: 'Migración de Infraestructura Cloud & IA',
      description:
        'Planificación de modernización de servidores, contenedores Kubernetes y despliegue zero-downtime.',
      projects: [
        {
          id: 'proj-cloud-foundation',
          name: 'Proyecto 1: Auditoría & Fundación Cloud EKS',
          color: 'blue',
          description: 'Preparación de clústeres, Terraform y replicación de datos.',
          collapsed: false,
        },
        {
          id: 'proj-cloud-cutover',
          name: 'Proyecto 2: Cutover DNS & Decomisión Legacy',
          color: 'emerald',
          description: 'Cambio de tráfico en vivo y cierre de servidores antiguos.',
          collapsed: false,
        },
      ],
      items: [
        {
          id: 'cm-1',
          name: 'Auditoría de Servicios Legacy & Dependencias',
          type: 'task',
          projectId: 'proj-cloud-foundation',
          startDate: d(-4),
          endDate: d(-1),
          duration: 4,
          slack: 0,
          dependencies: [],
          progress: 100,
          color: 'blue',
          assignee: 'Infra Team',
        },
        {
          id: 'cm-2',
          name: 'Provisionamiento Terraform & Cluster EKS',
          type: 'task',
          projectId: 'proj-cloud-foundation',
          startDate: d(0),
          endDate: d(4),
          duration: 5,
          slack: 0,
          dependencies: ['cm-1'],
          progress: 60,
          color: 'indigo',
          assignee: 'DevOps',
        },
        {
          id: 'cm-3',
          name: 'Replicación de Base de Datos en Tiempo Real',
          type: 'task',
          projectId: 'proj-cloud-foundation',
          startDate: d(0),
          endDate: d(2),
          duration: 3,
          slack: 2,
          dependencies: ['cm-1'],
          progress: 40,
          color: 'cyan',
          assignee: 'DBA',
        },
        {
          id: 'cm-m1',
          name: 'Hito: Entorno Staging Validado',
          type: 'milestone',
          projectId: 'proj-cloud-foundation',
          startDate: d(5),
          endDate: d(5),
          duration: 0,
          slack: 0,
          dependencies: ['cm-2', 'cm-3'],
          progress: 0,
          color: 'amber',
          assignee: 'SRE Lead',
        },
        {
          id: 'cm-4',
          name: 'Switch de DNS & Monitoreo Post-Migración',
          type: 'task',
          projectId: 'proj-cloud-cutover',
          startDate: d(6),
          endDate: d(8),
          duration: 3,
          slack: 0,
          dependencies: ['cm-m1'],
          progress: 0,
          color: 'emerald',
          assignee: 'Todo el Equipo',
        },
        {
          id: 'cm-m2',
          name: 'Hito: Cierre Data Center Legacy',
          type: 'milestone',
          projectId: 'proj-cloud-cutover',
          startDate: d(9),
          endDate: d(9),
          duration: 0,
          slack: 0,
          dependencies: ['cm-4'],
          progress: 0,
          color: 'rose',
          assignee: 'CTO',
        },
      ],
    },
    {
      id: 'blank-project',
      name: 'Proyecto Nuevo (Plantilla Mínima)',
      description: 'Comienza desde una estructura limpia con 2 proyectos, tareas y 1 hito de ejemplo.',
      projects: [
        {
          id: 'proj-init',
          name: 'Proyecto 1: Fase de Planificación',
          color: 'indigo',
          collapsed: false,
        },
        {
          id: 'proj-exec',
          name: 'Proyecto 2: Ejecución & Entrega',
          color: 'emerald',
          collapsed: false,
        },
      ],
      items: [
        {
          id: 'b-1',
          name: 'Fase 1: Planificación Inicial',
          type: 'task',
          projectId: 'proj-init',
          startDate: d(0),
          endDate: d(3),
          duration: 4,
          slack: 0,
          dependencies: [],
          progress: 50,
          color: 'indigo',
          assignee: 'Responsable',
        },
        {
          id: 'b-2',
          name: 'Fase 2: Ejecución & Desarrollo',
          type: 'task',
          projectId: 'proj-exec',
          startDate: d(4),
          endDate: d(8),
          duration: 5,
          slack: 2,
          dependencies: ['b-1'],
          progress: 0,
          color: 'emerald',
          assignee: 'Equipo',
        },
        {
          id: 'b-m1',
          name: 'Hito: Entrega Final del Proyecto',
          type: 'milestone',
          projectId: 'proj-exec',
          startDate: d(9),
          endDate: d(9),
          duration: 0,
          slack: 0,
          dependencies: ['b-2'],
          progress: 0,
          color: 'amber',
          assignee: 'Cliente',
        },
      ],
    },
  ];
}

/**
 * Sanitizes a SavedScenario object, ensuring valid projects, items, and metadata.
 */
export function sanitizeScenario(
  raw: Partial<SavedScenario>,
  fallbackIndex = 0
): SavedScenario {
  const id =
    raw.id?.trim() ||
    `scen-${fallbackIndex + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const name = (raw.name || '').trim() || `Escenario ${fallbackIndex + 1}`;
  const cleanItems = Array.isArray(raw.items)
    ? raw.items.map((it, idx) => sanitizeGanttItem(it, idx))
    : [];

  const baseProjects =
    Array.isArray(raw.projects) && raw.projects.length > 0
      ? raw.projects.map((p, idx) => sanitizeProject(p, idx))
      : [
          sanitizeProject(
            {
              id: 'proj-default',
              name: 'Proyecto 1: General',
              color: 'indigo',
              collapsed: false,
            },
            0
          ),
        ];

  const syncedGroups = groupItemsByProject(
    computeGanttMetrics(cleanItems),
    baseProjects
  );

  return {
    id,
    name,
    projects: syncedGroups.map((g) => g.project),
    items: cleanItems,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    sourceTemplateId: raw.sourceTemplateId,
  };
}

/**
 * Upserts a scenario into a list of saved scenarios without losing existing scenarios.
 */
export function upsertScenarioInList(
  scenarios: SavedScenario[],
  scenario: Partial<SavedScenario>
): SavedScenario[] {
  const cleanList = Array.isArray(scenarios)
    ? scenarios.map((s, idx) => sanitizeScenario(s, idx))
    : [];
  const cleanTarget = sanitizeScenario(scenario, cleanList.length);
  const existsIdx = cleanList.findIndex((s) => s.id === cleanTarget.id);
  if (existsIdx >= 0) {
    const next = [...cleanList];
    next[existsIdx] = cleanTarget;
    return next;
  }
  return [...cleanList, cleanTarget];
}

/**
 * Creates a brand-new user scenario (either clean with starter structure or duplicated from current workspace).
 */
export function createNewScenario(
  name?: string,
  mode: 'blank' | 'duplicate' = 'blank',
  source?: { projects: GanttProject[]; items: GanttItem[] }
): SavedScenario {
  const uid = `scen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const trimmedName = (name || '').trim() || 'Nuevo Escenario';
  const todayStr = formatDateISO(startOfDay(new Date()));

  if (mode === 'duplicate' && source) {
    return sanitizeScenario({
      id: uid,
      name: trimmedName,
      projects: source.projects.map((p, idx) => sanitizeProject(p, idx)),
      items: source.items.map((it, idx) => sanitizeGanttItem(it, idx)),
      updatedAt: new Date().toISOString(),
    });
  }

  const starterProjectId = `proj-${Date.now()}-1`;
  return sanitizeScenario({
    id: uid,
    name: trimmedName,
    projects: [
      {
        id: starterProjectId,
        name: 'Proyecto 1: Principal',
        color: 'indigo',
        collapsed: false,
      },
    ],
    items: [
      sanitizeGanttItem({
        id: `t-${Date.now()}-1`,
        name: 'Fase 1: Planificación Inicial',
        type: 'task',
        projectId: starterProjectId,
        startDate: todayStr,
        duration: 4,
        slack: 0,
        progress: 0,
        color: 'indigo',
      }),
    ],
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Preserves the current active user scenario in `savedScenarios` and loads a template
 * into the active workspace so the user can inspect or work with a template and switch back
 * to their saved scenario anytime without losing data.
 */
export function switchWorkspaceToTemplate(
  current: {
    activeScenarioId: string;
    projectName: string;
    projects: GanttProject[];
    items: GanttItem[];
  },
  savedScenarios: SavedScenario[],
  templateId: string,
  templatesList?: ProjectTemplate[]
): {
  activeScenarioId: string;
  projectName: string;
  projects: GanttProject[];
  items: GanttItem[];
  savedScenarios: SavedScenario[];
} {
  const templates = templatesList || getProjectTemplates();
  const found = templates.find((t) => t.id === templateId);
  if (!found) {
    return {
      ...current,
      savedScenarios,
    };
  }

  let nextScenarios = [...savedScenarios];
  if (current.activeScenarioId && !current.activeScenarioId.startsWith('template:')) {
    nextScenarios = upsertScenarioInList(nextScenarios, {
      id: current.activeScenarioId,
      name: current.projectName,
      projects: current.projects,
      items: current.items,
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    activeScenarioId: `template:${found.id}`,
    projectName: found.name,
    projects: found.projects.map((p, idx) => sanitizeProject(p, idx)),
    items: found.items.map((it, idx) => sanitizeGanttItem(it, idx)),
    savedScenarios: nextScenarios,
  };
}

/**
 * Preserves the current user scenario (if active) and restores a saved scenario by ID.
 */
export function switchWorkspaceToScenario(
  current: {
    activeScenarioId: string;
    projectName: string;
    projects: GanttProject[];
    items: GanttItem[];
  },
  savedScenarios: SavedScenario[],
  targetScenarioId: string
): {
  activeScenarioId: string;
  projectName: string;
  projects: GanttProject[];
  items: GanttItem[];
  savedScenarios: SavedScenario[];
} {
  let nextScenarios = [...savedScenarios];
  if (current.activeScenarioId && !current.activeScenarioId.startsWith('template:')) {
    nextScenarios = upsertScenarioInList(nextScenarios, {
      id: current.activeScenarioId,
      name: current.projectName,
      projects: current.projects,
      items: current.items,
      updatedAt: new Date().toISOString(),
    });
  }

  const target = nextScenarios.find((s) => s.id === targetScenarioId);
  if (!target) {
    return {
      ...current,
      savedScenarios: nextScenarios,
    };
  }

  return {
    activeScenarioId: target.id,
    projectName: target.name,
    projects: target.projects.map((p, idx) => sanitizeProject(p, idx)),
    items: target.items.map((it, idx) => sanitizeGanttItem(it, idx)),
    savedScenarios: nextScenarios,
  };
}

/**
 * Returns the custom user scenario for "Plan Xcode 27 & QG5 27.2" with 1 project and the 7 tasks
 * (actions), assignees (equipos), and exact deadlines from the user's specification.
 */
export function getXcode27Scenario(): SavedScenario {
  const projectId = 'proj-xcode27';
  return sanitizeScenario({
    id: 'scen-xcode27',
    name: 'Plan Xcode 27 & QG5 27.2',
    updatedAt: new Date().toISOString(),
    projects: [
      {
        id: projectId,
        name: 'Proyecto 1: Release Xcode 27 & QG5 27.2',
        color: 'indigo',
        description:
          'Plan de entregas y tareas (acciones) por equipo rumbo a QG5 27.2 y Deadline Xcode27.',
        collapsed: false,
      },
    ],
    items: [
      {
        id: 'xc-1',
        name: 'SDK ARQ, + biocatch, onetrust, RSA actualizados',
        type: 'task',
        projectId,
        startDate: '2026-10-29',
        endDate: '2026-11-27',
        duration: 30,
        slack: 0,
        dependencies: [],
        progress: 0,
        color: 'violet',
        assignee: 'Arquitectura',
        notes: 'Deadline: 27/11/2026 — Equipo: Arquitectura',
      },
      {
        id: 'xc-2',
        name: 'Nuevas Maquinas Mac operativas (apple silicon)',
        type: 'task',
        projectId,
        startDate: '2026-10-29',
        endDate: '2026-12-02',
        duration: 35,
        slack: 0,
        dependencies: [],
        progress: 0,
        color: 'cyan',
        assignee: 'AWS/Devops',
        notes: 'Deadline: 02/12/2026 — Equipo: AWS/Devops',
      },
      {
        id: 'xc-3',
        name: 'Generación build',
        type: 'task',
        projectId,
        startDate: '2026-11-28',
        endDate: '2026-12-02',
        duration: 5,
        slack: 0,
        dependencies: ['xc-1', 'xc-2'],
        dependencyTypes: { 'xc-1': 'FS', 'xc-2': 'FF' },
        progress: 0,
        color: 'indigo',
        assignee: 'RM Canales',
        notes: 'Deadline: 02/12/2026 — Equipo: RM Canales',
      },
      {
        id: 'xc-4',
        name: 'QA termina las pruebas',
        type: 'task',
        projectId,
        startDate: '2026-12-03',
        endDate: '2027-01-07',
        duration: 36,
        slack: 0,
        dependencies: ['xc-3'],
        dependencyTypes: { 'xc-3': 'FS' },
        progress: 0,
        color: 'emerald',
        assignee: 'QA',
        notes: 'Deadline: 07/01/2027 — Equipo: QA',
      },
      {
        id: 'xc-5',
        name: 'Fixing',
        type: 'task',
        projectId,
        startDate: '2027-01-08',
        endDate: '2027-01-15',
        duration: 8,
        slack: 0,
        dependencies: ['xc-4'],
        dependencyTypes: { 'xc-4': 'FS' },
        progress: 0,
        color: 'blue',
        assignee: 'Desarrollo',
        notes: 'Deadline: 15/01/2027 — Equipo: Desarrollo',
      },
      {
        id: 'xc-6',
        name: 'QG5 27.2',
        type: 'task',
        projectId,
        startDate: '2027-01-15',
        endDate: '2027-01-15',
        duration: 1,
        slack: 0,
        dependencies: ['xc-5'],
        dependencyTypes: { 'xc-5': 'FF' },
        progress: 0,
        color: 'amber',
        assignee: 'RM',
        notes: 'Deadline: 15/01/2027 — Equipo: RM',
      },
      {
        id: 'xc-7',
        name: 'Deadline Xcode27',
        type: 'task',
        projectId,
        startDate: '2027-01-16',
        endDate: '2027-04-15',
        duration: 90,
        slack: 0,
        dependencies: ['xc-6'],
        dependencyTypes: { 'xc-6': 'FS' },
        progress: 0,
        color: 'rose',
        assignee: 'Apple',
        notes: 'Deadline: 15/04/2027 — Equipo: Apple',
      },
    ],
  });
}

/**
 * Returns the initial list of saved scenarios so the user has both the Xcode 27 scenario
 * and the SaaS v2.0 portfolio saved out of the box.
 */
export function getDefaultSavedScenarios(): SavedScenario[] {
  const templates = getProjectTemplates();
  const saasTpl = templates[0];
  const saasScenario = sanitizeScenario({
    id: 'scen-saas-v2',
    name: saasTpl.name,
    projects: saasTpl.projects,
    items: saasTpl.items,
    updatedAt: new Date().toISOString(),
    sourceTemplateId: saasTpl.id,
  });

  return [getXcode27Scenario(), saasScenario];
}


