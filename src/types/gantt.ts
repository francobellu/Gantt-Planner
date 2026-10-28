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

export type ZoomLevel = 'day' | 'week' | 'month';

export interface GanttItem {
  id: string;
  name: string;
  type: TaskType;
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
  slackEndDate: string;
  cpmTotalFloat: number;
  isCritical: boolean;
  hasConflict: boolean;
  conflictMessage?: string;
  earliestAllowedStart?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  items: GanttItem[];
}
