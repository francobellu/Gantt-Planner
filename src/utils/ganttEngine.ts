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
  FitToProjectResult,
  GanttImportResult,
  GanttItem,
  GanttProject,
  ProjectTemplate,
  SavedScenario,
  TaskColor,
  ZoomLevel,
} from '../types/gantt';

export function parseDateSafe(dateInput: unknown): Date {
  if (dateInput == null) {
    return startOfDay(new Date());
  }
  if (dateInput instanceof Date && isValid(dateInput)) {
    return startOfDay(dateInput);
  }
  if (typeof dateInput === 'number' && Number.isFinite(dateInput)) {
    const d = new Date(dateInput);
    if (isValid(d)) return startOfDay(d);
  }
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return startOfDay(new Date());

    // Spanish & European date formats: DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
      const day = Number(dmyMatch[1]);
      const month = Number(dmyMatch[2]);
      const year = Number(dmyMatch[3]);
      const candidate = new Date(year, month - 1, day);
      if (isValid(candidate) && !isNaN(candidate.getTime())) {
        return startOfDay(candidate);
      }
    }

    // YYYY/MM/DD format
    const ymdMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (ymdMatch) {
      const year = Number(ymdMatch[1]);
      const month = Number(ymdMatch[2]);
      const day = Number(ymdMatch[3]);
      const candidate = new Date(year, month - 1, day);
      if (isValid(candidate) && !isNaN(candidate.getTime())) {
        return startOfDay(candidate);
      }
    }

    try {
      const parsed = parseISO(trimmed);
      if (isValid(parsed) && !isNaN(parsed.getTime())) {
        return startOfDay(parsed);
      }
    } catch {}
    try {
      const fallback = new Date(trimmed);
      if (isValid(fallback) && !isNaN(fallback.getTime())) {
        return startOfDay(fallback);
      }
    } catch {}
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
 * Formats a date for the interactive timeline cursor scrubber.
 * Example: '28 Oct 2026', '15 Ene 2027'.
 */
export function formatScrubberDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? parseDateSafe(date) : date;
  if (!isValid(d) || isNaN(d.getTime())) return '';
  const day = format(d, 'd');
  const month = format(d, 'MMM', { locale: es }).replace('.', '');
  const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
  const year = format(d, 'yyyy');
  return `${day} ${monthCap} ${year}`;
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

  const rawId = raw.id != null ? String(raw.id).trim() : '';
  const rawName = raw.name != null ? String(raw.name).trim() : '';

  return {
    id: rawId || `proj-${fallbackIndex + 1}-${Date.now()}`,
    name: rawName || `Proyecto ${fallbackIndex + 1}`,
    color,
    description: raw.description != null ? String(raw.description).trim() : undefined,
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
    const rawDur: unknown = raw.duration;
    let parsedDuration: number | null = null;
    if (rawDur !== undefined && rawDur !== null) {
      const num =
        typeof rawDur === 'string'
          ? Number(rawDur.replace(/[^\d.]/g, ''))
          : Number(rawDur);
      if (Number.isFinite(num) && num >= 1) {
        parsedDuration = Math.max(1, Math.round(num));
      }
    }

    if (parsedDuration !== null && !raw.endDate) {
      duration = parsedDuration;
      endDate = calculateEndDateFromDuration(startDate, duration, 'task');
    } else if (raw.endDate) {
      const expectedFromDur =
        parsedDuration !== null
          ? calculateEndDateFromDuration(startDate, parsedDuration, 'task')
          : null;
      if (parsedDuration !== null && expectedFromDur === raw.endDate) {
        duration = parsedDuration;
        endDate = expectedFromDur;
      } else if (parsedDuration !== null) {
        duration = parsedDuration;
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
    raw.color && VALID_COLORS.has(raw.color)
      ? raw.color
      : type === 'milestone'
      ? 'amber'
      : 'indigo';

  const rawId = raw.id != null ? String(raw.id).trim() : '';
  const id =
    rawId || `${type === 'milestone' ? 'm' : 't'}-${fallbackIndex + 1}-${Date.now()}`;

  let rawProgress = raw.progress;
  if (typeof rawProgress === 'string') {
    rawProgress = Number(String(rawProgress).replace('%', ''));
  }
  if (typeof rawProgress === 'number' && !isNaN(rawProgress)) {
    if (rawProgress > 0 && rawProgress <= 1 && !Number.isInteger(rawProgress)) {
      rawProgress = Math.round(rawProgress * 100);
    }
  } else {
    rawProgress = 0;
  }
  const progress = Math.min(100, Math.max(0, Math.round(rawProgress)));

  const dependencies = Array.isArray(raw.dependencies)
    ? raw.dependencies
        .map((d) => (d != null ? String(d).trim() : ''))
        .filter((d) => d.length > 0 && d !== id)
    : [];

  const result: GanttItem = {
    id,
    name: (raw.name != null ? String(raw.name) : '').trim() || `Elemento ${fallbackIndex + 1}`,
    type,
    startDate,
    endDate,
    duration,
    slack: Math.max(0, Math.round(Number(raw.slack) || 0)),
    dependencies,
    dependencyTypes:
      raw.dependencyTypes && typeof raw.dependencyTypes === 'object'
        ? { ...raw.dependencyTypes }
        : undefined,
    progress,
    color,
    assignee: raw.assignee != null ? String(raw.assignee).trim() : undefined,
    notes: raw.notes != null ? String(raw.notes).trim() : undefined,
  };

  if (raw.projectId != null && String(raw.projectId).trim()) {
    result.projectId = String(raw.projectId).trim();
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
  projects: GanttProject[] = []
): ComputedProjectGroup[] {
  const effectiveProjects: GanttProject[] = (projects || []).map((p, i) =>
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
  const seenIds = new Set<string>();
  const cleanItems = Array.isArray(raw.items)
    ? raw.items.map((it, idx) => {
        const sanitized = sanitizeGanttItem(it, idx);
        let finalId = sanitized.id;
        if (seenIds.has(finalId)) {
          finalId = `${finalId}-dup-${idx + 1}`;
        }
        seenIds.add(finalId);
        return { ...sanitized, id: finalId };
      })
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

  const fallbackProjId = syncedGroups[0]?.project.id || 'proj-default';
  const resolvedItems = cleanItems.map((it) => ({
    ...it,
    projectId: it.projectId || fallbackProjId,
  }));

  return {
    id,
    name,
    projects: syncedGroups.map((g) => g.project),
    items: resolvedItems,
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
 * Checks whether the current workspace has unsaved modifications relative to a template,
 * or belongs to a saved user scenario, and upserts it into `savedScenarios`.
 */
export function preserveActiveWorkspaceInScenarios(
  current: {
    activeScenarioId: string;
    projectName: string;
    projects: GanttProject[];
    items: GanttItem[];
  },
  savedScenarios: SavedScenario[],
  templatesList?: ProjectTemplate[]
): SavedScenario[] {
  let nextScenarios = [...savedScenarios];
  if (!current.activeScenarioId) return nextScenarios;

  if (!current.activeScenarioId.startsWith('template:')) {
    return upsertScenarioInList(nextScenarios, {
      id: current.activeScenarioId,
      name: current.projectName,
      projects: current.projects,
      items: current.items,
      updatedAt: new Date().toISOString(),
    });
  }

  // If currently viewing a template, check if the user modified its name, projects, or items
  const tplId = current.activeScenarioId.replace('template:', '');
  const templates = templatesList || getProjectTemplates();
  const baseTpl = templates.find((t) => t.id === tplId);
  if (!baseTpl) return nextScenarios;

  const cleanCurrentProjects = current.projects.map((p, idx) => sanitizeProject(p, idx));
  const cleanBaseProjects = baseTpl.projects.map((p, idx) => sanitizeProject(p, idx));
  const cleanCurrentItems = current.items.map((it, idx) => sanitizeGanttItem(it, idx));
  const cleanBaseItems = baseTpl.items.map((it, idx) => sanitizeGanttItem(it, idx));

  const isModified =
    current.projectName.trim() !== baseTpl.name.trim() ||
    JSON.stringify(cleanCurrentProjects) !== JSON.stringify(cleanBaseProjects) ||
    JSON.stringify(cleanCurrentItems) !== JSON.stringify(cleanBaseItems);

  if (isModified) {
    const promotedName =
      current.projectName.trim() === baseTpl.name.trim()
        ? `${baseTpl.name} (Editado)`
        : current.projectName.trim();
    nextScenarios = upsertScenarioInList(nextScenarios, {
      id: `scen-${tplId}-${Date.now()}`,
      name: promotedName,
      projects: cleanCurrentProjects,
      items: cleanCurrentItems,
      updatedAt: new Date().toISOString(),
      sourceTemplateId: tplId,
    });
  }

  return nextScenarios;
}

/**
 * Preserves the current active user scenario (or modified template) in `savedScenarios` and loads
 * a template into the active workspace so the user can inspect or work with a template and switch back
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

  const nextScenarios = preserveActiveWorkspaceInScenarios(
    current,
    savedScenarios,
    templates
  );

  return {
    activeScenarioId: `template:${found.id}`,
    projectName: found.name,
    projects: found.projects.map((p, idx) => sanitizeProject(p, idx)),
    items: found.items.map((it, idx) => sanitizeGanttItem(it, idx)),
    savedScenarios: nextScenarios,
  };
}

/**
 * Preserves the current user scenario (or modified template) and restores a saved scenario by ID.
 */
export function switchWorkspaceToScenario(
  current: {
    activeScenarioId: string;
    projectName: string;
    projects: GanttProject[];
    items: GanttItem[];
  },
  savedScenarios: SavedScenario[],
  targetScenarioId: string,
  templatesList?: ProjectTemplate[]
): {
  activeScenarioId: string;
  projectName: string;
  projects: GanttProject[];
  items: GanttItem[];
  savedScenarios: SavedScenario[];
} {
  const nextScenarios = preserveActiveWorkspaceInScenarios(
    current,
    savedScenarios,
    templatesList
  );

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
 * Returns the initial list of saved scenarios loading the clean SaaS v2.0 portfolio template.
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

  return [saasScenario];
}

export const MIN_DAY_WIDTH = 3;
export const MAX_DAY_WIDTH = 96;
export const DEFAULT_DAY_WIDTH = 44;

export const ZOOM_PRESET_WIDTHS: Record<ZoomLevel, number> = {
  day: 44,
  week: 24,
  month: 12,
  quarter: 5,
};

/**
 * Clamps a continuous dayWidth (pixels per day) into the supported range [MIN_DAY_WIDTH, MAX_DAY_WIDTH],
 * rounded to 1 decimal place for crisp layout rendering.
 */
export function clampDayWidth(value: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return DEFAULT_DAY_WIDTH;
  const clamped = Math.min(MAX_DAY_WIDTH, Math.max(MIN_DAY_WIDTH, num));
  return Math.round(clamped * 10) / 10;
}

/**
 * Returns the nominal dayWidth (pixels per day) for a discrete zoom preset.
 */
export function getDayWidthForPreset(zoom: ZoomLevel): number {
  return ZOOM_PRESET_WIDTHS[zoom] ?? DEFAULT_DAY_WIDTH;
}

/**
 * Checks whether a continuous dayWidth matches one of the named presets or is a custom scale.
 */
export function resolveZoomPresetFromDayWidth(dayWidth: number): ZoomLevel | 'custom' {
  const safe = clampDayWidth(dayWidth);
  const presets: ZoomLevel[] = ['day', 'week', 'month', 'quarter'];
  for (const preset of presets) {
    if (Math.abs(safe - ZOOM_PRESET_WIDTHS[preset]) <= 0.6) {
      return preset;
    }
  }
  return 'custom';
}

/**
 * Computes the next dayWidth when zooming via mouse wheel or trackpad gesture.
 * Negative deltaY (wheel up) zooms in (increases dayWidth); positive deltaY (wheel down) zooms out.
 */
export function computeWheelZoomDayWidth(currentDayWidth: number, deltaY: number): number {
  const base = clampDayWidth(currentDayWidth);
  if (!Number.isFinite(deltaY) || deltaY === 0) return base;

  const clampedDelta = Math.max(-120, Math.min(120, deltaY));
  const factor = Math.pow(1.0022, -clampedDelta);
  let next = clampDayWidth(base * factor);

  // Guarantee a minimum 0.2px step on small scales so wheel zoom never stalls due to rounding
  if (next === base && Math.abs(deltaY) >= 4) {
    next = clampDayWidth(base + (deltaY < 0 ? 0.3 : -0.3));
  }

  return next;
}

/**
 * Computes the overall timeline start and end dates (including padding around all items and today)
 * so timeline rendering and scroll-to-fit calculations share the exact same coordinate origin.
 */
export function computeTimelineBounds(
  items: Array<GanttItem | ComputedGanttItem>,
  referenceToday?: Date
): { timelineStart: Date; timelineEnd: Date; totalDays: number } {
  const today = startOfDay(referenceToday || new Date());
  if (!items || items.length === 0) {
    const start = addDays(today, -5);
    const end = addDays(today, 25);
    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: differenceInCalendarDays(end, start) + 1,
    };
  }

  let minDate = parseDateSafe(items[0].startDate);
  let maxDate = parseDateSafe(
    ('slackEndDate' in items[0] && items[0].slackEndDate) || items[0].endDate
  );

  for (const it of items) {
    const s = parseDateSafe(it.startDate);
    const baseEnd = parseDateSafe(it.endDate);
    const slackEnd =
      'slackEndDate' in it && it.slackEndDate
        ? parseDateSafe(it.slackEndDate)
        : addDays(baseEnd, Math.max(0, Number(it.slack) || 0));
    const cpmFloat =
      'cpmTotalFloat' in it && typeof it.cpmTotalFloat === 'number'
        ? it.cpmTotalFloat
        : 0;
    const cpmEnd = addDays(baseEnd, Math.max(0, cpmFloat));

    if (s < minDate) minDate = s;
    if (slackEnd > maxDate) maxDate = slackEnd;
    if (cpmEnd > maxDate) maxDate = cpmEnd;
  }

  if (today < minDate) minDate = today;
  if (today > maxDate) maxDate = today;

  const timelineStart = addDays(minDate, -4);
  const timelineEnd = addDays(maxDate, 12);
  const totalDays = Math.max(1, differenceInCalendarDays(timelineEnd, timelineStart) + 1);

  return { timelineStart, timelineEnd, totalDays };
}

/**
 * Automatically finds the optimal scale (`dayWidth` in px/day) and horizontal scroll position (`scrollLeft`)
 * so that all tasks of a project (or the entire portfolio when `projectId` is 'all' or omitted)
 * fit comfortably inside the visible timeline viewport width.
 */
export function computeFitToProjectScale(
  items: Array<GanttItem | ComputedGanttItem>,
  viewportWidth: number,
  options?: {
    projectId?: string;
    referenceToday?: Date;
    horizontalPaddingPx?: number;
  }
): FitToProjectResult {
  const todayStr = formatDateISO(startOfDay(options?.referenceToday || new Date()));
  const requestedProjectId = options?.projectId || 'all';

  if (!items || items.length === 0) {
    return {
      dayWidth: DEFAULT_DAY_WIDTH,
      scrollLeft: 0,
      spanDays: 1,
      startDate: todayStr,
      endDate: todayStr,
      targetProjectId: requestedProjectId,
    };
  }

  const filtered =
    requestedProjectId !== 'all'
      ? items.filter((it) => it.projectId === requestedProjectId)
      : items;
  const targetItems = filtered.length > 0 ? filtered : items;

  let minStart = parseDateSafe(targetItems[0].startDate);
  let maxEnd = parseDateSafe(targetItems[0].endDate);

  for (const it of targetItems) {
    const s = parseDateSafe(it.startDate);
    const baseEnd = parseDateSafe(it.endDate);
    const withSlack = addDays(baseEnd, Math.max(0, Number(it.slack) || 0));
    if (s < minStart) minStart = s;
    if (withSlack > maxEnd) maxEnd = withSlack;
  }

  const spanDays = Math.max(1, differenceInCalendarDays(maxEnd, minStart) + 1);
  const safeViewport = Math.max(240, Number(viewportWidth) || 960);
  const paddingPx =
    options?.horizontalPaddingPx ??
    Math.min(140, Math.max(56, Math.round(safeViewport * 0.1)));
  const usableWidth = Math.max(180, safeViewport - paddingPx);

  // Add 2 buffer days (1 before start, 1 after end) so bars and labels don't touch the viewport edges
  const rawDayWidth = usableWidth / Math.max(2, spanDays + 2);
  const dayWidth = clampDayWidth(rawDayWidth);

  const { timelineStart } = computeTimelineBounds(items, options?.referenceToday);
  const startOffsetDays = differenceInCalendarDays(minStart, timelineStart);
  const targetStartX = startOffsetDays * dayWidth;
  const leftMarginPx = Math.max(16, Math.min(48, dayWidth * 1.5));
  const scrollLeft = Math.max(0, Math.round(targetStartX - leftMarginPx));

  return {
    dayWidth,
    scrollLeft,
    spanDays,
    startDate: formatDateISO(minStart),
    endDate: formatDateISO(maxEnd),
    targetProjectId: filtered.length > 0 ? requestedProjectId : 'all',
  };
}

export interface OrthogonalPoint {
  x: number;
  y: number;
}

/**
 * Converts a sequence of orthogonal waypoints into an SVG path string ('M ... L ... Q ...')
 * with smooth rounded fillet curves (quadratic bezier 'Q') at every 90-degree corner.
 * If segment lengths are short, the fillet radius is dynamically clamped to prevent overshoot.
 */
export function createRoundedOrthogonalPath(
  rawPoints: OrthogonalPoint[],
  radius = 6
): string {
  if (!rawPoints || rawPoints.length < 2) return '';

  // 1. Filter out duplicate adjacent points
  const points: OrthogonalPoint[] = [rawPoints[0]];
  for (let i = 1; i < rawPoints.length; i++) {
    const prev = points[points.length - 1];
    const curr = rawPoints[i];
    if (Math.abs(curr.x - prev.x) > 0.05 || Math.abs(curr.y - prev.y) > 0.05) {
      points.push(curr);
    }
  }

  if (points.length < 2) return '';

  // 2. Collapse collinear segments (e.g. A -> B -> C in a straight horizontal or vertical line)
  const collapsed: OrthogonalPoint[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = collapsed[collapsed.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    const isCollinearX =
      Math.abs(prev.x - curr.x) < 0.05 &&
      Math.abs(curr.x - next.x) < 0.05 &&
      (curr.y - prev.y) * (next.y - curr.y) > 0;
    const isCollinearY =
      Math.abs(prev.y - curr.y) < 0.05 &&
      Math.abs(curr.y - next.y) < 0.05 &&
      (curr.x - prev.x) * (next.x - curr.x) > 0;

    if (!isCollinearX && !isCollinearY) {
      collapsed.push(curr);
    }
  }
  collapsed.push(points[points.length - 1]);

  if (collapsed.length < 2) return '';
  if (collapsed.length === 2) {
    return `M ${collapsed[0].x.toFixed(1)} ${collapsed[0].y.toFixed(1)} L ${collapsed[1].x.toFixed(1)} ${collapsed[1].y.toFixed(1)}`;
  }

  // 3. Build SVG path with quadratic bezier fillet curves at interior vertices
  let d = `M ${collapsed[0].x.toFixed(1)} ${collapsed[0].y.toFixed(1)}`;

  for (let i = 1; i < collapsed.length - 1; i++) {
    const prev = collapsed[i - 1];
    const curr = collapsed[i];
    const next = collapsed[i + 1];

    const vIn = { x: curr.x - prev.x, y: curr.y - prev.y };
    const dIn = Math.hypot(vIn.x, vIn.y);
    const vOut = { x: next.x - curr.x, y: next.y - curr.y };
    const dOut = Math.hypot(vOut.x, vOut.y);

    if (dIn < 0.1 || dOut < 0.1) {
      d += ` L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
      continue;
    }

    const uIn = { x: vIn.x / dIn, y: vIn.y / dIn };
    const uOut = { x: vOut.x / dOut, y: vOut.y / dOut };

    // Max fillet radius cannot exceed half of incoming or outgoing segment length
    const isOrthogonal = Math.abs(uIn.x * uOut.x + uIn.y * uOut.y) < 0.05;
    const r = Math.min(radius, dIn / 2, dOut / 2);

    if (r <= 0.8 || !isOrthogonal) {
      d += ` L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    } else {
      const pBefore = {
        x: curr.x - uIn.x * r,
        y: curr.y - uIn.y * r,
      };
      const pAfter = {
        x: curr.x + uOut.x * r,
        y: curr.y + uOut.y * r,
      };
      d += ` L ${pBefore.x.toFixed(1)} ${pBefore.y.toFixed(1)}`;
      d += ` Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}, ${pAfter.x.toFixed(1)} ${pAfter.y.toFixed(1)}`;
    }
  }

  const last = collapsed[collapsed.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

  return d;
}

/**
 * Imports and normalizes JSON payloads of various formats:
 * 1. GanttFlow Scenario export ({ id, name, projectName, projects, items })
 * 2. GanttFlow Workspace backup ({ activeScenarioId, savedScenarios: [...] })
 * 3. Array of scenarios ([ { name, items }, ... ])
 * 4. Array of items/tasks ([ { name, startDate, duration }, ... ])
 * 5. Scenario with `tasks` instead of `items` ({ name, tasks: [...] })
 * 6. Wrapped payload ({ data: ... } or { project: { tasks: [...] } })
 */
export function importGanttData(rawJson: unknown): GanttImportResult {
  let parsedJson = rawJson;
  if (typeof parsedJson === 'string') {
    const cleanStr = parsedJson.replace(/^\uFEFF/, '').trim();
    if (!cleanStr) {
      throw new Error('El archivo está vacío.');
    }
    parsedJson = JSON.parse(cleanStr);
  }

  if (!parsedJson || (typeof parsedJson !== 'object' && !Array.isArray(parsedJson))) {
    throw new Error('El archivo no contiene un objeto o arreglo JSON válido.');
  }

  let payload = parsedJson as Record<string, unknown>;

  // Unwrap { data: ... } if applicable
  if (
    !Array.isArray(payload) &&
    payload.data &&
    (typeof payload.data === 'object' || Array.isArray(payload.data)) &&
    !payload.items &&
    !payload.tasks &&
    !payload.savedScenarios &&
    !payload.scenarios
  ) {
    payload = payload.data as Record<string, unknown>;
  }

  // Case 1: Workspace backup with savedScenarios / scenarios
  const potentialScenarios =
    !Array.isArray(payload) &&
    (Array.isArray(payload.savedScenarios)
      ? payload.savedScenarios
      : Array.isArray(payload.scenarios)
      ? payload.scenarios
      : null);

  if (potentialScenarios) {
    if (potentialScenarios.length === 0) {
      throw new Error('El archivo de respaldo no contiene escenarios guardados.');
    }

    const sanitizedScenarios = potentialScenarios
      .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
      .map((s, idx) => {
        const sItems = (s.items || s.tasks || []) as Partial<GanttItem>[];
        const sProjects = (s.projects || []) as Partial<GanttProject>[];
        const cleanProjects = sProjects.map((p, pIdx) => sanitizeProject(p, pIdx));
        const cleanItems = sItems.map((it, itIdx) => sanitizeGanttItem(it, itIdx));
        return sanitizeScenario(
          {
            ...s,
            name:
              typeof s.name === 'string' && s.name.trim()
                ? s.name.trim()
                : typeof s.projectName === 'string' && s.projectName.trim()
                ? s.projectName.trim()
                : `Escenario ${idx + 1}`,
            projects: cleanProjects,
            items: cleanItems,
          },
          idx
        );
      });

    if (sanitizedScenarios.length === 0) {
      throw new Error('El archivo no contiene ningún escenario con tareas válidas.');
    }

    const activeId =
      typeof payload.activeScenarioId === 'string' && payload.activeScenarioId
        ? payload.activeScenarioId
        : sanitizedScenarios[0].id;
    const primary =
      sanitizedScenarios.find((s) => s.id === activeId) || sanitizedScenarios[0];

    return {
      primaryScenario: primary,
      allScenarios: sanitizedScenarios,
    };
  }

  // Case 2: Array of scenarios
  if (
    Array.isArray(payload) &&
    payload.length > 0 &&
    payload.every(
      (s) =>
        typeof s === 'object' &&
        s !== null &&
        (Array.isArray(s.items) || Array.isArray(s.tasks))
    )
  ) {
    const sanitizedScenarios = payload.map((s, idx) => {
      const sItems = (s.items || s.tasks || []) as Partial<GanttItem>[];
      const sProjects = (s.projects || []) as Partial<GanttProject>[];
      const cleanProjects = sProjects.map((p, pIdx) => sanitizeProject(p, pIdx));
      const cleanItems = sItems.map((it, itIdx) => sanitizeGanttItem(it, itIdx));
      return sanitizeScenario(
        {
          ...s,
          name:
            typeof s.name === 'string' && s.name.trim()
              ? s.name.trim()
              : typeof s.projectName === 'string' && s.projectName.trim()
              ? s.projectName.trim()
              : `Escenario ${idx + 1}`,
          projects: cleanProjects,
          items: cleanItems,
        },
        idx
      );
    });

    return {
      primaryScenario: sanitizedScenarios[0],
      allScenarios: sanitizedScenarios,
    };
  }

  // Case 3: Direct array of tasks/items
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      throw new Error('El archivo contiene una lista vacía de tareas.');
    }

    const cleanItems = payload.map((it, idx) =>
      sanitizeGanttItem(it as Partial<GanttItem>, idx)
    );

    const importedScenario = sanitizeScenario({
      id: `scen-${Date.now()}-imp`,
      name: 'Tareas Importadas',
      items: cleanItems,
      updatedAt: new Date().toISOString(),
    });

    return { primaryScenario: importedScenario };
  }

  // Case 4: Single scenario object
  // Unwrap project sub-object if present: { project: { name: "...", tasks: [...] } }
  if (
    payload.project &&
    typeof payload.project === 'object' &&
    !payload.items &&
    !payload.tasks
  ) {
    payload = {
      ...(payload.project as Record<string, unknown>),
      ...payload,
    };
  }

  const rawItems = payload.items || payload.tasks;
  if (Array.isArray(rawItems)) {
    const importedName =
      String(payload.projectName || payload.name || 'Escenario Importado').trim() ||
      'Escenario Importado';
    const cleanItems = (rawItems as Partial<GanttItem>[]).map((raw, idx) =>
      sanitizeGanttItem(raw, idx)
    );
    const baseProjects =
      Array.isArray(payload.projects) && payload.projects.length > 0
        ? (payload.projects as Partial<GanttProject>[]).map((p, idx) =>
            sanitizeProject(p, idx)
          )
        : undefined;

    const customId =
      typeof payload.id === 'string' &&
      payload.id.trim() &&
      !payload.id.startsWith('template:')
        ? payload.id.trim()
        : `scen-${Date.now()}-imp`;

    const importedScenario = sanitizeScenario({
      id: customId,
      name: importedName,
      projects: baseProjects,
      items: cleanItems,
      updatedAt: new Date().toISOString(),
    });

    return { primaryScenario: importedScenario };
  }

  throw new Error(
    'Formato JSON no compatible. El archivo debe contener una lista de tareas, proyectos o un escenario de GanttFlow.'
  );
}

/**
 * Parses and normalizes CSV/TSV text into a Gantt scenario.
 * Supports standard GanttFlow CSV export format, European semicolon CSVs,
 * tab-delimited files, MS Project exports, and generic task spreadsheets.
 */
export function parseCSVToGanttData(csvText: string, fileName?: string): GanttImportResult {
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) {
    throw new Error('El archivo CSV está vacío o solo contiene encabezados.');
  }

  // Detect delimiter (, or ; or \t)
  function detectDelimiter(headerLine: string): string {
    let inQuotes = false;
    let commas = 0;
    let semicolons = 0;
    let tabs = 0;
    for (let i = 0; i < headerLine.length; i++) {
      const ch = headerLine[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (!inQuotes) {
        if (ch === ',') commas++;
        else if (ch === ';') semicolons++;
        else if (ch === '\t') tabs++;
      }
    }
    if (tabs > commas && tabs > semicolons) return '\t';
    if (semicolons > commas) return ';';
    return ',';
  }

  const delimiter = detectDelimiter(lines[0]);

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  const rawHeaders = parseCSVLine(lines[0]).map((h) => h.toLowerCase());

  const wbsIdx = rawHeaders.findIndex(
    (h) => h.includes('wbs') || h.includes('edt') || h.includes('código') || h.includes('codigo')
  );
  const idIdx = rawHeaders.findIndex(
    (h) =>
      h === 'id' ||
      h.startsWith('id ') ||
      h.endsWith(' id') ||
      h.includes('task_id') ||
      h.includes('task id') ||
      h.includes('identificador')
  );
  const nameIdx = rawHeaders.findIndex(
    (h) =>
      h.includes('nom') ||
      h.includes('name') ||
      h.includes('tarea') ||
      h.includes('task') ||
      h.includes('actividad') ||
      h.includes('concepto')
  );
  const projIdx = rawHeaders.findIndex(
    (h) =>
      h.includes('proy') ||
      h.includes('proj') ||
      h.includes('fase') ||
      h.includes('etapa') ||
      h.includes('grupo')
  );
  const typeIdx = rawHeaders.findIndex((h) => h.includes('tip') || h.includes('type'));
  const startIdx = rawHeaders.findIndex(
    (h) =>
      h.includes('ini') ||
      h.includes('start') ||
      h.includes('comienz') ||
      h.includes('begin') ||
      h.includes('desde')
  );
  const endIdx = rawHeaders.findIndex(
    (h) =>
      h.includes('fin') ||
      h.includes('end') ||
      h.includes('termin') ||
      h.includes('venc') ||
      h.includes('hasta')
  );
  const durIdx = rawHeaders.findIndex(
    (h) => h.includes('dur') || h.includes('dias') || h.includes('days')
  );
  const slackIdx = rawHeaders.findIndex(
    (h) => h.includes('slack') || h.includes('holgura') || h.includes('buffer')
  );
  const depIdx = rawHeaders.findIndex(
    (h) => h.includes('dep') || h.includes('pred') || h.includes('ant')
  );
  const progIdx = rawHeaders.findIndex(
    (h) => h.includes('prog') || h.includes('%') || h.includes('complet')
  );
  const assigneeIdx = rawHeaders.findIndex(
    (h) =>
      h.includes('resp') ||
      h.includes('assign') ||
      h.includes('owner') ||
      h.includes('recurso')
  );
  const notesIdx = rawHeaders.findIndex(
    (h) =>
      h.includes('not') ||
      h.includes('desc') ||
      h.includes('coment') ||
      h.includes('observ')
  );

  interface RawCsvRow {
    assignedId: string;
    originalId?: string;
    wbsCode?: string;
    name: string;
    type: 'task' | 'milestone';
    startDate: string;
    endDate?: string;
    duration: number;
    slack: number;
    rawDeps: string[];
    progress: number;
    assignee?: string;
    notes?: string;
    projectId: string;
    rowIndex: number;
  }

  const projectMap = new Map<string, GanttProject>();
  const rawRows: RawCsvRow[] = [];
  const aliasToId = new Map<string, string>();
  const nowStamp = Date.now();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length === 0 || cols.every((c) => !c)) continue;

    const projName = (projIdx >= 0 ? cols[projIdx].trim() : '') || 'General';
    let projId = 'proj-default';
    if (projName) {
      projId = `proj-${projName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      if (!projId || projId === 'proj-') {
        projId = `proj-${projectMap.size + 1}`;
      }
      if (!projectMap.has(projId)) {
        projectMap.set(
          projId,
          sanitizeProject({ id: projId, name: projName }, projectMap.size)
        );
      }
    }

    const rawType = (typeIdx >= 0 ? cols[typeIdx] : '').toLowerCase();
    const rawDurStr = durIdx >= 0 && cols[durIdx] ? cols[durIdx].replace(/[^\d.]/g, '') : '';
    const parsedDur = rawDurStr ? Number(rawDurStr) : undefined;
    const isExplicitMilestone = rawType.includes('hito') || rawType.includes('milestone');
    const isMilestone = isExplicitMilestone || parsedDur === 0;

    const originalId = idIdx >= 0 && cols[idIdx] ? cols[idIdx].trim() : undefined;
    const wbsCode = wbsIdx >= 0 && cols[wbsIdx] ? cols[wbsIdx].trim() : undefined;
    const name = (nameIdx >= 0 ? cols[nameIdx].trim() : '') || `Tarea ${i}`;
    const startDate = (startIdx >= 0 ? cols[startIdx].trim() : '') || formatDateISO(new Date());
    const endDate = endIdx >= 0 && cols[endIdx] ? cols[endIdx].trim() : undefined;
    const duration = isMilestone ? 0 : parsedDur !== undefined ? parsedDur : 1;
    const slack = slackIdx >= 0 && cols[slackIdx] ? Number(cols[slackIdx]) || 0 : 0;
    const rawProg = progIdx >= 0 ? cols[progIdx] : '0';
    const progress = Number(rawProg.replace('%', '')) || 0;
    const assignee = assigneeIdx >= 0 && cols[assigneeIdx] ? cols[assigneeIdx].trim() : undefined;
    const notes = notesIdx >= 0 && cols[notesIdx] ? cols[notesIdx].trim() : undefined;

    const rawDeps =
      depIdx >= 0 && cols[depIdx]
        ? cols[depIdx]
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    const assignedId =
      originalId || `${isMilestone ? 'm' : 't'}-${i}-${nowStamp}`;

    const itemRowIdx = rawRows.length + 1;

    // Register lookup aliases for dependency resolution
    aliasToId.set(assignedId.toLowerCase(), assignedId);
    if (originalId) {
      aliasToId.set(originalId.toLowerCase(), assignedId);
    }
    if (wbsCode) {
      aliasToId.set(wbsCode.toLowerCase(), assignedId);
      aliasToId.set(wbsCode.toLowerCase().replace(/\.$/, ''), assignedId);
    }
    aliasToId.set(String(itemRowIdx), assignedId);
    if (name) {
      aliasToId.set(name.toLowerCase(), assignedId);
    }

    rawRows.push({
      assignedId,
      originalId,
      wbsCode,
      name,
      type: isMilestone ? 'milestone' : 'task',
      startDate,
      endDate,
      duration,
      slack,
      rawDeps,
      progress,
      assignee,
      notes,
      projectId: projId,
      rowIndex: rawRows.length,
    });
  }

  if (rawRows.length === 0) {
    throw new Error('No se encontraron filas de tareas válidas en el CSV.');
  }

  // Second pass: resolve dependencies and dependency types
  const items: GanttItem[] = [];

  for (const row of rawRows) {
    const resolvedDeps: string[] = [];
    const depTypes: Record<string, DependencyType> = {};

    for (const rawDep of row.rawDeps) {
      const depToken = rawDep.trim();
      if (!depToken) continue;

      let depType: DependencyType = 'FS';
      const typeMatch = depToken.match(/\b(FS|SS|FF|SF)\b/i);
      if (typeMatch) {
        depType = typeMatch[1].toUpperCase() as DependencyType;
      }

      const cleanToken = depToken
        .replace(/\s*\((FS|SS|FF|SF)\)/i, '')
        .replace(/\s*(FS|SS|FF|SF)$/i, '')
        .replace(/\+[0-9]+[a-z]?$/i, '')
        .trim()
        .toLowerCase();

      const targetId = aliasToId.get(cleanToken);
      if (targetId && targetId !== row.assignedId && !resolvedDeps.includes(targetId)) {
        resolvedDeps.push(targetId);
        if (depType !== 'FS') {
          depTypes[targetId] = depType;
        }
      }
    }

    const item = sanitizeGanttItem(
      {
        id: row.assignedId,
        name: row.name,
        type: row.type,
        startDate: row.startDate,
        endDate: row.endDate,
        duration: row.duration,
        slack: row.slack,
        dependencies: resolvedDeps,
        dependencyTypes: Object.keys(depTypes).length > 0 ? depTypes : undefined,
        progress: row.progress,
        assignee: row.assignee,
        notes: row.notes,
        projectId: row.projectId,
      },
      row.rowIndex
    );
    items.push(item);
  }

  const scenarioName = fileName
    ? fileName.replace(/\.[^/.]+$/, '').replace(/-gantt$/i, '')
    : 'CSV Importado';

  const importedScenario = sanitizeScenario({
    id: `scen-${nowStamp}-imp`,
    name: scenarioName,
    projects: Array.from(projectMap.values()),
    items,
    updatedAt: new Date().toISOString(),
  });

  return { primaryScenario: importedScenario };
}



