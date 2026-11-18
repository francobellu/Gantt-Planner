import React from 'react';
import {
  AlertTriangle,
  Crosshair,
  Diamond,
  Edit2,
  Eye,
  EyeOff,
  FolderKanban,
  GitCommitHorizontal,
  Info,
  Lock,
  Rocket,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import {
  ComputedGanttItem,
  FocusEntity,
  GanttItem,
  GanttProject,
  PlanCommit,
  ProjectAlertLevel,
  ProjectPlatform,
  Release,
} from '../types/gantt';
import {
  formatDateDisplay,
  groupItemsByProject,
  groupItemsByReleaseAndProject,
  HistoryEntityChange,
  normalizePlatform,
} from '../utils/ganttEngine';
import { getReleaseDateSpan } from '../utils/releaseEngine';
import { CommitHistorySidebar } from './CommitHistorySidebar';

export type RightSidebarTab = 'details' | 'commits';

interface RightSidePanelProps {
  activeTab: RightSidebarTab;
  onChangeTab: (tab: RightSidebarTab) => void;
  onClose: () => void;
  // Selection / Details props
  selectedEntity: FocusEntity | null;
  onSelectEntity: (entity: FocusEntity | null) => void;
  items: ComputedGanttItem[];
  projects: GanttProject[];
  releases: Release[];
  onEditTask: (item: ComputedGanttItem) => void;
  onUpdateItem: (item: GanttItem, cascade: boolean) => void;
  onDeleteTask: (itemId: string) => void;
  onUpdateProject: (project: GanttProject) => void;
  onToggleProjectLock: (project: GanttProject) => void;
  isFocusMode: boolean;
  focusEntity: FocusEntity | null;
  onSetFocusEntity: (entity: FocusEntity | null) => void;
  onExitFocusMode: () => void;
  hiddenReleaseIds: string[];
  onToggleHideRelease: (releaseId: string) => void;
  onOpenReleasesModal: (releaseId?: string) => void;
  // Commits props
  commits: PlanCommit[];
  pendingChanges: HistoryEntityChange[];
  activeBaselineCommitId: string | null;
  onToggleBaselineCommit: (commitId: string | null) => void;
  onCreateCommit: (message: string) => void;
  onRestoreCommit: (commit: PlanCommit) => void;
}

export const RightSidePanel: React.FC<RightSidePanelProps> = ({
  activeTab,
  onChangeTab,
  onClose,
  selectedEntity,
  onSelectEntity,
  items,
  projects,
  releases,
  onEditTask,
  onUpdateItem,
  onDeleteTask,
  onUpdateProject,
  onToggleProjectLock,
  isFocusMode,
  focusEntity,
  onSetFocusEntity,
  onExitFocusMode,
  hiddenReleaseIds,
  onToggleHideRelease,
  onOpenReleasesModal,
  commits,
  pendingChanges,
  activeBaselineCommitId,
  onToggleBaselineCommit,
  onCreateCommit,
  onRestoreCommit,
}) => {
  const selectedTask =
    selectedEntity?.type === 'task'
      ? items.find((it) => it.id === selectedEntity.id) || null
      : null;

  const selectedProject =
    selectedEntity?.type === 'project'
      ? projects.find((p) => p.id === selectedEntity.id) || null
      : null;

  const selectedRelease =
    selectedEntity?.type === 'release'
      ? releases.find((r) => r.id === selectedEntity.id) || null
      : null;

  const projectGroup = selectedProject
    ? groupItemsByProject(items, projects).find((g) => g.project.id === selectedProject.id) || null
    : null;

  const releaseGroup = selectedRelease
    ? groupItemsByReleaseAndProject(items, projects, releases).find(
        (rg) => rg.release.id === selectedRelease.id
      ) || null
    : null;

  return (
    <aside
      data-testid="right-side-panel"
      aria-label="Panel lateral derecho"
      className="w-80 sm:w-96 shrink-0 border-l border-[#0C0C09] dark:border-zinc-800 bg-white dark:bg-[#0C0C09] flex flex-col min-h-0 h-full select-text z-30"
    >
      {/* Top Switcher Tabs: Detalles vs Commits */}
      <div className="px-2.5 py-2 border-b border-[#E2E2DC] dark:border-zinc-800 flex items-center justify-between gap-2 bg-[#FAFAF8] dark:bg-zinc-950 shrink-0">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <button
            type="button"
            data-testid="sidebar-tab-details"
            onClick={() => onChangeTab('details')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-semibold transition cursor-pointer ${
              activeTab === 'details'
                ? 'bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]'
                : 'text-[#6B6B66] dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Detalles</span>
          </button>

          <button
            type="button"
            data-testid="sidebar-tab-commits"
            onClick={() => onChangeTab('commits')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-semibold transition cursor-pointer ${
              activeTab === 'commits'
                ? 'bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]'
                : 'text-[#6B6B66] dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            <GitCommitHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span>Commits</span>
            {pendingChanges.length > 0 && (
              <span className="px-1 py-0.2 rounded-full bg-amber-500 text-black font-mono text-[9px] font-bold">
                {pendingChanges.length}
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          data-testid="close-right-sidebar-btn"
          onClick={onClose}
          className="p-1 rounded-[4px] text-[#6B6B66] hover:text-[#0C0C09] dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
          title="Cerrar panel lateral"
          aria-label="Cerrar panel lateral"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      {activeTab === 'commits' ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <CommitHistorySidebar
            embedded
            commits={commits}
            pendingChanges={pendingChanges}
            activeBaselineCommitId={activeBaselineCommitId}
            onToggleBaselineCommit={onToggleBaselineCommit}
            onCreateCommit={onCreateCommit}
            onRestoreCommit={onRestoreCommit}
            onClose={onClose}
          />
        </div>
      ) : (
        <div
          data-testid="sidebar-details-content"
          className="flex-1 overflow-y-auto p-3.5 text-xs flex flex-col gap-3"
        >
          {!selectedTask && !selectedProject && !selectedRelease && (
            <div
              data-testid="sidebar-details-empty"
              className="rounded-[4px] border border-dashed border-[#E2E2DC] dark:border-zinc-800 p-5 text-center text-xs text-[#6B6B66] dark:text-zinc-400 my-auto"
            >
              <Info className="w-6 h-6 mx-auto mb-2 opacity-50" />
              Haz clic sobre una <strong>tarea</strong>, <strong>hito</strong>,{' '}
              <strong>proyecto</strong> o <strong>release</strong> en el cronograma para ver y editar sus detalles aquí.
            </div>
          )}

          {/* TASK / MILESTONE DETAILS */}
          {selectedTask && (() => {
            const itemProj = projects.find((p) => p.id === selectedTask.projectId);
            const effPlatform = normalizePlatform(selectedTask.platform || itemProj?.platform);
            const isTaskFocused =
              isFocusMode && focusEntity?.type === 'task' && focusEntity.id === selectedTask.id;

            return (
              <div data-testid={`sidebar-task-details-${selectedTask.id}`} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#E2E2DC] dark:border-zinc-800">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border border-[#E2E2DC] dark:border-zinc-700">
                        #{selectedTask.wbsCode || selectedTask.wbs}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {selectedTask.type === 'milestone' ? 'Hito' : 'Tarea'}
                      </span>
                      {effPlatform && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[2px] border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                          {effPlatform}
                        </span>
                      )}
                      {selectedTask.assignee && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[2px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {selectedTask.assignee}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-[#0C0C09] dark:text-zinc-100 mt-1.5 leading-snug break-words">
                      {selectedTask.name}
                    </h3>
                    {itemProj && (
                      <div className="text-[11px] text-[#6B6B66] dark:text-zinc-400 mt-0.5">
                        Proyecto: <strong>{itemProj.name}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {selectedTask.hasConflict && (
                  <div
                    data-testid={`panel-conflict-alert-${selectedTask.id}`}
                    className="flex items-start gap-2 p-2.5 rounded-[4px] bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-[11px]"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Conflicto de dependencia</span>
                      <span>
                        {selectedTask.conflictMessage ||
                          'La fecha inicial es anterior a la fecha final de sus tareas predecesoras.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="flex flex-col gap-1 p-2.5 rounded-[4px] bg-[#F4F4F1]/60 dark:bg-zinc-900/60 border border-[#E2E2DC] dark:border-zinc-800 text-[11px]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 font-bold">
                    Descripción / Notas
                  </span>
                  <p
                    className={`text-xs ${
                      selectedTask.notes?.trim()
                        ? 'text-[#0C0C09] dark:text-zinc-200 whitespace-pre-wrap'
                        : 'text-[#6B6B66]/80 dark:text-zinc-500 italic'
                    }`}
                  >
                    {selectedTask.notes?.trim() || 'Sin descripción ni notas registradas.'}
                  </p>
                </div>

                {/* Dates & Metrics */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-[4px] bg-[#FAFAF8] dark:bg-zinc-900/40 border border-[#E2E2DC] dark:border-zinc-800 text-[11px]">
                  <div>
                    <span className="text-[#6B6B66] dark:text-zinc-400 block">Inicio:</span>
                    <span className="font-mono font-semibold text-[#0C0C09] dark:text-zinc-100">
                      {formatDateDisplay(selectedTask.startDate, 'dd MMM yyyy')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B6B66] dark:text-zinc-400 block">Fin:</span>
                    <span className="font-mono font-semibold text-[#0C0C09] dark:text-zinc-100">
                      {selectedTask.type === 'milestone'
                        ? 'Hito (0d)'
                        : formatDateDisplay(selectedTask.endDate, 'dd MMM yyyy')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B6B66] dark:text-zinc-400 block">Duración:</span>
                    <span className="font-mono font-semibold text-[#0C0C09] dark:text-zinc-100">
                      {selectedTask.duration}d{selectedTask.slack > 0 ? ` (+${selectedTask.slack}d)` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B6B66] dark:text-zinc-400 block">Progreso:</span>
                    <span className="font-mono font-semibold text-[#0C0C09] dark:text-zinc-100">
                      {selectedTask.progress}%
                    </span>
                  </div>
                  <div className="col-span-2 pt-1.5 border-t border-[#E2E2DC] dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-[#6B6B66] dark:text-zinc-400">Holgura Libre (FS):</span>
                    <span
                      data-testid={`panel-free-slack-${selectedTask.id}`}
                      className={`font-mono font-bold ${
                        selectedTask.freeSlack < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : selectedTask.freeSlack === 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {selectedTask.freeSlack > 0 ? `+${selectedTask.freeSlack}d` : `${selectedTask.freeSlack}d`}
                      {selectedTask.freeSlack === 0 && ' (Crítica)'}
                    </span>
                  </div>
                </div>

                {/* Successor Tasks */}
                <div className="flex flex-col gap-1.5 p-2.5 rounded-[4px] bg-[#F4F4F1]/40 dark:bg-zinc-900/40 border border-[#E2E2DC] dark:border-zinc-800 text-[11px]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 font-bold">
                    Tareas Siguientes ({selectedTask.successorIds?.length || 0})
                  </span>
                  {selectedTask.successorIds && selectedTask.successorIds.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {selectedTask.successorIds.map((succId) => {
                        const succ = items.find((i) => i.id === succId);
                        if (!succ) return null;
                        const isDriving = succId === selectedTask.drivingSuccessorId;
                        return (
                          <button
                            key={succId}
                            type="button"
                            data-testid={`panel-successor-item-${succId}`}
                            onClick={() =>
                              onSelectEntity({ type: 'task', id: succ.id, name: succ.name })
                            }
                            className={`flex items-center justify-between gap-2 px-2 py-1 rounded text-left border transition cursor-pointer ${
                              isDriving
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 font-semibold'
                                : 'bg-white dark:bg-zinc-950 border-[#E2E2DC] dark:border-zinc-800 hover:border-indigo-400'
                            }`}
                          >
                            <span className="truncate">
                              #{succ.wbsCode || succ.wbs} {succ.name}
                            </span>
                            {isDriving && (
                              <span className="text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 shrink-0">
                                Límite
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[#6B6B66] dark:text-zinc-500 italic">
                      Sin tareas siguientes directas.
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[#E2E2DC] dark:border-zinc-800 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid={`panel-toggle-task-visibility-${selectedTask.id}`}
                      onClick={() =>
                        onUpdateItem({ ...selectedTask, hidden: !selectedTask.hidden }, false)
                      }
                      className="px-2 py-1 rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {selectedTask.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{selectedTask.hidden ? 'Mostrar' : 'Ocultar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isTaskFocused) onExitFocusMode();
                        else onSetFocusEntity({ type: 'task', id: selectedTask.id, name: selectedTask.name });
                      }}
                      className={`px-2 py-1 rounded-[3px] border text-[11px] font-medium flex items-center gap-1 cursor-pointer ${
                        isTaskFocused
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-[#E2E2DC] dark:border-zinc-700 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>{isTaskFocused ? 'Salir Enfoque' : 'Enfocar'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid={`sidebar-edit-task-${selectedTask.id}`}
                      onClick={() => onEditTask(selectedTask)}
                      className="px-2.5 py-1 rounded-[3px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(selectedTask.id)}
                      className="p-1.5 rounded-[3px] border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* PROJECT DETAILS */}
          {selectedProject && (
            <div data-testid={`sidebar-project-details-${selectedProject.id}`} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#E2E2DC] dark:border-zinc-800">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <FolderKanban className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400">
                      Proyecto
                    </span>
                    {selectedProject.locked && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[9px] font-mono font-bold">
                        Bloqueado
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-[#0C0C09] dark:text-zinc-100 mt-1 break-words">
                    {selectedProject.name}
                  </h3>
                </div>
              </div>

              {projectGroup && (
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-[4px] bg-[#FAFAF8] dark:bg-zinc-900/40 border border-[#E2E2DC] dark:border-zinc-800 text-[11px]">
                  <div>
                    <span className="text-[#6B6B66] dark:text-zinc-400 block">Inicio:</span>
                    <span className="font-mono font-semibold">
                      {formatDateDisplay(projectGroup.startDate, 'dd MMM yyyy')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B6B66] dark:text-zinc-400 block">Fin:</span>
                    <span className="font-mono font-semibold">
                      {formatDateDisplay(projectGroup.endDate, 'dd MMM yyyy')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B6B66] dark:text-zinc-400 block">Duración:</span>
                    <span className="font-mono font-semibold">{projectGroup.duration}d</span>
                  </div>
                  <div>
                    <span className="text-[#6B6B66] dark:text-zinc-400 block">Avance:</span>
                    <span className="font-mono font-semibold">{projectGroup.progress}%</span>
                  </div>
                </div>
              )}

              {/* Editable Platform & Alert Level */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Plataforma
                  </label>
                  <select
                    value={selectedProject.platform || 'iOS/Android'}
                    disabled={Boolean(selectedProject.locked)}
                    onChange={(e) =>
                      onUpdateProject({
                        ...selectedProject,
                        platform: e.target.value as ProjectPlatform,
                      })
                    }
                    className="w-full px-2 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs disabled:opacity-50"
                  >
                    <option value="iOS/Android">iOS/Android</option>
                    <option value="iOS">iOS</option>
                    <option value="Android">Android</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Nivel Alerta
                  </label>
                  <select
                    value={selectedProject.alertLevel ?? 0}
                    disabled={Boolean(selectedProject.locked)}
                    onChange={(e) =>
                      onUpdateProject({
                        ...selectedProject,
                        alertLevel: Number(e.target.value) as ProjectAlertLevel,
                      })
                    }
                    className="w-full px-2 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs disabled:opacity-50"
                  >
                    <option value={0}>0 — Normal</option>
                    <option value={1}>1 — Baja</option>
                    <option value={2}>2 — Media</option>
                    <option value={3}>3 — Alta</option>
                  </select>
                </div>
              </div>

              {/* Project Description */}
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                  Descripción / Notas
                </label>
                <textarea
                  rows={4}
                  readOnly={Boolean(selectedProject.locked)}
                  value={selectedProject.description || ''}
                  onChange={(e) =>
                    onUpdateProject({ ...selectedProject, description: e.target.value })
                  }
                  placeholder="Descripción del proyecto..."
                  className="w-full px-2.5 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-[#FAFAF8] dark:bg-zinc-900 text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E2E2DC] dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => onToggleProjectLock(selectedProject)}
                  className="px-2.5 py-1 rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                >
                  {selectedProject.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{selectedProject.locked ? 'Desbloquear' : 'Bloquear'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isFocusMode && focusEntity?.type === 'project' && focusEntity.id === selectedProject.id) {
                      onExitFocusMode();
                    } else {
                      onSetFocusEntity({ type: 'project', id: selectedProject.id, name: selectedProject.name });
                    }
                  }}
                  className="px-2.5 py-1 rounded-[3px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>
                    {isFocusMode && focusEntity?.type === 'project' && focusEntity.id === selectedProject.id
                      ? 'Salir Enfoque'
                      : 'Enfocar Proyecto'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* RELEASE DETAILS */}
          {selectedRelease && (() => {
            const span = getReleaseDateSpan(selectedRelease);
            const isHidden = hiddenReleaseIds.includes(selectedRelease.id);
            const isRelFocused =
              isFocusMode && focusEntity?.type === 'release' && focusEntity.id === selectedRelease.id;
            return (
              <div data-testid={`sidebar-release-details-${selectedRelease.id}`} className="flex flex-col gap-3">
                <div className="pb-2.5 border-b border-[#E2E2DC] dark:border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <Rocket className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400">
                      Release
                    </span>
                    {selectedRelease.month && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800">
                        {selectedRelease.month}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-[#0C0C09] dark:text-zinc-100 mt-1 break-words">
                    {selectedRelease.code} · {selectedRelease.name}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-[4px] bg-[#FAFAF8] dark:bg-zinc-900/40 border border-[#E2E2DC] dark:border-zinc-800 text-[11px]">
                  <div>
                    <span className="text-[#6B6B66] dark:text-zinc-400 block">Inicio:</span>
                    <span className="font-mono font-semibold">
                      {formatDateDisplay(span.startDate, 'dd MMM yyyy')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B6B66] dark:text-zinc-400 block">Fin:</span>
                    <span className="font-mono font-semibold">
                      {formatDateDisplay(span.endDate, 'dd MMM yyyy')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B6B66] dark:text-zinc-400 block">Duración:</span>
                    <span className="font-mono font-semibold">{span.duration}d</span>
                  </div>
                  <div>
                    <span className="text-[#6B6B66] dark:text-zinc-400 block">Avance:</span>
                    <span className="font-mono font-semibold">{releaseGroup?.progress ?? 0}%</span>
                  </div>
                </div>

                {/* Release Milestones */}
                <div className="flex flex-col gap-1.5 p-2.5 rounded-[4px] bg-[#F4F4F1]/50 dark:bg-zinc-900/40 border border-[#E2E2DC] dark:border-zinc-800 text-[11px]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 font-bold">
                    Hitos de Release ({selectedRelease.milestones?.length || 0})
                  </span>
                  {selectedRelease.milestones && selectedRelease.milestones.length > 0 ? (
                    <div className="space-y-1">
                      {selectedRelease.milestones.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-white dark:bg-zinc-950 border border-[#E2E2DC] dark:border-zinc-800"
                        >
                          <span className="flex items-center gap-1.5 truncate font-semibold">
                            <Diamond className="w-3 h-3 text-amber-500 fill-current shrink-0" />
                            <span>{m.code}</span>
                            <span className="font-normal text-[#6B6B66] dark:text-zinc-400 truncate">
                              {m.name}
                            </span>
                          </span>
                          <span className="font-mono text-[10px] shrink-0">
                            {formatDateDisplay(m.date, 'dd MMM')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="italic text-[#6B6B66]">Sin hitos definidos.</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[#E2E2DC] dark:border-zinc-800 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onToggleHideRelease(selectedRelease.id)}
                    className="px-2 py-1 rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{isHidden ? 'Mostrar' : 'Ocultar'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (isRelFocused) onExitFocusMode();
                        else onSetFocusEntity({ type: 'release', id: selectedRelease.id, name: selectedRelease.code });
                      }}
                      className="px-2 py-1 rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>{isRelFocused ? 'Salir Enfoque' : 'Enfocar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenReleasesModal(selectedRelease.id)}
                      className="px-2.5 py-1 rounded-[3px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Configurar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </aside>
  );
};
