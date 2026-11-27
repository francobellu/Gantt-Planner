import React, { useEffect, useState } from 'react';
import {
  X,
  Settings,
  Sliders,
  Rows,
  Calendar,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  RotateCw,
  Rocket,
  History,
  HelpCircle,
  Sparkles,
  Search,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import {
  APP_VERSION,
  DEFAULT_TRUNCATE_CHAR_LIMIT,
  GanttItem,
  GanttProject,
  PlanHistoryEntry,
  Release,
  ReleaseGuideVisibility,
  WorkCalendarConfig,
} from '../types/gantt';
import { RELEASE_NOTES } from '../data/releaseNotes';
import { ReleasesModal } from './ReleasesModal';
import { PlanHistoryPage } from './PlanHistoryPage';
import { HelpPage } from './HelpPage';

export type SettingsCategory = 'general' | 'releases' | 'history' | 'help' | 'changelog';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: SettingsCategory;
  // General settings
  truncateCharLimit: number;
  onChangeTruncateCharLimit: (limit: number) => void;
  showRowSeparators?: boolean;
  onToggleRowSeparators?: () => void;
  showWeekendShading?: boolean;
  onToggleWeekendShading?: () => void;
  hiddenReleaseCount: number;
  onResetHiddenReleases?: () => void;
  onOpenReleaseNotes?: () => void;
  workCalendar?: WorkCalendarConfig;
  onChangeWorkCalendar?: (next: WorkCalendarConfig) => void;
  // Releases category (optional for backward compatibility)
  releases?: Release[];
  projects?: GanttProject[];
  items?: GanttItem[];
  guideVisibility?: ReleaseGuideVisibility;
  onChangeGuideVisibility?: (vis: ReleaseGuideVisibility) => void;
  onUpdateReleases?: (releases: Release[]) => void;
  onAssignProjectToRelease?: (projectId: string, releaseId?: string) => void;
  // History category (optional for backward compatibility)
  history?: PlanHistoryEntry[];
  historyIndex?: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onRestoreSnapshot?: (entry: PlanHistoryEntry, index: number) => void;
  onClearHistory?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'general',
  truncateCharLimit,
  onChangeTruncateCharLimit,
  showRowSeparators = false,
  onToggleRowSeparators,
  showWeekendShading = false,
  onToggleWeekendShading,
  hiddenReleaseCount,
  onResetHiddenReleases,
  onOpenReleaseNotes,
  workCalendar = { workdaysOnly: false, holidays: [] },
  onChangeWorkCalendar,
  releases = [],
  projects = [],
  items = [],
  guideVisibility = 'selected',
  onChangeGuideVisibility,
  onUpdateReleases,
  onAssignProjectToRelease,
  history = [],
  historyIndex = 0,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onRestoreSnapshot,
  onClearHistory,
}) => {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(initialCategory);
  const [categorySearch, setCategorySearch] = useState('');
  const [holidayInput, setHolidayInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveCategory(initialCategory);
    }
  }, [isOpen, initialCategory]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const presets = [20, 28, 37, 50, 75, 100];
  const sampleName =
    'Proyecto de Integración y Despliegue Continuo Multiplataforma para Clientes Corporativos';

  const categories: {
    id: SettingsCategory;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
    iconBg: string;
    badge?: string | number;
    keywords: string;
  }[] = [
    {
      id: 'general',
      label: 'General',
      subtitle: 'Vista, tabla, calendario y visibilidad',
      icon: <Settings className="w-3.5 h-3.5 text-white" />,
      iconBg: 'bg-zinc-600 dark:bg-zinc-500',
      keywords: 'general vista truncado separadores fin de semana festivos laborables visibilidad',
    },
    {
      id: 'releases',
      label: 'Releases',
      subtitle: 'Catálogo, hitos QG y líneas guía',
      icon: <Rocket className="w-3.5 h-3.5 text-white" />,
      iconBg: 'bg-indigo-600',
      badge: releases.length > 0 ? releases.length : undefined,
      keywords: 'releases hitos qg calendario excel importar exportar lineas guia proyectos',
    },
    {
      id: 'history',
      label: 'Historial',
      subtitle: 'Cambios paso a paso y agrupados',
      icon: <History className="w-3.5 h-3.5 text-white" />,
      iconBg: 'bg-emerald-600',
      badge: history.length > 0 ? history.length : undefined,
      keywords: 'historial cambios undo redo restaurar cronologico agrupado',
    },
    {
      id: 'help',
      label: 'Ayuda',
      subtitle: 'Guía rápida, atajos y documentación',
      icon: <HelpCircle className="w-3.5 h-3.5 text-white" />,
      iconBg: 'bg-amber-500',
      keywords: 'ayuda guia manual atajos teclado dependencias cpm holgura enfoque tutorial',
    },
    {
      id: 'changelog',
      label: 'Versiones',
      subtitle: `Changelog · v${APP_VERSION}`,
      icon: <Sparkles className="w-3.5 h-3.5 text-white" />,
      iconBg: 'bg-sky-600',
      badge: `v${APP_VERSION}`,
      keywords: 'versiones changelog novedades notas release notes actualizacion',
    },
  ];

  const filteredCategories = categories.filter((c) => {
    if (!categorySearch.trim()) return true;
    const q = categorySearch.toLowerCase();
    return (
      c.label.toLowerCase().includes(q) ||
      c.subtitle.toLowerCase().includes(q) ||
      c.keywords.includes(q)
    );
  });

  const activeCategoryMeta =
    categories.find((c) => c.id === activeCategory) || categories[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-6xl h-[88vh] bg-white dark:bg-[#141413] border border-[#0C0C09] dark:border-zinc-700 rounded-[12px] shadow-2xl overflow-hidden flex text-xs select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT SIDEBAR: macOS System Settings vertical category list */}
        <aside
          data-testid="settings-sidebar"
          className="w-56 sm:w-64 shrink-0 border-r border-[#E2E2DC] dark:border-zinc-800 bg-[#F4F4F1] dark:bg-zinc-950/90 flex flex-col p-3 gap-3"
        >
          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#6B6B66] dark:text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              data-testid="settings-category-search"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Buscar ajustes..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-[7px] bg-white dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-800 text-xs text-[#0C0C09] dark:text-zinc-100 placeholder-[#6B6B66] dark:placeholder-zinc-500 outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* App Identity Header */}
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-[8px] bg-white/70 dark:bg-zinc-900/60 border border-[#E2E2DC]/80 dark:border-zinc-800/80">
            <div className="w-8 h-8 rounded-full bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-[#0C0C09] dark:text-white truncate">
                GanttFlow
              </div>
              <div className="text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400 truncate">
                Configuración · v{APP_VERSION}
              </div>
            </div>
          </div>

          {/* Vertical Category List */}
          <nav className="flex-1 overflow-y-auto space-y-1" aria-label="Categorías de configuración">
            {filteredCategories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  data-testid={`settings-category-${cat.id}`}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-[8px] text-left transition cursor-pointer ${
                    isActive
                      ? 'bg-[#007AFF] text-white shadow-xs'
                      : 'text-[#0C0C09] dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0 shadow-xs ${
                        isActive ? 'bg-white/20' : cat.iconBg
                      }`}
                    >
                      {cat.icon}
                    </span>
                    <span className="font-semibold text-xs truncate">{cat.label}</span>
                  </div>
                  {cat.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-black/8 dark:bg-zinc-800 text-[#6B6B66] dark:text-zinc-400'
                      }`}
                    >
                      {cat.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom Version Shortcut & Reload */}
          <div className="pt-2 border-t border-[#E2E2DC] dark:border-zinc-800 flex flex-col gap-1">
            <button
              type="button"
              data-testid="settings-version-badge"
              onClick={() => {
                setActiveCategory('changelog');
                if (onOpenReleaseNotes) {
                  // Also allow legacy callback if explicitly inspected
                }
              }}
              className="w-full text-center text-[10px] font-mono font-semibold text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white py-1 rounded transition cursor-pointer"
              title="Ver historial de versiones (Changelog)"
            >
              GanttFlow v{APP_VERSION} · Ver novedades
            </button>
            <button
              type="button"
              data-testid="force-reload-btn"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
              className="w-full flex items-center justify-center gap-1 text-[10px] font-mono text-indigo-600 dark:text-indigo-400 hover:underline py-0.5 cursor-pointer"
              title="Forzar recarga sin caché para garantizar la última versión"
            >
              <RotateCw className="w-3 h-3" />
              <span>Recargar app</span>
            </button>
          </div>
        </aside>

        {/* RIGHT DETAIL PANE */}
        <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-[#141413]">
          {/* Detail Top Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E2DC] dark:border-zinc-800 bg-white/95 dark:bg-[#141413] shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0 ${activeCategoryMeta.iconBg}`}
              >
                {activeCategoryMeta.icon}
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[#0C0C09] dark:text-white font-display truncate">
                  {activeCategoryMeta.label}
                </h2>
                <p className="text-[11px] text-[#6B6B66] dark:text-zinc-400 truncate">
                  {activeCategoryMeta.subtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                data-testid="settings-modal-done-btn"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-[6px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] text-xs font-semibold transition cursor-pointer"
              >
                Listo
              </button>
              <button
                type="button"
                data-testid="close-settings-modal-btn"
                onClick={onClose}
                className="p-1.5 rounded-[6px] text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                title="Cerrar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Detail Body by Active Category */}
          {activeCategory === 'general' && (
            <div
              data-testid="settings-panel-general"
              className="flex-1 overflow-y-auto p-5 space-y-4 select-text"
            >
              {/* Card 1: Text Truncation Limit */}
              <div className="flex flex-col gap-2.5 p-4 rounded-[8px] bg-[#F4F4F1]/80 dark:bg-zinc-900/70 border border-[#E2E2DC] dark:border-zinc-800">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#0C0C09] dark:text-zinc-300" />
                    <label
                      htmlFor="settings-truncate-char-input"
                      className="font-bold text-[#0C0C09] dark:text-zinc-100 text-xs"
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
                    className="w-24 px-2.5 py-1.5 rounded-[6px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-950 font-mono text-center text-xs font-bold text-[#0C0C09] dark:text-zinc-100"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    {presets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        data-testid={`settings-preset-btn-${preset}`}
                        onClick={() => onChangeTruncateCharLimit(preset)}
                        className={`px-2 py-1 rounded-[4px] text-[10px] font-mono transition cursor-pointer ${
                          truncateCharLimit === preset
                            ? 'bg-[#007AFF] text-white font-bold shadow-xs'
                            : 'bg-white dark:bg-zinc-800 text-[#6B6B66] dark:text-zinc-400 border border-[#E2E2DC] dark:border-zinc-700 hover:text-[#0C0C09]'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-1 p-2.5 rounded-[6px] bg-white dark:bg-zinc-950 border border-[#E2E2DC] dark:border-zinc-800">
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

              {/* Card 2: Grid & Work Calendar */}
              <div className="flex flex-col gap-2 p-4 rounded-[8px] bg-[#F4F4F1]/80 dark:bg-zinc-900/70 border border-[#E2E2DC] dark:border-zinc-800">
                <div className="font-bold text-[#0C0C09] dark:text-zinc-100 text-xs mb-1">
                  Cuadrícula, Separadores y Calendario Laboral
                </div>

                <label className="flex items-center justify-between p-2.5 rounded-[6px] bg-white dark:bg-zinc-950 border border-[#E2E2DC] dark:border-zinc-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900">
                  <div className="flex items-center gap-2.5">
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
                    className="rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#007AFF] focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-[6px] bg-white dark:bg-zinc-950 border border-[#E2E2DC] dark:border-zinc-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900">
                  <div className="flex items-center gap-2.5">
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
                    className="rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#007AFF] focus:ring-0 cursor-pointer"
                  />
                </label>

                {onChangeWorkCalendar && (
                  <div className="p-2.5 rounded-[6px] bg-white dark:bg-zinc-950 border border-[#E2E2DC] dark:border-zinc-800 space-y-2.5">
                    <label className="flex items-center justify-between gap-2 text-xs cursor-pointer select-none">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <div>
                          <div className="font-semibold text-[#0C0C09] dark:text-zinc-200">
                            Solo días laborables (Lun–Vie y Festivos)
                          </div>
                          <div className="text-[10px] text-[#6B6B66] dark:text-zinc-400">
                            La duración de las tareas omite sábados, domingos y festivos configurados
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={workCalendar.workdaysOnly}
                        onChange={(e) =>
                          onChangeWorkCalendar({
                            ...workCalendar,
                            workdaysOnly: e.target.checked,
                          })
                        }
                        data-testid="settings-workdays-only-checkbox"
                        className="rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#007AFF] focus:ring-0 cursor-pointer"
                      />
                    </label>

                    {workCalendar.workdaysOnly && (
                      <div
                        data-testid="settings-holidays-section"
                        className="pl-6 space-y-1.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <input
                            type="date"
                            data-testid="settings-holiday-date-input"
                            value={holidayInput}
                            onChange={(e) => setHolidayInput(e.target.value)}
                            className="px-2 py-1 text-[11px] rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-100 font-mono"
                          />
                          <button
                            type="button"
                            data-testid="settings-add-holiday-btn"
                            onClick={() => {
                              if (!holidayInput) return;
                              if (workCalendar.holidays.includes(holidayInput)) return;
                              onChangeWorkCalendar({
                                ...workCalendar,
                                holidays: [...workCalendar.holidays, holidayInput].sort(),
                              });
                              setHolidayInput('');
                            }}
                            disabled={!holidayInput}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] text-[10px] font-semibold disabled:opacity-40 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Añadir festivo</span>
                          </button>
                        </div>

                        {workCalendar.holidays.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {workCalendar.holidays.map((h) => (
                              <span
                                key={h}
                                data-testid={`settings-holiday-chip-${h}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-700 text-[10px] font-mono text-[#0C0C09] dark:text-zinc-200"
                              >
                                <span>{h}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onChangeWorkCalendar({
                                      ...workCalendar,
                                      holidays: workCalendar.holidays.filter((d) => d !== h),
                                    })
                                  }
                                  className="text-rose-600 hover:text-rose-800 cursor-pointer"
                                  title="Quitar festivo"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card 3: Visibility / Hidden Releases */}
              <div className="flex flex-col gap-2 p-4 rounded-[8px] bg-[#F4F4F1]/80 dark:bg-zinc-900/70 border border-[#E2E2DC] dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[#0C0C09] dark:text-zinc-100 text-xs">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visibilidad de Releases & Proyectos</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
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
                    className="mt-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[6px] bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs shadow-xs transition cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Restablecer Visibilidad (Mostrar todas las releases)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {activeCategory === 'releases' && (
            <div
              data-testid="settings-panel-releases"
              className="flex-1 min-h-0 flex flex-col overflow-hidden"
            >
              <ReleasesModal
                isOpen={true}
                embedded={true}
                onClose={onClose}
                releases={releases}
                projects={projects}
                items={items}
                guideVisibility={guideVisibility}
                onChangeGuideVisibility={onChangeGuideVisibility || (() => {})}
                onUpdateReleases={onUpdateReleases || (() => {})}
                onAssignProjectToRelease={onAssignProjectToRelease || (() => {})}
              />
            </div>
          )}

          {activeCategory === 'history' && (
            <div
              data-testid="settings-panel-history"
              className="flex-1 min-h-0 flex flex-col overflow-hidden"
            >
              <PlanHistoryPage
                embedded={true}
                history={history}
                currentIndex={historyIndex}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={onUndo || (() => {})}
                onRedo={onRedo || (() => {})}
                onRestoreSnapshot={onRestoreSnapshot || (() => {})}
                onBackToGantt={onClose}
                onClearHistory={onClearHistory}
                releases={releases}
              />
            </div>
          )}

          {activeCategory === 'help' && (
            <div
              data-testid="settings-panel-help"
              className="flex-1 min-h-0 flex flex-col overflow-hidden"
            >
              <HelpPage onBackToGantt={onClose} />
            </div>
          )}

          {activeCategory === 'changelog' && (
            <div
              data-testid="settings-panel-changelog"
              className="flex-1 overflow-y-auto p-5 space-y-4 select-text"
            >
              {/* macOS Software Update style top card */}
              <div className="p-4 rounded-[10px] bg-[#F4F4F1] dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-[10px] bg-gradient-to-br from-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-sm font-mono font-bold text-sm">
                    v{APP_VERSION.split('.').slice(0, 2).join('.')}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#0C0C09] dark:text-white flex items-center gap-2">
                      <span>GanttFlow v{APP_VERSION}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Actualizada
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B6B66] dark:text-zinc-400 mt-0.5">
                      Historial completo de versiones, mejoras y correcciones ({RELEASE_NOTES.length}{' '}
                      versiones registradas)
                    </p>
                  </div>
                </div>
              </div>

              {/* Release Notes Timeline */}
              <div className="space-y-3">
                {RELEASE_NOTES.map((note, idx) => (
                  <div
                    key={note.version}
                    data-testid={`settings-changelog-entry-${note.version}`}
                    className={`p-4 rounded-[8px] border ${
                      idx === 0
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900'
                        : 'bg-[#FAFAF8] dark:bg-zinc-900/60 border-[#E2E2DC] dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] font-mono text-[10.5px] font-bold">
                          <Tag className="w-3 h-3" />
                          v{note.version}
                        </span>
                        <span className="font-bold text-xs text-[#0C0C09] dark:text-white">
                          {note.title}
                        </span>
                      </div>
                      <span className="text-[10.5px] font-mono text-[#6B6B66] dark:text-zinc-400">
                        {note.date}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {note.features && note.features.length > 0 && (
                        <ul className="space-y-1 pl-1">
                          {note.features.map((chg, ci) => (
                            <li
                              key={`feat-${ci}`}
                              className="flex items-start gap-2 text-[11.5px] text-[#0C0C09] dark:text-zinc-300 leading-relaxed"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              <span>{chg}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {note.improvements && note.improvements.length > 0 && (
                        <ul className="space-y-1 pl-1">
                          {note.improvements.map((chg, ci) => (
                            <li
                              key={`imp-${ci}`}
                              className="flex items-start gap-2 text-[11.5px] text-[#0C0C09] dark:text-zinc-300 leading-relaxed"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                              <span>{chg}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {note.fixes && note.fixes.length > 0 && (
                        <ul className="space-y-1 pl-1">
                          {note.fixes.map((chg, ci) => (
                            <li
                              key={`fix-${ci}`}
                              className="flex items-start gap-2 text-[11.5px] text-[#0C0C09] dark:text-zinc-300 leading-relaxed"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <span>{chg}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
