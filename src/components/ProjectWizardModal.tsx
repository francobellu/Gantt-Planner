import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  FolderPlus,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  GanttProject,
  ProjectPlatform,
  Release,
} from '../types/gantt';
import { formatDateISO } from '../utils/ganttEngine';
import { getReleaseDateSpan } from '../utils/releaseEngine';
import { TagInput } from './TagInput';

export interface ProjectWizardSubtaskDraft {
  name: string;
  startDate: string;
  endDate: string;
  platform: ProjectPlatform;
  assignee?: string;
}

export interface ProjectWizardPayload {
  project: Partial<GanttProject>;
  subtasks: ProjectWizardSubtaskDraft[];
}

export const WIZARD_SUBTASK_PRESETS = {
  DIGI: { label: '+ DIGI', name: 'DIGI', team: 'MC' },
  ARQ: { label: '+ ARQ', name: 'ARQ', team: 'ARQ' },
  QA: { label: '+ QA', name: 'QA', team: 'QA' },
} as const;

export function getReleaseQg5Date(release?: Release | null): string | undefined {
  if (!release) return undefined;
  const qg5 = (release.milestones || []).find(
    (m) =>
      m &&
      m.date &&
      (m.key?.toLowerCase() === 'qg5' || m.code?.trim().toUpperCase() === 'QG5')
  );
  if (qg5?.date) return qg5.date;
  const span = getReleaseDateSpan(release);
  return span.endDate || release.endDate;
}

interface InternalSubtask {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  platform: ProjectPlatform;
  team: string;
  overrides: {
    startDate: boolean;
    endDate: boolean;
    platform: boolean;
    team: boolean;
  };
}

interface ProjectWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  releases: Release[];
  existingTeams?: string[];
  existingTags?: string[];
  initialReleaseId?: string;
  initialStep?: 1 | 2 | 3;
  onCreate: (payload: ProjectWizardPayload) => void;
}

const PLATFORMS: ProjectPlatform[] = ['iOS/Android', 'iOS', 'Android'];
const BASE_TEAMS = ['ARQ', 'MC', 'QA', 'Arquitectura', 'AWS/DevOps', 'Core'];

function diffCalendarDays(start: string, end: string): number {
  const d1 = new Date(`${start}T00:00:00`);
  const d2 = new Date(`${end}T00:00:00`);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 1;
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
}

export const ProjectWizardModal: React.FC<ProjectWizardModalProps> = ({
  isOpen,
  onClose,
  releases,
  existingTeams = [],
  existingTags = [],
  initialReleaseId,
  initialStep = 1,
  onCreate,
}) => {
  const todayISO = useMemo(() => formatDateISO(new Date()), []);
  const defaultReleaseId = initialReleaseId || releases[0]?.id || '';
  const initialRelease = releases.find((r) => r.id === defaultReleaseId) || releases[0];
  const initialQg5 = getReleaseQg5Date(initialRelease) || todayISO;

  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [releaseId, setReleaseId] = useState<string>(defaultReleaseId);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [platform, setPlatform] = useState<ProjectPlatform>('iOS/Android');
  const [team, setTeam] = useState<string>('MC');
  const [startMode, setStartMode] = useState<'today' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>(todayISO);
  const [endDate, setEndDate] = useState<string>(initialQg5);
  const [endDateEdited, setEndDateEdited] = useState<boolean>(false);
  const [subtasks, setSubtasks] = useState<InternalSubtask[]>([]);
  const [nextId, setNextId] = useState<number>(1);

  useEffect(() => {
    if (!isOpen) return;
    const relId = initialReleaseId || releases[0]?.id || '';
    const rel = releases.find((r) => r.id === relId) || releases[0];
    const qg5 = getReleaseQg5Date(rel) || todayISO;
    setStep(initialStep);
    setReleaseId(relId);
    setName('');
    setDescription('');
    setTags([]);
    setPlatform('iOS/Android');
    setTeam('MC');
    setStartMode('today');
    setStartDate(todayISO);
    setEndDate(qg5);
    setEndDateEdited(false);
    setSubtasks([]);
    setNextId(1);
  }, [isOpen, initialReleaseId, initialStep, releases, todayISO]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const teamOptions = useMemo(() => {
    const set = new Set<string>(BASE_TEAMS);
    for (const t of existingTeams) {
      if (t && t.trim()) set.add(t.trim());
    }
    return Array.from(set);
  }, [existingTeams]);

  const selectedRelease = useMemo(
    () => releases.find((r) => r.id === releaseId),
    [releases, releaseId]
  );
  const currentQg5 = useMemo(() => getReleaseQg5Date(selectedRelease), [selectedRelease]);

  const propagate = (
    nextStart: string,
    nextEnd: string,
    nextPlat: ProjectPlatform,
    nextTeam: string
  ) => {
    setSubtasks((prev) =>
      prev.map((st) => ({
        ...st,
        startDate: st.overrides.startDate ? st.startDate : nextStart,
        endDate: st.overrides.endDate ? st.endDate : nextEnd,
        platform: st.overrides.platform ? st.platform : nextPlat,
        team: st.overrides.team ? st.team : nextTeam,
      }))
    );
  };

  const handleReleaseChange = (nextRelId: string) => {
    setReleaseId(nextRelId);
    const rel = releases.find((r) => r.id === nextRelId);
    const qg5 = getReleaseQg5Date(rel);
    if (qg5 && !endDateEdited) {
      setEndDate(qg5);
      propagate(startDate, qg5, platform, team);
    }
  };

  const handleStartModeChange = (mode: 'today' | 'custom') => {
    setStartMode(mode);
    if (mode === 'today') {
      setStartDate(todayISO);
      propagate(todayISO, endDate, platform, team);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setStartMode(val === todayISO ? 'today' : 'custom');
    propagate(val, endDate, platform, team);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setEndDateEdited(Boolean(currentQg5 && val !== currentQg5));
    propagate(startDate, val, platform, team);
  };

  const handleResetToQg5 = () => {
    if (!currentQg5) return;
    setEndDate(currentQg5);
    setEndDateEdited(false);
    propagate(startDate, currentQg5, platform, team);
  };

  const handlePlatformChange = (nextPlat: ProjectPlatform) => {
    setPlatform(nextPlat);
    propagate(startDate, endDate, nextPlat, team);
  };

  const handleTeamChange = (nextTeam: string) => {
    setTeam(nextTeam);
    propagate(startDate, endDate, platform, nextTeam);
  };

  const handleAddPresetSubtask = (presetKey?: keyof typeof WIZARD_SUBTASK_PRESETS) => {
    const id = nextId;
    setNextId((n) => n + 1);
    if (presetKey) {
      const preset = WIZARD_SUBTASK_PRESETS[presetKey];
      setSubtasks((prev) => [
        ...prev,
        {
          id,
          name: preset.name,
          startDate,
          endDate,
          platform,
          team: preset.team,
          overrides: {
            startDate: false,
            endDate: false,
            platform: false,
            team: preset.team !== team,
          },
        },
      ]);
      return;
    }
    setSubtasks((prev) => [
      ...prev,
      {
        id,
        name: `Subtarea ${prev.length + 1}`,
        startDate,
        endDate,
        platform,
        team,
        overrides: { startDate: false, endDate: false, platform: false, team: false },
      },
    ]);
  };

  const handleUpdateSubtask = (
    id: number,
    field: 'name' | 'startDate' | 'endDate' | 'platform' | 'team',
    value: string
  ) => {
    setSubtasks((prev) =>
      prev.map((st) => {
        if (st.id !== id) return st;
        const next: InternalSubtask = { ...st, [field]: value } as InternalSubtask;
        if (field === 'startDate') next.overrides = { ...st.overrides, startDate: value !== startDate };
        if (field === 'endDate') next.overrides = { ...st.overrides, endDate: value !== endDate };
        if (field === 'platform') next.overrides = { ...st.overrides, platform: value !== platform };
        if (field === 'team') next.overrides = { ...st.overrides, team: value !== team };
        return next;
      })
    );
  };

  const handleReInheritSubtask = (id: number) => {
    setSubtasks((prev) =>
      prev.map((st) =>
        st.id === id
          ? {
              ...st,
              startDate,
              endDate,
              platform,
              team,
              overrides: { startDate: false, endDate: false, platform: false, team: false },
            }
          : st
      )
    );
  };

  const handleRemoveSubtask = (id: number) => {
    setSubtasks((prev) => prev.filter((st) => st.id !== id));
  };

  const handleSubmit = () => {
    const trimmedName = name.trim() || 'Nuevo Proyecto';
    onCreate({
      project: {
        name: trimmedName,
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        releaseId: releaseId || undefined,
        platform,
        color: 'indigo',
      },
      subtasks: subtasks.map((st) => ({
        name: st.name.trim() || 'Subtarea',
        startDate: st.startDate || startDate,
        endDate: st.endDate >= st.startDate ? st.endDate : st.startDate,
        platform: st.platform,
        assignee: st.team.trim() || undefined,
      })),
    });
    onClose();
  };

  if (!isOpen) return null;

  const hasAnyOverride = (st: InternalSubtask) =>
    st.overrides.startDate || st.overrides.endDate || st.overrides.platform || st.overrides.team;

  const allStarts = [startDate, ...subtasks.map((s) => s.startDate)].filter(Boolean);
  const allEnds = [endDate, ...(currentQg5 ? [currentQg5] : []), ...subtasks.map((s) => s.endDate)].filter(Boolean);
  const minD = allStarts.reduce((a, b) => (a < b ? a : b), startDate);
  const maxD = allEnds.reduce((a, b) => (a > b ? a : b), endDate);
  const totalSpan = Math.max(1, diffCalendarDays(minD, maxD));
  const pct = (d: string) =>
    Math.max(0, Math.min(100, ((diffCalendarDays(minD, d) - 1) / totalSpan) * 100));
  const qg5Left = currentQg5 ? Math.min(98, pct(currentQg5)) : null;

  return (
    <div
      data-testid="project-wizard-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl rounded-[8px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header + Stepper */}
        <div className="px-5 py-3.5 border-b border-[#E2E2DC] dark:border-zinc-800 bg-[#F4F4F1] dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-[#0C0C09] dark:text-zinc-100">
              Asistente de Nuevo Proyecto
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {(
              [
                { num: 1 as const, label: '1. Proyecto' },
                { num: 2 as const, label: `2. Subtareas (${subtasks.length})` },
                { num: 3 as const, label: '3. Resumen' },
              ]
            ).map((s) => (
              <button
                key={s.num}
                type="button"
                data-testid={`wizard-step-tab-${s.num}`}
                onClick={() => setStep(s.num)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition ${
                  step === s.num
                    ? 'bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]'
                    : step > s.num
                    ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    : 'border border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400'
                }`}
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              data-testid="wizard-close-btn"
              onClick={onClose}
              className="ml-1 p-1 rounded text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-white cursor-pointer"
              aria-label="Cerrar asistente"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {step === 1 && (
            <div data-testid="wizard-step-1" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Release
                  </label>
                  <select
                    data-testid="wizard-release-select"
                    value={releaseId}
                    onChange={(e) => handleReleaseChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                  >
                    <option value="">Sin release</option>
                    {releases.map((r) => {
                      const qg5 = getReleaseQg5Date(r);
                      return (
                        <option key={r.id} value={r.id}>
                          {r.code} {qg5 ? `(QG5: ${qg5})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Nombre del Proyecto
                  </label>
                  <input
                    type="text"
                    data-testid="wizard-project-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. HDEV-747747: Xcode 27"
                    className="w-full px-2.5 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                  Descripción <span className="font-normal lowercase text-zinc-400">(opcional)</span>
                </label>
                <textarea
                  rows={2}
                  data-testid="wizard-project-description-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Alcance, contexto o notas principales del proyecto..."
                  className="w-full px-2.5 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs resize-y min-h-[54px] focus:border-[#0C0C09] dark:focus:border-indigo-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                  Etiquetas <span className="font-normal lowercase text-zinc-400">(opcional)</span>
                </label>
                <TagInput
                  tags={tags}
                  allTags={existingTags}
                  onChange={setTags}
                  placeholder="#urgente, #requerimiento..."
                  testIdPrefix="wizard-project-tags"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Plataforma
                  </label>
                  <div className="grid grid-cols-3 gap-1 p-0.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-[#FAFAF8] dark:bg-zinc-800/60">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        data-testid={`wizard-platform-${p}`}
                        onClick={() => handlePlatformChange(p)}
                        className={`py-1 px-2 rounded-[3px] text-[11px] font-semibold cursor-pointer transition ${
                          platform === p
                            ? 'bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]'
                            : 'text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1">
                    Equipo por defecto
                  </label>
                  <input
                    type="text"
                    list="wizard-team-options"
                    data-testid="wizard-team-input"
                    value={team}
                    onChange={(e) => handleTeamChange(e.target.value)}
                    placeholder="Ej. MC, ARQ, QA..."
                    className="w-full px-2.5 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                  />
                  <datalist id="wizard-team-options">
                    {teamOptions.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-[6px] bg-[#FAFAF8] dark:bg-zinc-800/40 border border-[#E2E2DC] dark:border-zinc-800">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Fecha de Inicio</span>
                    </label>
                    <div className="inline-flex rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 overflow-hidden text-[10px]">
                      <button
                        type="button"
                        data-testid="wizard-start-today-btn"
                        onClick={() => handleStartModeChange('today')}
                        className={`px-2 py-0.5 cursor-pointer font-semibold ${
                          startMode === 'today'
                            ? 'bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]'
                            : 'text-[#6B6B66] dark:text-zinc-400'
                        }`}
                      >
                        Hoy
                      </button>
                      <button
                        type="button"
                        data-testid="wizard-start-custom-btn"
                        onClick={() => handleStartModeChange('custom')}
                        className={`px-2 py-0.5 cursor-pointer font-semibold ${
                          startMode === 'custom'
                            ? 'bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]'
                            : 'text-[#6B6B66] dark:text-zinc-400'
                        }`}
                      >
                        Otra fecha
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    data-testid="wizard-start-date-input"
                    value={startDate}
                    disabled={startMode === 'today'}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs disabled:opacity-60"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400">
                      Fecha Límite
                    </label>
                    {currentQg5 &&
                      (endDateEdited ? (
                        <button
                          type="button"
                          data-testid="wizard-reset-qg5-btn"
                          onClick={handleResetToQg5}
                          className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>{`QG5 (${currentQg5})`}</span>
                        </button>
                      ) : (
                        <span
                          data-testid="wizard-qg5-badge"
                          className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                        >
                          {`= QG5 ${selectedRelease?.code || ''}`}
                        </span>
                      ))}
                  </div>
                  <input
                    type="date"
                    data-testid="wizard-end-date-input"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div data-testid="wizard-step-2" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E2E2DC] dark:border-zinc-800">
                <div className="text-[11px] text-[#6B6B66] dark:text-zinc-400">
                  Hereda por defecto:{' '}
                  <strong className="font-mono text-[#0C0C09] dark:text-zinc-200">
                    {startDate} → {endDate}
                  </strong>{' '}
                  · <strong className="text-[#0C0C09] dark:text-zinc-200">{platform}</strong> ·{' '}
                  <strong className="text-[#0C0C09] dark:text-zinc-200">{team || 'Sin equipo'}</strong>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    data-testid="wizard-add-preset-DIGI"
                    onClick={() => handleAddPresetSubtask('DIGI')}
                    className="px-2 py-1 rounded-[3px] border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold hover:bg-indigo-100 cursor-pointer"
                    title="Crear subtarea DIGI asignada al equipo MC"
                  >
                    + DIGI <span className="opacity-70 font-mono text-[10px]">(MC)</span>
                  </button>
                  <button
                    type="button"
                    data-testid="wizard-add-preset-ARQ"
                    onClick={() => handleAddPresetSubtask('ARQ')}
                    className="px-2 py-1 rounded-[3px] border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-[11px] font-semibold hover:bg-violet-100 cursor-pointer"
                    title="Crear subtarea ARQ asignada al equipo ARQ"
                  >
                    + ARQ <span className="opacity-70 font-mono text-[10px]">(ARQ)</span>
                  </button>
                  <button
                    type="button"
                    data-testid="wizard-add-preset-QA"
                    onClick={() => handleAddPresetSubtask('QA')}
                    className="px-2 py-1 rounded-[3px] border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold hover:bg-emerald-100 cursor-pointer"
                    title="Crear subtarea QA asignada al equipo QA"
                  >
                    + QA <span className="opacity-70 font-mono text-[10px]">(QA)</span>
                  </button>
                  <button
                    type="button"
                    data-testid="wizard-add-subtask-btn"
                    onClick={() => handleAddPresetSubtask()}
                    className="px-2.5 py-1 rounded-[3px] bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Subtarea</span>
                  </button>
                </div>
              </div>

              {subtasks.length === 0 ? (
                <div className="py-8 text-center rounded-[6px] border border-dashed border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400">
                  Sin subtareas todavía. Añade subtareas con los botones rápidos (<strong>+ DIGI</strong>,{' '}
                  <strong>+ ARQ</strong>, <strong>+ QA</strong>) o continúa para crear solo el proyecto.
                </div>
              ) : (
                <div className="space-y-2">
                  {subtasks.map((st) => {
                    const overQg5 = Boolean(currentQg5 && st.endDate > currentQg5);
                    return (
                      <div
                        key={st.id}
                        data-testid={`wizard-subtask-row-${st.id}`}
                        className="p-2.5 rounded-[5px] bg-[#FAFAF8] dark:bg-zinc-800/40 border border-[#E2E2DC] dark:border-zinc-700 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={st.name}
                            onChange={(e) => handleUpdateSubtask(st.id, 'name', e.target.value)}
                            className="flex-1 px-2 py-1 rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium"
                          />
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              hasAnyOverride(st)
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-white dark:bg-zinc-900 text-[#6B6B66] dark:text-zinc-400 border border-[#E2E2DC] dark:border-zinc-700'
                            }`}
                          >
                            {hasAnyOverride(st) ? 'Editado' : 'Heredado'}
                          </span>
                          {hasAnyOverride(st) && (
                            <button
                              type="button"
                              onClick={() => handleReInheritSubtask(st.id)}
                              title="Restaurar fechas, plataforma y equipo del proyecto"
                              className="p-1 text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveSubtask(st.id)}
                            title="Eliminar subtarea"
                            className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <input
                            type="date"
                            value={st.startDate}
                            onChange={(e) => handleUpdateSubtask(st.id, 'startDate', e.target.value)}
                            className="px-2 py-1 rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px]"
                          />
                          <input
                            type="date"
                            value={st.endDate}
                            onChange={(e) => handleUpdateSubtask(st.id, 'endDate', e.target.value)}
                            className={`px-2 py-1 rounded-[3px] border bg-white dark:bg-zinc-900 text-[11px] ${
                              overQg5
                                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                                : 'border-[#E2E2DC] dark:border-zinc-700'
                            }`}
                          />
                          <select
                            value={st.platform}
                            onChange={(e) => handleUpdateSubtask(st.id, 'platform', e.target.value)}
                            className="px-2 py-1 rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px]"
                          >
                            {PLATFORMS.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            list="wizard-team-options"
                            value={st.team}
                            onChange={(e) => handleUpdateSubtask(st.id, 'team', e.target.value)}
                            placeholder="Equipo..."
                            className="px-2 py-1 rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div data-testid="wizard-step-3" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-[5px] bg-[#FAFAF8] dark:bg-zinc-800/40 border border-[#E2E2DC] dark:border-zinc-800">
                  <div className="text-[10px] font-mono uppercase text-[#6B6B66] dark:text-zinc-400">Release</div>
                  <div className="font-bold font-mono mt-0.5">{selectedRelease?.code || 'Sin release'}</div>
                </div>
                <div className="p-2.5 rounded-[5px] bg-[#FAFAF8] dark:bg-zinc-800/40 border border-[#E2E2DC] dark:border-zinc-800">
                  <div className="text-[10px] font-mono uppercase text-[#6B6B66] dark:text-zinc-400">Plataforma</div>
                  <div className="font-bold mt-0.5">{platform}</div>
                </div>
                <div className="p-2.5 rounded-[5px] bg-[#FAFAF8] dark:bg-zinc-800/40 border border-[#E2E2DC] dark:border-zinc-800">
                  <div className="text-[10px] font-mono uppercase text-[#6B6B66] dark:text-zinc-400">Equipo base</div>
                  <div className="font-bold mt-0.5">{team || '—'}</div>
                </div>
                <div className="p-2.5 rounded-[5px] bg-[#FAFAF8] dark:bg-zinc-800/40 border border-[#E2E2DC] dark:border-zinc-800">
                  <div className="text-[10px] font-mono uppercase text-[#6B6B66] dark:text-zinc-400">Ventana</div>
                  <div className="font-bold font-mono mt-0.5">{diffCalendarDays(startDate, endDate)}d</div>
                </div>
              </div>

              {description.trim() && (
                <div
                  data-testid="wizard-summary-description"
                  className="p-2.5 rounded-[5px] bg-[#FAFAF8] dark:bg-zinc-800/40 border border-[#E2E2DC] dark:border-zinc-800"
                >
                  <div className="text-[10px] font-mono uppercase text-[#6B6B66] dark:text-zinc-400">Descripción</div>
                  <div className="text-xs text-[#0C0C09] dark:text-zinc-200 mt-0.5 whitespace-pre-wrap leading-relaxed">
                    {description.trim()}
                  </div>
                </div>
              )}

              {/* Mini Gantt preview */}
              <div className="p-3 rounded-[6px] border border-[#E2E2DC] dark:border-zinc-800 bg-[#FAFAF8] dark:bg-zinc-900/60 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    {`Vista previa (${minD} → ${maxD})`}
                  </span>
                  {currentQg5 && (
                    <span className="text-amber-700 dark:text-amber-400 font-semibold">
                      {`│ QG5 ${selectedRelease?.code || ''}: ${currentQg5}`}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="grid grid-cols-12 items-center gap-2 text-[11px]">
                    <div className="col-span-5 truncate font-semibold">
                      {name.trim() || 'Nuevo Proyecto'}
                    </div>
                    <div className="col-span-7 relative h-4 rounded bg-white dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700 overflow-hidden">
                      <div
                        style={{
                          left: `${pct(startDate)}%`,
                          width: `${Math.min(100 - pct(startDate), Math.max(4, (diffCalendarDays(startDate, endDate) / totalSpan) * 100))}%`,
                        }}
                        className="absolute top-0 bottom-0 rounded bg-indigo-500/85"
                      />
                      {qg5Left !== null && (
                        <div style={{ left: `${qg5Left}%` }} className="absolute top-0 bottom-0 w-0.5 bg-amber-500" />
                      )}
                    </div>
                  </div>
                  {subtasks.map((st) => {
                    const l = pct(st.startDate);
                    const w = Math.max(4, (diffCalendarDays(st.startDate, st.endDate) / totalSpan) * 100);
                    const over = Boolean(currentQg5 && st.endDate > currentQg5);
                    return (
                      <div key={st.id} className="grid grid-cols-12 items-center gap-2 text-[11px]">
                        <div className="col-span-5 truncate pl-3 text-[#6B6B66] dark:text-zinc-400">
                          {`↳ ${st.name} (${st.team || '—'})`}
                        </div>
                        <div className="col-span-7 relative h-3.5 rounded bg-white dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700 overflow-hidden">
                          <div
                            style={{ left: `${l}%`, width: `${Math.min(100 - l, w)}%` }}
                            className={`absolute top-0 bottom-0 rounded ${over ? 'bg-rose-500/85' : 'bg-emerald-500/80'}`}
                          />
                          {qg5Left !== null && (
                            <div style={{ left: `${qg5Left}%` }} className="absolute top-0 bottom-0 w-0.5 bg-amber-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E2E2DC] dark:border-zinc-800 bg-[#FAFAF8] dark:bg-zinc-900 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
            className="px-3 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 text-xs font-medium cursor-pointer disabled:opacity-40"
          >
            ← Anterior
          </button>

          {step < 3 ? (
            <button
              type="button"
              data-testid="wizard-next-btn"
              onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
              className="px-4 py-1.5 rounded-[4px] bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] text-xs font-semibold cursor-pointer"
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="button"
              data-testid="wizard-confirm-create-btn"
              onClick={handleSubmit}
              className="px-4 py-1.5 rounded-[4px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {subtasks.length > 0
                  ? `Crear proyecto y ${subtasks.length} subtarea(s)`
                  : 'Crear proyecto'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
