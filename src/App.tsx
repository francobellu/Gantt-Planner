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
  History,
  Layers,
  Maximize2,
  Moon,
  Plus,
  Redo2,
  Rocket,
  Save,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  APP_VERSION,
  ArrowVisibility,
  ComputedGanttItem,
  GanttImportResult,
  GanttItem,
  GanttProject,
  GroupingMode,
  PROJECT_COLORS,
  ProjectTemplate,
  PlanHistoryActionType,
  PlanHistoryEntry,
  Release,
  ReleaseGuideVisibility,
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
  filterGroupsBySelectedProjects,
  formatDateDisplay,
  formatDateISO,
  getDayWidthForPreset,
  getDefaultSavedScenarios,
  getProjectTemplates,
  groupItemsByProject,
  importGanttData,
  isDemoProject,
  isDemoScenario,
  mergeImportedGanttData,
  moveTaskItem,
  parseCSVToGanttData,
  parseDateSafe,
  preserveActiveWorkspaceInScenarios,
  reorderTaskItem,
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
import { PlanHistoryPage } from './components/PlanHistoryPage';
import { ReleasesModal } from './components/ReleasesModal';
import {
  DEFAULT_PREDEFINED_RELEASES,
  checkTaskReleaseCompliance,
} from './utils/releaseEngine';

const STORAGE_KEY = 'ganttflow_pro_state_v2';
const LEGACY_STORAGE_KEY_V1 = 'ganttflow_pro_state_v1';
const SCENARIOS_STORAGE_KEY = 'ganttflow_pro_scenarios_v2';
const SELECTED_PROJECTS_STORAGE_KEY = 'ganttflow_selected_projects_v1';
const HISTORY_STORAGE_KEY = 'ganttflow_pro_history_v1';
const HISTORY_INDEX_STORAGE_KEY = 'ganttflow_pro_history_index_v1';
const RELEASES_STORAGE_KEY = 'ganttflow_pro_releases_v1';
const RELEASE_GUIDE_VISIBILITY_KEY = 'ganttflow_release_guide_visibility';
const GROUPING_MODE_KEY = 'ganttflow_grouping_mode';

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

function isDemoOrTemplateProject(raw?: Partial<GanttProject> | null): boolean {
  if (!raw) return false;
  if (raw.isDemo === true) return true;
  const id = (raw.id || '').toLowerCase();
  const name = (raw.name || '').toLowerCase();
  if (
    id.includes('demo') ||
    id.includes('saas') ||
    id.includes('cloud') ||
    id.includes('discovery') ||
    id.includes('release') ||
    id === 'proj-core' ||
    id === 'proj-xcode27'
  ) {
    return true;
  }
  if (
    name.includes('descubrimiento') ||
    name.includes('lanzamiento') ||
    name.includes('saas') ||
    name.includes('cloud') ||
    name.includes('plantilla') ||
    name.includes('demo') ||
    name.includes('xcode')
  ) {
    return true;
  }
  return false;
}

const CLEAN_DEFAULT_PROJECT: GanttProject = {
  id: 'proj-1',
  name: 'Mi Proyecto',
  color: 'indigo',
  collapsed: false,
  isDemo: false,
};

function loadInitialWorkspaceState(
  _templates?: ProjectTemplate[],
  defaultScenarios: SavedScenario[] = [],
  initialScenarioId?: string
): InitialWorkspaceState {
  if (initialScenarioId && defaultScenarios.length > 0) {
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
      // 1. Primary single-workspace storage
      const rawWorkspace = window.localStorage.getItem(STORAGE_KEY);
      if (rawWorkspace) {
        const parsed = JSON.parse(rawWorkspace);
        const rawProjects: Partial<GanttProject>[] = Array.isArray(parsed.projects) ? parsed.projects : [];
        const rawItems: Partial<GanttItem>[] = Array.isArray(parsed.items) ? parsed.items : [];

        const cleanProjects = rawProjects
          .filter((p) => !isDemoOrTemplateProject(p) && !isXcode27Project(p))
          .map((p, i) => sanitizeProject({ ...p, isDemo: false }, i));

        const cleanItems = rawItems
          .filter((it) => !isXcode27Task(it) && cleanProjects.some((p) => p.id === it.projectId))
          .map((it, i) => sanitizeGanttItem(it, i));

        if (cleanProjects.length > 0) {
          const rawName = (parsed.projectName || '').trim();
          const cleanName = rawName && !rawName.toLowerCase().includes('saas') ? rawName : 'GanttFlow';
          return {
            activeScenarioId: 'scen-user',
            projectName: cleanName,
            projects: cleanProjects,
            items: cleanItems,
            savedScenarios: [],
          };
        }
      }

      // 2. Legacy scenarios storage fallback
      const savedScenariosRaw = window.localStorage.getItem(SCENARIOS_STORAGE_KEY);
      if (savedScenariosRaw) {
        const parsed = JSON.parse(savedScenariosRaw);
        if (Array.isArray(parsed.savedScenarios)) {
          for (const s of parsed.savedScenarios) {
            if (!s || s.isDemo) continue;
            const rawProjects: Partial<GanttProject>[] = Array.isArray(s.projects) ? s.projects : [];
            const rawItems: Partial<GanttItem>[] = Array.isArray(s.items) ? s.items : [];
            const cleanProjects = rawProjects
              .filter((p) => !isDemoOrTemplateProject(p) && !isXcode27Project(p))
              .map((p, i) => sanitizeProject({ ...p, isDemo: false }, i));
            const cleanItems = rawItems
              .filter((it) => !isXcode27Task(it) && cleanProjects.some((p) => p.id === it.projectId))
              .map((it, i) => sanitizeGanttItem(it, i));

            if (cleanProjects.length > 0) {
              const rawName = (s.name || '').trim();
              const cleanName = rawName && !rawName.toLowerCase().includes('saas') ? rawName : 'GanttFlow';
              return {
                activeScenarioId: 'scen-user',
                projectName: cleanName,
                projects: cleanProjects,
                items: cleanItems,
                savedScenarios: [],
              };
            }
          }
        }
      }
    }
  } catch {
    // ignore storage errors
  }

  // Clean fallback: zero demo projects
  return {
    activeScenarioId: 'scen-user',
    projectName: 'GanttFlow',
    projects: [CLEAN_DEFAULT_PROJECT],
    items: [],
    savedScenarios: [],
  };
}

export function App({
  initialScenarioId,
  initialView = 'gantt',
  initialSelectedProjectIds,
  initialShowTable = true,
  initialProjectMenuOpen = false,
  initialSettingsOpen = false,
  initialReleasesModalOpen = false,
  initialGroupingMode = 'project',
  initialReleaseGuideVisibility = 'selected',
}: {
  initialScenarioId?: string;
  initialView?: 'gantt' | 'history' | 'projects';
  initialSelectedProjectIds?: string[];
  initialShowTable?: boolean;
  initialProjectMenuOpen?: boolean;
  initialSettingsOpen?: boolean;
  initialReleasesModalOpen?: boolean;
  initialGroupingMode?: GroupingMode;
  initialReleaseGuideVisibility?: ReleaseGuideVisibility;
} = {}) {
  const templates = useMemo(() => getProjectTemplates(), []);
  const defaultScenarios = useMemo(() => getDefaultSavedScenarios(), []);

  const initialState = useMemo(
    () => loadInitialWorkspaceState(templates, defaultScenarios, initialScenarioId),
    [templates, defaultScenarios, initialScenarioId]
  );

  const [currentView, setCurrentView] = useState<'gantt' | 'history' | 'projects'>(
    initialView || 'gantt'
  );
  const [projectName, setProjectName] = useState<string>(
    () => initialState.projectName
  );
  const [projects, setProjects] = useState<GanttProject[]>(
    () => initialState.projects
  );
  const [items, setItems] = useState<GanttItem[]>(() => initialState.items);

  const [history, setHistory] = useState<PlanHistoryEntry[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {}
    const now = new Date();
    return [
      {
        id: 'hist-init',
        timestamp: now.toISOString(),
        formattedDate: now.toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        actionType: 'initial_state',
        actionLabel: 'Inicio',
        description: 'Estado inicial cargado',
        itemsCount: initialState.items.length,
        projectsCount: initialState.projects.length,
        snapshot: {
          items: initialState.items,
          projects: initialState.projects,
        },
      },
    ];
  });

  const [historyIndex, setHistoryIndex] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(HISTORY_INDEX_STORAGE_KEY);
        if (raw !== null) {
          const idx = parseInt(raw, 10);
          if (!isNaN(idx) && idx >= 0) return idx;
        }
      }
    } catch {}
    return 0;
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const slice = history.slice(-80);
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(slice));
        window.localStorage.setItem(
          HISTORY_INDEX_STORAGE_KEY,
          String(Math.min(historyIndex, slice.length - 1))
        );
      }
    } catch {}
  }, [history, historyIndex]);

  const lastEditRef = useRef<{ id: string; time: number; type: string } | null>(null);

  const recordPlanChange = (
    actionType: PlanHistoryActionType,
    actionLabel: string,
    description: string,
    nextItems: GanttItem[],
    nextProjects: GanttProject[],
    targetId?: string
  ) => {
    const now = Date.now();
    const nowDate = new Date(now);
    const formattedDate = nowDate.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (
      targetId &&
      actionType === 'edit_item' &&
      lastEditRef.current &&
      lastEditRef.current.id === targetId &&
      now - lastEditRef.current.time < 800
    ) {
      lastEditRef.current.time = now;
      setHistory((prev) => {
        const copy = [...prev];
        const cur = copy[historyIndex];
        if (cur) {
          copy[historyIndex] = {
            ...cur,
            description,
            timestamp: nowDate.toISOString(),
            formattedDate,
            snapshot: {
              items: nextItems.map(sanitizeGanttItem),
              projects: nextProjects.map((p) => ({ ...p })),
            },
          };
        }
        return copy;
      });
      return;
    }

    if (targetId) {
      lastEditRef.current = { id: targetId, time: now, type: actionType };
    } else {
      lastEditRef.current = null;
    }

    const newEntry: PlanHistoryEntry = {
      id: `hist-${now}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowDate.toISOString(),
      formattedDate,
      actionType,
      actionLabel,
      description,
      itemsCount: nextItems.length,
      projectsCount: nextProjects.length,
      snapshot: {
        items: nextItems.map(sanitizeGanttItem),
        projects: nextProjects.map((p) => ({ ...p })),
      },
    };

    setHistory((prev) => {
      const base = prev.slice(0, historyIndex + 1);
      const next = [...base, newEntry];
      if (next.length > 80) {
        return next.slice(next.length - 80);
      }
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 79));
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const targetIndex = historyIndex - 1;
    const target = history[targetIndex];
    if (!target) return;

    setItems(target.snapshot.items.map(sanitizeGanttItem));
    setProjects(target.snapshot.projects.map((p) => ({ ...p })));
    setHistoryIndex(targetIndex);
    const currentDesc = history[historyIndex]?.description || 'Modificación';
    showToast(`Deshecho: ${currentDesc}`);
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const targetIndex = historyIndex + 1;
    const target = history[targetIndex];
    if (!target) return;

    setItems(target.snapshot.items.map(sanitizeGanttItem));
    setProjects(target.snapshot.projects.map((p) => ({ ...p })));
    setHistoryIndex(targetIndex);
    showToast(`Rehecho: ${target.description}`);
  };

  const handleRestoreSnapshot = (entry: PlanHistoryEntry, index: number) => {
    setItems(entry.snapshot.items.map(sanitizeGanttItem));
    setProjects(entry.snapshot.projects.map((p) => ({ ...p })));
    setHistoryIndex(index);
    showToast(`Plan restaurado a la versión #${index + 1} (${entry.formattedDate})`);
  };

  const handleClearHistory = () => {
    const now = new Date();
    const resetEntry: PlanHistoryEntry = {
      id: `hist-reset-${Date.now()}`,
      timestamp: now.toISOString(),
      formattedDate: now.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      actionType: 'initial_state',
      actionLabel: 'Reinicio',
      description: 'Historial reiniciado al estado actual',
      itemsCount: items.length,
      projectsCount: effectiveProjects.length,
      snapshot: {
        items: items.map(sanitizeGanttItem),
        projects: effectiveProjects.map((p) => ({ ...p })),
      },
    };
    setHistory([resetEntry]);
    setHistoryIndex(0);
    showToast('Historial reiniciado correctamente');
  };

  const [showTable, setShowTable] = useState<boolean>(() => {
    if (initialShowTable !== undefined) {
      return initialShowTable;
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('ganttflow_show_table');
        if (saved !== null) {
          return saved !== 'false';
        }
      }
    } catch {}
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem('ganttflow_show_table', String(showTable));
    } catch {}
  }, [showTable]);

  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() => {
    if (Array.isArray(initialSelectedProjectIds)) {
      return initialSelectedProjectIds;
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(SELECTED_PROJECTS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const validIds = parsed.filter((id) =>
              initialState.projects.some((p) => p.id === id)
            );
            if (validIds.length > 0) {
              return validIds;
            }
          }
        }
      }
    } catch {}
    return initialState.projects.map((p) => p.id);
  });

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

  useEffect(() => {
    try {
      localStorage.setItem(
        SELECTED_PROJECTS_STORAGE_KEY,
        JSON.stringify(selectedProjectIds)
      );
    } catch {}
  }, [selectedProjectIds]);

  // Releases state & configurations
  const [releases, setReleases] = useState<Release[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(RELEASES_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {}
    return DEFAULT_PREDEFINED_RELEASES;
  });

  const [releaseGuideVisibility, setReleaseGuideVisibility] = useState<ReleaseGuideVisibility>(() => {
    if (initialReleaseGuideVisibility) return initialReleaseGuideVisibility;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(RELEASE_GUIDE_VISIBILITY_KEY);
        if (saved === 'selected' || saved === 'assigned' || saved === 'all' || saved === 'none') {
          return saved as ReleaseGuideVisibility;
        }
      }
    } catch {}
    return 'selected';
  });

  const [groupingMode, setGroupingMode] = useState<GroupingMode>(() => {
    if (initialGroupingMode) return initialGroupingMode;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(GROUPING_MODE_KEY);
        if (saved === 'release' || saved === 'project') {
          return saved as GroupingMode;
        }
      }
    } catch {}
    return 'project';
  });

  const [showReleasesModal, setShowReleasesModal] = useState<boolean>(initialReleasesModalOpen || false);

  useEffect(() => {
    try {
      localStorage.setItem(RELEASES_STORAGE_KEY, JSON.stringify(releases));
    } catch {}
  }, [releases]);

  useEffect(() => {
    try {
      localStorage.setItem(RELEASE_GUIDE_VISIBILITY_KEY, releaseGuideVisibility);
    } catch {}
  }, [releaseGuideVisibility]);

  useEffect(() => {
    try {
      localStorage.setItem(GROUPING_MODE_KEY, groupingMode);
    } catch {}
  }, [groupingMode]);

  const [scenarioSavedToast, setScenarioSavedToast] = useState<string | null>(null);

  // Minimalist UI toggles and menus
  const [showMetricsDrawer, setShowMetricsDrawer] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(initialSettingsOpen);
  const [projectMenuOpen, setProjectMenuOpen] = useState<boolean>(initialProjectMenuOpen);
  const [createMenuOpen, setCreateMenuOpen] = useState<boolean>(false);

  const projectMenuRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const settingsModalRef = useRef<HTMLDivElement>(null);
  const metricsDrawerRef = useRef<HTMLDivElement>(null);
  const metricsToggleBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (projectMenuRef.current && !projectMenuRef.current.contains(target)) {
        setProjectMenuOpen(false);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(target)) {
        setCreateMenuOpen(false);
      }
      if (showSettingsModal && settingsModalRef.current && !settingsModalRef.current.contains(target)) {
        setShowSettingsModal(false);
      }
      if (
        showMetricsDrawer &&
        metricsDrawerRef.current &&
        !metricsDrawerRef.current.contains(target) &&
        metricsToggleBtnRef.current &&
        !metricsToggleBtnRef.current.contains(target)
      ) {
        setShowMetricsDrawer(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProjectMenuOpen(false);
        setCreateMenuOpen(false);
        setShowSettingsModal(false);
        setShowMetricsDrawer(false);
        return;
      }

      const target = e.target as HTMLElement | null;
      const isTextInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (!isTextInput) {
        const isMac =
          typeof navigator !== 'undefined' &&
          /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

        if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
          if (e.shiftKey) {
            e.preventDefault();
            handleRedo();
          } else {
            e.preventDefault();
            handleUndo();
          }
        } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSettingsModal, showMetricsDrawer, handleUndo, handleRedo]);

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

  // Keep active workspace automatically synced in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ projectName, projects: effectiveProjects, items })
      );
      localStorage.setItem(
        SELECTED_PROJECTS_STORAGE_KEY,
        JSON.stringify(selectedProjectIds)
      );
      localStorage.setItem(
        SCENARIOS_STORAGE_KEY,
        JSON.stringify({
          activeScenarioId: 'scen-user',
          projectName,
          projects: effectiveProjects,
          items,
          savedScenarios: [
            {
              id: 'scen-user',
              name: projectName,
              projects: effectiveProjects,
              items,
              updatedAt: new Date().toISOString(),
              isDemo: false,
            },
          ],
        })
      );
    } catch {
      // ignore quota errors
    }
  }, [projectName, effectiveProjects, items, selectedProjectIds]);


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

  // Project KPI metrics (scoped to currently selected projects when a subset is selected)
  const metrics = useMemo(() => {
    const selectedSet = new Set(selectedProjectIds);
    const activeGroups =
      selectedSet.size > 0 && selectedSet.size < projectGroups.length
        ? projectGroups.filter((g) => selectedSet.has(g.project.id))
        : projectGroups;
    const activeItems =
      selectedSet.size > 0 && selectedSet.size < projectGroups.length
        ? activeGroups.flatMap((g) => g.items)
        : computedItems;

    if (activeItems.length === 0) {
      return {
        startStr: formatDateISO(new Date()),
        endStr: formatDateISO(new Date()),
        totalDays: 0,
        projectsCount: activeGroups.length,
        tasksCount: 0,
        milestonesCount: 0,
        criticalCount: 0,
        totalSlackDays: 0,
        avgProgress: 0,
        conflictCount: 0,
      };
    }

    let minStart = parseDateSafe(activeItems[0].startDate);
    let maxEnd = parseDateSafe(activeItems[0].endDate);
    let tasksCount = 0;
    let milestonesCount = 0;
    let criticalCount = 0;
    let totalSlackDays = 0;
    let progressSum = 0;
    let conflictCount = 0;

    for (const it of activeItems) {
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
      projectsCount: activeGroups.length,
      tasksCount,
      milestonesCount,
      criticalCount,
      totalSlackDays,
      avgProgress,
      conflictCount,
    };
  }, [computedItems, projectGroups, selectedProjectIds]);

  // Total count of tasks that violate their assigned release milestones
  const totalReleaseViolations = useMemo(() => {
    let count = 0;
    for (const p of effectiveProjects) {
      if (!p.releaseId) continue;
      const rel = releases.find((r) => r.id === p.releaseId);
      if (!rel) continue;
      for (const it of computedItems) {
        if (it.projectId === p.id && it.type === 'task') {
          const violations = checkTaskReleaseCompliance(it, p, rel);
          if (violations.length > 0) count++;
        }
      }
    }
    return count;
  }, [effectiveProjects, releases, computedItems]);

  const handleSaveFromModal = (savedItem: GanttItem, cascade: boolean) => {
    const cleanItem = sanitizeGanttItem({
      ...savedItem,
      projectId: savedItem.projectId || effectiveProjects[0]?.id,
    });
    const exists = items.some((it) => it.id === cleanItem.id);
    const nextRaw = exists
      ? items.map((it) => (it.id === cleanItem.id ? cleanItem : it))
      : [...items, cleanItem];
    const next = cascade ? cascadeDependencies(nextRaw) : nextRaw;
    setItems(next);
    const isM = cleanItem.type === 'milestone';
    const actionType: PlanHistoryActionType = exists ? 'edit_item' : 'create_item';
    const actionLabel = exists ? 'Edición' : 'Creación';
    const desc = exists
      ? `Editar ${isM ? 'hito' : 'tarea'} '${cleanItem.name}'`
      : `Crear ${isM ? 'hito' : 'tarea'} '${cleanItem.name}'`;
    recordPlanChange(actionType, actionLabel, desc, next, effectiveProjects);
  };

  const handleUpdateInline = (updatedItem: GanttItem, cascade: boolean) => {
    const cleanItem = sanitizeGanttItem(updatedItem);
    const prevItem = items.find((it) => it.id === cleanItem.id);
    const nextRaw = items.map((it) => (it.id === cleanItem.id ? cleanItem : it));
    const next = cascade ? cascadeDependencies(nextRaw) : nextRaw;
    setItems(next);

    let actionType: PlanHistoryActionType = 'edit_item';
    let actionLabel = 'Edición';
    let desc = `Actualizar '${cleanItem.name}'`;

    if (prevItem) {
      if (prevItem.startDate !== cleanItem.startDate) {
        actionType = 'drag_move';
        actionLabel = 'Desplazamiento';
        desc = `Mover '${cleanItem.name}' de ${prevItem.startDate} a ${cleanItem.startDate}`;
      } else if (prevItem.duration !== cleanItem.duration) {
        actionType = 'drag_resize';
        actionLabel = 'Redimensión';
        desc = `Cambiar duración de '${cleanItem.name}' a ${cleanItem.duration}d`;
      } else if (prevItem.name !== cleanItem.name) {
        actionType = 'edit_item';
        actionLabel = 'Edición';
        desc = `Renombrar a '${cleanItem.name}'`;
      } else if (prevItem.progress !== cleanItem.progress) {
        actionType = 'edit_item';
        actionLabel = 'Edición';
        desc = `Progreso de '${cleanItem.name}' al ${cleanItem.progress}%`;
      } else if (prevItem.assignee !== cleanItem.assignee) {
        actionType = 'edit_item';
        actionLabel = 'Edición';
        desc = `Asignar '${cleanItem.name}' a ${cleanItem.assignee || 'sin asignar'}`;
      } else if (prevItem.color !== cleanItem.color) {
        actionType = 'edit_item';
        actionLabel = 'Edición';
        desc = `Cambiar color de '${cleanItem.name}'`;
      } else if (Boolean(prevItem.hidden) !== Boolean(cleanItem.hidden)) {
        actionType = 'edit_item';
        actionLabel = 'Visibilidad';
        desc = cleanItem.hidden
          ? `Ocultar '${cleanItem.name}' del diagrama`
          : `Mostrar '${cleanItem.name}' en el diagrama`;
      }
    }

    recordPlanChange(
      actionType,
      actionLabel,
      desc,
      next,
      effectiveProjects,
      actionType === 'edit_item' ? cleanItem.id : undefined
    );
  };

  const handleUpdateItems = (nextItems: GanttItem[]) => {
    const clean = nextItems.map(sanitizeGanttItem);
    setItems(clean);
    recordPlanChange(
      'dependency_change',
      'Dependencia',
      'Actualizar dependencias en el diagrama',
      clean,
      effectiveProjects
    );
  };

  const handleDeleteItem = (id: string) => {
    const itemToDelete = items.find((it) => it.id === id);
    const next = items
      .filter((it) => it.id !== id)
      .map((it) => ({
        ...it,
        dependencies: it.dependencies.filter((depId) => depId !== id),
      }));
    setItems(next);
    const isM = itemToDelete?.type === 'milestone';
    const desc = itemToDelete
      ? `Eliminar ${isM ? 'hito' : 'tarea'} '${itemToDelete.name}'`
      : `Eliminar ítem '${id}'`;
    recordPlanChange('delete_item', 'Eliminación', desc, next, effectiveProjects);
  };

  const handleDuplicateItem = (item: ComputedGanttItem) => {
    const copy = sanitizeGanttItem({
      ...item,
      id: `${item.type === 'milestone' ? 'm' : 't'}-${Date.now()}`,
      name: `${item.name} (Copia)`,
    });
    const idx = items.findIndex((x) => x.id === item.id);
    const next = [...items];
    next.splice(idx + 1, 0, copy);
    setItems(next);
    recordPlanChange('duplicate_item', 'Duplicación', `Duplicar '${item.name}'`, next, effectiveProjects);
  };

  const handleReorderItem = (itemId: string, direction: 'up' | 'down') => {
    const it = items.find((x) => x.id === itemId);
    const next = reorderTaskItem(items, itemId, direction, groupByProject, effectiveProjects);
    setItems(next);
    recordPlanChange(
      'reorder_item',
      'Reordenación',
      `Mover '${it?.name || itemId}' hacia ${direction === 'up' ? 'arriba' : 'abajo'}`,
      next,
      effectiveProjects
    );
  };

  const handleMoveItem = (
    sourceId: string,
    targetId: string,
    position: 'before' | 'after'
  ) => {
    const it = items.find((x) => x.id === sourceId);
    const next = moveTaskItem(items, sourceId, targetId, position, effectiveProjects);
    let nextProjects = effectiveProjects;
    if (targetId.startsWith('project:')) {
      const targetProjId = targetId.slice('project:'.length);
      nextProjects = effectiveProjects.map((p) =>
        p.id === targetProjId && p.collapsed ? { ...p, collapsed: false } : p
      );
      setProjects(nextProjects);
    }
    setItems(next);
    recordPlanChange(
      'reorder_item',
      'Reordenación',
      `Mover posición de '${it?.name || sourceId}'`,
      next,
      nextProjects
    );
  };

  const handleToggleSelectProject = (projectId: string) => {
    setSelectedProjectIds((prev) => {
      const isSelected = prev.includes(projectId);
      const next = isSelected
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId];
      if (next.length === 1) {
        setSelectedProjectId(next[0]);
      } else {
        setSelectedProjectId('all');
      }
      return next;
    });
  };

  const handleSelectAllProjects = () => {
    setSelectedProjectIds(effectiveProjects.map((p) => p.id));
    setSelectedProjectId('all');
  };

  const handleDeselectAllProjects = () => {
    setSelectedProjectIds([]);
    setSelectedProjectId('all');
  };

  const handleSelectOnlySingleProject = (projectId: string) => {
    setSelectedProjectIds([projectId]);
    setSelectedProjectId(projectId);
  };

  const handleOpenCreateModal = (type: TaskType, projectId?: string) => {
    setEditingItem(null);
    setDefaultModalType(type);
    setDefaultModalProjectId(
      projectId ||
        (selectedProjectIds.length === 1
          ? selectedProjectIds[0]
          : selectedProjectId !== 'all'
          ? selectedProjectId
          : projects[0]?.id)
    );
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: ComputedGanttItem) => {
    setEditingItem(item);
    setDefaultModalType(item.type);
    setDefaultModalProjectId(item.projectId || projects[0]?.id);
    setModalOpen(true);
  };

  const handleCreateProject = (newProj?: Partial<GanttProject>) => {
    const clean = {
      ...sanitizeProject(
        {
          id: `proj-${Date.now()}`,
          name: newProj?.name || `Proyecto ${projects.length + 1}`,
          color: newProj?.color || 'indigo',
          ...newProj,
          isDemo: false,
        },
        projects.length
      ),
      isDemo: false,
    };
    const nextProjects = [...projects, clean];
    setProjects(nextProjects);
    setSelectedProjectIds((prev) =>
      prev.includes(clean.id) ? prev : [...prev, clean.id]
    );
    setGroupByProject(true);
    setSelectedProjectId('all');
    recordPlanChange(
      'create_project',
      'Nuevo Proyecto',
      `Crear proyecto '${clean.name}'`,
      items,
      nextProjects
    );
  };

  const handleUpdateProject = (updatedProj: GanttProject) => {
    const nextProjects = effectiveProjects.map((p) =>
      p.id === updatedProj.id ? updatedProj : p
    );
    setProjects(nextProjects);
    recordPlanChange(
      'edit_project',
      'Edición Proyecto',
      `Actualizar proyecto '${updatedProj.name}'`,
      items,
      nextProjects,
      updatedProj.id
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
    const proj = effectiveProjects.find((p) => p.id === projectId);
    const remaining = effectiveProjects.filter((p) => p.id !== projectId);
    const fallbackId = remaining[0].id;
    const nextItems = items.map((it) =>
      it.projectId === projectId ? { ...it, projectId: fallbackId } : it
    );
    setProjects(remaining);
    setItems(nextItems);
    setSelectedProjectIds((prev) => {
      const next = prev.filter((id) => id !== projectId);
      return next.length > 0 ? next : remaining.map((p) => p.id);
    });
    if (selectedProjectId === projectId) {
      setSelectedProjectId('all');
    }
    recordPlanChange(
      'delete_project',
      'Eliminar Proyecto',
      `Eliminar proyecto '${proj?.name || projectId}'`,
      nextItems,
      remaining
    );
  };

  const handleAssignProjectToRelease = (projectId: string, releaseId?: string) => {
    const nextProjects = effectiveProjects.map((p) =>
      p.id === projectId ? { ...p, releaseId: releaseId || undefined } : p
    );
    setProjects(nextProjects);
    const proj = effectiveProjects.find((p) => p.id === projectId);
    const rel = releases.find((r) => r.id === releaseId);
    recordPlanChange(
      'edit_project',
      'Release',
      releaseId
        ? `Asignar proyecto '${proj?.name || projectId}' a release '${rel?.code || releaseId}'`
        : `Desasignar release de proyecto '${proj?.name || projectId}'`,
      items,
      nextProjects,
      projectId
    );
  };

  const showToast = (msg: string) => {
    setScenarioSavedToast(msg);
    setTimeout(() => {
      setScenarioSavedToast((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const handleResolveAllConflicts = () => {
    const next = cascadeDependencies(items);
    setItems(next);
    recordPlanChange(
      'resolve_conflicts',
      'Cascada',
      'Reprogramar dependencias en cascada automáticamente',
      next,
      effectiveProjects
    );
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
    const selectedSet = new Set(selectedProjectIds);
    const itemsToFit =
      !targetProjectId &&
      pid === 'all' &&
      selectedSet.size > 0 &&
      selectedSet.size < effectiveProjects.length
        ? computedItems.filter((it) =>
            selectedSet.has(it.projectId || effectiveProjects[0]?.id || 'proj-default')
          )
        : computedItems;
    const fit = computeFitToProjectScale(
      itemsToFit.length > 0 ? itemsToFit : computedItems,
      viewportW,
      {
        projectId: pid,
      }
    );
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
  }, []);

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
        id: 'workspace',
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

        const merged = mergeImportedGanttData(effectiveProjects, items, result);

        setProjects(merged.projects);
        setItems(merged.items);
        setSelectedProjectIds((prev) => {
          const next = new Set(prev);
          for (const pid of merged.mergedProjectIds) {
            next.add(pid);
          }
          return Array.from(next);
        });
        setSelectedProjectId('all');
        setShowSettingsModal(false);
        setProjectMenuOpen(false);
        setCreateMenuOpen(false);

        recordPlanChange(
          'create_item',
          'Importación',
          `Importar ${file.name} (+${merged.addedItemsCount} tareas)`,
          merged.items,
          merged.projects
        );

        const fit = computeFitToProjectScale(merged.items, 980);
        if (fit.spanDays > 0) {
          setDayWidth(fit.dayWidth);
        }

        showToast(
          `Datos fusionados (+${merged.addedProjectsCount} proy, +${merged.addedItemsCount} tareas nuevas, ${merged.updatedItemsCount} actualizadas)`
        );
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
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    setIsDraggingFile(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingFile(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleImportFile(file);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-[#F4F4F1] dark:bg-[#0C0C09] text-[#0C0C09] dark:text-[#F4F4F1] selection:bg-[#0C0C09]/15 relative font-sans"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Top Navigation Bar — Single Minimalist 48px Bar */}
      <header className="sticky top-0 z-30 h-12 px-4 bg-[#F4F4F1] dark:bg-[#0C0C09] border-b border-[#0C0C09] dark:border-zinc-800 flex items-center justify-between gap-3 select-none">
        
        {/* LEFT: Toggle Table Button + "Proyectos" Multi-Select Dropdown */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Botón posicionado en el icono para esconder la tabla y enseñar solo el diagrama */}
          <button
            type="button"
            data-testid="toggle-table-btn"
            onClick={() => setShowTable((prev) => !prev)}
            className={`w-7 h-7 rounded-[4px] border flex items-center justify-center shrink-0 transition cursor-pointer ${
              showTable
                ? 'bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 hover:bg-[#312C85]'
                : 'bg-white border-[#0C0C09] text-[#0C0C09] dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-400 hover:bg-[#F4F4F1]'
            }`}
            title={showTable ? 'Ocultar tabla de tareas (solo diagrama)' : 'Mostrar tabla de tareas'}
            aria-label={showTable ? 'Ocultar tabla de tareas' : 'Mostrar tabla de tareas'}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="16" y2="6" />
              <line x1="8" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="12" y2="18" />
            </svg>
          </button>

          {/* Selector "Proyectos" con selección múltiple */}
          <div ref={projectMenuRef} className="relative" data-dropdown-container="true">
            <button
              type="button"
              data-project-selector-btn="true"
              onClick={() => {
                setProjectMenuOpen((prev) => !prev);
                setCreateMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-white dark:bg-zinc-900 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 border border-[#0C0C09] dark:border-zinc-700 text-xs font-medium text-[#0C0C09] dark:text-zinc-200 transition shadow-none cursor-pointer"
              title="Seleccionar proyectos visibles en el Gantt"
            >
              <FolderKanban className="w-3.5 h-3.5 text-[#6B6B66]" />
              <span className="font-display font-medium">Proyectos</span>
              {selectedProjectIds.length < effectiveProjects.length && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#312C85] shrink-0" />
              )}
              <span className="px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-300 border border-[#E2E2DC] dark:border-zinc-700">
                {selectedProjectIds.length}/{effectiveProjects.length}
              </span>
              <ChevronDown className="w-3 h-3 text-[#6B6B66]" />
            </button>

            {projectMenuOpen && (
              <div
                data-projects-dropdown-menu="true"
                className="absolute left-0 top-10 w-72 p-2 bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[4px] shadow-xl z-50 text-xs flex flex-col gap-1 max-h-[380px] overflow-y-auto"
              >
                <div className="flex items-center justify-between px-2 py-1 border-b border-[#E2E2DC] dark:border-zinc-800 pb-1.5 mb-0.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400">
                    Visibles en Gantt ({selectedProjectIds.length}/{projectGroups.length})
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      data-select-all-btn="true"
                      onClick={handleSelectAllProjects}
                      className="text-[10px] text-[#0C0C09] dark:text-zinc-200 hover:underline font-bold cursor-pointer"
                    >
                      Todos
                    </button>
                    <span className="text-[#D1D1CB] dark:text-zinc-700">·</span>
                    <button
                      type="button"
                      data-deselect-all-btn="true"
                      onClick={handleDeselectAllProjects}
                      className="text-[10px] text-[#6B6B66] hover:underline cursor-pointer"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                {projectGroups.map((group) => {
                  const isChecked = selectedProjectIds.includes(group.project.id);
                  const colorDot =
                    PROJECT_COLORS.find((c) => c.value === group.project.color)?.bg ||
                    'bg-[#0C0C09]';
                  return (
                    <div
                      key={group.project.id}
                      data-project-menu-item={group.project.id}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-[2px] text-left transition ${
                        isChecked
                          ? 'bg-[#F4F4F1] dark:bg-zinc-800/80 text-[#0C0C09] dark:text-white font-medium'
                          : 'hover:bg-[#F4F4F1]/60 dark:hover:bg-zinc-800/40 text-[#6B6B66] dark:text-zinc-400'
                      }`}
                    >
                      <label className="flex items-center gap-2 min-w-0 pr-1 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectProject(group.project.id)}
                          className="rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] focus:ring-0 cursor-pointer"
                        />
                        <span className={`w-2 h-2 rounded-full shrink-0 ${colorDot}`} />
                        <span className="truncate max-w-[130px] font-display">
                          P{group.projectIndex}: {group.project.name}
                        </span>
                      </label>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono opacity-80">
                          {group.items.length}t
                        </span>
                        {effectiveProjects.length > 1 && (
                          <button
                            type="button"
                            data-testid={`delete-project-menu-btn-${group.project.id}`}
                            data-delete-project-btn={group.project.id}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (
                                typeof window !== 'undefined' &&
                                window.confirm &&
                                !window.confirm(
                                  `¿Eliminar el proyecto "${group.project.name}"? Sus tareas se reasignarán al proyecto principal.`
                                )
                              ) {
                                return;
                              }
                              handleDeleteProject(group.project.id);
                            }}
                            className="p-1 rounded-[2px] text-[#6B6B66] hover:text-[#DC2626] hover:bg-rose-500/10 transition cursor-pointer"
                            title={`Eliminar proyecto ${group.project.name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="border-t border-[#E2E2DC] dark:border-zinc-800 my-1" />
                <button
                  type="button"
                  data-add-project-dropdown-btn="true"
                  onClick={() => {
                    handleCreateProject();
                    setProjectMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] font-display font-semibold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Proyecto</span>
                </button>
              </div>
            )}
          </div>

          {/* Deshacer / Rehacer */}
          <div className="flex items-center border border-[#0C0C09] dark:border-zinc-700 rounded-[4px] bg-white dark:bg-zinc-900 overflow-hidden shrink-0">
            <button
              type="button"
              data-testid="header-undo-btn"
              data-undo-btn="true"
              disabled={!canUndo}
              onClick={handleUndo}
              className={`p-1.5 transition flex items-center justify-center ${
                canUndo
                  ? 'text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 cursor-pointer'
                  : 'text-[#0C0C09]/25 dark:text-zinc-600 cursor-not-allowed'
              }`}
              title="Deshacer (Ctrl+Z / ⌘Z)"
              aria-label="Deshacer"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-[#E2E2DC] dark:bg-zinc-800" />
            <button
              type="button"
              data-testid="header-redo-btn"
              data-redo-btn="true"
              disabled={!canRedo}
              onClick={handleRedo}
              className={`p-1.5 transition flex items-center justify-center ${
                canRedo
                  ? 'text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 cursor-pointer'
                  : 'text-[#0C0C09]/25 dark:text-zinc-600 cursor-not-allowed'
              }`}
              title="Rehacer (Ctrl+Shift+Z / ⌘⇧Z)"
              aria-label="Rehacer"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Historial Button */}
          <button
            type="button"
            data-testid="header-history-btn"
            data-history-btn="true"
            onClick={() => setCurrentView((prev) => (prev === 'history' ? 'gantt' : 'history'))}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] border text-xs font-medium transition cursor-pointer shrink-0 ${
              currentView === 'history'
                ? 'bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:border-white dark:text-[#0C0C09]'
                : 'bg-white dark:bg-zinc-900 border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800'
            }`}
            title="Consultar historial de cambios del plan"
            aria-label="Historial"
          >
            <History className="w-3.5 h-3.5 text-current" />
            <span className="font-display font-medium hidden sm:inline">Historial</span>
            <span
              data-testid="history-counter-badge"
              className={`px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono border ${
                currentView === 'history'
                  ? 'bg-zinc-800 text-white border-zinc-700 dark:bg-zinc-200 dark:text-[#0C0C09] dark:border-zinc-300'
                  : 'bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-300 border-[#E2E2DC] dark:border-zinc-700'
              }`}
            >
              {history.length}
            </span>
          </button>

          {/* Releases Hub Button */}
          <button
            type="button"
            data-testid="header-releases-btn"
            onClick={() => setShowReleasesModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] border text-xs font-medium transition cursor-pointer shrink-0 ${
              showReleasesModal
                ? 'bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:border-white dark:text-[#0C0C09]'
                : 'bg-white dark:bg-zinc-900 border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800'
            }`}
            title="Gestionar catálogo de Releases e hitos (importar/exportar Excel)"
            aria-label="Releases"
          >
            <Rocket className="w-3.5 h-3.5 text-current" />
            <span className="font-display font-medium hidden sm:inline">Releases</span>
            <span
              data-testid="releases-counter-badge"
              className={`px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono border ${
                showReleasesModal
                  ? 'bg-zinc-800 text-white border-zinc-700 dark:bg-zinc-200 dark:text-[#0C0C09] dark:border-zinc-300'
                  : 'bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-300 border-[#E2E2DC] dark:border-zinc-700'
              }`}
            >
              {releases.length}
            </span>
            {totalReleaseViolations > 0 && (
              <span
                data-testid="releases-header-violation-indicator"
                className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"
                title={`${totalReleaseViolations} tarea(s) violan los hitos de su release`}
              />
            )}
          </button>

          {/* Grouping Mode Toggle (Por Proyecto vs Por Release) */}
          <button
            type="button"
            data-testid="grouping-mode-toggle"
            onClick={() => setGroupingMode((prev) => (prev === 'release' ? 'project' : 'release'))}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-[4px] border text-xs font-medium transition cursor-pointer shrink-0 ${
              groupingMode === 'release'
                ? 'bg-[#312C85] border-[#312C85] text-white dark:bg-indigo-600 dark:border-indigo-500'
                : 'bg-white dark:bg-zinc-900 border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800'
            }`}
            title={
              groupingMode === 'release'
                ? 'Agrupado por Release > Proyecto > Tarea (Click para agrupar por Proyecto)'
                : 'Agrupado por Proyecto (Click para agrupar jerárquicamente por Release)'
            }
            aria-label="Conmutar agrupación por Release"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="font-display font-medium hidden md:inline">
              {groupingMode === 'release' ? 'Vista: Release' : 'Vista: Proyecto'}
            </span>
          </button>

          {scenarioSavedToast && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[11px] font-mono font-semibold text-white shadow-none animate-fade-in ${
                scenarioSavedToast.startsWith('Error')
                  ? 'bg-[#DC2626]'
                  : 'bg-[#16A34A]'
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
                setProjectMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] text-xs font-display font-semibold shadow-none transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {createMenuOpen && (
              <div className="absolute right-0 top-10 w-48 p-1.5 bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[4px] shadow-xl z-50 text-xs flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenCreateModal('task');
                    setCreateMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-[2px] hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 font-medium transition text-left cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#0C0C09] dark:text-zinc-200" />
                  <span>Nueva Tarea</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleOpenCreateModal('milestone');
                    setCreateMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-[2px] hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 font-medium transition text-left cursor-pointer"
                >
                  <Diamond className="w-3.5 h-3.5 text-[#D97706] fill-current" />
                  <span>Nuevo Hito</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleCreateProject();
                    setCreateMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-[2px] hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 font-medium transition text-left cursor-pointer"
                >
                  <FolderKanban className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>Nuevo Proyecto</span>
                </button>
                <div className="border-t border-[#E2E2DC] dark:border-zinc-800 my-0.5" />
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setCreateMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-[2px] hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 font-medium transition text-left cursor-pointer"
                  title="Importar datos desde JSON o CSV"
                >
                  <Upload className="w-3.5 h-3.5 text-[#312C85]" />
                  <span>Importar Datos</span>
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-[#0C0C09] dark:bg-zinc-700 hidden sm:block" />

          {/* Iconos Vectoriales SVG Minimalistas con Tooltip Hints */}

          {/* Ruta Crítica */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setShowCriticalPath((prev) => !prev)}
              className={`p-1.5 rounded-[4px] border transition shadow-none ${
                showCriticalPath
                  ? 'bg-[#D97706]/15 border-[#D97706] text-[#D97706] hover:bg-[#D97706]/25'
                  : 'bg-white dark:bg-zinc-900 border-[#0C0C09] dark:border-zinc-700 text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-white'
              }`}
              aria-label="Ruta Crítica"
            >
              <Flame className="w-4 h-4" />
            </button>
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-10 px-2 py-1 bg-[#0C0C09] text-[#F4F4F1] text-[11px] font-mono font-medium rounded-[2px] shadow-lg border border-[#E2E2DC] whitespace-nowrap z-50 pointer-events-none">
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
              className="p-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 transition shadow-none cursor-pointer"
              aria-label="Ajustar"
              title="Ajustar a Proyecto"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-10 px-2 py-1 bg-[#0C0C09] text-[#F4F4F1] text-[11px] font-mono font-medium rounded-[2px] shadow-lg border border-[#E2E2DC] whitespace-nowrap z-50 pointer-events-none">
              Ajustar a Proyecto
            </div>
          </div>

          {/* Ir a Hoy */}
          <div className="relative group">
            <button
              type="button"
              onClick={scrollToToday}
              className="p-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 transition shadow-none cursor-pointer"
              aria-label="Hoy"
            >
              <Compass className="w-4 h-4" />
            </button>
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-10 px-2 py-1 bg-[#0C0C09] text-[#F4F4F1] text-[11px] font-mono font-medium rounded-[2px] shadow-lg border border-[#E2E2DC] whitespace-nowrap z-50 pointer-events-none">
              Ir a Hoy
            </div>
          </div>

          {/* Métricas Drawer Toggle */}
          <div className="relative group">
            <button
              ref={metricsToggleBtnRef}
              type="button"
              onClick={() => setShowMetricsDrawer((prev) => !prev)}
              className={`p-1.5 rounded-[4px] border transition shadow-none cursor-pointer ${
                showMetricsDrawer
                  ? 'bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]'
                  : 'bg-white dark:bg-zinc-900 border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1]'
              }`}
              aria-label="Métricas"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-10 px-2 py-1 bg-[#0C0C09] text-[#F4F4F1] text-[11px] font-mono font-medium rounded-[2px] shadow-lg border border-[#E2E2DC] whitespace-nowrap z-50 pointer-events-none">
              Métricas del proyecto
            </div>
          </div>

          {/* Selector Rápido de Tema (Claro / Oscuro) */}
          <div className="relative group">
            <button
              type="button"
              data-testid="header-theme-toggle-btn"
              onClick={() => setDarkMode((prev) => !prev)}
              className="p-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 transition shadow-none cursor-pointer"
              aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={darkMode ? 'Modo claro (Alabastro minimalista)' : 'Modo oscuro'}
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#0C0C09]" />
              )}
            </button>
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-10 px-2 py-1 bg-[#0C0C09] text-[#F4F4F1] text-[11px] font-mono font-medium rounded-[2px] shadow-lg border border-[#E2E2DC] whitespace-nowrap z-50 pointer-events-none">
              {darkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            </div>
          </div>

          {/* Configuración */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 transition shadow-none cursor-pointer"
              aria-label="Configuración"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-10 px-2 py-1 bg-[#0C0C09] text-[#F4F4F1] text-[11px] font-mono font-medium rounded-[2px] shadow-lg border border-[#E2E2DC] whitespace-nowrap z-50 pointer-events-none">
              Configuración (Flechas, datos, tema)
            </div>
          </div>

        </div>
      </header>

      {/* Collapsible Metrics Drawer (Hidden by default) */}
      {showMetricsDrawer && (
        <div
          ref={metricsDrawerRef}
          className="px-4 py-3 bg-white dark:bg-[#0C0C09] border-b border-[#0C0C09] dark:border-zinc-800 text-xs"
        >
          <div className="max-w-[1920px] mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400">
                Métricas Clave del Proyecto
              </span>
              <button
                type="button"
                onClick={() => setShowMetricsDrawer(false)}
                className="text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-2.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-800">
                <div className="text-[#6B6B66] dark:text-zinc-400 text-[10px] font-mono uppercase">Duración Total</div>
                <div className="font-semibold text-[#0C0C09] dark:text-white mt-0.5">
                  {metrics.projectsCount} proy · {metrics.totalDays}d
                </div>
              </div>
              <div className="p-2.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-800">
                <div className="text-[#6B6B66] dark:text-zinc-400 text-[10px] font-mono uppercase">Avance Global</div>
                <div className="font-semibold text-[#0C0C09] dark:text-white mt-0.5">
                  {metrics.tasksCount} tareas · {metrics.avgProgress}%
                </div>
              </div>
              <div className="p-2.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-800">
                <div className="text-[#6B6B66] dark:text-zinc-400 text-[10px] font-mono uppercase">Hitos Clave</div>
                <div className="font-semibold text-[#D97706] mt-0.5">
                  {metrics.milestonesCount} hitos
                </div>
              </div>
              <div className="p-2.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-800">
                <div className="text-[#6B6B66] dark:text-zinc-400 text-[10px] font-mono uppercase">Holgura (Slack)</div>
                <div className="font-semibold text-[#312C85] dark:text-indigo-400 mt-0.5">
                  +{metrics.totalSlackDays}d de margen
                </div>
              </div>
              <div className="p-2.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-800">
                <div className="text-[#6B6B66] dark:text-zinc-400 text-[10px] font-mono uppercase">Ruta Crítica</div>
                <div className="font-semibold text-[#DC2626] mt-0.5">
                  {metrics.criticalCount} críticas
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col max-w-[1920px] w-full mx-auto px-2 sm:px-4 py-2 sm:py-3 gap-2 min-h-0">
        {currentView === 'history' ? (
          <PlanHistoryPage
            history={history}
            currentIndex={historyIndex}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onRestoreSnapshot={handleRestoreSnapshot}
            onBackToGantt={() => setCurrentView('gantt')}
            onClearHistory={handleClearHistory}
          />
        ) : (
          <>
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
              releases={releases}
              releaseGuideVisibility={releaseGuideVisibility}
              groupingMode={groupingMode}
              onToggleGroupingMode={() => setGroupingMode((prev) => (prev === 'release' ? 'project' : 'release'))}
              groupByProject={groupByProject}
              selectedProjectId={selectedProjectId}
              selectedProjectIds={selectedProjectIds}
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
              onUpdateItems={handleUpdateItems}
              onReorderItem={handleReorderItem}
              onMoveItem={handleMoveItem}
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
              showTable={showTable}
              onToggleShowTable={() => setShowTable((prev) => !prev)}
            />
          </>
        )}
      </main>

      {/* Settings Modal (Flechas, auto-cascada, tema, zoom, exportar/importar) */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSettingsModal(false);
          }
        }}
        className={`${showSettingsModal ? 'fixed' : 'hidden'} inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4`}
      >
        <div
          ref={settingsModalRef}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white dark:bg-[#0C0C09] border border-[#0C0C09] dark:border-zinc-700 rounded-[8px] shadow-2xl overflow-hidden p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#0C0C09] dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#0C0C09] dark:text-zinc-400" />
              <h2 className="text-sm font-bold text-[#0C0C09] dark:text-white">
                Configuración del Cronograma
              </h2>
              <span
                data-testid="app-version-badge"
                className="px-1.5 py-0.5 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 text-[#6B6B66] dark:text-zinc-400 text-[10px] font-mono font-bold border border-[#E2E2DC] dark:border-zinc-700"
              >
                {`v${APP_VERSION}`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Configuración de Flechas de Dependencia */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400">
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
                  className={`p-2.5 rounded-[4px] border flex items-center gap-2 cursor-pointer transition ${
                    arrowVisibility === opt.id
                      ? 'border-[#0C0C09] bg-[#0C0C09] text-white dark:border-zinc-200 dark:bg-zinc-100 dark:text-[#0C0C09] font-bold'
                      : 'border-[#E2E2DC] dark:border-zinc-800 bg-[#F4F4F1] dark:bg-zinc-950 text-[#0C0C09] dark:text-zinc-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="arrow-visibility"
                    checked={arrowVisibility === opt.id}
                    onChange={() => setArrowVisibility(opt.id)}
                    className="text-[#0C0C09]"
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
                    className="px-2 py-1 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-[#F4F4F1] dark:hover:bg-zinc-700 text-[#0C0C09] dark:text-zinc-200 text-center font-mono text-xs cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[#0C0C09] dark:text-zinc-300 font-medium">Tema visual</span>
              <button
                type="button"
                onClick={() => setDarkMode((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] cursor-pointer"
              >
                {darkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Modo Oscuro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-[#0C0C09]" />
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

          {/* Acceso directo a Página de Historial */}
          <div className="border-t border-[#E2E2DC] dark:border-zinc-800 pt-3 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-[#0C0C09] dark:text-zinc-200">
                Historial del Plan
              </div>
              <div className="text-[11px] text-[#6B6B66] dark:text-zinc-400">
                {history.length} cambios registrados
              </div>
            </div>
            <button
              type="button"
              data-testid="settings-history-btn"
              onClick={() => {
                setShowSettingsModal(false);
                setCurrentView('history');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#0C0C09] hover:text-white dark:hover:bg-zinc-100 dark:hover:text-[#0C0C09] font-medium transition cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>Ver Historial</span>
            </button>
          </div>

          <div className="pt-2 border-t border-[#E2E2DC] dark:border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#6B6B66] dark:text-zinc-400">
              {`GanttFlow v${APP_VERSION}`}
            </span>
            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="px-4 py-1.5 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] font-display font-semibold text-xs transition cursor-pointer"
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

      {/* Releases Management Modal Hub */}
      <ReleasesModal
        isOpen={showReleasesModal}
        onClose={() => setShowReleasesModal(false)}
        releases={releases}
        onUpdateReleases={setReleases}
        projects={effectiveProjects}
        items={computedItems}
        onAssignProjectToRelease={handleAssignProjectToRelease}
        guideVisibility={releaseGuideVisibility}
        onChangeGuideVisibility={setReleaseGuideVisibility}
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
