import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  Diamond,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Flame,
  FolderKanban,
  GitBranch,
  GripHorizontal,
  GripVertical,
  Maximize2,
  Minus,
  MousePointer,
  Plus,
  Rocket,
  SlidersHorizontal,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  ArrowVisibility,
  ComputedGanttItem,
  ComputedProjectGroup,
  ComputedReleaseGroup,
  DependencyType,
  GanttItem,
  GanttProject,
  GroupingMode,
  PROJECT_COLORS,
  Release,
  ReleaseGuideVisibility,
  ReleaseMilestone,
  TaskColor,
  ZoomLevel,
} from '../types/gantt';
import {
  addDependencyLink,
  calculateDurationFromDates,
  calculateEndDateFromDuration,
  clampDayWidth,
  computeFitToProjectScale,
  computeTimelineBounds,
  computeWheelZoomDayWidth,
  createRoundedOrthogonalPath,
  filterGroupsBySelectedProjects,
  formatDateDisplay,
  formatDateISO,
  formatScrubberDate,
  getDayWidthForPreset,
  getItemEffectiveColor,
  getTeamColor,
  groupItemsByProject,
  groupItemsByReleaseAndProject,
  MAX_DAY_WIDTH,
  MIN_DAY_WIDTH,
  moveDependencyLink,
  OrthogonalPoint,
  parseDateSafe,
  removeDependencyLink,
  sanitizeGanttItem,
  updateDependencyLinkType,
  wouldCreateCycle,
} from '../utils/ganttEngine';
import {
  checkTaskReleaseCompliance,
  RELEASE_MILESTONE_DEFINITIONS,
} from '../utils/releaseEngine';

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
  onOpenProjectsView?: () => void;
  zoom: ZoomLevel;
  dayWidth?: number;
  onChangeDayWidth?: (newDayWidth: number) => void;
  onFitToProject?: (projectId?: string) => void;
  showCriticalPath: boolean;
  showCpmFloat: boolean;
  autoCascade: boolean;
  arrowVisibility?: ArrowVisibility;
  onChangeArrowVisibility?: (visibility: ArrowVisibility) => void;
  onUpdateItem: (updated: GanttItem, cascade: boolean) => void;
  onUpdateItems?: (nextItems: GanttItem[]) => void;
  onReorderItem?: (itemId: string, direction: 'up' | 'down') => void;
  onMoveItem?: (sourceId: string, targetId: string, position: 'before' | 'after') => void;
  onEditModal: (item: ComputedGanttItem) => void;
  onDeleteItem: (id: string) => void;
  onDuplicateItem: (item: ComputedGanttItem) => void;
  onQuickAdd: (type: 'task' | 'milestone', projectId?: string) => void;
  onToggleGroupByProject?: () => void;
  onToggleProjectCollapse?: (projectId: string) => void;
  onUpdateProject?: (project: GanttProject) => void;
  onDeleteProject?: (projectId: string) => void;
  onCreateProject?: (project: GanttProject) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  initialSelectedItemId?: string;
  initialHoveredItemId?: string;
  initialCursorScrubber?: { x: number; date: Date };
  initialSelectedDepLink?: { predId: string; succId: string } | null;
  initialHoveredDepKey?: string | null;
  initialConnectModeSource?: { itemId: string; role: 'pred' | 'succ' } | null;
  initialInspectingProjectId?: string;
  releases?: Release[];
  activeReleaseId?: string;
  releaseGuideVisibility?: ReleaseGuideVisibility;
  groupingMode?: GroupingMode;
  onToggleGroupingMode?: () => void;
  onOpenReleasesModal?: (releaseId?: string) => void;
  initialVisibleMilestoneKeys?: string[];
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
  showCpmFloat,
  autoCascade,
  arrowVisibility: controlledArrowVisibility,
  onChangeArrowVisibility,
  onUpdateItem,
  onUpdateItems,
  onReorderItem,
  onMoveItem,
  onEditModal,
  onDeleteItem,
  onDuplicateItem,
  onQuickAdd,
  onToggleGroupByProject,
  onToggleProjectCollapse,
  onUpdateProject,
  onDeleteProject,
  onCreateProject,
  scrollContainerRef,
  showTable: showTableProp,
  onToggleShowTable,
  initialSelectedItemId,
  initialHoveredItemId,
  initialCursorScrubber,
  initialSelectedDepLink,
  initialHoveredDepKey,
  initialConnectModeSource,
  initialInspectingProjectId,
  releases = [],
  activeReleaseId,
  releaseGuideVisibility = 'selected',
  groupingMode = 'release',
  onToggleGroupingMode,
  onOpenReleasesModal,
  initialVisibleMilestoneKeys,
}) => {
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
  const [inspectingProject, setInspectingProject] = useState<GanttProject | null>(() => {
    if (initialInspectingProjectId && projects.length > 0) {
      return projects.find((p) => p.id === initialInspectingProjectId) || null;
    }
    return null;
  });
  const [selectedDepLink, setSelectedDepLink] = useState<{
    predId: string;
    succId: string;
  } | null>(initialSelectedDepLink || null);
  const inspectionPanelRef = useRef<HTMLElement>(null);
  const depPopoverRef = useRef<HTMLElement>(null);
  const [hoveredDepKey, setHoveredDepKey] = useState<string | null>(
    initialHoveredDepKey || null
  );
  const [connectModeSource, setConnectModeSource] = useState<{
    itemId: string;
    role: 'pred' | 'succ';
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
  } | null>(null);
  const [depFeedback, setDepFeedback] = useState<{
    message: string;
    tone: 'success' | 'error' | 'info';
  } | null>(null);
  const [cursorScrubber, setCursorScrubber] = useState<{
    x: number;
    date: Date;
  } | null>(initialCursorScrubber || null);
  const hasDraggedRef = useRef<boolean>(false);

  const [splitWidth, setSplitWidth] = useState<number>(480);
  const [internalShowTable, setInternalShowTable] = useState<boolean>(true);
  const showTable = showTableProp !== undefined ? showTableProp : internalShowTable;
  const [wheelZoomEnabled, setWheelZoomEnabled] = useState<boolean>(true);
  const [visibleColumns, setVisibleColumns] = useState<{
    team: boolean;
    dates: boolean;
    dur: boolean;
    slack: boolean;
    deps: boolean;
  }>(() => {
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
    if (!selectedItemId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        inspectionPanelRef.current &&
        !inspectionPanelRef.current.contains(e.target as Node)
      ) {
        const target = e.target as HTMLElement | null;
        if (target?.closest('[data-timeline-task], [data-timeline-milestone], [data-task-row]')) {
          return;
        }
        setSelectedItemId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedItemId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedItemId]);

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
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null);
  const [dragOverRow, setDragOverRow] = useState<{
    id: string;
    position: 'before' | 'after';
  } | null>(null);

  const draggingRowIdRef = useRef<string | null>(null);
  const dragOverRowRef = useRef<{
    id: string;
    position: 'before' | 'after';
  } | null>(null);
  const cleanupPointerListenersRef = useRef<(() => void) | null>(null);
  const lastMouseDownInteractiveRef = useRef<boolean>(false);
  const onMoveItemRef = useRef(onMoveItem);
  onMoveItemRef.current = onMoveItem;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    return () => {
      cleanupPointerListenersRef.current?.();
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

  const handleRowPointerMouseDown = (
    e: React.MouseEvent,
    itemId: string,
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
    // Prevent native HTML5 dragstart from hijacking pointer mousemove/mouseup events
    e.preventDefault();
    if (fromGripHandle) {
      e.stopPropagation();
    }

    cleanupPointerListenersRef.current?.();

    const startY = e.clientY;

    const detachListeners = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (cleanupPointerListenersRef.current === detachListeners) {
        cleanupPointerListenersRef.current = null;
      }
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      // Safety check: if left mouse button was released outside window or consumed, clean up immediately
      if (typeof moveEvent.buttons === 'number' && (moveEvent.buttons & 1) === 0) {
        detachListeners();
        draggingRowIdRef.current = null;
        dragOverRowRef.current = null;
        setDraggingRowId(null);
        setDragOverRow(null);
        return;
      }

      const dy = Math.abs(moveEvent.clientY - startY);
      if (!draggingRowIdRef.current && dy < 3) {
        return;
      }

      if (!draggingRowIdRef.current) {
        draggingRowIdRef.current = itemId;
        setDraggingRowId(itemId);
      }

      const rowNodes = document.querySelectorAll<HTMLElement>(
        '[data-task-row], [data-project-group]'
      );
      let matchedEl: HTMLElement | null = null;
      let matchedRect: DOMRect | null = null;
      let minDistance = Infinity;

      rowNodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (moveEvent.clientY >= rect.top && moveEvent.clientY <= rect.bottom) {
          matchedEl = node;
          matchedRect = rect;
          minDistance = 0;
        } else if (minDistance > 0) {
          const dist = Math.min(
            Math.abs(moveEvent.clientY - rect.top),
            Math.abs(moveEvent.clientY - rect.bottom)
          );
          if (dist < minDistance && dist <= 28) {
            minDistance = dist;
            matchedEl = node;
            matchedRect = rect;
          }
        }
      });

      if (matchedEl && matchedRect) {
        const el = matchedEl as HTMLElement;
        const r = matchedRect as DOMRect;
        const taskRowId = el.getAttribute('data-task-row');
        const projGroupId = el.getAttribute('data-project-group');

        if (taskRowId) {
          if (taskRowId === itemId) {
            dragOverRowRef.current = null;
            setDragOverRow(null);
          } else {
            const relY = moveEvent.clientY - r.top;
            const rawPosition: 'before' | 'after' =
              relY < r.height / 2 ? 'before' : 'after';
            const position = resolveEffectiveDropPosition(
              itemId,
              taskRowId,
              rawPosition
            );
            const nextOver = { id: taskRowId, position };
            dragOverRowRef.current = nextOver;
            setDragOverRow(nextOver);
          }
        } else if (projGroupId) {
          const nextOver = {
            id: `project:${projGroupId}`,
            position: 'after' as const,
          };
          dragOverRowRef.current = nextOver;
          setDragOverRow(nextOver);
        }
      }
    };

    const onMouseUp = () => {
      detachListeners();

      const activeSource = draggingRowIdRef.current;
      const activeTarget = dragOverRowRef.current;

      draggingRowIdRef.current = null;
      dragOverRowRef.current = null;
      setDraggingRowId(null);
      setDragOverRow(null);

      if (
        activeSource &&
        activeTarget &&
        activeSource !== activeTarget.id &&
        onMoveItemRef.current
      ) {
        onMoveItemRef.current(activeSource, activeTarget.id, activeTarget.position);
      }
    };

    cleanupPointerListenersRef.current = detachListeners;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
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
    draggingRowIdRef.current = null;
    dragOverRowRef.current = null;
    setDraggingRowId(null);
    setDragOverRow(null);
  };

  const handleDragRowEnd = (e?: React.DragEvent) => {
    e?.stopPropagation();
    cleanupPointerListenersRef.current?.();
    draggingRowIdRef.current = null;
    dragOverRowRef.current = null;
    setDraggingRowId(null);
    setDragOverRow(null);
  };

  // Calculate longest task name to size the column snugly without artificial gaps
  const maxTaskNameLength = useMemo(() => {
    let maxLen = 4;
    for (const it of items) {
      if (it.name && it.name.length > maxLen) {
        maxLen = it.name.length;
      }
    }
    return maxLen;
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

  // Allocate exact snug width for name column matching real proportional character widths (~6.8px/char)
  const nameColumnWidth = useMemo(() => {
    // 1. Task column needs: grip + arrows (32px), WBS (30px), dot (10px), indent (8px), gaps (12px) = 92px. Plus CRÍT (36px) if critical. Plus text (~6.8px/char) + 8px padding.
    const taskColWidth = 92 + (hasAnyCritical ? 36 : 0) + Math.ceil(maxTaskNameLength * 6.8) + 8;
    // 2. Project row needs: toggle button (20px), P-badge (24px), items badge (50px), gaps (12px) = 106px. Plus text (~6.8px/char) + 8px padding.
    const projColWidth = 106 + Math.ceil(maxProjectNameLength * 6.8) + 8;
    return Math.max(120, Math.max(taskColWidth, projColWidth));
  }, [maxTaskNameLength, maxProjectNameLength, hasAnyCritical]);

  // Calculates exact minimum content width to guarantee columns NEVER overlap or clip
  const tableMinWidth = useMemo(() => {
    let w = nameColumnWidth + 24; // Name column + table px-3 padding
    if (visibleColumns.team) w += 112; // w-28 = 112px
    if (visibleColumns.dates) w += 176; // w-44 = 176px
    if (visibleColumns.dur) w += 64; // w-16 = 64px
    if (visibleColumns.slack) w += 56; // w-14 = 56px
    if (visibleColumns.deps) w += 80; // w-20 = 80px
    w += 112; // Action/config buttons column w-28 = 112px
    return w;
  }, [nameColumnWidth, visibleColumns]);

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

  // Interactive drag state for moving or resizing task bars directly on the timeline
  const [dragState, setDragState] = useState<{
    itemId: string;
    mode: 'move' | 'resize';
    startX: number;
    origStart: Date;
    origDuration: number;
    dayDelta: number;
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

  const handleFitProjectAction = (targetProjectId?: string) => {
    const pid = targetProjectId || selectedProjectId || 'all';
    if (targetProjectId && onToggleProjectCollapse) {
      const targetProj = projects.find((p) => p.id === targetProjectId);
      if (targetProj?.collapsed) {
        onToggleProjectCollapse(targetProjectId);
      }
    }
    if (onFitToProject) {
      onFitToProject(pid);
      return;
    }
    const container = scrollContainerRef.current;
    const viewportW = container && container.clientWidth > 0 ? container.clientWidth : 960;
    const fit = computeFitToProjectScale(items, viewportW, { projectId: pid });
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
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
      const isPrimarilyVertical = Math.abs(e.deltaY) > Math.abs(e.deltaX);

      if (!hasModifier && (!wheelZoomRef.current || !isPrimarilyVertical)) {
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
      if (it.id !== dragState.itemId) return it;
      if (dragState.mode === 'move') {
        const newStart = formatDateISO(addDays(dragState.origStart, dragState.dayDelta));
        const newEnd =
          it.type === 'milestone'
            ? newStart
            : calculateEndDateFromDuration(newStart, dragState.origDuration, 'task');
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
        const newEnd = calculateEndDateFromDuration(it.startDate, newDur, 'task');
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
      return it;
    });
  }, [items, dragState]);

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

  const visibleProjectGroups = useMemo(
    () =>
      filterGroupsBySelectedProjects(
        allProjectGroups,
        selectedProjectIds,
        selectedProjectId
      ),
    [allProjectGroups, selectedProjectIds, selectedProjectId]
  );

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
    if (groupingMode === 'release' && releases.length > 0) {
      const visibleProjects = visibleProjectGroups.map((g) => g.project);
      if (visibleProjects.length === 0) {
        return [];
      }
      const allowedProjIds = new Set(visibleProjects.map((p) => p.id));
      const visibleItems = effectiveItems.filter(
        (it) => it.projectId && allowedProjIds.has(it.projectId)
      );
      const releaseGroups = groupItemsByReleaseAndProject(
        visibleItems,
        visibleProjects,
        releases
      );
      for (const rg of releaseGroups) {
        rows.push({
          kind: 'release',
          rowId: `release:${rg.release.id}`,
          group: rg,
        });
        if (!collapsedReleaseIds.has(rg.release.id)) {
          for (const group of rg.projectGroups) {
            rows.push({
              kind: 'project',
              rowId: `proj-${group.project.id}`,
              group,
            });
            if (!group.project.collapsed) {
              for (const item of group.items) {
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
      }
    } else if (groupByProject) {
      for (const group of visibleProjectGroups) {
        rows.push({
          kind: 'project',
          rowId: `proj-${group.project.id}`,
          group,
        });
        if (!group.project.collapsed) {
          for (const item of group.items) {
            rows.push({
              kind: 'item',
              rowId: item.id,
              item,
              group,
            });
          }
        }
      }
    } else {
      for (const group of visibleProjectGroups) {
        for (const item of group.items) {
          rows.push({
            kind: 'item',
            rowId: item.id,
            item,
            group,
          });
        }
      }
    }
    return rows;
  }, [
    groupingMode,
    releases,
    collapsedReleaseIds,
    groupByProject,
    visibleProjectGroups,
    effectiveItems,
    projects,
  ]);

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

  // Compute timeline date range with padding before and after project
  const { timelineDays, timelineStart, monthGroups, todayIndex } = useMemo(() => {
    const today = startOfDay(new Date());
    const { timelineStart: paddedStart, timelineEnd: paddedEnd } =
      computeTimelineBounds(timelineScopedItems, today);
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

    return {
      timelineDays: days,
      timelineStart: paddedStart,
      monthGroups: groups,
      todayIndex: tIdx,
    };
  }, [timelineScopedItems]);

  // Handle mouse drag for task bars on timeline
  const handleBarMouseDown = (
    e: React.MouseEvent,
    item: ComputedGanttItem,
    mode: 'move' | 'resize'
  ) => {
    e.stopPropagation();
    hasDraggedRef.current = false;
    const startX = e.clientX;
    const origStart = parseDateSafe(item.startDate);
    const origDuration = item.type === 'milestone' ? 0 : Math.max(1, item.duration);

    setDragState({
      itemId: item.id,
      mode,
      startX,
      origStart,
      origDuration,
      dayDelta: 0,
    });

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      if (Math.abs(dx) > 3) {
        hasDraggedRef.current = true;
      }
      const deltaDays = Math.round(dx / dayWidth);
      setDragState((prev) => (prev ? { ...prev, dayDelta: deltaDays } : null));
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      const dx = upEvent.clientX - startX;
      if (Math.abs(dx) > 3) {
        hasDraggedRef.current = true;
      }
      const deltaDays = Math.round(dx / dayWidth);
      setDragState(null);

      if (deltaDays === 0) return;

      if (mode === 'move') {
        const newStart = formatDateISO(addDays(origStart, deltaDays));
        const newEnd =
          item.type === 'milestone'
            ? newStart
            : calculateEndDateFromDuration(newStart, origDuration, 'task');
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
        const newEnd = calculateEndDateFromDuration(item.startDate, newDur, 'task');
        onUpdateItem(
          {
            ...item,
            duration: newDur,
            endDate: newEnd,
          },
          false
        );
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const showDepToast = (
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

  const commitAddDependency = (
    predId: string,
    succId: string,
    depType: DependencyType = 'FS'
  ): boolean => {
    const res = addDependencyLink(items, predId, succId, depType, autoCascade);
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
      const nonCascaded = addDependencyLink(items, predId, succId, depType, false);
      const updatedSucc = nonCascaded.items.find((it) => it.id === succId);
      if (updatedSucc) {
        onUpdateItem(updatedSucc, autoCascade);
      }
    }
    showDepToast('Dependencia creada en el diagrama', 'success');
    return true;
  };

  const commitRemoveDependency = (predId: string, succId: string): boolean => {
    const res = removeDependencyLink(items, predId, succId, false);
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
    const res = moveDependencyLink(
      items,
      oldPredId,
      oldSuccId,
      newPredId,
      newSuccId,
      depType,
      autoCascade
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
        false
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
    const res = updateDependencyLinkType(items, predId, succId, depType, autoCascade);
    if (!res.updated) return false;

    if (onUpdateItems) {
      onUpdateItems(res.items);
    } else {
      const nonCascaded = updateDependencyLinkType(items, predId, succId, depType, false);
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
  }, [selectedDepLink, items, autoCascade]);

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
      const predId =
        connectModeSource.role === 'pred' ? connectModeSource.itemId : itemId;
      const succId =
        connectModeSource.role === 'pred' ? itemId : connectModeSource.itemId;
      commitAddDependency(predId, succId, 'FS');
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
    setSelectedDepLink(null);
    setSelectedItemId((prev) => (prev === itemId ? null : itemId));
  };

  // Handle split pane divider resize
  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingSplitRef.current = true;
    const startX = e.clientX;
    const origWidth = splitWidth;

    const onMove = (me: MouseEvent) => {
      if (!isResizingSplitRef.current) return;
      const nextWidth = Math.max(360, Math.min(960, origWidth + (me.clientX - startX)));
      setSplitWidth(nextWidth);
    };

    const onUp = () => {
      isResizingSplitRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
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
      isCollapsedRow = false
    ) => {
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
        // Anchor collapsed items to their parent project summary row so cross-project dependency lines still connect
        for (const collapsedItem of row.group.items) {
          map.set(collapsedItem.id, computeCoordsForItem(collapsedItem, rowIndex, true));
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

    const fixedCoords = itemRowMap.get(config.fixedItemId);
    if (!fixedCoords) return;

    const isFixedPredecessor =
      (config.mode === 'create' && config.originPort === 'out') ||
      config.mode === 'move-target';

    const anchorX = isFixedPredecessor
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
    });

    const resolveTargetItemFromPoint = (
      clientX: number,
      clientY: number,
      canvasY: number
    ): string | null => {
      if (typeof document !== 'undefined' && document.elementsFromPoint) {
        const els = document.elementsFromPoint(clientX, clientY);
        for (const el of els) {
          const htmlEl = el as HTMLElement;
          if (!htmlEl || !htmlEl.closest) continue;
          const portEl = htmlEl.closest(
            '[data-dep-port-in], [data-dep-port-out]'
          ) as HTMLElement | null;
          if (portEl) {
            const pid =
              portEl.getAttribute('data-dep-port-in') ||
              portEl.getAttribute('data-dep-port-out');
            if (pid && pid !== config.fixedItemId) return pid;
          }
          const barEl = htmlEl.closest(
            '[data-timeline-task], [data-timeline-milestone]'
          ) as HTMLElement | null;
          if (barEl) {
            const bid =
              barEl.getAttribute('data-timeline-task') ||
              barEl.getAttribute('data-timeline-milestone');
            if (bid && bid !== config.fixedItemId) return bid;
          }
          const rowEl = htmlEl.closest('[data-task-row]') as HTMLElement | null;
          if (rowEl) {
            const rid = rowEl.getAttribute('data-task-row');
            if (rid && rid !== config.fixedItemId) return rid;
          }
        }
      }

      const rowIndex = Math.floor(canvasY / ROW_HEIGHT);
      if (rowIndex >= 0 && rowIndex < displayRows.length) {
        const row = displayRows[rowIndex];
        if (row.kind === 'item' && row.item.id !== config.fixedItemId) {
          return row.item.id;
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
      const targetId = resolveTargetItemFromPoint(
        moveEvent.clientX,
        moveEvent.clientY,
        curY
      );
      latestTargetId = targetId;

      setDepDragState((prev) =>
        prev
          ? {
              ...prev,
              cursorX: curX,
              cursorY: curY,
              hoveredTargetId: targetId,
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
          if (
            connectModeSource &&
            connectModeSource.itemId !== config.fixedItemId
          ) {
            const predId =
              connectModeSource.role === 'pred'
                ? connectModeSource.itemId
                : config.fixedItemId;
            const succId =
              connectModeSource.role === 'pred'
                ? config.fixedItemId
                : connectModeSource.itemId;
            commitAddDependency(predId, succId, 'FS');
            setConnectModeSource(null);
          } else {
            const nextRole: 'pred' | 'succ' =
              config.originPort === 'in' ? 'succ' : 'pred';
            setReconnectMode(null);
            setSelectedDepLink(null);
            setConnectModeSource((prev) =>
              prev && prev.itemId === config.fixedItemId && prev.role === nextRole
                ? null
                : { itemId: config.fixedItemId, role: nextRole }
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
          const predId =
            config.originPort === 'in' ? latestTargetId : config.fixedItemId;
          const succId =
            config.originPort === 'in' ? config.fixedItemId : latestTargetId;
          commitAddDependency(predId, succId, config.depType || 'FS');
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
    () => (selectedItemId ? enrichedItemById.get(selectedItemId) || null : null),
    [enrichedItemById, selectedItemId]
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
    const activeId = hoveredId || selectedItemId;
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
  }, [hoveredId, selectedItemId, selectedDepLink, items]);

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
      (depDragState.mode === 'create' && depDragState.originPort === 'out') ||
      depDragState.mode === 'move-target';

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
    let statusLabel =
      depDragState.mode === 'create'
        ? 'Arrastra hacia una tarea destino...'
        : 'Arrastra hacia otra tarea para reconectar...';

    if (depDragState.hoveredTargetId) {
      const targetCoords = itemRowMap.get(depDragState.hoveredTargetId);
      const targetItem = enrichedItemById.get(depDragState.hoveredTargetId);
      const fixedItem = enrichedItemById.get(depDragState.fixedItemId);

      if (targetCoords) {
        if (isFixedPred) {
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
        const candidatePred = isFixedPred
          ? depDragState.fixedItemId
          : depDragState.hoveredTargetId;
        const candidateSucc = isFixedPred
          ? depDragState.hoveredTargetId
          : depDragState.fixedItemId;
        const check = addDependencyLink(
          items,
          candidatePred,
          candidateSucc,
          depDragState.depType,
          false
        );
        isValidTarget = check.added;
        if (check.added) {
          const pItem = enrichedItemById.get(candidatePred);
          const sItem = enrichedItemById.get(candidateSucc);
          statusLabel = `Conectar #${pItem?.wbsCode || pItem?.wbs} → #${
            sItem?.wbsCode || sItem?.wbs
          } (${depDragState.depType})`;
        } else if (check.error === 'cycle') {
          statusLabel = 'Ciclo no permitido';
        } else if (check.error === 'duplicate') {
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
  const totalCanvasHeight = Math.max(displayRows.length * ROW_HEIGHT + 56, 360);

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
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-[#0C0C09] rounded-[8px] border border-[#0C0C09] dark:border-zinc-800 shadow-none overflow-hidden">
      {/* Main Synchronized Split View */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* LEFT PANE: WBS Editable Data Grid */}
        {showTable && (
          <>
            <div
              style={{ width: splitWidth }}
              className="shrink-0 flex flex-col border-r border-[#0C0C09] dark:border-zinc-800 bg-white dark:bg-[#0C0C09] overflow-hidden select-none"
            >
              <div className="overflow-x-auto flex-1 flex flex-col">
                <div className="min-w-full flex-1 flex flex-col">
                  {/* Minimalist Table Header (matches timeline HEADER_HEIGHT = 60px) */}
                  <div
                    style={{ height: HEADER_HEIGHT, minWidth: tableMinWidth }}
                    className="flex items-center justify-start px-3 bg-[#F4F4F1] dark:bg-[#18181b] border-b border-[#0C0C09] dark:border-zinc-800 text-[10px] font-mono font-bold uppercase tracking-wider text-[#0C0C09] dark:text-zinc-300 shrink-0 select-none"
                  >
                    <div
                      style={{ width: nameColumnWidth }}
                      className="flex items-center gap-2 shrink-0"
                    >
                      <span className="w-16 font-mono text-center shrink-0"># / Orden</span>
                      <span className="font-semibold">Nombre</span>
                    </div>

                    {/* Column Titles & Icon-Only Configurator */}
                    <div className="flex items-center shrink-0">
                      {visibleColumns.team && (
                        <span className="w-28 text-left pl-2 text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400 uppercase font-bold">
                          Equipo
                        </span>
                      )}
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
                        <span className="w-14 text-center text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400 uppercase font-bold">
                          Slack
                        </span>
                      )}
                      {visibleColumns.deps && (
                        <span className="w-20 text-center text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400 uppercase font-bold">
                          Deps
                        </span>
                      )}

                      {/* Botones de Control: Hitos de Release y Columnas */}
                      <div className="w-28 flex items-center justify-end pr-1 gap-1">
                        {/* Botón y Panel de Hitos de Release */}
                        <div ref={milestonesMenuRef} className="relative" data-dropdown-container="true">
                          <button
                            type="button"
                            data-testid="toggle-milestones-menu-btn"
                            onClick={() => setShowMilestonesMenu((prev) => !prev)}
                            className={`p-1 rounded-[4px] transition cursor-pointer ${
                              showMilestonesMenu
                                ? 'bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]'
                                : 'hover:bg-black/5 dark:hover:bg-white/10 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white'
                            }`}
                            aria-label="Configurar hitos de release visibles"
                            title="Hitos de release visibles en cronograma (Por defecto: QG4, QG5)"
                          >
                            <Diamond className="w-3.5 h-3.5" />
                          </button>

                          {showMilestonesMenu && (
                            <div
                              data-testid="milestones-visibility-menu"
                              className="absolute right-0 top-8 w-60 p-2 bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[4px] shadow-xl z-50 text-xs flex flex-col gap-1.5"
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

                        {/* Botón de Columnas: SOLO ICONO VECTORIAL (sin texto) */}
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
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Table Body Rows */}
                  <div className="divide-y divide-[#E2E2DC] dark:divide-zinc-800/60">
                    {visibleProjectGroups.length === 0 && (
                      <div
                        data-empty-selected-projects="true"
                        style={{ minWidth: tableMinWidth }}
                        className="flex flex-col items-center justify-center py-12 px-6 text-center bg-slate-50/40 dark:bg-zinc-900/30"
                      >
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
                      </div>
                    )}
                    {displayRows.map((row, rowIndex) => {
                      if (row.kind === 'release') {
                        const { group: rGroup } = row;
                        const isCollapsed = collapsedReleaseIds.has(rGroup.release.id);
                        return (
                          <div
                            key={row.rowId}
                            data-release-group={rGroup.release.id}
                            style={{ height: ROW_HEIGHT, minWidth: tableMinWidth }}
                            className="flex items-center justify-between px-3 text-xs font-bold border-y border-[#0C0C09] dark:border-zinc-700 bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] transition-colors"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <button
                                type="button"
                                data-testid={`toggle-collapse-release-${rGroup.release.id}`}
                                onClick={() => {
                                  setCollapsedReleaseIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(rGroup.release.id)) next.delete(rGroup.release.id);
                                    else next.add(rGroup.release.id);
                                    return next;
                                  });
                                }}
                                className="p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 transition cursor-pointer"
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                              <Rocket className="w-4 h-4 shrink-0 text-amber-400 dark:text-indigo-600" />
                              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-white/20 dark:bg-black/10">
                                {rGroup.release.code}
                              </span>
                              <span className="truncate">{rGroup.release.name}</span>
                              {onOpenReleasesModal && (
                                <button
                                  type="button"
                                  data-testid={`release-manage-btn-${rGroup.release.code}`}
                                  onClick={() => onOpenReleasesModal(rGroup.release.id)}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-white/20 hover:bg-white/30 text-white dark:bg-black/10 dark:hover:bg-black/20 dark:text-black transition cursor-pointer shrink-0"
                                  title={`Abrir gestión de la release ${rGroup.release.code} (asignar proyectos, editar hitos)`}
                                >
                                  <SlidersHorizontal className="w-3 h-3" />
                                  <span>Gestionar</span>
                                </button>
                              )}
                              {rGroup.violationsCount > 0 && (
                                <span
                                  data-testid={`release-violations-badge-${rGroup.release.code}`}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500 text-black text-[10px] font-mono font-bold shrink-0"
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{rGroup.violationsCount} desalineaciones</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-[11px] font-mono shrink-0">
                              <span className="opacity-80">
                                {rGroup.projectGroups.length} proyectos · {rGroup.tasksCount} tareas
                              </span>
                              <span className="opacity-90 font-bold">
                                {rGroup.progress}%
                              </span>
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

                        return (
                          <div
                            key={row.rowId}
                            data-project-group={group.project.id}
                            style={{ height: ROW_HEIGHT, minWidth: tableMinWidth }}
                            onDragOver={(e) =>
                              handleDragRowOver(e, `project:${group.project.id}`)
                            }
                            onDragLeave={handleDragRowLeave}
                            onDrop={(e) =>
                              handleDropRow(e, `project:${group.project.id}`)
                            }
                            className={`flex items-center justify-start px-3 text-xs font-semibold border-y border-slate-200/80 dark:border-zinc-800/80 transition-colors ${
                              isProjectDragTarget
                                ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-100/70 dark:bg-indigo-950/60'
                                : projTheme.groupRowBg
                            }`}
                          >
                            {/* Project Header Title + Collapse Toggle */}
                            <div
                              style={{ width: nameColumnWidth }}
                              className="flex items-center gap-2 pr-2 shrink-0 pl-1 min-w-0"
                            >
                              <button
                                type="button"
                                onClick={() => onToggleProjectCollapse?.(group.project.id)}
                                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 shrink-0"
                                title={
                                  isCollapsed ? 'Expandir proyecto' : 'Colapsar proyecto'
                                }
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => setInspectingProject(group.project)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white shrink-0 hover:opacity-85 transition cursor-pointer ${projTheme.badge}`}
                                title={`Configuración de ${group.project.name} (Release, descripción, color)`}
                              >
                                P{group.projectIndex}
                              </button>

                              <div className="inline-grid items-center shrink-0 max-w-full">
                                <span
                                  aria-hidden="true"
                                  className="invisible col-start-1 row-start-1 font-bold text-xs px-1.5 py-0.5 whitespace-pre pointer-events-none select-none"
                                >
                                  {group.project.name || 'Proyecto'}
                                </span>
                                <input
                                  type="text"
                                  value={group.project.name}
                                  onChange={(e) =>
                                    onUpdateProject?.({
                                      ...group.project,
                                      name: e.target.value,
                                    })
                                  }
                                  onBlur={(e) => {
                                    const trimmed = e.target.value.trim();
                                    if (!trimmed) {
                                      onUpdateProject?.({
                                        ...group.project,
                                        name: `Proyecto ${group.projectIndex}`,
                                      });
                                    } else if (trimmed !== group.project.name) {
                                      onUpdateProject?.({
                                        ...group.project,
                                        name: trimmed,
                                      });
                                    }
                                  }}
                                  className={`col-start-1 row-start-1 w-full min-w-[24px] bg-transparent font-bold text-[#0C0C09] dark:text-white focus:bg-white dark:focus:bg-zinc-800 px-1.5 py-0.5 rounded-[2px] outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                                    draggingRowId ? 'pointer-events-none' : ''
                                  }`}
                                  title="Haz clic para renombrar este proyecto"
                                  data-project-name-input={group.project.id}
                                />
                              </div>

                              <button
                                type="button"
                                data-testid={
                                  group.project.description?.trim()
                                    ? `project-has-description-${group.project.id}`
                                    : `project-info-inline-${group.project.id}`
                                }
                                onClick={() => setInspectingProject(group.project)}
                                className={`p-1 rounded-[2px] transition cursor-pointer shrink-0 ${
                                  group.project.description?.trim()
                                    ? 'text-[#312C85] dark:text-indigo-400 hover:bg-black/5 dark:hover:bg-white/10'
                                    : 'text-slate-400 hover:text-[#0C0C09] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
                                }`}
                                title={
                                  group.project.description?.trim()
                                    ? `Información y configuración: ${group.project.description}`
                                    : `Detalle y configuración de ${group.project.name} (asociar release, notas, color)`
                                }
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>

                              {group.project.releaseId ? (
                                <button
                                  type="button"
                                  onClick={() => setInspectingProject(group.project)}
                                  data-testid={`project-release-badge-${group.project.id}`}
                                  className="px-1.5 py-0.5 rounded-[2px] bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] text-[10px] font-mono font-bold shrink-0 hover:opacity-85 transition cursor-pointer flex items-center gap-1"
                                  title={`Release asignada: ${releases?.find((r) => r.id === group.project.releaseId)?.name || group.project.releaseId} (Clic para cambiar)`}
                                >
                                  <span>🚀</span>
                                  <span>{releases?.find((r) => r.id === group.project.releaseId)?.code || group.project.releaseId}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setInspectingProject(group.project)}
                                  data-testid={`project-assign-release-btn-${group.project.id}`}
                                  className="px-1.5 py-0.5 rounded-[2px] border border-dashed border-indigo-400 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 text-[10px] font-mono shrink-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition cursor-pointer flex items-center gap-1"
                                  title="Asignar este proyecto a una Release predefinida"
                                >
                                  <span>🚀 + Asignar Release</span>
                                </button>
                              )}

                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono border shrink-0 ${projTheme.groupBadgeBg}`}
                                title={`${group.tasksCount} tarea(s) y ${group.milestonesCount} hito(s)`}
                              >
                                {group.items.length} ítems
                              </span>
                            </div>

                            {/* Aligned Columns matching header */}
                            <div className="flex items-center shrink-0">
                              {visibleColumns.team && (
                                <div className="w-28 shrink-0 text-slate-400 text-center text-[10px]">—</div>
                              )}

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
                                <div className="w-14 shrink-0 text-center font-mono text-[10px] text-amber-600 dark:text-amber-400">
                                  +{group.totalSlack}d
                                </div>
                              )}

                              {visibleColumns.deps && (
                                <div className="w-20 shrink-0 text-slate-400 text-center text-[10px]">—</div>
                              )}

                              {/* Project Quick Actions */}
                              <div className="w-28 shrink-0 flex items-center justify-end gap-0.5 pr-1">
                                <button
                                  type="button"
                                  data-testid={`project-info-btn-${group.project.id}`}
                                  onClick={() => setInspectingProject(group.project)}
                                  className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-[#0C0C09] dark:hover:text-white transition cursor-pointer"
                                  title={`Ver y editar información / notas de ${group.project.name}`}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  data-fit-project-row={group.project.id}
                                  onClick={() => handleFitProjectAction(group.project.id)}
                                  className="p-1 rounded hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                  title={`Encajar todas las tareas de ${group.project.name} en pantalla`}
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onQuickAdd('task', group.project.id)}
                                  className="p-1 rounded hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                                  title={`Añadir tarea a ${group.project.name}`}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onQuickAdd('milestone', group.project.id)}
                                  className="p-1 rounded hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                  title={`Añadir hito a ${group.project.name}`}
                                >
                                  <Diamond className="w-3 h-3" />
                                </button>
                                {onDeleteProject && (
                                  <button
                                    type="button"
                                    data-testid={`delete-project-row-btn-${group.project.id}`}
                                    onClick={() => {
                                      onDeleteProject(group.project.id);
                                    }}
                                    className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                    title={`Eliminar proyecto ${group.project.name}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
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
                      const isBeingDragged = draggingRowId === item.id;
                      const isDropBefore = dragOverRow?.id === item.id && dragOverRow.position === 'before';
                      const isDropAfter = dragOverRow?.id === item.id && dragOverRow.position === 'after';
                      const itemRelease = group.project.releaseId
                        ? releases?.find((r) => r.id === group.project.releaseId)
                        : undefined;
                      const releaseViolations = itemRelease
                        ? checkTaskReleaseCompliance(item, group.project, itemRelease)
                        : [];

                      return (
                        <div
                          key={row.rowId}
                          data-task-row={item.id}
                          draggable={true}
                          style={{ height: ROW_HEIGHT, minWidth: tableMinWidth }}
                          onMouseEnter={() => setHoveredId(item.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          onMouseDown={(e) => handleRowPointerMouseDown(e, item.id, false)}
                          onDragStart={(e) => handleDragRowStart(e, item.id)}
                          onDragEnd={handleDragRowEnd}
                          onDragOver={(e) => handleDragRowOver(e, item.id)}
                          onDragLeave={handleDragRowLeave}
                          onDrop={(e) => handleDropRow(e, item.id)}
                          className={`flex items-center justify-start px-3 text-xs transition-colors border-b border-[#E2E2DC] dark:border-zinc-800 ${
                            isDropBefore
                              ? 'border-t-2 border-t-[#0C0C09] bg-[#F4F4F1] dark:bg-zinc-800'
                              : isDropAfter
                              ? 'border-b-2 border-b-[#0C0C09] bg-[#F4F4F1] dark:bg-zinc-800'
                              : ''
                          } ${
                            item.hidden
                              ? 'opacity-60 bg-zinc-50/70 dark:bg-zinc-900/30'
                              : isBeingDragged
                              ? 'opacity-40 bg-[#F4F4F1] dark:bg-zinc-800/60'
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
                            className={`flex items-center gap-1.5 pr-2 shrink-0 ${
                              groupByProject ? 'pl-2' : ''
                            }`}
                          >
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
                              <div className="flex flex-col -space-y-1">
                                <button
                                  type="button"
                                  disabled={isFirstInGroup}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReorderItem?.(item.id, 'up');
                                  }}
                                  className={`p-0.5 rounded-[2px] text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
                                    isFirstInGroup ? 'opacity-20 cursor-not-allowed hover:bg-transparent hover:text-[#6B6B66]' : ''
                                  }`}
                                  title="Subir posición (mover tarea arriba)"
                                  data-move-up={item.id}
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLastInGroup}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReorderItem?.(item.id, 'down');
                                  }}
                                  className={`p-0.5 rounded-[2px] text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
                                    isLastInGroup ? 'opacity-20 cursor-not-allowed hover:bg-transparent hover:text-[#6B6B66]' : ''
                                  }`}
                                  title="Bajar posición (mover tarea abajo)"
                                  data-move-down={item.id}
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <span
                              className="font-mono text-[10px] w-8 text-center py-0.5 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-300 border border-[#E2E2DC] dark:border-zinc-700 shrink-0 font-semibold"
                              title={`Código WBS ${item.wbsCode || item.wbs} (Global #${item.wbs})`}
                            >
                              {groupByProject ? item.wbsCode || `${item.wbs}.` : `${item.wbs}.`}
                            </span>
                            {item.type === 'milestone' ? (
                              <Diamond
                                className={`w-3.5 h-3.5 ${
                                  (COLOR_STYLES[itemEffectiveColor] || COLOR_STYLES.amber).diamondText
                                } fill-current shrink-0`}
                              />
                            ) : (
                              <span
                                className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${
                                  COLOR_STYLES[itemEffectiveColor]?.badge || 'bg-indigo-500'
                                }`}
                              />
                            )}
                            <div className="inline-grid items-center shrink-0 max-w-full">
                              <span
                                aria-hidden="true"
                                className="invisible col-start-1 row-start-1 font-medium text-xs px-1.5 py-0.5 whitespace-pre pointer-events-none select-none"
                              >
                                {item.name || 'Tarea'}
                              </span>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) =>
                                  onUpdateItem({ ...item, name: e.target.value }, false)
                                }
                                onBlur={(e) => {
                                  const trimmed = e.target.value.trim();
                                  if (!trimmed) {
                                    onUpdateItem(
                                      {
                                        ...item,
                                        name:
                                          item.type === 'milestone'
                                            ? 'Nuevo Hito'
                                            : 'Nueva Tarea',
                                      },
                                      false
                                    );
                                  } else if (trimmed !== item.name) {
                                    onUpdateItem({ ...item, name: trimmed }, false);
                                  }
                                }}
                                style={{
                                  minWidth: `${Math.max(24, Math.ceil((item.name || '').length * 8.2))}px`,
                                }}
                                className={`col-start-1 row-start-1 w-full bg-transparent font-medium text-[#0C0C09] dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 px-1.5 py-0.5 rounded-[2px] outline-none focus:ring-1 focus:ring-[#0C0C09] ${
                                  draggingRowId ? 'pointer-events-none' : ''
                                }`}
                                title={`${item.name} (${group.project.name})`}
                                data-task-name-input={item.id}
                              />
                            </div>
                            {item.hidden && (
                              <span
                                data-testid={`task-hidden-badge-${item.id}`}
                                title="Oculta del diagrama de cronograma"
                                className="px-1 py-0.5 rounded-[2px] bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[9px] font-mono shrink-0 border border-zinc-300 dark:border-zinc-700"
                              >
                                Oculta
                              </span>
                            )}
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
                          </div>

                          {/* Aligned Columns */}
                          <div className={`flex items-center shrink-0 ${draggingRowId ? 'pointer-events-none' : ''}`}>
                            {/* 1. Equipo Column */}
                            {visibleColumns.team && (
                              <div className="w-28 shrink-0 flex items-center justify-start pl-2">
                                {item.assignee ? (
                                  <span
                                    data-assignee-badge={item.assignee}
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-medium truncate max-w-[102px] border ${
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
                                    className="px-1.5 py-0.5 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09]/60 dark:text-zinc-400 text-[10px] font-mono truncate max-w-[102px] border border-[#E2E2DC] dark:border-zinc-700"
                                    title="Sin asignar"
                                  >
                                    —
                                  </span>
                                )}
                              </div>
                            )}

                            {/* 2. Fechas Column: EDITABLES DIRECTAMENTE */}
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
                                    onUpdateItem(
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
                                    onUpdateItem(
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
                                      onUpdateItem(
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

                            {/* 4. Slack Column: EDITABLE */}
                            {visibleColumns.slack && (
                              <div className="w-14 shrink-0 flex items-center justify-center font-mono text-[10px]">
                                {item.type === 'milestone' ? (
                                  <span className="text-[#6B6B66]">—</span>
                                ) : (
                                  <input
                                    type="number"
                                    min={0}
                                    max={99}
                                    value={item.slack}
                                    onChange={(e) => {
                                      const slack = Math.max(0, parseInt(e.target.value, 10) || 0);
                                      onUpdateItem({ ...item, slack }, autoCascade);
                                    }}
                                    className="w-11 px-1 py-0.5 text-center font-mono text-[10px] rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 text-[#312C85] dark:text-indigo-400 font-bold border border-[#E2E2DC] dark:border-zinc-700 outline-none focus:ring-1 focus:ring-[#0C0C09]"
                                    title="Holgura / Slack en días (haz clic para editar)"
                                  />
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

                            {/* 6. Acciones Column */}
                            <div className="w-28 shrink-0 flex items-center justify-end gap-0.5 pr-1">
                              <button
                                type="button"
                                data-testid={`toggle-task-visibility-${item.id}`}
                                onClick={() => onUpdateItem({ ...item, hidden: !item.hidden }, false)}
                                className={`p-1 rounded-[2px] transition cursor-pointer ${
                                  item.hidden
                                    ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                                    : 'text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
                                }`}
                                title={item.hidden ? 'Mostrar en el diagrama' : 'Ocultar del diagrama'}
                              >
                                {item.hidden ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditModal(item)}
                                className="p-1 rounded-[2px] hover:bg-black/5 dark:hover:bg-white/10 text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-white transition cursor-pointer"
                                title="Editar detalles completos en modal"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDuplicateItem(item)}
                                className="p-1 rounded-[2px] hover:bg-black/5 dark:hover:bg-white/10 text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-white transition cursor-pointer"
                                title="Duplicar ítem"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteItem(item.id)}
                                className="p-1 rounded-[2px] hover:bg-[#DC2626]/10 text-[#6B6B66] hover:text-[#DC2626] transition cursor-pointer"
                                title="Eliminar ítem"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

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
                          const targetProjId =
                            visibleProjectGroups.length > 0
                              ? visibleProjectGroups[visibleProjectGroups.length - 1].project.id
                              : undefined;
                          onQuickAdd('task', targetProjId);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer"
                        title="Crear nueva tarea"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nueva Tarea</span>
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
                            setNewProjectReleaseId(releases[0]?.id || 'rel-t-26-12-1');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                          title="Crear nuevo proyecto"
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
                              releaseId: newProjectReleaseId,
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
              onMouseDown={handleSplitMouseDown}
              className="w-1 cursor-col-resize bg-[#0C0C09] dark:bg-zinc-700 hover:bg-[#312C85] dark:hover:bg-[#312C85] transition-colors flex items-center justify-center group shrink-0"
              title="Arrastra para redimensionar la tabla"
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
            setSelectedDepLink(null);
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
                  {/* Glowing vertical white tracking line with top notch */}
                  <div className="absolute top-0 bottom-0 left-0 w-px -translate-x-1/2 bg-white/70 dark:bg-white/80 shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
                  <div className="absolute top-0 left-0 w-1.5 h-1 bg-white rounded-xs -translate-x-1/2" />
                </div>
              );
            })()}

            {/* Minimalist Linear-Style Timeline Header (60px total height) */}
            <div
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

                  const showTick =
                    dayWidth >= 20 || isMonday || isMonthStart || (dayWidth >= 6 && isBiWeekly);

                  return (
                    <div
                      key={idx}
                      style={{ width: dayWidth }}
                      className={`relative h-full flex flex-col items-center justify-center text-[10px] font-mono select-none ${
                        isToday
                          ? 'font-bold'
                          : wknd && dayWidth >= 14
                          ? 'text-[#6B6B66]/60 dark:text-zinc-600'
                          : 'text-[#6B6B66] dark:text-zinc-400'
                      }`}
                    >
                      {/* Subtle tick notch at the top */}
                      {showTick && (
                        <div
                          className={`absolute top-0 w-px ${
                            isMonthStart
                              ? 'h-2 bg-[#0C0C09] dark:bg-zinc-600'
                              : 'h-1 bg-[#E2E2DC] dark:bg-zinc-800'
                          }`}
                        />
                      )}

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
            <div className="relative" style={{ height: displayRows.length * ROW_HEIGHT + 52 }}>
              {/* Vertical Day Columns & Weekend Shading */}
              <div className="absolute inset-0 flex pointer-events-none z-0">
                {timelineDays.map((day, idx) => {
                  const wknd = isWeekend(day);
                  const isMonday = day.getDay() === 1;
                  const isMonthStart = day.getDate() === 1;
                  const showGridLine =
                    dayWidth >= 12 || isMonday || isMonthStart;
                  return (
                    <div
                      key={idx}
                      style={{ width: dayWidth }}
                      className={`h-full ${
                        showGridLine
                          ? 'border-r border-[#E2E2DC]/50 dark:border-zinc-900'
                          : ''
                      } ${
                        wknd && dayWidth >= 8
                          ? 'bg-[#F4F4F1]/60 dark:bg-zinc-900/40'
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
                  const diamondWidth = Math.max(
                    38,
                    Math.min(84, m.code.length * 7.2 + 16)
                  );
                  const diamondHeight = 20;
                  const halfW = diamondWidth / 2;
                  const halfH = diamondHeight / 2;
                  const points = `${halfW},1 ${diamondWidth - 1.5},${halfH} ${halfW},${diamondHeight - 1} 1.5,${halfH}`;
                  const diamondTop = tier === 1 ? 24 : 2;

                  return (
                    <div
                      key={`rel-guide-${rel.id}-${m.id}-${topY}-${idx}`}
                      data-testid={`release-milestone-guide-${rel.id}-${m.key}`}
                      style={{
                        left: x,
                        top: topY,
                        height: height,
                      }}
                      className="absolute pointer-events-none z-10 w-0 overflow-visible"
                    >
                      {/* Diamond Milestone Icon with Code inside */}
                      <div
                        style={{
                          left: 0,
                          transform: 'translateX(-50%)',
                          top: `${diamondTop}px`,
                        }}
                        className="absolute z-20 pointer-events-auto"
                      >
                        <button
                          type="button"
                          data-testid={`release-milestone-diamond-${rel.id}-${m.key}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleReleaseGuideLine(guideKey);
                          }}
                          title={`${rel.name} · ${m.code}: ${m.name} (${formatScrubberDate(m.date)}) — ${
                            isLineHidden
                              ? 'Línea oculta (clic para mostrar)'
                              : 'Clic para ocultar línea vertical'
                          }`}
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
                                  : 'fill-[#0C0C09] dark:fill-zinc-100 stroke-indigo-600 dark:stroke-indigo-400 stroke-[1.5]'
                              }
                              strokeDasharray={isLineHidden ? '2 2' : undefined}
                            />
                            <text
                              x="50%"
                              y="50%"
                              textAnchor="middle"
                              dominantBaseline="central"
                              className={`text-[9.5px] font-mono font-bold tracking-tight select-none pointer-events-none ${
                                isLineHidden
                                  ? 'fill-slate-500 dark:fill-zinc-400'
                                  : 'fill-white dark:fill-[#0C0C09]'
                              }`}
                            >
                              {m.code}
                            </text>
                          </svg>
                        </button>
                      </div>

                      {/* Vertical Dashed Guide Line: ONLY in the release/project vertical area, and hidden when clicked */}
                      {!isLineHidden && (
                        <div
                          data-testid={`release-milestone-line-${rel.id}-${m.key}`}
                          style={{
                            top: `${diamondTop + diamondHeight}px`,
                            bottom: 0,
                          }}
                          className="absolute left-0 w-0 -translate-x-1/2 border-l-2 border-dashed border-indigo-600/70 dark:border-indigo-400/60 pointer-events-none"
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
                  className="absolute top-0 bottom-0 w-0.5 bg-[#0C0C09] dark:bg-zinc-400 z-10 pointer-events-none"
                >
                  <div className="absolute -top-0.5 -translate-x-1/2 px-1.5 py-0.5 rounded-[2px] bg-[#0C0C09] text-[#F4F4F1] text-[9px] font-mono font-bold tracking-wider shadow-none">
                    HOY
                  </div>
                </div>
              )}

              {/* Horizontal Row Guides */}
              {displayRows.map((row) => {
                if (row.kind === 'release') {
                  return (
                    <div
                      key={`row-bg-${row.rowId}`}
                      style={{ height: ROW_HEIGHT }}
                      className="border-b border-[#E2E2DC] dark:border-zinc-800 bg-[#F4F4F1]/30 dark:bg-zinc-900/30"
                    />
                  );
                }
                if (row.kind === 'project') {
                  return (
                    <div
                      key={`row-bg-${row.rowId}`}
                      style={{ height: ROW_HEIGHT }}
                      className="border-b border-[#0C0C09] dark:border-zinc-800 bg-[#F4F4F1] dark:bg-zinc-900"
                    />
                  );
                }
                const isHovered = hoveredId === row.item.id;
                return (
                  <div
                    key={`row-bg-${row.rowId}`}
                    style={{ height: ROW_HEIGHT }}
                    onMouseEnter={() => setHoveredId(row.item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`border-b border-[#E2E2DC] dark:border-zinc-800/70 transition-colors ${
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
                if (row.kind === 'release') {
                  const { group: rGroup } = row;
                  const releaseMilestones = rGroup.release.milestones || [];
                  const validMilestoneDates = releaseMilestones
                    .map((m) => m.date)
                    .filter((d): d is string => Boolean(d && typeof d === 'string'))
                    .sort();

                  const firstMilestoneDate = validMilestoneDates[0];
                  const lastMilestoneDate =
                    validMilestoneDates[validMilestoneDates.length - 1];

                  // Bar starts at first milestone (or group startDate) and extends strictly up to last milestone date
                  const effectiveStartDate =
                    firstMilestoneDate || rGroup.startDate;
                  const effectiveEndDate =
                    lastMilestoneDate || rGroup.endDate;

                  const rStart = parseDateSafe(effectiveStartDate);
                  const rEnd = parseDateSafe(effectiveEndDate);

                  const startOffsetDays = differenceInCalendarDays(
                    rStart,
                    timelineStart
                  );
                  const rStartX = startOffsetDays * dayWidth;
                  const spanDays = Math.max(
                    1,
                    differenceInCalendarDays(rEnd, rStart) + 1
                  );
                  const rWidth = Math.max(dayWidth, spanDays * dayWidth);

                  return (
                    <div
                      key={`release-summary-bar-${rGroup.release.id}`}
                      data-release-summary-bar={rGroup.release.id}
                      style={{
                        top: rowIndex * ROW_HEIGHT,
                        height: ROW_HEIGHT,
                      }}
                      className="absolute left-0 right-0 flex items-center pointer-events-none"
                    >
                      <div
                        style={{ left: rStartX, width: rWidth }}
                        className="relative flex items-center justify-between pointer-events-auto h-7 rounded-[4px] bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] px-2.5 shadow-md border border-[#0C0C09] dark:border-zinc-300 text-[10px] font-mono font-bold transition-all"
                        title={`${rGroup.release.name}: ${effectiveStartDate} → ${effectiveEndDate} (${spanDays}d · Acotado hasta su último hito: ${effectiveEndDate})`}
                      >
                        <span className="truncate flex items-center gap-1.5">
                          <Rocket className="w-3.5 h-3.5 text-amber-400 dark:text-indigo-600 shrink-0" />
                          <span className="font-semibold">{rGroup.release.code}</span>
                          {rWidth >= 220 && rGroup.release.month && (
                            <span className="opacity-80 text-[9px] uppercase font-normal hidden sm:inline">
                              {rGroup.release.month}
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {rWidth >= 170 && (
                            <span className="text-[9px] opacity-75 font-normal hidden md:inline">
                              Fin: {effectiveEndDate.split('-').slice(1).reverse().join('/')}
                            </span>
                          )}
                          <span className="px-1.5 py-0.2 rounded bg-white/20 dark:bg-black/10">
                            {rGroup.progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (row.kind === 'project') {
                  const { group } = row;
                  if (group.items.length === 0) return null;

                  const groupStart = parseDateSafe(group.startDate);
                  const startOffsetDays = differenceInCalendarDays(
                    groupStart,
                    timelineStart
                  );
                  const groupStartX = startOffsetDays * dayWidth;
                  const groupWidth = Math.max(dayWidth, group.duration * dayWidth);
                  const projTheme =
                    COLOR_STYLES[group.project.color] || COLOR_STYLES.indigo;

                  return (
                    <div
                      key={`summary-bar-${group.project.id}`}
                      data-project-summary-bar={group.project.id}
                      style={{
                        top: rowIndex * ROW_HEIGHT,
                        height: ROW_HEIGHT,
                      }}
                      className="absolute left-0 right-0 flex items-center pointer-events-none"
                    >
                      <div
                        style={{ left: groupStartX, width: groupWidth }}
                        onClick={() => onToggleProjectCollapse?.(group.project.id)}
                        title={`${group.project.name}: ${formatDateDisplay(
                          group.startDate,
                          'dd MMM'
                        )} → ${formatDateDisplay(group.endDate, 'dd MMM yyyy')} (${
                          group.duration
                        } días · ${group.progress}% completado)`}
                        className="relative flex flex-col justify-center cursor-pointer pointer-events-auto group"
                      >
                        {/* Top Label above Summary Bracket */}
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 dark:text-slate-200 mb-1 px-1">
                          <span className="truncate">
                            P{group.projectIndex}: {group.project.name} ({group.duration}d)
                          </span>
                          <span className="font-mono text-[#0C0C09] dark:text-zinc-200 ml-2 shrink-0 font-bold">
                            {group.progress}%
                          </span>
                        </div>

                        {/* Classic Gantt Project Summary Bracket Bar */}
                        <div className="relative h-3 rounded-t-[2px] bg-[#0C0C09] dark:bg-zinc-200 overflow-visible shadow-none">
                          {/* Progress Fill Inside Project Summary Bar */}
                          <div
                            style={{ width: `${group.progress}%` }}
                            className={`h-full rounded-tl-[2px] transition-all ${projTheme.fillBg}`}
                          />
                          {/* Left Bracket Downward Cap */}
                          <div className="absolute -bottom-1.5 left-0 w-2 h-2 bg-[#0C0C09] dark:bg-zinc-200 clip-path-bracket-left" />
                          {/* Right Bracket Downward Cap */}
                          <div className="absolute -bottom-1.5 right-0 w-2 h-2 bg-[#0C0C09] dark:bg-zinc-200 clip-path-bracket-right" />
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
                const isConnectSource = connectModeSource?.itemId === item.id;
                const isDimmed =
                  (hoveredId !== null ||
                    selectedItemId !== null ||
                    selectedDepLink !== null) &&
                  !relatedIds.has(item.id) &&
                  !isDepDropTarget &&
                  !isConnectSource;
                const isCrit = showCriticalPath && item.isCritical;
                const isDraggingThis = dragState && dragState.itemId === item.id;
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

                // Visual Slack width (user-configured slack, plus optional CPM float)
                const totalSlackDays = showCpmFloat
                  ? Math.max(item.slack, item.cpmTotalFloat)
                  : item.slack;
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

                return (
                  <div
                    key={`bar-${item.id}`}
                    style={{
                      top: coords.index * ROW_HEIGHT,
                      height: ROW_HEIGHT,
                    }}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`absolute left-0 right-0 flex items-center pointer-events-none transition-opacity ${
                      isDimmed ? 'opacity-40' : 'opacity-100'
                    }`}
                  >
                    {item.type === 'milestone' ? (
                      /* MILESTONE RENDERER (◆ Diamond) + Dependency Connector Ports */
                      <div
                        style={{ left: barLeft }}
                        onMouseDown={(e) => handleBarMouseDown(e, item, 'move')}
                        onClick={(e) => handleBarClick(e, item.id)}
                        onDoubleClick={() => onEditModal(item)}
                        data-timeline-milestone={item.id}
                        data-milestone-color={item.color}
                        className={`absolute z-20 flex items-center pointer-events-auto group cursor-grab active:cursor-grabbing ${
                          isDraggingThis ? 'z-40' : ''
                        }`}
                      >
                        {/* Left Input Dependency Connector Port (Sucesora) */}
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
                          title="Puerto de entrada: arrastra o haz clic para conectar una predecesora a este hito"
                          className={`absolute -left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-500 hover:bg-indigo-600 hover:scale-125 shadow-sm transition-all cursor-crosshair z-30 ${
                            showPortHandles
                              ? 'opacity-100 scale-105'
                              : 'opacity-0 group-hover:opacity-100'
                          } ${
                            isDepDropTarget
                              ? 'ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100'
                              : ''
                          }`}
                        />

                        {/* Right Output Dependency Connector Port (Predecesora) */}
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
                          title="Puerto de salida: arrastra hacia otra tarea/hito o haz clic para crear dependencia"
                          className={`absolute left-[22px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-600 hover:bg-indigo-500 hover:scale-125 shadow-sm transition-all cursor-crosshair z-30 ${
                            showPortHandles
                              ? 'opacity-100 scale-105'
                              : 'opacity-0 group-hover:opacity-100'
                          } ${
                            isConnectSource
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
                          className={`w-5 h-5 rotate-45 rounded-[4px] border-2 shadow-md transition-transform group-hover:scale-125 ${
                            isDraggingThis
                              ? 'scale-125 ring-2 ring-indigo-500 shadow-xl'
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
                              : styleTheme.diamondBg
                          }`}
                        />
                        <div
                          className={`ml-4 px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap shadow-sm ${styleTheme.diamondPill}`}
                        >
                          ◆ {item.name}{' '}
                          <span className="font-mono text-[10px] opacity-75">
                            ({formatDateDisplay(coords.effectiveStartStr, 'dd MMM')})
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* STANDARD TASK BAR + SLACK EXTENSION BAR + Dependency Connector Ports */
                      <div
                        style={{ left: barLeft }}
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
                          {/* Left Input Dependency Connector Port (Sucesora) */}
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
                            title="Puerto de entrada: arrastra o haz clic para conectar una predecesora a esta tarea"
                            className={`absolute -left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-500 hover:bg-indigo-600 hover:scale-125 shadow-sm transition-all cursor-crosshair z-30 ${
                              showPortHandles
                                ? 'opacity-100 scale-105'
                                : 'opacity-0 group-hover:opacity-100'
                            } ${
                              isDepDropTarget
                                ? 'ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100'
                                : ''
                            }`}
                          />

                          {/* Main Task Bar */}
                          <div
                            style={{ width: barWidth }}
                            onMouseDown={(e) => handleBarMouseDown(e, item, 'move')}
                            onClick={(e) => handleBarClick(e, item.id)}
                            onDoubleClick={() => onEditModal(item)}
                            data-timeline-task={item.id}
                            className={`relative h-7 rounded-[4px] border overflow-hidden cursor-grab active:cursor-grabbing shadow-none transition-shadow ${
                              styleTheme.barBg
                            } ${
                              isDraggingThis
                                ? 'ring-2 ring-[#0C0C09] ring-offset-1 dark:ring-offset-black opacity-95'
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

                            {/* Task Label Inside Bar (only when bar is wide enough) */}
                            {barWidth >= 56 && (
                              <div className="absolute inset-0 px-2.5 flex items-center justify-between text-[11px] font-semibold pointer-events-none">
                                <span className="truncate text-white drop-shadow-xs">
                                  {item.name}
                                </span>
                                {barWidth >= 70 && (
                                  <span className="font-mono text-[10px] ml-1 shrink-0 text-white/85">
                                    {coords.effectiveDuration}d
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Right-Edge Drag Handle for Duration Resizing */}
                            <div
                              onMouseDown={(e) => handleBarMouseDown(e, item, 'resize')}
                              title="Arrastra el borde derecho para cambiar la duración"
                              className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-white/20 flex items-center justify-center"
                            >
                              <div className="w-0.5 h-3.5 bg-white/70 rounded-[1px]" />
                            </div>
                          </div>

                          {/* Right Output Dependency Connector Port (Predecesora) */}
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
                            title="Puerto de salida: arrastra hacia otra tarea/hito o haz clic para crear dependencia"
                            className={`absolute -right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-600 hover:bg-indigo-500 hover:scale-125 shadow-sm transition-all cursor-crosshair z-30 ${
                              showPortHandles
                                ? 'opacity-100 scale-105'
                                : 'opacity-0 group-hover:opacity-100'
                            } ${
                              isConnectSource
                                ? 'ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100'
                                : ''
                            }`}
                          />
                        </div>

                        {/* SLACK / HOLGURA GHOST BAR EXTENSION */}
                        {slackWidth > 0 && (
                          <div
                            style={{
                              width: slackWidth,
                              backgroundImage:
                                'repeating-linear-gradient(45deg, rgba(245, 158, 11, 0.22) 0px, rgba(245, 158, 11, 0.22) 5px, transparent 5px, transparent 10px)',
                            }}
                            onClick={() => onEditModal(item)}
                            title={`Holgura (Slack): +${totalSlackDays} día(s) hasta el ${formatDateDisplay(
                              effectiveSlackEndDateStr,
                              'dd MMM yyyy'
                            )}`}
                            className="h-6 -ml-0.5 rounded-r-lg border-y border-r border-dashed border-amber-500/80 dark:border-amber-400/80 flex items-center justify-center px-1.5 cursor-pointer hover:bg-amber-500/10 transition"
                          >
                            <span className="font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-300 truncate">
                              +{totalSlackDays}d slack
                            </span>
                          </div>
                        )}

                        {/* Outside Label when bar is narrow */}
                        {barWidth < 56 && (
                          <span className="ml-3 text-[11px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap pointer-events-none">
                            {item.name} ({coords.effectiveDuration}d)
                          </span>
                        )}
                      </div>
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
                Modo conexión activo desde{' '}
                <strong>
                  #
                  {enrichedItemById.get(connectModeSource.itemId)?.wbsCode ||
                    enrichedItemById.get(connectModeSource.itemId)?.wbs}{' '}
                  {enrichedItemById.get(connectModeSource.itemId)?.name}
                </strong>{' '}
                — Haz clic en otra tarea o hito del diagrama para crear la dependencia
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

        {/* Non-intrusive Top-Right Docked Inspection Panel on Click */}
        {selectedItem && (
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
                    onClick={() => setSelectedItemId(null)}
                    className="p-1 rounded-[2px] hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-[#0C0C09] dark:hover:text-white transition shrink-0 cursor-pointer"
                    title="Cerrar panel de detalles"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })()}

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

            {/* Actions: Toggle Diagram Visibility & Edit button */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E2E2DC] dark:border-zinc-800">
              <button
                type="button"
                data-testid={`panel-toggle-task-visibility-${selectedItem.id}`}
                onClick={() => {
                  onUpdateItem({ ...selectedItem, hidden: !selectedItem.hidden }, false);
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
              <button
                type="button"
                onClick={() => {
                  onEditModal(selectedItem);
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
            data-testid="project-details-modal"
            onClick={() => setInspectingProject(null)}
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
                    className="w-full px-3 py-2 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-[#0C0C09] dark:text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
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
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E2DC] dark:border-zinc-800">
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
        )}
      </div>
    </div>
  );
};

