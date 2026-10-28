import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Diamond,
  FolderKanban,
  GitBranch,
  Layers,
  Plus,
  ShieldAlert,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import {
  ComputedGanttItem,
  DependencyType,
  GanttItem,
  GanttProject,
  TaskColor,
  TaskType,
} from '../types/gantt';
import {
  calculateDurationFromDates,
  calculateEndDateFromDuration,
  formatDateDisplay,
  formatDateISO,
  getEarliestStartFromPredecessors,
  parseDateSafe,
  wouldCreateCycle,
} from '../utils/ganttEngine';
import { addDays } from 'date-fns';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: GanttItem, autoCascadeAfterSave: boolean) => void;
  initialItem?: ComputedGanttItem | null;
  defaultType?: TaskType;
  defaultProjectId?: string;
  projects?: GanttProject[];
  onCreateProject?: (project: GanttProject) => void;
  allItems: ComputedGanttItem[];
}

const COLOR_OPTIONS: { value: TaskColor; label: string; bg: string; ring: string }[] = [
  { value: 'indigo', label: 'Índigo', bg: 'bg-indigo-500', ring: 'ring-indigo-500' },
  { value: 'blue', label: 'Azul', bg: 'bg-blue-500', ring: 'ring-blue-500' },
  { value: 'emerald', label: 'Esmeralda', bg: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { value: 'amber', label: 'Ámbar', bg: 'bg-amber-500', ring: 'ring-amber-500' },
  { value: 'rose', label: ' Coral', bg: 'bg-rose-500', ring: 'ring-rose-500' },
  { value: 'violet', label: 'Violeta', bg: 'bg-violet-500', ring: 'ring-violet-500' },
  { value: 'cyan', label: 'Cian', bg: 'bg-cyan-500', ring: 'ring-cyan-500' },
];

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  defaultType = 'task',
  defaultProjectId,
  projects = [],
  onCreateProject,
  allItems,
}) => {
  const todayStr = formatDateISO(new Date());

  const [type, setType] = useState<TaskType>(defaultType);
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState<TaskColor>('indigo');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(calculateEndDateFromDuration(todayStr, 4, 'task'));
  const [duration, setDuration] = useState(4);
  const [slack, setSlack] = useState(0);
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [dependencyTypes, setDependencyTypes] = useState<Record<string, DependencyType>>({});
  const [progress, setProgress] = useState(0);
  const [color, setColor] = useState<TaskColor>('indigo');
  const [assignee, setAssignee] = useState('');
  const [notes, setNotes] = useState('');
  const [autoCascade, setAutoCascade] = useState(true);
  const [dateInputMode, setDateInputMode] = useState<'duration' | 'endDate'>('duration');

  useEffect(() => {
    if (!isOpen) return;
    setDateInputMode('duration');
    setIsCreatingNewProject(false);
    setNewProjectName('');
    const fallbackPid = defaultProjectId || projects[0]?.id || '';
    if (initialItem) {
      setType(initialItem.type);
      setName(initialItem.name);
      setProjectId(initialItem.projectId || fallbackPid);
      setStartDate(initialItem.startDate);
      setEndDate(initialItem.endDate);
      setDuration(initialItem.type === 'milestone' ? 0 : Math.max(1, initialItem.duration));
      setSlack(initialItem.slack ?? 0);
      setDependencies(initialItem.dependencies || []);
      setDependencyTypes(initialItem.dependencyTypes || {});
      setProgress(initialItem.progress ?? 0);
      setColor(initialItem.color || 'indigo');
      setAssignee(initialItem.assignee || '');
      setNotes(initialItem.notes || '');
    } else {
      const targetPid = fallbackPid;
      const projectItems = targetPid
        ? allItems.filter((it) => it.projectId === targetPid)
        : allItems;
      const lastItem =
        projectItems[projectItems.length - 1] || allItems[allItems.length - 1];
      const suggestedStart = lastItem
        ? formatDateISO(addDays(parseDateSafe(lastItem.endDate), 1))
        : todayStr;
      const isMilestone = defaultType === 'milestone';
      setType(defaultType);
      setName('');
      setProjectId(targetPid);
      setStartDate(suggestedStart);
      setDuration(isMilestone ? 0 : 4);
      setEndDate(
        isMilestone
          ? suggestedStart
          : calculateEndDateFromDuration(suggestedStart, 4, 'task')
      );
      setSlack(0);
      setDependencies(lastItem ? [lastItem.id] : []);
      setDependencyTypes({});
      setProgress(0);
      setColor(isMilestone ? 'amber' : 'indigo');
      setAssignee('');
      setNotes('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialItem, defaultType, defaultProjectId, todayStr]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: TaskType) => {
    setType(newType);
    if (newType === 'milestone') {
      setDuration(0);
      setEndDate(startDate);
      setSlack(0);
      if (color === 'indigo') setColor('amber');
    } else {
      const newDur = duration > 0 ? duration : 3;
      setDuration(newDur);
      setEndDate(calculateEndDateFromDuration(startDate, newDur, 'task'));
    }
  };

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (type === 'milestone') {
      setEndDate(newStart);
    } else if (dateInputMode === 'duration') {
      setEndDate(calculateEndDateFromDuration(newStart, duration, 'task'));
    } else {
      if (newStart > endDate) {
        setEndDate(newStart);
        setDuration(1);
      } else {
        setDuration(calculateDurationFromDates(newStart, endDate, 'task'));
      }
    }
  };

  const handleDurationChange = (newDurRaw: number) => {
    const safeDur = Math.max(1, Math.min(365, Math.round(newDurRaw || 1)));
    setDuration(safeDur);
    setEndDate(calculateEndDateFromDuration(startDate, safeDur, 'task'));
  };

  const handleEndDateChange = (newEnd: string) => {
    if (newEnd < startDate) {
      setStartDate(newEnd);
      setEndDate(newEnd);
      setDuration(1);
    } else {
      setEndDate(newEnd);
      setDuration(calculateDurationFromDates(startDate, newEnd, 'task'));
    }
  };

  const toggleDependency = (predId: string) => {
    if (dependencies.includes(predId)) {
      setDependencies(dependencies.filter((id) => id !== predId));
    } else {
      const nextDeps = [...dependencies, predId];
      setDependencies(nextDeps);
      // Automatically suggest earliest start date if current startDate is earlier
      const itemMap = new Map(allItems.map((it) => [it.id, it as GanttItem]));
      const tempItem: GanttItem = {
        id: initialItem?.id || 'new-temp',
        name,
        type,
        startDate,
        endDate,
        duration,
        slack,
        dependencies: nextDeps,
        dependencyTypes,
        progress,
        color,
      };
      const earliest = getEarliestStartFromPredecessors(tempItem, itemMap);
      if (earliest) {
        const earliestISO = formatDateISO(earliest);
        if (startDate < earliestISO) {
          handleStartDateChange(earliestISO);
        }
      }
    }
  };

  const handleDepTypeChange = (predId: string, depType: DependencyType) => {
    const nextTypes = {
      ...dependencyTypes,
      [predId]: depType,
    };
    setDependencyTypes(nextTypes);
    const itemMap = new Map(allItems.map((it) => [it.id, it as GanttItem]));
    const tempItem: GanttItem = {
      id: initialItem?.id || 'new-temp',
      name,
      type,
      startDate,
      endDate,
      duration,
      slack,
      dependencies,
      dependencyTypes: nextTypes,
      progress,
      color,
    };
    const earliest = getEarliestStartFromPredecessors(tempItem, itemMap);
    if (earliest) {
      const earliestISO = formatDateISO(earliest);
      if (startDate < earliestISO) {
        handleStartDateChange(earliestISO);
      }
    }
  };

  const snapToPredecessors = () => {
    const itemMap = new Map(allItems.map((it) => [it.id, it as GanttItem]));
    const tempItem: GanttItem = {
      id: initialItem?.id || 'new-temp',
      name,
      type,
      startDate,
      endDate,
      duration,
      slack,
      dependencies,
      dependencyTypes,
      progress,
      color,
    };
    const earliest = getEarliestStartFromPredecessors(tempItem, itemMap);
    if (earliest) {
      handleStartDateChange(formatDateISO(earliest));
    }
  };

  const handleCreateInlineProject = () => {
    const trimmed = newProjectName.trim();
    if (!trimmed) return;
    const created: GanttProject = {
      id: `proj-${Date.now()}`,
      name: trimmed,
      color: newProjectColor,
      collapsed: false,
    };
    onCreateProject?.(created);
    setProjectId(created.id);
    setNewProjectName('');
    setIsCreatingNewProject(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalProjectId = projectId || projects[0]?.id || undefined;
    if (isCreatingNewProject && newProjectName.trim()) {
      const created: GanttProject = {
        id: `proj-${Date.now()}`,
        name: newProjectName.trim(),
        color: newProjectColor,
        collapsed: false,
      };
      onCreateProject?.(created);
      finalProjectId = created.id;
    }

    const trimmedName =
      name.trim() || (type === 'milestone' ? 'Nuevo Hito' : 'Nueva Tarea');
    const newItem: GanttItem = {
      id: initialItem?.id || `${type === 'milestone' ? 'm' : 't'}-${Date.now()}`,
      name: trimmedName,
      type,
      projectId: finalProjectId,
      startDate,
      endDate: type === 'milestone' ? startDate : endDate,
      duration: type === 'milestone' ? 0 : Math.max(1, duration),
      slack: type === 'milestone' ? Math.max(0, slack) : Math.max(0, slack),
      dependencies,
      dependencyTypes,
      progress: Math.min(100, Math.max(0, progress)),
      color,
      assignee: assignee.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    onSave(newItem, autoCascade);
    onClose();
  };

  // Compute live preview of slack end date and earliest predecessor constraint
  const itemMap = new Map(allItems.map((it) => [it.id, it as GanttItem]));
  const earliestAllowed = getEarliestStartFromPredecessors(
    {
      id: initialItem?.id || 'temp',
      name,
      type,
      startDate,
      endDate,
      duration,
      slack,
      dependencies,
      dependencyTypes,
      progress,
      color,
    },
    itemMap
  );
  const earliestAllowedStr = earliestAllowed ? formatDateISO(earliestAllowed) : null;
  const hasScheduleConflict = earliestAllowedStr !== null && startDate < earliestAllowedStr;
  const slackEndDateStr = calculateEndDateFromDuration(
    type === 'milestone' ? startDate : endDate,
    (type === 'milestone' ? 1 : 1) + Math.max(0, slack),
    'task'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm ${
                type === 'milestone' ? 'bg-amber-500' : 'bg-indigo-600'
              }`}
            >
              {type === 'milestone' ? (
                <Diamond className="w-5 h-5 fill-current" />
              ) : (
                <Layers className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {initialItem
                  ? `Editar ${type === 'milestone' ? 'Hito' : 'Tarea'}`
                  : `Crear ${type === 'milestone' ? 'Nuevo Hito' : 'Nueva Tarea'}`}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configura el proyecto, fechas, duración, holgura (slack) y dependencias
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Element Type Selector (Task vs Milestone) */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('task')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                type === 'task'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              Tarea de Proyecto
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('milestone')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                type === 'milestone'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Diamond className="w-4 h-4" />
              Hito (Milestone ◆)
            </button>
          </div>

          {/* Project Group Assignment */}
          {projects.length > 0 && (
            <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/50 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FolderKanban className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Proyecto / Agrupación *
                </label>
                {onCreateProject && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewProject((prev) => !prev)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isCreatingNewProject ? 'Seleccionar existente' : 'Nuevo Proyecto'}
                  </button>
                )}
              </div>

              {!isCreatingNewProject ? (
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {projects.map((p, idx) => (
                    <option key={p.id} value={p.id}>
                      {idx + 1}. {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Nombre del nuevo proyecto (ej. Proyecto 4: Mobile App)"
                    className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-1">
                    {COLOR_OPTIONS.slice(0, 5).map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setNewProjectColor(c.value)}
                        className={`w-6 h-6 rounded-full ${c.bg} flex items-center justify-center ${
                          newProjectColor === c.value ? 'ring-2 ring-offset-1 ring-indigo-500' : 'opacity-60'
                        }`}
                      >
                        {newProjectColor === c.value && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateInlineProject}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    Crear y Asignar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Name & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Nombre {type === 'milestone' ? 'del Hito' : 'de la Tarea'} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  type === 'milestone'
                    ? 'Ej. Hito: Lanzamiento Beta Pública'
                    : 'Ej. Desarrollo de API & Autenticación'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Responsable / Rol
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="Ej. Frontend Team"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Dates, Duration & Slack Section */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Planificación Temporal
              </span>
              {type === 'task' && (
                <div className="flex items-center gap-1 text-xs bg-slate-200/70 dark:bg-slate-700/70 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setDateInputMode('duration')}
                    className={`px-2.5 py-1 rounded-md font-medium transition ${
                      dateInputMode === 'duration'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Por Duración
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateInputMode('endDate')}
                    className={`px-2.5 py-1 rounded-md font-medium transition ${
                      dateInputMode === 'endDate'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Por Fecha Final
                  </button>
                </div>
              )}
            </div>

            {type === 'milestone' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Fecha del Hito *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="px-3.5 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                    <Diamond className="w-4 h-4 shrink-0 fill-current" />
                    <span>
                      Los hitos representan entregas o fechas clave de duración 0 días (
                      {formatDateDisplay(startDate)}).
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Initial Date */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Initial Date (Inicio)
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>

                {/* Final Date */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Final Date (Fin)
                  </label>
                  <input
                    type="date"
                    required
                    min={startDate}
                    value={endDate}
                    onChange={(e) => {
                      setDateInputMode('endDate');
                      handleEndDateChange(e.target.value);
                    }}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Duration (Días)
                  </label>
                  <div className="relative flex items-center">
                    <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={duration}
                      onChange={(e) => {
                        setDateInputMode('duration');
                        handleDurationChange( parseInt(e.target.value, 10) );
                      }}
                      className="w-full pl-8 pr-8 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-semibold"
                    />
                    <span className="absolute right-2.5 text-[11px] text-slate-400">días</span>
                  </div>
                </div>

                {/* Slack (Holgura) */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Slack / Holgura (def. 0)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={0}
                      max={180}
                      value={slack}
                      onChange={(e) =>
                        setSlack(Math.max(0, parseInt(e.target.value || '0', 10)))
                      }
                      className="w-full px-3 pr-10 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-semibold text-amber-600 dark:text-amber-400"
                    />
                    <span className="absolute right-2.5 text-[11px] text-slate-400">días</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Slack Presets & Summary */}
            {type === 'task' && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/60 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Presets Slack:</span>
                  {[0, 1, 2, 3, 5].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSlack(preset)}
                      className={`px-2 py-0.5 rounded font-mono text-[11px] transition ${
                        slack === preset
                          ? 'bg-amber-500 text-white font-semibold'
                          : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      {preset === 0 ? '0d (Crítica)' : `+${preset}d`}
                    </button>
                  ))}
                </div>
                <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                  {slack > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      Margen hasta {formatDateDisplay(slackEndDateStr, 'dd MMM')} (+{slack}d)
                    </span>
                  ) : (
                    <span>Sin holgura adicional (Slack = 0d)</span>
                  )}
                </div>
              </div>
            )}

            {/* Conflict Warning & Snap Button */}
            {hasScheduleConflict && earliestAllowedStr && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>
                    La fecha inicial ({formatDateDisplay(startDate, 'dd MMM')}) es anterior al
                    fin de sus predecesoras ({formatDateDisplay(earliestAllowedStr, 'dd MMM')}).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={snapToPredecessors}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold shrink-0 flex items-center gap-1 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Ajustar al {formatDateDisplay(earliestAllowedStr, 'dd MMM')}
                </button>
              </div>
            )}
          </div>

          {/* Dependencies Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-indigo-500" />
                Dependencias (Tareas / Hitos Predecesores)
              </label>
              <span className="text-xs text-slate-400">
                {dependencies.length} seleccionada(s)
              </span>
            </div>

            {allItems.filter((it) => it.id !== initialItem?.id).length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                No hay otras tareas creadas todavía para vincular como dependencia.
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80">
                {allItems
                  .filter((it) => it.id !== initialItem?.id)
                  .map((candidate) => {
                    const isSelected = dependencies.includes(candidate.id);
                    const causesCycle =
                      !isSelected &&
                      initialItem &&
                      wouldCreateCycle(allItems, initialItem.id, candidate.id);
                    const depType = dependencyTypes[candidate.id] || 'FS';

                    return (
                      <div
                        key={candidate.id}
                        className={`flex items-center justify-between px-3.5 py-2 text-xs transition-colors ${
                          isSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                            : causesCycle
                            ? 'opacity-50 bg-slate-50 dark:bg-slate-900 cursor-not-allowed'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <label
                          className={`flex items-center gap-2.5 flex-1 ${
                            causesCycle ? 'cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={ Boolean(causesCycle) }
                            checked={isSelected}
                            onChange={() => toggleDependency(candidate.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            #{candidate.wbs}
                          </span>
                          {candidate.type === 'milestone' && (
                            <Diamond className="w-3.5 h-3.5 text-amber-500 fill-current shrink-0" />
                          )}
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {candidate.name}
                          </span>
                        </label>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[11px] text-slate-400">
                            {formatDateDisplay(candidate.endDate, 'dd MMM')}
                          </span>
                          {causesCycle && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> Ciclo
                            </span>
                          )}
                          {isSelected && (
                            <select
                              value={depType}
                              onChange={(e) =>
                                handleDepTypeChange(
                                  candidate.id,
                                  e.target.value as DependencyType
                                )
                              }
                              className="text-[11px] font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-indigo-600 dark:text-indigo-400"
                              title="Tipo de dependencia"
                            >
                              <option value="FS">FS (Fin → Inicio)</option>
                              <option value="SS">SS (Inicio → Inicio)</option>
                              <option value="FF">FF (Fin → Fin)</option>
                              <option value="SF">SF (Inicio → Fin)</option>
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Progress & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Progreso Completado
                </label>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {progress}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Color Visual en Cronograma
              </label>
              <div className="flex items-center gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    title={c.label}
                    className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center transition-transform ${
                      color === c.value
                        ? `scale-110 ring-2 ring-offset-2 dark:ring-offset-slate-900 ${c.ring}`
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {color === c.value && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes / Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Notas / Entregables / Criterios de Aceptación
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles opcionales, criterios de entrega o riesgos asociados..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          {/* Auto-cascade toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCascade}
                onChange={(e) => setAutoCascade(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                Auto-ajustar en cascada las tareas sucesoras si hay solapamiento de fechas
              </span>
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 transition-all"
            >
              {initialItem ? 'Guardar Cambios' : `Añadir ${type === 'milestone' ? 'Hito' : 'Tarea'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
