import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  History,
  Layers,
  Redo2,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react';
import { PlanHistoryActionType, PlanHistoryEntry, Release } from '../types/gantt';
import { computeHistoryEntryDiff } from '../utils/ganttEngine';

export interface PlanHistoryPageProps {
  history: PlanHistoryEntry[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRestoreSnapshot: (entry: PlanHistoryEntry, index: number) => void;
  onBackToGantt: () => void;
  onClearHistory?: () => void;
  initialExpandedEntryId?: string | null;
  releases?: Release[];
}

const ACTION_BADGE_CONFIG: Record<
  PlanHistoryActionType,
  { label: string; bg: string; text: string; border: string }
> = {
  create_item: {
    label: 'Creación',
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  edit_item: {
    label: 'Edición',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  drag_move: {
    label: 'Desplazamiento',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  drag_resize: {
    label: 'Redimensión',
    bg: 'bg-cyan-50 dark:bg-cyan-950/60',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800',
  },
  delete_item: {
    label: 'Eliminación',
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
  },
  duplicate_item: {
    label: 'Duplicación',
    bg: 'bg-indigo-50 dark:bg-indigo-950/60',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  reorder_item: {
    label: 'Reordenación',
    bg: 'bg-violet-50 dark:bg-violet-950/60',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
  },
  reorder_project: {
    label: 'Reordenar Proyecto',
    bg: 'bg-violet-50 dark:bg-violet-950/60',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
  },
  change_project_color: {
    label: 'Color Proyecto',
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/60',
    text: 'text-fuchsia-700 dark:text-fuchsia-300',
    border: 'border-fuchsia-200 dark:border-fuchsia-800',
  },
  create_project: {
    label: 'Nuevo Proyecto',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  edit_project: {
    label: 'Edición Proyecto',
    bg: 'bg-purple-50 dark:bg-purple-950/60',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
  toggle_project_lock: {
    label: 'Bloqueo Proyecto',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
  },
  delete_project: {
    label: 'Eliminar Proyecto',
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
  },
  dependency_change: {
    label: 'Dependencia',
    bg: 'bg-teal-50 dark:bg-teal-950/60',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
  },
  resolve_conflicts: {
    label: 'Cascada',
    bg: 'bg-orange-50 dark:bg-orange-950/60',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
  },
  restore_snapshot: {
    label: 'Restauración',
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    text: 'text-zinc-800 dark:text-zinc-200',
    border: 'border-zinc-300 dark:border-zinc-700',
  },
  initial_state: {
    label: 'Inicio',
    bg: 'bg-[#F4F4F1] dark:bg-zinc-800',
    text: 'text-[#0C0C09] dark:text-zinc-300',
    border: 'border-[#E2E2DC] dark:border-zinc-700',
  },
};

export const PlanHistoryPage: React.FC<PlanHistoryPageProps> = ({
  history,
  currentIndex,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRestoreSnapshot,
  onBackToGantt,
  onClearHistory,
  initialExpandedEntryId = null,
  releases,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(initialExpandedEntryId);

  // Filter entries while preserving original indices and computed exact diffs against the preceding snapshot
  const indexedEntries = useMemo(() => {
    return history.map((entry, index) => {
      const prevSnapshot = index > 0 ? history[index - 1]?.snapshot : undefined;
      const entityChanges = computeHistoryEntryDiff(
        prevSnapshot,
        entry.snapshot,
        releases,
        { actionType: entry.actionType, description: entry.description }
      );
      return { entry, originalIndex: index, entityChanges };
    });
  }, [history, releases]);

  const filteredEntries = useMemo(() => {
    return indexedEntries.filter(({ entry, entityChanges }) => {
      if (filterType !== 'all') {
        if (filterType === 'move' && entry.actionType !== 'drag_move') return false;
        if (filterType === 'resize' && entry.actionType !== 'drag_resize') return false;
        if (filterType === 'create' && entry.actionType !== 'create_item' && entry.actionType !== 'create_project') return false;
        if (filterType === 'edit' && entry.actionType !== 'edit_item' && entry.actionType !== 'edit_project') return false;
        if (filterType === 'delete' && entry.actionType !== 'delete_item' && entry.actionType !== 'delete_project') return false;
        if (filterType === 'dependency' && entry.actionType !== 'dependency_change') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDiff = entityChanges.some(
          (ec) =>
            ec.name.toLowerCase().includes(q) ||
            ec.changes.some(
              (c) =>
                c.field.toLowerCase().includes(q) ||
                c.before.toLowerCase().includes(q) ||
                c.after.toLowerCase().includes(q)
            )
        );
        return (
          entry.description.toLowerCase().includes(q) ||
          entry.actionLabel.toLowerCase().includes(q) ||
          entry.formattedDate.toLowerCase().includes(q) ||
          matchesDiff
        );
      }
      return true;
    });
  }, [indexedEntries, filterType, searchQuery]);

  // Show newest on top
  const displayList = useMemo(() => {
    return [...filteredEntries].reverse();
  }, [filteredEntries]);

  const currentEntry = history[currentIndex] || history[history.length - 1];

  return (
    <div
      data-testid="plan-history-page"
      data-history-page="true"
      className="flex-1 flex flex-col bg-[#F4F4F1] dark:bg-[#0C0C09] text-[#0C0C09] dark:text-zinc-100 min-h-0 overflow-y-auto"
    >
      {/* Top Navigation & Action Header */}
      <div className="border-b border-[#0C0C09] dark:border-zinc-800 bg-white dark:bg-[#0C0C09] px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="history-back-btn"
              data-history-back-btn="true"
              onClick={onBackToGantt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-[#F4F4F1] dark:bg-zinc-900 hover:bg-[#0C0C09] hover:text-white dark:hover:bg-zinc-100 dark:hover:text-[#0C0C09] text-xs font-semibold transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al Diagrama</span>
            </button>
            <div className="h-4 w-px bg-[#E2E2DC] dark:bg-zinc-800 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[4px] bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] flex items-center justify-center shrink-0">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-bold font-display tracking-tight text-[#0C0C09] dark:text-white flex items-center gap-2">
                  Historial de Cambios del Plan
                  <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400">
                    {history.length} {history.length === 1 ? 'registro' : 'registros'}
                  </span>
                </h1>
                <p className="text-xs text-[#6B6B66] dark:text-zinc-400">
                  Registro completo de modificaciones sobre tareas, fechas, dependencias y proyectos.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Undo / Redo & Clear */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              data-testid="history-page-undo-btn"
              disabled={!canUndo}
              onClick={onUndo}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 text-xs font-medium transition cursor-pointer ${
                canUndo
                  ? 'bg-white dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800'
                  : 'opacity-35 cursor-not-allowed bg-transparent text-[#6B6B66]'
              }`}
              title="Deshacer el último cambio (Ctrl+Z / ⌘Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Deshacer</span>
            </button>

            <button
              type="button"
              data-testid="history-page-redo-btn"
              disabled={!canRedo}
              onClick={onRedo}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 text-xs font-medium transition cursor-pointer ${
                canRedo
                  ? 'bg-white dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800'
                  : 'opacity-35 cursor-not-allowed bg-transparent text-[#6B6B66]'
              }`}
              title="Rehacer el cambio deshecho (Ctrl+Shift+Z / ⌘⇧Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span>Rehacer</span>
            </button>

            {onClearHistory && history.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Deseas reiniciar el historial de modificaciones?')) {
                    onClearHistory();
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-800 text-[#6B6B66] hover:text-[#DC2626] dark:hover:text-rose-400 hover:border-rose-300 text-xs transition cursor-pointer ml-1"
                title="Limpiar registro de historial"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Statistics Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white dark:bg-zinc-900 rounded-[4px] border border-[#0C0C09] dark:border-zinc-800">
            <span className="text-[10px] font-mono uppercase text-[#6B6B66] dark:text-zinc-400">
              Total Modificaciones
            </span>
            <div className="text-lg font-bold font-display mt-0.5 text-[#0C0C09] dark:text-white">
              {history.length}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-zinc-900 rounded-[4px] border border-[#0C0C09] dark:border-zinc-800">
            <span className="text-[10px] font-mono uppercase text-[#6B6B66] dark:text-zinc-400">
              Versión Activa
            </span>
            <div className="text-lg font-bold font-display mt-0.5 text-[#16A34A] dark:text-emerald-400 flex items-center gap-1.5">
              <span>#{currentIndex + 1}</span>
              <span className="text-xs font-mono font-normal text-[#6B6B66] dark:text-zinc-400">
                de {history.length}
              </span>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-zinc-900 rounded-[4px] border border-[#0C0C09] dark:border-zinc-800">
            <span className="text-[10px] font-mono uppercase text-[#6B6B66] dark:text-zinc-400">
              Tareas en Versión Actual
            </span>
            <div className="text-lg font-bold font-display mt-0.5 text-[#0C0C09] dark:text-white">
              {currentEntry ? currentEntry.itemsCount : 0}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-zinc-900 rounded-[4px] border border-[#0C0C09] dark:border-zinc-800">
            <span className="text-[10px] font-mono uppercase text-[#6B6B66] dark:text-zinc-400">
              Proyectos en Versión Actual
            </span>
            <div className="text-lg font-bold font-display mt-0.5 text-[#0C0C09] dark:text-white">
              {currentEntry ? currentEntry.projectsCount : 0}
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-[4px] border border-[#0C0C09] dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[#6B6B66] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              data-testid="history-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en el historial de modificaciones..."
              className="w-full pl-8 pr-3 py-1.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700 text-xs font-sans text-[#0C0C09] dark:text-white outline-none focus:ring-1 focus:ring-[#0C0C09] dark:focus:ring-zinc-400"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#6B6B66] shrink-0" />
            {[
              { id: 'all', label: 'Todos' },
              { id: 'move', label: 'Desplazamientos' },
              { id: 'resize', label: 'Redimensiones' },
              { id: 'create', label: 'Creaciones' },
              { id: 'edit', label: 'Ediciones' },
              { id: 'delete', label: 'Eliminaciones' },
              { id: 'dependency', label: 'Dependencias' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={`px-2 py-1 rounded-[2px] text-[11px] font-mono transition cursor-pointer whitespace-nowrap ${
                  filterType === f.id
                    ? 'bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] font-semibold'
                    : 'bg-[#F4F4F1] dark:bg-zinc-800 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Log of Plan Changes */}
        <div className="space-y-2.5">
          {displayList.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-800 rounded-[4px] p-8 text-center text-xs text-[#6B6B66] dark:text-zinc-400">
              No se encontraron modificaciones que coincidan con los criterios seleccionados.
            </div>
          ) : (
            displayList.map(({ entry, originalIndex, entityChanges }) => {
              const isCurrent = originalIndex === currentIndex;
              const badge =
                ACTION_BADGE_CONFIG[entry.actionType] ||
                ACTION_BADGE_CONFIG.edit_item;
              const isExpanded = expandedEntryId === entry.id;

              return (
                <div
                  key={entry.id}
                  data-testid={`history-entry-${entry.id}`}
                  data-history-entry="true"
                  data-is-current={isCurrent ? 'true' : 'false'}
                  className={`bg-white dark:bg-zinc-900 rounded-[4px] border transition shadow-none p-3.5 sm:p-4 ${
                    isCurrent
                      ? 'border-[#16A34A] ring-1 ring-[#16A34A] dark:border-emerald-500'
                      : 'border-[#0C0C09] dark:border-zinc-800 hover:border-[#6B6B66]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Tag + Time + Description + Exact State Diffs */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex flex-col items-center shrink-0 pt-0.5">
                        <span
                          className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {entry.actionLabel || badge.label}
                        </span>
                        <span className="text-[10px] font-mono text-[#6B6B66] dark:text-zinc-500 mt-1">
                          #{originalIndex + 1}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-[#0C0C09] dark:text-zinc-100 font-display">
                            {entry.description}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-[2px] bg-[#16A34A] text-white text-[9px] font-mono font-bold">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              VERSIÓN ACTUAL
                            </span>
                          )}
                        </div>

                        {/* Exact State Changes Summary on the Entry Card */}
                        {entityChanges.length > 0 && (
                          <div
                            data-testid={`history-entry-diff-summary-${entry.id}`}
                            className="mt-1.5 flex flex-col gap-1"
                          >
                            {entityChanges.map((ec) => (
                              <div
                                key={`${ec.entityType}-${ec.id}`}
                                className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono"
                              >
                                <span className="px-1.5 py-0.5 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700 text-[#0C0C09] dark:text-zinc-200 font-semibold">
                                  {ec.entityType === 'project'
                                    ? `Proyecto '${ec.name}'`
                                    : ec.entityType === 'milestone'
                                    ? `Hito '${ec.name}'`
                                    : `Tarea '${ec.name}'`}
                                </span>
                                {ec.changes.map((chg, cIdx) => (
                                  <span
                                    key={`${chg.field}-${cIdx}`}
                                    data-testid={`history-diff-pill-${entry.id}-${chg.field}`}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 text-[#0C0C09] dark:text-zinc-200"
                                  >
                                    <span className="font-semibold text-[#312C85] dark:text-indigo-300">
                                      {`${chg.field}:`}
                                    </span>
                                    <span className="line-through opacity-70 text-rose-700 dark:text-rose-300">
                                      {chg.before}
                                    </span>
                                    <span className="text-[#6B6B66]">→</span>
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                      {chg.after}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[11px] font-mono text-[#6B6B66] dark:text-zinc-400 mt-1">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {entry.formattedDate}
                          </span>
                          <span>·</span>
                          <span>
                            {entry.itemsCount} tareas · {entry.projectsCount} proyectos
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedEntryId(isExpanded ? null : entry.id)
                        }
                        className="px-2 py-1 rounded-[2px] border border-[#E2E2DC] dark:border-zinc-800 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 text-[11px] font-mono text-[#6B6B66] dark:text-zinc-400 flex items-center gap-1 transition cursor-pointer"
                        title="Ver detalles de los cambios y estado de esta versión"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            <span>Ocultar</span>
                          </>
                        ) : (
                          <>
                            <ChevronRight className="w-3 h-3" />
                            <span>Detalles</span>
                          </>
                        )}
                      </button>

                      {isCurrent ? (
                        <span className="px-3 py-1 rounded-[4px] bg-[#16A34A]/10 text-[#16A34A] dark:text-emerald-400 border border-[#16A34A]/30 text-xs font-medium">
                          Activa
                        </span>
                      ) : (
                        <button
                          type="button"
                          data-testid={`restore-snapshot-btn-${originalIndex}`}
                          data-restore-snapshot-btn={entry.id}
                          onClick={() => onRestoreSnapshot(entry, originalIndex)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] text-xs font-display font-semibold transition cursor-pointer"
                          title="Restaurar el plan a este estado"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restaurar versión</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Snapshot Details Table */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[#E2E2DC] dark:border-zinc-800 space-y-3">
                      {entityChanges.length > 0 && (
                        <div data-testid={`history-exact-changes-${entry.id}`}>
                          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#312C85] dark:text-indigo-400 mb-1.5">
                            Cambios exactos en esta versión ({entityChanges.length})
                          </div>
                          <div className="overflow-x-auto border border-[#E2E2DC] dark:border-zinc-800 rounded-[2px]">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[#F4F4F1] dark:bg-zinc-800 text-[10px] font-mono uppercase text-[#6B6B66] dark:text-zinc-400 border-b border-[#E2E2DC] dark:border-zinc-800">
                                <tr>
                                  <th className="px-2.5 py-1">Tipo</th>
                                  <th className="px-2.5 py-1">Elemento</th>
                                  <th className="px-2.5 py-1">Campo Modificado</th>
                                  <th className="px-2.5 py-1">Estado Anterior</th>
                                  <th className="px-2.5 py-1">Estado Nuevo</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E2DC] dark:divide-zinc-800 font-mono text-[11px]">
                                {entityChanges.flatMap((ec) =>
                                  ec.changes.map((chg, idx) => (
                                    <tr
                                      key={`${ec.id}-${chg.field}-${idx}`}
                                      className="hover:bg-[#F4F4F1]/60 dark:hover:bg-zinc-800/40"
                                    >
                                      <td className="px-2.5 py-1 text-[#6B6B66] dark:text-zinc-400">
                                        {ec.entityType === 'project'
                                          ? 'Proyecto'
                                          : ec.entityType === 'milestone'
                                          ? 'Hito'
                                          : 'Tarea'}
                                      </td>
                                      <td className="px-2.5 py-1 font-sans font-medium text-[#0C0C09] dark:text-white">
                                        {ec.name}
                                        {ec.projectName ? (
                                          <span className="ml-1.5 text-[10px] text-[#6B6B66] dark:text-zinc-400">
                                            ({ec.projectName})
                                          </span>
                                        ) : null}
                                      </td>
                                      <td className="px-2.5 py-1 font-semibold text-[#312C85] dark:text-indigo-300">
                                        {chg.field}
                                      </td>
                                      <td className="px-2.5 py-1 text-rose-700 dark:text-rose-300 line-through opacity-80">
                                        {chg.before}
                                      </td>
                                      <td className="px-2.5 py-1 font-bold text-emerald-700 dark:text-emerald-400">
                                        {chg.after}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 mb-2">
                          Tareas en esta versión ({entry.snapshot.items.length})
                        </div>
                        <div className="max-h-48 overflow-y-auto border border-[#E2E2DC] dark:border-zinc-800 rounded-[2px]">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#F4F4F1] dark:bg-zinc-800 text-[10px] font-mono uppercase text-[#6B6B66] dark:text-zinc-400 border-b border-[#E2E2DC] dark:border-zinc-800">
                              <tr>
                                <th className="px-2.5 py-1">Proyecto</th>
                                <th className="px-2.5 py-1">Tarea</th>
                                <th className="px-2.5 py-1">Inicio</th>
                                <th className="px-2.5 py-1">Fin</th>
                                <th className="px-2.5 py-1">Duración</th>
                                <th className="px-2.5 py-1">Equipo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E2DC] dark:divide-zinc-800 font-mono text-[11px]">
                              {entry.snapshot.items.map((it) => {
                                const projName =
                                  entry.snapshot.projects.find((p) => p.id === it.projectId)?.name ||
                                  entry.snapshot.projects[0]?.name ||
                                  '—';
                                return (
                                  <tr
                                    key={it.id}
                                    className="hover:bg-[#F4F4F1]/60 dark:hover:bg-zinc-800/40"
                                  >
                                    <td
                                      data-testid={`history-item-project-${it.id}`}
                                      className="px-2.5 py-1 font-sans text-[#6B6B66] dark:text-zinc-400"
                                    >
                                      {projName}
                                    </td>
                                    <td className="px-2.5 py-1 font-sans font-medium text-[#0C0C09] dark:text-white">
                                      {it.name}
                                    </td>
                                    <td className="px-2.5 py-1">{it.startDate}</td>
                                    <td className="px-2.5 py-1">{it.endDate}</td>
                                    <td className="px-2.5 py-1">
                                      {it.type === 'milestone' ? 'Hito' : `${it.duration}d`}
                                    </td>
                                    <td className="px-2.5 py-1 text-[#6B6B66]">
                                      {it.assignee || '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
