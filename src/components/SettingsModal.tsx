import React, { useEffect } from 'react';
import {
  X,
  Settings,
  Sliders,
  Rows,
  Calendar,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import { DEFAULT_TRUNCATE_CHAR_LIMIT } from '../types/gantt';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  truncateCharLimit: number;
  onChangeTruncateCharLimit: (limit: number) => void;
  showRowSeparators?: boolean;
  onToggleRowSeparators?: () => void;
  showWeekendShading?: boolean;
  onToggleWeekendShading?: () => void;
  hiddenReleaseCount: number;
  onResetHiddenReleases?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  truncateCharLimit,
  onChangeTruncateCharLimit,
  showRowSeparators = false,
  onToggleRowSeparators,
  showWeekendShading = false,
  onToggleWeekendShading,
  hiddenReleaseCount,
  onResetHiddenReleases,
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

  const presets = [20, 28, 37, 50, 75, 100];
  const sampleName =
    'Proyecto de Integración y Despliegue Continuo Multiplataforma para Clientes Corporativos';

  return (
    <div
      data-testid="settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[6px] shadow-2xl p-6 text-xs flex flex-col gap-5 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E2DC] dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-[4px] bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0C0C09] dark:text-zinc-100 font-display">
                Configuración de Vista & Visualización
              </h2>
              <p className="text-[11px] text-[#6B6B66] dark:text-zinc-400">
                Personaliza el truncamiento de texto, cuadrícula y visibilidad general
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-settings-modal-btn"
            onClick={onClose}
            className="p-1 rounded-[4px] text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Text Truncation Limit */}
        <div className="flex flex-col gap-2.5 p-3.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-950/60 border border-[#E2E2DC] dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#0C0C09] dark:text-zinc-300" />
              <label
                htmlFor="settings-truncate-char-input"
                className="font-bold text-[#0C0C09] dark:text-zinc-200 text-xs"
              >
                Límite de caracteres para truncar nombres en tabla
              </label>
            </div>
            <button
              type="button"
              onClick={() => onChangeTruncateCharLimit(DEFAULT_TRUNCATE_CHAR_LIMIT)}
              className="text-[10px] text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
              title="Restablecer a 37 caracteres"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Por defecto (37)</span>
            </button>
          </div>

          <p className="text-[11px] text-[#6B6B66] dark:text-zinc-400 leading-relaxed">
            Número de caracteres a partir del cual los nombres de proyectos y tareas se
            truncan con puntos suspensivos (…) en la tabla WBS izquierda. Al hacer foco
            o editar, se muestra siempre el nombre completo.
          </p>

          <div className="flex items-center gap-3 mt-1">
            <input
              id="settings-truncate-char-input"
              type="number"
              min={10}
              max={150}
              data-testid="settings-truncate-char-input"
              value={truncateCharLimit}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (Number.isFinite(val)) {
                  onChangeTruncateCharLimit(Math.max(5, Math.min(200, val)));
                }
              }}
              className="w-24 px-2.5 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-center text-xs font-bold text-[#0C0C09] dark:text-zinc-100 shadow-inner"
            />
            <div className="flex items-center gap-1 flex-wrap">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  data-testid={`settings-preset-btn-${preset}`}
                  onClick={() => onChangeTruncateCharLimit(preset)}
                  className={`px-2 py-1 rounded-[3px] text-[10px] font-mono transition cursor-pointer ${
                    truncateCharLimit === preset
                      ? 'bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] font-bold shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-[#6B6B66] dark:text-zinc-400 border border-[#E2E2DC] dark:border-zinc-700 hover:text-[#0C0C09]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div className="mt-2 p-2 rounded-[3px] bg-white dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-800">
            <div className="text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400 uppercase font-bold mb-1">
              Vista previa en tabla ({truncateCharLimit} caracteres):
            </div>
            <div className="font-mono text-xs text-[#0C0C09] dark:text-zinc-200 truncate">
              {sampleName.length > truncateCharLimit
                ? sampleName.slice(0, truncateCharLimit) + '…'
                : sampleName}
            </div>
          </div>
        </div>

        {/* Section 2: Visual Grid & Lines */}
        <div className="flex flex-col gap-2 p-3.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-950/60 border border-[#E2E2DC] dark:border-zinc-800">
          <div className="font-bold text-[#0C0C09] dark:text-zinc-200 text-xs">
            Cuadrícula & Separadores
          </div>

          <label className="flex items-center justify-between p-2 rounded-[3px] bg-white dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50">
            <div className="flex items-center gap-2">
              <Rows className="w-3.5 h-3.5 text-[#6B6B66] dark:text-zinc-400" />
              <div>
                <div className="font-semibold text-[#0C0C09] dark:text-zinc-200">
                  Líneas horizontales separadoras de tareas
                </div>
                <div className="text-[10px] text-[#6B6B66] dark:text-zinc-400">
                  Dibuja líneas divisorias sutiles entre filas en la tabla y en el diagrama
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={showRowSeparators}
              onChange={onToggleRowSeparators}
              data-testid="settings-row-separators-checkbox"
              className="rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] focus:ring-0 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-[3px] bg-white dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#6B6B66] dark:text-zinc-400" />
              <div>
                <div className="font-semibold text-[#0C0C09] dark:text-zinc-200">
                  Sombreado de columnas de fines de semana
                </div>
                <div className="text-[10px] text-[#6B6B66] dark:text-zinc-400">
                  Resalta visualmente los sábados y domingos a lo largo de todo el calendario
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={showWeekendShading}
              onChange={onToggleWeekendShading}
              data-testid="settings-weekend-shading-checkbox"
              className="rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] focus:ring-0 cursor-pointer"
            />
          </label>
        </div>

        {/* Section 3: Reset Visibility / Hidden Releases */}
        <div className="flex flex-col gap-2 p-3.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-950/60 border border-[#E2E2DC] dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-[#0C0C09] dark:text-zinc-200 text-xs">
              <Eye className="w-3.5 h-3.5" />
              <span>Visibilidad de Releases & Proyectos</span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                hiddenReleaseCount > 0
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              {hiddenReleaseCount > 0
                ? `${hiddenReleaseCount} Oculta(s)`
                : 'Todas visibles'}
            </span>
          </div>

          <p className="text-[11px] text-[#6B6B66] dark:text-zinc-400 leading-relaxed">
            {hiddenReleaseCount > 0
              ? `Hay ${hiddenReleaseCount} release(s) oculta(s). Sus proyectos y tareas no se muestran en el Gantt. Puedes restablecer la visibilidad completa con un clic:`
              : 'Todas las releases y sus proyectos asociados están actualmente visibles en el diagrama.'}
          </p>

          {hiddenReleaseCount > 0 && onResetHiddenReleases && (
            <button
              type="button"
              data-testid="settings-reset-hidden-releases-btn"
              onClick={() => {
                onResetHiddenReleases();
                onClose();
              }}
              className="mt-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[4px] bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs shadow-xs transition cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Restablecer Visibilidad (Mostrar todas las releases)</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#E2E2DC] dark:border-zinc-800 pt-3">
          <button
            type="button"
            data-testid="settings-modal-done-btn"
            onClick={onClose}
            className="px-4 py-1.5 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
