export const APP_VERSION = '1.6.0';

export const DEFAULT_TRUNCATE_CHAR_LIMIT = 37;
export const TRUNCATE_LIMIT_STORAGE_KEY = 'ganttflow_truncate_char_limit';

export type TaskType = 'task' | 'milestone';

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export type ProjectPlatform = 'iOS' | 'Android' | 'Multiplataforma';

export interface FocusEntity {
  type: 'task' | 'project' | 'release';
  id: string;
  name?: string;
}

export type TaskColor =
  | 'indigo'
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'cyan'
  | 'teal'
  | 'orange'
  | 'pink'
  | 'slate'
  | 'sky'
  | 'lime';

export const PROJECT_COLORS: { value: TaskColor; bg: string }[] = [
  { value: 'indigo', bg: 'bg-indigo-500' },
  { value: 'violet', bg: 'bg-violet-500' },
  { value: 'emerald', bg: 'bg-emerald-500' },
  { value: 'blue', bg: 'bg-blue-500' },
  { value: 'teal', bg: 'bg-teal-500' },
  { value: 'amber', bg: 'bg-amber-500' },
  { value: 'orange', bg: 'bg-orange-500' },
  { value: 'rose', bg: 'bg-rose-500' },
  { value: 'pink', bg: 'bg-pink-500' },
  { value: 'cyan', bg: 'bg-cyan-500' },
  { value: 'sky', bg: 'bg-sky-500' },
  { value: 'lime', bg: 'bg-lime-500' },
  { value: 'slate', bg: 'bg-slate-500' },
];

export type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';

export interface FitToProjectResult {
  dayWidth: number;
  scrollLeft: number;
  spanDays: number;
  startDate: string;
  endDate: string;
  targetProjectId: string;
}

export interface GanttProject {
  id: string;
  name: string;
  color: TaskColor;
  description?: string;
  releaseId?: string;
  collapsed?: boolean;
  isDemo?: boolean;
  platform?: ProjectPlatform;
}

export interface GanttItem {
  id: string;
  name: string;
  type: TaskType;
  projectId?: string; // ID of the GanttProject this task/milestone belongs to
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  duration: number;  // Days (>= 1 for task, 0 for milestone)
  slack: number;     // Days of configurable slack / buffer (default 0)
  dependencies: string[]; // Predecessor IDs
  dependencyTypes?: Record<string, DependencyType>;
  progress: number;  // 0 - 100
  color: TaskColor;
  customColor?: boolean;
  assignee?: string;
  notes?: string;
  hidden?: boolean;
  isExternal?: boolean; // When true, milestone/task is external (does not belong to or get constrained by the release)
  platform?: ProjectPlatform; // Optional task-level platform override (iOS, Android, Multiplataforma)
}

export interface ComputedGanttItem extends GanttItem {
  wbs: number;
  wbsCode?: string;
  slackEndDate: string;
  cpmTotalFloat: number;
  isCritical: boolean;
  hasConflict: boolean;
  conflictMessage?: string;
  earliestAllowedStart?: string;
}

export interface ComputedProjectGroup {
  project: GanttProject;
  projectIndex: number;
  items: ComputedGanttItem[];
  startDate: string;
  endDate: string;
  slackEndDate: string;
  duration: number;
  progress: number;
  tasksCount: number;
  milestonesCount: number;
  criticalCount: number;
  totalSlack: number;
  hasConflict: boolean;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  projects: GanttProject[];
  items: GanttItem[];
  isDemo?: boolean;
}

export interface SavedScenario {
  id: string;
  name: string;
  projects: GanttProject[];
  items: GanttItem[];
  updatedAt: string;
  sourceTemplateId?: string;
  isDemo?: boolean;
}

export type ArrowVisibility = 'all' | 'hover' | 'critical' | 'none';

export interface GanttImportResult {
  primaryScenario: SavedScenario;
  allScenarios?: SavedScenario[];
}

export type PlanHistoryActionType =
  | 'create_item'
  | 'edit_item'
  | 'drag_move'
  | 'drag_resize'
  | 'delete_item'
  | 'duplicate_item'
  | 'reorder_item'
  | 'create_project'
  | 'edit_project'
  | 'delete_project'
  | 'dependency_change'
  | 'resolve_conflicts'
  | 'restore_snapshot'
  | 'initial_state';

export interface PlanHistoryEntry {
  id: string;
  timestamp: string;
  formattedDate: string;
  actionType: PlanHistoryActionType;
  actionLabel: string;
  description: string;
  itemsCount: number;
  projectsCount: number;
  snapshot: {
    items: GanttItem[];
    projects: GanttProject[];
  };
}

export interface ReleaseMilestoneDefinition {
  id: string;
  code: string;
  name: string;
  category: string;
  color: TaskColor;
}

export interface ReleaseMilestone {
  id: string;
  key: string;
  code: string;
  name: string;
  category: string;
  date: string; // YYYY-MM-DD
  color?: TaskColor;
}

export interface Release {
  id: string;
  code: string; // e.g. 'T_26.12.1'
  name: string; // e.g. 'T_26.12.1 DICIEMBRE 2026'
  month?: string;
  year?: number;
  color: TaskColor;
  milestones: ReleaseMilestone[];
  projectIds?: string[];
  notes?: string;
}

export type ReleaseGuideVisibility = 'all' | 'assigned' | 'selected' | 'none';
export type GroupingMode = 'project' | 'release' | 'none';

export interface ComputedReleaseGroup {
  release: Release;
  projectGroups: ComputedProjectGroup[];
  startDate: string;
  endDate: string;
  duration: number;
  progress: number;
  tasksCount: number;
  milestonesCount: number;
  violationsCount: number;
}


