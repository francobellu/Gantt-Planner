import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Filter,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Smartphone,
  Tag,
  Trash2,
  Users,
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

export interface SearchFilterColumnOption {
  key: string;
  label: string;
  visible: boolean;
}

export interface StoredSavedFilter {
  id: string;
  name: string;
  searchQuery: string;
  excludeQuery?: string;
  searchFields?: GanttSearchFieldsConfig;
  selectedType: UnifiedRowTypeFilter;
  selectedPlatform: 'all' | ProjectPlatform;
  selectedAlert: 'all' | ProjectAlertLevel;
  selectedRelease: string;
  selectedTeam?: string;
  selectedTag?: string;
  showSubtasksOnFilter?: boolean;
  visibleColKeys?: string[];
  colOrder?: string[];
  formatPresetId?: string;
  formatLabel?: string;
}

export const SHARED_SAVED_FILTERS_KEY = 'gantt_report_saved_filters_v1';

export interface SearchFilterBarProps {
  testIdPrefix: 'table' | 'reports';
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  excludeQuery?: string;
  onChangeExcludeQuery?: (value: string) => void;
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
  teams?: string[];
  selectedTeam?: string;
  onChangeSelectedTeam?: (next: string) => void;
  tags?: string[];
  selectedTag?: string;
  onChangeSelectedTag?: (next: string) => void;
  showSubtasksOnFilter: boolean;
  onChangeShowSubtasksOnFilter: (next: boolean) => void;
  showSubtasksToggle?: boolean;
  onClearFilters: () => void;
  searchPlaceholder?: string;
  searchInputClassName?: string;
  initialShowSearchFieldsMenu?: boolean;
  initialShowAdvancedPanel?: boolean;
  /** Optional column picker inside the Gmail-style advanced panel (Planificación) */
  columns?: SearchFilterColumnOption[];
  onToggleColumn?: (key: string) => void;
  onResetColumns?: () => void;
  /** Optional external saved filters slot (kept for backwards compatibility) */
  savedFiltersSlot?: React.ReactNode;
  /** Enables built-in Gmail-style saved filter pills + full create/edit inside panel */
  enableBuiltInSavedFilters?: boolean;
  /** Optional callback when a saved filter with visibleColKeys is applied */
  onApplySavedColumns?: (visibleColKeys: string[], colOrder?: string[]) => void;
  /** Optional external saved filters list (syncs with ReportsView) */
  externalSavedFilters?: StoredSavedFilter[];
  externalActiveSavedFilterId?: string | null;
  onSelectExternalSavedFilter?: (filter: StoredSavedFilter) => void;
  onSaveExternalSavedFilter?: (name: string, existingId?: string) => void;
  onDeleteExternalSavedFilter?: (id: string) => void;
  /** Hide inline active filter chips when rendered elsewhere (e.g., sticky status bar) */
  hideActiveChips?: boolean;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  testIdPrefix,
  searchQuery,
  onChangeSearchQuery,
  excludeQuery = '',
  onChangeExcludeQuery,
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
  teams = [],
  selectedTeam = 'all',
  onChangeSelectedTeam,
  tags = [],
  selectedTag = 'all',
  onChangeSelectedTag,
  showSubtasksOnFilter,
  onChangeShowSubtasksOnFilter,
  showSubtasksToggle = true,
  onClearFilters,
  searchPlaceholder = 'Buscar proyecto o tarea...',
  searchInputClassName,
  initialShowSearchFieldsMenu = false,
  initialShowAdvancedPanel = false,
  columns,
  onToggleColumn,
  onResetColumns,
  savedFiltersSlot,
  enableBuiltInSavedFilters = false,
  onApplySavedColumns,
  externalSavedFilters,
  externalActiveSavedFilterId,
  onSelectExternalSavedFilter,
  onSaveExternalSavedFilter,
  onDeleteExternalSavedFilter,
  hideActiveChips = false,
}) => {
  const [panelOpen, setPanelOpen] = useState<boolean>(
    initialShowAdvancedPanel || initialShowSearchFieldsMenu
  );
  const [columnsExpanded, setColumnsExpanded] = useState<boolean>(false);
  const [showSaveRow, setShowSaveRow] = useState<boolean>(false);
  const [newFilterName, setNewFilterName] = useState<string>('');
  const [builtInActiveId, setBuiltInActiveId] = useState<string | null>(null);
  const [builtInFilters, setBuiltInFilters] = useState<StoredSavedFilter[]>(() => {
    if (!enableBuiltInSavedFilters || externalSavedFilters) return [];
    try {
      const raw =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem(SHARED_SAVED_FILTERS_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const panelContainerRef = useRef<HTMLDivElement>(null);
  const [panelMaxHeight, setPanelMaxHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!panelOpen) return;
    const updatePanelMaxHeight = () => {
      if (!panelContainerRef.current || typeof window === 'undefined') return;
      const rect = panelContainerRef.current.getBoundingClientRect();
      const available = Math.floor(window.innerHeight - rect.bottom - 16);
      setPanelMaxHeight(Math.max(240, available));
    };
    updatePanelMaxHeight();
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        panelContainerRef.current &&
        !panelContainerRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
        setShowSaveRow(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPanelOpen(false);
        setShowSaveRow(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePanelMaxHeight);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePanelMaxHeight);
    };
  }, [panelOpen]);

  const optPrefix = testIdPrefix === 'reports' ? 'reports-' : '';

  const effectiveSavedFilters = externalSavedFilters ?? builtInFilters;
  const effectiveActiveFilterId =
    externalActiveSavedFilterId !== undefined ? externalActiveSavedFilterId : builtInActiveId;
  const activeSavedFilterObj = effectiveSavedFilters.find(
    (f) => f.id === effectiveActiveFilterId
  );

  const activeSearchFieldKeys = (
    Object.keys(searchFields) as (keyof GanttSearchFieldsConfig)[]
  ).filter((k) => searchFields[k]);

  const searchFieldsSummaryLabel =
    activeSearchFieldKeys.length === 1
      ? SEARCH_FIELD_LABELS[activeSearchFieldKeys[0]].split(' / ')[0]
      : activeSearchFieldKeys.length === Object.keys(SEARCH_FIELD_LABELS).length
      ? 'Todos'
      : `${activeSearchFieldKeys.length} campos`;

  const toggleSearchField = (field: keyof GanttSearchFieldsConfig) => {
    const next = { ...searchFields, [field]: !searchFields[field] };
    const anyActive = (Object.values(next) as boolean[]).some(Boolean);
    if (!anyActive) return;
    onChangeSearchFields(next);
  };

  const visibleColsCount = columns ? columns.filter((c) => c.visible).length : 0;
  const hasHiddenCols = Boolean(columns && visibleColsCount < columns.length);

  // Count non-query active criteria for the Gmail sliders badge
  let activeCriteriaCount = 0;
  if (!isDefaultSearchFields(searchFields)) activeCriteriaCount += 1;
  if (showTypeFilter && selectedType !== 'all') activeCriteriaCount += 1;
  if (selectedPlatform !== 'all') activeCriteriaCount += 1;
  if (selectedAlert !== 'all') activeCriteriaCount += 1;
  if (selectedRelease !== 'all') activeCriteriaCount += 1;
  if (selectedTeam && selectedTeam !== 'all') activeCriteriaCount += 1;
  if (selectedTag && selectedTag !== 'all') activeCriteriaCount += 1;
  if (showSubtasksToggle && showSubtasksOnFilter) activeCriteriaCount += 1;
  if (hasHiddenCols) activeCriteriaCount += 1;

  const hasActiveFilters = Boolean(searchQuery.trim()) || activeCriteriaCount > 0;

  const refreshBuiltInFilters = () => {
    if (externalSavedFilters) return;
    try {
      const raw =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem(SHARED_SAVED_FILTERS_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setBuiltInFilters(parsed);
      }
    } catch {}
  };

  const applyFilter = (f: StoredSavedFilter) => {
    if (onSelectExternalSavedFilter) {
      onSelectExternalSavedFilter(f);
      return;
    }
    onChangeSearchQuery(f.searchQuery || '');
    onChangeExcludeQuery?.(f.excludeQuery || '');
    onChangeSearchFields(
      f.searchFields
        ? { ...DEFAULT_GANTT_SEARCH_FIELDS, ...f.searchFields }
        : { ...DEFAULT_GANTT_SEARCH_FIELDS }
    );
    onChangeSelectedType(f.selectedType || 'all');
    onChangeSelectedPlatform(f.selectedPlatform || 'all');
    onChangeSelectedAlert(f.selectedAlert ?? 'all');
    onChangeSelectedRelease(f.selectedRelease || 'all');
    onChangeSelectedTeam?.(f.selectedTeam || 'all');
    onChangeSelectedTag?.(f.selectedTag || 'all');
    onChangeShowSubtasksOnFilter(Boolean(f.showSubtasksOnFilter));
    if (f.visibleColKeys && f.visibleColKeys.length > 0 && onApplySavedColumns) {
      onApplySavedColumns(f.visibleColKeys, f.colOrder);
    }
    setBuiltInActiveId(f.id);
  };

  const saveCurrentAsFilter = (name: string, existingId?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (onSaveExternalSavedFilter) {
      onSaveExternalSavedFilter(trimmed, existingId);
      setShowSaveRow(false);
      setNewFilterName('');
      setPanelOpen(false);
      return;
    }
    const visibleColKeys = columns ? columns.filter((c) => c.visible).map((c) => c.key) : undefined;
    let next: StoredSavedFilter[];
    let savedId: string;
    if (existingId) {
      savedId = existingId;
      next = builtInFilters.map((f) =>
        f.id === existingId
          ? {
              ...f,
              name: trimmed,
              searchQuery,
              excludeQuery: excludeQuery || undefined,
              searchFields: { ...searchFields },
              selectedType,
              selectedPlatform,
              selectedAlert,
              selectedRelease,
              selectedTeam,
              selectedTag,
              showSubtasksOnFilter,
              ...(visibleColKeys ? { visibleColKeys } : {}),
            }
          : f
      );
    } else {
      const created: StoredSavedFilter = {
        id: `filter-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: trimmed,
        searchQuery,
        excludeQuery: excludeQuery || undefined,
        searchFields: { ...searchFields },
        selectedType,
        selectedPlatform,
        selectedAlert,
        selectedRelease,
        showSubtasksOnFilter,
        ...(visibleColKeys ? { visibleColKeys } : {}),
      };
      savedId = created.id;
      next = [...builtInFilters, created];
    }
    setBuiltInFilters(next);
    setBuiltInActiveId(savedId);
    setShowSaveRow(false);
    setNewFilterName('');
    setPanelOpen(false);
    try {
      localStorage.setItem(SHARED_SAVED_FILTERS_KEY, JSON.stringify(next));
    } catch {}
  };

  const deleteFilter = (id: string) => {
    if (onDeleteExternalSavedFilter) {
      onDeleteExternalSavedFilter(id);
      return;
    }
    const next = builtInFilters.filter((f) => f.id !== id);
    setBuiltInFilters(next);
    if (builtInActiveId === id) setBuiltInActiveId(null);
    try {
      localStorage.setItem(SHARED_SAVED_FILTERS_KEY, JSON.stringify(next));
    } catch {}
  };

  // Active chips summary
  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (!isDefaultSearchFields(searchFields)) {
    activeChips.push({
      key: 'fields',
      label: `en:${activeSearchFieldKeys.map((k) => SEARCH_FIELD_LABELS[k].split(' ')[0]).join(',')}`,
      onRemove: () => onChangeSearchFields({ ...DEFAULT_GANTT_SEARCH_FIELDS }),
    });
  }
  if (showTypeFilter && selectedType !== 'all') {
    activeChips.push({
      key: 'type',
      label: `tipo:${selectedType}`,
      onRemove: () => onChangeSelectedType('all'),
    });
  }
  if (selectedPlatform !== 'all') {
    activeChips.push({
      key: 'platform',
      label: `plat:${selectedPlatform}`,
      onRemove: () => onChangeSelectedPlatform('all'),
    });
  }
  if (selectedAlert !== 'all') {
    activeChips.push({
      key: 'alert',
      label: `alerta:Nivel ${selectedAlert}`,
      onRemove: () => onChangeSelectedAlert('all'),
    });
  }
  if (selectedRelease !== 'all') {
    activeChips.push({
      key: 'release',
      label: `release:${selectedRelease}`,
      onRemove: () => onChangeSelectedRelease('all'),
    });
  }
  if (selectedTeam && selectedTeam !== 'all' && onChangeSelectedTeam) {
    activeChips.push({
      key: 'team',
      label: `equipo:${selectedTeam}`,
      onRemove: () => onChangeSelectedTeam('all'),
    });
  }
  if (selectedTag && selectedTag !== 'all' && onChangeSelectedTag) {
    activeChips.push({
      key: 'tag',
      label: `#${selectedTag}`,
      onRemove: () => onChangeSelectedTag('all'),
    });
  }
  if (showSubtasksToggle && showSubtasksOnFilter) {
    activeChips.push({
      key: 'subtasks',
      label: '+ subtareas',
      onRemove: () => onChangeShowSubtasksOnFilter(false),
    });
  }
  if (hasHiddenCols && columns && onResetColumns) {
    activeChips.push({
      key: 'cols',
      label: `cols:${visibleColsCount}/${columns.length}`,
      onRemove: onResetColumns,
    });
  }

  return (
    <div
      data-testid={`${testIdPrefix}-unified-filter-bar`}
      className="flex items-center gap-1.5 min-w-0 flex-wrap"
    >
      {/* Gmail-style Unified Search Pill + Advanced Filter Panel */}
      <div ref={panelContainerRef} className="relative flex items-center shrink-0">
        <div
          className={`flex items-center gap-1.5 pl-2.5 pr-2 rounded-full border bg-white dark:bg-zinc-800 h-7 transition ${
            panelOpen || hasActiveFilters
              ? 'border-[#0C0C09] dark:border-indigo-400 shadow-xs'
              : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500'
          } ${searchInputClassName || (testIdPrefix === 'reports' ? 'w-60 sm:w-72' : 'w-48 sm:w-64')}`}
        >
          <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0 pointer-events-none" />
          <input
            type="text"
            data-testid={`${testIdPrefix}-search-input`}
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setPanelOpen(false);
            }}
            placeholder={searchPlaceholder}
            className="flex-1 min-w-0 bg-transparent text-[11px] font-sans font-normal normal-case text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 outline-none"
          />
          {hasActiveFilters && (
            <button
              type="button"
              data-testid={`${testIdPrefix}-search-clear-btn`}
              onClick={() => {
                setBuiltInActiveId(null);
                onClearFilters();
              }}
              className="p-0.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer shrink-0"
              title="Limpiar búsqueda y filtros"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            data-testid={`${testIdPrefix}-advanced-filters-btn`}
            onClick={() => {
              if (!panelOpen) refreshBuiltInFilters();
              setPanelOpen((prev) => !prev);
              setShowSaveRow(false);
            }}
            className={`h-5 px-1.5 rounded-full flex items-center justify-center gap-1 transition cursor-pointer shrink-0 ${
              panelOpen || activeCriteriaCount > 0
                ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-800 dark:hover:text-zinc-100'
            }`}
            title="Mostrar opciones de búsqueda, filtros y columnas"
            aria-label="Opciones de búsqueda y filtros"
          >
            <SlidersHorizontal className="w-3 h-3 shrink-0" />
            {activeCriteriaCount > 0 && (
              <span
                data-testid={`${testIdPrefix}-active-filters-count`}
                className="min-w-[14px] h-[14px] px-1 rounded-full bg-indigo-600 text-white text-[9px] font-mono font-bold flex items-center justify-center leading-none"
              >
                {activeCriteriaCount}
              </span>
            )}
          </button>
        </div>

        {/* Hidden fallback select for backward compatibility with existing ReportsView tests */}
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

        {/* Gmail-Style Unified Advanced Search & Filter Popover */}
        <div
          data-testid={`${testIdPrefix}-advanced-filters-panel`}
          style={panelMaxHeight ? { maxHeight: `${panelMaxHeight}px` } : undefined}
          className={`absolute left-0 top-full mt-1.5 z-50 w-[450px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-240px)] overflow-hidden rounded-[8px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl text-[11px] font-sans normal-case ${
            panelOpen ? 'flex flex-col' : 'hidden'
          }`}
        >
          {/* Panel Header (always visible) */}
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[#E2E2DC] dark:border-zinc-800 bg-[#FAFAF8] dark:bg-zinc-900">
            <span className="font-bold text-xs text-[#0C0C09] dark:text-zinc-100 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>
                {activeSavedFilterObj
                  ? `Editando filtro: "${activeSavedFilterObj.name}"`
                  : 'Búsqueda avanzada y filtros'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setPanelOpen(false);
                setShowSaveRow(false);
              }}
              className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scrollable Criteria Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2.5">
          {/* Row 1: Contiene */}
          <div className="grid grid-cols-12 items-center gap-2">
            <label className="col-span-4 text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400">
              Contiene
            </label>
            <input
              type="text"
              data-testid={`${testIdPrefix}-panel-query-input`}
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              placeholder="Nombre, código, equipo..."
              className="col-span-8 px-2 py-1 bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:border-[#0C0C09] dark:focus:border-indigo-400 outline-none text-xs text-zinc-800 dark:text-zinc-100"
            />
          </div>

          {/* Row 2: Buscar en campos */}
          <div className="grid grid-cols-12 items-start gap-2">
            <div className="col-span-4 pt-0.5 space-y-0.5">
              <span
                data-testid={`${testIdPrefix}-search-fields-btn`}
                className="block text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400"
              >
                {`En: ${searchFieldsSummaryLabel}`}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid={`${testIdPrefix}-search-fields-reset-btn`}
                  onClick={() => onChangeSearchFields({ ...DEFAULT_GANTT_SEARCH_FIELDS })}
                  className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Nombre
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
                  className="text-[9px] font-semibold text-zinc-500 hover:underline cursor-pointer"
                >
                  Todos
                </button>
              </div>
            </div>
            <div
              data-testid={`${testIdPrefix}-search-fields-menu`}
              className="col-span-8 grid grid-cols-2 gap-1"
            >
              {(Object.keys(SEARCH_FIELD_LABELS) as (keyof GanttSearchFieldsConfig)[]).map(
                (fieldKey) => {
                  const isChecked = searchFields[fieldKey];
                  const isOnlyActive = isChecked && activeSearchFieldKeys.length <= 1;
                  return (
                    <label
                      key={fieldKey}
                      className={`flex items-center gap-1.5 text-[10px] font-medium ${
                        isOnlyActive
                          ? 'text-zinc-400 cursor-not-allowed'
                          : 'text-zinc-700 dark:text-zinc-200 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        data-testid={`${testIdPrefix}-search-field-checkbox-${fieldKey}`}
                        checked={isChecked}
                        disabled={isOnlyActive}
                        onChange={() => toggleSearchField(fieldKey)}
                        className="w-3 h-3 rounded border-zinc-300 accent-indigo-600 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span className="truncate">{SEARCH_FIELD_LABELS[fieldKey]}</span>
                    </label>
                  );
                }
              )}
            </div>
          </div>

          {/* Row 4: Tipo */}
          {showTypeFilter && (
            <div className="grid grid-cols-12 items-center gap-2">
              <span
                data-testid={`${testIdPrefix}-type-filter`}
                data-selected-type={selectedType}
                className="col-span-4 text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400 flex items-center gap-1"
              >
                <Filter className="w-3 h-3" />
                <span>Tipo</span>
              </span>
              <div
                data-testid={`${testIdPrefix}-type-filter-menu`}
                className="col-span-8 flex flex-wrap gap-1"
              >
                {(
                  [
                    { value: 'all', label: 'Todos' },
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
                    onClick={() => onChangeSelectedType(opt.value)}
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-medium cursor-pointer transition ${
                      selectedType === opt.value
                        ? 'border-[#0C0C09] bg-[#0C0C09] text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-[#0C0C09]'
                        : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Row 5: Plataforma */}
          <div className="grid grid-cols-12 items-center gap-2">
            <span
              data-testid={`${testIdPrefix}-platform-filter`}
              data-selected-platform={selectedPlatform}
              className="col-span-4 text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400 flex items-center gap-1"
            >
              {selectedPlatform === 'all' ? (
                <>
                  <Smartphone className="w-3 h-3" />
                  <span>Plat.</span>
                </>
              ) : selectedPlatform === 'iOS' ? (
                <>
                  <AppleIosIcon
                    testId={`${optPrefix}active-filter-icon-ios`}
                    className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
                  />
                  <span>Plat.</span>
                </>
              ) : selectedPlatform === 'Android' ? (
                <>
                  <AndroidIcon
                    testId={`${optPrefix}active-filter-icon-android`}
                    className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                  />
                  <span>Plat.</span>
                </>
              ) : (
                <>
                  <AppleIosIcon
                    testId={`${optPrefix}active-filter-icon-both-ios`}
                    className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
                  />
                  <AndroidIcon
                    testId={`${optPrefix}active-filter-icon-both-android`}
                    className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                  />
                  <span>Plat.</span>
                </>
              )}
            </span>
            <div
              data-testid={`${testIdPrefix}-platform-filter-menu`}
              className="col-span-8 flex items-center gap-1.5"
            >
              <button
                type="button"
                data-testid={`${optPrefix}platform-filter-option-iOS`}
                onClick={() => onChangeSelectedPlatform(selectedPlatform === 'iOS' ? 'all' : 'iOS')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-medium cursor-pointer transition ${
                  selectedPlatform === 'iOS'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100'
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
                onClick={() =>
                  onChangeSelectedPlatform(selectedPlatform === 'Android' ? 'all' : 'Android')
                }
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-medium cursor-pointer transition ${
                  selectedPlatform === 'Android'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100'
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
                onClick={() =>
                  onChangeSelectedPlatform(
                    selectedPlatform === 'iOS/Android' ? 'all' : 'iOS/Android'
                  )
                }
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-medium cursor-pointer transition ${
                  selectedPlatform === 'iOS/Android'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100'
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
          </div>

          {/* Row 6: Nivel de Alerta */}
          <div className="grid grid-cols-12 items-center gap-2">
            <span
              data-testid={`${testIdPrefix}-alert-filter`}
              data-selected-alert={selectedAlert}
              className="col-span-4 text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400 flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Alerta</span>
            </span>
            <div
              data-testid={`${testIdPrefix}-alert-filter-menu`}
              className="col-span-8 flex flex-wrap gap-1"
            >
              <button
                type="button"
                data-testid={`${optPrefix}alert-filter-option-all`}
                onClick={() => onChangeSelectedAlert('all')}
                className={`px-2 py-0.5 rounded-full border text-[10px] font-medium cursor-pointer transition ${
                  selectedAlert === 'all'
                    ? 'border-[#0C0C09] bg-[#0C0C09] text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-[#0C0C09]'
                    : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                Todas
              </button>
              {(
                [
                  { value: 0 as ProjectAlertLevel, label: '0', dot: 'bg-zinc-400' },
                  { value: 1 as ProjectAlertLevel, label: '1', dot: 'bg-amber-500' },
                  { value: 2 as ProjectAlertLevel, label: '2', dot: 'bg-orange-500' },
                  { value: 3 as ProjectAlertLevel, label: '3', dot: 'bg-rose-500' },
                ]
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  data-testid={`${optPrefix}alert-filter-option-${opt.value}`}
                  onClick={() => onChangeSelectedAlert(opt.value)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium cursor-pointer transition ${
                    selectedAlert === opt.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                  <span>{`Nivel ${opt.label}`}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Row 7: Release */}
          {releases.length > 0 && (
            <div className="grid grid-cols-12 items-center gap-2">
              <label className="col-span-4 text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400">
                Release
              </label>
              <select
                data-testid={`${testIdPrefix}-release-select`}
                value={selectedRelease}
                onChange={(e) => onChangeSelectedRelease(e.target.value)}
                aria-label="Filtrar por release"
                className="col-span-8 px-2 py-1 rounded-[4px] border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
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

          {/* Row 7b: Equipo */}
          {onChangeSelectedTeam && (
            <div className="grid grid-cols-12 items-center gap-2">
              <label className="col-span-4 text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400 flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>Equipo</span>
              </label>
              <select
                data-testid={`${testIdPrefix}-team-select`}
                value={selectedTeam}
                onChange={(e) => onChangeSelectedTeam(e.target.value)}
                aria-label="Filtrar por equipo"
                className="col-span-8 px-2 py-1 rounded-[4px] border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
              >
                <option value="all">Todos los equipos</option>
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Row 7c: Etiqueta */}
          {onChangeSelectedTag && (
            <div className="grid grid-cols-12 items-center gap-2">
              <label className="col-span-4 text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                <span>Etiqueta</span>
              </label>
              <select
                data-testid={`${testIdPrefix}-tag-select`}
                value={selectedTag}
                onChange={(e) => onChangeSelectedTag(e.target.value)}
                aria-label="Filtrar por etiqueta"
                className="col-span-8 px-2 py-1 rounded-[4px] border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
              >
                <option value="all">Todas las etiquetas</option>
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {`#${tag}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Row 8: Subtareas */}
          {showSubtasksToggle && (
            <div className="grid grid-cols-12 items-center gap-2">
              <span className="col-span-4 text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400">
                Opciones
              </span>
              <label
                data-testid={`${testIdPrefix}-show-subtasks-label`}
                className="col-span-8 inline-flex items-center gap-2 text-[11px] text-zinc-700 dark:text-zinc-200 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  data-testid={`${testIdPrefix}-show-subtasks-checkbox`}
                  checked={showSubtasksOnFilter}
                  onChange={(e) => onChangeShowSubtasksOnFilter(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-zinc-300 accent-indigo-600 cursor-pointer"
                />
                <span>Incluir subtareas de proyectos coincidentes</span>
              </label>
            </div>
          )}

          {/* Row 9: Columnas visibles (collapsible, collapsed by default) */}
          {columns && columns.length > 0 && onToggleColumn && (
            <div
              data-testid={`${testIdPrefix}-panel-columns-section`}
              className="pt-2 border-t border-[#E2E2DC] dark:border-zinc-800"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  data-testid={`${testIdPrefix}-panel-columns-toggle`}
                  data-expanded={columnsExpanded ? 'true' : 'false'}
                  onClick={() => setColumnsExpanded((prev) => !prev)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-[#6B6B66] dark:text-zinc-300 hover:text-[#0C0C09] dark:hover:text-white cursor-pointer select-none"
                >
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      columnsExpanded ? 'rotate-90' : 'rotate-0'
                    }`}
                  />
                  <span>{`Columnas (${visibleColsCount}/${columns.length})`}</span>
                </button>
                {onResetColumns && (
                  <button
                    type="button"
                    onClick={onResetColumns}
                    className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Seleccionar todas
                  </button>
                )}
              </div>
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  columnsExpanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pb-0.5">
                    {columns.map((col) => (
                      <button
                        key={col.key}
                        type="button"
                        data-testid={`${testIdPrefix}-panel-col-pill-${col.key}`}
                        onClick={() => onToggleColumn(col.key)}
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-medium cursor-pointer transition ${
                          col.visible
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                            : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {col.visible ? '✓ ' : ''}
                        {col.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Sticky Footer: Inline Save Filter Row + Gmail-style Actions */}
          <div className="shrink-0 px-4 py-2.5 border-t border-[#E2E2DC] dark:border-zinc-800 bg-[#FAFAF8] dark:bg-zinc-900/95 space-y-2">
          {/* Inline Save Filter Row */}
          {showSaveRow && (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                data-testid={`${testIdPrefix}-panel-save-filter-input`}
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFilterName.trim()) {
                    e.preventDefault();
                    saveCurrentAsFilter(newFilterName);
                  }
                }}
                placeholder="Nombre del filtro guardado..."
                className="flex-1 px-2.5 py-1 rounded-[4px] border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                data-testid={`${testIdPrefix}-panel-save-filter-confirm`}
                onClick={() => saveCurrentAsFilter(newFilterName)}
                disabled={!newFilterName.trim()}
                className="px-2.5 py-1 rounded-[4px] bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setShowSaveRow(false)}
                className="px-2 py-1 rounded-[4px] border border-zinc-300 dark:border-zinc-700 text-[11px] cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Gmail-style Footer Actions */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              data-testid={`${testIdPrefix}-clear-filters-btn`}
              onClick={() => {
                setBuiltInActiveId(null);
                onClearFilters();
              }}
              className="text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white cursor-pointer"
            >
              Restablecer
            </button>
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeSavedFilterObj && (
                <button
                  type="button"
                  data-testid={`${testIdPrefix}-panel-update-filter-btn`}
                  onClick={() =>
                    saveCurrentAsFilter(activeSavedFilterObj.name, activeSavedFilterObj.id)
                  }
                  className="px-2.5 py-1 rounded-[4px] border border-indigo-500 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-[11px] font-semibold cursor-pointer"
                >
                  {`Actualizar "${activeSavedFilterObj.name}"`}
                </button>
              )}
              {(enableBuiltInSavedFilters || onSaveExternalSavedFilter) && (
                <button
                  type="button"
                  data-testid={`${testIdPrefix}-panel-create-filter-btn`}
                  onClick={() => setShowSaveRow(true)}
                  className="px-2.5 py-1 rounded-[4px] border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Crear filtro</span>
                </button>
              )}
              <button
                type="button"
                data-testid={`${testIdPrefix}-panel-apply-btn`}
                onClick={() => {
                  setPanelOpen(false);
                  setShowSaveRow(false);
                }}
                className="px-3.5 py-1 rounded-full bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[11px] font-semibold cursor-pointer"
              >
                Buscar
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Optional external slot + Quick Saved Filter Pills (1-click apply + ✏️ full edit in Gmail panel) */}
      {savedFiltersSlot}

      {/* Quick Saved Filter Pills (1-click apply + ✏️ full edit in Gmail panel) */}
      {effectiveSavedFilters.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {effectiveSavedFilters.map((f) => {
            const isAct = f.id === effectiveActiveFilterId;
            return (
              <div
                key={f.id}
                data-testid={`${testIdPrefix}-saved-pill-${f.id}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] h-6 transition ${
                  isAct
                    ? 'border-indigo-600 bg-indigo-600 text-white font-semibold'
                    : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => applyFilter(f)}
                  className="cursor-pointer truncate max-w-[120px] flex items-center gap-1"
                  title={`Aplicar filtro "${f.name}"`}
                >
                  {isAct && <Check className="w-2.5 h-2.5 shrink-0" />}
                  <span className="truncate">{f.name}</span>
                </button>
                <button
                  type="button"
                  data-testid={`${testIdPrefix}-saved-pill-edit-${f.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    applyFilter(f);
                    setPanelOpen(true);
                    setShowSaveRow(false);
                  }}
                  className="opacity-75 hover:opacity-100 cursor-pointer p-0.5"
                  title="Editar todos los criterios de este filtro"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFilter(f.id);
                  }}
                  className="opacity-75 hover:opacity-100 cursor-pointer p-0.5"
                  title="Eliminar filtro guardado"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Filter Chips (removable in 1 click) */}
      {!hideActiveChips && activeChips.length > 0 && (
        <div
          data-testid={`${testIdPrefix}-active-filter-chips`}
          className="flex items-center gap-1 flex-wrap"
        >
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] h-6"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                className="hover:text-rose-600 cursor-pointer"
                title="Quitar criterio"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
