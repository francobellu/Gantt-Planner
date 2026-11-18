import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  GitCommitHorizontal,
  ListChecks,
  RotateCcw,
  X,
} from 'lucide-react';
import { PlanCommit } from '../types/gantt';
import { HistoryEntityChange } from '../utils/ganttEngine';

interface CommitHistorySidebarProps {
  commits: PlanCommit[];
  pendingChanges: HistoryEntityChange[];
  onCreateCommit: (message: string) => void;
  onRestoreCommit?: (commit: PlanCommit) => void;
  onClose: () => void;
}

const CHANGE_BADGE_LABELS: Record<HistoryEntityChange['changeType'], string> = {
  created: 'Creada',
  deleted: 'Eliminada',
  updated: 'Modificada',
  reordered: 'Reordenada',
};

const CHANGE_BADGE_CLASSES: Record<HistoryEntityChange['changeType'], string> = {
  created:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  deleted:
    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
  updated:
    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  reordered:
    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
};

const EntityChangeList: React.FC<{ changes: HistoryEntityChange[] }> = ({ changes }) => {
  if (!changes || changes.length === 0) {
    return (
      <div className="text-[11px] text-[#6B6B66] dark:text-zinc-400 italic py-1">
        Sin diferencias registradas.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {changes.map((ec, i) => (
        <div
          key={`${ec.entityType}-${ec.id}-${i}`}
          className="rounded-[4px] border border-[#E2E2DC] dark:border-zinc-800 bg-[#FAFAF8] dark:bg-zinc-900/70 p-2 text-[11px]"
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="flex items-center gap-1.5 font-semibold text-[#0C0C09] dark:text-zinc-100 truncate">
              {ec.entityType === 'project' ? (
                <FolderKanban className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
              ) : (
                <ListChecks className="w-3 h-3 text-[#6B6B66] dark:text-zinc-400 shrink-0" />
              )}
              <span className="truncate">{ec.name}</span>
            </span>
            <span
              className={`px-1.5 py-0.2 rounded-[3px] border text-[9px] font-mono font-bold uppercase shrink-0 ${
                CHANGE_BADGE_CLASSES[ec.changeType]
              }`}
            >
              {CHANGE_BADGE_LABELS[ec.changeType]}
            </span>
          </div>

          {ec.changes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {ec.changes.map((chg, ci) => (
                <span
                  key={`${chg.field}-${ci}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] bg-white dark:bg-zinc-950 border border-[#E2E2DC] dark:border-zinc-800 text-[10px] font-mono text-[#0C0C09] dark:text-zinc-300"
                >
                  <span className="font-semibold text-[#6B6B66] dark:text-zinc-400">
                    {chg.field}:
                  </span>
                  <span className="line-through opacity-60 max-w-[90px] truncate" title={chg.before}>
                    {chg.before}
                  </span>
                  <span>→</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 max-w-[110px] truncate" title={chg.after}>
                    {chg.after}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const CommitHistorySidebar: React.FC<CommitHistorySidebarProps> = ({
  commits,
  pendingChanges,
  onCreateCommit,
  onRestoreCommit,
  onClose,
}) => {
  const [message, setMessage] = useState('');
  const [showPendingPreview, setShowPendingPreview] = useState(false);
  const [expandedCommitIds, setExpandedCommitIds] = useState<Set<string>>(
    () => new Set(commits[0] ? [commits[0].id] : [])
  );

  const toggleCommitExpanded = (id: string) => {
    setExpandedCommitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || pendingChanges.length === 0) return;
    onCreateCommit(trimmed);
    setMessage('');
    setShowPendingPreview(false);
  };

  return (
    <aside
      data-testid="commit-history-sidebar"
      aria-label="Historial de Commits"
      className="w-80 sm:w-96 shrink-0 border-l border-[#0C0C09] dark:border-zinc-800 bg-white dark:bg-[#0C0C09] flex flex-col min-h-0 h-full select-text z-30"
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-[#E2E2DC] dark:border-zinc-800 flex items-center justify-between bg-[#FAFAF8] dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <GitCommitHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0C0C09] dark:text-zinc-100">
            Commits del Plan
          </h2>
          <span className="px-1.5 py-0.2 rounded-[3px] bg-[#0C0C09] text-white dark:bg-zinc-800 dark:text-zinc-200 font-mono text-[10px] font-bold">
            {commits.length}
          </span>
        </div>
        <button
          type="button"
          data-testid="close-commits-sidebar-btn"
          onClick={onClose}
          className="p-1 rounded-[4px] text-[#6B6B66] hover:text-[#0C0C09] dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          title="Cerrar panel de commits"
          aria-label="Cerrar panel de commits"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Commit Composer + Pending Changes */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-b border-[#E2E2DC] dark:border-zinc-800 bg-white dark:bg-[#0C0C09] space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-[#0C0C09] dark:text-zinc-200">
            Cambios pendientes
          </span>
          {pendingChanges.length > 0 ? (
            <button
              type="button"
              data-testid="toggle-pending-preview-btn"
              onClick={() => setShowPendingPreview((prev) => !prev)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold hover:bg-amber-100 transition cursor-pointer"
            >
              <span>{`${pendingChanges.length} ${pendingChanges.length === 1 ? 'cambio' : 'cambios'}`}</span>
              {showPendingPreview ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          ) : (
            <span className="text-[10px] font-mono text-[#6B6B66] dark:text-zinc-500">
              Al día
            </span>
          )}
        </div>

        {showPendingPreview && pendingChanges.length > 0 && (
          <div
            data-testid="pending-changes-preview"
            className="max-h-44 overflow-y-auto pr-0.5"
          >
            <EntityChangeList changes={pendingChanges} />
          </div>
        )}

        <textarea
          data-testid="commit-message-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="Comentario del commit (ej. Ajuste de hitos QG4 y fechas UAT)..."
          className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-100 placeholder:text-[#6B6B66] dark:placeholder:text-zinc-500 outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
        />

        <button
          type="submit"
          data-testid="create-commit-btn"
          disabled={!message.trim() || pendingChanges.length === 0}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] font-semibold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Hacer Commit</span>
        </button>
      </form>

      {/* Commit History List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400">
          Historial de Commits
        </div>

        {commits.length === 0 ? (
          <div
            data-testid="commits-empty-state"
            className="rounded-[4px] border border-dashed border-[#E2E2DC] dark:border-zinc-800 p-4 text-center text-xs text-[#6B6B66] dark:text-zinc-400"
          >
            Aún no hay commits guardados. Modifica el cronograma y guarda tu primer commit con un comentario.
          </div>
        ) : (
          commits.map((commit) => {
            const isExpanded = expandedCommitIds.has(commit.id);
            return (
              <div
                key={commit.id}
                data-testid={`commit-entry-${commit.id}`}
                className="rounded-[4px] border border-[#E2E2DC] dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden"
              >
                <div className="p-2.5 flex items-start justify-between gap-2 hover:bg-[#FAFAF8] dark:hover:bg-zinc-900/60 transition">
                  <button
                    type="button"
                    data-testid={`commit-toggle-${commit.id}`}
                    onClick={() => toggleCommitExpanded(commit.id)}
                    className="flex-1 text-left flex items-start gap-2 min-w-0 cursor-pointer"
                  >
                    <span className="mt-0.5 text-[#6B6B66] dark:text-zinc-400 shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-[#0C0C09] dark:text-zinc-100 break-words">
                        {commit.message}
                      </div>
                      <div className="mt-1 flex items-center flex-wrap gap-1.5 text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400">
                        <span>{commit.formattedDate}</span>
                        <span>·</span>
                        <span className="px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold">
                          {commit.entityChanges.length}{' '}
                          {commit.entityChanges.length === 1 ? 'elemento' : 'elementos'}
                        </span>
                      </div>
                    </div>
                  </button>

                  {onRestoreCommit && (
                    <button
                      type="button"
                      data-testid={`commit-restore-${commit.id}`}
                      onClick={() => onRestoreCommit(commit)}
                      title="Restaurar el plan al estado de este commit"
                      className="p-1 rounded-[3px] text-[#6B6B66] hover:text-indigo-700 dark:text-zinc-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div
                    data-testid={`commit-details-${commit.id}`}
                    className="px-2.5 pb-2.5 pt-1 border-t border-[#E2E2DC] dark:border-zinc-800 bg-[#FAFAF8]/60 dark:bg-zinc-900/30"
                  >
                    <EntityChangeList changes={commit.entityChanges} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
