import React, { useEffect, useMemo, useRef, useState } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import {
  AlertTriangle,
  BarChart3,
  BookmarkCheck,
  BookmarkPlus,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Compass,
  Copy,
  Diamond,
  Download,
  FileSpreadsheet,
  Flame,
  FolderKanban,
  GitBranch,
  Layers,
  Maximize2,
  Moon,
  Plus,
  Save,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  ArrowVisibility,
  ComputedGanttItem,
  GanttImportResult,
  GanttItem,
  GanttProject,
  PROJECT_COLORS,
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
  groupItemsByProject,
  importGanttData,
  parseCSVToGanttData,
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

interface InitialWorkspaceState {
  activeScenarioId: string;
  projectName: string;
  projects: GanttProject[];
  items: GanttItem[];
  savedScenarios: SavedScenario[];
}

function isXcode27Project(p: Partial<GanttProject>): boolean {
  if (p.id === 'proj-xcode27') return true;
  if (typeof p.name === 'string' && /xcode\s*27/i.test(p.name)) return true;
  return false;
}

function isXcode27Task(it: Partial<GanttItem>): boolean {
  if (it.projectId === 'proj-xcode27') return true;
  if (typeof it.id === 'string' && it.id.startsWith('xc-')) return true;
  const name = (it.name || '').toLowerCase();
  if (name.includes('xcode') || name.includes('biocatch')) return true;
  return false;
}

function purgeXcodeScenario(s: SavedScenario): SavedScenario | null {
  if (s.id === 'scen-xcode27') return null;
  const name = (s.name || '').toLowerCase();
  if (name.includes('xcode 27') || name.includes('xcode27')) return null;

  const projects = (s.projects || []).filter((p) => !isXcode27Project(p));
  const items = (s.items || []).filter((it) => !isXcode27Task(it));

  return {
    ...s,
    projects,
    items,
  };
}

function loadInitialWorkspaceState(
  templates: ProjectTemplate[],
  defaultScenarios: SavedScenario[],
  initialScenarioId?: string
): InitialWorkspaceState {
  if (initialScenarioId && initialScenarioId !== 'scen-xcode27') {
    const target =
      defaultScenarios.find((s) => s.id === initialScenarioId) || defaultScenarios[0];
    return {
      activeScenarioId: target.id,
      projectName: target.name,
      projects: target.projects.filter((p) => !isXcode27Project(p)),
      items: target.items.filter((it) => !isXcode27Task(it)),
      savedScenarios: defaultScenarios,
    };
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedScenariosRaw = window.localStorage.getItem(SCENARIOS_STORAGE_KEY);
      if (savedScenariosRaw) {
        const parsed = JSON.parse(savedScenariosRaw);
        let list: SavedScenario[] = Array.isArray(parsed.savedScenarios)
          ? parsed.savedScenarios
              .map((s: Partial<SavedScenario>, i: number) => sanitizeScenario(s, i))
              .map((s: SavedScenario) => purgeXcodeScenario(s))
              .filter(
                (s: SavedScenario | null): s is SavedScenario =>
                  s !== null && (s.projects.length > 0 || s.items.length > 0)
              )
          : [...defaultScenarios];

        if (list.length === 0) {
          list = [...defaultScenarios];
        }

        let activeId: string =
          typeof parsed.activeScenarioId === 'string' &&
          parsed.activeScenarioId &&
          parsed.activeScenarioId !== 'scen-xcode27'
            ? parsed.activeScenarioId
            : list[0].id;

        if (!activeId.startsWith('template:') && !list.some((s) => s.id === activeId)) {
          activeId = list[0].id;
        }

        if (activeId.startsWith('template:')) {
          const tplId = activeId.replace('template:', '');
          const tpl = templates.find((t) => t.id === tplId);
          if (tpl) {
            const rawProjects = Array.isArray(parsed.projects) ? parsed.projects : [];
            const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
            const cleanProjects = rawProjects
              .filter((p: Partial<GanttProject>) => !isXcode27Project(p))
              .map((p: Partial<GanttProject>, i: number) => sanitizeProject(p, i));
            const cleanItems = rawItems
              .filter((it: Partial<GanttItem>) => !isXcode27Task(it))
              .map((it: Partial<GanttItem>, i: number) => sanitizeGanttItem(it, i));

            return {
              activeScenarioId: activeId,
              projectName: parsed.projectName || tpl.name,
              projects: cleanProjects.length > 0 ? cleanProjects : tpl.projects,
              items: cleanItems.length > 0 ? cleanItems : tpl.items,
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

      // Migrate legacy single-workspace state (v2 or v1) if present
      const legacyRaw =
        window.localStorage.getItem(STORAGE_KEY) ||
        window.localStorage.getItem(LEGACY_STORAGE_KEY_V1);
      let migratedList = [...defaultScenarios];
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        if (Array.isArray(legacy.items) && legacy.items.length > 0) {
          const rawProjects = Array.isArray(legacy.projects) ? legacy.projects : [];
          const cleanProjects = rawProjects.filter(
            (p: Partial<GanttProject>) => !isXcode27Project(p)
          );
          const cleanItems = legacy.items.filter(
            (it: Partial<GanttItem>) => !isXcode27Task(it)
          );

          if (cleanItems.length > 0) {
            const legacyName = legacy.projectName || templates[0].name;
            const isIdenticalDefault = legacyName === templates[0].name;
            const legacyScenario = sanitizeScenario({
              id: isIdenticalDefault ? 'scen-saas-v2' : 'scen-migrated-user',
              name: legacyName,
              projects: cleanProjects,
              items: cleanItems,
              updatedAt: new Date().toISOString(),
            });
            migratedList = upsertScenarioInList(migratedList, legacyScenario);
          }
        }
      }

      const active = migratedList[0] || defaultScenarios[0];
      return {
        activeScenarioId: active.id,
        projectName: active.name,
        projects: active.projects,
        items: active.items,
        savedScenarios: migratedList,
      };
    }
  } catch {
    // ignore storage errors
  }

  // Default SSR / fresh fallback
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
  const [arrowVisibility, setArrowVisibility] = useState<ArrowVisibility>(() => {
    try {
      const saved = localStorage.getItem('ganttflow_arrow_visibility');
      if (saved === 'all' || saved === 'hover' || saved === 'critical' || saved === 'none') {
        return saved as ArrowVisibility;
      }
    } catch {}
    return 'all';
  });

  useEffect(() => {
    try {
      localStorage.setItem('ganttflow_arrow_visibility', arrowVisibility);
    } catch {}
  }, [arrowVisibility]);

  // New Scenario inline creator state
  const [showNewScenarioBar, setShowNewScenarioBar] = useState<boolean>(false);
  const [newScenarioName, setNewScenarioName] = useState<string>('');
  const [newScenarioMode, setNewScenarioMode] = useState<'blank' | 'duplicate'>('blank');
  const [scenarioSavedToast, setScenarioSavedToast] = useState<string | null>(null);

  // Minimalist UI toggles and menus
  const [showMetricsDrawer, setShowMetricsDrawer] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [scenarioMenuOpen, setScenarioMenuOpen] = useState<boolean>(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState<boolean>(false);
  const [createMenuOpen, setCreateMenuOpen] = useState<boolean>(false);

  const scenarioMenuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (scenarioMenuRef.current && !scenarioMenuRef.current.contains(target)) {
        setScenarioMenuOpen(false);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(target)) {
        setProjectMenuOpen(false);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(target)) {
        setCreateMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setScenarioMenuOpen(false);
        setProjectMenuOpen(false);
        setCreateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ComputedGanttItem | null>(null);
  const [defaultModalType, setDefaultModalType] = useState<TaskType>('task');
  const [defaultModalProjectId, setDefaultModalProjectId] = useState<string | undefined>(
    undefined
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const dragCounterRef = useRef<number>(0);

  // Prevent browser from navigating away if a file is dropped outside dropzone
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
    };
    const handleWindowDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
        dragCounterRef.current = 0;
        setIsDraggingFile(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
          handleImportFile(file);
        }
      }
    };
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);
    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

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
    setGroupByProject(true);
    setSelectedProjectId('all');
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

    const idToWbs = new Map(
      orderedItems.map((it) => [it.id, it.wbsCode || String(it.wbs)])
    );

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
      `"${it.dependencies.map((d) => idToWbs.get(d) || d).join(', ')}"`,
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

  const handleImportFile = (file: File) => {
    if (!file) return;

    const fileName = file.name || 'archivo';
    const lowerName = fileName.toLowerCase();
    const isJson = lowerName.endsWith('.json') || file.type === 'application/json';
    const isCsv =
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.tsv') ||
      file.type === 'text/csv' ||
      file.type === 'text/tab-separated-values' ||
      file.type === 'application/vnd.ms-excel';

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rawText = String(ev.target?.result || '');
        const text = rawText.replace(/^\uFEFF/, '').trim();
        if (!text) {
          showToast('Error: El archivo está vacío.');
          return;
        }

        let result: GanttImportResult;
        if (isJson || (!isCsv && (text.startsWith('{') || text.startsWith('[')))) {
          try {
            const parsed = JSON.parse(text);
            result = importGanttData(parsed);
          } catch (jsonErr) {
            if (isJson && !isCsv) {
              const msg = jsonErr instanceof Error ? jsonErr.message : 'JSON inválido';
              throw new Error(`Error al leer JSON: ${msg}`);
            }
            result = parseCSVToGanttData(text, fileName);
          }
        } else {
          result = parseCSVToGanttData(text, fileName);
        }

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

        let mergedList = preservedList;
        if (result.allScenarios && result.allScenarios.length > 0) {
          for (const sc of result.allScenarios) {
            mergedList = upsertScenarioInList(mergedList, sc);
          }
        } else {
          mergedList = upsertScenarioInList(mergedList, result.primaryScenario);
        }

        setSavedScenarios(mergedList);
        setActiveScenarioId(result.primaryScenario.id);
        setProjectName(result.primaryScenario.name);
        setProjects(result.primaryScenario.projects);
        setItems(result.primaryScenario.items);
        setSelectedProjectId('all');
        setShowSettingsModal(false);
        setScenarioMenuOpen(false);
        setCreateMenuOpen(false);

        const fit = computeFitToProjectScale(result.primaryScenario.items, 980);
        if (fit.spanDays > 0) {
          setDayWidth(fit.dayWidth);
        }

        showToast(`Escenario importado: "${result.primaryScenario.name}"`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al procesar los datos.';
        showToast(`Error al importar: ${msg}`);
      }
    };
    reader.onerror = () => {
      showToast('Error: No se pudo leer el archivo.');
    };
    reader.readAsText(file);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportFile(file);
    }
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes('Files')) {
      dragCounterRef.current += 1;
      setIsDraggingFile(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingFile(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleImportFile(file);
    }
  };

  const isViewingTemplate = activeScenarioId.startsWith('template:');

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 selection:bg-indigo-500/30 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Top Navigation Bar — Single Minimalist 48px Bar */}
      <header className="sticky top-0 z-30 h-13 px-4 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800/80 flex items-center justify-between gap-3 select-none">
        
        {/* LEFT: Logo + Escenario Dropdown + "Proyectos" Filter Dropdown */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo Minimalista Vectorial */}
          <div className="w-7 h-7 rounded-lg bg-indigo-600/10 dark:bg-zinc-900 border border-indigo-500/30 dark:border-zinc-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="16" y2="6" />
              <line x1="8" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="12" y2="18" />
            </svg>
          </div>

          {/* Scenario Selector Dropdown */}
          <div ref={scenarioMenuRef} className="relative" data-dropdown-container="true">
            <button
              type="button"
              onClick={() => {
                setScenarioMenuOpen((prev) => !prev);
                setProjectMenuOpen(false);
                setCreateMenuOpen(false);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-900/90 hover:bg-slate-200/70 dark:hover:bg-zinc-800/80 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-800 dark:text-zinc-100 transition shadow-2xs cursor-pointer"
              title="Cambiar escenario o plantilla"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="max-w-[190px] sm:max-w-[240px] truncate">{projectName}</span>
              {isViewingTemplate && (
                <span className="text-[10px] text-amber-500 font-bold uppercase">(Plantilla)</span>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Escenarios Popover */}
            <div
              data-scenarios-bar="true"
              className={`${
                scenarioMenuOpen ? 'flex' : 'hidden'
              } absolute left-0 top-10 w-72 p-2 bg-white dark:bg-zinc-900/98 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl z-50 text-xs flex-col gap-1 max-h-[480px] overflow-y-auto`}
            >
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Mis Escenarios ({savedScenarios.length})
                </div>

                {savedScenarios.map((scen) => {
                  const isActive = activeScenarioId === scen.id;
                  return (
                    <div
                      key={scen.id}
                      data-scenario-pill={scen.id}
                      onClick={() => {
                        handleScenarioSelect(scen.id);
                        setScenarioMenuOpen(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white font-medium shadow-sm'
                          : 'hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isActive ? 'bg-white' : 'bg-emerald-400'
                          }`}
                        />
                        <span className="truncate max-w-[170px]">{scen.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`text-[10px] px-1 py-0.5 rounded font-mono ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200/80 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                          }`}
                        >
                          {scen.projects.length}p · {scen.items.length}t
                        </span>
                        {savedScenarios.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              handleDeleteScenario(scen.id, e);
                            }}
                            className={`p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 ${
                              isActive ? 'text-white' : 'text-slate-400 hover:text-rose-500'
                            }`}
                            title="Eliminar escenario"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="border-t border-slate-200 dark:border-zinc-800/80 my-1" />

                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Plantillas Base
                </div>
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      handleTemplateSelect(tpl.id);
                      setScenarioMenuOpen(false);
                    }}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 text-left transition"
                  >
                    <span className="truncate">{tpl.name}</span>
                    <span className="text-[10px] text-amber-500">Plantilla</span>
                  </button>
                ))}

                <div className="border-t border-slate-200 dark:border-zinc-800/80 my-1" />

                <div className="flex items-center justify-between gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewScenarioBar(true);
                      setScenarioMenuOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuevo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveCurrentScenario();
                      setScenarioMenuOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 font-medium transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Copia</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setScenarioMenuOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 font-medium transition"
                    title="Importar escenario desde JSON o CSV"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importar</span>
                  </button>
                </div>
              </div>
          </div>

          {/* Selector Exacto "Proyectos" con icono vectorial */}
          <div ref={projectMenuRef} className="relative hidden sm:block" data-dropdown-container="true">
            <button
              type="button"
              onClick={() => {
                setProjectMenuOpen((prev) => !prev);
                setScenarioMenuOpen(false);
                setCreateMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-900/90 hover:bg-slate-200/70 dark:hover:bg-zinc-800/80 border border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-700 dark:text-zinc-300 transition shadow-2xs cursor-pointer"
              title="Filtrar por proyecto"
            >
              <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
              <span>Proyectos</span>
              {selectedProjectId !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              )}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {projectMenuOpen && (
              <div className="absolute left-0 top-10 w-60 p-1.5 bg-white dark:bg-zinc-900/98 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl z-50 text-xs flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProjectId('all');
                    setProjectMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                    selectedProjectId === 'all'
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <span>Todos los proyectos</span>
                  <span className="text-[10px] font-mono opacity-80">{projectGroups.length}</span>
                </button>

                {projectGroups.map((group) => {
                  const isSelected = selectedProjectId === group.project.id;
                  const colorDot =
                    PROJECT_COLORS.find((c) => c.value === group.project.color)?.bg ||
                    'bg-indigo-500';
                  return (
                    <button
                      key={group.project.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(group.project.id);
                        setProjectMenuOpen(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${colorDot}`} />
                        <span className="truncate max-w-[150px]">
                          P{group.projectIndex}: {group.project.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono opacity-80">
                        {group.items.length} · {group.progress}%
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {scenarioSavedToast && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-white shadow-sm animate-fade-in ${
                scenarioSavedToast.startsWith('Error')
                  ? 'bg-rose-600'
                  : 'bg-emerald-600'
              }`}
            >
              {scenarioSavedToast.startsWith('Error') ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {scenarioSavedToast}
            </span>
          )}
        </div>

        {/* RIGHT: Botón Único "+ Crear ▾" + Iconos Vectoriales Minimalistas con Hints */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Botón "+ Crear ▾" */}
          <div ref={createMenuRef} className="relative mr-1" data-dropdown-container="true">
            <button
              type="button"
              onClick={() => {
                setCreateMenuOpen((prev) => !prev);
                setScenarioMenuOpen(false);
                setProjectMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {createMenuOpen && (
              <div className="absolute right-0 top-10 w-48 p-1.5 bg-white dark:bg-zinc-900/98 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl z-50 text-xs flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenCreateModal('task');
                    setCreateMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-slate-800 dark:text-zinc-200 font-medium transition text-left"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Nueva Tarea</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleOpenCreateModal('milestone');
                    setCreateMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-slate-800 dark:text-zinc-200 font-medium transition text-left"
                >
                  <Diamond className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span>Nuevo Hito</span>
                </button>
                <div className="border-t border-slate-100 dark:border-zinc-800 my-0.5" />
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setCreateMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-slate-800 dark:text-zinc-200 font-medium transition text-left"
                  title="Importar datos desde JSON o CSV"
                >
                  <Upload className="w-3.5 h-3.5 text-violet-500" />
                  <span>Importar Datos</span>
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

          {/* Iconos Vectoriales SVG Minimalistas con Tooltip Hints */}

          {/* Ruta Crítica */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setShowCriticalPath((prev) => !prev)}
              className={`p-1.5 rounded-lg border transition shadow-2xs ${
                showCriticalPath
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-500 hover:bg-rose-500/20'
                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white'
              }`}
              aria-label="Ruta Crítica"
            >
              <Flame className="w-4 h-4" />
            </button>
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-10 px-2 py-1 bg-slate-900 text-white dark:bg-zinc-900 dark:text-zinc-200 text-[11px] font-medium rounded-lg shadow-xl border border-slate-800 dark:border-zinc-800 whitespace-nowrap z-50 pointer-events-none">
              Ruta Crítica (CPM)
            </div>
          </div>

          {/* Ajustar a pantalla */}
          <div className="relative group">
            <button
              type="button"
              data-fit-timeline-btn="true"
              data-fit-project-header-btn="true"
              onClick={() => handleFitToProject()}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition shadow-2xs"
              aria-label="Ajustar"
              title="Ajustar a Proyecto"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-10 px-2 py-1 bg-slate-900 text-white dark:bg-zinc-900 dark:text-zinc-200 text-[11px] font-medium rounded-lg shadow-xl border border-slate-800 dark:border-zinc-800 whitespace-nowrap z-50 pointer-events-none">
              Ajustar a Proyecto
            </div>
          </div>

          {/* Ir a Hoy */}
          <div className="relative group">
            <button
              type="button"
              onClick={scrollToToday}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition shadow-2xs"
              aria-label="Hoy"
            >
              <Compass className="w-4 h-4" />
            </button>
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-10 px-2 py-1 bg-slate-900 text-white dark:bg-zinc-900 dark:text-zinc-200 text-[11px] font-medium rounded-lg shadow-xl border border-slate-800 dark:border-zinc-800 whitespace-nowrap z-50 pointer-events-none">
              Ir a Hoy
            </div>
          </div>

          {/* Métricas Drawer Toggle */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setShowMetricsDrawer((prev) => !prev)}
              className={`p-1.5 rounded-lg border transition shadow-2xs ${
                showMetricsDrawer
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 hover:bg-amber-500/20'
                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-amber-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
              aria-label="Métricas"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-10 px-2 py-1 bg-slate-900 text-white dark:bg-zinc-900 dark:text-zinc-200 text-[11px] font-medium rounded-lg shadow-xl border border-slate-800 dark:border-zinc-800 whitespace-nowrap z-50 pointer-events-none">
              Métricas del proyecto
            </div>
          </div>

          {/* Configuración */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition shadow-2xs"
              aria-label="Configuración"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-10 px-2 py-1 bg-slate-900 text-white dark:bg-zinc-900 dark:text-zinc-200 text-[11px] font-medium rounded-lg shadow-xl border border-slate-800 dark:border-zinc-800 whitespace-nowrap z-50 pointer-events-none">
              Configuración (Flechas, datos, tema)
            </div>
          </div>

        </div>
      </header>

      {/* Collapsible Metrics Drawer (Hidden by default) */}
      {showMetricsDrawer && (
        <div className="px-4 py-3 bg-white/95 dark:bg-zinc-900/95 border-b border-slate-200 dark:border-zinc-800/80 text-xs backdrop-blur-md">
          <div className="max-w-[1920px] mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Métricas Clave del Proyecto
              </span>
              <button
                type="button"
                onClick={() => setShowMetricsDrawer(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80">
                <div className="text-slate-400 dark:text-zinc-500 text-[10px]">Duración Total</div>
                <div className="font-semibold text-slate-800 dark:text-white mt-0.5">
                  {metrics.projectsCount} proy · {metrics.totalDays}d
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80">
                <div className="text-slate-400 dark:text-zinc-500 text-[10px]">Avance Global</div>
                <div className="font-semibold text-slate-800 dark:text-white mt-0.5">
                  {metrics.tasksCount} tareas · {metrics.avgProgress}%
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80">
                <div className="text-slate-400 dark:text-zinc-500 text-[10px]">Hitos Clave</div>
                <div className="font-semibold text-amber-500 mt-0.5">
                  {metrics.milestonesCount} hitos
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80">
                <div className="text-slate-400 dark:text-zinc-500 text-[10px]">Holgura (Slack)</div>
                <div className="font-semibold text-violet-500 mt-0.5">
                  +{metrics.totalSlackDays}d de margen
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80">
                <div className="text-slate-400 dark:text-zinc-500 text-[10px]">Ruta Crítica</div>
                <div className="font-semibold text-rose-500 mt-0.5">
                  {metrics.criticalCount} críticas
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col max-w-[1920px] w-full mx-auto px-2 sm:px-4 py-2 sm:py-3 gap-2 min-h-0">
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
          arrowVisibility={arrowVisibility}
          onChangeArrowVisibility={setArrowVisibility}
          onUpdateItem={handleUpdateInline}
          onEditModal={handleOpenEditModal}
          onDeleteItem={handleDeleteItem}
          onDuplicateItem={handleDuplicateItem}
          onQuickAdd={handleOpenCreateModal}
          onToggleGroupByProject={() => setGroupByProject((prev) => !prev)}
          onToggleProjectCollapse={handleToggleProjectCollapse}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
          onCreateProject={handleCreateProject}
          scrollContainerRef={scrollContainerRef}
        />
      </main>

      {/* Settings Modal (Flechas, auto-cascada, tema, zoom, exportar/importar) */}
      <div className={`${showSettingsModal ? 'fixed' : 'hidden'} inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4`}>
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Configuración del Cronograma
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          {/* Configuración de Flechas de Dependencia */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Flechas de Dependencia (Por defecto: Visibles)
            </label>
            <div
              data-arrow-visibility-selector="true"
              data-current-visibility={arrowVisibility}
              className="grid grid-cols-2 gap-2 text-xs"
            >
              {(
                [
                  { id: 'all', label: 'Siempre Visibles' },
                  { id: 'hover', label: 'Al pasar cursor' },
                  { id: 'critical', label: 'Solo Ruta Crítica' },
                  { id: 'none', label: 'Ocultar' },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.id}
                  data-arrow-visibility-option={opt.id}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                    arrowVisibility === opt.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="arrow-visibility"
                    checked={arrowVisibility === opt.id}
                    onChange={() => setArrowVisibility(opt.id)}
                    className="text-indigo-600"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Opciones adicionales */}
          <div className="space-y-2.5 border-t border-slate-200 dark:border-zinc-800/80 pt-3 text-xs">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 dark:text-zinc-300 font-medium">
                Auto-cascada de fechas al mover tareas
              </span>
              <input
                type="checkbox"
                checked={autoCascade}
                onChange={(e) => setAutoCascade(e.target.checked)}
                className="rounded border-slate-300 dark:border-zinc-700 text-indigo-600"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 dark:text-zinc-300 font-medium">
                Incluir Float libre CPM en holguras
              </span>
              <input
                type="checkbox"
                checked={showCpmFloat}
                onChange={(e) => setShowCpmFloat(e.target.checked)}
                className="rounded border-slate-300 dark:border-zinc-700 text-indigo-600"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 dark:text-zinc-300 font-medium">
                Zoom táctil con rueda del ratón
              </span>
              <input
                type="checkbox"
                data-wheel-zoom-toggle="true"
                defaultChecked={true}
                className="rounded border-slate-300 dark:border-zinc-700 text-indigo-600"
              />
            </label>

            {/* Slider de Escala de Zoom (disponible en configuración) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-slate-700 dark:text-zinc-300">
                <span className="font-medium">Escala manual ({dayWidth.toFixed(1)} px/día)</span>
                <span className="text-[10px] text-slate-400">O usa rueda del ratón</span>
              </div>
              <input
                type="range"
                min={3}
                max={80}
                step={0.5}
                value={dayWidth}
                onChange={(e) => handleChangeDayWidth(parseFloat(e.target.value))}
                data-zoom-slider="true"
                className="w-full accent-indigo-600 cursor-pointer h-1.5"
              />
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {(
                  [
                    { id: 'day', label: 'Día', val: 44 },
                    { id: 'week', label: 'Semana', val: 24 },
                    { id: 'month', label: 'Mes', val: 12 },
                    { id: 'quarter', label: 'Trimestre', val: 5 },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleChangeDayWidth(preset.val)}
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-center font-medium"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-700 dark:text-zinc-300 font-medium">Tema visual</span>
              <button
                type="button"
                onClick={() => setDarkMode((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-xs font-medium"
              >
                {darkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Modo Oscuro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-600" />
                    <span>Modo Claro</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Exportar e Importar */}
          <div className="border-t border-slate-200 dark:border-zinc-800/80 pt-3 text-xs space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Exportar / Importar Datos
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium transition"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>JSON</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium transition"
              >
                <Upload className="w-3.5 h-3.5 text-violet-500" />
                <span>Importar</span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

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

      {/* Hidden File Input for JSON / CSV Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json,.csv,text/csv,.tsv,text/tab-separated-values,text/plain"
        className="hidden"
        style={{ display: 'none' }}
        data-testid="file-import-input"
        onChange={handleImportJSON}
        aria-label="Importar archivo JSON o CSV"
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-60 bg-indigo-950/60 backdrop-blur-xs border-4 border-dashed border-indigo-400 flex flex-col items-center justify-center p-6 transition-all pointer-events-none select-none">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-3 border border-indigo-200 dark:border-indigo-800 text-center pointer-events-none max-w-sm">
            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
              <Upload className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100">
              Suelta tu archivo aquí
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Importa tus tareas, proyectos o escenarios directamente en tu diagrama de Gantt (.json o .csv)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
