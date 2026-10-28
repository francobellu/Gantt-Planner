import React, { useEffect, useMemo, useRef, useState } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Compass,
  Diamond,
  Download,
  FileSpreadsheet,
  Flame,
  FolderKanban,
  FolderPlus,
  GitBranch,
  Layers,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  ComputedGanttItem,
  GanttItem,
  GanttProject,
  TaskColor,
  TaskType,
  ZoomLevel,
} from './types/gantt';
import {
  cascadeDependencies,
  computeGanttMetrics,
  formatDateDisplay,
  formatDateISO,
  getProjectTemplates,
  groupItemsByProject,
  parseDateSafe,
  sanitizeGanttItem,
  sanitizeProject,
} from './utils/ganttEngine';
import { GanttWorkspace } from './components/GanttWorkspace';
import { TaskFormModal } from './components/TaskFormModal';

const STORAGE_KEY = 'ganttflow_pro_state_v2';

const PROJECT_COLORS: { value: TaskColor; bg: string }[] = [
  { value: 'indigo', bg: 'bg-indigo-500' },
  { value: 'violet', bg: 'bg-violet-500' },
  { value: 'emerald', bg: 'bg-emerald-500' },
  { value: 'blue', bg: 'bg-blue-500' },
  { value: 'amber', bg: 'bg-amber-500' },
  { value: 'rose', bg: 'bg-rose-500' },
  { value: 'cyan', bg: 'bg-cyan-500' },
];

export function App() {
  const templates = useMemo(() => getProjectTemplates(), []);

  const [projectName, setProjectName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.projectName) return parsed.projectName;
      }
    } catch {
      // ignore storage errors
    }
    return templates[0].name;
  });

  const [projects, setProjects] = useState<GanttProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
          return parsed.projects.map((raw: Partial<GanttProject>, i: number) =>
            sanitizeProject(raw, i)
          );
        }
      }
    } catch {
      // ignore storage errors
    }
    return templates[0].projects;
  });

  const [items, setItems] = useState<GanttItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          return parsed.items.map((raw: Partial<GanttItem>, i: number) =>
            sanitizeGanttItem(raw, i)
          );
        }
      }
    } catch {
      // ignore storage errors
    }
    return templates[0].items;
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ganttflow_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const [zoom, setZoom] = useState<ZoomLevel>('day');
  const [showCriticalPath, setShowCriticalPath] = useState<boolean>(true);
  const [showCpmFloat, setShowCpmFloat] = useState<boolean>(false);
  const [autoCascade, setAutoCascade] = useState<boolean>(true);
  const [groupByProject, setGroupByProject] = useState<boolean>(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // New Project inline creator state
  const [showNewProjectBar, setShowNewProjectBar] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectColor, setNewProjectColor] = useState<TaskColor>('indigo');

  // Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ComputedGanttItem | null>(null);
  const [defaultModalType, setDefaultModalType] = useState<TaskType>('task');
  const [defaultModalProjectId, setDefaultModalProjectId] = useState<string | undefined>(
    undefined
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('ganttflow_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('ganttflow_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ projectName, projects, items })
      );
    } catch {
      // ignore quota errors
    }
  }, [projectName, projects, items]);

  // Compute enriched items with WBS, Slack End Dates, Critical Path (CPM), and Conflict flags
  const computedItems = useMemo(() => computeGanttMetrics(items), [items]);

  // Compute project groups with rolled-up dates, durations, and hierarchical WBS
  const projectGroups = useMemo(
    () => groupItemsByProject(computedItems, projects),
    [computedItems, projects]
  );

  // Project KPI metrics
  const metrics = useMemo(() => {
    if (computedItems.length === 0) {
      return {
        startStr: formatDateISO(new Date()),
        endStr: formatDateISO(new Date()),
        totalDays: 0,
        projectsCount: projects.length,
        tasksCount: 0,
        milestonesCount: 0,
        criticalCount: 0,
        totalSlackDays: 0,
        avgProgress: 0,
        conflictCount: 0,
      };
    }

    let minStart = parseDateSafe(computedItems[0].startDate);
    let maxEnd = parseDateSafe(computedItems[0].endDate);
    let tasksCount = 0;
    let milestonesCount = 0;
    let criticalCount = 0;
    let totalSlackDays = 0;
    let progressSum = 0;
    let conflictCount = 0;

    for (const it of computedItems) {
      const s = parseDateSafe(it.startDate);
      const e = parseDateSafe(it.endDate);
      if (s < minStart) minStart = s;
      if (e > maxEnd) maxEnd = e;

      if (it.type === 'milestone') {
        milestonesCount++;
      } else {
        tasksCount++;
        totalSlackDays += it.slack || 0;
        progressSum += it.progress || 0;
      }

      if (it.isCritical) criticalCount++;
      if (it.hasConflict) conflictCount++;
    }

    const totalDays = Math.max(1, differenceInCalendarDays(maxEnd, minStart) + 1);
    const avgProgress = tasksCount > 0 ? Math.round(progressSum / tasksCount) : 0;

    return {
      startStr: formatDateISO(minStart),
      endStr: formatDateISO(maxEnd),
      totalDays,
      projectsCount: projectGroups.length,
      tasksCount,
      milestonesCount,
      criticalCount,
      totalSlackDays,
      avgProgress,
      conflictCount,
    };
  }, [computedItems, projects.length, projectGroups.length]);

  const handleSaveFromModal = (savedItem: GanttItem, cascade: boolean) => {
    const cleanItem = sanitizeGanttItem({
      ...savedItem,
      projectId: savedItem.projectId || projects[0]?.id,
    });
    setItems((prev) => {
      const exists = prev.some((it) => it.id === cleanItem.id);
      const next = exists
        ? prev.map((it) => (it.id === cleanItem.id ? cleanItem : it))
        : [...prev, cleanItem];
      return cascade ? cascadeDependencies(next) : next;
    });
  };

  const handleUpdateInline = (updatedItem: GanttItem, cascade: boolean) => {
    const cleanItem = sanitizeGanttItem(updatedItem);
    setItems((prev) => {
      const next = prev.map((it) => (it.id === cleanItem.id ? cleanItem : it));
      return cascade ? cascadeDependencies(next) : next;
    });
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) =>
      prev
        .filter((it) => it.id !== id)
        .map((it) => ({
          ...it,
          dependencies: it.dependencies.filter((depId) => depId !== id),
        }))
    );
  };

  const handleDuplicateItem = (item: ComputedGanttItem) => {
    const copy = sanitizeGanttItem({
      ...item,
      id: `${item.type === 'milestone' ? 'm' : 't'}-${Date.now()}`,
      name: `${item.name} (Copia)`,
    });
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === item.id);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const handleOpenCreateModal = (type: TaskType, projectId?: string) => {
    setEditingItem(null);
    setDefaultModalType(type);
    setDefaultModalProjectId(
      projectId || (selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id)
    );
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: ComputedGanttItem) => {
    setEditingItem(item);
    setDefaultModalType(item.type);
    setDefaultModalProjectId(item.projectId || projects[0]?.id);
    setModalOpen(true);
  };

  const handleCreateProject = (newProj: GanttProject) => {
    const clean = sanitizeProject(newProj, projects.length);
    setProjects((prev) => [...prev, clean]);
  };

  const handleCreateProjectFromBar = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newProjectName.trim();
    if (!trimmed) return;
    const created = sanitizeProject(
      {
        id: `proj-${Date.now()}`,
        name: trimmed,
        color: newProjectColor,
        collapsed: false,
      },
      projects.length
    );
    setProjects((prev) => [...prev, created]);
    setNewProjectName('');
    setShowNewProjectBar(false);
    setGroupByProject(true);
  };

  const handleUpdateProject = (updatedProj: GanttProject) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProj.id ? updatedProj : p))
    );
  };

  const handleToggleProjectCollapse = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, collapsed: !p.collapsed } : p
      )
    );
  };

  const handleExpandCollapseAll = (collapsed: boolean) => {
    setProjects((prev) => prev.map((p) => ({ ...p, collapsed })));
  };

  const handleDeleteProject = (projectId: string) => {
    if (projects.length <= 1) return;
    const remaining = projects.filter((p) => p.id !== projectId);
    const fallbackId = remaining[0].id;
    setProjects(remaining);
    setItems((prev) =>
      prev.map((it) =>
        it.projectId === projectId ? { ...it, projectId: fallbackId } : it
      )
    );
    if (selectedProjectId === projectId) {
      setSelectedProjectId('all');
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const found = templates.find((t) => t.id === templateId);
    if (!found) return;
    setProjectName(found.name);
    setProjects(found.projects.map((p, idx) => sanitizeProject(p, idx)));
    setItems(found.items.map((it, idx) => sanitizeGanttItem(it, idx)));
    setSelectedProjectId('all');
  };

  const handleResolveAllConflicts = () => {
    setItems((prev) => cascadeDependencies(prev));
  };

  const scrollToToday = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const marker = container.querySelector('#gantt-today-marker') as HTMLElement | null;
    const todayX = marker ? Number(marker.getAttribute('data-today-x') || marker.offsetLeft) : 180;
    const targetLeft = Math.max(0, todayX - container.clientWidth / 3);
    container.scrollTo({
      left: targetLeft,
      behavior: 'smooth',
    });
  };

  const handleExportJSON = () => {
    const payload = JSON.stringify({ projectName, projects, items }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-gantt.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));
    const headers = [
      'WBS',
      'Proyecto',
      'Tipo',
      'Nombre',
      'Initial Date',
      'Final Date',
      'Duration (Dias)',
      'Slack (Dias)',
      'Dependencias',
      'Progreso (%)',
      'Ruta Critica',
      'Responsable',
    ];
    const rows = computedItems.map((it) => [
      it.wbs,
      `"${(projectMap.get(it.projectId || '') || 'General').replace(/"/g, '""')}"`,
      it.type === 'milestone' ? 'Hito' : 'Tarea',
      `"${it.name.replace(/"/g, '""')}"`,
      it.startDate,
      it.endDate,
      it.duration,
      it.slack,
      `"${it.dependencies.join(', ')}"`,
      it.progress,
      it.isCritical ? 'SI' : 'NO',
      `"${(it.assignee || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-gantt.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result));
        if (Array.isArray(parsed.items)) {
          if (parsed.projectName) setProjectName(parsed.projectName);
          if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
            setProjects(
              parsed.projects.map((raw: Partial<GanttProject>, i: number) =>
                sanitizeProject(raw, i)
              )
            );
          }
          setItems(
            parsed.items.map((raw: Partial<GanttItem>, i: number) =>
              sanitizeGanttItem(raw, i)
            )
          );
          setSelectedProjectId('all');
        }
      } catch {
        alert('Archivo JSON inválido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Navigation & Portfolio/Project Controls */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 py-3">
        <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand + Editable Portfolio/Project Title + Template Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="font-bold text-base sm:text-lg bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 outline-none text-slate-900 dark:text-white px-0.5"
                    title="Haz clic para renombrar el portafolio o plan maestro"
                  />
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    Multi-Proyecto + CPM
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  Diagrama de Gantt con tareas agrupadas en proyectos, ruta crítica, holguras (slack) e hitos
                </p>
              </div>
            </div>

            {/* Project Template Picker */}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  handleTemplateSelect(e.target.value);
                }
              }}
              className="text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              title="Cargar o restablecer plantilla de proyecto"
            >
              <option value="" disabled>
                📂 Cargar plantilla...
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Create Project Button */}
            <button
              type="button"
              onClick={() => setShowNewProjectBar((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-600/10 hover:bg-violet-600/20 text-violet-700 dark:text-violet-300 border border-violet-500/30 transition"
              title="Crear un nuevo proyecto para agrupar tareas"
            >
              <FolderPlus className="w-4 h-4" />
              Nuevo Proyecto
            </button>

            {/* Create Task Button */}
            <button
              type="button"
              onClick={() => handleOpenCreateModal('task')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              Nueva Tarea
            </button>

            {/* Create Milestone Button */}
            <button
              type="button"
              onClick={() => handleOpenCreateModal('milestone')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm shadow-amber-500/20 transition"
            >
              <Diamond className="w-3.5 h-3.5 fill-current" />
              Nuevo Hito
            </button>

            {/* Zoom Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <ZoomIn className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1 hidden sm:inline" />
              {(['day', 'week', 'month'] as ZoomLevel[]).map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoom(z)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    zoom === z
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {z === 'day' ? 'Día' : z === 'week' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>

            {/* Critical Path Toggle */}
            <button
              type="button"
              onClick={() => setShowCriticalPath((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                showCriticalPath
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
              title="Resaltar las tareas con Slack = 0 que determinan la fecha fin del proyecto"
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              Ruta Crítica
            </button>

            {/* Scroll to Today */}
            <button
              type="button"
              onClick={scrollToToday}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title="Centrar en Hoy"
            >
              <Compass className="w-4 h-4" />
            </button>

            {/* Export / Import Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleExportCSV}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Exportar tabla a CSV (Excel)"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Exportar proyecto en JSON"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Importar proyecto JSON"
              >
                <Upload className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </div>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title="Cambiar tema claro/oscuro"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col max-w-[1920px] w-full mx-auto px-4 lg:px-6 py-4 gap-3.5 min-h-0">
        {/* Executive KPI Summary Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Timeline Span & Projects Count */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Proyectos & Duración Total
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {metrics.projectsCount} proyectos · {metrics.totalDays}d
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                {formatDateDisplay(metrics.startStr, 'dd MMM')} →{' '}
                {formatDateDisplay(metrics.endStr, 'dd MMM yyyy')}
              </div>
            </div>
          </div>

          {/* Tasks & Completion */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Tareas & Avance Global
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {metrics.tasksCount} tareas · {metrics.avgProgress}%
              </div>
              <div className="w-28 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                <div
                  style={{ width: `${metrics.avgProgress}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Milestones */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Diamond className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Hitos Clave (Milestones)
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {metrics.milestonesCount} hitos configurados
              </div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                Puntos de control (Duración 0d)
              </div>
            </div>
          </div>

          {/* Slack & Buffer */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Holgura (Slack Acumulado)
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                +{metrics.totalSlackDays} días de margen
              </div>
              <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer mt-0.5">
                <input
                  type="checkbox"
                  checked={showCpmFloat}
                  onChange={(e) => setShowCpmFloat(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Incluir Float libre CPM</span>
              </label>
            </div>
          </div>

          {/* Critical Path & Dependency Health */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-2 col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Ruta Crítica & Deps
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {metrics.criticalCount} críticas
                </div>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer mt-0.5">
                  <input
                    type="checkbox"
                    checked={autoCascade}
                    onChange={(e) => setAutoCascade(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Auto-cascada activa</span>
                </label>
              </div>
            </div>

            {metrics.conflictCount > 0 && (
              <button
                type="button"
                onClick={handleResolveAllConflicts}
                className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm shrink-0"
                title="Ajustar automáticamente las tareas que inician antes de que terminen sus predecesoras"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Corregir ({metrics.conflictCount})
              </button>
            )}
          </div>
        </div>

        {/* Project Groups Filter & Management Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">
              <FolderKanban className="w-3.5 h-3.5 text-indigo-500" />
              Proyectos:
            </span>

            {/* All Projects Pill */}
            <button
              type="button"
              onClick={() => setSelectedProjectId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                selectedProjectId === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>Todos ({projectGroups.length})</span>
            </button>

            {/* Individual Project Pills */}
            {projectGroups.map((group) => {
              const isSelected = selectedProjectId === group.project.id;
              const colorDot =
                PROJECT_COLORS.find((c) => c.value === group.project.color)?.bg ||
                'bg-indigo-500';
              return (
                <button
                  key={group.project.id}
                  type="button"
                  onClick={() =>
                    setSelectedProjectId(
                      isSelected ? 'all' : group.project.id
                    )
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={`Filtrar por ${group.project.name} (${group.tasksCount} tareas, ${group.milestonesCount} hitos, ${group.progress}% avance)`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isSelected ? 'bg-white' : colorDot
                    }`}
                  />
                  <span className="truncate max-w-[200px]">
                    P{group.projectIndex}: {group.project.name}
                  </span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {group.items.length} · {group.progress}%
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setShowNewProjectBar((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-dashed border-indigo-400 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear Proyecto
            </button>
          </div>

          {/* Expand / Collapse All Controls */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleExpandCollapseAll(false)}
              className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
            >
              Expandir todos
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={() => handleExpandCollapseAll(true)}
              className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
            >
              Colapsar todos
            </button>
          </div>
        </div>

        {/* Inline New Project Creation Bar */}
        {showNewProjectBar && (
          <form
            onSubmit={handleCreateProjectFromBar}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 shadow-sm text-xs"
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
              <FolderPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-bold text-indigo-950 dark:text-indigo-200 shrink-0">
                Nuevo Proyecto:
              </span>
              <input
                type="text"
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Ej. Proyecto 4: App Móvil iOS & Android"
                className="flex-1 px-3 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Color:</span>
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setNewProjectColor(c.value)}
                    className={`w-5 h-5 rounded-full ${c.bg} flex items-center justify-center ${
                      newProjectColor === c.value
                        ? 'ring-2 ring-offset-1 ring-indigo-600'
                        : 'opacity-65 hover:opacity-100'
                    }`}
                  >
                    {newProjectColor === c.value && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm"
              >
                Añadir Proyecto
              </button>
              <button
                type="button"
                onClick={() => setShowNewProjectBar(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Conflict Banner if any task violates predecessor dependencies */}
        {metrics.conflictCount > 0 && (
          <div className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                Detectamos <strong>{metrics.conflictCount}</strong> tarea(s) cuya fecha inicial
                es anterior a la fecha final de sus tareas predecesoras.
              </span>
            </div>
            <button
              type="button"
              onClick={handleResolveAllConflicts}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Reprogramar en cascada automáticamente
            </button>
          </div>
        )}

        {/* Interactive Split-Pane Gantt Chart & WBS Table with Project Grouping */}
        <GanttWorkspace
          items={computedItems}
          projects={projects}
          groupByProject={groupByProject}
          selectedProjectId={selectedProjectId}
          zoom={zoom}
          showCriticalPath={showCriticalPath}
          showCpmFloat={showCpmFloat}
          autoCascade={autoCascade}
          onUpdateItem={handleUpdateInline}
          onEditModal={handleOpenEditModal}
          onDeleteItem={handleDeleteItem}
          onDuplicateItem={handleDuplicateItem}
          onQuickAdd={handleOpenCreateModal}
          onToggleGroupByProject={() => setGroupByProject((prev) => !prev)}
          onToggleProjectCollapse={handleToggleProjectCollapse}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
          onCreateProject={() => setShowNewProjectBar(true)}
          scrollContainerRef={scrollContainerRef}
        />
      </main>

      {/* Task / Milestone Modal Editor */}
      <TaskFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveFromModal}
        initialItem={editingItem}
        defaultType={defaultModalType}
        defaultProjectId={defaultModalProjectId}
        projects={projects}
        onCreateProject={handleCreateProject}
        allItems={computedItems}
      />
    </div>
  );
}

export default App;
