import React, { useEffect } from 'react';
import { Lock, ShieldAlert, Unlock, X } from 'lucide-react';
import { GanttProject } from '../types/gantt';

export interface ProjectLockedAlertModalProps {
  project: GanttProject | null;
  attemptedAction?: string;
  onUnlock: (project: GanttProject) => void;
  onClose: () => void;
}

/**
 * Accessible alert modal shown when the user attempts to move or modify an element
 * inside a locked project on the Gantt schedule, offering an immediate unlock option.
 */
export const ProjectLockedAlertModal: React.FC<ProjectLockedAlertModalProps> = ({
  project,
  attemptedAction,
  onUnlock,
  onClose,
}) => {
  useEffect(() => {
    if (!project || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [project, onClose]);

  if (!project) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-locked-alert-title"
      data-testid="project-locked-alert-modal"
      data-locked-project-id={project.id}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[6px] shadow-2xl overflow-hidden text-[#0C0C09] dark:text-zinc-100"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800/70">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-[4px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
              <Lock className="w-4 h-4" />
            </span>
            <div>
              <h3
                id="project-locked-alert-title"
                className="font-display font-bold text-sm text-amber-950 dark:text-amber-100"
              >
                Proyecto bloqueado
              </h3>
              <p className="text-[11px] font-mono text-amber-800 dark:text-amber-300">
                Protección activa en el cronograma
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar aviso"
            className="p-1 rounded-[4px] text-amber-800 dark:text-amber-300 hover:bg-amber-500/15 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs leading-relaxed">
          <div className="flex items-start gap-2.5 p-2.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-800/70 border border-[#E2E2DC] dark:border-zinc-700">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[#0C0C09] dark:text-zinc-100">
                El proyecto <strong>«{project.name}»</strong> está bloqueado para evitar
                movimientos o modificaciones por error en el cronograma.
              </p>
              {attemptedAction && (
                <p className="text-[11px] font-mono text-[#6B6B66] dark:text-zinc-400">
                  Acción interceptada: {attemptedAction}
                </p>
              )}
            </div>
          </div>

          <p className="text-[11px] text-[#6B6B66] dark:text-zinc-400">
            ¿Quieres desbloquear este proyecto ahora para poder mover o editar sus elementos?
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-[#F4F4F1]/70 dark:bg-zinc-950/60 border-t border-[#E2E2DC] dark:border-zinc-800">
          <button
            type="button"
            data-testid="cancel-unlock-project-btn"
            onClick={onClose}
            className="px-3 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-[#F4F4F1] dark:hover:bg-zinc-700 text-xs font-medium text-[#0C0C09] dark:text-zinc-200 transition cursor-pointer"
          >
            Mantener bloqueado
          </button>
          <button
            type="button"
            data-testid="confirm-unlock-project-btn"
            onClick={() => onUnlock(project)}
            className="px-3.5 py-1.5 rounded-[4px] bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Desbloquear proyecto</span>
          </button>
        </div>
      </div>
    </div>
  );
};
