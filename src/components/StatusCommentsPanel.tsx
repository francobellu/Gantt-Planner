import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send, Trash2, X, Zap } from 'lucide-react';
import {
  ComputedGanttItem,
  GanttItem,
  GanttProject,
  ProjectAlertLevel,
  StatusComment,
} from '../types/gantt';
import {
  addStatusCommentToItem,
  addStatusCommentToProject,
  collectProjectRollupComments,
  deleteStatusCommentFromEntity,
  ProjectRollupComment,
} from '../utils/ganttEngine';

const ALERT_SHORT_LABELS: Record<ProjectAlertLevel, string> = {
  0: 'Normal',
  1: 'N1',
  2: 'N2',
  3: 'N3',
};

const ALERT_FULL_LABELS: Record<ProjectAlertLevel, string> = {
  0: 'Normal',
  1: 'N1 Baja',
  2: 'N2 Media',
  3: 'N3 Alta',
};

export function formatCommentDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    const datePart = d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
    const timePart = d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} · ${timePart}`;
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

export function formatCommentShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  try {
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  } catch {
    return iso.slice(0, 10);
  }
}

function getAlertChipClasses(level: ProjectAlertLevel, active: boolean): string {
  if (!active) {
    return 'border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#6B6B66] dark:text-zinc-400 hover:border-zinc-400 hover:text-[#0C0C09] dark:hover:text-zinc-200';
  }
  if (level === 1) {
    return 'border-amber-400 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300';
  }
  if (level === 2) {
    return 'border-orange-400 bg-orange-100 dark:bg-orange-950/60 text-orange-900 dark:text-orange-300';
  }
  if (level === 3) {
    return 'border-rose-500 bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300';
  }
  return 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300';
}

export interface StatusCommentsSectionProps {
  entityType: 'project' | 'item';
  project?: GanttProject;
  item?: ComputedGanttItem;
  projectItems?: ComputedGanttItem[];
  projectIndex?: number;
  defaultScope?: 'all' | 'own';
  onUpdateProject?: (project: GanttProject) => void;
  onUpdateItem?: (item: GanttItem, cascade: boolean) => void;
  compact?: boolean;
  autoFocus?: boolean;
}

export const StatusCommentsSection: React.FC<StatusCommentsSectionProps> = ({
  entityType,
  project,
  item,
  projectItems = [],
  projectIndex,
  defaultScope = 'own',
  onUpdateProject,
  onUpdateItem,
  compact = false,
  autoFocus = false,
}) => {
  const isItem = entityType === 'item' && Boolean(item);
  const currentAlert: ProjectAlertLevel = isItem
    ? ((item?.alertLevel ?? 0) as ProjectAlertLevel)
    : ((project?.alertLevel ?? 0) as ProjectAlertLevel);
  const currentProgress: number = isItem ? item?.progress ?? 0 : 0;

  const [text, setText] = useState('');
  const [draftAlert, setDraftAlert] = useState<ProjectAlertLevel>(currentAlert);
  const [draftProgress, setDraftProgress] = useState<number>(currentProgress);
  const [scope, setScope] = useState<'all' | 'own'>(defaultScope);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const entityId = isItem ? item?.id : project?.id;

  useEffect(() => {
    setDraftAlert(currentAlert);
    setDraftProgress(currentProgress);
    setConfirmDeleteId(null);
  }, [entityId, currentAlert, currentProgress]);

  useEffect(() => {
    setScope(defaultScope);
  }, [entityId, defaultScope]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus, entityId]);

  const ownComments: StatusComment[] = useMemo(() => {
    const raw = isItem ? item?.statusComments : project?.statusComments;
    return Array.isArray(raw) ? raw : [];
  }, [isItem, item?.statusComments, project?.statusComments]);

  const rollupComments: ProjectRollupComment[] = useMemo(() => {
    if (isItem || !project) return [];
    return collectProjectRollupComments(project, projectItems, projectIndex);
  }, [isItem, project, projectItems, projectIndex]);

  const hasSubtaskComments = !isItem && rollupComments.length > ownComments.length;

  const displayedComments: ProjectRollupComment[] = useMemo(() => {
    if (!isItem && hasSubtaskComments && scope === 'all') {
      return rollupComments;
    }
    return ownComments.map((c) => ({
      ...c,
      ownerType: isItem ? 'item' : 'project',
      ownerId: entityId || '',
    }));
  }, [isItem, hasSubtaskComments, scope, rollupComments, ownComments, entityId]);

  const alertChanged = draftAlert !== currentAlert;
  const progressChanged = isItem && draftProgress !== currentProgress;
  const canPublish = text.trim().length > 0;

  const handlePublish = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (isItem && item && onUpdateItem) {
      const updated = addStatusCommentToItem(item, {
        text: trimmed,
        nextAlertLevel: alertChanged ? draftAlert : undefined,
        nextProgress: progressChanged ? draftProgress : undefined,
      });
      onUpdateItem(updated, false);
      setText('');
      return;
    }

    if (!isItem && project && onUpdateProject) {
      const updated = addStatusCommentToProject(project, {
        text: trimmed,
        nextAlertLevel: alertChanged ? draftAlert : undefined,
      });
      onUpdateProject(updated);
      setText('');
    }
  };

  const handleDelete = (comment: ProjectRollupComment) => {
    if (comment.ownerType === 'project' && project && onUpdateProject) {
      onUpdateProject(deleteStatusCommentFromEntity(project, comment.id));
    } else if (comment.ownerType === 'item' && onUpdateItem) {
      const targetItem =
        isItem && item && item.id === comment.ownerId
          ? item
          : projectItems.find((it) => it.id === comment.ownerId);
      if (targetItem) {
        onUpdateItem(deleteStatusCommentFromEntity(targetItem, comment.id), false);
      }
    }
    setConfirmDeleteId(null);
  };

  return (
    <div
      data-testid={`status-comments-section-${entityType}-${entityId || 'none'}`}
      className="flex flex-col gap-2.5"
    >
      {/* Scope switch when project has subtask comments */}
      {hasSubtaskComments && (
        <div
          data-testid="status-comments-scope-tabs"
          className="flex items-center gap-1 p-1 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-800/80 border border-[#E2E2DC] dark:border-zinc-700"
        >
          <button
            type="button"
            data-testid="status-comments-scope-all"
            onClick={() => setScope('all')}
            className={`flex-1 px-2 py-1 rounded-[3px] text-[11px] font-semibold transition cursor-pointer ${
              scope === 'all'
                ? 'bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300 shadow-xs border border-indigo-200 dark:border-indigo-800'
                : 'text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-zinc-200'
            }`}
          >
            {`Todo (${rollupComments.length})`}
          </button>
          <button
            type="button"
            data-testid="status-comments-scope-own"
            onClick={() => setScope('own')}
            className={`flex-1 px-2 py-1 rounded-[3px] text-[11px] font-semibold transition cursor-pointer ${
              scope === 'own'
                ? 'bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300 shadow-xs border border-indigo-200 dark:border-indigo-800'
                : 'text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-zinc-200'
            }`}
          >
            {`Solo proyecto (${ownComments.length})`}
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-[#FCFCFA] dark:bg-zinc-900/60 p-2.5 space-y-2">
        <textarea
          ref={textareaRef}
          data-testid="status-comment-input"
          rows={compact ? 2 : 3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              handlePublish();
            }
          }}
          placeholder="Escribe una actualización de seguimiento... (⌘/Ctrl + Enter)"
          className="w-full px-2.5 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-[#0C0C09] dark:text-zinc-100 placeholder:text-[#9A9A94] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 resize-y"
        />

        {/* Optional Alert Level selector */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400">
            Alerta
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {([0, 1, 2, 3] as ProjectAlertLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                data-testid={`status-comment-alert-chip-${lvl}`}
                onClick={() => setDraftAlert(lvl)}
                className={`px-2 py-0.5 rounded-[3px] border text-[10px] font-mono font-bold transition cursor-pointer ${getAlertChipClasses(
                  lvl,
                  draftAlert === lvl
                )}`}
              >
                {ALERT_SHORT_LABELS[lvl]}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Progress selector (items only) */}
        {isItem && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400">
              Progreso
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {[0, 25, 50, 75, 100].map((p) => (
                <button
                  key={p}
                  type="button"
                  data-testid={`status-comment-progress-chip-${p}`}
                  onClick={() => setDraftProgress(p)}
                  className={`px-1.5 py-0.5 rounded-[3px] border text-[10px] font-mono font-bold transition cursor-pointer ${
                    draftProgress === p
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      : 'border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#6B6B66] dark:text-zinc-400 hover:border-zinc-400'
                  }`}
                >
                  {`${p}%`}
                </button>
              ))}
              <input
                type="number"
                data-testid="status-comment-progress-input"
                min={0}
                max={100}
                step={5}
                value={draftProgress}
                onChange={(e) =>
                  setDraftProgress(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                }
                className="w-12 px-1.5 py-0.5 rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-[10px] text-[#0C0C09] dark:text-zinc-100"
              />
            </div>
          </div>
        )}

        {/* Atomic delta preview */}
        {(alertChanged || progressChanged) && (
          <div
            data-testid="status-comment-delta-preview"
            className="flex items-center gap-1.5 flex-wrap px-2 py-1 rounded-[3px] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[10px] text-indigo-800 dark:text-indigo-300"
          >
            <Zap className="w-3 h-3 shrink-0" />
            <span>Al publicar se actualizará:</span>
            {alertChanged && (
              <span className="font-mono font-bold">
                {`Alerta ${ALERT_SHORT_LABELS[currentAlert]} → ${ALERT_SHORT_LABELS[draftAlert]}`}
              </span>
            )}
            {progressChanged && (
              <span className="font-mono font-bold">
                {`Progreso ${currentProgress}% → ${draftProgress}%`}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-[10px] text-[#6B6B66] dark:text-zinc-400">
            ⌘/Ctrl + Enter
          </span>
          <button
            type="button"
            data-testid="status-comment-publish-btn"
            disabled={!canPublish}
            onClick={handlePublish}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#0C0C09] dark:bg-indigo-600 text-white text-[11px] font-semibold hover:bg-zinc-800 dark:hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <Send className="w-3 h-3" />
            <span>Publicar</span>
          </button>
        </div>
      </div>

      {/* Chronological Timeline */}
      {displayedComments.length === 0 ? (
        <div
          data-testid="status-comments-empty"
          className="text-center py-5 px-3 rounded-[4px] border border-dashed border-[#E2E2DC] dark:border-zinc-700 text-[11px] text-[#6B6B66] dark:text-zinc-400"
        >
          Sin comentarios de seguimiento todavía.
        </div>
      ) : (
        <div data-testid="status-comments-list" className="space-y-2">
          {displayedComments.map((c, idx) => {
            const isConfirming = confirmDeleteId === c.id;
            return (
              <div
                key={`${c.ownerId}-${c.id}`}
                data-testid={`status-comment-card-${c.id}`}
                className={`rounded-[4px] border border-[#E2E2DC] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 space-y-1.5 ${
                  idx === 0 ? 'border-l-2 border-l-indigo-500' : ''
                }`}
              >
                {c.sourceCode && (
                  <div
                    data-testid={`status-comment-origin-${c.id}`}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 max-w-full"
                  >
                    <span className="truncate">
                      {`↳ ${c.sourceCode}${c.sourceName ? ` · ${c.sourceName}` : ''}`}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-[#6B6B66] dark:text-zinc-400">
                    {formatCommentDateTime(c.createdAt)}
                    {idx === 0 ? ' · Último' : ''}
                  </span>
                  {isConfirming ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        data-testid={`status-comment-confirm-delete-${c.id}`}
                        onClick={() => handleDelete(c)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                      >
                        Eliminar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-1.5 py-0.5 rounded text-[10px] text-[#6B6B66] hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-testid={`status-comment-delete-${c.id}`}
                      onClick={() => setConfirmDeleteId(c.id)}
                      className="p-0.5 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="Eliminar comentario"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-[#0C0C09] dark:text-zinc-100 whitespace-pre-wrap leading-relaxed">
                  {c.text}
                </p>

                {(c.alertLevelAfter !== undefined || c.progressAfter !== undefined) && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {c.alertLevelAfter !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-[3px] bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300 font-mono text-[10px] font-bold">
                        {`Alerta ${ALERT_SHORT_LABELS[(c.alertLevelBefore ?? 0) as ProjectAlertLevel]} → ${ALERT_SHORT_LABELS[c.alertLevelAfter]}`}
                      </span>
                    )}
                    {c.progressAfter !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-[3px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold">
                        {`Progreso ${c.progressBefore ?? 0}% → ${c.progressAfter}%`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export interface StatusCommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'project' | 'item';
  code?: string;
  project?: GanttProject;
  item?: ComputedGanttItem;
  projectItems?: ComputedGanttItem[];
  projectIndex?: number;
  projectProgress?: number;
  defaultScope?: 'all' | 'own';
  onUpdateProject?: (project: GanttProject) => void;
  onUpdateItem?: (item: GanttItem, cascade: boolean) => void;
}

export const StatusCommentsDrawer: React.FC<StatusCommentsDrawerProps> = ({
  isOpen,
  onClose,
  entityType,
  code,
  project,
  item,
  projectItems = [],
  projectIndex,
  projectProgress,
  defaultScope = 'own',
  onUpdateProject,
  onUpdateItem,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const isItem = entityType === 'item' && Boolean(item);
  const title = isItem ? item?.name || '' : project?.name || '';
  const levelLabel = isItem
    ? item?.type === 'milestone'
      ? 'HITO'
      : 'TAREA'
    : 'PROYECTO';
  const alertLevel = (isItem ? item?.alertLevel ?? 0 : project?.alertLevel ?? 0) as ProjectAlertLevel;
  const progress = isItem ? item?.progress ?? 0 : projectProgress ?? 0;

  return (
    <div
      data-testid="status-comments-drawer-overlay"
      className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[1px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        data-testid="status-comments-drawer"
        className="w-full max-w-md h-full bg-white dark:bg-zinc-950 border-l border-[#E2E2DC] dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="px-4 py-3 bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#E2E2DC] dark:border-zinc-800 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold">
                <MessageSquare className="w-3 h-3" />
                <span>Seguimiento</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-[3px] bg-[#E4E4DE] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 font-mono text-[10px] font-bold">
                {levelLabel}
              </span>
              {code && (
                <span className="font-mono text-[10px] font-bold text-[#6B6B66] dark:text-zinc-400">
                  {`#${code}`}
                </span>
              )}
              <span
                className={`px-1.5 py-0.5 rounded-[3px] border font-mono text-[10px] font-bold ${getAlertChipClasses(
                  alertLevel,
                  alertLevel > 0
                )}`}
              >
                {ALERT_FULL_LABELS[alertLevel]}
              </span>
              <span className="font-mono text-[10px] font-bold text-[#6B6B66] dark:text-zinc-400">
                {`${progress}%`}
              </span>
            </div>
            <h2 className="mt-1.5 text-sm font-bold text-[#0C0C09] dark:text-zinc-100 leading-snug break-words">
              {title}
            </h2>
          </div>
          <button
            type="button"
            data-testid="status-comments-drawer-close"
            onClick={onClose}
            className="p-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-zinc-100 cursor-pointer shrink-0"
            title="Cerrar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <StatusCommentsSection
            entityType={entityType}
            project={project}
            item={item}
            projectItems={projectItems}
            projectIndex={projectIndex}
            defaultScope={defaultScope}
            onUpdateProject={onUpdateProject}
            onUpdateItem={onUpdateItem}
            autoFocus
          />
        </div>
      </aside>
    </div>
  );
};
