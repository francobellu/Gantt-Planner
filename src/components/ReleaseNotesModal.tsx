import React, { useEffect } from 'react';
import {
  X,
  Sparkles,
  Tag,
  Calendar,
  CheckCircle2,
  Wrench,
  Bug,
} from 'lucide-react';
import { APP_VERSION } from '../types/gantt';
import { RELEASE_NOTES, ReleaseNoteEntry } from '../data/releaseNotes';

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="release-notes-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        data-testid="release-notes-modal"
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[6px] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden text-xs text-[#0C0C09] dark:text-zinc-100 animate-scale-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E2DC] dark:border-zinc-800 bg-[#F4F4F1] dark:bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-[4px] bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="release-notes-modal-title"
                  className="font-display font-bold text-sm tracking-tight text-[#0C0C09] dark:text-zinc-100"
                >
                  Notas de Versión y Novedades
                </h2>
                <span
                  data-testid="release-notes-current-badge"
                  className="px-2 py-0.5 rounded-[3px] bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] text-[10px] font-mono font-bold"
                >
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-[11px] text-[#6B6B66] dark:text-zinc-400 mt-0.5">
                Historial completo de cambios, mejoras y correcciones compiladas
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-release-notes-btn"
            onClick={onClose}
            className="p-1.5 rounded-[4px] hover:bg-[#E2E2DC] dark:hover:bg-zinc-800 text-[#6B6B66] dark:text-zinc-400 transition cursor-pointer"
            aria-label="Cerrar notas de versión"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          data-testid="release-notes-content"
          className="flex-1 overflow-y-auto p-5 space-y-6"
        >
          {RELEASE_NOTES.map((entry: ReleaseNoteEntry, idx: number) => {
            const isCurrent = entry.version === APP_VERSION || entry.isLatest;

            return (
              <article
                key={entry.version}
                data-testid={`release-note-item-${entry.version}`}
                className={`p-4 rounded-[6px] border transition ${
                  isCurrent
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60 shadow-xs'
                    : 'bg-[#FAFAF9] dark:bg-zinc-900/60 border-[#E2E2DC] dark:border-zinc-800'
                }`}
              >
                {/* Entry Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E2E2DC] dark:border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-[3px] bg-[#0C0C09] text-white dark:bg-zinc-200 dark:text-[#0C0C09]">
                      <Tag className="w-3 h-3" />
                      v{entry.version}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-[3px] bg-emerald-600 text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                        Versión Actual
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#6B6B66] dark:text-zinc-400">
                    <Calendar className="w-3 h-3" />
                    <span>{entry.date}</span>
                  </div>
                </div>

                {/* Entry Title */}
                <h3 className="font-display font-semibold text-xs text-[#0C0C09] dark:text-zinc-100 mt-2.5 mb-3 leading-snug">
                  {entry.title}
                </h3>

                {/* Categorized Lists */}
                <div className="space-y-3">
                  {/* Features */}
                  {entry.features && entry.features.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>Novedades y Funcionalidades</span>
                      </div>
                      <ul className="space-y-1 pl-4 list-disc marker:text-emerald-500 text-[11px] text-[#42423E] dark:text-zinc-300">
                        {entry.features.map((feat, i) => (
                          <li key={i} className="leading-relaxed">
                            {feat}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvements */}
                  {entry.improvements && entry.improvements.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 mb-1.5">
                        <Wrench className="w-3 h-3 shrink-0" />
                        <span>Mejoras y Optimización</span>
                      </div>
                      <ul className="space-y-1 pl-4 list-disc marker:text-indigo-500 text-[11px] text-[#42423E] dark:text-zinc-300">
                        {entry.improvements.map((imp, i) => (
                          <li key={i} className="leading-relaxed">
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Fixes */}
                  {entry.fixes && entry.fixes.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
                        <Bug className="w-3 h-3 shrink-0" />
                        <span>Correcciones</span>
                      </div>
                      <ul className="space-y-1 pl-4 list-disc marker:text-amber-500 text-[11px] text-[#42423E] dark:text-zinc-300">
                        {entry.fixes.map((fix, i) => (
                          <li key={i} className="leading-relaxed">
                            {fix}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#E2E2DC] dark:border-zinc-800 bg-[#F4F4F1] dark:bg-zinc-950/80 shrink-0">
          <span className="text-[11px] font-mono text-[#6B6B66] dark:text-zinc-400">
            {RELEASE_NOTES.length} versiones registradas
          </span>
          <button
            type="button"
            data-testid="accept-release-notes-btn"
            onClick={onClose}
            className="px-4 py-1.5 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
