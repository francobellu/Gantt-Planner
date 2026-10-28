export type TaskType = 'task' | 'milestone';

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export type TaskColor =
  | 'indigo'
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'cyan';

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
  collapsed?: boolean;
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
  assignee?: string;
  notes?: string;
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
}

export interface SavedScenario {
  id: string;
  name: string;
  projects: GanttProject[];
  items: GanttItem[];
  updatedAt: string;
  sourceTemplateId?: string;
}

export type ArrowVisibility = 'all' | 'hover' | 'critical' | 'none';

