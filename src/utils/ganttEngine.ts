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
  ComputedReleaseGroup,
  DependencyType,
  FitToProjectResult,
  FocusEntity,
  GanttImportResult,
  GanttItem,
  GanttProject,
  ProjectPlatform,
  ProjectTemplate,
  Release,
  SavedScenario,
  TaskColor,
  ZoomLevel,
} from '../types/gantt';
import {
  checkTaskReleaseCompliance,
  DEFAULT_PREDEFINED_RELEASES,
  getReleaseDateSpan,
} from './releaseEngine';

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
  'teal',
  'orange',
  'pink',
  'slate',
  'sky',
  'lime',
]);

export const TEAM_COLOR_PALETTE: TaskColor[] = [
  'cyan',
  'violet',
  'blue',
  'emerald',
  'amber',
  'rose',
  'indigo',
];

/**
 * Deterministically resolves a distinct TaskColor for a team/assignee name.
 * Well-known software engineering roles receive intuitive distinct colors.
 */
export function getTeamColor(teamName?: string | null): TaskColor {
  if (!teamName || !teamName.trim()) {
    return 'indigo';
  }
  const clean = teamName.trim().toLowerCase();

  // Keyword-based matching for common software engineering disciplines
  if (/\b(qa|test|testing|calidad|pruebas|tester|qa lead)\b/.test(clean) || clean.includes('qa')) {
    return 'cyan';
  }
  if (/\b(front|frontend|front-end|ui|ux|design|diseño|web)\b/.test(clean)) {
    return 'violet';
  }
  if (/\b(back|backend|back-end|api|core|server|servicios|datos|db|database|dba)\b/.test(clean)) {
    return 'blue';
  }
  if (/\b(devops|infra|infrastructure|cloud|sre|ops|sysadmin|sistemas|plataforma)\b/.test(clean)) {
    return 'emerald';
  }
  if (/\b(pm|product|producto|lead|gestion|gestión|scrum|manager|owner|dirección|direccion)\b/.test(clean)) {
    return 'amber';
  }
  if (/\b(sec|security|seguridad|ciso|audit|legal)\b/.test(clean)) {
    return 'rose';
  }

  // Consistent hash across vivid colors so each arbitrary team gets a distinct color
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  }
  const vividPalette: TaskColor[] = ['cyan', 'violet', 'blue', 'emerald', 'amber', 'rose'];
  return vividPalette[hash % vividPalette.length];
}

/**
 * Returns the effective color for an item, taking into account team assignment
 * when no custom non-default color is set.
 */
export function getItemEffectiveColor(item: {
  type?: 'task' | 'milestone';
  color?: TaskColor;
  assignee?: string;
  customColor?: boolean;
}): TaskColor {
  if (item.type === 'milestone') {
    return item.color || 'amber';
  }
  if (item.customColor && item.color && VALID_COLORS.has(item.color)) {
    return item.color;
  }
  if (item.color && item.color !== 'indigo' && VALID_COLORS.has(item.color)) {
    return item.color;
  }
  if (item.assignee && item.assignee.trim()) {
    return getTeamColor(item.assignee);
  }
  return item.color && VALID_COLORS.has(item.color) ? item.color : 'indigo';
}

export const DEMO_PROJECT_IDS = new Set<string>([
  'proj-discovery',
  'proj-core',
  'proj-release',
  'proj-cloud-foundation',
  'proj-cloud-cutover',
  'proj-init',
  'proj-exec',
]);

export const DEMO_SCENARIO_IDS = new Set<string>([
  'scen-saas-v2',
  'saas-launch',
  'cloud-migration',
  'blank-project',
]);

export function isDemoProject(raw?: Partial<GanttProject> | null): boolean {
  if (!raw) return false;
  if (typeof raw.isDemo === 'boolean') return raw.isDemo;
  const rawId = raw.id != null ? String(raw.id).trim() : '';
  if (rawId && DEMO_PROJECT_IDS.has(rawId)) return true;
  return false;
}

export function isDemoScenario(raw?: Partial<SavedScenario> | null): boolean {
  if (!raw) return false;
  if (Array.isArray(raw.projects) && raw.projects.length > 0) {
    const hasExplicitFlags = raw.projects.some((p) => typeof p?.isDemo === 'boolean');
    if (hasExplicitFlags) {
      return raw.projects.every((p) => isDemoProject(p));
    }
  }
  if (typeof raw.isDemo === 'boolean') return raw.isDemo;
  const rawId = raw.id != null ? String(raw.id).trim() : '';
  if (rawId && (DEMO_SCENARIO_IDS.has(rawId) || rawId.startsWith('template:'))) {
    return true;
  }
  return false;
}

export function normalizePlatform(
  raw?: string | null
): ProjectPlatform | undefined {
  if (!raw) return undefined;
  const trimmed = String(raw).trim();
  if (trimmed === 'iOS') return 'iOS';
  if (trimmed === 'Android') return 'Android';
  if (trimmed === 'iOS/Android' || trimmed === 'Multiplataforma') return 'iOS/Android';
  return undefined;
}

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
  const id = rawId || `proj-${fallbackIndex + 1}-${Date.now()}`;
  const platform = normalizePlatform(raw.platform as string | undefined);

  let projectIndex: number | undefined;
  if (
    typeof raw.projectIndex === 'number' &&
    Number.isFinite(raw.projectIndex) &&
    raw.projectIndex >= 1
  ) {
    projectIndex = Math.round(raw.projectIndex);
  } else {
    const idMatch = rawId.match(/^(?:proj-|p)(\d+)$/i);
    if (idMatch) {
      const parsedIdx = Number(idMatch[1]);
      if (Number.isFinite(parsedIdx) && parsedIdx >= 1 && parsedIdx <= 9999) {
        projectIndex = parsedIdx;
      }
    }
  }

  return {
    id,
    ...(projectIndex ? { projectIndex } : {}),
    name: rawName || `Proyecto ${fallbackIndex + 1}`,
    color,
    description: raw.description != null ? String(raw.description).trim() : undefined,
    releaseId: raw.releaseId != null ? String(raw.releaseId).trim() || undefined : undefined,
    platform,
    collapsed: Boolean(raw.collapsed),
    isDemo: isDemoProject({ ...raw, id }),
  };
}

/**
 * Returns true if a task is of type DIGI or SCR (by task name or assignee),
 * meaning it is associated with a release and aligns with its release dates.
 */
export function isReleaseAssociatedTask(
  item: { name?: string; assignee?: string } | null | undefined
): boolean {
  if (!item) return false;
  const normName = String(item.name || '').trim().toUpperCase();
  const normAssignee = String(item.assignee || '').trim().toUpperCase();
  return (
    normName === 'DIGI' ||
    normName === 'SCR' ||
    normAssignee === 'DIGI' ||
    normAssignee === 'SCR'
  );
}

/**
 * Propagates releaseId and/or platform changes from a parent project to its child tasks.
 * Child tasks can subsequently override their own releaseId or platform independently.
 */
export function propagateProjectChangesToItems(
  prevProject: GanttProject | undefined,
  updatedProject: GanttProject,
  items: GanttItem[],
  releases: Release[] = [],
  forcePropagate?: { release?: boolean; platform?: boolean }
): GanttItem[] {
  const prevReleaseId = prevProject?.releaseId || undefined;
  const nextReleaseId = updatedProject.releaseId || undefined;
  const prevPlatform = prevProject?.platform || undefined;
  const nextPlatform = updatedProject.platform || undefined;

  const releaseChanged = forcePropagate?.release ?? prevReleaseId !== nextReleaseId;
  const platformChanged = forcePropagate?.platform ?? prevPlatform !== nextPlatform;

  if (!releaseChanged && !platformChanged) {
    return items;
  }

  const targetRel = nextReleaseId
    ? releases.find((r) => r.id === nextReleaseId)
    : undefined;
  const relSpan = targetRel ? getReleaseDateSpan(targetRel) : null;

  let anyModified = false;
  const nextItems = items.map((it) => {
    if (it.projectId !== updatedProject.id) return it;
    let updated: GanttItem = { ...it };
    let changed = false;

    if (releaseChanged) {
      updated.releaseId = nextReleaseId;
      changed = true;
      if (relSpan && isReleaseAssociatedTask(updated)) {
        updated.startDate = relSpan.startDate;
        updated.endDate = relSpan.endDate;
        updated.duration = Math.max(
          1,
          calculateDurationFromDates(relSpan.startDate, relSpan.endDate, 'task')
        );
      }
    }

    if (platformChanged) {
      updated.platform = nextPlatform;
      changed = true;
    }

    if (changed) {
      anyModified = true;
      return updated;
    }
    return it;
  });

  return anyModified ? nextItems : items;
}

/**
 * Reorders a project up or down within its release group while keeping every project's
 * unique ID and fixed projectIndex completely invariant.
 */
export function reorderProject(
  projects: GanttProject[],
  projectId: string,
  direction: 'up' | 'down'
): GanttProject[] {
  const usedIndices = new Set<number>();
  for (const p of projects) {
    if (typeof p.projectIndex === 'number' && p.projectIndex >= 1) {
      usedIndices.add(Math.round(p.projectIndex));
    }
  }
  let nextIdx = 1;
  const stamped = projects.map((p) => {
    if (typeof p.projectIndex === 'number' && p.projectIndex >= 1) {
      return p;
    }
    while (usedIndices.has(nextIdx)) {
      nextIdx++;
    }
    usedIndices.add(nextIdx);
    return { ...p, projectIndex: nextIdx };
  });

  const idx = stamped.findIndex((p) => p.id === projectId);
  if (idx === -1) return stamped;

  const targetProj = stamped[idx];
  const targetRelId = targetProj.releaseId || '';

  const sameReleaseIndices: number[] = [];
  stamped.forEach((p, i) => {
    if ((p.releaseId || '') === targetRelId) {
      sameReleaseIndices.push(i);
    }
  });

  const posInRel = sameReleaseIndices.indexOf(idx);
  if (posInRel === -1) return stamped;

  const swapPosInRel = direction === 'up' ? posInRel - 1 : posInRel + 1;
  if (swapPosInRel < 0 || swapPosInRel >= sameReleaseIndices.length) return stamped;

  const swapGlobalIdx = sameReleaseIndices[swapPosInRel];
  const next = [...stamped];
  const temp = next[idx];
  next[idx] = next[swapGlobalIdx];
  next[swapGlobalIdx] = temp;
  return next;
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

  const rawColor = raw.color && VALID_COLORS.has(raw.color) ? raw.color : undefined;
  const rawAssignee = raw.assignee != null ? String(raw.assignee).trim() : undefined;
  const isCustomColor = Boolean(raw.customColor);

  let color: TaskColor;
  if (type === 'milestone') {
    color = rawColor || 'amber';
  } else if (isCustomColor && rawColor) {
    color = rawColor;
  } else if (rawColor && rawColor !== 'indigo') {
    // Custom non-default color explicitly chosen
    color = rawColor;
  } else if (rawAssignee) {
    // Default distinct color assigned per team
    color = getTeamColor(rawAssignee);
  } else {
    color = rawColor || 'indigo';
  }

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
    name:
      raw.name != null
        ? String(raw.name)
        : fallbackIndex >= 0
        ? `Elemento ${fallbackIndex + 1}`
        : 'Tarea',
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
    ...(isCustomColor ? { customColor: true } : {}),
    assignee: raw.assignee != null ? String(raw.assignee).trim() : undefined,
    notes: raw.notes != null ? String(raw.notes).trim() : undefined,
    hidden: Boolean(raw.hidden),
    ...(raw.isExternal ? { isExternal: true } : {}),
    platform: normalizePlatform(raw.platform as string | undefined),
    releaseId:
      raw.releaseId != null && String(raw.releaseId).trim()
        ? String(raw.releaseId).trim()
        : undefined,
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

export type DependencyMutationError = 'self' | 'duplicate' | 'cycle' | 'not_found';

/**
 * Adds a dependency link (predId -> succId) with cycle detection and optional date cascading.
 */
export function addDependencyLink(
  items: GanttItem[],
  predId: string,
  succId: string,
  depType: DependencyType = 'FS',
  cascade = false
): { items: GanttItem[]; added: boolean; error?: DependencyMutationError } {
  const cleanPredId = (predId || '').trim();
  const cleanSuccId = (succId || '').trim();
  if (!cleanPredId || !cleanSuccId) {
    return { items, added: false, error: 'not_found' };
  }
  if (cleanPredId === cleanSuccId) {
    return { items, added: false, error: 'self' };
  }

  const predExists = items.some((it) => it.id === cleanPredId);
  const succItem = items.find((it) => it.id === cleanSuccId);
  if (!predExists || !succItem) {
    return { items, added: false, error: 'not_found' };
  }

  if (succItem.dependencies.includes(cleanPredId)) {
    return { items, added: false, error: 'duplicate' };
  }

  if (wouldCreateCycle(items, cleanSuccId, cleanPredId)) {
    return { items, added: false, error: 'cycle' };
  }

  const nextTypes: Record<string, DependencyType> = {
    ...(succItem.dependencyTypes || {}),
  };
  if (depType && depType !== 'FS') {
    nextTypes[cleanPredId] = depType;
  } else {
    delete nextTypes[cleanPredId];
  }

  const updatedSucc = sanitizeGanttItem({
    ...succItem,
    dependencies: [...succItem.dependencies, cleanPredId],
    dependencyTypes: Object.keys(nextTypes).length > 0 ? nextTypes : undefined,
  });

  const nextItems = items.map((it) =>
    it.id === cleanSuccId ? updatedSucc : sanitizeGanttItem(it)
  );
  return {
    items: cascade ? cascadeDependencies(nextItems) : nextItems,
    added: true,
  };
}

/**
 * Removes an existing dependency link (predId -> succId) and optionally cascades dates.
 */
export function removeDependencyLink(
  items: GanttItem[],
  predId: string,
  succId: string,
  cascade = false
): { items: GanttItem[]; removed: boolean } {
  const cleanPredId = (predId || '').trim();
  const cleanSuccId = (succId || '').trim();
  if (!cleanPredId || !cleanSuccId) {
    return { items, removed: false };
  }

  const succItem = items.find((it) => it.id === cleanSuccId);
  if (!succItem || !succItem.dependencies.includes(cleanPredId)) {
    return { items, removed: false };
  }

  const nextDeps = succItem.dependencies.filter((d) => d !== cleanPredId);
  const nextTypes: Record<string, DependencyType> = {
    ...(succItem.dependencyTypes || {}),
  };
  delete nextTypes[cleanPredId];

  const updatedSucc = sanitizeGanttItem({
    ...succItem,
    dependencies: nextDeps,
    dependencyTypes: Object.keys(nextTypes).length > 0 ? nextTypes : undefined,
  });

  const nextItems = items.map((it) =>
    it.id === cleanSuccId ? updatedSucc : sanitizeGanttItem(it)
  );
  return {
    items: cascade ? cascadeDependencies(nextItems) : nextItems,
    removed: true,
  };
}

/**
 * Updates the dependency type (FS, SS, FF, SF) of an existing dependency link (predId -> succId).
 */
export function updateDependencyLinkType(
  items: GanttItem[],
  predId: string,
  succId: string,
  depType: DependencyType,
  cascade = false
): { items: GanttItem[]; updated: boolean } {
  const cleanPredId = (predId || '').trim();
  const cleanSuccId = (succId || '').trim();
  const succItem = items.find((it) => it.id === cleanSuccId);
  if (!succItem || !succItem.dependencies.includes(cleanPredId)) {
    return { items, updated: false };
  }

  const nextTypes: Record<string, DependencyType> = {
    ...(succItem.dependencyTypes || {}),
  };
  if (depType && depType !== 'FS') {
    nextTypes[cleanPredId] = depType;
  } else {
    delete nextTypes[cleanPredId];
  }

  const updatedSucc = sanitizeGanttItem({
    ...succItem,
    dependencyTypes: Object.keys(nextTypes).length > 0 ? nextTypes : undefined,
  });

  const nextItems = items.map((it) =>
    it.id === cleanSuccId ? updatedSucc : sanitizeGanttItem(it)
  );
  return {
    items: cascade ? cascadeDependencies(nextItems) : nextItems,
    updated: true,
  };
}

/**
 * Moves / reconnects an existing dependency link from (oldPredId -> oldSuccId)
 * to (newPredId -> newSuccId), preserving its dependency type (or applying depType)
 * and validating against self-dependencies, duplicates, and cycles.
 */
export function moveDependencyLink(
  items: GanttItem[],
  oldPredId: string,
  oldSuccId: string,
  newPredId: string,
  newSuccId: string,
  depType?: DependencyType,
  cascade = false
): { items: GanttItem[]; moved: boolean; error?: DependencyMutationError } {
  const cOldPred = (oldPredId || '').trim();
  const cOldSucc = (oldSuccId || '').trim();
  const cNewPred = (newPredId || '').trim();
  const cNewSucc = (newSuccId || '').trim();

  if (!cOldPred || !cOldSucc || !cNewPred || !cNewSucc) {
    return { items, moved: false, error: 'not_found' };
  }
  if (cNewPred === cNewSucc) {
    return { items, moved: false, error: 'self' };
  }

  const oldSuccItem = items.find((it) => it.id === cOldSucc);
  const newPredExists = items.some((it) => it.id === cNewPred);
  const newSuccExists = items.some((it) => it.id === cNewSucc);

  if (
    !oldSuccItem ||
    !oldSuccItem.dependencies.includes(cOldPred) ||
    !newPredExists ||
    !newSuccExists
  ) {
    return { items, moved: false, error: 'not_found' };
  }

  const resolvedDepType: DependencyType =
    depType || oldSuccItem.dependencyTypes?.[cOldPred] || 'FS';

  if (cOldPred === cNewPred && cOldSucc === cNewSucc) {
    const currentType = oldSuccItem.dependencyTypes?.[cOldPred] || 'FS';
    if (depType && depType !== currentType) {
      const updated = updateDependencyLinkType(
        items,
        cOldPred,
        cOldSucc,
        depType,
        cascade
      );
      return { items: updated.items, moved: updated.updated };
    }
    return { items, moved: false };
  }

  // 1. Remove old link first so cycle detection evaluates the resulting graph accurately
  const removedStep = removeDependencyLink(items, cOldPred, cOldSucc, false);
  if (!removedStep.removed) {
    return { items, moved: false, error: 'not_found' };
  }

  // 2. Add new link on the intermediate graph
  const addedStep = addDependencyLink(
    removedStep.items,
    cNewPred,
    cNewSucc,
    resolvedDepType,
    cascade
  );
  if (!addedStep.added) {
    return { items, moved: false, error: addedStep.error };
  }

  return { items: addedStep.items, moved: true };
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

  const usedIndices = new Set<number>();
  for (const p of effectiveProjects) {
    if (typeof p.projectIndex === 'number' && p.projectIndex >= 1) {
      usedIndices.add(Math.round(p.projectIndex));
    }
  }
  let nextAvailableIdx = 1;
  for (const p of effectiveProjects) {
    if (typeof p.projectIndex === 'number' && p.projectIndex >= 1) {
      p.projectIndex = Math.round(p.projectIndex);
    } else {
      while (usedIndices.has(nextAvailableIdx)) {
        nextAvailableIdx++;
      }
      p.projectIndex = nextAvailableIdx;
      usedIndices.add(nextAvailableIdx);
    }
  }

  const todayStr = formatDateISO(new Date());

  return effectiveProjects.map((project, pIdx) => {
    const projectIndex = project.projectIndex || pIdx + 1;
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
 * Groups projects and items hierarchically by Release (Release > Project > Tasks).
 */
export function groupItemsByReleaseAndProject(
  items: ComputedGanttItem[],
  projects: GanttProject[] = [],
  releases: Release[] = []
): ComputedReleaseGroup[] {
  const projectGroups = groupItemsByProject(items, projects);
  const releaseMap = new Map<string, Release>();
  for (const r of releases) {
    releaseMap.set(r.id, r);
  }

  const releaseBuckets = new Map<string, ComputedProjectGroup[]>();
  for (const rel of releases) {
    releaseBuckets.set(rel.id, []);
  }
  const unassignedKey = '__unassigned__';
  releaseBuckets.set(unassignedKey, []);

  for (const pg of projectGroups) {
    const relId =
      pg.project.releaseId && releaseMap.has(pg.project.releaseId)
        ? pg.project.releaseId
        : unassignedKey;
    releaseBuckets.get(relId)!.push(pg);
  }

  const result: ComputedReleaseGroup[] = [];

  for (const rel of releases) {
    const pgs = releaseBuckets.get(rel.id) || [];
    if (pgs.length === 0) continue;

    const hasMilestones = Boolean(rel.milestones && rel.milestones.some((m) => Boolean(m.date)));
    const relSpan = getReleaseDateSpan(rel);

    // A release is always indicated with its full duration, spanning from its first milestone to its last milestone
    let minStart = hasMilestones ? relSpan.startDate : (pgs[0]?.startDate || relSpan.startDate);
    let maxEnd = hasMilestones ? relSpan.endDate : (pgs[0]?.endDate || relSpan.endDate);
    let totalItems = 0;
    let totalProgressSum = 0;
    let tasksCount = 0;
    let milestonesCount = 0;
    let violationsCount = 0;

    for (const pg of pgs) {
      if (pg.startDate && pg.startDate < minStart) minStart = pg.startDate;
      if (pg.endDate && pg.endDate > maxEnd) maxEnd = pg.endDate;
      tasksCount += pg.tasksCount;
      milestonesCount += pg.milestonesCount;
      totalItems += pg.items.length;
      totalProgressSum += pg.progress * (pg.items.length || 1);

      for (const it of pg.items) {
        const violations = checkTaskReleaseCompliance(it, pg.project, rel);
        if (violations.length > 0) violationsCount++;
      }
    }

    const duration = Math.max(
      hasMilestones ? relSpan.duration : 1,
      differenceInCalendarDays(parseDateSafe(maxEnd), parseDateSafe(minStart)) + 1
    );
    const progress = totalItems > 0 ? Math.round(totalProgressSum / totalItems) : 0;

    result.push({
      release: rel,
      projectGroups: pgs,
      startDate: minStart,
      endDate: maxEnd,
      duration,
      progress,
      tasksCount,
      milestonesCount,
      violationsCount,
    });
  }

  const unassignedPgs = releaseBuckets.get(unassignedKey) || [];
  if (unassignedPgs.length > 0) {
    let minStart = unassignedPgs[0].startDate;
    let maxEnd = unassignedPgs[0].endDate;
    let totalItems = 0;
    let totalProgressSum = 0;
    let tasksCount = 0;
    let milestonesCount = 0;

    for (const pg of unassignedPgs) {
      if (pg.startDate < minStart) minStart = pg.startDate;
      if (pg.endDate > maxEnd) maxEnd = pg.endDate;
      tasksCount += pg.tasksCount;
      milestonesCount += pg.milestonesCount;
      totalItems += pg.items.length;
      totalProgressSum += pg.progress * (pg.items.length || 1);
    }

    const duration = Math.max(
      1,
      differenceInCalendarDays(parseDateSafe(maxEnd), parseDateSafe(minStart)) + 1
    );
    const progress = totalItems > 0 ? Math.round(totalProgressSum / totalItems) : 0;

    const unassignedRelease: Release = {
      id: unassignedKey,
      code: 'SIN RELEASE',
      name: 'Proyectos sin Release asignada',
      color: 'slate',
      milestones: [],
      projectIds: unassignedPgs.map((pg) => pg.project.id),
    };

    result.push({
      release: unassignedRelease,
      projectGroups: unassignedPgs,
      startDate: minStart,
      endDate: maxEnd,
      duration,
      progress,
      tasksCount,
      milestonesCount,
      violationsCount: 0,
    });
  }

  return result;
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
      isDemo: true,
      projects: [
        {
          id: 'proj-discovery',
          name: 'Proyecto 1: Discovery & Diseño de Producto',
          color: 'violet',
          description: 'Investigación UX, diseño de interfaz y congelación de alcance.',
          collapsed: false,
          isDemo: true,
          releaseId: 'rel-t-26-12-1',
        },
        {
          id: 'proj-core',
          name: 'Proyecto 2: Ingeniería Core & Pagos',
          color: 'indigo',
          description: 'Arquitectura backend, motor Gantt interactivo e integración Stripe.',
          collapsed: false,
          isDemo: true,
          releaseId: 'rel-t-26-12-1',
        },
        {
          id: 'proj-release',
          name: 'Proyecto 3: QA, Cloud CI/CD & Go-Live',
          color: 'emerald',
          description: 'Pruebas automatizadas, pipeline GitHub Actions + Vercel y salida a producción.',
          collapsed: false,
          isDemo: true,
          releaseId: 'rel-t-27-01-1',
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
      isDemo: true,
      projects: [
        {
          id: 'proj-cloud-foundation',
          name: 'Proyecto 1: Auditoría & Fundación Cloud EKS',
          color: 'blue',
          description: 'Preparación de clústeres, Terraform y replicación de datos.',
          collapsed: false,
          isDemo: true,
          releaseId: 'rel-t-27-02-1',
        },
        {
          id: 'proj-cloud-cutover',
          name: 'Proyecto 2: Cutover DNS & Decomisión Legacy',
          color: 'emerald',
          description: 'Cambio de tráfico en vivo y cierre de servidores antiguos.',
          collapsed: false,
          isDemo: true,
          releaseId: 'rel-t-27-02-1',
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
      isDemo: true,
      projects: [
        {
          id: 'proj-init',
          name: 'Proyecto 1: Fase de Planificación',
          color: 'indigo',
          collapsed: false,
          isDemo: true,
        },
        {
          id: 'proj-exec',
          name: 'Proyecto 2: Ejecución & Entrega',
          color: 'emerald',
          collapsed: false,
          isDemo: true,
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

  const scenarioIsDemo = isDemoScenario({ ...raw, id });

  const fallbackProjName =
    name && !/^Escenario\s+\d+$/i.test(name) && name !== 'Tareas Importadas'
      ? name
      : 'Proyecto 1: General';
  const fallbackProjSlug =
    fallbackProjName !== 'Proyecto 1: General'
      ? `proj-${fallbackProjName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'default'}`
      : 'proj-default';

  const baseProjects =
    Array.isArray(raw.projects) && raw.projects.length > 0
      ? raw.projects.map((p, idx) => sanitizeProject(p, idx))
      : [
          sanitizeProject(
            {
              id: fallbackProjSlug,
              name: fallbackProjName,
              color: 'indigo',
              collapsed: false,
              isDemo: scenarioIsDemo,
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
    isDemo: scenarioIsDemo,
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
      projects: source.projects.map((p, idx) => sanitizeProject({ ...p, isDemo: false }, idx)),
      items: source.items.map((it, idx) => sanitizeGanttItem(it, idx)),
      updatedAt: new Date().toISOString(),
      isDemo: false,
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
        isDemo: false,
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
    isDemo: false,
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
      isDemo: false,
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
    isDemo: true,
  });

  return [saasScenario];
}

/**
 * Moves a task/milestone (`sourceId`) before or after another task (`targetId`)
 * or into a target project header (`project:<projectId>`), updating its `projectId` if moved across projects.
 */
export function moveTaskItem(
  items: GanttItem[],
  sourceId: string,
  targetId: string,
  position: 'before' | 'after' = 'after',
  projects: GanttProject[] = []
): GanttItem[] {
  if (!sourceId || !targetId || sourceId === targetId) return items;
  const sourceItem = items.find((it) => it.id === sourceId);
  if (!sourceItem) return items;

  const fallbackProjectId = projects[0]?.id;
  const resolvePid = (it: GanttItem) =>
    it.projectId && (projects.length === 0 || projects.some((p) => p.id === it.projectId))
      ? it.projectId
      : it.projectId || fallbackProjectId;

  // Dropping directly onto a project group header row (targetId = 'project:<projectId>')
  if (targetId.startsWith('project:')) {
    const targetProjectId = targetId.slice('project:'.length);
    if (!targetProjectId) return items;
    const updatedSource: GanttItem = {
      ...sourceItem,
      projectId: targetProjectId,
    };
    const withoutSource = items.filter((it) => it.id !== sourceId);
    const firstInTargetIdx = withoutSource.findIndex(
      (it) => resolvePid(it) === targetProjectId
    );
    const next = [...withoutSource];
    if (firstInTargetIdx >= 0) {
      next.splice(firstInTargetIdx, 0, updatedSource);
    } else {
      next.push(updatedSource);
    }
    return next;
  }

  const targetItem = items.find((it) => it.id === targetId);
  if (!targetItem) return items;

  const sourcePid = resolvePid(sourceItem);
  const resolvedTargetPid = resolvePid(targetItem) || sourcePid;
  let effectivePosition = position;

  // If moving onto an immediately adjacent sibling within the same project,
  // ensure dropping on the next sibling moves after it and dropping on the previous sibling moves before it
  if (sourcePid === resolvedTargetPid) {
    const sameProjItems = items.filter((it) => resolvePid(it) === resolvedTargetPid);
    const sIdx = sameProjItems.findIndex((it) => it.id === sourceId);
    const tIdx = sameProjItems.findIndex((it) => it.id === targetId);
    if (sIdx !== -1 && tIdx !== -1) {
      if (tIdx === sIdx + 1 && effectivePosition === 'before') {
        effectivePosition = 'after';
      } else if (tIdx === sIdx - 1 && effectivePosition === 'after') {
        effectivePosition = 'before';
      }
    }
  }

  const updatedSource: GanttItem = {
    ...sourceItem,
    ...(resolvedTargetPid ? { projectId: resolvedTargetPid } : {}),
  };

  const withoutSource = items.filter((it) => it.id !== sourceId);
  const targetIdxInFiltered = withoutSource.findIndex((it) => it.id === targetId);
  if (targetIdxInFiltered === -1) return items;

  const insertIdx =
    effectivePosition === 'before' ? targetIdxInFiltered : targetIdxInFiltered + 1;
  const next = [...withoutSource];
  next.splice(insertIdx, 0, updatedSource);
  return next;
}

/**
 * Reorders a task/milestone one step up or down within its project group (when `groupByProject` is true)
 * or globally in the items list (when `groupByProject` is false).
 */
export function reorderTaskItem(
  items: GanttItem[],
  itemId: string,
  direction: 'up' | 'down',
  groupByProject = true,
  projects: GanttProject[] = []
): GanttItem[] {
  const targetItem = items.find((it) => it.id === itemId);
  if (!targetItem) return items;

  const fallbackProjectId = projects[0]?.id;
  const resolvePid = (it: GanttItem) =>
    it.projectId && (projects.length === 0 || projects.some((p) => p.id === it.projectId))
      ? it.projectId
      : it.projectId || fallbackProjectId;

  const targetPid = resolvePid(targetItem);

  if (groupByProject && targetPid) {
    const projectItems = items.filter((it) => resolvePid(it) === targetPid);
    const curProjIdx = projectItems.findIndex((it) => it.id === itemId);
    if (curProjIdx === -1) return items;

    const targetProjIdx = direction === 'up' ? curProjIdx - 1 : curProjIdx + 1;
    if (targetProjIdx < 0 || targetProjIdx >= projectItems.length) return items;

    const swapSibling = projectItems[targetProjIdx];
    const prevIdx = items.findIndex((it) => it.id === itemId);
    const siblingIdx = items.findIndex((it) => it.id === swapSibling.id);

    const next = [...items];
    next[prevIdx] = swapSibling;
    next[siblingIdx] = targetItem;
    return next;
  }

  const curIdx = items.findIndex((it) => it.id === itemId);
  if (curIdx === -1) return items;
  const targetIdx = direction === 'up' ? curIdx - 1 : curIdx + 1;
  if (targetIdx < 0 || targetIdx >= items.length) return items;

  const next = [...items];
  const [moved] = next.splice(curIdx, 1);
  next.splice(targetIdx, 0, moved);
  return next;
}

/**
 * Filters project groups so that ONLY the selected projects appear in the Gantt diagram.
 * Supports multi-selection (`selectedProjectIds: string[]`) as well as legacy single-project filter (`selectedProjectId`).
 */
export function filterGroupsBySelectedProjects(
  groups: ComputedProjectGroup[],
  selectedProjectIds?: string[] | null,
  legacySelectedProjectId?: string
): ComputedProjectGroup[] {
  if (Array.isArray(selectedProjectIds)) {
    const selectedSet = new Set(selectedProjectIds);
    return groups.filter((g) => selectedSet.has(g.project.id));
  }
  if (!legacySelectedProjectId || legacySelectedProjectId === 'all') {
    return groups;
  }
  return groups.filter((g) => g.project.id === legacySelectedProjectId);
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
 * Collects all start, end, and milestone anchor dates from visible projects, releases, and tasks
 * so that the calendar header and grid columns cover the full span of every visible release bar
 * and empty-project release window on the diagram.
 */
export function collectTimelineAnchorDates(options: {
  projects?: GanttProject[];
  releases?: Release[];
  items?: Array<GanttItem | ComputedGanttItem>;
  hiddenReleaseIds?: string[];
}): string[] {
  const releaseMap = new Map<string, Release>();
  for (const rel of options.releases || []) {
    if (rel && rel.id) {
      releaseMap.set(rel.id, rel);
    }
  }
  const hiddenSet = new Set<string>(options.hiddenReleaseIds || []);
  const dates = new Set<string>();

  const addReleaseDates = (relId?: string | null) => {
    if (!relId || hiddenSet.has(relId)) return;
    const rel = releaseMap.get(relId);
    if (!rel) return;
    const span = getReleaseDateSpan(rel);
    if (span.startDate) dates.add(span.startDate);
    if (span.endDate) dates.add(span.endDate);
    for (const m of rel.milestones || []) {
      if (m && m.date) dates.add(m.date);
    }
  };

  for (const p of options.projects || []) {
    if (p && p.releaseId) {
      addReleaseDates(p.releaseId);
    }
  }

  for (const it of options.items || []) {
    if (!it || it.hidden) continue;
    if (it.releaseId) {
      addReleaseDates(it.releaseId);
    }
  }

  return Array.from(dates);
}

/**
 * Computes the overall timeline start and end dates (including padding around all items, releases, and today)
 * so timeline rendering and scroll-to-fit calculations share the exact same coordinate origin.
 */
export function computeTimelineBounds(
  items: Array<GanttItem | ComputedGanttItem>,
  referenceToday?: Date,
  extraDates?: Array<string | Date | null | undefined>
): { timelineStart: Date; timelineEnd: Date; totalDays: number } {
  const today = startOfDay(referenceToday || new Date());
  const validExtraDates = (extraDates || []).filter(
    (d): d is string | Date => d != null && d !== ''
  );

  if ((!items || items.length === 0) && validExtraDates.length === 0) {
    const start = addDays(today, -5);
    const end = addDays(today, 25);
    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: differenceInCalendarDays(end, start) + 1,
    };
  }

  const firstExtraParsed =
    validExtraDates.length > 0
      ? typeof validExtraDates[0] === 'string'
        ? parseDateSafe(validExtraDates[0])
        : startOfDay(validExtraDates[0])
      : today;

  let minDate =
    items && items.length > 0 ? parseDateSafe(items[0].startDate) : firstExtraParsed;
  let maxDate =
    items && items.length > 0
      ? parseDateSafe(
          ('slackEndDate' in items[0] && items[0].slackEndDate) || items[0].endDate
        )
      : firstExtraParsed;

  if (items && items.length > 0) {
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
  }

  if (validExtraDates.length > 0) {
    for (const d of validExtraDates) {
      const parsed = typeof d === 'string' ? parseDateSafe(d) : startOfDay(d);
      if (parsed < minDate) minDate = parsed;
      if (parsed > maxDate) maxDate = parsed;
    }
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
    extraDates?: Array<string | Date | null | undefined>;
  }
): FitToProjectResult {
  const todayStr = formatDateISO(startOfDay(options?.referenceToday || new Date()));
  const requestedProjectId = options?.projectId || 'all';
  const validExtraDates = (options?.extraDates || []).filter(
    (d): d is string | Date => d != null && d !== ''
  );

  if ((!items || items.length === 0) && validExtraDates.length === 0) {
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
      ? (items || []).filter((it) => it.projectId === requestedProjectId)
      : items || [];
  const targetItems = filtered.length > 0 ? filtered : items || [];

  const firstExtraParsed =
    validExtraDates.length > 0
      ? typeof validExtraDates[0] === 'string'
        ? parseDateSafe(validExtraDates[0])
        : startOfDay(validExtraDates[0])
      : parseDateSafe(todayStr);

  let minStart =
    targetItems.length > 0 ? parseDateSafe(targetItems[0].startDate) : firstExtraParsed;
  let maxEnd =
    targetItems.length > 0 ? parseDateSafe(targetItems[0].endDate) : firstExtraParsed;

  for (const it of targetItems) {
    const s = parseDateSafe(it.startDate);
    const baseEnd = parseDateSafe(it.endDate);
    const withSlack = addDays(baseEnd, Math.max(0, Number(it.slack) || 0));
    if (s < minStart) minStart = s;
    if (withSlack > maxEnd) maxEnd = withSlack;
  }

  if (validExtraDates.length > 0) {
    for (const d of validExtraDates) {
      const parsed = typeof d === 'string' ? parseDateSafe(d) : startOfDay(d);
      if (parsed < minStart) minStart = parsed;
      if (parsed > maxEnd) maxEnd = parsed;
    }
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

  const { timelineStart } = computeTimelineBounds(
    items,
    options?.referenceToday,
    options?.extraDates
  );
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
  const scenarioName = fileName
    ? fileName.replace(/\.[^/.]+$/, '').replace(/-gantt$/i, '').trim() || 'CSV Importado'
    : 'CSV Importado';
  const defaultCsvProjectName = fileName ? scenarioName : 'General';

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length === 0 || cols.every((c) => !c)) continue;

    const projName = (projIdx >= 0 ? cols[projIdx].trim() : '') || defaultCsvProjectName;
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

  const importedScenario = sanitizeScenario({
    id: `scen-${nowStamp}-imp`,
    name: scenarioName,
    projects: Array.from(projectMap.values()),
    items,
    updatedAt: new Date().toISOString(),
    isDemo: false,
  });

  return { primaryScenario: importedScenario };
}

export interface MergeGanttWorkspaceResult {
  projects: GanttProject[];
  items: GanttItem[];
  mergedProjectIds: string[];
  addedProjectsCount: number;
  updatedProjectsCount: number;
  addedItemsCount: number;
  updatedItemsCount: number;
}

/**
 * Merges imported Gantt data (projects and tasks from JSON or CSV) into the
 * currently loaded projects and items without deleting existing data.
 */
export function mergeImportedGanttData(
  currentProjects: GanttProject[],
  currentItems: GanttItem[],
  importResult: GanttImportResult | { projects: GanttProject[]; items: GanttItem[] }
): MergeGanttWorkspaceResult {
  const sourceScenarios: Array<{ projects: GanttProject[]; items: GanttItem[] }> =
    'primaryScenario' in importResult
      ? importResult.allScenarios && importResult.allScenarios.length > 0
        ? importResult.allScenarios
        : [importResult.primaryScenario]
      : [importResult];

  const mergedProjects: GanttProject[] = currentProjects.map((p, idx) =>
    sanitizeProject(p, idx)
  );
  const mergedItems: GanttItem[] = currentItems.map((it, idx) =>
    sanitizeGanttItem(it, idx)
  );

  const mergedProjectIds: string[] = [];
  let addedProjectsCount = 0;
  let updatedProjectsCount = 0;
  let addedItemsCount = 0;
  let updatedItemsCount = 0;

  for (const sc of sourceScenarios) {
    const incomingProjects = Array.isArray(sc.projects) ? sc.projects : [];
    const incomingItems = Array.isArray(sc.items) ? sc.items : [];
    const projectIdMap = new Map<string, string>();

    for (let i = 0; i < incomingProjects.length; i++) {
      const rawProj = incomingProjects[i];
      const cleanProj = sanitizeProject(rawProj, mergedProjects.length + i);
      const normIncomingName = cleanProj.name.trim().toLowerCase();

      // 1. Match existing project ONLY by normalized project name so differently named projects
      //    sharing a generic ID (e.g. "p1" or "proj-1") never overwrite each other
      const byNameIdx = mergedProjects.findIndex(
        (p) => p.name.trim().toLowerCase() === normIncomingName
      );
      if (byNameIdx !== -1) {
        const existing = mergedProjects[byNameIdx];
        mergedProjects[byNameIdx] = {
          ...existing,
          color: rawProj.color ? cleanProj.color : existing.color,
        };
        projectIdMap.set(rawProj.id || cleanProj.id, existing.id);
        projectIdMap.set(cleanProj.id, existing.id);
        if (!mergedProjectIds.includes(existing.id)) {
          mergedProjectIds.push(existing.id);
        }
        updatedProjectsCount += 1;
        continue;
      }

      // 2. New project to append: ensure unique ID and mark as non-demo (unless built-in demo)
      let finalProjId = cleanProj.id;
      if (mergedProjects.some((p) => p.id === finalProjId)) {
        finalProjId = `proj-merged-${Date.now()}-${mergedProjects.length + 1}`;
      }
      const finalProject: GanttProject = {
        ...cleanProj,
        id: finalProjId,
        isDemo: isDemoProject({ ...cleanProj, id: finalProjId }),
      };
      mergedProjects.push(finalProject);
      projectIdMap.set(rawProj.id || cleanProj.id, finalProjId);
      projectIdMap.set(cleanProj.id, finalProjId);
      if (!mergedProjectIds.includes(finalProjId)) {
        mergedProjectIds.push(finalProjId);
      }
      addedProjectsCount += 1;
    }

    // Ensure there is at least one target project if incomingProjects was empty
    if (mergedProjects.length === 0) {
      const fallbackProj: GanttProject = {
        id: 'proj-imported-1',
        name: 'Proyecto Importado',
        color: 'indigo',
        collapsed: false,
        isDemo: false,
      };
      mergedProjects.push(fallbackProj);
      mergedProjectIds.push(fallbackProj.id);
      addedProjectsCount += 1;
    }

    const defaultTargetProjId =
      mergedProjectIds[0] || mergedProjects[mergedProjects.length - 1].id;

    // First pass over incoming items: decide final item ID and whether each item updates an existing one or is appended
    const itemIdMap = new Map<string, string>();
    const usedExistingItemIndices = new Set<number>();
    const stagedIncoming: Array<{
      item: GanttItem;
      existingIdx: number;
    }> = [];

    for (let i = 0; i < incomingItems.length; i++) {
      const rawItem = incomingItems[i];
      const cleanItem = sanitizeGanttItem(rawItem, mergedItems.length + i);
      const resolvedProjId =
        (cleanItem.projectId && projectIdMap.get(cleanItem.projectId)) ||
        (cleanItem.projectId &&
        mergedProjects.some((p) => p.id === cleanItem.projectId)
          ? cleanItem.projectId
          : defaultTargetProjId);

      const normItemName = cleanItem.name.trim().toLowerCase();

      // Match existing item within the same project by normalized task name
      // (ensuring differently named tasks that happen to share generic IDs like "t-1" or "1" never overwrite each other,
      // and ensuring two identically named tasks in the same import batch don't overwrite the same existing slot)
      const existingInSameProjIdx = mergedItems.findIndex(
        (existing, idx) =>
          !usedExistingItemIndices.has(idx) &&
          existing.projectId === resolvedProjId &&
          existing.name.trim().toLowerCase() === normItemName
      );

      if (existingInSameProjIdx !== -1) {
        usedExistingItemIndices.add(existingInSameProjIdx);
        const existing = mergedItems[existingInSameProjIdx];
        itemIdMap.set(rawItem.id || cleanItem.id, existing.id);
        itemIdMap.set(cleanItem.id, existing.id);
        stagedIncoming.push({
          item: {
            ...existing,
            ...cleanItem,
            id: existing.id,
            projectId: resolvedProjId,
          },
          existingIdx: existingInSameProjIdx,
        });
      } else {
        // New item in target project: ensure its ID doesn't collide with any item in mergedItems or stagedIncoming
        let finalItemId = cleanItem.id;
        if (
          mergedItems.some((x) => x.id === finalItemId) ||
          stagedIncoming.some((s) => s.item.id === finalItemId)
        ) {
          finalItemId = `${cleanItem.id}-m${mergedItems.length + stagedIncoming.length + 1}`;
        }
        itemIdMap.set(rawItem.id || cleanItem.id, finalItemId);
        itemIdMap.set(cleanItem.id, finalItemId);
        stagedIncoming.push({
          item: {
            ...cleanItem,
            id: finalItemId,
            projectId: resolvedProjId,
          },
          existingIdx: -1,
        });
      }
    }

    // Second pass: remap dependencies among imported items and commit into mergedItems
    for (const staged of stagedIncoming) {
      const { item, existingIdx } = staged;
      const remappedDeps = (item.dependencies || [])
        .map((depId) => itemIdMap.get(depId) || depId)
        .filter((depId, idx, arr) => depId !== item.id && arr.indexOf(depId) === idx);

      let remappedDepTypes: Record<string, DependencyType> | undefined = undefined;
      if (item.dependencyTypes) {
        remappedDepTypes = {};
        for (const [depKey, depVal] of Object.entries(item.dependencyTypes)) {
          const mappedKey = itemIdMap.get(depKey) || depKey;
          if (mappedKey !== item.id) {
            remappedDepTypes[mappedKey] = depVal;
          }
        }
      }

      const finalizedItem: GanttItem = {
        ...item,
        dependencies: remappedDeps,
        dependencyTypes:
          remappedDepTypes && Object.keys(remappedDepTypes).length > 0
            ? remappedDepTypes
            : undefined,
      };

      if (existingIdx !== -1) {
        mergedItems[existingIdx] = finalizedItem;
        updatedItemsCount += 1;
      } else {
        mergedItems.push(finalizedItem);
        addedItemsCount += 1;
      }
    }
  }

  return {
    projects: mergedProjects,
    items: mergedItems,
    mergedProjectIds,
    addedProjectsCount,
    updatedProjectsCount,
    addedItemsCount,
    updatedItemsCount,
  };
}

/**
 * Resolves all items, projects, and releases directly or transitively related to a given FocusEntity.
 * - If focus is a task/milestone: traverses upstream predecessors and downstream successors recursively,
 *   collecting all connected tasks, their projects, and their releases.
 * - If focus is a project: collects all its tasks, their dependencies, connected projects, and release.
 * - If focus is a release: collects all assigned projects and their tasks.
 */
export function getRelatedFocusEntityIds(
  focus: FocusEntity,
  items: GanttItem[],
  projects: GanttProject[]
): { itemIds: string[]; projectIds: string[]; releaseIds: string[] } {
  const itemMap = new Map<string, GanttItem>();
  for (const it of items) itemMap.set(it.id, it);
  const projectMap = new Map<string, GanttProject>();
  for (const p of projects) projectMap.set(p.id, p);

  // Successor map: depId -> array of itemIds that depend on depId
  const successorMap = new Map<string, string[]>();
  for (const it of items) {
    if (it.dependencies) {
      for (const depId of it.dependencies) {
        if (!successorMap.has(depId)) successorMap.set(depId, []);
        successorMap.get(depId)!.push(it.id);
      }
    }
  }

  const relatedItemIds = new Set<string>();
  const relatedProjectIds = new Set<string>();
  const relatedReleaseIds = new Set<string>();

  if (focus.type === 'task') {
    const queue = [focus.id];
    relatedItemIds.add(focus.id);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const it = itemMap.get(currentId);
      if (it) {
        if (it.projectId) {
          relatedProjectIds.add(it.projectId);
          const p = projectMap.get(it.projectId);
          if (p?.releaseId) relatedReleaseIds.add(p.releaseId);
        }

        // Predecessors
        if (it.dependencies) {
          for (const predId of it.dependencies) {
            if (!relatedItemIds.has(predId)) {
              relatedItemIds.add(predId);
              queue.push(predId);
            }
          }
        }
      }

      // Successors
      const succs = successorMap.get(currentId);
      if (succs) {
        for (const succId of succs) {
          if (!relatedItemIds.has(succId)) {
            relatedItemIds.add(succId);
            queue.push(succId);
          }
        }
      }
    }
  } else if (focus.type === 'project') {
    relatedProjectIds.add(focus.id);
    const proj = projectMap.get(focus.id);
    if (proj?.releaseId) relatedReleaseIds.add(proj.releaseId);

    // All items in this project
    const projectItems = items.filter((it) => it.projectId === focus.id);
    for (const it of projectItems) {
      relatedItemIds.add(it.id);
    }

    // Direct dependencies connected to these items (predecessors and successors)
    for (const it of projectItems) {
      if (it.dependencies) {
        for (const predId of it.dependencies) {
          relatedItemIds.add(predId);
          const pred = itemMap.get(predId);
          if (pred?.projectId) {
            relatedProjectIds.add(pred.projectId);
            const p = projectMap.get(pred.projectId);
            if (p?.releaseId) relatedReleaseIds.add(p.releaseId);
          }
        }
      }
      const succs = successorMap.get(it.id);
      if (succs) {
        for (const succId of succs) {
          relatedItemIds.add(succId);
          const succ = itemMap.get(succId);
          if (succ?.projectId) {
            relatedProjectIds.add(succ.projectId);
            const p = projectMap.get(succ.projectId);
            if (p?.releaseId) relatedReleaseIds.add(p.releaseId);
          }
        }
      }
    }
  } else if (focus.type === 'release') {
    relatedReleaseIds.add(focus.id);
    for (const p of projects) {
      if (p.releaseId === focus.id) {
        relatedProjectIds.add(p.id);
      }
    }
    for (const it of items) {
      if (it.projectId && relatedProjectIds.has(it.projectId)) {
        relatedItemIds.add(it.id);
      }
    }
  }

  return {
    itemIds: Array.from(relatedItemIds),
    projectIds: Array.from(relatedProjectIds),
    releaseIds: Array.from(relatedReleaseIds),
  };
}

export interface HistoryFieldDiff {
  field: string;
  before: string;
  after: string;
}

export interface HistoryEntityChange {
  entityType: 'project' | 'task' | 'milestone';
  changeType: 'created' | 'updated' | 'deleted' | 'reordered';
  id: string;
  name: string;
  projectName?: string;
  changes: HistoryFieldDiff[];
}

export function resolveReleaseCodeLabel(
  releaseId?: string,
  releases?: Release[]
): string {
  if (!releaseId) return 'Sin release';
  const catalog = releases && releases.length > 0 ? releases : DEFAULT_PREDEFINED_RELEASES;
  const found = catalog.find((r) => r.id === releaseId);
  if (found) return found.code;
  return releaseId;
}

export function describeProjectStateChanges(
  prevProj: GanttProject | undefined,
  nextProj: GanttProject,
  releases?: Release[]
): HistoryFieldDiff[] {
  if (!prevProj) {
    return [
      { field: 'Release', before: '—', after: resolveReleaseCodeLabel(nextProj.releaseId, releases) },
      { field: 'Plataforma', before: '—', after: normalizePlatform(nextProj.platform) || 'iOS/Android' },
      { field: 'Color', before: '—', after: nextProj.color || 'indigo' },
    ];
  }
  const diffs: HistoryFieldDiff[] = [];
  if ((prevProj.name || '') !== (nextProj.name || '')) {
    diffs.push({
      field: 'Nombre',
      before: prevProj.name || '—',
      after: nextProj.name || '—',
    });
  }
  if ((prevProj.releaseId || '') !== (nextProj.releaseId || '')) {
    diffs.push({
      field: 'Release',
      before: resolveReleaseCodeLabel(prevProj.releaseId, releases),
      after: resolveReleaseCodeLabel(nextProj.releaseId, releases),
    });
  }
  const prevPlat = normalizePlatform(prevProj.platform) || 'iOS/Android';
  const nextPlat = normalizePlatform(nextProj.platform) || 'iOS/Android';
  if (prevPlat !== nextPlat) {
    diffs.push({
      field: 'Plataforma',
      before: prevPlat,
      after: nextPlat,
    });
  }
  const prevColor = prevProj.color || 'indigo';
  const nextColor = nextProj.color || 'indigo';
  if (prevColor !== nextColor) {
    diffs.push({
      field: 'Color',
      before: prevColor,
      after: nextColor,
    });
  }
  const prevDesc = (prevProj.description || '').trim();
  const nextDesc = (nextProj.description || '').trim();
  if (prevDesc !== nextDesc) {
    diffs.push({
      field: 'Descripción',
      before: prevDesc || 'Vacía',
      after: nextDesc || 'Vacía',
    });
  }
  return diffs;
}

function formatItemDependenciesLabel(
  item: GanttItem,
  allItems: GanttItem[]
): string {
  if (!Array.isArray(item.dependencies) || item.dependencies.length === 0) {
    return 'Ninguna';
  }
  return item.dependencies
    .map((depId) => {
      const pred = allItems.find((x) => x.id === depId);
      const depType = item.dependencyTypes?.[depId] || 'FS';
      return `${pred?.name || depId} (${depType})`;
    })
    .join(', ');
}

export function describeItemStateChanges(
  prevItem: GanttItem | undefined,
  nextItem: GanttItem,
  projects?: GanttProject[],
  allItems?: GanttItem[],
  releases?: Release[]
): HistoryFieldDiff[] {
  const resolveProjName = (pid?: string) =>
    projects?.find((p) => p.id === pid)?.name || projects?.[0]?.name || 'General';

  if (!prevItem) {
    const diffs: HistoryFieldDiff[] = [
      {
        field: 'Proyecto',
        before: '—',
        after: resolveProjName(nextItem.projectId),
      },
      {
        field: nextItem.type === 'milestone' ? 'Fecha' : 'Fechas',
        before: '—',
        after:
          nextItem.type === 'milestone'
            ? nextItem.startDate
            : `${nextItem.startDate} → ${nextItem.endDate} (${nextItem.duration}d)`,
      },
    ];
    if (nextItem.platform) {
      diffs.push({ field: 'Plataforma', before: '—', after: nextItem.platform });
    }
    if (nextItem.releaseId) {
      diffs.push({
        field: 'Release',
        before: '—',
        after: resolveReleaseCodeLabel(nextItem.releaseId, releases),
      });
    }
    if (nextItem.assignee) {
      diffs.push({ field: 'Equipo', before: '—', after: nextItem.assignee });
    }
    return diffs;
  }

  const diffs: HistoryFieldDiff[] = [];
  if (prevItem.name !== nextItem.name) {
    diffs.push({ field: 'Nombre', before: prevItem.name, after: nextItem.name });
  }
  if ((prevItem.projectId || '') !== (nextItem.projectId || '')) {
    diffs.push({
      field: 'Proyecto',
      before: resolveProjName(prevItem.projectId),
      after: resolveProjName(nextItem.projectId),
    });
  }
  if (prevItem.startDate !== nextItem.startDate) {
    diffs.push({
      field: nextItem.type === 'milestone' ? 'Fecha' : 'Inicio',
      before: prevItem.startDate,
      after: nextItem.startDate,
    });
  }
  if (nextItem.type !== 'milestone' && prevItem.endDate !== nextItem.endDate) {
    diffs.push({
      field: 'Fin',
      before: prevItem.endDate,
      after: nextItem.endDate,
    });
  }
  if (nextItem.type !== 'milestone' && prevItem.duration !== nextItem.duration) {
    diffs.push({
      field: 'Duración',
      before: `${prevItem.duration}d`,
      after: `${nextItem.duration}d`,
    });
  }
  if ((prevItem.progress || 0) !== (nextItem.progress || 0)) {
    diffs.push({
      field: 'Progreso',
      before: `${prevItem.progress || 0}%`,
      after: `${nextItem.progress || 0}%`,
    });
  }
  if ((prevItem.assignee || '') !== (nextItem.assignee || '')) {
    diffs.push({
      field: 'Equipo',
      before: prevItem.assignee || 'Sin asignar',
      after: nextItem.assignee || 'Sin asignar',
    });
  }
  if ((prevItem.platform || '') !== (nextItem.platform || '')) {
    diffs.push({
      field: 'Plataforma',
      before: prevItem.platform || 'Heredada',
      after: nextItem.platform || 'Heredada',
    });
  }
  if ((prevItem.releaseId || '') !== (nextItem.releaseId || '')) {
    diffs.push({
      field: 'Release',
      before: prevItem.releaseId ? resolveReleaseCodeLabel(prevItem.releaseId, releases) : 'Heredada',
      after: nextItem.releaseId ? resolveReleaseCodeLabel(nextItem.releaseId, releases) : 'Heredada',
    });
  }
  if ((prevItem.color || 'indigo') !== (nextItem.color || 'indigo')) {
    diffs.push({
      field: 'Color',
      before: prevItem.color || 'indigo',
      after: nextItem.color || 'indigo',
    });
  }
  if ((prevItem.slack || 0) !== (nextItem.slack || 0)) {
    diffs.push({
      field: 'Holgura',
      before: `${prevItem.slack || 0}d`,
      after: `${nextItem.slack || 0}d`,
    });
  }
  if (Boolean(prevItem.hidden) !== Boolean(nextItem.hidden)) {
    diffs.push({
      field: 'Visibilidad',
      before: prevItem.hidden ? 'Oculta' : 'Visible',
      after: nextItem.hidden ? 'Oculta' : 'Visible',
    });
  }
  if (Boolean(prevItem.isExternal) !== Boolean(nextItem.isExternal)) {
    diffs.push({
      field: 'Externo',
      before: prevItem.isExternal ? 'Sí' : 'No',
      after: nextItem.isExternal ? 'Sí' : 'No',
    });
  }
  const itemsLookup = allItems || [prevItem, nextItem];
  const prevDepsLabel = formatItemDependenciesLabel(prevItem, itemsLookup);
  const nextDepsLabel = formatItemDependenciesLabel(nextItem, itemsLookup);
  if (prevDepsLabel !== nextDepsLabel) {
    diffs.push({
      field: 'Dependencias',
      before: prevDepsLabel,
      after: nextDepsLabel,
    });
  }
  const prevNotes = (prevItem.notes || '').trim();
  const nextNotes = (nextItem.notes || '').trim();
  if (prevNotes !== nextNotes) {
    diffs.push({
      field: 'Notas',
      before: prevNotes || 'Vacías',
      after: nextNotes || 'Vacías',
    });
  }
  return diffs;
}

export function formatFieldDiffsInline(changes: HistoryFieldDiff[]): string {
  if (!changes || changes.length === 0) return '';
  return changes.map((c) => `${c.field}: ${c.before} → ${c.after}`).join(' · ');
}

export function computeHistoryEntryDiff(
  prevSnapshot: { items: GanttItem[]; projects: GanttProject[] } | undefined,
  currentSnapshot: { items: GanttItem[]; projects: GanttProject[] },
  releases?: Release[]
): HistoryEntityChange[] {
  if (!prevSnapshot) return [];

  const result: HistoryEntityChange[] = [];
  const prevProjMap = new Map(prevSnapshot.projects.map((p) => [p.id, p]));
  const currProjMap = new Map(currentSnapshot.projects.map((p) => [p.id, p]));

  // 1. Created or updated projects
  for (const currP of currentSnapshot.projects) {
    const prevP = prevProjMap.get(currP.id);
    if (!prevP) {
      result.push({
        entityType: 'project',
        changeType: 'created',
        id: currP.id,
        name: currP.name,
        changes: describeProjectStateChanges(undefined, currP, releases),
      });
    } else {
      const pDiffs = describeProjectStateChanges(prevP, currP, releases);
      if (pDiffs.length > 0) {
        result.push({
          entityType: 'project',
          changeType: 'updated',
          id: currP.id,
          name: currP.name,
          changes: pDiffs,
        });
      }
    }
  }

  // 2. Deleted projects
  for (const prevP of prevSnapshot.projects) {
    if (!currProjMap.has(prevP.id)) {
      result.push({
        entityType: 'project',
        changeType: 'deleted',
        id: prevP.id,
        name: prevP.name,
        changes: [{ field: 'Estado', before: 'Activo', after: 'Eliminado' }],
      });
    }
  }

  // 3. Reordered projects (when set of project IDs is identical)
  if (
    prevSnapshot.projects.length === currentSnapshot.projects.length &&
    prevSnapshot.projects.every((p) => currProjMap.has(p.id))
  ) {
    const prevIds = prevSnapshot.projects.map((p) => p.id);
    const currIds = currentSnapshot.projects.map((p) => p.id);
    if (prevIds.join(',') !== currIds.join(',')) {
      for (let i = 0; i < currentSnapshot.projects.length; i++) {
        const p = currentSnapshot.projects[i];
        const prevIdx = prevIds.indexOf(p.id);
        if (prevIdx !== i) {
          result.push({
            entityType: 'project',
            changeType: 'reordered',
            id: p.id,
            name: p.name,
            changes: [
              {
                field: 'Posición',
                before: `#${prevIdx + 1}`,
                after: `#${i + 1}`,
              },
            ],
          });
        }
      }
    }
  }

  const prevItemMap = new Map(prevSnapshot.items.map((it) => [it.id, it]));
  const currItemMap = new Map(currentSnapshot.items.map((it) => [it.id, it]));
  const combinedItems = [...prevSnapshot.items, ...currentSnapshot.items];
  const combinedProjects = [...currentSnapshot.projects, ...prevSnapshot.projects];
  const resolveProjName = (pid?: string) =>
    combinedProjects.find((p) => p.id === pid)?.name ||
    currentSnapshot.projects[0]?.name ||
    'General';

  // 4. Created or updated items
  for (const currIt of currentSnapshot.items) {
    const prevIt = prevItemMap.get(currIt.id);
    const eType = currIt.type === 'milestone' ? 'milestone' : 'task';
    if (!prevIt) {
      result.push({
        entityType: eType,
        changeType: 'created',
        id: currIt.id,
        name: currIt.name,
        projectName: resolveProjName(currIt.projectId),
        changes: describeItemStateChanges(
          undefined,
          currIt,
          combinedProjects,
          combinedItems,
          releases
        ),
      });
    } else {
      const iDiffs = describeItemStateChanges(
        prevIt,
        currIt,
        combinedProjects,
        combinedItems,
        releases
      );
      if (iDiffs.length > 0) {
        result.push({
          entityType: eType,
          changeType: 'updated',
          id: currIt.id,
          name: currIt.name,
          projectName: resolveProjName(currIt.projectId),
          changes: iDiffs,
        });
      }
    }
  }

  // 5. Deleted items
  for (const prevIt of prevSnapshot.items) {
    if (!currItemMap.has(prevIt.id)) {
      const eType = prevIt.type === 'milestone' ? 'milestone' : 'task';
      result.push({
        entityType: eType,
        changeType: 'deleted',
        id: prevIt.id,
        name: prevIt.name,
        projectName: resolveProjName(prevIt.projectId),
        changes: [
          {
            field: 'Estado',
            before:
              prevIt.type === 'milestone'
                ? prevIt.startDate
                : `${prevIt.startDate} → ${prevIt.endDate} (${prevIt.duration}d)`,
            after: 'Eliminado',
          },
        ],
      });
    }
  }

  // 6. Reordered items (if no other item changes were detected and order changed)
  if (
    result.length === 0 &&
    prevSnapshot.items.length === currentSnapshot.items.length &&
    prevSnapshot.items.every((it) => currItemMap.has(it.id))
  ) {
    const prevIds = prevSnapshot.items.map((it) => it.id);
    const currIds = currentSnapshot.items.map((it) => it.id);
    if (prevIds.join(',') !== currIds.join(',')) {
      for (let i = 0; i < currentSnapshot.items.length; i++) {
        const it = currentSnapshot.items[i];
        const prevIdx = prevIds.indexOf(it.id);
        if (prevIdx !== i) {
          result.push({
            entityType: it.type === 'milestone' ? 'milestone' : 'task',
            changeType: 'reordered',
            id: it.id,
            name: it.name,
            projectName: resolveProjName(it.projectId),
            changes: [
              {
                field: 'Posición',
                before: `#${prevIdx + 1}`,
                after: `#${i + 1}`,
              },
            ],
          });
        }
      }
    }
  }

  return result;
}





