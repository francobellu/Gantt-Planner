import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Diamond,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  FolderKanban,
  GitCommitHorizontal,
  History,
  Info,
  Lock,
  MessageSquare,
  Rocket,
  RotateCcw,
  Save,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import {
  ComputedGanttItem,
  DependencyType,
  FocusEntity,
  GanttItem,
  GanttProject,
  PlanCommit,
  PlanHistoryEntry,
  ProjectAlertLevel,
  ProjectPlatform,
  Release,
  TaskColor,
  TaskType,
  WorkCalendarConfig,
} from '../types/gantt';
import {
  calculateDurationFromDates,
  calculateEndDateFromDuration,
  formatDateDisplay,
  getTeamColor,
  GroupedEntityHistorySummary,
  groupHistoryChangesByHierarchy,
  groupItemsByProject,
  groupItemsByReleaseAndProject,
  HistoryEntityChange,
  normalizePlatform,
  resolveElementUrl,
  wouldCreateCycle,
} from '../utils/ganttEngine';
import { getReleaseDateSpan } from '../utils/releaseEngine';
import { CommitHistorySidebar } from './CommitHistorySidebar';
import { StatusCommentsSection } from './StatusCommentsPanel';

export type RightSidebarTab = 'details' | 'changes' | 'commits' | 'conflicts';

export interface ConflictItemSummary {
  id: string;
  name: string;
  type: TaskType;
  projectId?: string;
  projectName?: string;
  startDate: string;
  conflictMessage?: string;
}

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
  workCalendar?: WorkCalendarConfig;
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
  comparedCommitIds?: string[];
  onToggleCompareCommit?: (commitId: string) => void;
  onClearCompareCommits?: () => void;
  onCreateCommit: (message: string) => void;
  onRestoreCommit: (commit: PlanCommit) => void;
  // Conflicts props
  conflictItems: ConflictItemSummary[];
  onNavigateToConflictItem: (item: ConflictItemSummary) => void;
  onResolveAllConflicts: () => void;
  // Step-by-step history props (for Cambios tab)
  history?: PlanHistoryEntry[];
  currentHistoryIndex?: number;
  onRestoreHistorySnapshot?: (entry: PlanHistoryEntry, index: number) => void;
}

const COLOR_SWATCHES: { value: TaskColor; bg: string }[] = [
  { value: 'indigo', bg: 'bg-indigo-500' },
  { value: 'blue', bg: 'bg-blue-500' },
  { value: 'cyan', bg: 'bg-cyan-500' },
  { value: 'sky', bg: 'bg-sky-500' },
  { value: 'teal', bg: 'bg-teal-500' },
  { value: 'emerald', bg: 'bg-emerald-500' },
  { value: 'lime', bg: 'bg-lime-500' },
  { value: 'amber', bg: 'bg-amber-500' },
  { value: 'orange', bg: 'bg-orange-500' },
  { value: 'rose', bg: 'bg-rose-500' },
  { value: 'pink', bg: 'bg-pink-500' },
  { value: 'violet', bg: 'bg-violet-500' },
  { value: 'slate', bg: 'bg-slate-500' },
];

export const RightSidePanel: React.FC<RightSidePanelProps> = ({
  activeTab,
  onChangeTab,
  onClose,
  selectedEntity,
  onSelectEntity,
  items,
  projects,
  releases,
  workCalendar,
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
  comparedCommitIds,
  onToggleCompareCommit,
  onClearCompareCommits,
  onCreateCommit,
  onRestoreCommit,
  conflictItems,
  onNavigateToConflictItem,
  onResolveAllConflicts,
  history,
  currentHistoryIndex,
  onRestoreHistorySnapshot,
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

  // Unified inline edit state for the selected task/milestone
  const [taskName, setTaskName] = useState(() => selectedTask?.name || '');
  const [taskType, setTaskType] = useState<TaskType>(() => selectedTask?.type || 'task');
  const [taskIsExternal, setTaskIsExternal] = useState(() => Boolean(selectedTask?.isExternal));
  const [taskProjectId, setTaskProjectId] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskColor, setTaskColor] = useState<TaskColor>('indigo');
  const [taskPlatform, setTaskPlatform] = useState<ProjectPlatform | ''>('');
  const [taskReleaseId, setTaskReleaseId] = useState('');
  const [taskAlertLevel, setTaskAlertLevel] = useState<ProjectAlertLevel>(
    () => selectedTask?.alertLevel ?? 0
  );
  const [taskStart, setTaskStart] = useState('');
  const [taskEnd, setTaskEnd] = useState('');
  const [taskDuration, setTaskDuration] = useState(1);
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskSlack, setTaskSlack] = useState(0);
  const [taskDeps, setTaskDeps] = useState<string[]>([]);
  const [taskDepTypes, setTaskDepTypes] = useState<Record<string, DependencyType>>({});
  const [taskNotes, setTaskNotes] = useState('');
  const [autoCascade, setAutoCascade] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);
  const [projName, setProjName] = useState(() => selectedProject?.name || '');

  useEffect(() => {
    if (!selectedProject) return;
    setProjName(selectedProject.name);
  }, [selectedProject?.id, selectedProject?.name]);

  useEffect(() => {
    if (!selectedTask) return;
    setTaskName(selectedTask.name);
    setTaskType(selectedTask.type);
    const isExt = selectedTask.type === 'milestone' && Boolean(selectedTask.isExternal);
    setTaskIsExternal(isExt);
    setTaskProjectId(isExt ? '' : selectedTask.projectId || projects[0]?.id || '');
    setTaskAssignee(selectedTask.assignee || '');
    setTaskColor(selectedTask.color || 'indigo');
    setTaskPlatform(selectedTask.platform || '');
    setTaskReleaseId(isExt ? '' : selectedTask.releaseId || '');
    setTaskAlertLevel(selectedTask.alertLevel ?? 0);
    setTaskStart(selectedTask.startDate);
    setTaskEnd(selectedTask.endDate);
    setTaskDuration(selectedTask.type === 'milestone' ? 0 : Math.max(1, selectedTask.duration));
    setTaskProgress(selectedTask.progress ?? 0);
    setTaskSlack(selectedTask.slack ?? 0);
    setTaskDeps(selectedTask.dependencies || []);
    setTaskDepTypes(selectedTask.dependencyTypes || {});
    setTaskNotes(selectedTask.notes || '');
    setSavedNotice(false);
  }, [selectedTask, projects]);

  const existingTeams = useMemo(() => {
    const map = new Map<string, { name: string; color: TaskColor }>();
    for (const it of items) {
      const raw = it.assignee?.trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: raw,
          color: it.type === 'task' && it.color ? it.color : getTeamColor(raw),
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [items]);

  const [expandedSidebarChangeKeys, setExpandedSidebarChangeKeys] = useState<Set<string>>(
    () => new Set()
  );

  const toggleSidebarChangeKey = (key: string) => {
    setExpandedSidebarChangeKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const groupedHistory = useMemo(
    () =>
      groupHistoryChangesByHierarchy(history || [], releases, {
        currentItems: items,
        currentProjects: projects,
      }),
    [history, releases, items, projects]
  );

  const selectedEntityChanges = useMemo(() => {
    if (!selectedEntity) {
      return { count: 0, taskSummary: null, projectNode: null, releaseNode: null };
    }
    if (selectedEntity.type === 'task') {
      for (const rNode of groupedHistory) {
        for (const pNode of rNode.projects) {
          const found = pNode.itemChanges.find((it) => it.id === selectedEntity.id);
          if (found) {
            return {
              count: found.events.length,
              taskSummary: found,
              projectNode: null,
              releaseNode: null,
            };
          }
        }
      }
      return { count: 0, taskSummary: null, projectNode: null, releaseNode: null };
    }
    if (selectedEntity.type === 'project') {
      for (const rNode of groupedHistory) {
        const found = rNode.projects.find((p) => p.projectId === selectedEntity.id);
        if (found) {
          return {
            count: found.totalEventsCount,
            taskSummary: null,
            projectNode: found,
            releaseNode: null,
          };
        }
      }
      return { count: 0, taskSummary: null, projectNode: null, releaseNode: null };
    }
    const foundRel = groupedHistory.find((r) => r.releaseId === selectedEntity.id) || null;
    return {
      count: foundRel ? foundRel.totalEventsCount : 0,
      taskSummary: null,
      projectNode: null,
      releaseNode: foundRel,
    };
  }, [selectedEntity, groupedHistory]);

  const renderSidebarEntityChangesCard = (
    entity: GroupedEntityHistorySummary,
    keyId: string,
    defaultExpanded = false
  ) => {
    const isToggled = expandedSidebarChangeKeys.has(keyId);
    const isExpanded = defaultExpanded ? !isToggled : isToggled;
    return (
      <div
        key={keyId}
        data-testid={`sidebar-changes-entity-${entity.id}`}
        className="rounded-[4px] border border-[#E2E2DC] dark:border-zinc-800 bg-[#FAFAF8] dark:bg-zinc-950/60 p-2.5 space-y-2"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`px-1.5 py-0.2 rounded-[2px] text-[9px] font-mono font-bold uppercase ${
                  entity.entityType === 'project'
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : entity.isExternalMilestone
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : entity.entityType === 'milestone'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
                }`}
              >
                {entity.entityType === 'project'
                  ? 'Proyecto'
                  : entity.isExternalMilestone
                  ? 'Hito Ext.'
                  : entity.entityType === 'milestone'
                  ? 'Hito'
                  : 'Tarea'}
              </span>
              <span className="text-[11px] font-bold text-[#0C0C09] dark:text-zinc-100 truncate">
                {entity.name}
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400 mt-0.5">
              {entity.events.length} {entity.events.length === 1 ? 'cambio' : 'cambios'} · Último:{' '}
              {entity.lastFormattedDate}
            </div>
          </div>

          <button
            type="button"
            data-testid={`sidebar-changes-toggle-${entity.id}`}
            onClick={() => toggleSidebarChangeKey(keyId)}
            className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-[3px] text-[10px] font-mono font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span>{isExpanded ? 'Ocultar' : 'Detalle'}</span>
          </button>
        </div>

        {/* Net summary */}
        {entity.netChanges.length > 0 ? (
          <div
            data-testid={`sidebar-changes-net-${entity.id}`}
            className="flex flex-wrap gap-1"
          >
            {entity.netChanges.map((chg, idx) => (
              <span
                key={`${chg.field}-${idx}`}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[10px] font-mono bg-white dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-700"
              >
                <span className="text-[#6B6B66] dark:text-zinc-400">{chg.field}:</span>
                <span className="line-through text-rose-600/80 dark:text-rose-400/80">
                  {chg.before}
                </span>
                <span>→</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {chg.after}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400 italic">
            Sin cambio neto (valores restaurados al inicial).
          </div>
        )}

        {/* Chronological steps */}
        {isExpanded && (
          <div
            data-testid={`sidebar-changes-events-${entity.id}`}
            className="pt-1.5 border-t border-[#E2E2DC] dark:border-zinc-800 space-y-1.5"
          >
            {entity.events.map((ev) => {
              const entryObj = history?.[ev.entryIndex];
              const isCurrent =
                typeof currentHistoryIndex === 'number' && ev.entryIndex === currentHistoryIndex;
              return (
                <div
                  key={`${ev.entryId}-${ev.entryIndex}`}
                  className="p-2 rounded-[3px] bg-white dark:bg-zinc-900 border border-[#E2E2DC]/80 dark:border-zinc-800 space-y-1 text-[10.5px]"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1 py-0.2 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 font-mono text-[9.5px] font-bold text-[#0C0C09] dark:text-zinc-200">
                        {ev.actionLabel}
                      </span>
                      <span className="font-mono text-[9.5px] text-[#6B6B66] dark:text-zinc-400 truncate">
                        {ev.formattedDate}
                      </span>
                    </div>
                    {entryObj && onRestoreHistorySnapshot && !isCurrent && (
                      <button
                        type="button"
                        onClick={() => onRestoreHistorySnapshot(entryObj, ev.entryIndex)}
                        className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-[2px] border border-[#E2E2DC] dark:border-zinc-700 text-[9.5px] font-mono text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 transition cursor-pointer"
                        title="Restaurar el plan a este punto"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Restaurar</span>
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {ev.changes.map((c, ci) => (
                      <div
                        key={`${c.field}-${ci}`}
                        className="font-mono text-[10px] text-[#0C0C09] dark:text-zinc-200"
                      >
                        <span className="text-[#6B6B66] dark:text-zinc-400">{c.field}:</span>{' '}
                        {c.before} → <strong>{c.after}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      data-testid="right-side-panel"
      aria-label="Panel lateral derecho"
      className="w-80 sm:w-96 shrink-0 border-l border-[#0C0C09] dark:border-zinc-800 bg-white dark:bg-[#0C0C09] flex flex-col min-h-0 sticky top-12 h-[calc(100vh-3rem)] self-start overflow-hidden select-text z-40"
    >
      {/* Top Switcher Tabs: Detalles | Cambios (Del elemento / Commits) | Conflictos */}
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
            data-testid="sidebar-tab-changes"
            onClick={() => {
              if (activeTab !== 'changes' && activeTab !== 'commits') {
                onChangeTab('changes');
              }
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-semibold transition cursor-pointer ${
              activeTab === 'changes' || activeTab === 'commits'
                ? 'bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]'
                : 'text-[#6B6B66] dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            <History className="w-3.5 h-3.5 shrink-0" />
            <span>Cambios</span>
            {pendingChanges.length > 0 ? (
              <span className="px-1 py-0.2 rounded-full bg-amber-500 text-black font-mono text-[9px] font-bold">
                {pendingChanges.length}
              </span>
            ) : selectedEntityChanges.count > 0 ? (
              <span className="px-1 py-0.2 rounded-full bg-indigo-500 text-white font-mono text-[9px] font-bold">
                {selectedEntityChanges.count}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            data-testid="sidebar-tab-conflicts"
            onClick={() => onChangeTab('conflicts')}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-[4px] text-xs font-semibold transition cursor-pointer ${
              activeTab === 'conflicts'
                ? 'bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]'
                : 'text-[#6B6B66] dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            <AlertTriangle
              className={`w-3.5 h-3.5 shrink-0 ${
                conflictItems.length > 0 && activeTab !== 'conflicts' ? 'text-rose-500' : ''
              }`}
            />
            <span>Conflictos</span>
            {conflictItems.length > 0 && (
              <span className="px-1 py-0.2 rounded-full bg-rose-600 text-white font-mono text-[9px] font-bold">
                {conflictItems.length}
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

      {/* Sub-tabs inside Cambios: Del elemento | Commits */}
      {(activeTab === 'changes' || activeTab === 'commits') && (
        <div
          data-testid="sidebar-changes-subtabs"
          className="px-2.5 py-1.5 border-b border-[#E2E2DC] dark:border-zinc-800 bg-[#F4F4F1]/80 dark:bg-zinc-900/60 flex items-center gap-1 shrink-0"
        >
          <button
            type="button"
            data-testid="sidebar-changes-subtab-element"
            onClick={() => onChangeTab('changes')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded-[3px] text-[11px] font-semibold transition cursor-pointer ${
              activeTab === 'changes'
                ? 'bg-white dark:bg-zinc-800 text-[#0C0C09] dark:text-white border border-[#E2E2DC] dark:border-zinc-700 shadow-xs'
                : 'text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-zinc-200'
            }`}
          >
            <History className="w-3 h-3 shrink-0" />
            <span>Del elemento</span>
            {selectedEntityChanges.count > 0 && (
              <span className="px-1 py-0.2 rounded-full bg-indigo-500 text-white font-mono text-[9px] font-bold">
                {selectedEntityChanges.count}
              </span>
            )}
          </button>

          <button
            type="button"
            data-testid="sidebar-tab-commits"
            onClick={() => onChangeTab('commits')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded-[3px] text-[11px] font-semibold transition cursor-pointer ${
              activeTab === 'commits'
                ? 'bg-white dark:bg-zinc-800 text-[#0C0C09] dark:text-white border border-[#E2E2DC] dark:border-zinc-700 shadow-xs'
                : 'text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-zinc-200'
            }`}
          >
            <GitCommitHorizontal className="w-3 h-3 shrink-0" />
            <span>Commits</span>
            {pendingChanges.length > 0 && (
              <span className="px-1 py-0.2 rounded-full bg-amber-500 text-black font-mono text-[9px] font-bold">
                {pendingChanges.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Body */}
      {activeTab === 'conflicts' ? (
        <div
          data-testid="conflict-warning-banner"
          className="flex-1 overflow-y-auto p-3.5 text-xs flex flex-col gap-3"
        >
          {conflictItems.length === 0 ? (
            <div className="rounded-[4px] border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 text-center text-xs text-emerald-700 dark:text-emerald-300 my-auto">
              Sin conflictos de dependencias en el cronograma.
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 p-2.5 rounded-[4px] bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-[11px]">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>
                  Detectamos <strong>{conflictItems.length}</strong> tarea(s) cuya fecha inicial
                  es anterior a la fecha final de sus tareas predecesoras:
                </span>
              </div>

              <button
                type="button"
                data-testid="auto-schedule-btn"
                onClick={onResolveAllConflicts}
                className="w-full px-3 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <span>Reprogramar en cascada automáticamente</span>
              </button>

              <div
                data-testid="conflict-items-list"
                className="flex flex-col gap-2"
              >
                {conflictItems.map((cItem) => (
                  <button
                    key={cItem.id}
                    type="button"
                    data-testid={`conflict-item-btn-${cItem.id}`}
                    onClick={() => onNavigateToConflictItem(cItem)}
                    className="w-full text-left p-2.5 rounded-[4px] bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/30 text-rose-900 dark:text-rose-100 transition cursor-pointer flex flex-col gap-1"
                  >
                    <div className="text-[11px] font-semibold leading-snug">
                      {cItem.projectName && (
                        <span className="opacity-70 font-normal">{`${cItem.projectName} › `}</span>
                      )}
                      <span className="underline decoration-rose-500/60 underline-offset-2">
                        {cItem.name}
                      </span>
                    </div>
                    {cItem.conflictMessage && (
                      <div className="text-[10px] text-rose-700 dark:text-rose-300 leading-relaxed">
                        {cItem.conflictMessage}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : activeTab === 'changes' ? (
        <div
          data-testid="sidebar-changes-content"
          className="flex-1 overflow-y-auto p-3.5 text-xs flex flex-col gap-3"
        >
          {!selectedEntity ? (
            <div className="my-auto text-center py-10 px-4 text-[#6B6B66] dark:text-zinc-400 space-y-2">
              <History className="w-7 h-7 mx-auto opacity-35" />
              <p className="font-semibold text-[#0C0C09] dark:text-zinc-200">
                Ningún elemento seleccionado
              </p>
              <p className="text-[11px] leading-relaxed">
                Selecciona una <strong>tarea</strong>, <strong>hito</strong>,{' '}
                <strong>proyecto</strong> o <strong>release</strong> en el Cronograma para ver
                sus cambios agrupados.
              </p>
            </div>
          ) : selectedEntityChanges.count === 0 ? (
            <div className="space-y-2">
              <div className="p-2.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-800 bg-[#FAFAF8] dark:bg-zinc-950/60">
                <span className="text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400">
                  {selectedEntity.type === 'release'
                    ? 'Release seleccionada'
                    : selectedEntity.type === 'project'
                    ? 'Proyecto seleccionado'
                    : 'Elemento seleccionado'}
                </span>
                <div className="text-xs font-bold text-[#0C0C09] dark:text-zinc-100 mt-0.5 truncate">
                  {selectedEntity.name}
                </div>
              </div>
              <div className="text-center py-8 px-4 text-[#6B6B66] dark:text-zinc-400 space-y-1.5">
                <History className="w-6 h-6 mx-auto opacity-35" />
                <p className="font-semibold text-[#0C0C09] dark:text-zinc-200">
                  Sin cambios registrados
                </p>
                <p className="text-[11px] leading-relaxed">
                  Todavía no constan modificaciones para este elemento en el historial actual.
                </p>
              </div>
            </div>
          ) : selectedEntity.type === 'task' && selectedEntityChanges.taskSummary ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E2DC] dark:border-zinc-800">
                <span className="text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400">
                  Cambios del elemento
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                  {selectedEntityChanges.count}{' '}
                  {selectedEntityChanges.count === 1 ? 'cambio' : 'cambios'}
                </span>
              </div>
              {renderSidebarEntityChangesCard(
                selectedEntityChanges.taskSummary,
                `task:${selectedEntityChanges.taskSummary.id}`,
                true
              )}
            </div>
          ) : selectedEntity.type === 'project' && selectedEntityChanges.projectNode ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E2DC] dark:border-zinc-800">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 block">
                    Cambios del proyecto y sus tareas
                  </span>
                  <span className="text-xs font-bold text-[#0C0C09] dark:text-zinc-100 truncate block">
                    {selectedEntityChanges.projectNode.projectName}
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 shrink-0">
                  {selectedEntityChanges.projectNode.totalEventsCount}
                </span>
              </div>
              {selectedEntityChanges.projectNode.projectChanges &&
                renderSidebarEntityChangesCard(
                  selectedEntityChanges.projectNode.projectChanges,
                  `proj-own:${selectedEntityChanges.projectNode.projectId}`,
                  true
                )}
              {selectedEntityChanges.projectNode.itemChanges.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400">
                    Tareas e hitos modificados ({selectedEntityChanges.projectNode.itemChanges.length})
                  </div>
                  {selectedEntityChanges.projectNode.itemChanges.map((itemSummary) =>
                    renderSidebarEntityChangesCard(
                      itemSummary,
                      `proj-child:${selectedEntityChanges.projectNode!.projectId}:${itemSummary.id}`,
                      false
                    )
                  )}
                </div>
              )}
            </div>
          ) : selectedEntity.type === 'release' && selectedEntityChanges.releaseNode ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E2DC] dark:border-zinc-800">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 block">
                    Cambios de la release
                  </span>
                  <span className="text-xs font-bold text-[#0C0C09] dark:text-zinc-100 truncate block">
                    {selectedEntityChanges.releaseNode.releaseCode} ·{' '}
                    {selectedEntityChanges.releaseNode.releaseName}
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 shrink-0">
                  {selectedEntityChanges.releaseNode.totalEventsCount}
                </span>
              </div>
              {selectedEntityChanges.releaseNode.projects.map((pNode) => (
                <div
                  key={pNode.projectId}
                  data-testid={`sidebar-changes-release-project-${pNode.projectId}`}
                  className="rounded-[4px] border border-[#E2E2DC] dark:border-zinc-800 overflow-hidden"
                >
                  <div className="px-2.5 py-1.5 bg-[#F4F4F1] dark:bg-zinc-800/70 border-b border-[#E2E2DC] dark:border-zinc-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#0C0C09] dark:text-zinc-100 truncate">
                      {pNode.projectName}
                    </span>
                    <span className="font-mono text-[10px] text-[#6B6B66] dark:text-zinc-400 shrink-0">
                      {pNode.totalEventsCount}
                    </span>
                  </div>
                  <div className="p-2 space-y-2">
                    {pNode.projectChanges &&
                      renderSidebarEntityChangesCard(
                        pNode.projectChanges,
                        `rel-proj-own:${pNode.projectId}`,
                        false
                      )}
                    {pNode.itemChanges.map((itemSummary) =>
                      renderSidebarEntityChangesCard(
                        itemSummary,
                        `rel-proj-child:${pNode.projectId}:${itemSummary.id}`,
                        false
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : activeTab === 'commits' ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <CommitHistorySidebar
            embedded
            commits={commits}
            pendingChanges={pendingChanges}
            activeBaselineCommitId={activeBaselineCommitId}
            onToggleBaselineCommit={onToggleBaselineCommit}
            comparedCommitIds={comparedCommitIds}
            onToggleCompareCommit={onToggleCompareCommit}
            onClearCompareCommits={onClearCompareCommits}
            releases={releases}
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

          {/* TASK / MILESTONE DETAILS + UNIFIED INLINE EDITOR */}
          {selectedTask && (() => {
            const itemProj = projects.find((p) => p.id === selectedTask.projectId);
            const effPlatform = normalizePlatform(selectedTask.platform || itemProj?.platform);
            const isTaskFocused =
              isFocusMode && focusEntity?.type === 'task' && focusEntity.id === selectedTask.id;
            const isLocked = Boolean(itemProj?.locked);

            const handleSaveTaskEdits = (e: React.FormEvent) => {
              e.preventDefault();
              const trimmed = taskName.trim() || selectedTask.name;
              const effectiveIsExternal = taskType === 'milestone' && taskIsExternal;
              const updated: GanttItem = {
                ...selectedTask,
                name: trimmed,
                type: taskType,
                isExternal: effectiveIsExternal,
                projectId: effectiveIsExternal
                  ? undefined
                  : taskProjectId || selectedTask.projectId || projects[0]?.id,
                assignee: taskAssignee.trim() || undefined,
                color: taskColor,
                customColor: true,
                platform: taskPlatform || undefined,
                releaseId: effectiveIsExternal ? undefined : taskReleaseId || undefined,
                alertLevel: taskAlertLevel,
                startDate: taskStart,
                endDate: taskType === 'milestone' ? taskStart : taskEnd,
                duration: taskType === 'milestone' ? 0 : Math.max(1, taskDuration),
                progress: Math.min(100, Math.max(0, taskProgress)),
                slack: Math.max(0, taskSlack),
                dependencies: taskDeps,
                dependencyTypes: taskDepTypes,
                notes: taskNotes.trim() || undefined,
                url: resolveElementUrl({ name: trimmed, url: selectedTask.url }),
              };
              onUpdateItem(updated, autoCascade);
              if (!isLocked) {
                setSavedNotice(true);
                setTimeout(() => setSavedNotice(false), 1800);
              }
            };

            return (
              <form
                onSubmit={handleSaveTaskEdits}
                data-testid={`sidebar-task-details-${selectedTask.id}`}
                className="flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#E2E2DC] dark:border-zinc-800">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border border-[#E2E2DC] dark:border-zinc-700">
                        {selectedTask.displayId ||
                          (itemProj?.projectIndex
                            ? `P${itemProj.projectIndex}T${selectedTask.taskIndex || selectedTask.wbs}`
                            : `T${selectedTask.taskIndex || selectedTask.wbs}`)}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {taskType === 'milestone' ? 'Hito' : 'Tarea'}
                      </span>
                      {effPlatform && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[2px] border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                          {effPlatform}
                        </span>
                      )}
                      {(selectedTask.alertLevel ?? 0) > 0 && (() => {
                        const lvl = selectedTask.alertLevel ?? 0;
                        return (
                          <span
                            data-testid={`sidebar-task-alert-badge-${selectedTask.id}`}
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] border ${
                              lvl === 1
                                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                : lvl === 2
                                ? 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800'
                                : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                            }`}
                          >
                            Nivel {lvl}
                          </span>
                        );
                      })()}
                      {isLocked && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[9px] font-mono font-bold">
                          Bloqueado
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedTask.hasConflict && (
                  <div
                    data-testid={`panel-conflict-alert-${selectedTask.id}`}
                    className="flex items-start gap-2 p-2 rounded-[4px] bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-[11px]"
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

                {/* Name */}
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    data-testid={`sidebar-edit-name-${selectedTask.id}`}
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-[#0C0C09] dark:text-zinc-100 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Auto-generated URL */}
                {(() => {
                  const effectiveUrl = resolveElementUrl({ name: taskName, url: selectedTask.url });
                  if (!effectiveUrl) return null;
                  return (
                    <div data-testid={`sidebar-task-url-box-${selectedTask.id}`}>
                      <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                        URL
                      </label>
                      <a
                        href={effectiveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`sidebar-task-url-link-${selectedTask.id}`}
                        className="flex items-center justify-between gap-2 w-full px-2.5 py-1.5 rounded-[4px] border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/30 text-[11px] font-mono text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/80 dark:hover:bg-indigo-950/60 hover:underline transition"
                        title={effectiveUrl}
                      >
                        <span className="truncate">{effectiveUrl}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    </div>
                  );
                })()}

                {/* Type & Project */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                      Tipo
                    </label>
                    <select
                      data-testid="sidebar-task-type-select"
                      value={taskType}
                      onChange={(e) => {
                        const nt = e.target.value as TaskType;
                        setTaskType(nt);
                        if (nt === 'milestone') {
                          setTaskDuration(0);
                          setTaskEnd(taskStart);
                          setTaskIsExternal(true);
                          setTaskProjectId('');
                          setTaskReleaseId('');
                        } else {
                          const nd = Math.max(1, taskDuration || 3);
                          setTaskDuration(nd);
                          setTaskEnd(calculateEndDateFromDuration(taskStart, nd, 'task', workCalendar));
                          setTaskIsExternal(false);
                          if (!taskProjectId) {
                            setTaskProjectId(selectedTask.projectId || projects[0]?.id || '');
                          }
                        }
                      }}
                      className="w-full px-2 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    >
                      <option value="task">Tarea</option>
                      <option value="milestone">Hito</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                      Proyecto
                    </label>
                    <select
                      data-testid="sidebar-task-project-select"
                      value={taskType === 'milestone' && taskIsExternal ? '' : taskProjectId}
                      disabled={taskType === 'milestone' && taskIsExternal}
                      onChange={(e) => setTaskProjectId(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs disabled:opacity-55 disabled:cursor-not-allowed"
                    >
                      {taskType === 'milestone' && taskIsExternal ? (
                        <option value="">Sin proyecto (Externo)</option>
                      ) : (
                        projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* External Milestone Toggle (only for milestones) */}
                {taskType === 'milestone' && (
                  <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer p-2 rounded-[4px] bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/25">
                    <input
                      type="checkbox"
                      data-testid="sidebar-milestone-is-external-checkbox"
                      checked={taskIsExternal}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setTaskIsExternal(checked);
                        if (checked) {
                          setTaskProjectId('');
                          setTaskReleaseId('');
                        } else if (!taskProjectId) {
                          setTaskProjectId(selectedTask.projectId || projects[0]?.id || '');
                        }
                      }}
                      className="mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-0 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold text-[#0C0C09] dark:text-zinc-200 leading-tight">
                        Hito externo (sin proyecto ni release)
                      </span>
                      <span className="text-[10.5px] text-[#6B6B66] dark:text-zinc-400 mt-0.5 leading-snug">
                        Independiente de proyectos y no sujeto a los plazos de ninguna release.
                      </span>
                    </div>
                  </label>
                )}

                {/* Team & Color */}
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Equipo / Responsable
                  </label>
                  <input
                    type="text"
                    list="sidebar-existing-teams"
                    value={taskAssignee}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTaskAssignee(val);
                      const match = existingTeams.find(
                        (t) => t.name.toLowerCase() === val.trim().toLowerCase()
                      );
                      if (match && taskType === 'task') setTaskColor(match.color);
                      else if (taskType === 'task') setTaskColor(getTeamColor(val));
                    }}
                    placeholder="Ej. Frontend, DIGI..."
                    className="w-full px-2.5 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                  />
                  <datalist id="sidebar-existing-teams">
                    {existingTeams.map((t) => (
                      <option key={t.name} value={t.name} />
                    ))}
                  </datalist>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {COLOR_SWATCHES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setTaskColor(c.value)}
                        className={`w-4 h-4 rounded-full ${c.bg} transition cursor-pointer ${
                          taskColor === c.value ? 'ring-2 ring-offset-1 ring-[#0C0C09] scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                        title={c.value}
                      />
                    ))}
                  </div>
                </div>

                {/* Platform, Release & Alert Level */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                      Plataforma
                    </label>
                    <select
                      value={taskPlatform}
                      onChange={(e) => setTaskPlatform(e.target.value as ProjectPlatform | '')}
                      className="w-full px-2 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    >
                      <option value="">Heredar</option>
                      <option value="iOS/Android">iOS/Android</option>
                      <option value="iOS">iOS</option>
                      <option value="Android">Android</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                      Release
                    </label>
                    <select
                      value={taskType === 'milestone' && taskIsExternal ? '' : taskReleaseId}
                      disabled={taskType === 'milestone' && taskIsExternal}
                      onChange={(e) => setTaskReleaseId(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs disabled:opacity-55 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {taskType === 'milestone' && taskIsExternal ? 'Sin release (Externo)' : 'Heredar'}
                      </option>
                      {releases.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                      Nivel Alerta
                    </label>
                    <select
                      data-testid="sidebar-task-alert-select"
                      value={taskAlertLevel}
                      disabled={isLocked}
                      onChange={(e) => {
                        const nextAlert = Number(e.target.value) as ProjectAlertLevel;
                        setTaskAlertLevel(nextAlert);
                        onUpdateItem({ ...selectedTask, alertLevel: nextAlert }, false);
                      }}
                      className="w-full px-2 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs disabled:opacity-50"
                    >
                      <option value={0}>0 — Normal</option>
                      <option value={1}>1 — Baja</option>
                      <option value={2}>2 — Media</option>
                      <option value={3}>3 — Alta</option>
                    </select>
                  </div>
                </div>

                {/* Dates, Duration, Progress & Slack */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-[4px] bg-[#FAFAF8] dark:bg-zinc-900/40 border border-[#E2E2DC] dark:border-zinc-800 text-[11px]">
                  <div>
                    <span className="text-[#6B6B66] dark:text-zinc-400 block mb-0.5">Inicio:</span>
                    <input
                      type="date"
                      value={taskStart}
                      onChange={(e) => {
                        const ns = e.target.value;
                        setTaskStart(ns);
                        if (taskType === 'milestone') setTaskEnd(ns);
                        else setTaskEnd(calculateEndDateFromDuration(ns, taskDuration, 'task', workCalendar));
                      }}
                      className="w-full px-1.5 py-1 rounded border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <span className="text-[#6B6B66] dark:text-zinc-400 block mb-0.5">Fin:</span>
                    <input
                      type="date"
                      value={taskType === 'milestone' ? taskStart : taskEnd}
                      disabled={taskType === 'milestone'}
                      onChange={(e) => {
                        const ne = e.target.value < taskStart ? taskStart : e.target.value;
                        setTaskEnd(ne);
                        setTaskDuration(calculateDurationFromDates(taskStart, ne, 'task', workCalendar));
                      }}
                      className="w-full px-1.5 py-1 rounded border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-[11px] disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <span className="text-[#6B6B66] dark:text-zinc-400 block mb-0.5">Duración (d):</span>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      disabled={taskType === 'milestone'}
                      value={taskType === 'milestone' ? 0 : taskDuration}
                      onChange={(e) => {
                        const nd = Math.max(1, Number(e.target.value) || 1);
                        setTaskDuration(nd);
                        setTaskEnd(calculateEndDateFromDuration(taskStart, nd, 'task', workCalendar));
                      }}
                      className="w-full px-1.5 py-1 rounded border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-[11px] disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <span className="text-[#6B6B66] dark:text-zinc-400 block mb-0.5">Progreso (%):</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={taskProgress}
                      onChange={(e) =>
                        setTaskProgress(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                      }
                      className="w-full px-1.5 py-1 rounded border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-[11px]"
                    />
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

                {/* Predecessor & Successor Tasks */}
                <div className="flex flex-col gap-1.5 p-2.5 rounded-[4px] bg-[#F4F4F1]/40 dark:bg-zinc-900/40 border border-[#E2E2DC] dark:border-zinc-800 text-[11px]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 font-bold">
                    Predecesoras ({taskDeps.length})
                  </span>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {items
                      .filter(
                        (cand) =>
                          cand.id !== selectedTask.id &&
                          !wouldCreateCycle(items, cand.id, selectedTask.id)
                      )
                      .map((cand) => {
                        const checked = taskDeps.includes(cand.id);
                        return (
                          <label key={cand.id} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setTaskDeps((prev) =>
                                  prev.includes(cand.id)
                                    ? prev.filter((id) => id !== cand.id)
                                    : [...prev, cand.id]
                                );
                              }}
                              className="rounded-[2px]"
                            />
                            <span className="truncate">
                              #{cand.wbsCode || cand.wbs} {cand.name}
                            </span>
                          </label>
                        );
                      })}
                  </div>

                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 font-bold pt-1.5 border-t border-[#E2E2DC] dark:border-zinc-800">
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

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Descripción / Notas
                  </label>
                  <textarea
                    rows={3}
                    value={taskNotes}
                    onChange={(e) => setTaskNotes(e.target.value)}
                    placeholder="Añade detalles, alcance o notas..."
                    className="w-full px-2.5 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs resize-y min-h-[68px]"
                  />
                </div>

                {/* Status Comments / Seguimiento */}
                <div
                  data-testid={`sidebar-task-comments-${selectedTask.id}`}
                  className="pt-2 border-t border-[#E2E2DC] dark:border-zinc-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400">
                      <MessageSquare className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      <span>{`Seguimiento (${selectedTask.statusComments?.length ?? 0})`}</span>
                    </span>
                  </div>
                  <StatusCommentsSection
                    entityType="item"
                    item={selectedTask}
                    onUpdateItem={onUpdateItem}
                    compact
                  />
                </div>

                <label className="flex items-center gap-1.5 text-[11px] text-[#6B6B66] dark:text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCascade}
                    onChange={(e) => setAutoCascade(e.target.checked)}
                    className="rounded-[2px]"
                  />
                  <span>Reprogramar sucesoras automáticamente al guardar</span>
                </label>

                {/* Primary Save + Quick Actions */}
                <button
                  type="submit"
                  data-testid="sidebar-save-task-btn"
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] font-semibold text-xs transition cursor-pointer"
                >
                  {savedNotice ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{savedNotice ? 'Cambios guardados' : 'Guardar Cambios'}</span>
                </button>

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

                  <button
                    type="button"
                    onClick={() => onDeleteTask(selectedTask.id)}
                    className="p-1.5 rounded-[3px] border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            );
          })()}

          {/* PROJECT DETAILS */}
          {selectedProject && (() => {
            const projRelease = releases.find((r) => r.id === selectedProject.releaseId);
            const projPlatform = normalizePlatform(selectedProject.platform);
            const projAlert = selectedProject.alertLevel ?? 0;
            const projItems = projectGroup?.items || items.filter((it) => it.projectId === selectedProject.id);
            const projTeams = Array.from(
              new Set(projItems.map((it) => it.assignee?.trim()).filter(Boolean))
            );
            const projCode = projectGroup?.projectIndex || selectedProject.projectIndex;
            const isProjLocked = Boolean(selectedProject.locked);

            return (
              <div data-testid={`sidebar-project-details-${selectedProject.id}`} className="flex flex-col gap-3">
                {/* Header Badges */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#E2E2DC] dark:border-zinc-800">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {projCode && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border border-[#E2E2DC] dark:border-zinc-700">
                          {`#P${projCode}`}
                        </span>
                      )}
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                        <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                        <span>Proyecto</span>
                      </span>
                      {projPlatform && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[2px] border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                          {projPlatform}
                        </span>
                      )}
                      {projAlert > 0 && (
                        <span
                          data-testid={`sidebar-project-alert-badge-${selectedProject.id}`}
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] border ${
                            projAlert === 1
                              ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                              : projAlert === 2
                              ? 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800'
                              : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {`Nivel ${projAlert}`}
                        </span>
                      )}
                      {projRelease && (
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-[2px] border border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                          {projRelease.code}
                        </span>
                      )}
                      {isProjLocked && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[9px] font-mono font-bold">
                          Bloqueado
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Editable Project Name */}
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Nombre del Proyecto
                  </label>
                  <input
                    type="text"
                    data-testid="sidebar-project-name-input"
                    value={projName}
                    readOnly={isProjLocked}
                    onChange={(e) => setProjName(e.target.value)}
                    onBlur={() => {
                      if (isProjLocked) return;
                      const trimmed = projName.trim() || selectedProject.name;
                      setProjName(trimmed);
                      if (trimmed !== selectedProject.name) {
                        onUpdateProject({
                          ...selectedProject,
                          name: trimmed,
                          url: resolveElementUrl({ name: trimmed, url: selectedProject.url }),
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.currentTarget as HTMLInputElement).blur();
                      }
                    }}
                    className="w-full px-2.5 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-[#0C0C09] dark:text-zinc-100"
                  />
                </div>

                {/* Auto-generated Project URL */}
                {(() => {
                  const effectiveProjUrl = resolveElementUrl({ name: projName, url: selectedProject.url });
                  if (!effectiveProjUrl) return null;
                  return (
                    <div data-testid={`sidebar-project-url-box-${selectedProject.id}`}>
                      <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                        URL
                      </label>
                      <a
                        href={effectiveProjUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`sidebar-project-url-link-${selectedProject.id}`}
                        className="flex items-center justify-between gap-2 w-full px-2.5 py-1.5 rounded-[4px] border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/30 text-[11px] font-mono text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/80 dark:hover:bg-indigo-950/60 hover:underline transition"
                        title={effectiveProjUrl}
                      >
                        <span className="truncate">{effectiveProjUrl}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    </div>
                  );
                })()}

                {/* Project Color Swatches */}
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Color
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COLOR_SWATCHES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        disabled={isProjLocked}
                        data-testid={`sidebar-project-color-${c.value}`}
                        onClick={() => onUpdateProject({ ...selectedProject, color: c.value })}
                        className={`w-4 h-4 rounded-full ${c.bg} transition cursor-pointer disabled:opacity-50 ${
                          selectedProject.color === c.value
                            ? 'ring-2 ring-offset-1 ring-[#0C0C09] scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        title={c.value}
                      />
                    ))}
                  </div>
                </div>

                {/* Editable Platform, Release & Alert Level */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                      Plataforma
                    </label>
                    <select
                      data-testid="sidebar-project-platform-select"
                      value={selectedProject.platform || 'iOS/Android'}
                      disabled={isProjLocked}
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
                      Release
                    </label>
                    <select
                      data-testid="sidebar-project-release-select"
                      value={selectedProject.releaseId || ''}
                      disabled={isProjLocked}
                      onChange={(e) =>
                        onUpdateProject({
                          ...selectedProject,
                          releaseId: e.target.value || undefined,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs disabled:opacity-50"
                    >
                      <option value="">Sin release</option>
                      {releases.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                      Nivel Alerta
                    </label>
                    <select
                      data-testid="sidebar-project-alert-select"
                      value={projAlert}
                      disabled={isProjLocked}
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

                {/* Dates, Duration, Progress, Counts & Teams */}
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
                    <div>
                      <span className="text-[#6B6B66] dark:text-zinc-400 block">Tareas / Hitos:</span>
                      <span className="font-mono font-semibold">
                        {projectGroup.tasksCount} / {projectGroup.milestonesCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B6B66] dark:text-zinc-400 block">Equipos:</span>
                      <span className="font-semibold truncate block" title={projTeams.join(', ') || 'Sin asignar'}>
                        {projTeams.length > 0 ? projTeams.join(', ') : '—'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Project Description */}
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Descripción / Notas
                  </label>
                  <textarea
                    rows={4}
                    readOnly={isProjLocked}
                    value={selectedProject.description || ''}
                    onChange={(e) =>
                      onUpdateProject({ ...selectedProject, description: e.target.value })
                    }
                    placeholder="Descripción del proyecto..."
                    className="w-full px-2.5 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-[#FAFAF8] dark:bg-zinc-900 text-xs resize-y min-h-[68px]"
                  />
                </div>

                {/* Project Status Comments / Seguimiento */}
                <div
                  data-testid={`sidebar-project-comments-${selectedProject.id}`}
                  className="pt-2 border-t border-[#E2E2DC] dark:border-zinc-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400">
                      <MessageSquare className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      <span>{`Seguimiento (${selectedProject.statusComments?.length ?? 0})`}</span>
                    </span>
                  </div>
                  <StatusCommentsSection
                    entityType="project"
                    project={selectedProject}
                    projectItems={projItems}
                    projectIndex={projCode}
                    defaultScope="all"
                    onUpdateProject={onUpdateProject}
                    onUpdateItem={onUpdateItem}
                    compact
                  />
                </div>

                {/* Project Tasks & Milestones List */}
                <div
                  data-testid="sidebar-project-tasks-list"
                  className="p-2.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-800 bg-[#FAFAF8] dark:bg-zinc-900/30"
                >
                  <div className="text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1.5">
                    Tareas e Hitos ({projItems.length})
                  </div>
                  {projItems.length > 0 ? (
                    <div className="flex flex-col gap-1 max-h-44 overflow-y-auto">
                      {projItems.map((it) => (
                        <button
                          key={it.id}
                          type="button"
                          data-testid={`sidebar-project-task-item-${it.id}`}
                          onClick={() => onSelectEntity({ type: 'task', id: it.id, name: it.name })}
                          className="w-full text-left px-2 py-1 rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 text-[11px] flex items-center justify-between gap-2 cursor-pointer transition"
                        >
                          <span className="truncate font-medium">
                            {`${it.displayId || (projCode ? `P${projCode}T${it.taskIndex || it.wbs}` : `T${it.taskIndex || it.wbs}`)} ${it.name}`}
                          </span>
                          <span className="font-mono text-[10px] text-[#6B6B66] dark:text-zinc-400 shrink-0">
                            {it.type === 'milestone' ? '◆' : `${it.duration}d · ${it.progress}%`}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#6B6B66] dark:text-zinc-500">
                      Sin tareas ni hitos en este proyecto.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E2E2DC] dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => onToggleProjectLock(selectedProject)}
                    className="px-2.5 py-1 rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {isProjLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>{isProjLocked ? 'Desbloquear' : 'Bloquear'}</span>
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
            );
          })()}

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
