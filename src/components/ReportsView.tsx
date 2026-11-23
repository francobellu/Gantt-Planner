import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Layers,
  FolderKanban,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Link2,
  Calendar,
  Sparkles,
  X,
  ChevronDown,
  Smartphone,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import {
  ComputedGanttItem,
  GanttItem,
  GanttProject,
  Release,
  ProjectPlatform,
  ProjectAlertLevel,
} from '../types/gantt';
import {
  calculateDurationFromDates,
  calculateEndDateFromDuration,
  normalizePlatform,
} from '../utils/ganttEngine';
import { AppleIosIcon, AndroidIcon } from './PlatformIcons';
import {
  generateCronogramaCompletoRows,
  generateProjectSummaryRows,
  generateReleaseSummaryRows,
  downloadGanttExcelFile,
  CronogramaReportRow,
  ProjectSummaryReportRow,
  ReleaseSummaryReportRow,
} from '../utils/excelExportEngine';

type ReportTab = 'cronograma' | 'projects' | 'releases';

interface ReportColumnDef {
  key: string;
  label: string;
  defaultWidth: number;
  align?: 'left' | 'center' | 'right';
}

const CRONO_COLUMNS: ReportColumnDef[] = [
  { key: 'hierarchy', label: 'Jerarquía', defaultWidth: 125 },
  { key: 'wbsCode', label: 'Código WBS', defaultWidth: 105 },
  { key: 'name', label: 'Nombre del Elemento', defaultWidth: 250 },
  { key: 'releaseCode', label: 'Release', defaultWidth: 135 },
  { key: 'projectName', label: 'Proyecto', defaultWidth: 185 },
  { key: 'platform', label: 'Plataforma', defaultWidth: 125 },
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
];

const PROJECT_COLUMNS: ReportColumnDef[] = [
  { key: 'code', label: 'Código', defaultWidth: 85 },
  { key: 'projectName', label: 'Proyecto', defaultWidth: 225 },
  { key: 'platform', label: 'Plataforma', defaultWidth: 130 },
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

const REPORT_HIDDEN_COLS_KEY = 'ganttflow_report_hidden_cols_v1';
const REPORT_COL_WIDTHS_KEY = 'ganttflow_report_col_widths_v1';

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
  };

  if (multiline) {
    return (
      <textarea
        data-testid={testId}
        value={draft}
        rows={2}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setDraft(value);
            (e.currentTarget as HTMLTextAreaElement).blur();
          }
        }}
        className={`w-full bg-transparent px-1.5 py-0.5 rounded-[2px] border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 outline-none resize-y leading-relaxed ${className}`}
      />
    );
  }

  return (
    <input
      type="text"
      data-testid={testId}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.currentTarget as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          setDraft(value);
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      className={`w-full bg-transparent px-1.5 py-0.5 rounded-[2px] border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 outline-none truncate ${className}`}
    />
  );
};

interface ReportsViewProps {
  releases: Release[];
  projects: GanttProject[];
  items: ComputedGanttItem[];
  onBackToGantt: () => void;
  initialTab?: ReportTab;
  initialShowColumnsMenu?: boolean;
  onUpdateItem?: (item: GanttItem, autoCascade: boolean) => void;
  onUpdateProject?: (project: GanttProject) => void;
  onUpdateRelease?: (release: Release) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  releases,
  projects,
  items,
  onBackToGantt,
  initialTab = 'cronograma',
  initialShowColumnsMenu = false,
  onUpdateItem,
  onUpdateProject,
  onUpdateRelease,
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>(initialTab);
  const [showColumnsMenu, setShowColumnsMenu] = useState<boolean>(initialShowColumnsMenu);
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  const [hiddenColsByTab, setHiddenColsByTab] = useState<Record<ReportTab, Record<string, boolean>>>(() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(REPORT_HIDDEN_COLS_KEY) : null;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | ProjectPlatform>('all');
  const [showPlatformFilterMenu, setShowPlatformFilterMenu] = useState<boolean>(false);
  const platformFilterMenuRef = useRef<HTMLDivElement>(null);

  const [selectedAlert, setSelectedAlert] = useState<'all' | ProjectAlertLevel>('all');
  const [showAlertFilterMenu, setShowAlertFilterMenu] = useState<boolean>(false);
  const alertFilterMenuRef = useRef<HTMLDivElement>(null);

  const [selectedRelease, setSelectedRelease] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        platformFilterMenuRef.current &&
        !platformFilterMenuRef.current.contains(e.target as Node)
      ) {
        setShowPlatformFilterMenu(false);
      }
      if (
        alertFilterMenuRef.current &&
        !alertFilterMenuRef.current.contains(e.target as Node)
      ) {
        setShowAlertFilterMenu(false);
      }
      if (
        columnsMenuRef.current &&
        !columnsMenuRef.current.contains(e.target as Node)
      ) {
        setShowColumnsMenu(false);
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
        setShowPlatformFilterMenu(false);
        setShowAlertFilterMenu(false);
        setShowColumnsMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isColVisible = (tab: ReportTab, key: string): boolean => {
    return !hiddenColsByTab[tab]?.[key];
  };

  const toggleReportCol = (tab: ReportTab, key: string) => {
    setHiddenColsByTab((prev) => {
      const tabHidden = { ...(prev[tab] || {}) };
      const allCols = COLUMNS_BY_TAB[tab];
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
  };

  const getColWidth = (tab: ReportTab, col: ReportColumnDef): number => {
    return colWidthsByTab[tab]?.[col.key] ?? col.defaultWidth;
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

    const onMove = (moveEvent: MouseEvent) => {
      latestWidth = Math.max(64, Math.min(720, Math.round(startWidth + (moveEvent.clientX - startX))));
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
    return (
      <th
        key={col.key}
        data-testid={`report-col-header-${tab}-${col.key}`}
        style={{ width, minWidth: width }}
        className={`relative px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap select-none ${alignClass} ${extraClass}`}
      >
        <span className="truncate block pr-2">{col.label}</span>
        <div
          data-testid={`report-col-resizer-${tab}-${col.key}`}
          onMouseDown={(e) => startColResize(e, tab, col.key, width)}
          title="Arrastra para redimensionar esta columna"
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/60 active:bg-indigo-600 transition-colors z-10"
        />
      </th>
    );
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

  // 2. Filter Tab 1: Cronograma Completo
  const filteredCronoRows = useMemo(() => {
    const matchesNonReleaseRow = (row: CronogramaReportRow): boolean => {
      // Release filter
      if (selectedRelease !== 'all' && row.releaseCode !== selectedRelease) {
        return false;
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
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = row.name.toLowerCase().includes(q);
        const matchesWbs = row.wbsCode.toLowerCase().includes(q);
        const matchesProject = row.projectName.toLowerCase().includes(q);
        const matchesRelease = row.releaseCode.toLowerCase().includes(q);
        const matchesDep = row.dependency.toLowerCase().includes(q);
        const matchesType = row.type.toLowerCase().includes(q);
        const matchesPlatform = row.platform.toLowerCase().includes(q);
        const matchesAlert =
          row.alertLevel !== undefined &&
          (`nivel ${row.alertLevel}`.includes(q) || String(row.alertLevel) === q);
        if (
          !matchesName &&
          !matchesWbs &&
          !matchesProject &&
          !matchesRelease &&
          !matchesDep &&
          !matchesType &&
          !matchesPlatform &&
          !matchesAlert
        ) {
          return false;
        }
      }
      return true;
    };

    const hasFilters =
      selectedRelease !== 'all' ||
      selectedAlert !== 'all' ||
      selectedPlatform !== 'all' ||
      Boolean(searchQuery.trim());

    if (!hasFilters) {
      return cronoRows;
    }

    const matchingRowIds = new Set<string>();
    const matchingProjectIds = new Set<string>();
    const matchingReleaseCodes = new Set<string>();

    for (const r of cronoRows) {
      if (r.level !== 'RELEASE') {
        if (matchesNonReleaseRow(r)) {
          matchingRowIds.add(r.rowId);
          if (r.projectId) matchingProjectIds.add(r.projectId);
          if (r.releaseCode && r.releaseCode !== '—') matchingReleaseCodes.add(r.releaseCode);
        }
      }
    }

    return cronoRows.filter((row) => {
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
      return matchingRowIds.has(row.rowId);
    });
  }, [cronoRows, selectedPlatform, selectedAlert, selectedRelease, searchQuery]);

  // 3. Filter Tab 2: Resumen Proyectos
  const filteredProjectRows = useMemo(() => {
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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = row.projectName.toLowerCase().includes(q);
        const matchesCode = row.code.toLowerCase().includes(q);
        const matchesRel = row.releaseCode.toLowerCase().includes(q);
        const matchesDesc = row.description.toLowerCase().includes(q);
        const matchesPlatform = row.platform.toLowerCase().includes(q);
        const matchesAlert = `nivel ${row.alertLevel}`.includes(q) || String(row.alertLevel) === q;
        if (!matchesName && !matchesCode && !matchesRel && !matchesDesc && !matchesPlatform && !matchesAlert) {
          return false;
        }
      }
      return true;
    });
  }, [projectRows, selectedPlatform, selectedAlert, selectedRelease, searchQuery]);

  // 4. Filter Tab 3: Catálogo Releases
  const filteredReleaseRows = useMemo(() => {
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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = row.code.toLowerCase().includes(q);
        const matchesName = row.name.toLowerCase().includes(q);
        const matchesMonth = row.month.toLowerCase().includes(q);
        const matchesProjs = row.assignedProjects.toLowerCase().includes(q);
        const matchesAlert =
          row.alertLevels &&
          row.alertLevels.some((al) => `nivel ${al}`.includes(q) || String(al) === q);
        const matchesPlat =
          row.platforms &&
          row.platforms.some((pl) => pl.toLowerCase().includes(q));
        if (!matchesCode && !matchesName && !matchesMonth && !matchesProjs && !matchesAlert && !matchesPlat) {
          return false;
        }
      }
      return true;
    });
  }, [releaseRows, selectedPlatform, selectedAlert, selectedRelease, searchQuery]);

  const handleDownloadExcel = () => {
    try {
      downloadGanttExcelFile(releases, projects, items);
      setToastMessage('Archivo Excel descargado correctamente con las 3 pestañas.');
      setTimeout(() => setToastMessage(null), 3500);
    } catch {
      setToastMessage('Error al generar el archivo Excel.');
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  return (
    <div
      data-testid="reports-view"
      className="flex flex-col flex-1 bg-white dark:bg-[#0C0C09] border border-[#0C0C09] dark:border-zinc-800 rounded-[4px] shadow-sm overflow-hidden min-h-0"
    >
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="reports-back-btn"
            onClick={onBackToGantt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#E2E2DC] dark:hover:bg-zinc-700 text-xs font-semibold transition cursor-pointer shadow-none"
            title="Volver a la vista del diagrama de Gantt"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Gantt</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-[3px] bg-emerald-700 text-white shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold font-display text-[#0C0C09] dark:text-zinc-100 leading-tight">
                Informes del Plan (Hojas de Cálculo)
              </h1>
              <p className="text-[11px] text-[#6B6B66] dark:text-zinc-400">
                Visualización tabular de datos con formato Excel, dependencias por fila y catálogo de releases.
              </p>
            </div>
          </div>
        </div>

        {/* Right Action: Download Excel */}
        <div className="flex items-center gap-2">
          {toastMessage && (
            <span
              className={`px-2.5 py-1 rounded-[3px] text-xs font-medium animate-fade-in ${
                toastMessage.includes('Error')
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
            >
              {toastMessage}
            </span>
          )}

          <button
            type="button"
            data-testid="reports-download-excel-btn"
            onClick={handleDownloadExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            title="Exportar libro completo (.xlsx) con las 3 pestañas"
            aria-label="Descargar Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Excel Sheet Tabs Bar (Estilo Hojas de Excel) */}
      <div className="flex items-center justify-between px-4 bg-[#EAEAE6] dark:bg-zinc-900/90 border-b border-[#0C0C09] dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {/* Tab 1: Cronograma Completo */}
          <button
            type="button"
            data-testid="reports-tab-cronograma"
            onClick={() => setActiveTab('cronograma')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-[4px] border-t-2 transition cursor-pointer shrink-0 ${
              activeTab === 'cronograma'
                ? 'bg-white dark:bg-[#0C0C09] text-[#0C0C09] dark:text-zinc-100 border-emerald-600 shadow-xs'
                : 'bg-transparent text-[#6B6B66] dark:text-zinc-400 border-transparent hover:text-[#0C0C09] dark:hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>1. Cronograma Completo</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#F4F4F1] dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700">
              {cronoRows.length}
            </span>
          </button>

          {/* Tab 2: Resumen Proyectos */}
          <button
            type="button"
            data-testid="reports-tab-projects"
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-[4px] border-t-2 transition cursor-pointer shrink-0 ${
              activeTab === 'projects'
                ? 'bg-white dark:bg-[#0C0C09] text-[#0C0C09] dark:text-zinc-100 border-emerald-600 shadow-xs'
                : 'bg-transparent text-[#6B6B66] dark:text-zinc-400 border-transparent hover:text-[#0C0C09] dark:hover:text-zinc-200'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>2. Resumen Proyectos</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#F4F4F1] dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700">
              {projectRows.length}
            </span>
          </button>

          {/* Tab 3: Catálogo Releases */}
          <button
            type="button"
            data-testid="reports-tab-releases"
            onClick={() => setActiveTab('releases')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-[4px] border-t-2 transition cursor-pointer shrink-0 ${
              activeTab === 'releases'
                ? 'bg-white dark:bg-[#0C0C09] text-[#0C0C09] dark:text-zinc-100 border-emerald-600 shadow-xs'
                : 'bg-transparent text-[#6B6B66] dark:text-zinc-400 border-transparent hover:text-[#0C0C09] dark:hover:text-zinc-200'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>3. Catálogo Releases</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#F4F4F1] dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700">
              {releaseRows.length}
            </span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-[#6B6B66] dark:text-zinc-400">
          <span>Excel View</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Sincronizado</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-white dark:bg-[#0C0C09] border-b border-[#E2E2DC] dark:border-zinc-800 text-xs shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B6B66] dark:text-zinc-400" />
            <input
              type="text"
              data-testid="reports-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en la tabla (tarea, WBS, release, proyecto, dependencia...)"
              className="w-full pl-8 pr-7 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-[#0C0C09] dark:text-zinc-100 placeholder-[#6B6B66]/60 dark:placeholder-zinc-500 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Platform Filter (Custom UI with Icons) */}
          <div ref={platformFilterMenuRef} className="relative flex items-center shrink-0">
            <button
              type="button"
              data-testid="reports-platform-filter"
              data-selected-platform={selectedPlatform}
              onClick={() => setShowPlatformFilterMenu((prev) => !prev)}
              className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-sans font-medium normal-case rounded-[3px] border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/70 outline-none cursor-pointer h-6.5 transition"
              title="Filtrar por plataforma"
            >
              {selectedPlatform === 'all' ? (
                <>
                  <Smartphone className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span>Todas</span>
                </>
              ) : selectedPlatform === 'iOS' ? (
                <AppleIosIcon
                  testId="reports-active-filter-icon-ios"
                  className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
                />
              ) : selectedPlatform === 'Android' ? (
                <AndroidIcon
                  testId="reports-active-filter-icon-android"
                  className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                />
              ) : (
                <span className="inline-flex items-center gap-1">
                  <AppleIosIcon
                    testId="reports-active-filter-icon-both-ios"
                    className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
                  />
                  <AndroidIcon
                    testId="reports-active-filter-icon-both-android"
                    className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                  />
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
            </button>

            <div
              data-testid="reports-platform-filter-menu"
              className={`absolute left-0 top-full mt-1 z-50 min-w-[84px] rounded-[4px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1 ${
                showPlatformFilterMenu ? 'flex flex-col' : 'hidden'
              }`}
            >
              <button
                type="button"
                data-testid="reports-platform-filter-option-all"
                onClick={() => {
                  setSelectedPlatform('all');
                  setShowPlatformFilterMenu(false);
                }}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[10px] font-sans font-medium cursor-pointer transition ${
                  selectedPlatform === 'all'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                title="Todas las plataformas"
              >
                <span>Todas</span>
              </button>
              <button
                type="button"
                data-testid="reports-platform-filter-option-iOS"
                onClick={() => {
                  setSelectedPlatform('iOS');
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
                  testId="reports-filter-option-icon-ios"
                  className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
                />
              </button>
              <button
                type="button"
                data-testid="reports-platform-filter-option-Android"
                onClick={() => {
                  setSelectedPlatform('Android');
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
                  testId="reports-filter-option-icon-android"
                  className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                />
              </button>
              <button
                type="button"
                data-testid="reports-platform-filter-option-iOS/Android"
                onClick={() => {
                  setSelectedPlatform('iOS/Android');
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
                  testId="reports-filter-option-icon-both-ios"
                  className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
                />
                <AndroidIcon
                  testId="reports-filter-option-icon-both-android"
                  className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                />
              </button>
            </div>

            {/* Hidden fallback select for backward compatibility with existing tests */}
            <select
              data-testid="reports-platform-select"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value as any)}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            >
              <option value="all">Todas</option>
              <option value="iOS">iOS</option>
              <option value="Android">Android</option>
              <option value="iOS/Android">iOS/Android</option>
            </select>
          </div>

          {/* Alert Level Filter */}
          <div ref={alertFilterMenuRef} className="relative flex items-center shrink-0">
            <button
              type="button"
              data-testid="reports-alert-filter"
              data-selected-alert={selectedAlert}
              onClick={() => setShowAlertFilterMenu((prev) => !prev)}
              className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-sans font-medium normal-case rounded-[3px] border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/70 outline-none cursor-pointer h-6.5 transition"
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
              <span>
                {selectedAlert === 'all'
                  ? 'Alerta'
                  : `Nivel ${selectedAlert}`}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
            </button>

            <div
              data-testid="reports-alert-filter-menu"
              className={`absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-[4px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1 ${
                showAlertFilterMenu ? 'flex flex-col' : 'hidden'
              }`}
            >
              <button
                type="button"
                data-testid="reports-alert-filter-option-all"
                onClick={() => {
                  setSelectedAlert('all');
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
              <button
                type="button"
                data-testid="reports-alert-filter-option-0"
                onClick={() => {
                  setSelectedAlert(0);
                  setShowAlertFilterMenu(false);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-sans font-medium cursor-pointer transition text-left ${
                  selectedAlert === 0
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-zinc-400 shrink-0" />
                <span>Nivel 0 (Normal)</span>
              </button>
              <button
                type="button"
                data-testid="reports-alert-filter-option-1"
                onClick={() => {
                  setSelectedAlert(1);
                  setShowAlertFilterMenu(false);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-sans font-medium cursor-pointer transition text-left ${
                  selectedAlert === 1
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>Nivel 1 (Baja)</span>
              </button>
              <button
                type="button"
                data-testid="reports-alert-filter-option-2"
                onClick={() => {
                  setSelectedAlert(2);
                  setShowAlertFilterMenu(false);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-sans font-medium cursor-pointer transition text-left ${
                  selectedAlert === 2
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                <span>Nivel 2 (Media)</span>
              </button>
              <button
                type="button"
                data-testid="reports-alert-filter-option-3"
                onClick={() => {
                  setSelectedAlert(3);
                  setShowAlertFilterMenu(false);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-sans font-medium cursor-pointer transition text-left ${
                  selectedAlert === 3
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>Nivel 3 (Alta)</span>
              </button>
            </div>
          </div>

          {/* Release Filter */}
          {releases.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] font-mono text-[#6B6B66] dark:text-zinc-400">Release:</span>
              <select
                data-testid="reports-release-select"
                value={selectedRelease}
                onChange={(e) => setSelectedRelease(e.target.value)}
                className="px-2 py-0.5 rounded-[3px] border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer max-w-[160px] truncate h-6.5 font-sans"
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

          {/* Columns Configurator Dropdown */}
          <div className="relative shrink-0" ref={columnsMenuRef}>
            <button
              type="button"
              data-testid="reports-columns-btn"
              onClick={() => setShowColumnsMenu((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[3px] border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer h-6.5"
              title="Configurar columnas visibles de esta tabla"
            >
              <SlidersHorizontal className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Columnas</span>
              <span className="px-1 rounded bg-zinc-100 dark:bg-zinc-700 font-mono text-[9px]">
                {COLUMNS_BY_TAB[activeTab].filter((c) => isColVisible(activeTab, c.key)).length}/{COLUMNS_BY_TAB[activeTab].length}
              </span>
            </button>
            {showColumnsMenu && (
              <div
                data-testid="reports-columns-menu"
                className="absolute right-0 top-full mt-1 w-60 max-h-80 overflow-y-auto bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[4px] shadow-2xl z-50 p-1.5 flex flex-col gap-0.5"
              >
                <div className="flex items-center justify-between px-2 py-1 border-b border-slate-200 dark:border-zinc-800 mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Columnas visibles
                  </span>
                  <button
                    type="button"
                    data-testid="reports-columns-reset-btn"
                    onClick={() => resetReportCols(activeTab)}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                  >
                    Mostrar todas
                  </button>
                </div>
                {COLUMNS_BY_TAB[activeTab].map((col) => {
                  const visible = isColVisible(activeTab, col.key);
                  return (
                    <button
                      key={col.key}
                      type="button"
                      data-testid={`report-col-toggle-${activeTab}-${col.key}`}
                      onClick={() => toggleReportCol(activeTab, col.key)}
                      className="flex items-center gap-2 px-2 py-1 rounded-[3px] text-[11px] text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center shrink-0 ${
                          visible
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900'
                        }`}
                      >
                        {visible && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                      <span className="truncate">{col.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Clear Filters Button */}
          {(searchQuery || selectedPlatform !== 'all' || selectedAlert !== 'all' || selectedRelease !== 'all') && (
            <button
              type="button"
              data-testid="reports-clear-filters-btn"
              onClick={() => {
                setSearchQuery('');
                setSelectedPlatform('all');
                setSelectedAlert('all');
                setSelectedRelease('all');
              }}
              className="px-2 py-0.5 text-[11px] text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white underline cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Main Table Content (Spreadsheet View) */}
      <div className="flex-1 overflow-auto bg-white dark:bg-[#0C0C09] min-h-0 select-text">
        {activeTab === 'cronograma' && (
          <div className="min-w-full inline-block align-middle">
            <table className="w-full table-fixed border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border-b-2 border-[#0C0C09] dark:border-zinc-700 font-mono text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-2.5 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 w-12 text-center bg-[#ECECE8] dark:bg-zinc-900 text-[#6B6B66] select-none">
                    #
                  </th>
                  {CRONO_COLUMNS.map((col) =>
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
                {filteredCronoRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={1 + CRONO_COLUMNS.filter((c) => isColVisible('cronograma', c.key)).length}
                      className="px-4 py-8 text-center text-[#6B6B66] dark:text-zinc-400 font-sans"
                    >
                      No se encontraron elementos en el cronograma que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  filteredCronoRows.map((row, idx) => {
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

                    const rowBgClass = isRelease
                      ? 'bg-slate-100/80 dark:bg-zinc-800/80 font-bold text-[#0C0C09] dark:text-zinc-100'
                      : isProject
                      ? 'bg-indigo-50/40 dark:bg-indigo-950/20 font-semibold text-[#0C0C09] dark:text-zinc-200'
                      : idx % 2 === 0
                      ? 'bg-white dark:bg-[#0C0C09]'
                      : 'bg-[#FAFAF8] dark:bg-zinc-900/30';

                    return (
                      <tr
                        key={row.rowId}
                        className={`${rowBgClass} hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 transition-colors`}
                      >
                        {/* Excel Row Index */}
                        <td className="px-2.5 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 text-center text-[10px] text-[#6B6B66] dark:text-zinc-500 bg-[#ECECE8]/40 dark:bg-zinc-900/50 select-none">
                          {idx + 1}
                        </td>

                        {/* Jerarquía */}
                        {isColVisible('cronograma', 'hierarchy') && (
                          <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap overflow-hidden">
                            {isRelease ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-slate-800 text-white dark:bg-zinc-100 dark:text-[#0C0C09] text-[10px] font-bold">
                                <Rocket className="w-2.5 h-2.5" /> RELEASE
                              </span>
                            ) : isProject ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-indigo-700 text-white text-[10px] font-bold">
                                <FolderKanban className="w-2.5 h-2.5" /> PROYECTO
                              </span>
                            ) : isMilestone ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/40 text-[10px] font-semibold">
                                ◆ HITO
                              </span>
                            ) : isDepSubRow ? (
                              <span className="text-slate-400 dark:text-zinc-500 text-[10px] pl-4">
                                └─ Dependencia
                              </span>
                            ) : (
                              <span className="text-slate-600 dark:text-zinc-400 text-[10px]">
                                TAREA
                              </span>
                            )}
                          </td>
                        )}

                        {/* WBS Code */}
                        {isColVisible('cronograma', 'wbsCode') && (
                          <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap font-bold text-[#0C0C09] dark:text-zinc-200 truncate">
                            {row.wbsCode}
                          </td>
                        )}

                        {/* Name (Editable text) */}
                        {isColVisible('cronograma', 'name') && (
                          <td className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 font-sans text-xs font-medium text-[#0C0C09] dark:text-zinc-100">
                            {linkedItem && onUpdateItem && !isDepSubRow ? (
                              <EditableReportTextCell
                                testId={`report-crono-name-${linkedItem.id}`}
                                value={linkedItem.name}
                                onCommit={(next) =>
                                  onUpdateItem({ ...linkedItem, name: next || linkedItem.name }, false)
                                }
                              />
                            ) : linkedProject && onUpdateProject ? (
                              <EditableReportTextCell
                                testId={`report-crono-proj-name-${linkedProject.id}`}
                                value={linkedProject.name}
                                className="font-semibold"
                                onCommit={(next) =>
                                  onUpdateProject({ ...linkedProject, name: next || linkedProject.name })
                                }
                              />
                            ) : linkedRelease && onUpdateRelease ? (
                              <EditableReportTextCell
                                testId={`report-crono-rel-name-${linkedRelease.id}`}
                                value={linkedRelease.name}
                                className="font-bold"
                                onCommit={(next) =>
                                  onUpdateRelease({ ...linkedRelease, name: next || linkedRelease.name })
                                }
                              />
                            ) : (
                              <span className="truncate block px-1.5">{row.name}</span>
                            )}
                          </td>
                        )}

                        {/* Release (Selector) */}
                        {isColVisible('cronograma', 'releaseCode') && (
                          <td className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#6B6B66] dark:text-zinc-300">
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
                        )}

                        {/* Project */}
                        {isColVisible('cronograma', 'projectName') && (
                          <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap font-sans text-xs text-[#0C0C09] dark:text-zinc-200 overflow-hidden">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="truncate">{row.projectName}</span>
                              {isProject && row.alertLevel !== undefined && (
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
                        )}

                        {/* Platform (Selector) */}
                        {isColVisible('cronograma', 'platform') && (
                          <td className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
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
                        )}

                        {/* Type (Selector) */}
                        {isColVisible('cronograma', 'type') && (
                          <td className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#6B6B66] dark:text-zinc-400">
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
                        )}

                        {/* Start Date */}
                        {isColVisible('cronograma', 'startDate') && (
                          <td className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#0C0C09] dark:text-zinc-300">
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
                        )}

                        {/* End Date */}
                        {isColVisible('cronograma', 'endDate') && (
                          <td className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#0C0C09] dark:text-zinc-300">
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
                        )}

                        {/* Duration */}
                        {isColVisible('cronograma', 'duration') && (
                          <td className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right font-bold">
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
                        )}

                        {/* Slack */}
                        {isColVisible('cronograma', 'slack') && (
                          <td className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right text-slate-500">
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
                        )}

                        {/* Progress */}
                        {isColVisible('cronograma', 'progress') && (
                          <td className="px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-center">
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
                        )}

                        {/* Dependencia Predecesora con Nombre del Elemento */}
                        {isColVisible('cronograma', 'dependency') && (
                          <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 bg-amber-50/20 dark:bg-amber-950/10 font-sans text-xs overflow-hidden">
                            {row.dependency !== '—' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300/60 dark:border-amber-700/60 font-medium max-w-full">
                                <Link2 className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                                <span className="font-semibold truncate">{row.dependency}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">—</span>
                            )}
                          </td>
                        )}

                        {/* Ruta Crítica */}
                        {isColVisible('cronograma', 'isCritical') && (
                          <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-center">
                            {row.isCritical ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[10px]">
                                <Flame className="w-3 h-3 text-rose-600" /> SÍ
                              </span>
                            ) : (
                              <span className="text-slate-400">NO</span>
                            )}
                          </td>
                        )}

                        {/* Hito Externo (Checkbox toggle) */}
                        {isColVisible('cronograma', 'isExternal') && (
                          <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-center">
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
                        )}

                        {/* Cumplimiento Release */}
                        {isColVisible('cronograma', 'compliance') && (
                          <td className="px-3 py-1.5 whitespace-nowrap overflow-hidden">
                            {row.compliance === 'Conforme' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]">
                                <CheckCircle2 className="w-3 h-3 shrink-0" /> Conforme
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-800">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                <span className="truncate">{row.compliance}</span>
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Resumen Proyectos */}
        {activeTab === 'projects' && (
          <div className="min-w-full inline-block align-middle">
            <table className="w-full table-fixed border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border-b-2 border-[#0C0C09] dark:border-zinc-700 font-mono text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-2.5 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 w-12 text-center bg-[#ECECE8] dark:bg-zinc-900 text-[#6B6B66] select-none">
                    #
                  </th>
                  {PROJECT_COLUMNS.map((col) => renderResizableTh('projects', col))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E2DC] dark:divide-zinc-800 font-mono text-[11px]">
                {filteredProjectRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={1 + PROJECT_COLUMNS.filter((c) => isColVisible('projects', c.key)).length}
                      className="px-4 py-8 text-center text-[#6B6B66] dark:text-zinc-400 font-sans"
                    >
                      No se encontraron proyectos que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  filteredProjectRows.map((row, idx) => {
                    const linkedProj = row.projectId
                      ? projectById.get(row.projectId)
                      : projects.find((p) => p.name === row.projectName);
                    return (
                      <tr
                        key={row.projectId || row.code}
                        className="bg-white dark:bg-[#0C0C09] hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors"
                      >
                        <td className="px-2.5 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 text-center text-[10px] text-[#6B6B66] bg-[#ECECE8]/40 dark:bg-zinc-900 select-none">
                          {idx + 1}
                        </td>
                        {isColVisible('projects', 'code') && (
                          <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 font-bold text-[#0C0C09] dark:text-zinc-100 truncate">
                            {row.code}
                          </td>
                        )}
                        {isColVisible('projects', 'projectName') && (
                          <td className="px-2 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 font-sans text-xs font-bold text-[#0C0C09] dark:text-zinc-100">
                            {linkedProj && onUpdateProject ? (
                              <EditableReportTextCell
                                testId={`report-proj-name-${linkedProj.id}`}
                                value={linkedProj.name}
                                className="font-bold"
                                onCommit={(next) =>
                                  onUpdateProject({ ...linkedProj, name: next || linkedProj.name })
                                }
                              />
                            ) : (
                              <span className="truncate block px-1">{row.projectName}</span>
                            )}
                          </td>
                        )}
                        {isColVisible('projects', 'platform') && (
                          <td className="px-2 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
                            {linkedProj && onUpdateProject ? (
                              <select
                                data-testid={`report-proj-platform-${linkedProj.id}`}
                                value={normalizePlatform(linkedProj.platform) || 'iOS/Android'}
                                onChange={(e) =>
                                  onUpdateProject({
                                    ...linkedProj,
                                    platform: e.target.value as ProjectPlatform,
                                  })
                                }
                                className="w-full px-1.5 py-0.5 rounded-[2px] border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[10px] font-bold bg-transparent outline-none cursor-pointer"
                              >
                                <option value="iOS">iOS</option>
                                <option value="Android">Android</option>
                                <option value="iOS/Android">iOS/Android</option>
                              </select>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold ${
                                  row.platform === 'iOS'
                                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                    : row.platform === 'Android'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                }`}
                              >
                                {row.platform}
                              </span>
                            )}
                          </td>
                        )}
                        {isColVisible('projects', 'alertLevel') && (
                          <td className="px-2 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
                            {linkedProj && onUpdateProject ? (
                              <select
                                data-testid={`report-project-alert-badge-${row.code}`}
                                value={linkedProj.alertLevel ?? 0}
                                onChange={(e) =>
                                  onUpdateProject({
                                    ...linkedProj,
                                    alertLevel: Number(e.target.value) as ProjectAlertLevel,
                                  })
                                }
                                className={`w-full px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border outline-none cursor-pointer ${
                                  row.alertLevel === 1
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                    : row.alertLevel === 2
                                    ? 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800'
                                    : row.alertLevel === 3
                                    ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                    : 'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                                }`}
                              >
                                <option value={0}>Nivel 0</option>
                                <option value={1}>Nivel 1</option>
                                <option value={2}>Nivel 2</option>
                                <option value={3}>Nivel 3</option>
                              </select>
                            ) : (
                              <span
                                data-testid={`report-project-alert-badge-${row.code}`}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                  row.alertLevel === 1
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                    : row.alertLevel === 2
                                    ? 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800'
                                    : row.alertLevel === 3
                                    ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                    : 'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                                }`}
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
                                <span>Nivel {row.alertLevel}</span>
                              </span>
                            )}
                          </td>
                        )}
                        {isColVisible('projects', 'releaseCode') && (
                          <td className="px-2 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#0C0C09] dark:text-zinc-300">
                            {linkedProj && onUpdateProject ? (
                              <select
                                data-testid={`report-proj-release-${linkedProj.id}`}
                                value={linkedProj.releaseId || ''}
                                onChange={(e) =>
                                  onUpdateProject({
                                    ...linkedProj,
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
                        )}
                        {isColVisible('projects', 'startDate') && (
                          <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
                            {row.startDate}
                          </td>
                        )}
                        {isColVisible('projects', 'endDate') && (
                          <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
                            {row.endDate}
                          </td>
                        )}
                        {isColVisible('projects', 'duration') && (
                          <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right font-bold">
                            {row.duration} d
                          </td>
                        )}
                        {isColVisible('projects', 'progress') && (
                          <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-12 h-1.5 bg-[#E2E2DC] dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-600"
                                  style={{ width: `${Math.min(100, Math.max(0, row.progress))}%` }}
                                />
                              </div>
                              <span>{row.progress}%</span>
                            </div>
                          </td>
                        )}
                        {isColVisible('projects', 'tasksCount') && (
                          <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right">
                            {row.tasksCount}
                          </td>
                        )}
                        {isColVisible('projects', 'milestonesCount') && (
                          <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right font-semibold text-amber-600 dark:text-amber-400">
                            {row.milestonesCount}
                          </td>
                        )}
                        {isColVisible('projects', 'description') && (
                          <td className="px-2 py-1.5 font-sans text-xs text-[#6B6B66] dark:text-zinc-400 whitespace-pre-line leading-relaxed">
                            {linkedProj && onUpdateProject ? (
                              <div className="flex flex-col gap-1">
                                <EditableReportTextCell
                                  testId={`report-proj-desc-${linkedProj.id}`}
                                  value={linkedProj.description || ''}
                                  placeholder="Añadir descripción del proyecto..."
                                  multiline
                                  onCommit={(next) =>
                                    onUpdateProject({ ...linkedProj, description: next })
                                  }
                                />
                                {row.description && (
                                  <div className="text-[10px] text-[#6B6B66] dark:text-zinc-500 whitespace-pre-line px-1.5">
                                    {row.description}
                                  </div>
                                )}
                              </div>
                            ) : (
                              row.description || '—'
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Catálogo Releases */}
        {activeTab === 'releases' && (
          <div className="min-w-full inline-block align-middle">
            <table className="w-full table-fixed border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border-b-2 border-[#0C0C09] dark:border-zinc-700 font-mono text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-2.5 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 w-12 text-center bg-[#ECECE8] dark:bg-zinc-900 text-[#6B6B66] select-none">
                    #
                  </th>
                  {RELEASE_COLUMNS.map((col) => renderResizableTh('releases', col))}
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
                    return (
                      <tr
                        key={row.releaseId || row.code}
                        className="bg-white dark:bg-[#0C0C09] hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors"
                      >
                        <td className="px-2.5 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 text-center text-[10px] text-[#6B6B66] bg-[#ECECE8]/40 dark:bg-zinc-900 select-none">
                          {idx + 1}
                        </td>
                        {isColVisible('releases', 'code') && (
                          <td className="px-2 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
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
                        )}
                        {isColVisible('releases', 'name') && (
                          <td className="px-2 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 font-sans text-xs font-bold text-[#0C0C09] dark:text-zinc-100">
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
                        )}
                        {isColVisible('releases', 'month') && (
                          <td className="px-2 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#6B6B66] dark:text-zinc-300">
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
                        )}
                        {isColVisible('releases', 'startDate') && (
                          <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
                            {row.startDate}
                          </td>
                        )}
                        {isColVisible('releases', 'endDate') && (
                          <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
                            {row.endDate}
                          </td>
                        )}
                        {isColVisible('releases', 'duration') && (
                          <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right font-bold">
                            {row.duration} d
                          </td>
                        )}
                        {isColVisible('releases', 'assignedProjects') && (
                          <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 font-sans text-xs text-[#0C0C09] dark:text-zinc-200 truncate">
                            {row.assignedProjects}
                          </td>
                        )}
                        {isColVisible('releases', 'keyMilestones') && (
                          <td className="px-3 py-2 font-mono text-[10px] text-[#6B6B66] dark:text-zinc-400 truncate">
                            {row.keyMilestones}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Excel Sheet Footer Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#F4F4F1] dark:bg-zinc-900 border-t border-[#0C0C09] dark:border-zinc-800 text-[11px] font-mono text-[#6B6B66] dark:text-zinc-400 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 font-semibold text-[#0C0C09] dark:text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Listo
          </span>
          <span>
            Pestaña activa:{' '}
            <strong className="text-[#0C0C09] dark:text-zinc-200">
              {activeTab === 'cronograma'
                ? 'Cronograma Completo'
                : activeTab === 'projects'
                ? 'Resumen Proyectos'
                : 'Catálogo Releases'}
            </strong>
          </span>
          <span>
            Registros:{' '}
            <strong className="text-[#0C0C09] dark:text-zinc-200">
              {activeTab === 'cronograma'
                ? `${filteredCronoRows.length} de ${cronoRows.length}`
                : activeTab === 'projects'
                ? `${filteredProjectRows.length} de ${projectRows.length}`
                : `${filteredReleaseRows.length} de ${releaseRows.length}`}
            </strong>
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <span>Formato: XLSX Compatible</span>
          <span>100% Sincronizado</span>
        </div>
      </div>
    </div>
  );
};
