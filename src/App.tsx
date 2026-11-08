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
  CalendarDays,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Flame,
  FolderKanban,
  HelpCircle,
  History,
  Layers,
  Maximize2,
  Moon,
  Plus,
  Rocket,
  RotateCw,
  Rows,
  Save,
  Settings,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  APP_VERSION,
  ArrowVisibility,
  ComputedGanttItem,
  DEFAULT_TRUNCATE_CHAR_LIMIT,
  FocusEntity,
  GanttImportResult,
  GanttItem,
  GanttProject,
  GroupingMode,
  PROJECT_COLORS,
  ProjectPlatform,
  ProjectTemplate,
  PlanHistoryActionType,
  PlanHistoryEntry,
  Release,
  ReleaseGuideVisibility,
  SavedScenario,
  TaskColor,
  TaskType,
  TRUNCATE_LIMIT_STORAGE_KEY,
  ZoomLevel,
} from './types/gantt';
import {
  cascadeDependencies,
  clampDayWidth,
  collectTimelineAnchorDates,
  computeFitToProjectScale,
  computeGanttMetrics,
  computeTimelineBounds,
  createNewScenario,
  DEFAULT_DAY_WIDTH,
  describeItemStateChanges,
  describeProjectStateChanges,
  filterGroupsBySelectedProjects,
  formatDateDisplay,
  formatDateISO,
  formatFieldDiffsInline,
  getDayWidthForPreset,
  getDefaultSavedScenarios,
  getProjectTemplates,
  getRelatedFocusEntityIds,
  groupItemsByProject,
  importGanttData,
  isDemoProject,
  isDemoScenario,
  mergeImportedGanttData,
  moveTaskItem,
  parseCSVToGanttData,
  parseDateSafe,
  preserveActiveWorkspaceInScenarios,
  propagateProjectChangesToItems,
  reorderProject,
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
import { HelpPage } from './components/HelpPage';
import { ReleasesModal } from './components/ReleasesModal';
import { SettingsModal } from './components/SettingsModal';
import { ReleaseNotesModal } from './components/ReleaseNotesModal';
import { ReportsView } from './components/ReportsView';
import {
  DEFAULT_PREDEFINED_RELEASES,
  checkTaskReleaseCompliance,
  getReleaseDateSpan,
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
const HIDDEN_RELEASES_STORAGE_KEY = 'ganttflow_hidden_releases';

interface InitialWorkspaceState {
  activeScenarioId: string;
  projectName: string;
  projects: GanttProject[];
  items: GanttItem[];
  savedScenarios: SavedScenario[];
}

const CLEAN_DEFAULT_PROJECT: GanttProject = {
  id: 'proj-1',
  name: 'Mi Proyecto',
  color: 'indigo',
  collapsed: false,
  isDemo: false,
  releaseId: DEFAULT_PREDEFINED_RELEASES[0].id,
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
      projects: target.projects.map((p) => ({
        ...p,
        releaseId: p.releaseId || DEFAULT_PREDEFINED_RELEASES[0].id,
      })),
      items: target.items,
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

        const cleanProjects = rawProjects.map((p, i) =>
          sanitizeProject(
            {
              ...p,
              releaseId: p.releaseId || DEFAULT_PREDEFINED_RELEASES[0].id,
              isDemo: false,
            },
            i
          )
        );

        const cleanItems = rawItems
          .filter((it) => cleanProjects.some((p) => p.id === it.projectId))
          .map((it, i) => sanitizeGanttItem(it, i));

        // Auto-recover any projects/tasks that might have been dropped in a previous session but exist in plan history
        try {
          const rawHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
          if (rawHistory) {
            const parsedHist = JSON.parse(rawHistory);
            if (Array.isArray(parsedHist) && parsedHist.length > 0) {
              for (let i = parsedHist.length - 1; i >= 0; i--) {
                const snap = parsedHist[i]?.snapshot;
                if (snap && Array.isArray(snap.projects) && snap.projects.length > 0) {
                  for (const p of snap.projects) {
                    if (p && p.id && !cleanProjects.some((cp) => cp.id === p.id)) {
                      cleanProjects.push(
                        sanitizeProject(
                          {
                            ...p,
                            releaseId: p.releaseId || DEFAULT_PREDEFINED_RELEASES[0].id,
                            isDemo: false,
                          },
                          cleanProjects.length
                        )
                      );
                    }
                  }
                  if (Array.isArray(snap.items) && snap.items.length > 0) {
                    for (const it of snap.items) {
                      if (
                        it &&
                        it.id &&
                        !cleanItems.some((ci) => ci.id === it.id) &&
                        cleanProjects.some((cp) => cp.id === it.projectId)
                      ) {
                        cleanItems.push(sanitizeGanttItem(it, cleanItems.length));
                      }
                    }
                  }
                  break;
                }
              }
            }
          }
        } catch {}

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
            const cleanProjects = rawProjects.map((p, i) =>
              sanitizeProject(
                {
                  ...p,
                  releaseId: p.releaseId || DEFAULT_PREDEFINED_RELEASES[0].id,
                  isDemo: false,
                },
                i
              )
            );
            const cleanItems = rawItems
              .filter((it) => cleanProjects.some((p) => p.id === it.projectId))
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
  initialGroupingMode = 'release',
  initialReleaseGuideVisibility = 'selected',
  initialProjects,
  initialItems,
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
  initialProjects?: GanttProject[];
  initialItems?: GanttItem[];
} = {}) {
  const templates = useMemo(() => getProjectTemplates(), []);
  const defaultScenarios = useMemo(() => getDefaultSavedScenarios(), []);

  const initialState = useMemo(
    () => loadInitialWorkspaceState(templates, defaultScenarios, initialScenarioId),
    [templates, defaultScenarios, initialScenarioId]
  );

  const [currentView, setCurrentView] = useState<'gantt' | 'history' | 'projects' | 'reports' | 'help'>(
    initialView || 'gantt'
  );
  const [projectName, setProjectName] = useState<string>(
    () => initialState.projectName
  );
  const [projects, setProjects] = useState<GanttProject[]>(
    () => initialProjects || initialState.projects
  );
  const [items, setItems] = useState<GanttItem[]>(() => initialItems || initialState.items);

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
            const allKnown = initialState.projects.every((p) => parsed.includes(p.id));
            if (allKnown && validIds.length > 0) {
              return validIds;
            }
            const unrecorded = initialState.projects
              .filter((p) => !parsed.includes(p.id))
              .map((p) => p.id);
            const combined = [...validIds, ...unrecorded];
            if (combined.length > 0) {
              return combined;
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
    if (initialGroupingMode && initialGroupingMode !== 'project') return initialGroupingMode;
    return 'release';
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
      localStorage.setItem(GROUPING_MODE_KEY, 'release');
    } catch {}
  }, []);

  // Horizontal task row separation lines visibility (persisted in localStorage)
  const [showRowSeparators, setShowRowSeparators] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('ganttflow_show_row_separators');
        return saved !== null ? saved === 'true' : true;
      }
    } catch {}
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem('ganttflow_show_row_separators', String(showRowSeparators));
    } catch {}
  }, [showRowSeparators]);

  // Weekend column shading visibility (persisted in localStorage, default false for clean background)
  const [showWeekendShading, setShowWeekendShading] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('ganttflow_show_weekend_shading');
        return saved !== null ? saved === 'true' : false;
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    try {
      localStorage.setItem('ganttflow_show_weekend_shading', String(showWeekendShading));
    } catch {}
  }, [showWeekendShading]);

  // Hidden Releases (persisted in localStorage)
  const [hiddenReleaseIds, setHiddenReleaseIds] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(HIDDEN_RELEASES_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(HIDDEN_RELEASES_STORAGE_KEY, JSON.stringify(hiddenReleaseIds));
    } catch {}
  }, [hiddenReleaseIds]);

  const handleToggleHideRelease = (releaseId: string) => {
    setHiddenReleaseIds((prev) => {
      const isHidden = prev.includes(releaseId);
      const next = isHidden ? prev.filter((id) => id !== releaseId) : [...prev, releaseId];
      const rel = releases.find((r) => r.id === releaseId);
      showToast(
        isHidden
          ? `Release '${rel?.code || releaseId}' ahora es visible con sus proyectos.`
          : `Release '${rel?.code || releaseId}' y sus proyectos asociados han sido ocultados.`
      );
      return next;
    });
  };

  const handleResetHiddenReleases = () => {
    setHiddenReleaseIds([]);
    showToast('Se ha restablecido la visibilidad de todas las releases y proyectos.');
  };

  // Text Truncation Limit state & persistence
  const [truncateCharLimit, setTruncateCharLimit] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(TRUNCATE_LIMIT_STORAGE_KEY);
        if (saved) {
          const num = parseInt(saved, 10);
          if (Number.isFinite(num) && num >= 5 && num <= 200) return num;
        }
      }
    } catch {}
    return DEFAULT_TRUNCATE_CHAR_LIMIT;
  });

  useEffect(() => {
    try {
      localStorage.setItem(TRUNCATE_LIMIT_STORAGE_KEY, String(truncateCharLimit));
    } catch {}
  }, [truncateCharLimit]);

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showReleaseNotesModal, setShowReleaseNotesModal] = useState<boolean>(false);

  // Focus Mode state
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [focusEntity, setFocusEntity] = useState<FocusEntity | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<FocusEntity | null>(null);

  const handleExitFocusMode = () => {
    setIsFocusMode(false);
    setFocusEntity(null);
    showToast('Modo Enfoque desactivado: mostrando todos los elementos.');
  };

  const handleSetFocusEntity = (entity: FocusEntity | null) => {
    if (!entity) {
      handleExitFocusMode();
      return;
    }
    // Si ya estamos en modo enfoque para la MISMA entidad, salir de enfoque
    if (isFocusMode && focusEntity?.type === entity.type && focusEntity?.id === entity.id) {
      handleExitFocusMode();
      return;
    }
    setFocusEntity(entity);
    setIsFocusMode(true);
    showToast(
      `Modo Enfoque activado en ${
        entity.type === 'task'
          ? 'tarea'
          : entity.type === 'project'
          ? 'proyecto'
          : 'release'
      }: '${entity.name || entity.id}'`
    );
  };

  // Platform Filter state ('all' | 'iOS' | 'Android' | 'iOS/Android')
  const [selectedPlatform, setSelectedPlatform] = useState<
    'all' | 'iOS' | 'Android' | 'iOS/Android'
  >('all');

  const [scenarioSavedToast, setScenarioSavedToast] = useState<string | null>(null);

  // Minimalist UI toggles and menus
  const [showMetricsDrawer, setShowMetricsDrawer] = useState<boolean>(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState<boolean>(initialProjectMenuOpen);
  const [moreMenuOpen, setMoreMenuOpen] = useState<boolean>(false);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState<boolean>(false);
  const [newProjectFormName, setNewProjectFormName] = useState<string>('');
  const [newProjectFormReleaseId, setNewProjectFormReleaseId] = useState<string>('');
  const [newProjectFormColor, setNewProjectFormColor] = useState<string>('indigo');
  const [newProjectFormPlatform, setNewProjectFormPlatform] = useState<ProjectPlatform>('iOS/Android');

  const projectMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const metricsDrawerRef = useRef<HTMLDivElement>(null);
  const metricsToggleBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (projectMenuRef.current && !projectMenuRef.current.contains(target)) {
        setProjectMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setMoreMenuOpen(false);
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
        if (isFocusMode) {
          handleExitFocusMode();
          return;
        }
        setProjectMenuOpen(false);
        setMoreMenuOpen(false);
        setCreateProjectModalOpen(false);
        setShowMetricsDrawer(false);
        setShowSettingsModal(false);
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
  }, [showMetricsDrawer, handleUndo, handleRedo, isFocusMode]);

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
    () =>
      projectGroups.map((g) => ({
        ...g.project,
        releaseId: g.project.releaseId || releases[0]?.id || 'rel-t-26-12-1',
      })),
    [projectGroups, releases]
  );

  // Keep active workspace automatically synced in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ projectName, projects: effectiveProjects, items, releases })
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
          releases,
          savedScenarios: [
            {
              id: 'scen-user',
              name: projectName,
              projects: effectiveProjects,
              items,
              releases,
              updatedAt: new Date().toISOString(),
              isDemo: false,
            },
          ],
        })
      );
    } catch {
      // ignore quota errors
    }
  }, [projectName, effectiveProjects, items, selectedProjectIds, releases]);


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

    const projectMap = new Map(projectGroups.map((g) => [g.project.id, g.project.name]));
    const itemMapById = new Map(computedItems.map((it) => [it.id, it]));

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
        conflictItems: [] as Array<{
          id: string;
          name: string;
          type: TaskType;
          projectId?: string;
          projectName?: string;
          startDate: string;
          endDate: string;
          conflictMessage?: string;
          predecessorNames: string[];
        }>,
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
    const conflictItems: Array<{
      id: string;
      name: string;
      type: TaskType;
      projectId?: string;
      projectName?: string;
      startDate: string;
      endDate: string;
      conflictMessage?: string;
      predecessorNames: string[];
    }> = [];

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
      if (it.hasConflict) {
        conflictCount++;
        const predNames = (it.dependencies || [])
          .map((pid) => itemMapById.get(pid)?.name)
          .filter((n): n is string => Boolean(n));
        conflictItems.push({
          id: it.id,
          name: it.name,
          type: it.type,
          projectId: it.projectId,
          projectName: it.projectId ? projectMap.get(it.projectId) : undefined,
          startDate: it.startDate,
          endDate: it.endDate,
          conflictMessage: it.conflictMessage,
          predecessorNames: predNames,
        });
      }
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
      conflictItems,
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

  const focusRelatedItemCount = useMemo(() => {
    if (!isFocusMode || !focusEntity) return 0;
    const res = getRelatedFocusEntityIds(focusEntity, computedItems, effectiveProjects);
    return res.itemIds.length;
  }, [isFocusMode, focusEntity, computedItems, effectiveProjects]);

  const handleSaveFromModal = (savedItem: GanttItem, cascade: boolean) => {
    const cleanItem = sanitizeGanttItem({
      ...savedItem,
      projectId: savedItem.projectId || effectiveProjects[0]?.id,
    });
    const prevItem = items.find((it) => it.id === cleanItem.id);
    const exists = Boolean(prevItem);
    const nextRaw = exists
      ? items.map((it) => (it.id === cleanItem.id ? cleanItem : it))
      : [...items, cleanItem];
    const next = cascade ? cascadeDependencies(nextRaw) : nextRaw;
    setItems(next);
    const isM = cleanItem.type === 'milestone';
    const actionType: PlanHistoryActionType = exists ? 'edit_item' : 'create_item';
    const actionLabel = exists ? 'Edición' : 'Creación';
    const itemDiffs = describeItemStateChanges(
      prevItem,
      cleanItem,
      effectiveProjects,
      next,
      releases
    );
    const diffSummary = formatFieldDiffsInline(itemDiffs);
    const baseDesc = exists
      ? `Editar ${isM ? 'hito' : 'tarea'} '${cleanItem.name}'`
      : `Crear ${isM ? 'hito' : 'tarea'} '${cleanItem.name}'`;
    const desc = diffSummary ? `${baseDesc} (${diffSummary})` : baseDesc;
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
    const itemDiffs = describeItemStateChanges(
      prevItem,
      cleanItem,
      effectiveProjects,
      next,
      releases
    );
    const diffSummary = formatFieldDiffsInline(itemDiffs);
    let desc = diffSummary
      ? `Actualizar '${cleanItem.name}' (${diffSummary})`
      : `Actualizar '${cleanItem.name}'`;

    if (prevItem) {
      if (prevItem.startDate !== cleanItem.startDate) {
        actionType = 'drag_move';
        actionLabel = 'Desplazamiento';
        desc = `Mover '${cleanItem.name}' de ${prevItem.startDate} a ${cleanItem.startDate}`;
      } else if (prevItem.duration !== cleanItem.duration) {
        actionType = 'drag_resize';
        actionLabel = 'Redimensión';
        desc = `Cambiar duración de '${cleanItem.name}' de ${prevItem.duration}d a ${cleanItem.duration}d`;
      } else if (prevItem.name !== cleanItem.name) {
        actionType = 'edit_item';
        actionLabel = 'Edición';
        desc = `Renombrar '${prevItem.name}' a '${cleanItem.name}'`;
      } else if (prevItem.progress !== cleanItem.progress) {
        actionType = 'edit_item';
        actionLabel = 'Edición';
        desc = `Progreso de '${cleanItem.name}': ${prevItem.progress || 0}% → ${cleanItem.progress}%`;
      } else if (prevItem.assignee !== cleanItem.assignee) {
        actionType = 'edit_item';
        actionLabel = 'Edición';
        desc = `Equipo de '${cleanItem.name}': ${prevItem.assignee || 'Sin asignar'} → ${cleanItem.assignee || 'Sin asignar'}`;
      } else if (prevItem.color !== cleanItem.color) {
        actionType = 'edit_item';
        actionLabel = 'Edición';
        desc = `Color de '${cleanItem.name}': ${prevItem.color} → ${cleanItem.color}`;
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
    const nextProjectIndex =
      effectiveProjects.reduce((max, p, i) => Math.max(max, p.projectIndex || i + 1), 0) + 1;
    const clean = {
      ...sanitizeProject(
        {
          id: `proj-${Date.now()}`,
          projectIndex: nextProjectIndex,
          name: newProj?.name || `Proyecto ${nextProjectIndex}`,
          color: newProj?.color || 'indigo',
          releaseId: newProj?.releaseId || releases[0]?.id || 'rel-t-26-12-1',
          platform: newProj?.platform || 'iOS/Android',
          ...newProj,
          isDemo: false,
        },
        effectiveProjects.length
      ),
      isDemo: false,
    };
    const nextProjects = [...effectiveProjects, clean];
    setProjects(nextProjects);
    setSelectedProjectIds((prev) =>
      prev.includes(clean.id) ? prev : [...prev, clean.id]
    );
    setGroupByProject(true);
    setSelectedProjectId('all');

    // Automatically create a task named "DIGI" spanning the entire assigned release
    const targetRelease = releases.find((r) => r.id === clean.releaseId) || releases[0];
    const span = getReleaseDateSpan(targetRelease);

    const digiTask: GanttItem = {
      id: `task-${Date.now()}`,
      projectId: clean.id,
      name: 'DIGI',
      type: 'task',
      startDate: span.startDate,
      endDate: span.endDate,
      duration: span.duration,
      progress: 0,
      dependencies: [],
      slack: 0,
      color: clean.color || 'indigo',
      releaseId: clean.releaseId,
      platform: clean.platform,
    };
    const nextItems = [...items, digiTask];
    setItems(nextItems);

    recordPlanChange(
      'create_project',
      'Nuevo Proyecto',
      `Crear proyecto '${clean.name}' con tarea DIGI (${targetRelease ? targetRelease.code : ''})`,
      nextItems,
      nextProjects
    );
  };

  const handleCreateDigiTask = (project: GanttProject, taskType: 'DIGI' | 'SCR' = 'DIGI') => {
    const targetRelease = releases.find((r) => r.id === project.releaseId) || releases[0];
    const span = getReleaseDateSpan(targetRelease);
    const relTask: GanttItem = {
      id: `task-${Date.now()}`,
      projectId: project.id,
      name: taskType,
      type: 'task',
      startDate: span.startDate,
      endDate: span.endDate,
      duration: span.duration,
      progress: 0,
      dependencies: [],
      slack: 0,
      color: project.color || 'indigo',
      releaseId: project.releaseId || targetRelease?.id,
      platform: project.platform,
    };
    const nextItems = [...items, relTask];
    setItems(nextItems);
    showToast(`Tarea ${taskType} creada para '${project.name}' (${targetRelease?.code || ''})`);
    recordPlanChange(
      'create_item',
      `Creación Tarea ${taskType}`,
      `Crear tarea ${taskType} en proyecto '${project.name}'`,
      nextItems,
      effectiveProjects
    );
  };

  const handleUpdateProject = (updatedProj: GanttProject) => {
    const prevProj = effectiveProjects.find((p) => p.id === updatedProj.id);
    const nextProjects = effectiveProjects.map((p) =>
      p.id === updatedProj.id
        ? { ...updatedProj, projectIndex: updatedProj.projectIndex ?? p.projectIndex }
        : p
    );
    const nextItems = propagateProjectChangesToItems(prevProj, updatedProj, items, releases);
    setProjects(nextProjects);
    if (nextItems !== items) {
      setItems(nextItems);
    }
    const projDiffs = describeProjectStateChanges(prevProj, updatedProj, releases);
    const diffSummary = formatFieldDiffsInline(projDiffs);
    const baseDesc = `Actualizar proyecto '${updatedProj.name}'`;
    const desc = diffSummary ? `${baseDesc} (${diffSummary})` : baseDesc;
    recordPlanChange(
      'edit_project',
      'Edición Proyecto',
      desc,
      nextItems,
      nextProjects,
      updatedProj.id
    );
  };

  const handleReorderProject = (projectId: string, direction: 'up' | 'down') => {
    const targetProj = effectiveProjects.find((p) => p.id === projectId);
    if (!targetProj) return;

    const nextProjects = reorderProject(effectiveProjects, projectId, direction);
    if (nextProjects === effectiveProjects) return;

    setProjects(nextProjects);
    recordPlanChange(
      'reorder_project',
      'Reordenar Proyecto',
      `Mover proyecto '${targetProj.name}' ${direction === 'up' ? 'hacia arriba' : 'hacia abajo'}`,
      items,
      nextProjects,
      targetProj.id
    );
  };

  const handleChangeProjectColor = (projectId: string, newColor: TaskColor) => {
    const nextProjects = effectiveProjects.map((p) =>
      p.id === projectId ? { ...p, color: newColor } : p
    );
    const nextItems = items.map((it) => {
      if (it.projectId === projectId && it.type === 'task') {
        return {
          ...it,
          color: newColor,
          customColor: true,
        };
      }
      return it;
    });

    setProjects(nextProjects);
    setItems(nextItems);
    recordPlanChange(
      'change_project_color',
      'Color de Proyecto',
      `Cambiar color del proyecto y todas sus tareas a '${newColor}'`,
      nextItems,
      nextProjects,
      projectId
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

  const handleDeleteProject = (projectId: string, skipConfirm = false) => {
    const proj = effectiveProjects.find((p) => p.id === projectId);
    const projectName = proj?.name || 'este proyecto';
    const taskCount = items.filter((it) => it.projectId === projectId).length;
    if (!skipConfirm && typeof window !== 'undefined' && window.confirm) {
      const confirmed = window.confirm(
        `¿Eliminar el proyecto "${projectName}" y todas sus tareas asociadas (${taskCount} elementos)? Esta acción no se puede deshacer.`
      );
      if (!confirmed) {
        return;
      }
    }
    const remaining = effectiveProjects.filter((p) => p.id !== projectId);
    const nextItems = items.filter((it) => it.projectId !== projectId);
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
    const prevProj = effectiveProjects.find((p) => p.id === projectId);
    const updatedProj: GanttProject | undefined = prevProj
      ? { ...prevProj, releaseId: releaseId || undefined }
      : undefined;
    const nextProjects = effectiveProjects.map((p) =>
      p.id === projectId ? { ...p, releaseId: releaseId || undefined } : p
    );
    setProjects(nextProjects);
    const rel = releases.find((r) => r.id === releaseId);

    const nextItems = updatedProj
      ? propagateProjectChangesToItems(prevProj, updatedProj, items, releases, {
          release: true,
        })
      : items;
    if (nextItems !== items) {
      setItems(nextItems);
    }

    recordPlanChange(
      'edit_project',
      'Release',
      releaseId
        ? `Asignar proyecto '${prevProj?.name || projectId}' a release '${rel?.code || releaseId}'`
        : `Desasignar release de proyecto '${prevProj?.name || projectId}'`,
      nextItems,
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

  const handleNavigateToConflictItem = (conflictItem: {
    id: string;
    name: string;
    type: TaskType;
    projectId?: string;
    projectName?: string;
    startDate: string;
  }) => {
    // 1. Expand parent project if collapsed
    if (conflictItem.projectId) {
      setProjects((prev) =>
        prev.map((p) => (p.id === conflictItem.projectId ? { ...p, collapsed: false } : p))
      );
      setSelectedProjectIds((prev) =>
        prev.includes(conflictItem.projectId!) ? prev : [...prev, conflictItem.projectId!]
      );
    }

    // 2. Unhide parent release if hidden
    const fullItem = computedItems.find((it) => it.id === conflictItem.id);
    const parentProj = effectiveProjects.find((p) => p.id === conflictItem.projectId);
    const targetReleaseId = fullItem?.releaseId || parentProj?.releaseId;
    if (targetReleaseId && hiddenReleaseIds.includes(targetReleaseId)) {
      setHiddenReleaseIds((prev) => prev.filter((id) => id !== targetReleaseId));
    }

    // 3. Reset platform filter if active so the item is guaranteed visible
    if (selectedPlatform !== 'all') {
      setSelectedPlatform('all');
    }

    // 4. Select the item so it highlights and opens its inspection panel
    setSelectedEntity({
      type: 'task',
      id: conflictItem.id,
      name: conflictItem.name,
    });

    // 5. Scroll vertically and horizontally to the item in the table & timeline
    const scrollToElement = () => {
      if (typeof document === 'undefined') return;
      const rowEl = document.querySelector(
        `[data-task-row="${conflictItem.id}"]`
      ) as HTMLElement | null;
      const barEl = document.querySelector(
        `[data-timeline-task="${conflictItem.id}"], [data-timeline-milestone="${conflictItem.id}"]`
      ) as HTMLElement | null;

      if (rowEl && typeof rowEl.scrollIntoView === 'function') {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (barEl && typeof barEl.scrollIntoView === 'function') {
        barEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      const container = scrollContainerRef.current;
      if (container) {
        if (barEl) {
          const wrapper = barEl.closest('[style*="left:"]') as HTMLElement | null;
          const rawLeft = wrapper
            ? parseFloat(wrapper.style.left || '0')
            : parseFloat(barEl.style.left || '0');
          if (Number.isFinite(rawLeft)) {
            const targetScrollLeft = Math.max(0, rawLeft - container.clientWidth / 3);
            container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
            return;
          }
        }
        const extraDates = collectTimelineAnchorDates({
          projects: effectiveProjects,
          releases,
          items: computedItems,
          hiddenReleaseIds,
        });
        const { timelineStart } = computeTimelineBounds(
          computedItems,
          new Date(),
          extraDates
        );
        const startOffsetDays = differenceInCalendarDays(
          parseDateSafe(conflictItem.startDate),
          timelineStart
        );
        const targetScrollLeft = Math.max(
          0,
          Math.round(startOffsetDays * dayWidth - container.clientWidth / 3)
        );
        container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        scrollToElement();
        setTimeout(scrollToElement, 80);
      });
    }
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
    const projectsToFit =
      targetProjectId && targetProjectId !== 'all'
        ? effectiveProjects.filter((p) => p.id === targetProjectId)
        : !targetProjectId &&
          pid === 'all' &&
          selectedSet.size > 0 &&
          selectedSet.size < effectiveProjects.length
        ? effectiveProjects.filter((p) => selectedSet.has(p.id))
        : effectiveProjects;
    const itemsToFit =
      !targetProjectId &&
      pid === 'all' &&
      selectedSet.size > 0 &&
      selectedSet.size < effectiveProjects.length
        ? computedItems.filter((it) =>
            selectedSet.has(it.projectId || effectiveProjects[0]?.id || 'proj-default')
          )
        : computedItems;
    const extraDates = collectTimelineAnchorDates({
      projects: projectsToFit,
      releases,
      items: itemsToFit,
      hiddenReleaseIds,
    });
    const fit = computeFitToProjectScale(
      itemsToFit.length > 0 ? itemsToFit : computedItems,
      viewportW,
      {
        projectId: pid,
        extraDates,
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
        releases,
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
            if (
              parsed &&
              typeof parsed === 'object' &&
              Array.isArray((parsed as Record<string, unknown>).releases)
            ) {
              const rawRels = (parsed as Record<string, unknown>).releases as Release[];
              if (rawRels.length > 0 && rawRels[0]?.id && rawRels[0]?.code) {
                setReleases(rawRels);
              }
            }
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
        setProjectMenuOpen(false);

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
      {/* Top Navigation Bar — Single Clean 48px Bar */}
      <header className="sticky top-0 z-50 h-12 px-4 bg-[#F4F4F1] dark:bg-[#0C0C09] border-b border-[#0C0C09] dark:border-zinc-800 flex items-center justify-between gap-3 select-none">
        
        {/* LEFT: Primary Workflow Controls */}
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
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

                {hiddenReleaseIds.length > 0 && (
                  <div
                    data-testid="dropdown-hidden-releases-banner"
                    className="flex items-center justify-between px-2 py-1.5 mb-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded text-[11px] text-amber-800 dark:text-amber-300"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <EyeOff className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{hiddenReleaseIds.length} release(s) oculta(s)</span>
                    </div>
                    <button
                      type="button"
                      data-testid="dropdown-reset-hidden-releases-btn"
                      onClick={handleResetHiddenReleases}
                      className="font-bold underline hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer shrink-0 ml-1"
                    >
                      Mostrar todas
                    </button>
                  </div>
                )}

                {projectGroups.map((group) => {
                  const isChecked = selectedProjectIds.includes(group.project.id);
                  const isReleaseHidden =
                    Boolean(group.project.releaseId && hiddenReleaseIds.includes(group.project.releaseId));
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
                        <span className="truncate max-w-[120px] font-display">
                          {group.project.name}
                        </span>
                        {isReleaseHidden && (
                          <span
                            className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-mono shrink-0"
                            title="La release asignada a este proyecto está oculta"
                          >
                            Oculto
                          </span>
                        )}
                      </label>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono opacity-80">
                          {group.items.length}t
                        </span>
                        <button
                          type="button"
                          data-testid={`delete-project-menu-btn-${group.project.id}`}
                          data-delete-project-btn={group.project.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteProject(group.project.id);
                          }}
                          className="p-1 rounded-[2px] text-[#6B6B66] hover:text-[#DC2626] hover:bg-rose-500/10 transition cursor-pointer"
                          title={`Eliminar proyecto ${group.project.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="border-t border-[#E2E2DC] dark:border-zinc-800 my-1" />
                <button
                  type="button"
                  data-add-project-dropdown-btn="true"
                  onClick={() => {
                    setNewProjectFormName(`Proyecto ${projects.length + 1}`);
                    setNewProjectFormReleaseId(releases[0]?.id || 'rel-t-26-12-1');
                    setNewProjectFormColor('indigo');
                    setCreateProjectModalOpen(true);
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

          {/* Botones de Importar y Exportar directos en barra superior (Icon-Only) */}
          <div className="flex items-center border border-[#0C0C09] dark:border-zinc-700 rounded-[4px] bg-white dark:bg-zinc-900 overflow-hidden shrink-0">
            <button
              type="button"
              data-testid="header-import-btn"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 transition cursor-pointer flex items-center justify-center"
              title="Importar cronograma (JSON / CSV)"
              aria-label="Importar"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-500" />
            </button>
            <div className="w-px h-3.5 bg-[#E2E2DC] dark:bg-zinc-800" />
            <button
              type="button"
              data-testid="header-export-btn"
              onClick={handleExportJSON}
              className="p-1.5 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 transition cursor-pointer flex items-center justify-center"
              title="Exportar cronograma (JSON)"
              aria-label="Exportar"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </button>
          </div>

          {/* Botón para restablecer releases ocultas cuando hay alguna oculta (Icon-Only) */}
          {hiddenReleaseIds.length > 0 && (
            <button
              type="button"
              data-testid="header-reset-hidden-releases-btn"
              onClick={handleResetHiddenReleases}
              className="p-1.5 rounded-[4px] border border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition cursor-pointer shrink-0 animate-fade-in flex items-center justify-center"
              title={`Hay ${hiddenReleaseIds.length} release(s) oculta(s). Clic para restablecer la visibilidad y ver todos los proyectos.`}
              aria-label="Restablecer visibilidad de releases"
            >
              <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </button>
          )}

          {/* Informes Button (Tablas tipo Excel - Icon-Only) */}
          <button
            type="button"
            data-testid="header-reports-btn"
            onClick={() => setCurrentView((prev) => (prev === 'reports' ? 'gantt' : 'reports'))}
            className={`p-1.5 rounded-[4px] border transition cursor-pointer shrink-0 flex items-center justify-center ${
              currentView === 'reports'
                ? 'bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:border-white dark:text-[#0C0C09]'
                : 'bg-white dark:bg-zinc-900 border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800'
            }`}
            title="Informes y descarga Excel (.xlsx)"
            aria-label="Informes"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </button>

          {/* Modo Enfoque Toggle (Contextual al elemento seleccionado - Icon-Only) */}
          <button
            type="button"
            data-testid="header-toggle-focus-mode-btn"
            onClick={() => {
              if (isFocusMode) {
                handleExitFocusMode();
              } else if (selectedEntity) {
                handleSetFocusEntity(selectedEntity);
              } else {
                const targetProj = effectiveProjects[0];
                if (targetProj) {
                  handleSetFocusEntity({
                    type: 'project',
                    id: targetProj.id,
                    name: targetProj.name,
                  });
                }
              }
            }}
            className={`p-1.5 rounded-[4px] border transition cursor-pointer shrink-0 flex items-center justify-center ${
              isFocusMode
                ? 'bg-indigo-600 border-indigo-600 text-white font-bold animate-pulse'
                : 'bg-white dark:bg-zinc-900 border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800'
            }`}
            title={
              isFocusMode
                ? `Salir de la modalidad enfoque (${focusEntity?.name || ''})`
                : selectedEntity
                ? `Enfocar ${
                    selectedEntity.type === 'task'
                      ? 'tarea'
                      : selectedEntity.type === 'project'
                      ? 'proyecto'
                      : 'release'
                  }: "${selectedEntity.name || selectedEntity.id}"`
                : 'Modalidad Enfoque (selecciona una tarea, proyecto o release en el diagrama)'
            }
            aria-label="Modalidad Enfoque"
          >
            <Sparkles className="w-3.5 h-3.5 text-current" />
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

        {/* RIGHT: Quick Theme Toggle + Unified Tools & Settings Dropdown Menu */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Selector Rápido de Tema (Claro / Oscuro) */}
          <button
            type="button"
            data-testid="header-theme-toggle-btn"
            onClick={() => setDarkMode((prev) => !prev)}
            className="p-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 transition shadow-none cursor-pointer flex items-center justify-center"
            aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={darkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[#0C0C09]" />
            )}
          </button>

          {/* Menú Secundario "Herramientas / Más Opciones" (Icon-Only) */}
          <div ref={moreMenuRef} className="relative">
            <button
              type="button"
              data-testid="header-more-menu-btn"
              onClick={() => setMoreMenuOpen((prev) => !prev)}
              className={`p-1.5 rounded-[4px] border transition cursor-pointer shrink-0 flex items-center justify-center ${
                moreMenuOpen
                  ? 'bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:border-white dark:text-[#0C0C09]'
                  : 'bg-white dark:bg-zinc-900 border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800'
              }`}
              title="Herramientas y configuración"
              aria-label="Más opciones"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-current" />
            </button>

            {/* Dropdown Menu (rendered in DOM so test assertions find testids) */}
            <div
              data-testid="header-more-menu-dropdown"
              className={`absolute right-0 top-10 w-80 p-3 bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[4px] shadow-2xl z-50 text-xs flex flex-col gap-3 max-h-[calc(100vh-60px)] overflow-y-auto ${
                moreMenuOpen ? 'block' : 'hidden'
              }`}
            >
              {/* Sección 1: Versión de la Aplicación y Recarga */}
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E2DC] dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="app-version-badge"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setShowReleaseNotesModal(true);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#0C0C09] hover:bg-[#312C85] text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-[#0C0C09] text-[10px] font-mono font-bold tracking-tight shadow-xs transition cursor-pointer"
                    title={`v${APP_VERSION} · Clic para ver notas de versión y novedades`}
                  >
                    <span>{`v${APP_VERSION}`}</span>
                  </button>
                </div>
                <button
                  type="button"
                  data-testid="force-reload-btn"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.location.reload();
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-mono cursor-pointer"
                  title="Forzar recarga sin caché para garantizar la última versión"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Recargar app</span>
                </button>
              </div>

              {/* Sección 2: Navegación & Ayuda */}
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 block mb-1.5">
                  Vistas y Ayuda
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    data-testid="header-history-btn"
                    data-history-btn="true"
                    onClick={() => {
                      setCurrentView((prev) => (prev === 'history' ? 'gantt' : 'history'));
                      setMoreMenuOpen(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-[3px] border text-xs font-medium transition cursor-pointer ${
                      currentView === 'history'
                        ? 'bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:border-white dark:text-[#0C0C09]'
                        : 'bg-[#F4F4F1] dark:bg-zinc-800 border-[#E2E2DC] dark:border-zinc-700 text-[#0C0C09] dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                    title="Consultar historial de cambios del plan"
                    aria-label="Historial"
                  >
                    <span className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-current" />
                      <span>Historial</span>
                    </span>
                    <span
                      data-testid="history-counter-badge"
                      className="px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono bg-white dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-700"
                    >
                      {history.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-testid="header-help-btn"
                    onClick={() => {
                      setCurrentView((prev) => (prev === 'help' ? 'gantt' : 'help'));
                      setMoreMenuOpen(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[3px] border text-xs font-medium transition cursor-pointer ${
                      currentView === 'help'
                        ? 'bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:border-white dark:text-[#0C0C09]'
                        : 'bg-[#F4F4F1] dark:bg-zinc-800 border-[#E2E2DC] dark:border-zinc-700 text-[#0C0C09] dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                    title="Guía de uso y documentación de funcionalidades"
                    aria-label="Ayuda"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-current" />
                    <span>Ayuda</span>
                  </button>
                </div>
              </div>

              {/* Sección 3: Catálogo de Releases */}
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 block mb-1.5">
                  Releases
                </span>
                <button
                  type="button"
                  data-testid="header-releases-btn"
                  onClick={() => {
                    setShowReleasesModal(true);
                    setMoreMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-[3px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-700 text-xs font-medium transition cursor-pointer"
                  title="Gestionar catálogo de Releases e hitos (importar/exportar Excel)"
                  aria-label="Releases"
                >
                  <div className="flex items-center gap-2">
                    <Rocket className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="font-semibold">Catálogo de Releases</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      data-testid="releases-counter-badge"
                      className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#F4F4F1] dark:bg-zinc-700 text-[#0C0C09] dark:text-zinc-300 border border-[#E2E2DC] dark:border-zinc-600"
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
                  </div>
                </button>
              </div>

              {/* Sección 4: Configuración General */}
              <div className="pt-2 border-t border-[#E2E2DC] dark:border-zinc-800">
                <button
                  type="button"
                  data-testid="header-settings-btn"
                  onClick={() => {
                    setShowSettingsModal(true);
                    setMoreMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[3px] border text-xs font-medium transition cursor-pointer ${
                    showSettingsModal
                      ? 'bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:border-white dark:text-[#0C0C09]'
                      : 'bg-white dark:bg-zinc-800 border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-700'
                  }`}
                  aria-label="Ajustes"
                  title="Configuración de interfaz (Truncado, Líneas, Sombreado, Visibilidad)"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configuración General</span>
                </button>
              </div>
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
        {currentView === 'help' ? (
          <HelpPage onBackToGantt={() => setCurrentView('gantt')} />
        ) : currentView === 'history' ? (
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
            releases={releases}
          />
        ) : currentView === 'reports' ? (
          <ReportsView
            releases={releases}
            projects={effectiveProjects}
            items={computedItems}
            onBackToGantt={() => setCurrentView('gantt')}
          />
        ) : (
          <>
            {/* Conflict Banner if any task violates predecessor dependencies */}
            {metrics.conflictCount > 0 && (
              <div
                data-testid="conflict-warning-banner"
                className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex-wrap"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>
                    Detectamos <strong>{metrics.conflictCount}</strong> tarea(s) cuya fecha inicial
                    es anterior a la fecha final de sus tareas predecesoras:
                  </span>
                  <div
                    data-testid="conflict-items-list"
                    className="inline-flex items-center gap-1.5 flex-wrap"
                  >
                    {metrics.conflictItems.map((cItem) => (
                      <button
                        key={cItem.id}
                        type="button"
                        data-testid={`conflict-item-btn-${cItem.id}`}
                        onClick={() => handleNavigateToConflictItem(cItem)}
                        title={
                          cItem.conflictMessage
                            ? `${cItem.name}: ${cItem.conflictMessage} — Haz clic para ir al elemento`
                            : `Haz clic para ir a ${cItem.name}`
                        }
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-900 dark:text-rose-100 font-semibold underline decoration-rose-500/60 underline-offset-2 cursor-pointer transition"
                      >
                        {cItem.projectName && (
                          <span className="opacity-75 font-normal">{`${cItem.projectName} ›`}</span>
                        )}
                        <span>{cItem.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResolveAllConflicts}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Reprogramar en cascada automáticamente
                </button>
              </div>
            )}

            {/* Focus Mode active banner */}
            {isFocusMode && focusEntity && (
              <div
                data-testid="focus-mode-active-banner"
                className="flex items-center justify-between gap-4 px-4 py-2 rounded-[4px] bg-indigo-600 text-white text-xs font-semibold shadow-md animate-fade-in"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
                  <span>
                    <strong>MODO ENFOQUE ACTIVO:</strong> Viendo únicamente elementos relacionados con {focusEntity.type === 'task' ? 'la tarea' : focusEntity.type === 'project' ? 'el proyecto' : 'la release'}{' '}
                    <strong className="underline underline-offset-2">&ldquo;{focusEntity.name || focusEntity.id}&rdquo;</strong>
                  </span>
                  {focusRelatedItemCount === 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-400 text-amber-950 font-bold text-[10px]">
                      ⚠️ Sin tareas asociadas
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {focusRelatedItemCount === 0 && focusEntity.type === 'project' && (
                    <button
                      type="button"
                      data-testid="focus-empty-create-task-btn"
                      onClick={() => handleOpenCreateModal('task', focusEntity.id)}
                      className="px-2.5 py-1 rounded-[3px] bg-amber-300 text-amber-950 font-bold hover:bg-amber-200 transition cursor-pointer text-xs flex items-center gap-1 shrink-0"
                      title="Crear primera tarea en este proyecto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Crear Tarea</span>
                    </button>
                  )}
                  <button
                    type="button"
                    data-testid="exit-focus-mode-btn"
                    onClick={handleExitFocusMode}
                    className="px-3 py-1 rounded-[3px] bg-white text-indigo-900 font-bold hover:bg-zinc-100 transition cursor-pointer text-xs flex items-center gap-1.5 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Salir del Enfoque</span>
                  </button>
                </div>
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
              onOpenReleasesModal={() => setShowReleasesModal(true)}
              groupByProject={groupByProject}
              selectedProjectId={selectedProjectId}
              selectedProjectIds={selectedProjectIds}
              zoom={zoom}
              dayWidth={dayWidth}
              onChangeDayWidth={handleChangeDayWidth}
              onFitToProject={(pid) => handleFitToProject(pid)}
              showCriticalPath={showCriticalPath}
              onToggleCriticalPath={() => setShowCriticalPath((prev) => !prev)}
              onScrollToToday={scrollToToday}
              showMetricsDrawer={showMetricsDrawer}
              onToggleMetricsDrawer={() => setShowMetricsDrawer((prev) => !prev)}
              metricsToggleBtnRef={metricsToggleBtnRef}
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
              onReorderProject={handleReorderProject}
              onChangeProjectColor={handleChangeProjectColor}
              onDeleteProject={handleDeleteProject}
              onCreateProject={handleCreateProject}
              onCreateDigiTask={handleCreateDigiTask}
              scrollContainerRef={scrollContainerRef}
              showTable={showTable}
              onToggleShowTable={() => setShowTable((prev) => !prev)}
              showRowSeparators={showRowSeparators}
              onToggleRowSeparators={() => setShowRowSeparators((prev) => !prev)}
              showWeekendShading={showWeekendShading}
              onToggleWeekendShading={() => setShowWeekendShading((prev) => !prev)}
              hiddenReleaseIds={hiddenReleaseIds}
              onToggleHideRelease={handleToggleHideRelease}
              onResetHiddenReleases={handleResetHiddenReleases}
              truncateCharLimit={truncateCharLimit}
              onChangeTruncateCharLimit={setTruncateCharLimit}
              isFocusMode={isFocusMode}
              focusEntity={focusEntity}
              onExitFocusMode={handleExitFocusMode}
              onSetFocusEntity={handleSetFocusEntity}
              selectedEntity={selectedEntity}
              onSelectEntity={setSelectedEntity}
              selectedPlatform={selectedPlatform}
              onChangeSelectedPlatform={setSelectedPlatform}
            />
          </>
        )}
      </main>

      {/* Modal de Creación de Proyecto con Selección de Release */}
      {createProjectModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="create-project-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setCreateProjectModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[6px] shadow-2xl p-5 text-[#0C0C09] dark:text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E2DC] dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-display font-bold text-sm tracking-tight">Crear Nuevo Proyecto</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateProjectModalOpen(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition"
                aria-label="Cerrar modal de creación de proyecto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = newProjectFormName.trim();
                if (!trimmed) return;
                handleCreateProject({
                  name: trimmed,
                  color: newProjectFormColor as any,
                  releaseId: newProjectFormReleaseId || releases[0]?.id || 'rel-t-26-12-1',
                  platform: newProjectFormPlatform,
                });
                setNewProjectFormPlatform('iOS/Android');
                setCreateProjectModalOpen(false);
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-[#0C0C09] dark:text-zinc-300 mb-1">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  data-testid="create-project-name-input"
                  value={newProjectFormName}
                  onChange={(e) => setNewProjectFormName(e.target.value)}
                  placeholder="ej. Sistema de Facturación..."
                  className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-100 outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0C0C09] dark:text-zinc-300 mb-1">
                  Release Asociada
                </label>
                <select
                  data-testid="create-project-modal-release-select"
                  value={newProjectFormReleaseId}
                  onChange={(e) => setNewProjectFormReleaseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-100 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                >
                  {releases.map((rel) => (
                    <option key={rel.id} value={rel.id}>
                      {rel.code} ({rel.name})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#6B6B66] dark:text-zinc-400 mt-1">
                  El proyecto y sus tareas se agruparán bajo esta Release en el cronograma Gantt.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0C0C09] dark:text-zinc-300 mb-1">
                  Plataforma
                </label>
                <select
                  data-testid="create-project-modal-platform-select"
                  value={newProjectFormPlatform}
                  onChange={(e) => setNewProjectFormPlatform(e.target.value as ProjectPlatform)}
                  className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-100 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                >
                  <option value="iOS/Android">iOS/Android</option>
                  <option value="iOS">iOS</option>
                  <option value="Android">Android</option>
                </select>
                <p className="text-[10px] text-[#6B6B66] dark:text-zinc-400 mt-1">
                  Identifica la tecnología destino para filtrar en el cronograma.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0C0C09] dark:text-zinc-300 mb-1.5">
                  Color Identificador
                </label>
                <div className="flex items-center gap-2">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setNewProjectFormColor(c.value)}
                      className={`w-5 h-5 rounded-full ${c.bg} flex items-center justify-center transition-transform ${
                        newProjectFormColor === c.value
                          ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.value}
                    >
                      {newProjectFormColor === c.value && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E2DC] dark:border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateProjectModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 text-[#0C0C09] dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newProjectFormName.trim()}
                  data-testid="create-project-submit-btn"
                  className="px-4 py-1.5 text-xs font-semibold rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] transition disabled:opacity-40 cursor-pointer"
                >
                  Crear Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


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
        releases={releases}
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
        hiddenReleaseIds={hiddenReleaseIds}
        onToggleHideRelease={handleToggleHideRelease}
        onResetHiddenReleases={handleResetHiddenReleases}
      />

      {/* Settings Modal (Configuración de interfaz y visualización) */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        truncateCharLimit={truncateCharLimit}
        onChangeTruncateCharLimit={setTruncateCharLimit}
        showRowSeparators={showRowSeparators}
        onToggleRowSeparators={() => setShowRowSeparators((prev) => !prev)}
        showWeekendShading={showWeekendShading}
        onToggleWeekendShading={() => setShowWeekendShading((prev) => !prev)}
        hiddenReleaseCount={hiddenReleaseIds.length}
        onResetHiddenReleases={handleResetHiddenReleases}
        onOpenReleaseNotes={() => setShowReleaseNotesModal(true)}
      />

      {/* Release Notes Modal (Changelog de versiones) */}
      <ReleaseNotesModal
        isOpen={showReleaseNotesModal}
        onClose={() => setShowReleaseNotesModal(false)}
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
