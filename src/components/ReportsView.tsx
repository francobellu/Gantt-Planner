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
} from 'lucide-react';
import {
  ComputedGanttItem,
  GanttProject,
  Release,
  ProjectPlatform,
  ProjectAlertLevel,
} from '../types/gantt';
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

interface ReportsViewProps {
  releases: Release[];
  projects: GanttProject[];
  items: ComputedGanttItem[];
  onBackToGantt: () => void;
  initialTab?: 'cronograma' | 'projects' | 'releases';
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  releases,
  projects,
  items,
  onBackToGantt,
  initialTab = 'cronograma',
}) => {
  const [activeTab, setActiveTab] = useState<'cronograma' | 'projects' | 'releases'>(initialTab);
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border-b-2 border-[#0C0C09] dark:border-zinc-700 font-mono text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-2.5 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 w-12 text-center bg-[#ECECE8] dark:bg-zinc-900 text-[#6B6B66] select-none">
                    #
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Jerarquía
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Código WBS
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 min-w-[240px]">
                    Nombre del Elemento
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Release
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Proyecto
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Plataforma
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Tipo
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Inicio
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Fin
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap text-right">
                    Duración (Días)
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap text-right">
                    Holgura
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap text-center">
                    Progreso
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 min-w-[220px] bg-amber-50/50 dark:bg-amber-950/20 text-amber-950 dark:text-amber-200">
                    Dependencia Predecesora (Nombre)
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap text-center">
                    Ruta Crítica
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap text-center">
                    Hito Ext.
                  </th>
                  <th className="px-3 py-2 whitespace-nowrap">
                    Cumplimiento Release
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E2DC] dark:divide-zinc-800 font-mono text-[11px]">
                {filteredCronoRows.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="px-4 py-8 text-center text-[#6B6B66] dark:text-zinc-400 font-sans">
                      No se encontraron elementos en el cronograma que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  filteredCronoRows.map((row, idx) => {
                    const isRelease = row.level === 'RELEASE';
                    const isProject = row.level === 'PROYECTO';
                    const isMilestone = row.level === 'HITO';
                    const isDepSubRow = row.isDepRow;

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
                        <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
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

                        {/* WBS Code */}
                        <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap font-bold text-[#0C0C09] dark:text-zinc-200">
                          {row.wbsCode}
                        </td>

                        {/* Name */}
                        <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 font-sans text-xs font-medium text-[#0C0C09] dark:text-zinc-100">
                          {row.name}
                        </td>

                        {/* Release */}
                        <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#6B6B66] dark:text-zinc-300">
                          {row.releaseCode}
                        </td>

                        {/* Project */}
                        <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap font-sans text-xs text-[#0C0C09] dark:text-zinc-200">
                          <div className="flex items-center gap-1.5">
                            <span>{row.projectName}</span>
                            {isProject && row.alertLevel !== undefined && (
                              <span
                                data-testid={`cronograma-project-alert-badge-${row.wbsCode}`}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${
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

                        {/* Platform */}
                        <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
                          {row.platform !== '—' ? (
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
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Type */}
                        <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#6B6B66] dark:text-zinc-400">
                          {row.type}
                        </td>

                        {/* Dates */}
                        <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#0C0C09] dark:text-zinc-300">
                          {row.startDate}
                        </td>
                        <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#0C0C09] dark:text-zinc-300">
                          {row.endDate}
                        </td>

                        {/* Duration */}
                        <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right font-bold">
                          {row.duration} d
                        </td>

                        {/* Slack */}
                        <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right text-slate-500">
                          {row.slack} d
                        </td>

                        {/* Progress */}
                        <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-center">
                          <span className="px-1.5 py-0.5 rounded-[2px] bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold">
                            {row.progress}
                          </span>
                        </td>

                        {/* Dependencia Predecesora con Nombre del Elemento */}
                        <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 bg-amber-50/20 dark:bg-amber-950/10 font-sans text-xs">
                          {row.dependency !== '—' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300/60 dark:border-amber-700/60 font-medium">
                              <Link2 className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                              <span className="font-semibold">{row.dependency}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>

                        {/* Ruta Crítica */}
                        <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-center">
                          {row.isCritical ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[10px]">
                              <Flame className="w-3 h-3 text-rose-600" /> SÍ
                            </span>
                          ) : (
                            <span className="text-slate-400">NO</span>
                          )}
                        </td>

                        {/* Hito Externo */}
                        <td className="px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-center">
                          {row.isExternal ? (
                            <span className="px-1.5 py-0.5 rounded-[2px] bg-amber-100 text-amber-800 text-[10px] font-bold">
                              SÍ
                            </span>
                          ) : (
                            <span className="text-slate-400">NO</span>
                          )}
                        </td>

                        {/* Cumplimiento Release */}
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          {row.compliance === 'Conforme' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> Conforme
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-800">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              {row.compliance}
                            </span>
                          )}
                        </td>
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
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border-b-2 border-[#0C0C09] dark:border-zinc-700 font-mono text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-2.5 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 w-12 text-center bg-[#ECECE8] dark:bg-zinc-900 text-[#6B6B66] select-none">
                    #
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Código
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 min-w-[220px]">
                    Proyecto
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Plataforma
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Nivel de Alerta
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Release Asignada
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Fecha Inicio
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Fecha Fin
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap text-right">
                    Duración (Días)
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap text-center">
                    Progreso
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap text-right">
                    Tareas
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap text-right">
                    Hitos
                  </th>
                  <th className="px-3 py-2 min-w-[200px]">
                    Descripción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E2DC] dark:divide-zinc-800 font-mono text-[11px]">
                {filteredProjectRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-[#6B6B66] dark:text-zinc-400 font-sans">
                      No se encontraron proyectos que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  filteredProjectRows.map((row, idx) => (
                    <tr
                      key={row.code}
                      className="bg-white dark:bg-[#0C0C09] hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors"
                    >
                      <td className="px-2.5 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 text-center text-[10px] text-[#6B6B66] bg-[#ECECE8]/40 dark:bg-zinc-900 select-none">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 font-bold text-[#0C0C09] dark:text-zinc-100">
                        {row.code}
                      </td>
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 font-sans text-xs font-bold text-[#0C0C09] dark:text-zinc-100">
                        {row.projectName}
                      </td>
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
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
                      </td>
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
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
                      </td>
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#0C0C09] dark:text-zinc-300">
                        {row.releaseCode}
                      </td>
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
                        {row.startDate}
                      </td>
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
                        {row.endDate}
                      </td>
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right font-bold">
                        {row.duration} d
                      </td>
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
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right">
                        {row.tasksCount}
                      </td>
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right font-semibold text-amber-600 dark:text-amber-400">
                        {row.milestonesCount}
                      </td>
                      <td className="px-3 py-2 font-sans text-xs text-[#6B6B66] dark:text-zinc-400 whitespace-pre-line leading-relaxed min-w-[240px]">
                        {row.description || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Catálogo Releases */}
        {activeTab === 'releases' && (
          <div className="min-w-full inline-block align-middle">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border-b-2 border-[#0C0C09] dark:border-zinc-700 font-mono text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-2.5 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 w-12 text-center bg-[#ECECE8] dark:bg-zinc-900 text-[#6B6B66] select-none">
                    #
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Código Release
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 min-w-[200px]">
                    Nombre
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Mes
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Fecha Inicio
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap">
                    Fecha Fin
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap text-right">
                    Duración (Días)
                  </th>
                  <th className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 min-w-[220px]">
                    Proyectos Asignados
                  </th>
                  <th className="px-3 py-2 min-w-[300px]">
                    Hitos Clave
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E2DC] dark:divide-zinc-800 font-mono text-[11px]">
                {filteredReleaseRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-[#6B6B66] dark:text-zinc-400 font-sans">
                      No hay releases registradas o ninguna coincide con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredReleaseRows.map((row, idx) => (
                    <tr
                      key={row.code}
                      className="bg-white dark:bg-[#0C0C09] hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors"
                    >
                      <td className="px-2.5 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 text-center text-[10px] text-[#6B6B66] bg-[#ECECE8]/40 dark:bg-zinc-900 select-none">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                        {row.code}
                      </td>
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 font-sans text-xs font-bold text-[#0C0C09] dark:text-zinc-100">
                        {row.name}
                      </td>
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#6B6B66] dark:text-zinc-300">
                        {row.month}
                      </td>
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
                        {row.startDate}
                      </td>
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap">
                        {row.endDate}
                      </td>
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right font-bold">
                        {row.duration} d
                      </td>
                      <td className="px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 font-sans text-xs text-[#0C0C09] dark:text-zinc-200">
                        {row.assignedProjects}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-[#6B6B66] dark:text-zinc-400">
                        {row.keyMilestones}
                      </td>
                    </tr>
                  ))
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
