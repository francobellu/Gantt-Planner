import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Filter,
  Search,
  SlidersHorizontal,
  Smartphone,
  X,
} from 'lucide-react';
import { ProjectAlertLevel, ProjectPlatform, Release } from '../types/gantt';
import { AndroidIcon, AppleIosIcon } from './PlatformIcons';

export interface GanttSearchFieldsConfig {
  name: boolean;
  description: boolean;
  assignee: boolean;
  platform: boolean;
  predecessors: boolean;
  displayId: boolean;
}

export const DEFAULT_GANTT_SEARCH_FIELDS: GanttSearchFieldsConfig = {
  name: true,
  description: false,
  assignee: false,
  platform: false,
  predecessors: false,
  displayId: false,
};

export const SEARCH_FIELD_LABELS: Record<keyof GanttSearchFieldsConfig, string> = {
  name: 'Nombre',
  description: 'Descripción / Notas',
  assignee: 'Equipo / Responsable',
  platform: 'Plataforma',
  predecessors: 'Predecesoras',
  displayId: 'ID / Código',
};

export type UnifiedRowTypeFilter = 'all' | 'RELEASE' | 'PROYECTO' | 'TAREA' | 'HITO';

export function isDefaultSearchFields(fields: GanttSearchFieldsConfig): boolean {
  return (
    fields.name &&
    !fields.description &&
    !fields.assignee &&
    !fields.platform &&
    !fields.predecessors &&
    !fields.displayId
  );
}

export interface SearchFilterBarProps {
  testIdPrefix: 'table' | 'reports';
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  searchFields: GanttSearchFieldsConfig;
  onChangeSearchFields: (next: GanttSearchFieldsConfig) => void;
  selectedType: UnifiedRowTypeFilter;
  onChangeSelectedType: (next: UnifiedRowTypeFilter) => void;
  showTypeFilter?: boolean;
  selectedPlatform: 'all' | ProjectPlatform;
  onChangeSelectedPlatform: (next: 'all' | ProjectPlatform) => void;
  selectedAlert: 'all' | ProjectAlertLevel;
  onChangeSelectedAlert: (next: 'all' | ProjectAlertLevel) => void;
  releases: Release[];
  selectedRelease: string;
  onChangeSelectedRelease: (next: string) => void;
  showSubtasksOnFilter: boolean;
  onChangeShowSubtasksOnFilter: (next: boolean) => void;
  showSubtasksToggle?: boolean;
  onClearFilters: () => void;
  searchPlaceholder?: string;
  searchInputClassName?: string;
  initialShowSearchFieldsMenu?: boolean;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  testIdPrefix,
  searchQuery,
  onChangeSearchQuery,
  searchFields,
  onChangeSearchFields,
  selectedType,
  onChangeSelectedType,
  showTypeFilter = true,
  selectedPlatform,
  onChangeSelectedPlatform,
  selectedAlert,
  onChangeSelectedAlert,
  releases,
  selectedRelease,
  onChangeSelectedRelease,
  showSubtasksOnFilter,
  onChangeShowSubtasksOnFilter,
  showSubtasksToggle = true,
  onClearFilters,
  searchPlaceholder = 'Buscar proyecto o tarea...',
  searchInputClassName,
  initialShowSearchFieldsMenu = false,
}) => {
  const [showSearchFieldsMenu, setShowSearchFieldsMenu] = useState(initialShowSearchFieldsMenu);
  const [showTypeFilterMenu, setShowTypeFilterMenu] = useState(false);
  const [showPlatformFilterMenu, setShowPlatformFilterMenu] = useState(false);
  const [showAlertFilterMenu, setShowAlertFilterMenu] = useState(false);

  const searchFieldsMenuRef = useRef<HTMLDivElement>(null);
  const typeFilterMenuRef = useRef<HTMLDivElement>(null);
  const platformFilterMenuRef = useRef<HTMLDivElement>(null);
  const alertFilterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        showSearchFieldsMenu &&
        searchFieldsMenuRef.current &&
        !searchFieldsMenuRef.current.contains(target)
      ) {
        setShowSearchFieldsMenu(false);
      }
      if (
        showTypeFilterMenu &&
        typeFilterMenuRef.current &&
        !typeFilterMenuRef.current.contains(target)
      ) {
        setShowTypeFilterMenu(false);
      }
      if (
        showPlatformFilterMenu &&
        platformFilterMenuRef.current &&
        !platformFilterMenuRef.current.contains(target)
      ) {
        setShowPlatformFilterMenu(false);
      }
      if (
        showAlertFilterMenu &&
        alertFilterMenuRef.current &&
        !alertFilterMenuRef.current.contains(target)
      ) {
        setShowAlertFilterMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSearchFieldsMenu(false);
        setShowTypeFilterMenu(false);
        setShowPlatformFilterMenu(false);
        setShowAlertFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSearchFieldsMenu, showTypeFilterMenu, showPlatformFilterMenu, showAlertFilterMenu]);

  const optPrefix = testIdPrefix === 'reports' ? 'reports-' : '';

  const activeSearchFieldKeys = (
    Object.keys(searchFields) as (keyof GanttSearchFieldsConfig)[]
  ).filter((k) => searchFields[k]);

  const searchFieldsBtnLabel =
    activeSearchFieldKeys.length === 1
      ? activeSearchFieldKeys[0] === 'description'
        ? 'Desc.'
        : activeSearchFieldKeys[0] === 'assignee'
        ? 'Equipo'
        : activeSearchFieldKeys[0] === 'displayId'
        ? 'ID'
        : SEARCH_FIELD_LABELS[activeSearchFieldKeys[0]]
      : `${activeSearchFieldKeys.length} campos`;

  const toggleSearchField = (field: keyof GanttSearchFieldsConfig) => {
    const next = { ...searchFields, [field]: !searchFields[field] };
    const anyActive = (Object.values(next) as boolean[]).some(Boolean);
    if (!anyActive) return;
    onChangeSearchFields(next);
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    (showTypeFilter && selectedType !== 'all') ||
    selectedPlatform !== 'all' ||
    selectedAlert !== 'all' ||
    selectedRelease !== 'all' ||
    (showSubtasksToggle && showSubtasksOnFilter) ||
    !isDefaultSearchFields(searchFields);

  return (
    <div
      data-testid={`${testIdPrefix}-unified-filter-bar`}
      className="flex items-center gap-1.5 min-w-0 flex-wrap"
    >
      {/* 1. Search Input */}
      <div
        className={`relative flex items-center shrink-0 ${
          searchInputClassName || (testIdPrefix === 'reports' ? 'w-56 sm:w-64' : 'w-40 sm:w-52')
        }`}
      >
        <Search className="w-3 h-3 absolute left-1.5 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          data-testid={`${testIdPrefix}-search-input`}
          value={searchQuery}
          onChange={(e) => onChangeSearchQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-6 pr-5 py-0.5 text-[10px] font-sans font-normal normal-case rounded-[3px] border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-[#0C0C09] dark:focus:border-white h-6.5"
        />
        {searchQuery && (
          <button
            type="button"
            data-testid={`${testIdPrefix}-search-clear-btn`}
            onClick={() => onChangeSearchQuery('')}
            className="absolute right-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 cursor-pointer"
            title="Limpiar búsqueda"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* 2. Search Fields Selector ("En: ...") */}
      <div ref={searchFieldsMenuRef} className="relative flex items-center shrink-0">
        <button
          type="button"
          data-testid={`${testIdPrefix}-search-fields-btn`}
          onClick={() => setShowSearchFieldsMenu((prev) => !prev)}
          className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-sans font-medium normal-case rounded-[3px] border outline-none cursor-pointer h-6.5 transition ${
            isDefaultSearchFields(searchFields)
              ? 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/70'
              : 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
          }`}
          title="Seleccionar en qué campos del elemento buscar (por defecto solo Nombre)"
        >
          <SlidersHorizontal className="w-3 h-3 shrink-0" />
          <span>{`En: ${searchFieldsBtnLabel}`}</span>
          <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
        </button>

        <div
          data-testid={`${testIdPrefix}-search-fields-menu`}
          className={`absolute left-0 top-full mt-1 z-50 min-w-[200px] rounded-[4px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1.5 px-1.5 ${
            showSearchFieldsMenu ? 'flex flex-col gap-0.5' : 'hidden'
          }`}
        >
          <div className="flex items-center justify-between px-1.5 pb-1 mb-0.5 border-b border-zinc-200 dark:border-zinc-800">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Buscar en campos
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid={`${testIdPrefix}-search-fields-reset-btn`}
                onClick={() => onChangeSearchFields({ ...DEFAULT_GANTT_SEARCH_FIELDS })}
                className="text-[9px] font-sans font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Solo Nombre
              </button>
              <button
                type="button"
                data-testid={`${testIdPrefix}-search-fields-all-btn`}
                onClick={() =>
                  onChangeSearchFields({
                    name: true,
                    description: true,
                    assignee: true,
                    platform: true,
                    predecessors: true,
                    displayId: true,
                  })
                }
                className="text-[9px] font-sans font-semibold text-zinc-500 dark:text-zinc-400 hover:underline cursor-pointer"
              >
                Todos
              </button>
            </div>
          </div>

          {(Object.keys(SEARCH_FIELD_LABELS) as (keyof GanttSearchFieldsConfig)[]).map((fieldKey) => {
            const isChecked = searchFields[fieldKey];
            const isOnlyActive = isChecked && activeSearchFieldKeys.length <= 1;
            return (
              <label
                key={fieldKey}
                className={`flex items-center gap-2 px-1.5 py-1 rounded-[3px] text-[10px] font-sans font-medium transition ${
                  isOnlyActive
                    ? 'text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
                    : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  data-testid={`${testIdPrefix}-search-field-checkbox-${fieldKey}`}
                  checked={isChecked}
                  disabled={isOnlyActive}
                  onChange={() => toggleSearchField(fieldKey)}
                  className="w-3 h-3 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer disabled:cursor-not-allowed"
                />
                <span>{SEARCH_FIELD_LABELS[fieldKey]}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 3. Type Filter */}
      {showTypeFilter && (
        <div ref={typeFilterMenuRef} className="relative flex items-center shrink-0">
          <button
            type="button"
            data-testid={`${testIdPrefix}-type-filter`}
            data-selected-type={selectedType}
            onClick={() => setShowTypeFilterMenu((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-sans font-medium normal-case rounded-[3px] border outline-none cursor-pointer h-6.5 transition ${
              selectedType === 'all'
                ? 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/70'
                : 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
            }`}
            title="Filtrar por tipo de elemento"
          >
            <Filter
              className={`w-3 h-3 shrink-0 ${
                selectedType === 'all' ? 'text-zinc-500' : 'text-indigo-600 dark:text-indigo-400'
              }`}
            />
            <span>
              {selectedType === 'all'
                ? 'Tipo'
                : selectedType === 'RELEASE'
                ? 'Release'
                : selectedType === 'PROYECTO'
                ? 'Proyecto'
                : selectedType === 'TAREA'
                ? 'Tarea'
                : 'Hito'}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
          </button>

          <div
            data-testid={`${testIdPrefix}-type-filter-menu`}
            className={`absolute left-0 top-full mt-1 z-50 min-w-[130px] rounded-[4px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1 ${
              showTypeFilterMenu ? 'flex flex-col' : 'hidden'
            }`}
          >
            {(
              [
                { value: 'all', label: 'Todos los tipos' },
                { value: 'RELEASE', label: 'Release' },
                { value: 'PROYECTO', label: 'Proyecto' },
                { value: 'TAREA', label: 'Tarea' },
                { value: 'HITO', label: 'Hito' },
              ] as { value: UnifiedRowTypeFilter; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                data-testid={`${testIdPrefix}-type-filter-option-${opt.value}`}
                onClick={() => {
                  onChangeSelectedType(opt.value);
                  setShowTypeFilterMenu(false);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-sans font-medium cursor-pointer transition text-left ${
                  selectedType === opt.value
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Platform Filter */}
      <div ref={platformFilterMenuRef} className="relative flex items-center shrink-0">
        <button
          type="button"
          data-testid={`${testIdPrefix}-platform-filter`}
          data-selected-platform={selectedPlatform}
          onClick={() => setShowPlatformFilterMenu((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-sans font-medium normal-case rounded-[3px] border outline-none cursor-pointer h-6.5 transition ${
            selectedPlatform === 'all'
              ? 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/70'
              : 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
          }`}
          title="Filtrar por plataforma"
        >
          {selectedPlatform === 'all' ? (
            <>
              <Smartphone className="w-3 h-3 text-zinc-500 shrink-0" />
              <span>Plat.</span>
            </>
          ) : selectedPlatform === 'iOS' ? (
            <AppleIosIcon
              testId={`${optPrefix}active-filter-icon-ios`}
              className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
            />
          ) : selectedPlatform === 'Android' ? (
            <AndroidIcon
              testId={`${optPrefix}active-filter-icon-android`}
              className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
            />
          ) : (
            <span className="inline-flex items-center gap-1">
              <AppleIosIcon
                testId={`${optPrefix}active-filter-icon-both-ios`}
                className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
              />
              <AndroidIcon
                testId={`${optPrefix}active-filter-icon-both-android`}
                className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
              />
            </span>
          )}
          <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
        </button>

        <div
          data-testid={`${testIdPrefix}-platform-filter-menu`}
          className={`absolute left-0 top-full mt-1 z-50 min-w-[84px] rounded-[4px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1 ${
            showPlatformFilterMenu ? 'flex flex-col' : 'hidden'
          }`}
        >
          <button
            type="button"
            data-testid={`${optPrefix}platform-filter-option-iOS`}
            onClick={() => {
              onChangeSelectedPlatform(selectedPlatform === 'iOS' ? 'all' : 'iOS');
              setShowPlatformFilterMenu(false);
            }}
            className={`flex items-center justify-center px-2.5 py-1.5 cursor-pointer transition ${
              selectedPlatform === 'iOS'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="iOS"
          >
            <AppleIosIcon
              testId={`${optPrefix}filter-option-icon-ios`}
              className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
            />
          </button>
          <button
            type="button"
            data-testid={`${optPrefix}platform-filter-option-Android`}
            onClick={() => {
              onChangeSelectedPlatform(selectedPlatform === 'Android' ? 'all' : 'Android');
              setShowPlatformFilterMenu(false);
            }}
            className={`flex items-center justify-center px-2.5 py-1.5 cursor-pointer transition ${
              selectedPlatform === 'Android'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="Android"
          >
            <AndroidIcon
              testId={`${optPrefix}filter-option-icon-android`}
              className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
            />
          </button>
          <button
            type="button"
            data-testid={`${optPrefix}platform-filter-option-iOS/Android`}
            onClick={() => {
              onChangeSelectedPlatform(selectedPlatform === 'iOS/Android' ? 'all' : 'iOS/Android');
              setShowPlatformFilterMenu(false);
            }}
            className={`flex items-center justify-center gap-1 px-2.5 py-1.5 cursor-pointer transition ${
              selectedPlatform === 'iOS/Android'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="iOS/Android"
          >
            <AppleIosIcon
              testId={`${optPrefix}filter-option-icon-both-ios`}
              className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
            />
            <AndroidIcon
              testId={`${optPrefix}filter-option-icon-both-android`}
              className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
            />
          </button>
        </div>

        {testIdPrefix === 'reports' && (
          <select
            data-testid="reports-platform-select"
            value={selectedPlatform}
            onChange={(e) => onChangeSelectedPlatform(e.target.value as 'all' | ProjectPlatform)}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          >
            <option value="all">Plat.</option>
            <option value="iOS">iOS</option>
            <option value="Android">Android</option>
            <option value="iOS/Android">iOS/Android</option>
          </select>
        )}
      </div>

      {/* 5. Alert Level Filter */}
      <div ref={alertFilterMenuRef} className="relative flex items-center shrink-0">
        <button
          type="button"
          data-testid={`${testIdPrefix}-alert-filter`}
          data-selected-alert={selectedAlert}
          onClick={() => setShowAlertFilterMenu((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-sans font-medium normal-case rounded-[3px] border outline-none cursor-pointer h-6.5 transition ${
            selectedAlert === 'all'
              ? 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/70'
              : 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
          }`}
          title="Filtrar por nivel de alerta"
        >
          <AlertTriangle
            className={`w-3 h-3 shrink-0 ${
              selectedAlert === 'all'
                ? 'text-zinc-500'
                : selectedAlert === 0
                ? 'text-zinc-400'
                : selectedAlert === 1
                ? 'text-amber-500'
                : selectedAlert === 2
                ? 'text-orange-500'
                : 'text-rose-500'
            }`}
          />
          <span>{selectedAlert === 'all' ? 'Alerta' : `Nivel ${selectedAlert}`}</span>
          <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
        </button>

        <div
          data-testid={`${testIdPrefix}-alert-filter-menu`}
          className={`absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-[4px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1 ${
            showAlertFilterMenu ? 'flex flex-col' : 'hidden'
          }`}
        >
          <button
            type="button"
            data-testid={`${optPrefix}alert-filter-option-all`}
            onClick={() => {
              onChangeSelectedAlert('all');
              setShowAlertFilterMenu(false);
            }}
            className={`flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-sans font-medium cursor-pointer transition text-left ${
              selectedAlert === 'all'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <span>Todas las alertas</span>
          </button>
          {(
            [
              { value: 0 as ProjectAlertLevel, label: 'Nivel 0 (Normal)', dot: 'bg-zinc-400' },
              { value: 1 as ProjectAlertLevel, label: 'Nivel 1 (Baja)', dot: 'bg-amber-500' },
              { value: 2 as ProjectAlertLevel, label: 'Nivel 2 (Media)', dot: 'bg-orange-500' },
              { value: 3 as ProjectAlertLevel, label: 'Nivel 3 (Alta)', dot: 'bg-rose-500' },
            ]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-testid={`${optPrefix}alert-filter-option-${opt.value}`}
              onClick={() => {
                onChangeSelectedAlert(opt.value);
                setShowAlertFilterMenu(false);
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-sans font-medium cursor-pointer transition text-left ${
                selectedAlert === opt.value
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                  : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${opt.dot} shrink-0`} />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 6. Release Filter */}
      {releases.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <select
            data-testid={`${testIdPrefix}-release-select`}
            value={selectedRelease}
            onChange={(e) => onChangeSelectedRelease(e.target.value)}
            title="Filtrar por release"
            aria-label="Filtrar por release"
            className={`px-2 py-0.5 rounded-[3px] border text-[10px] font-sans font-medium outline-none cursor-pointer max-w-[140px] truncate h-6.5 transition ${
              selectedRelease === 'all'
                ? 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                : 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
            }`}
          >
            <option value="all">Todas las releases</option>
            {releases.map((r) => (
              <option key={r.id} value={r.code}>
                {r.code}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 7. Subtareas Toggle */}
      {showSubtasksToggle && (
        <label
          data-testid={`${testIdPrefix}-show-subtasks-label`}
          className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-sans font-medium normal-case rounded-[3px] border cursor-pointer h-6.5 transition shrink-0 select-none ${
            showSubtasksOnFilter
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
              : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/70'
          }`}
          title="Al filtrar, mostrar también todas las subtareas de proyectos coincidentes aunque la subtarea no coincida directamente"
        >
          <input
            type="checkbox"
            data-testid={`${testIdPrefix}-show-subtasks-checkbox`}
            checked={showSubtasksOnFilter}
            onChange={(e) => onChangeShowSubtasksOnFilter(e.target.checked)}
            className="w-3 h-3 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
          />
          <span>Subtareas</span>
        </label>
      )}

      {/* 8. Clear Filters Button */}
      {hasActiveFilters && (
        <button
          type="button"
          data-testid={`${testIdPrefix}-clear-filters-btn`}
          onClick={onClearFilters}
          className="text-[10px] font-sans font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer shrink-0 px-1"
        >
          Limpiar
        </button>
      )}
    </div>
  );
};
