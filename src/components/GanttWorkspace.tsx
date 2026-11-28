import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isSameDay,
  isWeekend,
  startOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Compass,
  Copy,
  Diamond,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Flame,
  FolderKanban,
  GitBranch,
  GripHorizontal,
  GripVertical,
  Lock,
  Maximize2,
  MessageSquare,
  Minus,
  MoreHorizontal,
  MousePointer,
  MoveHorizontal,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Rocket,
  Rows,
  Search,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Trash2,
  Unlock,
  User,
  X,
} from 'lucide-react';
import {
  ArrowVisibility,
  ComputedGanttItem,
  ComputedProjectGroup,
  ComputedReleaseGroup,
  DependencyType,
  DEFAULT_TRUNCATE_CHAR_LIMIT,
  FocusEntity,
  GanttItem,
  GanttProject,
  GroupingMode,
  PROJECT_COLORS,
  ProjectAlertLevel,
  ProjectPlatform,
  Release,
  ReleaseGuideVisibility,
  ReleaseMilestone,
  TaskColor,
  TRUNCATE_LIMIT_STORAGE_KEY,
  WorkCalendarConfig,
  ZoomLevel,
} from '../types/gantt';
import {
  addDependencyLink,
  buildExternalMilestonesGroup,
  calculateDurationFromDates,
  calculateEndDateFromDuration,
  canCreateNonDisplacingDependency,
  clampDayWidth,
  collectAllTags,
  collectTimelineAnchorDates,
  computeFitToProjectScale,
  computeTimelineBounds,
  computeWheelZoomDayWidth,
  createRoundedOrthogonalPath,
  DependencyPortSide,
  EXTERNAL_MILESTONES_GROUP_ID,
  filterGroupsBySelectedProjects,
  formatDateDisplay,
  formatDateISO,
  formatScrubberDate,
  getDayWidthForPreset,
  getItemEffectiveColor,
  getLockedProjectForItem,
  getRelatedFocusEntityIds,
  resolveDependencyTypeFromPorts,
  getTeamColor,
  groupItemsByProject,
  groupItemsByReleaseAndProject,
  isReleaseAssociatedTask,
  MAX_DAY_WIDTH,
  MIN_DAY_WIDTH,
  moveDependencyLink,
  normalizePlatform,
  normalizeTag,
  OrthogonalPoint,
  parseDateSafe,
  removeDependencyLink,
  resolveElementUrl,
  sanitizeGanttItem,
  updateDependencyLinkType,
  wouldCreateCycle,
} from '../utils/ganttEngine';
import {
  checkTaskReleaseCompliance,
  getReleaseDateSpan,
  RELEASE_MILESTONE_DEFINITIONS,
} from '../utils/releaseEngine';

import { AppleIosIcon, AndroidIcon } from './PlatformIcons';
import {
  SearchFilterBar,
  GanttSearchFieldsConfig,
  DEFAULT_GANTT_SEARCH_FIELDS,
  UnifiedRowTypeFilter,
} from './SearchFilterBar';
export type { GanttSearchFieldsConfig };
export { DEFAULT_GANTT_SEARCH_FIELDS };
import { ProjectLockedAlertModal } from './ProjectLockedAlertModal';
import { StatusCommentsDrawer } from './StatusCommentsPanel';


function computePolylineMidpoint(pts: OrthogonalPoint[]): OrthogonalPoint {
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length === 1) return pts[0];
  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segLens.push(len);
    totalLen += len;
  }
  if (totalLen <= 0) return pts[0];
  const half = totalLen / 2;
  let acc = 0;
  for (let i = 0; i < segLens.length; i++) {
    const segLen = segLens[i];
    if (acc + segLen >= half && segLen > 0) {
      const t = (half - acc) / segLen;
      return {
        x: Math.round((pts[i].x + (pts[i + 1].x - pts[i].x) * t) * 10) / 10,
        y: Math.round((pts[i].y + (pts[i + 1].y - pts[i].y) * t) * 10) / 10,
      };
    }
    acc += segLen;
  }
  return pts[pts.length - 1];
}

interface GanttWorkspaceProps {
  items: ComputedGanttItem[];
  projects?: GanttProject[];
  groupByProject?: boolean;
  selectedProjectId?: string;
  selectedProjectIds?: string[];
  showTable?: boolean;
  onToggleShowTable?: () => void;
  showRowSeparators?: boolean;
  onToggleRowSeparators?: () => void;
  showWeekendShading?: boolean;
  onToggleWeekendShading?: () => void;
  onOpenProjectsView?: () => void;
  zoom: ZoomLevel;
  dayWidth?: number;
  onChangeDayWidth?: (newDayWidth: number) => void;
  onFitToProject?: (projectId?: string, options?: { timelineStart?: Date }) => void;
  showCriticalPath: boolean;
  onToggleCriticalPath?: () => void;
  onScrollToToday?: () => void;
  showMetricsDrawer?: boolean;
  onToggleMetricsDrawer?: () => void;
  metricsToggleBtnRef?: React.RefObject<HTMLButtonElement | null>;
  showCpmFloat: boolean;
  autoCascade: boolean;
  arrowVisibility?: ArrowVisibility;
  onChangeArrowVisibility?: (visibility: ArrowVisibility) => void;
  onUpdateItem: (updated: GanttItem, cascade: boolean) => void;
  onUpdateItems?: (
    nextItems: GanttItem[],
    meta?: {
      actionType?: 'edit_item' | 'dependency_change';
      actionLabel?: string;
      description?: string;
    }
  ) => void;
  onReorderItem?: (itemId: string, direction: 'up' | 'down') => void;
  onMoveItem?: (sourceId: string, targetId: string, position: 'before' | 'after') => void;
  onMoveItems?: (sourceIds: string[], targetId: string, position: 'before' | 'after') => void;
  onEditModal: (item: ComputedGanttItem) => void;
  onDeleteItem: (id: string) => void;
  onDuplicateItem: (item: ComputedGanttItem) => void;
  onQuickAdd: (type: 'task' | 'milestone', projectId?: string) => void;
  onToggleGroupByProject?: () => void;
  onToggleProjectCollapse?: (projectId: string) => void;
  onUpdateProject?: (project: GanttProject) => void;
  onReorderProject?: (projectId: string, direction: 'up' | 'down') => void;
  onMoveProject?: (sourceProjectId: string, targetProjectId: string, position: 'before' | 'after') => void;
  onChangeProjectColor?: (projectId: string, newColor: TaskColor) => void;
  onDeleteProject?: (projectId: string) => void;
  onCreateProject?: (project: GanttProject) => void;
  onCreateDigiTask?: (project: GanttProject, taskType?: 'DIGI' | 'SCR') => void;
  onCreateTaskDirect?: (projectId: string) => void;
  onCreateUnassignedTask?: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  initialSelectedItemId?: string;
  initialHoveredItemId?: string;
  initialCursorScrubber?: { x: number; date: Date };
  initialSelectedDepLink?: { predId: string; succId: string } | null;
  initialHoveredDepKey?: string | null;
  initialConnectModeSource?: { itemId: string; role: 'pred' | 'succ' } | null;
  initialInspectingProjectId?: string;
  initialLockedAlertProjectId?: string;
  initialMultiSelectedItemIds?: string[];
  initialMultiSelectedProjectIds?: string[];
  initialDragRowPreview?: {
    itemId: string;
    x: number;
    y: number;
    offsetX?: number;
    offsetY?: number;
    width?: number;
  } | null;
  initialDragOverRow?: {
    id: string;
    position: 'before' | 'after';
  } | null;
  initialDragProjectPreview?: {
    projectId: string;
    x: number;
    y: number;
    offsetX?: number;
    offsetY?: number;
    width?: number;
  } | null;
  initialDragOverProject?: {
    id: string;
    position: 'before' | 'after';
  } | null;
  initialContextMenu?: {
    type: 'project' | 'task';
    id: string;
    x: number;
    y: number;
  } | null;
  baselineSnapshot?: { label: string; items: GanttItem[] } | null;
  workCalendar?: WorkCalendarConfig;
  useRightSidebarInspector?: boolean;
  releases?: Release[];
  activeReleaseId?: string;
  releaseGuideVisibility?: ReleaseGuideVisibility;
  groupingMode?: GroupingMode;
  onToggleGroupingMode?: () => void;
  onOpenReleasesModal?: (releaseId?: string) => void;
  initialVisibleMilestoneKeys?: string[];
  initialVisibleColumns?: {
    team?: boolean;
    dates?: boolean;
    dur?: boolean;
    slack?: boolean;
    deps?: boolean;
  };
  hiddenReleaseIds?: string[];
  onToggleHideRelease?: (releaseId: string) => void;
  onResetHiddenReleases?: () => void;
  isFocusMode?: boolean;
  focusEntity?: FocusEntity | null;
  onExitFocusMode?: () => void;
  onSetFocusEntity?: (entity: FocusEntity | null) => void;
  selectedEntity?: FocusEntity | null;
  onSelectEntity?: (entity: FocusEntity | null) => void;
  selectedPlatform?: 'all' | 'iOS' | 'Android' | 'iOS/Android' | 'Multiplataforma';
  onChangeSelectedPlatform?: (platform: 'all' | ProjectPlatform) => void;
  truncateCharLimit?: number;
  onChangeTruncateCharLimit?: (limit: number) => void;
  initialSearchQuery?: string;
  initialExcludeQuery?: string;
  initialAlertFilter?: 'all' | ProjectAlertLevel;
  initialTypeFilter?: UnifiedRowTypeFilter;
  initialReleaseFilter?: string;
  initialShowSubtasksOnFilter?: boolean;
  initialSearchFields?: Partial<GanttSearchFieldsConfig>;
  initialShowSearchFieldsMenu?: boolean;
  initialShowAdvancedPanel?: boolean;
}


type DisplayRow =
  | {
      kind: 'release';
      rowId: string;
      group: ComputedReleaseGroup;
    }
  | {
      kind: 'project';
      rowId: string;
      group: ComputedProjectGroup;
    }
  | {
      kind: 'empty-project';
      rowId: string;
      group: ComputedProjectGroup;
    }
  | {
      kind: 'add-task';
      rowId: string;
      group: ComputedProjectGroup;
    }
  | {
      kind: 'add-project';
      rowId: string;
      group: ComputedReleaseGroup;
    }
  | {
      kind: 'item';
      rowId: string;
      item: ComputedGanttItem;
      group: ComputedProjectGroup;
    };

const ROW_HEIGHT = 50;
const HEADER_HEIGHT = 60;

const COLOR_STYLES: Record<
  TaskColor,
  {
    barBg: string;
    fillBg: string;
    border: string;
    text: string;
    badge: string;
    groupRowBg: string;
    groupBadgeBg: string;
    diamondBg: string;
    diamondPill: string;
    diamondText: string;
    guideLine: string;
    guidePill: string;
  }
> = {
  indigo: {
    barBg: 'bg-[#4F46E5] text-white border border-[#4338CA] dark:bg-[#6366F1] dark:border-[#4F46E5]',
    fillBg: 'bg-white/25 dark:bg-black/25',
    border: 'border-[#4338CA] dark:border-[#4F46E5]',
    text: 'text-white',
    badge: 'bg-[#4F46E5] text-white',
    groupRowBg: 'bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white',
    groupBadgeBg: 'bg-[#4F46E5] text-white border border-[#4338CA]',
    diamondBg: 'bg-[#4F46E5] text-white border border-[#4338CA]',
    diamondPill: 'bg-[#4F46E5] text-white border border-[#4338CA]',
    diamondText: 'text-[#4F46E5] dark:text-[#818CF8]',
    guideLine: 'border-[#4F46E5]',
    guidePill: 'bg-[#4F46E5] text-white font-mono rounded-[2px]',
  },
  blue: {
    barBg: 'bg-[#2563EB] text-white border border-[#1D4ED8] dark:bg-[#3B82F6] dark:border-[#2563EB]',
    fillBg: 'bg-white/25 dark:bg-black/25',
    border: 'border-[#1D4ED8] dark:border-[#2563EB]',
    text: 'text-white',
    badge: 'bg-[#2563EB] text-white',
    groupRowBg: 'bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white',
    groupBadgeBg: 'bg-[#2563EB] text-white border border-[#1D4ED8]',
    diamondBg: 'bg-[#2563EB] text-white border border-[#1D4ED8]',
    diamondPill: 'bg-[#2563EB] text-white border border-[#1D4ED8]',
    diamondText: 'text-[#2563EB] dark:text-[#60A5FA]',
    guideLine: 'border-[#2563EB]',
    guidePill: 'bg-[#2563EB] text-white font-mono rounded-[2px]',
  },
  emerald: {
    barBg: 'bg-[#16A34A] text-white border border-[#15803D] dark:bg-[#22C55E] dark:border-[#16A34A]',
    fillBg: 'bg-white/25 dark:bg-black/25',
    border: 'border-[#15803D] dark:border-[#16A34A]',
    text: 'text-white',
    badge: 'bg-[#16A34A] text-white',
    groupRowBg: 'bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white',
    groupBadgeBg: 'bg-[#16A34A] text-white border border-[#15803D]',
    diamondBg: 'bg-emerald-600 text-white border border-[#0C0C09]',
    diamondPill: 'bg-emerald-600 text-white border border-emerald-500/30',
    diamondText: 'text-emerald-600',
    guideLine: 'border-emerald-500/60',
    guidePill: 'bg-emerald-600 text-white font-mono rounded-[2px]',
  },
  amber: {
    barBg: 'bg-[#D97706] text-white border border-[#B45309] dark:bg-[#F59E0B] dark:border-[#D97706]',
    fillBg: 'bg-white/25 dark:bg-black/25',
    border: 'border-[#B45309] dark:border-[#D97706]',
    text: 'text-white',
    badge: 'bg-[#D97706] text-white',
    groupRowBg: 'bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white',
    groupBadgeBg: 'bg-[#D97706] text-white border border-[#B45309]',
    diamondBg: 'bg-amber-500 border border-[#0C0C09]',
    diamondPill: 'bg-[#D97706] text-white border border-[#D97706]',
    diamondText: 'text-amber-500',
    guideLine: 'border-amber-500/60',
    guidePill: 'bg-[#D97706] text-white font-mono rounded-[2px]',
  },
  rose: {
    barBg: 'bg-[#DC2626] text-white border border-[#B91C1C] dark:bg-[#EF4444] dark:border-[#DC2626]',
    fillBg: 'bg-white/25 dark:bg-black/25',
    border: 'border-[#B91C1C] dark:border-[#DC2626]',
    text: 'text-white',
    badge: 'bg-[#DC2626] text-white',
    groupRowBg: 'bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white',
    groupBadgeBg: 'bg-[#DC2626] text-white border border-[#B91C1C]',
    diamondBg: 'bg-[#DC2626] text-white border border-[#B91C1C]',
    diamondPill: 'bg-[#DC2626] text-white border border-[#B91C1C]',
    diamondText: 'text-[#DC2626] dark:text-[#F87171]',
    guideLine: 'border-[#DC2626]',
    guidePill: 'bg-[#DC2626] text-white font-mono rounded-[2px]',
  },
  violet: {
    barBg: 'bg-[#7C3AED] text-white border border-[#6D28D9] dark:bg-[#8B5CF6] dark:border-[#7C3AED]',
    fillBg: 'bg-white/25 dark:bg-black/25',
    border: 'border-[#6D28D9] dark:border-[#7C3AED]',
    text: 'text-white',
    badge: 'bg-[#7C3AED] text-white',
    groupRowBg: 'bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white',
    groupBadgeBg: 'bg-[#7C3AED] text-white border border-[#6D28D9]',
    diamondBg: 'bg-violet-600 border border-[#0C0C09]',
    diamondPill: 'bg-[#312C85] text-white border border-[#312C85]',
    diamondText: 'text-violet-600',
    guideLine: 'border-violet-500/60',
    guidePill: 'bg-[#312C85] text-white font-mono rounded-[2px]',
  },
  cyan: {
    barBg: 'bg-[#0891B2] text-white border border-[#0E7490] dark:bg-[#06B6D4] dark:border-[#0891B2] dark:text-[#0C0C09]',
    fillBg: 'bg-white/25 dark:bg-black/25',
    border: 'border-[#0E7490] dark:border-[#0891B2]',
    text: 'text-[#0891B2]',
    badge: 'bg-[#0891B2] text-white dark:bg-[#06B6D4] dark:text-[#0C0C09]',
    groupRowBg: 'bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white',
    groupBadgeBg: 'bg-[#0891B2] text-white border border-[#0E7490]',
    diamondBg: 'bg-[#0891B2] text-white border border-[#0E7490]',
    diamondPill: 'bg-[#0891B2] text-white border border-[#0E7490]',
    diamondText: 'text-[#0891B2] dark:text-[#22D3EE]',
    guideLine: 'border-[#0891B2]',
    guidePill: 'bg-[#0891B2] text-white font-mono rounded-[2px]',
  },
  teal: {
    barBg: 'bg-[#0D9488] text-white border border-[#0F766E] dark:bg-[#14B8A6] dark:border-[#0D9488]',
    fillBg: 'bg-white/25 dark:bg-black/25',
    border: 'border-[#0F766E] dark:border-[#0D9488]',
    text: 'text-white',
    badge: 'bg-[#0D9488] text-white',
    groupRowBg: 'bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white',
    groupBadgeBg: 'bg-[#0D9488] text-white border border-[#0F766E]',
    diamondBg: 'bg-[#0D9488] text-white border border-[#0F766E]',
    diamondPill: 'bg-[#0D9488] text-white border border-[#0F766E]',
    diamondText: 'text-[#0D9488] dark:text-[#2DD4BF]',
    guideLine: 'border-[#0D9488]',
    guidePill: 'bg-[#0D9488] text-white font-mono rounded-[2px]',
  },
  orange: {
    barBg: 'bg-[#EA580C] text-white border border-[#C2410C] dark:bg-[#F97316] dark:border-[#EA580C]',
    fillBg: 'bg-white/25 dark:bg-black/25',
    border: 'border-[#C2410C] dark:border-[#EA580C]',
    text: 'text-white',
    badge: 'bg-[#EA580C] text-white',
    groupRowBg: 'bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white',
    groupBadgeBg: 'bg-[#EA580C] text-white border border-[#C2410C]',
    diamondBg: 'bg-[#EA580C] text-white border border-[#C2410C]',
    diamondPill: 'bg-[#EA580C] text-white border border-[#C2410C]',
    diamondText: 'text-[#EA580C] dark:text-[#FB923C]',
    guideLine: 'border-[#EA580C]',
    guidePill: 'bg-[#EA580C] text-white font-mono rounded-[2px]',
  },
  pink: {
    barBg: 'bg-[#DB2777] text-white border border-[#BE185D] dark:bg-[#EC4899] dark:border-[#DB2777]',
    fillBg: 'bg-white/25 dark:bg-black/25',
    border: 'border-[#BE185D] dark:border-[#DB2777]',
    text: 'text-white',
    badge: 'bg-[#DB2777] text-white',
    groupRowBg: 'bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white',
    groupBadgeBg: 'bg-[#DB2777] text-white border border-[#BE185D]',
    diamondBg: 'bg-[#DB2777] text-white border border-[#BE185D]',
    diamondPill: 'bg-[#DB2777] text-white border border-[#BE185D]',
    diamondText: 'text-[#DB2777] dark:text-[#F472B6]',
    guideLine: 'border-[#DB2777]',
    guidePill: 'bg-[#DB2777] text-white font-mono rounded-[2px]',
  },
  slate: {
    barBg: 'bg-[#475569] text-white border border-[#334155] dark:bg-[#64748B] dark:border-[#475569]',
    fillBg: 'bg-white/25 dark:bg-black/25',
    border: 'border-[#334155] dark:border-[#475569]',
    text: 'text-white',
    badge: 'bg-[#475569] text-white',
    groupRowBg: 'bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white',
    groupBadgeBg: 'bg-[#475569] text-white border border-[#334155]',
    diamondBg: 'bg-[#475569] text-white border border-[#334155]',
    diamondPill: 'bg-[#475569] text-white border border-[#334155]',
    diamondText: 'text-[#475569] dark:text-[#94A3B8]',
    guideLine: 'border-[#475569]',
    guidePill: 'bg-[#475569] text-white font-mono rounded-[2px]',
  },
  sky: {
    barBg: 'bg-[#0284C7] text-white border border-[#0369A1] dark:bg-[#38BDF8] dark:border-[#0284C7] dark:text-[#0C0C09]',
    fillBg: 'bg-white/25 dark:bg-black/25',
    border: 'border-[#0369A1] dark:border-[#0284C7]',
    text: 'text-white',
    badge: 'bg-[#0284C7] text-white dark:bg-[#38BDF8] dark:text-[#0C0C09]',
    groupRowBg: 'bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white',
    groupBadgeBg: 'bg-[#0284C7] text-white border border-[#0369A1]',
    diamondBg: 'bg-[#0284C7] text-white border border-[#0369A1]',
    diamondPill: 'bg-[#0284C7] text-white border border-[#0369A1]',
    diamondText: 'text-[#0284C7] dark:text-[#38BDF8]',
    guideLine: 'border-[#0284C7]',
    guidePill: 'bg-[#0284C7] text-white font-mono rounded-[2px]',
  },
  lime: {
    barBg: 'bg-[#65A30D] text-white border border-[#4D7C0F] dark:bg-[#84CC16] dark:border-[#65A30D] dark:text-[#0C0C09]',
    fillBg: 'bg-white/25 dark:bg-black/25',
    border: 'border-[#4D7C0F] dark:border-[#65A30D]',
    text: 'text-white',
    badge: 'bg-[#65A30D] text-white dark:bg-[#84CC16] dark:text-[#0C0C09]',
    groupRowBg: 'bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white',
    groupBadgeBg: 'bg-[#65A30D] text-white border border-[#4D7C0F]',
    diamondBg: 'bg-[#65A30D] text-white border border-[#4D7C0F]',
    diamondPill: 'bg-[#65A30D] text-white border border-[#4D7C0F]',
    diamondText: 'text-[#65A30D] dark:text-[#A3E635]',
    guideLine: 'border-[#65A30D]',
    guidePill: 'bg-[#65A30D] text-white font-mono rounded-[2px]',
  },
};

const PROJECT_ACCENT_COLORS: Record<TaskColor, { hex: string; rgb: string }> = {
  indigo: { hex: '#4F46E5', rgb: '79, 70, 229' },
  blue: { hex: '#2563EB', rgb: '37, 99, 235' },
  emerald: { hex: '#16A34A', rgb: '22, 163, 74' },
  amber: { hex: '#D97706', rgb: '217, 119, 6' },
  rose: { hex: '#DC2626', rgb: '220, 38, 38' },
  violet: { hex: '#7C3AED', rgb: '124, 58, 237' },
  cyan: { hex: '#0891B2', rgb: '8, 145, 178' },
  teal: { hex: '#0D9488', rgb: '13, 148, 136' },
  orange: { hex: '#EA580C', rgb: '234, 88, 12' },
  pink: { hex: '#DB2777', rgb: '219, 39, 119' },
  slate: { hex: '#475569', rgb: '71, 85, 105' },
  sky: { hex: '#0284C7', rgb: '2, 132, 199' },
  lime: { hex: '#65A30D', rgb: '101, 163, 13' },
};

function getProjectAccent(color?: TaskColor): { hex: string; rgb: string } {
  return PROJECT_ACCENT_COLORS[color || 'indigo'] || PROJECT_ACCENT_COLORS.indigo;
}

export const TEAM_BADGE_STYLES: Record<
  TaskColor,
  {
    container: string;
    dot: string;
  }
> = {
  cyan: {
    container: 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-400/80 dark:border-cyan-700 text-cyan-800 dark:text-cyan-200',
    dot: 'bg-[#0891B2] dark:bg-[#06B6D4]',
  },
  teal: {
    container: 'bg-teal-50 dark:bg-teal-950/60 border-teal-400/80 dark:border-teal-700 text-teal-800 dark:text-teal-200',
    dot: 'bg-[#0D9488] dark:bg-[#14B8A6]',
  },
  sky: {
    container: 'bg-sky-50 dark:bg-sky-950/60 border-sky-400/80 dark:border-sky-700 text-sky-800 dark:text-sky-200',
    dot: 'bg-[#0284C7] dark:bg-[#38BDF8]',
  },
  violet: {
    container: 'bg-violet-50 dark:bg-violet-950/60 border-violet-400/80 dark:border-violet-700 text-violet-800 dark:text-violet-200',
    dot: 'bg-[#7C3AED] dark:bg-[#8B5CF6]',
  },
  blue: {
    container: 'bg-blue-50 dark:bg-blue-950/60 border-blue-400/80 dark:border-blue-700 text-blue-800 dark:text-blue-200',
    dot: 'bg-[#2563EB] dark:bg-[#3B82F6]',
  },
  emerald: {
    container: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400/80 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200',
    dot: 'bg-[#16A34A] dark:bg-[#22C55E]',
  },
  lime: {
    container: 'bg-lime-50 dark:bg-lime-950/60 border-lime-400/80 dark:border-lime-700 text-lime-800 dark:text-lime-200',
    dot: 'bg-[#65A30D] dark:bg-[#84CC16]',
  },
  amber: {
    container: 'bg-amber-50 dark:bg-amber-950/60 border-amber-400/80 dark:border-amber-700 text-amber-800 dark:text-amber-200',
    dot: 'bg-[#D97706] dark:bg-[#F59E0B]',
  },
  orange: {
    container: 'bg-orange-50 dark:bg-orange-950/60 border-orange-400/80 dark:border-orange-700 text-orange-800 dark:text-orange-200',
    dot: 'bg-[#EA580C] dark:bg-[#F97316]',
  },
  rose: {
    container: 'bg-rose-50 dark:bg-rose-950/60 border-rose-400/80 dark:border-rose-700 text-rose-800 dark:text-rose-200',
    dot: 'bg-[#DC2626] dark:bg-[#EF4444]',
  },
  pink: {
    container: 'bg-pink-50 dark:bg-pink-950/60 border-pink-400/80 dark:border-pink-700 text-pink-800 dark:text-pink-200',
    dot: 'bg-[#DB2777] dark:bg-[#EC4899]',
  },
  indigo: {
    container: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400/80 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200',
    dot: 'bg-[#4F46E5] dark:bg-[#6366F1]',
  },
  slate: {
    container: 'bg-slate-100 dark:bg-slate-900/60 border-slate-400/80 dark:border-slate-700 text-slate-800 dark:text-slate-200',
    dot: 'bg-[#475569] dark:bg-[#64748B]',
  },
};

const ALERT_LEVEL_CONFIG: Record<
  ProjectAlertLevel,
  { label: string; title: string; className: string; dotColor: string }
> = {
  0: {
    label: 'Nivel 0',
    title: 'Nivel de Alerta 0: Normal / Sin alerta',
    className:
      'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
    dotColor: 'bg-zinc-400',
  },
  1: {
    label: 'Nivel 1',
    title: 'Nivel de Alerta 1: Baja / Leve',
    className:
      'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    dotColor: 'bg-amber-500',
  },
  2: {
    label: 'Nivel 2',
    title: 'Nivel de Alerta 2: Media / Moderada',
    className:
      'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
    dotColor: 'bg-orange-500',
  },
  3: {
    label: 'Nivel 3',
    title: 'Nivel de Alerta 3: Alta / Crítica',
    className:
      'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    dotColor: 'bg-rose-500',
  },
};

export const GanttWorkspace: React.FC<GanttWorkspaceProps> = ({
  items,
  projects = [],
  groupByProject = true,
  selectedProjectId = 'all',
  selectedProjectIds,
  onOpenProjectsView,
  zoom,
  dayWidth: controlledDayWidth,
  onChangeDayWidth,
  onFitToProject,
  showCriticalPath,
  onToggleCriticalPath,
  onScrollToToday,
  showMetricsDrawer = false,
  onToggleMetricsDrawer,
  metricsToggleBtnRef,
  showCpmFloat,
  autoCascade,
  arrowVisibility: controlledArrowVisibility,
  onChangeArrowVisibility,
  onUpdateItem,
  onUpdateItems,
  onReorderItem,
  onMoveItem,
  onMoveItems,
  onEditModal,
  onDeleteItem,
  onDuplicateItem,
  onQuickAdd,
  onToggleGroupByProject,
  onToggleProjectCollapse,
  onUpdateProject,
  onReorderProject,
  onMoveProject,
  onChangeProjectColor,
  onDeleteProject,
  onCreateProject,
  onCreateDigiTask,
  onCreateTaskDirect,
  onCreateUnassignedTask,
  scrollContainerRef,
  showTable: showTableProp,
  onToggleShowTable,
  showRowSeparators: showRowSeparatorsProp,
  onToggleRowSeparators,
  showWeekendShading: showWeekendShadingProp,
  onToggleWeekendShading,
  initialSelectedItemId,
  initialHoveredItemId,
  initialCursorScrubber,
  initialSelectedDepLink,
  initialHoveredDepKey,
  initialConnectModeSource,
  initialInspectingProjectId,
  initialLockedAlertProjectId,
  initialMultiSelectedItemIds,
  initialMultiSelectedProjectIds,
  initialDragRowPreview = null,
  initialDragOverRow = null,
  initialDragProjectPreview = null,
  initialDragOverProject = null,
  initialContextMenu = null,
  baselineSnapshot = null,
  workCalendar,
  useRightSidebarInspector = false,
  releases = [],
  activeReleaseId,
  releaseGuideVisibility = 'selected',
  groupingMode = 'release',
  onToggleGroupingMode,
  onOpenReleasesModal,
  initialVisibleMilestoneKeys,
  initialVisibleColumns,
  hiddenReleaseIds = [],
  onToggleHideRelease,
  onResetHiddenReleases,
  isFocusMode = false,
  focusEntity = null,
  onExitFocusMode,
  onSetFocusEntity,
  selectedEntity = null,
  onSelectEntity,
  selectedPlatform = 'all',
  onChangeSelectedPlatform,
  truncateCharLimit,
  onChangeTruncateCharLimit,
  initialSearchQuery = '',
  initialExcludeQuery = '',
  initialAlertFilter = 'all',
  initialTypeFilter = 'all',
  initialReleaseFilter = 'all',
  initialShowSubtasksOnFilter = false,
  initialSearchFields,
  initialShowSearchFieldsMenu = false,
  initialShowAdvancedPanel = false,
}) => {
  const [focusedProjectInputId, setFocusedProjectInputId] = useState<string | null>(null);
  const [tableSearchQuery, setTableSearchQuery] = useState<string>(initialSearchQuery);
  const [tableExcludeQuery, setTableExcludeQuery] = useState<string>(initialExcludeQuery);
  const [showSubtasksOnFilter, setShowSubtasksOnFilter] = useState<boolean>(initialShowSubtasksOnFilter);
  const [searchFields, setSearchFields] = useState<GanttSearchFieldsConfig>(() => ({
    ...DEFAULT_GANTT_SEARCH_FIELDS,
    ...(initialSearchFields || {}),
  }));
  const [tableTypeFilter, setTableTypeFilter] = useState<UnifiedRowTypeFilter>(initialTypeFilter);
  const [tableReleaseFilter, setTableReleaseFilter] = useState<string>(initialReleaseFilter);
  const [tableTeamFilter, setTableTeamFilter] = useState<string>('all');
  const [tableTagFilter, setTableTagFilter] = useState<string>('all');
  const availableTeams = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const t = it.assignee?.trim();
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [items]);
  const availableTags = useMemo(() => collectAllTags(projects, items), [projects, items]);

  const [tablePlatformFilter, setTablePlatformFilter] = useState<'all' | ProjectPlatform>('all');
  const [tableAlertFilter, setTableAlertFilter] = useState<'all' | ProjectAlertLevel>(initialAlertFilter);

  const activePlatformFilter: 'all' | ProjectPlatform =
    tablePlatformFilter !== 'all'
      ? tablePlatformFilter
      : selectedPlatform && selectedPlatform !== 'all'
      ? normalizePlatform(selectedPlatform) || 'iOS/Android'
      : 'all';

  const handleSelectPlatformFilter = (next: 'all' | ProjectPlatform) => {
    setTablePlatformFilter(next);
    onChangeSelectedPlatform?.(next);
  };
  const [hoveredNameId, setHoveredNameId] = useState<string | null>(null);
  const [activeColorPickerProjId, setActiveColorPickerProjId] = useState<string | null>(null);
  const [collapsedReleaseIds, setCollapsedReleaseIds] = useState<Set<string>>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('ganttflow_collapsed_releases');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
      }
    } catch {}
    return new Set();
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        'ganttflow_collapsed_releases',
        JSON.stringify(Array.from(collapsedReleaseIds))
      );
    } catch {}
  }, [collapsedReleaseIds]);

  const [recentlyExpandedParentIds, setRecentlyExpandedParentIds] = useState<Set<string>>(
    () => new Set()
  );
  const expandAnimTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const [recentlyCollapsedParentIds, setRecentlyCollapsedParentIds] = useState<Set<string>>(
    () => new Set()
  );
  const collapseAnimTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const isCollapseAnimating =
    recentlyExpandedParentIds.size > 0 || recentlyCollapsedParentIds.size > 0;

  const collapseScrollAnchorRef = useRef<{
    selector: string;
    viewportTop: number;
  } | null>(null);
  const [collapseBottomSpacerPx, setCollapseBottomSpacerPx] = useState(0);

  useEffect(() => {
    return () => {
      expandAnimTimersRef.current.forEach((timer) => clearTimeout(timer));
      expandAnimTimersRef.current.clear();
      collapseAnimTimersRef.current.forEach((timer) => clearTimeout(timer));
      collapseAnimTimersRef.current.clear();
    };
  }, []);

  const captureCollapseScrollAnchor = (selector: string) => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;
    collapseScrollAnchorRef.current = {
      selector,
      viewportTop: el.getBoundingClientRect().top,
    };
  };

  const triggerExpandAnimation = (parentKey: string) => {
    const collapseTimer = collapseAnimTimersRef.current.get(parentKey);
    if (collapseTimer) {
      clearTimeout(collapseTimer);
      collapseAnimTimersRef.current.delete(parentKey);
      setRecentlyCollapsedParentIds((prev) => {
        if (!prev.has(parentKey)) return prev;
        const next = new Set(prev);
        next.delete(parentKey);
        return next;
      });
    }
    setCollapseBottomSpacerPx(0);

    const existing = expandAnimTimersRef.current.get(parentKey);
    if (existing) clearTimeout(existing);

    setRecentlyExpandedParentIds((prev) => {
      const next = new Set(prev);
      next.add(parentKey);
      return next;
    });

    const timer = setTimeout(() => {
      setRecentlyExpandedParentIds((prev) => {
        if (!prev.has(parentKey)) return prev;
        const next = new Set(prev);
        next.delete(parentKey);
        return next;
      });
      expandAnimTimersRef.current.delete(parentKey);
    }, 145);
    expandAnimTimersRef.current.set(parentKey, timer);
  };

  const triggerCollapseAnimation = (parentKey: string) => {
    const expandTimer = expandAnimTimersRef.current.get(parentKey);
    if (expandTimer) {
      clearTimeout(expandTimer);
      expandAnimTimersRef.current.delete(parentKey);
      setRecentlyExpandedParentIds((prev) => {
        if (!prev.has(parentKey)) return prev;
        const next = new Set(prev);
        next.delete(parentKey);
        return next;
      });
    }

    const existing = collapseAnimTimersRef.current.get(parentKey);
    if (existing) clearTimeout(existing);

    setRecentlyCollapsedParentIds((prev) => {
      const next = new Set(prev);
      next.add(parentKey);
      return next;
    });

    const timer = setTimeout(() => {
      setRecentlyCollapsedParentIds((prev) => {
        if (!prev.has(parentKey)) return prev;
        const next = new Set(prev);
        next.delete(parentKey);
        return next;
      });
      collapseAnimTimersRef.current.delete(parentKey);
    }, 145);
    collapseAnimTimersRef.current.set(parentKey, timer);
  };

  const handleToggleReleaseCollapse = (releaseId: string) => {
    const isCurrentlyCollapsed = collapsedReleaseIds.has(releaseId);
    if (isCurrentlyCollapsed) {
      triggerExpandAnimation(`rel:${releaseId}`);
    } else {
      captureCollapseScrollAnchor(`[data-release-summary-bar="${releaseId}"], [data-release-group="${releaseId}"]`);
      triggerCollapseAnimation(`rel:${releaseId}`);
    }
    setCollapsedReleaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(releaseId)) next.delete(releaseId);
      else next.add(releaseId);
      return next;
    });
  };

  const handleToggleProjectCollapse = (projectId: string, currentlyCollapsed?: boolean) => {
    const isCollapsedNow =
      currentlyCollapsed ?? Boolean(projectsRef.current.find((p) => p.id === projectId)?.collapsed);
    if (isCollapsedNow) {
      triggerExpandAnimation(`proj:${projectId}`);
    } else {
      captureCollapseScrollAnchor(`[data-project-summary-bar="${projectId}"], [data-project-group="${projectId}"]`);
      triggerCollapseAnimation(`proj:${projectId}`);
    }
    onToggleProjectCollapse?.(projectId);
  };

  const getRowAnimDeltaY = (
    row: { kind: string; group: any },
    rowIndex: number,
    activeParentSet: Set<string>,
    rowsList: Array<{ kind: string; group: any }>
  ): number => {
    if (activeParentSet.size === 0) return -ROW_HEIGHT;
    let targetKind: 'release' | 'project' | null = null;
    let targetId: string | null = null;
    if (row.kind === 'project') {
      const relId = row.group.project.releaseId || '__unassigned__';
      if (activeParentSet.has(`rel:${relId}`)) {
        targetKind = 'release';
        targetId = relId;
      }
    } else if (row.kind === 'add-project') {
      const relId = row.group.release.id;
      if (activeParentSet.has(`rel:${relId}`)) {
        targetKind = 'release';
        targetId = relId;
      }
    } else if (row.kind === 'empty-project' || row.kind === 'add-task' || row.kind === 'item') {
      const relId = row.group.project.releaseId || '__unassigned__';
      const projId = row.group.project.id;
      if (activeParentSet.has(`rel:${relId}`)) {
        targetKind = 'release';
        targetId = relId;
      } else if (activeParentSet.has(`proj:${projId}`)) {
        targetKind = 'project';
        targetId = projId;
      }
    }
    if (!targetKind || !targetId) return -ROW_HEIGHT;
    for (let i = rowIndex - 1; i >= 0; i--) {
      const prev = rowsList[i];
      if (targetKind === 'release' && prev.kind === 'release' && prev.group.release.id === targetId) {
        return (i - rowIndex) * ROW_HEIGHT;
      }
      if (targetKind === 'project' && prev.kind === 'project' && prev.group.project.id === targetId) {
        return (i - rowIndex) * ROW_HEIGHT;
      }
    }
    return -ROW_HEIGHT;
  };

  const isRowCollapsing = (row: { kind: string; group: any }): boolean => {
    if (recentlyCollapsedParentIds.size === 0) return false;
    if (row.kind === 'project') {
      const relKey = `rel:${row.group.project.releaseId || '__unassigned__'}`;
      return recentlyCollapsedParentIds.has(relKey);
    }
    if (row.kind === 'add-project') {
      return recentlyCollapsedParentIds.has(`rel:${row.group.release.id}`);
    }
    if (row.kind === 'empty-project' || row.kind === 'add-task' || row.kind === 'item') {
      const relKey = `rel:${row.group.project.releaseId || '__unassigned__'}`;
      return (
        recentlyCollapsedParentIds.has(`proj:${row.group.project.id}`) ||
        recentlyCollapsedParentIds.has(relKey)
      );
    }
    return false;
  };

  const isRowJustExpanded = (row: { kind: string; group: any }): boolean => {
    if (recentlyExpandedParentIds.size === 0) return false;
    if (row.kind === 'project') {
      const relKey = `rel:${row.group.project.releaseId || '__unassigned__'}`;
      return recentlyExpandedParentIds.has(relKey);
    }
    if (row.kind === 'add-project') {
      return recentlyExpandedParentIds.has(`rel:${row.group.release.id}`);
    }
    if (row.kind === 'empty-project' || row.kind === 'add-task') {
      const relKey = `rel:${row.group.project.releaseId || '__unassigned__'}`;
      return (
        recentlyExpandedParentIds.has(`proj:${row.group.project.id}`) ||
        recentlyExpandedParentIds.has(relKey)
      );
    }
    if (row.kind === 'item') {
      const relKey = `rel:${row.group.project.releaseId || '__unassigned__'}`;
      return (
        recentlyExpandedParentIds.has(`proj:${row.group.project.id}`) ||
        recentlyExpandedParentIds.has(relKey)
      );
    }
    return false;
  };

  const [visibleMilestoneKeys, setVisibleMilestoneKeys] = useState<Set<string>>(() => {
    if (initialVisibleMilestoneKeys) {
      return new Set(initialVisibleMilestoneKeys.map((k) => k.toLowerCase()));
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('ganttflow_visible_milestone_keys');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return new Set(parsed.map((k: string) => String(k).toLowerCase()));
          }
        }
      }
    } catch {}
    return new Set(['qg4', 'qg5']);
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        'ganttflow_visible_milestone_keys',
        JSON.stringify(Array.from(visibleMilestoneKeys))
      );
    } catch {}
  }, [visibleMilestoneKeys]);

  const [showMilestonesMenu, setShowMilestonesMenu] = useState<boolean>(false);
  const milestonesMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMilestonesMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        milestonesMenuRef.current &&
        !milestonesMenuRef.current.contains(e.target as Node)
      ) {
        setShowMilestonesMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMilestonesMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMilestonesMenu]);

  const [hiddenReleaseGuideKeys, setHiddenReleaseGuideKeys] = useState<Set<string>>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('ganttflow_hidden_release_guides');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
      }
    } catch {}
    return new Set();
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        'ganttflow_hidden_release_guides',
        JSON.stringify(Array.from(hiddenReleaseGuideKeys))
      );
    } catch {}
  }, [hiddenReleaseGuideKeys]);

  const handleToggleReleaseGuideLine = (guideKey: string) => {
    setHiddenReleaseGuideKeys((prev) => {
      const next = new Set(prev);
      if (next.has(guideKey)) {
        next.delete(guideKey);
      } else {
        next.add(guideKey);
      }
      return next;
    });
  };
  const [hoveredId, setHoveredId] = useState<string | null>(
    initialHoveredItemId || null
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    initialSelectedItemId || null
  );
  const [selectedDiagramProjectId, setSelectedDiagramProjectId] = useState<string | null>(null);
  const [selectedDiagramReleaseId, setSelectedDiagramReleaseId] = useState<string | null>(null);

  // Multi-selection state for tasks/milestones and projects (move together on timeline)
  const [multiSelectedItemIds, setMultiSelectedItemIds] = useState<Set<string>>(
    () => new Set(initialMultiSelectedItemIds || [])
  );
  const [multiSelectedProjectIds, setMultiSelectedProjectIds] = useState<Set<string>>(
    () => new Set(initialMultiSelectedProjectIds || [])
  );
  const lastMultiAnchorRef = useRef<{ kind: 'item' | 'project'; id: string } | null>(null);

  const effectiveMultiItemIds = useMemo(() => {
    const set = new Set<string>(multiSelectedItemIds);
    if (multiSelectedProjectIds.size > 0) {
      for (const it of items) {
        const pid = it.projectId || projects[0]?.id;
        if (pid && multiSelectedProjectIds.has(pid)) {
          set.add(it.id);
        }
      }
    }
    return set;
  }, [multiSelectedItemIds, multiSelectedProjectIds, items, projects]);

  const hasMultiSelection =
    multiSelectedItemIds.size > 0 || multiSelectedProjectIds.size > 0;

  const clearMultiSelection = () => {
    setMultiSelectedItemIds(new Set());
    setMultiSelectedProjectIds(new Set());
    lastMultiAnchorRef.current = null;
  };

  const shiftItemsByDays = (
    targetIds: Set<string>,
    deltaDays: number,
    attemptedLabel = 'mover selección múltiple en el cronograma'
  ): boolean => {
    if (deltaDays === 0 || targetIds.size === 0) return false;
    for (const id of targetIds) {
      const target = items.find((it) => it.id === id);
      if (!target) continue;
      const lockedProj = getLockedProjectForItem(target, projectsRef.current);
      if (lockedProj) {
        setLockedAlertState({
          project: lockedProj,
          attemptedAction: attemptedLabel,
        });
        return false;
      }
    }

    const nextItems = items.map((it) => {
      if (!targetIds.has(it.id)) return it;
      const origStart = parseDateSafe(it.startDate);
      const origDur = it.type === 'milestone' ? 0 : Math.max(1, it.duration);
      const newStart = formatDateISO(addDays(origStart, deltaDays));
      const newEnd =
        it.type === 'milestone'
          ? newStart
          : calculateEndDateFromDuration(newStart, origDur, 'task');
      return {
        ...it,
        startDate: newStart,
        endDate: newEnd,
      };
    });

    const sign = deltaDays > 0 ? `+${deltaDays}` : `${deltaDays}`;
    if (onUpdateItems) {
      onUpdateItems(nextItems, {
        actionType: 'edit_item',
        actionLabel: 'Mover Múltiple',
        description: `Mover ${targetIds.size} elemento(s) juntos (${sign}d)`,
      });
    } else {
      for (const updated of nextItems) {
        if (targetIds.has(updated.id)) {
          onUpdateItem(updated, false);
        }
      }
    }
    return true;
  };

  const effectiveSelectedItemId = selectedEntity
    ? selectedEntity.type === 'task'
      ? selectedEntity.id
      : null
    : selectedItemId;
  const effectiveSelectedProjectId = selectedEntity
    ? selectedEntity.type === 'project'
      ? selectedEntity.id
      : null
    : selectedDiagramProjectId;
  const effectiveSelectedReleaseId = selectedEntity
    ? selectedEntity.type === 'release'
      ? selectedEntity.id
      : null
    : selectedDiagramReleaseId;

  useEffect(() => {
    if (selectedEntity?.type === 'task') {
      setSelectedItemId(selectedEntity.id);
      setSelectedDiagramProjectId(null);
      setSelectedDiagramReleaseId(null);
      const targetItem = items.find((it) => it.id === selectedEntity.id);
      if (targetItem) {
        const targetProj = projects.find((p) => p.id === targetItem.projectId);
        const relId = targetItem.releaseId || targetProj?.releaseId;
        if (relId && collapsedReleaseIds.has(relId)) {
          setCollapsedReleaseIds((prev) => {
            const next = new Set(prev);
            next.delete(relId);
            return next;
          });
        }
      }
    }
  }, [selectedEntity]);

  const handleSelectProject = (proj: GanttProject) => {
    const isCurrent = effectiveSelectedProjectId === proj.id;
    const next = isCurrent
      ? null
      : {
          type: 'project' as const,
          id: proj.id,
          name: proj.name,
        };
    setSelectedDiagramProjectId(next ? proj.id : null);
    setSelectedDiagramReleaseId(null);
    setSelectedItemId(null);
    setSelectedDepLink(null);
    if (!useRightSidebarInspector) {
      setInspectingProject(next ? proj : null);
    }
    onSelectEntity?.(next);
  };

  const handleSelectRelease = (rel: Release) => {
    const isCurrent = effectiveSelectedReleaseId === rel.id;
    const next = isCurrent
      ? null
      : {
          type: 'release' as const,
          id: rel.id,
          name: rel.name || rel.code,
        };
    setSelectedDiagramReleaseId(next ? rel.id : null);
    setSelectedDiagramProjectId(null);
    setSelectedItemId(null);
    setSelectedDepLink(null);
    onSelectEntity?.(next);
  };

  const handleSelectTaskFromTable = (item: ComputedGanttItem, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      e.stopPropagation();
      toggleMultiSelectItem(item.id, e.shiftKey);
      return;
    }
    const targetEl = e.target as HTMLElement | null;
    if (targetEl?.closest('button')) return;
    const isFormControl = Boolean(targetEl?.closest('input, select, textarea, a'));
    const isAlreadySelected = effectiveSelectedItemId === item.id;
    if (isFormControl && isAlreadySelected) return;

    setSelectedDepLink(null);
    setSelectedDiagramProjectId(null);
    setSelectedDiagramReleaseId(null);
    const nextId = isAlreadySelected ? null : item.id;
    setSelectedItemId(nextId);
    onSelectEntity?.(nextId ? { type: 'task', id: nextId, name: item.name } : null);
  };

  const [inspectingProject, setInspectingProject] = useState<GanttProject | null>(() => {
    if (initialInspectingProjectId && projects.length > 0) {
      return projects.find((p) => p.id === initialInspectingProjectId) || null;
    }
    return null;
  });

  useEffect(() => {
    if (!inspectingProject || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setInspectingProject(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [inspectingProject]);
  const [selectedDepLink, setSelectedDepLink] = useState<{
    predId: string;
    succId: string;
  } | null>(initialSelectedDepLink || null);
  const inspectionPanelRef = useRef<HTMLElement>(null);
  const depPopoverRef = useRef<HTMLElement>(null);
  const cronogramaToolbarRef = useRef<HTMLDivElement>(null);
  const splitPaneRef = useRef<HTMLDivElement>(null);
  const tableHeaderRef = useRef<HTMLDivElement>(null);
  const calendarHeaderRef = useRef<HTMLDivElement>(null);

  const [hoveredDepKey, setHoveredDepKey] = useState<string | null>(
    initialHoveredDepKey || null
  );
  const [connectModeSource, setConnectModeSource] = useState<{
    itemId: string;
    role: 'pred' | 'succ';
    port?: DependencyPortSide;
  } | null>(initialConnectModeSource || null);
  const [reconnectMode, setReconnectMode] = useState<{
    oldPredId: string;
    oldSuccId: string;
    endpoint: 'source' | 'target';
    depType: DependencyType;
  } | null>(null);
  const [depDragState, setDepDragState] = useState<{
    mode: 'create' | 'move-source' | 'move-target';
    originPort?: 'out' | 'in';
    fixedItemId: string;
    oldPredId?: string;
    oldSuccId?: string;
    depType: DependencyType;
    startX: number;
    startY: number;
    cursorX: number;
    cursorY: number;
    hoveredTargetId: string | null;
    hoveredTargetPort: DependencyPortSide | null;
  } | null>(null);
  const [depFeedback, setDepFeedback] = useState<{
    message: string;
    tone: 'success' | 'error' | 'info';
  } | null>(null);
  const [commentsDrawerTarget, setCommentsDrawerTarget] = useState<{
    entityType: 'project' | 'item';
    id: string;
    code?: string;
  } | null>(null);
  const [lockedAlertState, setLockedAlertState] = useState<{
    project: GanttProject;
    attemptedAction?: string;
  } | null>(() => {
    if (initialLockedAlertProjectId && projects.length > 0) {
      const found = projects.find((p) => p.id === initialLockedAlertProjectId);
      if (found) {
        return {
          project: found,
          attemptedAction: 'mover elementos en el cronograma',
        };
      }
    }
    return null;
  });
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const showWorkspaceToast = (
    message: string,
    tone: 'success' | 'error' | 'info' = 'info'
  ) => {
    setDepFeedback({ message, tone });
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        setDepFeedback((prev) => (prev?.message === message ? null : prev));
      }, 2800);
    }
  };

  /**
   * Returns true if the target project is unlocked; otherwise opens the unlock alert modal and returns false.
   */
  const guardProjectUnlocked = (
    projectId: string | undefined,
    attemptedAction: string
  ): boolean => {
    const currentProjects = projectsRef.current;
    const pid = projectId || currentProjects[0]?.id;
    const proj = pid ? currentProjects.find((p) => p.id === pid) : undefined;
    if (proj?.locked) {
      setLockedAlertState({ project: proj, attemptedAction });
      return false;
    }
    return true;
  };

  /**
   * Returns true if the item's parent project is unlocked; otherwise opens the unlock alert modal and returns false.
   */
  const guardItemUnlocked = (
    itemOrId: string | Pick<GanttItem, 'projectId'> | undefined,
    attemptedAction: string
  ): boolean => {
    const resolvedItem =
      typeof itemOrId === 'string'
        ? itemsRef.current.find((it) => it.id === itemOrId)
        : itemOrId;
    const lockedProj = getLockedProjectForItem(resolvedItem, projectsRef.current);
    if (lockedProj) {
      setLockedAlertState({ project: lockedProj, attemptedAction });
      return false;
    }
    return true;
  };

  const handleToggleProjectLock = (
    project: GanttProject,
    nextLocked = !project.locked
  ) => {
    const updated: GanttProject = { ...project, locked: nextLocked };
    onUpdateProject?.(updated);
    setInspectingProject((prev) =>
      prev && prev.id === project.id ? { ...prev, locked: nextLocked } : prev
    );
    if (!nextLocked) {
      setLockedAlertState((prev) =>
        prev && prev.project.id === project.id ? null : prev
      );
      showWorkspaceToast(
        `Proyecto «${project.name}» desbloqueado. Ya puedes realizar cambios.`,
        'success'
      );
    } else {
      showWorkspaceToast(
        `Proyecto «${project.name}» bloqueado para evitar cambios accidentales.`,
        'info'
      );
    }
  };

  const guardedUpdateItem = (updated: GanttItem, cascade: boolean) => {
    const prev = itemsRef.current.find((it) => it.id === updated.id);
    if (!guardItemUnlocked(prev || updated, `editar «${updated.name}»`)) return;
    if (
      prev &&
      updated.projectId !== prev.projectId &&
      !guardProjectUnlocked(
        updated.projectId,
        `mover «${updated.name}» a proyecto bloqueado`
      )
    ) {
      return;
    }
    onUpdateItem(updated, cascade);
  };

  const guardedReorderItem = (itemId: string, direction: 'up' | 'down') => {
    if (!guardItemUnlocked(itemId, 'reordenar tarea en la tabla')) return;
    onReorderItem?.(itemId, direction);
  };

  const guardedEditModal = (item: ComputedGanttItem) => {
    if (!guardItemUnlocked(item, `editar «${item.name}»`)) return;
    onEditModal(item);
  };

  const guardedDuplicateItem = (item: ComputedGanttItem) => {
    if (!guardItemUnlocked(item, `duplicar «${item.name}»`)) return;
    onDuplicateItem(item);
  };

  const guardedDeleteItem = (id: string) => {
    const it = itemsRef.current.find((x) => x.id === id);
    if (!guardItemUnlocked(it || id, `eliminar «${it?.name || 'ítem'}»`)) {
      return;
    }
    onDeleteItem(id);
  };

  const guardedQuickAdd = (type: 'task' | 'milestone', projectId?: string) => {
    const targetPid = projectId || projectsRef.current[0]?.id;
    if (
      targetPid &&
      !guardProjectUnlocked(
        targetPid,
        type === 'milestone'
          ? 'añadir hito en proyecto bloqueado'
          : 'añadir tarea en proyecto bloqueado'
      )
    ) {
      return;
    }
    onQuickAdd(type, projectId);
  };

  const guardedCreateTaskDirect = (projectId: string) => {
    if (!guardProjectUnlocked(projectId, 'añadir tarea en proyecto bloqueado')) {
      return;
    }
    if (onCreateTaskDirect) {
      onCreateTaskDirect(projectId);
    } else {
      onQuickAdd('task', projectId);
    }
  };

  const guardedUpdateProject = (
    project: GanttProject,
    actionLabel = 'editar proyecto'
  ) => {
    const current = projectsRef.current.find((p) => p.id === project.id);
    if (current?.locked && project.locked) {
      setLockedAlertState({ project: current, attemptedAction: actionLabel });
      return;
    }
    onUpdateProject?.(project);
  };

  const guardedReorderProject = (projectId: string, direction: 'up' | 'down') => {
    if (!guardProjectUnlocked(projectId, 'mover proyecto en el cronograma')) {
      return;
    }
    onReorderProject?.(projectId, direction);
  };

  const guardedChangeProjectColor = (projectId: string, newColor: TaskColor) => {
    if (
      !guardProjectUnlocked(projectId, 'cambiar color de proyecto bloqueado')
    ) {
      return;
    }
    onChangeProjectColor?.(projectId, newColor);
  };

  const guardedDeleteProject = (projectId: string) => {
    if (!guardProjectUnlocked(projectId, 'eliminar proyecto bloqueado')) {
      return;
    }
    onDeleteProject?.(projectId);
  };

  const guardedCreateDigiTask = (
    project: GanttProject,
    taskType?: 'DIGI' | 'SCR'
  ) => {
    if (
      !guardProjectUnlocked(
        project.id,
        `añadir tarea ${taskType || 'DIGI'} en proyecto bloqueado`
      )
    ) {
      return;
    }
    onCreateDigiTask?.(project, taskType);
  };

  const [cursorScrubber, setCursorScrubber] = useState<{
    x: number;
    date: Date;
  } | null>(initialCursorScrubber || null);
  const hasDraggedRef = useRef<boolean>(false);

  const [splitWidth, setSplitWidth] = useState<number>(480);
  const [splitExpandedPrevWidth, setSplitExpandedPrevWidth] = useState<number | null>(null);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [internalShowTable, setInternalShowTable] = useState<boolean>(true);
  const showTable = showTableProp !== undefined ? showTableProp : internalShowTable;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId: number | null = null;

    const syncStickyHeaders = () => {
      rafId = null;
      const splitEl = splitPaneRef.current;
      if (!splitEl) return;
      const splitRect = splitEl.getBoundingClientRect();
      const toolbarEl = cronogramaToolbarRef.current;
      const anchorTop = toolbarEl ? toolbarEl.getBoundingClientRect().bottom : 88;
      const maxOffset = Math.max(0, splitRect.height - HEADER_HEIGHT);
      const offsetY =
        splitRect.top < anchorTop
          ? Math.min(maxOffset, Math.max(0, Math.round(anchorTop - splitRect.top)))
          : 0;
      const transformVal = offsetY > 0 ? `translateY(${offsetY}px)` : '';
      if (calendarHeaderRef.current) {
        calendarHeaderRef.current.style.transform = transformVal;
      }
      if (tableHeaderRef.current) {
        tableHeaderRef.current.style.transform = transformVal;
      }
    };

    const handleScrollOrResize = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(syncStickyHeaders);
      }
    };

    syncStickyHeaders();
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [showTable, items.length, projects.length]);

  const [wheelZoomEnabled, setWheelZoomEnabled] = useState<boolean>(true);
  const [visibleColumns, setVisibleColumns] = useState<{
    team: boolean;
    dates: boolean;
    dur: boolean;
    slack: boolean;
    deps: boolean;
  }>(() => {
    if (initialVisibleColumns) {
      return {
        team: true,
        deps: true,
        dates: false,
        dur: false,
        slack: false,
        ...initialVisibleColumns,
      };
    }
    try {
      const saved = localStorage.getItem('ganttflow_visible_cols');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { team: true, deps: true, dates: false, dur: false, slack: false };
  });
  const [showColumnsMenu, setShowColumnsMenu] = useState<boolean>(false);
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showColumnsMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        columnsMenuRef.current &&
        !columnsMenuRef.current.contains(e.target as Node)
      ) {
        setShowColumnsMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowColumnsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showColumnsMenu]);

  // Configurable text truncation limit (controlled via prop or local fallback)
  const [internalTruncateLimit, setInternalTruncateLimit] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(TRUNCATE_LIMIT_STORAGE_KEY);
        if (saved) {
          const num = parseInt(saved, 10);
          if (Number.isFinite(num) && num >= 5 && num <= 200) return num;
        }
      }
    } catch {}
    return DEFAULT_TRUNCATE_CHAR_LIMIT;
  });

  const effectiveTruncateLimit =
    truncateCharLimit !== undefined ? truncateCharLimit : internalTruncateLimit;

  const handleUpdateTruncateLimit = (val: number) => {
    const clamped = Math.max(5, Math.min(200, val));
    if (onChangeTruncateCharLimit) {
      onChangeTruncateCharLimit(clamped);
    } else {
      setInternalTruncateLimit(clamped);
      try {
        localStorage.setItem(TRUNCATE_LIMIT_STORAGE_KEY, String(clamped));
      } catch {}
    }
  };

  // Configurable horizontal task row separation lines (controlled via prop or local fallback)
  const [internalShowRowSeparators, setInternalShowRowSeparators] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ganttflow_show_row_separators');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const showRowSeparators =
    showRowSeparatorsProp !== undefined ? showRowSeparatorsProp : internalShowRowSeparators;

  const handleToggleRowSeparators = () => {
    if (onToggleRowSeparators) {
      onToggleRowSeparators();
    } else {
      setInternalShowRowSeparators((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('ganttflow_show_row_separators', String(next));
        } catch {}
        return next;
      });
    }
  };

  // Configurable weekend column shading (controlled via prop or local fallback, default false for clean flat timeline)
  const [internalShowWeekendShading, setInternalShowWeekendShading] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ganttflow_show_weekend_shading');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  const showWeekendShading =
    showWeekendShadingProp !== undefined ? showWeekendShadingProp : internalShowWeekendShading;

  const handleToggleWeekendShading = () => {
    if (onToggleWeekendShading) {
      onToggleWeekendShading();
    } else {
      setInternalShowWeekendShading((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('ganttflow_show_weekend_shading', String(next));
        } catch {}
        return next;
      });
    }
  };

  const handleToggleCriticalPath = () => {
    if (onToggleCriticalPath) {
      onToggleCriticalPath();
    }
  };

  const handleScrollToToday = () => {
    if (onScrollToToday) {
      onScrollToToday();
      return;
    }
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const marker = container.querySelector('#gantt-today-marker') as HTMLElement | null;
    const todayX = marker ? Number(marker.getAttribute('data-today-x') || marker.offsetLeft) : 180;
    const targetLeft = Math.max(0, todayX - container.clientWidth / 3);
    container.scrollTo({
      left: targetLeft,
      behavior: 'smooth',
    });
  };

  const handleToggleMetrics = () => {
    if (onToggleMetricsDrawer) {
      onToggleMetricsDrawer();
    }
  };


  // Track focused task input in the table so full name is editable when focused
  const [focusedTaskInputId, setFocusedTaskInputId] = useState<string | null>(null);

  // Inline Project Creation state
  const [isCreatingProject, setIsCreatingProject] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectColor, setNewProjectColor] = useState<TaskColor>('indigo');
  const [newProjectReleaseId, setNewProjectReleaseId] = useState<string>(
    () => releases[0]?.id || 'rel-t-26-12-1'
  );
  const newProjectFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCreatingProject) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        newProjectFormRef.current &&
        !newProjectFormRef.current.contains(e.target as Node)
      ) {
        if (!newProjectName.trim()) {
          setIsCreatingProject(false);
        }
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreatingProject(false);
        setNewProjectName('');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCreatingProject, newProjectName]);

  // Outside click & escape handlers to dismiss task inspection panel
  useEffect(() => {
    if (!effectiveSelectedItemId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        inspectionPanelRef.current &&
        !inspectionPanelRef.current.contains(e.target as Node)
      ) {
        const target = e.target as HTMLElement | null;
        if (
          target?.closest(
            '[data-timeline-task], [data-timeline-milestone], [data-task-row], [data-testid^="conflict-item-btn-"]'
          )
        ) {
          return;
        }
        setSelectedItemId(null);
        onSelectEntity?.(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedItemId(null);
        onSelectEntity?.(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [effectiveSelectedItemId, onSelectEntity]);

  // Outside click & escape handlers to dismiss dependency details popover
  useEffect(() => {
    if (!selectedDepLink) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        depPopoverRef.current &&
        !depPopoverRef.current.contains(e.target as Node)
      ) {
        const target = e.target as HTMLElement | null;
        if (target?.closest('[data-dep-link-id], [data-dep-hit-area], [data-dep-midpoint]')) {
          return;
        }
        setSelectedDepLink(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedDepLink(null);
        setReconnectMode(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedDepLink]);

  // Cancel interactive connection modes with Escape key
  useEffect(() => {
    if (!connectModeSource && !reconnectMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectModeSource(null);
        setReconnectMode(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [connectModeSource, reconnectMode]);

  const toggleVisibleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('ganttflow_visible_cols', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // State and refs for drag-and-drop row reordering in the WBS table (supports both mouse/pointer drag and HTML5 DnD)
  const [draggingRowId, setDraggingRowId] = useState<string | null>(
    initialDragRowPreview?.itemId ?? null
  );
  const [draggingMultiRowIds, setDraggingMultiRowIds] = useState<Set<string> | null>(null);
  const [dragVerticalDeltaY, setDragVerticalDeltaY] = useState<number>(0);
  const [dragOverRow, setDragOverRow] = useState<{
    id: string;
    position: 'before' | 'after';
  } | null>(initialDragOverRow);
  const [dragRowPreview, setDragRowPreview] = useState<{
    itemId: string;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    width: number;
    multiCount?: number;
  } | null>(() =>
    initialDragRowPreview
      ? {
          itemId: initialDragRowPreview.itemId,
          x: initialDragRowPreview.x,
          y: initialDragRowPreview.y,
          offsetX: initialDragRowPreview.offsetX ?? 24,
          offsetY: initialDragRowPreview.offsetY ?? ROW_HEIGHT / 2,
          width: initialDragRowPreview.width ?? 320,
        }
      : null
  );

  const draggingRowIdRef = useRef<string | null>(null);
  const draggingMultiRowIdsRef = useRef<Set<string> | null>(null);
  const dragOverRowRef = useRef<{
    id: string;
    position: 'before' | 'after';
  } | null>(null);

  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(
    initialDragProjectPreview?.projectId ?? null
  );
  const [dragOverProject, setDragOverProject] = useState<{
    id: string;
    position: 'before' | 'after';
  } | null>(initialDragOverProject);
  const [dragProjectPreview, setDragProjectPreview] = useState<{
    projectId: string;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    width: number;
  } | null>(() =>
    initialDragProjectPreview
      ? {
          projectId: initialDragProjectPreview.projectId,
          x: initialDragProjectPreview.x,
          y: initialDragProjectPreview.y,
          offsetX: initialDragProjectPreview.offsetX ?? 24,
          offsetY: initialDragProjectPreview.offsetY ?? ROW_HEIGHT / 2,
          width: initialDragProjectPreview.width ?? 320,
        }
      : null
  );
  const draggingProjectIdRef = useRef<string | null>(null);
  const dragOverProjectRef = useRef<{
    id: string;
    position: 'before' | 'after';
  } | null>(null);
  const onMoveProjectRef = useRef(onMoveProject);
  onMoveProjectRef.current = onMoveProject;

  const [contextMenu, setContextMenu] = useState<{
    type: 'project' | 'task';
    id: string;
    x: number;
    y: number;
  } | null>(initialContextMenu);

  useEffect(() => {
    if (!contextMenu) return;
    const handlePointerDown = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && target.closest('[data-testid="wbs-context-menu"]')) return;
      setContextMenu(null);
    };
    const handleKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setContextMenu(null);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [contextMenu]);
  const cleanupPointerListenersRef = useRef<(() => void) | null>(null);
  const lastMouseDownInteractiveRef = useRef<boolean>(false);
  const onMoveItemRef = useRef(onMoveItem);
  onMoveItemRef.current = onMoveItem;
  const onMoveItemsRef = useRef(onMoveItems);
  onMoveItemsRef.current = onMoveItems;

  const guardMoveRowUnlocked = (sourceId: string, targetId: string): boolean => {
    if (!guardItemUnlocked(sourceId, 'mover tarea de posición en la tabla')) {
      return false;
    }
    if (targetId.startsWith('project:')) {
      return guardProjectUnlocked(
        targetId.slice('project:'.length),
        'mover tarea dentro de un proyecto bloqueado'
      );
    }
    return guardItemUnlocked(
      targetId,
      'mover tarea dentro de un proyecto bloqueado'
    );
  };

  useEffect(() => {
    return () => {
      cleanupPointerListenersRef.current?.();
      if (typeof document !== 'undefined') {
        document.body.style.cursor = '';
      }
    };
  }, []);

  const resolveEffectiveDropPosition = (
    sourceId: string,
    targetId: string,
    rawPos: 'before' | 'after'
  ): 'before' | 'after' => {
    if (!sourceId || !targetId || targetId.startsWith('project:')) return 'after';
    const currentItems = itemsRef.current;
    const sourceItem = currentItems.find((it) => it.id === sourceId);
    const targetItem = currentItems.find((it) => it.id === targetId);
    if (!sourceItem || !targetItem) return rawPos;

    const fallbackPid = projects[0]?.id;
    const sPid = sourceItem.projectId || fallbackPid;
    const tPid = targetItem.projectId || fallbackPid;
    if (sPid === tPid) {
      const sameProj = currentItems.filter(
        (it) => (it.projectId || fallbackPid) === tPid
      );
      const sIdx = sameProj.findIndex((it) => it.id === sourceId);
      const tIdx = sameProj.findIndex((it) => it.id === targetId);
      if (sIdx !== -1 && tIdx !== -1) {
        if (tIdx === sIdx + 1 && rawPos === 'before') return 'after';
        if (tIdx === sIdx - 1 && rawPos === 'after') return 'before';
      }
    }
    return rawPos;
  };

  const startTaskRowReorderDrag = (
    itemId: string,
    startX: number,
    startY: number,
    opts?: {
      rowRect?: DOMRect;
      fromTimeline?: boolean;
      immediateStart?: boolean;
      clientX?: number;
      clientY?: number;
    }
  ) => {
    cleanupPointerListenersRef.current?.();

    const rowRect = opts?.rowRect;
    const fromTimeline = Boolean(opts?.fromTimeline);
    const previewWidth = rowRect
      ? Math.min(Math.max(240, rowRect.width), Math.max(280, splitWidth - 16), 440)
      : 320;
    const grabOffsetX = rowRect
      ? Math.min(Math.max(16, startX - rowRect.left), previewWidth - 24)
      : 24;
    const grabOffsetY = rowRect
      ? Math.min(Math.max(8, startY - rowRect.top), ROW_HEIGHT - 8)
      : ROW_HEIGHT / 2;

    const initialScrollTop = scrollContainerRef.current?.scrollTop ?? 0;
    const tableSnapshots = Array.from(
      document.querySelectorAll<HTMLElement>('[data-task-row], [data-project-group]')
    ).map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        taskRowId: node.getAttribute('data-task-row'),
        projGroupId: node.getAttribute('data-project-group'),
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
      };
    });
    const timelineSnapshots =
      tableSnapshots.length === 0
        ? Array.from(
            document.querySelectorAll<HTMLElement>('[data-timeline-bar-row]')
          ).map((node) => {
            const rect = node.getBoundingClientRect();
            return {
              taskRowId: node.getAttribute('data-timeline-bar-row'),
              projGroupId: null as string | null,
              top: rect.top,
              bottom: rect.bottom,
              height: rect.height,
            };
          })
        : [];
    const snapshots = tableSnapshots.length > 0 ? tableSnapshots : timelineSnapshots;

    const movingMultiIds =
      effectiveMultiItemIds.has(itemId) && effectiveMultiItemIds.size > 1
        ? new Set(effectiveMultiItemIds)
        : null;

    const resetRowDragVisuals = () => {
      draggingRowIdRef.current = null;
      draggingMultiRowIdsRef.current = null;
      dragOverRowRef.current = null;
      setDraggingRowId(null);
      setDraggingMultiRowIds(null);
      setDragVerticalDeltaY(0);
      setDragOverRow(null);
      setDragRowPreview(null);
      if (typeof document !== 'undefined') {
        document.body.style.cursor = '';
      }
    };

    const detachListeners = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown, true);
      if (cleanupPointerListenersRef.current === detachListeners) {
        cleanupPointerListenersRef.current = null;
      }
    };

    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape' && draggingRowIdRef.current) {
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        detachListeners();
        resetRowDragVisuals();
      }
    };

    const updateHitTarget = (clientX: number, clientY: number) => {
      const scrollDelta = (scrollContainerRef.current?.scrollTop ?? 0) - initialScrollTop;
      setDragVerticalDeltaY(clientY - startY + scrollDelta);
      if (!fromTimeline) {
        setDragRowPreview({
          itemId,
          x: clientX,
          y: clientY,
          offsetX: grabOffsetX,
          offsetY: grabOffsetY,
          width: previewWidth,
          multiCount: movingMultiIds?.size,
        });
      }

      const moveY = clientY + scrollDelta;

      let matched: (typeof snapshots)[number] | null = null;
      let minDistance = Infinity;

      for (const snap of snapshots) {
        if (moveY >= snap.top && moveY <= snap.bottom) {
          matched = snap;
          minDistance = 0;
          break;
        }
        const distToNode = Math.min(
          Math.abs(moveY - snap.top),
          Math.abs(moveY - snap.bottom)
        );
        if (distToNode < minDistance && distToNode <= 28) {
          minDistance = distToNode;
          matched = snap;
        }
      }

      if (matched) {
        if (matched.taskRowId) {
          if (
            matched.taskRowId === itemId ||
            (movingMultiIds && movingMultiIds.has(matched.taskRowId))
          ) {
            dragOverRowRef.current = null;
            setDragOverRow(null);
          } else {
            const relY = moveY - matched.top;
            const rawPosition: 'before' | 'after' =
              relY < matched.height / 2 ? 'before' : 'after';
            const position = resolveEffectiveDropPosition(
              itemId,
              matched.taskRowId,
              rawPosition
            );
            const nextOver = { id: matched.taskRowId, position };
            dragOverRowRef.current = nextOver;
            setDragOverRow(nextOver);
          }
        } else if (matched.projGroupId) {
          const nextOver = {
            id: `project:${matched.projGroupId}`,
            position: 'after' as const,
          };
          dragOverRowRef.current = nextOver;
          setDragOverRow(nextOver);
        }
      } else {
        dragOverRowRef.current = null;
        setDragOverRow(null);
      }
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (typeof moveEvent.buttons === 'number' && (moveEvent.buttons & 1) === 0) {
        detachListeners();
        resetRowDragVisuals();
        return;
      }

      const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (!draggingRowIdRef.current && dist < 4) {
        return;
      }

      if (!draggingRowIdRef.current) {
        const idsToCheck = movingMultiIds ? Array.from(movingMultiIds) : [itemId];
        for (const id of idsToCheck) {
          if (!guardItemUnlocked(id, 'reordenar tarea en la tabla')) {
            detachListeners();
            resetRowDragVisuals();
            return;
          }
        }
        draggingRowIdRef.current = itemId;
        draggingMultiRowIdsRef.current = movingMultiIds;
        setDraggingRowId(itemId);
        setDraggingMultiRowIds(movingMultiIds);
        if (typeof document !== 'undefined') {
          document.body.style.cursor = 'grabbing';
        }
      }

      updateHitTarget(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      detachListeners();

      const activeSource = draggingRowIdRef.current;
      const activeMultiSources = draggingMultiRowIdsRef.current;
      const activeTarget = dragOverRowRef.current;

      resetRowDragVisuals();

      if (activeSource && activeTarget && activeSource !== activeTarget.id) {
        if (
          activeMultiSources &&
          activeMultiSources.size > 1 &&
          onMoveItemsRef.current
        ) {
          const ids = Array.from(activeMultiSources);
          const allUnlocked = ids.every((id) =>
            guardMoveRowUnlocked(id, activeTarget.id)
          );
          if (allUnlocked) {
            onMoveItemsRef.current(ids, activeTarget.id, activeTarget.position);
          }
        } else if (onMoveItemRef.current) {
          if (guardMoveRowUnlocked(activeSource, activeTarget.id)) {
            onMoveItemRef.current(
              activeSource,
              activeTarget.id,
              activeTarget.position
            );
          }
        }
      }
    };

    if (opts?.immediateStart) {
      const idsToCheck = movingMultiIds ? Array.from(movingMultiIds) : [itemId];
      for (const id of idsToCheck) {
        if (!guardItemUnlocked(id, 'reordenar tarea')) {
          return;
        }
      }
      draggingRowIdRef.current = itemId;
      draggingMultiRowIdsRef.current = movingMultiIds;
      setDraggingRowId(itemId);
      setDraggingMultiRowIds(movingMultiIds);
      if (typeof document !== 'undefined') {
        document.body.style.cursor = 'grabbing';
      }
      updateHitTarget(opts.clientX ?? startX, opts.clientY ?? startY);
    }

    cleanupPointerListenersRef.current = detachListeners;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown, true);
  };

  const handleRowPointerMouseDown = (
    e: React.MouseEvent,
    itemId: string,
    fromGripHandle = false
  ) => {
    if (e.button !== 0) return;
    if (!fromGripHandle && (e.metaKey || e.ctrlKey || e.shiftKey)) return;
    const targetEl = e.target as HTMLElement | null;
    if (
      !fromGripHandle &&
      targetEl &&
      targetEl.closest('input, button, select, textarea, a')
    ) {
      lastMouseDownInteractiveRef.current = true;
      return;
    }

    lastMouseDownInteractiveRef.current = false;
    e.preventDefault();
    if (fromGripHandle) {
      e.stopPropagation();
    }

    const rowEl = (e.currentTarget as HTMLElement).closest('[data-task-row]') as HTMLElement | null;
    startTaskRowReorderDrag(itemId, e.clientX, e.clientY, {
      rowRect: rowEl?.getBoundingClientRect(),
      fromTimeline: false,
    });
  };

  const startProjectRowReorderDrag = (
    projectId: string,
    startX: number,
    startY: number,
    opts?: {
      rowRect?: DOMRect;
      fromTimeline?: boolean;
      immediateStart?: boolean;
      clientX?: number;
      clientY?: number;
    }
  ) => {
    cleanupPointerListenersRef.current?.();

    const rowRect = opts?.rowRect;
    const fromTimeline = Boolean(opts?.fromTimeline);
    const previewWidth = rowRect
      ? Math.min(Math.max(240, rowRect.width), Math.max(280, splitWidth - 16), 440)
      : 320;
    const grabOffsetX = rowRect
      ? Math.min(Math.max(16, startX - rowRect.left), previewWidth - 24)
      : 24;
    const grabOffsetY = rowRect
      ? Math.min(Math.max(8, startY - rowRect.top), ROW_HEIGHT - 8)
      : ROW_HEIGHT / 2;

    const sourceProj = projects.find((p) => p.id === projectId);
    const sourceReleaseId = sourceProj?.releaseId || '';
    const initialScrollTop = scrollContainerRef.current?.scrollTop ?? 0;

    const tableProjSnapshots = Array.from(
      document.querySelectorAll<HTMLElement>('[data-project-group]')
    )
      .map((node) => {
        const projId = node.getAttribute('data-project-group');
        const proj = projects.find((p) => p.id === projId);
        if (!projId || !proj || (proj.releaseId || '') !== sourceReleaseId) return null;
        const rect = node.getBoundingClientRect();
        return { projId, top: rect.top, bottom: rect.bottom, height: rect.height };
      })
      .filter((x): x is { projId: string; top: number; bottom: number; height: number } => Boolean(x));

    const timelineProjSnapshots =
      tableProjSnapshots.length === 0
        ? Array.from(document.querySelectorAll<HTMLElement>('[data-project-summary-bar]'))
            .map((node) => {
              const projId = node.getAttribute('data-project-summary-bar');
              const proj = projects.find((p) => p.id === projId);
              if (!projId || !proj || (proj.releaseId || '') !== sourceReleaseId) return null;
              const rect = node.getBoundingClientRect();
              return { projId, top: rect.top, bottom: rect.bottom, height: rect.height };
            })
            .filter((x): x is { projId: string; top: number; bottom: number; height: number } => Boolean(x))
        : [];
    const projSnapshots = tableProjSnapshots.length > 0 ? tableProjSnapshots : timelineProjSnapshots;

    const resetProjectDragVisuals = () => {
      draggingProjectIdRef.current = null;
      dragOverProjectRef.current = null;
      setDraggingProjectId(null);
      setDragOverProject(null);
      setDragProjectPreview(null);
      if (typeof document !== 'undefined') {
        document.body.style.cursor = '';
      }
    };

    const detachListeners = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown, true);
      if (cleanupPointerListenersRef.current === detachListeners) {
        cleanupPointerListenersRef.current = null;
      }
    };

    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape' && draggingProjectIdRef.current) {
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        detachListeners();
        resetProjectDragVisuals();
      }
    };

    const updateHitTarget = (clientX: number, clientY: number) => {
      if (!fromTimeline) {
        setDragProjectPreview({
          projectId,
          x: clientX,
          y: clientY,
          offsetX: grabOffsetX,
          offsetY: grabOffsetY,
          width: previewWidth,
        });
      }

      const scrollDelta = (scrollContainerRef.current?.scrollTop ?? 0) - initialScrollTop;
      const moveY = clientY + scrollDelta;

      let matched: (typeof projSnapshots)[number] | null = null;
      let minDistance = Infinity;

      for (const snap of projSnapshots) {
        if (moveY >= snap.top && moveY <= snap.bottom) {
          matched = snap;
          minDistance = 0;
          break;
        }
        const distToNode = Math.min(
          Math.abs(moveY - snap.top),
          Math.abs(moveY - snap.bottom)
        );
        if (distToNode < minDistance && distToNode <= 48) {
          minDistance = distToNode;
          matched = snap;
        }
      }

      if (matched && matched.projId !== projectId) {
        const relY = moveY - matched.top;
        const rawPos: 'before' | 'after' = relY < matched.height / 2 ? 'before' : 'after';
        const sameRel = projects.filter((p) => (p.releaseId || '') === sourceReleaseId);
        const sIdx = sameRel.findIndex((p) => p.id === projectId);
        const tIdx = sameRel.findIndex((p) => p.id === matched.projId);
        let pos = rawPos;
        if (sIdx !== -1 && tIdx !== -1) {
          if (tIdx === sIdx + 1 && rawPos === 'before') pos = 'after';
          if (tIdx === sIdx - 1 && rawPos === 'after') pos = 'before';
        }
        const nextOver = { id: matched.projId, position: pos };
        dragOverProjectRef.current = nextOver;
        setDragOverProject(nextOver);
      } else {
        dragOverProjectRef.current = null;
        setDragOverProject(null);
      }
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (typeof moveEvent.buttons === 'number' && (moveEvent.buttons & 1) === 0) {
        detachListeners();
        resetProjectDragVisuals();
        return;
      }

      const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (!draggingProjectIdRef.current && dist < 4) {
        return;
      }

      if (!draggingProjectIdRef.current) {
        if (!guardProjectUnlocked(projectId, 'reordenar proyecto en la tabla')) {
          detachListeners();
          resetProjectDragVisuals();
          return;
        }
        draggingProjectIdRef.current = projectId;
        setDraggingProjectId(projectId);
        if (typeof document !== 'undefined') {
          document.body.style.cursor = 'grabbing';
        }
      }

      updateHitTarget(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      detachListeners();
      const activeSource = draggingProjectIdRef.current;
      const activeTarget = dragOverProjectRef.current;
      resetProjectDragVisuals();

      if (
        activeSource &&
        activeTarget &&
        activeSource !== activeTarget.id &&
        onMoveProjectRef.current
      ) {
        if (guardProjectUnlocked(activeSource, 'reordenar proyecto en la tabla')) {
          onMoveProjectRef.current(activeSource, activeTarget.id, activeTarget.position);
        }
      }
    };

    if (opts?.immediateStart) {
      if (!guardProjectUnlocked(projectId, 'reordenar proyecto')) {
        return;
      }
      draggingProjectIdRef.current = projectId;
      setDraggingProjectId(projectId);
      if (typeof document !== 'undefined') {
        document.body.style.cursor = 'grabbing';
      }
      updateHitTarget(opts.clientX ?? startX, opts.clientY ?? startY);
    }

    cleanupPointerListenersRef.current = detachListeners;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown, true);
  };

  const handleProjectRowPointerMouseDown = (
    e: React.MouseEvent,
    projectId: string,
    fromGripHandle = false
  ) => {
    if (e.button !== 0) return;
    const targetEl = e.target as HTMLElement | null;
    if (
      !fromGripHandle &&
      targetEl &&
      targetEl.closest('input, button, select, textarea, a')
    ) {
      lastMouseDownInteractiveRef.current = true;
      return;
    }

    lastMouseDownInteractiveRef.current = false;
    e.preventDefault();
    if (fromGripHandle) {
      e.stopPropagation();
    }

    const rowEl = (e.currentTarget as HTMLElement).closest('[data-project-group]') as HTMLElement | null;
    startProjectRowReorderDrag(projectId, e.clientX, e.clientY, {
      rowRect: rowEl?.getBoundingClientRect(),
      fromTimeline: false,
    });
  };

  const handleDragRowStart = (e: React.DragEvent, itemId: string) => {
    e.stopPropagation();
    const targetEl = e.target as HTMLElement | null;
    if (
      lastMouseDownInteractiveRef.current ||
      (targetEl && targetEl.closest('input, button, select, textarea, a'))
    ) {
      e.preventDefault();
      return;
    }
    if (!guardItemUnlocked(itemId, 'reordenar tarea en la tabla')) {
      e.preventDefault();
      return;
    }
    // Detach any pointer listeners so HTML5 drag doesn't leak window mousemove/mouseup handlers
    cleanupPointerListenersRef.current?.();
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.setData('application/x-gantt-task-id', itemId);
    e.dataTransfer.effectAllowed = 'copyMove';
    draggingRowIdRef.current = itemId;
    setDraggingRowId(itemId);
  };

  const handleDragRowOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const currentSource = draggingRowIdRef.current || draggingRowId;
    if (currentSource === targetId) {
      dragOverRowRef.current = null;
      setDragOverRow(null);
      return;
    }
    if (targetId.startsWith('project:')) {
      const nextOver = { id: targetId, position: 'after' as const };
      dragOverRowRef.current = nextOver;
      setDragOverRow(nextOver);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const rawPosition: 'before' | 'after' = relY < rect.height / 2 ? 'before' : 'after';
    const position = currentSource
      ? resolveEffectiveDropPosition(currentSource, targetId, rawPosition)
      : rawPosition;
    const nextOver = { id: targetId, position };
    dragOverRowRef.current = nextOver;
    setDragOverRow(nextOver);
  };

  const handleDragRowLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    const currentTarget = e.currentTarget as HTMLElement;
    const related = e.relatedTarget as Node | null;
    if (related && currentTarget.contains(related)) {
      return;
    }
    dragOverRowRef.current = null;
    setDragOverRow(null);
  };

  const handleDropRow = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    cleanupPointerListenersRef.current?.();
    const sourceId =
      draggingRowIdRef.current ||
      draggingRowId ||
      e.dataTransfer.getData('application/x-gantt-task-id') ||
      e.dataTransfer.getData('text/plain');

    if (sourceId && sourceId !== targetId && onMoveItem) {
      if (guardMoveRowUnlocked(sourceId, targetId)) {
        let position: 'before' | 'after' = 'after';
        if (!targetId.startsWith('project:')) {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          if (rect.height > 0) {
            const rawPos = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
            position = resolveEffectiveDropPosition(sourceId, targetId, rawPos);
          } else if (dragOverRowRef.current?.id === targetId) {
            position = dragOverRowRef.current.position;
          }
        }
        onMoveItem(sourceId, targetId, position);
      }
    }
    draggingRowIdRef.current = null;
    dragOverRowRef.current = null;
    setDraggingRowId(null);
    setDragOverRow(null);
    setDragRowPreview(null);
    if (typeof document !== 'undefined') {
      document.body.style.cursor = '';
    }
  };

  const handleDragRowEnd = (e?: React.DragEvent) => {
    e?.stopPropagation();
    cleanupPointerListenersRef.current?.();
    draggingRowIdRef.current = null;
    dragOverRowRef.current = null;
    setDraggingRowId(null);
    setDragOverRow(null);
    setDragRowPreview(null);
    if (typeof document !== 'undefined') {
      document.body.style.cursor = '';
    }
  };

  // Calculate longest task name to size the column snugly without artificial gaps
  // Capped at 37 characters per user specification
  const maxTaskNameLength = useMemo(() => {
    let maxLen = 4;
    for (const it of items) {
      if (it.name && it.name.length > maxLen) {
        maxLen = it.name.length;
      }
    }
    return Math.min(37, maxLen);
  }, [items]);

  const maxProjectNameLength = useMemo(() => {
    let maxLen = 4;
    if (projects) {
      for (const p of projects) {
        if (p.name && p.name.length > maxLen) {
          maxLen = p.name.length;
        }
      }
    }
    return maxLen;
  }, [projects]);

  const hasAnyCritical = useMemo(() => {
    return items.some((it) => it.isCritical);
  }, [items]);

  // Allocate exact snug width for name + team column matching real character widths (~6.2px/char)
  const DEFAULT_SPLIT_WIDTH = 480;

  const baseNameColumnWidth = useMemo(() => {
    // 1. Task column needs: grip + arrows (32px), WBS (30px), dot (10px), indent (8px), gaps (12px) = 92px.
    // Plus text (~6.2px/char) + CRÍT badge (36px if critical) + team badge (~75px if visible) + 8px padding.
    const maxTeamLength = items.reduce((acc, it) => Math.max(acc, (it.assignee || '').length), 0);
    const teamBadgeWidth = visibleColumns.team && maxTeamLength > 0 ? Math.ceil(maxTeamLength * 6.2) + 24 : 0;
    const taskColWidth = 92 + (hasAnyCritical ? 36 : 0) + Math.ceil(maxTaskNameLength * 6.2) + teamBadgeWidth + 8;
    // 2. Project row needs: toggle button (20px), P-badge (24px), items badge (50px), gaps (12px) = 106px. Plus text (~6.2px/char) + 8px padding.
    const projColWidth = 106 + Math.ceil(maxProjectNameLength * 6.2) + 8;
    return Math.max(120, Math.max(taskColWidth, projColWidth));
  }, [maxTaskNameLength, maxProjectNameLength, hasAnyCritical, visibleColumns.team, items]);

  // Full width needed so every task, project, and release name is completely visible without truncation
  const fullNameColumnWidth = useMemo(() => {
    let measureText = (text: string, font: string) => Math.ceil(text.length * 7.2);
    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          measureText = (text: string, font: string) => {
            ctx.font = font;
            return Math.ceil(ctx.measureText(text).width);
          };
        }
      } catch {}
    }

    const maxTeamLength = items.reduce((acc, it) => Math.max(acc, (it.assignee || '').length), 0);
    const teamBadgeWidth = visibleColumns.team && maxTeamLength > 0 ? Math.ceil(maxTeamLength * 6.5) + 28 : 0;

    let maxRequired = baseNameColumnWidth;
    for (const it of items) {
      if (!it.name) continue;
      const textPx = measureText(it.name, '500 12px ui-sans-serif, system-ui, sans-serif');
      const taskReq = 112 + (it.isCritical ? 40 : 0) + (it.alertLevel ? 34 : 0) + teamBadgeWidth + textPx + 20;
      if (taskReq > maxRequired) maxRequired = taskReq;
    }
    if (projects) {
      for (const p of projects) {
        if (!p.name) continue;
        const textPx = measureText(p.name, '600 12px ui-sans-serif, system-ui, sans-serif');
        const projReq = 148 + (p.alertLevel ? 34 : 0) + textPx + 24;
        if (projReq > maxRequired) maxRequired = projReq;
      }
    }
    if (releases) {
      for (const r of releases) {
        const label = r.name || r.code || '';
        if (!label) continue;
        const textPx = measureText(label, '700 12px ui-sans-serif, system-ui, sans-serif');
        const relReq = 130 + textPx + 24;
        if (relReq > maxRequired) maxRequired = relReq;
      }
    }
    return Math.ceil(maxRequired);
  }, [baseNameColumnWidth, items, projects, releases, visibleColumns.team]);

  const otherTableColumnsWidth = useMemo(() => {
    let w = 24; // table px-3 padding
    if (visibleColumns.dates) w += 176; // w-44 = 176px
    if (visibleColumns.dur) w += 64; // w-16 = 64px
    if (visibleColumns.slack) w += 56; // w-14 = 56px
    if (visibleColumns.deps) w += 80; // w-20 = 80px
    w += 112; // Action/config buttons column w-28 = 112px
    return w;
  }, [visibleColumns]);

  // As the split divider moves right past default width, expand the name column with priority up to fullNameColumnWidth
  const nameColumnWidth = useMemo(() => {
    const extraSplitPx = Math.max(0, splitWidth - DEFAULT_SPLIT_WIDTH);
    return Math.min(fullNameColumnWidth, baseNameColumnWidth + extraSplitPx);
  }, [baseNameColumnWidth, fullNameColumnWidth, splitWidth]);

  // Dynamic truncation limit that progressively reveals full names as the divider expands the name column
  const displayTruncateLimit = useMemo(() => {
    if (splitWidth <= DEFAULT_SPLIT_WIDTH && splitExpandedPrevWidth === null) {
      return effectiveTruncateLimit;
    }
    if (nameColumnWidth >= fullNameColumnWidth) {
      return Number.POSITIVE_INFINITY;
    }
    const extraChars = Math.floor((nameColumnWidth - baseNameColumnWidth) / 6.2);
    return effectiveTruncateLimit + Math.max(0, extraChars);
  }, [
    splitWidth,
    splitExpandedPrevWidth,
    effectiveTruncateLimit,
    nameColumnWidth,
    fullNameColumnWidth,
    baseNameColumnWidth,
  ]);

  // Calculates exact minimum content width to guarantee columns NEVER overlap or clip
  const tableMinWidth = useMemo(() => {
    return nameColumnWidth + otherTableColumnsWidth;
  }, [nameColumnWidth, otherTableColumnsWidth]);

  // Maximum right boundary for the split divider: stops once all names and visible table columns fit completely
  const fullContentSplitWidth = useMemo(() => {
    return Math.max(DEFAULT_SPLIT_WIDTH, fullNameColumnWidth + otherTableColumnsWidth);
  }, [fullNameColumnWidth, otherTableColumnsWidth]);

  const [fallbackArrowVisibility, setFallbackArrowVisibility] =
    useState<ArrowVisibility>('all');
  const [fallbackDayWidth, setFallbackDayWidth] = useState<number>(() =>
    getDayWidthForPreset(zoom)
  );

  const arrowVisibility =
    controlledArrowVisibility !== undefined
      ? controlledArrowVisibility
      : fallbackArrowVisibility;

  const handleArrowVisibilityChange = (next: ArrowVisibility) => {
    if (onChangeArrowVisibility) {
      onChangeArrowVisibility(next);
    } else {
      setFallbackArrowVisibility(next);
    }
  };

  useEffect(() => {
    if (controlledDayWidth === undefined) {
      setFallbackDayWidth(getDayWidthForPreset(zoom));
    }
  }, [zoom, controlledDayWidth]);

  // Interactive drag state for moving, resizing, or adjusting progress on task bars directly on the timeline
  const [dragState, setDragState] = useState<{
    itemId: string;
    mode: 'move' | 'resize' | 'resize-start' | 'progress';
    startX: number;
    origStart: Date;
    origDuration: number;
    dayDelta: number;
    pixelDeltaX?: number;
    origProgress?: number;
    nextProgress?: number;
    multiItems?: Map<string, { origStart: Date; origDuration: number; type: 'task' | 'milestone' }>;
  } | null>(null);

  const isResizingSplitRef = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const virtualScrollLeftRef = useRef<number | null>(null);
  const timelineDaysCountRef = useRef<number>(60);

  // Continuous day column width (pixels per day)
  const dayWidth = clampDayWidth(
    controlledDayWidth !== undefined ? controlledDayWidth : fallbackDayWidth
  );

  const updateDayWidth = (next: number) => {
    const clamped = clampDayWidth(next);
    if (onChangeDayWidth) {
      onChangeDayWidth(clamped);
    } else {
      setFallbackDayWidth(clamped);
    }
  };

  const handleZoomChange = (next: number, anchorViewportX?: number) => {
    const clamped = clampDayWidth(next);
    const container = scrollContainerRef.current;
    if (container && container.clientWidth > 0 && dayWidth > 0 && clamped !== dayWidth) {
      const anchorX =
        anchorViewportX !== undefined
          ? Math.max(0, Math.min(container.clientWidth, anchorViewportX))
          : container.clientWidth / 2;
      const currentScroll =
        virtualScrollLeftRef.current !== null
          ? virtualScrollLeftRef.current
          : container.scrollLeft;
      const dayAtAnchor = (currentScroll + anchorX) / dayWidth;
      const nextScrollLeft = Math.max(0, dayAtAnchor * clamped - anchorX);

      virtualScrollLeftRef.current = nextScrollLeft;
      if (canvasRef.current) {
        canvasRef.current.style.width = `${timelineDaysCountRef.current * clamped}px`;
      }
      container.scrollLeft = nextScrollLeft;
    }

    updateDayWidth(clamped);
  };

  const timelineStartRef = useRef<Date | undefined>(undefined);

  const handleFitProjectAction = (targetProjectId?: string) => {
    const isFocusedFit = !targetProjectId && isFocusMode && Boolean(focusEntity);
    const pid = isFocusedFit ? undefined : targetProjectId || selectedProjectId || 'all';
    const expandProjectId =
      targetProjectId ||
      (isFocusedFit && focusEntity?.type === 'project' ? focusEntity.id : undefined);
    if (expandProjectId && onToggleProjectCollapse) {
      const targetProj = projects.find((p) => p.id === expandProjectId);
      if (targetProj?.collapsed) {
        onToggleProjectCollapse(expandProjectId);
      }
    }
    if (onFitToProject) {
      onFitToProject(pid, { timelineStart: timelineStartRef.current });
      return;
    }
    const container = scrollContainerRef.current;
    const viewportW = container && container.clientWidth > 0 ? container.clientWidth : 960;
    const fit = computeFitToProjectScale(items, viewportW, {
      projectId: pid,
      focusEntity: isFocusedFit ? focusEntity : null,
      projects,
      releases,
      timelineStart: timelineStartRef.current,
    });
    if (canvasRef.current) {
      canvasRef.current.style.width = `${timelineDaysCountRef.current * fit.dayWidth}px`;
    }
    virtualScrollLeftRef.current = fit.scrollLeft;
    updateDayWidth(fit.dayWidth);
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTo({ left: fit.scrollLeft, behavior: 'smooth' });
      });
    }
  };

  const dayWidthRef = useRef(dayWidth);
  dayWidthRef.current = dayWidth;
  const wheelZoomRef = useRef(wheelZoomEnabled);
  wheelZoomRef.current = wheelZoomEnabled;
  const onChangeDayWidthRef = useRef(onChangeDayWidth);
  onChangeDayWidthRef.current = onChangeDayWidth;

  // Attach native non-passive wheel listener and scroll tracker to timeline container
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Plain wheel scrolls vertically/naturally; only Ctrl/Cmd + wheel zooms the timeline
      const hasZoomModifier = e.ctrlKey || e.metaKey;
      if (!hasZoomModifier) {
        return;
      }
      if (e.deltaY === 0) return;

      e.preventDefault();

      const oldWidth = dayWidthRef.current;
      const nextWidth = computeWheelZoomDayWidth(oldWidth, e.deltaY);
      if (nextWidth === oldWidth) return;

      const rect = container.getBoundingClientRect();
      const cursorViewportX = Math.max(
        0,
        Math.min(rect.width, e.clientX - rect.left)
      );

      const currentScrollLeft =
        virtualScrollLeftRef.current !== null
          ? virtualScrollLeftRef.current
          : container.scrollLeft;

      const dayAtCursor = (currentScrollLeft + cursorViewportX) / oldWidth;
      const nextScrollLeft = Math.max(0, dayAtCursor * nextWidth - cursorViewportX);

      virtualScrollLeftRef.current = nextScrollLeft;
      dayWidthRef.current = nextWidth;

      if (canvasRef.current) {
        canvasRef.current.style.width = `${timelineDaysCountRef.current * nextWidth}px`;
      }
      container.scrollLeft = nextScrollLeft;

      if (onChangeDayWidthRef.current) {
        onChangeDayWidthRef.current(nextWidth);
      } else {
        setFallbackDayWidth(nextWidth);
      }
    };

    const handleScroll = () => {
      virtualScrollLeftRef.current = container.scrollLeft;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContainerRef]);

  // Synchronize scroll position when dayWidth state changes
  useEffect(() => {
    if (virtualScrollLeftRef.current !== null && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = virtualScrollLeftRef.current;
    }
  }, [dayWidth]);

  // Apply live drag preview delta to items so project summary bars and rolled-up dates update in real time while dragging
  const effectiveItems = useMemo(() => {
    if (!dragState || dragState.dayDelta === 0) return items;
    return items.map((it) => {
      if (dragState.mode === 'move' && dragState.multiItems) {
        const entry = dragState.multiItems.get(it.id);
        if (!entry) return it;
        const newStart = formatDateISO(addDays(entry.origStart, dragState.dayDelta));
        const newEnd =
          entry.type === 'milestone'
            ? newStart
            : calculateEndDateFromDuration(newStart, entry.origDuration, 'task');
        const newSlackEnd = formatDateISO(
          addDays(parseDateSafe(newEnd), Math.max(0, it.slack || 0))
        );
        return {
          ...it,
          startDate: newStart,
          endDate: newEnd,
          slackEndDate: newSlackEnd,
        };
      }
      if (it.id !== dragState.itemId) return it;
      if (dragState.mode === 'move') {
        const newStart = formatDateISO(addDays(dragState.origStart, dragState.dayDelta));
        const newEnd =
          it.type === 'milestone'
            ? newStart
            : calculateEndDateFromDuration(newStart, dragState.origDuration, 'task', workCalendar);
        const newSlackEnd = formatDateISO(
          addDays(parseDateSafe(newEnd), Math.max(0, it.slack || 0))
        );
        return {
          ...it,
          startDate: newStart,
          endDate: newEnd,
          slackEndDate: newSlackEnd,
        };
      }
      if (dragState.mode === 'resize' && it.type === 'task') {
        const newDur = Math.max(1, dragState.origDuration + dragState.dayDelta);
        const newEnd = calculateEndDateFromDuration(it.startDate, newDur, 'task', workCalendar);
        const newSlackEnd = formatDateISO(
          addDays(parseDateSafe(newEnd), Math.max(0, it.slack || 0))
        );
        return {
          ...it,
          duration: newDur,
          endDate: newEnd,
          slackEndDate: newSlackEnd,
        };
      }
      if (dragState.mode === 'resize-start' && it.type === 'task') {
        // Keep endDate fixed; clamp delta so duration >= 1 day
        const maxDelta = dragState.origDuration - 1;
        const clampedDelta = Math.min(maxDelta, dragState.dayDelta);
        const newStart = formatDateISO(addDays(dragState.origStart, clampedDelta));
        const newDur = Math.max(1, dragState.origDuration - clampedDelta);
        return {
          ...it,
          startDate: newStart,
          duration: newDur,
        };
      }
      if (dragState.mode === 'progress' && it.type === 'task') {
        return {
          ...it,
          progress: dragState.nextProgress ?? it.progress,
        };
      }
      return it;
    });
  }, [items, dragState, workCalendar]);

  const baselineItemMap = useMemo(() => {
    if (!baselineSnapshot) return null;
    return new Map(baselineSnapshot.items.map((it) => [it.id, it]));
  }, [baselineSnapshot]);

  // Group items into projects with rolled-up dates, durations, and hierarchical WBS
  const allProjectGroups = useMemo(
    () => groupItemsByProject(effectiveItems, projects),
    [effectiveItems, projects]
  );

  // Fast lookup map of enriched items (including wbsCode) by ID
  const enrichedItemById = useMemo(() => {
    const map = new Map<string, ComputedGanttItem>();
    for (const g of allProjectGroups) {
      for (const it of g.items) {
        map.set(it.id, it);
      }
    }
    return map;
  }, [allProjectGroups]);

  const focusRelatedSets = useMemo(() => {
    if (!isFocusMode || !focusEntity) return null;
    const res = getRelatedFocusEntityIds(focusEntity, effectiveItems, projects);
    return {
      itemIds: new Set(res.itemIds),
      projectIds: new Set(res.projectIds),
      releaseIds: new Set(res.releaseIds),
    };
  }, [isFocusMode, focusEntity, effectiveItems, projects]);

  const matchesPredecessorText = (it: ComputedGanttItem, q: string): boolean => {
    const deps = it.dependencies || [];
    if (deps.length === 0) return false;
    return deps.some((depId) => {
      if (depId.toLowerCase().includes(q)) return true;
      const pred = enrichedItemById.get(depId);
      if (!pred) return false;
      const depType = it.dependencyTypes?.[depId] || 'FS';
      const predDisplayId = pred.displayId || '';
      const predWbs = pred.wbsCode || String(pred.wbs ?? '');
      return (
        pred.name.toLowerCase().includes(q) ||
        predDisplayId.toLowerCase().includes(q) ||
        predWbs.toLowerCase().includes(q) ||
        depType.toLowerCase().includes(q)
      );
    });
  };

  const doesProjectMatchQuery = (
    proj: GanttProject,
    projectIndex: number | undefined,
    q: string
  ): boolean => {
    if (searchFields.name && proj.name.toLowerCase().includes(q)) return true;
    if (searchFields.description) {
      if (proj.description && proj.description.toLowerCase().includes(q)) return true;
      if (proj.statusComments?.some((c) => c.text.toLowerCase().includes(q))) return true;
    }
    if (searchFields.platform && proj.platform && proj.platform.toLowerCase().includes(q)) {
      return true;
    }
    if (
      searchFields.displayId &&
      projectIndex !== undefined &&
      (`p${projectIndex}`.includes(q) || String(projectIndex) === q)
    ) {
      return true;
    }
    return false;
  };

  const doesItemMatchQuery = (it: ComputedGanttItem, q: string): boolean => {
    if (searchFields.name && it.name.toLowerCase().includes(q)) return true;
    if (searchFields.description) {
      if (it.notes && it.notes.toLowerCase().includes(q)) return true;
      if (it.statusComments?.some((c) => c.text.toLowerCase().includes(q))) return true;
    }
    if (searchFields.assignee && it.assignee && it.assignee.toLowerCase().includes(q)) return true;
    if (searchFields.platform && it.platform && it.platform.toLowerCase().includes(q)) return true;
    if (searchFields.predecessors && matchesPredecessorText(it, q)) return true;
    if (
      searchFields.displayId &&
      ((it.displayId && it.displayId.toLowerCase().includes(q)) ||
        (it.wbsCode && it.wbsCode.toLowerCase().includes(q)))
    ) {
      return true;
    }
    return false;
  };

  const visibleProjectGroups = useMemo(() => {
    let filtered = filterGroupsBySelectedProjects(
      allProjectGroups,
      selectedProjectIds,
      selectedProjectId
    );

    if (hiddenReleaseIds && hiddenReleaseIds.length > 0) {
      const hiddenSet = new Set(hiddenReleaseIds);
      filtered = filtered.filter(
        (g) => !g.project.releaseId || !hiddenSet.has(g.project.releaseId)
      );
    }

    const rawEffectivePlatform =
      tablePlatformFilter !== 'all'
        ? tablePlatformFilter
        : selectedPlatform && selectedPlatform !== 'all'
        ? selectedPlatform
        : 'all';
    const effectivePlatform =
      rawEffectivePlatform === 'all'
        ? 'all'
        : normalizePlatform(rawEffectivePlatform) || 'iOS/Android';

    if (effectivePlatform !== 'all') {
      filtered = filtered.filter((g) => {
        const projPlat = normalizePlatform(g.project.platform) || 'iOS/Android';
        return (
          projPlat === effectivePlatform ||
          g.items.some((it) => {
            const itPlat = normalizePlatform(it.platform || g.project.platform) || 'iOS/Android';
            return itPlat === effectivePlatform;
          })
        );
      });
    }

    if (tableReleaseFilter !== 'all') {
      const targetRel = releases.find((r) => r.code === tableReleaseFilter);
      const targetRelId = targetRel?.id;
      filtered = filtered.filter(
        (g) =>
          (targetRelId && g.project.releaseId === targetRelId) ||
          (targetRelId && g.items.some((it) => it.releaseId === targetRelId))
      );
    }

    if (tableTypeFilter === 'TAREA') {
      filtered = filtered.filter((g) => g.items.some((it) => it.type === 'task'));
    } else if (tableTypeFilter === 'HITO') {
      filtered = filtered.filter((g) => g.items.some((it) => it.type === 'milestone'));
    }

    if (tableAlertFilter !== 'all') {
      filtered = filtered.filter(
        (g) =>
          (g.project.alertLevel ?? 0) === tableAlertFilter ||
          g.items.some((it) => (it.alertLevel ?? 0) === tableAlertFilter)
      );
    }

    if (tableTeamFilter !== 'all') {
      const targetTeam = tableTeamFilter.trim().toLowerCase();
      filtered = filtered.filter((g) =>
        g.items.some((it) => (it.assignee || '').trim().toLowerCase() === targetTeam)
      );
    }

    if (tableTagFilter !== 'all') {
      const targetTag = normalizeTag(tableTagFilter).toLowerCase();
      filtered = filtered.filter(
        (g) =>
          (g.project.tags || []).some((t) => normalizeTag(t).toLowerCase() === targetTag) ||
          g.items.some((it) => (it.tags || []).some((t) => normalizeTag(t).toLowerCase() === targetTag))
      );
    }

    const query = tableSearchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((g) => {
        if (doesProjectMatchQuery(g.project, g.projectIndex, query)) return true;
        return g.items.some((it) => doesItemMatchQuery(it, query));
      });
    }

    const excludeQ = tableExcludeQuery.trim().toLowerCase();
    if (excludeQ) {
      filtered = filtered.filter((g) => {
        if (doesProjectMatchQuery(g.project, g.projectIndex, excludeQ)) return false;
        if (g.items.length === 0) return true;
        return g.items.some((it) => !doesItemMatchQuery(it, excludeQ));
      });
    }

    if (focusRelatedSets) {
      filtered = filtered.filter((g) => focusRelatedSets.projectIds.has(g.project.id));
    }

    return filtered;
  }, [
    allProjectGroups,
    selectedProjectIds,
    selectedProjectId,
    hiddenReleaseIds,
    releases,
    tableReleaseFilter,
    tableTeamFilter,
    tableTagFilter,
    tableTypeFilter,
    selectedPlatform,
    tablePlatformFilter,
    tableAlertFilter,
    tableSearchQuery,
    tableExcludeQuery,
    searchFields,
    enrichedItemById,
    focusRelatedSets,
  ]);

  // All milestones in visible projects for full-canvas vertical alignment guides
  const visibleMilestones = useMemo(() => {
    const list: ComputedGanttItem[] = [];
    for (const group of visibleProjectGroups) {
      for (const it of group.items) {
        if (it.type === 'milestone') {
          list.push(it);
        }
      }
    }
    return list;
  }, [visibleProjectGroups]);

  // Unified row list (Release headers + Project group headers + Task/Milestone rows) so Left WBS Table and Right Timeline stay 100% aligned
  const displayRows = useMemo<DisplayRow[]>(() => {
    const rows: DisplayRow[] = [];
    const effectivePlatform =
      tablePlatformFilter !== 'all'
        ? tablePlatformFilter
        : selectedPlatform && selectedPlatform !== 'all'
        ? selectedPlatform
        : 'all';
    const query = tableSearchQuery.trim().toLowerCase();
    const excludeQ = tableExcludeQuery.trim().toLowerCase();

    const targetRelForFilter =
      tableReleaseFilter !== 'all'
        ? releases.find((r) => r.code === tableReleaseFilter)
        : undefined;

    const itemMatchesFilter = (
      it: ComputedGanttItem,
      proj: GanttProject,
      projectIndex?: number
    ) => {
      if (tableTypeFilter === 'TAREA' && it.type !== 'task') {
        return false;
      }
      if (tableTypeFilter === 'HITO' && it.type !== 'milestone') {
        return false;
      }
      if (tableReleaseFilter !== 'all') {
        const relId = targetRelForFilter?.id;
        if (!relId || (it.releaseId !== relId && proj.releaseId !== relId)) {
          return false;
        }
      }
      if (effectivePlatform !== 'all') {
        const targetPlat = normalizePlatform(effectivePlatform) || 'iOS/Android';
        const plat = normalizePlatform(it.platform || proj.platform) || 'iOS/Android';
        const projPlat = normalizePlatform(proj.platform) || 'iOS/Android';
        if (plat !== targetPlat && !(showSubtasksOnFilter && projPlat === targetPlat)) {
          return false;
        }
      }
      if (tableAlertFilter !== 'all') {
        const itemAlertMatches = (it.alertLevel ?? 0) === tableAlertFilter;
        const projAlertMatches = (proj.alertLevel ?? 0) === tableAlertFilter;
        if (!itemAlertMatches && !(showSubtasksOnFilter && projAlertMatches)) {
          return false;
        }
      }
      if (tableTeamFilter !== 'all') {
        const targetTeam = tableTeamFilter.trim().toLowerCase();
        if ((it.assignee || '').trim().toLowerCase() !== targetTeam) {
          return false;
        }
      }
      if (tableTagFilter !== 'all') {
        const targetTag = normalizeTag(tableTagFilter).toLowerCase();
        const itemHasTag = (it.tags || []).some((t) => normalizeTag(t).toLowerCase() === targetTag);
        const projHasTag = (proj.tags || []).some((t) => normalizeTag(t).toLowerCase() === targetTag);
        if (!itemHasTag && !(showSubtasksOnFilter && projHasTag)) {
          return false;
        }
      }
      if (excludeQ) {
        if (doesItemMatchQuery(it, excludeQ)) return false;
        if (doesProjectMatchQuery(proj, projectIndex, excludeQ)) return false;
      }
      if (!query) return true;
      if (doesItemMatchQuery(it, query)) return true;
      if (showSubtasksOnFilter && doesProjectMatchQuery(proj, projectIndex, query)) {
        return true;
      }
      return false;
    };

    if (groupingMode === 'release' && releases.length > 0) {
      const visibleProjects = visibleProjectGroups.map((g) => g.project);
      if (visibleProjects.length === 0) {
        return [];
      }
      const allowedProjIds = new Set(visibleProjects.map((p) => p.id));
      const externalMilestones = effectiveItems.filter(
        (it) => it.type === 'milestone' && Boolean(it.isExternal)
      );
      const externalGroup = buildExternalMilestonesGroup(externalMilestones);
      if (externalGroup) {
        const matchingExternalItems = externalGroup.items.filter((item) => {
          if (focusRelatedSets && !focusRelatedSets.itemIds.has(item.id)) return false;
          return itemMatchesFilter(item, externalGroup.project, 0);
        });
        if (matchingExternalItems.length > 0) {
          rows.push({
            kind: 'project',
            rowId: `proj-${externalGroup.project.id}`,
            group: externalGroup,
          });
          for (const item of matchingExternalItems) {
            rows.push({
              kind: 'item',
              rowId: item.id,
              item,
              group: externalGroup,
            });
          }
          rows.push({
            kind: 'add-task',
            rowId: `add-task-${externalGroup.project.id}`,
            group: externalGroup,
          });
        }
      }
      const visibleItems = effectiveItems.filter(
        (it) =>
          !(it.type === 'milestone' && Boolean(it.isExternal)) &&
          it.projectId &&
          allowedProjIds.has(it.projectId)
      );
      const releaseGroups = groupItemsByReleaseAndProject(
        visibleItems,
        visibleProjects,
        releases
      );
      for (const rg of releaseGroups) {
        if (hiddenReleaseIds && hiddenReleaseIds.includes(rg.release.id)) {
          continue;
        }
        if (tableReleaseFilter !== 'all' && rg.release.code !== tableReleaseFilter) {
          continue;
        }
        if (focusRelatedSets && !focusRelatedSets.releaseIds.has(rg.release.id)) {
          continue;
        }
        rows.push({
          kind: 'release',
          rowId: `release:${rg.release.id}`,
          group: rg,
        });
        if (tableTypeFilter === 'RELEASE') {
          continue;
        }
        if (!collapsedReleaseIds.has(rg.release.id) || recentlyCollapsedParentIds.has(`rel:${rg.release.id}`)) {
          for (const group of rg.projectGroups) {
            rows.push({
              kind: 'project',
              rowId: `proj-${group.project.id}`,
              group,
            });
            if (tableTypeFilter === 'PROYECTO') {
              continue;
            }
            if (!group.project.collapsed || recentlyCollapsedParentIds.has(`proj:${group.project.id}`)) {
              if (group.items.length === 0) {
                rows.push({
                  kind: 'empty-project',
                  rowId: `empty-proj-${group.project.id}`,
                  group,
                });
              } else {
                for (const item of group.items) {
                  if (focusRelatedSets && !focusRelatedSets.itemIds.has(item.id)) {
                    continue;
                  }
                  if (!itemMatchesFilter(item, group.project, group.projectIndex)) {
                    continue;
                  }
                  rows.push({
                    kind: 'item',
                    rowId: item.id,
                    item,
                    group,
                  });
                }
                rows.push({
                  kind: 'add-task',
                  rowId: `add-task-${group.project.id}`,
                  group,
                });
              }
            }
          }
          if (onCreateProject && rg.release.id !== '__unassigned__') {
            rows.push({
              kind: 'add-project',
              rowId: `add-project-${rg.release.id}`,
              group: rg,
            });
          }
        }
      }
    } else if (groupByProject) {
      if (tableTypeFilter !== 'RELEASE') {
        for (const group of visibleProjectGroups) {
          rows.push({
            kind: 'project',
            rowId: `proj-${group.project.id}`,
            group,
          });
          if (tableTypeFilter === 'PROYECTO') {
            continue;
          }
          if (!group.project.collapsed || recentlyCollapsedParentIds.has(`proj:${group.project.id}`)) {
            if (group.items.length === 0) {
              rows.push({
                kind: 'empty-project',
                rowId: `empty-proj-${group.project.id}`,
                group,
              });
            } else {
              for (const item of group.items) {
                if (focusRelatedSets && !focusRelatedSets.itemIds.has(item.id)) {
                  continue;
                }
                if (!itemMatchesFilter(item, group.project, group.projectIndex)) {
                  continue;
                }
                rows.push({
                  kind: 'item',
                  rowId: item.id,
                  item,
                  group,
                });
              }
              rows.push({
                kind: 'add-task',
                rowId: `add-task-${group.project.id}`,
                group,
              });
            }
          }
        }
      }
    } else {
      if (tableTypeFilter !== 'RELEASE' && tableTypeFilter !== 'PROYECTO') {
        for (const group of visibleProjectGroups) {
          for (const item of group.items) {
            if (focusRelatedSets && !focusRelatedSets.itemIds.has(item.id)) {
              continue;
            }
            if (!itemMatchesFilter(item, group.project, group.projectIndex)) {
              continue;
            }
            rows.push({
              kind: 'item',
              rowId: item.id,
              item,
              group,
            });
          }
        }
      }
    }
    return rows;
  }, [
    groupingMode,
    releases,
    collapsedReleaseIds,
    recentlyCollapsedParentIds,
    groupByProject,
    visibleProjectGroups,
    effectiveItems,
    projects,
    hiddenReleaseIds,
    focusRelatedSets,
    tableSearchQuery,
    tableExcludeQuery,
    tableTypeFilter,
    tableReleaseFilter,
    tableTeamFilter,
    tableTagFilter,
    tablePlatformFilter,
    selectedPlatform,
    tableAlertFilter,
    showSubtasksOnFilter,
    searchFields,
    enrichedItemById,
  ]);

  useLayoutEffect(() => {
    const anchor = collapseScrollAnchorRef.current;
    if (!anchor || typeof document === 'undefined' || typeof window === 'undefined') return;
    const el = document.querySelector<HTMLElement>(anchor.selector);
    if (!el) {
      collapseScrollAnchorRef.current = null;
      return;
    }
    const newTop = el.getBoundingClientRect().top;
    const delta = newTop - anchor.viewportTop;
    const desiredScrollY = Math.max(0, window.scrollY + delta);
    const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    if (desiredScrollY > maxScrollY + 1) {
      setCollapseBottomSpacerPx((prev) => prev + Math.ceil(desiredScrollY - maxScrollY) + 16);
      return;
    }

    if (Math.abs(delta) > 0.5) {
      window.scrollTo(window.scrollX, desiredScrollY);
    }
    collapseScrollAnchorRef.current = null;
  }, [displayRows, recentlyCollapsedParentIds, collapseBottomSpacerPx]);

  const isAnyRowOrProjectDragging = Boolean(draggingRowId || draggingProjectId);

  // Live vertical shift (translateY) for both table rows and timeline bars during row/project drag
  const rowDragShiftYByRowId = useMemo(() => {
    const map = new Map<string, number>();

    if (draggingRowId && dragOverRow && !dragOverRow.id.startsWith('project:')) {
      if (draggingMultiRowIds && draggingMultiRowIds.size > 1) {
        const movingIndices = displayRows
          .map((r, idx) => (r.kind === 'item' && draggingMultiRowIds.has(r.item.id) ? idx : -1))
          .filter((idx) => idx !== -1);
        const targetRow = displayRows.find(
          (r) => r.kind === 'item' && r.item.id === dragOverRow.id
        );
        if (movingIndices.length > 0 && targetRow) {
          const movingRows = movingIndices.map((idx) => displayRows[idx]);
          const movingSet = new Set(movingRows.map((r) => r.rowId));
          const remaining = displayRows.filter((r) => !movingSet.has(r.rowId));
          const targetInRemaining = remaining.findIndex((r) => r.rowId === targetRow.rowId);
          if (targetInRemaining !== -1) {
            const insertIdx =
              dragOverRow.position === 'before' ? targetInRemaining : targetInRemaining + 1;
            const simulated = [...remaining];
            simulated.splice(insertIdx, 0, ...movingRows);
            simulated.forEach((r, newIdx) => {
              const oldIdx = displayRows.findIndex((orig) => orig.rowId === r.rowId);
              if (oldIdx !== -1 && newIdx !== oldIdx) {
                map.set(r.rowId, (newIdx - oldIdx) * ROW_HEIGHT);
              }
            });
          }
        }
      } else {
        const dragIdx = displayRows.findIndex(
          (r) => r.kind === 'item' && r.item.id === draggingRowId
        );
        const targetIdx = displayRows.findIndex(
          (r) => r.kind === 'item' && r.item.id === dragOverRow.id
        );
        if (dragIdx !== -1 && targetIdx !== -1 && dragIdx !== targetIdx) {
          const destIdx =
            dragIdx < targetIdx
              ? dragOverRow.position === 'before'
                ? targetIdx - 1
                : targetIdx
              : dragOverRow.position === 'before'
              ? targetIdx
              : targetIdx + 1;

          if (destIdx !== dragIdx) {
            map.set(displayRows[dragIdx].rowId, (destIdx - dragIdx) * ROW_HEIGHT);
            if (dragIdx < destIdx) {
              for (let i = dragIdx + 1; i <= destIdx; i++) {
                map.set(displayRows[i].rowId, -ROW_HEIGHT);
              }
            } else {
              for (let i = destIdx; i < dragIdx; i++) {
                map.set(displayRows[i].rowId, ROW_HEIGHT);
              }
            }
          }
        }
      }
    } else if (draggingProjectId && dragOverProject) {
      const findProjectSlice = (pid: string): [number, number] | null => {
        const start = displayRows.findIndex(
          (r) => r.kind === 'project' && r.group.project.id === pid
        );
        if (start === -1) return null;
        let end = start;
        while (end + 1 < displayRows.length) {
          const next = displayRows[end + 1];
          if (
            next.kind === 'project' ||
            next.kind === 'release' ||
            next.kind === 'add-project'
          ) {
            break;
          }
          end++;
        }
        return [start, end];
      };

      const srcSlice = findProjectSlice(draggingProjectId);
      const tgtSlice = findProjectSlice(dragOverProject.id);
      if (srcSlice && tgtSlice && srcSlice[0] !== tgtSlice[0]) {
        const [srcStart, srcEnd] = srcSlice;
        const [tgtStart, tgtEnd] = tgtSlice;
        const srcLen = srcEnd - srcStart + 1;

        if (srcStart < tgtStart) {
          const blockEnd =
            dragOverProject.position === 'before' ? tgtStart - 1 : tgtEnd;
          if (blockEnd > srcEnd) {
            const srcShift = (blockEnd - srcEnd) * ROW_HEIGHT;
            for (let i = srcStart; i <= srcEnd; i++) {
              map.set(displayRows[i].rowId, srcShift);
            }
            for (let i = srcEnd + 1; i <= blockEnd; i++) {
              map.set(displayRows[i].rowId, -srcLen * ROW_HEIGHT);
            }
          }
        } else {
          const blockStart =
            dragOverProject.position === 'before' ? tgtStart : tgtEnd + 1;
          if (blockStart < srcStart) {
            const srcShift = -(srcStart - blockStart) * ROW_HEIGHT;
            for (let i = srcStart; i <= srcEnd; i++) {
              map.set(displayRows[i].rowId, srcShift);
            }
            for (let i = blockStart; i < srcStart; i++) {
              map.set(displayRows[i].rowId, srcLen * ROW_HEIGHT);
            }
          }
        }
      }
    }

    return map;
  }, [displayRows, draggingRowId, draggingMultiRowIds, dragOverRow, draggingProjectId, dragOverProject]);

  const timelineScopedItems = useMemo(() => {
    if (
      Array.isArray(selectedProjectIds) &&
      selectedProjectIds.length < allProjectGroups.length
    ) {
      const subset = visibleProjectGroups.flatMap((g) => g.items);
      return subset.length > 0 ? subset : items;
    }
    return items;
  }, [items, selectedProjectIds, allProjectGroups.length, visibleProjectGroups]);

  // Extra date anchors from visible release bars, assigned project releases, and task releases
  // so timeline calendar bounds and grid columns always cover every visible release bar and project window
  const timelineDates = useMemo(() => {
    const includeStartDates =
      timelineScopedItems.length === 0 ||
      visibleProjectGroups.some((g) => !g.project.isDemo || g.items.length === 0);

    const dates = new Set<string>();

    if (includeStartDates) {
      for (const d of collectTimelineAnchorDates({
        projects: visibleProjectGroups.map((g) => g.project),
        releases,
        items: timelineScopedItems,
        hiddenReleaseIds,
      })) {
        dates.add(d);
      }
    }

    for (const group of visibleProjectGroups) {
      if (includeStartDates && group.startDate) dates.add(group.startDate);
      if (group.endDate) dates.add(group.endDate);
      if (group.slackEndDate) dates.add(group.slackEndDate);
      if (group.project.releaseId) {
        const rel = releases.find((r) => r.id === group.project.releaseId);
        if (rel) {
          const span = getReleaseDateSpan(rel);
          if (includeStartDates && span.startDate) dates.add(span.startDate);
          if (span.endDate) dates.add(span.endDate);
        }
      }
    }

    for (const row of displayRows) {
      if (row.kind === 'release') {
        const rg = row.group;
        if (includeStartDates && rg.startDate) dates.add(rg.startDate);
        if (rg.endDate) dates.add(rg.endDate);
        if (rg.release.id !== '__unassigned__') {
          const span = getReleaseDateSpan(rg.release);
          if (includeStartDates && span.startDate) dates.add(span.startDate);
          if (span.endDate) dates.add(span.endDate);
        }
      } else if (row.kind === 'project' || row.kind === 'empty-project') {
        if (includeStartDates && row.group.startDate) dates.add(row.group.startDate);
        if (row.group.endDate) dates.add(row.group.endDate);
        if (row.group.slackEndDate) dates.add(row.group.slackEndDate);
        if (row.group.project.releaseId) {
          const rel = releases.find((r) => r.id === row.group.project.releaseId);
          if (rel) {
            const span = getReleaseDateSpan(rel);
            if (includeStartDates && span.startDate) dates.add(span.startDate);
            if (span.endDate) dates.add(span.endDate);
          }
        }
      }
    }

    return dates.size > 0 ? Array.from(dates) : undefined;
  }, [visibleProjectGroups, releases, timelineScopedItems, hiddenReleaseIds, displayRows]);

  // Compute timeline date range with padding before and after project and visible releases
  const { timelineDays, timelineStart, monthGroups, todayIndex } = useMemo(() => {
    const today = startOfDay(new Date());
    const { timelineStart: paddedStart, timelineEnd: paddedEnd } =
      computeTimelineBounds(timelineScopedItems, today, timelineDates);
    const days = eachDayOfInterval({ start: paddedStart, end: paddedEnd });

    // Group consecutive days by Month + Year for the top header tier
    const groups: { label: string; shortLabel: string; count: number }[] = [];
    for (const day of days) {
      const label = format(day, 'MMMM yyyy', { locale: es });
      const shortLabel = format(day, 'MMM', { locale: es }).replace('.', '').toUpperCase();
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.count += 1;
      } else {
        groups.push({ label, shortLabel, count: 1 });
      }
    }

    const tIdx = days.findIndex((d) => isSameDay(d, today));
    timelineDaysCountRef.current = days.length;
    timelineStartRef.current = paddedStart;

    return {
      timelineDays: days,
      timelineStart: paddedStart,
      monthGroups: groups,
      todayIndex: tIdx,
    };
  }, [timelineScopedItems, timelineDates]);

  const toggleMultiSelectProject = (projectId: string, shiftKey = false) => {
    if (shiftKey && lastMultiAnchorRef.current) {
      const anchor = lastMultiAnchorRef.current;
      const startIdx = displayRows.findIndex((r) =>
        anchor.kind === 'project'
          ? r.kind === 'project' && r.group.project.id === anchor.id
          : r.kind === 'item' && r.item.id === anchor.id
      );
      const endIdx = displayRows.findIndex(
        (r) => r.kind === 'project' && r.group.project.id === projectId
      );
      if (startIdx >= 0 && endIdx >= 0) {
        const lo = Math.min(startIdx, endIdx);
        const hi = Math.max(startIdx, endIdx);
        const nextItems = new Set(multiSelectedItemIds);
        const nextProjs = new Set(multiSelectedProjectIds);
        for (let i = lo; i <= hi; i++) {
          const row = displayRows[i];
          if (row.kind === 'project') nextProjs.add(row.group.project.id);
          else if (row.kind === 'item') nextItems.add(row.item.id);
        }
        setMultiSelectedItemIds(nextItems);
        setMultiSelectedProjectIds(nextProjs);
        return;
      }
    }
    setMultiSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
    lastMultiAnchorRef.current = { kind: 'project', id: projectId };
  };

  const toggleMultiSelectItem = (itemId: string, shiftKey = false) => {
    if (shiftKey && lastMultiAnchorRef.current) {
      const anchor = lastMultiAnchorRef.current;
      const startIdx = displayRows.findIndex((r) =>
        anchor.kind === 'project'
          ? r.kind === 'project' && r.group.project.id === anchor.id
          : r.kind === 'item' && r.item.id === anchor.id
      );
      const endIdx = displayRows.findIndex(
        (r) => r.kind === 'item' && r.item.id === itemId
      );
      if (startIdx >= 0 && endIdx >= 0) {
        const lo = Math.min(startIdx, endIdx);
        const hi = Math.max(startIdx, endIdx);
        const nextItems = new Set(multiSelectedItemIds);
        const nextProjs = new Set(multiSelectedProjectIds);
        for (let i = lo; i <= hi; i++) {
          const row = displayRows[i];
          if (row.kind === 'project') nextProjs.add(row.group.project.id);
          else if (row.kind === 'item') nextItems.add(row.item.id);
        }
        setMultiSelectedItemIds(nextItems);
        setMultiSelectedProjectIds(nextProjs);
        return;
      }
    }
    setMultiSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
    lastMultiAnchorRef.current = { kind: 'item', id: itemId };
  };

  // Handle mouse drag for task bars on timeline (supports moving multiple selected tasks/projects together)
  const handleBarMouseDown = (
    e: React.MouseEvent,
    item: ComputedGanttItem,
    mode: 'move' | 'resize' | 'resize-start' | 'progress'
  ) => {
    e.stopPropagation();
    if (mode === 'move' && (e.metaKey || e.ctrlKey || e.shiftKey)) {
      return;
    }
    hasDraggedRef.current = false;
    const startX = e.clientX;
    const startY = e.clientY;
    let axisLocked: 'none' | 'horizontal' | 'vertical' =
      mode === 'move' ? 'none' : 'horizontal';
    const origStart = parseDateSafe(item.startDate);
    const origDuration = item.type === 'milestone' ? 0 : Math.max(1, item.duration);
    const origProgress = item.progress ?? 0;
    const barWidthPx = Math.max(24, origDuration * dayWidth);

    const isMultiMove =
      mode === 'move' &&
      effectiveMultiItemIds.has(item.id) &&
      effectiveMultiItemIds.size > 1;
    const movingIds = isMultiMove ? new Set(effectiveMultiItemIds) : null;

    let lockedProj = getLockedProjectForItem(item, projectsRef.current);
    if (!lockedProj && movingIds) {
      for (const id of movingIds) {
        const target = items.find((it) => it.id === id);
        if (!target) continue;
        const lp = getLockedProjectForItem(target, projectsRef.current);
        if (lp) {
          lockedProj = lp;
          break;
        }
      }
    }

    const attemptedLabel =
      mode === 'resize' || mode === 'resize-start'
        ? `redimensionar «${item.name}» en el diagrama`
        : mode === 'progress'
        ? `cambiar el progreso de «${item.name}»`
        : movingIds
        ? `mover selección múltiple (${movingIds.size} elementos) en el diagrama`
        : `mover «${item.name}» en el diagrama`;
    let lockPromptTriggered = false;

    const multiItemsMap = movingIds
      ? new Map<string, { origStart: Date; origDuration: number; type: 'task' | 'milestone' }>(
          items
            .filter((it) => movingIds.has(it.id))
            .map((it) => [
              it.id,
              {
                origStart: parseDateSafe(it.startDate),
                origDuration: it.type === 'milestone' ? 0 : Math.max(1, it.duration),
                type: it.type,
              },
            ])
        )
      : undefined;

    if (!lockedProj) {
      setDragState({
        itemId: item.id,
        mode,
        startX,
        origStart,
        origDuration,
        dayDelta: 0,
        pixelDeltaX: 0,
        origProgress,
        nextProgress: origProgress,
        multiItems: multiItemsMap,
      });
    }

    const detachListeners = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown, true);
      if (typeof document !== 'undefined') {
        document.body.style.cursor = '';
      }
    };

    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') {
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        detachListeners();
        setDragState(null);
      }
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (axisLocked === 'none') {
        if (Math.abs(dy) >= 5 && Math.abs(dy) > Math.abs(dx) * 1.15) {
          axisLocked = 'vertical';
          hasDraggedRef.current = true;
          detachListeners();
          setDragState(null);
          startTaskRowReorderDrag(item.id, startX, startY, {
            fromTimeline: true,
            immediateStart: true,
            clientX: moveEvent.clientX,
            clientY: moveEvent.clientY,
          });
          return;
        }
        if (Math.abs(dx) >= 4) {
          axisLocked = 'horizontal';
        } else {
          return;
        }
      }

      if (Math.abs(dx) > 3) {
        hasDraggedRef.current = true;
        if (mode === 'move' && !lockedProj && typeof document !== 'undefined') {
          document.body.style.cursor = 'grabbing';
        }
      }
      if (lockedProj) {
        if (Math.abs(dx) > 3 && !lockPromptTriggered) {
          lockPromptTriggered = true;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('keydown', onKeyDown, true);
          setDragState(null);
          setLockedAlertState({
            project: lockedProj,
            attemptedAction: attemptedLabel,
          });
        }
        return;
      }
      if (mode === 'progress') {
        const rawPct = origProgress + (dx / barWidthPx) * 100;
        const snappedPct = Math.max(0, Math.min(100, Math.round(rawPct / 5) * 5));
        setDragState((prev) => (prev ? { ...prev, nextProgress: snappedPct } : null));
        return;
      }
      const deltaDays = Math.round(dx / dayWidth);
      setDragState((prev) => (prev ? { ...prev, dayDelta: deltaDays, pixelDeltaX: dx } : null));
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      detachListeners();

      const dx = upEvent.clientX - startX;
      const deltaDays = Math.round(dx / dayWidth);
      if (Math.abs(dx) > 3 || (lockedProj && deltaDays !== 0)) {
        hasDraggedRef.current = true;
      }
      setDragState(null);

      if (lockedProj) {
        if ((Math.abs(dx) > 3 || deltaDays !== 0) && !lockPromptTriggered) {
          setLockedAlertState({
            project: lockedProj,
            attemptedAction: attemptedLabel,
          });
        }
        return;
      }

      if (mode === 'progress' && item.type === 'task') {
        const rawPct = origProgress + (dx / barWidthPx) * 100;
        const snappedPct = Math.max(0, Math.min(100, Math.round(rawPct / 5) * 5));
        if (snappedPct !== origProgress) {
          onUpdateItem(
            {
              ...item,
              progress: snappedPct,
            },
            false
          );
        }
        return;
      }

      if (deltaDays === 0) return;

      if (mode === 'move') {
        if (movingIds) {
          shiftItemsByDays(movingIds, deltaDays, attemptedLabel);
          return;
        }
        const newStart = formatDateISO(addDays(origStart, deltaDays));
        const newEnd =
          item.type === 'milestone'
            ? newStart
            : calculateEndDateFromDuration(newStart, origDuration, 'task', workCalendar);
        onUpdateItem(
          {
            ...item,
            startDate: newStart,
            endDate: newEnd,
          },
          false
        );
      } else if (mode === 'resize' && item.type === 'task') {
        const newDur = Math.max(1, origDuration + deltaDays);
        const newEnd = calculateEndDateFromDuration(item.startDate, newDur, 'task', workCalendar);
        onUpdateItem(
          {
            ...item,
            duration: newDur,
            endDate: newEnd,
          },
          false
        );
      } else if (mode === 'resize-start' && item.type === 'task') {
        const maxDelta = origDuration - 1;
        const clampedDelta = Math.min(maxDelta, deltaDays);
        const newStart = formatDateISO(addDays(origStart, clampedDelta));
        const newDur = Math.max(1, origDuration - clampedDelta);
        onUpdateItem(
          {
            ...item,
            startDate: newStart,
            duration: newDur,
            endDate: item.endDate,
          },
          false
        );
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown, true);
  };

  // Handle mouse drag for project summary bars (moves all tasks in the project, or all multi-selected projects/tasks together)
  const handleProjectBarMouseDown = (
    e: React.MouseEvent,
    group: ComputedProjectGroup
  ) => {
    e.stopPropagation();
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      return;
    }
    hasDraggedRef.current = false;
    const startX = e.clientX;
    const startY = e.clientY;
    let axisLocked: 'none' | 'horizontal' | 'vertical' = 'none';

    const isPartOfMulti =
      multiSelectedProjectIds.has(group.project.id) &&
      effectiveMultiItemIds.size > 0;
    const movingIds = isPartOfMulti
      ? new Set(effectiveMultiItemIds)
      : new Set(group.items.map((it) => it.id));

    if (movingIds.size === 0) return;

    let lockedProj: GanttProject | undefined = group.project.locked
      ? group.project
      : undefined;
    if (!lockedProj) {
      for (const id of movingIds) {
        const target = items.find((it) => it.id === id);
        if (!target) continue;
        const lp = getLockedProjectForItem(target, projectsRef.current);
        if (lp) {
          lockedProj = lp;
          break;
        }
      }
    }

    const attemptedLabel = isPartOfMulti
      ? `mover selección múltiple (${movingIds.size} elementos) en el diagrama`
      : `mover proyecto «${group.project.name}» en el diagrama`;
    let lockPromptTriggered = false;

    const multiItemsMap = new Map<
      string,
      { origStart: Date; origDuration: number; type: 'task' | 'milestone' }
    >(
      items
        .filter((it) => movingIds.has(it.id))
        .map((it) => [
          it.id,
          {
            origStart: parseDateSafe(it.startDate),
            origDuration: it.type === 'milestone' ? 0 : Math.max(1, it.duration),
            type: it.type,
          },
        ])
    );

    if (!lockedProj) {
      setDragState({
        itemId: `project:${group.project.id}`,
        mode: 'move',
        startX,
        origStart: parseDateSafe(group.startDate),
        origDuration: group.duration,
        dayDelta: 0,
        pixelDeltaX: 0,
        multiItems: multiItemsMap,
      });
    }

    const detachListeners = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown, true);
      if (typeof document !== 'undefined') {
        document.body.style.cursor = '';
      }
    };

    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') {
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        detachListeners();
        setDragState(null);
      }
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (axisLocked === 'none') {
        if (Math.abs(dy) >= 5 && Math.abs(dy) > Math.abs(dx) * 1.15) {
          axisLocked = 'vertical';
          hasDraggedRef.current = true;
          detachListeners();
          setDragState(null);
          startProjectRowReorderDrag(group.project.id, startX, startY, {
            fromTimeline: true,
            immediateStart: true,
            clientX: moveEvent.clientX,
            clientY: moveEvent.clientY,
          });
          return;
        }
        if (Math.abs(dx) >= 4) {
          axisLocked = 'horizontal';
        } else {
          return;
        }
      }

      if (Math.abs(dx) > 3) {
        hasDraggedRef.current = true;
        if (!lockedProj && typeof document !== 'undefined') {
          document.body.style.cursor = 'grabbing';
        }
      }
      if (lockedProj) {
        if (Math.abs(dx) > 3 && !lockPromptTriggered) {
          lockPromptTriggered = true;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('keydown', onKeyDown, true);
          setDragState(null);
          setLockedAlertState({
            project: lockedProj,
            attemptedAction: attemptedLabel,
          });
        }
        return;
      }
      const deltaDays = Math.round(dx / dayWidth);
      setDragState((prev) => (prev ? { ...prev, dayDelta: deltaDays, pixelDeltaX: dx } : null));
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      detachListeners();

      const dx = upEvent.clientX - startX;
      const deltaDays = Math.round(dx / dayWidth);
      if (Math.abs(dx) > 3 || (lockedProj && deltaDays !== 0)) {
        hasDraggedRef.current = true;
      }
      setDragState(null);

      if (lockedProj) {
        if ((Math.abs(dx) > 3 || deltaDays !== 0) && !lockPromptTriggered) {
          setLockedAlertState({
            project: lockedProj,
            attemptedAction: attemptedLabel,
          });
        }
        return;
      }

      if (deltaDays === 0) return;
      shiftItemsByDays(movingIds, deltaDays, attemptedLabel);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown, true);
  };

  const showDepToast = showWorkspaceToast;

  const commitAddDependency = (
    predId: string,
    succId: string,
    depType: DependencyType = 'FS',
    options?: { requireNonDisplacing?: boolean }
  ): boolean => {
    if (!guardItemUnlocked(succId, 'crear dependencia en proyecto bloqueado')) {
      return false;
    }
    const requireNonDisplacing = Boolean(options?.requireNonDisplacing);
    if (requireNonDisplacing) {
      const validation = canCreateNonDisplacingDependency(
        items,
        predId,
        succId,
        depType
      );
      if (!validation.allowed) {
        if (validation.reason === 'would_shift') {
          const succItem = enrichedItemById.get(succId);
          const succLabel = succItem
            ? `#${succItem.wbsCode || succItem.wbs} ${succItem.name}`
            : 'la tarea destino';
          const altHint = validation.suggestedAlternative
            ? ` Prueba conectar al punto ${
                validation.suggestedAlternative === 'FF' ||
                validation.suggestedAlternative === 'SF'
                  ? 'final'
                  : 'inicial'
              } para crear ${validation.suggestedAlternative}.`
            : '';
          showDepToast(
            `No se puede crear ${depType}: desplazaría las fechas de ${succLabel}.${altHint}`,
            'error'
          );
        } else if (validation.reason === 'cycle') {
          showDepToast(
            'No se puede conectar: generaría una dependencia circular (ciclo).',
            'error'
          );
        } else if (validation.reason === 'self') {
          showDepToast('Una tarea no puede depender de sí misma.', 'error');
        } else if (validation.reason === 'duplicate') {
          showDepToast('Esta dependencia ya existe entre ambas tareas.', 'info');
        }
        return false;
      }
    }

    const effectiveCascade = requireNonDisplacing ? false : autoCascade;
    const res = addDependencyLink(
      items,
      predId,
      succId,
      depType,
      effectiveCascade,
      projectsRef.current
    );
    if (!res.added) {
      if (res.error === 'cycle') {
        showDepToast(
          'No se puede conectar: generaría una dependencia circular (ciclo).',
          'error'
        );
      } else if (res.error === 'self') {
        showDepToast('Una tarea no puede depender de sí misma.', 'error');
      } else if (res.error === 'duplicate') {
        showDepToast('Esta dependencia ya existe entre ambas tareas.', 'info');
      }
      return false;
    }

    if (onUpdateItems) {
      onUpdateItems(res.items);
    } else {
      const nonCascaded = addDependencyLink(
        items,
        predId,
        succId,
        depType,
        false,
        projectsRef.current
      );
      const updatedSucc = nonCascaded.items.find((it) => it.id === succId);
      if (updatedSucc) {
        onUpdateItem(updatedSucc, effectiveCascade);
      }
    }
    showDepToast(`Dependencia ${depType} creada en el diagrama`, 'success');
    return true;
  };

  const commitRemoveDependency = (predId: string, succId: string): boolean => {
    if (!guardItemUnlocked(succId, 'eliminar dependencia de proyecto bloqueado')) {
      return false;
    }
    const res = removeDependencyLink(items, predId, succId, false, projectsRef.current);
    if (!res.removed) return false;

    if (onUpdateItems) {
      onUpdateItems(res.items);
    } else {
      const updatedSucc = res.items.find((it) => it.id === succId);
      if (updatedSucc) {
        onUpdateItem(updatedSucc, false);
      }
    }

    setSelectedDepLink((prev) =>
      prev && prev.predId === predId && prev.succId === succId ? null : prev
    );
    setHoveredDepKey((prev) =>
      prev === `dep-${predId}-${succId}` ? null : prev
    );
    showDepToast('Dependencia eliminada', 'info');
    return true;
  };

  const commitMoveDependency = (
    oldPredId: string,
    oldSuccId: string,
    newPredId: string,
    newSuccId: string,
    depType?: DependencyType
  ): boolean => {
    if (!guardItemUnlocked(oldSuccId, 'mover dependencia de proyecto bloqueado')) {
      return false;
    }
    if (!guardItemUnlocked(newSuccId, 'conectar dependencia a proyecto bloqueado')) {
      return false;
    }
    const res = moveDependencyLink(
      items,
      oldPredId,
      oldSuccId,
      newPredId,
      newSuccId,
      depType,
      autoCascade,
      projectsRef.current
    );
    if (!res.moved) {
      if (res.error === 'cycle') {
        showDepToast(
          'No se puede mover la dependencia: generaría un ciclo circular.',
          'error'
        );
      } else if (res.error === 'self') {
        showDepToast('Una tarea no puede depender de sí misma.', 'error');
      } else if (res.error === 'duplicate') {
        showDepToast('Esa dependencia ya existe en la tarea destino.', 'info');
      }
      return false;
    }

    if (onUpdateItems) {
      onUpdateItems(res.items);
    } else {
      const nonCascaded = moveDependencyLink(
        items,
        oldPredId,
        oldSuccId,
        newPredId,
        newSuccId,
        depType,
        false,
        projectsRef.current
      );
      if (oldSuccId !== newSuccId) {
        const updatedOldSucc = nonCascaded.items.find((it) => it.id === oldSuccId);
        if (updatedOldSucc) {
          onUpdateItem(updatedOldSucc, false);
        }
      }
      const updatedNewSucc = nonCascaded.items.find((it) => it.id === newSuccId);
      if (updatedNewSucc) {
        onUpdateItem(updatedNewSucc, autoCascade);
      }
    }

    setSelectedDepLink((prev) =>
      prev && prev.predId === oldPredId && prev.succId === oldSuccId
        ? { predId: newPredId, succId: newSuccId }
        : prev
    );
    showDepToast('Dependencia movida correctamente', 'success');
    return true;
  };

  const commitUpdateDependencyType = (
    predId: string,
    succId: string,
    depType: DependencyType
  ): boolean => {
    if (!guardItemUnlocked(succId, 'cambiar tipo de dependencia en proyecto bloqueado')) {
      return false;
    }
    const res = updateDependencyLinkType(
      items,
      predId,
      succId,
      depType,
      autoCascade,
      projectsRef.current
    );
    if (!res.updated) return false;

    if (onUpdateItems) {
      onUpdateItems(res.items);
    } else {
      const nonCascaded = updateDependencyLinkType(
        items,
        predId,
        succId,
        depType,
        false,
        projectsRef.current
      );
      const updatedSucc = nonCascaded.items.find((it) => it.id === succId);
      if (updatedSucc) {
        onUpdateItem(updatedSucc, autoCascade);
      }
    }
    showDepToast(`Relación actualizada a ${depType}`, 'success');
    return true;
  };

  // Keyboard shortcuts for deleting selected dependency (Delete / Backspace) or cancelling connect/select modes (Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectModeSource(null);
        setReconnectMode(null);
        setDepDragState(null);
        setSelectedDepLink(null);
        setSelectedItemId(null);
        setSelectedDiagramProjectId(null);
        setSelectedDiagramReleaseId(null);
        clearMultiSelection();
        onSelectEntity?.(null);
        if (isFocusMode && onExitFocusMode) {
          onExitFocusMode();
        }
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDepLink) {
        const activeEl = document.activeElement as HTMLElement | null;
        if (
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.tagName === 'SELECT' ||
            activeEl.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        commitRemoveDependency(selectedDepLink.predId, selectedDepLink.succId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDepLink, items, autoCascade, isFocusMode, onExitFocusMode]);

  const handleBarClick = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    if (connectModeSource) {
      if (connectModeSource.itemId === itemId) {
        setConnectModeSource(null);
        return;
      }
      const sourcePort: DependencyPortSide =
        connectModeSource.port || (connectModeSource.role === 'succ' ? 'start' : 'end');
      const targetCoords = itemRowMap.get(itemId);
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      let targetPort: DependencyPortSide = 'start';
      if (targetCoords && canvasRect) {
        const clickX = e.clientX - canvasRect.left;
        const midX =
          targetCoords.item.type === 'milestone'
            ? targetCoords.startX
            : (targetCoords.startX + targetCoords.endX) / 2;
        targetPort = clickX > midX ? 'end' : 'start';
      }
      const depType = resolveDependencyTypeFromPorts(sourcePort, targetPort);
      commitAddDependency(connectModeSource.itemId, itemId, depType, {
        requireNonDisplacing: true,
      });
      setConnectModeSource(null);
      return;
    }
    if (reconnectMode) {
      const newPredId =
        reconnectMode.endpoint === 'source' ? itemId : reconnectMode.oldPredId;
      const newSuccId =
        reconnectMode.endpoint === 'target' ? itemId : reconnectMode.oldSuccId;
      commitMoveDependency(
        reconnectMode.oldPredId,
        reconnectMode.oldSuccId,
        newPredId,
        newSuccId,
        reconnectMode.depType
      );
      setReconnectMode(null);
      return;
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      toggleMultiSelectItem(itemId, e.shiftKey);
      return;
    }
    setSelectedDepLink(null);
    setSelectedDiagramProjectId(null);
    setSelectedDiagramReleaseId(null);
    setSelectedItemId((prev) => {
      const next = prev === itemId ? null : itemId;
      if (next) {
        const it = enrichedItemById.get(next);
        onSelectEntity?.({ type: 'task', id: next, name: it?.name });
      } else {
        onSelectEntity?.(null);
      }
      return next;
    });
  };

  // Handle split pane divider resize
  const getMaxSplitWidth = () => {
    const containerW =
      splitPaneRef.current?.clientWidth ||
      (typeof window !== 'undefined' ? window.innerWidth : 1200);
    return Math.max(360, Math.min(fullContentSplitWidth, containerW - 6));
  };

  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingSplitRef.current = true;
    setIsDraggingSplit(true);
    const startX = e.clientX;
    const origWidth = splitWidth;
    const maxW = getMaxSplitWidth();

    const onMove = (me: MouseEvent) => {
      if (!isResizingSplitRef.current) return;
      if (Math.abs(me.clientX - startX) > 2) {
        setSplitExpandedPrevWidth(null);
      }
      const nextWidth = Math.max(360, Math.min(maxW, origWidth + (me.clientX - startX)));
      setSplitWidth(nextWidth);
    };

    const onUp = () => {
      isResizingSplitRef.current = false;
      setIsDraggingSplit(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleSplitDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (splitExpandedPrevWidth !== null) {
      setSplitWidth(splitExpandedPrevWidth);
      setSplitExpandedPrevWidth(null);
      return;
    }
    const expandedW = getMaxSplitWidth();
    setSplitExpandedPrevWidth(splitWidth);
    setSplitWidth(expandedW);
  };

  // Map item ID to display row index and coordinates for SVG dependency lines and bars
  const itemRowMap = useMemo(() => {
    const map = new Map<
      string,
      {
        index: number;
        item: ComputedGanttItem;
        startX: number;
        endX: number;
        centerY: number;
        effectiveStartStr: string;
        effectiveEndStr: string;
        effectiveDuration: number;
        isCollapsedRow?: boolean;
      }
    >();

    const computeCoordsForItem = (
      it: ComputedGanttItem,
      rowIndex: number,
      isCollapsedRow = false,
      groupOverride?: ComputedProjectGroup
    ) => {
      if (isCollapsedRow && groupOverride) {
        const groupStart = parseDateSafe(groupOverride.startDate);
        const startOffsetDays = differenceInCalendarDays(groupStart, timelineStart);
        const groupStartX = startOffsetDays * dayWidth;
        const groupDuration = Math.max(1, groupOverride.duration);
        const groupEndX = groupStartX + groupDuration * dayWidth;
        const centerY = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

        return {
          index: rowIndex,
          item: it,
          startX: groupStartX,
          endX: groupEndX,
          centerY,
          effectiveStartStr: groupOverride.startDate,
          effectiveEndStr: groupOverride.endDate,
          effectiveDuration: groupDuration,
          isCollapsedRow: true,
        };
      }

      const effectiveStart = parseDateSafe(it.startDate);
      const effectiveDuration =
        it.type === 'milestone' ? 0 : Math.max(1, it.duration);

      const effectiveStartStr = formatDateISO(effectiveStart);
      const effectiveEndStr =
        it.type === 'milestone'
          ? effectiveStartStr
          : calculateEndDateFromDuration(effectiveStartStr, effectiveDuration, 'task');

      const startOffsetDays = differenceInCalendarDays(effectiveStart, timelineStart);
      const startX = startOffsetDays * dayWidth;
      const endX =
        it.type === 'milestone'
          ? startX + dayWidth / 2
          : startX + effectiveDuration * dayWidth;
      const centerY = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

      return {
        index: rowIndex,
        item: it,
        startX: it.type === 'milestone' ? startX + dayWidth / 2 : startX,
        endX,
        centerY,
        effectiveStartStr,
        effectiveEndStr,
        effectiveDuration,
        isCollapsedRow,
      };
    };

    displayRows.forEach((row, rowIndex) => {
      if (row.kind === 'item') {
        map.set(row.item.id, computeCoordsForItem(row.item, rowIndex, false));
      } else if (row.kind === 'project' && row.group.project.collapsed) {
        // Anchor collapsed items to their parent project summary bar so cross-project dependency lines visually connect
        for (const collapsedItem of row.group.items) {
          map.set(collapsedItem.id, computeCoordsForItem(collapsedItem, rowIndex, true, row.group));
        }
      }
    });

    return map;
  }, [displayRows, dragState, timelineStart, dayWidth]);

  // Interactive pointer drag handler for creating new dependencies from task/milestone ports
  // or moving/reconnecting existing dependency arrow endpoints directly on the diagram
  const handleStartDependencyDrag = (
    e: React.MouseEvent,
    config: {
      mode: 'create' | 'move-source' | 'move-target';
      originPort?: 'out' | 'in';
      fixedItemId: string;
      oldPredId?: string;
      oldSuccId?: string;
      depType?: DependencyType;
    }
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    if (
      (config.mode === 'move-source' || config.mode === 'move-target') &&
      config.oldSuccId &&
      !guardItemUnlocked(config.oldSuccId, 'mover dependencia de proyecto bloqueado')
    ) {
      return;
    }

    const fixedCoords = itemRowMap.get(config.fixedItemId);
    if (!fixedCoords) return;

    const anchorOnEnd =
      (config.mode === 'create' && config.originPort !== 'in') ||
      config.mode === 'move-target';

    const anchorX = anchorOnEnd
      ? fixedCoords.item.type === 'milestone'
        ? fixedCoords.startX + 11
        : fixedCoords.endX
      : fixedCoords.item.type === 'milestone'
      ? fixedCoords.startX - 11
      : fixedCoords.startX;
    const anchorY = fixedCoords.centerY;

    const canvasEl = canvasRef.current;
    const initRect = canvasEl?.getBoundingClientRect();
    const initX = initRect ? e.clientX - initRect.left : anchorX;
    const initY = initRect ? e.clientY - initRect.top : anchorY;
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let hasMoved = false;
    let latestTargetId: string | null = null;
    let latestTargetPort: DependencyPortSide | null = null;

    setDepDragState({
      mode: config.mode,
      originPort: config.originPort,
      fixedItemId: config.fixedItemId,
      oldPredId: config.oldPredId,
      oldSuccId: config.oldSuccId,
      depType: config.depType || 'FS',
      startX: anchorX,
      startY: anchorY,
      cursorX: initX,
      cursorY: initY,
      hoveredTargetId: null,
      hoveredTargetPort: null,
    });

    const resolveTargetPortForItem = (
      itemId: string,
      canvasX: number
    ): DependencyPortSide => {
      const coords = itemRowMap.get(itemId);
      if (!coords) return 'start';
      const midX =
        coords.item.type === 'milestone'
          ? coords.startX
          : (coords.startX + coords.endX) / 2;
      return canvasX > midX ? 'end' : 'start';
    };

    const resolveTargetFromPoint = (
      clientX: number,
      clientY: number,
      canvasX: number,
      canvasY: number
    ): { itemId: string; port: DependencyPortSide } | null => {
      if (typeof document !== 'undefined' && document.elementsFromPoint) {
        const els = document.elementsFromPoint(clientX, clientY);
        for (const el of els) {
          const htmlEl = el as HTMLElement;
          if (!htmlEl || !htmlEl.closest) continue;
          const portEl = htmlEl.closest(
            '[data-dep-port-in], [data-dep-port-out]'
          ) as HTMLElement | null;
          if (portEl) {
            const inId = portEl.getAttribute('data-dep-port-in');
            const outId = portEl.getAttribute('data-dep-port-out');
            const pid = inId || outId;
            if (pid && pid !== config.fixedItemId) {
              return { itemId: pid, port: inId ? 'start' : 'end' };
            }
          }
          const barEl = htmlEl.closest(
            '[data-timeline-task], [data-timeline-milestone]'
          ) as HTMLElement | null;
          if (barEl) {
            const bid =
              barEl.getAttribute('data-timeline-task') ||
              barEl.getAttribute('data-timeline-milestone');
            if (bid && bid !== config.fixedItemId) {
              return {
                itemId: bid,
                port: resolveTargetPortForItem(bid, canvasX),
              };
            }
          }
          const rowEl = htmlEl.closest('[data-task-row]') as HTMLElement | null;
          if (rowEl) {
            const rid = rowEl.getAttribute('data-task-row');
            if (rid && rid !== config.fixedItemId) {
              return {
                itemId: rid,
                port: resolveTargetPortForItem(rid, canvasX),
              };
            }
          }
        }
      }

      const rowIndex = Math.floor(canvasY / ROW_HEIGHT);
      if (rowIndex >= 0 && rowIndex < displayRows.length) {
        const row = displayRows[rowIndex];
        if (row.kind === 'item' && row.item.id !== config.fixedItemId) {
          return {
            itemId: row.item.id,
            port: resolveTargetPortForItem(row.item.id, canvasX),
          };
        }
      }
      return null;
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dist = Math.hypot(
        moveEvent.clientX - startClientX,
        moveEvent.clientY - startClientY
      );
      if (dist > 4) {
        hasMoved = true;
      }
      const rect = canvasRef.current?.getBoundingClientRect();
      const curX = rect ? moveEvent.clientX - rect.left : initX;
      const curY = rect ? moveEvent.clientY - rect.top : initY;
      const targetMatch = resolveTargetFromPoint(
        moveEvent.clientX,
        moveEvent.clientY,
        curX,
        curY
      );
      latestTargetId = targetMatch?.itemId || null;
      latestTargetPort = targetMatch?.port || null;

      setDepDragState((prev) =>
        prev
          ? {
              ...prev,
              cursorX: curX,
              cursorY: curY,
              hoveredTargetId: latestTargetId,
              hoveredTargetPort: latestTargetPort,
            }
          : null
      );
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setDepDragState(null);

      if (!hasMoved) {
        // Click without dragging: toggle click-to-connect or click-to-reconnect mode
        if (config.mode === 'create') {
          const clickedPort: DependencyPortSide =
            config.originPort === 'in' ? 'start' : 'end';
          if (
            connectModeSource &&
            connectModeSource.itemId !== config.fixedItemId
          ) {
            const sourcePort: DependencyPortSide =
              connectModeSource.port ||
              (connectModeSource.role === 'succ' ? 'start' : 'end');
            const resolvedDepType = resolveDependencyTypeFromPorts(
              sourcePort,
              clickedPort
            );
            commitAddDependency(
              connectModeSource.itemId,
              config.fixedItemId,
              resolvedDepType,
              { requireNonDisplacing: true }
            );
            setConnectModeSource(null);
          } else {
            setReconnectMode(null);
            setSelectedDepLink(null);
            setConnectModeSource((prev) =>
              prev &&
              prev.itemId === config.fixedItemId &&
              prev.port === clickedPort
                ? null
                : { itemId: config.fixedItemId, role: 'pred', port: clickedPort }
            );
          }
        } else if (
          (config.mode === 'move-source' || config.mode === 'move-target') &&
          config.oldPredId &&
          config.oldSuccId
        ) {
          setSelectedItemId(null);
          setSelectedDepLink({
            predId: config.oldPredId,
            succId: config.oldSuccId,
          });
          setReconnectMode({
            oldPredId: config.oldPredId,
            oldSuccId: config.oldSuccId,
            endpoint: config.mode === 'move-source' ? 'source' : 'target',
            depType: config.depType || 'FS',
          });
        }
        return;
      }

      if (latestTargetId && latestTargetId !== config.fixedItemId) {
        if (config.mode === 'create') {
          const sourcePort: DependencyPortSide =
            config.originPort === 'in' ? 'start' : 'end';
          const targetPort: DependencyPortSide = latestTargetPort || 'start';
          const resolvedDepType = resolveDependencyTypeFromPorts(
            sourcePort,
            targetPort
          );
          commitAddDependency(
            config.fixedItemId,
            latestTargetId,
            resolvedDepType,
            { requireNonDisplacing: true }
          );
        } else if (
          config.mode === 'move-source' &&
          config.oldPredId &&
          config.oldSuccId
        ) {
          commitMoveDependency(
            config.oldPredId,
            config.oldSuccId,
            latestTargetId,
            config.oldSuccId,
            config.depType
          );
        } else if (
          config.mode === 'move-target' &&
          config.oldPredId &&
          config.oldSuccId
        ) {
          commitMoveDependency(
            config.oldPredId,
            config.oldSuccId,
            config.oldPredId,
            latestTargetId,
            config.depType
          );
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Selected item and project metadata for the docked top-right inspection panel
  const selectedItem = useMemo(
    () =>
      effectiveSelectedItemId
        ? enrichedItemById.get(effectiveSelectedItemId) || null
        : null,
    [enrichedItemById, effectiveSelectedItemId]
  );

  const selectedGroup = useMemo(() => {
    if (!selectedItem) return null;
    return (
      allProjectGroups.find((g) => g.project.id === selectedItem.projectId) ||
      allProjectGroups[0]
    );
  }, [selectedItem, allProjectGroups]);

  const selectedPredecessors = useMemo(() => {
    if (!selectedItem || !selectedItem.dependencies) return [];
    return selectedItem.dependencies
      .map((id) => enrichedItemById.get(id))
      .filter((it): it is ComputedGanttItem => Boolean(it));
  }, [selectedItem, enrichedItemById]);

  const selectedSuccessors = useMemo(() => {
    if (!selectedItem) return [];
    const list: ComputedGanttItem[] = [];
    for (const it of enrichedItemById.values()) {
      if (it.dependencies?.includes(selectedItem.id)) {
        list.push(it);
      }
    }
    return list;
  }, [selectedItem, enrichedItemById]);

  // Check if tasks are directly connected to highlight on hover or selection
  const relatedIds = useMemo(() => {
    const set = new Set<string>();
    if (selectedDepLink) {
      set.add(selectedDepLink.predId);
      set.add(selectedDepLink.succId);
    }
    const activeId = hoveredId || effectiveSelectedItemId;
    if (!activeId) return set;
    set.add(activeId);
    for (const it of items) {
      if (it.id === activeId) {
        it.dependencies.forEach((d) => set.add(d));
      }
      if (it.dependencies.includes(activeId)) {
        set.add(it.id);
      }
    }
    return set;
  }, [hoveredId, effectiveSelectedItemId, selectedDepLink, items]);

  // Memoized dependency links with channel separation (multi-lane routing),
  // unified left-anchor entrance, smooth rounded corners (fillet curves), and density/visibility filtering
  const dependencyLinks = useMemo(() => {
    if (arrowVisibility === 'none') return [];

    const incomingMap = new Map<string, string[]>();
    const outgoingMap = new Map<string, string[]>();

    for (const succ of items) {
      if (succ.hidden) continue;
      if (!succ.dependencies || succ.dependencies.length === 0) continue;
      const succCoords = itemRowMap.get(succ.id);
      if (!succCoords) continue;

      for (const predId of succ.dependencies) {
        const predCoords = itemRowMap.get(predId);
        if (!predCoords || predCoords.item.hidden) continue;
        if (
          predCoords.isCollapsedRow &&
          succCoords.isCollapsedRow &&
          predCoords.index === succCoords.index
        ) {
          continue;
        }

        if (!incomingMap.has(succ.id)) incomingMap.set(succ.id, []);
        incomingMap.get(succ.id)!.push(predId);

        if (!outgoingMap.has(predId)) outgoingMap.set(predId, []);
        outgoingMap.get(predId)!.push(succ.id);
      }
    }

    const drawnCollapsedPairs = new Set<string>();

    const list: Array<{
      key: string;
      predId: string;
      succId: string;
      depType: DependencyType;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      midPoint: OrthogonalPoint;
      dPath: string;
      strokeColor: string;
      strokeWidth: number;
      markerEnd: string;
      hasConflict: boolean;
      isHighlighted: boolean;
      isCriticalLink: boolean;
      isSelectedLink: boolean;
      isHoveredLink: boolean;
      isInterProject?: boolean;
    }> = [];

    for (const succ of items) {
      if (succ.hidden) continue;
      if (!succ.dependencies || succ.dependencies.length === 0) continue;
      const succCoords = itemRowMap.get(succ.id);
      if (!succCoords) continue;

      const succPreds = incomingMap.get(succ.id) || [];
      const totalIncoming = succPreds.length;

      succ.dependencies.forEach((predId) => {
        const predCoords = itemRowMap.get(predId);
        if (!predCoords || predCoords.item.hidden) return;
        if (
          predCoords.isCollapsedRow &&
          succCoords.isCollapsedRow &&
          predCoords.index === succCoords.index
        ) {
          return;
        }

        const isInterProject = Boolean(predCoords.isCollapsedRow || succCoords.isCollapsedRow);
        if (predCoords.isCollapsedRow && succCoords.isCollapsedRow) {
          const pairKey = `${predCoords.index}->${succCoords.index}`;
          if (drawnCollapsedPairs.has(pairKey)) return;
          drawnCollapsedPairs.add(pairKey);
        }

        const incomingIndex = succPreds.indexOf(predId);
        const outgoingList = outgoingMap.get(predId) || [];
        const outgoingIndex = outgoingList.indexOf(succ.id);

        const laneIndex = Math.min(
          4,
          Math.max(0, incomingIndex >= 0 ? incomingIndex : 0) +
            (outgoingIndex > 0 ? outgoingIndex : 0)
        );

        const depType: DependencyType = succ.dependencyTypes?.[predId] || 'FS';
        const fromStart = depType === 'SS' || depType === 'SF';
        const linkKey = `dep-${predId}-${succ.id}`;
        const isSelectedLink =
          selectedDepLink?.predId === predId && selectedDepLink?.succId === succ.id;
        const isHoveredLink = hoveredDepKey === linkKey;

        const isHighlighted =
          isSelectedLink ||
          isHoveredLink ||
          hoveredId === succ.id ||
          hoveredId === predId ||
          selectedItemId === succ.id ||
          selectedItemId === predId;
        const isCriticalLink =
          showCriticalPath && succ.isCritical && predCoords.item.isCritical;

        // Visibility selector filtering
        if (arrowVisibility === 'hover' && !isHighlighted) return;
        if (arrowVisibility === 'critical' && !isCriticalLink && !isHighlighted) return;

        // Predecessor exit anchor (x1, y1)
        const x1 = fromStart
          ? predCoords.item.type === 'milestone'
            ? predCoords.startX - 11
            : predCoords.startX
          : predCoords.item.type === 'milestone'
          ? predCoords.startX + 11
          : predCoords.endX;
        const y1 = predCoords.centerY;

        // Successor arrival anchor (x2, y2) — STRICT UNIFIED LEFT-ANCHOR ENTRANCE
        // Arrows always enter strictly from the left side into the start anchor/left shoulder
        const x2 =
          succCoords.item.type === 'milestone'
            ? succCoords.startX - 11
            : succCoords.startX;

        // For tasks with multiple incoming links, stagger entrance height across the left shoulder
        let y2 = succCoords.centerY;
        if (succCoords.item.type === 'task' && totalIncoming > 1) {
          const shoulderOffset = (incomingIndex - (totalIncoming - 1) / 2) * 5;
          y2 = succCoords.centerY + Math.max(-8, Math.min(8, shoulderOffset));
        }

        const stepOut = 12 + laneIndex * 10;
        const waypoints: OrthogonalPoint[] = [];

        if (fromStart) {
          // SS / SF: arrow leaves predecessor going left, enters successor from left
          const exitX = Math.max(4, Math.min(x1, x2) - stepOut);
          if (Math.abs(y1 - y2) < 2) {
            waypoints.push({ x: x1, y: y1 }, { x: x2, y: y2 });
          } else {
            waypoints.push(
              { x: x1, y: y1 },
              { x: exitX, y: y1 },
              { x: exitX, y: y2 },
              { x: x2, y: y2 }
            );
          }
        } else {
          // FS / FF: arrow leaves predecessor going right, enters successor strictly from left
          const gap = x2 - x1;

          if (gap >= 16) {
            // Forward flow with comfortable gap
            const midX = Math.min(x1 + stepOut, x2 - 8);

            if (Math.abs(y1 - y2) < 2) {
              waypoints.push({ x: x1, y: y1 }, { x: x2, y: y2 });
            } else {
              waypoints.push(
                { x: x1, y: y1 },
                { x: midX, y: y1 },
                { x: midX, y: y2 },
                { x: x2, y: y2 }
              );
            }
          } else {
            // Overlapping or backwards: x2 is earlier than or within 16px of x1
            // Routes right out of predecessor, detours vertically into row-gap, travels left past x2, and enters x2 from the left
            const exitX = x1 + 12 + laneIndex * 8;
            const entryX = Math.max(0, Math.min(x2 - 6, x2 - 12 - laneIndex * 8));
            const goingDown = y2 >= y1;
            const detourDir = goingDown ? 1 : -1;
            const detourY = y1 + detourDir * (ROW_HEIGHT / 2 + (laneIndex - 2) * 3);

            waypoints.push(
              { x: x1, y: y1 },
              { x: exitX, y: y1 },
              { x: exitX, y: detourY },
              { x: entryX, y: detourY },
              { x: entryX, y: y2 },
              { x: x2, y: y2 }
            );
          }
        }

        const dPath = createRoundedOrthogonalPath(waypoints, 6);
        const midPoint = computePolylineMidpoint(waypoints);

        const strokeColor = isSelectedLink
          ? '#0C0C09'
          : isCriticalLink
          ? '#D97706'
          : isHighlighted
          ? '#0C0C09'
          : '#71717A';

        const markerEnd = isSelectedLink
          ? 'url(#arrow-active)'
          : isCriticalLink
          ? 'url(#arrow-critical)'
          : isHighlighted
          ? 'url(#arrow-active)'
          : 'url(#arrow-normal)';

        list.push({
          key: linkKey,
          predId,
          succId: succ.id,
          depType,
          x1,
          y1,
          x2,
          y2,
          midPoint,
          dPath,
          strokeColor,
          strokeWidth: isSelectedLink || isHoveredLink ? 2.0 : isHighlighted || isCriticalLink ? 1.8 : 1.5,
          markerEnd,
          hasConflict: succ.hasConflict,
          isHighlighted,
          isCriticalLink,
          isSelectedLink,
          isHoveredLink,
          isInterProject,
        });
      });
    }

    return list;
  }, [
    items,
    itemRowMap,
    hoveredId,
    selectedItemId,
    selectedDepLink,
    hoveredDepKey,
    showCriticalPath,
    arrowVisibility,
  ]);

  // Live SVG drag preview path when creating or moving a dependency arrow on the diagram
  const depDragPreview = useMemo(() => {
    if (!depDragState) return null;
    const isFixedPred =
      depDragState.mode === 'create' || depDragState.mode === 'move-target';

    let x1 = depDragState.startX;
    let y1 = depDragState.startY;
    let x2 = depDragState.cursorX;
    let y2 = depDragState.cursorY;

    if (!isFixedPred) {
      x2 = depDragState.startX;
      y2 = depDragState.startY;
      x1 = depDragState.cursorX;
      y1 = depDragState.cursorY;
    }

    let isValidTarget = true;
    const sourcePort: DependencyPortSide =
      depDragState.originPort === 'in' ? 'start' : 'end';
    let statusLabel =
      depDragState.mode === 'create'
        ? sourcePort === 'start'
          ? 'Arrastra al Inicio (SS) o Fin (SF) de la tarea destino...'
          : 'Arrastra al Inicio (FS) o Fin (FF) de la tarea destino...'
        : 'Arrastra hacia otra tarea para reconectar...';

    if (depDragState.hoveredTargetId) {
      const targetCoords = itemRowMap.get(depDragState.hoveredTargetId);
      const targetItem = enrichedItemById.get(depDragState.hoveredTargetId);
      const fixedItem = enrichedItemById.get(depDragState.fixedItemId);

      if (targetCoords) {
        if (depDragState.mode === 'create') {
          const targetPort: DependencyPortSide =
            depDragState.hoveredTargetPort || 'start';
          x2 =
            targetPort === 'end'
              ? targetCoords.item.type === 'milestone'
                ? targetCoords.startX + 11
                : targetCoords.endX
              : targetCoords.item.type === 'milestone'
              ? targetCoords.startX - 11
              : targetCoords.startX;
          y2 = targetCoords.centerY;
        } else if (isFixedPred) {
          x2 =
            targetCoords.item.type === 'milestone'
              ? targetCoords.startX - 11
              : targetCoords.startX;
          y2 = targetCoords.centerY;
        } else {
          x1 =
            targetCoords.item.type === 'milestone'
              ? targetCoords.startX + 11
              : targetCoords.endX;
          y1 = targetCoords.centerY;
        }
      }

      if (depDragState.mode === 'create') {
        const candidatePred = depDragState.fixedItemId;
        const candidateSucc = depDragState.hoveredTargetId;
        const targetPort: DependencyPortSide =
          depDragState.hoveredTargetPort || 'start';
        const resolvedDepType = resolveDependencyTypeFromPorts(
          sourcePort,
          targetPort
        );
        const validation = canCreateNonDisplacingDependency(
          items,
          candidatePred,
          candidateSucc,
          resolvedDepType
        );
        isValidTarget = validation.allowed;
        const pItem = enrichedItemById.get(candidatePred);
        const sItem = enrichedItemById.get(candidateSucc);
        const pLabel = `#${pItem?.wbsCode || pItem?.wbs}`;
        const sLabel = `#${sItem?.wbsCode || sItem?.wbs}`;
        if (validation.allowed) {
          statusLabel = `Conectar ${pLabel} → ${sLabel} (${resolvedDepType})`;
        } else if (validation.reason === 'would_shift') {
          const alt = validation.suggestedAlternative;
          statusLabel = alt
            ? `${resolvedDepType} bloqueado: movería ${sLabel} (usa punto ${
                alt === 'FF' || alt === 'SF' ? 'final' : 'inicial'
              } para ${alt})`
            : `${resolvedDepType} bloqueado: movería ${sLabel}`;
        } else if (validation.reason === 'cycle') {
          statusLabel = 'Ciclo no permitido';
        } else if (validation.reason === 'duplicate') {
          statusLabel = 'Dependencia ya existente';
        }
      } else if (depDragState.oldPredId && depDragState.oldSuccId) {
        const candidatePred =
          depDragState.mode === 'move-source'
            ? depDragState.hoveredTargetId
            : depDragState.oldPredId;
        const candidateSucc =
          depDragState.mode === 'move-target'
            ? depDragState.hoveredTargetId
            : depDragState.oldSuccId;
        const check = moveDependencyLink(
          items,
          depDragState.oldPredId,
          depDragState.oldSuccId,
          candidatePred,
          candidateSucc,
          depDragState.depType,
          false
        );
        isValidTarget = check.moved;
        if (check.moved) {
          const pItem = enrichedItemById.get(candidatePred);
          const sItem = enrichedItemById.get(candidateSucc);
          statusLabel = `Mover a #${pItem?.wbsCode || pItem?.wbs} → #${
            sItem?.wbsCode || sItem?.wbs
          }`;
        } else if (check.error === 'cycle') {
          statusLabel = 'Ciclo no permitido';
        } else if (check.error === 'duplicate') {
          statusLabel = 'Dependencia ya existente';
        } else if (targetItem && fixedItem) {
          isValidTarget = false;
        }
      }
    }

    const midX = (x1 + x2) / 2;
    const previewWaypoints: OrthogonalPoint[] =
      Math.abs(y1 - y2) < 2
        ? [
            { x: x1, y: y1 },
            { x: x2, y: y2 },
          ]
        : [
            { x: x1, y: y1 },
            { x: midX, y: y1 },
            { x: midX, y: y2 },
            { x: x2, y: y2 },
          ];

    return {
      dPath: createRoundedOrthogonalPath(previewWaypoints, 6),
      x1,
      y1,
      x2,
      y2,
      isValidTarget,
      statusLabel,
    };
  }, [depDragState, itemRowMap, enrichedItemById, items]);

  const totalCanvasWidth = timelineDays.length * dayWidth;
  const totalCanvasHeight = Math.max(displayRows.length * ROW_HEIGHT + 56, 360) + collapseBottomSpacerPx;

  // Group and tier milestone vertical guides to avoid label collision when dates coincide or are adjacent
  const milestoneGuides = useMemo(() => {
    const list = visibleMilestones.map((m) => {
      const mCoords = itemRowMap.get(m.id);
      const milestoneX = mCoords
        ? mCoords.startX
        : differenceInCalendarDays(parseDateSafe(m.startDate), timelineStart) * dayWidth + dayWidth / 2;
      return { milestone: m, milestoneX };
    });

    // Sort chronologically by X coordinate
    list.sort((a, b) => a.milestoneX - b.milestoneX);

    let lastX = -9999;
    let currentTier = 0;

    return list.map((entry) => {
      if (Math.abs(entry.milestoneX - lastX) < 76) {
        currentTier = (currentTier + 1) % 3;
      } else {
        currentTier = 0;
      }
      lastX = entry.milestoneX;

      // Safe clamp offset so badges near left/right canvas boundaries don't clip
      const halfBadge = 50;
      let badgeClampOffset = 0;
      if (entry.milestoneX < halfBadge + 4) {
        badgeClampOffset = halfBadge + 4 - entry.milestoneX;
      } else if (entry.milestoneX > totalCanvasWidth - halfBadge - 4) {
        badgeClampOffset = totalCanvasWidth - halfBadge - 4 - entry.milestoneX;
      }

      return {
        ...entry,
        tier: currentTier,
        badgeClampOffset,
      };
    });
  }, [visibleMilestones, itemRowMap, timelineStart, dayWidth, totalCanvasWidth]);

  // Compute release milestone guides scoped strictly to the vertical span of their release / assigned projects
  const releaseMilestoneGuides = useMemo(() => {
    if (releaseGuideVisibility === 'none' || !releases || releases.length === 0) {
      return [];
    }

    const targetReleaseIds = new Set<string>();
    if (releaseGuideVisibility === 'all') {
      for (const r of releases) targetReleaseIds.add(r.id);
    } else if (releaseGuideVisibility === 'assigned') {
      for (const r of releases) {
        if (projects.some((p) => p.releaseId === r.id)) {
          targetReleaseIds.add(r.id);
        }
      }
    } else {
      // 'selected' (default)
      if (activeReleaseId) {
        targetReleaseIds.add(activeReleaseId);
      } else {
        const visibleRelIds = visibleProjectGroups
          .map((g) => g.project.releaseId)
          .filter(Boolean) as string[];
        if (visibleRelIds.length > 0) {
          for (const id of visibleRelIds) targetReleaseIds.add(id);
        } else {
          const firstWithProj = releases.find((r) =>
            projects.some((p) => p.releaseId === r.id)
          );
          targetReleaseIds.add(firstWithProj?.id || releases[0]?.id);
        }
      }
    }

    if (hiddenReleaseIds && hiddenReleaseIds.length > 0) {
      for (const hid of hiddenReleaseIds) {
        targetReleaseIds.delete(hid);
      }
    }

    interface ReleaseArea {
      release: Release;
      topY: number;
      height: number;
    }
    const areas: ReleaseArea[] = [];

    if (groupingMode === 'release') {
      let currentRel: Release | null = null;
      let startIdx = 0;

      for (let i = 0; i < displayRows.length; i++) {
        const row = displayRows[i];
        if (row.kind === 'release') {
          if (currentRel && targetReleaseIds.has(currentRel.id)) {
            areas.push({
              release: currentRel,
              topY: startIdx * ROW_HEIGHT,
              height: (i - startIdx) * ROW_HEIGHT,
            });
          }
          currentRel =
            row.group.release.id !== '__unassigned__'
              ? releases.find((r) => r.id === row.group.release.id) || null
              : null;
          startIdx = i;
        }
      }
      if (currentRel && targetReleaseIds.has(currentRel.id)) {
        areas.push({
          release: currentRel,
          topY: startIdx * ROW_HEIGHT,
          height: (displayRows.length - startIdx) * ROW_HEIGHT,
        });
      }
    } else {
      // Project grouping mode: each project assigned to a target release gets its vertical area
      let currentProjRel: Release | null = null;
      let projStartIdx = 0;

      for (let i = 0; i < displayRows.length; i++) {
        const row = displayRows[i];
        if (row.kind === 'project') {
          if (currentProjRel && targetReleaseIds.has(currentProjRel.id)) {
            areas.push({
              release: currentProjRel,
              topY: projStartIdx * ROW_HEIGHT,
              height: (i - projStartIdx) * ROW_HEIGHT,
            });
          }
          const relId = row.group.project.releaseId;
          currentProjRel =
            relId && targetReleaseIds.has(relId)
              ? releases.find((r) => r.id === relId) || null
              : null;
          projStartIdx = i;
        }
      }
      if (currentProjRel && targetReleaseIds.has(currentProjRel.id)) {
        areas.push({
          release: currentProjRel,
          topY: projStartIdx * ROW_HEIGHT,
          height: (displayRows.length - projStartIdx) * ROW_HEIGHT,
        });
      }
    }

    // Resilience fallback if displayRows is empty (e.g. initial SSR render)
    if (areas.length === 0 && displayRows.length === 0) {
      for (const rId of targetReleaseIds) {
        const rel = releases.find((r) => r.id === rId);
        if (rel) {
          areas.push({
            release: rel,
            topY: 0,
            height: Math.max(ROW_HEIGHT, totalCanvasHeight),
          });
        }
      }
    }

    const list: Array<{
      guideKey: string;
      release: Release;
      milestone: ReleaseMilestone;
      x: number;
      topY: number;
      height: number;
      tier: number;
    }> = [];

    for (const area of areas) {
      const areaItems: Array<{
        guideKey: string;
        release: Release;
        milestone: ReleaseMilestone;
        x: number;
        topY: number;
        height: number;
        tier: number;
      }> = [];

      for (const m of area.release.milestones) {
        if (!visibleMilestoneKeys.has(m.key.toLowerCase())) continue;
        const mDate = parseDateSafe(m.date);
        const diff = differenceInCalendarDays(mDate, timelineStart);
        const x = diff * dayWidth + dayWidth / 2;
        if (x >= -60 && x <= totalCanvasWidth + 60) {
          areaItems.push({
            guideKey: `${area.release.id}-${m.key}`,
            release: area.release,
            milestone: m,
            x,
            topY: area.topY,
            height: area.height,
            tier: 0,
          });
        }
      }

      areaItems.sort((a, b) => a.x - b.x);
      let lastX = -9999;
      let tier = 0;
      for (const item of areaItems) {
        if (Math.abs(item.x - lastX) < 55) {
          tier = (tier + 1) % 2;
        } else {
          tier = 0;
        }
        item.tier = tier;
        lastX = item.x;
        list.push(item);
      }
    }

    return list;
  }, [
    releases,
    releaseGuideVisibility,
    activeReleaseId,
    projects,
    visibleProjectGroups,
    displayRows,
    groupingMode,
    timelineStart,
    dayWidth,
    totalCanvasWidth,
    totalCanvasHeight,
    visibleMilestoneKeys,
    hiddenReleaseIds,
  ]);

  // Track cursor position and exact calendar date over timeline canvas for the date scrubber
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState || depDragState || isResizingSplitRef.current) {
      if (cursorScrubber) setCursorScrubber(null);
      return;
    }
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    if (rawX < 0 || rawX > totalCanvasWidth) {
      if (cursorScrubber) setCursorScrubber(null);
      return;
    }
    const dayIndex = Math.max(
      0,
      Math.min(timelineDays.length - 1, Math.floor(rawX / dayWidth))
    );
    const date = timelineDays[dayIndex];
    if (date) {
      setCursorScrubber({ x: rawX, date });
    }
  };

  const handleTimelineMouseLeave = () => {
    setCursorScrubber(null);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-[#0C0C09] rounded-[8px] border border-[#0C0C09] dark:border-zinc-800 shadow-none">
      {/* Barra de Herramientas Dedicada del Cronograma (Icon-Only con Hints, Sticky) */}
      <div
        ref={cronogramaToolbarRef}
        data-testid="cronograma-toolbar"
        className="sticky top-12 z-40 min-h-10 py-1 px-3 bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-800 flex items-center justify-between shrink-0 select-none gap-2 shadow-xs"
      >
        {/* Left Side: WBS Toggle & Unified Search / Filter Bar */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Toggle WBS Table button (Icon-only with hint) */}
          {onToggleShowTable && (
            <div className="relative group inline-flex items-center">
              <button
                type="button"
                data-testid="cronograma-toggle-table-btn"
                onClick={onToggleShowTable}
                aria-label={showTable ? 'Ocultar tabla de tareas' : 'Mostrar tabla de tareas'}
                title={showTable ? 'Ocultar tabla WBS' : 'Mostrar tabla WBS'}
                className={`w-7 h-7 flex items-center justify-center rounded-[3px] border transition cursor-pointer shrink-0 ${
                  showTable
                    ? 'bg-white dark:bg-zinc-800 border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-zinc-200 shadow-xs'
                    : 'bg-[#F4F4F1] dark:bg-zinc-800/60 border-dashed border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400'
                }`}
              >
                {showTable ? (
                  <PanelLeftClose className="w-3.5 h-3.5" />
                ) : (
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                )}
              </button>
              <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 animate-fade-in">
                <div className="w-1.5 h-1.5 bg-[#0C0C09] dark:bg-zinc-100 rotate-45 -mb-0.5" />
                <div className="bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                  {showTable ? 'Ocultar tabla WBS' : 'Mostrar tabla WBS'}
                </div>
              </div>
            </div>
          )}

          <div className="h-4 w-px bg-[#E2E2DC] dark:bg-zinc-800 shrink-0 hidden sm:block" />

          {/* Unified Gmail-style Search & Filter Bar (shared with Planificación) */}
          <SearchFilterBar
            testIdPrefix="table"
            searchQuery={tableSearchQuery}
            onChangeSearchQuery={setTableSearchQuery}
            excludeQuery={tableExcludeQuery}
            onChangeExcludeQuery={setTableExcludeQuery}
            searchFields={searchFields}
            onChangeSearchFields={setSearchFields}
            selectedType={tableTypeFilter}
            onChangeSelectedType={setTableTypeFilter}
            selectedPlatform={activePlatformFilter}
            onChangeSelectedPlatform={handleSelectPlatformFilter}
            selectedAlert={tableAlertFilter}
            onChangeSelectedAlert={setTableAlertFilter}
            releases={releases.filter((r) => !hiddenReleaseIds || !hiddenReleaseIds.includes(r.id))}
            selectedRelease={tableReleaseFilter}
            onChangeSelectedRelease={setTableReleaseFilter}
            teams={availableTeams}
            selectedTeam={tableTeamFilter}
            onChangeSelectedTeam={setTableTeamFilter}
            tags={availableTags}
            selectedTag={tableTagFilter}
            onChangeSelectedTag={setTableTagFilter}
            showSubtasksOnFilter={showSubtasksOnFilter}
            onChangeShowSubtasksOnFilter={setShowSubtasksOnFilter}
            initialShowSearchFieldsMenu={initialShowSearchFieldsMenu}
            initialShowAdvancedPanel={initialShowAdvancedPanel}
            enableBuiltInSavedFilters={true}
            onClearFilters={() => {
              setTableSearchQuery('');
              setTableExcludeQuery('');
              setTableTypeFilter('all');
              handleSelectPlatformFilter('all');
              setTableAlertFilter('all');
              setTableReleaseFilter('all');
              setTableTeamFilter('all');
              setTableTagFilter('all');
              setShowSubtasksOnFilter(false);
              setSearchFields({ ...DEFAULT_GANTT_SEARCH_FIELDS });
            }}
          />
        </div>

        {/* Right Side: Dedicated Icon-Only Buttons with Tooltip Hints */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 1. Líneas Filas (Separators) */}
          <div className="relative group inline-flex items-center">
            <button
              type="button"
              data-testid="header-toggle-row-separators-btn"
              onClick={handleToggleRowSeparators}
              aria-label="Líneas horizontales"
              title="Líneas de separación entre filas"
              className={`w-7 h-7 flex items-center justify-center rounded-[3px] border transition cursor-pointer shrink-0 ${
                showRowSeparators
                  ? 'bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:border-white dark:text-[#0C0C09]'
                  : 'bg-white dark:bg-zinc-800 border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white hover:border-[#0C0C09] dark:hover:border-zinc-500'
              }`}
            >
              <Rows className="w-3.5 h-3.5" />
            </button>
            <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 animate-fade-in">
              <div className="w-1.5 h-1.5 bg-[#0C0C09] dark:bg-zinc-100 rotate-45 -mb-0.5" />
              <div className="bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                Líneas de separación
              </div>
            </div>
          </div>

          {/* 2. Fines de Semana */}
          <div className="relative group inline-flex items-center">
            <button
              type="button"
              data-testid="header-toggle-weekend-shading-btn"
              onClick={handleToggleWeekendShading}
              aria-label="Fines de semana"
              title="Sombreado de fines de semana"
              className={`w-7 h-7 flex items-center justify-center rounded-[3px] border transition cursor-pointer shrink-0 ${
                showWeekendShading
                  ? 'bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:border-white dark:text-[#0C0C09]'
                  : 'bg-white dark:bg-zinc-800 border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white hover:border-[#0C0C09] dark:hover:border-zinc-500'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
            </button>
            <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 animate-fade-in">
              <div className="w-1.5 h-1.5 bg-[#0C0C09] dark:bg-zinc-100 rotate-45 -mb-0.5" />
              <div className="bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                Sombreado de fines de semana
              </div>
            </div>
          </div>

          {/* 3. Ruta Crítica (CPM) */}
          <div className="relative group inline-flex items-center">
            <button
              type="button"
              data-testid="header-toggle-critical-path-btn"
              onClick={handleToggleCriticalPath}
              aria-label="Ruta Crítica"
              title="Ruta Crítica (CPM)"
              className={`w-7 h-7 flex items-center justify-center rounded-[3px] border transition cursor-pointer shrink-0 ${
                showCriticalPath
                  ? 'bg-amber-500/20 border-[#D97706] text-[#D97706] dark:text-amber-400 font-bold'
                  : 'bg-white dark:bg-zinc-800 border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white hover:border-[#0C0C09] dark:hover:border-zinc-500'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-current" />
            </button>
            <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 animate-fade-in">
              <div className="w-1.5 h-1.5 bg-[#0C0C09] dark:bg-zinc-100 rotate-45 -mb-0.5" />
              <div className="bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                Ruta Crítica (CPM)
              </div>
            </div>
          </div>

          {/* 4. Hitos de Release Visibles */}
          <div ref={milestonesMenuRef} className="relative group inline-flex items-center" data-dropdown-container="true">
            <button
              type="button"
              data-testid="toggle-milestones-menu-btn"
              onClick={() => setShowMilestonesMenu((prev) => !prev)}
              aria-label="Configurar hitos de release visibles"
              title="Hitos de release visibles en cronograma (Por defecto: QG4, QG5)"
              className={`w-7 h-7 flex items-center justify-center rounded-[3px] border transition cursor-pointer shrink-0 ${
                showMilestonesMenu
                  ? 'bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:border-white dark:text-[#0C0C09]'
                  : 'bg-white dark:bg-zinc-800 border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white hover:border-[#0C0C09] dark:hover:border-zinc-500'
              }`}
            >
              <Diamond className="w-3.5 h-3.5" />
            </button>
            {!showMilestonesMenu && (
              <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 animate-fade-in">
                <div className="w-1.5 h-1.5 bg-[#0C0C09] dark:bg-zinc-100 rotate-45 -mb-0.5" />
                <div className="bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                  Hitos de release visibles
                </div>
              </div>
            )}

            {showMilestonesMenu && (
              <div
                data-testid="milestones-visibility-menu"
                className="absolute right-0 top-full mt-1.5 w-60 p-2 bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[4px] shadow-xl z-50 text-xs flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E2DC] dark:border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <Diamond className="w-3 h-3 text-amber-500 fill-current" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0C0C09] dark:text-zinc-200">
                      Hitos de Release
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-300 font-bold">
                    {visibleMilestoneKeys.size}/16
                  </span>
                </div>

                {/* Presets */}
                <div className="grid grid-cols-3 gap-1 pb-1 border-b border-[#E2E2DC] dark:border-zinc-800 text-[10px]">
                  <button
                    type="button"
                    data-testid="milestones-preset-default"
                    onClick={() => setVisibleMilestoneKeys(new Set(['qg4', 'qg5']))}
                    className="px-1 py-0.5 rounded bg-[#F4F4F1] dark:bg-zinc-800 hover:bg-[#0C0C09] hover:text-white dark:hover:bg-zinc-100 dark:hover:text-black font-medium transition cursor-pointer text-center"
                    title="Mostrar únicamente QG4 y QG5 (valor por defecto)"
                  >
                    QG4/QG5
                  </button>
                  <button
                    type="button"
                    data-testid="milestones-preset-all"
                    onClick={() =>
                      setVisibleMilestoneKeys(
                        new Set(RELEASE_MILESTONE_DEFINITIONS.map((d) => d.id.toLowerCase()))
                      )
                    }
                    className="px-1 py-0.5 rounded bg-[#F4F4F1] dark:bg-zinc-800 hover:bg-[#0C0C09] hover:text-white dark:hover:bg-zinc-100 dark:hover:text-black font-medium transition cursor-pointer text-center"
                    title="Mostrar todos los 16 hitos"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    data-testid="milestones-preset-none"
                    onClick={() => setVisibleMilestoneKeys(new Set())}
                    className="px-1 py-0.5 rounded bg-[#F4F4F1] dark:bg-zinc-800 hover:bg-[#0C0C09] hover:text-white dark:hover:bg-zinc-100 dark:hover:text-black font-medium transition cursor-pointer text-center"
                    title="Ocultar todos los hitos"
                  >
                    Ninguno
                  </button>
                </div>

                {/* Milestone Checklist */}
                <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 pr-0.5">
                  {RELEASE_MILESTONE_DEFINITIONS.map((def) => {
                    const isChecked = visibleMilestoneKeys.has(def.id.toLowerCase());
                    return (
                      <label
                        key={def.id}
                        data-testid={`milestone-toggle-${def.id}`}
                        className="flex items-center justify-between px-2 py-1 rounded-[2px] hover:bg-[#F4F4F1] dark:hover:bg-zinc-800/60 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setVisibleMilestoneKeys((prev) => {
                                const next = new Set(prev);
                                const k = def.id.toLowerCase();
                                if (next.has(k)) next.delete(k);
                                else next.add(k);
                                return next;
                              });
                            }}
                            className="rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] cursor-pointer"
                          />
                          <span className="font-mono font-bold text-[11px] text-[#0C0C09] dark:text-zinc-200">
                            {def.code}
                          </span>
                        </div>
                        <span
                          className="text-[10px] text-[#6B6B66] dark:text-zinc-400 truncate max-w-[110px]"
                          title={def.name}
                        >
                          {def.category}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 5. Ajustar Zoom al Proyecto */}
          <div className="relative group inline-flex items-center">
            <button
              type="button"
              data-fit-timeline-btn="true"
              data-fit-project-header-btn="true"
              onClick={() => handleFitProjectAction()}
              aria-label="Ajustar a Proyecto"
              title={
                isFocusMode && focusEntity
                  ? `Ajustar zoom a ${
                      focusEntity.type === 'release'
                        ? 'la release enfocada'
                        : focusEntity.type === 'project'
                        ? 'el proyecto enfocado'
                        : 'la tarea enfocada'
                    } (${focusEntity.name || focusEntity.id})`
                  : 'Ajustar a Proyecto (ajustar zoom al proyecto completo)'
              }
              className="w-7 h-7 flex items-center justify-center rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white hover:border-[#0C0C09] dark:hover:border-zinc-500 transition cursor-pointer shrink-0"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 animate-fade-in">
              <div className="w-1.5 h-1.5 bg-[#0C0C09] dark:bg-zinc-100 rotate-45 -mb-0.5" />
              <div className="bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                {isFocusMode && focusEntity
                  ? focusEntity.type === 'release'
                    ? 'Ajustar zoom a la release enfocada'
                    : focusEntity.type === 'project'
                    ? 'Ajustar zoom al proyecto enfocado'
                    : 'Ajustar zoom al enfoque activo'
                  : 'Ajustar zoom al proyecto'}
              </div>
            </div>
          </div>

          {/* 5. Ir a Hoy */}
          <div className="relative group inline-flex items-center">
            <button
              type="button"
              data-testid="header-scroll-today-btn"
              onClick={handleScrollToToday}
              aria-label="Ir a Hoy"
              title="Ir al día de hoy"
              className="w-7 h-7 flex items-center justify-center rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white hover:border-[#0C0C09] dark:hover:border-zinc-500 transition cursor-pointer shrink-0"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
            <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 animate-fade-in">
              <div className="w-1.5 h-1.5 bg-[#0C0C09] dark:bg-zinc-100 rotate-45 -mb-0.5" />
              <div className="bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                Ir a Hoy
              </div>
            </div>
          </div>

          {/* 6. Métricas del Proyecto */}
          <div className="relative group inline-flex items-center">
            <button
              ref={metricsToggleBtnRef as any}
              type="button"
              data-testid="header-toggle-metrics-btn"
              onClick={handleToggleMetrics}
              aria-label="Métricas del proyecto"
              title="Métricas del proyecto"
              className={`w-7 h-7 flex items-center justify-center rounded-[3px] border transition cursor-pointer shrink-0 ${
                showMetricsDrawer
                  ? 'bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:border-white dark:text-[#0C0C09]'
                  : 'bg-white dark:bg-zinc-800 border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white hover:border-[#0C0C09] dark:hover:border-zinc-500'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <div className="pointer-events-none absolute top-full mt-1.5 right-0 hidden group-hover:flex flex-col items-end z-50 animate-fade-in">
              <div className="w-1.5 h-1.5 bg-[#0C0C09] dark:bg-zinc-100 rotate-45 -mb-0.5 mr-2" />
              <div className="bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                Métricas del proyecto
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Synchronized Split View */}
      <div ref={splitPaneRef} className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* LEFT PANE: WBS Editable Data Grid */}
        {showTable && (
          <>
            <div
              style={{ width: splitWidth }}
              className={`relative shrink-0 flex flex-col border-r border-[#0C0C09] dark:border-zinc-800 bg-white dark:bg-[#0C0C09] overflow-hidden select-none ${
                isDraggingSplit ? '' : 'transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]'
              }`}
            >
              {/* Botón de Columnas siempre visible a la izquierda del separador */}
              <div
                style={{ height: HEADER_HEIGHT }}
                className="absolute top-0 right-0 z-30 flex items-center justify-center pr-2 pl-1.5 bg-[#F4F4F1] dark:bg-[#18181b] border-b border-[#0C0C09] dark:border-zinc-800"
              >
                <div ref={columnsMenuRef} className="relative" data-dropdown-container="true">
                  <button
                    type="button"
                    onClick={() => setShowColumnsMenu((prev) => !prev)}
                    className="p-1 rounded-[4px] hover:bg-black/5 dark:hover:bg-white/10 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white transition cursor-pointer"
                    aria-label="Configurar columnas"
                    title="Columnas visibles"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>

                  {showColumnsMenu && (
                    <div className="absolute right-0 top-8 w-44 p-1.5 bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[4px] shadow-xl z-50 text-xs flex flex-col gap-1">
                      <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 border-b border-[#E2E2DC] dark:border-zinc-800">
                        Mostrar Columnas
                      </div>
                      <label className="flex items-center gap-2 px-2 py-1 rounded-[2px] hover:bg-[#F4F4F1] dark:hover:bg-zinc-800/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.team}
                          onChange={() => toggleVisibleColumn('team')}
                          className="rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09]"
                        />
                        <span className="text-[#0C0C09] dark:text-zinc-300 font-medium">Equipo</span>
                      </label>
                      <label className="flex items-center gap-2 px-2 py-1 rounded-[2px] hover:bg-[#F4F4F1] dark:hover:bg-zinc-800/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.dates}
                          onChange={() => toggleVisibleColumn('dates')}
                          className="rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09]"
                        />
                        <span className="text-[#0C0C09] dark:text-zinc-300 font-medium">Fechas</span>
                      </label>
                      <label className="flex items-center gap-2 px-2 py-1 rounded-[2px] hover:bg-[#F4F4F1] dark:hover:bg-zinc-800/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.dur}
                          onChange={() => toggleVisibleColumn('dur')}
                          className="rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09]"
                        />
                        <span className="text-[#0C0C09] dark:text-zinc-300 font-medium">Duración</span>
                      </label>
                      <label className="flex items-center gap-2 px-2 py-1 rounded-[2px] hover:bg-[#F4F4F1] dark:hover:bg-zinc-800/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.slack}
                          onChange={() => toggleVisibleColumn('slack')}
                          className="rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09]"
                        />
                        <span className="text-[#0C0C09] dark:text-zinc-300 font-medium">Slack</span>
                      </label>
                      <label className="flex items-center gap-2 px-2 py-1 rounded-[2px] hover:bg-[#F4F4F1] dark:hover:bg-zinc-800/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.deps}
                          onChange={() => toggleVisibleColumn('deps')}
                          className="rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09]"
                        />
                        <span className="text-[#0C0C09] dark:text-zinc-300 font-medium">Dependencias</span>
                      </label>

                      {/* Configuración de Truncamiento de Nombres */}
                      <div className="pt-1.5 mt-1 border-t border-[#E2E2DC] dark:border-zinc-800 flex flex-col gap-1">
                        <div className="px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400">
                          Truncar Nombres
                        </div>
                        <div className="flex items-center justify-between px-2 py-0.5 gap-2">
                          <span className="text-[11px] text-[#0C0C09] dark:text-zinc-300">Límite car.:</span>
                          <input
                            type="number"
                            min={10}
                            max={120}
                            data-testid="columns-truncate-input"
                            value={effectiveTruncateLimit}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (Number.isFinite(val)) {
                                handleUpdateTruncateLimit(val);
                              }
                            }}
                            className="w-14 px-1 py-0.5 rounded border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-mono text-center font-bold"
                          />
                        </div>
                        <div className="flex items-center justify-between px-2 pt-0.5 pb-1 gap-1">
                          {[25, 37, 50, 75].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              data-testid={`truncate-preset-btn-${preset}`}
                              onClick={() => handleUpdateTruncateLimit(preset)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                                effectiveTruncateLimit === preset
                                  ? 'bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] font-bold'
                                  : 'bg-[#F4F4F1] dark:bg-zinc-800 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09]'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto flex-1 flex flex-col">
                <div className="min-w-full flex-1 flex flex-col">
                  {/* Minimalist Table Header (matches timeline HEADER_HEIGHT = 60px) */}
                  <div
                    ref={tableHeaderRef}
                    data-testid="wbs-table-header"
                    style={{ height: HEADER_HEIGHT, minWidth: tableMinWidth }}
                    className="flex items-center justify-between px-3 bg-[#F4F4F1] dark:bg-[#18181b] border-b border-[#0C0C09] dark:border-zinc-800 text-[10px] font-mono font-bold uppercase tracking-wider text-[#0C0C09] dark:text-zinc-300 shrink-0 select-none shadow-xs sticky top-0 z-20"
                  >
                    <div
                      style={{ width: nameColumnWidth }}
                      className="flex items-center gap-2 shrink-0"
                    />

                    {/* Column Titles */}
                    <div className="flex items-center shrink-0">
                      {visibleColumns.dates && (
                        <span className="w-44 text-center text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400 uppercase font-bold">
                          Fechas
                        </span>
                      )}
                      {visibleColumns.dur && (
                        <span className="w-16 text-center text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400 uppercase font-bold">
                          Dur.
                        </span>
                      )}
                      {visibleColumns.slack && (
                        <span
                          className="w-14 text-center text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400 uppercase font-bold"
                          title="Holgura Libre calculada automáticamente dadas las tareas siguientes (sucesoras)"
                        >
                          Slack
                        </span>
                      )}
                      {visibleColumns.deps && (
                        <span className="w-20 text-center text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400 uppercase font-bold">
                          Deps
                        </span>
                      )}

                      {/* Spacer matching w-28 action column */}
                      <div className="w-28 shrink-0 pr-1" />
                    </div>
                  </div>

                  {/* Banner de Releases Ocultas con botón para restablecer visibilidad */}
                  {hiddenReleaseIds && hiddenReleaseIds.length > 0 && onResetHiddenReleases && (
                    <div
                      data-testid="hidden-releases-banner"
                      style={{ minWidth: tableMinWidth }}
                      className="flex items-center justify-between px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300"
                    >
                      <div className="flex items-center gap-1.5">
                        <EyeOff className="w-3.5 h-3.5 shrink-0" />
                        <span>Hay {hiddenReleaseIds.length} release{hiddenReleaseIds.length > 1 ? 's' : ''} oculta{hiddenReleaseIds.length > 1 ? 's' : ''} y sus proyectos no se muestran.</span>
                      </div>
                      <button
                        type="button"
                        data-testid="table-reset-hidden-releases-btn"
                        onClick={onResetHiddenReleases}
                        className="font-bold underline hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Mostrar todas</span>
                      </button>
                    </div>
                  )}

                  {/* Table Body Rows */}
                  <div className={`relative z-10 ${showRowSeparators ? 'divide-y divide-[#E2E2DC] dark:divide-zinc-800/60' : ''}`}>
                    {visibleProjectGroups.length === 0 && (
                      <div
                        data-empty-selected-projects="true"
                        style={{ minWidth: tableMinWidth }}
                        className="flex flex-col items-center justify-center py-12 px-6 text-center bg-slate-50/40 dark:bg-zinc-900/30"
                      >
                        {tableSearchQuery.trim() ||
                        tableExcludeQuery.trim() ||
                        tableTypeFilter !== 'all' ||
                        tablePlatformFilter !== 'all' ||
                        tableAlertFilter !== 'all' ||
                        tableReleaseFilter !== 'all' ? (
                          <>
                            <Search className="w-8 h-8 text-slate-400 dark:text-zinc-500 mb-2" />
                            <p className="text-sm font-bold text-slate-700 dark:text-zinc-200">
                              No se encontraron proyectos o tareas coincidentes
                            </p>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md">
                              Ningún elemento coincide con la búsqueda o los filtros seleccionados.
                            </p>
                            <button
                              type="button"
                              data-testid="table-reset-filters-btn"
                              onClick={() => {
                                setTableSearchQuery('');
                                setTableExcludeQuery('');
                                setTableTypeFilter('all');
                                setTablePlatformFilter('all');
                                setTableAlertFilter('all');
                                setTableReleaseFilter('all');
                                setShowSubtasksOnFilter(false);
                                setSearchFields({ ...DEFAULT_GANTT_SEARCH_FIELDS });
                              }}
                              className="mt-3 px-3.5 py-1.5 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Restablecer búsqueda y filtros</span>
                            </button>
                          </>
                        ) : hiddenReleaseIds && hiddenReleaseIds.length > 0 ? (
                          <>
                            <EyeOff className="w-8 h-8 text-amber-500 mb-2" />
                            <p className="text-sm font-bold text-slate-700 dark:text-zinc-200">
                              Hay {hiddenReleaseIds.length} release{hiddenReleaseIds.length > 1 ? 's' : ''} oculta{hiddenReleaseIds.length > 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md">
                              Los proyectos seleccionados pertenecen a releases que están actualmente ocultas. Restablece la visibilidad para verlos en el diagrama Gantt.
                            </p>
                            {onResetHiddenReleases && (
                              <button
                                type="button"
                                data-testid="empty-state-reset-hidden-releases-btn"
                                onClick={onResetHiddenReleases}
                                className="mt-3 px-3.5 py-1.5 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                              >
                                <Eye className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                                <span>Restablecer visibilidad (Mostrar todas las releases)</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <FolderKanban className="w-8 h-8 text-slate-400 dark:text-zinc-500 mb-2" />
                            <p className="text-sm font-bold text-slate-700 dark:text-zinc-200">
                              No hay proyectos seleccionados para mostrar en el diagrama Gantt
                            </p>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md">
                              Abre la vista de Lista de Proyectos y marca al menos un proyecto para visualizar su cronograma aquí.
                            </p>
                            {onCreateProject ? (
                              <button
                                type="button"
                                data-testid="empty-state-create-project-btn"
                                onClick={() =>
                                  onCreateProject({
                                    id: `proj-${Date.now()}`,
                                    name: 'Nuevo Proyecto',
                                    color: 'indigo',
                                    collapsed: false,
                                    isDemo: false,
                                    releaseId: releases[0]?.id || 'rel-t-26-12-1',
                                  })
                                }
                                className="mt-3 px-3.5 py-1.5 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Crear Proyecto</span>
                              </button>
                            ) : onOpenProjectsView ? (
                              <button
                                type="button"
                                onClick={onOpenProjectsView}
                                className="mt-3 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                              >
                                Ir a Lista de Proyectos
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    )}
                    {displayRows.length > 0 && (
                      <div
                        style={{ height: displayRows.length * ROW_HEIGHT, minWidth: tableMinWidth }}
                        className={`relative ${
                          isCollapseAnimating
                            ? 'transition-[height] duration-[140ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
                            : ''
                        }`}
                      >
                        {displayRows.map((row, rowIndex) => {
                      const rowShiftY = rowDragShiftYByRowId.get(row.rowId) || 0;
                      const collapsingThisRow = isRowCollapsing(row);
                      const expandingThisRow = !collapsingThisRow && isRowJustExpanded(row);
                      const animDeltaY = collapsingThisRow
                        ? getRowAnimDeltaY(row, rowIndex, recentlyCollapsedParentIds, displayRows)
                        : expandingThisRow
                        ? getRowAnimDeltaY(row, rowIndex, recentlyExpandedParentIds, displayRows)
                        : 0;
                      const rowShiftStyle: React.CSSProperties | undefined =
                        rowShiftY || collapsingThisRow || expandingThisRow
                          ? ({
                              ...(rowShiftY ? { transform: `translateY(${rowShiftY}px)` } : {}),
                              ...(collapsingThisRow || expandingThisRow
                                ? { '--anim-delta-y': `${animDeltaY}px` }
                                : {}),
                            } as React.CSSProperties)
                          : undefined;
                      const rowShiftClass = isAnyRowOrProjectDragging
                        ? 'transition-transform duration-200 ease-out'
                        : isCollapseAnimating
                        ? 'transition-[top] duration-[140ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
                        : '';

                      const rowExpandClass = collapsingThisRow
                        ? 'animate-gantt-row-collapse z-[1]'
                        : expandingThisRow
                        ? 'animate-gantt-row-expand z-[1]'
                        : '';

                      if (row.kind === 'release') {
                        const { group: rGroup } = row;
                        const isCollapsed = collapsedReleaseIds.has(rGroup.release.id);
                        return (
                          <div
                            key={row.rowId}
                            data-release-group={rGroup.release.id}
                            style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT, minWidth: tableMinWidth }}
                            className={`absolute left-0 right-0 z-20 flex items-center justify-start px-3 text-xs font-bold ${rowShiftClass} ${
                              showRowSeparators
                                ? 'border-y border-[#0C0C09] dark:border-zinc-700'
                                : 'border-y-0'
                            } bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]`}
                          >
                            {/* Release Title + Code + Manage Button */}
                            <div
                              style={{ width: nameColumnWidth }}
                              className="flex items-center gap-2 pr-2 shrink-0 pl-1 min-w-0 overflow-hidden"
                            >
                              <button
                                type="button"
                                data-testid={`toggle-collapse-release-${rGroup.release.id}`}
                                onClick={() => handleToggleReleaseCollapse(rGroup.release.id)}
                                className="p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 transition cursor-pointer shrink-0"
                              >
                                <ChevronRight
                                  className={`w-4 h-4 transition-transform duration-100 ease-out ${
                                    isCollapsed ? 'rotate-0' : 'rotate-90'
                                  }`}
                                />
                              </button>
                              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-white/20 dark:bg-black/10 shrink-0">
                                {rGroup.release.code}
                              </span>
                              <span
                                data-release-duration-badge={rGroup.release.id}
                                className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-white/20 dark:bg-black/10 shrink-0"
                                title={`Duración completa de la release: ${rGroup.duration} días`}
                              >
                                {rGroup.duration}d
                              </span>

                              {onToggleHideRelease && (
                                <button
                                  type="button"
                                  data-testid={`hide-release-${rGroup.release.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleHideRelease(rGroup.release.id);
                                  }}
                                  className="p-1 rounded-[2px] flex items-center justify-center bg-white/20 hover:bg-white/30 text-white dark:bg-black/10 dark:hover:bg-black/20 dark:text-black transition cursor-pointer shrink-0"
                                  title={`Ocultar release ${rGroup.release.code} y todos sus proyectos asociados`}
                                  aria-label={`Ocultar release ${rGroup.release.code}`}
                                >
                                  <EyeOff className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onSetFocusEntity && (() => {
                                const isCurrentRelFocused =
                                  isFocusMode && focusEntity?.type === 'release' && focusEntity?.id === rGroup.release.id;
                                return (
                                  <button
                                    type="button"
                                    data-testid={`focus-release-${rGroup.release.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isCurrentRelFocused) {
                                        onExitFocusMode ? onExitFocusMode() : onSetFocusEntity(null);
                                      } else {
                                        onSetFocusEntity({
                                          type: 'release',
                                          id: rGroup.release.id,
                                          name: rGroup.release.name,
                                        });
                                      }
                                    }}
                                    className={`p-1 rounded-[2px] flex items-center justify-center transition cursor-pointer shrink-0 ${
                                      isCurrentRelFocused
                                        ? 'bg-amber-400 text-black font-bold ring-2 ring-amber-300 shadow-xs'
                                        : 'bg-white/20 hover:bg-white/30 text-white dark:bg-black/10 dark:hover:bg-black/20 dark:text-black'
                                    }`}
                                    title={
                                      isCurrentRelFocused
                                        ? `Salir de la modalidad enfoque de ${rGroup.release.code} (clic o tecla ESC)`
                                        : `Enfocar release ${rGroup.release.code} y sus proyectos`
                                    }
                                    aria-label={
                                      isCurrentRelFocused
                                        ? `Salir de enfoque ${rGroup.release.code}`
                                        : `Enfocar release ${rGroup.release.code}`
                                    }
                                  >
                                    <Sparkles className={`w-3.5 h-3.5 ${isCurrentRelFocused ? 'text-black fill-current' : 'text-amber-300'}`} />
                                  </button>
                                );
                              })()}
                              {rGroup.violationsCount > 0 && (
                                <span
                                  data-testid={`release-violations-badge-${rGroup.release.code}`}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500 text-black text-[10px] font-mono font-bold shrink-0"
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{rGroup.violationsCount} desalineaciones</span>
                                </span>
                              )}
                              <span
                                className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/15 dark:bg-black/10 opacity-80 shrink-0"
                                title={`${rGroup.projectGroups.length} proyectos y ${rGroup.tasksCount} tareas asociadas`}
                              >
                                {rGroup.projectGroups.length} proj · {rGroup.tasksCount} tareas
                              </span>
                            </div>

                            {/* Aligned Columns matching header (Dates & Full Duration of Release) */}
                            <div className="flex items-center shrink-0">
                              {visibleColumns.dates && (
                                <div
                                  className="w-44 shrink-0 text-center font-mono text-[10px] opacity-90"
                                  data-release-dates-cell={rGroup.release.id}
                                  title={`Fechas de la Release: ${rGroup.startDate} → ${rGroup.endDate} (${rGroup.duration} días)`}
                                >
                                  {`${formatDateDisplay(rGroup.startDate, 'dd/MM')} → ${formatDateDisplay(rGroup.endDate, 'dd/MM')}`}
                                </div>
                              )}

                              {visibleColumns.dur && (
                                <div
                                  className="w-16 shrink-0 text-center"
                                  data-release-duration-cell={rGroup.release.id}
                                  title={`Duración completa de la release: ${rGroup.duration} días`}
                                >
                                  <span className="px-1.5 py-0.5 rounded bg-white/20 dark:bg-black/15 font-mono text-[10px] font-bold">
                                    {rGroup.duration}d
                                  </span>
                                </div>
                              )}

                              {visibleColumns.slack && (
                                <div className="w-14 shrink-0 text-center font-mono text-[10px] opacity-40">—</div>
                              )}

                              {visibleColumns.deps && (
                                <div className="w-20 shrink-0 text-center font-mono text-[10px] opacity-40">—</div>
                              )}

                              <div className="w-28 shrink-0 flex items-center justify-end pr-2 font-mono text-[11px] font-bold">
                                <span className="px-1.5 py-0.5 rounded bg-white/20 dark:bg-black/15">
                                  {rGroup.progress}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (row.kind === 'project') {
                        const { group } = row;
                        const projTheme =
                          COLOR_STYLES[group.project.color] || COLOR_STYLES.indigo;
                        const isCollapsed = Boolean(group.project.collapsed);
                        const isProjectDragTarget =
                          dragOverRow?.id === `project:${group.project.id}`;

                        const sameReleaseProjects = visibleProjectGroups.filter(
                          (g) => (g.project.releaseId || '') === (group.project.releaseId || '')
                        );
                        const currentProjIdxInRelease = sameReleaseProjects.findIndex(
                          (g) => g.project.id === group.project.id
                        );
                        const isFirstInRelease = currentProjIdxInRelease <= 0;
                        const isLastInRelease = currentProjIdxInRelease >= sameReleaseProjects.length - 1;

                        const isProjectNameExpanded =
                          focusedProjectInputId === group.project.id ||
                          hoveredNameId === group.project.id;
                        const displayProjectName =
                          isProjectNameExpanded || !group.project.name || group.project.name.length <= displayTruncateLimit
                            ? group.project.name || 'Proyecto'
                            : group.project.name.slice(0, displayTruncateLimit) + '…';

                        const isProjectSelected = effectiveSelectedProjectId === group.project.id;
                        const isProjectMultiSelected = multiSelectedProjectIds.has(group.project.id);
                        const isDraggingThisProject = draggingProjectId === group.project.id;
                        const isProjectReorderTargetBefore =
                          dragOverProject?.id === group.project.id &&
                          dragOverProject.position === 'before';
                        const isProjectReorderTargetAfter =
                          dragOverProject?.id === group.project.id &&
                          dragOverProject.position === 'after';
                        const projAccent = getProjectAccent(group.project.color);
                        const hasProjectStateBg =
                          isDraggingThisProject ||
                          isProjectReorderTargetBefore ||
                          isProjectReorderTargetAfter ||
                          isProjectDragTarget ||
                          isProjectSelected ||
                          isProjectMultiSelected;
                        return (
                          <div
                            key={row.rowId}
                            data-project-group={group.project.id}
                            data-selected-project-row={isProjectSelected ? 'true' : undefined}
                            data-project-locked={group.project.locked ? 'true' : 'false'}
                            data-multi-selected={isProjectMultiSelected ? 'true' : 'false'}
                            data-project-accent-rail={group.project.id}
                            style={{
                              top: rowIndex * ROW_HEIGHT,
                              height: ROW_HEIGHT,
                              minWidth: tableMinWidth,
                              boxShadow: `inset 4px 0 0 ${projAccent.hex}`,
                              ...(hasProjectStateBg
                                ? {}
                                : { backgroundColor: `rgba(${projAccent.rgb}, 0.09)` }),
                              ...rowShiftStyle,
                            }}
                            onMouseDown={(e) =>
                              handleProjectRowPointerMouseDown(e, group.project.id, false)
                            }
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setContextMenu({
                                type: 'project',
                                id: group.project.id,
                                x: e.clientX,
                                y: e.clientY,
                              });
                            }}
                            onClick={(e) => {
                              if (e.metaKey || e.ctrlKey || e.shiftKey) {
                                e.stopPropagation();
                                toggleMultiSelectProject(group.project.id, e.shiftKey);
                                return;
                              }
                              const targetEl = e.target as HTMLElement | null;
                              if (targetEl?.closest('button')) return;
                              const isFormControl = Boolean(targetEl?.closest('input, select, textarea, a'));
                              if (isFormControl && isProjectSelected) return;
                              handleSelectProject(group.project);
                            }}
                            onDragOver={(e) =>
                              handleDragRowOver(e, `project:${group.project.id}`)
                            }
                            onDragLeave={handleDragRowLeave}
                            onDrop={(e) =>
                              handleDropRow(e, `project:${group.project.id}`)
                            }
                            className={`absolute left-0 right-0 group flex items-center justify-start px-3 text-xs font-semibold ${rowShiftClass} ${rowExpandClass} ${
                              showRowSeparators
                                ? 'border-y border-slate-200/80 dark:border-zinc-800/80'
                                : 'border-y-0'
                            } ${
                              isDraggingThisProject
                                ? 'opacity-40 bg-indigo-50/50 dark:bg-indigo-950/30 cursor-grabbing'
                                : isProjectReorderTargetBefore
                                ? 'border-t-2 border-t-indigo-600 dark:border-t-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40'
                                : isProjectReorderTargetAfter
                                ? 'border-b-2 border-b-indigo-600 dark:border-b-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40'
                                : isProjectDragTarget
                                ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-100/70 dark:bg-indigo-950/60'
                                : isProjectSelected
                                ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40'
                                : isProjectMultiSelected
                                ? 'ring-1 ring-inset ring-indigo-500 bg-indigo-50/90 dark:bg-indigo-950/50'
                                : projTheme.groupRowBg
                            }`}
                          >
                            {/* Project Header Title + Collapse Toggle */}
                            <div
                              style={{ width: nameColumnWidth }}
                              className={`flex items-center gap-2 pr-2 shrink-0 pl-1 min-w-0 ${
                                isProjectNameExpanded ? '' : 'overflow-hidden'
                              }`}
                            >
                              {/* Multi-select checkbox for project (only visible when selected via Ctrl/Cmd+Click) */}
                              {isProjectMultiSelected && (
                                <button
                                  type="button"
                                  data-testid={`multi-select-project-${group.project.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMultiSelectProject(group.project.id, e.shiftKey);
                                  }}
                                  title="Quitar proyecto de la selección múltiple"
                                  aria-label={`Quitar selección del proyecto ${group.project.name}`}
                                  className="w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center shrink-0 transition cursor-pointer bg-indigo-600 border-indigo-600 text-white"
                                >
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </button>
                              )}
                              {/* Drag handle for project reordering */}
                              <span
                                data-testid={`project-drag-handle-${group.project.id}`}
                                onMouseDown={(e) =>
                                  handleProjectRowPointerMouseDown(e, group.project.id, true)
                                }
                                title="Arrastrar proyecto para reordenarlo dentro de su release"
                                className="p-0.5 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </span>

                              <button
                                type="button"
                                onClick={() => handleToggleProjectCollapse(group.project.id, isCollapsed)}
                                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 shrink-0 transition-colors"
                                style={{ color: projAccent.hex }}
                                title={
                                  isCollapsed ? 'Expandir proyecto' : 'Colapsar proyecto'
                                }
                              >
                                <ChevronRight
                                  className={`w-4 h-4 transition-transform duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                    isCollapsed ? 'rotate-0' : 'rotate-90'
                                  }`}
                                />
                              </button>

                              <button
                                type="button"
                                data-testid={`project-id-badge-${group.project.id}`}
                                onClick={() =>
                                  useRightSidebarInspector
                                    ? handleSelectProject(group.project)
                                    : setInspectingProject(group.project)
                                }
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white shrink-0 hover:opacity-85 transition cursor-pointer ${projTheme.badge}`}
                                title={
                                  group.project.id === EXTERNAL_MILESTONES_GROUP_ID
                                    ? 'Hitos externos independientes de proyectos y releases'
                                    : `Configuración de ${group.project.name} (Release, descripción, color)`
                                }
                              >
                                {group.project.id === EXTERNAL_MILESTONES_GROUP_ID
                                  ? '◆ EXT'
                                  : `P${group.projectIndex}`}
                              </button>

                              {(() => {
                                const projPlatform = normalizePlatform(group.project.platform);
                                if (!projPlatform) return null;
                                const showIos = projPlatform === 'iOS' || projPlatform === 'iOS/Android';
                                const showAndroid =
                                  projPlatform === 'Android' || projPlatform === 'iOS/Android';
                                return (
                                  <span
                                    data-testid={`project-platform-badge-${group.project.id}`}
                                    data-platform={projPlatform}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 border ${
                                      projPlatform === 'iOS'
                                        ? 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
                                        : projPlatform === 'Android'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                        : 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                                    }`}
                                    title={`Plataforma: ${projPlatform}`}
                                    aria-label={`Plataforma: ${projPlatform}`}
                                  >
                                    {showIos && (
                                      <AppleIosIcon
                                        testId={`platform-icon-ios-${group.project.id}`}
                                        className="w-3 h-3 shrink-0"
                                      />
                                    )}
                                    {showAndroid && (
                                      <AndroidIcon
                                        testId={`platform-icon-android-${group.project.id}`}
                                        className="w-3 h-3 shrink-0"
                                      />
                                    )}
                                  </span>
                                );
                              })()}

                              {(() => {
                                const alertLevel = group.project.alertLevel ?? 0;
                                const alertConfig = ALERT_LEVEL_CONFIG[alertLevel];

                                return (
                                  <button
                                    type="button"
                                    data-testid={`project-alert-badge-${group.project.id}`}
                                    data-alert-level={alertLevel}
                                    onClick={() =>
                                      useRightSidebarInspector
                                        ? handleSelectProject(group.project)
                                        : setInspectingProject(group.project)
                                    }
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 border cursor-pointer hover:opacity-85 transition ${alertConfig.className}`}
                                    title={`${alertConfig.title} (clic para configurar)`}
                                    aria-label={alertConfig.title}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${alertConfig.dotColor}`} />
                                    <span>{alertConfig.label}</span>
                                  </button>
                                );
                              })()}

                              {(() => {
                                const commentsCount = group.project.statusComments?.length ?? 0;
                                return (
                                  <button
                                    type="button"
                                    data-testid={`project-comments-badge-${group.project.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCommentsDrawerTarget({
                                        entityType: 'project',
                                        id: group.project.id,
                                        code: `P${group.projectIndex}`,
                                      });
                                    }}
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold shrink-0 border cursor-pointer transition ${
                                      commentsCount > 0
                                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                                        : 'opacity-0 group-hover:opacity-75 hover:!opacity-100 bg-white/80 dark:bg-zinc-900 border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400 hover:text-indigo-700 hover:border-indigo-300'
                                    }`}
                                    title={
                                      commentsCount > 0
                                        ? `${commentsCount} comentarios de seguimiento (clic para abrir)`
                                        : 'Añadir comentario de seguimiento'
                                    }
                                    aria-label="Seguimiento del proyecto"
                                  >
                                    <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                    {commentsCount > 0 && <span>{commentsCount}</span>}
                                  </button>
                                );
                              })()}

                              <div
                                className={`inline-grid items-center transition-all duration-150 ${
                                  isProjectNameExpanded
                                    ? 'relative z-50 shrink-0 bg-white dark:bg-zinc-900 shadow-md ring-1 ring-[#0C0C09]/15 dark:ring-zinc-700 rounded-[3px]'
                                    : 'min-w-0 shrink max-w-full'
                                }`}
                                data-testid={`project-name-container-${group.project.id}`}
                                data-name-truncated={group.project.name && group.project.name.length > displayTruncateLimit}
                                data-name-expanded={isProjectNameExpanded}
                                onMouseEnter={() => setHoveredNameId(group.project.id)}
                                onMouseLeave={() => setHoveredNameId((prev) => (prev === group.project.id ? null : prev))}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`invisible col-start-1 row-start-1 font-bold text-xs px-1.5 py-0.5 pointer-events-none select-none ${
                                    isProjectNameExpanded ? 'whitespace-pre' : 'truncate'
                                  }`}
                                >
                                  {displayProjectName}
                                </span>
                                <input
                                  type="text"
                                  value={displayProjectName}
                                  onFocus={() => setFocusedProjectInputId(group.project.id)}
                                  onChange={(e) =>
                                    guardedUpdateProject(
                                      {
                                        ...group.project,
                                        name: e.target.value,
                                      },
                                      'renombrar proyecto bloqueado'
                                    )
                                  }
                                  onBlur={(e) => {
                                    setFocusedProjectInputId(null);
                                    if (group.project.locked) return;
                                    const trimmed = e.target.value.trim();
                                    if (!trimmed) {
                                      guardedUpdateProject(
                                        {
                                          ...group.project,
                                          name: `Proyecto ${group.projectIndex}`,
                                        },
                                        'renombrar proyecto bloqueado'
                                      );
                                    } else if (trimmed !== group.project.name) {
                                      guardedUpdateProject(
                                        {
                                          ...group.project,
                                          name: trimmed,
                                        },
                                        'renombrar proyecto bloqueado'
                                      );
                                    }
                                  }}
                                  className={`col-start-1 row-start-1 w-full min-w-[24px] bg-transparent font-bold text-[#0C0C09] dark:text-white focus:bg-white dark:focus:bg-zinc-800 px-1.5 py-0.5 rounded-[2px] outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                                    draggingRowId ? 'pointer-events-none' : ''
                                  }`}
                                  title="Haz clic para renombrar este proyecto"
                                  data-project-name-input={group.project.id}
                                />
                              </div>

                              {group.project.locked && (
                                <span
                                  data-project-locked="true"
                                  title="Proyecto bloqueado en el cronograma (clic derecho para desbloquear)"
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[3px] text-[9px] font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 shrink-0"
                                >
                                  <Lock className="w-2.5 h-2.5 shrink-0" />
                                </span>
                              )}

                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono border shrink-0 ${projTheme.groupBadgeBg}`}
                                title={`${group.tasksCount} tarea(s) y ${group.milestonesCount} hito(s)`}
                              >
                                {group.items.length} ítems
                              </span>
                              {group.items.length === 0 && (
                                <button
                                  type="button"
                                  data-testid={`project-header-add-task-btn-${group.project.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    guardedQuickAdd('task', group.project.id);
                                  }}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer flex items-center gap-0.5 shrink-0"
                                  title="Añadir primera tarea a este proyecto"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Tarea</span>
                                </button>
                              )}
                            </div>

                            {/* Aligned Columns matching header */}
                            <div className="flex items-center shrink-0">

                              {visibleColumns.dates && (
                                <div className="w-44 shrink-0 text-center font-mono text-[10px] text-slate-600 dark:text-zinc-400">
                                  {group.items.length > 0
                                    ? `${formatDateDisplay(group.startDate, 'dd/MM')} → ${formatDateDisplay(group.endDate, 'dd/MM')}`
                                    : '—'}
                                </div>
                              )}

                              {visibleColumns.dur && (
                                <div className="w-16 shrink-0 text-center">
                                  <span className="px-1.5 py-0.5 rounded bg-white/80 dark:bg-zinc-800 font-mono text-[10px] font-bold text-slate-800 dark:text-zinc-200 border border-slate-200/70 dark:border-zinc-700">
                                    {group.duration}d
                                  </span>
                                </div>
                              )}

                              {visibleColumns.slack && (
                                <div
                                  className="w-14 shrink-0 text-center font-mono text-[10px] text-amber-600 dark:text-amber-400 font-semibold"
                                  title={`Holgura acumulada del proyecto: +${group.totalFreeSlack ?? group.totalSlack}d`}
                                >
                                  +{(group.totalFreeSlack ?? group.totalSlack)}d
                                </div>
                              )}

                              {visibleColumns.deps && (
                                <div className="w-20 shrink-0 text-slate-400 text-center text-[10px]">—</div>
                              )}

                              {/* Project Context Menu Trigger (all actions moved to right-click menu) */}
                              <div className="w-28 shrink-0 flex items-center justify-end gap-1.5 pr-2">
                                <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                                  {group.progress}%
                                </span>
                                <button
                                  type="button"
                                  data-testid={`project-context-menu-btn-${group.project.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setContextMenu({
                                      type: 'project',
                                      id: group.project.id,
                                      x: rect.right - 220,
                                      y: rect.bottom + 4,
                                    });
                                  }}
                                  className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-[#0C0C09] dark:hover:text-white transition cursor-pointer opacity-70 group-hover:opacity-100"
                                  title="Acciones del proyecto (o clic derecho en la fila)"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (row.kind === 'empty-project') {
                        const { group } = row;
                        const targetRel = releases?.find((r) => r.id === group.project.releaseId);
                        const projAccent = getProjectAccent(group.project.color);
                        return (
                          <div
                            key={row.rowId}
                            data-empty-project-row={group.project.id}
                            data-project-child-band={group.project.id}
                            style={{
                              top: rowIndex * ROW_HEIGHT,
                              height: ROW_HEIGHT,
                              minWidth: tableMinWidth,
                              boxShadow: `inset 3px 0 0 rgba(${projAccent.rgb}, 0.65)`,
                              backgroundColor: `rgba(${projAccent.rgb}, 0.045)`,
                              ...(showRowSeparators
                                ? { borderBottom: `2px solid rgba(${projAccent.rgb}, 0.55)` }
                                : {}),
                              ...rowShiftStyle,
                            }}
                            className={`absolute left-0 right-0 flex items-center justify-start px-3 text-xs ${rowShiftClass} ${rowExpandClass} ${
                              showRowSeparators
                                ? 'border-b border-[#E2E2DC] dark:border-zinc-800/60'
                                : 'border-b-0'
                            }`}
                          >
                            <div className="h-full flex items-center gap-1.5 pl-2 pr-3">
                              <div
                                data-testid={`project-tree-rail-footer-${group.project.id}`}
                                aria-hidden="true"
                                className="relative self-stretch w-5 shrink-0"
                              >
                                <span
                                  className="absolute top-0 h-1/2 left-2 w-[2px]"
                                  style={{ backgroundColor: `rgba(${projAccent.rgb}, 0.45)` }}
                                />
                                <span
                                  className="absolute top-1/2 left-2 w-2.5 h-[2px]"
                                  style={{ backgroundColor: `rgba(${projAccent.rgb}, 0.45)` }}
                                />
                              </div>
                              <button
                                type="button"
                                data-testid={`project-empty-add-task-btn-${group.project.id}`}
                                onClick={() => guardedCreateTaskDirect(group.project.id)}
                                style={{ color: projAccent.hex }}
                                className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer flex items-center gap-1"
                                title={
                                  targetRel
                                    ? `Crear nueva tarea en ${group.project.name} (Release ${targetRel.code})`
                                    : `Crear primera tarea en ${group.project.name}`
                                }
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Nueva Tarea</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      if (row.kind === 'add-task') {
                        const { group } = row;
                        const targetRel = releases?.find((r) => r.id === group.project.releaseId);
                        const projAccent = getProjectAccent(group.project.color);
                        return (
                          <div
                            key={row.rowId}
                            data-add-task-row={group.project.id}
                            data-project-child-band={group.project.id}
                            style={{
                              top: rowIndex * ROW_HEIGHT,
                              height: ROW_HEIGHT,
                              minWidth: tableMinWidth,
                              boxShadow: `inset 3px 0 0 rgba(${projAccent.rgb}, 0.65)`,
                              backgroundColor: `rgba(${projAccent.rgb}, 0.045)`,
                              ...(showRowSeparators
                                ? { borderBottom: `2px solid rgba(${projAccent.rgb}, 0.55)` }
                                : {}),
                              ...rowShiftStyle,
                            }}
                            className={`absolute left-0 right-0 flex items-center justify-start px-3 text-xs ${rowShiftClass} ${rowExpandClass} ${
                              showRowSeparators
                                ? 'border-b border-[#E2E2DC] dark:border-zinc-800/60'
                                : 'border-b-0'
                            }`}
                          >
                            <div className="h-full flex items-center gap-1.5 pl-2 pr-3 shrink-0">
                              <div
                                data-testid={`project-tree-rail-footer-${group.project.id}`}
                                aria-hidden="true"
                                className="relative self-stretch w-5 shrink-0"
                              >
                                <span
                                  className="absolute top-0 h-1/2 left-2 w-[2px]"
                                  style={{ backgroundColor: `rgba(${projAccent.rgb}, 0.45)` }}
                                />
                                <span
                                  className="absolute top-1/2 left-2 w-2.5 h-[2px]"
                                  style={{ backgroundColor: `rgba(${projAccent.rgb}, 0.45)` }}
                                />
                              </div>
                              <button
                                type="button"
                                data-testid={`project-footer-add-task-btn-${group.project.id}`}
                                onClick={() =>
                                  group.project.id === EXTERNAL_MILESTONES_GROUP_ID
                                    ? onQuickAdd('milestone')
                                    : guardedCreateTaskDirect(group.project.id)
                                }
                                style={{ color: projAccent.hex }}
                                className="px-2 py-1 text-[11px] font-semibold rounded hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer flex items-center gap-1"
                                title={
                                  group.project.id === EXTERNAL_MILESTONES_GROUP_ID
                                    ? 'Crear nuevo hito externo independiente'
                                    : targetRel
                                    ? `Crear nueva tarea en ${group.project.name} (Release ${targetRel.code})`
                                    : `Crear nueva tarea al final de ${group.project.name}`
                                }
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>
                                  {group.project.id === EXTERNAL_MILESTONES_GROUP_ID
                                    ? 'Nuevo Hito Externo'
                                    : 'Nueva Tarea'}
                                </span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      if (row.kind === 'add-project') {
                        const { group: rGroup } = row;
                        return (
                          <div
                            key={row.rowId}
                            data-add-project-row={rGroup.release.id}
                            style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT, minWidth: tableMinWidth }}
                            className={`absolute left-0 right-0 flex items-center justify-start px-3 text-xs bg-indigo-50/20 dark:bg-zinc-900/40 ${rowShiftClass} ${rowExpandClass} ${
                              showRowSeparators
                                ? 'border-b border-[#E2E2DC] dark:border-zinc-800/60'
                                : 'border-b-0'
                            } pl-6`}
                          >
                            <div className="flex items-center gap-2 pr-3 shrink-0">
                              <button
                                type="button"
                                data-testid={`release-add-project-btn-${rGroup.release.id}`}
                                onClick={() =>
                                  onCreateProject?.({
                                    id: `proj-${Date.now()}`,
                                    name: 'Nuevo Proyecto',
                                    color: 'indigo',
                                    releaseId: rGroup.release.id,
                                    collapsed: false,
                                    isDemo: false,
                                  })
                                }
                                className="px-2 py-1 text-[11px] font-semibold rounded text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/50 transition cursor-pointer flex items-center gap-1"
                                title={`Crear nuevo proyecto en ${rGroup.release.code}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Nuevo Proyecto</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // Standard Task / Milestone Row
                      const { item, group } = row;
                      const itemEffectiveColor = getItemEffectiveColor(item);
                      const isHovered = hoveredId === item.id;
                      const isCrit = showCriticalPath && item.isCritical;
                      const itemIndexInGroup = group.items.findIndex((x) => x.id === item.id);
                      const isFirstInGroup = groupByProject
                        ? itemIndexInGroup === 0
                        : rowIndex === 0;
                      const isLastInGroup = groupByProject
                        ? itemIndexInGroup === group.items.length - 1
                        : rowIndex === displayRows.length - 1;
                      const isBeingDragged =
                        draggingRowId === item.id || Boolean(draggingMultiRowIds?.has(item.id));
                      const isDropBefore = dragOverRow?.id === item.id && dragOverRow.position === 'before';
                      const isDropAfter = dragOverRow?.id === item.id && dragOverRow.position === 'after';
                      const effectiveReleaseId = item.releaseId || group.project.releaseId;
                      const itemRelease = effectiveReleaseId
                        ? releases?.find((r) => r.id === effectiveReleaseId)
                        : undefined;
                      const releaseViolations = itemRelease
                        ? checkTaskReleaseCompliance(item, group.project, itemRelease)
                        : [];

                      const isRowSelected = effectiveSelectedItemId === item.id;
                      const isMultiSelectedItem = effectiveMultiItemIds.has(item.id);
                      const projAccent = getProjectAccent(group.project.color);
                      const nextDisplayRow = displayRows[rowIndex + 1];
                      const isLastRowInProject =
                        groupByProject &&
                        !(
                          nextDisplayRow &&
                          (nextDisplayRow.kind === 'item' ||
                            nextDisplayRow.kind === 'add-task' ||
                            nextDisplayRow.kind === 'empty-project') &&
                          nextDisplayRow.group.project.id === group.project.id
                        );
                      const hasItemStateBg =
                        isDropBefore ||
                        isDropAfter ||
                        isBeingDragged ||
                        isRowSelected ||
                        isMultiSelectedItem ||
                        item.hidden ||
                        isHovered ||
                        isCrit;

                      return (
                        <div
                          key={row.rowId}
                          data-task-row={item.id}
                          data-selected-task-row={isRowSelected ? 'true' : undefined}
                          data-multi-selected={isMultiSelectedItem ? 'true' : 'false'}
                          data-project-child-band={groupByProject ? group.project.id : undefined}
                          draggable={true}
                          style={{
                            top: rowIndex * ROW_HEIGHT,
                            height: ROW_HEIGHT,
                            minWidth: tableMinWidth,
                            ...(groupByProject
                              ? {
                                  boxShadow: `inset 3px 0 0 rgba(${projAccent.rgb}, 0.65)`,
                                  ...(!hasItemStateBg
                                    ? { backgroundColor: `rgba(${projAccent.rgb}, 0.045)` }
                                    : {}),
                                  ...(isLastRowInProject && showRowSeparators && !isDropAfter
                                    ? { borderBottom: `2px solid rgba(${projAccent.rgb}, 0.55)` }
                                    : {}),
                                }
                              : {}),
                            ...rowShiftStyle,
                          }}
                          onClick={(e) => handleSelectTaskFromTable(item, e)}
                          onMouseEnter={() => setHoveredId(item.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          onMouseDown={(e) => handleRowPointerMouseDown(e, item.id, false)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContextMenu({
                              type: 'task',
                              id: item.id,
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                          onDragStart={(e) => handleDragRowStart(e, item.id)}
                          onDragEnd={handleDragRowEnd}
                          onDragOver={(e) => handleDragRowOver(e, item.id)}
                          onDragLeave={handleDragRowLeave}
                          onDrop={(e) => handleDropRow(e, item.id)}
                          className={`absolute left-0 right-0 group flex items-center justify-start px-3 text-xs ${rowShiftClass} ${rowExpandClass} ${
                            showRowSeparators
                              ? 'border-b border-[#E2E2DC] dark:border-zinc-800'
                              : 'border-b-0'
                          } ${
                            isDropBefore
                              ? 'border-t-2 border-t-indigo-600 dark:border-t-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                              : isDropAfter
                              ? 'border-b-2 border-b-indigo-600 dark:border-b-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                              : ''
                          } ${
                            isBeingDragged
                              ? 'opacity-35 border-dashed border-indigo-400 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                              : ''
                          } ${
                            isRowSelected
                              ? item.hasConflict
                                ? 'ring-2 ring-inset ring-rose-500 bg-rose-50/70 dark:bg-rose-950/30 text-[#0C0C09] dark:text-zinc-100'
                                : 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-[#0C0C09] dark:text-zinc-100'
                              : isMultiSelectedItem
                              ? 'ring-1 ring-inset ring-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-[#0C0C09] dark:text-zinc-100'
                              : item.hidden
                              ? 'opacity-60 bg-zinc-50/70 dark:bg-zinc-900/30'
                              : isHovered
                              ? 'bg-[#F4F4F1] dark:bg-zinc-900/60'
                              : isCrit
                              ? 'bg-[#DC2626]/5 dark:rose-950/10'
                              : 'bg-white dark:bg-[#0C0C09] hover:bg-[#F4F4F1] dark:hover:bg-zinc-900/40 text-[#0C0C09] dark:text-zinc-100'
                          }`}
                        >
                          {/* WBS + Reorder Controls + Name */}
                          <div
                            style={{ width: nameColumnWidth }}
                            className={`h-full flex items-center gap-1.5 pr-2 shrink-0 ${
                              groupByProject ? 'pl-2' : ''
                            } ${
                              focusedTaskInputId === item.id || hoveredNameId === item.id
                                ? ''
                                : 'overflow-hidden'
                            }`}
                          >
                            {groupByProject && (
                              <div
                                data-testid={`project-tree-rail-${item.id}`}
                                aria-hidden="true"
                                className="relative self-stretch w-5 shrink-0"
                              >
                                <span
                                  className={`absolute top-0 ${
                                    isLastRowInProject ? 'h-1/2' : 'bottom-0'
                                  } left-2 w-[2px]`}
                                  style={{ backgroundColor: `rgba(${projAccent.rgb}, 0.45)` }}
                                />
                                <span
                                  className="absolute top-1/2 left-2 w-2.5 h-[2px]"
                                  style={{ backgroundColor: `rgba(${projAccent.rgb}, 0.45)` }}
                                />
                              </div>
                            )}
                            {/* Multi-select checkbox for task/milestone (only visible when selected via Ctrl/Cmd+Click) */}
                            {isMultiSelectedItem && (
                              <button
                                type="button"
                                data-testid={`multi-select-item-${item.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMultiSelectItem(item.id, e.shiftKey);
                                }}
                                title="Quitar de la selección múltiple"
                                aria-label={`Quitar selección de ${item.name}`}
                                className="w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center shrink-0 transition cursor-pointer bg-indigo-600 border-indigo-600 text-white"
                              >
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </button>
                            )}
                            {/* Reorder grip handle and up/down arrows */}
                            <div className="flex items-center gap-0.5 shrink-0">
                              <span
                                draggable={true}
                                onMouseDown={(e) => handleRowPointerMouseDown(e, item.id, true)}
                                onDragStart={(e) => handleDragRowStart(e, item.id)}
                                onDragEnd={handleDragRowEnd}
                                style={{ WebkitUserDrag: 'element' } as React.CSSProperties}
                                className="cursor-grab active:cursor-grabbing p-1 text-[#6B6B66] dark:text-zinc-500 hover:text-[#0C0C09] dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-[2px]"
                                title="Arrastra para reordenar la posición de la tarea"
                                data-row-drag-handle={item.id}
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </span>
                            </div>

                            {(() => {
                              const taskDisplayId =
                                item.displayId ||
                                (groupByProject && group.projectIndex
                                  ? `P${group.projectIndex}T${item.taskIndex || item.wbs}`
                                  : `T${item.taskIndex || item.wbs}`);
                              const badgeBg =
                                COLOR_STYLES[itemEffectiveColor]?.badge || 'bg-indigo-500';
                              return (
                                <div className="flex items-center gap-1 shrink-0">
                                  <span
                                    data-testid={`task-id-badge-${item.id}`}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white shrink-0 inline-flex items-center gap-1 ${badgeBg}`}
                                    title={`ID ${taskDisplayId} · WBS ${item.wbsCode || item.wbs}`}
                                  >
                                    {item.type === 'milestone' && (
                                      <Diamond className="w-2.5 h-2.5 fill-current shrink-0" />
                                    )}
                                    <span>{taskDisplayId}</span>
                                  </span>
                                  {item.type === 'milestone' && item.isExternal && (
                                    <span
                                      data-testid={`milestone-external-badge-${item.id}`}
                                      title="Hito externo (no pertenece a la release)"
                                      className="px-1 py-0.2 rounded text-[8.5px] font-mono font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shrink-0"
                                    >
                                      EXT
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                            {(item.alertLevel ?? 0) > 0 && (() => {
                              const taskAlert = (item.alertLevel ?? 0) as ProjectAlertLevel;
                              const alertCfg = ALERT_LEVEL_CONFIG[taskAlert];
                              return (
                                <button
                                  type="button"
                                  data-testid={`task-alert-badge-${item.id}`}
                                  data-alert-level={taskAlert}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDepLink(null);
                                    setSelectedDiagramProjectId(null);
                                    setSelectedDiagramReleaseId(null);
                                    setSelectedItemId(item.id);
                                    onSelectEntity?.({ type: 'task', id: item.id, name: item.name });
                                  }}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 border cursor-pointer hover:opacity-85 transition ${alertCfg.className}`}
                                  title={`${alertCfg.title} (clic para ver detalles)`}
                                  aria-label={alertCfg.title}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${alertCfg.dotColor}`} />
                                  <span>{alertCfg.label}</span>
                                </button>
                              );
                            })()}
                            {(() => {
                              const commentsCount = item.statusComments?.length ?? 0;
                              return (
                                <button
                                  type="button"
                                  data-testid={`task-comments-badge-${item.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCommentsDrawerTarget({
                                      entityType: 'item',
                                      id: item.id,
                                      code: item.displayId || item.wbsCode || String(item.wbs),
                                    });
                                  }}
                                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold shrink-0 border cursor-pointer transition ${
                                    commentsCount > 0
                                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                                      : 'opacity-0 group-hover:opacity-75 hover:!opacity-100 bg-white/80 dark:bg-zinc-900 border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400 hover:text-indigo-700 hover:border-indigo-300'
                                  }`}
                                  title={
                                    commentsCount > 0
                                      ? `${commentsCount} comentarios de seguimiento (clic para abrir)`
                                      : 'Añadir comentario de seguimiento'
                                  }
                                  aria-label="Seguimiento del elemento"
                                >
                                  <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                  {commentsCount > 0 && <span>{commentsCount}</span>}
                                </button>
                              );
                            })()}
                            {(() => {
                              const isTaskNameExpanded =
                                focusedTaskInputId === item.id ||
                                hoveredNameId === item.id;
                              const displayTaskName =
                                isTaskNameExpanded || !item.name || item.name.length <= displayTruncateLimit
                                  ? item.name || 'Tarea'
                                  : item.name.slice(0, displayTruncateLimit) + '…';

                            return (
                              <React.Fragment key="task-name-block">
                                <div
                                  className={`inline-grid items-center transition-all duration-150 ${
                                    isTaskNameExpanded
                                      ? 'relative z-50 bg-white dark:bg-zinc-900 shadow-md ring-1 ring-[#0C0C09]/15 dark:ring-zinc-700 rounded-[3px] shrink-0'
                                      : 'min-w-0 shrink max-w-full'
                                  }`}
                                  data-testid={`task-name-container-${item.id}`}
                                  data-name-truncated={item.name && item.name.length > displayTruncateLimit}
                                  data-name-expanded={isTaskNameExpanded}
                                  onMouseEnter={() => setHoveredNameId(item.id)}
                                  onMouseLeave={() => setHoveredNameId((prev) => (prev === item.id ? null : prev))}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`invisible col-start-1 row-start-1 font-medium text-xs px-1.5 py-0.5 pointer-events-none select-none ${
                                      isTaskNameExpanded ? 'whitespace-pre' : 'truncate'
                                    }`}
                                  >
                                    {displayTaskName}
                                  </span>
                                  <input
                                    type="text"
                                    value={displayTaskName}
                                    onFocus={() => setFocusedTaskInputId(item.id)}
                                    onChange={(e) =>
                                      guardedUpdateItem({ ...item, name: e.target.value }, false)
                                    }
                                    onBlur={(e) => {
                                      setFocusedTaskInputId(null);
                                      if (group.project.locked) return;
                                      const trimmed = e.target.value.trim();
                                      if (!trimmed) {
                                        guardedUpdateItem(
                                          {
                                            ...item,
                                            name:
                                              item.type === 'milestone'
                                                ? 'Nuevo Hito'
                                                : 'Nueva Tarea',
                                          },
                                          false
                                        );
                                      } else if (trimmed !== item.name || isReleaseAssociatedTask({ name: trimmed, assignee: item.assignee })) {
                                        if (isReleaseAssociatedTask({ name: trimmed, assignee: item.assignee })) {
                                          const targetRelId = item.releaseId || group.project.releaseId || releases?.[0]?.id;
                                          const targetRelObj = targetRelId ? releases?.find((r) => r.id === targetRelId) : undefined;
                                          const span = targetRelObj ? getReleaseDateSpan(targetRelObj) : null;
                                          guardedUpdateItem(
                                            {
                                              ...item,
                                              name: trimmed,
                                              releaseId: targetRelId || item.releaseId,
                                              ...(span
                                                ? {
                                                    startDate: span.startDate,
                                                    endDate: span.endDate,
                                                    duration: Math.max(1, span.duration),
                                                  }
                                                : {}),
                                            },
                                            false
                                          );
                                        } else {
                                          guardedUpdateItem({ ...item, name: trimmed }, false);
                                        }
                                      }
                                    }}
                                    className={`col-start-1 row-start-1 w-full min-w-[24px] bg-transparent text-xs font-medium text-[#0C0C09] dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 px-1.5 py-0.5 rounded-[2px] outline-none focus:ring-1 focus:ring-[#0C0C09] ${
                                      draggingRowId ? 'pointer-events-none' : ''
                                    }`}
                                    title={`${item.name} (${group.project.name})`}
                                    data-task-name-input={item.id}
                                  />
                                </div>
                              </React.Fragment>
                            );
                          })()}
                            {item.hidden && (
                              <span
                                data-testid={`task-hidden-badge-${item.id}`}
                                title="Oculta del diagrama de cronograma"
                                className="px-1 py-0.5 rounded-[2px] bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[9px] font-mono shrink-0 border border-zinc-300 dark:border-zinc-700"
                              >
                                Oculta
                              </span>
                            )}
                            {itemRelease && (Boolean(item.releaseId) || isReleaseAssociatedTask(item)) && (
                              <span
                                data-testid={`task-release-badge-${item.id}`}
                                title={`Release asociada: ${itemRelease.code}`}
                                className="px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-semibold shrink-0 border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
                              >
                                {itemRelease.code}
                              </span>
                            )}
                            {(() => {
                              const taskPlatform = normalizePlatform(item.platform);
                              if (!taskPlatform) return null;
                              return (
                                <span
                                  data-testid={`task-platform-badge-${item.id}`}
                                  title={`Plataforma específica de tarea: ${taskPlatform}`}
                                  className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-semibold shrink-0 border ${
                                    taskPlatform === 'iOS'
                                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700'
                                      : taskPlatform === 'Android'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                      : 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700'
                                  }`}
                                >
                                  {taskPlatform}
                                </span>
                              );
                            })()}
                            {isCrit && (
                              <span
                                title="En Ruta Crítica (Slack = 0)"
                                className="px-1 py-0.5 rounded-[2px] bg-[#DC2626]/10 text-[#DC2626] text-[9px] font-mono font-bold shrink-0 border border-[#DC2626]/20"
                              >
                                CRÍT
                              </span>
                            )}
                            {item.hasConflict && (
                              <span
                                title={item.conflictMessage}
                                className="text-[#DC2626] shrink-0"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {releaseViolations.length > 0 && (
                              <span
                                data-testid={`task-release-violation-${item.id}`}
                                title={`Excede hito de ${itemRelease?.code}: ${releaseViolations
                                  .map((v) => `${v.milestoneCode} (+${v.daysLate}d)`)
                                  .join(', ')}`}
                                className="px-1.5 py-0.5 rounded-[2px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[9px] font-mono font-bold flex items-center gap-1 shrink-0"
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                <span>+{releaseViolations[0].daysLate}d {releaseViolations[0].milestoneCode}</span>
                              </span>
                            )}

                            {/* Equipo Badge: INLINE inmediatamente después del nombre con espacio mínimo */}
                            {visibleColumns.team && (
                              item.assignee ? (
                                <span
                                  data-assignee-badge={item.assignee}
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-medium truncate max-w-[120px] shrink-0 border ${
                                    (TEAM_BADGE_STYLES[itemEffectiveColor] || TEAM_BADGE_STYLES.indigo).container
                                  }`}
                                  title={`Equipo / Responsable: ${item.assignee}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      (TEAM_BADGE_STYLES[itemEffectiveColor] || TEAM_BADGE_STYLES.indigo).dot
                                    }`}
                                  />
                                  <span className="truncate">{item.assignee}</span>
                                </span>
                              ) : (
                                <span
                                  data-assignee-badge="Sin asignar"
                                  className="px-1.5 py-0.5 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09]/60 dark:text-zinc-400 text-[10px] font-mono shrink-0 border border-[#E2E2DC] dark:border-zinc-700"
                                  title="Sin asignar"
                                >
                                  —
                                </span>
                              )
                            )}
                          </div>

                          {/* Aligned Columns */}
                          <div className={`flex items-center shrink-0 ${draggingRowId ? 'pointer-events-none' : ''}`}>
                            {/* Fechas Column: EDITABLES DIRECTAMENTE */}
                            {visibleColumns.dates && (
                              <div className="w-44 shrink-0 flex items-center justify-center gap-1 font-mono text-[10px]">
                                <input
                                  type="date"
                                  value={item.startDate}
                                  onChange={(e) => {
                                    const newStart = e.target.value;
                                    if (!newStart) return;
                                    const newEnd =
                                      item.type === 'milestone'
                                        ? newStart
                                        : calculateEndDateFromDuration(
                                            newStart,
                                            item.duration,
                                            'task'
                                          );
                                    guardedUpdateItem(
                                      { ...item, startDate: newStart, endDate: newEnd },
                                      autoCascade
                                    );
                                  }}
                                  className="w-[82px] px-1 py-0.5 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border border-[#E2E2DC] dark:border-zinc-700 text-[10px] font-mono outline-none focus:ring-1 focus:ring-[#0C0C09] cursor-pointer"
                                  title="Fecha de inicio (haz clic para editar)"
                                />
                                <span className="text-[#6B6B66] text-[9px]">→</span>
                                <input
                                  type="date"
                                  disabled={item.type === 'milestone'}
                                  value={item.endDate}
                                  onChange={(e) => {
                                    const newEnd = e.target.value;
                                    if (!newEnd) return;
                                    const newDur = Math.max(
                                      1,
                                      calculateDurationFromDates(item.startDate, newEnd, 'task')
                                    );
                                    guardedUpdateItem(
                                      { ...item, endDate: newEnd, duration: newDur },
                                      autoCascade
                                    );
                                  }}
                                  className={`w-[82px] px-1 py-0.5 rounded-[2px] text-[10px] font-mono outline-none focus:ring-1 focus:ring-[#0C0C09] ${
                                    item.type === 'milestone'
                                      ? 'opacity-40 cursor-not-allowed bg-transparent'
                                      : 'bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border border-[#E2E2DC] dark:border-zinc-700 cursor-pointer'
                                  }`}
                                  title={
                                    item.type === 'milestone'
                                      ? 'Hito (fecha única)'
                                      : 'Fecha de fin (haz clic para editar)'
                                  }
                                />
                              </div>
                            )}

                            {/* 3. Duración Column: EDITABLE */}
                            {visibleColumns.dur && (
                              <div className="w-16 shrink-0 flex items-center justify-center">
                                {item.type === 'milestone' ? (
                                  <span className="font-mono text-[10px] text-[#6B6B66]">0d</span>
                                ) : (
                                  <input
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={item.duration}
                                    onChange={(e) => {
                                      const dur = Math.max(1, parseInt(e.target.value, 10) || 1);
                                      const newEnd = calculateEndDateFromDuration(
                                        item.startDate,
                                        dur,
                                        'task'
                                      );
                                      guardedUpdateItem(
                                        { ...item, duration: dur, endDate: newEnd },
                                        autoCascade
                                      );
                                    }}
                                    className="w-11 px-1 py-0.5 text-center font-mono text-[10px] rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border border-[#E2E2DC] dark:border-zinc-700 outline-none focus:ring-1 focus:ring-[#0C0C09]"
                                    title="Duración en días (haz clic para editar)"
                                  />
                                )}
                              </div>
                            )}

                            {/* 4. Slack Column: AUTOMATIC INDICATION GIVEN SUCCESSORS */}
                            {visibleColumns.slack && (
                              <div className="w-14 shrink-0 flex items-center justify-center font-mono text-[10px]">
                                {item.type === 'milestone' ? (
                                  <span className="text-[#6B6B66] dark:text-zinc-500">—</span>
                                ) : (
                                  <button
                                    type="button"
                                    data-testid={`task-slack-badge-${item.id}`}
                                    onClick={() => guardedEditModal(item)}
                                    title={
                                      item.hasSuccessors
                                        ? `Holgura libre automática: ${item.freeSlack >= 0 ? `+${item.freeSlack}` : item.freeSlack}d\nLimitada por siguiente tarea: ${
                                            item.drivingSuccessorName ? `«${item.drivingSuccessorName}»` : `#${item.drivingSuccessorId}`
                                          }\nTareas siguientes directas (${item.successorIds.length}): ${item.successorIds.join(', ')}\n(Clic para abrir detalles o editar buffer)`
                                        : `Sin tareas siguientes directas.\nHolgura hasta fin de proyecto: +${item.freeSlack}d\n(Clic para abrir detalles o editar buffer)`
                                    }
                                    className={`w-11 px-1 py-0.5 rounded-[2px] font-mono text-[10px] transition cursor-pointer flex items-center justify-center gap-0.5 select-none ${
                                      item.freeSlack < 0
                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800'
                                        : item.freeSlack === 0
                                        ? item.isCritical
                                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900/50'
                                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 font-medium border border-zinc-200 dark:border-zinc-700'
                                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/50'
                                    }`}
                                  >
                                    <span>
                                      {item.freeSlack > 0 ? `+${item.freeSlack}d` : `${item.freeSlack}d`}
                                    </span>
                                    {!item.hasSuccessors && (
                                      <span
                                        className="text-[8px] opacity-60 leading-none"
                                        title="Sin tareas siguientes directas (hasta fin proyecto)"
                                      >
                                        *
                                      </span>
                                    )}
                                  </button>
                                )}
                              </div>
                            )}

                            {/* 5. Dependencias Column */}
                            {visibleColumns.deps && (
                              <div className="w-20 shrink-0 text-center font-mono text-[10px]">
                                <span
                                  className="text-[#0C0C09] dark:text-zinc-300 font-mono text-[10px] truncate block px-1 font-semibold"
                                  title={`Dependencias: ${
                                    item.dependencies.length > 0
                                      ? item.dependencies.map((d) => `#${d}`).join(', ')
                                      : 'Ninguna'
                                  }`}
                                >
                                  {item.dependencies.length > 0
                                    ? item.dependencies
                                        .map((depId) => {
                                          const found = enrichedItemById.get(depId);
                                          if (!found) return '';
                                          return groupByProject
                                            ? `#${found.wbsCode || found.wbs}`
                                            : `#${found.wbs}`;
                                        })
                                        .filter(Boolean)
                                        .join(',')
                                    : '—'}
                                </span>
                              </div>
                            )}

                            {/* 6. Acciones Column (compact trigger; full actions on right-click) */}
                            <div className="w-28 shrink-0 flex items-center justify-end gap-1 pr-2">
                              <button
                                type="button"
                                data-testid={`task-context-menu-btn-${item.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setContextMenu({
                                    type: 'task',
                                    id: item.id,
                                    x: rect.right - 220,
                                    y: rect.bottom + 4,
                                  });
                                }}
                                className="p-1 rounded-[2px] hover:bg-black/5 dark:hover:bg-white/10 text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-white transition cursor-pointer opacity-70 group-hover:opacity-100"
                                title="Acciones del ítem (o clic derecho en la fila)"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                      </div>
                    )}

                    {/* Inline Actions Bar below the tasks & projects table */}
                    <div
                      ref={newProjectFormRef}
                      style={{ minHeight: 48, minWidth: tableMinWidth }}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-50/50 dark:bg-zinc-900/50 border-t border-slate-200/70 dark:border-zinc-800/70"
                    >
                      <button
                        type="button"
                        data-quick-add-task-btn="true"
                        onClick={() => {
                          if (onCreateUnassignedTask) {
                            onCreateUnassignedTask();
                          } else {
                            const unassignedProj = projects.find((p) => !p.releaseId);
                            guardedQuickAdd('task', unassignedProj?.id);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer"
                        title="Crear nueva tarea sin release"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nueva Tarea</span>
                      </button>

                      <div className="w-px h-4 bg-slate-200 dark:bg-zinc-800" />

                      <button
                        type="button"
                        data-quick-add-milestone-btn="true"
                        onClick={() => onQuickAdd('milestone')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                        title="Crear nuevo hito externo (independiente de proyectos y releases)"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nuevo Hito</span>
                      </button>

                      <div className="w-px h-4 bg-slate-200 dark:bg-zinc-800" />

                      {!isCreatingProject ? (
                        <button
                          type="button"
                          data-create-project-btn="true"
                          onClick={() => {
                            setIsCreatingProject(true);
                            setNewProjectName('');
                            setNewProjectColor('indigo');
                            setNewProjectReleaseId('');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                          title="Crear nuevo proyecto sin release"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Nuevo Proyecto</span>
                        </button>
                      ) : (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const trimmed = newProjectName.trim();
                            if (!trimmed) return;
                            onCreateProject?.({
                              id: `proj-${Date.now()}`,
                              name: trimmed,
                              color: newProjectColor,
                              releaseId: newProjectReleaseId || undefined,
                              collapsed: false,
                              isDemo: false,
                            });
                            setIsCreatingProject(false);
                            setNewProjectName('');
                          }}
                          className="flex flex-wrap items-center gap-2.5 w-full text-xs"
                        >
                          <input
                            type="text"
                            autoFocus
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setIsCreatingProject(false);
                                setNewProjectName('');
                              }
                            }}
                            placeholder="Nombre del nuevo proyecto..."
                            className="flex-1 min-w-[140px] px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <select
                            data-testid="create-project-release-select"
                            value={newProjectReleaseId}
                            onChange={(e) => setNewProjectReleaseId(e.target.value)}
                            className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                            title="Release asociada"
                          >
                            <option value="">Sin release</option>
                            {releases.map((rel) => (
                              <option key={rel.id} value={rel.id}>
                                {rel.code} ({rel.name})
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1.5">
                            {PROJECT_COLORS.map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                onClick={() => setNewProjectColor(c.value)}
                                className={`w-4 h-4 rounded-full ${c.bg} flex items-center justify-center transition-transform ${
                                  newProjectColor === c.value
                                    ? 'ring-2 ring-offset-1 ring-indigo-600 scale-110'
                                    : 'opacity-65 hover:opacity-100'
                                }`}
                                title={c.value}
                              >
                                {newProjectColor === c.value && (
                                  <Check className="w-2.5 h-2.5 text-white" />
                                )}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="submit"
                              disabled={!newProjectName.trim()}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-xs transition"
                            >
                              Crear
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreatingProject(false);
                                setNewProjectName('');
                              }}
                              className="px-2 py-1 text-xs rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resizable Split Handle */}
            <div
              data-testid="gantt-split-handle"
              data-expanded={splitExpandedPrevWidth !== null ? 'true' : 'false'}
              onMouseDown={handleSplitMouseDown}
              onDoubleClick={handleSplitDoubleClick}
              className="w-1.5 cursor-col-resize bg-[#0C0C09] dark:bg-zinc-700 hover:bg-[#312C85] dark:hover:bg-[#312C85] transition-colors flex items-center justify-center group shrink-0"
              title={
                splitExpandedPrevWidth !== null
                  ? 'Doble clic para restaurar el ancho anterior · Arrastra para redimensionar'
                  : 'Arrastra para redimensionar · Doble clic para expandir todo el panel izquierdo'
              }
            >
              <GripHorizontal className="w-3 h-3 text-white rotate-90" />
            </div>
          </>
        )}

        {/* RIGHT PANE: Interactive Gantt Timeline Canvas */}
        <div
          ref={scrollContainerRef}
          onClick={() => {
            setSelectedItemId(null);
            setSelectedDiagramProjectId(null);
            setSelectedDiagramReleaseId(null);
            setSelectedDepLink(null);
            onSelectEntity?.(null);
          }}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-white dark:bg-[#0C0C09] select-none"
        >
          <div
            ref={canvasRef}
            style={{ width: totalCanvasWidth, minHeight: totalCanvasHeight }}
            className="relative"
          >
            {/* Interactive Mouse Cursor Date Scrubber */}
            {cursorScrubber && (() => {
              const halfBadge = 56;
              let badgeClampOffset = 0;
              if (cursorScrubber.x < halfBadge + 4) {
                badgeClampOffset = halfBadge + 4 - cursorScrubber.x;
              } else if (cursorScrubber.x > totalCanvasWidth - halfBadge - 4) {
                badgeClampOffset = totalCanvasWidth - halfBadge - 4 - cursorScrubber.x;
              }

              return (
                <div
                  id="timeline-cursor-scrubber"
                  data-cursor-x={cursorScrubber.x}
                  data-cursor-date={formatScrubberDate(cursorScrubber.date)}
                  style={{ left: cursorScrubber.x }}
                  className="absolute top-0 bottom-0 pointer-events-none z-30 w-0"
                >
                  {/* Floating date badge in the calendar header tier matching reference style */}
                  <div
                    style={{
                      transform: `translateX(calc(-50% + ${badgeClampOffset}px))`,
                    }}
                    className="sticky top-2 flex items-center justify-center px-2.5 py-0.5 rounded-md bg-[#09090b] text-white border border-zinc-700/90 shadow-2xl text-[11px] font-mono font-bold tracking-widest uppercase w-max shrink-0 z-50 transition-transform"
                  >
                    <span>{formatScrubberDate(cursorScrubber.date)}</span>
                  </div>
                  {/* High-contrast vertical tracking line with top notch */}
                  <div className="absolute top-0 bottom-0 left-0 w-[1.5px] -translate-x-1/2 bg-[#0C0C09] dark:bg-white/90 shadow-[0_0_4px_rgba(12,12,9,0.35)] dark:shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
                  <div className="absolute top-0 left-0 w-1.5 h-1 bg-[#0C0C09] dark:bg-white rounded-xs -translate-x-1/2" />
                </div>
              );
            })()}

            {/* Minimalist Linear-Style Timeline Header (60px total height) */}
            <div
              ref={calendarHeaderRef}
              data-testid="timeline-calendar-header"
              style={{ height: HEADER_HEIGHT }}
              className="sticky top-0 z-20 bg-[#F4F4F1] dark:bg-[#18181b] border-b-2 border-[#0C0C09] dark:border-zinc-700 shadow-xs flex flex-col select-none"
            >
              {/* Top Tier: Month names (MAR, ABR, MAY, JUN...) with dashed vertical division */}
              <div className="flex h-7 border-b border-[#E2E2DC] dark:border-zinc-800">
                {monthGroups.map((group, idx) => {
                  const groupPx = group.count * dayWidth;
                  return (
                    <div
                      key={idx}
                      style={{ width: groupPx }}
                      className="pl-2.5 flex items-center text-[11px] font-mono font-bold uppercase tracking-widest text-[#0C0C09] dark:text-zinc-200 border-l border-dashed border-[#0C0C09]/20 dark:border-zinc-800/90 first:border-l-0 truncate"
                      title={group.label}
                    >
                      {groupPx >= 28 ? group.shortLabel : ''}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Tier: Minimalist Cadence Day Numbers with Subtle Top Tick Marks */}
              <div className="flex flex-1 items-center">
                {timelineDays.map((day, idx) => {
                  const isToday = idx === todayIndex;
                  const wknd = isWeekend(day);
                  const dayNum = format(day, 'd');
                  const dayLetter = format(day, 'EEEEE', { locale: es }).toUpperCase();
                  const isMonday = day.getDay() === 1;
                  const isMonthStart = day.getDate() === 1;
                  const isBiWeekly =
                    day.getDate() === 1 ||
                    day.getDate() === 8 ||
                    day.getDate() === 15 ||
                    day.getDate() === 22;

                  const showNumber =
                    dayWidth >= 28
                      ? true
                      : dayWidth >= 16
                      ? isMonday || isMonthStart
                      : dayWidth >= 7
                      ? isBiWeekly
                      : isMonthStart || day.getDate() === 15;

                  return (
                    <div
                      key={idx}
                      style={{ width: dayWidth }}
                      className={`relative h-full flex flex-col items-center justify-center text-[10px] font-mono select-none ${
                        isMonthStart && idx > 0
                          ? 'border-l border-dashed border-[#0C0C09]/20 dark:border-zinc-800/90'
                          : ''
                      } ${
                        showWeekendShading && wknd
                          ? 'bg-[#E5E5DF] dark:bg-zinc-800/80 text-[#0C0C09] dark:text-zinc-200'
                          : isToday
                          ? 'font-bold'
                          : 'text-[#6B6B66] dark:text-zinc-400'
                      }`}
                    >
                      {/* Day number / weekday label */}
                      {showNumber && (
                        dayWidth >= 34 ? (
                          <div className={`flex items-center gap-0.5 mt-0.5 ${isToday ? 'px-1 py-0.2 rounded-[2px] bg-[#0C0C09] text-[#F4F4F1] dark:bg-zinc-100 dark:text-[#0C0C09]' : ''}`}>
                            <span className="opacity-60 text-[9px]">{dayLetter}</span>
                            <span className="font-semibold">{dayNum}</span>
                          </div>
                        ) : (
                          <span className={`mt-0.5 ${isToday ? 'px-1 py-0.2 rounded-[2px] bg-[#0C0C09] text-[#F4F4F1] dark:bg-zinc-100 dark:text-[#0C0C09] font-bold' : isMonthStart ? 'font-bold' : ''}`}>
                            {dayNum}
                          </span>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Canvas Body: Background Columns + Horizontal Rows + SVG Dependencies + Project Summary & Task/Slack/Milestone Bars */}
            <div className="relative z-10" style={{ height: displayRows.length * ROW_HEIGHT + 52 }}>
              {/* Vertical Day Columns & Weekend Shading (configurable) */}
              <div className="absolute inset-0 flex pointer-events-none z-[1]">
                {timelineDays.map((day, idx) => {
                  const wknd = isWeekend(day);
                  const isHoliday = Boolean(
                    workCalendar?.workdaysOnly &&
                      workCalendar.holidays?.includes(formatDateISO(day))
                  );
                  return (
                    <div
                      key={idx}
                      style={{ width: dayWidth }}
                      className={`h-full ${
                        isHoliday
                          ? 'bg-rose-100/70 dark:bg-rose-950/35'
                          : showWeekendShading && wknd
                          ? 'bg-[#E5E5DF]/70 dark:bg-zinc-800/60'
                          : ''
                      }`}
                    />
                  );
                })}
              </div>

              {/* Vertical Month Separators across Canvas Body - Dashed matching reference */}
              <div className="absolute inset-0 flex pointer-events-none z-[5]">
                {monthGroups.map((group, mIdx) => (
                  <div
                    key={`month-divider-${mIdx}`}
                    data-month-divider={mIdx}
                    style={{ width: group.count * dayWidth }}
                    className={`h-full shrink-0 border-r border-dashed border-[#0C0C09]/20 dark:border-zinc-800/90 ${
                      mIdx === monthGroups.length - 1 ? 'border-r-transparent' : ''
                    }`}
                  />
                ))}
              </div>

              {/* Milestone Vertical Guide Lines */}
              {milestoneGuides.map(
                ({ milestone: m, milestoneX, tier, badgeClampOffset }) => {
                  const isCrit = showCriticalPath && m.isCritical;
                  const tierTopClass =
                    tier === 1 ? 'top-6' : tier === 2 ? 'top-[46px]' : 'top-0.5';
                  const mTheme = COLOR_STYLES[m.color] || COLOR_STYLES.amber;

                  return (
                    <div
                      key={`milestone-guide-${m.id}`}
                      data-milestone-guide={m.id}
                      data-milestone-x={milestoneX}
                      data-milestone-color={m.color}
                      style={{ left: milestoneX }}
                      className="absolute top-0 bottom-0 pointer-events-none z-10 w-0"
                    >
                      {/* Top Diamond Pill Marker */}
                      <div
                        style={{
                          left: 0,
                          transform: `translateX(calc(-50% + ${badgeClampOffset}px))`,
                        }}
                        className={`absolute ${tierTopClass} flex items-center justify-center gap-1 px-2 py-0.5 rounded-[2px] text-[9px] font-mono font-bold shadow-none whitespace-nowrap z-20 ${
                          isCrit
                            ? 'bg-[#DC2626] text-white ring-1 ring-rose-400'
                            : mTheme.guidePill
                        }`}
                        title={`Hito: ${m.name} (${formatDateDisplay(m.startDate, 'dd MMM yyyy')})`}
                      >
                        <span className="text-[8px] leading-none shrink-0">◆</span>
                        <span className="max-w-[80px] sm:max-w-[120px] truncate text-center">{m.name}</span>
                      </div>

                      {/* Vertical Dashed Guide Line from Top to Bottom */}
                      <div
                        className={`absolute top-0 bottom-0 left-0 w-0 -translate-x-1/2 border-l-2 border-dashed ${mTheme.guideLine}`}
                      />
                    </div>
                  );
                }
              )}

              {/* Release Milestone Vertical Alignment Guides scoped to specific Release / Project area */}
              {releaseMilestoneGuides.map(
                (
                  { guideKey, release: rel, milestone: m, x, topY, height, tier },
                  idx
                ) => {
                  const isLineHidden = hiddenReleaseGuideKeys.has(guideKey);
                  const diamondWidth = 20;
                  const diamondHeight = 20;
                  const points = '10,6 17,13 10,20 3,13';
                  const diamondTop = 15;

                  return (
                    <div
                      key={`rel-guide-${rel.id}-${m.id}-${topY}-${idx}`}
                      data-testid={`release-milestone-guide-${rel.id}-${m.key}`}
                      style={{
                        left: x,
                        top: topY,
                        height: height,
                      }}
                      className="absolute pointer-events-none w-0 overflow-visible"
                    >
                      {/* Compact Diamond Milestone Icon + External Code Label */}
                      <div
                        style={{
                          left: 0,
                          transform: 'translateX(-50%)',
                          top: `${diamondTop}px`,
                        }}
                        className="absolute z-30 pointer-events-auto flex flex-col items-center"
                      >
                        <button
                          type="button"
                          data-testid={`release-milestone-diamond-${rel.id}-${m.key}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleReleaseGuideLine(guideKey);
                          }}
                          title={`${m.code} · ${formatScrubberDate(m.date)}`}
                          className={`group relative flex items-center justify-center cursor-pointer transition-all select-none outline-none ${
                            isLineHidden
                              ? 'opacity-65 hover:opacity-100 hover:scale-105'
                              : 'opacity-100 hover:scale-110 drop-shadow-sm'
                          }`}
                          style={{ width: diamondWidth, height: diamondHeight }}
                        >
                          <svg
                            width={diamondWidth}
                            height={diamondHeight}
                            viewBox={`0 0 ${diamondWidth} ${diamondHeight}`}
                            className="overflow-visible"
                          >
                            <polygon
                              points={points}
                              className={
                                isLineHidden
                                  ? 'fill-white dark:fill-zinc-900 stroke-slate-400 dark:stroke-zinc-500 stroke-[1.5]'
                                  : 'fill-amber-400 dark:fill-amber-400 stroke-[#0C0C09] dark:stroke-zinc-900 stroke-[1.5]'
                              }
                              strokeDasharray={isLineHidden ? '2 2' : undefined}
                            />
                          </svg>
                        </button>
                        <span
                          data-testid={`release-milestone-label-${rel.id}-${m.key}`}
                          style={
                            tier === 1
                              ? { top: '5px', left: '19px' }
                              : { top: '21px', left: '50%', transform: 'translateX(-50%)' }
                          }
                          className={`absolute px-1 py-0 rounded-[3px] text-[9px] font-mono font-bold tracking-tight whitespace-nowrap leading-[13px] pointer-events-none select-none border shadow-xs ${
                            isLineHidden
                              ? 'bg-white/90 dark:bg-zinc-900/90 border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-400'
                              : 'bg-white/95 dark:bg-zinc-900/95 border-amber-500/50 dark:border-amber-400/40 text-[#0C0C09] dark:text-amber-300'
                          }`}
                        >
                          {m.code}
                        </span>
                      </div>

                      {/* Vertical Dashed Guide Line: ONLY in the release/project vertical area, and hidden when clicked */}
                      {!isLineHidden && (
                        <div
                          data-testid={`release-milestone-line-${rel.id}-${m.key}`}
                          style={{
                            top: `${diamondTop + diamondHeight}px`,
                            bottom: 0,
                          }}
                          className="absolute left-0 w-0 z-10 -translate-x-1/2 border-l-2 border-dashed border-amber-500/75 dark:border-amber-400/65 pointer-events-none"
                        />
                      )}
                    </div>
                  );
                }
              )}

              {/* Today ("HOY") Vertical Line Marker */}
              {todayIndex >= 0 && (
                <div
                  id="gantt-today-marker"
                  data-today-x={todayIndex * dayWidth + dayWidth / 2}
                  style={{ left: todayIndex * dayWidth + dayWidth / 2 }}
                  className="absolute top-0 bottom-0 w-0.5 bg-[#0C0C09] dark:bg-zinc-400 z-30 pointer-events-none"
                >
                  <div className="absolute -top-0.5 -translate-x-1/2 px-1.5 py-0.5 rounded-[2px] bg-[#0C0C09] text-[#F4F4F1] text-[9px] font-mono font-bold tracking-wider shadow-none">
                    HOY
                  </div>
                </div>
              )}

              {/* Horizontal Row Guides */}
              {displayRows.map((row, rowBgIndex) => {
                const rowBgExpandClass = isRowCollapsing(row)
                  ? 'animate-gantt-row-collapse'
                  : isRowJustExpanded(row)
                  ? 'animate-gantt-row-expand'
                  : '';
                if (row.kind === 'release') {
                  return (
                    <div
                      key={`row-bg-${row.rowId}`}
                      style={{ height: ROW_HEIGHT }}
                      className={`${
                        showRowSeparators
                          ? 'border-b border-[#E2E2DC] dark:border-zinc-800'
                          : 'border-b-0'
                      } bg-[#F4F4F1]/30 dark:bg-zinc-900/30`}
                    />
                  );
                }
                if (row.kind === 'project') {
                  const projAccent = getProjectAccent(row.group.project.color);
                  return (
                    <div
                      key={`row-bg-${row.rowId}`}
                      data-timeline-project-band={row.group.project.id}
                      style={{
                        height: ROW_HEIGHT,
                        backgroundColor: `rgba(${projAccent.rgb}, 0.09)`,
                      }}
                      className={`${rowBgExpandClass} ${
                        showRowSeparators
                          ? 'border-b border-[#0C0C09]/25 dark:border-zinc-800'
                          : 'border-b-0'
                      }`}
                    />
                  );
                }
                if (row.kind === 'empty-project' || row.kind === 'add-task') {
                  const projAccent = getProjectAccent(row.group.project.color);
                  return (
                    <div
                      key={`row-bg-${row.rowId}`}
                      data-timeline-project-band={row.group.project.id}
                      style={{
                        height: ROW_HEIGHT,
                        backgroundColor: `rgba(${projAccent.rgb}, 0.045)`,
                        ...(showRowSeparators
                          ? { borderBottom: `2px solid rgba(${projAccent.rgb}, 0.55)` }
                          : {}),
                      }}
                      className={`${rowBgExpandClass} ${
                        showRowSeparators
                          ? 'border-b border-[#E2E2DC] dark:border-zinc-800/60'
                          : 'border-b-0'
                      }`}
                    />
                  );
                }
                if (row.kind === 'add-project') {
                  return (
                    <div
                      key={`row-bg-${row.rowId}`}
                      style={{ height: ROW_HEIGHT }}
                      className={`${rowBgExpandClass} ${
                        showRowSeparators
                          ? 'border-b border-[#E2E2DC] dark:border-zinc-800/60'
                          : 'border-b-0'
                      } bg-indigo-50/15 dark:bg-zinc-900/20`}
                    />
                  );
                }
                const isHovered = hoveredId === row.item.id;
                const projAccent = getProjectAccent(row.group.project.color);
                const nextBgRow = displayRows[rowBgIndex + 1];
                const isLastBgRowInProject =
                  groupByProject &&
                  !(
                    nextBgRow &&
                    (nextBgRow.kind === 'item' ||
                      nextBgRow.kind === 'add-task' ||
                      nextBgRow.kind === 'empty-project') &&
                    nextBgRow.group.project.id === row.group.project.id
                  );
                return (
                  <div
                    key={`row-bg-${row.rowId}`}
                    data-timeline-project-band={groupByProject ? row.group.project.id : undefined}
                    style={{
                      height: ROW_HEIGHT,
                      ...(groupByProject
                        ? {
                            ...(!isHovered
                              ? { backgroundColor: `rgba(${projAccent.rgb}, 0.045)` }
                              : {}),
                            ...(isLastBgRowInProject && showRowSeparators
                              ? { borderBottom: `2px solid rgba(${projAccent.rgb}, 0.55)` }
                              : {}),
                          }
                        : {}),
                    }}
                    onMouseEnter={() => setHoveredId(row.item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`${rowBgExpandClass} ${
                      showRowSeparators
                        ? 'border-b border-[#E2E2DC] dark:border-zinc-800/70'
                        : 'border-b-0'
                    } transition-colors ${
                      isHovered ? 'bg-[#F4F4F1]/80 dark:bg-zinc-900/40' : 'bg-white dark:bg-[#0C0C09]'
                    }`}
                  />
                );
              })}

              {/* Orthogonal SVG Dependency Lines Overlay */}
              {(arrowVisibility !== 'none' || depDragPreview) && (
                <svg
                  width={totalCanvasWidth}
                  height={displayRows.length * ROW_HEIGHT + 52}
                  className="absolute inset-0 pointer-events-none z-[25] overflow-visible"
                  {...(arrowVisibility !== 'none'
                    ? { 'data-arrow-visibility': arrowVisibility }
                    : {})}
                >
                  <defs>
                    <marker
                      id="arrow-normal"
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#71717A" />
                    </marker>
                    <marker
                      id="arrow-active"
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0C0C09" />
                    </marker>
                    <marker
                      id="arrow-critical"
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#D97706" />
                    </marker>
                  </defs>

                  {dependencyLinks.map((link) => {
                    const isInteractiveActive =
                      link.isSelectedLink || link.isHoveredLink;
                    const canInteract = !depDragState && !dragState;

                    return (
                      <g
                        key={link.key}
                        data-dep-link={`${link.predId}->${link.succId}`}
                        data-inter-project-link={link.isInterProject ? "true" : undefined}
                      >
                        {/* Visible Orthogonal Dependency Path */}
                        <path
                          d={link.dPath}
                          data-dep-arrow={`${link.predId}->${link.succId}`}
                          data-dep-type={link.depType}
                          fill="none"
                          stroke={link.strokeColor}
                          strokeWidth={link.strokeWidth}
                          strokeDasharray={link.hasConflict ? '4 3' : undefined}
                          markerEnd={link.markerEnd}
                          className="transition-opacity duration-150"
                          style={{
                            opacity:
                              hoveredId && !link.isHighlighted ? 0.25 : 0.95,
                          }}
                        />

                        {/* Wide Invisible Hit-Area Path so arrows are easy to click and hover */}
                        <path
                          d={link.dPath}
                          data-dep-hit-area={`${link.predId}->${link.succId}`}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={14}
                          style={{
                            pointerEvents: canInteract ? 'stroke' : 'none',
                          }}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredDepKey(link.key)}
                          onMouseLeave={() =>
                            setHoveredDepKey((prev) =>
                              prev === link.key ? null : prev
                            )
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemId(null);
                            setConnectModeSource(null);
                            setReconnectMode(null);
                            setSelectedDepLink((prev) =>
                              prev?.predId === link.predId &&
                              prev?.succId === link.succId
                                ? null
                                : { predId: link.predId, succId: link.succId }
                            );
                          }}
                        >
                          <title>{`Dependencia (${link.depType}) — Haz clic para editar, mover o eliminar`}</title>
                        </path>

                        {/* Draggable Source (Predecessor / Tail) Endpoint Handle */}
                        <circle
                          data-dep-handle-source={`${link.predId}->${link.succId}`}
                          cx={link.x1}
                          cy={link.y1}
                          r={isInteractiveActive ? 5 : 3.5}
                          style={{
                            pointerEvents:
                              isInteractiveActive && canInteract ? 'all' : 'none',
                            opacity: isInteractiveActive ? 1 : 0,
                          }}
                          onMouseEnter={() => setHoveredDepKey(link.key)}
                          onMouseLeave={() =>
                            setHoveredDepKey((prev) =>
                              prev === link.key ? null : prev
                            )
                          }
                          onMouseDown={(e) =>
                            handleStartDependencyDrag(e, {
                              mode: 'move-source',
                              oldPredId: link.predId,
                              oldSuccId: link.succId,
                              fixedItemId: link.succId,
                              depType: link.depType,
                            })
                          }
                          className="cursor-grab active:cursor-grabbing fill-white dark:fill-slate-900 stroke-indigo-600 dark:stroke-indigo-400 stroke-2 transition-opacity"
                        >
                          <title>{'Arrastra este extremo para mover la tarea predecesora (origen)'}</title>
                        </circle>

                        {/* Draggable Target (Successor / Head) Endpoint Handle */}
                        <circle
                          data-dep-handle-target={`${link.predId}->${link.succId}`}
                          cx={link.x2}
                          cy={link.y2}
                          r={isInteractiveActive ? 5.5 : 4}
                          style={{
                            pointerEvents:
                              isInteractiveActive && canInteract ? 'all' : 'none',
                            opacity: isInteractiveActive ? 1 : 0,
                          }}
                          onMouseEnter={() => setHoveredDepKey(link.key)}
                          onMouseLeave={() =>
                            setHoveredDepKey((prev) =>
                              prev === link.key ? null : prev
                            )
                          }
                          onMouseDown={(e) =>
                            handleStartDependencyDrag(e, {
                              mode: 'move-target',
                              oldPredId: link.predId,
                              oldSuccId: link.succId,
                              fixedItemId: link.predId,
                              depType: link.depType,
                            })
                          }
                          className="cursor-grab active:cursor-grabbing fill-indigo-600 dark:fill-indigo-400 stroke-white dark:stroke-slate-900 stroke-2 transition-opacity"
                        >
                          <title>{'Arrastra la punta de la flecha para mover la tarea sucesora (destino)'}</title>
                        </circle>

                        {/* Midpoint Quick Action Pill (Dependency Type + 1-Click Delete ×) */}
                        <g
                          data-dep-midpoint={`${link.predId}->${link.succId}`}
                          transform={`translate(${link.midPoint.x}, ${link.midPoint.y})`}
                          style={{
                            pointerEvents:
                              isInteractiveActive && canInteract ? 'all' : 'none',
                            opacity: isInteractiveActive ? 1 : 0,
                          }}
                          onMouseEnter={() => setHoveredDepKey(link.key)}
                          onMouseLeave={() =>
                            setHoveredDepKey((prev) =>
                              prev === link.key ? null : prev
                            )
                          }
                          className="transition-opacity duration-150"
                        >
                          <rect
                            x={-22}
                            y={-9}
                            width={44}
                            height={18}
                            rx={3}
                            className="fill-white dark:fill-zinc-900 stroke-[#0C0C09] dark:stroke-zinc-400 stroke-[1] shadow-none"
                          />
                          <g
                            data-dep-midpoint-select={`${link.predId}->${link.succId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemId(null);
                              setSelectedDepLink({
                                predId: link.predId,
                                succId: link.succId,
                              });
                            }}
                            className="cursor-pointer"
                          >
                            <title>{`Editar o reconectar dependencia (${link.depType})`}</title>
                            <text
                              x={-7}
                              y={3.5}
                              textAnchor="middle"
                              className="fill-[#0C0C09] dark:fill-zinc-200 text-[9px] font-mono font-bold select-none"
                            >
                              {link.depType}
                            </text>
                          </g>
                          <g
                            data-dep-quick-delete={`${link.predId}->${link.succId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              commitRemoveDependency(link.predId, link.succId);
                            }}
                            className="cursor-pointer"
                          >
                            <title>{'Eliminar dependencia inmediatamente'}</title>
                            <circle
                              cx={11}
                              cy={0}
                              r={6.5}
                              className="fill-rose-500 hover:fill-rose-600 transition-colors"
                            />
                            <path
                              d="M 8.5 -2.5 L 13.5 2.5 M 13.5 -2.5 L 8.5 2.5"
                              stroke="#ffffff"
                              strokeWidth={1.6}
                              strokeLinecap="round"
                            />
                          </g>
                        </g>
                      </g>
                    );
                  })}

                  {/* Live Drag Preview Line when creating or moving a dependency */}
                  {depDragPreview && (
                    <g
                      id="gantt-dep-drag-preview"
                      data-dep-drag-preview="true"
                      className="pointer-events-none"
                    >
                      <path
                        d={depDragPreview.dPath}
                        fill="none"
                        stroke={
                          depDragPreview.isValidTarget ? '#4f46e5' : '#f43f5e'
                        }
                        strokeWidth={2.4}
                        strokeDasharray="5 3"
                        markerEnd={
                          depDragPreview.isValidTarget
                            ? 'url(#arrow-active)'
                            : 'url(#arrow-critical)'
                        }
                      />
                      <circle
                        cx={depDragPreview.x1}
                        cy={depDragPreview.y1}
                        r={4.5}
                        fill={
                          depDragPreview.isValidTarget ? '#4f46e5' : '#f43f5e'
                        }
                      />
                      <circle
                        cx={depDragPreview.x2}
                        cy={depDragPreview.y2}
                        r={5}
                        fill={
                          depDragPreview.isValidTarget ? '#10b981' : '#f43f5e'
                        }
                      />
                    </g>
                  )}
                </svg>
              )}

              {/* Live Floating Status Badge while Dragging a Dependency */}
              {depDragPreview && depDragState && (
                <div
                  style={{
                    left: Math.max(
                      12,
                      Math.min(totalCanvasWidth - 180, depDragState.cursorX + 14)
                    ),
                    top: Math.max(8, depDragState.cursorY - 28),
                  }}
                  className={`absolute z-50 pointer-events-none px-2.5 py-1 rounded-full text-[10px] font-semibold shadow-lg border whitespace-nowrap ${
                    depDragPreview.isValidTarget
                      ? 'bg-indigo-600 text-white border-indigo-400'
                      : 'bg-rose-600 text-white border-rose-400'
                  }`}
                >
                  {depDragPreview.statusLabel}
                </div>
              )}

              {/* Foreground Project Rollup Summary Bars, Task Bars, Slack Ghost Bars & Milestones */}
              {displayRows.map((row, rowIndex) => {
                const timelineRowShiftY = rowDragShiftYByRowId.get(row.rowId) || 0;
                const collapsingTimelineRow = isRowCollapsing(row);
                const expandingTimelineRow = !collapsingTimelineRow && isRowJustExpanded(row);
                const timelineAnimDeltaY = collapsingTimelineRow
                  ? getRowAnimDeltaY(row, rowIndex, recentlyCollapsedParentIds, displayRows)
                  : expandingTimelineRow
                  ? getRowAnimDeltaY(row, rowIndex, recentlyExpandedParentIds, displayRows)
                  : 0;
                const timelineRowShiftStyle: React.CSSProperties | undefined =
                  timelineRowShiftY || collapsingTimelineRow || expandingTimelineRow
                    ? ({
                        ...(timelineRowShiftY
                          ? { transform: `translateY(${timelineRowShiftY}px)` }
                          : {}),
                        ...(collapsingTimelineRow || expandingTimelineRow
                          ? { '--anim-delta-y': `${timelineAnimDeltaY}px` }
                          : {}),
                      } as React.CSSProperties)
                    : undefined;
                const timelineRowShiftClass = isAnyRowOrProjectDragging
                  ? 'transition-transform duration-200 ease-out'
                  : isCollapseAnimating
                  ? 'transition-[top] duration-[140ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
                  : '';
                const timelineRowExpandClass = collapsingTimelineRow
                  ? 'animate-gantt-timeline-collapse'
                  : expandingTimelineRow
                  ? 'animate-gantt-row-expand'
                  : '';

                if (row.kind === 'release') {
                  const { group: rGroup } = row;
                  const relSpan = getReleaseDateSpan(rGroup.release);
                  const releaseMilestones = rGroup.release.milestones || [];
                  const validMilestoneDates = releaseMilestones
                    .map((m) => m.date)
                    .filter((d): d is string => Boolean(d && typeof d === 'string'))
                    .sort();

                  const firstMilestoneDate = validMilestoneDates[0];
                  const lastMilestoneDate =
                    validMilestoneDates[validMilestoneDates.length - 1];

                  // Bar starts at first milestone (or group startDate) and extends strictly up to last milestone date
                  // Always indicates the full duration of the release
                  const effectiveStartDate =
                    firstMilestoneDate || rGroup.startDate || relSpan.startDate;
                  const effectiveEndDate =
                    lastMilestoneDate || rGroup.endDate || relSpan.endDate;

                  const rStart = parseDateSafe(effectiveStartDate);
                  const rEnd = parseDateSafe(effectiveEndDate);

                  const startOffsetDays = differenceInCalendarDays(
                    rStart,
                    timelineStart
                  );
                  const rStartX = startOffsetDays * dayWidth;
                  const spanDays = Math.max(
                    relSpan.duration,
                    differenceInCalendarDays(rEnd, rStart) + 1
                  );
                  const rWidth = Math.max(dayWidth, spanDays * dayWidth);

                  const isReleaseSelected = effectiveSelectedReleaseId === rGroup.release.id;

                  return (
                    <div
                      key={`release-summary-bar-${rGroup.release.id}`}
                      data-release-summary-bar={rGroup.release.id}
                      data-selected-release-id={isReleaseSelected ? rGroup.release.id : undefined}
                      style={{
                        top: rowIndex * ROW_HEIGHT,
                        height: ROW_HEIGHT,
                        ...timelineRowShiftStyle,
                      }}
                      className={`absolute left-0 right-0 flex items-center pointer-events-none z-20 ${timelineRowShiftClass}`}
                    >
                      <div
                        style={{ left: rStartX, width: rWidth }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRelease(rGroup.release);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleToggleReleaseCollapse(rGroup.release.id);
                        }}
                        className="relative z-20 h-full flex flex-col justify-start pt-1 pointer-events-auto cursor-pointer group overflow-visible select-none"
                        title={`${rGroup.release.name}: ${effectiveStartDate} → ${effectiveEndDate} (${spanDays}d · Duración completa de la release · Acotado hasta su último hito: ${effectiveEndDate} · Clic para seleccionar release en diagrama, doble clic para colapsar)`}
                      >
                        {/* Top Label above Release Bar */}
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-700 dark:text-slate-200 mb-1 px-0.5 whitespace-nowrap overflow-visible z-10 pointer-events-none">
                          <span className="px-1 py-0.2 rounded bg-indigo-600 text-white font-mono text-[8.5px] font-bold tracking-wider uppercase">
                            REL
                          </span>
                          <span className="font-bold">{rGroup.release.code}</span>
                          <span className="text-[9px] opacity-80 font-normal">
                            {effectiveStartDate.split('-').slice(1).reverse().join('/')} → {effectiveEndDate.split('-').slice(1).reverse().join('/')}
                          </span>
                          <span className="px-1 py-0.2 rounded bg-zinc-200/80 dark:bg-zinc-800 font-mono text-[9px] font-bold">
                            {`(${spanDays}d)`}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-zinc-200/80 dark:bg-zinc-800 text-[9px] font-bold">
                            {rGroup.progress}%
                          </span>
                        </div>

                        {/* Release Summary Bracket Bar (same color as project bar, with two tips at each end) */}
                        <div
                          className={`relative h-3 rounded-t-[2px] bg-[#0C0C09] dark:bg-zinc-200 overflow-visible shadow-none transition-all group-hover:bg-zinc-800 dark:group-hover:bg-zinc-300 ${
                            isReleaseSelected
                              ? 'ring-3 ring-indigo-500'
                              : ''
                          }`}
                        >
                          {/* Progress Fill Inside Release Summary Bar */}
                          <div
                            style={{ width: `${rGroup.progress}%` }}
                            className="h-full rounded-tl-[2px] transition-all bg-indigo-500"
                          />
                          {/* Left Bracket Double Downward Tips */}
                          <div className="absolute -bottom-1.5 left-0 w-2 h-2 bg-[#0C0C09] dark:bg-zinc-200 group-hover:bg-zinc-800 dark:group-hover:bg-zinc-300 transition-colors clip-path-bracket-left" />
                          <div className="absolute -bottom-1.5 left-2 w-2 h-2 bg-[#0C0C09] dark:bg-zinc-200 group-hover:bg-zinc-800 dark:group-hover:bg-zinc-300 transition-colors clip-path-bracket-left" />
                          {/* Right Bracket Double Downward Tips */}
                          <div className="absolute -bottom-1.5 right-0 w-2 h-2 bg-[#0C0C09] dark:bg-zinc-200 group-hover:bg-zinc-800 dark:group-hover:bg-zinc-300 transition-colors clip-path-bracket-right" />
                          <div className="absolute -bottom-1.5 right-2 w-2 h-2 bg-[#0C0C09] dark:bg-zinc-200 group-hover:bg-zinc-800 dark:group-hover:bg-zinc-300 transition-colors clip-path-bracket-right" />
                        </div>
                      </div>
                    </div>
                  );
                }

                if (row.kind === 'empty-project' || row.kind === 'add-task' || row.kind === 'add-project') {
                  return null;
                }

                if (row.kind === 'project') {
                  const { group } = row;
                  const targetRel = releases?.find((r) => r.id === group.project.releaseId);
                  const isProjectSelected = effectiveSelectedProjectId === group.project.id;

                  if (group.items.length === 0) {
                    const relSpan = targetRel ? getReleaseDateSpan(targetRel) : null;
                    const groupStartDateStr = relSpan ? relSpan.startDate : group.startDate;
                    const groupDuration = relSpan ? relSpan.duration : Math.max(1, group.duration || 14);
                    const groupEndDateStr = relSpan ? relSpan.endDate : group.endDate;

                    const groupStart = parseDateSafe(groupStartDateStr);
                    const startOffsetDays = differenceInCalendarDays(
                      groupStart,
                      timelineStart
                    );
                    const groupStartX = startOffsetDays * dayWidth;
                    const groupWidth = Math.max(dayWidth, groupDuration * dayWidth);

                    return (
                      <div
                        key={`summary-bar-${group.project.id}`}
                        data-project-summary-bar={group.project.id}
                        data-empty-project-timeline-bar="true"
                        data-project-locked={group.project.locked ? 'true' : 'false'}
                        data-selected-project-id={isProjectSelected ? group.project.id : undefined}
                        data-multi-selected={multiSelectedProjectIds.has(group.project.id) ? 'true' : undefined}
                        style={{
                          top: rowIndex * ROW_HEIGHT,
                          height: ROW_HEIGHT,
                          ...timelineRowShiftStyle,
                        }}
                        className={`absolute left-0 right-0 flex items-center pointer-events-none ${
                          draggingProjectId === group.project.id ? 'z-40' : 'z-20'
                        } ${timelineRowShiftClass} ${timelineRowExpandClass}`}
                      >
                        <div
                          style={{ left: groupStartX, width: groupWidth }}
                          onMouseDown={(e) => handleProjectBarMouseDown(e, group)}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasDraggedRef.current) {
                              hasDraggedRef.current = false;
                              return;
                            }
                            if (e.metaKey || e.ctrlKey || e.shiftKey) {
                              toggleMultiSelectProject(group.project.id, e.shiftKey);
                              return;
                            }
                            handleSelectProject(group.project);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleToggleProjectCollapse(group.project.id, group.project.collapsed);
                          }}
                          title={`${group.project.name}${group.project.locked ? ' · 🔒 Bloqueado' : ''} (Sin tareas aún · ${targetRel ? `Release ${targetRel.code}` : 'Ventana estimada'}: ${formatDateDisplay(groupStartDateStr, 'dd MMM')} → ${formatDateDisplay(groupEndDateStr, 'dd MMM yyyy')} · Clic para seleccionar proyecto en diagrama)`}
                          className={`relative z-20 flex flex-col justify-center cursor-pointer pointer-events-auto group overflow-visible ${
                            isProjectSelected || multiSelectedProjectIds.has(group.project.id)
                              ? 'ring-2 ring-indigo-500 rounded-[4px] p-0.5'
                              : ''
                          }`}
                        >
                          {/* Label above empty summary bar */}
                          <div
                            data-timeline-project-name={group.project.name}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 mb-1 px-0.5 whitespace-nowrap overflow-visible z-10 pointer-events-none"
                          >
                            {group.project.locked && (
                              <span
                                data-timeline-project-locked={group.project.id}
                                className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                              >
                                <Lock className="w-2.5 h-2.5" />
                                <span>Bloqueado</span>
                              </span>
                            )}
                            <span className="whitespace-nowrap font-semibold">
                              {group.project.name}
                            </span>
                            <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              0 tareas
                            </span>
                          </div>

                          {/* Dashed summary bar */}
                          <div className="h-4 rounded-[3px] border-2 border-dashed border-indigo-400 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 flex items-center justify-between px-2 text-[10px] text-indigo-700 dark:text-indigo-300 font-mono shadow-xs">
                            <span className="truncate">Ventana estimada {targetRel ? `(${targetRel.code})` : ''}</span>
                            <span className="shrink-0 font-bold">{groupDuration}d</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const groupStart = parseDateSafe(group.startDate);
                  const startOffsetDays = differenceInCalendarDays(
                    groupStart,
                    timelineStart
                  );
                  const groupStartX = startOffsetDays * dayWidth;
                  const groupWidth = Math.max(dayWidth, group.duration * dayWidth);
                  const projTheme =
                    COLOR_STYLES[group.project.color] || COLOR_STYLES.indigo;
                  const isDraggingProjectBar =
                    dragState?.mode === 'move' &&
                    (dragState.itemId === `project:${group.project.id}` ||
                      (Boolean(dragState.multiItems) &&
                        group.items.length > 0 &&
                        group.items.every((it) => dragState.multiItems!.has(it.id))));
                  const projectSmoothOffsetX =
                    isDraggingProjectBar && typeof dragState?.pixelDeltaX === 'number'
                      ? dragState.pixelDeltaX - dragState.dayDelta * dayWidth
                      : 0;

                  return (
                    <div
                      key={`summary-bar-${group.project.id}`}
                      data-project-summary-bar={group.project.id}
                      data-project-locked={group.project.locked ? 'true' : 'false'}
                      data-selected-project-id={isProjectSelected ? group.project.id : undefined}
                      data-multi-selected={multiSelectedProjectIds.has(group.project.id) ? 'true' : undefined}
                      style={{
                        top: rowIndex * ROW_HEIGHT,
                        height: ROW_HEIGHT,
                        ...timelineRowShiftStyle,
                      }}
                      className={`absolute left-0 right-0 flex items-center pointer-events-none ${
                        draggingProjectId === group.project.id ? 'z-40' : 'z-20'
                      } ${timelineRowShiftClass} ${timelineRowExpandClass}`}
                    >
                      <div
                        style={{ left: groupStartX + projectSmoothOffsetX, width: groupWidth }}
                        onMouseDown={(e) => handleProjectBarMouseDown(e, group)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasDraggedRef.current) {
                            hasDraggedRef.current = false;
                            return;
                          }
                          if (e.metaKey || e.ctrlKey || e.shiftKey) {
                            toggleMultiSelectProject(group.project.id, e.shiftKey);
                            return;
                          }
                          handleSelectProject(group.project);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleToggleProjectCollapse(group.project.id, group.project.collapsed);
                        }}
                        title={`${group.project.name}${group.project.locked ? ' · 🔒 Bloqueado' : ''}: ${formatDateDisplay(
                          group.startDate,
                          'dd MMM'
                        )} → ${formatDateDisplay(group.endDate, 'dd MMM yyyy')} (${
                          group.duration
                        } días · Arrastra para mover todo el proyecto, Cmd/Ctrl+Clic para multiselección, doble clic para colapsar)`}
                        className={`relative z-20 flex flex-col justify-center cursor-grab active:cursor-grabbing pointer-events-auto group overflow-visible ${
                          isProjectSelected || multiSelectedProjectIds.has(group.project.id)
                            ? 'ring-2 ring-indigo-500 rounded-[4px] p-0.5'
                            : ''
                        }`}
                      >
                        {/* Top Label above Summary Bracket */}
                        <div
                          data-timeline-project-name={group.project.name}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 mb-1 px-0.5 whitespace-nowrap overflow-visible z-10 pointer-events-none"
                        >
                          {group.project.locked && (
                            <span
                              data-timeline-project-locked={group.project.id}
                              className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              <span>Bloqueado</span>
                            </span>
                          )}
                          <span className="whitespace-nowrap font-semibold">
                            {group.project.name}
                          </span>
                          {(() => {
                            const projPlatform = normalizePlatform(group.project.platform);
                            if (!projPlatform) return null;
                            return (
                              <span
                                data-timeline-project-platform={projPlatform}
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                  projPlatform === 'iOS'
                                    ? 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
                                    : projPlatform === 'Android'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                    : 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                                }`}
                              >
                                {projPlatform}
                              </span>
                            );
                          })()}
                          <span className="text-zinc-500 dark:text-zinc-400 font-normal">
                            ({group.duration}d)
                          </span>
                          <span className="font-mono text-[#0C0C09] dark:text-zinc-200 font-bold ml-1">
                            {group.progress}%
                          </span>
                        </div>

                        {/* Classic Gantt Project Summary Bracket Bar */}
                        <div className={`relative h-3 rounded-t-[2px] ${projTheme.badge} overflow-visible shadow-none`}>
                          {/* Progress Fill Inside Project Summary Bar */}
                          <div
                            style={{ width: `${group.progress}%` }}
                            className={`h-full rounded-tl-[2px] transition-all ${projTheme.fillBg}`}
                          />
                          {/* Left Bracket Downward Cap */}
                          <div className={`absolute -bottom-1.5 left-0 w-2 h-2 ${projTheme.badge} clip-path-bracket-left`} />
                          {/* Right Bracket Downward Cap */}
                          <div className={`absolute -bottom-1.5 right-0 w-2 h-2 ${projTheme.badge} clip-path-bracket-right`} />
                        </div>
                      </div>
                    </div>
                  );
                }

                // Task or Milestone Bar
                const { item } = row;
                if (item.hidden) return null;
                const coords = itemRowMap.get(item.id);
                if (!coords) return null;

                const isHovered = hoveredId === item.id;
                const isSelected = selectedItemId === item.id;
                const isDepDropTarget = depDragState?.hoveredTargetId === item.id;
                const isStartDropTarget =
                  isDepDropTarget &&
                  (depDragState?.mode !== 'create' ||
                    (depDragState?.hoveredTargetPort || 'start') === 'start');
                const isEndDropTarget =
                  isDepDropTarget &&
                  depDragState?.mode === 'create' &&
                  depDragState?.hoveredTargetPort === 'end';
                const isDepDropValid = Boolean(depDragPreview?.isValidTarget);
                const isConnectSource = connectModeSource?.itemId === item.id;
                const isStartConnectSource =
                  isConnectSource &&
                  (connectModeSource?.port === 'start' ||
                    (!connectModeSource?.port && connectModeSource?.role === 'succ'));
                const isEndConnectSource =
                  isConnectSource && !isStartConnectSource;
                const isDimmed =
                  (hoveredId !== null ||
                    selectedItemId !== null ||
                    selectedDepLink !== null) &&
                  !relatedIds.has(item.id) &&
                  !isDepDropTarget &&
                  !isConnectSource;
                const isCrit = showCriticalPath && item.isCritical;
                const isMultiSelectedThis = effectiveMultiItemIds.has(item.id);
                const isDraggingThis = Boolean(
                  dragState && (dragState.itemId === item.id || dragState.multiItems?.has(item.id))
                );
                const itemEffectiveColor = getItemEffectiveColor(item);
                const styleTheme = COLOR_STYLES[itemEffectiveColor] || COLOR_STYLES.indigo;

                const showPortHandles =
                  isHovered ||
                  isSelected ||
                  isDepDropTarget ||
                  isConnectSource ||
                  Boolean(depDragState) ||
                  Boolean(connectModeSource) ||
                  Boolean(reconnectMode);

                const barLeft =
                  item.type === 'milestone'
                    ? coords.startX - 10
                    : coords.startX;
                const barWidth =
                  item.type === 'milestone'
                    ? 20
                    : Math.max(6, dayWidth, coords.endX - coords.startX);
                const smoothMoveOffsetX =
                  isDraggingThis &&
                  dragState?.mode === 'move' &&
                  typeof dragState.pixelDeltaX === 'number'
                    ? dragState.pixelDeltaX - dragState.dayDelta * dayWidth
                    : 0;
                const isActivelyMovingBar =
                  isDraggingThis &&
                  dragState?.mode === 'move' &&
                  Math.abs(dragState.pixelDeltaX ?? 0) > 3;

                // Visual Slack width: automatic free slack given FS successor tasks (or manual slack if configured)
                const autoSlackDays = Math.max(0, item.freeSlack ?? 0);
                const totalSlackDays = item.slack > 0 ? item.slack : autoSlackDays;
                const slackWidth =
                  item.type === 'task' && totalSlackDays > 0
                    ? totalSlackDays * dayWidth
                    : 0;
                const effectiveSlackEndDateStr =
                  totalSlackDays > 0
                    ? calculateEndDateFromDuration(
                        coords.effectiveEndStr,
                        totalSlackDays + 1,
                        'task'
                      )
                    : coords.effectiveEndStr;

                const isDraggingVerticalThis =
                  draggingRowId === item.id || Boolean(draggingMultiRowIds?.has(item.id));
                const effectiveTimelineRowShiftStyle = isDraggingVerticalThis
                  ? { transform: `translateY(${dragVerticalDeltaY}px)` }
                  : timelineRowShiftStyle;

                return (
                  <div
                    key={`bar-${item.id}`}
                    data-timeline-bar-row={item.id}
                    style={{
                      top: coords.index * ROW_HEIGHT,
                      height: ROW_HEIGHT,
                      ...effectiveTimelineRowShiftStyle,
                    }}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`absolute left-0 right-0 flex items-center pointer-events-none ${
                      isDraggingVerticalThis || draggingProjectId === item.projectId
                        ? 'z-40'
                        : 'z-20'
                    } ${
                      isDraggingVerticalThis
                        ? 'opacity-95'
                        : isAnyRowOrProjectDragging
                        ? 'transition-[transform,opacity] duration-200 ease-out'
                        : isCollapseAnimating
                        ? 'transition-[top,opacity] duration-[140ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
                        : 'transition-opacity'
                    } ${timelineRowExpandClass} ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
                  >
                    {item.type === 'milestone' ? (
                      <>
                        {isActivelyMovingBar && (
                          <div
                            data-testid="timeline-drag-snap-ghost"
                            style={{ left: barLeft }}
                            className="absolute w-5 h-5 rotate-45 rounded-[4px] border-2 border-dashed border-indigo-400/80 bg-indigo-500/15 pointer-events-none z-10"
                          />
                        )}
                        {/* MILESTONE RENDERER (◆ Diamond) + Dependency Connector Ports */}
                        <div
                          style={{ left: barLeft + smoothMoveOffsetX }}
                          onMouseDown={(e) => handleBarMouseDown(e, item, 'move')}
                          onClick={(e) => handleBarClick(e, item.id)}
                          onDoubleClick={() => guardedEditModal(item)}
                          data-timeline-milestone={item.id}
                          data-milestone-color={item.color}
                          className={`absolute z-20 flex items-center pointer-events-auto group cursor-grab active:cursor-grabbing ${
                            isDraggingThis ? 'z-40' : ''
                          }`}
                        >
                        {/* Left Start Dependency Connector Port (Inicio: SS / SF desde origen, FS / SS como destino) */}
                        <button
                          type="button"
                          data-dep-port-in={item.id}
                          data-dep-port-role="in"
                          onMouseDown={(e) =>
                            handleStartDependencyDrag(e, {
                              mode: 'create',
                              originPort: 'in',
                              fixedItemId: item.id,
                            })
                          }
                          onClick={(e) => e.stopPropagation()}
                          title="Punto de Inicio (S): arrastra para crear SS/SF o suelta aquí para FS/SS sin mover fechas"
                          className={`absolute -left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-500 hover:bg-indigo-600 hover:scale-125 shadow-sm transition-all cursor-crosshair z-30 ${
                            showPortHandles
                              ? 'opacity-100 scale-105'
                              : 'opacity-0 group-hover:opacity-100'
                          } ${
                            isStartDropTarget
                              ? isDepDropValid
                                ? 'ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100'
                                : 'ring-2 ring-rose-400 bg-rose-500 scale-125 opacity-100'
                              : isStartConnectSource
                              ? 'ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100'
                              : ''
                          }`}
                        />

                        {/* Right End Dependency Connector Port (Fin: FS / FF desde origen, FF / SF como destino) */}
                        <button
                          type="button"
                          data-dep-port-out={item.id}
                          data-dep-port-role="out"
                          onMouseDown={(e) =>
                            handleStartDependencyDrag(e, {
                              mode: 'create',
                              originPort: 'out',
                              fixedItemId: item.id,
                            })
                          }
                          onClick={(e) => e.stopPropagation()}
                          title="Punto de Fin (F): arrastra para crear FS/FF o suelta aquí para FF/SF sin mover fechas"
                          className={`absolute left-[22px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-600 hover:bg-indigo-500 hover:scale-125 shadow-sm transition-all cursor-crosshair z-30 ${
                            showPortHandles
                              ? 'opacity-100 scale-105'
                              : 'opacity-0 group-hover:opacity-100'
                          } ${
                            isEndDropTarget
                              ? isDepDropValid
                                ? 'ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100'
                                : 'ring-2 ring-rose-400 bg-rose-500 scale-125 opacity-100'
                              : isEndConnectSource
                              ? 'ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100'
                              : ''
                          }`}
                        />

                        {isDraggingThis && (
                          <div className="absolute -top-7 left-2.5 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-[10px] font-mono font-bold shadow-xl border border-slate-700/60 dark:border-zinc-300/60 pointer-events-none whitespace-nowrap z-50">
                            ◆ {formatDateDisplay(coords.effectiveStartStr, 'd MMM yyyy')}
                          </div>
                        )}
                        <div
                          data-multi-selected={isMultiSelectedThis ? 'true' : undefined}
                          className={`w-5 h-5 rotate-45 rounded-[4px] border-2 shadow-md transition-transform group-hover:scale-125 ${
                            isDraggingThis
                              ? 'scale-125 ring-2 ring-indigo-500 shadow-xl'
                              : isMultiSelectedThis
                              ? 'scale-125 ring-2 ring-indigo-500 shadow-lg'
                              : isDepDropTarget
                              ? 'scale-125 ring-2 ring-emerald-500'
                              : isConnectSource
                              ? 'scale-125 ring-2 ring-indigo-500'
                              : isSelected
                              ? 'scale-125 ring-2 ring-indigo-500'
                              : ''
                          } ${
                            isCrit
                              ? 'bg-rose-500 border-white dark:border-slate-900 ring-2 ring-rose-500'
                              : item.isExternal
                              ? 'bg-amber-500/90 border-dashed border-2 border-[#0C0C09] dark:border-white'
                              : styleTheme.diamondBg
                          }`}
                        />
                        <div
                          className={`ml-4 px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap shadow-sm ${styleTheme.diamondPill} ${
                            item.isExternal ? 'border-amber-400 ring-1 ring-amber-400/50' : ''
                          }`}
                        >
                          {`◆ ${item.isExternal ? '[EXT] ' : ''}${item.name} `}
                          <span className="font-mono text-[10px] opacity-75">
                            ({formatDateDisplay(coords.effectiveStartStr, 'dd MMM')})
                          </span>
                        </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {isActivelyMovingBar && (
                          <div
                            data-testid="timeline-drag-snap-ghost"
                            style={{ left: barLeft, width: barWidth }}
                            className="absolute h-7 rounded-[4px] border-2 border-dashed border-indigo-400/80 dark:border-indigo-400/70 bg-indigo-500/10 pointer-events-none z-10"
                          />
                        )}
                        {/* STANDARD TASK BAR + SLACK EXTENSION BAR + Dependency Connector Ports */}
                        <div
                          style={{ left: barLeft + smoothMoveOffsetX }}
                          className={`absolute z-20 flex items-center pointer-events-auto group ${
                            isDraggingThis ? 'z-40' : ''
                          }`}
                        >
                        {isDraggingThis && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-[10px] font-mono font-bold shadow-xl border border-slate-700/60 dark:border-zinc-300/60 pointer-events-none whitespace-nowrap z-50">
                            {formatDateDisplay(coords.effectiveStartStr, 'd MMM')} → {formatDateDisplay(coords.effectiveEndStr, 'd MMM')} ({coords.effectiveDuration}d)
                          </div>
                        )}

                        {/* Wrapper for Task Bar + Left/Right Dependency Connector Ports */}
                        <div className="relative flex items-center">
                          {/* Top Label above Task Bar: positioned snug to its own task box */}
                          <div
                            data-timeline-task-name={item.id}
                            className="absolute bottom-full mb-[2px] left-0 flex items-center gap-1.5 pointer-events-none select-none z-10 whitespace-nowrap"
                          >
                            <span className="text-[10.5px] font-semibold text-[#0C0C09] dark:text-zinc-100 drop-shadow-xs leading-none">
                              {item.name}
                            </span>
                            <span className="text-[9.5px] font-mono text-[#6B6B66] dark:text-zinc-400 font-medium leading-none">
                              {`(${coords.effectiveDuration}d)`}
                            </span>
                          </div>

                          {/* Left Start Dependency Connector Port (Inicio: SS / SF desde origen, FS / SS como destino) */}
                          <button
                            type="button"
                            data-dep-port-in={item.id}
                            data-dep-port-role="in"
                            onMouseDown={(e) =>
                              handleStartDependencyDrag(e, {
                                mode: 'create',
                                originPort: 'in',
                                fixedItemId: item.id,
                              })
                            }
                            onClick={(e) => e.stopPropagation()}
                            title="Punto de Inicio (S): arrastra para crear SS/SF o suelta aquí para FS/SS sin mover fechas"
                            className={`absolute -left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-500 hover:bg-indigo-600 hover:scale-125 shadow-sm transition-all cursor-crosshair z-30 ${
                              showPortHandles
                                ? 'opacity-100 scale-105'
                                : 'opacity-0 group-hover:opacity-100'
                            } ${
                              isStartDropTarget
                                ? isDepDropValid
                                  ? 'ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100'
                                  : 'ring-2 ring-rose-400 bg-rose-500 scale-125 opacity-100'
                                : isStartConnectSource
                                ? 'ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100'
                                : ''
                            }`}
                          />

                          {/* Main Task Bar */}
                          <div
                            style={{ width: barWidth }}
                            onMouseDown={(e) => handleBarMouseDown(e, item, 'move')}
                            onClick={(e) => handleBarClick(e, item.id)}
                            onDoubleClick={() => guardedEditModal(item)}
                            data-timeline-task={item.id}
                            data-multi-selected={isMultiSelectedThis ? 'true' : undefined}
                            className={`relative h-7 rounded-[4px] border overflow-hidden cursor-grab active:cursor-grabbing shadow-none transition-shadow ${
                              styleTheme.barBg
                            } ${
                              isDraggingThis
                                ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-black shadow-2xl scale-[1.02] opacity-95'
                                : isMultiSelectedThis
                                ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-black'
                                : isDepDropTarget
                                ? 'ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-black'
                                : isConnectSource
                                ? 'ring-2 ring-[#0C0C09] ring-offset-1 dark:ring-offset-black'
                                : isSelected
                                ? 'ring-2 ring-[#0C0C09] ring-offset-1 dark:ring-offset-black'
                                : isCrit
                                ? 'border-rose-500 ring-2 ring-rose-500/40'
                                : item.hasConflict
                                ? 'border-rose-500 ring-2 ring-rose-500/30'
                                : styleTheme.border
                            }`}
                          >
                            {/* Progress Fill Layer */}
                            <div
                              style={{ width: `${item.progress}%` }}
                              className={`h-full transition-all ${
                                isCrit ? 'bg-rose-600 dark:bg-rose-500' : styleTheme.fillBg
                              }`}
                            />

                            {/* Inline Progress Drag Handle (bottom edge, clamped inside resize handles & dependency ports) */}
                            {barWidth >= 28 && (
                              <div
                                data-testid={`task-progress-handle-${item.id}`}
                                onMouseDown={(e) => handleBarMouseDown(e, item, 'progress')}
                                style={{
                                  left: `clamp(14px, ${item.progress}%, calc(100% - 14px))`,
                                }}
                                title={`Arrastra para ajustar el avance (${item.progress}%)`}
                                className="absolute bottom-0 -translate-x-1/2 w-3.5 h-2.5 cursor-ew-resize opacity-75 group-hover:opacity-100 hover:scale-125 transition flex items-end justify-center z-20"
                              >
                                <div
                                  style={{
                                    width: 0,
                                    height: 0,
                                    borderLeft: '5px solid transparent',
                                    borderRight: '5px solid transparent',
                                    borderBottom: '7px solid rgba(255, 255, 255, 0.95)',
                                    filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.6))',
                                  }}
                                />
                              </div>
                            )}

                            {/* Inside Bar: Progress percentage when progress > 0 and bar is wide enough */}
                            {item.progress > 0 && barWidth >= 40 && (
                              <div className="absolute inset-0 px-2 flex items-center justify-center text-[9px] font-mono font-bold text-white/90 drop-shadow-xs pointer-events-none select-none">
                                {item.progress}%
                              </div>
                            )}

                            {/* Left-Edge Drag Handle for Start Date Resizing (keeps endDate fixed) */}
                            <div
                              data-testid={`task-resize-start-${item.id}`}
                              onMouseDown={(e) => handleBarMouseDown(e, item, 'resize-start')}
                              title="Arrastra el borde izquierdo para cambiar la fecha de inicio (fin fijo)"
                              className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-white/20 flex items-center justify-center z-10"
                            >
                              <div className="w-0.5 h-3.5 bg-white/70 rounded-[1px]" />
                            </div>

                            {/* Right-Edge Drag Handle for Duration Resizing */}
                            <div
                              data-testid={`task-resize-end-${item.id}`}
                              onMouseDown={(e) => handleBarMouseDown(e, item, 'resize')}
                              title="Arrastra el borde derecho para cambiar la duración"
                              className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-white/20 flex items-center justify-center z-10"
                            >
                              <div className="w-0.5 h-3.5 bg-white/70 rounded-[1px]" />
                            </div>
                          </div>

                          {/* Visual Baseline Comparison Ghost Bar & Variance Badge */}
                          {baselineItemMap && (() => {
                            const baseItem = baselineItemMap.get(item.id);
                            if (!baseItem) return null;
                            const baseStartOffset = differenceInCalendarDays(
                              parseDateSafe(baseItem.startDate),
                              timelineStart
                            );
                            const baseDur = Math.max(
                              1,
                              differenceInCalendarDays(
                                parseDateSafe(baseItem.endDate),
                                parseDateSafe(baseItem.startDate)
                              ) + 1
                            );
                            const baseLeftPx = baseStartOffset * dayWidth - (barLeft + smoothMoveOffsetX);
                            const baseWidthPx = Math.max(6, baseDur * dayWidth);
                            const varianceDays = differenceInCalendarDays(
                              parseDateSafe(item.endDate),
                              parseDateSafe(baseItem.endDate)
                            );
                            return (
                              <>
                                <div
                                  data-testid={`timeline-baseline-bar-${item.id}`}
                                  style={{ left: baseLeftPx, width: baseWidthPx }}
                                  title={`Línea base (${baselineSnapshot?.label || 'Commit'}): ${formatDateDisplay(
                                    baseItem.startDate,
                                    'dd MMM'
                                  )} → ${formatDateDisplay(baseItem.endDate, 'dd MMM yyyy')}`}
                                  className="absolute -bottom-2 h-1.5 rounded-[2px] bg-slate-400/80 dark:bg-zinc-500/80 border border-slate-500/50 dark:border-zinc-400/40 pointer-events-none"
                                />
                                {varianceDays !== 0 && (
                                  <span
                                    data-testid={`timeline-baseline-variance-${item.id}`}
                                    className={`ml-2 px-1.5 py-0.2 rounded-[3px] text-[9px] font-mono font-bold whitespace-nowrap pointer-events-none ${
                                      varianceDays > 0
                                        ? 'bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                        : 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                    }`}
                                    title={`Desviación respecto a línea base: ${
                                      varianceDays > 0 ? `+${varianceDays}d retraso` : `${varianceDays}d adelanto`
                                    }`}
                                  >
                                    {varianceDays > 0 ? `+${varianceDays}d` : `${varianceDays}d`}
                                  </span>
                                )}
                              </>
                            );
                          })()}

                          {/* Right End Dependency Connector Port (Fin: FS / FF desde origen, FF / SF como destino) */}
                          <button
                            type="button"
                            data-dep-port-out={item.id}
                            data-dep-port-role="out"
                            onMouseDown={(e) =>
                              handleStartDependencyDrag(e, {
                                mode: 'create',
                                originPort: 'out',
                                fixedItemId: item.id,
                              })
                            }
                            onClick={(e) => e.stopPropagation()}
                            title="Punto de Fin (F): arrastra para crear FS/FF o suelta aquí para FF/SF sin mover fechas"
                            className={`absolute -right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-600 hover:bg-indigo-500 hover:scale-125 shadow-sm transition-all cursor-crosshair z-30 ${
                              showPortHandles
                                ? 'opacity-100 scale-105'
                                : 'opacity-0 group-hover:opacity-100'
                            } ${
                              isEndDropTarget
                                ? isDepDropValid
                                  ? 'ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100'
                                  : 'ring-2 ring-rose-400 bg-rose-500 scale-125 opacity-100'
                                : isEndConnectSource
                                ? 'ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100'
                                : ''
                            }`}
                          />
                        </div>

                        {/* SLACK / HOLGURA GHOST BAR EXTENSION */}
                        {slackWidth > 0 && (
                          <div
                            data-testid={`timeline-slack-bar-${item.id}`}
                            style={{
                              width: slackWidth,
                              backgroundImage:
                                'repeating-linear-gradient(45deg, rgba(245, 158, 11, 0.22) 0px, rgba(245, 158, 11, 0.22) 5px, transparent 5px, transparent 10px)',
                            }}
                            onClick={() => guardedEditModal(item)}
                            title={`Holgura (Slack): +${totalSlackDays} día(s) hasta el ${formatDateDisplay(
                              effectiveSlackEndDateStr,
                              'dd MMM yyyy'
                            )}${
                              item.hasSuccessors
                                ? item.drivingSuccessorName
                                  ? ` (limitada por «${item.drivingSuccessorName}»)`
                                  : ' (según tareas siguientes)'
                                : ' (sin tareas siguientes directas)'
                            }`}
                            className="h-6 -ml-0.5 rounded-r-lg border-y border-r border-dashed border-amber-500/80 dark:border-amber-400/80 flex items-center justify-center px-1.5 cursor-pointer hover:bg-amber-500/10 transition"
                          >
                            <span className="font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-300 truncate">
                              +{totalSlackDays}d slack
                            </span>
                          </div>
                        )}
                      </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Floating Banner when Click-to-Connect or Click-to-Reconnect Mode is Active */}
        {(connectModeSource || reconnectMode) && (
          <div
            id="gantt-connect-mode-banner"
            data-connect-mode-source={
              connectModeSource?.itemId ||
              `${reconnectMode?.oldPredId}->${reconnectMode?.oldSuccId}`
            }
            onClick={(e) => e.stopPropagation()}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium shadow-xl border border-indigo-400/60"
          >
            <GitBranch className="w-4 h-4 shrink-0" />
            {connectModeSource ? (
              <span>
                Modo conexión desde{' '}
                <strong>
                  #
                  {enrichedItemById.get(connectModeSource.itemId)?.wbsCode ||
                    enrichedItemById.get(connectModeSource.itemId)?.wbs}{' '}
                  {enrichedItemById.get(connectModeSource.itemId)?.name}{' '}
                  (
                  {(connectModeSource.port ||
                    (connectModeSource.role === 'succ' ? 'start' : 'end')) ===
                  'start'
                    ? 'Inicio'
                    : 'Fin'}
                  )
                </strong>{' '}
                — Haz clic en el punto Inicio o Fin de la tarea destino (solo sin mover fechas)
              </span>
            ) : (
              <span>
                Reconectando{' '}
                <strong>
                  {reconnectMode?.endpoint === 'source'
                    ? 'origen (predecesora)'
                    : 'destino (sucesora)'}
                </strong>{' '}
                de la dependencia — Haz clic en la nueva tarea del diagrama
              </span>
            )}
            <button
              type="button"
              data-cancel-connect-mode="true"
              onClick={() => {
                setConnectModeSource(null);
                setReconnectMode(null);
              }}
              className="px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold transition cursor-pointer"
            >
              Cancelar (Esc)
            </button>
          </div>
        )}

        {/* Inline Toast Feedback for Dependency Actions & Cycle Validation */}
        {depFeedback && (
          <div
            id="gantt-dep-feedback-toast"
            data-dep-feedback-toast={depFeedback.tone}
            className={`absolute bottom-3 right-3 z-40 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xl border transition-all ${
              depFeedback.tone === 'error'
                ? 'bg-rose-600 text-white border-rose-400'
                : depFeedback.tone === 'success'
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-slate-800 text-white border-slate-700'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 shrink-0" />
            <span>{depFeedback.message}</span>
          </div>
        )}

        {/* Interactive Dependency Popover / Inspector when a Dependency Arrow is Selected */}
        {selectedDepLink &&
          (() => {
            const predItem = enrichedItemById.get(selectedDepLink.predId);
            const succItem = enrichedItemById.get(selectedDepLink.succId);
            if (
              !predItem ||
              !succItem ||
              !succItem.dependencies.includes(predItem.id)
            ) {
              return null;
            }
            const currentDepType: DependencyType =
              succItem.dependencyTypes?.[predItem.id] || 'FS';
            const itemsWithoutCurrentLink = removeDependencyLink(
              items,
              predItem.id,
              succItem.id,
              false
            ).items;

            return (
              <aside
                ref={depPopoverRef}
                id="gantt-dependency-popover"
                data-selected-dependency={`${predItem.id}->${succItem.id}`}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute top-3 right-3 z-40 w-80 max-w-[calc(100%-24px)] bg-white dark:bg-[#0C0C09] rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 shadow-xl p-3.5 text-xs flex flex-col gap-3 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#E2E2DC] dark:border-zinc-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-[4px] bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] shrink-0">
                      <GitBranch className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          #{predItem.wbsCode || predItem.wbs} → #
                          {succItem.wbsCode || succItem.wbs}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-mono text-[10px] font-bold">
                          {currentDepType}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5 text-sm">
                        Editar / Mover Dependencia
                      </h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-close-dep-popover="true"
                    onClick={() => {
                      setSelectedDepLink(null);
                      setReconnectMode(null);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition shrink-0 cursor-pointer"
                    title="Cerrar inspector de dependencia"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Move Source (Predecessor) */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Tarea Origen (Predecesora)
                    </label>
                    <button
                      type="button"
                      data-dep-reconnect-source-btn="true"
                      onClick={() =>
                        setReconnectMode({
                          oldPredId: predItem.id,
                          oldSuccId: succItem.id,
                          endpoint: 'source',
                          depType: currentDepType,
                        })
                      }
                      className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      title="Haz clic aquí y luego en otra tarea del diagrama para cambiar el origen"
                    >
                      Elegir en diagrama
                    </button>
                  </div>
                  <select
                    data-dep-move-pred-select="true"
                    value={predItem.id}
                    onChange={(e) => {
                      const nextPredId = e.target.value;
                      if (nextPredId && nextPredId !== predItem.id) {
                        commitMoveDependency(
                          predItem.id,
                          succItem.id,
                          nextPredId,
                          succItem.id,
                          currentDepType
                        );
                      }
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {items
                      .filter((it) => it.id !== succItem.id)
                      .map((candidate) => {
                        const enriched = enrichedItemById.get(candidate.id) || candidate;
                        const createsCycle = wouldCreateCycle(
                          itemsWithoutCurrentLink,
                          succItem.id,
                          candidate.id
                        );
                        const isDuplicate =
                          candidate.id !== predItem.id &&
                          succItem.dependencies.includes(candidate.id);
                        return (
                          <option
                            key={candidate.id}
                            value={candidate.id}
                            disabled={createsCycle || isDuplicate}
                          >
                            #{enriched.wbsCode || enriched.wbs} {enriched.name}
                            {createsCycle
                              ? ' (Ciclo)'
                              : isDuplicate
                              ? ' (Ya conectada)'
                              : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>

                {/* Move Target (Successor) */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Tarea Destino (Sucesora)
                    </label>
                    <button
                      type="button"
                      data-dep-reconnect-target-btn="true"
                      onClick={() =>
                        setReconnectMode({
                          oldPredId: predItem.id,
                          oldSuccId: succItem.id,
                          endpoint: 'target',
                          depType: currentDepType,
                        })
                      }
                      className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      title="Haz clic aquí y luego en otra tarea del diagrama para cambiar el destino"
                    >
                      Elegir en diagrama
                    </button>
                  </div>
                  <select
                    data-dep-move-succ-select="true"
                    value={succItem.id}
                    onChange={(e) => {
                      const nextSuccId = e.target.value;
                      if (nextSuccId && nextSuccId !== succItem.id) {
                        commitMoveDependency(
                          predItem.id,
                          succItem.id,
                          predItem.id,
                          nextSuccId,
                          currentDepType
                        );
                      }
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {items
                      .filter((it) => it.id !== predItem.id)
                      .map((candidate) => {
                        const enriched = enrichedItemById.get(candidate.id) || candidate;
                        const createsCycle = wouldCreateCycle(
                          itemsWithoutCurrentLink,
                          candidate.id,
                          predItem.id
                        );
                        const isDuplicate =
                          candidate.id !== succItem.id &&
                          candidate.dependencies.includes(predItem.id);
                        return (
                          <option
                            key={candidate.id}
                            value={candidate.id}
                            disabled={createsCycle || isDuplicate}
                          >
                            #{enriched.wbsCode || enriched.wbs} {enriched.name}
                            {createsCycle
                              ? ' (Ciclo)'
                              : isDuplicate
                              ? ' (Ya conectada)'
                              : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>

                {/* Dependency Type Selector (FS, SS, FF, SF) */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Tipo de Relación
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: 'FS', label: 'FS', desc: 'Fin → Inicio' },
                        { id: 'SS', label: 'SS', desc: 'Inicio → Inicio' },
                        { id: 'FF', label: 'FF', desc: 'Fin → Fin' },
                        { id: 'SF', label: 'SF', desc: 'Inicio → Fin' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        data-dep-type-btn={opt.id}
                        onClick={() =>
                          commitUpdateDependencyType(
                            predItem.id,
                            succItem.id,
                            opt.id
                          )
                        }
                        title={opt.desc}
                        className={`py-1 px-1.5 rounded-lg border font-mono text-[10px] font-bold transition cursor-pointer ${
                          currentDepType === opt.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delete Dependency Action */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400">
                    O arrastra los extremos de la flecha
                  </span>
                  <button
                    type="button"
                    data-dep-delete-btn="true"
                    onClick={() =>
                      commitRemoveDependency(predItem.id, succItem.id)
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Dependencia</span>
                  </button>
                </div>
              </aside>
            );
          })()}

        {/* Non-intrusive Top-Right Docked Inspection Panel on Click (when not using App's RightSidePanel) */}
        {!useRightSidebarInspector && selectedItem && (
          <aside
            ref={inspectionPanelRef}
            id="gantt-inspection-panel"
            data-selected-item-id={selectedItem.id}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute top-3 right-3 z-40 w-80 max-w-[calc(100%-24px)] bg-white dark:bg-[#0C0C09] rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 shadow-xl p-3.5 text-xs flex flex-col gap-2.5 transition-all"
          >
            {/* Panel Header: ID, Tipo, Crítica, EQUIPO, Cerrar y Nombre */}
            {(() => {
              const selectedEffectiveColor = getItemEffectiveColor(selectedItem);
              return (
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#E2E2DC] dark:border-zinc-800">
                  <div className="flex items-center gap-2 min-w-0">
                    {selectedItem.type === 'milestone' ? (
                      <Diamond
                        className={`w-4 h-4 ${
                          (COLOR_STYLES[selectedEffectiveColor] || COLOR_STYLES.amber).diamondText
                        } fill-current shrink-0`}
                      />
                    ) : (
                      <span
                        className={`w-3 h-3 rounded-[2px] shrink-0 ${
                          COLOR_STYLES[selectedEffectiveColor]?.badge || 'bg-indigo-500'
                        }`}
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                          #{selectedItem.wbsCode || selectedItem.wbs}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-[2px] border ${
                            selectedItem.type === 'milestone'
                              ? (COLOR_STYLES[selectedEffectiveColor] || COLOR_STYLES.amber).diamondPill
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                          }`}
                        >
                          {selectedItem.type === 'milestone' ? 'Hito' : 'Tarea'}
                        </span>
                        {selectedItem.isCritical && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center gap-0.5 border border-rose-500/20">
                            <Flame className="w-3 h-3 fill-current" />
                            Crítica
                          </span>
                        )}
                        {selectedItem.assignee && (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] font-medium border shrink-0 ${
                              (TEAM_BADGE_STYLES[selectedEffectiveColor] || TEAM_BADGE_STYLES.indigo).container
                            }`}
                            title={`Equipo: ${selectedItem.assignee}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                (TEAM_BADGE_STYLES[selectedEffectiveColor] || TEAM_BADGE_STYLES.indigo).dot
                              }`}
                            />
                            <span className="truncate">{selectedItem.assignee}</span>
                          </span>
                        )}
                        {selectedItem.hidden && (
                          <span
                            data-testid={`panel-hidden-badge-${selectedItem.id}`}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-[2px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                          >
                            Oculta en diagrama
                          </span>
                        )}
                        {(() => {
                          const itemProj = projects.find((p) => p.id === selectedItem.projectId);
                          const effRelId = selectedItem.releaseId || itemProj?.releaseId;
                          const effRel = effRelId ? releases?.find((r) => r.id === effRelId) : undefined;
                          if (!effRel) return null;
                          return (
                            <span
                              data-testid={`panel-release-badge-${selectedItem.id}`}
                              className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-[2px] border bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20"
                              title={`Release: ${effRel.code}${
                                selectedItem.releaseId
                                  ? ' (específica de la tarea)'
                                  : ' (heredada del proyecto)'
                              }`}
                            >
                              {effRel.code}
                            </span>
                          );
                        })()}
                        {(() => {
                          const itemProj = projects.find((p) => p.id === selectedItem.projectId);
                          const effPlatform = normalizePlatform(
                            selectedItem.platform || itemProj?.platform
                          );
                          if (!effPlatform) return null;
                          return (
                            <span
                              data-testid={`panel-platform-badge-${selectedItem.id}`}
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-[2px] border ${
                                effPlatform === 'iOS'
                                  ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
                                  : effPlatform === 'Android'
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                  : 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20'
                              }`}
                              title={`Plataforma: ${effPlatform}${
                                selectedItem.platform
                                  ? ' (específica de la tarea)'
                                  : ' (heredada del proyecto)'
                              }`}
                            >
                              {effPlatform}
                            </span>
                          );
                        })()}
                      </div>
                      <h4
                        className="font-bold text-[#0C0C09] dark:text-zinc-100 mt-1 text-sm leading-tight break-words"
                        title={selectedItem.name}
                      >
                        {selectedItem.name}
                      </h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-close-inspection-panel="true"
                    onClick={() => {
                      setSelectedItemId(null);
                      onSelectEntity?.(null);
                    }}
                    className="p-1 rounded-[2px] hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-[#0C0C09] dark:hover:text-white transition shrink-0 cursor-pointer"
                    title="Cerrar panel de detalles"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })()}

            {selectedItem.hasConflict && (
              <div
                data-testid={`panel-conflict-alert-${selectedItem.id}`}
                className="flex items-start gap-2 p-2.5 rounded-[4px] bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-[11px]"
              >
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Conflicto de dependencia</span>
                  <span>
                    {selectedItem.conflictMessage ||
                      'La fecha inicial es anterior a la fecha final de sus tareas predecesoras.'}
                  </span>
                </div>
              </div>
            )}

            {/* Descripción / Notas (Inmediatamente después del nombre) */}
            <div className="flex flex-col gap-1 p-2.5 rounded-[4px] bg-[#F4F4F1]/60 dark:bg-zinc-900/60 border border-[#E2E2DC] dark:border-zinc-800 text-[11px]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 font-bold">
                Descripción / Notas
              </span>
              <p
                className={`text-xs ${
                  selectedItem.notes?.trim()
                    ? 'text-[#0C0C09] dark:text-zinc-200 whitespace-pre-wrap'
                    : 'text-[#6B6B66]/80 dark:text-zinc-500 italic'
                }`}
              >
                {selectedItem.notes?.trim() || 'Sin descripción ni notas registradas.'}
              </p>
            </div>

            {/* Fechas, Duración y Progreso */}
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-800 font-mono text-[11px]">
              <div>
                <span className="text-[#6B6B66] dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider block">
                  Inicio
                </span>
                <span className="font-semibold text-[#0C0C09] dark:text-zinc-200">
                  {formatDateDisplay(selectedItem.startDate, 'dd MMM yyyy')}
                </span>
              </div>
              <div>
                <span className="text-[#6B6B66] dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider block">
                  Fin
                </span>
                <span className="font-semibold text-[#0C0C09] dark:text-zinc-200">
                  {selectedItem.type === 'milestone'
                    ? '-'
                    : formatDateDisplay(selectedItem.endDate, 'dd MMM yyyy')}
                </span>
              </div>
              <div>
                <span className="text-[#6B6B66] dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider block">
                  Duración
                </span>
                <span className="font-semibold text-[#0C0C09] dark:text-zinc-200">
                  {selectedItem.duration}d{selectedItem.slack > 0 ? ` (+${selectedItem.slack}d)` : ''}
                </span>
              </div>
              <div>
                <span className="text-[#6B6B66] dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider block">
                  Progreso
                </span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {selectedItem.progress}%
                </span>
              </div>
            </div>

            {/* Holgura Libre (Slack) y Tareas Siguientes */}
            <div className="flex flex-col gap-1.5 p-2.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-800 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 font-bold">
                  Holgura Libre (Slack)
                </span>
                <span
                  data-testid={`panel-free-slack-${selectedItem.id}`}
                  className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded-[2px] ${
                    selectedItem.freeSlack < 0
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      : selectedItem.freeSlack === 0
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                  }`}
                >
                  {selectedItem.freeSlack > 0 ? `+${selectedItem.freeSlack}d` : `${selectedItem.freeSlack}d`}
                  {selectedItem.freeSlack === 0 && ' (Crítica)'}
                </span>
              </div>

              {/* Tareas Siguientes (Sucesoras) */}
              <div className="pt-1 border-t border-[#E2E2DC]/70 dark:border-zinc-800/70">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 font-semibold block mb-1">
                  Tareas Siguientes ({selectedItem.successorIds?.length || 0}):
                </span>
                {selectedItem.successorIds && selectedItem.successorIds.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {selectedItem.successorIds.map((succId) => {
                      const succItem = items.find((it) => it.id === succId);
                      const isDriving = succId === selectedItem.drivingSuccessorId;
                      return (
                        <div
                          key={succId}
                          data-testid={`panel-successor-item-${succId}`}
                          onClick={() => setSelectedItemId(succId)}
                          className={`flex items-center justify-between px-2 py-1 rounded-[3px] text-[11px] cursor-pointer transition ${
                            isDriving
                              ? 'bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20'
                              : 'bg-white dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700 hover:bg-[#F4F4F1] dark:hover:bg-zinc-700'
                          }`}
                          title={`Clic para inspeccionar esta tarea siguiente. ${isDriving ? 'Esta tarea limita el slack libre.' : ''}`}
                        >
                          <span className="truncate max-w-[170px] font-medium">
                            {succItem ? succItem.name : `#${succId}`}
                          </span>
                          {isDriving && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold">
                              Límite
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-[10px] text-[#6B6B66] dark:text-zinc-400 italic">
                    Sin tareas siguientes directas (holgura calculada hasta fin de proyecto: +{selectedItem.freeSlack}d).
                  </span>
                )}
              </div>
            </div>

            {/* Actions: Toggle Diagram Visibility & Edit button */}
            {selectedGroup?.project.locked && (
              <div className="flex items-center justify-between gap-2 px-2 py-1 rounded-[3px] bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-[10px] text-amber-900 dark:text-amber-200">
                <span className="flex items-center gap-1 font-semibold">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>Proyecto bloqueado</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleProjectLock(selectedGroup.project, false)}
                  className="font-bold underline hover:text-amber-700 dark:hover:text-amber-100 cursor-pointer"
                >
                  Desbloquear
                </button>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E2E2DC] dark:border-zinc-800">
              <button
                type="button"
                data-testid={`panel-toggle-task-visibility-${selectedItem.id}`}
                onClick={() => {
                  guardedUpdateItem({ ...selectedItem, hidden: !selectedItem.hidden }, false);
                }}
                className={`px-2 py-1 rounded-[3px] border text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  selectedItem.hidden
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
                    : 'border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-700'
                }`}
                title={selectedItem.hidden ? 'Mostrar en el diagrama' : 'Ocultar del diagrama'}
              >
                {selectedItem.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{selectedItem.hidden ? 'Mostrar en diagrama' : 'Ocultar en diagrama'}</span>
              </button>
              {onSetFocusEntity && (() => {
                const isCurrentTaskFocused =
                  isFocusMode && focusEntity?.type === 'task' && focusEntity?.id === selectedItem.id;
                return (
                  <button
                    type="button"
                    data-testid="panel-focus-mode-btn"
                    onClick={() => {
                      if (isCurrentTaskFocused) {
                        onExitFocusMode ? onExitFocusMode() : onSetFocusEntity(null);
                      } else {
                        onSetFocusEntity({
                          type: 'task',
                          id: selectedItem.id,
                          name: selectedItem.name,
                        });
                      }
                    }}
                    className={`px-2 py-1 rounded-[3px] border text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer ${
                      isCurrentTaskFocused
                        ? 'bg-amber-400 border-amber-500 text-black font-bold ring-1 ring-amber-300 shadow-xs'
                        : 'border-indigo-400/40 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                    }`}
                    title={
                      isCurrentTaskFocused
                        ? 'Salir de la modalidad enfoque (clic o tecla ESC)'
                        : 'Aislar y enfocar esta tarea y su cadena de dependencias'
                    }
                  >
                    <Sparkles
                      className={`w-3.5 h-3.5 ${isCurrentTaskFocused ? 'text-black fill-current' : 'text-indigo-600 dark:text-indigo-400'}`}
                    />
                    <span>{isCurrentTaskFocused ? 'Enfocado (Salir)' : 'Enfoque'}</span>
                  </button>
                );
              })()}
              <button
                type="button"
                onClick={() => {
                  const target = selectedItem;
                  if (!guardItemUnlocked(target, `editar «${target.name}»`)) return;
                  onEditModal(target);
                  setSelectedItemId(null);
                }}
                className="px-2.5 py-1 rounded-[4px] bg-[#0C0C09] hover:bg-black/80 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Ítem</span>
              </button>
            </div>
          </aside>
        )}

        {/* Project Information & Description Modal */}
        {inspectingProject && (
          <div
            role="dialog"
            aria-modal="true"
            data-testid="project-details-modal"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setInspectingProject(null);
              }
            }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-[#0C0C09] border border-[#0C0C09] dark:border-zinc-700 rounded-[8px] shadow-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#E2E2DC] dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold text-white shrink-0 ${
                      COLOR_STYLES[inspectingProject.color]?.badge || 'bg-indigo-500'
                    }`}
                  >
                    Proyecto
                  </span>
                  <h3 className="text-sm font-bold text-[#0C0C09] dark:text-white truncate">
                    {inspectingProject.name}
                  </h3>
                </div>
                <button
                  type="button"
                  data-testid="close-project-modal-btn"
                  onClick={() => setInspectingProject(null)}
                  className="p-1 rounded-[4px] hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-[#0C0C09] dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Editable Name & Color */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Nombre del Proyecto
                  </label>
                  <input
                    type="text"
                    data-testid="project-modal-name-input"
                    value={inspectingProject.name}
                    onChange={(e) =>
                      setInspectingProject({
                        ...inspectingProject,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-[#0C0C09] dark:text-zinc-100 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 mb-1.5">
                    Color del Proyecto
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() =>
                          setInspectingProject({
                            ...inspectingProject,
                            color: c.value,
                          })
                        }
                        data-testid={`project-color-opt-${c.value}`}
                        title={c.value}
                        className={`w-6 h-6 rounded-full ${c.bg} flex items-center justify-center transition cursor-pointer ${
                          inspectingProject.color === c.value
                            ? 'ring-2 ring-offset-2 ring-[#0C0C09] dark:ring-white scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {inspectingProject.color === c.value && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                  {onChangeProjectColor && (
                    <button
                      type="button"
                      data-testid="apply-color-to-all-tasks-modal-btn"
                      onClick={() => {
                        guardedChangeProjectColor(inspectingProject.id, inspectingProject.color);
                      }}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[4px] border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>Aplicar este color a todas las tareas del proyecto</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Bloqueo en el Cronograma
                  </label>
                  <button
                    type="button"
                    data-testid="project-modal-lock-toggle"
                    onClick={() =>
                      setInspectingProject({
                        ...inspectingProject,
                        locked: !inspectingProject.locked,
                      })
                    }
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[4px] border text-xs font-semibold transition cursor-pointer ${
                      inspectingProject.locked
                        ? 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200'
                        : 'border-[#E2E2DC] dark:border-zinc-700 bg-[#F4F4F1]/60 dark:bg-zinc-800/70 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {inspectingProject.locked ? (
                        <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <Unlock className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                      )}
                      <span>
                        {inspectingProject.locked
                          ? 'Proyecto bloqueado (evita movimientos accidentales)'
                          : 'Proyecto desbloqueado (editable libremente)'}
                      </span>
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/80 dark:bg-zinc-900 border border-current/20">
                      {inspectingProject.locked ? 'Desbloquear' : 'Bloquear'}
                    </span>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Release Asociada
                  </label>
                  <select
                    data-testid="project-modal-release-select"
                    value={inspectingProject.releaseId || ''}
                    onChange={(e) =>
                      setInspectingProject({
                        ...inspectingProject,
                        releaseId: e.target.value || undefined,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-[#0C0C09] dark:text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Ninguna (Sin Release asignada)</option>
                    {releases?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code} {r.name ? `— ${r.name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Plataforma
                  </label>
                  <select
                    data-testid="project-modal-platform-select"
                    value={normalizePlatform(inspectingProject.platform) || 'iOS/Android'}
                    onChange={(e) =>
                      setInspectingProject({
                        ...inspectingProject,
                        platform: e.target.value as ProjectPlatform,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-[#0C0C09] dark:text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  >
                    <option value="iOS/Android">iOS/Android</option>
                    <option value="iOS">iOS</option>
                    <option value="Android">Android</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Nivel de Alerta
                  </label>
                  <select
                    data-testid="project-modal-alert-select"
                    value={inspectingProject.alertLevel ?? 0}
                    onChange={(e) =>
                      setInspectingProject({
                        ...inspectingProject,
                        alertLevel: Number(e.target.value) as ProjectAlertLevel,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-[#0C0C09] dark:text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                  >
                    <option value={0}>Nivel 0 — Normal (Sin alerta)</option>
                    <option value={1}>Nivel 1 — Baja (Alerta leve)</option>
                    <option value={2}>Nivel 2 — Media (Alerta moderada)</option>
                    <option value={3}>Nivel 3 — Alta (Alerta crítica)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Información / Descripción del Proyecto
                  </label>
                  <textarea
                    rows={4}
                    data-testid="project-modal-description-input"
                    value={inspectingProject.description || ''}
                    onChange={(e) =>
                      setInspectingProject({
                        ...inspectingProject,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe los objetivos del proyecto, alcance, entregables clave, notas o enlaces de documentación..."
                    className="w-full px-3 py-2 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-[#0C0C09] dark:text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500 resize-y min-h-[68px]"
                  />
                </div>
              </div>

              {/* Project stats overview */}
              {(() => {
                const grp = allProjectGroups.find((g) => g.project.id === inspectingProject.id);
                if (!grp) return null;
                return (
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-800 text-[11px] font-mono">
                    <div>
                      <span className="text-[#6B6B66] dark:text-zinc-400 block text-[10px] uppercase font-bold">
                        Fechas
                      </span>
                      <span className="font-semibold text-[#0C0C09] dark:text-zinc-200">
                        {grp.items.length > 0
                          ? `${formatDateDisplay(grp.startDate, 'dd/MM/yy')} → ${formatDateDisplay(grp.endDate, 'dd/MM/yy')}`
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B6B66] dark:text-zinc-400 block text-[10px] uppercase font-bold">
                        Duración
                      </span>
                      <span className="font-semibold text-[#0C0C09] dark:text-zinc-200">
                        {grp.duration}d ({grp.items.length} ítems)
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B6B66] dark:text-zinc-400 block text-[10px] uppercase font-bold">
                        Progreso
                      </span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {grp.progress}%
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E2E2DC] dark:border-zinc-800">
                {onSetFocusEntity && (() => {
                  const isCurrentProjFocused =
                    isFocusMode && focusEntity?.type === 'project' && focusEntity?.id === inspectingProject.id;
                  return (
                    <button
                      type="button"
                      data-testid="project-modal-focus-btn"
                      onClick={() => {
                        if (isCurrentProjFocused) {
                          onExitFocusMode ? onExitFocusMode() : onSetFocusEntity(null);
                        } else {
                          onSetFocusEntity({
                            type: 'project',
                            id: inspectingProject.id,
                            name: inspectingProject.name,
                          });
                        }
                        setInspectingProject(null);
                      }}
                      className={`px-2.5 py-1.5 rounded-[4px] border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        isCurrentProjFocused
                          ? 'bg-amber-400 border-amber-500 text-black font-bold ring-1 ring-amber-300 shadow-xs'
                          : 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                      }`}
                      title={
                        isCurrentProjFocused
                          ? 'Salir de la modalidad enfoque (clic o tecla ESC)'
                          : 'Enfocar este proyecto en el diagrama Gantt'
                      }
                    >
                      <Sparkles
                        className={`w-3.5 h-3.5 ${isCurrentProjFocused ? 'text-black fill-current' : 'text-indigo-600 dark:text-indigo-400'}`}
                      />
                      <span>{isCurrentProjFocused ? 'Salir de Enfoque' : 'Modo Enfoque'}</span>
                    </button>
                  );
                })()}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setInspectingProject(null)}
                    className="px-3 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    data-testid="save-project-details-btn"
                    onClick={() => {
                      const savedProj = projectsRef.current.find(
                        (p) => p.id === inspectingProject.id
                      );
                      const hasNonLockEdits =
                        !savedProj ||
                        savedProj.name !== inspectingProject.name ||
                        savedProj.color !== inspectingProject.color ||
                        (savedProj.releaseId || '') !== (inspectingProject.releaseId || '') ||
                        (savedProj.platform || '') !== (inspectingProject.platform || '') ||
                        (savedProj.alertLevel ?? 0) !== (inspectingProject.alertLevel ?? 0) ||
                        (savedProj.description || '') !== (inspectingProject.description || '');
                      if (savedProj?.locked && inspectingProject.locked) {
                        if (hasNonLockEdits) {
                          guardedUpdateProject(
                            inspectingProject,
                            'editar propiedades de proyecto bloqueado'
                          );
                          return;
                        }
                        setInspectingProject(null);
                        return;
                      }
                      onUpdateProject?.(inspectingProject);
                      setInspectingProject(null);
                    }}
                    className="px-4 py-1.5 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] font-medium text-xs transition cursor-pointer"
                  >
                    Guardar Información
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {hasMultiSelection && (
          <div
            data-testid="multi-select-action-bar"
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 rounded-[6px] border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm shadow-lg text-xs"
          >
            <div className="flex items-center gap-1.5 pr-2 border-r border-zinc-200 dark:border-zinc-700">
              <MoveHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                {effectiveMultiItemIds.size} {effectiveMultiItemIds.size === 1 ? 'tarea' : 'tareas'}
                {multiSelectedProjectIds.size > 0
                  ? ` · ${multiSelectedProjectIds.size} ${
                      multiSelectedProjectIds.size === 1 ? 'proyecto' : 'proyectos'
                    }`
                  : ''}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {[
                { label: '-7d', days: -7 },
                { label: '-1d', days: -1 },
                { label: '+1d', days: 1 },
                { label: '+7d', days: 7 },
              ].map((step) => (
                <button
                  key={step.label}
                  type="button"
                  data-testid={`multi-shift-${step.days}`}
                  onClick={() =>
                    shiftItemsByDays(
                      effectiveMultiItemIds,
                      step.days,
                      `mover selección múltiple (${step.label})`
                    )
                  }
                  disabled={effectiveMultiItemIds.size === 0}
                  title={`Desplazar selección ${step.label}`}
                  className="px-2 py-1 rounded-[4px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 dark:hover:bg-indigo-950/50 dark:hover:border-indigo-700 dark:hover:text-indigo-300 font-mono text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 disabled:opacity-40 transition cursor-pointer"
                >
                  {step.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              data-testid="multi-select-clear"
              onClick={clearMultiSelection}
              className="ml-1 px-2 py-1 rounded-[4px] text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Limpiar
            </button>
          </div>
        )}

        {dragRowPreview && (() => {
          const enrichedDragged = enrichedItemById.get(dragRowPreview.itemId);
          const draggedItem =
            enrichedDragged ||
            effectiveItems.find((it) => it.id === dragRowPreview.itemId) ||
            items.find((it) => it.id === dragRowPreview.itemId);
          if (!draggedItem) return null;

          const draggedEffectiveColor = getItemEffectiveColor(draggedItem);
          const draggedStyleTheme = COLOR_STYLES[draggedEffectiveColor] || COLOR_STYLES.indigo;
          const draggedWbsLabel = enrichedDragged?.wbsCode || `${draggedItem.wbs}.`;

          const sourceGroup = allProjectGroups.find((g) =>
            g.items.some((it) => it.id === draggedItem.id)
          );
          const sourceProjectId =
            sourceGroup?.project.id || draggedItem.projectId || projects[0]?.id;
          let targetProjId: string | undefined;
          if (dragOverRow) {
            if (dragOverRow.id.startsWith('project:')) {
              targetProjId = dragOverRow.id.slice('project:'.length);
            } else {
              const targetItem = items.find((it) => it.id === dragOverRow.id);
              targetProjId = targetItem?.projectId || projects[0]?.id;
            }
          }
          const targetProjectName =
            targetProjId && targetProjId !== sourceProjectId
              ? projects.find((p) => p.id === targetProjId)?.name || null
              : null;

          const previewItems =
            draggingMultiRowIds && draggingMultiRowIds.size > 1
              ? displayRows
                  .filter(
                    (r): r is Extract<(typeof displayRows)[number], { kind: 'item' }> =>
                      r.kind === 'item' && draggingMultiRowIds.has(r.item.id)
                  )
                  .map((r) => r.item)
              : [draggedItem];

          return (
            <div
              data-testid="task-row-drag-ghost"
              data-dragging-item-id={draggedItem.id}
              className="fixed top-0 left-0 pointer-events-none z-[100] select-none"
              style={{
                width: dragRowPreview.width,
                transform: `translate3d(${Math.round(dragRowPreview.x - dragRowPreview.offsetX)}px, ${Math.round(dragRowPreview.y - dragRowPreview.offsetY)}px, 0)`,
                willChange: 'transform',
              }}
            >
              <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-2 border-indigo-600 dark:border-indigo-400 rounded-[6px] shadow-2xl ring-4 ring-indigo-500/15 overflow-hidden divide-y divide-indigo-100 dark:divide-zinc-800">
                {previewItems.map((pItem, pIdx) => {
                  const pColor = getItemEffectiveColor(pItem);
                  const pTheme = COLOR_STYLES[pColor] || COLOR_STYLES.indigo;
                  const pWbsLabel =
                    enrichedItemById.get(pItem.id)?.wbsCode || `${pItem.wbs}.`;
                  return (
                    <div
                      key={`ghost-item-${pItem.id}`}
                      style={{ height: ROW_HEIGHT }}
                      className="px-3 flex items-center gap-2 text-xs"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-300 border border-[#E2E2DC] dark:border-zinc-700 shrink-0 font-semibold">
                        {pWbsLabel}
                      </span>
                      {pItem.type === 'milestone' ? (
                        <Diamond className={`w-3.5 h-3.5 ${pTheme.diamondText} fill-current shrink-0`} />
                      ) : (
                        <span className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${pTheme.badge}`} />
                      )}
                      <span className="font-semibold text-[#0C0C09] dark:text-zinc-100 truncate flex-1">
                        {pItem.name || (pItem.type === 'milestone' ? 'Hito' : 'Tarea')}
                      </span>
                      {pIdx === 0 && previewItems.length > 1 && (
                        <span
                          data-testid="task-row-drag-ghost-count"
                          className="px-1.5 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px] font-bold shrink-0"
                        >
                          {previewItems.length} tareas
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-[#6B6B66] dark:text-zinc-300 bg-[#F4F4F1] dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                        {formatDateDisplay(pItem.startDate, 'dd MMM')}
                        {pItem.type === 'task' ? ` · ${pItem.duration}d` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
              {targetProjectName && (
                <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-semibold shadow-lg">
                  {`→ Mover a: ${targetProjectName}`}
                </div>
              )}
            </div>
          );
        })()}

        {dragProjectPreview && (() => {
          const draggedGroup = allProjectGroups.find(
            (g) => g.project.id === dragProjectPreview.projectId
          );
          const draggedProject =
            draggedGroup?.project ||
            projects.find((p) => p.id === dragProjectPreview.projectId);
          if (!draggedProject) return null;

          const draggedProjTheme =
            COLOR_STYLES[draggedProject.color] || COLOR_STYLES.indigo;
          const projectBadgeLabel =
            draggedGroup?.projectIndex != null
              ? `P${draggedGroup.projectIndex}`
              : typeof draggedProject.projectIndex === 'number'
              ? `P${draggedProject.projectIndex}`
              : 'P';
          const targetProject = dragOverProject
            ? projects.find((p) => p.id === dragOverProject.id) || null
            : null;

          return (
            <div
              data-testid="project-row-drag-ghost"
              data-dragging-project-id={draggedProject.id}
              className="fixed top-0 left-0 pointer-events-none z-[100] select-none"
              style={{
                width: dragProjectPreview.width,
                transform: `translate3d(${Math.round(dragProjectPreview.x - dragProjectPreview.offsetX)}px, ${Math.round(dragProjectPreview.y - dragProjectPreview.offsetY)}px, 0)`,
                willChange: 'transform',
              }}
            >
              <div
                style={{ height: ROW_HEIGHT }}
                className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-2 border-indigo-600 dark:border-indigo-400 rounded-[6px] shadow-2xl ring-4 ring-indigo-500/15 px-3 flex items-center gap-2 text-xs font-semibold"
              >
                <GripVertical className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white shrink-0 ${draggedProjTheme.badge}`}
                >
                  {projectBadgeLabel}
                </span>
                <span className="font-semibold text-[#0C0C09] dark:text-zinc-100 truncate flex-1">
                  {draggedProject.name || 'Proyecto'}
                </span>
                <span className="font-mono text-[10px] text-[#6B6B66] dark:text-zinc-300 bg-[#F4F4F1] dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                  {draggedGroup ? `${draggedGroup.duration}d · ${draggedGroup.progress}%` : 'Proyecto'}
                </span>
              </div>
              {targetProject && (
                <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-semibold shadow-lg">
                  {dragOverProject?.position === 'before'
                    ? `↑ Antes de: ${targetProject.name}`
                    : `↓ Después de: ${targetProject.name}`}
                </div>
              )}
            </div>
          );
        })()}

        {contextMenu && (() => {
          const maxLeft = typeof window !== 'undefined' ? Math.max(8, window.innerWidth - 252) : 960;
          const maxTop = typeof window !== 'undefined' ? Math.max(8, window.innerHeight - 340) : 500;
          const menuLeft = Math.max(8, Math.min(contextMenu.x, maxLeft));
          const menuTop = Math.max(8, Math.min(contextMenu.y, maxTop));

          if (contextMenu.type === 'project') {
            const targetProject = projects.find((p) => p.id === contextMenu.id);
            if (!targetProject) return null;
            const isCurrentProjFocused =
              isFocusMode && focusEntity?.type === 'project' && focusEntity?.id === targetProject.id;

            return (
              <div
                data-testid="wbs-context-menu"
                data-context-type="project"
                data-context-id={targetProject.id}
                style={{ left: menuLeft, top: menuTop }}
                onClick={(e) => e.stopPropagation()}
                className="fixed z-[110] w-60 bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[6px] shadow-2xl py-1.5 text-xs text-[#0C0C09] dark:text-zinc-100 select-none"
              >
                <div className="px-3 py-1.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <span className="font-bold truncate">{targetProject.name || 'Proyecto'}</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0">Proyecto</span>
                </div>

                {(() => {
                  const projUrl = resolveElementUrl(targetProject);
                  if (!projUrl) return null;
                  return (
                    <a
                      href={projUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`context-open-url-project-${targetProject.id}`}
                      onClick={() => setContextMenu(null)}
                      className="w-full px-3 py-1.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center gap-2 cursor-pointer font-medium"
                      title={projUrl}
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Abrir enlace</span>
                    </a>
                  );
                })()}

                <button
                  type="button"
                  data-testid={`project-info-btn-${targetProject.id}`}
                  onClick={() => {
                    setInspectingProject(targetProject);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Detalles, notas y release</span>
                </button>

                <button
                  type="button"
                  data-testid={`project-lock-btn-${targetProject.id}`}
                  data-project-locked={targetProject.locked ? 'true' : 'false'}
                  onClick={() => {
                    handleToggleProjectLock(targetProject);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                >
                  {targetProject.locked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Desbloquear proyecto</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Bloquear proyecto</span>
                    </>
                  )}
                </button>

                {onSetFocusEntity && (
                  <button
                    type="button"
                    data-testid={`focus-project-${targetProject.id}`}
                    onClick={() => {
                      if (isCurrentProjFocused) {
                        onExitFocusMode ? onExitFocusMode() : onSetFocusEntity(null);
                      } else {
                        onSetFocusEntity({
                          type: 'project',
                          id: targetProject.id,
                          name: targetProject.name,
                        });
                      }
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isCurrentProjFocused ? 'text-amber-500 fill-current' : 'text-slate-500'}`} />
                    <span>{isCurrentProjFocused ? 'Salir de modo enfoque' : 'Enfocar proyecto'}</span>
                  </button>
                )}

                <button
                  type="button"
                  data-fit-project-row={targetProject.id}
                  onClick={() => {
                    handleFitProjectAction(targetProject.id);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Encajar en pantalla</span>
                </button>

                <div className="my-1 border-t border-slate-200 dark:border-zinc-800" />

                <button
                  type="button"
                  onClick={() => {
                    guardedQuickAdd('task', targetProject.id);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Añadir tarea</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    guardedQuickAdd('milestone', targetProject.id);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                >
                  <Diamond className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Añadir hito</span>
                </button>

                <div className="my-1 border-t border-slate-200 dark:border-zinc-800" />

                <div className="px-3 py-1.5" data-testid={`project-color-picker-btn-${targetProject.id}`}>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Palette className="w-3 h-3" />
                    <span>Color de proyecto</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        data-testid={`project-inline-color-opt-${c.value}`}
                        onClick={() => {
                          if (!guardProjectUnlocked(targetProject.id, 'cambiar color de proyecto bloqueado')) {
                            setContextMenu(null);
                            return;
                          }
                          guardedChangeProjectColor(targetProject.id, c.value);
                          setContextMenu(null);
                        }}
                        title={c.value}
                        className={`w-5 h-5 rounded-full ${c.bg} flex items-center justify-center transition cursor-pointer hover:scale-110 ${
                          targetProject.color === c.value ? 'ring-2 ring-black dark:ring-white ring-offset-1' : ''
                        }`}
                      >
                        {targetProject.color === c.value && <Check className="w-2.5 h-2.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {onDeleteProject && (
                  <>
                    <div className="my-1 border-t border-slate-200 dark:border-zinc-800" />
                    <button
                      type="button"
                      data-testid={`delete-project-row-btn-${targetProject.id}`}
                      onClick={() => {
                        setContextMenu(null);
                        guardedDeleteProject(targetProject.id);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Eliminar proyecto</span>
                    </button>
                  </>
                )}
              </div>
            );
          }

          const targetItem =
            enrichedItemById.get(contextMenu.id) ||
            effectiveItems.find((it) => it.id === contextMenu.id) ||
            items.find((it) => it.id === contextMenu.id);
          if (!targetItem) return null;

          return (
            <div
              data-testid="wbs-context-menu"
              data-context-type="task"
              data-context-id={targetItem.id}
              style={{ left: menuLeft, top: menuTop }}
              onClick={(e) => e.stopPropagation()}
              className="fixed z-[110] w-56 bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[6px] shadow-2xl py-1.5 text-xs text-[#0C0C09] dark:text-zinc-100 select-none"
            >
              <div className="px-3 py-1.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                <span className="font-bold truncate">{targetItem.name || (targetItem.type === 'milestone' ? 'Hito' : 'Tarea')}</span>
                <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0">
                  {targetItem.type === 'milestone' ? 'Hito' : 'Tarea'}
                </span>
              </div>

              {(() => {
                const itemUrl = resolveElementUrl(targetItem);
                if (!itemUrl) return null;
                return (
                  <a
                    href={itemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`context-open-url-task-${targetItem.id}`}
                    onClick={() => setContextMenu(null)}
                    className="w-full px-3 py-1.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center gap-2 cursor-pointer font-medium"
                    title={itemUrl}
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Abrir enlace</span>
                  </a>
                );
              })()}

              <button
                type="button"
                data-testid={`toggle-task-visibility-${targetItem.id}`}
                onClick={() => {
                  guardedUpdateItem({ ...targetItem, hidden: !targetItem.hidden }, false);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
              >
                {targetItem.hidden ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Mostrar en el diagrama</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Ocultar del diagrama</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  guardedEditModal(targetItem);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Editar detalles completos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  guardedDuplicateItem(targetItem);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Duplicar ítem</span>
              </button>

              <div className="my-1 border-t border-slate-200 dark:border-zinc-800" />

              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  guardedDeleteItem(targetItem.id);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Eliminar ítem</span>
              </button>
            </div>
          );
        })()}

        {(() => {
          if (!commentsDrawerTarget) return null;
          if (commentsDrawerTarget.entityType === 'project') {
            const targetProj = projects.find((p) => p.id === commentsDrawerTarget.id);
            if (!targetProj) return null;
            const projItems = items.filter((it) => it.projectId === targetProj.id);
            const avgProg =
              projItems.length > 0
                ? Math.round(projItems.reduce((acc, it) => acc + (it.progress || 0), 0) / projItems.length)
                : 0;
            return (
              <StatusCommentsDrawer
                isOpen={true}
                onClose={() => setCommentsDrawerTarget(null)}
                entityType="project"
                code={commentsDrawerTarget.code}
                project={targetProj}
                projectItems={projItems}
                projectIndex={targetProj.projectIndex}
                projectProgress={avgProg}
                defaultScope="all"
                onUpdateProject={onUpdateProject}
                onUpdateItem={onUpdateItem}
              />
            );
          }
          const targetItem = items.find((it) => it.id === commentsDrawerTarget.id);
          if (!targetItem) return null;
          return (
            <StatusCommentsDrawer
              isOpen={true}
              onClose={() => setCommentsDrawerTarget(null)}
              entityType="item"
              code={commentsDrawerTarget.code}
              item={targetItem}
              onUpdateItem={onUpdateItem}
            />
          );
        })()}

        <ProjectLockedAlertModal
          project={lockedAlertState?.project || null}
          attemptedAction={lockedAlertState?.attemptedAction}
          onUnlock={(proj) => handleToggleProjectLock(proj, false)}
          onClose={() => setLockedAlertState(null)}
        />
      </div>
    </div>
  );
};

