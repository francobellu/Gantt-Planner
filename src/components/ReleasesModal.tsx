import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FolderKanban,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  GanttItem,
  GanttProject,
  Release,
  ReleaseGuideVisibility,
  ReleaseMilestone,
  TaskColor,
} from '../types/gantt';
import {
  checkTaskReleaseCompliance,
  exportReleasesToWorkbook,
  getPredefinedReleases,
  parseExcelReleases,
  RELEASE_MILESTONE_DEFINITIONS,
} from '../utils/releaseEngine';

interface ReleasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  releases: Release[];
  projects: GanttProject[];
  items?: GanttItem[];
  guideVisibility: ReleaseGuideVisibility;
  onChangeGuideVisibility: (vis: ReleaseGuideVisibility) => void;
  onUpdateReleases: (releases: Release[]) => void;
  onAssignProjectToRelease: (projectId: string, releaseId?: string) => void;
  hiddenReleaseIds?: string[];
  onToggleHideRelease?: (releaseId: string) => void;
  onResetHiddenReleases?: () => void;
}

export const ReleasesModal: React.FC<ReleasesModalProps> = ({
  isOpen,
  onClose,
  releases,
  projects,
  items = [],
  guideVisibility,
  onChangeGuideVisibility,
  onUpdateReleases,
  onAssignProjectToRelease,
  hiddenReleaseIds = [],
  onToggleHideRelease,
  onResetHiddenReleases,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(
    releases[0]?.id || null
  );
  const [editingMilestones, setEditingMilestones] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const activeRelease =
    releases.find((r) => r.id === selectedReleaseId) || releases[0];

  const filteredReleases = releases.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      (r.month && r.month.toLowerCase().includes(q))
    );
  });

  // Calculate project and compliance stats for active release
  const assignedProjects = projects.filter(
    (p) => p.releaseId === activeRelease?.id
  );

  let activeViolationsCount = 0;
  if (activeRelease) {
    for (const p of assignedProjects) {
      const pItems = items.filter((it) => it.projectId === p.id);
      for (const it of pItems) {
        const v = checkTaskReleaseCompliance(it, p, activeRelease);
        if (v.length > 0) activeViolationsCount += v.length;
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = parseExcelReleases(arrayBuffer);
      if (result.releases.length > 0) {
        onUpdateReleases(result.releases);
        setSelectedReleaseId(result.releases[0].id);
        showToast(
          `¡Éxito! Se importaron ${result.rowCount} releases y sus calendarios de hitos.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el archivo Excel';
      showToast(`Error: ${msg}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportExcel = () => {
    try {
      const wb = exportReleasesToWorkbook(releases);
      XLSX.writeFile(wb, 'GanttFlow_Calendario_Releases.xlsx');
      showToast('Descargando archivo Excel con el calendario de releases...');
    } catch {
      showToast('Error al exportar a Excel');
    }
  };

  const handleResetCatalog = () => {
    if (
      window.confirm(
        '¿Restaurar el catálogo oficial de releases con los hitos del documento Excel?'
      )
    ) {
      const defaultReleases = getPredefinedReleases();
      onUpdateReleases(defaultReleases);
      setSelectedReleaseId(defaultReleases[0]?.id || null);
      showToast('Catálogo oficial de releases restaurado.');
    }
  };

  const handleUpdateMilestoneDate = (
    releaseId: string,
    milestoneId: string,
    newDate: string
  ) => {
    const nextReleases = releases.map((rel) => {
      if (rel.id !== releaseId) return rel;
      const nextMilestones = rel.milestones.map((m) =>
        m.id === milestoneId ? { ...m, date: newDate } : m
      );
      return { ...rel, milestones: nextMilestones };
    });
    onUpdateReleases(nextReleases);
  };

  const handleCreateRelease = () => {
    const code = `T_28.${releases.length + 1}.1`;
    const newId = `rel-${code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    const milestones: ReleaseMilestone[] = RELEASE_MILESTONE_DEFINITIONS.map(
      (def) => ({
        id: `${newId}-${def.id}`,
        key: def.id,
        code: def.code,
        name: def.name,
        category: def.category,
        date: today,
        color: def.color,
      })
    );

    const newRelease: Release = {
      id: newId,
      code,
      name: `${code} NUEVA RELEASE ${new Date().getFullYear()}`,
      color: 'indigo',
      milestones,
      projectIds: [],
    };

    onUpdateReleases([newRelease, ...releases]);
    setSelectedReleaseId(newId);
    showToast(`Release ${code} creada.`);
  };

  const handleDeleteRelease = (relId: string) => {
    const rel = releases.find((r) => r.id === relId);
    if (!rel) return;
    if (window.confirm(`¿Eliminar la release ${rel.code}?`)) {
      // Unassign any project assigned to this release
      for (const p of projects) {
        if (p.releaseId === relId) {
          onAssignProjectToRelease(p.id, undefined);
        }
      }
      const next = releases.filter((r) => r.id !== relId);
      onUpdateReleases(next);
      if (selectedReleaseId === relId) {
        setSelectedReleaseId(next[0]?.id || null);
      }
      showToast(`Release ${rel.code} eliminada.`);
    }
  };

  return (
    <div
      data-testid="releases-modal"
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-[88vh] bg-white dark:bg-[#0C0C09] border border-[#0C0C09] dark:border-zinc-700 rounded-[8px] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#0C0C09] dark:border-zinc-800 bg-[#F4F4F1] dark:bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[4px] bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] flex items-center justify-center">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-display text-[#0C0C09] dark:text-white">
                  Calendario de Releases e Hitos
                </h2>
                <span className="px-2 py-0.5 rounded-[2px] bg-white dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 text-[11px] font-mono font-bold border border-[#E2E2DC] dark:border-zinc-700">
                  {releases.length} Releases
                </span>
              </div>
              <p className="text-xs text-[#6B6B66] dark:text-zinc-400">
                Gestión de trenes de entrega mensuales, hitos oficiales (QG1 a QG9) y asociación de proyectos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="release-import-excel-btn"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#0C0C09] hover:text-white dark:hover:bg-zinc-100 dark:hover:text-[#0C0C09] text-xs font-medium transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar Excel / CSV</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              data-testid="release-import-file-input"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              type="button"
              data-testid="release-export-excel-btn"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#0C0C09] hover:text-white dark:hover:bg-zinc-100 dark:hover:text-[#0C0C09] text-xs font-medium transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[4px] text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Toolbar: Guide Line Visibility & Catalog Reset */}
        <div className="px-6 py-2.5 bg-[#FAF9F5] dark:bg-zinc-900/60 border-b border-[#E2E2DC] dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#0C0C09] dark:text-zinc-200 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#6B6B66]" />
              Líneas guía en diagrama:
            </span>
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-950 p-0.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700">
              {(
                [
                  { id: 'selected', label: 'Release Activa / Proyectos' },
                  { id: 'assigned', label: 'Todas las Asignadas' },
                  { id: 'all', label: 'Todas' },
                  { id: 'none', label: 'Ocultar' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`guide-vis-${opt.id}`}
                  onClick={() => onChangeGuideVisibility(opt.id)}
                  className={`px-2 py-1 rounded-[2px] font-mono text-[11px] transition cursor-pointer ${
                    guideVisibility === opt.id
                      ? 'bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] font-bold'
                      : 'text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hiddenReleaseIds.length > 0 && onResetHiddenReleases && (
              <button
                type="button"
                data-testid="modal-reset-hidden-releases-btn"
                onClick={onResetHiddenReleases}
                className="flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs shadow-xs transition cursor-pointer"
                title="Mostrar todas las releases que están ocultas"
              >
                <Eye className="w-3 h-3" />
                <span>Mostrar todas ({hiddenReleaseIds.length} ocultas)</span>
              </button>
            )}
            <button
              type="button"
              data-testid="release-restore-defaults-btn"
              onClick={handleResetCatalog}
              className="flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Restaurar Catálogo Oficial</span>
            </button>
            <button
              type="button"
              data-testid="create-new-release-btn"
              onClick={handleCreateRelease}
              className="flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] hover:bg-[#312C85] dark:hover:bg-white font-medium transition cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Nueva Release</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Left Sidebar (Releases list) & Right Main Panel (Milestones & Assigned Projects) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Releases List */}
          <div className="w-72 sm:w-80 border-r border-[#0C0C09] dark:border-zinc-800 bg-[#F4F4F1] dark:bg-zinc-950 flex flex-col">
            <div className="p-3 border-b border-[#E2E2DC] dark:border-zinc-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B6B66]" />
                <input
                  type="text"
                  placeholder="Buscar release o mes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-700 rounded-[4px] text-[#0C0C09] dark:text-white placeholder-[#6B6B66] focus:outline-none focus:border-[#0C0C09] dark:focus:border-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#E2E2DC] dark:divide-zinc-800/80">
              {filteredReleases.map((rel) => {
                const isSelected = rel.id === activeRelease?.id;
                const relProjects = projects.filter((p) => p.releaseId === rel.id);
                const hasMilestones = rel.milestones && rel.milestones.length > 0;

                return (
                  <div
                    key={rel.id}
                    data-testid={`release-item-${rel.code}`}
                    onClick={() => setSelectedReleaseId(rel.id)}
                    className={`p-3 text-xs transition cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-white dark:bg-zinc-900 border-l-4 border-l-[#0C0C09] dark:border-l-zinc-200'
                        : 'hover:bg-white/60 dark:hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-[#0C0C09] dark:text-white">
                          {rel.code}
                        </span>
                        {rel.month && (
                          <span className="text-[10px] uppercase font-bold text-[#6B6B66] dark:text-zinc-400">
                            {rel.month}
                          </span>
                        )}
                        {hiddenReleaseIds?.includes(rel.id) && (
                          <span className="px-1 py-0.2 rounded text-[8.5px] font-mono font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                            Oculta
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-[#6B6B66] dark:text-zinc-500">
                        {rel.year}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#6B6B66] dark:text-zinc-400">
                      <span>
                        {hasMilestones
                          ? `${rel.milestones.length} hitos`
                          : 'Sin hitos (Vacante)'}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] ${
                          relProjects.length > 0
                            ? 'bg-[#0C0C09] text-white dark:bg-zinc-200 dark:text-[#0C0C09] font-bold'
                            : 'bg-slate-200 dark:bg-zinc-800 text-[#6B6B66] dark:text-zinc-400'
                        }`}
                      >
                        {relProjects.length} proyectos
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Active Release Details, Milestones & Projects */}
          {activeRelease ? (
            <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-[#0C0C09] p-6 space-y-6">
              {/* Active Release Card Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2E2DC] dark:border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold font-display text-[#0C0C09] dark:text-white">
                      {activeRelease.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 text-xs font-mono font-bold border border-[#E2E2DC] dark:border-zinc-700">
                      {activeRelease.code}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6B66] dark:text-zinc-400 mt-1">
                    {assignedProjects.length} proyectos asignados a este tren de entrega
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {onToggleHideRelease && (
                    <button
                      type="button"
                      data-testid={`modal-toggle-hide-release-${activeRelease.id}`}
                      onClick={() => onToggleHideRelease(activeRelease.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border text-xs font-medium transition cursor-pointer ${
                        hiddenReleaseIds?.includes(activeRelease.id)
                          ? 'bg-amber-100 border-amber-400 text-amber-800 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-200'
                          : 'bg-white border-[#0C0C09] dark:bg-zinc-900 dark:border-zinc-700 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1]'
                      }`}
                      title={
                        hiddenReleaseIds?.includes(activeRelease.id)
                          ? 'Mostrar release y proyectos en el cronograma'
                          : 'Ocultar release y proyectos del cronograma'
                      }
                    >
                      {hiddenReleaseIds?.includes(activeRelease.id) ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                          <span>Release Oculta</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Visible en Gantt</span>
                        </>
                      )}
                    </button>
                  )}
                  {activeViolationsCount > 0 ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>{activeViolationsCount} desalineaciones detectadas</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Proyectos a tiempo</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteRelease(activeRelease.id)}
                    className="p-1.5 rounded-[4px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-transparent hover:border-rose-300 transition cursor-pointer"
                    title="Eliminar esta release"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Section: Asignación de Proyectos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400">
                    Proyectos Incluidos en esta Release
                  </h4>
                  <span className="text-[11px] text-[#6B6B66] dark:text-zinc-400">
                    Selecciona qué proyectos forman parte de {activeRelease.code}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {projects.map((proj) => {
                    const isAssigned = proj.releaseId === activeRelease.id;
                    const assignedToOther =
                      proj.releaseId && proj.releaseId !== activeRelease.id
                        ? releases.find((r) => r.id === proj.releaseId)
                        : null;

                    return (
                      <label
                        key={proj.id}
                        data-testid={`project-assign-checkbox-${proj.id}`}
                        className={`p-2.5 rounded-[4px] border flex items-center justify-between gap-2 cursor-pointer transition text-xs ${
                          isAssigned
                            ? 'bg-[#0C0C09] text-white border-[#0C0C09] dark:bg-zinc-100 dark:text-[#0C0C09] font-medium shadow-sm'
                            : 'bg-[#F4F4F1] dark:bg-zinc-900 border-[#E2E2DC] dark:border-zinc-800 text-[#0C0C09] dark:text-zinc-300 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={(e) => {
                              onAssignProjectToRelease(
                                proj.id,
                                e.target.checked ? activeRelease.id : undefined
                              );
                            }}
                            className="rounded border-[#E2E2DC] dark:border-zinc-700 text-[#0C0C09]"
                          />
                          <span className="truncate">{proj.name}</span>
                        </div>

                        {assignedToOther && !isAssigned && (
                          <span className="text-[10px] font-mono px-1 rounded bg-slate-200 dark:bg-zinc-800 text-[#6B6B66] dark:text-zinc-400">
                            {assignedToOther.code}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section: Calendario de Hitos Oficiales de la Release */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400">
                    Calendario Oficial de Hitos ({activeRelease.milestones.length})
                  </h4>
                  <span className="text-[11px] text-[#6B6B66] dark:text-zinc-400">
                    Los proyectos asignados deben cumplir estas fechas límite
                  </span>
                </div>

                {activeRelease.milestones.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-[#E2E2DC] dark:border-zinc-800 rounded-[6px] text-xs text-[#6B6B66] dark:text-zinc-400">
                    Esta release no tiene hitos cargados. Puedes restaurar el catálogo oficial o importar desde Excel.
                  </div>
                ) : (
                  <div className="border border-[#E2E2DC] dark:border-zinc-800 rounded-[6px] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#E2E2DC] dark:border-zinc-800 font-mono text-[11px] text-[#6B6B66] dark:text-zinc-400">
                          <tr>
                            <th className="py-2.5 px-3">Código</th>
                            <th className="py-2.5 px-3">Fase / Categoría</th>
                            <th className="py-2.5 px-3">Nombre del Hito</th>
                            <th className="py-2.5 px-3">Fecha Límite</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E2DC] dark:divide-zinc-800/80">
                          {activeRelease.milestones.map((m) => {
                            const def = RELEASE_MILESTONE_DEFINITIONS.find(
                              (d) => d.id === m.key
                            );

                            return (
                              <tr
                                key={m.id}
                                className="hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition"
                              >
                                <td className="py-2 px-3 font-mono font-bold text-[#0C0C09] dark:text-white">
                                  <span className="px-1.5 py-0.5 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700">
                                    {m.code}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-[#6B6B66] dark:text-zinc-400 font-mono text-[11px]">
                                  {m.category}
                                </td>
                                <td className="py-2 px-3 font-medium text-[#0C0C09] dark:text-zinc-200">
                                  {m.name}
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="date"
                                    value={m.date}
                                    onChange={(e) =>
                                      handleUpdateMilestoneDate(
                                        activeRelease.id,
                                        m.id,
                                        e.target.value
                                      )
                                    }
                                    className="px-2 py-1 text-xs font-mono bg-white dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-700 rounded-[4px] text-[#0C0C09] dark:text-white focus:outline-none focus:border-[#0C0C09] dark:focus:border-white"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-xs text-[#6B6B66] dark:text-zinc-400">
              Selecciona una release del panel izquierdo
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#0C0C09] dark:border-zinc-800 bg-[#F4F4F1] dark:bg-zinc-950 flex items-center justify-between">
          <div className="text-xs text-[#6B6B66] dark:text-zinc-400">
            {toastMessage && (
              <span className="font-semibold text-[#0C0C09] dark:text-white animate-fade-in">
                {toastMessage}
              </span>
            )}
          </div>
          <button
            type="button"
            data-testid="close-releases-modal-btn"
            onClick={onClose}
            className="px-5 py-2 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] font-display font-semibold text-xs transition cursor-pointer"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
