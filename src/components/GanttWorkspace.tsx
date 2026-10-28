import React, { useMemo, useRef, useState } from 'react';
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
  Copy,
  Diamond,
  Edit3,
  Flame,
  GitBranch,
  GripHorizontal,
  Plus,
  Trash2,
} from 'lucide-react';
import { ComputedGanttItem, GanttItem, TaskColor, ZoomLevel } from '../types/gantt';
import {
  calculateDurationFromDates,
  calculateEndDateFromDuration,
  formatDateDisplay,
  formatDateISO,
  parseDateSafe,
} from '../utils/ganttEngine';

interface GanttWorkspaceProps {
  items: ComputedGanttItem[];
  zoom: ZoomLevel;
  showCriticalPath: boolean;
  showCpmFloat: boolean;
  autoCascade: boolean;
  onUpdateItem: (updated: GanttItem, cascade: boolean) => void;
  onEditModal: (item: ComputedGanttItem) => void;
  onDeleteItem: (id: string) => void;
  onDuplicateItem: (item: ComputedGanttItem) => void;
  onQuickAdd: (type: 'task' | 'milestone') => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

const ROW_HEIGHT = 50;
const HEADER_HEIGHT = 60;

const COLOR_STYLES: Record<
  TaskColor,
  { barBg: string; fillBg: string; border: string; text: string; badge: string }
> = {
  indigo: {
    barBg: 'bg-indigo-500/25 dark:bg-indigo-500/30',
    fillBg: 'bg-indigo-600 dark:bg-indigo-500',
    border: 'border-indigo-600/60 dark:border-indigo-400/60',
    text: 'text-indigo-950 dark:text-indigo-100',
    badge: 'bg-indigo-500',
  },
  blue: {
    barBg: 'bg-blue-500/25 dark:bg-blue-500/30',
    fillBg: 'bg-blue-600 dark:bg-blue-500',
    border: 'border-blue-600/60 dark:border-blue-400/60',
    text: 'text-blue-950 dark:text-blue-100',
    badge: 'bg-blue-500',
  },
  emerald: {
    barBg: 'bg-emerald-500/25 dark:bg-emerald-500/30',
    fillBg: 'bg-emerald-600 dark:bg-emerald-500',
    border: 'border-emerald-600/60 dark:border-emerald-400/60',
    text: 'text-emerald-950 dark:text-emerald-100',
    badge: 'bg-emerald-500',
  },
  amber: {
    barBg: 'bg-amber-500/25 dark:bg-amber-500/30',
    fillBg: 'bg-amber-500 dark:bg-amber-500',
    border: 'border-amber-600/60 dark:border-amber-400/60',
    text: 'text-amber-950 dark:text-amber-100',
    badge: 'bg-amber-500',
  },
  rose: {
    barBg: 'bg-rose-500/25 dark:bg-rose-500/30',
    fillBg: 'bg-rose-600 dark:bg-rose-500',
    border: 'border-rose-600/60 dark:border-rose-400/60',
    text: 'text-rose-950 dark:text-rose-100',
    badge: 'bg-rose-500',
  },
  violet: {
    barBg: 'bg-violet-500/25 dark:bg-violet-500/30',
    fillBg: 'bg-violet-600 dark:bg-violet-500',
    border: 'border-violet-600/60 dark:border-violet-400/60',
    text: 'text-violet-950 dark:text-violet-100',
    badge: 'bg-violet-500',
  },
  cyan: {
    barBg: 'bg-cyan-500/25 dark:bg-cyan-500/30',
    fillBg: 'bg-cyan-600 dark:bg-cyan-500',
    border: 'border-cyan-600/60 dark:border-cyan-400/60',
    text: 'text-cyan-950 dark:text-cyan-100',
    badge: 'bg-cyan-500',
  },
};

export const GanttWorkspace: React.FC<GanttWorkspaceProps> = ({
  items,
  zoom,
  showCriticalPath,
  showCpmFloat,
  autoCascade,
  onUpdateItem,
  onEditModal,
  onDeleteItem,
  onDuplicateItem,
  onQuickAdd,
  scrollContainerRef,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [splitWidth, setSplitWidth] = useState<number>(640);
  const [showTable, setShowTable] = useState<boolean>(true);

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

  // Day column width according to zoom level
  const dayWidth = zoom === 'day' ? 44 : zoom === 'week' ? 28 : 16;

  // Compute timeline date range with padding before and after project
  const { timelineDays, timelineStart, monthGroups, todayIndex } = useMemo(() => {
    const today = startOfDay(new Date());
    if (items.length === 0) {
      const start = addDays(today, -5);
      const end = addDays(today, 25);
      const days = eachDayOfInterval({ start, end });
      return {
        timelineDays: days,
        timelineStart: start,
        monthGroups: [{ label: format(today, 'MMMM yyyy', { locale: es }), count: days.length }],
        todayIndex: 5,
      };
    }

    let minDate = parseDateSafe(items[0].startDate);
    let maxDate = parseDateSafe(items[0].slackEndDate || items[0].endDate);

    for (const it of items) {
      const s = parseDateSafe(it.startDate);
      const e = parseDateSafe(it.slackEndDate || it.endDate);
      const cpmEnd = addDays(parseDateSafe(it.endDate), it.cpmTotalFloat || 0);
      if (s < minDate) minDate = s;
      if (e > maxDate) maxDate = e;
      if (cpmEnd > maxDate) maxDate = cpmEnd;
    }

    if (today < minDate) minDate = today;
    if (today > maxDate) maxDate = today;

    const paddedStart = addDays(minDate, -4);
    const paddedEnd = addDays(maxDate, 12);
    const days = eachDayOfInterval({ start: paddedStart, end: paddedEnd });

    // Group consecutive days by Month + Year for the top header tier
    const groups: { label: string; count: number }[] = [];
    for (const day of days) {
      const label = format(day, 'MMMM yyyy', { locale: es });
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.count += 1;
      } else {
        groups.push({ label, count: 1 });
      }
    }

    const tIdx = days.findIndex((d) => isSameDay(d, today));

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
      const deltaDays = Math.round(dx / dayWidth);
      setDragState((prev) => (prev ? { ...prev, dayDelta: deltaDays } : null));
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      const dx = upEvent.clientX - startX;
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

  // Handle split pane divider resize
  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingSplitRef.current = true;
    const startX = e.clientX;
    const origWidth = splitWidth;

    const onMove = (me: MouseEvent) => {
      if (!isResizingSplitRef.current) return;
      const nextWidth = Math.max(360, Math.min(920, origWidth + (me.clientX - startX)));
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

  // Map item ID to row index and coordinates for SVG dependency lines
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
      }
    >();

    items.forEach((it, index) => {
      const isDraggingThis = dragState && dragState.itemId === it.id;
      const baseStart = parseDateSafe(it.startDate);
      const effectiveStart =
        isDraggingThis && dragState.mode === 'move'
          ? addDays(baseStart, dragState.dayDelta)
          : baseStart;
      const effectiveDuration =
        isDraggingThis && dragState.mode === 'resize'
          ? Math.max(1, it.duration + dragState.dayDelta)
          : it.type === 'milestone'
          ? 0
          : Math.max(1, it.duration);

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
      const centerY = index * ROW_HEIGHT + ROW_HEIGHT / 2;

      map.set(it.id, {
        index,
        item: it,
        startX: it.type === 'milestone' ? startX + dayWidth / 2 : startX,
        endX,
        centerY,
        effectiveStartStr,
        effectiveEndStr,
        effectiveDuration,
      });
    });

    return map;
  }, [items, dragState, timelineStart, dayWidth]);

  // Check if two tasks are directly connected to highlight on hover
  const relatedIds = useMemo(() => {
    const set = new Set<string>();
    if (!hoveredId) return set;
    set.add(hoveredId);
    for (const it of items) {
      if (it.id === hoveredId) {
        it.dependencies.forEach((d) => set.add(d));
      }
      if (it.dependencies.includes(hoveredId)) {
        set.add(it.id);
      }
    }
    return set;
  }, [hoveredId, items]);

  const totalCanvasWidth = timelineDays.length * dayWidth;
  const totalCanvasHeight = Math.max(items.length * ROW_HEIGHT + 56, 360);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Top Sub-bar for Table Toggle & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTable((prev) => !prev)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            {showTable ? 'Ocultar Tabla WBS' : 'Mostrar Tabla WBS'}
          </button>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
            💡 Tip: Edita fechas, duración o slack directamente en la tabla o arrastra las barras en el gráfico.
          </span>
        </div>

        {/* Visual Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block" />
            Progreso / Tarea
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-4 h-3 rounded-sm border border-dashed border-amber-500 inline-block"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(245,158,11,0.28) 0, rgba(245,158,11,0.28) 3px, transparent 3px, transparent 6px)',
              }}
            />
            Slack / Holgura (+días)
          </span>
          <span className="flex items-center gap-1.5">
            <Diamond className="w-3.5 h-3.5 text-amber-500 fill-current" />
            Hito (Milestone)
          </span>
          {showCriticalPath && (
            <span className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
              <Flame className="w-3.5 h-3.5 fill-current" />
              Ruta Crítica (Slack = 0)
            </span>
          )}
        </div>
      </div>

      {/* Main Synchronized Split View */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* LEFT PANE: WBS Editable Data Grid */}
        {showTable && (
          <>
            <div
              style={{ width: splitWidth }}
              className="shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden select-none"
            >
              <div className="overflow-x-auto flex-1 flex flex-col">
                <div className="min-w-[620px] flex-1 flex flex-col">
                  {/* Table Header (matches timeline HEADER_HEIGHT = 60px) */}
                  <div
                    style={{ height: HEADER_HEIGHT }}
                    className="grid grid-cols-12 items-center px-3 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0"
                  >
                    <div className="col-span-4 pl-1">WBS / Tarea o Hito</div>
                    <div className="col-span-2 text-center">Initial Date</div>
                    <div className="col-span-2 text-center">Final Date</div>
                    <div className="col-span-1 text-center">Dur.</div>
                    <div className="col-span-1 text-center" title="Slack / Holgura en días (default 0)">
                      Slack
                    </div>
                    <div className="col-span-1 text-center">Deps</div>
                    <div className="col-span-1 text-right pr-1">Acción</div>
                  </div>

                  {/* Table Body Rows */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {items.map((item) => {
                      const isHovered = hoveredId === item.id;
                      const isCrit = showCriticalPath && item.isCritical;
                      return (
                        <div
                          key={item.id}
                          style={{ height: ROW_HEIGHT }}
                          onMouseEnter={() => setHoveredId(item.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          className={`grid grid-cols-12 items-center px-3 text-xs transition-colors ${
                            isHovered
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                              : isCrit
                              ? 'bg-rose-50/30 dark:bg-rose-950/10'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {/* WBS + Name */}
                          <div className="col-span-4 flex items-center gap-2 pr-2 min-w-0">
                            <span className="font-mono text-[11px] w-5 text-slate-400 shrink-0">
                              {item.wbs}.
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
                              className="w-full bg-transparent font-medium text-slate-800 dark:text-slate-100 truncate focus:bg-white dark:focus:bg-slate-800 focus:px-1.5 focus:py-0.5 rounded outline-none focus:ring-1 focus:ring-indigo-500"
                              title={item.name}
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

                          {/* Initial Date */}
                          <div className="col-span-2 px-1">
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
                                  {
                                    ...item,
                                    startDate: newStart,
                                    endDate: newEnd,
                                  },
                                  autoCascade
                                );
                              }}
                              className="w-full px-1 py-1 rounded bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 text-center focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </div>

                          {/* Final Date */}
                          <div className="col-span-2 px-1">
                            {item.type === 'milestone' ? (
                              <div className="text-center font-mono text-[11px] text-amber-600 dark:text-amber-400">
                                ◆ Hito
                              </div>
                            ) : (
                              <input
                                type="date"
                                min={item.startDate}
                                value={item.endDate}
                                onChange={(e) => {
                                  const newEnd = e.target.value;
                                  if (!newEnd || newEnd < item.startDate) return;
                                  const newDur = calculateDurationFromDates(
                                    item.startDate,
                                    newEnd,
                                    'task'
                                  );
                                  onUpdateItem(
                                    {
                                      ...item,
                                      endDate: newEnd,
                                      duration: newDur,
                                    },
                                    autoCascade
                                  );
                                }}
                                className="w-full px-1 py-1 rounded bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 text-center focus:ring-1 focus:ring-indigo-500 outline-none"
                              />
                            )}
                          </div>

                          {/* Duration */}
                          <div className="col-span-1 px-1 flex justify-center">
                            {item.type === 'milestone' ? (
                              <span className="font-mono text-[11px] text-slate-400">0d</span>
                            ) : (
                              <input
                                type="number"
                                min={1}
                                max={365}
                                value={item.duration}
                                onChange={(e) => {
                                  const newDur = Math.max(
                                    1,
                                    parseInt(e.target.value || '1', 10)
                                  );
                                  const newEnd = calculateEndDateFromDuration(
                                    item.startDate,
                                    newDur,
                                    'task'
                                  );
                                  onUpdateItem(
                                    {
                                      ...item,
                                      duration: newDur,
                                      endDate: newEnd,
                                    },
                                    autoCascade
                                  );
                                }}
                                className="w-12 py-1 rounded bg-slate-100/80 dark:bg-slate-800 font-mono text-[11px] font-semibold text-center text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                                title="Duración en días"
                              />
                            )}
                          </div>

                          {/* Slack (default 0) */}
                          <div className="col-span-1 px-1 flex justify-center">
                            {item.type === 'milestone' ? (
                              <span className="font-mono text-[11px] text-slate-400">-</span>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                max={180}
                                value={item.slack}
                                onChange={(e) => {
                                  const newSlack = Math.max(
                                    0,
                                    parseInt(e.target.value || '0', 10)
                                  );
                                  onUpdateItem({ ...item, slack: newSlack }, false);
                                }}
                                className={`w-12 py-1 rounded font-mono text-[11px] font-semibold text-center focus:ring-1 focus:ring-amber-500 outline-none ${
                                  item.slack > 0
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                    : 'bg-slate-100/70 dark:bg-slate-800/70 text-slate-500'
                                }`}
                                title="Slack / Holgura en días (default 0)"
                              />
                            )}
                          </div>

                          {/* Dependencies */}
                          <div className="col-span-1 flex justify-center">
                            <button
                              type="button"
                              onClick={() => onEditModal(item)}
                              className={`px-1.5 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition ${
                                item.dependencies.length > 0
                                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20'
                                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                              title="Configurar dependencias"
                            >
                              {item.dependencies.length > 0 ? (
                                <span>
                                  {item.dependencies
                                    .map((depId) => {
                                      const found = items.find((x) => x.id === depId);
                                      return found ? `#${found.wbs}` : '';
                                    })
                                    .filter(Boolean)
                                    .join(',')}
                                </span>
                              ) : (
                                <GitBranch className="w-3 h-3 opacity-60" />
                              )}
                            </button>
                          </div>

                          {/* Row Actions */}
                          <div className="col-span-1 flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={() => onEditModal(item)}
                              className="p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600"
                              title="Editar detalles"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDuplicateItem(item)}
                              className="p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600"
                              title="Duplicar"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item.id)}
                              className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
                        onClick={() => onQuickAdd('task')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Añadir Tarea
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickAdd('milestone')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition"
                      >
                        <Diamond className="w-3.5 h-3.5" />
                        Añadir Hito
                      </button>
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
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-white dark:bg-slate-950 select-none"
        >
          <div style={{ width: totalCanvasWidth, minHeight: totalCanvasHeight }} className="relative">
            {/* Two-Tier Timeline Header (60px total height) */}
            <div
              style={{ height: HEADER_HEIGHT }}
              className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 flex flex-col"
            >
              {/* Top Tier: Month + Year */}
              <div className="flex h-7 border-b border-slate-200/80 dark:border-slate-800">
                {monthGroups.map((group, idx) => (
                  <div
                    key={idx}
                    style={{ width: group.count * dayWidth }}
                    className="px-2 flex items-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 border-r border-slate-200/80 dark:border-slate-800 truncate"
                  >
                    {group.label}
                  </div>
                ))}
              </div>

              {/* Bottom Tier: Days */}
              <div className="flex flex-1 items-center">
                {timelineDays.map((day, idx) => {
                  const isToday = idx === todayIndex;
                  const wknd = isWeekend(day);
                  const dayNum = format(day, 'd');
                  const dayLetter = format(day, 'EEEEE', { locale: es }).toUpperCase();

                  return (
                    <div
                      key={idx}
                      style={{ width: dayWidth }}
                      className={`h-full flex flex-col items-center justify-center border-r border-slate-200/50 dark:border-slate-800/60 text-[10px] font-mono ${
                        isToday
                          ? 'bg-indigo-600 text-white font-bold'
                          : wknd
                          ? 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {zoom === 'day' ? (
                        <div className="flex items-center gap-0.5">
                          <span className="opacity-70">{dayLetter}</span>
                          <span>{dayNum}</span>
                        </div>
                      ) : zoom === 'week' ? (
                        <span>{dayNum}</span>
                      ) : (
                        idx % 2 === 0 && <span className="text-[9px]">{dayNum}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Canvas Body: Background Columns + Horizontal Rows + SVG Dependencies + Task/Slack/Milestone Bars */}
            <div className="relative" style={{ height: items.length * ROW_HEIGHT + 52 }}>
              {/* Vertical Day Columns & Weekend Shading */}
              <div className="absolute inset-0 flex pointer-events-none">
                {timelineDays.map((day, idx) => {
                  const wknd = isWeekend(day);
                  return (
                    <div
                      key={idx}
                      style={{ width: dayWidth }}
                      className={`h-full border-r border-slate-100 dark:border-slate-900/80 ${
                        wknd ? 'bg-slate-100/50 dark:bg-slate-900/40' : ''
                      }`}
                    />
                  );
                })}
              </div>

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
              {items.map((item) => {
                const isHovered = hoveredId === item.id;
                return (
                  <div
                    key={`row-bg-${item.id}`}
                    style={{ height: ROW_HEIGHT }}
                    className={`border-b border-slate-100 dark:border-slate-800/70 transition-colors ${
                      isHovered ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                    }`}
                  />
                );
              })}

              {/* Orthogonal SVG Dependency Lines Overlay */}
              <svg
                width={totalCanvasWidth}
                height={items.length * ROW_HEIGHT + 52}
                className="absolute inset-0 pointer-events-none z-10"
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

                {items.map((succ) => {
                  const succCoords = itemRowMap.get(succ.id);
                  if (!succCoords) return null;

                  return succ.dependencies.map((predId) => {
                    const predCoords = itemRowMap.get(predId);
                    if (!predCoords) return null;

                    const depType = succ.dependencyTypes?.[predId] || 'FS';
                    const fromStart = depType === 'SS' || depType === 'SF';
                    const toEnd = depType === 'FF' || depType === 'SF';

                    const x1 = fromStart ? predCoords.startX : predCoords.endX;
                    const y1 = predCoords.centerY;
                    const x2 = toEnd ? succCoords.endX : succCoords.startX;
                    const y2 = succCoords.centerY;

                    const isHighlighted =
                      hoveredId === succ.id || hoveredId === predId;
                    const isCriticalLink =
                      showCriticalPath &&
                      succ.isCritical &&
                      predCoords.item.isCritical;

                    // Smart orthogonal routing path
                    let dPath = '';
                    const stepOut = 12;
                    if (!fromStart && !toEnd && x2 >= x1 + stepOut) {
                      const midX = x1 + (x2 - x1) / 2;
                      dPath = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
                    } else if (fromStart && !toEnd) {
                      // SS link: step left from both starts
                      const leftX = Math.min(x1, x2) - stepOut;
                      dPath = `M ${x1} ${y1} L ${leftX} ${y1} L ${leftX} ${y2} L ${x2} ${y2}`;
                    } else if (!fromStart && toEnd) {
                      // FF link: step right from both ends
                      const rightX = Math.max(x1, x2) + stepOut;
                      dPath = `M ${x1} ${y1} L ${rightX} ${y1} L ${rightX} ${y2} L ${x2} ${y2}`;
                    } else if (fromStart && toEnd) {
                      // SF link: step left from predecessor start, route to right of successor end
                      const detourY = y1 < y2 ? y1 + ROW_HEIGHT / 2 : y1 - ROW_HEIGHT / 2;
                      dPath = `M ${x1} ${y1} L ${x1 - stepOut} ${y1} L ${
                        x1 - stepOut
                      } ${detourY} L ${x2 + stepOut} ${detourY} L ${
                        x2 + stepOut
                      } ${y2} L ${x2} ${y2}`;
                    } else {
                      // FS S-bend routing when successor starts near or before predecessor ends
                      const detourY = y1 < y2 ? y1 + ROW_HEIGHT / 2 : y1 - ROW_HEIGHT / 2;
                      dPath = `M ${x1} ${y1} L ${x1 + stepOut} ${y1} L ${
                        x1 + stepOut
                      } ${detourY} L ${x2 - stepOut} ${detourY} L ${
                        x2 - stepOut
                      } ${y2} L ${x2} ${y2}`;
                    }

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

                    return (
                      <path
                        key={`dep-${predId}-${succ.id}`}
                        d={dPath}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isHighlighted || isCriticalLink ? 2.2 : 1.5}
                        strokeDasharray={succ.hasConflict ? '4 3' : undefined}
                        markerEnd={markerEnd}
                        className="transition-opacity duration-150"
                        style={{
                          opacity:
                            hoveredId && !isHighlighted ? 0.25 : 0.95,
                        }}
                      />
                    );
                  });
                })}
              </svg>

              {/* Foreground Task Bars, Slack Ghost Bars & Milestones */}
              {items.map((item) => {
                const coords = itemRowMap.get(item.id);
                if (!coords) return null;

                const isHovered = hoveredId === item.id;
                const isDimmed = hoveredId !== null && !relatedIds.has(item.id);
                const isCrit = showCriticalPath && item.isCritical;
                const styleTheme = COLOR_STYLES[item.color] || COLOR_STYLES.indigo;

                const barLeft =
                  item.type === 'milestone'
                    ? coords.startX - 11
                    : coords.startX;
                const barWidth =
                  item.type === 'milestone'
                    ? 22
                    : Math.max(dayWidth, coords.endX - coords.startX);

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
                const tooltipPositionClass =
                  coords.index < 2 ? 'top-11' : '-top-24';

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
                        onDoubleClick={() => onEditModal(item)}
                        className="absolute z-20 flex items-center group cursor-grab active:cursor-grabbing"
                      >
                        <div
                          className={`w-5 h-5 rotate-45 rounded-[4px] border-2 shadow-md transition-transform group-hover:scale-125 ${
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

                        {/* Hover Floating Inspection Card for Milestone */}
                        {isHovered && !dragState && (
                          <div
                            className={`absolute left-0 ${tooltipPositionClass} z-30 pointer-events-none bg-slate-900/95 text-white px-3 py-2 rounded-xl shadow-xl border border-slate-700 text-[11px] whitespace-nowrap flex flex-col gap-0.5`}
                          >
                            <div className="flex items-center gap-2 font-bold">
                              <span>
                                #{item.wbs} ◆ {item.name}
                              </span>
                              {item.assignee && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-700 text-slate-200 text-[10px] font-normal">
                                  👤 {item.assignee}
                                </span>
                              )}
                              {item.isCritical && (
                                <span className="px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 text-[10px]">
                                  Ruta Crítica
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-slate-300 flex items-center gap-3">
                              <span>
                                📅 Hito: {formatDateDisplay(coords.effectiveStartStr, 'dd MMM yyyy')} (0d)
                              </span>
                              <span className="text-indigo-300">
                                ✓ {item.progress}%
                              </span>
                            </div>
                            {item.notes && (
                              <div className="text-[10px] text-slate-400 max-w-xs truncate">
                                📝 {item.notes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* STANDARD TASK BAR + SLACK EXTENSION BAR */
                      <div
                        style={{ left: barLeft }}
                        className="absolute z-20 flex items-center"
                      >
                        {/* Main Task Bar */}
                        <div
                          style={{ width: barWidth }}
                          onMouseDown={(e) => handleBarMouseDown(e, item, 'move')}
                          onDoubleClick={() => onEditModal(item)}
                          className={`relative h-8 rounded-lg border overflow-hidden cursor-grab active:cursor-grabbing shadow-sm transition-shadow ${
                            styleTheme.barBg
                          } ${
                            isCrit
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

                          {/* Task Label Inside Bar */}
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
                        {barWidth < 110 && (
                          <span className="ml-2 text-[11px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap pointer-events-none">
                            {item.name} ({coords.effectiveDuration}d)
                          </span>
                        )}

                        {/* Hover Floating Inspection Card */}
                        {isHovered && !dragState && (
                          <div
                            className={`absolute left-0 ${tooltipPositionClass} z-30 pointer-events-none bg-slate-900/95 text-white px-3 py-2 rounded-xl shadow-xl border border-slate-700 text-[11px] whitespace-nowrap flex flex-col gap-0.5`}
                          >
                            <div className="flex items-center gap-2 font-bold">
                              <span>
                                #{item.wbs} {item.name}
                              </span>
                              {item.assignee && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-700 text-slate-200 text-[10px] font-normal">
                                  👤 {item.assignee}
                                </span>
                              )}
                              {item.isCritical && (
                                <span className="px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 text-[10px]">
                                  Ruta Crítica
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-slate-300 flex items-center gap-3">
                              <span>
                                📅 {formatDateDisplay(coords.effectiveStartStr, 'dd MMM')} →{' '}
                                {formatDateDisplay(coords.effectiveEndStr, 'dd MMM')} (
                                {coords.effectiveDuration}d)
                              </span>
                              <span className="text-amber-400">
                                ⏳ Slack: {item.slack}d
                              </span>
                              <span className="text-indigo-300">
                                ✓ {item.progress}%
                              </span>
                            </div>
                            {item.notes && (
                              <div className="text-[10px] text-slate-400 max-w-xs truncate">
                                📝 {item.notes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
