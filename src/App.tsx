import React, { useEffect, useMemo, useRef, useState } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import {
  AlertTriangle,
  BookmarkCheck,
  BookmarkPlus,
  Calendar,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  Diamond,
  Download,
  FileSpreadsheet,
  Flame,
  FolderKanban,
  FolderPlus,
  GitBranch,
  Layers,
  Maximize2,
  Moon,
  Plus,
  Save,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  ComputedGanttItem,
  GanttItem,
  GanttProject,
  ProjectTemplate,
  SavedScenario,
  TaskColor,
  TaskType,
  ZoomLevel,
} from './types/gantt';
import {
  cascadeDependencies,
  clampDayWidth,
  computeFitToProjectScale,
  computeGanttMetrics,
  computeTimelineBounds,
  createNewScenario,
  DEFAULT_DAY_WIDTH,
  formatDateDisplay,
  formatDateISO,
  getDayWidthForPreset,
  getDefaultSavedScenarios,
  getProjectTemplates,
  getXcode27Scenario,
  groupItemsByProject,
  parseDateSafe,
  preserveActiveWorkspaceInScenarios,
  resolveZoomPresetFromDayWidth,
  sanitizeGanttItem,
  sanitizeProject,
  sanitizeScenario,
  switchWorkspaceToScenario,
  switchWorkspaceToTemplate,
  upsertScenarioInList,
} from './utils/ganttEngine';
import { GanttWorkspace } from './components/GanttWorkspace';
import { TaskFormModal } from './components/TaskFormModal';

const STORAGE_KEY = 'ganttflow_pro_state_v2';
const LEGACY_STORAGE_KEY_V1 = 'ganttflow_pro_state_v1';
const SCENARIOS_STORAGE_KEY = 'ganttflow_pro_scenarios_v2';

const PROJECT_COLORS: { value: TaskColor; bg: string }[] = [
  { value: 'indigo', bg: 'bg-indigo-500' },
  { value: 'violet', bg: 'bg-violet-500' },
  { value: 'emerald', bg: 'bg-emerald-500' },
  { value: 'blue', bg: 'bg-blue-500' },
  { value: 'amber', bg: 'bg-amber-500' },
  { value: 'rose', bg: 'bg-rose-500' },
  { value: 'cyan', bg: 'bg-cyan-500' },
];

interface InitialWorkspaceState {
  activeScenarioId: string;
  projectName: string;
  projects: GanttProject[];
  items: GanttItem[];
  savedScenarios: SavedScenario[];
}

function loadInitialWorkspaceState(
  templates: ProjectTemplate[],
  defaultScenarios: SavedScenario[],
  initialScenarioId?: string
): InitialWorkspaceState {
  const xcodeScenario = getXcode27Scenario();

  if (initialScenarioId) {
    const target =
      defaultScenarios.find((s) => s.id === initialScenarioId) || defaultScenarios[0];
    return {
      activeScenarioId: target.id,
      projectName: target.name,
      projects: target.projects,
      items: target.items,
      savedScenarios: defaultScenarios,
    };
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedScenariosRaw = window.localStorage.getItem(SCENARIOS_STORAGE_KEY);
      if (savedScenariosRaw) {
        const parsed = JSON.parse(savedScenariosRaw);
        let list: SavedScenario[] = Array.isArray(parsed.savedScenarios)
          ? parsed.savedScenarios.map((s: Partial<SavedScenario>, i: number) =>
              sanitizeScenario(s, i)
            )
          : [...defaultScenarios];

        const hadXcodeScenario = list.some((s) => s.id === xcodeScenario.id);
        if (!hadXcodeScenario) {
          list = [xcodeScenario, ...list];
        }
        if (list.length === 0) {
          list = [...defaultScenarios];
        }

        const activeId: string = !hadXcodeScenario
          ? xcodeScenario.id
          : typeof parsed.activeScenarioId === 'string' && parsed.activeScenarioId
          ? parsed.activeScenarioId
          : list[0].id;

        if (activeId.startsWith('template:')) {
          const tplId = activeId.replace('template:', '');
          const tpl = templates.find((t) => t.id === tplId);
          if (tpl) {
            return {
              activeScenarioId: activeId,
              projectName: parsed.projectName || tpl.name,
              projects:
                Array.isArray(parsed.projects) && parsed.projects.length > 0
                  ? parsed.projects.map((p: Partial<GanttProject>, i: number) =>
                      sanitizeProject(p, i)
                    )
                  : tpl.projects,
              items:
                Array.isArray(parsed.items) && parsed.items.length > 0
                  ? parsed.items.map((it: Partial<GanttItem>, i: number) =>
                      sanitizeGanttItem(it, i)
                    )
                  : tpl.items,
              savedScenarios: list,
            };
          }
        }

        const activeScen = list.find((s) => s.id === activeId) || list[0];
        return {
          activeScenarioId: activeScen.id,
          projectName: activeScen.name,
          projects: activeScen.projects,
          items: activeScen.items,
          savedScenarios: list,
        };
      }

      // Migrate legacy single-workspace state (v2 or v1) if present, while activating the Xcode 27 scenario
      const legacyRaw =
        window.localStorage.getItem(STORAGE_KEY) ||
        window.localStorage.getItem(LEGACY_STORAGE_KEY_V1);
      let migratedList = [...defaultScenarios];
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        if (Array.isArray(legacy.items) && legacy.items.length > 0) {
          const legacyName = legacy.projectName || templates[0].name;
          const isIdenticalDefault = legacyName === templates[0].name;
          const legacyScenario = sanitizeScenario({
            id: isIdenticalDefault ? 'scen-saas-v2' : 'scen-migrated-user',
            name: legacyName,
            projects: legacy.projects,
            items: legacy.items,
            updatedAt: new Date().toISOString(),
          });
          migratedList = upsertScenarioInList(migratedList, legacyScenario);
        }
      }

      return {
        activeScenarioId: xcodeScenario.id,
        projectName: xcodeScenario.name,
        projects: xcodeScenario.projects,
        items: xcodeScenario.items,
        savedScenarios: migratedList,
      };
    }
  } catch {
    // ignore storage errors
  }

  // Default SSR fallback (preserves both Xcode 27 and SaaS v2.0 in savedScenarios)
  const fallback =
    defaultScenarios.find((s) => s.id === 'scen-saas-v2') || defaultScenarios[0];
  return {
    activeScenarioId: fallback.id,
    projectName: fallback.name,
    projects: fallback.projects,
    items: fallback.items,
    savedScenarios: defaultScenarios,
  };
}

export function App({ initialScenarioId }: { initialScenarioId?: string } = {}) {
  const templates = useMemo(() => getProjectTemplates(), []);
  const defaultScenarios = useMemo(() => getDefaultSavedScenarios(), []);

  const initialState = useMemo(
    () => loadInitialWorkspaceState(templates, defaultScenarios, initialScenarioId),
    [templates, defaultScenarios, initialScenarioId]
  );

  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(
    () => initialState.savedScenarios
  );
  const [activeScenarioId, setActiveScenarioId] = useState<string>(
    () => initialState.activeScenarioId
  );
  const [projectName, setProjectName] = useState<string>(
    () => initialState.projectName
  );
  const [projects, setProjects] = useState<GanttProject[]>(
    () => initialState.projects
  );
  const [items, setItems] = useState<GanttItem[]>(() => initialState.items);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ganttflow_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const [zoom, setZoom] = useState<ZoomLevel>('day');
  const [dayWidth, setDayWidth] = useState<number>(() => {
    const fit = computeFitToProjectScale(initialState.items, 980);
    return fit.spanDays > 45 ? fit.dayWidth : DEFAULT_DAY_WIDTH;
  });
  const [showCriticalPath, setShowCriticalPath] = useState<boolean>(true);
  const [showCpmFloat, setShowCpmFloat] = useState<boolean>(false);
  const [autoCascade, setAutoCascade] = useState<boolean>(true);
  const [groupByProject, setGroupByProject] = useState<boolean>(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // New Scenario inline creator state
  const [showNewScenarioBar, setShowNewScenarioBar] = useState<boolean>(false);
  const [newScenarioName, setNewScenarioName] = useState<string>('');
  const [newScenarioMode, setNewScenarioMode] = useState<'blank' | 'duplicate'>('blank');
  const [scenarioSavedToast, setScenarioSavedToast] = useState<string | null>(null);

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

  // Compute base enriched items with WBS, Slack End Dates, Critical Path (CPM), and Conflict flags
  const baseComputedItems = useMemo(() => computeGanttMetrics(items), [items]);

  // Compute project groups with rolled-up dates, durations, and hierarchical WBS
  const projectGroups = useMemo(
    () => groupItemsByProject(baseComputedItems, projects),
    [baseComputedItems, projects]
  );

  // Synchronized list of projects (including any auto-recovered orphan project groups)
  const effectiveProjects = useMemo(
    () => projectGroups.map((g) => g.project),
    [projectGroups]
  );

  // Keep active user scenario automatically synced in savedScenarios and localStorage
  useEffect(() => {
    let nextScenarios = savedScenarios;
    if (activeScenarioId && !activeScenarioId.startsWith('template:')) {
      nextScenarios = upsertScenarioInList(savedScenarios, {
        id: activeScenarioId,
        name: projectName,
        projects: effectiveProjects,
        items,
        updatedAt: new Date().toISOString(),
      });
      setSavedScenarios(nextScenarios);
    }

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ projectName, projects: effectiveProjects, items })
      );
      localStorage.setItem(
        SCENARIOS_STORAGE_KEY,
        JSON.stringify({
          activeScenarioId,
          projectName,
          projects: effectiveProjects,
          items,
          savedScenarios: nextScenarios,
        })
      );
    } catch {
      // ignore quota errors
    }
  }, [activeScenarioId, projectName, effectiveProjects, items]);


  // Enrich computedItems with hierarchical wbsCode (e.g. 1.1, 1.2, 2.1) and resolved projectId
  const computedItems = useMemo(() => {
    const enrichedMap = new Map<string, ComputedGanttItem>();
    for (const group of projectGroups) {
      for (const it of group.items) {
        enrichedMap.set(it.id, it);
      }
    }
    return baseComputedItems.map((it) => enrichedMap.get(it.id) || it);
  }, [baseComputedItems, projectGroups]);

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
    setProjects(() =>
      effectiveProjects.map((p) => (p.id === updatedProj.id ? updatedProj : p))
    );
  };

  const handleToggleProjectCollapse = (projectId: string) => {
    setProjects(() =>
      effectiveProjects.map((p) =>
        p.id === projectId ? { ...p, collapsed: !p.collapsed } : p
      )
    );
  };

  const handleExpandCollapseAll = (collapsed: boolean) => {
    setProjects(() => effectiveProjects.map((p) => ({ ...p, collapsed })));
  };

  const handleDeleteProject = (projectId: string) => {
    if (effectiveProjects.length <= 1) return;
    const remaining = effectiveProjects.filter((p) => p.id !== projectId);
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

  const showToast = (msg: string) => {
    setScenarioSavedToast(msg);
    setTimeout(() => {
      setScenarioSavedToast((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const handleTemplateSelect = (templateId: string) => {
    const next = switchWorkspaceToTemplate(
      {
        activeScenarioId,
        projectName,
        projects: effectiveProjects,
        items,
      },
      savedScenarios,
      templateId,
      templates
    );
    setSavedScenarios(next.savedScenarios);
    setActiveScenarioId(next.activeScenarioId);
    setProjectName(next.projectName);
    setProjects(next.projects);
    setItems(next.items);
    setSelectedProjectId('all');
    showToast('Plantilla cargada · Tus escenarios siguen guardados');
  };

  const handleScenarioSelect = (scenarioId: string) => {
    const next = switchWorkspaceToScenario(
      {
        activeScenarioId,
        projectName,
        projects: effectiveProjects,
        items,
      },
      savedScenarios,
      scenarioId
    );
    setSavedScenarios(next.savedScenarios);
    setActiveScenarioId(next.activeScenarioId);
    setProjectName(next.projectName);
    setProjects(next.projects);
    setItems(next.items);
    setSelectedProjectId('all');
    showToast(`Escenario activo: ${next.projectName}`);
  };

  const handleSaveCurrentScenario = () => {
    if (activeScenarioId.startsWith('template:')) {
      const created = sanitizeScenario({
        id: `scen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: projectName,
        projects: effectiveProjects,
        items,
        updatedAt: new Date().toISOString(),
        sourceTemplateId: activeScenarioId.replace('template:', ''),
      });
      const nextList = upsertScenarioInList(savedScenarios, created);
      setSavedScenarios(nextList);
      setActiveScenarioId(created.id);
      showToast(`Guardado en Mis Escenarios: "${created.name}"`);
    } else {
      const nextList = upsertScenarioInList(savedScenarios, {
        id: activeScenarioId,
        name: projectName,
        projects: effectiveProjects,
        items,
        updatedAt: new Date().toISOString(),
      });
      setSavedScenarios(nextList);
      showToast(`Escenario guardado: "${projectName}"`);
    }
  };

  const handleDuplicateCurrentScenario = () => {
    const baseList = preserveActiveWorkspaceInScenarios(
      {
        activeScenarioId,
        projectName,
        projects: effectiveProjects,
        items,
      },
      savedScenarios,
      templates
    );
    const copy = createNewScenario(`${projectName} (Copia)`, 'duplicate', {
      projects: effectiveProjects,
      items,
    });
    const nextList = upsertScenarioInList(baseList, copy);
    setSavedScenarios(nextList);
    setActiveScenarioId(copy.id);
    setProjectName(copy.name);
    setProjects(copy.projects);
    setItems(copy.items);
    setSelectedProjectId('all');
    showToast(`Copia guardada: "${copy.name}"`);
  };

  const handleCreateScenarioFromBar = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newScenarioName.trim() || `Escenario ${savedScenarios.length + 1}`;
    const baseList = preserveActiveWorkspaceInScenarios(
      {
        activeScenarioId,
        projectName,
        projects: effectiveProjects,
        items,
      },
      savedScenarios,
      templates
    );
    const created = createNewScenario(trimmed, newScenarioMode, {
      projects: effectiveProjects,
      items,
    });
    const nextList = upsertScenarioInList(baseList, created);
    setSavedScenarios(nextList);
    setActiveScenarioId(created.id);
    setProjectName(created.name);
    setProjects(created.projects);
    setItems(created.items);
    setSelectedProjectId('all');
    setNewScenarioName('');
    setShowNewScenarioBar(false);
    showToast(`Nuevo escenario creado: "${created.name}"`);
  };

  const handleDeleteScenario = (scenarioId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedScenarios.length <= 1) return;
    const remaining = savedScenarios.filter((s) => s.id !== scenarioId);
    setSavedScenarios(remaining);
    if (activeScenarioId === scenarioId) {
      const fallback = remaining[0];
      setActiveScenarioId(fallback.id);
      setProjectName(fallback.name);
      setProjects(fallback.projects);
      setItems(fallback.items);
      setSelectedProjectId('all');
    }
    showToast('Escenario eliminado');
  };

  const handleResolveAllConflicts = () => {
    setItems((prev) => cascadeDependencies(prev));
  };

  const handleSelectZoomPreset = (preset: ZoomLevel) => {
    const newDayWidth = getDayWidthForPreset(preset);
    const container = scrollContainerRef.current;
    if (container && container.clientWidth > 0 && dayWidth > 0 && newDayWidth !== dayWidth) {
      const centerX = container.clientWidth / 2;
      const dayAtCenter = (container.scrollLeft + centerX) / dayWidth;
      const nextScrollLeft = Math.max(0, dayAtCenter * newDayWidth - centerX);
      requestAnimationFrame(() => {
        container.scrollTo({ left: nextScrollLeft, behavior: 'smooth' });
      });
    }
    setZoom(preset);
    setDayWidth(newDayWidth);
  };

  const handleChangeDayWidth = (nextWidth: number) => {
    const clamped = clampDayWidth(nextWidth);
    setDayWidth(clamped);
    const matchedPreset = resolveZoomPresetFromDayWidth(clamped);
    if (matchedPreset !== 'custom') {
      setZoom(matchedPreset);
    }
  };

  const handleFitToProject = (targetProjectId?: string, notify = true) => {
    const container = scrollContainerRef.current;
    const viewportW = container && container.clientWidth > 0 ? container.clientWidth : 980;
    const pid = targetProjectId || selectedProjectId || 'all';
    const fit = computeFitToProjectScale(computedItems, viewportW, {
      projectId: pid,
    });
    setDayWidth(fit.dayWidth);
    const matchedPreset = resolveZoomPresetFromDayWidth(fit.dayWidth);
    if (matchedPreset !== 'custom') {
      setZoom(matchedPreset);
    }
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTo({
          left: fit.scrollLeft,
          behavior: 'smooth',
        });
      });
    }
    if (notify) {
      showToast(`Escala auto-ajustada: ${fit.dayWidth} px/día (${fit.spanDays} días en vista)`);
    }
  };

  // Auto-fit or reset scale on scenario switch / mount
  useEffect(() => {
    const container = scrollContainerRef.current;
    const viewportW = container && container.clientWidth > 0 ? container.clientWidth : 980;
    const fit = computeFitToProjectScale(computedItems, viewportW, {
      projectId: selectedProjectId,
    });
    if (fit.spanDays > 45) {
      setDayWidth(fit.dayWidth);
      const matched = resolveZoomPresetFromDayWidth(fit.dayWidth);
      if (matched !== 'custom') setZoom(matched);
      if (container) {
        requestAnimationFrame(() => {
          container.scrollLeft = fit.scrollLeft;
        });
      }
    } else {
      const targetWidth = DEFAULT_DAY_WIDTH;
      setDayWidth(targetWidth);
      setZoom('day');
      if (container && computedItems.length > 0) {
        const { timelineStart } = computeTimelineBounds(computedItems);
        let earliest = parseDateSafe(computedItems[0].startDate);
        for (const it of computedItems) {
          const s = parseDateSafe(it.startDate);
          if (s < earliest) earliest = s;
        }
        const startOffsetDays = differenceInCalendarDays(earliest, timelineStart);
        const scrollLeft = Math.max(0, Math.round(startOffsetDays * targetWidth - 36));
        requestAnimationFrame(() => {
          container.scrollLeft = scrollLeft;
        });
      }
    }
  }, [activeScenarioId]);

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
    const payload = JSON.stringify(
      {
        id: activeScenarioId,
        name: projectName,
        projectName,
        projects: effectiveProjects,
        items,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-gantt.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const projectMap = new Map(
      projectGroups.map((g) => [g.project.id, g.project.name])
    );
    const orderedItems = groupByProject
      ? projectGroups.flatMap((g) => g.items)
      : computedItems;
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
    const rows = orderedItems.map((it) => [
      groupByProject ? it.wbsCode || it.wbs : it.wbs,
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
          const importedName =
            parsed.projectName || parsed.name || `Escenario Importado`;
          const cleanItems = parsed.items.map((raw: Partial<GanttItem>, i: number) =>
            sanitizeGanttItem(raw, i)
          );
          const baseProjects =
            Array.isArray(parsed.projects) && parsed.projects.length > 0
              ? parsed.projects.map((raw: Partial<GanttProject>, i: number) =>
                  sanitizeProject(raw, i)
                )
              : [
                  sanitizeProject(
                    {
                      id: 'proj-default',
                      name: importedName || 'Proyecto General',
                      color: 'indigo',
                      collapsed: false,
                    },
                    0
                  ),
                ];
          const syncedGroups = groupItemsByProject(
            computeGanttMetrics(cleanItems),
            baseProjects
          );
          const importedScenario = sanitizeScenario({
            id: `scen-${Date.now()}-imp`,
            name: importedName,
            projects: syncedGroups.map((g) => g.project),
            items: cleanItems,
            updatedAt: new Date().toISOString(),
          });
          const preservedList = preserveActiveWorkspaceInScenarios(
            {
              activeScenarioId,
              projectName,
              projects: effectiveProjects,
              items,
            },
            savedScenarios,
            templates
          );
          setSavedScenarios(upsertScenarioInList(preservedList, importedScenario));
          setActiveScenarioId(importedScenario.id);
          setProjectName(importedScenario.name);
          setProjects(importedScenario.projects);
          setItems(importedScenario.items);
          setSelectedProjectId('all');
          showToast(`Escenario importado: "${importedScenario.name}"`);
        }
      } catch {
        alert('Archivo JSON inválido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isViewingTemplate = activeScenarioId.startsWith('template:');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Navigation & Portfolio/Project Controls */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 py-3">
        <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand + Editable Portfolio/Project Title + Scenario/Template Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="font-bold text-base sm:text-lg bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 outline-none text-slate-900 dark:text-white px-0.5"
                    title="Haz clic para renombrar el escenario o portafolio activo"
                  />
                  {isViewingTemplate ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      Vista Plantilla
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      <BookmarkCheck className="w-3 h-3" />
                      Escenario Guardado
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  Diagrama de Gantt con escenarios guardados, proyectos, ruta crítica, holguras (slack) e hitos
                </p>
              </div>
            </div>

            {/* Unified Scenario & Template Switcher */}
            <select
              value={activeScenarioId}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                if (val.startsWith('template:')) {
                  handleTemplateSelect(val.replace('template:', ''));
                } else {
                  handleScenarioSelect(val);
                }
              }}
              className="text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
              title="Cambiar entre tus escenarios guardados o cargar una plantilla sin perder tu trabajo"
            >
              <optgroup label="📌 Mis Escenarios Guardados">
                {savedScenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    💾 {s.name} ({s.projects.length} proy · {s.items.length} tareas)
                  </option>
                ))}
              </optgroup>
              <optgroup label="📂 Plantillas Predeterminadas">
                {templates.map((t) => (
                  <option key={`template:${t.id}`} value={`template:${t.id}`}>
                    📋 Plantilla: {t.name}
                  </option>
                ))}
              </optgroup>
            </select>

            {/* Save Current Scenario Button */}
            <button
              type="button"
              onClick={handleSaveCurrentScenario}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition"
              title={
                isViewingTemplate
                  ? 'Guardar esta plantilla como un nuevo escenario en Mis Escenarios'
                  : 'Guardar escenario actual en Mis Escenarios'
              }
            >
              <Save className="w-3.5 h-3.5" />
              {isViewingTemplate ? 'Guardar en Mis Escenarios' : 'Guardar Escenario'}
            </button>

            {/* New Scenario Button */}
            <button
              type="button"
              onClick={() => setShowNewScenarioBar((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 transition"
              title="Crear un nuevo escenario independiente sin perder el escenario actual"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              Nuevo Escenario
            </button>

            {scenarioSavedToast && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-emerald-600 text-white shadow-sm animate-fade-in">
                <Check className="w-3.5 h-3.5" />
                {scenarioSavedToast}
              </span>
            )}
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

            {/* Flexible Zoom Switcher + Auto-Fit Project Scale */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 gap-0.5">
              <ZoomIn className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1 hidden sm:inline" />
              {(['day', 'week', 'month', 'quarter'] as ZoomLevel[]).map((z) => {
                const activePreset = resolveZoomPresetFromDayWidth(dayWidth);
                const isActive = activePreset === z;
                return (
                  <button
                    key={z}
                    type="button"
                    onClick={() => handleSelectZoomPreset(z)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {z === 'day'
                      ? 'Día'
                      : z === 'week'
                      ? 'Semana'
                      : z === 'month'
                      ? 'Mes'
                      : 'Trimestre'}
                  </button>
                );
              })}
              <button
                type="button"
                data-fit-project-header-btn="true"
                onClick={() => handleFitToProject()}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                  resolveZoomPresetFromDayWidth(dayWidth) === 'custom'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300'
                }`}
                title="Encontrar automáticamente la escala óptima que abarca todas las tareas del proyecto en pantalla"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Ajustar a Proyecto</span>
              </button>
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

        {/* Saved Scenarios & Templates Switcher Bar */}
        <div
          data-scenarios-bar="true"
          className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">
              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-500" />
              Mis Escenarios ({savedScenarios.length}):
            </span>

            {savedScenarios.map((scen) => {
              const isActive = activeScenarioId === scen.id;
              return (
                <div
                  key={scen.id}
                  onClick={() => handleScenarioSelect(scen.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleScenarioSelect(scen.id);
                    }
                  }}
                  data-scenario-pill={scen.id}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 border cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={`Volver al escenario guardado "${scen.name}" (${scen.projects.length} proyecto(s), ${scen.items.length} tarea(s))`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isActive ? 'bg-white' : 'bg-emerald-500'
                    }`}
                  />
                  <span className="truncate max-w-[220px]">{scen.name}</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {scen.projects.length}p · {scen.items.length}t
                  </span>
                  {savedScenarios.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteScenario(scen.id, e)}
                      className={`p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 ${
                        isActive ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-rose-500'
                      }`}
                      title={`Eliminar escenario "${scen.name}"`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => setShowNewScenarioBar((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-dashed border-emerald-500 dark:border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition flex items-center gap-1"
              title="Crear un nuevo escenario en blanco o a partir del actual"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Escenario
            </button>

            <button
              type="button"
              onClick={handleDuplicateCurrentScenario}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1"
              title="Guardar una copia independiente del escenario actual en Mis Escenarios"
            >
              <Copy className="w-3.5 h-3.5" />
              Guardar Copia
            </button>
          </div>

          {/* Quick Templates Selector on the Right */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Plantillas Base:
            </span>
            {templates.map((tpl) => {
              const isCurrentTpl = activeScenarioId === `template:${tpl.id}`;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleTemplateSelect(tpl.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition ${
                    isCurrentTpl
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={`Explorar plantilla "${tpl.name}" (tus escenarios guardados no se borrarán)`}
                >
                  📋 {tpl.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Inline New Scenario Creation Bar */}
        {showNewScenarioBar && (
          <form
            onSubmit={handleCreateScenarioFromBar}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 shadow-sm text-xs"
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
              <BookmarkPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-bold text-emerald-950 dark:text-emerald-200 shrink-0">
                Nuevo Escenario:
              </span>
              <input
                type="text"
                required
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                placeholder="Ej. Escenario Plan B / Release Q1 2027"
                className="flex-1 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="scenarioMode"
                    checked={newScenarioMode === 'blank'}
                    onChange={() => setNewScenarioMode('blank')}
                    className="text-emerald-600"
                  />
                  <span>Desde cero (1 proyecto limpio)</span>
                </label>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="scenarioMode"
                    checked={newScenarioMode === 'duplicate'}
                    onChange={() => setNewScenarioMode('duplicate')}
                    className="text-emerald-600"
                  />
                  <span>Clonar escenario actual</span>
                </label>
              </div>

              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm"
              >
                Crear y Guardar Escenario
              </button>
              <button
                type="button"
                onClick={() => setShowNewScenarioBar(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

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
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${
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
          projects={effectiveProjects}
          groupByProject={groupByProject}
          selectedProjectId={selectedProjectId}
          zoom={zoom}
          dayWidth={dayWidth}
          onChangeDayWidth={handleChangeDayWidth}
          onFitToProject={(pid) => handleFitToProject(pid)}
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
        projects={effectiveProjects}
        onCreateProject={handleCreateProject}
        allItems={computedItems}
      />
    </div>
  );
}

export default App;
