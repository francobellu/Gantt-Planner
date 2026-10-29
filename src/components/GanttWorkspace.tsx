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
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Diamond,
  Edit3,
  Flame,
  FolderKanban,
  GitBranch,
  GripHorizontal,
  Layers,
  Maximize2,
  Minus,
  MousePointer,
  Plus,
  SlidersHorizontal,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  ArrowVisibility,
  ComputedGanttItem,
  ComputedProjectGroup,
  DependencyType,
  GanttItem,
  GanttProject,
  TaskColor,
  ZoomLevel,
} from '../types/gantt';
import {
  calculateDurationFromDates,
  calculateEndDateFromDuration,
  clampDayWidth,
  computeFitToProjectScale,
  computeTimelineBounds,
  computeWheelZoomDayWidth,
  createRoundedOrthogonalPath,
  formatDateDisplay,
  formatDateISO,
  formatScrubberDate,
  getDayWidthForPreset,
  groupItemsByProject,
  MAX_DAY_WIDTH,
  MIN_DAY_WIDTH,
  OrthogonalPoint,
  parseDateSafe,
} from '../utils/ganttEngine';

interface GanttWorkspaceProps {
  items: ComputedGanttItem[];
  projects?: GanttProject[];
  groupByProject?: boolean;
  selectedProjectId?: string;
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
  onEditModal: (item: ComputedGanttItem) => void;
  onDeleteItem: (id: string) => void;
  onDuplicateItem: (item: ComputedGanttItem) => void;
  onQuickAdd: (type: 'task' | 'milestone', projectId?: string) => void;
  onToggleGroupByProject?: () => void;
  onToggleProjectCollapse?: (projectId: string) => void;
  onUpdateProject?: (project: GanttProject) => void;
  onDeleteProject?: (projectId: string) => void;
  onCreateProject?: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  initialSelectedItemId?: string;
  initialHoveredItemId?: string;
  initialCursorScrubber?: { x: number; date: Date };
}

type DisplayRow =
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
  }
> = {
  indigo: {
    barBg: 'bg-indigo-500/25 dark:bg-indigo-500/30',
    fillBg: 'bg-indigo-600 dark:bg-indigo-500',
    border: 'border-indigo-600/60 dark:border-indigo-400/60',
    text: 'text-indigo-950 dark:text-indigo-100',
    badge: 'bg-indigo-500',
    groupRowBg: 'bg-indigo-50/70 dark:bg-indigo-950/35',
    groupBadgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  },
  blue: {
    barBg: 'bg-blue-500/25 dark:bg-blue-500/30',
    fillBg: 'bg-blue-600 dark:bg-blue-500',
    border: 'border-blue-600/60 dark:border-blue-400/60',
    text: 'text-blue-950 dark:text-blue-100',
    badge: 'bg-blue-500',
    groupRowBg: 'bg-blue-50/70 dark:bg-blue-950/35',
    groupBadgeBg: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  },
  emerald: {
    barBg: 'bg-emerald-500/25 dark:bg-emerald-500/30',
    fillBg: 'bg-emerald-600 dark:bg-emerald-500',
    border: 'border-emerald-600/60 dark:border-emerald-400/60',
    text: 'text-emerald-950 dark:text-emerald-100',
    badge: 'bg-emerald-500',
    groupRowBg: 'bg-emerald-50/70 dark:bg-emerald-950/35',
    groupBadgeBg:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  amber: {
    barBg: 'bg-amber-500/25 dark:bg-amber-500/30',
    fillBg: 'bg-amber-500 dark:bg-amber-500',
    border: 'border-amber-600/60 dark:border-amber-400/60',
    text: 'text-amber-950 dark:text-amber-100',
    badge: 'bg-amber-500',
    groupRowBg: 'bg-amber-50/70 dark:bg-amber-950/35',
    groupBadgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  rose: {
    barBg: 'bg-rose-500/25 dark:bg-rose-500/30',
    fillBg: 'bg-rose-600 dark:bg-rose-500',
    border: 'border-rose-600/60 dark:border-rose-400/60',
    text: 'text-rose-950 dark:text-rose-100',
    badge: 'bg-rose-500',
    groupRowBg: 'bg-rose-50/70 dark:bg-rose-950/35',
    groupBadgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  },
  violet: {
    barBg: 'bg-violet-500/25 dark:bg-violet-500/30',
    fillBg: 'bg-violet-600 dark:bg-violet-500',
    border: 'border-violet-600/60 dark:border-violet-400/60',
    text: 'text-violet-950 dark:text-violet-100',
    badge: 'bg-violet-500',
    groupRowBg: 'bg-violet-50/70 dark:bg-violet-950/35',
    groupBadgeBg:
      'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  },
  cyan: {
    barBg: 'bg-cyan-500/25 dark:bg-cyan-500/30',
    fillBg: 'bg-cyan-600 dark:bg-cyan-500',
    border: 'border-cyan-600/60 dark:border-cyan-400/60',
    text: 'text-cyan-950 dark:text-cyan-100',
    badge: 'bg-cyan-500',
    groupRowBg: 'bg-cyan-50/70 dark:bg-cyan-950/35',
    groupBadgeBg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  },
};

export const GanttWorkspace: React.FC<GanttWorkspaceProps> = ({
  items,
  projects = [],
  groupByProject = true,
  selectedProjectId = 'all',
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
  initialSelectedItemId,
  initialHoveredItemId,
  initialCursorScrubber,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(
    initialHoveredItemId || null
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    initialSelectedItemId || null
  );
  const [cursorScrubber, setCursorScrubber] = useState<{
    x: number;
    date: Date;
  } | null>(initialCursorScrubber || null);
  const hasDraggedRef = useRef<boolean>(false);
  const [splitWidth, setSplitWidth] = useState<number>(440);
  const [showTable, setShowTable] = useState<boolean>(true);
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

  const toggleVisibleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('ganttflow_visible_cols', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

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

  const visibleProjectGroups = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === 'all') {
      return allProjectGroups;
    }
    return allProjectGroups.filter((g) => g.project.id === selectedProjectId);
  }, [allProjectGroups, selectedProjectId]);

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

  // Unified row list (Project group headers + Task/Milestone rows) so Left WBS Table and Right Timeline stay 100% aligned
  const displayRows = useMemo<DisplayRow[]>(() => {
    const rows: DisplayRow[] = [];
    if (groupByProject) {
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
  }, [groupByProject, visibleProjectGroups]);

  // Compute timeline date range with padding before and after project
  const { timelineDays, timelineStart, monthGroups, todayIndex } = useMemo(() => {
    const today = startOfDay(new Date());
    const { timelineStart: paddedStart, timelineEnd: paddedEnd } =
      computeTimelineBounds(items, today);
    const days = eachDayOfInterval({ start: paddedStart, end: paddedEnd });

    // Group consecutive days by Month + Year for the top header tier
    const groups: { label: string; shortLabel: string; count: number }[] = [];
    for (const day of days) {
      const label = format(day, 'MMMM yyyy', { locale: es });
      const shortLabel = format(day, 'MMM yy', { locale: es });
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
  }, [items]);

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
          autoCascade
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
          autoCascade
        );
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleBarClick = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
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
  }, [hoveredId, selectedItemId, items]);

  // Memoized dependency links with channel separation (multi-lane routing),
  // unified left-anchor entrance, smooth rounded corners (fillet curves), and density/visibility filtering
  const dependencyLinks = useMemo(() => {
    if (arrowVisibility === 'none') return [];

    const incomingMap = new Map<string, string[]>();
    const outgoingMap = new Map<string, string[]>();

    for (const succ of items) {
      if (!succ.dependencies || succ.dependencies.length === 0) continue;
      const succCoords = itemRowMap.get(succ.id);
      if (!succCoords) continue;

      for (const predId of succ.dependencies) {
        const predCoords = itemRowMap.get(predId);
        if (!predCoords) continue;
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
      dPath: string;
      strokeColor: string;
      strokeWidth: number;
      markerEnd: string;
      hasConflict: boolean;
      isHighlighted: boolean;
      isCriticalLink: boolean;
    }> = [];

    for (const succ of items) {
      if (!succ.dependencies || succ.dependencies.length === 0) continue;
      const succCoords = itemRowMap.get(succ.id);
      if (!succCoords) continue;

      const succPreds = incomingMap.get(succ.id) || [];
      const totalIncoming = succPreds.length;

      succ.dependencies.forEach((predId) => {
        const predCoords = itemRowMap.get(predId);
        if (!predCoords) return;
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

        const isHighlighted =
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

        const strokeColor = isCriticalLink
          ? '#f43f5e'
          : isHighlighted
          ? '#4f46e5'
          : '#94a3b8';

        const markerEnd = isCriticalLink
          ? 'url(#arrow-critical)'
          : isHighlighted
          ? 'url(#arrow-active)'
          : 'url(#arrow-normal)';

        list.push({
          key: `dep-${predId}-${succ.id}`,
          predId,
          succId: succ.id,
          dPath,
          strokeColor,
          strokeWidth: isHighlighted || isCriticalLink ? 2.2 : 1.5,
          markerEnd,
          hasConflict: succ.hasConflict,
          isHighlighted,
          isCriticalLink,
        });
      });
    }

    return list;
  }, [
    items,
    itemRowMap,
    hoveredId,
    selectedItemId,
    showCriticalPath,
    arrowVisibility,
  ]);

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

  // Track cursor position and exact calendar date over timeline canvas for the date scrubber
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState || isResizingSplitRef.current) {
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
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Main Synchronized Split View */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* LEFT PANE: WBS Editable Data Grid */}
        {showTable && (
          <>
            <div
              style={{ width: splitWidth }}
              className="shrink-0 flex flex-col border-r border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#09090b] overflow-hidden select-none"
            >
              <div className="overflow-x-auto flex-1 flex flex-col">
                <div className="min-w-full flex-1 flex flex-col">
                  {/* Minimalist Table Header (matches timeline HEADER_HEIGHT = 60px) */}
                  <div
                    style={{ height: HEADER_HEIGHT }}
                    className="flex items-center justify-between px-3 bg-slate-100/90 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 shrink-0 select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-8 font-mono">#</span>
                      <span>Nombre</span>
                    </div>

                    {/* Column Titles & Icon-Only Configurator */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2.5 text-right">
                        {visibleColumns.team && (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-semibold">
                            Equipo
                          </span>
                        )}
                        {visibleColumns.dates && (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-semibold">
                            Fechas
                          </span>
                        )}
                        {visibleColumns.dur && (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-semibold">
                            Dur.
                          </span>
                        )}
                        {visibleColumns.slack && (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-semibold">
                            Slack
                          </span>
                        )}
                        {visibleColumns.deps && (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-semibold">
                            Deps
                          </span>
                        )}
                      </div>

                      {/* Botón de Columnas: SOLO ICONO VECTORIAL (sin texto) */}
                      <div className="relative" data-dropdown-container="true">
                        <button
                          type="button"
                          onClick={() => setShowColumnsMenu((prev) => !prev)}
                          className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                          aria-label="Configurar columnas"
                          title="Columnas visibles"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {showColumnsMenu && (
                          <div className="absolute right-0 top-8 w-44 p-1.5 bg-white dark:bg-zinc-900/98 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl z-50 text-xs flex flex-col gap-1">
                            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 border-b border-slate-200 dark:border-zinc-800/80">
                              Mostrar Columnas
                            </div>
                            <label className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/60 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={visibleColumns.team}
                                onChange={() => toggleVisibleColumn('team')}
                                className="rounded border-slate-300 dark:border-zinc-700 text-indigo-600"
                              />
                              <span className="text-slate-700 dark:text-zinc-300">Equipo</span>
                            </label>
                            <label className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/60 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={visibleColumns.dates}
                                onChange={() => toggleVisibleColumn('dates')}
                                className="rounded border-slate-300 dark:border-zinc-700 text-indigo-600"
                              />
                              <span className="text-slate-700 dark:text-zinc-300">Fechas</span>
                            </label>
                            <label className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/60 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={visibleColumns.dur}
                                onChange={() => toggleVisibleColumn('dur')}
                                className="rounded border-slate-300 dark:border-zinc-700 text-indigo-600"
                              />
                              <span className="text-slate-700 dark:text-zinc-300">Duración</span>
                            </label>
                            <label className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/60 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={visibleColumns.slack}
                                onChange={() => toggleVisibleColumn('slack')}
                                className="rounded border-slate-300 dark:border-zinc-700 text-indigo-600"
                              />
                              <span className="text-slate-700 dark:text-zinc-300">Slack</span>
                            </label>
                            <label className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/60 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={visibleColumns.deps}
                                onChange={() => toggleVisibleColumn('deps')}
                                className="rounded border-slate-300 dark:border-zinc-700 text-indigo-600"
                              />
                              <span className="text-slate-700 dark:text-zinc-300">Dependencias</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Table Body Rows */}
                  <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                    {displayRows.map((row) => {
                      if (row.kind === 'project') {
                        const { group } = row;
                        const projTheme =
                          COLOR_STYLES[group.project.color] || COLOR_STYLES.indigo;
                        const isCollapsed = Boolean(group.project.collapsed);

                        return (
                          <div
                            key={row.rowId}
                            data-project-group={group.project.id}
                            style={{ height: ROW_HEIGHT }}
                            className={`flex items-center justify-between px-3 text-xs font-semibold border-y border-slate-200/80 dark:border-zinc-800/80 transition-colors ${projTheme.groupRowBg}`}
                          >
                            {/* Project Header Title + Collapse Toggle */}
                            <div className="flex items-center gap-1.5 pr-2 flex-1 min-w-0">
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

                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white shrink-0 ${projTheme.badge}`}
                              >
                                P{group.projectIndex}
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
                                className="flex-1 min-w-[140px] bg-transparent font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-zinc-800 focus:px-1.5 focus:py-0.5 rounded outline-none focus:ring-1 focus:ring-indigo-500"
                                title="Haz clic para renombrar este proyecto"
                              />

                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono border shrink-0 ${projTheme.groupBadgeBg}`}
                                title={`${group.tasksCount} tarea(s) y ${group.milestonesCount} hito(s)`}
                              >
                                {group.items.length} ítems
                              </span>
                            </div>

                            {/* Extra Project Stats based on visibleColumns */}
                            <div className="flex items-center gap-2.5 shrink-0 text-right">
                              {visibleColumns.dates && (
                                <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-400">
                                  {group.items.length > 0
                                    ? `${formatDateDisplay(group.startDate, 'dd MMM')} → ${formatDateDisplay(group.endDate, 'dd MMM')}`
                                    : '-'}
                                </span>
                              )}
                              {visibleColumns.dur && (
                                <span className="px-1.5 py-0.5 rounded bg-white/80 dark:bg-zinc-800 font-mono text-[10px] font-bold text-slate-800 dark:text-zinc-200 border border-slate-200/70 dark:border-zinc-700">
                                  {group.duration}d
                                </span>
                              )}
                              {visibleColumns.slack && (
                                <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
                                  +{group.totalSlack}d
                                </span>
                              )}

                              {/* Project Quick Actions (Fit to Screen, +Task, +Milestone, Delete) */}
                              <div className="flex items-center gap-0.5">
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
                                {allProjectGroups.length > 1 && onDeleteProject && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteProject(group.project.id)}
                                    className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-600"
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
                      const isHovered = hoveredId === item.id;
                      const isCrit = showCriticalPath && item.isCritical;
                      return (
                        <div
                          key={row.rowId}
                          style={{ height: ROW_HEIGHT }}
                          onMouseEnter={() => setHoveredId(item.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          className={`flex items-center justify-between px-3 text-xs transition-colors border-b border-slate-100 dark:border-zinc-800/50 ${
                            isHovered
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                              : isCrit
                              ? 'bg-rose-50/30 dark:bg-rose-950/10'
                              : 'hover:bg-slate-50 dark:hover:bg-zinc-900/40'
                          }`}
                        >
                          {/* WBS + Name + Full Readability without Truncation */}
                          <div
                            className={`flex items-center gap-1.5 pr-2 flex-1 min-w-0 ${
                              groupByProject ? 'pl-4' : ''
                            }`}
                          >
                            <span
                              className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 shrink-0"
                              title={`Código WBS ${item.wbsCode || item.wbs} (Global #${item.wbs})`}
                            >
                              {groupByProject ? item.wbsCode || `${item.wbs}.` : `${item.wbs}.`}
                            </span>
                            {item.type === 'milestone' ? (
                              <Diamond className="w-3.5 h-3.5 text-amber-500 fill-current shrink-0" />
                            ) : (
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  COLOR_STYLES[item.color]?.badge || 'bg-indigo-500'
                                }`}
                              />
                            )}
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                onUpdateItem({ ...item, name: e.target.value }, false)
                              }
                              className="flex-1 min-w-[140px] bg-transparent font-medium text-slate-800 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:px-1.5 focus:py-0.5 rounded outline-none focus:ring-1 focus:ring-indigo-500"
                              title={`${item.name} (${group.project.name})`}
                            />
                            {isCrit && (
                              <span
                                title="En Ruta Crítica (Slack = 0)"
                                className="px-1 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[9px] font-bold shrink-0"
                              >
                                CRÍT
                              </span>
                            )}
                            {item.hasConflict && (
                              <span
                                title={item.conflictMessage}
                                className="text-rose-500 shrink-0"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>

                          {/* Extra Columns based on visibleColumns */}
                          <div className="flex items-center gap-2.5 shrink-0 text-right">
                            {visibleColumns.team && (
                              <span
                                data-assignee-badge={item.assignee || 'Sin asignar'}
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-[10px] font-medium shrink-0 border border-slate-200/80 dark:border-zinc-700"
                                title={`Equipo / Responsable: ${item.assignee || 'Sin asignar'}`}
                              >
                                {item.assignee || '—'}
                              </span>
                            )}

                            {visibleColumns.dates && (
                              <span className="font-mono text-[10px] text-slate-600 dark:text-zinc-400">
                                {formatDateDisplay(item.startDate, 'dd/MM')} → {formatDateDisplay(item.endDate, 'dd/MM')}
                              </span>
                            )}

                            {visibleColumns.dur && (
                              <span className="font-mono text-[10px] text-slate-600 dark:text-zinc-400">
                                {item.duration}d
                              </span>
                            )}

                            {visibleColumns.slack && (
                              <span className="font-mono text-[10px] text-slate-600 dark:text-zinc-400">
                                +{item.slack}d
                              </span>
                            )}

                            {visibleColumns.deps && (
                              <span
                                className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 max-w-[80px] truncate"
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
                            )}

                            {/* Quick row actions: Edit modal, Duplicate, Delete */}
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => onEditModal(item)}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-indigo-500"
                                title="Editar detalles completos en modal"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDuplicateItem(item)}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-indigo-500"
                                title="Duplicar ítem"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteItem(item.id)}
                                className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-600"
                                title="Eliminar ítem"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Quick Add Footer Row */}
                    <div
                      style={{ height: 52 }}
                      className="flex items-center gap-2 px-4 bg-slate-50/40 dark:bg-slate-900/40"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onQuickAdd(
                            'task',
                            selectedProjectId !== 'all' ? selectedProjectId : undefined
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Añadir Tarea
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onQuickAdd(
                            'milestone',
                            selectedProjectId !== 'all' ? selectedProjectId : undefined
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition"
                      >
                        <Diamond className="w-3.5 h-3.5" />
                        Añadir Hito
                      </button>
                      {onCreateProject && (
                        <button
                          type="button"
                          onClick={onCreateProject}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 hover:bg-violet-100 transition"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          Añadir Proyecto
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resizable Split Handle */}
            <div
              onMouseDown={handleSplitMouseDown}
              className="w-1.5 cursor-col-resize bg-slate-200/70 dark:bg-slate-800 hover:bg-indigo-500 dark:hover:bg-indigo-500 transition-colors flex items-center justify-center group shrink-0"
              title="Arrastra para redimensionar la tabla"
            >
              <GripHorizontal className="w-3 h-3 text-slate-400 group-hover:text-white rotate-90" />
            </div>
          </>
        )}

        {/* RIGHT PANE: Interactive Gantt Timeline Canvas */}
        <div
          ref={scrollContainerRef}
          onClick={() => setSelectedItemId(null)}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-white dark:bg-slate-950 select-none"
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
                  {/* Floating pill badge at the top displaying exact calendar date */}
                  <div
                    style={{
                      transform: `translateX(calc(-50% + ${badgeClampOffset}px))`,
                    }}
                    className="sticky top-1.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 dark:bg-zinc-900 text-white dark:text-zinc-100 shadow-2xl border border-slate-700/80 dark:border-zinc-700 text-xs font-mono font-bold whitespace-nowrap w-max shrink-0 z-50 transition-transform ring-1 ring-black/40 dark:ring-white/10"
                  >
                    <Calendar className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-400 shrink-0" />
                    <span className="tracking-wide drop-shadow-sm">{formatScrubberDate(cursorScrubber.date)}</span>
                  </div>
                  {/* Sleek vertical tracking line centered right on the cursor position */}
                  <div className="absolute top-0 bottom-0 left-0 w-px -translate-x-1/2 bg-indigo-500/80 dark:bg-indigo-400/80 shadow-xs" />
                </div>
              );
            })()}

            {/* Two-Tier Timeline Header (60px total height) */}
            <div
              style={{ height: HEADER_HEIGHT }}
              className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 flex flex-col"
            >
              {/* Top Tier: Month + Year */}
              <div className="flex h-7 border-b border-slate-200/80 dark:border-slate-800">
                {monthGroups.map((group, idx) => {
                  const groupPx = group.count * dayWidth;
                  return (
                    <div
                      key={idx}
                      style={{ width: groupPx }}
                      className="px-2 flex items-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 border-r-2 border-slate-300 dark:border-slate-700 truncate"
                      title={group.label}
                    >
                      {groupPx >= 85
                        ? group.label
                        : groupPx >= 36
                        ? group.shortLabel
                        : ''}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Tier: Adaptive Days / Weeks / Ticks */}
              <div className="flex flex-1 items-center">
                {timelineDays.map((day, idx) => {
                  const isToday = idx === todayIndex;
                  const wknd = isWeekend(day);
                  const dayNum = format(day, 'd');
                  const dayLetter = format(day, 'EEEEE', { locale: es }).toUpperCase();
                  const isMonday = day.getDay() === 1;
                  const isMonthStart = day.getDate() === 1;
                  const isMidMonth = day.getDate() === 15;
                  const isLastDayOfMonth =
                    idx < timelineDays.length - 1 && timelineDays[idx + 1].getDate() === 1;

                  const showTickBorder =
                    dayWidth >= 14 || isMonday || isMonthStart || isToday || isLastDayOfMonth;

                  return (
                    <div
                      key={idx}
                      style={{ width: dayWidth }}
                      className={`relative h-full flex flex-col items-center justify-center ${
                        showTickBorder
                          ? isLastDayOfMonth
                            ? 'border-r-2 border-slate-300 dark:border-slate-700'
                            : 'border-r border-slate-200/60 dark:border-slate-800/70'
                          : ''
                      } text-[10px] font-mono ${
                        isToday
                          ? 'bg-indigo-600 text-white font-bold z-10'
                          : wknd && dayWidth >= 8
                          ? 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {dayWidth >= 34 ? (
                        <div className="flex items-center gap-0.5">
                          <span className="opacity-70">{dayLetter}</span>
                          <span>{dayNum}</span>
                        </div>
                      ) : dayWidth >= 18 ? (
                        <span>{dayNum}</span>
                      ) : dayWidth >= 11 ? (
                        idx % 2 === 0 && <span className="text-[9px]">{dayNum}</span>
                      ) : dayWidth >= 5.5 ? (
                        isMonday && (
                          <span className="absolute left-1 text-[9px] font-semibold whitespace-nowrap pointer-events-none">
                            {dayNum}
                          </span>
                        )
                      ) : (
                        (isMonthStart || isMidMonth) && (
                          <span className="absolute left-1 text-[9px] font-semibold whitespace-nowrap pointer-events-none">
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
                          ? 'border-r border-slate-100 dark:border-slate-900/80'
                          : ''
                      } ${
                        wknd && dayWidth >= 8
                          ? 'bg-slate-100/50 dark:bg-slate-900/40'
                          : ''
                      }`}
                    />
                  );
                })}
              </div>

              {/* Vertical Month Separators across Canvas Body */}
              <div className="absolute inset-0 flex pointer-events-none z-[5]">
                {monthGroups.map((group, mIdx) => (
                  <div
                    key={`month-divider-${mIdx}`}
                    data-month-divider={mIdx}
                    style={{ width: group.count * dayWidth }}
                    className={`h-full shrink-0 border-r-2 border-slate-300 dark:border-slate-700 ${
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
                    tier === 1 ? 'top-6' : tier === 2 ? 'top-11.5' : 'top-0.5';

                  return (
                    <div
                      key={`milestone-guide-${m.id}`}
                      data-milestone-guide={m.id}
                      data-milestone-x={milestoneX}
                      style={{ left: milestoneX }}
                      className="absolute top-0 bottom-0 pointer-events-none z-10 flex flex-col items-center"
                    >
                      {/* Top Diamond Pill Marker */}
                      <div
                        style={{
                          transform: `translateX(calc(-50% + ${badgeClampOffset}px))`,
                        }}
                        className={`absolute ${tierTopClass} flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold shadow-sm whitespace-nowrap z-20 ${
                          isCrit
                            ? 'bg-rose-500 text-white ring-1 ring-rose-400'
                            : 'bg-amber-500 text-white ring-1 ring-amber-400'
                        }`}
                        title={`Hito: ${m.name} (${formatDateDisplay(m.startDate, 'dd MMM yyyy')})`}
                      >
                        <span className="text-[8px] leading-none">◆</span>
                        <span className="max-w-[80px] sm:max-w-[120px] truncate">{m.name}</span>
                      </div>

                      {/* Vertical Dashed Guide Line from Top to Bottom */}
                      <div className="w-0 h-full border-l-2 border-dashed border-amber-500/60 dark:border-amber-400/60" />
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
                  className="absolute top-0 bottom-0 w-0.5 bg-indigo-500/80 dark:bg-indigo-400/80 z-10 pointer-events-none"
                >
                  <div className="absolute -top-0.5 -translate-x-1/2 px-1.5 py-0.5 rounded-b bg-indigo-600 text-white text-[9px] font-bold tracking-wider shadow">
                    HOY
                  </div>
                </div>
              )}

              {/* Horizontal Row Guides */}
              {displayRows.map((row) => {
                if (row.kind === 'project') {
                  return (
                    <div
                      key={`row-bg-${row.rowId}`}
                      style={{ height: ROW_HEIGHT }}
                      className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60"
                    />
                  );
                }
                const isHovered = hoveredId === row.item.id;
                return (
                  <div
                    key={`row-bg-${row.rowId}`}
                    style={{ height: ROW_HEIGHT }}
                    className={`border-b border-slate-100 dark:border-slate-800/70 transition-colors ${
                      isHovered ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                    }`}
                  />
                );
              })}

              {/* Orthogonal SVG Dependency Lines Overlay */}
              {arrowVisibility !== 'none' && (
                <svg
                  width={totalCanvasWidth}
                  height={displayRows.length * ROW_HEIGHT + 52}
                  className="absolute inset-0 pointer-events-none z-10 overflow-visible"
                  data-arrow-visibility={arrowVisibility}
                >
                  <defs>
                    <marker
                      id="arrow-normal"
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
                    </marker>
                    <marker
                      id="arrow-active"
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#4f46e5" />
                    </marker>
                    <marker
                      id="arrow-critical"
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f43f5e" />
                    </marker>
                  </defs>

                  {dependencyLinks.map((link) => (
                    <path
                      key={link.key}
                      d={link.dPath}
                      fill="none"
                      stroke={link.strokeColor}
                      strokeWidth={link.strokeWidth}
                      strokeDasharray={link.hasConflict ? '4 3' : undefined}
                      markerEnd={link.markerEnd}
                      className="transition-opacity duration-150"
                      style={{
                        opacity: hoveredId && !link.isHighlighted ? 0.25 : 0.95,
                      }}
                    />
                  ))}
                </svg>
              )}

              {/* Foreground Project Rollup Summary Bars, Task Bars, Slack Ghost Bars & Milestones */}
              {displayRows.map((row, rowIndex) => {
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
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 ml-2 shrink-0">
                            {group.progress}%
                          </span>
                        </div>

                        {/* Classic Gantt Project Summary Bracket Bar */}
                        <div className="relative h-3.5 rounded-t-sm bg-slate-800/85 dark:bg-slate-200/85 overflow-visible shadow-sm">
                          {/* Progress Fill Inside Project Summary Bar */}
                          <div
                            style={{ width: `${group.progress}%` }}
                            className={`h-full rounded-tl-sm transition-all ${projTheme.fillBg}`}
                          />
                          {/* Left Bracket Downward Cap */}
                          <div className="absolute -bottom-1.5 left-0 w-2 h-2 bg-slate-800 dark:bg-slate-200 clip-path-bracket-left" />
                          {/* Right Bracket Downward Cap */}
                          <div className="absolute -bottom-1.5 right-0 w-2 h-2 bg-slate-800 dark:bg-slate-200 clip-path-bracket-right" />
                        </div>
                      </div>
                    </div>
                  );
                }

                // Task or Milestone Bar
                const { item, group } = row;
                const coords = itemRowMap.get(item.id);
                if (!coords) return null;

                const isHovered = hoveredId === item.id;
                const isSelected = selectedItemId === item.id;
                const isDimmed =
                  (hoveredId !== null || selectedItemId !== null) &&
                  !relatedIds.has(item.id);
                const isCrit = showCriticalPath && item.isCritical;
                const isDraggingThis = dragState && dragState.itemId === item.id;
                const styleTheme = COLOR_STYLES[item.color] || COLOR_STYLES.indigo;

                const barLeft =
                  item.type === 'milestone'
                    ? coords.startX - 11
                    : coords.startX;
                const barWidth =
                  item.type === 'milestone'
                    ? 22
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
                    className={`absolute left-0 right-0 flex items-center transition-opacity ${
                      isDimmed ? 'opacity-40' : 'opacity-100'
                    }`}
                  >
                    {item.type === 'milestone' ? (
                      /* MILESTONE RENDERER (◆ Diamond) */
                      <div
                        style={{ left: barLeft }}
                        onMouseDown={(e) => handleBarMouseDown(e, item, 'move')}
                        onClick={(e) => handleBarClick(e, item.id)}
                        onDoubleClick={() => onEditModal(item)}
                        data-timeline-milestone={item.id}
                        className={`absolute z-20 flex items-center group cursor-grab active:cursor-grabbing ${
                          isDraggingThis ? 'z-40' : ''
                        }`}
                      >
                        {isDraggingThis && (
                          <div className="absolute -top-7 left-2.5 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-[10px] font-mono font-bold shadow-xl border border-slate-700/60 dark:border-zinc-300/60 pointer-events-none whitespace-nowrap z-50">
                            ◆ {formatDateDisplay(coords.effectiveStartStr, 'd MMM yyyy')}
                          </div>
                        )}
                        <div
                          className={`w-5 h-5 rotate-45 rounded-[4px] border-2 shadow-md transition-transform group-hover:scale-125 ${
                            isDraggingThis
                              ? 'scale-125 ring-2 ring-indigo-500 shadow-xl'
                              : isSelected
                              ? 'scale-125 ring-2 ring-indigo-500'
                              : ''
                          } ${
                            isCrit
                              ? 'bg-rose-500 border-white dark:border-slate-900 ring-2 ring-rose-500'
                              : 'bg-amber-500 border-white dark:border-slate-900 ring-2 ring-amber-500/40'
                          }`}
                        />
                        <div className="ml-3 px-2 py-0.5 rounded-md bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px] font-semibold whitespace-nowrap shadow-sm">
                          ◆ {item.name}{' '}
                          <span className="font-mono text-[10px] opacity-75">
                            ({formatDateDisplay(coords.effectiveStartStr, 'dd MMM')})
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* STANDARD TASK BAR + SLACK EXTENSION BAR */
                      <div
                        style={{ left: barLeft }}
                        className={`absolute z-20 flex items-center ${
                          isDraggingThis ? 'z-40' : ''
                        }`}
                      >
                        {isDraggingThis && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-[10px] font-mono font-bold shadow-xl border border-slate-700/60 dark:border-zinc-300/60 pointer-events-none whitespace-nowrap z-50">
                            {formatDateDisplay(coords.effectiveStartStr, 'd MMM')} → {formatDateDisplay(coords.effectiveEndStr, 'd MMM')} ({coords.effectiveDuration}d)
                          </div>
                        )}
                        {/* Main Task Bar */}
                        <div
                          style={{ width: barWidth }}
                          onMouseDown={(e) => handleBarMouseDown(e, item, 'move')}
                          onClick={(e) => handleBarClick(e, item.id)}
                          onDoubleClick={() => onEditModal(item)}
                          data-timeline-task={item.id}
                          className={`relative h-8 rounded-lg border overflow-hidden cursor-grab active:cursor-grabbing shadow-sm transition-shadow ${
                            styleTheme.barBg
                          } ${
                            isDraggingThis
                              ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-950 shadow-xl opacity-95'
                              : isSelected
                              ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-950 shadow-md'
                              : isCrit
                              ? 'border-rose-500 ring-2 ring-rose-500/40'
                              : item.hasConflict
                              ? 'border-rose-500 ring-2 ring-rose-500/30'
                              : styleTheme.border
                          } ${isHovered ? 'shadow-md' : ''}`}
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
                              <span
                                className={`truncate ${
                                  item.progress > 45
                                    ? 'text-white drop-shadow-sm'
                                    : styleTheme.text
                                }`}
                              >
                                {item.name}
                              </span>
                              {barWidth >= 70 && (
                                <span
                                  className={`font-mono text-[10px] ml-1 shrink-0 ${
                                    item.progress > 80
                                      ? 'text-white/90'
                                      : 'text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  {coords.effectiveDuration}d
                                </span>
                              )}
                            </div>
                          )}

                          {/* Right-Edge Drag Handle for Duration Resizing */}
                          <div
                            onMouseDown={(e) => handleBarMouseDown(e, item, 'resize')}
                            title="Arrastra el borde derecho para cambiar la duración"
                            className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-black/20 dark:hover:bg-white/30 flex items-center justify-center"
                          >
                            <div className="w-0.5 h-3.5 bg-white/70 rounded" />
                          </div>
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
                          <span className="ml-2 text-[11px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap pointer-events-none">
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

        {/* Non-intrusive Top-Right Docked Inspection Panel on Click */}
        {selectedItem && (
          <aside
            id="gantt-inspection-panel"
            data-selected-item-id={selectedItem.id}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-3 right-3 z-40 w-80 max-w-[calc(100%-24px)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200/90 dark:border-slate-700/90 shadow-xl p-3.5 text-xs flex flex-col gap-2.5 transition-all"
          >
            {/* Panel Header: WBS Code + Title + Type Badge + Close button */}
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 min-w-0">
                {selectedItem.type === 'milestone' ? (
                  <Diamond className="w-4 h-4 text-amber-500 fill-current shrink-0" />
                ) : (
                  <span
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      COLOR_STYLES[selectedItem.color]?.badge || 'bg-indigo-500'
                    }`}
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      #{selectedItem.wbsCode || selectedItem.wbs}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        selectedItem.type === 'milestone'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      {selectedItem.type === 'milestone' ? 'Hito' : 'Tarea'}
                    </span>
                    {selectedItem.isCritical && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                        <Flame className="w-3 h-3 fill-current" />
                        Crítica
                      </span>
                    )}
                  </div>
                  <h4
                    className="font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5 text-sm"
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
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition shrink-0 cursor-pointer"
                title="Cerrar panel de inspección"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Project & Assignee metadata */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
                <FolderKanban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate" title={selectedGroup?.project.name}>
                  {selectedGroup?.project.name || 'Sin Proyecto'}
                </span>
              </div>
              {selectedItem.assignee ? (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate" title={selectedItem.assignee}>
                    {selectedItem.assignee}
                  </span>
                </div>
              ) : (
                <div className="text-slate-400 italic">Sin asignar</div>
              )}
            </div>

            {/* Schedule & Progress grid */}
            <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Inicio</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {formatDateDisplay(selectedItem.startDate, 'dd MMM yyyy')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Fin</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {selectedItem.type === 'milestone'
                    ? '-'
                    : formatDateDisplay(selectedItem.endDate, 'dd MMM yyyy')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Duración / Slack</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {selectedItem.duration}d{' '}
                  {selectedItem.slack > 0 ? `(+${selectedItem.slack}d)` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Progreso</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {selectedItem.progress}%
                </span>
              </div>
            </div>

            {/* Dependencies relations (Predecessors & Successors) */}
            {(selectedPredecessors.length > 0 || selectedSuccessors.length > 0) && (
              <div className="flex flex-col gap-1 text-[11px]">
                {selectedPredecessors.length > 0 && (
                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 flex-wrap">
                    <span className="text-slate-400 font-medium">Predecesoras:</span>
                    {selectedPredecessors.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedItemId(p.id)}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 text-[10px] font-mono border border-slate-200/80 dark:border-slate-700 transition cursor-pointer"
                      >
                        #{p.wbsCode || p.wbs} {p.name}
                      </button>
                    ))}
                  </div>
                )}
                {selectedSuccessors.length > 0 && (
                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 flex-wrap">
                    <span className="text-slate-400 font-medium">Sucesoras:</span>
                    {selectedSuccessors.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedItemId(s.id)}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 text-[10px] font-mono border border-slate-200/80 dark:border-slate-700 transition cursor-pointer"
                      >
                        #{s.wbsCode || s.wbs} {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes if present */}
            {selectedItem.notes && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 p-2 rounded border border-slate-100 dark:border-slate-800">
                <p className="line-clamp-2 italic">“{selectedItem.notes}”</p>
              </div>
            )}

            {/* Actions: Edit button */}
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => onEditModal(selectedItem)}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1 transition cursor-pointer shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editar Ítem
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
