import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Layers,
  FolderKanban,
  FolderPlus,
  Flag,
  Eye,
  Crosshair,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Link2,
  Calendar,
  Sparkles,
  X,
  ChevronDown,
  ChevronRight,
  Smartphone,
  SlidersHorizontal,
  Check,
  LayoutTemplate,
  Plus,
  Trash2,
  Pencil,
  Bookmark,
  MessageSquare,
} from 'lucide-react';
import {
  ComputedGanttItem,
  FocusEntity,
  GanttItem,
  GanttProject,
  Release,
  ProjectPlatform,
  ProjectAlertLevel,
} from '../types/gantt';
import {
  calculateDurationFromDates,
  calculateEndDateFromDuration,
  collectAllTags,
  collectProjectRollupComments,
  collectProjectRollupTags,
  collectProjectSubtaskNotes,
  getLatestStatusComment,
  normalizePlatform,
  normalizeTag,
} from '../utils/ganttEngine';
import {
  StatusCommentsDrawer,
  formatCommentShortDate,
} from './StatusCommentsPanel';
import { TagInput } from './TagInput';
import { AppleIosIcon, AndroidIcon } from './PlatformIcons';
import {
  SearchFilterBar,
  GanttSearchFieldsConfig,
  DEFAULT_GANTT_SEARCH_FIELDS,
  SEARCH_FIELD_LABELS,
  isDefaultSearchFields,
} from './SearchFilterBar';
import {
  ProjectWizardModal,
  ProjectWizardPayload,
} from './ProjectWizardModal';
import {
  generateCronogramaCompletoRows,
  generateProjectSummaryRows,
  generateReleaseSummaryRows,
  downloadGanttExcelFile,
  CronogramaReportRow,
  ProjectSummaryReportRow,
  ReleaseSummaryReportRow,
} from '../utils/excelExportEngine';

const PROJECT_ACCENT_COLORS: Record<string, { hex: string; badgeBg: string }> = {
  indigo: { hex: '#4F46E5', badgeBg: 'bg-indigo-600' },
  violet: { hex: '#7C3AED', badgeBg: 'bg-violet-600' },
  emerald: { hex: '#059669', badgeBg: 'bg-emerald-600' },
  blue: { hex: '#2563EB', badgeBg: 'bg-blue-600' },
  teal: { hex: '#0D9488', badgeBg: 'bg-teal-600' },
  amber: { hex: '#D97706', badgeBg: 'bg-amber-600' },
  orange: { hex: '#EA580C', badgeBg: 'bg-orange-600' },
  rose: { hex: '#E11D48', badgeBg: 'bg-rose-600' },
  pink: { hex: '#DB2777', badgeBg: 'bg-pink-600' },
  cyan: { hex: '#0891B2', badgeBg: 'bg-cyan-600' },
  sky: { hex: '#0284C7', badgeBg: 'bg-sky-600' },
  lime: { hex: '#65A30D', badgeBg: 'bg-lime-600' },
  slate: { hex: '#475569', badgeBg: 'bg-slate-600' },
};

type ReportTab = 'cronograma' | 'projects' | 'releases';

interface ReportColumnDef {
  key: string;
  label: string;
  defaultWidth: number;
  align?: 'left' | 'center' | 'right';
}

const CRONO_COLUMNS: ReportColumnDef[] = [
  { key: 'hierarchy', label: 'Jerarquía', defaultWidth: 125 },
  { key: 'name', label: 'Nombre del Elemento', defaultWidth: 250 },
  { key: 'releaseCode', label: 'Release', defaultWidth: 135 },
  { key: 'projectName', label: 'Proyecto', defaultWidth: 185 },
  { key: 'platform', label: 'Plataforma', defaultWidth: 125 },
  { key: 'team', label: 'Equipo', defaultWidth: 150 },
  { key: 'alertLevel', label: 'Nivel de Alerta', defaultWidth: 135 },
  { key: 'type', label: 'Tipo', defaultWidth: 105 },
  { key: 'startDate', label: 'Inicio', defaultWidth: 135 },
  { key: 'endDate', label: 'Fin', defaultWidth: 135 },
  { key: 'duration', label: 'Duración (Días)', defaultWidth: 120, align: 'right' },
  { key: 'slack', label: 'Holgura', defaultWidth: 95, align: 'right' },
  { key: 'progress', label: 'Progreso', defaultWidth: 105, align: 'center' },
  { key: 'dependency', label: 'Dependencia Predecesora (Nombre)', defaultWidth: 230 },
  { key: 'isCritical', label: 'Ruta Crítica', defaultWidth: 105, align: 'center' },
  { key: 'isExternal', label: 'Hito Ext.', defaultWidth: 95, align: 'center' },
  { key: 'compliance', label: 'Cumplimiento Release', defaultWidth: 170 },
  { key: 'tags', label: 'Etiquetas', defaultWidth: 195 },
  { key: 'statusComments', label: 'Seguimiento', defaultWidth: 250 },
  { key: 'notes', label: 'Notas / Descripción', defaultWidth: 250 },
];

const PROJECT_COLUMNS: ReportColumnDef[] = [
  { key: 'code', label: 'Código', defaultWidth: 85 },
  { key: 'projectName', label: 'Proyecto', defaultWidth: 225 },
  { key: 'platform', label: 'Plataforma', defaultWidth: 130 },
  { key: 'team', label: 'Equipo', defaultWidth: 165 },
  { key: 'alertLevel', label: 'Nivel de Alerta', defaultWidth: 145 },
  { key: 'releaseCode', label: 'Release Asignada', defaultWidth: 145 },
  { key: 'startDate', label: 'Fecha Inicio', defaultWidth: 120 },
  { key: 'endDate', label: 'Fecha Fin', defaultWidth: 120 },
  { key: 'duration', label: 'Duración (Días)', defaultWidth: 120, align: 'right' },
  { key: 'progress', label: 'Progreso', defaultWidth: 125, align: 'center' },
  { key: 'tasksCount', label: 'Tareas', defaultWidth: 85, align: 'right' },
  { key: 'milestonesCount', label: 'Hitos', defaultWidth: 85, align: 'right' },
  { key: 'description', label: 'Descripción', defaultWidth: 260 },
];

const RELEASE_COLUMNS: ReportColumnDef[] = [
  { key: 'code', label: 'Código Release', defaultWidth: 140 },
  { key: 'name', label: 'Nombre', defaultWidth: 220 },
  { key: 'month', label: 'Mes', defaultWidth: 110 },
  { key: 'startDate', label: 'Fecha Inicio', defaultWidth: 120 },
  { key: 'endDate', label: 'Fecha Fin', defaultWidth: 120 },
  { key: 'duration', label: 'Duración (Días)', defaultWidth: 120, align: 'right' },
  { key: 'assignedProjects', label: 'Proyectos Asignados', defaultWidth: 230 },
  { key: 'keyMilestones', label: 'Hitos Clave', defaultWidth: 300 },
];

const COLUMNS_BY_TAB: Record<ReportTab, ReportColumnDef[]> = {
  cronograma: CRONO_COLUMNS,
  projects: PROJECT_COLUMNS,
  releases: RELEASE_COLUMNS,
};

const REPORT_COL_WIDTH_LIMITS: Record<
  string,
  { min: number; max: number; extraPx: number; maxHeaderPx?: number }
> = {
  hierarchy: { min: 76, max: 114, extraPx: 28 },
  name: { min: 140, max: 320, extraPx: 44, maxHeaderPx: 140 },
  releaseCode: { min: 74, max: 130, extraPx: 24 },
  code: { min: 70, max: 130, extraPx: 24 },
  projectName: { min: 108, max: 230, extraPx: 26, maxHeaderPx: 120 },
  platform: { min: 80, max: 124, extraPx: 30 },
  team: { min: 70, max: 165, extraPx: 24 },
  alertLevel: { min: 82, max: 120, extraPx: 26, maxHeaderPx: 104 },
  type: { min: 64, max: 94, extraPx: 22 },
  startDate: { min: 96, max: 120, extraPx: 30 },
  endDate: { min: 96, max: 120, extraPx: 30 },
  duration: { min: 72, max: 108, extraPx: 22, maxHeaderPx: 98 },
  slack: { min: 64, max: 88, extraPx: 20 },
  progress: { min: 72, max: 98, extraPx: 26 },
  dependency: { min: 84, max: 230, extraPx: 24, maxHeaderPx: 116 },
  isCritical: { min: 76, max: 100, extraPx: 22 },
  isExternal: { min: 68, max: 92, extraPx: 20 },
  compliance: { min: 82, max: 160, extraPx: 26, maxHeaderPx: 112 },
  tags: { min: 110, max: 230, extraPx: 28, maxHeaderPx: 110 },
  statusComments: { min: 130, max: 270, extraPx: 30, maxHeaderPx: 116 },
  notes: { min: 108, max: 255, extraPx: 26, maxHeaderPx: 116 },
  description: { min: 108, max: 255, extraPx: 26, maxHeaderPx: 116 },
  tasksCount: { min: 62, max: 84, extraPx: 20 },
  milestonesCount: { min: 62, max: 84, extraPx: 20 },
  month: { min: 72, max: 110, extraPx: 22 },
  assignedProjects: { min: 108, max: 230, extraPx: 26, maxHeaderPx: 124 },
  keyMilestones: { min: 116, max: 270, extraPx: 26, maxHeaderPx: 124 },
};

function extractReportCellText(
  row: CronogramaReportRow | ProjectSummaryReportRow | ReleaseSummaryReportRow,
  key: string
): string {
  const r = row as unknown as Record<string, unknown>;
  if (key === 'hierarchy') {
    return String(r.level ?? '');
  }
  if (key === 'name') {
    const displayId = typeof r.displayId === 'string' && r.displayId ? `${r.displayId} ` : '';
    return `${displayId}${String(r.name ?? '')}`.trim();
  }
  if (key === 'alertLevel') {
    const lvl = r.alertLevel;
    if (lvl === undefined || lvl === null) return '—';
    return lvl === 0 ? 'Normal' : `Nivel ${lvl}`;
  }
  if (key === 'duration') {
    const val = r.duration;
    return val === undefined || val === null || val === '' ? '—' : `${val}d`;
  }
  if (key === 'slack') {
    const val = r.slack;
    return val === undefined || val === null || val === '' ? '—' : `${val}d`;
  }
  if (key === 'progress') {
    const val = r.progress;
    return val === undefined || val === null || val === '' ? '—' : `${val}%`;
  }
  if (key === 'isCritical') {
    return r.isCritical === 'Sí' || r.isCritical === true ? 'Crítica' : '—';
  }
  if (key === 'isExternal') {
    return r.isExternal ? 'Ext.' : '—';
  }
  if (key === 'statusComments') {
    return String(r.latestComment ?? '—');
  }
  if (key === 'tags') {
    return String(r.tagsLabel ?? '—');
  }
  const raw = r[key];
  if (raw === undefined || raw === null) return '';
  return String(raw);
}

/**
 * Computes compact, content-aware minimum default widths for each column in a report tab
 * so cell content is readable without wasting horizontal space.
 */
export function computeAutoFitReportColumnWidths(
  tab: ReportTab,
  rows: Array<CronogramaReportRow | ProjectSummaryReportRow | ReleaseSummaryReportRow>,
  columns: ReportColumnDef[] = COLUMNS_BY_TAB[tab]
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const col of columns) {
    const limits = REPORT_COL_WIDTH_LIMITS[col.key] || {
      min: 68,
      max: Math.max(col.defaultWidth, 240),
      extraPx: 24,
    };
    const rawHeaderPx = Math.ceil(col.label.length * 6.2 + 24);
    const headerPx =
      limits.maxHeaderPx !== undefined ? Math.min(rawHeaderPx, limits.maxHeaderPx) : rawHeaderPx;

    let maxLineChars = 0;
    for (const row of rows) {
      const text = extractReportCellText(row, col.key).trim();
      if (!text || text === '—') continue;
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const len = line.trim().length;
        if (len > maxLineChars) maxLineChars = len;
      }
    }

    const contentPx =
      maxLineChars > 0 ? Math.ceil(maxLineChars * 6.5 + limits.extraPx) : limits.min;
    const ideal = Math.max(limits.min, headerPx, contentPx);
    result[col.key] = Math.min(limits.max, ideal);
  }
  return result;
}

/**
 * Computes the expanded width needed to display the full text of a column
 * (header + longest line across the provided rows) without truncation.
 */
export function computeFullTextColumnWidth(
  col: ReportColumnDef,
  rows: Array<CronogramaReportRow | ProjectSummaryReportRow | ReleaseSummaryReportRow>
): number {
  const limits = REPORT_COL_WIDTH_LIMITS[col.key] || {
    min: 68,
    max: 320,
    extraPx: 24,
  };
  const extraByKey: Record<string, number> = {
    name: 120, // indentation + chevron + project/release badge + "+N" pill
    statusComments: 76, // padding + 💬 N badge
    tags: 64, // #tag pills + inline input
    notes: 36,
    dependency: 36,
  };
  const extraPx = extraByKey[col.key] ?? Math.max(limits.extraPx, 32);

  let measureTextPx = (text: string): number => Math.ceil(text.length * 7.2);
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, Inter, sans-serif';
        measureTextPx = (text: string) => Math.ceil(ctx.measureText(text).width);
      }
    } catch {}
  }

  const headerPx = Math.ceil(col.label.length * 7.4 + 32);
  let maxTextPx = 0;

  for (const row of rows) {
    const text = extractReportCellText(row, col.key).trim();
    if (!text || text === '—') continue;
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const px = measureTextPx(trimmed);
      if (px > maxTextPx) maxTextPx = px;
    }
  }

  const fullIdeal = Math.max(limits.min, headerPx, maxTextPx + extraPx);
  return Math.min(960, Math.max(limits.min, fullIdeal));
}

const REPORT_HIDDEN_COLS_KEY = 'ganttflow_report_hidden_cols_v1';
const REPORT_COL_WIDTHS_KEY = 'ganttflow_report_col_widths_v1';
export const REPORT_COL_ORDER_KEY = 'ganttflow_report_col_order_v1';
export const REPORT_COLUMN_PRESETS_KEY = 'gantt_report_column_presets_v1';
export const REPORT_ACTIVE_PRESET_KEY = 'gantt_report_active_preset_v1';
export const REPORT_PRESET_NAMES_KEY = 'gantt_report_preset_names_v1';

export type ReportRowTypeFilter = 'all' | 'RELEASE' | 'PROYECTO' | 'TAREA' | 'HITO';

export interface ReportColumnPreset {
  id: string;
  name: string;
  tab: ReportTab;
  visibleColKeys: string[];
  colOrder?: string[];
  isCustom?: boolean;
}

export const DEFAULT_COLUMN_PRESETS: ReportColumnPreset[] = [
  {
    id: 'preset-all',
    name: 'Formato Completo (Todas)',
    tab: 'cronograma',
    visibleColKeys: CRONO_COLUMNS.map((c) => c.key),
    colOrder: CRONO_COLUMNS.map((c) => c.key),
    isCustom: false,
  },
  {
    id: 'preset-releases-all',
    name: 'Formato Completo (Releases)',
    tab: 'releases',
    visibleColKeys: RELEASE_COLUMNS.map((c) => c.key),
    colOrder: RELEASE_COLUMNS.map((c) => c.key),
    isCustom: false,
  },
];

export function createColumnPreset(
  name: string,
  tab: ReportTab,
  visibleColKeys: string[],
  colOrder?: string[]
): ReportColumnPreset {
  return {
    id: `preset-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    tab,
    visibleColKeys: [...visibleColKeys],
    colOrder: colOrder ? [...colOrder] : undefined,
    isCustom: true,
  };
}

export function computeColOrderFromPreset(
  tab: ReportTab,
  preset: ReportColumnPreset,
  allColumns: ReportColumnDef[] = COLUMNS_BY_TAB[tab]
): string[] {
  const defaultKeys = allColumns.map((c) => c.key);
  if (!preset.colOrder || !Array.isArray(preset.colOrder) || preset.colOrder.length === 0) {
    return defaultKeys;
  }
  const validSet = new Set(defaultKeys);
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const k of preset.colOrder) {
    if (validSet.has(k) && !seen.has(k)) {
      kept.push(k);
      seen.add(k);
    }
  }
  for (const k of defaultKeys) {
    if (!seen.has(k)) {
      kept.push(k);
    }
  }
  return kept;
}

export function computeHiddenColsFromPreset(
  tab: ReportTab,
  preset: ReportColumnPreset,
  allColumns: ReportColumnDef[] = COLUMNS_BY_TAB[tab]
): Record<string, boolean> {
  const visibleSet = new Set(preset.visibleColKeys);
  const hidden: Record<string, boolean> = {};
  for (const col of allColumns) {
    if (!visibleSet.has(col.key)) {
      hidden[col.key] = true;
    }
  }
  return hidden;
}

export const REPORT_SAVED_FILTERS_KEY = 'gantt_report_saved_filters_v1';
export const REPORT_ACTIVE_FILTER_KEY = 'gantt_report_active_filter_v1';

export interface ReportSavedFilter {
  id: string;
  name: string;
  searchQuery: string;
  excludeQuery?: string;
  searchFields?: GanttSearchFieldsConfig;
  selectedType: ReportRowTypeFilter;
  selectedPlatform: 'all' | ProjectPlatform;
  selectedAlert: 'all' | ProjectAlertLevel;
  selectedRelease: string;
  selectedTeam?: string;
  selectedTag?: string;
  showSubtasksOnFilter?: boolean;
  formatPresetId?: string;
  visibleColKeys?: string[];
  colOrder?: string[];
  formatLabel?: string;
}

export function createSavedFilter(params: {
  name: string;
  searchQuery?: string;
  excludeQuery?: string;
  searchFields?: GanttSearchFieldsConfig;
  selectedType?: ReportRowTypeFilter;
  selectedPlatform?: 'all' | ProjectPlatform;
  selectedAlert?: 'all' | ProjectAlertLevel;
  selectedRelease?: string;
  selectedTeam?: string;
  selectedTag?: string;
  showSubtasksOnFilter?: boolean;
  formatPresetId?: string;
  visibleColKeys?: string[];
  colOrder?: string[];
  formatLabel?: string;
}): ReportSavedFilter {
  return {
    id: `filter-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: params.name.trim(),
    searchQuery: params.searchQuery ?? '',
    excludeQuery: params.excludeQuery ?? '',
    searchFields: params.searchFields ? { ...params.searchFields } : undefined,
    selectedType: params.selectedType ?? 'all',
    selectedPlatform: params.selectedPlatform ?? 'all',
    selectedAlert: params.selectedAlert ?? 'all',
    selectedRelease: params.selectedRelease ?? 'all',
    selectedTeam: params.selectedTeam ?? 'all',
    selectedTag: params.selectedTag ?? 'all',
    showSubtasksOnFilter: params.showSubtasksOnFilter ?? false,
    formatPresetId: params.formatPresetId,
    visibleColKeys: params.visibleColKeys ? [...params.visibleColKeys] : undefined,
    colOrder: params.colOrder ? [...params.colOrder] : undefined,
    formatLabel: params.formatLabel,
  };
}

export function formatSavedFilterSummary(f: ReportSavedFilter): string {
  const parts: string[] = [];
  if (f.selectedType && f.selectedType !== 'all') {
    const label =
      f.selectedType === 'RELEASE'
        ? 'Release'
        : f.selectedType === 'PROYECTO'
        ? 'Proyecto'
        : f.selectedType === 'TAREA'
        ? 'Tarea'
        : 'Hito';
    parts.push(label);
  }
  if (f.selectedPlatform && f.selectedPlatform !== 'all') {
    parts.push(f.selectedPlatform);
  }
  if (f.selectedAlert !== 'all' && f.selectedAlert !== undefined) {
    parts.push(`Nivel ${f.selectedAlert}`);
  }
  if (f.selectedRelease && f.selectedRelease !== 'all') {
    parts.push(f.selectedRelease);
  }
  if (f.searchQuery && f.searchQuery.trim()) {
    parts.push(`"${f.searchQuery.trim()}"`);
  }
  if (f.excludeQuery && f.excludeQuery.trim()) {
    parts.push(`-"${f.excludeQuery.trim()}"`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Sin filtros de fila';
}

interface EditableReportTextCellProps {
  value: string;
  onCommit: (nextValue: string) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
  multiline?: boolean;
}

const EditableReportTextCell: React.FC<EditableReportTextCellProps> = ({
  value,
  onCommit,
  placeholder = '—',
  className = '',
  testId,
  multiline = false,
}) => {
  const [draft, setDraft] = useState(value);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== value.trim()) {
      onCommit(trimmed);
    } else {
      setDraft(value);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    const rowCount = multiline
      ? Math.min(8, Math.max(2, (draft || '').split('\n').length))
      : Math.min(4, Math.max(1, Math.ceil((draft || '').length / 28)));
    return (
      <textarea
        data-testid={testId}
        autoFocus
        value={draft}
        rows={rowCount}
        placeholder={placeholder}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setDraft(value);
            setIsEditing(false);
          } else if (!multiline && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commit();
          }
        }}
        className={`w-full bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded-[2px] border border-indigo-500 outline-none resize-y leading-snug whitespace-pre-wrap break-words ${className}`}
      />
    );
  }

  return (
    <div
      data-testid={testId}
      role="textbox"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
      className={`w-full px-1.5 py-0.5 rounded-[2px] border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 whitespace-pre-wrap break-words leading-snug cursor-text ${className}`}
    >
      {value ? (
        value
      ) : (
        <span className="opacity-45 font-normal">{placeholder}</span>
      )}
    </div>
  );
};

export interface ReportRowContextMenuState {
  x: number;
  y: number;
  level: 'RELEASE' | 'PROYECTO' | 'TAREA' | 'HITO';
  label: string;
  projectId?: string;
  releaseId?: string;
  itemId?: string;
}

interface ReportsViewProps {
  releases: Release[];
  projects: GanttProject[];
  items: ComputedGanttItem[];
  onBackToGantt?: () => void;
  initialTab?: ReportTab;
  initialShowColumnsMenu?: boolean;
  initialShowFormatMenu?: boolean;
  initialShowSavedFiltersMenu?: boolean;
  initialCustomPresets?: ReportColumnPreset[];
  initialActivePresetId?: string;
  initialSavedFilters?: ReportSavedFilter[];
  initialActiveSavedFilterId?: string;
  initialTypeFilter?: ReportRowTypeFilter;
  initialSearchQuery?: string;
  initialExcludeQuery?: string;
  initialSearchFields?: Partial<GanttSearchFieldsConfig>;
  initialShowSubtasksOnFilter?: boolean;
  initialShowSearchFieldsMenu?: boolean;
  initialShowAdvancedPanel?: boolean;
  initialContextMenu?: ReportRowContextMenuState | null;
  initialFocusedProjectIds?: string[];
  initialCollapsedNodes?: string[];
  initialExpandedFilteredNodes?: string[];
  initialShowWizard?: boolean;
  selectedEntity?: FocusEntity | null;
  onSelectEntity?: (entity: FocusEntity) => void;
  onUpdateItem?: (item: GanttItem, autoCascade: boolean) => void;
  onUpdateProject?: (project: GanttProject) => void;
  onUpdateRelease?: (release: Release) => void;
  onCreateProject?: (newProj?: Partial<GanttProject>) => void;
  onCreateProjectFromWizard?: (payload: ProjectWizardPayload) => void;
  onCreateTask?: (projectId?: string) => void;
  onCreateMilestone?: (projectId?: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  releases,
  projects,
  items,
  initialTab = 'cronograma',
  initialShowColumnsMenu = false,
  initialShowFormatMenu = false,
  initialShowSavedFiltersMenu = false,
  initialCustomPresets,
  initialActivePresetId,
  initialSavedFilters,
  initialActiveSavedFilterId,
  initialTypeFilter = 'all',
  initialSearchQuery,
  initialExcludeQuery,
  initialSearchFields,
  initialShowSubtasksOnFilter = false,
  initialShowSearchFieldsMenu = false,
  initialShowAdvancedPanel = false,
  initialContextMenu = null,
  initialFocusedProjectIds = [],
  initialCollapsedNodes = [],
  initialExpandedFilteredNodes = [],
  initialShowWizard = false,
  selectedEntity = null,
  onSelectEntity,
  onUpdateItem,
  onUpdateProject,
  onUpdateRelease,
  onCreateProject,
  onCreateProjectFromWizard,
  onCreateTask,
  onCreateMilestone,
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>(initialTab === 'projects' ? 'cronograma' : initialTab);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(() => new Set(initialCollapsedNodes));
  const [collapsingNodes, setCollapsingNodes] = useState<Set<string>>(() => new Set());
  const [expandingNodes, setExpandingNodes] = useState<Set<string>>(() => new Set());
  const [expandedSubtaskNotesProjects, setExpandedSubtaskNotesProjects] = useState<Set<string>>(
    () => new Set()
  );
  const collapseTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [expandedFilteredNodes, setExpandedFilteredNodes] = useState<Set<string>>(
    () => new Set(initialExpandedFilteredNodes)
  );

  useEffect(() => {
    const timers = collapseTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);
  const isFirstFilterRenderRef = useRef(true);
  const [showFormatColumnsMenu, setShowFormatColumnsMenu] = useState<boolean>(
    initialShowFormatMenu || initialShowColumnsMenu
  );
  const [formatColumnsTab, setFormatColumnsTab] = useState<'format' | 'columns'>(
    initialShowColumnsMenu && !initialShowFormatMenu ? 'columns' : 'format'
  );
  const formatColumnsMenuRef = useRef<HTMLDivElement>(null);
  const [focusedProjectIds, setFocusedProjectIds] = useState<string[]>(initialFocusedProjectIds);
  const [wizardOpen, setWizardOpen] = useState<boolean>(initialShowWizard);
  const [commentsDrawerTarget, setCommentsDrawerTarget] = useState<{
    entityType: 'project' | 'item';
    id: string;
    code?: string;
    defaultScope?: 'all' | 'own';
  } | null>(null);
  const [wizardInitialReleaseId, setWizardInitialReleaseId] = useState<string | undefined>(undefined);
  const [newPresetName, setNewPresetName] = useState<string>('');

  const [showSavedFiltersMenu, setShowSavedFiltersMenu] = useState<boolean>(initialShowSavedFiltersMenu);
  const savedFiltersMenuRef = useRef<HTMLDivElement>(null);
  const [newFilterName, setNewFilterName] = useState<string>('');
  const [newFilterFormatChoice, setNewFilterFormatChoice] = useState<string>('__current__');

  const [savedFilters, setSavedFilters] = useState<ReportSavedFilter[]>(() => {
    if (initialSavedFilters && Array.isArray(initialSavedFilters)) {
      return initialSavedFilters;
    }
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(REPORT_SAVED_FILTERS_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {}
    return [];
  });

  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | null>(() => {
    if (initialActiveSavedFilterId) return initialActiveSavedFilterId;
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(REPORT_ACTIVE_FILTER_KEY) : null;
    } catch {}
    return null;
  });

  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [editingFilterName, setEditingFilterName] = useState<string>('');
  const [editingFilterFormatChoice, setEditingFilterFormatChoice] = useState<string>('__keep__');

  const initialMatchedSavedFilter = initialActiveSavedFilterId
    ? savedFilters.find((f) => f.id === initialActiveSavedFilterId)
    : undefined;

  const [presetNameOverrides, setPresetNameOverrides] = useState<Record<string, string>>(() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(REPORT_PRESET_NAMES_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {}
    return {};
  });

  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState<string>('');

  const [customPresets, setCustomPresets] = useState<ReportColumnPreset[]>(() => {
    if (initialCustomPresets && Array.isArray(initialCustomPresets)) {
      return initialCustomPresets;
    }
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(REPORT_COLUMN_PRESETS_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {}
    return [];
  });

  const [activePresetByTab, setActivePresetByTab] = useState<Record<ReportTab, string>>(() => {
    const defaultMap: Record<ReportTab, string> = {
      cronograma: 'preset-all',
      projects: 'preset-all',
      releases: 'preset-releases-all',
    };
    if (initialActivePresetId) {
      defaultMap[initialTab === 'projects' ? 'cronograma' : initialTab] = initialActivePresetId;
      return defaultMap;
    }
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(REPORT_ACTIVE_PRESET_KEY) : null;
      if (saved) {
        if (saved.startsWith('{')) {
          const parsed = JSON.parse(saved);
          return { ...defaultMap, ...parsed };
        }
        return { ...defaultMap, cronograma: saved };
      }
    } catch {}
    return defaultMap;
  });

  const [hiddenColsByTab, setHiddenColsByTab] = useState<Record<ReportTab, Record<string, boolean>>>(() => {
    try {
      if (initialMatchedSavedFilter && initialMatchedSavedFilter.formatPresetId !== '__none__') {
        const linkedPresetId = initialMatchedSavedFilter.formatPresetId;
        const cronoPresets = [...DEFAULT_COLUMN_PRESETS, ...(initialCustomPresets || [])];
        const linkedPreset =
          linkedPresetId && linkedPresetId !== '__current__'
            ? cronoPresets.find((p) => p.id === linkedPresetId)
            : undefined;
        const keys = linkedPreset ? linkedPreset.visibleColKeys : initialMatchedSavedFilter.visibleColKeys;
        if (keys && keys.length > 0) {
          const visibleSet = new Set(keys);
          const hiddenMap: Record<string, boolean> = {};
          for (const col of COLUMNS_BY_TAB.cronograma) {
            if (!visibleSet.has(col.key)) {
              hiddenMap[col.key] = true;
            }
          }
          return { cronograma: hiddenMap, projects: {}, releases: {} };
        }
      }
      if (!initialActivePresetId) {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(REPORT_HIDDEN_COLS_KEY) : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            cronograma: parsed.cronograma || {},
            projects: parsed.projects || {},
            releases: parsed.releases || {},
          };
        }
      }
      const targetPresetId = initialActivePresetId || (typeof localStorage !== 'undefined' ? localStorage.getItem(REPORT_ACTIVE_PRESET_KEY) : null);
      if (targetPresetId && targetPresetId !== 'preset-all' && targetPresetId !== 'custom') {
        let custom: ReportColumnPreset[] = initialCustomPresets || [];
        if (custom.length === 0) {
          try {
            const savedCustom = localStorage.getItem(REPORT_COLUMN_PRESETS_KEY);
            if (savedCustom) custom = JSON.parse(savedCustom);
          } catch {}
        }
        const preset = [...DEFAULT_COLUMN_PRESETS, ...custom].find((p) => p.id === targetPresetId);
        if (preset) {
          const visibleSet = new Set(preset.visibleColKeys);
          const hiddenMap: Record<string, boolean> = {};
          for (const col of (COLUMNS_BY_TAB[preset.tab] || [])) {
            if (!visibleSet.has(col.key)) {
              hiddenMap[col.key] = true;
            }
          }
          return {
            cronograma: preset.tab === 'cronograma' ? hiddenMap : {},
            projects: preset.tab === 'projects' ? hiddenMap : {},
            releases: preset.tab === 'releases' ? hiddenMap : {},
          };
        }
      }
    } catch {}
    return { cronograma: {}, projects: {}, releases: {} };
  });

  const [colWidthsByTab, setColWidthsByTab] = useState<Record<ReportTab, Record<string, number>>>(() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(REPORT_COL_WIDTHS_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          cronograma: parsed.cronograma || {},
          projects: parsed.projects || {},
          releases: parsed.releases || {},
        };
      }
    } catch {}
    return { cronograma: {}, projects: {}, releases: {} };
  });

  const [colOrderByTab, setColOrderByTab] = useState<Record<ReportTab, string[]>>(() => {
    const defaults: Record<ReportTab, string[]> = {
      cronograma: CRONO_COLUMNS.map((c) => c.key),
      projects: PROJECT_COLUMNS.map((c) => c.key),
      releases: RELEASE_COLUMNS.map((c) => c.key),
    };
    try {
      if (initialMatchedSavedFilter && initialMatchedSavedFilter.formatPresetId !== '__none__') {
        const linkedPresetId = initialMatchedSavedFilter.formatPresetId;
        const cronoPresets = [...DEFAULT_COLUMN_PRESETS, ...(initialCustomPresets || [])];
        const linkedPreset =
          linkedPresetId && linkedPresetId !== '__current__'
            ? cronoPresets.find((p) => p.id === linkedPresetId)
            : undefined;
        const orderKeys = linkedPreset?.colOrder || initialMatchedSavedFilter.colOrder;
        if (orderKeys && orderKeys.length > 0) {
          return {
            ...defaults,
            cronograma: computeColOrderFromPreset('cronograma', {
              id: 'init',
              name: 'init',
              tab: 'cronograma',
              visibleColKeys: linkedPreset ? linkedPreset.visibleColKeys : (initialMatchedSavedFilter.visibleColKeys || []),
              colOrder: orderKeys,
            }),
          };
        }
      }
      if (!initialActivePresetId) {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(REPORT_COL_ORDER_KEY) : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          const mergeOrder = (tab: ReportTab): string[] => {
            const base = Array.isArray(parsed[tab]) ? parsed[tab] : [];
            const validKeys = new Set(defaults[tab]);
            const kept = base.filter((k: string) => validKeys.has(k));
            const missing = defaults[tab].filter((k) => !kept.includes(k));
            return [...kept, ...missing];
          };
          return {
            cronograma: mergeOrder('cronograma'),
            projects: mergeOrder('projects'),
            releases: mergeOrder('releases'),
          };
        }
      }
      const targetPresetId = initialActivePresetId || (typeof localStorage !== 'undefined' ? localStorage.getItem(REPORT_ACTIVE_PRESET_KEY) : null);
      if (targetPresetId && targetPresetId !== 'custom') {
        let custom: ReportColumnPreset[] = initialCustomPresets || [];
        if (custom.length === 0) {
          try {
            const savedCustom = localStorage.getItem(REPORT_COLUMN_PRESETS_KEY);
            if (savedCustom) custom = JSON.parse(savedCustom);
          } catch {}
        }
        const preset = [...DEFAULT_COLUMN_PRESETS, ...custom].find((p) => p.id === targetPresetId);
        if (preset && preset.colOrder && Array.isArray(preset.colOrder)) {
          return {
            ...defaults,
            [preset.tab]: computeColOrderFromPreset(preset.tab, preset),
          };
        }
      }
    } catch {}
    return defaults;
  });
  const [draggingCol, setDraggingCol] = useState<{ tab: ReportTab; key: string } | null>(null);
  const [dragOverColKey, setDragOverColKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(
    initialSearchQuery !== undefined ? initialSearchQuery : (initialMatchedSavedFilter?.searchQuery ?? '')
  );
  const [excludeQuery, setExcludeQuery] = useState(
    initialExcludeQuery !== undefined ? initialExcludeQuery : (initialMatchedSavedFilter?.excludeQuery ?? '')
  );
  const [searchFields, setSearchFields] = useState<GanttSearchFieldsConfig>(() => ({
    ...DEFAULT_GANTT_SEARCH_FIELDS,
    ...(initialMatchedSavedFilter?.searchFields || {}),
    ...(initialSearchFields || {}),
  }));
  const [showSubtasksOnFilter, setShowSubtasksOnFilter] = useState<boolean>(
    initialShowSubtasksOnFilter || Boolean(initialMatchedSavedFilter?.showSubtasksOnFilter)
  );
  const [selectedType, setSelectedType] = useState<ReportRowTypeFilter>(
    initialTypeFilter !== 'all' ? initialTypeFilter : (initialMatchedSavedFilter?.selectedType ?? 'all')
  );
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | ProjectPlatform>(
    initialMatchedSavedFilter?.selectedPlatform ?? 'all'
  );
  const [selectedAlert, setSelectedAlert] = useState<'all' | ProjectAlertLevel>(
    initialMatchedSavedFilter?.selectedAlert ?? 'all'
  );
  const [selectedRelease, setSelectedRelease] = useState<string>(
    initialMatchedSavedFilter?.selectedRelease ?? 'all'
  );
  const [selectedTeam, setSelectedTeam] = useState<string>(
    initialMatchedSavedFilter?.selectedTeam ?? 'all'
  );
  const [selectedTag, setSelectedTag] = useState<string>(
    initialMatchedSavedFilter?.selectedTag ?? 'all'
  );
  const availableTeams = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const t = it.assignee?.trim();
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [items]);
  const availableTags = useMemo(() => collectAllTags(projects, items), [projects, items]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ReportRowContextMenuState | null>(initialContextMenu);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const openRowContextMenu = (
    e: React.MouseEvent,
    payload: Omit<ReportRowContextMenuState, 'x' | 'y'>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 240;
    const menuHeight = 220;
    const maxX = typeof window !== 'undefined' ? Math.max(8, window.innerWidth - menuWidth - 8) : e.clientX;
    const maxY = typeof window !== 'undefined' ? Math.max(8, window.innerHeight - menuHeight - 8) : e.clientY;
    setContextMenu({
      ...payload,
      x: Math.min(e.clientX, maxX),
      y: Math.min(e.clientY, maxY),
    });
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
      if (
        formatColumnsMenuRef.current &&
        !formatColumnsMenuRef.current.contains(e.target as Node)
      ) {
        setShowFormatColumnsMenu(false);
      }
      if (
        savedFiltersMenuRef.current &&
        !savedFiltersMenuRef.current.contains(e.target as Node)
      ) {
        setShowSavedFiltersMenu(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setShowFormatColumnsMenu(false);
        setShowSavedFiltersMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isColVisible = (tab: ReportTab, key: string): boolean => {
    return !hiddenColsByTab[tab]?.[key];
  };

  const getOrderedColumns = (tab: ReportTab): ReportColumnDef[] => {
    const defs = COLUMNS_BY_TAB[tab];
    const order = colOrderByTab[tab] || [];
    const byKey = new Map(defs.map((c) => [c.key, c]));
    const ordered: ReportColumnDef[] = [];
    for (const k of order) {
      const def = byKey.get(k);
      if (def) {
        ordered.push(def);
        byKey.delete(k);
      }
    }
    for (const rem of byKey.values()) {
      ordered.push(rem);
    }
    return ordered;
  };

  const defaultPresetsForTab = DEFAULT_COLUMN_PRESETS.filter((p) => p.tab === activeTab);
  const customPresetsForTab = customPresets.filter((p) => (p.tab || 'cronograma') === activeTab);
  const allPresetsForTab = [...defaultPresetsForTab, ...customPresetsForTab];

  const currentVisibleColKeysInOrder = getOrderedColumns(activeTab)
    .filter((c) => isColVisible(activeTab, c.key))
    .map((c) => c.key);

  const doesPresetMatchLayout = (
    tab: ReportTab,
    preset: ReportColumnPreset,
    visibleColsInOrder: string[]
  ): boolean => {
    if (preset.visibleColKeys.length !== visibleColsInOrder.length) return false;
    const set = new Set(preset.visibleColKeys);
    if (!visibleColsInOrder.every((k) => set.has(k))) return false;
    if (preset.colOrder && Array.isArray(preset.colOrder) && preset.colOrder.length > 0) {
      const expectedVisibleOrder = computeColOrderFromPreset(tab, preset).filter((k) => set.has(k));
      if (expectedVisibleOrder.length !== visibleColsInOrder.length) return false;
      return expectedVisibleOrder.every((k, idx) => k === visibleColsInOrder[idx]);
    }
    return true;
  };

  const activePresetId = useMemo(() => {
    const preferredId = activePresetByTab[activeTab];
    if (preferredId && preferredId !== 'custom') {
      const found = allPresetsForTab.find((p) => p.id === preferredId);
      if (found && doesPresetMatchLayout(activeTab, found, currentVisibleColKeysInOrder)) {
        return found.id;
      }
    }

    const matched = allPresetsForTab.find((p) =>
      doesPresetMatchLayout(activeTab, p, currentVisibleColKeysInOrder)
    );
    if (matched) return matched.id;

    return 'custom';
  }, [activeTab, activePresetByTab, allPresetsForTab, currentVisibleColKeysInOrder]);

  const getPresetDisplayName = (preset: ReportColumnPreset) => {
    return presetNameOverrides[preset.id] || preset.name;
  };

  const activePreset = allPresetsForTab.find((p) => p.id === activePresetId);
  let activePresetDisplayName = 'Personalizado';
  if (activePreset) {
    if (presetNameOverrides[activePreset.id]) {
      activePresetDisplayName = presetNameOverrides[activePreset.id];
    } else if (activePreset.id === 'preset-all' || activePreset.id === 'preset-releases-all') {
      activePresetDisplayName = 'Completo';
    } else {
      activePresetDisplayName = activePreset.name.replace(/^Formato\s+/i, '');
    }
  }

  const startRenamePreset = (preset: ReportColumnPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPresetId(preset.id);
    setEditingPresetName(getPresetDisplayName(preset));
  };

  const handleSaveRename = (presetId: string) => {
    const trimmed = editingPresetName.trim();
    if (trimmed) {
      const nextOverrides = { ...presetNameOverrides, [presetId]: trimmed };
      setPresetNameOverrides(nextOverrides);
      try {
        localStorage.setItem(REPORT_PRESET_NAMES_KEY, JSON.stringify(nextOverrides));
      } catch {}

      const nextCustom = customPresets.map((p) =>
        p.id === presetId ? { ...p, name: trimmed } : p
      );
      if (nextCustom.some((p) => p.id === presetId)) {
        setCustomPresets(nextCustom);
        try {
          localStorage.setItem(REPORT_COLUMN_PRESETS_KEY, JSON.stringify(nextCustom));
        } catch {}
      }

      setToastMessage(`Formato renombrado a "${trimmed}".`);
      setTimeout(() => setToastMessage(null), 3000);
    }
    setEditingPresetId(null);
    setEditingPresetName('');
  };

  const handleCancelRename = () => {
    setEditingPresetId(null);
    setEditingPresetName('');
  };

  const applyPreset = (preset: ReportColumnPreset) => {
    const visibleSet = new Set(preset.visibleColKeys);
    const newHidden: Record<string, boolean> = {};
    for (const col of COLUMNS_BY_TAB[preset.tab] || []) {
      if (!visibleSet.has(col.key)) {
        newHidden[col.key] = true;
      }
    }
    setHiddenColsByTab((prev) => {
      const next = { ...prev, [preset.tab]: newHidden };
      try {
        localStorage.setItem(REPORT_HIDDEN_COLS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    const nextOrder = computeColOrderFromPreset(preset.tab, preset);
    setColOrderByTab((prev) => {
      const next = { ...prev, [preset.tab]: nextOrder };
      try {
        localStorage.setItem(REPORT_COL_ORDER_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setActivePresetByTab((prev) => {
      const next = { ...prev, [preset.tab]: preset.id };
      try {
        localStorage.setItem(REPORT_ACTIVE_PRESET_KEY, preset.id);
      } catch {}
      return next;
    });
    setShowFormatColumnsMenu(false);
  };

  const handleSavePreset = () => {
    const trimmed = newPresetName.trim();
    if (!trimmed) return;
    const orderedCols = getOrderedColumns(activeTab);
    const currentOrder = orderedCols.map((c) => c.key);
    const currentVisible = orderedCols
      .filter((c) => isColVisible(activeTab, c.key))
      .map((c) => c.key);

    const existingIndex = customPresets.findIndex(
      (p) => (p.tab || 'cronograma') === activeTab && p.name.toLowerCase() === trimmed.toLowerCase()
    );

    let savedId: string;
    let nextCustom: ReportColumnPreset[];

    if (existingIndex >= 0) {
      savedId = customPresets[existingIndex].id;
      nextCustom = customPresets.map((p, idx) =>
        idx === existingIndex
          ? { ...p, visibleColKeys: currentVisible, colOrder: currentOrder }
          : p
      );
    } else {
      savedId = `preset-custom-${Date.now()}`;
      const newPreset: ReportColumnPreset = {
        id: savedId,
        name: trimmed,
        tab: activeTab,
        visibleColKeys: currentVisible,
        colOrder: currentOrder,
        isCustom: true,
      };
      nextCustom = [...customPresets, newPreset];
    }

    setCustomPresets(nextCustom);
    try {
      localStorage.setItem(REPORT_COLUMN_PRESETS_KEY, JSON.stringify(nextCustom));
    } catch {}

    setActivePresetByTab((prev) => {
      const next = { ...prev, [activeTab]: savedId };
      try {
        localStorage.setItem(REPORT_ACTIVE_PRESET_KEY, savedId);
      } catch {}
      return next;
    });

    setNewPresetName('');
    setToastMessage(`Formato "${trimmed}" guardado correctamente.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeletePreset = (presetId: string) => {
    const nextCustom = customPresets.filter((p) => p.id !== presetId);
    setCustomPresets(nextCustom);
    try {
      localStorage.setItem(REPORT_COLUMN_PRESETS_KEY, JSON.stringify(nextCustom));
    } catch {}
    if (presetNameOverrides[presetId]) {
      const nextOverrides = { ...presetNameOverrides };
      delete nextOverrides[presetId];
      setPresetNameOverrides(nextOverrides);
      try {
        localStorage.setItem(REPORT_PRESET_NAMES_KEY, JSON.stringify(nextOverrides));
      } catch {}
    }
    if (activePresetId === presetId) {
      const fallbackPreset = DEFAULT_COLUMN_PRESETS.find((p) => p.tab === activeTab) || DEFAULT_COLUMN_PRESETS[0];
      applyPreset(fallbackPreset);
    }
    setToastMessage('Formato personalizado eliminado.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const cronoPresetsList = [
    ...DEFAULT_COLUMN_PRESETS.filter((p) => p.tab === 'cronograma'),
    ...customPresets.filter((p) => (p.tab || 'cronograma') === 'cronograma'),
  ];

  const activeSavedFilter = useMemo(() => {
    if (!activeSavedFilterId) return undefined;
    const found = savedFilters.find((f) => f.id === activeSavedFilterId);
    if (!found) return undefined;
    const criteriaMatch =
      found.searchQuery === searchQuery &&
      found.selectedType === selectedType &&
      found.selectedPlatform === selectedPlatform &&
      found.selectedAlert === selectedAlert &&
      found.selectedRelease === selectedRelease;
    return criteriaMatch ? found : undefined;
  }, [activeSavedFilterId, savedFilters, searchQuery, selectedType, selectedPlatform, selectedAlert, selectedRelease]);

  const applyCustomColumnSnapshot = (tab: ReportTab, visibleColKeys: string[], colOrder?: string[]) => {
    const visibleSet = new Set(visibleColKeys);
    const newHidden: Record<string, boolean> = {};
    for (const col of COLUMNS_BY_TAB[tab] || []) {
      if (!visibleSet.has(col.key)) {
        newHidden[col.key] = true;
      }
    }
    setHiddenColsByTab((prev) => {
      const next = { ...prev, [tab]: newHidden };
      try {
        localStorage.setItem(REPORT_HIDDEN_COLS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    if (colOrder && colOrder.length > 0) {
      const mergedOrder = computeColOrderFromPreset(tab, {
        id: 'snapshot',
        name: 'snapshot',
        tab,
        visibleColKeys,
        colOrder,
      });
      setColOrderByTab((prev) => {
        const next = { ...prev, [tab]: mergedOrder };
        try {
          localStorage.setItem(REPORT_COL_ORDER_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    }
    setActivePresetByTab((prev) => {
      const next = { ...prev, [tab]: 'custom' };
      try {
        localStorage.setItem(REPORT_ACTIVE_PRESET_KEY, 'custom');
      } catch {}
      return next;
    });
  };

  const getSavedFilterFormatLabel = (filter: ReportSavedFilter): string => {
    if (filter.formatPresetId === '__none__') return 'Sin formato fijo';
    if (filter.formatPresetId && filter.formatPresetId !== '__current__') {
      const linked = cronoPresetsList.find((p) => p.id === filter.formatPresetId);
      if (linked) {
        return getPresetDisplayName(linked).replace(/^Formato\s+/i, '');
      }
    }
    if (filter.formatLabel) return filter.formatLabel;
    if (filter.visibleColKeys && filter.visibleColKeys.length > 0) {
      return `${filter.visibleColKeys.length} cols`;
    }
    return 'Formato actual';
  };

  const applySavedFilter = (filter: ReportSavedFilter) => {
    setSearchQuery(filter.searchQuery ?? '');
    setExcludeQuery(filter.excludeQuery ?? '');
    setSearchFields(filter.searchFields ? { ...DEFAULT_GANTT_SEARCH_FIELDS, ...filter.searchFields } : { ...DEFAULT_GANTT_SEARCH_FIELDS });
    setShowSubtasksOnFilter(Boolean(filter.showSubtasksOnFilter));
    setSelectedType(filter.selectedType ?? 'all');
    setSelectedPlatform(filter.selectedPlatform ?? 'all');
    setSelectedAlert(filter.selectedAlert ?? 'all');
    setSelectedRelease(filter.selectedRelease ?? 'all');
    setSelectedTeam(filter.selectedTeam ?? 'all');
    setSelectedTag(filter.selectedTag ?? 'all');

    if (filter.formatPresetId && filter.formatPresetId !== '__none__' && filter.formatPresetId !== '__current__') {
      const matchedPreset = cronoPresetsList.find((p) => p.id === filter.formatPresetId);
      if (matchedPreset) {
        applyPreset(matchedPreset);
      } else if (filter.visibleColKeys && filter.visibleColKeys.length > 0) {
        applyCustomColumnSnapshot('cronograma', filter.visibleColKeys, filter.colOrder);
      }
    } else if (filter.formatPresetId !== '__none__' && filter.visibleColKeys && filter.visibleColKeys.length > 0) {
      applyCustomColumnSnapshot('cronograma', filter.visibleColKeys, filter.colOrder);
    }

    setActiveSavedFilterId(filter.id);
    try {
      localStorage.setItem(REPORT_ACTIVE_FILTER_KEY, filter.id);
    } catch {}
    setShowSavedFiltersMenu(false);
  };

  const resolveFormatFieldsFromChoice = (
    choice: string,
    existingFilter?: ReportSavedFilter
  ): Pick<ReportSavedFilter, 'formatPresetId' | 'visibleColKeys' | 'colOrder' | 'formatLabel'> => {
    if (choice === '__keep__' && existingFilter) {
      return {
        formatPresetId: existingFilter.formatPresetId,
        visibleColKeys: existingFilter.visibleColKeys,
        colOrder: existingFilter.colOrder,
        formatLabel: existingFilter.formatLabel,
      };
    }
    if (choice === '__none__') {
      return {
        formatPresetId: '__none__',
        visibleColKeys: undefined,
        colOrder: undefined,
        formatLabel: 'Sin formato fijo',
      };
    }
    if (choice === '__current__') {
      const cronoOrdered = getOrderedColumns('cronograma');
      const currentOrder = cronoOrdered.map((c) => c.key);
      const currentVisible = cronoOrdered
        .filter((c) => isColVisible('cronograma', c.key))
        .map((c) => c.key);
      return {
        formatPresetId: '__current__',
        visibleColKeys: currentVisible,
        colOrder: currentOrder,
        formatLabel: `${currentVisible.length} cols`,
      };
    }
    const chosen = cronoPresetsList.find((p) => p.id === choice);
    if (chosen) {
      return {
        formatPresetId: chosen.id,
        visibleColKeys: [...chosen.visibleColKeys],
        colOrder: chosen.colOrder ? [...chosen.colOrder] : undefined,
        formatLabel: getPresetDisplayName(chosen).replace(/^Formato\s+/i, ''),
      };
    }
    return {
      formatPresetId: '__none__',
      visibleColKeys: undefined,
      colOrder: undefined,
      formatLabel: 'Sin formato fijo',
    };
  };

  const handleSaveFilter = () => {
    const trimmed = newFilterName.trim();
    if (!trimmed) return;

    const formatFields = resolveFormatFieldsFromChoice(newFilterFormatChoice);
    const existingIdx = savedFilters.findIndex(
      (f) => f.name.toLowerCase() === trimmed.toLowerCase()
    );
    let savedId: string;
    let nextFilters: ReportSavedFilter[];

    if (existingIdx >= 0) {
      savedId = savedFilters[existingIdx].id;
      nextFilters = savedFilters.map((f, idx) =>
        idx === existingIdx
          ? {
              ...f,
              name: trimmed,
              searchQuery,
              excludeQuery,
              searchFields: { ...searchFields },
              showSubtasksOnFilter,
              selectedType,
              selectedPlatform,
              selectedAlert,
              selectedRelease,
              selectedTeam,
              selectedTag,
              ...formatFields,
            }
          : f
      );
    } else {
      const created = createSavedFilter({
        name: trimmed,
        searchQuery,
        excludeQuery,
        searchFields: { ...searchFields },
        showSubtasksOnFilter,
        selectedType,
        selectedPlatform,
        selectedAlert,
        selectedRelease,
        ...formatFields,
      });
      savedId = created.id;
      nextFilters = [...savedFilters, created];
    }

    setSavedFilters(nextFilters);
    try {
      localStorage.setItem(REPORT_SAVED_FILTERS_KEY, JSON.stringify(nextFilters));
    } catch {}

    setActiveSavedFilterId(savedId);
    try {
      localStorage.setItem(REPORT_ACTIVE_FILTER_KEY, savedId);
    } catch {}

    setNewFilterName('');
    setToastMessage(`Filtro "${trimmed}" guardado correctamente.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveExternalSavedFilter = (name: string, existingId?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const formatFields = resolveFormatFieldsFromChoice('__current__');
    const targetIdx = existingId
      ? savedFilters.findIndex((f) => f.id === existingId)
      : savedFilters.findIndex((f) => f.name.toLowerCase() === trimmed.toLowerCase());

    let savedId: string;
    let nextFilters: ReportSavedFilter[];
    if (targetIdx >= 0) {
      savedId = savedFilters[targetIdx].id;
      nextFilters = savedFilters.map((f, idx) =>
        idx === targetIdx
          ? {
              ...f,
              name: trimmed,
              searchQuery,
              excludeQuery,
              searchFields: { ...searchFields },
              showSubtasksOnFilter,
              selectedType,
              selectedPlatform,
              selectedAlert,
              selectedRelease,
              selectedTeam,
              selectedTag,
              ...formatFields,
            }
          : f
      );
    } else {
      const created = createSavedFilter({
        name: trimmed,
        searchQuery,
        excludeQuery,
        searchFields: { ...searchFields },
        showSubtasksOnFilter,
        selectedType,
        selectedPlatform,
        selectedAlert,
        selectedRelease,
        ...formatFields,
      });
      savedId = created.id;
      nextFilters = [...savedFilters, created];
    }

    setSavedFilters(nextFilters);
    try {
      localStorage.setItem(REPORT_SAVED_FILTERS_KEY, JSON.stringify(nextFilters));
    } catch {}
    setActiveSavedFilterId(savedId);
    try {
      localStorage.setItem(REPORT_ACTIVE_FILTER_KEY, savedId);
    } catch {}
    setToastMessage(`Filtro "${trimmed}" guardado con criterios y columnas.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const startRenameSavedFilter = (filter: ReportSavedFilter, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFilterId(filter.id);
    setEditingFilterName(filter.name);
    setEditingFilterFormatChoice('__keep__');
  };

  const handleSaveFilterRename = (filterId: string) => {
    const trimmed = editingFilterName.trim();
    if (trimmed) {
      const target = savedFilters.find((f) => f.id === filterId);
      const formatFields = resolveFormatFieldsFromChoice(editingFilterFormatChoice, target);
      const nextFilters = savedFilters.map((f) =>
        f.id === filterId
          ? {
              ...f,
              name: trimmed,
              ...formatFields,
            }
          : f
      );
      setSavedFilters(nextFilters);
      try {
        localStorage.setItem(REPORT_SAVED_FILTERS_KEY, JSON.stringify(nextFilters));
      } catch {}
      setToastMessage(`Filtro actualizado a "${trimmed}".`);
      setTimeout(() => setToastMessage(null), 3000);
    }
    setEditingFilterId(null);
    setEditingFilterName('');
    setEditingFilterFormatChoice('__keep__');
  };

  const handleCancelFilterRename = () => {
    setEditingFilterId(null);
    setEditingFilterName('');
    setEditingFilterFormatChoice('__keep__');
  };

  const handleDeleteSavedFilter = (filterId: string) => {
    const nextFilters = savedFilters.filter((f) => f.id !== filterId);
    setSavedFilters(nextFilters);
    try {
      localStorage.setItem(REPORT_SAVED_FILTERS_KEY, JSON.stringify(nextFilters));
    } catch {}
    if (activeSavedFilterId === filterId) {
      setActiveSavedFilterId(null);
      try {
        localStorage.removeItem(REPORT_ACTIVE_FILTER_KEY);
      } catch {}
    }
    setToastMessage('Filtro guardado eliminado.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleReportCol = (tab: ReportTab, key: string) => {
    setHiddenColsByTab((prev) => {
      const tabHidden = { ...(prev[tab] || {}) };
      const allCols = COLUMNS_BY_TAB[tab] || [];
      const currentlyHidden = Boolean(tabHidden[key]);
      if (!currentlyHidden) {
        const visibleCount = allCols.filter((c) => !tabHidden[c.key]).length;
        if (visibleCount <= 1) return prev; // Keep at least 1 column visible
        tabHidden[key] = true;
      } else {
        delete tabHidden[key];
      }
      const next = { ...prev, [tab]: tabHidden };
      try {
        localStorage.setItem(REPORT_HIDDEN_COLS_KEY, JSON.stringify(next));
      } catch {}

      const currentVisibleInOrder = getOrderedColumns(tab)
        .filter((c) => !tabHidden[c.key])
        .map((c) => c.key);
      const allPresets = [
        ...DEFAULT_COLUMN_PRESETS.filter((p) => p.tab === tab),
        ...customPresets.filter((p) => (p.tab || 'cronograma') === tab),
      ];
      const matched = allPresets.find((p) =>
        doesPresetMatchLayout(tab, p, currentVisibleInOrder)
      );
      const newPresetId = matched ? matched.id : 'custom';
      setActivePresetByTab((old) => {
        const updated = { ...old, [tab]: newPresetId };
        try {
          localStorage.setItem(REPORT_ACTIVE_PRESET_KEY, newPresetId);
        } catch {}
        return updated;
      });

      return next;
    });
  };

  const resetReportCols = (tab: ReportTab) => {
    setHiddenColsByTab((prev) => {
      const next = { ...prev, [tab]: {} };
      try {
        localStorage.setItem(REPORT_HIDDEN_COLS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setColOrderByTab((prev) => {
      const next = { ...prev, [tab]: (COLUMNS_BY_TAB[tab] || []).map((c) => c.key) };
      try {
        localStorage.setItem(REPORT_COL_ORDER_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    const defaultAllPreset = DEFAULT_COLUMN_PRESETS.find((p) => p.tab === tab && (p.id === 'preset-all' || p.id === 'preset-releases-all'));
    const allId = defaultAllPreset ? defaultAllPreset.id : 'preset-all';
    setActivePresetByTab((prev) => {
      const next = { ...prev, [tab]: allId };
      try {
        localStorage.setItem(REPORT_ACTIVE_PRESET_KEY, allId);
      } catch {}
      return next;
    });
  };

  const reorderReportCols = (tab: ReportTab, fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;
    setColOrderByTab((prev) => {
      const current = getOrderedColumns(tab).map((c) => c.key);
      const fromIdx = current.indexOf(fromKey);
      const toIdx = current.indexOf(toKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const nextOrder = [...current];
      const [moved] = nextOrder.splice(fromIdx, 1);
      nextOrder.splice(toIdx, 0, moved);
      const next = { ...prev, [tab]: nextOrder };
      try {
        localStorage.setItem(REPORT_COL_ORDER_KEY, JSON.stringify(next));
      } catch {}

      const tabHidden = hiddenColsByTab[tab] || {};
      const nextVisibleInOrder = nextOrder.filter((k) => !tabHidden[k]);
      const allPresets = [
        ...DEFAULT_COLUMN_PRESETS.filter((p) => p.tab === tab),
        ...customPresets.filter((p) => (p.tab || 'cronograma') === tab),
      ];
      const matched = allPresets.find((p) =>
        doesPresetMatchLayout(tab, p, nextVisibleInOrder)
      );
      const newPresetId = matched ? matched.id : 'custom';
      setActivePresetByTab((old) => {
        const updated = { ...old, [tab]: newPresetId };
        try {
          localStorage.setItem(REPORT_ACTIVE_PRESET_KEY, newPresetId);
        } catch {}
        return updated;
      });

      return next;
    });
  };

  const itemById = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const releaseById = useMemo(() => new Map(releases.map((r) => [r.id, r])), [releases]);

  // 1. Generate full dataset for each tab
  const cronoRows = useMemo(
    () => generateCronogramaCompletoRows(releases, projects, items),
    [releases, projects, items]
  );

  const projectRows = useMemo(
    () => generateProjectSummaryRows(releases, projects, items),
    [releases, projects, items]
  );

  const releaseRows = useMemo(
    () => generateReleaseSummaryRows(releases, projects),
    [releases, projects]
  );

  const autoFitColWidths = useMemo<Record<ReportTab, Record<string, number>>>(
    () => ({
      cronograma: computeAutoFitReportColumnWidths('cronograma', cronoRows),
      projects: computeAutoFitReportColumnWidths('projects', projectRows),
      releases: computeAutoFitReportColumnWidths('releases', releaseRows),
    }),
    [cronoRows, projectRows, releaseRows]
  );

  const [expandedColToggleMap, setExpandedColToggleMap] = useState<
    Record<string, { previousWidth: number | undefined; expandedWidth: number }>
  >({});

  const getColWidth = (tab: ReportTab, col: ReportColumnDef): number => {
    return colWidthsByTab[tab]?.[col.key] ?? autoFitColWidths[tab]?.[col.key] ?? col.defaultWidth;
  };

  const toggleColWidthFullText = (tab: ReportTab, col: ReportColumnDef) => {
    const toggleKey = `${tab}:${col.key}`;
    const existing = expandedColToggleMap[toggleKey];
    const currentWidth = getColWidth(tab, col);

    if (existing && Math.abs(currentWidth - existing.expandedWidth) <= 2) {
      // Second double-click: restore previous width
      setColWidthsByTab((prev) => {
        const tabMap = { ...(prev[tab] || {}) };
        if (existing.previousWidth !== undefined) {
          tabMap[col.key] = existing.previousWidth;
        } else {
          delete tabMap[col.key];
        }
        const next = { ...prev, [tab]: tabMap };
        try {
          localStorage.setItem(REPORT_COL_WIDTHS_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      setExpandedColToggleMap((prev) => {
        const next = { ...prev };
        delete next[toggleKey];
        return next;
      });
      return;
    }

    // First double-click: save previous width and expand to fit full text
    const rowsForTab =
      tab === 'cronograma'
        ? cronoRows
        : tab === 'projects'
        ? projectRows
        : releaseRows;
    const expandedWidth = computeFullTextColumnWidth(col, rowsForTab);
    const previousCustomWidth = colWidthsByTab[tab]?.[col.key];

    setExpandedColToggleMap((prev) => ({
      ...prev,
      [toggleKey]: { previousWidth: previousCustomWidth, expandedWidth },
    }));
    setColWidthsByTab((prev) => {
      const next = {
        ...prev,
        [tab]: { ...(prev[tab] || {}), [col.key]: expandedWidth },
      };
      try {
        localStorage.setItem(REPORT_COL_WIDTHS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const startColResize = (
    e: React.MouseEvent,
    tab: ReportTab,
    key: string,
    startWidth: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    let latestWidth = startWidth;
    let didMove = false;

    const onMove = (moveEvent: MouseEvent) => {
      if (Math.abs(moveEvent.clientX - startX) > 2) didMove = true;
      latestWidth = Math.max(48, Math.min(960, Math.round(startWidth + (moveEvent.clientX - startX))));
      setColWidthsByTab((prev) => ({
        ...prev,
        [tab]: { ...(prev[tab] || {}), [key]: latestWidth },
      }));
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (typeof document !== 'undefined') {
        document.body.style.cursor = '';
      }
      if (!didMove) return;
      const toggleKey = `${tab}:${key}`;
      setExpandedColToggleMap((prev) => {
        if (!prev[toggleKey]) return prev;
        const next = { ...prev };
        delete next[toggleKey];
        return next;
      });
      setColWidthsByTab((prev) => {
        const next = {
          ...prev,
          [tab]: { ...(prev[tab] || {}), [key]: latestWidth },
        };
        try {
          localStorage.setItem(REPORT_COL_WIDTHS_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    };

    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'col-resize';
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const renderResizableTh = (
    tab: ReportTab,
    col: ReportColumnDef,
    extraClass = ''
  ) => {
    if (!isColVisible(tab, col.key)) return null;
    const width = getColWidth(tab, col);
    const alignClass =
      col.align === 'right'
        ? 'text-right'
        : col.align === 'center'
        ? 'text-center'
        : 'text-left';
    const isDragOver = draggingCol?.tab === tab && dragOverColKey === col.key;
    const isDragging = draggingCol?.tab === tab && draggingCol?.key === col.key;
    return (
      <th
        key={col.key}
        data-testid={`report-col-header-${tab}-${col.key}`}
        data-col-key={col.key}
        draggable={true}
        onDragStart={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest('[data-testid^="report-col-resizer-"]')) {
            e.preventDefault();
            return;
          }
          setDraggingCol({ tab, key: col.key });
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            try {
              e.dataTransfer.setData('text/plain', col.key);
            } catch {}
          }
        }}
        onDragOver={(e) => {
          if (draggingCol && draggingCol.tab === tab && draggingCol.key !== col.key) {
            e.preventDefault();
            if (dragOverColKey !== col.key) setDragOverColKey(col.key);
          }
        }}
        onDragLeave={() => {
          if (dragOverColKey === col.key) setDragOverColKey(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (draggingCol && draggingCol.tab === tab && draggingCol.key !== col.key) {
            reorderReportCols(tab, draggingCol.key, col.key);
          }
          setDraggingCol(null);
          setDragOverColKey(null);
        }}
        onDragEnd={() => {
          setDraggingCol(null);
          setDragOverColKey(null);
        }}
        style={{ width, minWidth: width }}
        title="Arrastra el encabezado para reordenar esta columna"
        className={`relative px-2.5 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap select-none cursor-grab active:cursor-grabbing transition-colors ${alignClass} ${extraClass} ${
          isDragging ? 'opacity-50' : ''
        } ${isDragOver ? 'border-l-2 border-l-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40' : ''}`}
      >
        <span className="truncate block pr-2">{col.label}</span>
        <div
          data-testid={`report-col-resizer-${tab}-${col.key}`}
          onMouseDown={(e) => {
            e.stopPropagation();
            startColResize(e, tab, col.key, width);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            toggleColWidthFullText(tab, col);
          }}
          title="Arrastra para redimensionar · Doble clic para expandir al texto completo o restaurar tamaño anterior"
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/60 active:bg-indigo-600 transition-colors z-10"
        />
      </th>
    );
  };

  // 2. Filter Tab 1: Cronograma Completo
  const filteredCronoRows = useMemo(() => {
    const matchesSearchQuery = (row: CronogramaReportRow, q: string): boolean => {
      if (searchFields.name && row.name.toLowerCase().includes(q)) return true;
      if (searchFields.description) {
        if (row.notes.toLowerCase().includes(q)) return true;
        if (row.latestComment && row.latestComment.toLowerCase().includes(q)) return true;
        if (row.itemId) {
          const it = items.find((x) => x.id === row.itemId);
          if (it?.statusComments?.some((c) => c.text.toLowerCase().includes(q))) return true;
        } else if (row.level === 'PROYECTO' && row.projectId) {
          const proj = projects.find((p) => p.id === row.projectId);
          if (proj?.statusComments?.some((c) => c.text.toLowerCase().includes(q))) return true;
        }
      }
      if (searchFields.assignee && row.team.toLowerCase().includes(q)) return true;
      if (searchFields.platform && row.platform.toLowerCase().includes(q)) return true;
      if (searchFields.predecessors && row.dependency.toLowerCase().includes(q)) return true;
      if (
        searchFields.displayId &&
        (row.wbsCode.toLowerCase().includes(q) || row.displayId.toLowerCase().includes(q))
      ) {
        return true;
      }
      return false;
    };

    const matchesNonReleaseRow = (row: CronogramaReportRow): boolean => {
      // Release filter
      if (selectedRelease !== 'all' && row.releaseCode !== selectedRelease) {
        return false;
      }
      // Team filter
      if (selectedTeam !== 'all') {
        const targetTeam = selectedTeam.trim().toLowerCase();
        const rowTeams = row.team
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        if (!rowTeams.includes(targetTeam)) {
          return false;
        }
      }
      // Tag filter
      if (selectedTag !== 'all') {
        const targetTag = normalizeTag(selectedTag).toLowerCase();
        let rowTagList = row.tags || [];
        if (row.level === 'PROYECTO' && row.projectId && selectedType === 'PROYECTO') {
          const projObj = projects.find((p) => p.id === row.projectId);
          if (projObj) {
            rowTagList = collectProjectRollupTags(
              projObj,
              items.filter((it) => it.projectId === projObj.id)
            );
          }
        }
        const hasTag = rowTagList.some((t) => normalizeTag(t).toLowerCase() === targetTag);
        if (!hasTag) {
          return false;
        }
      }
      // Alert level filter
      if (selectedAlert !== 'all') {
        if (row.alertLevel !== selectedAlert) {
          return false;
        }
      }
      // Platform filter
      if (selectedPlatform !== 'all') {
        if (row.platform !== '—') {
          if (selectedPlatform === 'iOS/Android') {
            if (row.platform !== 'iOS/Android' && row.platform !== 'Multiplataforma') {
              return false;
            }
          } else if (row.platform !== selectedPlatform) {
            return false;
          }
        }
      }
      // Search query (respects selected searchFields)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!matchesSearchQuery(row, q)) {
          return false;
        }
      }
      // Exclude query ("No contiene")
      if (excludeQuery.trim()) {
        const exQ = excludeQuery.trim().toLowerCase();
        if (matchesSearchQuery(row, exQ)) {
          return false;
        }
      }
      return true;
    };

    const hasFocusFilter = focusedProjectIds.length > 0;
    const focusedProjectSet = hasFocusFilter ? new Set(focusedProjectIds) : null;
    const baseCronoRows = hasFocusFilter && focusedProjectSet
      ? (() => {
          const allowedReleaseCodes = new Set<string>();
          for (const r of cronoRows) {
            if (r.projectId && focusedProjectSet.has(r.projectId) && r.releaseCode && r.releaseCode !== '—') {
              allowedReleaseCodes.add(r.releaseCode);
            }
          }
          return cronoRows.filter((r) => {
            if (r.level === 'RELEASE') return allowedReleaseCodes.has(r.releaseCode);
            return Boolean(r.projectId && focusedProjectSet.has(r.projectId));
          });
        })()
      : cronoRows;

    const hasFilters =
      selectedType !== 'all' ||
      selectedRelease !== 'all' ||
      selectedAlert !== 'all' ||
      selectedPlatform !== 'all' ||
      Boolean(searchQuery.trim()) ||
      Boolean(excludeQuery.trim());

    if (!hasFilters) {
      return baseCronoRows;
    }

    const directlyMatchingProjectIds = new Set<string>();
    for (const r of baseCronoRows) {
      if (r.level === 'PROYECTO' && r.projectId && matchesNonReleaseRow(r)) {
        directlyMatchingProjectIds.add(r.projectId);
      }
    }

    if (selectedType !== 'all') {
      if (selectedType === 'RELEASE' && (selectedPlatform !== 'all' || selectedAlert !== 'all')) {
        const matchingReleaseCodes = new Set<string>();
        for (const r of baseCronoRows) {
          if (r.level !== 'RELEASE' && matchesNonReleaseRow(r) && r.releaseCode && r.releaseCode !== '—') {
            matchingReleaseCodes.add(r.releaseCode);
          }
        }
        return baseCronoRows.filter((row) => {
          if (row.level !== 'RELEASE') return false;
          if (selectedRelease !== 'all' && row.releaseCode !== selectedRelease) return false;
          if (!matchingReleaseCodes.has(row.releaseCode)) return false;
          if (searchQuery.trim() && !matchesNonReleaseRow(row)) return false;
          return true;
        });
      }
      return baseCronoRows.filter((row) => {
        if (row.level !== selectedType) return false;
        if (matchesNonReleaseRow(row)) return true;
        if (
          showSubtasksOnFilter &&
          (selectedType === 'TAREA' || selectedType === 'HITO') &&
          row.projectId &&
          directlyMatchingProjectIds.has(row.projectId)
        ) {
          return true;
        }
        return false;
      });
    }

    const matchingRowIds = new Set<string>();
    const matchingProjectIds = new Set<string>();
    const matchingReleaseCodes = new Set<string>();

    for (const r of baseCronoRows) {
      if (r.level !== 'RELEASE') {
        if (matchesNonReleaseRow(r)) {
          matchingRowIds.add(r.rowId);
          if (r.projectId) matchingProjectIds.add(r.projectId);
          if (r.releaseCode && r.releaseCode !== '—') matchingReleaseCodes.add(r.releaseCode);
        }
      }
    }

    return baseCronoRows.filter((row) => {
      if (row.level === 'RELEASE') {
        if (selectedRelease !== 'all' && row.releaseCode !== selectedRelease) {
          return false;
        }
        return matchingReleaseCodes.has(row.releaseCode);
      }
      if (row.level === 'PROYECTO') {
        if (matchingRowIds.has(row.rowId)) return true;
        return row.projectId ? matchingProjectIds.has(row.projectId) : false;
      }
      if (matchingRowIds.has(row.rowId)) return true;
      if (showSubtasksOnFilter && row.projectId && directlyMatchingProjectIds.has(row.projectId)) {
        return true;
      }
      return false;
    });
  }, [cronoRows, focusedProjectIds, selectedType, selectedPlatform, selectedAlert, selectedRelease, selectedTeam, selectedTag, searchQuery, excludeQuery, searchFields, showSubtasksOnFilter, projects, items]);

  // Clear per-node filtered context expansions when filter criteria change (skip initial mount)
  useEffect(() => {
    if (isFirstFilterRenderRef.current) {
      isFirstFilterRenderRef.current = false;
      return;
    }
    setExpandedFilteredNodes(new Set());
  }, [searchQuery, excludeQuery, selectedType, selectedPlatform, selectedAlert, selectedRelease, selectedTeam, selectedTag]);

  // 2b. Hierarchical tree view for Planificación:
  //     - Supports normal collapse/expand on Releases & Projects (collapse ALWAYS hides descendants)
  //     - When filters are active, lets user expand hidden children of a specific Release or Project as context (+N)
  const hasCronoFilters =
    selectedType !== 'all' ||
    selectedRelease !== 'all' ||
    selectedTeam !== 'all' ||
    selectedTag !== 'all' ||
    selectedAlert !== 'all' ||
    selectedPlatform !== 'all' ||
    Boolean(searchQuery.trim()) ||
    Boolean(excludeQuery.trim());

  const { displayedCronoRows, contextExpandedCount } = useMemo(() => {
    const hasFocusFilter = focusedProjectIds.length > 0;
    const focusedProjectSet = hasFocusFilter ? new Set(focusedProjectIds) : null;
    const baseRows =
      hasFocusFilter && focusedProjectSet
        ? (() => {
            const allowedReleaseCodes = new Set<string>();
            for (const r of cronoRows) {
              if (r.projectId && focusedProjectSet.has(r.projectId) && r.releaseCode && r.releaseCode !== '—') {
                allowedReleaseCodes.add(r.releaseCode);
              }
            }
            return cronoRows.filter((r) => {
              if (r.level === 'RELEASE') return allowedReleaseCodes.has(r.releaseCode);
              return Boolean(r.projectId && focusedProjectSet.has(r.projectId));
            });
          })()
        : cronoRows;

    const matchedRowIdSet = new Set(filteredCronoRows.map((r) => r.rowId));

    // Precompute child presence and hidden child counts per Release & Project
    const releaseProjectsMap = new Map<string, CronogramaReportRow[]>();
    const projectItemsMap = new Map<string, CronogramaReportRow[]>();
    for (const r of baseRows) {
      if (r.level === 'PROYECTO' && r.releaseCode && r.releaseCode !== '—') {
        const list = releaseProjectsMap.get(r.releaseCode) || [];
        list.push(r);
        releaseProjectsMap.set(r.releaseCode, list);
      } else if ((r.level === 'TAREA' || r.level === 'HITO') && !r.isDepRow && r.projectId) {
        const list = projectItemsMap.get(r.projectId) || [];
        list.push(r);
        projectItemsMap.set(r.projectId, list);
      }
    }

    const visible: {
      row: CronogramaReportRow;
      isContext: boolean;
      nodeKey: string | null;
      hasChildren: boolean;
      hiddenChildrenCount: number;
    }[] = [];
    let ctxCount = 0;

    for (const row of baseRows) {
      const relKey = row.releaseCode && row.releaseCode !== '—' ? `rel:${row.releaseCode}` : null;
      const projKey = row.projectId ? `proj:${row.projectId}` : null;

      // Rule 1: Collapsing a Release or Project ALWAYS hides all its descendants (matched or context)
      const hiddenByCollapsedRelease = row.level !== 'RELEASE' && relKey && collapsedNodes.has(relKey);
      const hiddenByCollapsedProject =
        (row.level === 'TAREA' || row.level === 'HITO') && projKey && collapsedNodes.has(projKey);
      if (hiddenByCollapsedRelease || hiddenByCollapsedProject) {
        continue;
      }

      let include = false;
      let isContext = false;

      if (!hasCronoFilters) {
        include = true;
      } else if (matchedRowIdSet.has(row.rowId)) {
        include = true;
      } else if (row.level === 'PROYECTO' && relKey && expandedFilteredNodes.has(relKey)) {
        include = true;
        isContext = true;
      } else if (
        (row.level === 'TAREA' || row.level === 'HITO') &&
        projKey &&
        expandedFilteredNodes.has(projKey)
      ) {
        include = true;
        isContext = true;
      }

      if (!include) continue;
      if (isContext) ctxCount += 1;

      const nodeKey = row.level === 'RELEASE' ? relKey : row.level === 'PROYECTO' ? projKey : null;
      let hasChildren = false;
      let hiddenChildrenCount = 0;

      if (row.level === 'RELEASE' && row.releaseCode) {
        const kids = releaseProjectsMap.get(row.releaseCode) || [];
        hasChildren = kids.length > 0;
        if (hasCronoFilters) {
          hiddenChildrenCount = kids.filter((k) => !matchedRowIdSet.has(k.rowId)).length;
        }
      } else if (row.level === 'PROYECTO' && row.projectId) {
        const kids = projectItemsMap.get(row.projectId) || [];
        hasChildren = kids.length > 0;
        if (hasCronoFilters) {
          hiddenChildrenCount = kids.filter((k) => !matchedRowIdSet.has(k.rowId)).length;
        }
      }

      visible.push({ row, isContext, nodeKey, hasChildren, hiddenChildrenCount });
    }

    return { displayedCronoRows: visible, contextExpandedCount: ctxCount };
  }, [cronoRows, focusedProjectIds, filteredCronoRows, hasCronoFilters, collapsedNodes, expandedFilteredNodes]);

  const triggerExpandingAnimation = (nodeKey: string) => {
    setExpandingNodes((prev) => {
      const next = new Set(prev);
      next.add(nodeKey);
      return next;
    });
    const existing = collapseTimersRef.current.get(`exp:${nodeKey}`);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      setExpandingNodes((prev) => {
        if (!prev.has(nodeKey)) return prev;
        const next = new Set(prev);
        next.delete(nodeKey);
        return next;
      });
      collapseTimersRef.current.delete(`exp:${nodeKey}`);
    }, 150);
    collapseTimersRef.current.set(`exp:${nodeKey}`, timer);
  };

  const toggleCollapseNode = (nodeKey: string) => {
    const existingCollapseTimer = collapseTimersRef.current.get(`col:${nodeKey}`);
    if (existingCollapseTimer) {
      clearTimeout(existingCollapseTimer);
      collapseTimersRef.current.delete(`col:${nodeKey}`);
    }

    if (collapsedNodes.has(nodeKey) || collapsingNodes.has(nodeKey)) {
      // Expand immediately with smooth slide-in animation (same as Cronograma)
      setCollapsingNodes((prev) => {
        if (!prev.has(nodeKey)) return prev;
        const next = new Set(prev);
        next.delete(nodeKey);
        return next;
      });
      setCollapsedNodes((prev) => {
        if (!prev.has(nodeKey)) return prev;
        const next = new Set(prev);
        next.delete(nodeKey);
        return next;
      });
      triggerExpandingAnimation(nodeKey);
      return;
    }

    // Play 120ms collapse animation before removing descendant rows (same as Cronograma)
    setCollapsingNodes((prev) => {
      const next = new Set(prev);
      next.add(nodeKey);
      return next;
    });
    const timer = setTimeout(() => {
      setCollapsedNodes((prev) => {
        const next = new Set(prev);
        next.add(nodeKey);
        return next;
      });
      setCollapsingNodes((prev) => {
        if (!prev.has(nodeKey)) return prev;
        const next = new Set(prev);
        next.delete(nodeKey);
        return next;
      });
      collapseTimersRef.current.delete(`col:${nodeKey}`);
    }, 120);
    collapseTimersRef.current.set(`col:${nodeKey}`, timer);
  };

  const toggleExpandFilteredNode = (nodeKey: string) => {
    const isShowing = expandedFilteredNodes.has(nodeKey) && !collapsedNodes.has(nodeKey);
    setExpandedFilteredNodes((prev) => {
      const next = new Set(prev);
      if (isShowing) next.delete(nodeKey);
      else next.add(nodeKey);
      return next;
    });
    if (!isShowing) {
      setCollapsedNodes((prev) => {
        if (!prev.has(nodeKey)) return prev;
        const next = new Set(prev);
        next.delete(nodeKey);
        return next;
      });
      triggerExpandingAnimation(nodeKey);
    }
  };

  // 3. Filter Tab 2: Resumen Proyectos
  const filteredProjectRows = useMemo(() => {
    const matchesProjectText = (row: ProjectSummaryReportRow, q: string): boolean =>
      (searchFields.name && row.projectName.toLowerCase().includes(q)) ||
      (searchFields.displayId && row.code.toLowerCase().includes(q)) ||
      (searchFields.description && row.description.toLowerCase().includes(q)) ||
      (searchFields.platform && row.platform.toLowerCase().includes(q)) ||
      (searchFields.assignee && row.team.toLowerCase().includes(q));

    return projectRows.filter((row) => {
      if (selectedPlatform !== 'all') {
        if (selectedPlatform === 'iOS/Android') {
          if (row.platform !== 'iOS/Android' && row.platform !== 'Multiplataforma') {
            return false;
          }
        } else if (row.platform !== selectedPlatform) {
          return false;
        }
      }
      if (selectedAlert !== 'all' && row.alertLevel !== selectedAlert) {
        return false;
      }
      if (selectedRelease !== 'all' && row.releaseCode !== selectedRelease) {
        return false;
      }
      if (searchQuery.trim() && !matchesProjectText(row, searchQuery.trim().toLowerCase())) {
        return false;
      }
      if (excludeQuery.trim() && matchesProjectText(row, excludeQuery.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [projectRows, selectedPlatform, selectedAlert, selectedRelease, searchQuery, excludeQuery, searchFields]);

  // 4. Filter Tab 3: Catálogo Releases
  const filteredReleaseRows = useMemo(() => {
    const matchesReleaseText = (row: ReleaseSummaryReportRow, q: string): boolean =>
      (searchFields.name &&
        (row.name.toLowerCase().includes(q) || row.code.toLowerCase().includes(q))) ||
      (searchFields.displayId && row.code.toLowerCase().includes(q)) ||
      (searchFields.description &&
        (row.assignedProjects.toLowerCase().includes(q) ||
          row.month.toLowerCase().includes(q))) ||
      (searchFields.platform &&
        Boolean(row.platforms?.some((pl) => pl.toLowerCase().includes(q))));

    return releaseRows.filter((row) => {
      if (selectedRelease !== 'all' && row.code !== selectedRelease) {
        return false;
      }
      if (selectedPlatform !== 'all') {
        const plats = row.platforms || [];
        if (selectedPlatform === 'iOS/Android') {
          const hasMulti = plats.some((p) => p === 'iOS/Android' || p === 'Multiplataforma');
          if (!hasMulti) return false;
        } else {
          if (!plats.includes(selectedPlatform)) return false;
        }
      }
      if (selectedAlert !== 'all') {
        const alerts = row.alertLevels || [];
        if (!alerts.includes(selectedAlert)) return false;
      }
      if (searchQuery.trim() && !matchesReleaseText(row, searchQuery.trim().toLowerCase())) {
        return false;
      }
      if (excludeQuery.trim() && matchesReleaseText(row, excludeQuery.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [releaseRows, selectedPlatform, selectedAlert, selectedRelease, searchQuery, excludeQuery, searchFields]);

  const handleDownloadExcel = () => {
    try {
      downloadGanttExcelFile(releases, projects, items, undefined, {
        rollupProjectSubtasks: selectedType === 'PROYECTO' && !showSubtasksOnFilter,
      });
      setToastMessage('Archivo Excel descargado correctamente (Informe Planificación y Catálogo Releases).');
      setTimeout(() => setToastMessage(null), 3500);
    } catch {
      setToastMessage('Error al generar el archivo Excel.');
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  return (
    <div
      data-testid="reports-view"
      className="flex flex-col flex-1 w-full h-full bg-white dark:bg-[#0C0C09] overflow-hidden min-h-0"
    >
      {/* Single Compact Full-Width Toolbar (maximizes vertical & horizontal space for the table) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-800 text-xs shrink-0">
        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          {activeTab === 'cronograma' ? (
            <button
              type="button"
              data-testid="reports-tab-cronograma"
              onClick={() => setActiveTab('cronograma')}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-white dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700 text-[11px] font-bold text-[#0C0C09] dark:text-zinc-100 shrink-0 h-7 cursor-pointer"
              title="Vista tabular Planificación"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>Planificación</span>
              <span className="px-1.5 py-0 rounded-full text-[10px] font-mono bg-[#F4F4F1] dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-300">
                {filteredCronoRows.length}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-white dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700 text-[11px] font-bold text-[#0C0C09] dark:text-zinc-100 shrink-0 h-7">
              <Layers className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>Catálogo Releases</span>
              <span className="px-1.5 py-0 rounded-full text-[10px] font-mono bg-[#F4F4F1] dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-300">
                {filteredReleaseRows.length}
              </span>
            </div>
          )}

          <SearchFilterBar
            testIdPrefix="reports"
            searchQuery={searchQuery}
            onChangeSearchQuery={setSearchQuery}
            excludeQuery={excludeQuery}
            onChangeExcludeQuery={setExcludeQuery}
            searchFields={searchFields}
            onChangeSearchFields={setSearchFields}
            selectedType={selectedType}
            onChangeSelectedType={setSelectedType}
            showTypeFilter={activeTab === 'cronograma'}
            selectedPlatform={selectedPlatform}
            onChangeSelectedPlatform={setSelectedPlatform}
            selectedAlert={selectedAlert}
            onChangeSelectedAlert={setSelectedAlert}
            releases={releases}
            selectedRelease={selectedRelease}
            onChangeSelectedRelease={setSelectedRelease}
            teams={availableTeams}
            selectedTeam={selectedTeam}
            onChangeSelectedTeam={setSelectedTeam}
            tags={availableTags}
            selectedTag={selectedTag}
            onChangeSelectedTag={setSelectedTag}
            showSubtasksOnFilter={showSubtasksOnFilter}
            onChangeShowSubtasksOnFilter={setShowSubtasksOnFilter}
            showSubtasksToggle={activeTab === 'cronograma'}
            searchInputClassName="w-56 sm:w-64"
            initialShowSearchFieldsMenu={initialShowSearchFieldsMenu}
            initialShowAdvancedPanel={initialShowAdvancedPanel}
            columns={getOrderedColumns(activeTab).map((c) => ({
              key: c.key,
              label: c.label,
              visible: isColVisible(activeTab, c.key),
            }))}
            onToggleColumn={(key) => toggleReportCol(activeTab, key)}
            onResetColumns={() => resetReportCols(activeTab)}
            enableBuiltInSavedFilters={activeTab === 'cronograma'}
            externalSavedFilters={activeTab === 'cronograma' ? savedFilters : undefined}
            externalActiveSavedFilterId={activeTab === 'cronograma' ? activeSavedFilterId : null}
            onSelectExternalSavedFilter={(f) => applySavedFilter(f as ReportSavedFilter)}
            onSaveExternalSavedFilter={handleSaveExternalSavedFilter}
            onDeleteExternalSavedFilter={handleDeleteSavedFilter}
            hideActiveChips={true}
            onClearFilters={() => {
              setSearchQuery('');
              setExcludeQuery('');
              setSearchFields({ ...DEFAULT_GANTT_SEARCH_FIELDS });
              setSelectedType('all');
              setSelectedPlatform('all');
              setSelectedAlert('all');
              setSelectedRelease('all');
              setSelectedTeam('all');
              setSelectedTag('all');
              setShowSubtasksOnFilter(false);
              setActiveSavedFilterId(null);
              try {
                localStorage.removeItem(REPORT_ACTIVE_FILTER_KEY);
              } catch {}
            }}
          />
        </div>

        {/* Right side: Toast + Project Wizard + Download Excel */}
        <div className="flex items-center gap-1.5 shrink-0">
          {toastMessage && (
            <span
              className={`px-2 py-0.5 rounded-[3px] text-[11px] font-medium animate-fade-in ${
                toastMessage.includes('Error')
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
            >
              {toastMessage}
            </span>
          )}

          {activeTab === 'cronograma' && (onCreateProjectFromWizard || onCreateProject) && (
            <button
              type="button"
              data-testid="reports-open-wizard-btn"
              onClick={() => {
                const relMatch =
                  selectedRelease !== 'all'
                    ? releases.find((r) => r.code === selectedRelease)?.id
                    : undefined;
                setWizardInitialReleaseId(relMatch);
                setWizardOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-600 bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] hover:opacity-90 text-[11px] font-semibold transition cursor-pointer h-7"
              title="Crear nuevo proyecto con subtareas mediante asistente guiado"
            >
              <FolderPlus className="w-3.5 h-3.5 shrink-0" />
              <span>Nuevo Proyecto</span>
            </button>
          )}

          <button
            type="button"
            data-testid="reports-download-excel-btn"
            onClick={handleDownloadExcel}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold transition shadow-xs cursor-pointer h-7"
            title="Exportar libro completo (.xlsx) con las 3 pestañas"
            aria-label="Descargar Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* Multi-Project Focus Banner (Informe Planificación) */}
      {activeTab === 'cronograma' && focusedProjectIds.length > 0 && (
        <div
          data-testid="reports-focus-banner"
          className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 bg-indigo-600 text-white text-xs shrink-0"
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <Crosshair className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono font-bold text-[10px] uppercase tracking-wider">
              Enfoque ({focusedProjectIds.length}):
            </span>
            {focusedProjectIds.map((pid) => {
              const p = projectById.get(pid);
              if (!p) return null;
              return (
                <span
                  key={pid}
                  data-testid={`reports-focus-chip-${pid}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 border border-white/30 text-[11px] font-medium"
                >
                  <span className="truncate max-w-[180px]">{p.name}</span>
                  <button
                    type="button"
                    onClick={() => setFocusedProjectIds((prev) => prev.filter((id) => id !== pid))}
                    className="hover:text-amber-200 cursor-pointer"
                    title="Quitar proyecto del enfoque"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {projects.filter((p) => !focusedProjectIds.includes(p.id)).length > 0 && (
              <select
                data-testid="reports-focus-add-select"
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && !focusedProjectIds.includes(val)) {
                    setFocusedProjectIds((prev) => [...prev, val]);
                  }
                }}
                className="px-2 py-0.5 rounded-[3px] bg-white/15 border border-white/30 text-white text-[10px] font-medium outline-none cursor-pointer"
              >
                <option value="" className="text-zinc-900">+ Añadir proyecto...</option>
                {projects
                  .filter((p) => !focusedProjectIds.includes(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id} className="text-zinc-900">
                      {p.name}
                    </option>
                  ))}
              </select>
            )}
          </div>
          <button
            type="button"
            data-testid="reports-focus-clear-btn"
            onClick={() => setFocusedProjectIds([])}
            className="px-2 py-0.5 rounded-[3px] bg-white/20 hover:bg-white/30 text-[10px] font-semibold cursor-pointer shrink-0"
          >
            Salir de enfoque
          </button>
        </div>
      )}

      {/* Main Table Content (Spreadsheet View) */}
      <div className="flex-1 overflow-auto bg-white dark:bg-[#0C0C09] min-h-0 select-text">
        {activeTab === 'cronograma' && (
          <div className="min-w-full inline-block align-middle">
            <table className="min-w-full w-max table-fixed border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border-b-2 border-[#0C0C09] dark:border-zinc-700 font-mono text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th
                    data-testid="report-col-id-header"
                    className="px-2.5 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 w-20 text-center bg-[#ECECE8] dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-200 select-none"
                  >
                    ID
                  </th>
                  {getOrderedColumns('cronograma').map((col) =>
                    renderResizableTh(
                      'cronograma',
                      col,
                      col.key === 'dependency'
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 text-amber-950 dark:text-amber-200'
                        : ''
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E2DC] dark:divide-zinc-800 font-mono text-[11px]">
                {displayedCronoRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={1 + CRONO_COLUMNS.filter((c) => isColVisible('cronograma', c.key)).length}
                      className="px-4 py-8 text-center text-[#6B6B66] dark:text-zinc-400 font-sans"
                    >
                      No se encontraron elementos en el cronograma que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  displayedCronoRows.map(({ row, isContext, nodeKey, hasChildren, hiddenChildrenCount }, idx) => {
                    const isRelease = row.level === 'RELEASE';
                    const isProject = row.level === 'PROYECTO';
                    const isMilestone = row.level === 'HITO';
                    const isDepSubRow = row.isDepRow;
                    const linkedItem =
                      !isRelease && !isProject
                        ? itemById.get(row.itemId || row.rowId.replace(/-\d+$/, ''))
                        : undefined;
                    const linkedProject = isProject && row.projectId ? projectById.get(row.projectId) : undefined;
                    const linkedRelease = isRelease && row.releaseId ? releaseById.get(row.releaseId) : undefined;

                    const isNodeCollapsed = Boolean(nodeKey && collapsedNodes.has(nodeKey));
                    const isNodeVisuallyCollapsed = Boolean(
                      nodeKey && (collapsedNodes.has(nodeKey) || collapsingNodes.has(nodeKey))
                    );
                    const rowRelKey = row.releaseCode && row.releaseCode !== '—' ? `rel:${row.releaseCode}` : null;
                    const rowProjKey = row.projectId ? `proj:${row.projectId}` : null;
                    const isRowCollapsing = Boolean(
                      (!isRelease && rowRelKey && collapsingNodes.has(rowRelKey)) ||
                        ((row.level === 'TAREA' || row.level === 'HITO') &&
                          rowProjKey &&
                          collapsingNodes.has(rowProjKey))
                    );
                    const isRowExpanding = Boolean(
                      (!isRelease && rowRelKey && expandingNodes.has(rowRelKey)) ||
                        ((row.level === 'TAREA' || row.level === 'HITO') &&
                          rowProjKey &&
                          expandingNodes.has(rowProjKey))
                    );
                    const rowProjectObj =
                      isProject && linkedProject
                        ? linkedProject
                        : row.projectId
                        ? projectById.get(row.projectId)
                        : undefined;
                    const projAccent =
                      PROJECT_ACCENT_COLORS[rowProjectObj?.color || 'indigo'] ||
                      PROJECT_ACCENT_COLORS.indigo;
                    const isShowingHiddenKids = Boolean(
                      nodeKey && expandedFilteredNodes.has(nodeKey) && !isNodeVisuallyCollapsed
                    );
                    const hasVisibleKids =
                      nodeKey && hasChildren
                        ? isRelease
                          ? displayedCronoRows.some(
                              (v) => v.row.level === 'PROYECTO' && v.row.releaseCode === row.releaseCode
                            )
                          : isProject
                          ? displayedCronoRows.some(
                              (v) =>
                                (v.row.level === 'TAREA' || v.row.level === 'HITO') &&
                                v.row.projectId === row.projectId
                            )
                          : false
                        : false;
                    const isProjectSubtasksHidden =
                      isProject && hasChildren && (!hasVisibleKids || isNodeVisuallyCollapsed);

                    const rowBgClass = isRelease
                      ? 'bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] font-bold'
                      : isContext
                      ? 'bg-indigo-50/25 dark:bg-indigo-950/15 text-slate-500 dark:text-zinc-400'
                      : isProject
                      ? 'bg-[#F4F4F1]/90 dark:bg-zinc-800/75 font-semibold text-[#0C0C09] dark:text-zinc-100'
                      : idx % 2 === 0
                      ? 'bg-white dark:bg-[#0C0C09]'
                      : 'bg-[#FAFAF8] dark:bg-zinc-900/30';

                    const rowAnimClass = isRowCollapsing
                      ? 'animate-report-row-collapse'
                      : isRowExpanding
                      ? 'animate-report-row-expand'
                      : '';

                    const isSelectedRow = Boolean(
                      (isRelease && linkedRelease && selectedEntity?.type === 'release' && selectedEntity.id === linkedRelease.id) ||
                        (isProject && linkedProject && selectedEntity?.type === 'project' && selectedEntity.id === linkedProject.id) ||
                        (!isRelease && !isProject && linkedItem && selectedEntity?.type === 'task' && selectedEntity.id === linkedItem.id)
                    );

                    return (
                      <tr
                        key={row.rowId}
                        data-report-row={row.rowId}
                        data-report-level={row.level}
                        data-context-row={isContext ? 'true' : undefined}
                        data-selected-report-row={isSelectedRow ? 'true' : undefined}
                        onClick={() => {
                          if (!onSelectEntity) return;
                          if (isRelease && linkedRelease) {
                            onSelectEntity({ type: 'release', id: linkedRelease.id, name: linkedRelease.name || linkedRelease.code });
                          } else if (isProject && linkedProject) {
                            onSelectEntity({ type: 'project', id: linkedProject.id, name: linkedProject.name });
                          } else if (linkedItem) {
                            onSelectEntity({ type: 'task', id: linkedItem.id, name: linkedItem.name });
                          }
                        }}
                        onContextMenu={(e) => {
                          const resolvedProjectId = isProject
                            ? linkedProject?.id || row.projectId
                            : linkedItem?.projectId || row.projectId;
                          const resolvedReleaseId = isRelease
                            ? linkedRelease?.id || row.releaseId
                            : isProject
                            ? linkedProject?.releaseId
                            : linkedItem?.releaseId || (resolvedProjectId ? projectById.get(resolvedProjectId)?.releaseId : undefined);
                          openRowContextMenu(e, {
                            level: row.level,
                            label: row.name || row.releaseCode || row.displayId || 'Elemento',
                            projectId: resolvedProjectId,
                            releaseId: resolvedReleaseId,
                            itemId: linkedItem?.id,
                          });
                        }}
                        className={`${rowBgClass} ${rowAnimClass} ${
                          isContext ? 'border-l-2 border-l-indigo-500' : ''
                        } ${
                          isSelectedRow
                            ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/50'
                            : isRelease
                            ? 'hover:bg-[#1C1C18] dark:hover:bg-zinc-200'
                            : 'hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40'
                        } cursor-pointer transition-colors`}
                      >
                        {/* Unique ID column */}
                        <td
                          data-testid={`report-crono-id-${row.rowId}`}
                          style={
                            isProject && !isContext
                              ? { borderLeft: `4px solid ${projAccent.hex}` }
                              : undefined
                          }
                          className={`px-2 py-1.5 border-r select-none whitespace-nowrap text-center text-[10px] font-mono font-bold ${
                            isRelease
                              ? 'border-white/15 dark:border-zinc-300 bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]'
                              : 'border-[#E2E2DC] dark:border-zinc-800 text-[#0C0C09] dark:text-zinc-200 bg-[#ECECE8]/40 dark:bg-zinc-900/50'
                          }`}
                        >
                          {row.displayId}
                        </td>

                        {getOrderedColumns('cronograma')
                          .filter((c) => isColVisible('cronograma', c.key))
                          .map((col) => {
                            switch (col.key) {
                              case 'hierarchy':
                                return (
                                  <td
                                    key={col.key}
                                    className={`px-3 py-1.5 border-r whitespace-nowrap overflow-hidden ${
                                      isRelease
                                        ? 'border-white/15 dark:border-zinc-300'
                                        : 'border-[#E2E2DC] dark:border-zinc-800'
                                    }`}
                                  >
                                    {isRelease ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-white/15 text-white dark:bg-black/10 dark:text-[#0C0C09] text-[10px] font-bold">
                                        <Rocket className="w-2.5 h-2.5" /> RELEASE
                                      </span>
                                    ) : isProject ? (
                                      <span
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-white text-[10px] font-bold ml-1.5 ${projAccent.badgeBg}`}
                                      >
                                        <FolderKanban className="w-2.5 h-2.5" /> PROYECTO
                                      </span>
                                    ) : isMilestone ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/40 text-[10px] font-semibold ml-4">
                                        ◆ HITO
                                      </span>
                                    ) : isDepSubRow ? (
                                      <span className="text-slate-400 dark:text-zinc-500 text-[10px] pl-6">
                                        └─ Dependencia
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-zinc-400 text-[10px] ml-4">
                                        <span className="text-slate-300 dark:text-zinc-600 font-mono">└</span>
                                        <span>TAREA</span>
                                      </span>
                                    )}
                                  </td>
                                );
                              case 'name':
                                return (
                                  <td
                                    key={col.key}
                                    className={`px-2 py-1 border-r font-sans text-xs font-medium align-top ${
                                      isRelease
                                        ? 'border-white/15 dark:border-zinc-300 text-white dark:text-[#0C0C09]'
                                        : 'border-[#E2E2DC] dark:border-zinc-800 text-[#0C0C09] dark:text-zinc-100'
                                    }`}
                                  >
                                    <div
                                      className={`flex items-start gap-1.5 min-w-0 ${
                                        isProject ? 'pl-3' : !isRelease ? 'pl-7' : ''
                                      }`}
                                    >
                                      {!isRelease && !isProject && (
                                        <span
                                          aria-hidden="true"
                                          className="inline-flex items-center shrink-0 select-none text-zinc-300 dark:text-zinc-600 font-mono text-[11px]"
                                        >
                                          └
                                        </span>
                                      )}
                                      {nodeKey && hasChildren && (!hasCronoFilters || hasVisibleKids || isNodeVisuallyCollapsed) && (
                                        <button
                                          type="button"
                                          data-testid={`report-tree-toggle-${nodeKey}`}
                                          data-collapsed={isNodeVisuallyCollapsed ? 'true' : 'false'}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleCollapseNode(nodeKey);
                                          }}
                                          style={isProject ? { color: projAccent.hex } : undefined}
                                          className={`p-0.5 rounded flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                                            isRelease
                                              ? 'hover:bg-white/15 dark:hover:bg-black/10 text-white dark:text-[#0C0C09]'
                                              : 'hover:bg-black/5 dark:hover:bg-white/10'
                                          }`}
                                          title={isNodeVisuallyCollapsed ? 'Expandir hijos' : 'Colapsar hijos'}
                                        >
                                          <ChevronRight
                                            className={`w-4 h-4 transition-transform duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                              isNodeVisuallyCollapsed ? 'rotate-0' : 'rotate-90'
                                            }`}
                                          />
                                        </button>
                                      )}
                                      {isProject && (
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold text-white shrink-0 ${projAccent.badgeBg}`}
                                        >
                                          {row.displayId}
                                        </span>
                                      )}
                                      {isRelease && (
                                        <span className="px-1.5 py-0.5 rounded bg-white/20 dark:bg-black/10 font-mono text-[10px] font-bold shrink-0">
                                          {row.releaseCode}
                                        </span>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        {linkedItem && onUpdateItem && !isDepSubRow ? (
                                          <EditableReportTextCell
                                            testId={`report-crono-name-${linkedItem.id}`}
                                            value={linkedItem.name}
                                            className={isContext ? 'text-slate-500 dark:text-zinc-400' : ''}
                                            onCommit={(next) =>
                                              onUpdateItem({ ...linkedItem, name: next || linkedItem.name }, false)
                                            }
                                          />
                                        ) : linkedProject && onUpdateProject ? (
                                          <EditableReportTextCell
                                            testId={`report-crono-proj-name-${linkedProject.id}`}
                                            value={linkedProject.name}
                                            className={`font-semibold ${isContext ? 'text-slate-500 dark:text-zinc-400' : ''}`}
                                            onCommit={(next) =>
                                              onUpdateProject({ ...linkedProject, name: next || linkedProject.name })
                                            }
                                          />
                                        ) : linkedRelease && onUpdateRelease ? (
                                          <EditableReportTextCell
                                            testId={`report-crono-rel-name-${linkedRelease.id}`}
                                            value={linkedRelease.name}
                                            className="font-bold text-white dark:text-[#0C0C09]"
                                            onCommit={(next) =>
                                              onUpdateRelease({ ...linkedRelease, name: next || linkedRelease.name })
                                            }
                                          />
                                        ) : (
                                          <span className="whitespace-normal break-words leading-snug block px-1.5">{row.name}</span>
                                        )}
                                      </div>
                                      {hasCronoFilters && nodeKey && hiddenChildrenCount > 0 && (
                                        <button
                                          type="button"
                                          data-testid={`report-expand-hidden-${nodeKey}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleExpandFilteredNode(nodeKey);
                                          }}
                                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-mono text-[9.5px] font-semibold shrink-0 cursor-pointer transition ${
                                            isShowingHiddenKids
                                              ? 'bg-indigo-600 text-white border border-indigo-600'
                                              : isRelease
                                              ? 'bg-white/15 text-white dark:bg-black/10 dark:text-[#0C0C09] border border-dashed border-white/50 dark:border-black/30 hover:bg-indigo-600 hover:text-white hover:border-solid hover:border-indigo-500'
                                              : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-dashed border-indigo-400 dark:border-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-solid'
                                          }`}
                                          title={
                                            isShowingHiddenKids
                                              ? 'Ocultar hijos fuera del filtro'
                                              : 'Expandir hijos ocultos por el filtro'
                                          }
                                        >
                                          {isShowingHiddenKids
                                            ? `▾ Ocultar ${hiddenChildrenCount}`
                                            : `▸ +${hiddenChildrenCount} ${
                                                isRelease
                                                  ? hiddenChildrenCount === 1
                                                    ? 'proyecto'
                                                    : 'proyectos'
                                                  : hiddenChildrenCount === 1
                                                  ? 'subtarea'
                                                  : 'subtareas'
                                              }`}
                                        </button>
                                      )}
                                      {isContext && (
                                        <span
                                          data-testid={`report-context-badge-${row.rowId}`}
                                          className="px-1.5 py-0 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono text-[9px] font-semibold shrink-0"
                                        >
                                          contexto
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                );
                              case 'releaseCode':
                                return (
                                  <td key={col.key} className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#6B6B66] dark:text-zinc-300">
                                    {linkedItem && onUpdateItem && !isDepSubRow ? (
                                      <select
                                        data-testid={`report-crono-release-${linkedItem.id}`}
                                        value={linkedItem.releaseId || ''}
                                        onChange={(e) =>
                                          onUpdateItem(
                                            { ...linkedItem, releaseId: e.target.value || undefined },
                                            false
                                          )
                                        }
                                        className="w-full bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[11px] outline-none cursor-pointer"
                                      >
                                        <option value="">Heredada</option>
                                        {releases.map((r) => (
                                          <option key={r.id} value={r.id}>
                                            {r.code}
                                          </option>
                                        ))}
                                      </select>
                                    ) : linkedProject && onUpdateProject ? (
                                      <select
                                        data-testid={`report-crono-proj-release-${linkedProject.id}`}
                                        value={linkedProject.releaseId || ''}
                                        onChange={(e) =>
                                          onUpdateProject({
                                            ...linkedProject,
                                            releaseId: e.target.value || undefined,
                                          })
                                        }
                                        className="w-full bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[11px] outline-none cursor-pointer"
                                      >
                                        <option value="">Sin asignar</option>
                                        {releases.map((r) => (
                                          <option key={r.id} value={r.id}>
                                            {r.code}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span className="px-1">{row.releaseCode}</span>
                                    )}
                                  </td>
                                );
                              case 'projectName':
                                return (
                                  <td key={col.key} className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-normal break-words leading-snug font-sans text-xs text-[#0C0C09] dark:text-zinc-200 align-top">
                                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                      <span className="break-words">{row.projectName}</span>
                                      {(isProject || (row.alertLevel !== undefined && row.alertLevel > 0)) && row.alertLevel !== undefined && (
                                        <span
                                          data-testid={`cronograma-project-alert-badge-${row.wbsCode}`}
                                          className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border shrink-0 ${
                                            row.alertLevel === 1
                                              ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                              : row.alertLevel === 2
                                              ? 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800'
                                              : row.alertLevel === 3
                                              ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                              : 'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                                          }`}
                                          title={`Nivel de alerta: ${row.alertLevel}`}
                                        >
                                          <span
                                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                              row.alertLevel === 1
                                                ? 'bg-amber-500'
                                                : row.alertLevel === 2
                                                ? 'bg-orange-500'
                                                : row.alertLevel === 3
                                                ? 'bg-rose-500'
                                                : 'bg-zinc-400'
                                            }`}
                                          />
                                          <span>{row.alertLevel}</span>
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                );
                              case 'platform':
                                return (
                                  <td key={col.key} className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
                                    {linkedItem && onUpdateItem && !isDepSubRow ? (
                                      <select
                                        data-testid={`report-crono-platform-${linkedItem.id}`}
                                        value={linkedItem.platform || ''}
                                        onChange={(e) =>
                                          onUpdateItem(
                                            {
                                              ...linkedItem,
                                              platform: (e.target.value || undefined) as ProjectPlatform | undefined,
                                            },
                                            false
                                          )
                                        }
                                        className="w-full bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[10px] font-bold outline-none cursor-pointer"
                                      >
                                        <option value="">Heredada ({row.platform})</option>
                                        <option value="iOS">iOS</option>
                                        <option value="Android">Android</option>
                                        <option value="iOS/Android">iOS/Android</option>
                                      </select>
                                    ) : linkedProject && onUpdateProject ? (
                                      <select
                                        data-testid={`report-crono-proj-platform-${linkedProject.id}`}
                                        value={normalizePlatform(linkedProject.platform) || 'iOS/Android'}
                                        onChange={(e) =>
                                          onUpdateProject({
                                            ...linkedProject,
                                            platform: e.target.value as ProjectPlatform,
                                          })
                                        }
                                        className="w-full bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[10px] font-bold outline-none cursor-pointer"
                                      >
                                        <option value="iOS">iOS</option>
                                        <option value="Android">Android</option>
                                        <option value="iOS/Android">iOS/Android</option>
                                      </select>
                                    ) : row.platform !== '—' ? (
                                      <span
                                        className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold ${
                                          row.platform === 'iOS'
                                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                            : row.platform === 'Android'
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                        }`}
                                      >
                                        {row.platform}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 px-1">—</span>
                                    )}
                                  </td>
                                );
                              case 'team':
                                return (
                                  <td key={col.key} className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-normal break-words align-top">
                                    {linkedItem && onUpdateItem && !isDepSubRow ? (
                                      <EditableReportTextCell
                                        testId={`report-crono-team-${linkedItem.id}`}
                                        value={linkedItem.assignee || ''}
                                        placeholder="Sin equipo"
                                        onCommit={(val) =>
                                          onUpdateItem(
                                            { ...linkedItem, assignee: val.trim() || undefined },
                                            false
                                          )
                                        }
                                      />
                                    ) : (
                                      <span
                                        data-testid={`report-crono-team-text-${row.rowId}`}
                                        className="px-1.5 text-[11px] text-slate-600 dark:text-zinc-300 whitespace-normal break-words leading-snug block"
                                        title={row.team}
                                      >
                                        {row.team}
                                      </span>
                                    )}
                                  </td>
                                );
                              case 'alertLevel': {
                                const alertVal = row.alertLevel ?? 0;
                                const alertSelectClass =
                                  alertVal === 1
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                    : alertVal === 2
                                    ? 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800'
                                    : alertVal === 3
                                    ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                    : 'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
                                return (
                                  <td key={col.key} className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
                                    {linkedItem && onUpdateItem && !isDepSubRow ? (
                                      <select
                                        data-testid={`report-crono-alert-${linkedItem.id}`}
                                        value={linkedItem.alertLevel ?? 0}
                                        onChange={(e) =>
                                          onUpdateItem(
                                            {
                                              ...linkedItem,
                                              alertLevel: Number(e.target.value) as ProjectAlertLevel,
                                            },
                                            false
                                          )
                                        }
                                        className={`w-full px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border outline-none cursor-pointer ${alertSelectClass}`}
                                      >
                                        <option value={0}>Nivel 0</option>
                                        <option value={1}>Nivel 1</option>
                                        <option value={2}>Nivel 2</option>
                                        <option value={3}>Nivel 3</option>
                                      </select>
                                    ) : linkedProject && onUpdateProject ? (
                                      <select
                                        data-testid={`report-crono-proj-alert-${linkedProject.id}`}
                                        value={linkedProject.alertLevel ?? 0}
                                        onChange={(e) =>
                                          onUpdateProject({
                                            ...linkedProject,
                                            alertLevel: Number(e.target.value) as ProjectAlertLevel,
                                          })
                                        }
                                        className={`w-full px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border outline-none cursor-pointer ${alertSelectClass}`}
                                      >
                                        <option value={0}>Nivel 0</option>
                                        <option value={1}>Nivel 1</option>
                                        <option value={2}>Nivel 2</option>
                                        <option value={3}>Nivel 3</option>
                                      </select>
                                    ) : (
                                      <span className="text-slate-400 px-1">—</span>
                                    )}
                                  </td>
                                );
                              }
                              case 'type':
                                return (
                                  <td key={col.key} className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#6B6B66] dark:text-zinc-400">
                                    {linkedItem && onUpdateItem && !isDepSubRow ? (
                                      <select
                                        data-testid={`report-crono-type-${linkedItem.id}`}
                                        value={linkedItem.type}
                                        onChange={(e) => {
                                          const nextType = e.target.value as 'task' | 'milestone';
                                          onUpdateItem(
                                            {
                                              ...linkedItem,
                                              type: nextType,
                                              duration: nextType === 'milestone' ? 0 : Math.max(1, linkedItem.duration || 1),
                                              endDate:
                                                nextType === 'milestone'
                                                  ? linkedItem.startDate
                                                  : calculateEndDateFromDuration(
                                                      linkedItem.startDate,
                                                      Math.max(1, linkedItem.duration || 1),
                                                      'task'
                                                    ),
                                            },
                                            false
                                          );
                                        }}
                                        className="w-full bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[11px] outline-none cursor-pointer"
                                      >
                                        <option value="task">Tarea</option>
                                        <option value="milestone">Hito</option>
                                      </select>
                                    ) : (
                                      <span className="px-1">{row.type}</span>
                                    )}
                                  </td>
                                );
                              case 'startDate':
                                return (
                                  <td key={col.key} className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#0C0C09] dark:text-zinc-300">
                                    {linkedItem && onUpdateItem && !isDepSubRow ? (
                                      <input
                                        type="date"
                                        data-testid={`report-crono-start-${linkedItem.id}`}
                                        value={linkedItem.startDate}
                                        onChange={(e) => {
                                          const nextStart = e.target.value;
                                          if (!nextStart) return;
                                          const nextEnd =
                                            linkedItem.type === 'milestone'
                                              ? nextStart
                                              : calculateEndDateFromDuration(
                                                  nextStart,
                                                  Math.max(1, linkedItem.duration || 1),
                                                  'task'
                                                );
                                          onUpdateItem(
                                            { ...linkedItem, startDate: nextStart, endDate: nextEnd },
                                            true
                                          );
                                        }}
                                        className="w-full bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[11px] outline-none"
                                      />
                                    ) : (
                                      <span className="px-1">{row.startDate}</span>
                                    )}
                                  </td>
                                );
                              case 'endDate':
                                return (
                                  <td key={col.key} className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#0C0C09] dark:text-zinc-300">
                                    {linkedItem && onUpdateItem && !isDepSubRow && linkedItem.type === 'task' ? (
                                      <input
                                        type="date"
                                        data-testid={`report-crono-end-${linkedItem.id}`}
                                        value={linkedItem.endDate}
                                        min={linkedItem.startDate}
                                        onChange={(e) => {
                                          const nextEnd = e.target.value;
                                          if (!nextEnd || nextEnd < linkedItem.startDate) return;
                                          const nextDur = Math.max(
                                            1,
                                            calculateDurationFromDates(linkedItem.startDate, nextEnd, 'task')
                                          );
                                          onUpdateItem(
                                            { ...linkedItem, endDate: nextEnd, duration: nextDur },
                                            true
                                          );
                                        }}
                                        className="w-full bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[11px] outline-none"
                                      />
                                    ) : (
                                      <span className="px-1">{row.endDate}</span>
                                    )}
                                  </td>
                                );
                              case 'duration':
                                return (
                                  <td key={col.key} className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right font-bold">
                                    {linkedItem && onUpdateItem && !isDepSubRow && linkedItem.type === 'task' ? (
                                      <input
                                        type="number"
                                        min={1}
                                        data-testid={`report-crono-duration-${linkedItem.id}`}
                                        value={linkedItem.duration}
                                        onChange={(e) => {
                                          const nextDur = Math.max(1, parseInt(e.target.value, 10) || 1);
                                          const nextEnd = calculateEndDateFromDuration(
                                            linkedItem.startDate,
                                            nextDur,
                                            'task'
                                          );
                                          onUpdateItem(
                                            { ...linkedItem, duration: nextDur, endDate: nextEnd },
                                            true
                                          );
                                        }}
                                        className="w-14 text-right bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[11px] font-bold outline-none"
                                      />
                                    ) : (
                                      <span>{row.duration} d</span>
                                    )}
                                  </td>
                                );
                              case 'slack':
                                return (
                                  <td key={col.key} className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right text-slate-500">
                                    {linkedItem && onUpdateItem && !isDepSubRow && linkedItem.type === 'task' ? (
                                      <input
                                        type="number"
                                        min={0}
                                        data-testid={`report-crono-slack-${linkedItem.id}`}
                                        value={linkedItem.slack || 0}
                                        onChange={(e) => {
                                          const nextSlack = Math.max(0, parseInt(e.target.value, 10) || 0);
                                          onUpdateItem({ ...linkedItem, slack: nextSlack }, false);
                                        }}
                                        className="w-12 text-right bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[11px] outline-none"
                                      />
                                    ) : (
                                      <span>{row.slack} d</span>
                                    )}
                                  </td>
                                );
                              case 'progress':
                                return (
                                  <td key={col.key} className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-center">
                                    {linkedItem && onUpdateItem && !isDepSubRow && linkedItem.type === 'task' ? (
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={5}
                                        data-testid={`report-crono-progress-${linkedItem.id}`}
                                        value={linkedItem.progress ?? 0}
                                        onChange={(e) => {
                                          const nextProg = Math.max(
                                            0,
                                            Math.min(100, parseInt(e.target.value, 10) || 0)
                                          );
                                          onUpdateItem({ ...linkedItem, progress: nextProg }, false);
                                        }}
                                        className="w-12 text-center bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded-[2px] border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[10px] font-bold outline-none"
                                      />
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded-[2px] bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold">
                                        {row.progress}
                                      </span>
                                    )}
                                  </td>
                                );
                              case 'dependency':
                                return (
                                  <td key={col.key} className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 bg-amber-50/20 dark:bg-amber-950/10 font-sans text-xs overflow-hidden">
                                    {row.dependency !== '—' ? (
                                      <div className="flex flex-wrap items-center gap-1.5 max-w-full">
                                        {row.dependency.split(', ').map((depStr, idx) => (
                                          <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300/60 dark:border-amber-700/60 font-medium max-w-full"
                                          >
                                            <Link2 className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                                            <span className="font-semibold whitespace-normal break-words leading-snug">{depStr}</span>
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 font-mono">—</span>
                                    )}
                                  </td>
                                );
                              case 'isCritical':
                                return (
                                  <td key={col.key} className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-center">
                                    {row.isCritical ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[10px]">
                                        <Flame className="w-3 h-3 text-rose-600" /> SÍ
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">NO</span>
                                    )}
                                  </td>
                                );
                              case 'isExternal':
                                return (
                                  <td key={col.key} className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-center">
                                    {linkedItem && onUpdateItem && !isDepSubRow ? (
                                      <input
                                        type="checkbox"
                                        data-testid={`report-crono-external-${linkedItem.id}`}
                                        checked={Boolean(linkedItem.isExternal)}
                                        onChange={(e) =>
                                          onUpdateItem({ ...linkedItem, isExternal: e.target.checked }, false)
                                        }
                                        title="Marcar como hito/tarea externa"
                                        className="w-3.5 h-3.5 accent-amber-600 cursor-pointer align-middle"
                                      />
                                    ) : row.isExternal ? (
                                      <span className="px-1.5 py-0.5 rounded-[2px] bg-amber-100 text-amber-800 text-[10px] font-bold">
                                        SÍ
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">NO</span>
                                    )}
                                  </td>
                                );
                              case 'compliance':
                                return (
                                  <td key={col.key} className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-normal break-words align-top">
                                    {row.compliance === 'Conforme' ? (
                                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]">
                                        <CheckCircle2 className="w-3 h-3 shrink-0" /> Conforme
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-800">
                                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                        <span className="whitespace-normal break-words">{row.compliance}</span>
                                      </span>
                                    )}
                                  </td>
                                );
                              case 'tags': {
                                const isProjectRollupMode = isProjectSubtasksHidden;
                                if (isRelease) {
                                  return (
                                    <td key={col.key} className="px-2 py-1.5 font-sans text-xs">
                                      <span className="px-1">—</span>
                                    </td>
                                  );
                                }
                                if (linkedProject && isProject) {
                                  const projItems = items.filter((it) => it.projectId === linkedProject.id);
                                  const subRollupTags = isProjectRollupMode
                                    ? collectProjectRollupTags(linkedProject, projItems)
                                    : [];
                                  return (
                                    <td
                                      key={col.key}
                                      data-testid={`report-crono-tags-proj-${linkedProject.id}`}
                                      className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 align-top"
                                    >
                                      <TagInput
                                        tags={linkedProject.tags || []}
                                        allTags={availableTags}
                                        extraReadOnlyTags={subRollupTags}
                                        compact
                                        readOnly={!onUpdateProject}
                                        placeholder="+ #etiqueta"
                                        testIdPrefix={`report-tags-proj-${linkedProject.id}`}
                                        onChange={(nextTags) =>
                                          onUpdateProject?.({
                                            ...linkedProject,
                                            tags: nextTags.length > 0 ? nextTags : undefined,
                                          })
                                        }
                                      />
                                    </td>
                                  );
                                }
                                if (linkedItem && !isDepSubRow) {
                                  return (
                                    <td
                                      key={col.key}
                                      data-testid={`report-crono-tags-item-${linkedItem.id}`}
                                      className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 align-top"
                                    >
                                      <TagInput
                                        tags={linkedItem.tags || []}
                                        allTags={availableTags}
                                        compact
                                        readOnly={!onUpdateItem}
                                        placeholder="+ #etiqueta"
                                        testIdPrefix={`report-tags-item-${linkedItem.id}`}
                                        onChange={(nextTags) =>
                                          onUpdateItem?.(
                                            {
                                              ...linkedItem,
                                              tags: nextTags.length > 0 ? nextTags : undefined,
                                            },
                                            false
                                          )
                                        }
                                      />
                                    </td>
                                  );
                                }
                                return (
                                  <td key={col.key} className="px-2 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 text-xs text-[#6B6B66]">
                                    <span className="px-1">—</span>
                                  </td>
                                );
                              }
                              case 'statusComments': {
                                const isProjectRollupMode = isProjectSubtasksHidden;
                                if (isRelease) {
                                  return (
                                    <td key={col.key} className="px-2 py-1.5 font-sans text-xs text-[#6B6B66] dark:text-zinc-400">
                                      <span className="px-1">—</span>
                                    </td>
                                  );
                                }
                                if (linkedProject && isProject) {
                                  const projItems = items.filter((it) => it.projectId === linkedProject.id);
                                  const rollupComments = isProjectRollupMode
                                    ? collectProjectRollupComments(linkedProject, projItems, linkedProject.projectIndex)
                                    : (linkedProject.statusComments || []).map((c) => ({
                                        ...c,
                                        ownerType: 'project' as const,
                                        ownerId: linkedProject.id,
                                        sourceCode: undefined,
                                        sourceName: undefined,
                                      }));
                                  const latest = rollupComments[0];
                                  const count = rollupComments.length;
                                  return (
                                    <td
                                      key={col.key}
                                      data-testid={`report-crono-comments-proj-${linkedProject.id}`}
                                      className="px-2 py-1.5 font-sans text-xs align-top"
                                    >
                                      {latest ? (
                                        <button
                                          type="button"
                                          data-testid={`report-open-comments-proj-${linkedProject.id}`}
                                          onClick={() =>
                                            setCommentsDrawerTarget({
                                              entityType: 'project',
                                              id: linkedProject.id,
                                              code: row.displayId,
                                              defaultScope: isProjectRollupMode ? 'all' : 'own',
                                            })
                                          }
                                          className="w-full text-left flex items-start justify-between gap-2 px-1.5 py-1 rounded-[4px] border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 transition cursor-pointer"
                                          title="Ver y añadir comentarios de seguimiento"
                                        >
                                          <div className="min-w-0 flex-1 space-y-0.5">
                                            {latest.sourceCode && (
                                              <div
                                                data-testid={`report-rollup-origin-proj-${linkedProject.id}`}
                                                className="inline-flex items-center px-1 py-0 rounded-[2px] bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[9px] font-mono font-bold text-indigo-700 dark:text-indigo-300 max-w-full truncate"
                                              >
                                                {`↳ ${latest.sourceCode}${latest.sourceName ? ` · ${latest.sourceName}` : ''}`}
                                              </div>
                                            )}
                                            <div className="text-[11.5px] text-[#0C0C09] dark:text-zinc-200 whitespace-pre-wrap break-words leading-snug">
                                              {latest.text}
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-wrap font-mono text-[9.5px] text-[#6B6B66] dark:text-zinc-400">
                                              <span>{formatCommentShortDate(latest.createdAt)}</span>
                                              {latest.progressAfter !== undefined && (
                                                <span className="px-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold">
                                                  {`${latest.progressBefore ?? 0}%→${latest.progressAfter}%`}
                                                </span>
                                              )}
                                              {latest.alertLevelAfter !== undefined && (
                                                <span className="px-1 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold">
                                                  {`N${latest.alertLevelBefore ?? 0}→N${latest.alertLevelAfter}`}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <span
                                            data-testid={`report-comments-count-proj-${linkedProject.id}`}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold shrink-0"
                                          >
                                            <MessageSquare className="w-2.5 h-2.5" />
                                            <span>{count}</span>
                                          </span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          data-testid={`report-open-comments-proj-${linkedProject.id}`}
                                          onClick={() =>
                                            setCommentsDrawerTarget({
                                              entityType: 'project',
                                              id: linkedProject.id,
                                              code: row.displayId,
                                              defaultScope: isProjectRollupMode ? 'all' : 'own',
                                            })
                                          }
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] border border-dashed border-[#E2E2DC] dark:border-zinc-700 text-[11px] text-[#6B6B66] dark:text-zinc-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition cursor-pointer"
                                        >
                                          <MessageSquare className="w-3 h-3" />
                                          <span>+ Comentar</span>
                                        </button>
                                      )}
                                    </td>
                                  );
                                }
                                if (linkedItem && !isDepSubRow) {
                                  const latest = getLatestStatusComment(linkedItem.statusComments);
                                  const count = linkedItem.statusComments?.length ?? 0;
                                  return (
                                    <td
                                      key={col.key}
                                      data-testid={`report-crono-comments-item-${linkedItem.id}`}
                                      className="px-2 py-1.5 font-sans text-xs align-top"
                                    >
                                      {latest ? (
                                        <button
                                          type="button"
                                          data-testid={`report-open-comments-item-${linkedItem.id}`}
                                          onClick={() =>
                                            setCommentsDrawerTarget({
                                              entityType: 'item',
                                              id: linkedItem.id,
                                              code: row.displayId,
                                            })
                                          }
                                          className="w-full text-left flex items-start justify-between gap-2 px-1.5 py-1 rounded-[4px] border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 transition cursor-pointer"
                                          title="Ver y añadir comentarios de seguimiento"
                                        >
                                          <div className="min-w-0 flex-1 space-y-0.5">
                                            <div className="text-[11.5px] text-[#0C0C09] dark:text-zinc-200 whitespace-pre-wrap break-words leading-snug">
                                              {latest.text}
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-wrap font-mono text-[9.5px] text-[#6B6B66] dark:text-zinc-400">
                                              <span>{formatCommentShortDate(latest.createdAt)}</span>
                                              {latest.progressAfter !== undefined && (
                                                <span className="px-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold">
                                                  {`${latest.progressBefore ?? 0}%→${latest.progressAfter}%`}
                                                </span>
                                              )}
                                              {latest.alertLevelAfter !== undefined && (
                                                <span className="px-1 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold">
                                                  {`N${latest.alertLevelBefore ?? 0}→N${latest.alertLevelAfter}`}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <span
                                            data-testid={`report-comments-count-item-${linkedItem.id}`}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold shrink-0"
                                          >
                                            <MessageSquare className="w-2.5 h-2.5" />
                                            <span>{count}</span>
                                          </span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          data-testid={`report-open-comments-item-${linkedItem.id}`}
                                          onClick={() =>
                                            setCommentsDrawerTarget({
                                              entityType: 'item',
                                              id: linkedItem.id,
                                              code: row.displayId,
                                            })
                                          }
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] border border-dashed border-[#E2E2DC] dark:border-zinc-700 text-[11px] text-[#6B6B66] dark:text-zinc-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition cursor-pointer"
                                        >
                                          <MessageSquare className="w-3 h-3" />
                                          <span>+ Comentar</span>
                                        </button>
                                      )}
                                    </td>
                                  );
                                }
                                return (
                                  <td key={col.key} className="px-2 py-1.5 font-sans text-xs text-[#6B6B66] dark:text-zinc-400">
                                    <span className="px-1">—</span>
                                  </td>
                                );
                              }
                              case 'notes': {
                                const isProjectRollupMode = isProjectSubtasksHidden;
                                const subtaskNotes =
                                  isProjectRollupMode && linkedProject
                                    ? collectProjectSubtaskNotes(
                                        items.filter((it) => it.projectId === linkedProject.id),
                                        linkedProject.projectIndex
                                      )
                                    : [];
                                const isSubtaskNotesExpanded = Boolean(
                                  linkedProject && expandedSubtaskNotesProjects.has(linkedProject.id)
                                );
                                return (
                                  <td key={col.key} className="px-2 py-1.5 font-sans text-xs text-[#6B6B66] dark:text-zinc-400 whitespace-pre-line leading-relaxed align-top">
                                    {linkedItem && onUpdateItem && !isDepSubRow ? (
                                      <EditableReportTextCell
                                        testId={`report-crono-notes-${linkedItem.id}`}
                                        value={linkedItem.notes || ''}
                                        placeholder="Añadir notas..."
                                        multiline
                                        onCommit={(next) =>
                                          onUpdateItem(
                                            { ...linkedItem, notes: next.trim() || undefined },
                                            false
                                          )
                                        }
                                      />
                                    ) : linkedProject && onUpdateProject ? (
                                      <div className="space-y-1.5">
                                        <EditableReportTextCell
                                          testId={`report-crono-proj-desc-${linkedProject.id}`}
                                          value={linkedProject.description || ''}
                                          placeholder="Añadir descripción..."
                                          multiline
                                          onCommit={(next) =>
                                            onUpdateProject({ ...linkedProject, description: next })
                                          }
                                        />
                                        {subtaskNotes.length > 0 && (
                                          <div
                                            data-testid={`report-rollup-notes-proj-${linkedProject.id}`}
                                            className="pt-1.5 border-t border-dashed border-[#E2E2DC] dark:border-zinc-700"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <button
                                              type="button"
                                              data-testid={`report-rollup-notes-toggle-${linkedProject.id}`}
                                              data-expanded={isSubtaskNotesExpanded ? 'true' : 'false'}
                                              onClick={() =>
                                                setExpandedSubtaskNotesProjects((prev) => {
                                                  const next = new Set(prev);
                                                  if (next.has(linkedProject.id)) {
                                                    next.delete(linkedProject.id);
                                                  } else {
                                                    next.add(linkedProject.id);
                                                  }
                                                  return next;
                                                })
                                              }
                                              className="inline-flex items-center gap-1 font-mono text-[9.5px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 cursor-pointer select-none"
                                            >
                                              <ChevronRight
                                                className={`w-3 h-3 transition-transform duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                                  isSubtaskNotesExpanded ? 'rotate-90' : 'rotate-0'
                                                }`}
                                              />
                                              <span>{`Notas de subtareas (${subtaskNotes.length})`}</span>
                                            </button>
                                            <div
                                              className={`grid transition-[grid-template-rows,opacity] duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                                isSubtaskNotesExpanded
                                                  ? 'grid-rows-[1fr] opacity-100 mt-1.5'
                                                  : 'grid-rows-[0fr] opacity-0'
                                              }`}
                                            >
                                              <div className="overflow-hidden space-y-1">
                                                {subtaskNotes.map((sn) => (
                                                  <div
                                                    key={sn.itemId}
                                                    className="text-[11px] leading-snug text-[#52525B] dark:text-zinc-400 break-words"
                                                  >
                                                    <span className="font-mono font-bold text-[#0C0C09] dark:text-zinc-200 mr-1">
                                                      {`${sn.code}:`}
                                                    </span>
                                                    <span>{sn.notes}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="px-1">{row.notes || '—'}</span>
                                    )}
                                  </td>
                                );
                              }
                              default:
                                return null;
                            }
                          })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Catálogo Releases */}

        {activeTab === 'releases' && (
          <div className="min-w-full inline-block align-middle">
            <table className="w-max table-fixed border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border-b-2 border-[#0C0C09] dark:border-zinc-700 font-mono text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th
                    data-testid="report-col-id-header"
                    className="px-2.5 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 w-20 text-center bg-[#ECECE8] dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-200 select-none"
                  >
                    ID
                  </th>
                  {getOrderedColumns('releases').map((col) => renderResizableTh('releases', col))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E2DC] dark:divide-zinc-800 font-mono text-[11px]">
                {filteredReleaseRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={1 + RELEASE_COLUMNS.filter((c) => isColVisible('releases', c.key)).length}
                      className="px-4 py-8 text-center text-[#6B6B66] dark:text-zinc-400 font-sans"
                    >
                      No hay releases registradas o ninguna coincide con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredReleaseRows.map((row, idx) => {
                    const linkedRel = row.releaseId
                      ? releaseById.get(row.releaseId)
                      : releases.find((r) => r.code === row.code);
                    const isSelectedRel = Boolean(
                      linkedRel && selectedEntity?.type === 'release' && selectedEntity.id === linkedRel.id
                    );
                    return (
                      <tr
                        key={row.releaseId || row.code}
                        data-report-row={row.releaseId || row.code}
                        data-selected-report-row={isSelectedRel ? 'true' : undefined}
                        onClick={() => {
                          if (linkedRel && onSelectEntity) {
                            onSelectEntity({ type: 'release', id: linkedRel.id, name: linkedRel.name || linkedRel.code });
                          }
                        }}
                        onContextMenu={(e) => {
                          openRowContextMenu(e, {
                            level: 'RELEASE',
                            label: row.name || row.code,
                            releaseId: linkedRel?.id || row.releaseId,
                          });
                        }}
                        className={`${
                          isSelectedRel
                            ? 'ring-2 ring-inset ring-indigo-500 bg-amber-50/70 dark:bg-amber-950/40'
                            : 'bg-white dark:bg-[#0C0C09] hover:bg-amber-50/40 dark:hover:bg-amber-950/20'
                        } cursor-pointer transition-colors`}
                      >
                        <td
                          data-testid={`report-rel-id-${row.code}`}
                          className="px-2 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 text-center text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-[#ECECE8]/40 dark:bg-zinc-900 select-none whitespace-nowrap"
                        >
                          {row.code}
                        </td>
                        {getOrderedColumns('releases')
                          .filter((c) => isColVisible('releases', c.key))
                          .map((col) => {
                            switch (col.key) {
                              case 'code':
                                return (
                                  <td key={col.key} className="px-2 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                                    {linkedRel && onUpdateRelease ? (
                                      <EditableReportTextCell
                                        testId={`report-rel-code-${linkedRel.id}`}
                                        value={linkedRel.code}
                                        className="font-bold text-amber-700 dark:text-amber-400"
                                        onCommit={(next) =>
                                          onUpdateRelease({ ...linkedRel, code: next || linkedRel.code })
                                        }
                                      />
                                    ) : (
                                      row.code
                                    )}
                                  </td>
                                );
                              case 'name':
                                return (
                                  <td key={col.key} className="px-2 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 font-sans text-xs font-bold text-[#0C0C09] dark:text-zinc-100">
                                    {linkedRel && onUpdateRelease ? (
                                      <EditableReportTextCell
                                        testId={`report-rel-name-${linkedRel.id}`}
                                        value={linkedRel.name}
                                        className="font-bold"
                                        onCommit={(next) =>
                                          onUpdateRelease({ ...linkedRel, name: next || linkedRel.name })
                                        }
                                      />
                                    ) : (
                                      row.name
                                    )}
                                  </td>
                                );
                              case 'month':
                                return (
                                  <td key={col.key} className="px-2 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#6B6B66] dark:text-zinc-300">
                                    {linkedRel && onUpdateRelease ? (
                                      <EditableReportTextCell
                                        testId={`report-rel-month-${linkedRel.id}`}
                                        value={linkedRel.month || ''}
                                        onCommit={(next) =>
                                          onUpdateRelease({ ...linkedRel, month: next || linkedRel.month })
                                        }
                                      />
                                    ) : (
                                      row.month
                                    )}
                                  </td>
                                );
                              case 'startDate':
                                return (
                                  <td key={col.key} className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
                                    {row.startDate}
                                  </td>
                                );
                              case 'endDate':
                                return (
                                  <td key={col.key} className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
                                    {row.endDate}
                                  </td>
                                );
                              case 'duration':
                                return (
                                  <td key={col.key} className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right font-bold">
                                    {row.duration} d
                                  </td>
                                );
                              case 'assignedProjects':
                                return (
                                  <td key={col.key} className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 font-sans text-xs text-[#0C0C09] dark:text-zinc-200 truncate">
                                    {row.assignedProjects}
                                  </td>
                                );
                              case 'keyMilestones':
                                return (
                                  <td key={col.key} className="px-3 py-2 font-mono text-[10px] text-[#6B6B66] dark:text-zinc-400 truncate">
                                    {row.keyMilestones}
                                  </td>
                                );
                              default:
                                return null;
                            }
                          })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compact Sticky Status Bar with Active Filter Parameters (excluding columns) */}
      <div
        data-testid="reports-status-bar"
        className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#F4F4F1] dark:bg-zinc-900 border-t border-[#0C0C09] dark:border-zinc-800 text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400 shrink-0"
      >
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <span className="flex items-center gap-1 font-semibold text-[#0C0C09] dark:text-zinc-300 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Listo
          </span>
          <span className="shrink-0">
            Registros:{' '}
            <strong className="text-[#0C0C09] dark:text-zinc-200">
              {activeTab === 'cronograma'
                ? `${filteredCronoRows.length} de ${cronoRows.length}`
                : `${filteredReleaseRows.length} de ${releaseRows.length}`}
            </strong>
          </span>
          {activeTab === 'cronograma' && contextExpandedCount > 0 && (
            <span
              data-testid="reports-status-context-count"
              className="shrink-0 text-indigo-700 dark:text-indigo-300 font-semibold"
            >
              {`+${contextExpandedCount} de contexto`}
            </span>
          )}

          {/* Active Filter Parameters (all except columns) */}
          {(() => {
            const statusFilters: { key: string; label: string; onClear: () => void }[] = [];
            if (searchQuery.trim()) {
              statusFilters.push({
                key: 'query',
                label: `Contiene: "${searchQuery.trim()}"`,
                onClear: () => setSearchQuery(''),
              });
            }
            if (selectedTeam !== 'all') {
              statusFilters.push({
                key: 'team',
                label: `Equipo: ${selectedTeam}`,
                onClear: () => setSelectedTeam('all'),
              });
            }
            if (selectedTag !== 'all') {
              statusFilters.push({
                key: 'tag',
                label: `Etiqueta: #${selectedTag}`,
                onClear: () => setSelectedTag('all'),
              });
            }
            if (!isDefaultSearchFields(searchFields)) {
              const activeFields = (Object.keys(searchFields) as (keyof GanttSearchFieldsConfig)[])
                .filter((k) => searchFields[k])
                .map((k) => SEARCH_FIELD_LABELS[k].split(' / ')[0]);
              statusFilters.push({
                key: 'fields',
                label: `En: ${activeFields.join(', ')}`,
                onClear: () => setSearchFields({ ...DEFAULT_GANTT_SEARCH_FIELDS }),
              });
            }
            if (activeTab === 'cronograma' && selectedType !== 'all') {
              statusFilters.push({
                key: 'type',
                label: `Tipo: ${selectedType}`,
                onClear: () => setSelectedType('all'),
              });
            }
            if (selectedPlatform !== 'all') {
              statusFilters.push({
                key: 'platform',
                label: `Plat.: ${selectedPlatform}`,
                onClear: () => setSelectedPlatform('all'),
              });
            }
            if (selectedAlert !== 'all') {
              statusFilters.push({
                key: 'alert',
                label: `Alerta: Nivel ${selectedAlert}`,
                onClear: () => setSelectedAlert('all'),
              });
            }
            if (selectedRelease !== 'all') {
              statusFilters.push({
                key: 'release',
                label: `Release: ${selectedRelease}`,
                onClear: () => setSelectedRelease('all'),
              });
            }
            if (activeTab === 'cronograma' && showSubtasksOnFilter) {
              statusFilters.push({
                key: 'subtasks',
                label: '+ Subtareas',
                onClear: () => setShowSubtasksOnFilter(false),
              });
            }

            if (statusFilters.length === 0) return null;

            return (
              <div
                data-testid="reports-status-active-filters"
                className="flex flex-wrap items-center gap-1 min-w-0"
              >
                <span className="text-[#6B6B66] dark:text-zinc-500">Filtros:</span>
                {statusFilters.map((f) => (
                  <span
                    key={f.key}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[10px] leading-none"
                  >
                    <span>{f.label}</span>
                    <button
                      type="button"
                      onClick={f.onClear}
                      className="hover:text-rose-600 cursor-pointer"
                      title={`Quitar ${f.label}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setExcludeQuery('');
                    setSearchFields({ ...DEFAULT_GANTT_SEARCH_FIELDS });
                    setSelectedType('all');
                    setSelectedPlatform('all');
                    setSelectedAlert('all');
                    setSelectedRelease('all');
                    setShowSubtasksOnFilter(false);
                    setActiveSavedFilterId(null);
                    try {
                      localStorage.removeItem(REPORT_ACTIVE_FILTER_KEY);
                    } catch {}
                  }}
                  className="ml-0.5 text-[10px] font-sans font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Limpiar
                </button>
              </div>
            );
          })()}
        </div>

        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <span>Formato: XLSX Compatible</span>
          <span>100% Sincronizado</span>
        </div>
      </div>

      {/* Right-Click Context Menu for creating projects, tasks, and milestones */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          data-testid="report-row-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          className="fixed z-50 w-60 rounded-[6px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl py-1.5 text-xs select-none"
        >
          <div className="px-3 py-1.5 border-b border-[#E2E2DC] dark:border-zinc-800 flex items-center gap-1.5">
            <span className="px-1.5 py-0.2 rounded-[2px] text-[9px] font-mono font-bold uppercase bg-[#F4F4F1] dark:bg-zinc-800 text-[#6B6B66] dark:text-zinc-300 border border-[#E2E2DC] dark:border-zinc-700 shrink-0">
              {contextMenu.level}
            </span>
            <span className="truncate font-semibold text-[11px] text-[#0C0C09] dark:text-zinc-100">
              {contextMenu.label}
            </span>
          </div>

          <div className="py-1 flex flex-col">
            {onCreateTask && contextMenu.projectId && (
              <button
                type="button"
                data-testid="report-ctx-create-task"
                onClick={() => {
                  onCreateTask(contextMenu.projectId);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#0C0C09] dark:text-zinc-100 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Nueva tarea en este proyecto</span>
              </button>
            )}

            {onCreateMilestone && contextMenu.projectId && (
              <button
                type="button"
                data-testid="report-ctx-create-milestone"
                onClick={() => {
                  onCreateMilestone(contextMenu.projectId);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#0C0C09] dark:text-zinc-100 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer transition-colors"
              >
                <Flag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Nuevo hito en este proyecto</span>
              </button>
            )}

            {(onCreateProjectFromWizard || onCreateProject) && (
              <button
                type="button"
                data-testid="report-ctx-create-project"
                onClick={() => {
                  if (onCreateProjectFromWizard) {
                    setWizardInitialReleaseId(contextMenu.releaseId);
                    setWizardOpen(true);
                  } else if (onCreateProject) {
                    onCreateProject(
                      contextMenu.releaseId ? { releaseId: contextMenu.releaseId } : undefined
                    );
                  }
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#0C0C09] dark:text-zinc-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {contextMenu.releaseId
                    ? 'Nuevo proyecto en esta release'
                    : 'Nuevo proyecto'}
                </span>
              </button>
            )}

            {onCreateMilestone && (
              <button
                type="button"
                data-testid="report-ctx-create-external-milestone"
                onClick={() => {
                  onCreateMilestone(undefined);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#0C0C09] dark:text-zinc-100 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer transition-colors"
              >
                <Flag className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>Nuevo hito externo</span>
              </button>
            )}

            {contextMenu.projectId && (
              <button
                type="button"
                data-testid="report-ctx-focus-project"
                onClick={() => {
                  const pid = contextMenu.projectId!;
                  setFocusedProjectIds((prev) =>
                    prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
                  );
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#0C0C09] dark:text-zinc-100 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer transition-colors"
              >
                <Crosshair className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>
                  {focusedProjectIds.includes(contextMenu.projectId)
                    ? 'Quitar del enfoque'
                    : focusedProjectIds.length > 0
                    ? 'Añadir proyecto al enfoque'
                    : 'Enfocar este proyecto'}
                </span>
              </button>
            )}
          </div>

          {onSelectEntity && (
            <div className="pt-1 border-t border-[#E2E2DC] dark:border-zinc-800">
              <button
                type="button"
                data-testid="report-ctx-view-details"
                onClick={() => {
                  if (contextMenu.level === 'RELEASE' && contextMenu.releaseId) {
                    onSelectEntity({ type: 'release', id: contextMenu.releaseId, name: contextMenu.label });
                  } else if (contextMenu.level === 'PROYECTO' && contextMenu.projectId) {
                    onSelectEntity({ type: 'project', id: contextMenu.projectId, name: contextMenu.label });
                  } else if (contextMenu.itemId) {
                    onSelectEntity({ type: 'task', id: contextMenu.itemId, name: contextMenu.label });
                  }
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#6B6B66] dark:text-zinc-400 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 hover:text-[#0C0C09] dark:hover:text-zinc-100 cursor-pointer transition-colors"
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span>Ver detalles</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status Comments Drawer */}
      {(() => {
        if (!commentsDrawerTarget) return null;
        if (commentsDrawerTarget.entityType === 'project') {
          const targetProj = projects.find((p) => p.id === commentsDrawerTarget.id);
          if (!targetProj) return null;
          const projItems = items.filter((it) => it.projectId === targetProj.id);
          const avgProg =
            projItems.length > 0
              ? Math.round(projItems.reduce((acc, it) => acc + (it.progress || 0), 0) / projItems.length)
              : 0;
          return (
            <StatusCommentsDrawer
              isOpen={true}
              onClose={() => setCommentsDrawerTarget(null)}
              entityType="project"
              code={commentsDrawerTarget.code}
              project={targetProj}
              projectItems={projItems}
              projectIndex={targetProj.projectIndex}
              projectProgress={avgProg}
              defaultScope={commentsDrawerTarget.defaultScope || 'own'}
              onUpdateProject={onUpdateProject}
              onUpdateItem={onUpdateItem}
            />
          );
        }
        const targetItem = items.find((it) => it.id === commentsDrawerTarget.id);
        if (!targetItem) return null;
        return (
          <StatusCommentsDrawer
            isOpen={true}
            onClose={() => setCommentsDrawerTarget(null)}
            entityType="item"
            code={commentsDrawerTarget.code}
            item={targetItem}
            onUpdateItem={onUpdateItem}
          />
        );
      })()}

      {/* 3-Step Project Creation Wizard Modal */}
      <ProjectWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        releases={releases}
        existingTeams={Array.from(
          new Set(items.map((it) => it.assignee?.trim()).filter((x): x is string => Boolean(x)))
        )}
        existingTags={availableTags}
        initialReleaseId={wizardInitialReleaseId}
        onCreate={(payload) => {
          if (onCreateProjectFromWizard) {
            onCreateProjectFromWizard(payload);
          } else if (onCreateProject) {
            onCreateProject(payload.project);
          }
        }}
      />
    </div>
  );
};
