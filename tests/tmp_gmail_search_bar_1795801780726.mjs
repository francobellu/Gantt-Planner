// <stdin>
import { default as default2 } from "react";
import { renderToString } from "react-dom/server";

// src/components/GanttWorkspace.tsx
import React4, { useEffect as useEffect3, useLayoutEffect, useMemo, useRef as useRef2, useState as useState2 } from "react";
import {
  addDays as addDays2,
  differenceInCalendarDays as differenceInCalendarDays2,
  eachDayOfInterval,
  format as format2,
  isSameDay,
  isWeekend,
  startOfDay as startOfDay2
} from "date-fns";
import { es as es2 } from "date-fns/locale";
import {
  AlertTriangle as AlertTriangle2,
  BarChart3,
  CalendarDays,
  Check as Check2,
  ChevronRight,
  Compass,
  Copy,
  Diamond,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Flame,
  FolderKanban,
  GitBranch,
  GripHorizontal,
  GripVertical,
  Lock as Lock2,
  Maximize2,
  MoreHorizontal,
  MoveHorizontal,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus as Plus2,
  Rows,
  Search as Search2,
  SlidersHorizontal as SlidersHorizontal2,
  Sparkles,
  Trash2 as Trash22,
  Unlock as Unlock2,
  X as X3
} from "lucide-react";

// src/types/gantt.ts
var DEFAULT_TRUNCATE_CHAR_LIMIT = 37;
var TRUNCATE_LIMIT_STORAGE_KEY = "ganttflow_truncate_char_limit";
var PROJECT_COLORS = [
  { value: "indigo", bg: "bg-indigo-500" },
  { value: "violet", bg: "bg-violet-500" },
  { value: "emerald", bg: "bg-emerald-500" },
  { value: "blue", bg: "bg-blue-500" },
  { value: "teal", bg: "bg-teal-500" },
  { value: "amber", bg: "bg-amber-500" },
  { value: "orange", bg: "bg-orange-500" },
  { value: "rose", bg: "bg-rose-500" },
  { value: "pink", bg: "bg-pink-500" },
  { value: "cyan", bg: "bg-cyan-500" },
  { value: "sky", bg: "bg-sky-500" },
  { value: "lime", bg: "bg-lime-500" },
  { value: "slate", bg: "bg-slate-500" }
];

// src/utils/ganttEngine.ts
import {
  addDays,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfDay
} from "date-fns";
import { es } from "date-fns/locale";

// src/utils/releaseEngine.ts
import * as XLSX from "xlsx";
var RELEASE_MILESTONE_DEFINITIONS = [
  {
    id: "qg1",
    code: "QG1",
    name: "Sign off Release QG1",
    category: "SCOPE RELEASE",
    color: "cyan"
  },
  {
    id: "qg2",
    code: "QG2",
    name: "Sign off Release QG2",
    category: "SCOPE RELEASE",
    color: "cyan"
  },
  {
    id: "qg3",
    code: "QG3",
    name: "Sign off Release QG3",
    category: "SCOPE RELEASE",
    color: "cyan"
  },
  {
    id: "qg4",
    code: "QG4",
    name: "Sign Off Release QG4 Pruebas PT",
    category: "Entorno ACEP",
    color: "violet"
  },
  {
    id: "qg5",
    code: "QG5",
    name: "Sign off Release QG5 Pruebas VCP & UAT",
    category: "Entorno ACEP",
    color: "violet"
  },
  {
    id: "rc_ini",
    code: "RC INI",
    name: "Merge & Deploy RC - INI",
    category: "MERGE & DEPLOY RC",
    color: "slate"
  },
  {
    id: "rc_fin",
    code: "RC FIN",
    name: "Merge & Deploy RC - FIN",
    category: "MERGE & DEPLOY RC",
    color: "slate"
  },
  {
    id: "uat_ini",
    code: "UAT INI",
    name: "Entorno UAT - INI",
    category: "Entorno UAT",
    color: "indigo"
  },
  {
    id: "qg5_1_6",
    code: "QG5.1,6",
    name: "Sign off Release QG5.1 y QG6 Pruebas FAT",
    category: "Entorno UAT",
    color: "indigo"
  },
  {
    id: "pre_ini",
    code: "PREPRO INI",
    name: "Entorno PREPRO - INI",
    category: "Entorno PREPRO",
    color: "pink"
  },
  {
    id: "pre_fin",
    code: "PREPRO FIN",
    name: "Entorno PREPRO - FIN",
    category: "Entorno PREPRO",
    color: "pink"
  },
  {
    id: "qg7",
    code: "QG7",
    name: "Sign off Release QG7 Subida a 1L + P4",
    category: "PROD",
    color: "sky"
  },
  {
    id: "prod_1l",
    code: "1L",
    name: "PROD 1L",
    category: "PROD",
    color: "emerald"
  },
  {
    id: "qg8",
    code: "QG8",
    name: "Sign off Release QG8",
    category: "PROD",
    color: "emerald"
  },
  {
    id: "iop",
    code: "IOP",
    name: "PROD IOP",
    category: "PROD",
    color: "lime"
  },
  {
    id: "qg9",
    code: "QG9",
    name: "Signoff Release QG9",
    category: "QG9",
    color: "amber"
  }
];
function parseDmyToIso(dmy) {
  if (!dmy || typeof dmy !== "string") return "";
  const match = dmy.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return "";
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];
  return `${year}-${month}-${day}`;
}
var RAW_DEFAULT_RELEASES_DATA = [
  {
    code: "T_26.12.1",
    month: "DICIEMBRE",
    year: 2026,
    dates: {
      qg1: "05/10/2026",
      qg2: "12/10/2026",
      qg3: "19/10/2026",
      qg4: "30/10/2026",
      qg5: "13/11/2026",
      rc_ini: "16/11/2026",
      rc_fin: "19/11/2026",
      uat_ini: "20/11/2026",
      qg5_1_6: "02/12/2026",
      pre_ini: "03/12/2026",
      pre_fin: "04/12/2026",
      qg7: "03/12/2026",
      prod_1l: "06/12/2026",
      qg8: "10/12/2026",
      iop: "12/12/2026",
      qg9: "25/12/2026"
    }
  },
  {
    code: "T_27.1.1",
    month: "ENERO",
    year: 2027,
    dates: {
      qg1: "04/11/2026",
      qg2: "11/11/2026",
      qg3: "18/11/2026",
      qg4: "02/12/2026",
      qg5: "16/12/2026",
      rc_ini: "17/12/2026",
      rc_fin: "22/12/2026",
      uat_ini: "23/12/2026",
      qg5_1_6: "05/01/2027",
      pre_ini: "07/01/2027",
      pre_fin: "08/01/2027",
      qg7: "07/01/2027",
      prod_1l: "10/01/2027",
      qg8: "14/01/2027",
      iop: "16/01/2027",
      qg9: "29/01/2027"
    }
  },
  {
    code: "T_27.2.1",
    month: "FEBRERO",
    year: 2027,
    dates: {
      qg1: "30/11/2026",
      qg2: "07/12/2026",
      qg3: "15/12/2026",
      qg4: "30/12/2026",
      qg5: "15/01/2027",
      rc_ini: "18/01/2027",
      rc_fin: "21/01/2027",
      uat_ini: "22/01/2027",
      qg5_1_6: "03/02/2027",
      pre_ini: "04/02/2027",
      pre_fin: "05/02/2027",
      qg7: "04/02/2027",
      prod_1l: "07/02/2027",
      qg8: "12/02/2027",
      iop: "13/02/2027",
      qg9: "26/02/2027"
    }
  },
  {
    code: "T_27.3.1",
    month: "MARZO",
    year: 2027,
    dates: {
      qg1: "30/12/2026",
      qg2: "08/01/2027",
      qg3: "15/01/2027",
      qg4: "29/01/2027",
      qg5: "12/02/2027",
      rc_ini: "15/02/2027",
      rc_fin: "18/02/2027",
      uat_ini: "19/02/2027",
      qg5_1_6: "03/03/2027",
      pre_ini: "04/03/2027",
      pre_fin: "05/03/2027",
      qg7: "04/03/2027",
      prod_1l: "07/03/2027",
      qg8: "12/03/2027",
      iop: "13/03/2027",
      qg9: "30/03/2027"
    }
  },
  {
    code: "T_27.4.1",
    month: "ABRIL",
    year: 2027,
    dates: {
      qg1: "29/01/2027",
      qg2: "05/02/2027",
      qg3: "12/02/2027",
      qg4: "26/02/2027",
      qg5: "12/03/2027",
      rc_ini: "15/03/2027",
      rc_fin: "18/03/2027",
      uat_ini: "19/03/2027",
      qg5_1_6: "02/04/2027",
      pre_ini: "08/04/2027",
      pre_fin: "09/04/2027",
      qg7: "08/04/2027",
      prod_1l: "11/04/2027",
      qg8: "16/04/2027",
      iop: "17/04/2027",
      qg9: "30/04/2027"
    }
  },
  {
    code: "T_27.5.1",
    month: "MAYO",
    year: 2027,
    dates: {
      qg1: "03/03/2027",
      qg2: "10/03/2027",
      qg3: "17/03/2027",
      qg4: "02/04/2027",
      qg5: "16/04/2027",
      rc_ini: "19/04/2027",
      rc_fin: "22/04/2027",
      uat_ini: "23/04/2027",
      qg5_1_6: "05/05/2027",
      pre_ini: "06/05/2027",
      pre_fin: "07/05/2027",
      qg7: "06/05/2027",
      prod_1l: "09/05/2027",
      qg8: "14/05/2027",
      iop: "15/05/2027",
      qg9: "28/05/2027"
    }
  },
  {
    code: "T_27.6.1",
    month: "JUNIO",
    year: 2027,
    dates: {
      qg1: "02/04/2027",
      qg2: "09/04/2027",
      qg3: "16/04/2027",
      qg4: "30/04/2027",
      qg5: "14/05/2027",
      rc_ini: "17/05/2027",
      rc_fin: "20/05/2027",
      uat_ini: "21/05/2027",
      qg5_1_6: "02/06/2027",
      pre_ini: "03/06/2027",
      pre_fin: "04/06/2027",
      qg7: "03/06/2027",
      prod_1l: "06/06/2027",
      qg8: "11/06/2027",
      iop: "12/06/2027",
      qg9: "28/06/2027"
    }
  },
  {
    code: "T_27.7.1",
    month: "JULIO",
    year: 2027,
    dates: {
      qg1: "06/05/2027",
      qg2: "13/05/2027",
      qg3: "20/05/2027",
      qg4: "03/06/2027",
      qg5: "17/06/2027",
      rc_ini: "18/06/2027",
      rc_fin: "23/06/2027",
      uat_ini: "25/06/2027",
      qg5_1_6: "07/07/2027",
      pre_ini: "08/07/2027",
      pre_fin: "09/07/2027",
      qg7: "08/07/2027",
      prod_1l: "11/07/2027",
      qg8: "16/07/2027",
      iop: "17/07/2027",
      qg9: "30/07/2027"
    }
  },
  {
    code: "T_27.8.1",
    month: "AGOSTO",
    year: 2027,
    dates: {}
  },
  {
    code: "T_27.9.1",
    month: "SEPTIEMBRE",
    year: 2027,
    dates: {
      qg1: "02/07/2027",
      qg2: "09/07/2027",
      qg3: "16/07/2027",
      qg4: "30/07/2027",
      qg5: "13/08/2027",
      rc_ini: "16/08/2027",
      rc_fin: "19/08/2027",
      uat_ini: "20/08/2027",
      qg5_1_6: "01/09/2027",
      pre_ini: "02/09/2027",
      pre_fin: "03/09/2027",
      qg7: "03/09/2027",
      prod_1l: "06/09/2027",
      qg8: "10/09/2027",
      iop: "12/09/2027",
      qg9: "24/09/2027"
    }
  },
  {
    code: "T_27.10.1",
    month: "OCTUBRE",
    year: 2027,
    dates: {
      qg1: "06/08/2027",
      qg2: "13/08/2027",
      qg3: "20/08/2027",
      qg4: "03/09/2027",
      qg5: "17/09/2027",
      rc_ini: "20/09/2027",
      rc_fin: "23/09/2027",
      uat_ini: "24/09/2027",
      qg5_1_6: "06/10/2027",
      pre_ini: "07/10/2027",
      pre_fin: "08/10/2027",
      qg7: "07/10/2027",
      prod_1l: "10/10/2027",
      qg8: "14/10/2027",
      iop: "16/10/2027",
      qg9: "29/10/2027"
    }
  },
  {
    code: "T_27.11.1",
    month: "NOVIEMBRE",
    year: 2027,
    dates: {
      qg1: "01/09/2027",
      qg2: "08/09/2027",
      qg3: "15/09/2027",
      qg4: "29/09/2027",
      qg5: "14/10/2027",
      rc_ini: "15/10/2027",
      rc_fin: "20/10/2027",
      uat_ini: "21/10/2027",
      qg5_1_6: "03/11/2027",
      pre_ini: "04/11/2027",
      pre_fin: "05/11/2027",
      qg7: "04/11/2027",
      prod_1l: "07/11/2027",
      qg8: "11/11/2027",
      iop: "13/11/2027",
      qg9: "26/11/2027"
    }
  },
  {
    code: "T_27.12.1",
    month: "DICIEMBRE",
    year: 2027,
    dates: {
      qg1: "30/09/2027",
      qg2: "07/10/2027",
      qg3: "15/10/2027",
      qg4: "28/10/2027",
      qg5: "12/11/2027",
      rc_ini: "15/11/2027",
      rc_fin: "18/11/2027",
      uat_ini: "19/11/2027",
      qg5_1_6: "01/12/2027",
      pre_ini: "02/12/2027",
      pre_fin: "03/12/2027",
      qg7: "02/12/2027",
      prod_1l: "05/12/2027",
      qg8: "09/12/2027",
      iop: "11/12/2027",
      qg9: "24/12/2027"
    }
  },
  {
    code: "T_28.1.1",
    month: "ENERO +1",
    year: 2028,
    dates: {
      qg1: "02/11/2027",
      qg2: "09/11/2027",
      qg3: "16/11/2027",
      qg4: "30/11/2027",
      qg5: "16/12/2027",
      rc_ini: "17/12/2027",
      rc_fin: "22/12/2027",
      uat_ini: "23/12/2027",
      qg5_1_6: "04/01/2028",
      pre_ini: "05/01/2028",
      pre_fin: "07/01/2028",
      qg7: "06/01/2028",
      prod_1l: "09/01/2028",
      qg8: "13/01/2028",
      iop: "15/01/2028",
      qg9: "28/01/2028"
    }
  }
];
var RELEASE_COLOR_CYCLE = [
  "indigo",
  "blue",
  "teal",
  "emerald",
  "violet",
  "cyan",
  "amber",
  "orange",
  "pink",
  "slate",
  "sky"
];
function getPredefinedReleases() {
  return RAW_DEFAULT_RELEASES_DATA.map((row, idx) => {
    const releaseId = `rel-${row.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const name = `${row.code} ${row.month} ${row.year}`;
    const color = RELEASE_COLOR_CYCLE[idx % RELEASE_COLOR_CYCLE.length];
    const milestones = [];
    for (const def of RELEASE_MILESTONE_DEFINITIONS) {
      const dmy = row.dates[def.id];
      const iso = parseDmyToIso(dmy);
      if (iso) {
        milestones.push({
          id: `${releaseId}-${def.id}`,
          key: def.id,
          code: def.code,
          name: def.name,
          category: def.category,
          date: iso,
          color: def.color
        });
      }
    }
    return {
      id: releaseId,
      code: row.code,
      name,
      month: row.month,
      year: row.year,
      color,
      milestones,
      projectIds: []
    };
  });
}
var DEFAULT_PREDEFINED_RELEASES = getPredefinedReleases();
function checkTaskReleaseCompliance(item, project, release) {
  if (item.isExternal) {
    return [];
  }
  if (!project || !release || !release.milestones || release.milestones.length === 0) {
    return [];
  }
  const itemEnd = item.endDate || item.startDate;
  if (!itemEnd) return [];
  const violations = [];
  const finalMilestone = release.milestones.find((m) => m.key === "iop") || release.milestones.find((m) => m.key === "qg8") || release.milestones[release.milestones.length - 1];
  if (finalMilestone && itemEnd > finalMilestone.date) {
    const d1 = new Date(itemEnd).getTime();
    const d2 = new Date(finalMilestone.date).getTime();
    const daysLate = Math.max(1, Math.round((d1 - d2) / (1e3 * 60 * 60 * 24)));
    violations.push({
      milestoneKey: finalMilestone.key,
      milestoneCode: finalMilestone.code,
      milestoneName: finalMilestone.name,
      milestoneDate: finalMilestone.date,
      itemEndDate: itemEnd,
      daysLate
    });
  }
  const isQa = item.assignee && /qa|test|calidad|pruebas/i.test(item.assignee);
  if (!isQa) {
    const rcFin = release.milestones.find((m) => m.key === "rc_fin");
    if (rcFin && itemEnd > rcFin.date) {
      const d1 = new Date(itemEnd).getTime();
      const d2 = new Date(rcFin.date).getTime();
      const daysLate = Math.max(1, Math.round((d1 - d2) / (1e3 * 60 * 60 * 24)));
      violations.push({
        milestoneKey: rcFin.key,
        milestoneCode: rcFin.code,
        milestoneName: rcFin.name,
        milestoneDate: rcFin.date,
        itemEndDate: itemEnd,
        daysLate
      });
    }
  }
  return violations;
}
function getReleaseDateSpan(release) {
  const defaultToday = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (!release) {
    return {
      startDate: defaultToday,
      endDate: defaultToday,
      duration: 1
    };
  }
  const validMilestoneDates = (release.milestones || []).map((m) => m.date).filter((d) => Boolean(d && typeof d === "string")).sort();
  const startDate = validMilestoneDates.length > 0 ? validMilestoneDates[0] : release.startDate || defaultToday;
  const endDate = validMilestoneDates.length > 0 ? validMilestoneDates[validMilestoneDates.length - 1] : release.endDate || startDate;
  const d1 = (/* @__PURE__ */ new Date(startDate + "T00:00:00Z")).getTime();
  const d2 = (/* @__PURE__ */ new Date(endDate + "T00:00:00Z")).getTime();
  const duration = Math.max(1, Math.round((d2 - d1) / (1e3 * 60 * 60 * 24)) + 1);
  return {
    startDate,
    endDate,
    duration
  };
}

// src/utils/ganttEngine.ts
function parseDateSafe(dateInput) {
  if (dateInput == null) {
    return startOfDay(/* @__PURE__ */ new Date());
  }
  if (dateInput instanceof Date && isValid(dateInput)) {
    return startOfDay(dateInput);
  }
  if (typeof dateInput === "number" && Number.isFinite(dateInput)) {
    const d = new Date(dateInput);
    if (isValid(d)) return startOfDay(d);
  }
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    if (!trimmed) return startOfDay(/* @__PURE__ */ new Date());
    const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
      const day = Number(dmyMatch[1]);
      const month = Number(dmyMatch[2]);
      const year = Number(dmyMatch[3]);
      const candidate = new Date(year, month - 1, day);
      if (isValid(candidate) && !isNaN(candidate.getTime())) {
        return startOfDay(candidate);
      }
    }
    const ymdMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (ymdMatch) {
      const year = Number(ymdMatch[1]);
      const month = Number(ymdMatch[2]);
      const day = Number(ymdMatch[3]);
      const candidate = new Date(year, month - 1, day);
      if (isValid(candidate) && !isNaN(candidate.getTime())) {
        return startOfDay(candidate);
      }
    }
    try {
      const parsed = parseISO(trimmed);
      if (isValid(parsed) && !isNaN(parsed.getTime())) {
        return startOfDay(parsed);
      }
    } catch {
    }
    try {
      const fallback = new Date(trimmed);
      if (isValid(fallback) && !isNaN(fallback.getTime())) {
        return startOfDay(fallback);
      }
    } catch {
    }
  }
  return startOfDay(/* @__PURE__ */ new Date());
}
function formatDateISO(date) {
  return format(startOfDay(date), "yyyy-MM-dd");
}
function formatDateDisplay(dateStr, fmt = "dd MMM yyyy") {
  const d = parseDateSafe(dateStr);
  return format(d, fmt, { locale: es });
}
function formatScrubberDate(date) {
  if (!date) return "";
  const d = typeof date === "string" ? parseDateSafe(date) : date;
  if (!isValid(d) || isNaN(d.getTime())) return "";
  const day = format(d, "d");
  const month = format(d, "MMM", { locale: es }).replace(".", "");
  const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
  const year = format(d, "yyyy");
  return `${day} ${monthCap} ${year}`;
}
function isWorkingDay(date, calendar) {
  if (!calendar?.workdaysOnly) return true;
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  if (calendar.holidays && calendar.holidays.length > 0) {
    const iso = formatDateISO(date);
    if (calendar.holidays.includes(iso)) return false;
  }
  return true;
}
function snapToNextWorkingDay(date, calendar) {
  if (!calendar?.workdaysOnly) return date;
  let cur = date;
  let guard = 0;
  while (!isWorkingDay(cur, calendar) && guard < 366) {
    cur = addDays(cur, 1);
    guard++;
  }
  return cur;
}
function calculateEndDateFromDuration(startDate, duration, type = "task", calendar) {
  const start = parseDateSafe(startDate);
  if (type === "milestone" || duration <= 0) {
    return formatDateISO(start);
  }
  const safeDuration = Math.max(1, Math.round(duration));
  if (!calendar?.workdaysOnly) {
    return formatDateISO(addDays(start, safeDuration - 1));
  }
  let cur = snapToNextWorkingDay(start, calendar);
  let remaining = safeDuration - 1;
  let guard = 0;
  while (remaining > 0 && guard < 3650) {
    cur = addDays(cur, 1);
    if (isWorkingDay(cur, calendar)) {
      remaining--;
    }
    guard++;
  }
  return formatDateISO(cur);
}
function calculateDurationFromDates(startDate, endDate, type = "task", calendar) {
  if (type === "milestone") return 0;
  const start = parseDateSafe(startDate);
  const end = parseDateSafe(endDate);
  if (!calendar?.workdaysOnly) {
    const diff = differenceInCalendarDays(end, start) + 1;
    return Math.max(1, diff);
  }
  if (end < start) return 1;
  let count = 0;
  let cur = start;
  let guard = 0;
  while (cur <= end && guard < 3650) {
    if (isWorkingDay(cur, calendar)) count++;
    cur = addDays(cur, 1);
    guard++;
  }
  return Math.max(1, count);
}
var VALID_COLORS = /* @__PURE__ */ new Set([
  "indigo",
  "blue",
  "emerald",
  "amber",
  "rose",
  "violet",
  "cyan",
  "teal",
  "orange",
  "pink",
  "slate",
  "sky",
  "lime"
]);
function getTeamColor(teamName) {
  if (!teamName || !teamName.trim()) {
    return "indigo";
  }
  const clean = teamName.trim().toLowerCase();
  if (/\b(qa|test|testing|calidad|pruebas|tester|qa lead)\b/.test(clean) || clean.includes("qa")) {
    return "cyan";
  }
  if (/\b(front|frontend|front-end|ui|ux|design|diseño|web)\b/.test(clean)) {
    return "violet";
  }
  if (/\b(back|backend|back-end|api|core|server|servicios|datos|db|database|dba)\b/.test(clean)) {
    return "blue";
  }
  if (/\b(devops|infra|infrastructure|cloud|sre|ops|sysadmin|sistemas|plataforma)\b/.test(clean)) {
    return "emerald";
  }
  if (/\b(pm|product|producto|lead|gestion|gestión|scrum|manager|owner|dirección|direccion)\b/.test(clean)) {
    return "amber";
  }
  if (/\b(sec|security|seguridad|ciso|audit|legal)\b/.test(clean)) {
    return "rose";
  }
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = hash * 31 + clean.charCodeAt(i) >>> 0;
  }
  const vividPalette = ["cyan", "violet", "blue", "emerald", "amber", "rose"];
  return vividPalette[hash % vividPalette.length];
}
function getItemEffectiveColor(item) {
  if (item.type === "milestone") {
    return item.color || "amber";
  }
  if (item.customColor && item.color && VALID_COLORS.has(item.color)) {
    return item.color;
  }
  if (item.color && item.color !== "indigo" && VALID_COLORS.has(item.color)) {
    return item.color;
  }
  if (item.assignee && item.assignee.trim()) {
    return getTeamColor(item.assignee);
  }
  return item.color && VALID_COLORS.has(item.color) ? item.color : "indigo";
}
var DEMO_PROJECT_IDS = /* @__PURE__ */ new Set([
  "proj-discovery",
  "proj-core",
  "proj-release",
  "proj-cloud-foundation",
  "proj-cloud-cutover",
  "proj-init",
  "proj-exec"
]);
function isDemoProject(raw) {
  if (!raw) return false;
  if (typeof raw.isDemo === "boolean") return raw.isDemo;
  const rawId = raw.id != null ? String(raw.id).trim() : "";
  if (rawId && DEMO_PROJECT_IDS.has(rawId)) return true;
  return false;
}
function normalizePlatform(raw) {
  if (!raw) return void 0;
  const trimmed = String(raw).trim();
  if (trimmed === "iOS") return "iOS";
  if (trimmed === "Android") return "Android";
  if (trimmed === "iOS/Android" || trimmed === "Multiplataforma") return "iOS/Android";
  return void 0;
}
function formatTaskDisplayId(projectIndex, taskIndex, isStandalone = false) {
  const safeTaskIdx = Math.max(1, Math.round(taskIndex || 1));
  if (isStandalone || !projectIndex) {
    return `T${safeTaskIdx}`;
  }
  return `P${Math.round(projectIndex)}T${safeTaskIdx}`;
}
function normalizeAlertLevel(rawVal) {
  if (rawVal === void 0 || rawVal === null || rawVal === "") return void 0;
  const parsedAlert = Number(rawVal);
  if (parsedAlert === 0 || parsedAlert === 1 || parsedAlert === 2 || parsedAlert === 3) {
    return parsedAlert;
  }
  return void 0;
}
function sanitizeProject(raw, fallbackIndex = 0) {
  const palette = ["indigo", "violet", "emerald", "blue", "amber", "rose", "cyan"];
  const color = raw.color && VALID_COLORS.has(raw.color) ? raw.color : palette[fallbackIndex % palette.length];
  const rawId = raw.id != null ? String(raw.id).trim() : "";
  const rawName = raw.name != null ? String(raw.name).trim() : "";
  const id = rawId || `proj-${fallbackIndex + 1}-${Date.now()}`;
  const platform = normalizePlatform(raw.platform);
  const alertLevel = normalizeAlertLevel(raw.alertLevel);
  let projectIndex;
  if (typeof raw.projectIndex === "number" && Number.isFinite(raw.projectIndex) && raw.projectIndex >= 1) {
    projectIndex = Math.round(raw.projectIndex);
  } else {
    const idMatch = rawId.match(/^(?:proj-|p)(\d+)$/i);
    if (idMatch) {
      const parsedIdx = Number(idMatch[1]);
      if (Number.isFinite(parsedIdx) && parsedIdx >= 1 && parsedIdx <= 9999) {
        projectIndex = parsedIdx;
      }
    }
  }
  return {
    id,
    ...projectIndex ? { projectIndex } : {},
    name: rawName || `Proyecto ${fallbackIndex + 1}`,
    color,
    description: raw.description != null ? String(raw.description).trim() : void 0,
    releaseId: raw.releaseId != null ? String(raw.releaseId).trim() || void 0 : void 0,
    platform,
    ...alertLevel !== void 0 ? { alertLevel } : {},
    ...raw.locked ? { locked: true } : {},
    collapsed: Boolean(raw.collapsed),
    isDemo: isDemoProject({ ...raw, id })
  };
}
function isReleaseAssociatedTask(item) {
  if (!item) return false;
  const normName = String(item.name || "").trim().toUpperCase();
  const normAssignee = String(item.assignee || "").trim().toUpperCase();
  return normName === "DIGI" || normName === "SCR" || normAssignee === "DIGI" || normAssignee === "SCR";
}
var JIRA_BROWSE_BASE_URL = "https://hdev.bancsabadell.com/browse/";
function generateElementUrlFromName(name) {
  if (!name) return void 0;
  const match = String(name).trim().match(/^(DIGI-\d+|HDEV-\d+|HUAT-\d+)(?=$|[^0-9A-Za-z])/i);
  if (!match) return void 0;
  return `${JIRA_BROWSE_BASE_URL}${match[1].toUpperCase()}`;
}
function resolveElementUrl(element) {
  if (!element) return void 0;
  const autoUrl = generateElementUrlFromName(element.name);
  if (autoUrl) return autoUrl;
  const rawUrl = element.url?.trim();
  if (rawUrl && !rawUrl.startsWith(JIRA_BROWSE_BASE_URL)) {
    return rawUrl;
  }
  return void 0;
}
function sanitizeGanttItem(raw, fallbackIndex = 0) {
  const type = raw.type === "milestone" ? "milestone" : "task";
  const startDate = formatDateISO(
    parseDateSafe(raw.startDate || formatDateISO(/* @__PURE__ */ new Date()))
  );
  let duration = 0;
  let endDate = startDate;
  if (type === "task") {
    const rawDur = raw.duration;
    let parsedDuration = null;
    if (rawDur !== void 0 && rawDur !== null) {
      const num = typeof rawDur === "string" ? Number(rawDur.replace(/[^\d.]/g, "")) : Number(rawDur);
      if (Number.isFinite(num) && num >= 1) {
        parsedDuration = Math.max(1, Math.round(num));
      }
    }
    if (parsedDuration !== null && !raw.endDate) {
      duration = parsedDuration;
      endDate = calculateEndDateFromDuration(startDate, duration, "task");
    } else if (raw.endDate) {
      const expectedFromDur = parsedDuration !== null ? calculateEndDateFromDuration(startDate, parsedDuration, "task") : null;
      if (parsedDuration !== null && expectedFromDur === raw.endDate) {
        duration = parsedDuration;
        endDate = expectedFromDur;
      } else if (parsedDuration !== null) {
        duration = parsedDuration;
        endDate = calculateEndDateFromDuration(startDate, duration, "task");
      } else {
        duration = calculateDurationFromDates(startDate, raw.endDate, "task");
        endDate = calculateEndDateFromDuration(startDate, duration, "task");
      }
    } else {
      duration = 1;
      endDate = startDate;
    }
  }
  const rawColor = raw.color && VALID_COLORS.has(raw.color) ? raw.color : void 0;
  const rawAssignee = raw.assignee != null ? String(raw.assignee).trim() : void 0;
  const isCustomColor = Boolean(raw.customColor);
  let color;
  if (type === "milestone") {
    color = rawColor || "amber";
  } else if (isCustomColor && rawColor) {
    color = rawColor;
  } else if (rawColor && rawColor !== "indigo") {
    color = rawColor;
  } else if (rawAssignee) {
    color = getTeamColor(rawAssignee);
  } else {
    color = rawColor || "indigo";
  }
  const rawId = raw.id != null ? String(raw.id).trim() : "";
  const id = rawId || `${type === "milestone" ? "m" : "t"}-${fallbackIndex + 1}-${Date.now()}`;
  let rawProgress = raw.progress;
  if (typeof rawProgress === "string") {
    rawProgress = Number(String(rawProgress).replace("%", ""));
  }
  if (typeof rawProgress === "number" && !isNaN(rawProgress)) {
    if (rawProgress > 0 && rawProgress <= 1 && !Number.isInteger(rawProgress)) {
      rawProgress = Math.round(rawProgress * 100);
    }
  } else {
    rawProgress = 0;
  }
  const progress = Math.min(100, Math.max(0, Math.round(rawProgress)));
  const dependencies = Array.isArray(raw.dependencies) ? raw.dependencies.map((d) => d != null ? String(d).trim() : "").filter((d) => d.length > 0 && d !== id) : [];
  const resolvedName = raw.name != null ? String(raw.name) : fallbackIndex >= 0 ? `Elemento ${fallbackIndex + 1}` : "Tarea";
  const resolvedUrl = resolveElementUrl({
    name: resolvedName,
    url: raw.url != null ? String(raw.url) : void 0
  });
  const isExternalMilestone = type === "milestone" && Boolean(raw.isExternal);
  const result = {
    id,
    name: resolvedName,
    type,
    startDate,
    endDate,
    duration,
    slack: Math.max(0, Math.round(Number(raw.slack) || 0)),
    dependencies,
    dependencyTypes: raw.dependencyTypes && typeof raw.dependencyTypes === "object" ? { ...raw.dependencyTypes } : void 0,
    progress,
    color,
    ...isCustomColor ? { customColor: true } : {},
    assignee: raw.assignee != null ? String(raw.assignee).trim() : void 0,
    notes: raw.notes != null ? String(raw.notes).trim() : void 0,
    hidden: Boolean(raw.hidden),
    ...isExternalMilestone ? { isExternal: true } : {},
    platform: normalizePlatform(raw.platform),
    releaseId: isExternalMilestone ? void 0 : raw.releaseId != null && String(raw.releaseId).trim() ? String(raw.releaseId).trim() : void 0,
    ...normalizeAlertLevel(raw.alertLevel) !== void 0 ? { alertLevel: normalizeAlertLevel(raw.alertLevel) } : {},
    ...typeof raw.taskIndex === "number" && Number.isFinite(raw.taskIndex) && raw.taskIndex >= 1 ? { taskIndex: Math.round(raw.taskIndex) } : {},
    ...resolvedUrl ? { url: resolvedUrl } : {}
  };
  if (!isExternalMilestone && raw.projectId != null && String(raw.projectId).trim()) {
    result.projectId = String(raw.projectId).trim();
  }
  return result;
}
function wouldCreateCycle(items, taskId, candidatePredecessorId) {
  if (taskId === candidatePredecessorId) return true;
  const itemMap = new Map(items.map((it) => [it.id, it]));
  const visited = /* @__PURE__ */ new Set();
  function dfs(currentId) {
    if (currentId === taskId) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);
    const item = itemMap.get(currentId);
    if (!item) return false;
    for (const predId of item.dependencies) {
      if (dfs(predId)) return true;
    }
    return false;
  }
  return dfs(candidatePredecessorId);
}
function getEarliestStartFromPredecessors(item, itemMap) {
  if (!item.dependencies || item.dependencies.length === 0) return null;
  let maxRequiredStart = null;
  for (const predId of item.dependencies) {
    const pred = itemMap.get(predId);
    if (!pred) continue;
    const depType = item.dependencyTypes?.[predId] || "FS";
    const predStart = parseDateSafe(pred.startDate);
    const predEnd = parseDateSafe(pred.endDate);
    let requiredStart;
    switch (depType) {
      case "FS":
        requiredStart = addDays(predEnd, 1);
        break;
      case "SS":
        requiredStart = predStart;
        break;
      case "FF": {
        const offset = item.type === "milestone" ? 0 : Math.max(0, item.duration - 1);
        requiredStart = addDays(predEnd, -offset);
        break;
      }
      case "SF": {
        const offset = item.type === "milestone" ? 0 : Math.max(0, item.duration - 1);
        requiredStart = addDays(predStart, -offset);
        break;
      }
      default:
        requiredStart = addDays(predEnd, 1);
    }
    if (!maxRequiredStart || requiredStart > maxRequiredStart) {
      maxRequiredStart = requiredStart;
    }
  }
  return maxRequiredStart;
}
function resolveLockedProjectIdSet(lockedProjects) {
  if (!lockedProjects) return /* @__PURE__ */ new Set();
  if (lockedProjects instanceof Set) return lockedProjects;
  const set = /* @__PURE__ */ new Set();
  for (const proj of lockedProjects) {
    if (proj?.locked) {
      set.add(proj.id);
    }
  }
  return set;
}
function getLockedProjectForItem(item, projects) {
  if (!item || !projects || projects.length === 0) return void 0;
  const pid = item.projectId || projects[0]?.id;
  if (!pid) return void 0;
  const proj = projects.find((p) => p.id === pid);
  return proj?.locked ? proj : void 0;
}
function cascadeDependencies(items, lockedProjects) {
  const lockedIds = resolveLockedProjectIdSet(lockedProjects);
  const cloned = items.map((it) => ({
    ...it,
    dependencies: [...it.dependencies],
    dependencyTypes: it.dependencyTypes ? { ...it.dependencyTypes } : void 0
  }));
  const itemMap = new Map(cloned.map((it) => [it.id, it]));
  for (let pass = 0; pass < cloned.length; pass++) {
    let changed = false;
    for (const item of cloned) {
      if (item.projectId && lockedIds.has(item.projectId)) {
        continue;
      }
      const requiredStart = getEarliestStartFromPredecessors(item, itemMap);
      if (requiredStart) {
        const currentStart = parseDateSafe(item.startDate);
        if (currentStart < requiredStart) {
          const newStartStr = formatDateISO(requiredStart);
          item.startDate = newStartStr;
          item.endDate = calculateEndDateFromDuration(newStartStr, item.duration, item.type);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return cloned;
}
function resolveDependencyTypeFromPorts(sourcePort, targetPort) {
  if (sourcePort === "end" && targetPort === "start") return "FS";
  if (sourcePort === "end" && targetPort === "end") return "FF";
  if (sourcePort === "start" && targetPort === "start") return "SS";
  return "SF";
}
function canCreateNonDisplacingDependency(items, predId, succId, depType = "FS") {
  const cleanPredId = (predId || "").trim();
  const cleanSuccId = (succId || "").trim();
  if (!cleanPredId || !cleanSuccId) {
    return { allowed: false, reason: "not_found" };
  }
  if (cleanPredId === cleanSuccId) {
    return { allowed: false, reason: "self" };
  }
  const pred = items.find((it) => it.id === cleanPredId);
  const succ = items.find((it) => it.id === cleanSuccId);
  if (!pred || !succ) {
    return { allowed: false, reason: "not_found" };
  }
  if ((succ.dependencies || []).includes(cleanPredId)) {
    return { allowed: false, reason: "duplicate" };
  }
  if (wouldCreateCycle(items, cleanSuccId, cleanPredId)) {
    return { allowed: false, reason: "cycle" };
  }
  const checkType = (candidateType) => {
    const candidateSucc = {
      ...succ,
      dependencies: [cleanPredId],
      dependencyTypes: { [cleanPredId]: candidateType }
    };
    return getEarliestStartFromPredecessors(candidateSucc, /* @__PURE__ */ new Map([[cleanPredId, pred]]));
  };
  const succStart = parseDateSafe(succ.startDate);
  const requiredStart = checkType(depType);
  if (requiredStart && succStart < requiredStart) {
    const altMap = {
      FS: "FF",
      FF: "FS",
      SS: "SF",
      SF: "SS"
    };
    const altType = altMap[depType];
    const altReq = checkType(altType);
    const suggestedAlternative = !altReq || succStart >= altReq ? altType : void 0;
    return {
      allowed: false,
      reason: "would_shift",
      requiredStartDate: formatDateISO(requiredStart),
      suggestedAlternative
    };
  }
  return { allowed: true };
}
function addDependencyLink(items, predId, succId, depType = "FS", cascade = false, lockedProjects) {
  const cleanPredId = (predId || "").trim();
  const cleanSuccId = (succId || "").trim();
  if (!cleanPredId || !cleanSuccId) {
    return { items, added: false, error: "not_found" };
  }
  if (cleanPredId === cleanSuccId) {
    return { items, added: false, error: "self" };
  }
  const predExists = items.some((it) => it.id === cleanPredId);
  const succItem = items.find((it) => it.id === cleanSuccId);
  if (!predExists || !succItem) {
    return { items, added: false, error: "not_found" };
  }
  if (succItem.dependencies.includes(cleanPredId)) {
    return { items, added: false, error: "duplicate" };
  }
  if (wouldCreateCycle(items, cleanSuccId, cleanPredId)) {
    return { items, added: false, error: "cycle" };
  }
  const nextTypes = {
    ...succItem.dependencyTypes || {}
  };
  if (depType && depType !== "FS") {
    nextTypes[cleanPredId] = depType;
  } else {
    delete nextTypes[cleanPredId];
  }
  const updatedSucc = sanitizeGanttItem({
    ...succItem,
    dependencies: [...succItem.dependencies, cleanPredId],
    dependencyTypes: Object.keys(nextTypes).length > 0 ? nextTypes : void 0
  });
  const nextItems = items.map(
    (it) => it.id === cleanSuccId ? updatedSucc : sanitizeGanttItem(it)
  );
  return {
    items: cascade ? cascadeDependencies(nextItems, lockedProjects) : nextItems,
    added: true
  };
}
function removeDependencyLink(items, predId, succId, cascade = false, lockedProjects) {
  const cleanPredId = (predId || "").trim();
  const cleanSuccId = (succId || "").trim();
  if (!cleanPredId || !cleanSuccId) {
    return { items, removed: false };
  }
  const succItem = items.find((it) => it.id === cleanSuccId);
  if (!succItem || !succItem.dependencies.includes(cleanPredId)) {
    return { items, removed: false };
  }
  const nextDeps = succItem.dependencies.filter((d) => d !== cleanPredId);
  const nextTypes = {
    ...succItem.dependencyTypes || {}
  };
  delete nextTypes[cleanPredId];
  const updatedSucc = sanitizeGanttItem({
    ...succItem,
    dependencies: nextDeps,
    dependencyTypes: Object.keys(nextTypes).length > 0 ? nextTypes : void 0
  });
  const nextItems = items.map(
    (it) => it.id === cleanSuccId ? updatedSucc : sanitizeGanttItem(it)
  );
  return {
    items: cascade ? cascadeDependencies(nextItems, lockedProjects) : nextItems,
    removed: true
  };
}
function updateDependencyLinkType(items, predId, succId, depType, cascade = false, lockedProjects) {
  const cleanPredId = (predId || "").trim();
  const cleanSuccId = (succId || "").trim();
  const succItem = items.find((it) => it.id === cleanSuccId);
  if (!succItem || !succItem.dependencies.includes(cleanPredId)) {
    return { items, updated: false };
  }
  const nextTypes = {
    ...succItem.dependencyTypes || {}
  };
  if (depType && depType !== "FS") {
    nextTypes[cleanPredId] = depType;
  } else {
    delete nextTypes[cleanPredId];
  }
  const updatedSucc = sanitizeGanttItem({
    ...succItem,
    dependencyTypes: Object.keys(nextTypes).length > 0 ? nextTypes : void 0
  });
  const nextItems = items.map(
    (it) => it.id === cleanSuccId ? updatedSucc : sanitizeGanttItem(it)
  );
  return {
    items: cascade ? cascadeDependencies(nextItems, lockedProjects) : nextItems,
    updated: true
  };
}
function moveDependencyLink(items, oldPredId, oldSuccId, newPredId, newSuccId, depType, cascade = false, lockedProjects) {
  const cOldPred = (oldPredId || "").trim();
  const cOldSucc = (oldSuccId || "").trim();
  const cNewPred = (newPredId || "").trim();
  const cNewSucc = (newSuccId || "").trim();
  if (!cOldPred || !cOldSucc || !cNewPred || !cNewSucc) {
    return { items, moved: false, error: "not_found" };
  }
  if (cNewPred === cNewSucc) {
    return { items, moved: false, error: "self" };
  }
  const oldSuccItem = items.find((it) => it.id === cOldSucc);
  const newPredExists = items.some((it) => it.id === cNewPred);
  const newSuccExists = items.some((it) => it.id === cNewSucc);
  if (!oldSuccItem || !oldSuccItem.dependencies.includes(cOldPred) || !newPredExists || !newSuccExists) {
    return { items, moved: false, error: "not_found" };
  }
  const resolvedDepType = depType || oldSuccItem.dependencyTypes?.[cOldPred] || "FS";
  if (cOldPred === cNewPred && cOldSucc === cNewSucc) {
    const currentType = oldSuccItem.dependencyTypes?.[cOldPred] || "FS";
    if (depType && depType !== currentType) {
      const updated = updateDependencyLinkType(
        items,
        cOldPred,
        cOldSucc,
        depType,
        cascade,
        lockedProjects
      );
      return { items: updated.items, moved: updated.updated };
    }
    return { items, moved: false };
  }
  const removedStep = removeDependencyLink(items, cOldPred, cOldSucc, false);
  if (!removedStep.removed) {
    return { items, moved: false, error: "not_found" };
  }
  const addedStep = addDependencyLink(
    removedStep.items,
    cNewPred,
    cNewSucc,
    resolvedDepType,
    cascade,
    lockedProjects
  );
  if (!addedStep.added) {
    return { items, moved: false, error: addedStep.error };
  }
  return { items: addedStep.items, moved: true };
}
function computeGanttMetrics(items) {
  if (items.length === 0) return [];
  const itemMap = new Map(items.map((it) => [it.id, it]));
  let minStart = parseDateSafe(items[0].startDate);
  let maxEnd = parseDateSafe(items[0].endDate);
  for (const it of items) {
    const s = parseDateSafe(it.startDate);
    const e = parseDateSafe(it.endDate);
    if (s < minStart) minStart = s;
    if (e > maxEnd) maxEnd = e;
  }
  const projectTotalSpan = differenceInCalendarDays(maxEnd, minStart) + 1;
  const successorsMap = /* @__PURE__ */ new Map();
  for (const it of items) {
    successorsMap.set(it.id, []);
  }
  for (const it of items) {
    for (const predId of it.dependencies) {
      if (successorsMap.has(predId)) {
        successorsMap.get(predId).push(it.id);
      }
    }
  }
  const lateFinishMap = /* @__PURE__ */ new Map();
  for (const it of items) {
    lateFinishMap.set(it.id, maxEnd);
  }
  for (let pass = 0; pass < items.length; pass++) {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const itDur = it.type === "milestone" ? 0 : Math.max(1, it.duration);
      const succIds = successorsMap.get(it.id) || [];
      if (succIds.length === 0) {
        lateFinishMap.set(it.id, maxEnd);
      } else {
        let minAllowedPredFinish = null;
        for (const sId of succIds) {
          const succ = itemMap.get(sId);
          if (!succ) continue;
          const succLateFinish = lateFinishMap.get(sId) || maxEnd;
          const succDur = succ.type === "milestone" ? 0 : Math.max(1, succ.duration);
          const succLateStart = succ.type === "milestone" ? succLateFinish : addDays(succLateFinish, -(succDur - 1));
          const depType = succ.dependencyTypes?.[it.id] || "FS";
          let allowedPredFinish;
          switch (depType) {
            case "FS":
              allowedPredFinish = addDays(succLateStart, -1);
              break;
            case "SS":
              allowedPredFinish = it.type === "milestone" ? succLateStart : addDays(succLateStart, itDur - 1);
              break;
            case "FF":
              allowedPredFinish = succLateFinish;
              break;
            case "SF":
              allowedPredFinish = it.type === "milestone" ? succLateFinish : addDays(succLateFinish, itDur - 1);
              break;
            default:
              allowedPredFinish = addDays(succLateStart, -1);
          }
          if (!minAllowedPredFinish || allowedPredFinish < minAllowedPredFinish) {
            minAllowedPredFinish = allowedPredFinish;
          }
        }
        if (minAllowedPredFinish) {
          lateFinishMap.set(it.id, minAllowedPredFinish);
        }
      }
    }
  }
  return items.map((item, idx) => {
    const start = parseDateSafe(item.startDate);
    const end = parseDateSafe(item.endDate);
    const safeSlack = Math.max(0, Number(item.slack) || 0);
    const succIds = successorsMap.get(item.id) || [];
    let minGap = null;
    let drivingId = void 0;
    let drivingName = void 0;
    if (succIds.length > 0) {
      for (const sId of succIds) {
        const succ = itemMap.get(sId);
        if (!succ) continue;
        const depType = succ.dependencyTypes?.[item.id] || "FS";
        if (depType !== "FS") continue;
        const predEnd = parseDateSafe(item.endDate);
        const succStart = parseDateSafe(succ.startDate);
        const gap = differenceInCalendarDays(succStart, predEnd) - 1;
        if (minGap === null || gap < minGap) {
          minGap = gap;
          drivingId = succ.id;
          drivingName = succ.name;
        }
      }
    }
    const hasSuccessors = succIds.length > 0;
    const freeSlack = minGap !== null ? minGap : 0;
    const visualSlack = safeSlack > 0 ? safeSlack : Math.max(0, freeSlack);
    const slackEnd = addDays(end, visualSlack);
    const lateFinish = lateFinishMap.get(item.id) || maxEnd;
    const cpmTotalFloat = Math.max(0, differenceInCalendarDays(lateFinish, end));
    const earliestAllowed = getEarliestStartFromPredecessors(item, itemMap);
    const hasPredecessorConflict = earliestAllowed !== null && start < earliestAllowed;
    let hasConflict = hasPredecessorConflict;
    let conflictMessage = hasPredecessorConflict && earliestAllowed ? `Inicia antes que finalice su predecesora (deber\xEDa iniciar el ${formatDateDisplay(
      formatDateISO(earliestAllowed),
      "dd MMM"
    )} o despu\xE9s)` : void 0;
    if (!hasConflict && freeSlack < 0 && drivingName) {
      hasConflict = true;
      conflictMessage = `Inicia solap\xE1ndose en ${Math.abs(freeSlack)} d\xEDa(s) con su tarea siguiente \xAB${drivingName}\xBB`;
    }
    const isCritical = safeSlack === 0 && freeSlack <= 0 && cpmTotalFloat <= 0 && projectTotalSpan > 0;
    return {
      ...item,
      wbs: idx + 1,
      slack: safeSlack,
      slackEndDate: formatDateISO(slackEnd),
      cpmTotalFloat,
      freeSlack,
      hasSuccessors,
      successorIds: succIds,
      drivingSuccessorId: drivingId,
      drivingSuccessorName: drivingName,
      isCritical,
      hasConflict,
      conflictMessage,
      earliestAllowedStart: earliestAllowed ? formatDateISO(earliestAllowed) : void 0
    };
  });
}
var EXTERNAL_MILESTONES_GROUP_ID = "__external_milestones__";
function buildExternalMilestonesGroup(externalMilestones) {
  if (!externalMilestones || externalMilestones.length === 0) return null;
  const enrichedItems = externalMilestones.map((it, idx) => ({
    ...it,
    projectId: void 0,
    releaseId: void 0,
    isExternal: true,
    taskIndex: idx + 1,
    wbsCode: `EXT.${idx + 1}`,
    displayId: `EXT${idx + 1}`
  }));
  let minStart = parseDateSafe(enrichedItems[0].startDate);
  let maxEnd = parseDateSafe(enrichedItems[0].endDate);
  let maxSlackEnd = parseDateSafe(enrichedItems[0].slackEndDate || enrichedItems[0].endDate);
  let criticalCount = 0;
  let milestoneProgressSum = 0;
  let hasConflict = false;
  for (const it of enrichedItems) {
    const s = parseDateSafe(it.startDate);
    const e = parseDateSafe(it.endDate);
    const se = parseDateSafe(it.slackEndDate || it.endDate);
    if (s < minStart) minStart = s;
    if (e > maxEnd) maxEnd = e;
    if (se > maxSlackEnd) maxSlackEnd = se;
    milestoneProgressSum += it.progress || 0;
    if (it.isCritical) criticalCount++;
    if (it.hasConflict) hasConflict = true;
  }
  const startDate = formatDateISO(minStart);
  const endDate = formatDateISO(maxEnd);
  const slackEndDate = formatDateISO(maxSlackEnd);
  const rawSpanDays = differenceInCalendarDays(maxEnd, minStart);
  const duration = rawSpanDays === 0 ? 0 : Math.max(1, rawSpanDays + 1);
  const progress = Math.round(milestoneProgressSum / enrichedItems.length);
  return {
    project: {
      id: EXTERNAL_MILESTONES_GROUP_ID,
      name: "Hitos Externos",
      color: "amber",
      collapsed: false
    },
    projectIndex: 0,
    items: enrichedItems,
    startDate,
    endDate,
    slackEndDate,
    duration,
    progress,
    tasksCount: 0,
    milestonesCount: enrichedItems.length,
    criticalCount,
    totalSlack: 0,
    totalFreeSlack: 0,
    hasConflict
  };
}
function groupItemsByProject(items, projects = []) {
  const externalMilestones = items.filter(
    (it) => it.type === "milestone" && Boolean(it.isExternal)
  );
  const regularItems = items.filter(
    (it) => !(it.type === "milestone" && Boolean(it.isExternal))
  );
  const effectiveProjects = (projects || []).map(
    (p, i) => sanitizeProject(p, i)
  );
  const projectMap = /* @__PURE__ */ new Map();
  for (const p of effectiveProjects) {
    projectMap.set(p.id, p);
  }
  for (const item of regularItems) {
    if (item.projectId && !projectMap.has(item.projectId)) {
      const extraProj = sanitizeProject(
        { id: item.projectId, name: `Proyecto ${effectiveProjects.length + 1}` },
        effectiveProjects.length
      );
      effectiveProjects.push(extraProj);
      projectMap.set(extraProj.id, extraProj);
    } else if (!item.projectId && effectiveProjects.length === 0) {
      const defProj = {
        id: "proj-default",
        name: "Proyecto General",
        color: "indigo",
        collapsed: false
      };
      effectiveProjects.push(defProj);
      projectMap.set(defProj.id, defProj);
    }
  }
  if (effectiveProjects.length === 0 && regularItems.length > 0) {
    const defProj = {
      id: "proj-default",
      name: "Proyecto General",
      color: "indigo",
      collapsed: false
    };
    effectiveProjects.push(defProj);
    projectMap.set(defProj.id, defProj);
  }
  const fallbackProjectId = effectiveProjects[0]?.id;
  const bucketMap = /* @__PURE__ */ new Map();
  for (const p of effectiveProjects) {
    bucketMap.set(p.id, []);
  }
  for (const item of regularItems) {
    const targetPid = item.projectId && bucketMap.has(item.projectId) ? item.projectId : fallbackProjectId;
    if (targetPid) {
      bucketMap.get(targetPid).push(item);
    }
  }
  const usedIndices = /* @__PURE__ */ new Set();
  for (const p of effectiveProjects) {
    if (typeof p.projectIndex === "number" && p.projectIndex >= 1) {
      usedIndices.add(Math.round(p.projectIndex));
    }
  }
  let nextAvailableIdx = 1;
  for (const p of effectiveProjects) {
    if (typeof p.projectIndex === "number" && p.projectIndex >= 1) {
      p.projectIndex = Math.round(p.projectIndex);
    } else {
      while (usedIndices.has(nextAvailableIdx)) {
        nextAvailableIdx++;
      }
      p.projectIndex = nextAvailableIdx;
      usedIndices.add(nextAvailableIdx);
    }
  }
  const todayStr = formatDateISO(/* @__PURE__ */ new Date());
  const isFallbackOnly = projects.length === 0;
  const knownProjectIds = new Set(projects.map((p) => p.id));
  const regularGroups = effectiveProjects.map((project, pIdx) => {
    const projectIndex = project.projectIndex || pIdx + 1;
    const rawGroupItems = bucketMap.get(project.id) || [];
    const usedTaskIndices = /* @__PURE__ */ new Set();
    for (const it of rawGroupItems) {
      if (typeof it.taskIndex === "number" && Number.isFinite(it.taskIndex) && it.taskIndex >= 1) {
        usedTaskIndices.add(Math.round(it.taskIndex));
      }
    }
    let nextTaskIdx = 1;
    const enrichedItems = rawGroupItems.map((it, itemIdx) => {
      let resolvedTaskIndex;
      if (typeof it.taskIndex === "number" && Number.isFinite(it.taskIndex) && it.taskIndex >= 1) {
        resolvedTaskIndex = Math.round(it.taskIndex);
      } else {
        while (usedTaskIndices.has(nextTaskIdx)) {
          nextTaskIdx++;
        }
        resolvedTaskIndex = nextTaskIdx;
        usedTaskIndices.add(nextTaskIdx);
      }
      const isStandalone = isFallbackOnly || !it.projectId || !knownProjectIds.has(it.projectId);
      return {
        ...it,
        projectId: project.id,
        taskIndex: resolvedTaskIndex,
        wbsCode: `${projectIndex}.${itemIdx + 1}`,
        displayId: formatTaskDisplayId(projectIndex, resolvedTaskIndex, isStandalone)
      };
    });
    if (enrichedItems.length === 0) {
      return {
        project,
        projectIndex,
        items: [],
        startDate: todayStr,
        endDate: todayStr,
        slackEndDate: todayStr,
        duration: 0,
        progress: 0,
        tasksCount: 0,
        milestonesCount: 0,
        criticalCount: 0,
        totalSlack: 0,
        totalFreeSlack: 0,
        hasConflict: false
      };
    }
    let minStart = parseDateSafe(enrichedItems[0].startDate);
    let maxEnd = parseDateSafe(enrichedItems[0].endDate);
    let maxSlackEnd = parseDateSafe(
      enrichedItems[0].slackEndDate || enrichedItems[0].endDate
    );
    let tasksCount = 0;
    let milestonesCount = 0;
    let criticalCount = 0;
    let totalSlack = 0;
    let totalFreeSlack = 0;
    let taskProgressSum = 0;
    let milestoneProgressSum = 0;
    let hasConflict = false;
    for (const it of enrichedItems) {
      const s = parseDateSafe(it.startDate);
      const e = parseDateSafe(it.endDate);
      const se = parseDateSafe(it.slackEndDate || it.endDate);
      if (s < minStart) minStart = s;
      if (e > maxEnd) maxEnd = e;
      if (se > maxSlackEnd) maxSlackEnd = se;
      if (it.type === "milestone") {
        milestonesCount++;
        milestoneProgressSum += it.progress || 0;
      } else {
        tasksCount++;
        totalSlack += it.slack || 0;
        totalFreeSlack += Math.max(0, it.freeSlack || 0);
        taskProgressSum += it.progress || 0;
      }
      if (it.isCritical) criticalCount++;
      if (it.hasConflict) hasConflict = true;
    }
    const startDate = formatDateISO(minStart);
    const endDate = formatDateISO(maxEnd);
    const slackEndDate = formatDateISO(maxSlackEnd);
    const rawSpanDays = differenceInCalendarDays(maxEnd, minStart);
    const duration = tasksCount === 0 && rawSpanDays === 0 ? 0 : Math.max(1, rawSpanDays + 1);
    const progress = tasksCount > 0 ? Math.round(taskProgressSum / tasksCount) : milestonesCount > 0 ? Math.round(milestoneProgressSum / milestonesCount) : 0;
    return {
      project,
      projectIndex,
      items: enrichedItems,
      startDate,
      endDate,
      slackEndDate,
      duration,
      progress,
      tasksCount,
      milestonesCount,
      criticalCount,
      totalSlack,
      totalFreeSlack,
      hasConflict
    };
  });
  const externalGroup = buildExternalMilestonesGroup(externalMilestones);
  return externalGroup ? [externalGroup, ...regularGroups] : regularGroups;
}
function groupItemsByReleaseAndProject(items, projects = [], releases = []) {
  const projectGroups = groupItemsByProject(items, projects).filter(
    (pg) => pg.project.id !== EXTERNAL_MILESTONES_GROUP_ID
  );
  const releaseMap = /* @__PURE__ */ new Map();
  for (const r of releases) {
    releaseMap.set(r.id, r);
  }
  const releaseBuckets = /* @__PURE__ */ new Map();
  for (const rel of releases) {
    releaseBuckets.set(rel.id, []);
  }
  const unassignedKey = "__unassigned__";
  releaseBuckets.set(unassignedKey, []);
  for (const pg of projectGroups) {
    const relId = pg.project.releaseId && releaseMap.has(pg.project.releaseId) ? pg.project.releaseId : unassignedKey;
    releaseBuckets.get(relId).push(pg);
  }
  const result = [];
  for (const rel of releases) {
    const pgs = releaseBuckets.get(rel.id) || [];
    if (pgs.length === 0) continue;
    const hasMilestones = Boolean(rel.milestones && rel.milestones.some((m) => Boolean(m.date)));
    const relSpan = getReleaseDateSpan(rel);
    let minStart = hasMilestones ? relSpan.startDate : pgs[0]?.startDate || relSpan.startDate;
    let maxEnd = hasMilestones ? relSpan.endDate : pgs[0]?.endDate || relSpan.endDate;
    let totalItems = 0;
    let totalProgressSum = 0;
    let tasksCount = 0;
    let milestonesCount = 0;
    let violationsCount = 0;
    for (const pg of pgs) {
      if (pg.startDate && pg.startDate < minStart) minStart = pg.startDate;
      if (pg.endDate && pg.endDate > maxEnd) maxEnd = pg.endDate;
      tasksCount += pg.tasksCount;
      milestonesCount += pg.milestonesCount;
      totalItems += pg.items.length;
      totalProgressSum += pg.progress * (pg.items.length || 1);
      for (const it of pg.items) {
        const violations = checkTaskReleaseCompliance(it, pg.project, rel);
        if (violations.length > 0) violationsCount++;
      }
    }
    const duration = Math.max(
      hasMilestones ? relSpan.duration : 1,
      differenceInCalendarDays(parseDateSafe(maxEnd), parseDateSafe(minStart)) + 1
    );
    const progress = totalItems > 0 ? Math.round(totalProgressSum / totalItems) : 0;
    result.push({
      release: rel,
      projectGroups: pgs,
      startDate: minStart,
      endDate: maxEnd,
      duration,
      progress,
      tasksCount,
      milestonesCount,
      violationsCount
    });
  }
  const unassignedPgs = releaseBuckets.get(unassignedKey) || [];
  if (unassignedPgs.length > 0) {
    let minStart = unassignedPgs[0].startDate;
    let maxEnd = unassignedPgs[0].endDate;
    let totalItems = 0;
    let totalProgressSum = 0;
    let tasksCount = 0;
    let milestonesCount = 0;
    for (const pg of unassignedPgs) {
      if (pg.startDate < minStart) minStart = pg.startDate;
      if (pg.endDate > maxEnd) maxEnd = pg.endDate;
      tasksCount += pg.tasksCount;
      milestonesCount += pg.milestonesCount;
      totalItems += pg.items.length;
      totalProgressSum += pg.progress * (pg.items.length || 1);
    }
    const duration = Math.max(
      1,
      differenceInCalendarDays(parseDateSafe(maxEnd), parseDateSafe(minStart)) + 1
    );
    const progress = totalItems > 0 ? Math.round(totalProgressSum / totalItems) : 0;
    const unassignedRelease = {
      id: unassignedKey,
      code: "SIN RELEASE",
      name: "Proyectos sin Release asignada",
      color: "slate",
      milestones: [],
      projectIds: unassignedPgs.map((pg) => pg.project.id)
    };
    result.push({
      release: unassignedRelease,
      projectGroups: unassignedPgs,
      startDate: minStart,
      endDate: maxEnd,
      duration,
      progress,
      tasksCount,
      milestonesCount,
      violationsCount: 0
    });
  }
  return result;
}
function filterGroupsBySelectedProjects(groups, selectedProjectIds, legacySelectedProjectId) {
  if (Array.isArray(selectedProjectIds)) {
    const selectedSet = new Set(selectedProjectIds);
    return groups.filter((g) => selectedSet.has(g.project.id));
  }
  if (!legacySelectedProjectId || legacySelectedProjectId === "all") {
    return groups;
  }
  return groups.filter((g) => g.project.id === legacySelectedProjectId);
}
var MIN_DAY_WIDTH = 3;
var MAX_DAY_WIDTH = 96;
var DEFAULT_DAY_WIDTH = 44;
var ZOOM_PRESET_WIDTHS = {
  day: 44,
  week: 24,
  month: 12,
  quarter: 5
};
function clampDayWidth(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return DEFAULT_DAY_WIDTH;
  const clamped = Math.min(MAX_DAY_WIDTH, Math.max(MIN_DAY_WIDTH, num));
  return Math.round(clamped * 10) / 10;
}
function getDayWidthForPreset(zoom) {
  return ZOOM_PRESET_WIDTHS[zoom] ?? DEFAULT_DAY_WIDTH;
}
function computeWheelZoomDayWidth(currentDayWidth, deltaY) {
  const base = clampDayWidth(currentDayWidth);
  if (!Number.isFinite(deltaY) || deltaY === 0) return base;
  const clampedDelta = Math.max(-120, Math.min(120, deltaY));
  const factor = Math.pow(1.0022, -clampedDelta);
  let next = clampDayWidth(base * factor);
  if (next === base && Math.abs(deltaY) >= 4) {
    next = clampDayWidth(base + (deltaY < 0 ? 0.3 : -0.3));
  }
  return next;
}
function collectTimelineAnchorDates(options) {
  const releaseMap = /* @__PURE__ */ new Map();
  for (const rel of options.releases || []) {
    if (rel && rel.id) {
      releaseMap.set(rel.id, rel);
    }
  }
  const hiddenSet = new Set(options.hiddenReleaseIds || []);
  const dates = /* @__PURE__ */ new Set();
  const addReleaseDates = (relId) => {
    if (!relId || hiddenSet.has(relId)) return;
    const rel = releaseMap.get(relId);
    if (!rel) return;
    const span = getReleaseDateSpan(rel);
    if (span.startDate) dates.add(span.startDate);
    if (span.endDate) dates.add(span.endDate);
    for (const m of rel.milestones || []) {
      if (m && m.date) dates.add(m.date);
    }
  };
  for (const p of options.projects || []) {
    if (p && p.releaseId) {
      addReleaseDates(p.releaseId);
    }
  }
  for (const it of options.items || []) {
    if (!it || it.hidden) continue;
    if (it.releaseId) {
      addReleaseDates(it.releaseId);
    }
  }
  return Array.from(dates);
}
function computeTimelineBounds(items, referenceToday, extraDates) {
  const today = startOfDay(referenceToday || /* @__PURE__ */ new Date());
  const validExtraDates = (extraDates || []).filter(
    (d) => d != null && d !== ""
  );
  if ((!items || items.length === 0) && validExtraDates.length === 0) {
    const start = addDays(today, -5);
    const end = addDays(today, 25);
    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: differenceInCalendarDays(end, start) + 1
    };
  }
  const firstExtraParsed = validExtraDates.length > 0 ? typeof validExtraDates[0] === "string" ? parseDateSafe(validExtraDates[0]) : startOfDay(validExtraDates[0]) : today;
  let minDate = items && items.length > 0 ? parseDateSafe(items[0].startDate) : firstExtraParsed;
  let maxDate = items && items.length > 0 ? parseDateSafe(
    "slackEndDate" in items[0] && items[0].slackEndDate || items[0].endDate
  ) : firstExtraParsed;
  if (items && items.length > 0) {
    for (const it of items) {
      const s = parseDateSafe(it.startDate);
      const baseEnd = parseDateSafe(it.endDate);
      const slackEnd = "slackEndDate" in it && it.slackEndDate ? parseDateSafe(it.slackEndDate) : addDays(baseEnd, Math.max(0, Number(it.slack) || 0));
      const cpmFloat = "cpmTotalFloat" in it && typeof it.cpmTotalFloat === "number" ? it.cpmTotalFloat : 0;
      const cpmEnd = addDays(baseEnd, Math.max(0, cpmFloat));
      if (s < minDate) minDate = s;
      if (slackEnd > maxDate) maxDate = slackEnd;
      if (cpmEnd > maxDate) maxDate = cpmEnd;
    }
  }
  if (validExtraDates.length > 0) {
    for (const d of validExtraDates) {
      const parsed = typeof d === "string" ? parseDateSafe(d) : startOfDay(d);
      if (parsed < minDate) minDate = parsed;
      if (parsed > maxDate) maxDate = parsed;
    }
  }
  if (today < minDate) minDate = today;
  if (today > maxDate) maxDate = today;
  const timelineStart = addDays(minDate, -4);
  const timelineEnd = addDays(maxDate, 12);
  const totalDays = Math.max(1, differenceInCalendarDays(timelineEnd, timelineStart) + 1);
  return { timelineStart, timelineEnd, totalDays };
}
function computeFitToProjectScale(items, viewportWidth, options) {
  const todayStr = formatDateISO(startOfDay(options?.referenceToday || /* @__PURE__ */ new Date()));
  const requestedProjectId = options?.projectId || "all";
  const focusEntity = requestedProjectId === "all" ? options?.focusEntity || null : null;
  const validExtraDates = (options?.extraDates || []).filter(
    (d) => d != null && d !== ""
  );
  const collectReleaseDates = (releaseId) => {
    if (!releaseId || !options?.releases) return [];
    const rel = options.releases.find((r) => r.id === releaseId);
    if (!rel) return [];
    const dates = /* @__PURE__ */ new Set();
    const span = getReleaseDateSpan(rel);
    if (rel.startDate) dates.add(rel.startDate);
    if (rel.endDate) dates.add(rel.endDate);
    if (span.startDate) dates.add(span.startDate);
    if (span.endDate) dates.add(span.endDate);
    for (const m of rel.milestones || []) {
      if (m && m.date) dates.add(m.date);
    }
    return Array.from(dates);
  };
  let targetItems = [];
  let targetExtraDates = [];
  let resolvedTargetId = requestedProjectId;
  if (focusEntity) {
    resolvedTargetId = focusEntity.id;
    if (focusEntity.type === "project") {
      const projItems = (items || []).filter((it) => it.projectId === focusEntity.id);
      if (projItems.length > 0) {
        targetItems = projItems;
      } else {
        const proj = (options?.projects || []).find((p) => p.id === focusEntity.id);
        const relDates = collectReleaseDates(proj?.releaseId);
        if (relDates.length > 0) {
          targetExtraDates = relDates;
        } else {
          targetItems = items || [];
          targetExtraDates = validExtraDates;
          resolvedTargetId = "all";
        }
      }
    } else if (focusEntity.type === "release") {
      const releaseProjectIds = new Set(
        (options?.projects || []).filter((p) => p.releaseId === focusEntity.id).map((p) => p.id)
      );
      const relItems = (items || []).filter(
        (it) => it.projectId && releaseProjectIds.has(it.projectId) || it.releaseId === focusEntity.id
      );
      const relDates = collectReleaseDates(focusEntity.id);
      if (relItems.length > 0 || relDates.length > 0) {
        targetItems = relItems;
        targetExtraDates = relDates;
      } else {
        targetItems = items || [];
        targetExtraDates = validExtraDates;
        resolvedTargetId = "all";
      }
    } else if (focusEntity.type === "task") {
      const related = getRelatedFocusEntityIds(
        focusEntity,
        items || [],
        options?.projects || []
      );
      const relatedSet = new Set(related.itemIds);
      const taskItems = (items || []).filter((it) => relatedSet.has(it.id));
      if (taskItems.length > 0) {
        targetItems = taskItems;
      } else {
        targetItems = items || [];
        targetExtraDates = validExtraDates;
        resolvedTargetId = "all";
      }
    }
  } else {
    const filtered = requestedProjectId !== "all" ? (items || []).filter((it) => it.projectId === requestedProjectId) : items || [];
    targetItems = filtered.length > 0 ? filtered : items || [];
    targetExtraDates = validExtraDates;
    resolvedTargetId = filtered.length > 0 ? requestedProjectId : "all";
  }
  if (targetItems.length === 0 && targetExtraDates.length === 0) {
    return {
      dayWidth: DEFAULT_DAY_WIDTH,
      scrollLeft: 0,
      spanDays: 1,
      startDate: todayStr,
      endDate: todayStr,
      targetProjectId: resolvedTargetId
    };
  }
  const firstExtraParsed = targetExtraDates.length > 0 ? typeof targetExtraDates[0] === "string" ? parseDateSafe(targetExtraDates[0]) : startOfDay(targetExtraDates[0]) : parseDateSafe(todayStr);
  let minStart = targetItems.length > 0 ? parseDateSafe(targetItems[0].startDate) : firstExtraParsed;
  let maxEnd = targetItems.length > 0 ? parseDateSafe(targetItems[0].endDate) : firstExtraParsed;
  for (const it of targetItems) {
    const s = parseDateSafe(it.startDate);
    const baseEnd = parseDateSafe(it.endDate);
    const withSlack = addDays(baseEnd, Math.max(0, Number(it.slack) || 0));
    if (s < minStart) minStart = s;
    if (withSlack > maxEnd) maxEnd = withSlack;
  }
  if (targetExtraDates.length > 0) {
    for (const d of targetExtraDates) {
      const parsed = typeof d === "string" ? parseDateSafe(d) : startOfDay(d);
      if (parsed < minStart) minStart = parsed;
      if (parsed > maxEnd) maxEnd = parsed;
    }
  }
  const spanDays = Math.max(1, differenceInCalendarDays(maxEnd, minStart) + 1);
  const safeViewport = Math.max(240, Number(viewportWidth) || 960);
  const paddingPx = options?.horizontalPaddingPx ?? Math.min(140, Math.max(56, Math.round(safeViewport * 0.1)));
  const usableWidth = Math.max(180, safeViewport - paddingPx);
  const rawDayWidth = usableWidth / Math.max(2, spanDays + 2);
  const dayWidth = clampDayWidth(rawDayWidth);
  const resolvedTimelineStart = options?.timelineStart ?? computeTimelineBounds(
    options?.timelineItems ?? items,
    options?.referenceToday,
    options?.timelineExtraDates ?? options?.extraDates
  ).timelineStart;
  const startOffsetDays = differenceInCalendarDays(minStart, resolvedTimelineStart);
  const targetStartX = startOffsetDays * dayWidth;
  const leftMarginPx = Math.max(16, Math.min(48, dayWidth * 1.5));
  const scrollLeft = Math.max(0, Math.round(targetStartX - leftMarginPx));
  return {
    dayWidth,
    scrollLeft,
    spanDays,
    startDate: formatDateISO(minStart),
    endDate: formatDateISO(maxEnd),
    targetProjectId: resolvedTargetId
  };
}
function createRoundedOrthogonalPath(rawPoints, radius = 6) {
  if (!rawPoints || rawPoints.length < 2) return "";
  const points = [rawPoints[0]];
  for (let i = 1; i < rawPoints.length; i++) {
    const prev = points[points.length - 1];
    const curr = rawPoints[i];
    if (Math.abs(curr.x - prev.x) > 0.05 || Math.abs(curr.y - prev.y) > 0.05) {
      points.push(curr);
    }
  }
  if (points.length < 2) return "";
  const collapsed = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = collapsed[collapsed.length - 1];
    const curr = points[i];
    const next = points[i + 1];
    const isCollinearX = Math.abs(prev.x - curr.x) < 0.05 && Math.abs(curr.x - next.x) < 0.05 && (curr.y - prev.y) * (next.y - curr.y) > 0;
    const isCollinearY = Math.abs(prev.y - curr.y) < 0.05 && Math.abs(curr.y - next.y) < 0.05 && (curr.x - prev.x) * (next.x - curr.x) > 0;
    if (!isCollinearX && !isCollinearY) {
      collapsed.push(curr);
    }
  }
  collapsed.push(points[points.length - 1]);
  if (collapsed.length < 2) return "";
  if (collapsed.length === 2) {
    return `M ${collapsed[0].x.toFixed(1)} ${collapsed[0].y.toFixed(1)} L ${collapsed[1].x.toFixed(1)} ${collapsed[1].y.toFixed(1)}`;
  }
  let d = `M ${collapsed[0].x.toFixed(1)} ${collapsed[0].y.toFixed(1)}`;
  for (let i = 1; i < collapsed.length - 1; i++) {
    const prev = collapsed[i - 1];
    const curr = collapsed[i];
    const next = collapsed[i + 1];
    const vIn = { x: curr.x - prev.x, y: curr.y - prev.y };
    const dIn = Math.hypot(vIn.x, vIn.y);
    const vOut = { x: next.x - curr.x, y: next.y - curr.y };
    const dOut = Math.hypot(vOut.x, vOut.y);
    if (dIn < 0.1 || dOut < 0.1) {
      d += ` L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
      continue;
    }
    const uIn = { x: vIn.x / dIn, y: vIn.y / dIn };
    const uOut = { x: vOut.x / dOut, y: vOut.y / dOut };
    const isOrthogonal = Math.abs(uIn.x * uOut.x + uIn.y * uOut.y) < 0.05;
    const r = Math.min(radius, dIn / 2, dOut / 2);
    if (r <= 0.8 || !isOrthogonal) {
      d += ` L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    } else {
      const pBefore = {
        x: curr.x - uIn.x * r,
        y: curr.y - uIn.y * r
      };
      const pAfter = {
        x: curr.x + uOut.x * r,
        y: curr.y + uOut.y * r
      };
      d += ` L ${pBefore.x.toFixed(1)} ${pBefore.y.toFixed(1)}`;
      d += ` Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}, ${pAfter.x.toFixed(1)} ${pAfter.y.toFixed(1)}`;
    }
  }
  const last = collapsed[collapsed.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}
function getRelatedFocusEntityIds(focus, items, projects) {
  const itemMap = /* @__PURE__ */ new Map();
  for (const it of items) itemMap.set(it.id, it);
  const projectMap = /* @__PURE__ */ new Map();
  for (const p of projects) projectMap.set(p.id, p);
  const successorMap = /* @__PURE__ */ new Map();
  for (const it of items) {
    if (it.dependencies) {
      for (const depId of it.dependencies) {
        if (!successorMap.has(depId)) successorMap.set(depId, []);
        successorMap.get(depId).push(it.id);
      }
    }
  }
  const relatedItemIds = /* @__PURE__ */ new Set();
  const relatedProjectIds = /* @__PURE__ */ new Set();
  const relatedReleaseIds = /* @__PURE__ */ new Set();
  if (focus.type === "task") {
    const queue = [focus.id];
    relatedItemIds.add(focus.id);
    while (queue.length > 0) {
      const currentId = queue.shift();
      const it = itemMap.get(currentId);
      if (it) {
        if (it.projectId) {
          relatedProjectIds.add(it.projectId);
          const p = projectMap.get(it.projectId);
          if (p?.releaseId) relatedReleaseIds.add(p.releaseId);
        }
        if (it.dependencies) {
          for (const predId of it.dependencies) {
            if (!relatedItemIds.has(predId)) {
              relatedItemIds.add(predId);
              queue.push(predId);
            }
          }
        }
      }
      const succs = successorMap.get(currentId);
      if (succs) {
        for (const succId of succs) {
          if (!relatedItemIds.has(succId)) {
            relatedItemIds.add(succId);
            queue.push(succId);
          }
        }
      }
    }
  } else if (focus.type === "project") {
    relatedProjectIds.add(focus.id);
    const proj = projectMap.get(focus.id);
    if (proj?.releaseId) relatedReleaseIds.add(proj.releaseId);
    const projectItems = items.filter((it) => it.projectId === focus.id);
    for (const it of projectItems) {
      relatedItemIds.add(it.id);
    }
    for (const it of projectItems) {
      if (it.dependencies) {
        for (const predId of it.dependencies) {
          relatedItemIds.add(predId);
          const pred = itemMap.get(predId);
          if (pred?.projectId) {
            relatedProjectIds.add(pred.projectId);
            const p = projectMap.get(pred.projectId);
            if (p?.releaseId) relatedReleaseIds.add(p.releaseId);
          }
        }
      }
      const succs = successorMap.get(it.id);
      if (succs) {
        for (const succId of succs) {
          relatedItemIds.add(succId);
          const succ = itemMap.get(succId);
          if (succ?.projectId) {
            relatedProjectIds.add(succ.projectId);
            const p = projectMap.get(succ.projectId);
            if (p?.releaseId) relatedReleaseIds.add(p.releaseId);
          }
        }
      }
    }
  } else if (focus.type === "release") {
    relatedReleaseIds.add(focus.id);
    for (const p of projects) {
      if (p.releaseId === focus.id) {
        relatedProjectIds.add(p.id);
      }
    }
    for (const it of items) {
      if (it.projectId && relatedProjectIds.has(it.projectId)) {
        relatedItemIds.add(it.id);
      }
    }
  }
  return {
    itemIds: Array.from(relatedItemIds),
    projectIds: Array.from(relatedProjectIds),
    releaseIds: Array.from(relatedReleaseIds)
  };
}

// src/components/PlatformIcons.tsx
import React from "react";
var AppleIosIcon = ({
  className = "w-3 h-3",
  testId
}) => /* @__PURE__ */ React.createElement(
  "svg",
  {
    "data-testid": testId,
    "data-platform-icon": "iOS",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className,
    "aria-label": "iOS"
  },
  /* @__PURE__ */ React.createElement("path", { d: "M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.33c.64-.78 1.08-1.86.96-2.94-.93.04-2.06.62-2.72 1.4-.58.68-1.1 1.79-.96 2.84 1.04.08 2.08-.52 2.72-1.3Z" })
);
var AndroidIcon = ({
  className = "w-3 h-3",
  testId
}) => /* @__PURE__ */ React.createElement(
  "svg",
  {
    "data-testid": testId,
    "data-platform-icon": "Android",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className,
    "aria-label": "Android"
  },
  /* @__PURE__ */ React.createElement("path", { d: "M17.523 15.341a.96.96 0 0 1-.958-.958.96.96 0 0 1 .958-.958.96.96 0 0 1 .958.958.96.96 0 0 1-.958.958m-11.046 0a.96.96 0 0 1-.958-.958.96.96 0 0 1 .958-.958.96.96 0 0 1 .958.958.96.96 0 0 1-.958.958m11.4-6.02 1.996-3.459a.416.416 0 0 0-.152-.567.416.416 0 0 0-.568.152L17.132 8.95c-1.484-.676-3.153-1.053-5.132-1.053-1.979 0-3.648.377-5.132 1.053L4.847 5.447a.416.416 0 0 0-.568-.152.416.416 0 0 0-.152.567l1.996 3.459C2.688 11.186.443 14.658 0 18.761h24c-.443-4.103-2.688-7.575-6.123-9.44" })
);

// src/components/SearchFilterBar.tsx
import React2, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bookmark,
  Check,
  Filter,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  X
} from "lucide-react";
var DEFAULT_GANTT_SEARCH_FIELDS = {
  name: true,
  description: false,
  assignee: false,
  platform: false,
  predecessors: false,
  displayId: false
};
var SEARCH_FIELD_LABELS = {
  name: "Nombre",
  description: "Descripci\xF3n / Notas",
  assignee: "Equipo / Responsable",
  platform: "Plataforma",
  predecessors: "Predecesoras",
  displayId: "ID / C\xF3digo"
};
function isDefaultSearchFields(fields) {
  return fields.name && !fields.description && !fields.assignee && !fields.platform && !fields.predecessors && !fields.displayId;
}
var SHARED_SAVED_FILTERS_KEY = "gantt_report_saved_filters_v1";
var SearchFilterBar = ({
  testIdPrefix,
  searchQuery,
  onChangeSearchQuery,
  excludeQuery = "",
  onChangeExcludeQuery,
  searchFields,
  onChangeSearchFields,
  selectedType,
  onChangeSelectedType,
  showTypeFilter = true,
  selectedPlatform,
  onChangeSelectedPlatform,
  selectedAlert,
  onChangeSelectedAlert,
  releases,
  selectedRelease,
  onChangeSelectedRelease,
  showSubtasksOnFilter,
  onChangeShowSubtasksOnFilter,
  showSubtasksToggle = true,
  onClearFilters,
  searchPlaceholder = "Buscar proyecto o tarea...",
  searchInputClassName,
  initialShowSearchFieldsMenu = false,
  initialShowAdvancedPanel = false,
  columns,
  onToggleColumn,
  onResetColumns,
  savedFiltersSlot,
  enableBuiltInSavedFilters = false,
  onApplySavedColumns,
  externalSavedFilters,
  externalActiveSavedFilterId,
  onSelectExternalSavedFilter,
  onSaveExternalSavedFilter,
  onDeleteExternalSavedFilter
}) => {
  const [panelOpen, setPanelOpen] = useState(
    initialShowAdvancedPanel || initialShowSearchFieldsMenu
  );
  const [showSaveRow, setShowSaveRow] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const [builtInActiveId, setBuiltInActiveId] = useState(null);
  const [builtInFilters, setBuiltInFilters] = useState(() => {
    if (!enableBuiltInSavedFilters || externalSavedFilters) return [];
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SHARED_SAVED_FILTERS_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
    }
    return [];
  });
  const panelContainerRef = useRef(null);
  useEffect(() => {
    if (!panelOpen) return;
    const handleOutsideClick = (e) => {
      if (panelContainerRef.current && !panelContainerRef.current.contains(e.target)) {
        setPanelOpen(false);
        setShowSaveRow(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setPanelOpen(false);
        setShowSaveRow(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [panelOpen]);
  const optPrefix = testIdPrefix === "reports" ? "reports-" : "";
  const effectiveSavedFilters = externalSavedFilters ?? builtInFilters;
  const effectiveActiveFilterId = externalActiveSavedFilterId !== void 0 ? externalActiveSavedFilterId : builtInActiveId;
  const activeSavedFilterObj = effectiveSavedFilters.find(
    (f) => f.id === effectiveActiveFilterId
  );
  const activeSearchFieldKeys = Object.keys(searchFields).filter((k) => searchFields[k]);
  const toggleSearchField = (field) => {
    const next = { ...searchFields, [field]: !searchFields[field] };
    const anyActive = Object.values(next).some(Boolean);
    if (!anyActive) return;
    onChangeSearchFields(next);
  };
  const visibleColsCount = columns ? columns.filter((c) => c.visible).length : 0;
  const hasHiddenCols = Boolean(columns && visibleColsCount < columns.length);
  let activeCriteriaCount = 0;
  if (excludeQuery.trim()) activeCriteriaCount += 1;
  if (!isDefaultSearchFields(searchFields)) activeCriteriaCount += 1;
  if (showTypeFilter && selectedType !== "all") activeCriteriaCount += 1;
  if (selectedPlatform !== "all") activeCriteriaCount += 1;
  if (selectedAlert !== "all") activeCriteriaCount += 1;
  if (selectedRelease !== "all") activeCriteriaCount += 1;
  if (showSubtasksToggle && showSubtasksOnFilter) activeCriteriaCount += 1;
  if (hasHiddenCols) activeCriteriaCount += 1;
  const hasActiveFilters = Boolean(searchQuery.trim()) || activeCriteriaCount > 0;
  const refreshBuiltInFilters = () => {
    if (externalSavedFilters) return;
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SHARED_SAVED_FILTERS_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setBuiltInFilters(parsed);
      }
    } catch {
    }
  };
  const applyFilter = (f) => {
    if (onSelectExternalSavedFilter) {
      onSelectExternalSavedFilter(f);
      return;
    }
    onChangeSearchQuery(f.searchQuery || "");
    onChangeExcludeQuery?.(f.excludeQuery || "");
    onChangeSearchFields(
      f.searchFields ? { ...DEFAULT_GANTT_SEARCH_FIELDS, ...f.searchFields } : { ...DEFAULT_GANTT_SEARCH_FIELDS }
    );
    onChangeSelectedType(f.selectedType || "all");
    onChangeSelectedPlatform(f.selectedPlatform || "all");
    onChangeSelectedAlert(f.selectedAlert ?? "all");
    onChangeSelectedRelease(f.selectedRelease || "all");
    onChangeShowSubtasksOnFilter(Boolean(f.showSubtasksOnFilter));
    if (f.visibleColKeys && f.visibleColKeys.length > 0 && onApplySavedColumns) {
      onApplySavedColumns(f.visibleColKeys, f.colOrder);
    }
    setBuiltInActiveId(f.id);
  };
  const saveCurrentAsFilter = (name, existingId) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (onSaveExternalSavedFilter) {
      onSaveExternalSavedFilter(trimmed, existingId);
      setShowSaveRow(false);
      setNewFilterName("");
      setPanelOpen(false);
      return;
    }
    const visibleColKeys = columns ? columns.filter((c) => c.visible).map((c) => c.key) : void 0;
    let next;
    let savedId;
    if (existingId) {
      savedId = existingId;
      next = builtInFilters.map(
        (f) => f.id === existingId ? {
          ...f,
          name: trimmed,
          searchQuery,
          excludeQuery: excludeQuery || void 0,
          searchFields: { ...searchFields },
          selectedType,
          selectedPlatform,
          selectedAlert,
          selectedRelease,
          showSubtasksOnFilter,
          ...visibleColKeys ? { visibleColKeys } : {}
        } : f
      );
    } else {
      const created = {
        id: `filter-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: trimmed,
        searchQuery,
        excludeQuery: excludeQuery || void 0,
        searchFields: { ...searchFields },
        selectedType,
        selectedPlatform,
        selectedAlert,
        selectedRelease,
        showSubtasksOnFilter,
        ...visibleColKeys ? { visibleColKeys } : {}
      };
      savedId = created.id;
      next = [...builtInFilters, created];
    }
    setBuiltInFilters(next);
    setBuiltInActiveId(savedId);
    setShowSaveRow(false);
    setNewFilterName("");
    setPanelOpen(false);
    try {
      localStorage.setItem(SHARED_SAVED_FILTERS_KEY, JSON.stringify(next));
    } catch {
    }
  };
  const deleteFilter = (id) => {
    if (onDeleteExternalSavedFilter) {
      onDeleteExternalSavedFilter(id);
      return;
    }
    const next = builtInFilters.filter((f) => f.id !== id);
    setBuiltInFilters(next);
    if (builtInActiveId === id) setBuiltInActiveId(null);
    try {
      localStorage.setItem(SHARED_SAVED_FILTERS_KEY, JSON.stringify(next));
    } catch {
    }
  };
  const activeChips = [];
  if (excludeQuery.trim() && onChangeExcludeQuery) {
    activeChips.push({
      key: "exclude",
      label: `no:"${excludeQuery.trim()}"`,
      onRemove: () => onChangeExcludeQuery("")
    });
  }
  if (!isDefaultSearchFields(searchFields)) {
    activeChips.push({
      key: "fields",
      label: `en:${activeSearchFieldKeys.map((k) => SEARCH_FIELD_LABELS[k].split(" ")[0]).join(",")}`,
      onRemove: () => onChangeSearchFields({ ...DEFAULT_GANTT_SEARCH_FIELDS })
    });
  }
  if (showTypeFilter && selectedType !== "all") {
    activeChips.push({
      key: "type",
      label: `tipo:${selectedType}`,
      onRemove: () => onChangeSelectedType("all")
    });
  }
  if (selectedPlatform !== "all") {
    activeChips.push({
      key: "platform",
      label: `plat:${selectedPlatform}`,
      onRemove: () => onChangeSelectedPlatform("all")
    });
  }
  if (selectedAlert !== "all") {
    activeChips.push({
      key: "alert",
      label: `alerta:Nivel ${selectedAlert}`,
      onRemove: () => onChangeSelectedAlert("all")
    });
  }
  if (selectedRelease !== "all") {
    activeChips.push({
      key: "release",
      label: `release:${selectedRelease}`,
      onRemove: () => onChangeSelectedRelease("all")
    });
  }
  if (showSubtasksToggle && showSubtasksOnFilter) {
    activeChips.push({
      key: "subtasks",
      label: "+ subtareas",
      onRemove: () => onChangeShowSubtasksOnFilter(false)
    });
  }
  if (hasHiddenCols && columns && onResetColumns) {
    activeChips.push({
      key: "cols",
      label: `cols:${visibleColsCount}/${columns.length}`,
      onRemove: onResetColumns
    });
  }
  return /* @__PURE__ */ React2.createElement(
    "div",
    {
      "data-testid": `${testIdPrefix}-unified-filter-bar`,
      className: "flex items-center gap-1.5 min-w-0 flex-wrap"
    },
    /* @__PURE__ */ React2.createElement("div", { ref: panelContainerRef, className: "relative flex items-center shrink-0" }, /* @__PURE__ */ React2.createElement(
      "div",
      {
        className: `flex items-center gap-1 pl-2 pr-1 rounded-full border bg-white dark:bg-zinc-800 h-7 transition ${panelOpen || hasActiveFilters ? "border-[#0C0C09] dark:border-indigo-400 shadow-xs" : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"} ${searchInputClassName || (testIdPrefix === "reports" ? "w-60 sm:w-72" : "w-48 sm:w-64")}`
      },
      /* @__PURE__ */ React2.createElement(Search, { className: "w-3.5 h-3.5 text-zinc-400 shrink-0 pointer-events-none" }),
      /* @__PURE__ */ React2.createElement(
        "input",
        {
          type: "text",
          "data-testid": `${testIdPrefix}-search-input`,
          value: searchQuery,
          onChange: (e) => onChangeSearchQuery(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") setPanelOpen(false);
          },
          placeholder: searchPlaceholder,
          className: "flex-1 min-w-0 bg-transparent text-[11px] font-sans font-normal normal-case text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 outline-none"
        }
      ),
      hasActiveFilters && /* @__PURE__ */ React2.createElement(
        "button",
        {
          type: "button",
          "data-testid": `${testIdPrefix}-search-clear-btn`,
          onClick: () => {
            setBuiltInActiveId(null);
            onClearFilters();
          },
          className: "p-0.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer shrink-0",
          title: "Limpiar b\xFAsqueda y filtros"
        },
        /* @__PURE__ */ React2.createElement(X, { className: "w-3 h-3" })
      ),
      /* @__PURE__ */ React2.createElement(
        "button",
        {
          type: "button",
          "data-testid": `${testIdPrefix}-advanced-filters-btn`,
          onClick: () => {
            if (!panelOpen) refreshBuiltInFilters();
            setPanelOpen((prev) => !prev);
            setShowSaveRow(false);
          },
          className: `relative w-5.5 h-5.5 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${panelOpen || activeCriteriaCount > 0 ? "bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-800 dark:hover:text-zinc-100"}`,
          title: "Mostrar opciones de b\xFAsqueda, filtros y columnas",
          "aria-label": "Opciones de b\xFAsqueda y filtros"
        },
        /* @__PURE__ */ React2.createElement(SlidersHorizontal, { className: "w-3 h-3" }),
        activeCriteriaCount > 0 && /* @__PURE__ */ React2.createElement(
          "span",
          {
            "data-testid": `${testIdPrefix}-active-filters-count`,
            className: "absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-mono font-bold flex items-center justify-center leading-none"
          },
          activeCriteriaCount
        )
      )
    ), testIdPrefix === "reports" && /* @__PURE__ */ React2.createElement(
      "select",
      {
        "data-testid": "reports-platform-select",
        value: selectedPlatform,
        onChange: (e) => onChangeSelectedPlatform(e.target.value),
        className: "sr-only",
        tabIndex: -1,
        "aria-hidden": "true"
      },
      /* @__PURE__ */ React2.createElement("option", { value: "all" }, "Plat."),
      /* @__PURE__ */ React2.createElement("option", { value: "iOS" }, "iOS"),
      /* @__PURE__ */ React2.createElement("option", { value: "Android" }, "Android"),
      /* @__PURE__ */ React2.createElement("option", { value: "iOS/Android" }, "iOS/Android")
    ), /* @__PURE__ */ React2.createElement(
      "div",
      {
        "data-testid": `${testIdPrefix}-advanced-filters-panel`,
        className: `absolute left-0 top-full mt-1.5 z-50 w-[440px] max-w-[calc(100vw-24px)] rounded-[8px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl p-4 text-[11px] font-sans normal-case ${panelOpen ? "flex flex-col gap-3" : "hidden"}`
      },
      /* @__PURE__ */ React2.createElement("div", { className: "flex items-center justify-between pb-2 border-b border-[#E2E2DC] dark:border-zinc-800" }, /* @__PURE__ */ React2.createElement("span", { className: "font-bold text-xs text-[#0C0C09] dark:text-zinc-100 flex items-center gap-1.5" }, /* @__PURE__ */ React2.createElement(SlidersHorizontal, { className: "w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" }), /* @__PURE__ */ React2.createElement("span", null, activeSavedFilterObj ? `Editando filtro: "${activeSavedFilterObj.name}"` : "B\xFAsqueda avanzada y filtros")), /* @__PURE__ */ React2.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            setPanelOpen(false);
            setShowSaveRow(false);
          },
          className: "p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
        },
        /* @__PURE__ */ React2.createElement(X, { className: "w-3.5 h-3.5" })
      )),
      /* @__PURE__ */ React2.createElement("div", { className: "grid grid-cols-12 items-center gap-2" }, /* @__PURE__ */ React2.createElement("label", { className: "col-span-4 text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400" }, "Contiene"), /* @__PURE__ */ React2.createElement(
        "input",
        {
          type: "text",
          "data-testid": `${testIdPrefix}-panel-query-input`,
          value: searchQuery,
          onChange: (e) => onChangeSearchQuery(e.target.value),
          placeholder: "Nombre, c\xF3digo, equipo...",
          className: "col-span-8 px-2 py-1 bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:border-[#0C0C09] dark:focus:border-indigo-400 outline-none text-xs text-zinc-800 dark:text-zinc-100"
        }
      )),
      onChangeExcludeQuery && /* @__PURE__ */ React2.createElement("div", { className: "grid grid-cols-12 items-center gap-2" }, /* @__PURE__ */ React2.createElement("label", { className: "col-span-4 text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400" }, "No contiene"), /* @__PURE__ */ React2.createElement(
        "input",
        {
          type: "text",
          "data-testid": `${testIdPrefix}-exclude-input`,
          value: excludeQuery,
          onChange: (e) => onChangeExcludeQuery(e.target.value),
          placeholder: "Excluir palabras...",
          className: "col-span-8 px-2 py-1 bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:border-[#0C0C09] dark:focus:border-indigo-400 outline-none text-xs text-zinc-800 dark:text-zinc-100"
        }
      )),
      /* @__PURE__ */ React2.createElement("div", { className: "grid grid-cols-12 items-start gap-2" }, /* @__PURE__ */ React2.createElement("div", { className: "col-span-4 pt-0.5 space-y-0.5" }, /* @__PURE__ */ React2.createElement(
        "span",
        {
          "data-testid": `${testIdPrefix}-search-fields-btn`,
          className: "block text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400"
        },
        "En: ",
        searchFieldsSummaryLabel
      ), /* @__PURE__ */ React2.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React2.createElement(
        "button",
        {
          type: "button",
          "data-testid": `${testIdPrefix}-search-fields-reset-btn`,
          onClick: () => onChangeSearchFields({ ...DEFAULT_GANTT_SEARCH_FIELDS }),
          className: "text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
        },
        "Nombre"
      ), /* @__PURE__ */ React2.createElement(
        "button",
        {
          type: "button",
          "data-testid": `${testIdPrefix}-search-fields-all-btn`,
          onClick: () => onChangeSearchFields({
            name: true,
            description: true,
            assignee: true,
            platform: true,
            predecessors: true,
            displayId: true
          }),
          className: "text-[9px] font-semibold text-zinc-500 hover:underline cursor-pointer"
        },
        "Todos"
      ))), /* @__PURE__ */ React2.createElement(
        "div",
        {
          "data-testid": `${testIdPrefix}-search-fields-menu`,
          className: "col-span-8 grid grid-cols-2 gap-1"
        },
        Object.keys(SEARCH_FIELD_LABELS).map(
          (fieldKey) => {
            const isChecked = searchFields[fieldKey];
            const isOnlyActive = isChecked && activeSearchFieldKeys.length <= 1;
            return /* @__PURE__ */ React2.createElement(
              "label",
              {
                key: fieldKey,
                className: `flex items-center gap-1.5 text-[10px] font-medium ${isOnlyActive ? "text-zinc-400 cursor-not-allowed" : "text-zinc-700 dark:text-zinc-200 cursor-pointer"}`
              },
              /* @__PURE__ */ React2.createElement(
                "input",
                {
                  type: "checkbox",
                  "data-testid": `${testIdPrefix}-search-field-checkbox-${fieldKey}`,
                  checked: isChecked,
                  disabled: isOnlyActive,
                  onChange: () => toggleSearchField(fieldKey),
                  className: "w-3 h-3 rounded border-zinc-300 accent-indigo-600 cursor-pointer disabled:cursor-not-allowed"
                }
              ),
              /* @__PURE__ */ React2.createElement("span", { className: "truncate" }, SEARCH_FIELD_LABELS[fieldKey])
            );
          }
        )
      )),
      showTypeFilter && /* @__PURE__ */ React2.createElement("div", { className: "grid grid-cols-12 items-center gap-2" }, /* @__PURE__ */ React2.createElement(
        "span",
        {
          "data-testid": `${testIdPrefix}-type-filter`,
          "data-selected-type": selectedType,
          className: "col-span-4 text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400 flex items-center gap-1"
        },
        /* @__PURE__ */ React2.createElement(Filter, { className: "w-3 h-3" }),
        /* @__PURE__ */ React2.createElement("span", null, "Tipo")
      ), /* @__PURE__ */ React2.createElement(
        "div",
        {
          "data-testid": `${testIdPrefix}-type-filter-menu`,
          className: "col-span-8 flex flex-wrap gap-1"
        },
        [
          { value: "all", label: "Todos" },
          { value: "RELEASE", label: "Release" },
          { value: "PROYECTO", label: "Proyecto" },
          { value: "TAREA", label: "Tarea" },
          { value: "HITO", label: "Hito" }
        ].map((opt) => /* @__PURE__ */ React2.createElement(
          "button",
          {
            key: opt.value,
            type: "button",
            "data-testid": `${testIdPrefix}-type-filter-option-${opt.value}`,
            onClick: () => onChangeSelectedType(opt.value),
            className: `px-2 py-0.5 rounded-full border text-[10px] font-medium cursor-pointer transition ${selectedType === opt.value ? "border-[#0C0C09] bg-[#0C0C09] text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-[#0C0C09]" : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`
          },
          opt.label
        ))
      )),
      /* @__PURE__ */ React2.createElement("div", { className: "grid grid-cols-12 items-center gap-2" }, /* @__PURE__ */ React2.createElement(
        "span",
        {
          "data-testid": `${testIdPrefix}-platform-filter`,
          "data-selected-platform": selectedPlatform,
          className: "col-span-4 text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400 flex items-center gap-1"
        },
        selectedPlatform === "all" ? /* @__PURE__ */ React2.createElement(React2.Fragment, null, /* @__PURE__ */ React2.createElement(Smartphone, { className: "w-3 h-3" }), /* @__PURE__ */ React2.createElement("span", null, "Plat.")) : selectedPlatform === "iOS" ? /* @__PURE__ */ React2.createElement(React2.Fragment, null, /* @__PURE__ */ React2.createElement(
          AppleIosIcon,
          {
            testId: `${optPrefix}active-filter-icon-ios`,
            className: "w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
          }
        ), /* @__PURE__ */ React2.createElement("span", null, "Plat.")) : selectedPlatform === "Android" ? /* @__PURE__ */ React2.createElement(React2.Fragment, null, /* @__PURE__ */ React2.createElement(
          AndroidIcon,
          {
            testId: `${optPrefix}active-filter-icon-android`,
            className: "w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
          }
        ), /* @__PURE__ */ React2.createElement("span", null, "Plat.")) : /* @__PURE__ */ React2.createElement(React2.Fragment, null, /* @__PURE__ */ React2.createElement(
          AppleIosIcon,
          {
            testId: `${optPrefix}active-filter-icon-both-ios`,
            className: "w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
          }
        ), /* @__PURE__ */ React2.createElement(
          AndroidIcon,
          {
            testId: `${optPrefix}active-filter-icon-both-android`,
            className: "w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
          }
        ), /* @__PURE__ */ React2.createElement("span", null, "Plat."))
      ), /* @__PURE__ */ React2.createElement(
        "div",
        {
          "data-testid": `${testIdPrefix}-platform-filter-menu`,
          className: "col-span-8 flex items-center gap-1.5"
        },
        /* @__PURE__ */ React2.createElement(
          "button",
          {
            type: "button",
            "data-testid": `${optPrefix}platform-filter-option-iOS`,
            onClick: () => onChangeSelectedPlatform(selectedPlatform === "iOS" ? "all" : "iOS"),
            className: `flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-medium cursor-pointer transition ${selectedPlatform === "iOS" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300" : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100"}`,
            title: "iOS"
          },
          /* @__PURE__ */ React2.createElement(
            AppleIosIcon,
            {
              testId: `${optPrefix}filter-option-icon-ios`,
              className: "w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
            }
          )
        ),
        /* @__PURE__ */ React2.createElement(
          "button",
          {
            type: "button",
            "data-testid": `${optPrefix}platform-filter-option-Android`,
            onClick: () => onChangeSelectedPlatform(selectedPlatform === "Android" ? "all" : "Android"),
            className: `flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-medium cursor-pointer transition ${selectedPlatform === "Android" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300" : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100"}`,
            title: "Android"
          },
          /* @__PURE__ */ React2.createElement(
            AndroidIcon,
            {
              testId: `${optPrefix}filter-option-icon-android`,
              className: "w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
            }
          )
        ),
        /* @__PURE__ */ React2.createElement(
          "button",
          {
            type: "button",
            "data-testid": `${optPrefix}platform-filter-option-iOS/Android`,
            onClick: () => onChangeSelectedPlatform(
              selectedPlatform === "iOS/Android" ? "all" : "iOS/Android"
            ),
            className: `flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-medium cursor-pointer transition ${selectedPlatform === "iOS/Android" ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300" : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100"}`,
            title: "iOS/Android"
          },
          /* @__PURE__ */ React2.createElement(
            AppleIosIcon,
            {
              testId: `${optPrefix}filter-option-icon-both-ios`,
              className: "w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
            }
          ),
          /* @__PURE__ */ React2.createElement(
            AndroidIcon,
            {
              testId: `${optPrefix}filter-option-icon-both-android`,
              className: "w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
            }
          )
        )
      )),
      /* @__PURE__ */ React2.createElement("div", { className: "grid grid-cols-12 items-center gap-2" }, /* @__PURE__ */ React2.createElement(
        "span",
        {
          "data-testid": `${testIdPrefix}-alert-filter`,
          "data-selected-alert": selectedAlert,
          className: "col-span-4 text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400 flex items-center gap-1"
        },
        /* @__PURE__ */ React2.createElement(AlertTriangle, { className: "w-3 h-3" }),
        /* @__PURE__ */ React2.createElement("span", null, "Alerta")
      ), /* @__PURE__ */ React2.createElement(
        "div",
        {
          "data-testid": `${testIdPrefix}-alert-filter-menu`,
          className: "col-span-8 flex flex-wrap gap-1"
        },
        /* @__PURE__ */ React2.createElement(
          "button",
          {
            type: "button",
            "data-testid": `${optPrefix}alert-filter-option-all`,
            onClick: () => onChangeSelectedAlert("all"),
            className: `px-2 py-0.5 rounded-full border text-[10px] font-medium cursor-pointer transition ${selectedAlert === "all" ? "border-[#0C0C09] bg-[#0C0C09] text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-[#0C0C09]" : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"}`
          },
          "Todas"
        ),
        [
          { value: 0, label: "0", dot: "bg-zinc-400" },
          { value: 1, label: "1", dot: "bg-amber-500" },
          { value: 2, label: "2", dot: "bg-orange-500" },
          { value: 3, label: "3", dot: "bg-rose-500" }
        ].map((opt) => /* @__PURE__ */ React2.createElement(
          "button",
          {
            key: opt.value,
            type: "button",
            "data-testid": `${optPrefix}alert-filter-option-${opt.value}`,
            onClick: () => onChangeSelectedAlert(opt.value),
            className: `flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium cursor-pointer transition ${selectedAlert === opt.value ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300" : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"}`
          },
          /* @__PURE__ */ React2.createElement("span", { className: `w-1.5 h-1.5 rounded-full ${opt.dot}` }),
          /* @__PURE__ */ React2.createElement("span", null, `Nivel ${opt.label}`)
        ))
      )),
      releases.length > 0 && /* @__PURE__ */ React2.createElement("div", { className: "grid grid-cols-12 items-center gap-2" }, /* @__PURE__ */ React2.createElement("label", { className: "col-span-4 text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400" }, "Release"), /* @__PURE__ */ React2.createElement(
        "select",
        {
          "data-testid": `${testIdPrefix}-release-select`,
          value: selectedRelease,
          onChange: (e) => onChangeSelectedRelease(e.target.value),
          "aria-label": "Filtrar por release",
          className: "col-span-8 px-2 py-1 rounded-[4px] border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
        },
        /* @__PURE__ */ React2.createElement("option", { value: "all" }, "Todas las releases"),
        releases.map((r) => /* @__PURE__ */ React2.createElement("option", { key: r.id, value: r.code }, r.code))
      )),
      showSubtasksToggle && /* @__PURE__ */ React2.createElement("div", { className: "grid grid-cols-12 items-center gap-2" }, /* @__PURE__ */ React2.createElement("span", { className: "col-span-4 text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400" }, "Opciones"), /* @__PURE__ */ React2.createElement(
        "label",
        {
          "data-testid": `${testIdPrefix}-show-subtasks-label`,
          className: "col-span-8 inline-flex items-center gap-2 text-[11px] text-zinc-700 dark:text-zinc-200 cursor-pointer select-none"
        },
        /* @__PURE__ */ React2.createElement(
          "input",
          {
            type: "checkbox",
            "data-testid": `${testIdPrefix}-show-subtasks-checkbox`,
            checked: showSubtasksOnFilter,
            onChange: (e) => onChangeShowSubtasksOnFilter(e.target.checked),
            className: "w-3.5 h-3.5 rounded border-zinc-300 accent-indigo-600 cursor-pointer"
          }
        ),
        /* @__PURE__ */ React2.createElement("span", null, "Incluir subtareas de proyectos coincidentes")
      )),
      columns && columns.length > 0 && onToggleColumn && /* @__PURE__ */ React2.createElement(
        "div",
        {
          "data-testid": `${testIdPrefix}-panel-columns-section`,
          className: "grid grid-cols-12 items-start gap-2 pt-2 border-t border-[#E2E2DC] dark:border-zinc-800"
        },
        /* @__PURE__ */ React2.createElement("div", { className: "col-span-4 pt-0.5 space-y-0.5" }, /* @__PURE__ */ React2.createElement("span", { className: "block text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400" }, "Columnas (", visibleColsCount, "/", columns.length, ")"), onResetColumns && /* @__PURE__ */ React2.createElement(
          "button",
          {
            type: "button",
            onClick: onResetColumns,
            className: "text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          },
          "Seleccionar todas"
        )),
        /* @__PURE__ */ React2.createElement("div", { className: "col-span-8 flex flex-wrap gap-1 max-h-28 overflow-y-auto" }, columns.map((col) => /* @__PURE__ */ React2.createElement(
          "button",
          {
            key: col.key,
            type: "button",
            "data-testid": `${testIdPrefix}-panel-col-pill-${col.key}`,
            onClick: () => onToggleColumn(col.key),
            className: `px-2 py-0.5 rounded-full border text-[10px] font-medium cursor-pointer transition ${col.visible ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300" : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"}`
          },
          col.visible ? "\u2713 " : "",
          col.label
        )))
      ),
      showSaveRow && /* @__PURE__ */ React2.createElement("div", { className: "pt-2 border-t border-[#E2E2DC] dark:border-zinc-800 flex items-center gap-1.5" }, /* @__PURE__ */ React2.createElement(
        "input",
        {
          type: "text",
          "data-testid": `${testIdPrefix}-panel-save-filter-input`,
          value: newFilterName,
          onChange: (e) => setNewFilterName(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter" && newFilterName.trim()) {
              e.preventDefault();
              saveCurrentAsFilter(newFilterName);
            }
          },
          placeholder: "Nombre del filtro guardado...",
          className: "flex-1 px-2.5 py-1 rounded-[4px] border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs outline-none focus:border-indigo-500"
        }
      ), /* @__PURE__ */ React2.createElement(
        "button",
        {
          type: "button",
          "data-testid": `${testIdPrefix}-panel-save-filter-confirm`,
          onClick: () => saveCurrentAsFilter(newFilterName),
          disabled: !newFilterName.trim(),
          className: "px-2.5 py-1 rounded-[4px] bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
        },
        "Guardar"
      ), /* @__PURE__ */ React2.createElement(
        "button",
        {
          type: "button",
          onClick: () => setShowSaveRow(false),
          className: "px-2 py-1 rounded-[4px] border border-zinc-300 dark:border-zinc-700 text-[11px] cursor-pointer"
        },
        "Cancelar"
      )),
      /* @__PURE__ */ React2.createElement("div", { className: "pt-2.5 border-t border-[#E2E2DC] dark:border-zinc-800 flex items-center justify-between gap-2" }, /* @__PURE__ */ React2.createElement(
        "button",
        {
          type: "button",
          "data-testid": `${testIdPrefix}-clear-filters-btn`,
          onClick: () => {
            setBuiltInActiveId(null);
            onClearFilters();
          },
          className: "text-[11px] font-medium text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white cursor-pointer"
        },
        "Restablecer"
      ), /* @__PURE__ */ React2.createElement("div", { className: "flex items-center gap-1.5" }, activeSavedFilterObj && /* @__PURE__ */ React2.createElement(
        "button",
        {
          type: "button",
          "data-testid": `${testIdPrefix}-panel-update-filter-btn`,
          onClick: () => saveCurrentAsFilter(activeSavedFilterObj.name, activeSavedFilterObj.id),
          className: "px-2.5 py-1 rounded-[4px] border border-indigo-500 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-[11px] font-semibold cursor-pointer"
        },
        `Actualizar "${activeSavedFilterObj.name}"`
      ), (enableBuiltInSavedFilters || onSaveExternalSavedFilter) && /* @__PURE__ */ React2.createElement(
        "button",
        {
          type: "button",
          "data-testid": `${testIdPrefix}-panel-create-filter-btn`,
          onClick: () => setShowSaveRow(true),
          className: "px-2.5 py-1 rounded-[4px] text-[#6B6B66] dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
        },
        /* @__PURE__ */ React2.createElement(Plus, { className: "w-3 h-3" }),
        /* @__PURE__ */ React2.createElement("span", null, "Crear filtro")
      ), /* @__PURE__ */ React2.createElement(
        "button",
        {
          type: "button",
          "data-testid": `${testIdPrefix}-panel-apply-btn`,
          onClick: () => {
            setPanelOpen(false);
            setShowSaveRow(false);
          },
          className: "px-3.5 py-1 rounded-full bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[11px] font-semibold cursor-pointer"
        },
        "Buscar"
      )))
    )),
    savedFiltersSlot,
    !savedFiltersSlot && enableBuiltInSavedFilters && /* @__PURE__ */ React2.createElement(
      "button",
      {
        type: "button",
        "data-testid": `${testIdPrefix}-saved-filters-btn`,
        onClick: () => {
          refreshBuiltInFilters();
          setPanelOpen(true);
          setShowSaveRow(true);
        },
        className: "flex items-center gap-1 px-2 py-0.5 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer h-6.5 shrink-0",
        title: "Guardar b\xFAsqueda actual como filtro"
      },
      /* @__PURE__ */ React2.createElement(Bookmark, { className: "w-3 h-3 text-indigo-600 dark:text-indigo-400" }),
      /* @__PURE__ */ React2.createElement("span", null, "Guardar filtro")
    ),
    effectiveSavedFilters.length > 0 && /* @__PURE__ */ React2.createElement("div", { className: "flex items-center gap-1 flex-wrap" }, effectiveSavedFilters.map((f) => {
      const isAct = f.id === effectiveActiveFilterId;
      return /* @__PURE__ */ React2.createElement(
        "div",
        {
          key: f.id,
          "data-testid": `${testIdPrefix}-saved-pill-${f.id}`,
          className: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] h-6 transition ${isAct ? "border-indigo-600 bg-indigo-600 text-white font-semibold" : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`
        },
        /* @__PURE__ */ React2.createElement(
          "button",
          {
            type: "button",
            onClick: () => applyFilter(f),
            className: "cursor-pointer truncate max-w-[120px] flex items-center gap-1",
            title: `Aplicar filtro "${f.name}"`
          },
          isAct && /* @__PURE__ */ React2.createElement(Check, { className: "w-2.5 h-2.5 shrink-0" }),
          /* @__PURE__ */ React2.createElement("span", { className: "truncate" }, f.name)
        ),
        /* @__PURE__ */ React2.createElement(
          "button",
          {
            type: "button",
            "data-testid": `${testIdPrefix}-saved-pill-edit-${f.id}`,
            onClick: (e) => {
              e.stopPropagation();
              applyFilter(f);
              setPanelOpen(true);
              setShowSaveRow(false);
            },
            className: "opacity-75 hover:opacity-100 cursor-pointer p-0.5",
            title: "Editar todos los criterios de este filtro"
          },
          /* @__PURE__ */ React2.createElement(Pencil, { className: "w-2.5 h-2.5" })
        ),
        /* @__PURE__ */ React2.createElement(
          "button",
          {
            type: "button",
            onClick: (e) => {
              e.stopPropagation();
              deleteFilter(f.id);
            },
            className: "opacity-75 hover:opacity-100 cursor-pointer p-0.5",
            title: "Eliminar filtro guardado"
          },
          /* @__PURE__ */ React2.createElement(Trash2, { className: "w-2.5 h-2.5" })
        )
      );
    })),
    activeChips.length > 0 && /* @__PURE__ */ React2.createElement(
      "div",
      {
        "data-testid": `${testIdPrefix}-active-filter-chips`,
        className: "flex items-center gap-1 flex-wrap"
      },
      activeChips.map((chip) => /* @__PURE__ */ React2.createElement(
        "span",
        {
          key: chip.key,
          className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] h-6"
        },
        /* @__PURE__ */ React2.createElement("span", null, chip.label),
        /* @__PURE__ */ React2.createElement(
          "button",
          {
            type: "button",
            onClick: chip.onRemove,
            className: "hover:text-rose-600 cursor-pointer",
            title: "Quitar criterio"
          },
          /* @__PURE__ */ React2.createElement(X, { className: "w-2.5 h-2.5" })
        )
      ))
    )
  );
};

// src/components/ProjectLockedAlertModal.tsx
import React3, { useEffect as useEffect2 } from "react";
import { Lock, ShieldAlert, Unlock, X as X2 } from "lucide-react";
var ProjectLockedAlertModal = ({
  project,
  attemptedAction,
  onUnlock,
  onClose
}) => {
  useEffect2(() => {
    if (!project || typeof window === "undefined") return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [project, onClose]);
  if (!project) return null;
  return /* @__PURE__ */ React3.createElement(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "project-locked-alert-title",
      "data-testid": "project-locked-alert-modal",
      "data-locked-project-id": project.id,
      onClick: (e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          onClose();
        }
      },
      onMouseDown: (e) => e.stopPropagation(),
      className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
    },
    /* @__PURE__ */ React3.createElement(
      "div",
      {
        onClick: (e) => e.stopPropagation(),
        onMouseDown: (e) => e.stopPropagation(),
        className: "w-full max-w-md bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[6px] shadow-2xl overflow-hidden text-[#0C0C09] dark:text-zinc-100"
      },
      /* @__PURE__ */ React3.createElement("div", { className: "flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800/70" }, /* @__PURE__ */ React3.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React3.createElement("span", { className: "p-1.5 rounded-[4px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30" }, /* @__PURE__ */ React3.createElement(Lock, { className: "w-4 h-4" })), /* @__PURE__ */ React3.createElement("div", null, /* @__PURE__ */ React3.createElement(
        "h3",
        {
          id: "project-locked-alert-title",
          className: "font-display font-bold text-sm text-amber-950 dark:text-amber-100"
        },
        "Proyecto bloqueado"
      ), /* @__PURE__ */ React3.createElement("p", { className: "text-[11px] font-mono text-amber-800 dark:text-amber-300" }, "Protecci\xF3n activa en el cronograma"))), /* @__PURE__ */ React3.createElement(
        "button",
        {
          type: "button",
          onClick: onClose,
          "aria-label": "Cerrar aviso",
          className: "p-1 rounded-[4px] text-amber-800 dark:text-amber-300 hover:bg-amber-500/15 transition cursor-pointer"
        },
        /* @__PURE__ */ React3.createElement(X2, { className: "w-4 h-4" })
      )),
      /* @__PURE__ */ React3.createElement("div", { className: "p-4 space-y-3 text-xs leading-relaxed" }, /* @__PURE__ */ React3.createElement("div", { className: "flex items-start gap-2.5 p-2.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-800/70 border border-[#E2E2DC] dark:border-zinc-700" }, /* @__PURE__ */ React3.createElement(ShieldAlert, { className: "w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" }), /* @__PURE__ */ React3.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React3.createElement("p", { className: "text-[#0C0C09] dark:text-zinc-100" }, "El proyecto ", /* @__PURE__ */ React3.createElement("strong", null, "\xAB", project.name, "\xBB"), " est\xE1 bloqueado para evitar movimientos o modificaciones por error en el cronograma."), attemptedAction && /* @__PURE__ */ React3.createElement("p", { className: "text-[11px] font-mono text-[#6B6B66] dark:text-zinc-400" }, "Acci\xF3n interceptada: ", attemptedAction))), /* @__PURE__ */ React3.createElement("p", { className: "text-[11px] text-[#6B6B66] dark:text-zinc-400" }, "\xBFQuieres desbloquear este proyecto ahora para poder mover o editar sus elementos?")),
      /* @__PURE__ */ React3.createElement("div", { className: "flex items-center justify-end gap-2 px-4 py-3 bg-[#F4F4F1]/70 dark:bg-zinc-950/60 border-t border-[#E2E2DC] dark:border-zinc-800" }, /* @__PURE__ */ React3.createElement(
        "button",
        {
          type: "button",
          "data-testid": "cancel-unlock-project-btn",
          onClick: onClose,
          className: "px-3 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-[#F4F4F1] dark:hover:bg-zinc-700 text-xs font-medium text-[#0C0C09] dark:text-zinc-200 transition cursor-pointer"
        },
        "Mantener bloqueado"
      ), /* @__PURE__ */ React3.createElement(
        "button",
        {
          type: "button",
          "data-testid": "confirm-unlock-project-btn",
          onClick: () => onUnlock(project),
          className: "px-3.5 py-1.5 rounded-[4px] bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
        },
        /* @__PURE__ */ React3.createElement(Unlock, { className: "w-3.5 h-3.5" }),
        /* @__PURE__ */ React3.createElement("span", null, "Desbloquear proyecto")
      ))
    )
  );
};

// src/components/GanttWorkspace.tsx
function computePolylineMidpoint(pts) {
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length === 1) return pts[0];
  let totalLen = 0;
  const segLens = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segLens.push(len);
    totalLen += len;
  }
  if (totalLen <= 0) return pts[0];
  const half = totalLen / 2;
  let acc = 0;
  for (let i = 0; i < segLens.length; i++) {
    const segLen = segLens[i];
    if (acc + segLen >= half && segLen > 0) {
      const t = (half - acc) / segLen;
      return {
        x: Math.round((pts[i].x + (pts[i + 1].x - pts[i].x) * t) * 10) / 10,
        y: Math.round((pts[i].y + (pts[i + 1].y - pts[i].y) * t) * 10) / 10
      };
    }
    acc += segLen;
  }
  return pts[pts.length - 1];
}
var ROW_HEIGHT = 50;
var HEADER_HEIGHT = 60;
var COLOR_STYLES = {
  indigo: {
    barBg: "bg-[#4F46E5] text-white border border-[#4338CA] dark:bg-[#6366F1] dark:border-[#4F46E5]",
    fillBg: "bg-white/25 dark:bg-black/25",
    border: "border-[#4338CA] dark:border-[#4F46E5]",
    text: "text-white",
    badge: "bg-[#4F46E5] text-white",
    groupRowBg: "bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white",
    groupBadgeBg: "bg-[#4F46E5] text-white border border-[#4338CA]",
    diamondBg: "bg-[#4F46E5] text-white border border-[#4338CA]",
    diamondPill: "bg-[#4F46E5] text-white border border-[#4338CA]",
    diamondText: "text-[#4F46E5] dark:text-[#818CF8]",
    guideLine: "border-[#4F46E5]",
    guidePill: "bg-[#4F46E5] text-white font-mono rounded-[2px]"
  },
  blue: {
    barBg: "bg-[#2563EB] text-white border border-[#1D4ED8] dark:bg-[#3B82F6] dark:border-[#2563EB]",
    fillBg: "bg-white/25 dark:bg-black/25",
    border: "border-[#1D4ED8] dark:border-[#2563EB]",
    text: "text-white",
    badge: "bg-[#2563EB] text-white",
    groupRowBg: "bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white",
    groupBadgeBg: "bg-[#2563EB] text-white border border-[#1D4ED8]",
    diamondBg: "bg-[#2563EB] text-white border border-[#1D4ED8]",
    diamondPill: "bg-[#2563EB] text-white border border-[#1D4ED8]",
    diamondText: "text-[#2563EB] dark:text-[#60A5FA]",
    guideLine: "border-[#2563EB]",
    guidePill: "bg-[#2563EB] text-white font-mono rounded-[2px]"
  },
  emerald: {
    barBg: "bg-[#16A34A] text-white border border-[#15803D] dark:bg-[#22C55E] dark:border-[#16A34A]",
    fillBg: "bg-white/25 dark:bg-black/25",
    border: "border-[#15803D] dark:border-[#16A34A]",
    text: "text-white",
    badge: "bg-[#16A34A] text-white",
    groupRowBg: "bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white",
    groupBadgeBg: "bg-[#16A34A] text-white border border-[#15803D]",
    diamondBg: "bg-emerald-600 text-white border border-[#0C0C09]",
    diamondPill: "bg-emerald-600 text-white border border-emerald-500/30",
    diamondText: "text-emerald-600",
    guideLine: "border-emerald-500/60",
    guidePill: "bg-emerald-600 text-white font-mono rounded-[2px]"
  },
  amber: {
    barBg: "bg-[#D97706] text-white border border-[#B45309] dark:bg-[#F59E0B] dark:border-[#D97706]",
    fillBg: "bg-white/25 dark:bg-black/25",
    border: "border-[#B45309] dark:border-[#D97706]",
    text: "text-white",
    badge: "bg-[#D97706] text-white",
    groupRowBg: "bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white",
    groupBadgeBg: "bg-[#D97706] text-white border border-[#B45309]",
    diamondBg: "bg-amber-500 border border-[#0C0C09]",
    diamondPill: "bg-[#D97706] text-white border border-[#D97706]",
    diamondText: "text-amber-500",
    guideLine: "border-amber-500/60",
    guidePill: "bg-[#D97706] text-white font-mono rounded-[2px]"
  },
  rose: {
    barBg: "bg-[#DC2626] text-white border border-[#B91C1C] dark:bg-[#EF4444] dark:border-[#DC2626]",
    fillBg: "bg-white/25 dark:bg-black/25",
    border: "border-[#B91C1C] dark:border-[#DC2626]",
    text: "text-white",
    badge: "bg-[#DC2626] text-white",
    groupRowBg: "bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white",
    groupBadgeBg: "bg-[#DC2626] text-white border border-[#B91C1C]",
    diamondBg: "bg-[#DC2626] text-white border border-[#B91C1C]",
    diamondPill: "bg-[#DC2626] text-white border border-[#B91C1C]",
    diamondText: "text-[#DC2626] dark:text-[#F87171]",
    guideLine: "border-[#DC2626]",
    guidePill: "bg-[#DC2626] text-white font-mono rounded-[2px]"
  },
  violet: {
    barBg: "bg-[#7C3AED] text-white border border-[#6D28D9] dark:bg-[#8B5CF6] dark:border-[#7C3AED]",
    fillBg: "bg-white/25 dark:bg-black/25",
    border: "border-[#6D28D9] dark:border-[#7C3AED]",
    text: "text-white",
    badge: "bg-[#7C3AED] text-white",
    groupRowBg: "bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white",
    groupBadgeBg: "bg-[#7C3AED] text-white border border-[#6D28D9]",
    diamondBg: "bg-violet-600 border border-[#0C0C09]",
    diamondPill: "bg-[#312C85] text-white border border-[#312C85]",
    diamondText: "text-violet-600",
    guideLine: "border-violet-500/60",
    guidePill: "bg-[#312C85] text-white font-mono rounded-[2px]"
  },
  cyan: {
    barBg: "bg-[#0891B2] text-white border border-[#0E7490] dark:bg-[#06B6D4] dark:border-[#0891B2] dark:text-[#0C0C09]",
    fillBg: "bg-white/25 dark:bg-black/25",
    border: "border-[#0E7490] dark:border-[#0891B2]",
    text: "text-[#0891B2]",
    badge: "bg-[#0891B2] text-white dark:bg-[#06B6D4] dark:text-[#0C0C09]",
    groupRowBg: "bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white",
    groupBadgeBg: "bg-[#0891B2] text-white border border-[#0E7490]",
    diamondBg: "bg-[#0891B2] text-white border border-[#0E7490]",
    diamondPill: "bg-[#0891B2] text-white border border-[#0E7490]",
    diamondText: "text-[#0891B2] dark:text-[#22D3EE]",
    guideLine: "border-[#0891B2]",
    guidePill: "bg-[#0891B2] text-white font-mono rounded-[2px]"
  },
  teal: {
    barBg: "bg-[#0D9488] text-white border border-[#0F766E] dark:bg-[#14B8A6] dark:border-[#0D9488]",
    fillBg: "bg-white/25 dark:bg-black/25",
    border: "border-[#0F766E] dark:border-[#0D9488]",
    text: "text-white",
    badge: "bg-[#0D9488] text-white",
    groupRowBg: "bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white",
    groupBadgeBg: "bg-[#0D9488] text-white border border-[#0F766E]",
    diamondBg: "bg-[#0D9488] text-white border border-[#0F766E]",
    diamondPill: "bg-[#0D9488] text-white border border-[#0F766E]",
    diamondText: "text-[#0D9488] dark:text-[#2DD4BF]",
    guideLine: "border-[#0D9488]",
    guidePill: "bg-[#0D9488] text-white font-mono rounded-[2px]"
  },
  orange: {
    barBg: "bg-[#EA580C] text-white border border-[#C2410C] dark:bg-[#F97316] dark:border-[#EA580C]",
    fillBg: "bg-white/25 dark:bg-black/25",
    border: "border-[#C2410C] dark:border-[#EA580C]",
    text: "text-white",
    badge: "bg-[#EA580C] text-white",
    groupRowBg: "bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white",
    groupBadgeBg: "bg-[#EA580C] text-white border border-[#C2410C]",
    diamondBg: "bg-[#EA580C] text-white border border-[#C2410C]",
    diamondPill: "bg-[#EA580C] text-white border border-[#C2410C]",
    diamondText: "text-[#EA580C] dark:text-[#FB923C]",
    guideLine: "border-[#EA580C]",
    guidePill: "bg-[#EA580C] text-white font-mono rounded-[2px]"
  },
  pink: {
    barBg: "bg-[#DB2777] text-white border border-[#BE185D] dark:bg-[#EC4899] dark:border-[#DB2777]",
    fillBg: "bg-white/25 dark:bg-black/25",
    border: "border-[#BE185D] dark:border-[#DB2777]",
    text: "text-white",
    badge: "bg-[#DB2777] text-white",
    groupRowBg: "bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white",
    groupBadgeBg: "bg-[#DB2777] text-white border border-[#BE185D]",
    diamondBg: "bg-[#DB2777] text-white border border-[#BE185D]",
    diamondPill: "bg-[#DB2777] text-white border border-[#BE185D]",
    diamondText: "text-[#DB2777] dark:text-[#F472B6]",
    guideLine: "border-[#DB2777]",
    guidePill: "bg-[#DB2777] text-white font-mono rounded-[2px]"
  },
  slate: {
    barBg: "bg-[#475569] text-white border border-[#334155] dark:bg-[#64748B] dark:border-[#475569]",
    fillBg: "bg-white/25 dark:bg-black/25",
    border: "border-[#334155] dark:border-[#475569]",
    text: "text-white",
    badge: "bg-[#475569] text-white",
    groupRowBg: "bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white",
    groupBadgeBg: "bg-[#475569] text-white border border-[#334155]",
    diamondBg: "bg-[#475569] text-white border border-[#334155]",
    diamondPill: "bg-[#475569] text-white border border-[#334155]",
    diamondText: "text-[#475569] dark:text-[#94A3B8]",
    guideLine: "border-[#475569]",
    guidePill: "bg-[#475569] text-white font-mono rounded-[2px]"
  },
  sky: {
    barBg: "bg-[#0284C7] text-white border border-[#0369A1] dark:bg-[#38BDF8] dark:border-[#0284C7] dark:text-[#0C0C09]",
    fillBg: "bg-white/25 dark:bg-black/25",
    border: "border-[#0369A1] dark:border-[#0284C7]",
    text: "text-white",
    badge: "bg-[#0284C7] text-white dark:bg-[#38BDF8] dark:text-[#0C0C09]",
    groupRowBg: "bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white",
    groupBadgeBg: "bg-[#0284C7] text-white border border-[#0369A1]",
    diamondBg: "bg-[#0284C7] text-white border border-[#0369A1]",
    diamondPill: "bg-[#0284C7] text-white border border-[#0369A1]",
    diamondText: "text-[#0284C7] dark:text-[#38BDF8]",
    guideLine: "border-[#0284C7]",
    guidePill: "bg-[#0284C7] text-white font-mono rounded-[2px]"
  },
  lime: {
    barBg: "bg-[#65A30D] text-white border border-[#4D7C0F] dark:bg-[#84CC16] dark:border-[#65A30D] dark:text-[#0C0C09]",
    fillBg: "bg-white/25 dark:bg-black/25",
    border: "border-[#4D7C0F] dark:border-[#65A30D]",
    text: "text-white",
    badge: "bg-[#65A30D] text-white dark:bg-[#84CC16] dark:text-[#0C0C09]",
    groupRowBg: "bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-white",
    groupBadgeBg: "bg-[#65A30D] text-white border border-[#4D7C0F]",
    diamondBg: "bg-[#65A30D] text-white border border-[#4D7C0F]",
    diamondPill: "bg-[#65A30D] text-white border border-[#4D7C0F]",
    diamondText: "text-[#65A30D] dark:text-[#A3E635]",
    guideLine: "border-[#65A30D]",
    guidePill: "bg-[#65A30D] text-white font-mono rounded-[2px]"
  }
};
var PROJECT_ACCENT_COLORS = {
  indigo: { hex: "#4F46E5", rgb: "79, 70, 229" },
  blue: { hex: "#2563EB", rgb: "37, 99, 235" },
  emerald: { hex: "#16A34A", rgb: "22, 163, 74" },
  amber: { hex: "#D97706", rgb: "217, 119, 6" },
  rose: { hex: "#DC2626", rgb: "220, 38, 38" },
  violet: { hex: "#7C3AED", rgb: "124, 58, 237" },
  cyan: { hex: "#0891B2", rgb: "8, 145, 178" },
  teal: { hex: "#0D9488", rgb: "13, 148, 136" },
  orange: { hex: "#EA580C", rgb: "234, 88, 12" },
  pink: { hex: "#DB2777", rgb: "219, 39, 119" },
  slate: { hex: "#475569", rgb: "71, 85, 105" },
  sky: { hex: "#0284C7", rgb: "2, 132, 199" },
  lime: { hex: "#65A30D", rgb: "101, 163, 13" }
};
function getProjectAccent(color) {
  return PROJECT_ACCENT_COLORS[color || "indigo"] || PROJECT_ACCENT_COLORS.indigo;
}
var TEAM_BADGE_STYLES = {
  cyan: {
    container: "bg-cyan-50 dark:bg-cyan-950/60 border-cyan-400/80 dark:border-cyan-700 text-cyan-800 dark:text-cyan-200",
    dot: "bg-[#0891B2] dark:bg-[#06B6D4]"
  },
  teal: {
    container: "bg-teal-50 dark:bg-teal-950/60 border-teal-400/80 dark:border-teal-700 text-teal-800 dark:text-teal-200",
    dot: "bg-[#0D9488] dark:bg-[#14B8A6]"
  },
  sky: {
    container: "bg-sky-50 dark:bg-sky-950/60 border-sky-400/80 dark:border-sky-700 text-sky-800 dark:text-sky-200",
    dot: "bg-[#0284C7] dark:bg-[#38BDF8]"
  },
  violet: {
    container: "bg-violet-50 dark:bg-violet-950/60 border-violet-400/80 dark:border-violet-700 text-violet-800 dark:text-violet-200",
    dot: "bg-[#7C3AED] dark:bg-[#8B5CF6]"
  },
  blue: {
    container: "bg-blue-50 dark:bg-blue-950/60 border-blue-400/80 dark:border-blue-700 text-blue-800 dark:text-blue-200",
    dot: "bg-[#2563EB] dark:bg-[#3B82F6]"
  },
  emerald: {
    container: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400/80 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200",
    dot: "bg-[#16A34A] dark:bg-[#22C55E]"
  },
  lime: {
    container: "bg-lime-50 dark:bg-lime-950/60 border-lime-400/80 dark:border-lime-700 text-lime-800 dark:text-lime-200",
    dot: "bg-[#65A30D] dark:bg-[#84CC16]"
  },
  amber: {
    container: "bg-amber-50 dark:bg-amber-950/60 border-amber-400/80 dark:border-amber-700 text-amber-800 dark:text-amber-200",
    dot: "bg-[#D97706] dark:bg-[#F59E0B]"
  },
  orange: {
    container: "bg-orange-50 dark:bg-orange-950/60 border-orange-400/80 dark:border-orange-700 text-orange-800 dark:text-orange-200",
    dot: "bg-[#EA580C] dark:bg-[#F97316]"
  },
  rose: {
    container: "bg-rose-50 dark:bg-rose-950/60 border-rose-400/80 dark:border-rose-700 text-rose-800 dark:text-rose-200",
    dot: "bg-[#DC2626] dark:bg-[#EF4444]"
  },
  pink: {
    container: "bg-pink-50 dark:bg-pink-950/60 border-pink-400/80 dark:border-pink-700 text-pink-800 dark:text-pink-200",
    dot: "bg-[#DB2777] dark:bg-[#EC4899]"
  },
  indigo: {
    container: "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400/80 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200",
    dot: "bg-[#4F46E5] dark:bg-[#6366F1]"
  },
  slate: {
    container: "bg-slate-100 dark:bg-slate-900/60 border-slate-400/80 dark:border-slate-700 text-slate-800 dark:text-slate-200",
    dot: "bg-[#475569] dark:bg-[#64748B]"
  }
};
var ALERT_LEVEL_CONFIG = {
  0: {
    label: "Nivel 0",
    title: "Nivel de Alerta 0: Normal / Sin alerta",
    className: "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    dotColor: "bg-zinc-400"
  },
  1: {
    label: "Nivel 1",
    title: "Nivel de Alerta 1: Baja / Leve",
    className: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    dotColor: "bg-amber-500"
  },
  2: {
    label: "Nivel 2",
    title: "Nivel de Alerta 2: Media / Moderada",
    className: "bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    dotColor: "bg-orange-500"
  },
  3: {
    label: "Nivel 3",
    title: "Nivel de Alerta 3: Alta / Cr\xEDtica",
    className: "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    dotColor: "bg-rose-500"
  }
};
var GanttWorkspace = ({
  items,
  projects = [],
  groupByProject = true,
  selectedProjectId = "all",
  selectedProjectIds,
  onOpenProjectsView,
  zoom,
  dayWidth: controlledDayWidth,
  onChangeDayWidth,
  onFitToProject,
  showCriticalPath,
  onToggleCriticalPath,
  onScrollToToday,
  showMetricsDrawer = false,
  onToggleMetricsDrawer,
  metricsToggleBtnRef,
  showCpmFloat,
  autoCascade,
  arrowVisibility: controlledArrowVisibility,
  onChangeArrowVisibility,
  onUpdateItem,
  onUpdateItems,
  onReorderItem,
  onMoveItem,
  onMoveItems,
  onEditModal,
  onDeleteItem,
  onDuplicateItem,
  onQuickAdd,
  onToggleGroupByProject,
  onToggleProjectCollapse,
  onUpdateProject,
  onReorderProject,
  onMoveProject,
  onChangeProjectColor,
  onDeleteProject,
  onCreateProject,
  onCreateDigiTask,
  onCreateTaskDirect,
  onCreateUnassignedTask,
  scrollContainerRef,
  showTable: showTableProp,
  onToggleShowTable,
  showRowSeparators: showRowSeparatorsProp,
  onToggleRowSeparators,
  showWeekendShading: showWeekendShadingProp,
  onToggleWeekendShading,
  initialSelectedItemId,
  initialHoveredItemId,
  initialCursorScrubber,
  initialSelectedDepLink,
  initialHoveredDepKey,
  initialConnectModeSource,
  initialInspectingProjectId,
  initialLockedAlertProjectId,
  initialMultiSelectedItemIds,
  initialMultiSelectedProjectIds,
  initialDragRowPreview = null,
  initialDragOverRow = null,
  initialDragProjectPreview = null,
  initialDragOverProject = null,
  initialContextMenu = null,
  baselineSnapshot = null,
  workCalendar,
  useRightSidebarInspector = false,
  releases = [],
  activeReleaseId,
  releaseGuideVisibility = "selected",
  groupingMode = "release",
  onToggleGroupingMode,
  onOpenReleasesModal,
  initialVisibleMilestoneKeys,
  initialVisibleColumns,
  hiddenReleaseIds = [],
  onToggleHideRelease,
  onResetHiddenReleases,
  isFocusMode = false,
  focusEntity = null,
  onExitFocusMode,
  onSetFocusEntity,
  selectedEntity = null,
  onSelectEntity,
  selectedPlatform = "all",
  onChangeSelectedPlatform,
  truncateCharLimit,
  onChangeTruncateCharLimit,
  initialSearchQuery = "",
  initialExcludeQuery = "",
  initialAlertFilter = "all",
  initialTypeFilter = "all",
  initialReleaseFilter = "all",
  initialShowSubtasksOnFilter = false,
  initialSearchFields,
  initialShowSearchFieldsMenu = false,
  initialShowAdvancedPanel = false
}) => {
  const [focusedProjectInputId, setFocusedProjectInputId] = useState2(null);
  const [tableSearchQuery, setTableSearchQuery] = useState2(initialSearchQuery);
  const [tableExcludeQuery, setTableExcludeQuery] = useState2(initialExcludeQuery);
  const [showSubtasksOnFilter, setShowSubtasksOnFilter] = useState2(initialShowSubtasksOnFilter);
  const [searchFields, setSearchFields] = useState2(() => ({
    ...DEFAULT_GANTT_SEARCH_FIELDS,
    ...initialSearchFields || {}
  }));
  const [tableTypeFilter, setTableTypeFilter] = useState2(initialTypeFilter);
  const [tableReleaseFilter, setTableReleaseFilter] = useState2(initialReleaseFilter);
  const [tablePlatformFilter, setTablePlatformFilter] = useState2("all");
  const [tableAlertFilter, setTableAlertFilter] = useState2(initialAlertFilter);
  const activePlatformFilter = tablePlatformFilter !== "all" ? tablePlatformFilter : selectedPlatform && selectedPlatform !== "all" ? normalizePlatform(selectedPlatform) || "iOS/Android" : "all";
  const handleSelectPlatformFilter = (next) => {
    setTablePlatformFilter(next);
    onChangeSelectedPlatform?.(next);
  };
  const [hoveredNameId, setHoveredNameId] = useState2(null);
  const [activeColorPickerProjId, setActiveColorPickerProjId] = useState2(null);
  const [collapsedReleaseIds, setCollapsedReleaseIds] = useState2(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem("ganttflow_collapsed_releases");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
      }
    } catch {
    }
    return /* @__PURE__ */ new Set();
  });
  useEffect3(() => {
    try {
      localStorage.setItem(
        "ganttflow_collapsed_releases",
        JSON.stringify(Array.from(collapsedReleaseIds))
      );
    } catch {
    }
  }, [collapsedReleaseIds]);
  const [recentlyExpandedParentIds, setRecentlyExpandedParentIds] = useState2(
    () => /* @__PURE__ */ new Set()
  );
  const expandAnimTimersRef = useRef2(/* @__PURE__ */ new Map());
  const [recentlyCollapsedParentIds, setRecentlyCollapsedParentIds] = useState2(
    () => /* @__PURE__ */ new Set()
  );
  const collapseAnimTimersRef = useRef2(/* @__PURE__ */ new Map());
  const isCollapseAnimating = recentlyExpandedParentIds.size > 0 || recentlyCollapsedParentIds.size > 0;
  const collapseScrollAnchorRef = useRef2(null);
  const [collapseBottomSpacerPx, setCollapseBottomSpacerPx] = useState2(0);
  useEffect3(() => {
    return () => {
      expandAnimTimersRef.current.forEach((timer) => clearTimeout(timer));
      expandAnimTimersRef.current.clear();
      collapseAnimTimersRef.current.forEach((timer) => clearTimeout(timer));
      collapseAnimTimersRef.current.clear();
    };
  }, []);
  const captureCollapseScrollAnchor = (selector) => {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    const el = document.querySelector(selector);
    if (!el) return;
    collapseScrollAnchorRef.current = {
      selector,
      viewportTop: el.getBoundingClientRect().top
    };
  };
  const triggerExpandAnimation = (parentKey) => {
    const collapseTimer = collapseAnimTimersRef.current.get(parentKey);
    if (collapseTimer) {
      clearTimeout(collapseTimer);
      collapseAnimTimersRef.current.delete(parentKey);
      setRecentlyCollapsedParentIds((prev) => {
        if (!prev.has(parentKey)) return prev;
        const next = new Set(prev);
        next.delete(parentKey);
        return next;
      });
    }
    setCollapseBottomSpacerPx(0);
    const existing = expandAnimTimersRef.current.get(parentKey);
    if (existing) clearTimeout(existing);
    setRecentlyExpandedParentIds((prev) => {
      const next = new Set(prev);
      next.add(parentKey);
      return next;
    });
    const timer = setTimeout(() => {
      setRecentlyExpandedParentIds((prev) => {
        if (!prev.has(parentKey)) return prev;
        const next = new Set(prev);
        next.delete(parentKey);
        return next;
      });
      expandAnimTimersRef.current.delete(parentKey);
    }, 290);
    expandAnimTimersRef.current.set(parentKey, timer);
  };
  const triggerCollapseAnimation = (parentKey) => {
    const expandTimer = expandAnimTimersRef.current.get(parentKey);
    if (expandTimer) {
      clearTimeout(expandTimer);
      expandAnimTimersRef.current.delete(parentKey);
      setRecentlyExpandedParentIds((prev) => {
        if (!prev.has(parentKey)) return prev;
        const next = new Set(prev);
        next.delete(parentKey);
        return next;
      });
    }
    const existing = collapseAnimTimersRef.current.get(parentKey);
    if (existing) clearTimeout(existing);
    setRecentlyCollapsedParentIds((prev) => {
      const next = new Set(prev);
      next.add(parentKey);
      return next;
    });
    const timer = setTimeout(() => {
      setRecentlyCollapsedParentIds((prev) => {
        if (!prev.has(parentKey)) return prev;
        const next = new Set(prev);
        next.delete(parentKey);
        return next;
      });
      collapseAnimTimersRef.current.delete(parentKey);
    }, 290);
    collapseAnimTimersRef.current.set(parentKey, timer);
  };
  const handleToggleReleaseCollapse = (releaseId) => {
    const isCurrentlyCollapsed = collapsedReleaseIds.has(releaseId);
    if (isCurrentlyCollapsed) {
      triggerExpandAnimation(`rel:${releaseId}`);
    } else {
      captureCollapseScrollAnchor(`[data-release-summary-bar="${releaseId}"], [data-release-group="${releaseId}"]`);
      triggerCollapseAnimation(`rel:${releaseId}`);
    }
    setCollapsedReleaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(releaseId)) next.delete(releaseId);
      else next.add(releaseId);
      return next;
    });
  };
  const handleToggleProjectCollapse = (projectId, currentlyCollapsed) => {
    const isCollapsedNow = currentlyCollapsed ?? Boolean(projectsRef.current.find((p) => p.id === projectId)?.collapsed);
    if (isCollapsedNow) {
      triggerExpandAnimation(`proj:${projectId}`);
    } else {
      captureCollapseScrollAnchor(`[data-project-summary-bar="${projectId}"], [data-project-group="${projectId}"]`);
      triggerCollapseAnimation(`proj:${projectId}`);
    }
    onToggleProjectCollapse?.(projectId);
  };
  const isRowCollapsing = (row) => {
    if (recentlyCollapsedParentIds.size === 0) return false;
    if (row.kind === "project") {
      const relKey = `rel:${row.group.project.releaseId || "__unassigned__"}`;
      return recentlyCollapsedParentIds.has(relKey);
    }
    if (row.kind === "add-project") {
      return recentlyCollapsedParentIds.has(`rel:${row.group.release.id}`);
    }
    if (row.kind === "empty-project" || row.kind === "add-task" || row.kind === "item") {
      const relKey = `rel:${row.group.project.releaseId || "__unassigned__"}`;
      return recentlyCollapsedParentIds.has(`proj:${row.group.project.id}`) || recentlyCollapsedParentIds.has(relKey);
    }
    return false;
  };
  const isRowJustExpanded = (row) => {
    if (recentlyExpandedParentIds.size === 0) return false;
    if (row.kind === "project") {
      const relKey = `rel:${row.group.project.releaseId || "__unassigned__"}`;
      return recentlyExpandedParentIds.has(relKey);
    }
    if (row.kind === "add-project") {
      return recentlyExpandedParentIds.has(`rel:${row.group.release.id}`);
    }
    if (row.kind === "empty-project" || row.kind === "add-task") {
      const relKey = `rel:${row.group.project.releaseId || "__unassigned__"}`;
      return recentlyExpandedParentIds.has(`proj:${row.group.project.id}`) || recentlyExpandedParentIds.has(relKey);
    }
    if (row.kind === "item") {
      const relKey = `rel:${row.group.project.releaseId || "__unassigned__"}`;
      return recentlyExpandedParentIds.has(`proj:${row.group.project.id}`) || recentlyExpandedParentIds.has(relKey);
    }
    return false;
  };
  const [visibleMilestoneKeys, setVisibleMilestoneKeys] = useState2(() => {
    if (initialVisibleMilestoneKeys) {
      return new Set(initialVisibleMilestoneKeys.map((k) => k.toLowerCase()));
    }
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem("ganttflow_visible_milestone_keys");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return new Set(parsed.map((k) => String(k).toLowerCase()));
          }
        }
      }
    } catch {
    }
    return /* @__PURE__ */ new Set(["qg4", "qg5"]);
  });
  useEffect3(() => {
    try {
      localStorage.setItem(
        "ganttflow_visible_milestone_keys",
        JSON.stringify(Array.from(visibleMilestoneKeys))
      );
    } catch {
    }
  }, [visibleMilestoneKeys]);
  const [showMilestonesMenu, setShowMilestonesMenu] = useState2(false);
  const milestonesMenuRef = useRef2(null);
  useEffect3(() => {
    if (!showMilestonesMenu) return;
    const handleOutsideClick = (e) => {
      if (milestonesMenuRef.current && !milestonesMenuRef.current.contains(e.target)) {
        setShowMilestonesMenu(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowMilestonesMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showMilestonesMenu]);
  const [hiddenReleaseGuideKeys, setHiddenReleaseGuideKeys] = useState2(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem("ganttflow_hidden_release_guides");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
      }
    } catch {
    }
    return /* @__PURE__ */ new Set();
  });
  useEffect3(() => {
    try {
      localStorage.setItem(
        "ganttflow_hidden_release_guides",
        JSON.stringify(Array.from(hiddenReleaseGuideKeys))
      );
    } catch {
    }
  }, [hiddenReleaseGuideKeys]);
  const handleToggleReleaseGuideLine = (guideKey) => {
    setHiddenReleaseGuideKeys((prev) => {
      const next = new Set(prev);
      if (next.has(guideKey)) {
        next.delete(guideKey);
      } else {
        next.add(guideKey);
      }
      return next;
    });
  };
  const [hoveredId, setHoveredId] = useState2(
    initialHoveredItemId || null
  );
  const [selectedItemId, setSelectedItemId] = useState2(
    initialSelectedItemId || null
  );
  const [selectedDiagramProjectId, setSelectedDiagramProjectId] = useState2(null);
  const [selectedDiagramReleaseId, setSelectedDiagramReleaseId] = useState2(null);
  const [multiSelectedItemIds, setMultiSelectedItemIds] = useState2(
    () => new Set(initialMultiSelectedItemIds || [])
  );
  const [multiSelectedProjectIds, setMultiSelectedProjectIds] = useState2(
    () => new Set(initialMultiSelectedProjectIds || [])
  );
  const lastMultiAnchorRef = useRef2(null);
  const effectiveMultiItemIds = useMemo(() => {
    const set = new Set(multiSelectedItemIds);
    if (multiSelectedProjectIds.size > 0) {
      for (const it of items) {
        const pid = it.projectId || projects[0]?.id;
        if (pid && multiSelectedProjectIds.has(pid)) {
          set.add(it.id);
        }
      }
    }
    return set;
  }, [multiSelectedItemIds, multiSelectedProjectIds, items, projects]);
  const hasMultiSelection = multiSelectedItemIds.size > 0 || multiSelectedProjectIds.size > 0;
  const clearMultiSelection = () => {
    setMultiSelectedItemIds(/* @__PURE__ */ new Set());
    setMultiSelectedProjectIds(/* @__PURE__ */ new Set());
    lastMultiAnchorRef.current = null;
  };
  const shiftItemsByDays = (targetIds, deltaDays, attemptedLabel = "mover selecci\xF3n m\xFAltiple en el cronograma") => {
    if (deltaDays === 0 || targetIds.size === 0) return false;
    for (const id of targetIds) {
      const target = items.find((it) => it.id === id);
      if (!target) continue;
      const lockedProj = getLockedProjectForItem(target, projectsRef.current);
      if (lockedProj) {
        setLockedAlertState({
          project: lockedProj,
          attemptedAction: attemptedLabel
        });
        return false;
      }
    }
    const nextItems = items.map((it) => {
      if (!targetIds.has(it.id)) return it;
      const origStart = parseDateSafe(it.startDate);
      const origDur = it.type === "milestone" ? 0 : Math.max(1, it.duration);
      const newStart = formatDateISO(addDays2(origStart, deltaDays));
      const newEnd = it.type === "milestone" ? newStart : calculateEndDateFromDuration(newStart, origDur, "task");
      return {
        ...it,
        startDate: newStart,
        endDate: newEnd
      };
    });
    const sign = deltaDays > 0 ? `+${deltaDays}` : `${deltaDays}`;
    if (onUpdateItems) {
      onUpdateItems(nextItems, {
        actionType: "edit_item",
        actionLabel: "Mover M\xFAltiple",
        description: `Mover ${targetIds.size} elemento(s) juntos (${sign}d)`
      });
    } else {
      for (const updated of nextItems) {
        if (targetIds.has(updated.id)) {
          onUpdateItem(updated, false);
        }
      }
    }
    return true;
  };
  const effectiveSelectedItemId = selectedEntity ? selectedEntity.type === "task" ? selectedEntity.id : null : selectedItemId;
  const effectiveSelectedProjectId = selectedEntity ? selectedEntity.type === "project" ? selectedEntity.id : null : selectedDiagramProjectId;
  const effectiveSelectedReleaseId = selectedEntity ? selectedEntity.type === "release" ? selectedEntity.id : null : selectedDiagramReleaseId;
  useEffect3(() => {
    if (selectedEntity?.type === "task") {
      setSelectedItemId(selectedEntity.id);
      setSelectedDiagramProjectId(null);
      setSelectedDiagramReleaseId(null);
      const targetItem = items.find((it) => it.id === selectedEntity.id);
      if (targetItem) {
        const targetProj = projects.find((p) => p.id === targetItem.projectId);
        const relId = targetItem.releaseId || targetProj?.releaseId;
        if (relId && collapsedReleaseIds.has(relId)) {
          setCollapsedReleaseIds((prev) => {
            const next = new Set(prev);
            next.delete(relId);
            return next;
          });
        }
      }
    }
  }, [selectedEntity]);
  const handleSelectProject = (proj) => {
    const isCurrent = effectiveSelectedProjectId === proj.id;
    const next = isCurrent ? null : {
      type: "project",
      id: proj.id,
      name: proj.name
    };
    setSelectedDiagramProjectId(next ? proj.id : null);
    setSelectedDiagramReleaseId(null);
    setSelectedItemId(null);
    setSelectedDepLink(null);
    if (!useRightSidebarInspector) {
      setInspectingProject(next ? proj : null);
    }
    onSelectEntity?.(next);
  };
  const handleSelectRelease = (rel) => {
    const isCurrent = effectiveSelectedReleaseId === rel.id;
    const next = isCurrent ? null : {
      type: "release",
      id: rel.id,
      name: rel.name || rel.code
    };
    setSelectedDiagramReleaseId(next ? rel.id : null);
    setSelectedDiagramProjectId(null);
    setSelectedItemId(null);
    setSelectedDepLink(null);
    onSelectEntity?.(next);
  };
  const handleSelectTaskFromTable = (item, e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      e.stopPropagation();
      toggleMultiSelectItem(item.id, e.shiftKey);
      return;
    }
    const targetEl = e.target;
    if (targetEl?.closest("button")) return;
    const isFormControl = Boolean(targetEl?.closest("input, select, textarea, a"));
    const isAlreadySelected = effectiveSelectedItemId === item.id;
    if (isFormControl && isAlreadySelected) return;
    setSelectedDepLink(null);
    setSelectedDiagramProjectId(null);
    setSelectedDiagramReleaseId(null);
    const nextId = isAlreadySelected ? null : item.id;
    setSelectedItemId(nextId);
    onSelectEntity?.(nextId ? { type: "task", id: nextId, name: item.name } : null);
  };
  const [inspectingProject, setInspectingProject] = useState2(() => {
    if (initialInspectingProjectId && projects.length > 0) {
      return projects.find((p) => p.id === initialInspectingProjectId) || null;
    }
    return null;
  });
  useEffect3(() => {
    if (!inspectingProject || typeof window === "undefined") return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setInspectingProject(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [inspectingProject]);
  const [selectedDepLink, setSelectedDepLink] = useState2(initialSelectedDepLink || null);
  const inspectionPanelRef = useRef2(null);
  const depPopoverRef = useRef2(null);
  const cronogramaToolbarRef = useRef2(null);
  const splitPaneRef = useRef2(null);
  const tableHeaderRef = useRef2(null);
  const calendarHeaderRef = useRef2(null);
  const [hoveredDepKey, setHoveredDepKey] = useState2(
    initialHoveredDepKey || null
  );
  const [connectModeSource, setConnectModeSource] = useState2(initialConnectModeSource || null);
  const [reconnectMode, setReconnectMode] = useState2(null);
  const [depDragState, setDepDragState] = useState2(null);
  const [depFeedback, setDepFeedback] = useState2(null);
  const [lockedAlertState, setLockedAlertState] = useState2(() => {
    if (initialLockedAlertProjectId && projects.length > 0) {
      const found = projects.find((p) => p.id === initialLockedAlertProjectId);
      if (found) {
        return {
          project: found,
          attemptedAction: "mover elementos en el cronograma"
        };
      }
    }
    return null;
  });
  const projectsRef = useRef2(projects);
  projectsRef.current = projects;
  const itemsRef = useRef2(items);
  itemsRef.current = items;
  const showWorkspaceToast = (message, tone = "info") => {
    setDepFeedback({ message, tone });
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setDepFeedback((prev) => prev?.message === message ? null : prev);
      }, 2800);
    }
  };
  const guardProjectUnlocked = (projectId, attemptedAction) => {
    const currentProjects = projectsRef.current;
    const pid = projectId || currentProjects[0]?.id;
    const proj = pid ? currentProjects.find((p) => p.id === pid) : void 0;
    if (proj?.locked) {
      setLockedAlertState({ project: proj, attemptedAction });
      return false;
    }
    return true;
  };
  const guardItemUnlocked = (itemOrId, attemptedAction) => {
    const resolvedItem = typeof itemOrId === "string" ? itemsRef.current.find((it) => it.id === itemOrId) : itemOrId;
    const lockedProj = getLockedProjectForItem(resolvedItem, projectsRef.current);
    if (lockedProj) {
      setLockedAlertState({ project: lockedProj, attemptedAction });
      return false;
    }
    return true;
  };
  const handleToggleProjectLock = (project, nextLocked = !project.locked) => {
    const updated = { ...project, locked: nextLocked };
    onUpdateProject?.(updated);
    setInspectingProject(
      (prev) => prev && prev.id === project.id ? { ...prev, locked: nextLocked } : prev
    );
    if (!nextLocked) {
      setLockedAlertState(
        (prev) => prev && prev.project.id === project.id ? null : prev
      );
      showWorkspaceToast(
        `Proyecto \xAB${project.name}\xBB desbloqueado. Ya puedes realizar cambios.`,
        "success"
      );
    } else {
      showWorkspaceToast(
        `Proyecto \xAB${project.name}\xBB bloqueado para evitar cambios accidentales.`,
        "info"
      );
    }
  };
  const guardedUpdateItem = (updated, cascade) => {
    const prev = itemsRef.current.find((it) => it.id === updated.id);
    if (!guardItemUnlocked(prev || updated, `editar \xAB${updated.name}\xBB`)) return;
    if (prev && updated.projectId !== prev.projectId && !guardProjectUnlocked(
      updated.projectId,
      `mover \xAB${updated.name}\xBB a proyecto bloqueado`
    )) {
      return;
    }
    onUpdateItem(updated, cascade);
  };
  const guardedReorderItem = (itemId, direction) => {
    if (!guardItemUnlocked(itemId, "reordenar tarea en la tabla")) return;
    onReorderItem?.(itemId, direction);
  };
  const guardedEditModal = (item) => {
    if (!guardItemUnlocked(item, `editar \xAB${item.name}\xBB`)) return;
    onEditModal(item);
  };
  const guardedDuplicateItem = (item) => {
    if (!guardItemUnlocked(item, `duplicar \xAB${item.name}\xBB`)) return;
    onDuplicateItem(item);
  };
  const guardedDeleteItem = (id) => {
    const it = itemsRef.current.find((x) => x.id === id);
    if (!guardItemUnlocked(it || id, `eliminar \xAB${it?.name || "\xEDtem"}\xBB`)) {
      return;
    }
    onDeleteItem(id);
  };
  const guardedQuickAdd = (type, projectId) => {
    const targetPid = projectId || projectsRef.current[0]?.id;
    if (targetPid && !guardProjectUnlocked(
      targetPid,
      type === "milestone" ? "a\xF1adir hito en proyecto bloqueado" : "a\xF1adir tarea en proyecto bloqueado"
    )) {
      return;
    }
    onQuickAdd(type, projectId);
  };
  const guardedCreateTaskDirect = (projectId) => {
    if (!guardProjectUnlocked(projectId, "a\xF1adir tarea en proyecto bloqueado")) {
      return;
    }
    if (onCreateTaskDirect) {
      onCreateTaskDirect(projectId);
    } else {
      onQuickAdd("task", projectId);
    }
  };
  const guardedUpdateProject = (project, actionLabel = "editar proyecto") => {
    const current = projectsRef.current.find((p) => p.id === project.id);
    if (current?.locked && project.locked) {
      setLockedAlertState({ project: current, attemptedAction: actionLabel });
      return;
    }
    onUpdateProject?.(project);
  };
  const guardedReorderProject = (projectId, direction) => {
    if (!guardProjectUnlocked(projectId, "mover proyecto en el cronograma")) {
      return;
    }
    onReorderProject?.(projectId, direction);
  };
  const guardedChangeProjectColor = (projectId, newColor) => {
    if (!guardProjectUnlocked(projectId, "cambiar color de proyecto bloqueado")) {
      return;
    }
    onChangeProjectColor?.(projectId, newColor);
  };
  const guardedDeleteProject = (projectId) => {
    if (!guardProjectUnlocked(projectId, "eliminar proyecto bloqueado")) {
      return;
    }
    onDeleteProject?.(projectId);
  };
  const guardedCreateDigiTask = (project, taskType) => {
    if (!guardProjectUnlocked(
      project.id,
      `a\xF1adir tarea ${taskType || "DIGI"} en proyecto bloqueado`
    )) {
      return;
    }
    onCreateDigiTask?.(project, taskType);
  };
  const [cursorScrubber, setCursorScrubber] = useState2(initialCursorScrubber || null);
  const hasDraggedRef = useRef2(false);
  const [splitWidth, setSplitWidth] = useState2(480);
  const [internalShowTable, setInternalShowTable] = useState2(true);
  const showTable = showTableProp !== void 0 ? showTableProp : internalShowTable;
  useEffect3(() => {
    if (typeof window === "undefined") return;
    let rafId = null;
    const syncStickyHeaders = () => {
      rafId = null;
      const splitEl = splitPaneRef.current;
      if (!splitEl) return;
      const splitRect = splitEl.getBoundingClientRect();
      const toolbarEl = cronogramaToolbarRef.current;
      const anchorTop = toolbarEl ? toolbarEl.getBoundingClientRect().bottom : 88;
      const maxOffset = Math.max(0, splitRect.height - HEADER_HEIGHT);
      const offsetY = splitRect.top < anchorTop ? Math.min(maxOffset, Math.max(0, Math.round(anchorTop - splitRect.top))) : 0;
      const transformVal = offsetY > 0 ? `translateY(${offsetY}px)` : "";
      if (calendarHeaderRef.current) {
        calendarHeaderRef.current.style.transform = transformVal;
      }
      if (tableHeaderRef.current) {
        tableHeaderRef.current.style.transform = transformVal;
      }
    };
    const handleScrollOrResize = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(syncStickyHeaders);
      }
    };
    syncStickyHeaders();
    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [showTable, items.length, projects.length]);
  const [wheelZoomEnabled, setWheelZoomEnabled] = useState2(true);
  const [visibleColumns, setVisibleColumns] = useState2(() => {
    if (initialVisibleColumns) {
      return {
        team: true,
        deps: true,
        dates: false,
        dur: false,
        slack: false,
        ...initialVisibleColumns
      };
    }
    try {
      const saved = localStorage.getItem("ganttflow_visible_cols");
      if (saved) return JSON.parse(saved);
    } catch {
    }
    return { team: true, deps: true, dates: false, dur: false, slack: false };
  });
  const [showColumnsMenu, setShowColumnsMenu] = useState2(false);
  const columnsMenuRef = useRef2(null);
  useEffect3(() => {
    if (!showColumnsMenu) return;
    const handleOutsideClick = (e) => {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(e.target)) {
        setShowColumnsMenu(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowColumnsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showColumnsMenu]);
  const [internalTruncateLimit, setInternalTruncateLimit] = useState2(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem(TRUNCATE_LIMIT_STORAGE_KEY);
        if (saved) {
          const num = parseInt(saved, 10);
          if (Number.isFinite(num) && num >= 5 && num <= 200) return num;
        }
      }
    } catch {
    }
    return DEFAULT_TRUNCATE_CHAR_LIMIT;
  });
  const effectiveTruncateLimit = truncateCharLimit !== void 0 ? truncateCharLimit : internalTruncateLimit;
  const handleUpdateTruncateLimit = (val) => {
    const clamped = Math.max(5, Math.min(200, val));
    if (onChangeTruncateCharLimit) {
      onChangeTruncateCharLimit(clamped);
    } else {
      setInternalTruncateLimit(clamped);
      try {
        localStorage.setItem(TRUNCATE_LIMIT_STORAGE_KEY, String(clamped));
      } catch {
      }
    }
  };
  const [internalShowRowSeparators, setInternalShowRowSeparators] = useState2(() => {
    try {
      const saved = localStorage.getItem("ganttflow_show_row_separators");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });
  const showRowSeparators = showRowSeparatorsProp !== void 0 ? showRowSeparatorsProp : internalShowRowSeparators;
  const handleToggleRowSeparators = () => {
    if (onToggleRowSeparators) {
      onToggleRowSeparators();
    } else {
      setInternalShowRowSeparators((prev) => {
        const next = !prev;
        try {
          localStorage.setItem("ganttflow_show_row_separators", String(next));
        } catch {
        }
        return next;
      });
    }
  };
  const [internalShowWeekendShading, setInternalShowWeekendShading] = useState2(() => {
    try {
      const saved = localStorage.getItem("ganttflow_show_weekend_shading");
      return saved !== null ? saved === "true" : false;
    } catch {
      return false;
    }
  });
  const showWeekendShading = showWeekendShadingProp !== void 0 ? showWeekendShadingProp : internalShowWeekendShading;
  const handleToggleWeekendShading = () => {
    if (onToggleWeekendShading) {
      onToggleWeekendShading();
    } else {
      setInternalShowWeekendShading((prev) => {
        const next = !prev;
        try {
          localStorage.setItem("ganttflow_show_weekend_shading", String(next));
        } catch {
        }
        return next;
      });
    }
  };
  const handleToggleCriticalPath = () => {
    if (onToggleCriticalPath) {
      onToggleCriticalPath();
    }
  };
  const handleScrollToToday = () => {
    if (onScrollToToday) {
      onScrollToToday();
      return;
    }
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const marker = container.querySelector("#gantt-today-marker");
    const todayX = marker ? Number(marker.getAttribute("data-today-x") || marker.offsetLeft) : 180;
    const targetLeft = Math.max(0, todayX - container.clientWidth / 3);
    container.scrollTo({
      left: targetLeft,
      behavior: "smooth"
    });
  };
  const handleToggleMetrics = () => {
    if (onToggleMetricsDrawer) {
      onToggleMetricsDrawer();
    }
  };
  const [focusedTaskInputId, setFocusedTaskInputId] = useState2(null);
  const [isCreatingProject, setIsCreatingProject] = useState2(false);
  const [newProjectName, setNewProjectName] = useState2("");
  const [newProjectColor, setNewProjectColor] = useState2("indigo");
  const [newProjectReleaseId, setNewProjectReleaseId] = useState2(
    () => releases[0]?.id || "rel-t-26-12-1"
  );
  const newProjectFormRef = useRef2(null);
  useEffect3(() => {
    if (!isCreatingProject) return;
    const handleOutsideClick = (e) => {
      if (newProjectFormRef.current && !newProjectFormRef.current.contains(e.target)) {
        if (!newProjectName.trim()) {
          setIsCreatingProject(false);
        }
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsCreatingProject(false);
        setNewProjectName("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCreatingProject, newProjectName]);
  useEffect3(() => {
    if (!effectiveSelectedItemId) return;
    const handleOutsideClick = (e) => {
      if (inspectionPanelRef.current && !inspectionPanelRef.current.contains(e.target)) {
        const target = e.target;
        if (target?.closest(
          '[data-timeline-task], [data-timeline-milestone], [data-task-row], [data-testid^="conflict-item-btn-"]'
        )) {
          return;
        }
        setSelectedItemId(null);
        onSelectEntity?.(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedItemId(null);
        onSelectEntity?.(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [effectiveSelectedItemId, onSelectEntity]);
  useEffect3(() => {
    if (!selectedDepLink) return;
    const handleOutsideClick = (e) => {
      if (depPopoverRef.current && !depPopoverRef.current.contains(e.target)) {
        const target = e.target;
        if (target?.closest("[data-dep-link-id], [data-dep-hit-area], [data-dep-midpoint]")) {
          return;
        }
        setSelectedDepLink(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedDepLink(null);
        setReconnectMode(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedDepLink]);
  useEffect3(() => {
    if (!connectModeSource && !reconnectMode) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setConnectModeSource(null);
        setReconnectMode(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [connectModeSource, reconnectMode]);
  const toggleVisibleColumn = (key) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("ganttflow_visible_cols", JSON.stringify(next));
      } catch {
      }
      return next;
    });
  };
  const [draggingRowId, setDraggingRowId] = useState2(
    initialDragRowPreview?.itemId ?? null
  );
  const [draggingMultiRowIds, setDraggingMultiRowIds] = useState2(null);
  const [dragVerticalDeltaY, setDragVerticalDeltaY] = useState2(0);
  const [dragOverRow, setDragOverRow] = useState2(initialDragOverRow);
  const [dragRowPreview, setDragRowPreview] = useState2(
    () => initialDragRowPreview ? {
      itemId: initialDragRowPreview.itemId,
      x: initialDragRowPreview.x,
      y: initialDragRowPreview.y,
      offsetX: initialDragRowPreview.offsetX ?? 24,
      offsetY: initialDragRowPreview.offsetY ?? ROW_HEIGHT / 2,
      width: initialDragRowPreview.width ?? 320
    } : null
  );
  const draggingRowIdRef = useRef2(null);
  const draggingMultiRowIdsRef = useRef2(null);
  const dragOverRowRef = useRef2(null);
  const [draggingProjectId, setDraggingProjectId] = useState2(
    initialDragProjectPreview?.projectId ?? null
  );
  const [dragOverProject, setDragOverProject] = useState2(initialDragOverProject);
  const [dragProjectPreview, setDragProjectPreview] = useState2(
    () => initialDragProjectPreview ? {
      projectId: initialDragProjectPreview.projectId,
      x: initialDragProjectPreview.x,
      y: initialDragProjectPreview.y,
      offsetX: initialDragProjectPreview.offsetX ?? 24,
      offsetY: initialDragProjectPreview.offsetY ?? ROW_HEIGHT / 2,
      width: initialDragProjectPreview.width ?? 320
    } : null
  );
  const draggingProjectIdRef = useRef2(null);
  const dragOverProjectRef = useRef2(null);
  const onMoveProjectRef = useRef2(onMoveProject);
  onMoveProjectRef.current = onMoveProject;
  const [contextMenu, setContextMenu] = useState2(initialContextMenu);
  useEffect3(() => {
    if (!contextMenu) return;
    const handlePointerDown = (ev) => {
      const target = ev.target;
      if (target && target.closest('[data-testid="wbs-context-menu"]')) return;
      setContextMenu(null);
    };
    const handleKey = (ev) => {
      if (ev.key === "Escape") {
        setContextMenu(null);
      }
    };
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKey);
    };
  }, [contextMenu]);
  const cleanupPointerListenersRef = useRef2(null);
  const lastMouseDownInteractiveRef = useRef2(false);
  const onMoveItemRef = useRef2(onMoveItem);
  onMoveItemRef.current = onMoveItem;
  const onMoveItemsRef = useRef2(onMoveItems);
  onMoveItemsRef.current = onMoveItems;
  const guardMoveRowUnlocked = (sourceId, targetId) => {
    if (!guardItemUnlocked(sourceId, "mover tarea de posici\xF3n en la tabla")) {
      return false;
    }
    if (targetId.startsWith("project:")) {
      return guardProjectUnlocked(
        targetId.slice("project:".length),
        "mover tarea dentro de un proyecto bloqueado"
      );
    }
    return guardItemUnlocked(
      targetId,
      "mover tarea dentro de un proyecto bloqueado"
    );
  };
  useEffect3(() => {
    return () => {
      cleanupPointerListenersRef.current?.();
      if (typeof document !== "undefined") {
        document.body.style.cursor = "";
      }
    };
  }, []);
  const resolveEffectiveDropPosition = (sourceId, targetId, rawPos) => {
    if (!sourceId || !targetId || targetId.startsWith("project:")) return "after";
    const currentItems = itemsRef.current;
    const sourceItem = currentItems.find((it) => it.id === sourceId);
    const targetItem = currentItems.find((it) => it.id === targetId);
    if (!sourceItem || !targetItem) return rawPos;
    const fallbackPid = projects[0]?.id;
    const sPid = sourceItem.projectId || fallbackPid;
    const tPid = targetItem.projectId || fallbackPid;
    if (sPid === tPid) {
      const sameProj = currentItems.filter(
        (it) => (it.projectId || fallbackPid) === tPid
      );
      const sIdx = sameProj.findIndex((it) => it.id === sourceId);
      const tIdx = sameProj.findIndex((it) => it.id === targetId);
      if (sIdx !== -1 && tIdx !== -1) {
        if (tIdx === sIdx + 1 && rawPos === "before") return "after";
        if (tIdx === sIdx - 1 && rawPos === "after") return "before";
      }
    }
    return rawPos;
  };
  const startTaskRowReorderDrag = (itemId, startX, startY, opts) => {
    cleanupPointerListenersRef.current?.();
    const rowRect = opts?.rowRect;
    const fromTimeline = Boolean(opts?.fromTimeline);
    const previewWidth = rowRect ? Math.min(Math.max(240, rowRect.width), Math.max(280, splitWidth - 16), 440) : 320;
    const grabOffsetX = rowRect ? Math.min(Math.max(16, startX - rowRect.left), previewWidth - 24) : 24;
    const grabOffsetY = rowRect ? Math.min(Math.max(8, startY - rowRect.top), ROW_HEIGHT - 8) : ROW_HEIGHT / 2;
    const initialScrollTop = scrollContainerRef.current?.scrollTop ?? 0;
    const tableSnapshots = Array.from(
      document.querySelectorAll("[data-task-row], [data-project-group]")
    ).map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        taskRowId: node.getAttribute("data-task-row"),
        projGroupId: node.getAttribute("data-project-group"),
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height
      };
    });
    const timelineSnapshots = tableSnapshots.length === 0 ? Array.from(
      document.querySelectorAll("[data-timeline-bar-row]")
    ).map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        taskRowId: node.getAttribute("data-timeline-bar-row"),
        projGroupId: null,
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height
      };
    }) : [];
    const snapshots = tableSnapshots.length > 0 ? tableSnapshots : timelineSnapshots;
    const movingMultiIds = effectiveMultiItemIds.has(itemId) && effectiveMultiItemIds.size > 1 ? new Set(effectiveMultiItemIds) : null;
    const resetRowDragVisuals = () => {
      draggingRowIdRef.current = null;
      draggingMultiRowIdsRef.current = null;
      dragOverRowRef.current = null;
      setDraggingRowId(null);
      setDraggingMultiRowIds(null);
      setDragVerticalDeltaY(0);
      setDragOverRow(null);
      setDragRowPreview(null);
      if (typeof document !== "undefined") {
        document.body.style.cursor = "";
      }
    };
    const detachListeners = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown, true);
      if (cleanupPointerListenersRef.current === detachListeners) {
        cleanupPointerListenersRef.current = null;
      }
    };
    const onKeyDown = (keyEvent) => {
      if (keyEvent.key === "Escape" && draggingRowIdRef.current) {
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        detachListeners();
        resetRowDragVisuals();
      }
    };
    const updateHitTarget = (clientX, clientY) => {
      const scrollDelta = (scrollContainerRef.current?.scrollTop ?? 0) - initialScrollTop;
      setDragVerticalDeltaY(clientY - startY + scrollDelta);
      if (!fromTimeline) {
        setDragRowPreview({
          itemId,
          x: clientX,
          y: clientY,
          offsetX: grabOffsetX,
          offsetY: grabOffsetY,
          width: previewWidth,
          multiCount: movingMultiIds?.size
        });
      }
      const moveY = clientY + scrollDelta;
      let matched = null;
      let minDistance = Infinity;
      for (const snap of snapshots) {
        if (moveY >= snap.top && moveY <= snap.bottom) {
          matched = snap;
          minDistance = 0;
          break;
        }
        const distToNode = Math.min(
          Math.abs(moveY - snap.top),
          Math.abs(moveY - snap.bottom)
        );
        if (distToNode < minDistance && distToNode <= 28) {
          minDistance = distToNode;
          matched = snap;
        }
      }
      if (matched) {
        if (matched.taskRowId) {
          if (matched.taskRowId === itemId || movingMultiIds && movingMultiIds.has(matched.taskRowId)) {
            dragOverRowRef.current = null;
            setDragOverRow(null);
          } else {
            const relY = moveY - matched.top;
            const rawPosition = relY < matched.height / 2 ? "before" : "after";
            const position = resolveEffectiveDropPosition(
              itemId,
              matched.taskRowId,
              rawPosition
            );
            const nextOver = { id: matched.taskRowId, position };
            dragOverRowRef.current = nextOver;
            setDragOverRow(nextOver);
          }
        } else if (matched.projGroupId) {
          const nextOver = {
            id: `project:${matched.projGroupId}`,
            position: "after"
          };
          dragOverRowRef.current = nextOver;
          setDragOverRow(nextOver);
        }
      } else {
        dragOverRowRef.current = null;
        setDragOverRow(null);
      }
    };
    const onMouseMove = (moveEvent) => {
      if (typeof moveEvent.buttons === "number" && (moveEvent.buttons & 1) === 0) {
        detachListeners();
        resetRowDragVisuals();
        return;
      }
      const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (!draggingRowIdRef.current && dist < 4) {
        return;
      }
      if (!draggingRowIdRef.current) {
        const idsToCheck = movingMultiIds ? Array.from(movingMultiIds) : [itemId];
        for (const id of idsToCheck) {
          if (!guardItemUnlocked(id, "reordenar tarea en la tabla")) {
            detachListeners();
            resetRowDragVisuals();
            return;
          }
        }
        draggingRowIdRef.current = itemId;
        draggingMultiRowIdsRef.current = movingMultiIds;
        setDraggingRowId(itemId);
        setDraggingMultiRowIds(movingMultiIds);
        if (typeof document !== "undefined") {
          document.body.style.cursor = "grabbing";
        }
      }
      updateHitTarget(moveEvent.clientX, moveEvent.clientY);
    };
    const onMouseUp = () => {
      detachListeners();
      const activeSource = draggingRowIdRef.current;
      const activeMultiSources = draggingMultiRowIdsRef.current;
      const activeTarget = dragOverRowRef.current;
      resetRowDragVisuals();
      if (activeSource && activeTarget && activeSource !== activeTarget.id) {
        if (activeMultiSources && activeMultiSources.size > 1 && onMoveItemsRef.current) {
          const ids = Array.from(activeMultiSources);
          const allUnlocked = ids.every(
            (id) => guardMoveRowUnlocked(id, activeTarget.id)
          );
          if (allUnlocked) {
            onMoveItemsRef.current(ids, activeTarget.id, activeTarget.position);
          }
        } else if (onMoveItemRef.current) {
          if (guardMoveRowUnlocked(activeSource, activeTarget.id)) {
            onMoveItemRef.current(
              activeSource,
              activeTarget.id,
              activeTarget.position
            );
          }
        }
      }
    };
    if (opts?.immediateStart) {
      const idsToCheck = movingMultiIds ? Array.from(movingMultiIds) : [itemId];
      for (const id of idsToCheck) {
        if (!guardItemUnlocked(id, "reordenar tarea")) {
          return;
        }
      }
      draggingRowIdRef.current = itemId;
      draggingMultiRowIdsRef.current = movingMultiIds;
      setDraggingRowId(itemId);
      setDraggingMultiRowIds(movingMultiIds);
      if (typeof document !== "undefined") {
        document.body.style.cursor = "grabbing";
      }
      updateHitTarget(opts.clientX ?? startX, opts.clientY ?? startY);
    }
    cleanupPointerListenersRef.current = detachListeners;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown, true);
  };
  const handleRowPointerMouseDown = (e, itemId, fromGripHandle = false) => {
    if (e.button !== 0) return;
    if (!fromGripHandle && (e.metaKey || e.ctrlKey || e.shiftKey)) return;
    const targetEl = e.target;
    if (!fromGripHandle && targetEl && targetEl.closest("input, button, select, textarea, a")) {
      lastMouseDownInteractiveRef.current = true;
      return;
    }
    lastMouseDownInteractiveRef.current = false;
    e.preventDefault();
    if (fromGripHandle) {
      e.stopPropagation();
    }
    const rowEl = e.currentTarget.closest("[data-task-row]");
    startTaskRowReorderDrag(itemId, e.clientX, e.clientY, {
      rowRect: rowEl?.getBoundingClientRect(),
      fromTimeline: false
    });
  };
  const startProjectRowReorderDrag = (projectId, startX, startY, opts) => {
    cleanupPointerListenersRef.current?.();
    const rowRect = opts?.rowRect;
    const fromTimeline = Boolean(opts?.fromTimeline);
    const previewWidth = rowRect ? Math.min(Math.max(240, rowRect.width), Math.max(280, splitWidth - 16), 440) : 320;
    const grabOffsetX = rowRect ? Math.min(Math.max(16, startX - rowRect.left), previewWidth - 24) : 24;
    const grabOffsetY = rowRect ? Math.min(Math.max(8, startY - rowRect.top), ROW_HEIGHT - 8) : ROW_HEIGHT / 2;
    const sourceProj = projects.find((p) => p.id === projectId);
    const sourceReleaseId = sourceProj?.releaseId || "";
    const initialScrollTop = scrollContainerRef.current?.scrollTop ?? 0;
    const tableProjSnapshots = Array.from(
      document.querySelectorAll("[data-project-group]")
    ).map((node) => {
      const projId = node.getAttribute("data-project-group");
      const proj = projects.find((p) => p.id === projId);
      if (!projId || !proj || (proj.releaseId || "") !== sourceReleaseId) return null;
      const rect = node.getBoundingClientRect();
      return { projId, top: rect.top, bottom: rect.bottom, height: rect.height };
    }).filter((x) => Boolean(x));
    const timelineProjSnapshots = tableProjSnapshots.length === 0 ? Array.from(document.querySelectorAll("[data-project-summary-bar]")).map((node) => {
      const projId = node.getAttribute("data-project-summary-bar");
      const proj = projects.find((p) => p.id === projId);
      if (!projId || !proj || (proj.releaseId || "") !== sourceReleaseId) return null;
      const rect = node.getBoundingClientRect();
      return { projId, top: rect.top, bottom: rect.bottom, height: rect.height };
    }).filter((x) => Boolean(x)) : [];
    const projSnapshots = tableProjSnapshots.length > 0 ? tableProjSnapshots : timelineProjSnapshots;
    const resetProjectDragVisuals = () => {
      draggingProjectIdRef.current = null;
      dragOverProjectRef.current = null;
      setDraggingProjectId(null);
      setDragOverProject(null);
      setDragProjectPreview(null);
      if (typeof document !== "undefined") {
        document.body.style.cursor = "";
      }
    };
    const detachListeners = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown, true);
      if (cleanupPointerListenersRef.current === detachListeners) {
        cleanupPointerListenersRef.current = null;
      }
    };
    const onKeyDown = (keyEvent) => {
      if (keyEvent.key === "Escape" && draggingProjectIdRef.current) {
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        detachListeners();
        resetProjectDragVisuals();
      }
    };
    const updateHitTarget = (clientX, clientY) => {
      if (!fromTimeline) {
        setDragProjectPreview({
          projectId,
          x: clientX,
          y: clientY,
          offsetX: grabOffsetX,
          offsetY: grabOffsetY,
          width: previewWidth
        });
      }
      const scrollDelta = (scrollContainerRef.current?.scrollTop ?? 0) - initialScrollTop;
      const moveY = clientY + scrollDelta;
      let matched = null;
      let minDistance = Infinity;
      for (const snap of projSnapshots) {
        if (moveY >= snap.top && moveY <= snap.bottom) {
          matched = snap;
          minDistance = 0;
          break;
        }
        const distToNode = Math.min(
          Math.abs(moveY - snap.top),
          Math.abs(moveY - snap.bottom)
        );
        if (distToNode < minDistance && distToNode <= 48) {
          minDistance = distToNode;
          matched = snap;
        }
      }
      if (matched && matched.projId !== projectId) {
        const relY = moveY - matched.top;
        const rawPos = relY < matched.height / 2 ? "before" : "after";
        const sameRel = projects.filter((p) => (p.releaseId || "") === sourceReleaseId);
        const sIdx = sameRel.findIndex((p) => p.id === projectId);
        const tIdx = sameRel.findIndex((p) => p.id === matched.projId);
        let pos = rawPos;
        if (sIdx !== -1 && tIdx !== -1) {
          if (tIdx === sIdx + 1 && rawPos === "before") pos = "after";
          if (tIdx === sIdx - 1 && rawPos === "after") pos = "before";
        }
        const nextOver = { id: matched.projId, position: pos };
        dragOverProjectRef.current = nextOver;
        setDragOverProject(nextOver);
      } else {
        dragOverProjectRef.current = null;
        setDragOverProject(null);
      }
    };
    const onMouseMove = (moveEvent) => {
      if (typeof moveEvent.buttons === "number" && (moveEvent.buttons & 1) === 0) {
        detachListeners();
        resetProjectDragVisuals();
        return;
      }
      const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (!draggingProjectIdRef.current && dist < 4) {
        return;
      }
      if (!draggingProjectIdRef.current) {
        if (!guardProjectUnlocked(projectId, "reordenar proyecto en la tabla")) {
          detachListeners();
          resetProjectDragVisuals();
          return;
        }
        draggingProjectIdRef.current = projectId;
        setDraggingProjectId(projectId);
        if (typeof document !== "undefined") {
          document.body.style.cursor = "grabbing";
        }
      }
      updateHitTarget(moveEvent.clientX, moveEvent.clientY);
    };
    const onMouseUp = () => {
      detachListeners();
      const activeSource = draggingProjectIdRef.current;
      const activeTarget = dragOverProjectRef.current;
      resetProjectDragVisuals();
      if (activeSource && activeTarget && activeSource !== activeTarget.id && onMoveProjectRef.current) {
        if (guardProjectUnlocked(activeSource, "reordenar proyecto en la tabla")) {
          onMoveProjectRef.current(activeSource, activeTarget.id, activeTarget.position);
        }
      }
    };
    if (opts?.immediateStart) {
      if (!guardProjectUnlocked(projectId, "reordenar proyecto")) {
        return;
      }
      draggingProjectIdRef.current = projectId;
      setDraggingProjectId(projectId);
      if (typeof document !== "undefined") {
        document.body.style.cursor = "grabbing";
      }
      updateHitTarget(opts.clientX ?? startX, opts.clientY ?? startY);
    }
    cleanupPointerListenersRef.current = detachListeners;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown, true);
  };
  const handleProjectRowPointerMouseDown = (e, projectId, fromGripHandle = false) => {
    if (e.button !== 0) return;
    const targetEl = e.target;
    if (!fromGripHandle && targetEl && targetEl.closest("input, button, select, textarea, a")) {
      lastMouseDownInteractiveRef.current = true;
      return;
    }
    lastMouseDownInteractiveRef.current = false;
    e.preventDefault();
    if (fromGripHandle) {
      e.stopPropagation();
    }
    const rowEl = e.currentTarget.closest("[data-project-group]");
    startProjectRowReorderDrag(projectId, e.clientX, e.clientY, {
      rowRect: rowEl?.getBoundingClientRect(),
      fromTimeline: false
    });
  };
  const handleDragRowStart = (e, itemId) => {
    e.stopPropagation();
    const targetEl = e.target;
    if (lastMouseDownInteractiveRef.current || targetEl && targetEl.closest("input, button, select, textarea, a")) {
      e.preventDefault();
      return;
    }
    if (!guardItemUnlocked(itemId, "reordenar tarea en la tabla")) {
      e.preventDefault();
      return;
    }
    cleanupPointerListenersRef.current?.();
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.setData("application/x-gantt-task-id", itemId);
    e.dataTransfer.effectAllowed = "copyMove";
    draggingRowIdRef.current = itemId;
    setDraggingRowId(itemId);
  };
  const handleDragRowOver = (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const currentSource = draggingRowIdRef.current || draggingRowId;
    if (currentSource === targetId) {
      dragOverRowRef.current = null;
      setDragOverRow(null);
      return;
    }
    if (targetId.startsWith("project:")) {
      const nextOver2 = { id: targetId, position: "after" };
      dragOverRowRef.current = nextOver2;
      setDragOverRow(nextOver2);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const rawPosition = relY < rect.height / 2 ? "before" : "after";
    const position = currentSource ? resolveEffectiveDropPosition(currentSource, targetId, rawPosition) : rawPosition;
    const nextOver = { id: targetId, position };
    dragOverRowRef.current = nextOver;
    setDragOverRow(nextOver);
  };
  const handleDragRowLeave = (e) => {
    e.stopPropagation();
    const currentTarget = e.currentTarget;
    const related = e.relatedTarget;
    if (related && currentTarget.contains(related)) {
      return;
    }
    dragOverRowRef.current = null;
    setDragOverRow(null);
  };
  const handleDropRow = (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    cleanupPointerListenersRef.current?.();
    const sourceId = draggingRowIdRef.current || draggingRowId || e.dataTransfer.getData("application/x-gantt-task-id") || e.dataTransfer.getData("text/plain");
    if (sourceId && sourceId !== targetId && onMoveItem) {
      if (guardMoveRowUnlocked(sourceId, targetId)) {
        let position = "after";
        if (!targetId.startsWith("project:")) {
          const rect = e.currentTarget.getBoundingClientRect();
          if (rect.height > 0) {
            const rawPos = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
            position = resolveEffectiveDropPosition(sourceId, targetId, rawPos);
          } else if (dragOverRowRef.current?.id === targetId) {
            position = dragOverRowRef.current.position;
          }
        }
        onMoveItem(sourceId, targetId, position);
      }
    }
    draggingRowIdRef.current = null;
    dragOverRowRef.current = null;
    setDraggingRowId(null);
    setDragOverRow(null);
    setDragRowPreview(null);
    if (typeof document !== "undefined") {
      document.body.style.cursor = "";
    }
  };
  const handleDragRowEnd = (e) => {
    e?.stopPropagation();
    cleanupPointerListenersRef.current?.();
    draggingRowIdRef.current = null;
    dragOverRowRef.current = null;
    setDraggingRowId(null);
    setDragOverRow(null);
    setDragRowPreview(null);
    if (typeof document !== "undefined") {
      document.body.style.cursor = "";
    }
  };
  const maxTaskNameLength = useMemo(() => {
    let maxLen = 4;
    for (const it of items) {
      if (it.name && it.name.length > maxLen) {
        maxLen = it.name.length;
      }
    }
    return Math.min(37, maxLen);
  }, [items]);
  const maxProjectNameLength = useMemo(() => {
    let maxLen = 4;
    if (projects) {
      for (const p of projects) {
        if (p.name && p.name.length > maxLen) {
          maxLen = p.name.length;
        }
      }
    }
    return maxLen;
  }, [projects]);
  const hasAnyCritical = useMemo(() => {
    return items.some((it) => it.isCritical);
  }, [items]);
  const nameColumnWidth = useMemo(() => {
    const maxTeamLength = items.reduce((acc, it) => Math.max(acc, (it.assignee || "").length), 0);
    const teamBadgeWidth = visibleColumns.team && maxTeamLength > 0 ? Math.ceil(maxTeamLength * 6.2) + 24 : 0;
    const taskColWidth = 92 + (hasAnyCritical ? 36 : 0) + Math.ceil(maxTaskNameLength * 6.2) + teamBadgeWidth + 8;
    const projColWidth = 106 + Math.ceil(maxProjectNameLength * 6.2) + 8;
    return Math.max(120, Math.max(taskColWidth, projColWidth));
  }, [maxTaskNameLength, maxProjectNameLength, hasAnyCritical, visibleColumns.team, items]);
  const tableMinWidth = useMemo(() => {
    let w = nameColumnWidth + 24;
    if (visibleColumns.dates) w += 176;
    if (visibleColumns.dur) w += 64;
    if (visibleColumns.slack) w += 56;
    if (visibleColumns.deps) w += 80;
    w += 112;
    return w;
  }, [nameColumnWidth, visibleColumns]);
  const [fallbackArrowVisibility, setFallbackArrowVisibility] = useState2("all");
  const [fallbackDayWidth, setFallbackDayWidth] = useState2(
    () => getDayWidthForPreset(zoom)
  );
  const arrowVisibility = controlledArrowVisibility !== void 0 ? controlledArrowVisibility : fallbackArrowVisibility;
  const handleArrowVisibilityChange = (next) => {
    if (onChangeArrowVisibility) {
      onChangeArrowVisibility(next);
    } else {
      setFallbackArrowVisibility(next);
    }
  };
  useEffect3(() => {
    if (controlledDayWidth === void 0) {
      setFallbackDayWidth(getDayWidthForPreset(zoom));
    }
  }, [zoom, controlledDayWidth]);
  const [dragState, setDragState] = useState2(null);
  const isResizingSplitRef = useRef2(false);
  const canvasRef = useRef2(null);
  const virtualScrollLeftRef = useRef2(null);
  const timelineDaysCountRef = useRef2(60);
  const dayWidth = clampDayWidth(
    controlledDayWidth !== void 0 ? controlledDayWidth : fallbackDayWidth
  );
  const updateDayWidth = (next) => {
    const clamped = clampDayWidth(next);
    if (onChangeDayWidth) {
      onChangeDayWidth(clamped);
    } else {
      setFallbackDayWidth(clamped);
    }
  };
  const handleZoomChange = (next, anchorViewportX) => {
    const clamped = clampDayWidth(next);
    const container = scrollContainerRef.current;
    if (container && container.clientWidth > 0 && dayWidth > 0 && clamped !== dayWidth) {
      const anchorX = anchorViewportX !== void 0 ? Math.max(0, Math.min(container.clientWidth, anchorViewportX)) : container.clientWidth / 2;
      const currentScroll = virtualScrollLeftRef.current !== null ? virtualScrollLeftRef.current : container.scrollLeft;
      const dayAtAnchor = (currentScroll + anchorX) / dayWidth;
      const nextScrollLeft = Math.max(0, dayAtAnchor * clamped - anchorX);
      virtualScrollLeftRef.current = nextScrollLeft;
      if (canvasRef.current) {
        canvasRef.current.style.width = `${timelineDaysCountRef.current * clamped}px`;
      }
      container.scrollLeft = nextScrollLeft;
    }
    updateDayWidth(clamped);
  };
  const timelineStartRef = useRef2(void 0);
  const handleFitProjectAction = (targetProjectId) => {
    const isFocusedFit = !targetProjectId && isFocusMode && Boolean(focusEntity);
    const pid = isFocusedFit ? void 0 : targetProjectId || selectedProjectId || "all";
    const expandProjectId = targetProjectId || (isFocusedFit && focusEntity?.type === "project" ? focusEntity.id : void 0);
    if (expandProjectId && onToggleProjectCollapse) {
      const targetProj = projects.find((p) => p.id === expandProjectId);
      if (targetProj?.collapsed) {
        onToggleProjectCollapse(expandProjectId);
      }
    }
    if (onFitToProject) {
      onFitToProject(pid, { timelineStart: timelineStartRef.current });
      return;
    }
    const container = scrollContainerRef.current;
    const viewportW = container && container.clientWidth > 0 ? container.clientWidth : 960;
    const fit = computeFitToProjectScale(items, viewportW, {
      projectId: pid,
      focusEntity: isFocusedFit ? focusEntity : null,
      projects,
      releases,
      timelineStart: timelineStartRef.current
    });
    if (canvasRef.current) {
      canvasRef.current.style.width = `${timelineDaysCountRef.current * fit.dayWidth}px`;
    }
    virtualScrollLeftRef.current = fit.scrollLeft;
    updateDayWidth(fit.dayWidth);
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTo({ left: fit.scrollLeft, behavior: "smooth" });
      });
    }
  };
  const dayWidthRef = useRef2(dayWidth);
  dayWidthRef.current = dayWidth;
  const wheelZoomRef = useRef2(wheelZoomEnabled);
  wheelZoomRef.current = wheelZoomEnabled;
  const onChangeDayWidthRef = useRef2(onChangeDayWidth);
  onChangeDayWidthRef.current = onChangeDayWidth;
  useEffect3(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleWheel = (e) => {
      const hasZoomModifier = e.ctrlKey || e.metaKey;
      if (!hasZoomModifier) {
        return;
      }
      if (e.deltaY === 0) return;
      e.preventDefault();
      const oldWidth = dayWidthRef.current;
      const nextWidth = computeWheelZoomDayWidth(oldWidth, e.deltaY);
      if (nextWidth === oldWidth) return;
      const rect = container.getBoundingClientRect();
      const cursorViewportX = Math.max(
        0,
        Math.min(rect.width, e.clientX - rect.left)
      );
      const currentScrollLeft = virtualScrollLeftRef.current !== null ? virtualScrollLeftRef.current : container.scrollLeft;
      const dayAtCursor = (currentScrollLeft + cursorViewportX) / oldWidth;
      const nextScrollLeft = Math.max(0, dayAtCursor * nextWidth - cursorViewportX);
      virtualScrollLeftRef.current = nextScrollLeft;
      dayWidthRef.current = nextWidth;
      if (canvasRef.current) {
        canvasRef.current.style.width = `${timelineDaysCountRef.current * nextWidth}px`;
      }
      container.scrollLeft = nextScrollLeft;
      if (onChangeDayWidthRef.current) {
        onChangeDayWidthRef.current(nextWidth);
      } else {
        setFallbackDayWidth(nextWidth);
      }
    };
    const handleScroll = () => {
      virtualScrollLeftRef.current = container.scrollLeft;
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [scrollContainerRef]);
  useEffect3(() => {
    if (virtualScrollLeftRef.current !== null && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = virtualScrollLeftRef.current;
    }
  }, [dayWidth]);
  const effectiveItems = useMemo(() => {
    if (!dragState || dragState.dayDelta === 0) return items;
    return items.map((it) => {
      if (dragState.mode === "move" && dragState.multiItems) {
        const entry = dragState.multiItems.get(it.id);
        if (!entry) return it;
        const newStart = formatDateISO(addDays2(entry.origStart, dragState.dayDelta));
        const newEnd = entry.type === "milestone" ? newStart : calculateEndDateFromDuration(newStart, entry.origDuration, "task");
        const newSlackEnd = formatDateISO(
          addDays2(parseDateSafe(newEnd), Math.max(0, it.slack || 0))
        );
        return {
          ...it,
          startDate: newStart,
          endDate: newEnd,
          slackEndDate: newSlackEnd
        };
      }
      if (it.id !== dragState.itemId) return it;
      if (dragState.mode === "move") {
        const newStart = formatDateISO(addDays2(dragState.origStart, dragState.dayDelta));
        const newEnd = it.type === "milestone" ? newStart : calculateEndDateFromDuration(newStart, dragState.origDuration, "task", workCalendar);
        const newSlackEnd = formatDateISO(
          addDays2(parseDateSafe(newEnd), Math.max(0, it.slack || 0))
        );
        return {
          ...it,
          startDate: newStart,
          endDate: newEnd,
          slackEndDate: newSlackEnd
        };
      }
      if (dragState.mode === "resize" && it.type === "task") {
        const newDur = Math.max(1, dragState.origDuration + dragState.dayDelta);
        const newEnd = calculateEndDateFromDuration(it.startDate, newDur, "task", workCalendar);
        const newSlackEnd = formatDateISO(
          addDays2(parseDateSafe(newEnd), Math.max(0, it.slack || 0))
        );
        return {
          ...it,
          duration: newDur,
          endDate: newEnd,
          slackEndDate: newSlackEnd
        };
      }
      if (dragState.mode === "resize-start" && it.type === "task") {
        const maxDelta = dragState.origDuration - 1;
        const clampedDelta = Math.min(maxDelta, dragState.dayDelta);
        const newStart = formatDateISO(addDays2(dragState.origStart, clampedDelta));
        const newDur = Math.max(1, dragState.origDuration - clampedDelta);
        return {
          ...it,
          startDate: newStart,
          duration: newDur
        };
      }
      if (dragState.mode === "progress" && it.type === "task") {
        return {
          ...it,
          progress: dragState.nextProgress ?? it.progress
        };
      }
      return it;
    });
  }, [items, dragState, workCalendar]);
  const baselineItemMap = useMemo(() => {
    if (!baselineSnapshot) return null;
    return new Map(baselineSnapshot.items.map((it) => [it.id, it]));
  }, [baselineSnapshot]);
  const allProjectGroups = useMemo(
    () => groupItemsByProject(effectiveItems, projects),
    [effectiveItems, projects]
  );
  const enrichedItemById = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const g of allProjectGroups) {
      for (const it of g.items) {
        map.set(it.id, it);
      }
    }
    return map;
  }, [allProjectGroups]);
  const focusRelatedSets = useMemo(() => {
    if (!isFocusMode || !focusEntity) return null;
    const res = getRelatedFocusEntityIds(focusEntity, effectiveItems, projects);
    return {
      itemIds: new Set(res.itemIds),
      projectIds: new Set(res.projectIds),
      releaseIds: new Set(res.releaseIds)
    };
  }, [isFocusMode, focusEntity, effectiveItems, projects]);
  const matchesPredecessorText = (it, q) => {
    const deps = it.dependencies || [];
    if (deps.length === 0) return false;
    return deps.some((depId) => {
      if (depId.toLowerCase().includes(q)) return true;
      const pred = enrichedItemById.get(depId);
      if (!pred) return false;
      const depType = it.dependencyTypes?.[depId] || "FS";
      const predDisplayId = pred.displayId || "";
      const predWbs = pred.wbsCode || String(pred.wbs ?? "");
      return pred.name.toLowerCase().includes(q) || predDisplayId.toLowerCase().includes(q) || predWbs.toLowerCase().includes(q) || depType.toLowerCase().includes(q);
    });
  };
  const doesProjectMatchQuery = (proj, projectIndex, q) => {
    if (searchFields.name && proj.name.toLowerCase().includes(q)) return true;
    if (searchFields.description && proj.description && proj.description.toLowerCase().includes(q)) {
      return true;
    }
    if (searchFields.platform && proj.platform && proj.platform.toLowerCase().includes(q)) {
      return true;
    }
    if (searchFields.displayId && projectIndex !== void 0 && (`p${projectIndex}`.includes(q) || String(projectIndex) === q)) {
      return true;
    }
    return false;
  };
  const doesItemMatchQuery = (it, q) => {
    if (searchFields.name && it.name.toLowerCase().includes(q)) return true;
    if (searchFields.description && it.notes && it.notes.toLowerCase().includes(q)) return true;
    if (searchFields.assignee && it.assignee && it.assignee.toLowerCase().includes(q)) return true;
    if (searchFields.platform && it.platform && it.platform.toLowerCase().includes(q)) return true;
    if (searchFields.predecessors && matchesPredecessorText(it, q)) return true;
    if (searchFields.displayId && (it.displayId && it.displayId.toLowerCase().includes(q) || it.wbsCode && it.wbsCode.toLowerCase().includes(q))) {
      return true;
    }
    return false;
  };
  const visibleProjectGroups = useMemo(() => {
    let filtered = filterGroupsBySelectedProjects(
      allProjectGroups,
      selectedProjectIds,
      selectedProjectId
    );
    if (hiddenReleaseIds && hiddenReleaseIds.length > 0) {
      const hiddenSet = new Set(hiddenReleaseIds);
      filtered = filtered.filter(
        (g) => !g.project.releaseId || !hiddenSet.has(g.project.releaseId)
      );
    }
    const rawEffectivePlatform = tablePlatformFilter !== "all" ? tablePlatformFilter : selectedPlatform && selectedPlatform !== "all" ? selectedPlatform : "all";
    const effectivePlatform = rawEffectivePlatform === "all" ? "all" : normalizePlatform(rawEffectivePlatform) || "iOS/Android";
    if (effectivePlatform !== "all") {
      filtered = filtered.filter((g) => {
        const projPlat = normalizePlatform(g.project.platform) || "iOS/Android";
        return projPlat === effectivePlatform || g.items.some((it) => {
          const itPlat = normalizePlatform(it.platform || g.project.platform) || "iOS/Android";
          return itPlat === effectivePlatform;
        });
      });
    }
    if (tableReleaseFilter !== "all") {
      const targetRel = releases.find((r) => r.code === tableReleaseFilter);
      const targetRelId = targetRel?.id;
      filtered = filtered.filter(
        (g) => targetRelId && g.project.releaseId === targetRelId || targetRelId && g.items.some((it) => it.releaseId === targetRelId)
      );
    }
    if (tableTypeFilter === "TAREA") {
      filtered = filtered.filter((g) => g.items.some((it) => it.type === "task"));
    } else if (tableTypeFilter === "HITO") {
      filtered = filtered.filter((g) => g.items.some((it) => it.type === "milestone"));
    }
    if (tableAlertFilter !== "all") {
      filtered = filtered.filter(
        (g) => (g.project.alertLevel ?? 0) === tableAlertFilter || g.items.some((it) => (it.alertLevel ?? 0) === tableAlertFilter)
      );
    }
    const query = tableSearchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((g) => {
        if (doesProjectMatchQuery(g.project, g.projectIndex, query)) return true;
        return g.items.some((it) => doesItemMatchQuery(it, query));
      });
    }
    const excludeQ = tableExcludeQuery.trim().toLowerCase();
    if (excludeQ) {
      filtered = filtered.filter((g) => {
        if (doesProjectMatchQuery(g.project, g.projectIndex, excludeQ)) return false;
        if (g.items.length === 0) return true;
        return g.items.some((it) => !doesItemMatchQuery(it, excludeQ));
      });
    }
    if (focusRelatedSets) {
      filtered = filtered.filter((g) => focusRelatedSets.projectIds.has(g.project.id));
    }
    return filtered;
  }, [
    allProjectGroups,
    selectedProjectIds,
    selectedProjectId,
    hiddenReleaseIds,
    releases,
    tableReleaseFilter,
    tableTypeFilter,
    selectedPlatform,
    tablePlatformFilter,
    tableAlertFilter,
    tableSearchQuery,
    tableExcludeQuery,
    searchFields,
    enrichedItemById,
    focusRelatedSets
  ]);
  const visibleMilestones = useMemo(() => {
    const list = [];
    for (const group of visibleProjectGroups) {
      for (const it of group.items) {
        if (it.type === "milestone") {
          list.push(it);
        }
      }
    }
    return list;
  }, [visibleProjectGroups]);
  const displayRows = useMemo(() => {
    const rows = [];
    const effectivePlatform = tablePlatformFilter !== "all" ? tablePlatformFilter : selectedPlatform && selectedPlatform !== "all" ? selectedPlatform : "all";
    const query = tableSearchQuery.trim().toLowerCase();
    const excludeQ = tableExcludeQuery.trim().toLowerCase();
    const targetRelForFilter = tableReleaseFilter !== "all" ? releases.find((r) => r.code === tableReleaseFilter) : void 0;
    const itemMatchesFilter = (it, proj, projectIndex) => {
      if (tableTypeFilter === "TAREA" && it.type !== "task") {
        return false;
      }
      if (tableTypeFilter === "HITO" && it.type !== "milestone") {
        return false;
      }
      if (tableReleaseFilter !== "all") {
        const relId = targetRelForFilter?.id;
        if (!relId || it.releaseId !== relId && proj.releaseId !== relId) {
          return false;
        }
      }
      if (effectivePlatform !== "all") {
        const targetPlat = normalizePlatform(effectivePlatform) || "iOS/Android";
        const plat = normalizePlatform(it.platform || proj.platform) || "iOS/Android";
        const projPlat = normalizePlatform(proj.platform) || "iOS/Android";
        if (plat !== targetPlat && !(showSubtasksOnFilter && projPlat === targetPlat)) {
          return false;
        }
      }
      if (tableAlertFilter !== "all") {
        const itemAlertMatches = (it.alertLevel ?? 0) === tableAlertFilter;
        const projAlertMatches = (proj.alertLevel ?? 0) === tableAlertFilter;
        if (!itemAlertMatches && !(showSubtasksOnFilter && projAlertMatches)) {
          return false;
        }
      }
      if (excludeQ) {
        if (doesItemMatchQuery(it, excludeQ)) return false;
        if (doesProjectMatchQuery(proj, projectIndex, excludeQ)) return false;
      }
      if (!query) return true;
      if (doesItemMatchQuery(it, query)) return true;
      if (showSubtasksOnFilter && doesProjectMatchQuery(proj, projectIndex, query)) {
        return true;
      }
      return false;
    };
    if (groupingMode === "release" && releases.length > 0) {
      const visibleProjects = visibleProjectGroups.map((g) => g.project);
      if (visibleProjects.length === 0) {
        return [];
      }
      const allowedProjIds = new Set(visibleProjects.map((p) => p.id));
      const externalMilestones = effectiveItems.filter(
        (it) => it.type === "milestone" && Boolean(it.isExternal)
      );
      const externalGroup = buildExternalMilestonesGroup(externalMilestones);
      if (externalGroup) {
        const matchingExternalItems = externalGroup.items.filter((item) => {
          if (focusRelatedSets && !focusRelatedSets.itemIds.has(item.id)) return false;
          return itemMatchesFilter(item, externalGroup.project, 0);
        });
        if (matchingExternalItems.length > 0) {
          rows.push({
            kind: "project",
            rowId: `proj-${externalGroup.project.id}`,
            group: externalGroup
          });
          for (const item of matchingExternalItems) {
            rows.push({
              kind: "item",
              rowId: item.id,
              item,
              group: externalGroup
            });
          }
          rows.push({
            kind: "add-task",
            rowId: `add-task-${externalGroup.project.id}`,
            group: externalGroup
          });
        }
      }
      const visibleItems = effectiveItems.filter(
        (it) => !(it.type === "milestone" && Boolean(it.isExternal)) && it.projectId && allowedProjIds.has(it.projectId)
      );
      const releaseGroups = groupItemsByReleaseAndProject(
        visibleItems,
        visibleProjects,
        releases
      );
      for (const rg of releaseGroups) {
        if (hiddenReleaseIds && hiddenReleaseIds.includes(rg.release.id)) {
          continue;
        }
        if (tableReleaseFilter !== "all" && rg.release.code !== tableReleaseFilter) {
          continue;
        }
        if (focusRelatedSets && !focusRelatedSets.releaseIds.has(rg.release.id)) {
          continue;
        }
        rows.push({
          kind: "release",
          rowId: `release:${rg.release.id}`,
          group: rg
        });
        if (tableTypeFilter === "RELEASE") {
          continue;
        }
        if (!collapsedReleaseIds.has(rg.release.id) || recentlyCollapsedParentIds.has(`rel:${rg.release.id}`)) {
          for (const group of rg.projectGroups) {
            rows.push({
              kind: "project",
              rowId: `proj-${group.project.id}`,
              group
            });
            if (tableTypeFilter === "PROYECTO") {
              continue;
            }
            if (!group.project.collapsed || recentlyCollapsedParentIds.has(`proj:${group.project.id}`)) {
              if (group.items.length === 0) {
                rows.push({
                  kind: "empty-project",
                  rowId: `empty-proj-${group.project.id}`,
                  group
                });
              } else {
                for (const item of group.items) {
                  if (focusRelatedSets && !focusRelatedSets.itemIds.has(item.id)) {
                    continue;
                  }
                  if (!itemMatchesFilter(item, group.project, group.projectIndex)) {
                    continue;
                  }
                  rows.push({
                    kind: "item",
                    rowId: item.id,
                    item,
                    group
                  });
                }
                rows.push({
                  kind: "add-task",
                  rowId: `add-task-${group.project.id}`,
                  group
                });
              }
            }
          }
          if (onCreateProject && rg.release.id !== "__unassigned__") {
            rows.push({
              kind: "add-project",
              rowId: `add-project-${rg.release.id}`,
              group: rg
            });
          }
        }
      }
    } else if (groupByProject) {
      if (tableTypeFilter !== "RELEASE") {
        for (const group of visibleProjectGroups) {
          rows.push({
            kind: "project",
            rowId: `proj-${group.project.id}`,
            group
          });
          if (tableTypeFilter === "PROYECTO") {
            continue;
          }
          if (!group.project.collapsed || recentlyCollapsedParentIds.has(`proj:${group.project.id}`)) {
            if (group.items.length === 0) {
              rows.push({
                kind: "empty-project",
                rowId: `empty-proj-${group.project.id}`,
                group
              });
            } else {
              for (const item of group.items) {
                if (focusRelatedSets && !focusRelatedSets.itemIds.has(item.id)) {
                  continue;
                }
                if (!itemMatchesFilter(item, group.project, group.projectIndex)) {
                  continue;
                }
                rows.push({
                  kind: "item",
                  rowId: item.id,
                  item,
                  group
                });
              }
              rows.push({
                kind: "add-task",
                rowId: `add-task-${group.project.id}`,
                group
              });
            }
          }
        }
      }
    } else {
      if (tableTypeFilter !== "RELEASE" && tableTypeFilter !== "PROYECTO") {
        for (const group of visibleProjectGroups) {
          for (const item of group.items) {
            if (focusRelatedSets && !focusRelatedSets.itemIds.has(item.id)) {
              continue;
            }
            if (!itemMatchesFilter(item, group.project, group.projectIndex)) {
              continue;
            }
            rows.push({
              kind: "item",
              rowId: item.id,
              item,
              group
            });
          }
        }
      }
    }
    return rows;
  }, [
    groupingMode,
    releases,
    collapsedReleaseIds,
    recentlyCollapsedParentIds,
    groupByProject,
    visibleProjectGroups,
    effectiveItems,
    projects,
    hiddenReleaseIds,
    focusRelatedSets,
    tableSearchQuery,
    tableExcludeQuery,
    tableTypeFilter,
    tableReleaseFilter,
    tablePlatformFilter,
    selectedPlatform,
    tableAlertFilter,
    showSubtasksOnFilter,
    searchFields,
    enrichedItemById
  ]);
  useLayoutEffect(() => {
    const anchor = collapseScrollAnchorRef.current;
    if (!anchor || typeof document === "undefined" || typeof window === "undefined") return;
    const el = document.querySelector(anchor.selector);
    if (!el) {
      collapseScrollAnchorRef.current = null;
      return;
    }
    const newTop = el.getBoundingClientRect().top;
    const delta = newTop - anchor.viewportTop;
    const desiredScrollY = Math.max(0, window.scrollY + delta);
    const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (desiredScrollY > maxScrollY + 1) {
      setCollapseBottomSpacerPx((prev) => prev + Math.ceil(desiredScrollY - maxScrollY) + 16);
      return;
    }
    if (Math.abs(delta) > 0.5) {
      window.scrollTo(window.scrollX, desiredScrollY);
    }
    collapseScrollAnchorRef.current = null;
  }, [displayRows, recentlyCollapsedParentIds, collapseBottomSpacerPx]);
  const isAnyRowOrProjectDragging = Boolean(draggingRowId || draggingProjectId);
  const rowDragShiftYByRowId = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    if (draggingRowId && dragOverRow && !dragOverRow.id.startsWith("project:")) {
      if (draggingMultiRowIds && draggingMultiRowIds.size > 1) {
        const movingIndices = displayRows.map((r, idx) => r.kind === "item" && draggingMultiRowIds.has(r.item.id) ? idx : -1).filter((idx) => idx !== -1);
        const targetRow = displayRows.find(
          (r) => r.kind === "item" && r.item.id === dragOverRow.id
        );
        if (movingIndices.length > 0 && targetRow) {
          const movingRows = movingIndices.map((idx) => displayRows[idx]);
          const movingSet = new Set(movingRows.map((r) => r.rowId));
          const remaining = displayRows.filter((r) => !movingSet.has(r.rowId));
          const targetInRemaining = remaining.findIndex((r) => r.rowId === targetRow.rowId);
          if (targetInRemaining !== -1) {
            const insertIdx = dragOverRow.position === "before" ? targetInRemaining : targetInRemaining + 1;
            const simulated = [...remaining];
            simulated.splice(insertIdx, 0, ...movingRows);
            simulated.forEach((r, newIdx) => {
              const oldIdx = displayRows.findIndex((orig) => orig.rowId === r.rowId);
              if (oldIdx !== -1 && newIdx !== oldIdx) {
                map.set(r.rowId, (newIdx - oldIdx) * ROW_HEIGHT);
              }
            });
          }
        }
      } else {
        const dragIdx = displayRows.findIndex(
          (r) => r.kind === "item" && r.item.id === draggingRowId
        );
        const targetIdx = displayRows.findIndex(
          (r) => r.kind === "item" && r.item.id === dragOverRow.id
        );
        if (dragIdx !== -1 && targetIdx !== -1 && dragIdx !== targetIdx) {
          const destIdx = dragIdx < targetIdx ? dragOverRow.position === "before" ? targetIdx - 1 : targetIdx : dragOverRow.position === "before" ? targetIdx : targetIdx + 1;
          if (destIdx !== dragIdx) {
            map.set(displayRows[dragIdx].rowId, (destIdx - dragIdx) * ROW_HEIGHT);
            if (dragIdx < destIdx) {
              for (let i = dragIdx + 1; i <= destIdx; i++) {
                map.set(displayRows[i].rowId, -ROW_HEIGHT);
              }
            } else {
              for (let i = destIdx; i < dragIdx; i++) {
                map.set(displayRows[i].rowId, ROW_HEIGHT);
              }
            }
          }
        }
      }
    } else if (draggingProjectId && dragOverProject) {
      const findProjectSlice = (pid) => {
        const start = displayRows.findIndex(
          (r) => r.kind === "project" && r.group.project.id === pid
        );
        if (start === -1) return null;
        let end = start;
        while (end + 1 < displayRows.length) {
          const next = displayRows[end + 1];
          if (next.kind === "project" || next.kind === "release" || next.kind === "add-project") {
            break;
          }
          end++;
        }
        return [start, end];
      };
      const srcSlice = findProjectSlice(draggingProjectId);
      const tgtSlice = findProjectSlice(dragOverProject.id);
      if (srcSlice && tgtSlice && srcSlice[0] !== tgtSlice[0]) {
        const [srcStart, srcEnd] = srcSlice;
        const [tgtStart, tgtEnd] = tgtSlice;
        const srcLen = srcEnd - srcStart + 1;
        if (srcStart < tgtStart) {
          const blockEnd = dragOverProject.position === "before" ? tgtStart - 1 : tgtEnd;
          if (blockEnd > srcEnd) {
            const srcShift = (blockEnd - srcEnd) * ROW_HEIGHT;
            for (let i = srcStart; i <= srcEnd; i++) {
              map.set(displayRows[i].rowId, srcShift);
            }
            for (let i = srcEnd + 1; i <= blockEnd; i++) {
              map.set(displayRows[i].rowId, -srcLen * ROW_HEIGHT);
            }
          }
        } else {
          const blockStart = dragOverProject.position === "before" ? tgtStart : tgtEnd + 1;
          if (blockStart < srcStart) {
            const srcShift = -(srcStart - blockStart) * ROW_HEIGHT;
            for (let i = srcStart; i <= srcEnd; i++) {
              map.set(displayRows[i].rowId, srcShift);
            }
            for (let i = blockStart; i < srcStart; i++) {
              map.set(displayRows[i].rowId, srcLen * ROW_HEIGHT);
            }
          }
        }
      }
    }
    return map;
  }, [displayRows, draggingRowId, draggingMultiRowIds, dragOverRow, draggingProjectId, dragOverProject]);
  const timelineScopedItems = useMemo(() => {
    if (Array.isArray(selectedProjectIds) && selectedProjectIds.length < allProjectGroups.length) {
      const subset = visibleProjectGroups.flatMap((g) => g.items);
      return subset.length > 0 ? subset : items;
    }
    return items;
  }, [items, selectedProjectIds, allProjectGroups.length, visibleProjectGroups]);
  const timelineDates = useMemo(() => {
    const includeStartDates = timelineScopedItems.length === 0 || visibleProjectGroups.some((g) => !g.project.isDemo || g.items.length === 0);
    const dates = /* @__PURE__ */ new Set();
    if (includeStartDates) {
      for (const d of collectTimelineAnchorDates({
        projects: visibleProjectGroups.map((g) => g.project),
        releases,
        items: timelineScopedItems,
        hiddenReleaseIds
      })) {
        dates.add(d);
      }
    }
    for (const group of visibleProjectGroups) {
      if (includeStartDates && group.startDate) dates.add(group.startDate);
      if (group.endDate) dates.add(group.endDate);
      if (group.slackEndDate) dates.add(group.slackEndDate);
      if (group.project.releaseId) {
        const rel = releases.find((r) => r.id === group.project.releaseId);
        if (rel) {
          const span = getReleaseDateSpan(rel);
          if (includeStartDates && span.startDate) dates.add(span.startDate);
          if (span.endDate) dates.add(span.endDate);
        }
      }
    }
    for (const row of displayRows) {
      if (row.kind === "release") {
        const rg = row.group;
        if (includeStartDates && rg.startDate) dates.add(rg.startDate);
        if (rg.endDate) dates.add(rg.endDate);
        if (rg.release.id !== "__unassigned__") {
          const span = getReleaseDateSpan(rg.release);
          if (includeStartDates && span.startDate) dates.add(span.startDate);
          if (span.endDate) dates.add(span.endDate);
        }
      } else if (row.kind === "project" || row.kind === "empty-project") {
        if (includeStartDates && row.group.startDate) dates.add(row.group.startDate);
        if (row.group.endDate) dates.add(row.group.endDate);
        if (row.group.slackEndDate) dates.add(row.group.slackEndDate);
        if (row.group.project.releaseId) {
          const rel = releases.find((r) => r.id === row.group.project.releaseId);
          if (rel) {
            const span = getReleaseDateSpan(rel);
            if (includeStartDates && span.startDate) dates.add(span.startDate);
            if (span.endDate) dates.add(span.endDate);
          }
        }
      }
    }
    return dates.size > 0 ? Array.from(dates) : void 0;
  }, [visibleProjectGroups, releases, timelineScopedItems, hiddenReleaseIds, displayRows]);
  const { timelineDays, timelineStart, monthGroups, todayIndex } = useMemo(() => {
    const today = startOfDay2(/* @__PURE__ */ new Date());
    const { timelineStart: paddedStart, timelineEnd: paddedEnd } = computeTimelineBounds(timelineScopedItems, today, timelineDates);
    const days = eachDayOfInterval({ start: paddedStart, end: paddedEnd });
    const groups = [];
    for (const day of days) {
      const label = format2(day, "MMMM yyyy", { locale: es2 });
      const shortLabel = format2(day, "MMM", { locale: es2 }).replace(".", "").toUpperCase();
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.count += 1;
      } else {
        groups.push({ label, shortLabel, count: 1 });
      }
    }
    const tIdx = days.findIndex((d) => isSameDay(d, today));
    timelineDaysCountRef.current = days.length;
    timelineStartRef.current = paddedStart;
    return {
      timelineDays: days,
      timelineStart: paddedStart,
      monthGroups: groups,
      todayIndex: tIdx
    };
  }, [timelineScopedItems, timelineDates]);
  const toggleMultiSelectProject = (projectId, shiftKey = false) => {
    if (shiftKey && lastMultiAnchorRef.current) {
      const anchor = lastMultiAnchorRef.current;
      const startIdx = displayRows.findIndex(
        (r) => anchor.kind === "project" ? r.kind === "project" && r.group.project.id === anchor.id : r.kind === "item" && r.item.id === anchor.id
      );
      const endIdx = displayRows.findIndex(
        (r) => r.kind === "project" && r.group.project.id === projectId
      );
      if (startIdx >= 0 && endIdx >= 0) {
        const lo = Math.min(startIdx, endIdx);
        const hi = Math.max(startIdx, endIdx);
        const nextItems = new Set(multiSelectedItemIds);
        const nextProjs = new Set(multiSelectedProjectIds);
        for (let i = lo; i <= hi; i++) {
          const row = displayRows[i];
          if (row.kind === "project") nextProjs.add(row.group.project.id);
          else if (row.kind === "item") nextItems.add(row.item.id);
        }
        setMultiSelectedItemIds(nextItems);
        setMultiSelectedProjectIds(nextProjs);
        return;
      }
    }
    setMultiSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
    lastMultiAnchorRef.current = { kind: "project", id: projectId };
  };
  const toggleMultiSelectItem = (itemId, shiftKey = false) => {
    if (shiftKey && lastMultiAnchorRef.current) {
      const anchor = lastMultiAnchorRef.current;
      const startIdx = displayRows.findIndex(
        (r) => anchor.kind === "project" ? r.kind === "project" && r.group.project.id === anchor.id : r.kind === "item" && r.item.id === anchor.id
      );
      const endIdx = displayRows.findIndex(
        (r) => r.kind === "item" && r.item.id === itemId
      );
      if (startIdx >= 0 && endIdx >= 0) {
        const lo = Math.min(startIdx, endIdx);
        const hi = Math.max(startIdx, endIdx);
        const nextItems = new Set(multiSelectedItemIds);
        const nextProjs = new Set(multiSelectedProjectIds);
        for (let i = lo; i <= hi; i++) {
          const row = displayRows[i];
          if (row.kind === "project") nextProjs.add(row.group.project.id);
          else if (row.kind === "item") nextItems.add(row.item.id);
        }
        setMultiSelectedItemIds(nextItems);
        setMultiSelectedProjectIds(nextProjs);
        return;
      }
    }
    setMultiSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
    lastMultiAnchorRef.current = { kind: "item", id: itemId };
  };
  const handleBarMouseDown = (e, item, mode) => {
    e.stopPropagation();
    if (mode === "move" && (e.metaKey || e.ctrlKey || e.shiftKey)) {
      return;
    }
    hasDraggedRef.current = false;
    const startX = e.clientX;
    const startY = e.clientY;
    let axisLocked = mode === "move" ? "none" : "horizontal";
    const origStart = parseDateSafe(item.startDate);
    const origDuration = item.type === "milestone" ? 0 : Math.max(1, item.duration);
    const origProgress = item.progress ?? 0;
    const barWidthPx = Math.max(24, origDuration * dayWidth);
    const isMultiMove = mode === "move" && effectiveMultiItemIds.has(item.id) && effectiveMultiItemIds.size > 1;
    const movingIds = isMultiMove ? new Set(effectiveMultiItemIds) : null;
    let lockedProj = getLockedProjectForItem(item, projectsRef.current);
    if (!lockedProj && movingIds) {
      for (const id of movingIds) {
        const target = items.find((it) => it.id === id);
        if (!target) continue;
        const lp = getLockedProjectForItem(target, projectsRef.current);
        if (lp) {
          lockedProj = lp;
          break;
        }
      }
    }
    const attemptedLabel = mode === "resize" || mode === "resize-start" ? `redimensionar \xAB${item.name}\xBB en el diagrama` : mode === "progress" ? `cambiar el progreso de \xAB${item.name}\xBB` : movingIds ? `mover selecci\xF3n m\xFAltiple (${movingIds.size} elementos) en el diagrama` : `mover \xAB${item.name}\xBB en el diagrama`;
    let lockPromptTriggered = false;
    const multiItemsMap = movingIds ? new Map(
      items.filter((it) => movingIds.has(it.id)).map((it) => [
        it.id,
        {
          origStart: parseDateSafe(it.startDate),
          origDuration: it.type === "milestone" ? 0 : Math.max(1, it.duration),
          type: it.type
        }
      ])
    ) : void 0;
    if (!lockedProj) {
      setDragState({
        itemId: item.id,
        mode,
        startX,
        origStart,
        origDuration,
        dayDelta: 0,
        pixelDeltaX: 0,
        origProgress,
        nextProgress: origProgress,
        multiItems: multiItemsMap
      });
    }
    const detachListeners = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown, true);
      if (typeof document !== "undefined") {
        document.body.style.cursor = "";
      }
    };
    const onKeyDown = (keyEvent) => {
      if (keyEvent.key === "Escape") {
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        detachListeners();
        setDragState(null);
      }
    };
    const onMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (axisLocked === "none") {
        if (Math.abs(dy) >= 5 && Math.abs(dy) > Math.abs(dx) * 1.15) {
          axisLocked = "vertical";
          hasDraggedRef.current = true;
          detachListeners();
          setDragState(null);
          startTaskRowReorderDrag(item.id, startX, startY, {
            fromTimeline: true,
            immediateStart: true,
            clientX: moveEvent.clientX,
            clientY: moveEvent.clientY
          });
          return;
        }
        if (Math.abs(dx) >= 4) {
          axisLocked = "horizontal";
        } else {
          return;
        }
      }
      if (Math.abs(dx) > 3) {
        hasDraggedRef.current = true;
        if (mode === "move" && !lockedProj && typeof document !== "undefined") {
          document.body.style.cursor = "grabbing";
        }
      }
      if (lockedProj) {
        if (Math.abs(dx) > 3 && !lockPromptTriggered) {
          lockPromptTriggered = true;
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("keydown", onKeyDown, true);
          setDragState(null);
          setLockedAlertState({
            project: lockedProj,
            attemptedAction: attemptedLabel
          });
        }
        return;
      }
      if (mode === "progress") {
        const rawPct = origProgress + dx / barWidthPx * 100;
        const snappedPct = Math.max(0, Math.min(100, Math.round(rawPct / 5) * 5));
        setDragState((prev) => prev ? { ...prev, nextProgress: snappedPct } : null);
        return;
      }
      const deltaDays = Math.round(dx / dayWidth);
      setDragState((prev) => prev ? { ...prev, dayDelta: deltaDays, pixelDeltaX: dx } : null);
    };
    const onMouseUp = (upEvent) => {
      detachListeners();
      const dx = upEvent.clientX - startX;
      const deltaDays = Math.round(dx / dayWidth);
      if (Math.abs(dx) > 3 || lockedProj && deltaDays !== 0) {
        hasDraggedRef.current = true;
      }
      setDragState(null);
      if (lockedProj) {
        if ((Math.abs(dx) > 3 || deltaDays !== 0) && !lockPromptTriggered) {
          setLockedAlertState({
            project: lockedProj,
            attemptedAction: attemptedLabel
          });
        }
        return;
      }
      if (mode === "progress" && item.type === "task") {
        const rawPct = origProgress + dx / barWidthPx * 100;
        const snappedPct = Math.max(0, Math.min(100, Math.round(rawPct / 5) * 5));
        if (snappedPct !== origProgress) {
          onUpdateItem(
            {
              ...item,
              progress: snappedPct
            },
            false
          );
        }
        return;
      }
      if (deltaDays === 0) return;
      if (mode === "move") {
        if (movingIds) {
          shiftItemsByDays(movingIds, deltaDays, attemptedLabel);
          return;
        }
        const newStart = formatDateISO(addDays2(origStart, deltaDays));
        const newEnd = item.type === "milestone" ? newStart : calculateEndDateFromDuration(newStart, origDuration, "task", workCalendar);
        onUpdateItem(
          {
            ...item,
            startDate: newStart,
            endDate: newEnd
          },
          false
        );
      } else if (mode === "resize" && item.type === "task") {
        const newDur = Math.max(1, origDuration + deltaDays);
        const newEnd = calculateEndDateFromDuration(item.startDate, newDur, "task", workCalendar);
        onUpdateItem(
          {
            ...item,
            duration: newDur,
            endDate: newEnd
          },
          false
        );
      } else if (mode === "resize-start" && item.type === "task") {
        const maxDelta = origDuration - 1;
        const clampedDelta = Math.min(maxDelta, deltaDays);
        const newStart = formatDateISO(addDays2(origStart, clampedDelta));
        const newDur = Math.max(1, origDuration - clampedDelta);
        onUpdateItem(
          {
            ...item,
            startDate: newStart,
            duration: newDur,
            endDate: item.endDate
          },
          false
        );
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown, true);
  };
  const handleProjectBarMouseDown = (e, group) => {
    e.stopPropagation();
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      return;
    }
    hasDraggedRef.current = false;
    const startX = e.clientX;
    const startY = e.clientY;
    let axisLocked = "none";
    const isPartOfMulti = multiSelectedProjectIds.has(group.project.id) && effectiveMultiItemIds.size > 0;
    const movingIds = isPartOfMulti ? new Set(effectiveMultiItemIds) : new Set(group.items.map((it) => it.id));
    if (movingIds.size === 0) return;
    let lockedProj = group.project.locked ? group.project : void 0;
    if (!lockedProj) {
      for (const id of movingIds) {
        const target = items.find((it) => it.id === id);
        if (!target) continue;
        const lp = getLockedProjectForItem(target, projectsRef.current);
        if (lp) {
          lockedProj = lp;
          break;
        }
      }
    }
    const attemptedLabel = isPartOfMulti ? `mover selecci\xF3n m\xFAltiple (${movingIds.size} elementos) en el diagrama` : `mover proyecto \xAB${group.project.name}\xBB en el diagrama`;
    let lockPromptTriggered = false;
    const multiItemsMap = new Map(
      items.filter((it) => movingIds.has(it.id)).map((it) => [
        it.id,
        {
          origStart: parseDateSafe(it.startDate),
          origDuration: it.type === "milestone" ? 0 : Math.max(1, it.duration),
          type: it.type
        }
      ])
    );
    if (!lockedProj) {
      setDragState({
        itemId: `project:${group.project.id}`,
        mode: "move",
        startX,
        origStart: parseDateSafe(group.startDate),
        origDuration: group.duration,
        dayDelta: 0,
        pixelDeltaX: 0,
        multiItems: multiItemsMap
      });
    }
    const detachListeners = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown, true);
      if (typeof document !== "undefined") {
        document.body.style.cursor = "";
      }
    };
    const onKeyDown = (keyEvent) => {
      if (keyEvent.key === "Escape") {
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        detachListeners();
        setDragState(null);
      }
    };
    const onMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (axisLocked === "none") {
        if (Math.abs(dy) >= 5 && Math.abs(dy) > Math.abs(dx) * 1.15) {
          axisLocked = "vertical";
          hasDraggedRef.current = true;
          detachListeners();
          setDragState(null);
          startProjectRowReorderDrag(group.project.id, startX, startY, {
            fromTimeline: true,
            immediateStart: true,
            clientX: moveEvent.clientX,
            clientY: moveEvent.clientY
          });
          return;
        }
        if (Math.abs(dx) >= 4) {
          axisLocked = "horizontal";
        } else {
          return;
        }
      }
      if (Math.abs(dx) > 3) {
        hasDraggedRef.current = true;
        if (!lockedProj && typeof document !== "undefined") {
          document.body.style.cursor = "grabbing";
        }
      }
      if (lockedProj) {
        if (Math.abs(dx) > 3 && !lockPromptTriggered) {
          lockPromptTriggered = true;
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("keydown", onKeyDown, true);
          setDragState(null);
          setLockedAlertState({
            project: lockedProj,
            attemptedAction: attemptedLabel
          });
        }
        return;
      }
      const deltaDays = Math.round(dx / dayWidth);
      setDragState((prev) => prev ? { ...prev, dayDelta: deltaDays, pixelDeltaX: dx } : null);
    };
    const onMouseUp = (upEvent) => {
      detachListeners();
      const dx = upEvent.clientX - startX;
      const deltaDays = Math.round(dx / dayWidth);
      if (Math.abs(dx) > 3 || lockedProj && deltaDays !== 0) {
        hasDraggedRef.current = true;
      }
      setDragState(null);
      if (lockedProj) {
        if ((Math.abs(dx) > 3 || deltaDays !== 0) && !lockPromptTriggered) {
          setLockedAlertState({
            project: lockedProj,
            attemptedAction: attemptedLabel
          });
        }
        return;
      }
      if (deltaDays === 0) return;
      shiftItemsByDays(movingIds, deltaDays, attemptedLabel);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown, true);
  };
  const showDepToast = showWorkspaceToast;
  const commitAddDependency = (predId, succId, depType = "FS", options) => {
    if (!guardItemUnlocked(succId, "crear dependencia en proyecto bloqueado")) {
      return false;
    }
    const requireNonDisplacing = Boolean(options?.requireNonDisplacing);
    if (requireNonDisplacing) {
      const validation = canCreateNonDisplacingDependency(
        items,
        predId,
        succId,
        depType
      );
      if (!validation.allowed) {
        if (validation.reason === "would_shift") {
          const succItem = enrichedItemById.get(succId);
          const succLabel = succItem ? `#${succItem.wbsCode || succItem.wbs} ${succItem.name}` : "la tarea destino";
          const altHint = validation.suggestedAlternative ? ` Prueba conectar al punto ${validation.suggestedAlternative === "FF" || validation.suggestedAlternative === "SF" ? "final" : "inicial"} para crear ${validation.suggestedAlternative}.` : "";
          showDepToast(
            `No se puede crear ${depType}: desplazar\xEDa las fechas de ${succLabel}.${altHint}`,
            "error"
          );
        } else if (validation.reason === "cycle") {
          showDepToast(
            "No se puede conectar: generar\xEDa una dependencia circular (ciclo).",
            "error"
          );
        } else if (validation.reason === "self") {
          showDepToast("Una tarea no puede depender de s\xED misma.", "error");
        } else if (validation.reason === "duplicate") {
          showDepToast("Esta dependencia ya existe entre ambas tareas.", "info");
        }
        return false;
      }
    }
    const effectiveCascade = requireNonDisplacing ? false : autoCascade;
    const res = addDependencyLink(
      items,
      predId,
      succId,
      depType,
      effectiveCascade,
      projectsRef.current
    );
    if (!res.added) {
      if (res.error === "cycle") {
        showDepToast(
          "No se puede conectar: generar\xEDa una dependencia circular (ciclo).",
          "error"
        );
      } else if (res.error === "self") {
        showDepToast("Una tarea no puede depender de s\xED misma.", "error");
      } else if (res.error === "duplicate") {
        showDepToast("Esta dependencia ya existe entre ambas tareas.", "info");
      }
      return false;
    }
    if (onUpdateItems) {
      onUpdateItems(res.items);
    } else {
      const nonCascaded = addDependencyLink(
        items,
        predId,
        succId,
        depType,
        false,
        projectsRef.current
      );
      const updatedSucc = nonCascaded.items.find((it) => it.id === succId);
      if (updatedSucc) {
        onUpdateItem(updatedSucc, effectiveCascade);
      }
    }
    showDepToast(`Dependencia ${depType} creada en el diagrama`, "success");
    return true;
  };
  const commitRemoveDependency = (predId, succId) => {
    if (!guardItemUnlocked(succId, "eliminar dependencia de proyecto bloqueado")) {
      return false;
    }
    const res = removeDependencyLink(items, predId, succId, false, projectsRef.current);
    if (!res.removed) return false;
    if (onUpdateItems) {
      onUpdateItems(res.items);
    } else {
      const updatedSucc = res.items.find((it) => it.id === succId);
      if (updatedSucc) {
        onUpdateItem(updatedSucc, false);
      }
    }
    setSelectedDepLink(
      (prev) => prev && prev.predId === predId && prev.succId === succId ? null : prev
    );
    setHoveredDepKey(
      (prev) => prev === `dep-${predId}-${succId}` ? null : prev
    );
    showDepToast("Dependencia eliminada", "info");
    return true;
  };
  const commitMoveDependency = (oldPredId, oldSuccId, newPredId, newSuccId, depType) => {
    if (!guardItemUnlocked(oldSuccId, "mover dependencia de proyecto bloqueado")) {
      return false;
    }
    if (!guardItemUnlocked(newSuccId, "conectar dependencia a proyecto bloqueado")) {
      return false;
    }
    const res = moveDependencyLink(
      items,
      oldPredId,
      oldSuccId,
      newPredId,
      newSuccId,
      depType,
      autoCascade,
      projectsRef.current
    );
    if (!res.moved) {
      if (res.error === "cycle") {
        showDepToast(
          "No se puede mover la dependencia: generar\xEDa un ciclo circular.",
          "error"
        );
      } else if (res.error === "self") {
        showDepToast("Una tarea no puede depender de s\xED misma.", "error");
      } else if (res.error === "duplicate") {
        showDepToast("Esa dependencia ya existe en la tarea destino.", "info");
      }
      return false;
    }
    if (onUpdateItems) {
      onUpdateItems(res.items);
    } else {
      const nonCascaded = moveDependencyLink(
        items,
        oldPredId,
        oldSuccId,
        newPredId,
        newSuccId,
        depType,
        false,
        projectsRef.current
      );
      if (oldSuccId !== newSuccId) {
        const updatedOldSucc = nonCascaded.items.find((it) => it.id === oldSuccId);
        if (updatedOldSucc) {
          onUpdateItem(updatedOldSucc, false);
        }
      }
      const updatedNewSucc = nonCascaded.items.find((it) => it.id === newSuccId);
      if (updatedNewSucc) {
        onUpdateItem(updatedNewSucc, autoCascade);
      }
    }
    setSelectedDepLink(
      (prev) => prev && prev.predId === oldPredId && prev.succId === oldSuccId ? { predId: newPredId, succId: newSuccId } : prev
    );
    showDepToast("Dependencia movida correctamente", "success");
    return true;
  };
  const commitUpdateDependencyType = (predId, succId, depType) => {
    if (!guardItemUnlocked(succId, "cambiar tipo de dependencia en proyecto bloqueado")) {
      return false;
    }
    const res = updateDependencyLinkType(
      items,
      predId,
      succId,
      depType,
      autoCascade,
      projectsRef.current
    );
    if (!res.updated) return false;
    if (onUpdateItems) {
      onUpdateItems(res.items);
    } else {
      const nonCascaded = updateDependencyLinkType(
        items,
        predId,
        succId,
        depType,
        false,
        projectsRef.current
      );
      const updatedSucc = nonCascaded.items.find((it) => it.id === succId);
      if (updatedSucc) {
        onUpdateItem(updatedSucc, autoCascade);
      }
    }
    showDepToast(`Relaci\xF3n actualizada a ${depType}`, "success");
    return true;
  };
  useEffect3(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setConnectModeSource(null);
        setReconnectMode(null);
        setDepDragState(null);
        setSelectedDepLink(null);
        setSelectedItemId(null);
        setSelectedDiagramProjectId(null);
        setSelectedDiagramReleaseId(null);
        clearMultiSelection();
        onSelectEntity?.(null);
        if (isFocusMode && onExitFocusMode) {
          onExitFocusMode();
        }
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedDepLink) {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT" || activeEl.isContentEditable)) {
          return;
        }
        e.preventDefault();
        commitRemoveDependency(selectedDepLink.predId, selectedDepLink.succId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDepLink, items, autoCascade, isFocusMode, onExitFocusMode]);
  const handleBarClick = (e, itemId) => {
    e.stopPropagation();
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    if (connectModeSource) {
      if (connectModeSource.itemId === itemId) {
        setConnectModeSource(null);
        return;
      }
      const sourcePort = connectModeSource.port || (connectModeSource.role === "succ" ? "start" : "end");
      const targetCoords = itemRowMap.get(itemId);
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      let targetPort = "start";
      if (targetCoords && canvasRect) {
        const clickX = e.clientX - canvasRect.left;
        const midX = targetCoords.item.type === "milestone" ? targetCoords.startX : (targetCoords.startX + targetCoords.endX) / 2;
        targetPort = clickX > midX ? "end" : "start";
      }
      const depType = resolveDependencyTypeFromPorts(sourcePort, targetPort);
      commitAddDependency(connectModeSource.itemId, itemId, depType, {
        requireNonDisplacing: true
      });
      setConnectModeSource(null);
      return;
    }
    if (reconnectMode) {
      const newPredId = reconnectMode.endpoint === "source" ? itemId : reconnectMode.oldPredId;
      const newSuccId = reconnectMode.endpoint === "target" ? itemId : reconnectMode.oldSuccId;
      commitMoveDependency(
        reconnectMode.oldPredId,
        reconnectMode.oldSuccId,
        newPredId,
        newSuccId,
        reconnectMode.depType
      );
      setReconnectMode(null);
      return;
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      toggleMultiSelectItem(itemId, e.shiftKey);
      return;
    }
    setSelectedDepLink(null);
    setSelectedDiagramProjectId(null);
    setSelectedDiagramReleaseId(null);
    setSelectedItemId((prev) => {
      const next = prev === itemId ? null : itemId;
      if (next) {
        const it = enrichedItemById.get(next);
        onSelectEntity?.({ type: "task", id: next, name: it?.name });
      } else {
        onSelectEntity?.(null);
      }
      return next;
    });
  };
  const handleSplitMouseDown = (e) => {
    e.preventDefault();
    isResizingSplitRef.current = true;
    const startX = e.clientX;
    const origWidth = splitWidth;
    const onMove = (me) => {
      if (!isResizingSplitRef.current) return;
      const nextWidth = Math.max(360, Math.min(960, origWidth + (me.clientX - startX)));
      setSplitWidth(nextWidth);
    };
    const onUp = () => {
      isResizingSplitRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const itemRowMap = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    const computeCoordsForItem = (it, rowIndex, isCollapsedRow = false, groupOverride) => {
      if (isCollapsedRow && groupOverride) {
        const groupStart = parseDateSafe(groupOverride.startDate);
        const startOffsetDays2 = differenceInCalendarDays2(groupStart, timelineStart);
        const groupStartX = startOffsetDays2 * dayWidth;
        const groupDuration = Math.max(1, groupOverride.duration);
        const groupEndX = groupStartX + groupDuration * dayWidth;
        const centerY2 = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
        return {
          index: rowIndex,
          item: it,
          startX: groupStartX,
          endX: groupEndX,
          centerY: centerY2,
          effectiveStartStr: groupOverride.startDate,
          effectiveEndStr: groupOverride.endDate,
          effectiveDuration: groupDuration,
          isCollapsedRow: true
        };
      }
      const effectiveStart = parseDateSafe(it.startDate);
      const effectiveDuration = it.type === "milestone" ? 0 : Math.max(1, it.duration);
      const effectiveStartStr = formatDateISO(effectiveStart);
      const effectiveEndStr = it.type === "milestone" ? effectiveStartStr : calculateEndDateFromDuration(effectiveStartStr, effectiveDuration, "task");
      const startOffsetDays = differenceInCalendarDays2(effectiveStart, timelineStart);
      const startX = startOffsetDays * dayWidth;
      const endX = it.type === "milestone" ? startX + dayWidth / 2 : startX + effectiveDuration * dayWidth;
      const centerY = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
      return {
        index: rowIndex,
        item: it,
        startX: it.type === "milestone" ? startX + dayWidth / 2 : startX,
        endX,
        centerY,
        effectiveStartStr,
        effectiveEndStr,
        effectiveDuration,
        isCollapsedRow
      };
    };
    displayRows.forEach((row, rowIndex) => {
      if (row.kind === "item") {
        map.set(row.item.id, computeCoordsForItem(row.item, rowIndex, false));
      } else if (row.kind === "project" && row.group.project.collapsed) {
        for (const collapsedItem of row.group.items) {
          map.set(collapsedItem.id, computeCoordsForItem(collapsedItem, rowIndex, true, row.group));
        }
      }
    });
    return map;
  }, [displayRows, dragState, timelineStart, dayWidth]);
  const handleStartDependencyDrag = (e, config) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    if ((config.mode === "move-source" || config.mode === "move-target") && config.oldSuccId && !guardItemUnlocked(config.oldSuccId, "mover dependencia de proyecto bloqueado")) {
      return;
    }
    const fixedCoords = itemRowMap.get(config.fixedItemId);
    if (!fixedCoords) return;
    const anchorOnEnd = config.mode === "create" && config.originPort !== "in" || config.mode === "move-target";
    const anchorX = anchorOnEnd ? fixedCoords.item.type === "milestone" ? fixedCoords.startX + 11 : fixedCoords.endX : fixedCoords.item.type === "milestone" ? fixedCoords.startX - 11 : fixedCoords.startX;
    const anchorY = fixedCoords.centerY;
    const canvasEl = canvasRef.current;
    const initRect = canvasEl?.getBoundingClientRect();
    const initX = initRect ? e.clientX - initRect.left : anchorX;
    const initY = initRect ? e.clientY - initRect.top : anchorY;
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let hasMoved = false;
    let latestTargetId = null;
    let latestTargetPort = null;
    setDepDragState({
      mode: config.mode,
      originPort: config.originPort,
      fixedItemId: config.fixedItemId,
      oldPredId: config.oldPredId,
      oldSuccId: config.oldSuccId,
      depType: config.depType || "FS",
      startX: anchorX,
      startY: anchorY,
      cursorX: initX,
      cursorY: initY,
      hoveredTargetId: null,
      hoveredTargetPort: null
    });
    const resolveTargetPortForItem = (itemId, canvasX) => {
      const coords = itemRowMap.get(itemId);
      if (!coords) return "start";
      const midX = coords.item.type === "milestone" ? coords.startX : (coords.startX + coords.endX) / 2;
      return canvasX > midX ? "end" : "start";
    };
    const resolveTargetFromPoint = (clientX, clientY, canvasX, canvasY) => {
      if (typeof document !== "undefined" && document.elementsFromPoint) {
        const els = document.elementsFromPoint(clientX, clientY);
        for (const el of els) {
          const htmlEl = el;
          if (!htmlEl || !htmlEl.closest) continue;
          const portEl = htmlEl.closest(
            "[data-dep-port-in], [data-dep-port-out]"
          );
          if (portEl) {
            const inId = portEl.getAttribute("data-dep-port-in");
            const outId = portEl.getAttribute("data-dep-port-out");
            const pid = inId || outId;
            if (pid && pid !== config.fixedItemId) {
              return { itemId: pid, port: inId ? "start" : "end" };
            }
          }
          const barEl = htmlEl.closest(
            "[data-timeline-task], [data-timeline-milestone]"
          );
          if (barEl) {
            const bid = barEl.getAttribute("data-timeline-task") || barEl.getAttribute("data-timeline-milestone");
            if (bid && bid !== config.fixedItemId) {
              return {
                itemId: bid,
                port: resolveTargetPortForItem(bid, canvasX)
              };
            }
          }
          const rowEl = htmlEl.closest("[data-task-row]");
          if (rowEl) {
            const rid = rowEl.getAttribute("data-task-row");
            if (rid && rid !== config.fixedItemId) {
              return {
                itemId: rid,
                port: resolveTargetPortForItem(rid, canvasX)
              };
            }
          }
        }
      }
      const rowIndex = Math.floor(canvasY / ROW_HEIGHT);
      if (rowIndex >= 0 && rowIndex < displayRows.length) {
        const row = displayRows[rowIndex];
        if (row.kind === "item" && row.item.id !== config.fixedItemId) {
          return {
            itemId: row.item.id,
            port: resolveTargetPortForItem(row.item.id, canvasX)
          };
        }
      }
      return null;
    };
    const onMouseMove = (moveEvent) => {
      const dist = Math.hypot(
        moveEvent.clientX - startClientX,
        moveEvent.clientY - startClientY
      );
      if (dist > 4) {
        hasMoved = true;
      }
      const rect = canvasRef.current?.getBoundingClientRect();
      const curX = rect ? moveEvent.clientX - rect.left : initX;
      const curY = rect ? moveEvent.clientY - rect.top : initY;
      const targetMatch = resolveTargetFromPoint(
        moveEvent.clientX,
        moveEvent.clientY,
        curX,
        curY
      );
      latestTargetId = targetMatch?.itemId || null;
      latestTargetPort = targetMatch?.port || null;
      setDepDragState(
        (prev) => prev ? {
          ...prev,
          cursorX: curX,
          cursorY: curY,
          hoveredTargetId: latestTargetId,
          hoveredTargetPort: latestTargetPort
        } : null
      );
    };
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setDepDragState(null);
      if (!hasMoved) {
        if (config.mode === "create") {
          const clickedPort = config.originPort === "in" ? "start" : "end";
          if (connectModeSource && connectModeSource.itemId !== config.fixedItemId) {
            const sourcePort = connectModeSource.port || (connectModeSource.role === "succ" ? "start" : "end");
            const resolvedDepType = resolveDependencyTypeFromPorts(
              sourcePort,
              clickedPort
            );
            commitAddDependency(
              connectModeSource.itemId,
              config.fixedItemId,
              resolvedDepType,
              { requireNonDisplacing: true }
            );
            setConnectModeSource(null);
          } else {
            setReconnectMode(null);
            setSelectedDepLink(null);
            setConnectModeSource(
              (prev) => prev && prev.itemId === config.fixedItemId && prev.port === clickedPort ? null : { itemId: config.fixedItemId, role: "pred", port: clickedPort }
            );
          }
        } else if ((config.mode === "move-source" || config.mode === "move-target") && config.oldPredId && config.oldSuccId) {
          setSelectedItemId(null);
          setSelectedDepLink({
            predId: config.oldPredId,
            succId: config.oldSuccId
          });
          setReconnectMode({
            oldPredId: config.oldPredId,
            oldSuccId: config.oldSuccId,
            endpoint: config.mode === "move-source" ? "source" : "target",
            depType: config.depType || "FS"
          });
        }
        return;
      }
      if (latestTargetId && latestTargetId !== config.fixedItemId) {
        if (config.mode === "create") {
          const sourcePort = config.originPort === "in" ? "start" : "end";
          const targetPort = latestTargetPort || "start";
          const resolvedDepType = resolveDependencyTypeFromPorts(
            sourcePort,
            targetPort
          );
          commitAddDependency(
            config.fixedItemId,
            latestTargetId,
            resolvedDepType,
            { requireNonDisplacing: true }
          );
        } else if (config.mode === "move-source" && config.oldPredId && config.oldSuccId) {
          commitMoveDependency(
            config.oldPredId,
            config.oldSuccId,
            latestTargetId,
            config.oldSuccId,
            config.depType
          );
        } else if (config.mode === "move-target" && config.oldPredId && config.oldSuccId) {
          commitMoveDependency(
            config.oldPredId,
            config.oldSuccId,
            config.oldPredId,
            latestTargetId,
            config.depType
          );
        }
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };
  const selectedItem = useMemo(
    () => effectiveSelectedItemId ? enrichedItemById.get(effectiveSelectedItemId) || null : null,
    [enrichedItemById, effectiveSelectedItemId]
  );
  const selectedGroup = useMemo(() => {
    if (!selectedItem) return null;
    return allProjectGroups.find((g) => g.project.id === selectedItem.projectId) || allProjectGroups[0];
  }, [selectedItem, allProjectGroups]);
  const selectedPredecessors = useMemo(() => {
    if (!selectedItem || !selectedItem.dependencies) return [];
    return selectedItem.dependencies.map((id) => enrichedItemById.get(id)).filter((it) => Boolean(it));
  }, [selectedItem, enrichedItemById]);
  const selectedSuccessors = useMemo(() => {
    if (!selectedItem) return [];
    const list = [];
    for (const it of enrichedItemById.values()) {
      if (it.dependencies?.includes(selectedItem.id)) {
        list.push(it);
      }
    }
    return list;
  }, [selectedItem, enrichedItemById]);
  const relatedIds = useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    if (selectedDepLink) {
      set.add(selectedDepLink.predId);
      set.add(selectedDepLink.succId);
    }
    const activeId = hoveredId || effectiveSelectedItemId;
    if (!activeId) return set;
    set.add(activeId);
    for (const it of items) {
      if (it.id === activeId) {
        it.dependencies.forEach((d) => set.add(d));
      }
      if (it.dependencies.includes(activeId)) {
        set.add(it.id);
      }
    }
    return set;
  }, [hoveredId, effectiveSelectedItemId, selectedDepLink, items]);
  const dependencyLinks = useMemo(() => {
    if (arrowVisibility === "none") return [];
    const incomingMap = /* @__PURE__ */ new Map();
    const outgoingMap = /* @__PURE__ */ new Map();
    for (const succ of items) {
      if (succ.hidden) continue;
      if (!succ.dependencies || succ.dependencies.length === 0) continue;
      const succCoords = itemRowMap.get(succ.id);
      if (!succCoords) continue;
      for (const predId of succ.dependencies) {
        const predCoords = itemRowMap.get(predId);
        if (!predCoords || predCoords.item.hidden) continue;
        if (predCoords.isCollapsedRow && succCoords.isCollapsedRow && predCoords.index === succCoords.index) {
          continue;
        }
        if (!incomingMap.has(succ.id)) incomingMap.set(succ.id, []);
        incomingMap.get(succ.id).push(predId);
        if (!outgoingMap.has(predId)) outgoingMap.set(predId, []);
        outgoingMap.get(predId).push(succ.id);
      }
    }
    const drawnCollapsedPairs = /* @__PURE__ */ new Set();
    const list = [];
    for (const succ of items) {
      if (succ.hidden) continue;
      if (!succ.dependencies || succ.dependencies.length === 0) continue;
      const succCoords = itemRowMap.get(succ.id);
      if (!succCoords) continue;
      const succPreds = incomingMap.get(succ.id) || [];
      const totalIncoming = succPreds.length;
      succ.dependencies.forEach((predId) => {
        const predCoords = itemRowMap.get(predId);
        if (!predCoords || predCoords.item.hidden) return;
        if (predCoords.isCollapsedRow && succCoords.isCollapsedRow && predCoords.index === succCoords.index) {
          return;
        }
        const isInterProject = Boolean(predCoords.isCollapsedRow || succCoords.isCollapsedRow);
        if (predCoords.isCollapsedRow && succCoords.isCollapsedRow) {
          const pairKey = `${predCoords.index}->${succCoords.index}`;
          if (drawnCollapsedPairs.has(pairKey)) return;
          drawnCollapsedPairs.add(pairKey);
        }
        const incomingIndex = succPreds.indexOf(predId);
        const outgoingList = outgoingMap.get(predId) || [];
        const outgoingIndex = outgoingList.indexOf(succ.id);
        const laneIndex = Math.min(
          4,
          Math.max(0, incomingIndex >= 0 ? incomingIndex : 0) + (outgoingIndex > 0 ? outgoingIndex : 0)
        );
        const depType = succ.dependencyTypes?.[predId] || "FS";
        const fromStart = depType === "SS" || depType === "SF";
        const linkKey = `dep-${predId}-${succ.id}`;
        const isSelectedLink = selectedDepLink?.predId === predId && selectedDepLink?.succId === succ.id;
        const isHoveredLink = hoveredDepKey === linkKey;
        const isHighlighted = isSelectedLink || isHoveredLink || hoveredId === succ.id || hoveredId === predId || selectedItemId === succ.id || selectedItemId === predId;
        const isCriticalLink = showCriticalPath && succ.isCritical && predCoords.item.isCritical;
        if (arrowVisibility === "hover" && !isHighlighted) return;
        if (arrowVisibility === "critical" && !isCriticalLink && !isHighlighted) return;
        const x1 = fromStart ? predCoords.item.type === "milestone" ? predCoords.startX - 11 : predCoords.startX : predCoords.item.type === "milestone" ? predCoords.startX + 11 : predCoords.endX;
        const y1 = predCoords.centerY;
        const x2 = succCoords.item.type === "milestone" ? succCoords.startX - 11 : succCoords.startX;
        let y2 = succCoords.centerY;
        if (succCoords.item.type === "task" && totalIncoming > 1) {
          const shoulderOffset = (incomingIndex - (totalIncoming - 1) / 2) * 5;
          y2 = succCoords.centerY + Math.max(-8, Math.min(8, shoulderOffset));
        }
        const stepOut = 12 + laneIndex * 10;
        const waypoints = [];
        if (fromStart) {
          const exitX = Math.max(4, Math.min(x1, x2) - stepOut);
          if (Math.abs(y1 - y2) < 2) {
            waypoints.push({ x: x1, y: y1 }, { x: x2, y: y2 });
          } else {
            waypoints.push(
              { x: x1, y: y1 },
              { x: exitX, y: y1 },
              { x: exitX, y: y2 },
              { x: x2, y: y2 }
            );
          }
        } else {
          const gap = x2 - x1;
          if (gap >= 16) {
            const midX = Math.min(x1 + stepOut, x2 - 8);
            if (Math.abs(y1 - y2) < 2) {
              waypoints.push({ x: x1, y: y1 }, { x: x2, y: y2 });
            } else {
              waypoints.push(
                { x: x1, y: y1 },
                { x: midX, y: y1 },
                { x: midX, y: y2 },
                { x: x2, y: y2 }
              );
            }
          } else {
            const exitX = x1 + 12 + laneIndex * 8;
            const entryX = Math.max(0, Math.min(x2 - 6, x2 - 12 - laneIndex * 8));
            const goingDown = y2 >= y1;
            const detourDir = goingDown ? 1 : -1;
            const detourY = y1 + detourDir * (ROW_HEIGHT / 2 + (laneIndex - 2) * 3);
            waypoints.push(
              { x: x1, y: y1 },
              { x: exitX, y: y1 },
              { x: exitX, y: detourY },
              { x: entryX, y: detourY },
              { x: entryX, y: y2 },
              { x: x2, y: y2 }
            );
          }
        }
        const dPath = createRoundedOrthogonalPath(waypoints, 6);
        const midPoint = computePolylineMidpoint(waypoints);
        const strokeColor = isSelectedLink ? "#0C0C09" : isCriticalLink ? "#D97706" : isHighlighted ? "#0C0C09" : "#71717A";
        const markerEnd = isSelectedLink ? "url(#arrow-active)" : isCriticalLink ? "url(#arrow-critical)" : isHighlighted ? "url(#arrow-active)" : "url(#arrow-normal)";
        list.push({
          key: linkKey,
          predId,
          succId: succ.id,
          depType,
          x1,
          y1,
          x2,
          y2,
          midPoint,
          dPath,
          strokeColor,
          strokeWidth: isSelectedLink || isHoveredLink ? 2 : isHighlighted || isCriticalLink ? 1.8 : 1.5,
          markerEnd,
          hasConflict: succ.hasConflict,
          isHighlighted,
          isCriticalLink,
          isSelectedLink,
          isHoveredLink,
          isInterProject
        });
      });
    }
    return list;
  }, [
    items,
    itemRowMap,
    hoveredId,
    selectedItemId,
    selectedDepLink,
    hoveredDepKey,
    showCriticalPath,
    arrowVisibility
  ]);
  const depDragPreview = useMemo(() => {
    if (!depDragState) return null;
    const isFixedPred = depDragState.mode === "create" || depDragState.mode === "move-target";
    let x1 = depDragState.startX;
    let y1 = depDragState.startY;
    let x2 = depDragState.cursorX;
    let y2 = depDragState.cursorY;
    if (!isFixedPred) {
      x2 = depDragState.startX;
      y2 = depDragState.startY;
      x1 = depDragState.cursorX;
      y1 = depDragState.cursorY;
    }
    let isValidTarget = true;
    const sourcePort = depDragState.originPort === "in" ? "start" : "end";
    let statusLabel = depDragState.mode === "create" ? sourcePort === "start" ? "Arrastra al Inicio (SS) o Fin (SF) de la tarea destino..." : "Arrastra al Inicio (FS) o Fin (FF) de la tarea destino..." : "Arrastra hacia otra tarea para reconectar...";
    if (depDragState.hoveredTargetId) {
      const targetCoords = itemRowMap.get(depDragState.hoveredTargetId);
      const targetItem = enrichedItemById.get(depDragState.hoveredTargetId);
      const fixedItem = enrichedItemById.get(depDragState.fixedItemId);
      if (targetCoords) {
        if (depDragState.mode === "create") {
          const targetPort = depDragState.hoveredTargetPort || "start";
          x2 = targetPort === "end" ? targetCoords.item.type === "milestone" ? targetCoords.startX + 11 : targetCoords.endX : targetCoords.item.type === "milestone" ? targetCoords.startX - 11 : targetCoords.startX;
          y2 = targetCoords.centerY;
        } else if (isFixedPred) {
          x2 = targetCoords.item.type === "milestone" ? targetCoords.startX - 11 : targetCoords.startX;
          y2 = targetCoords.centerY;
        } else {
          x1 = targetCoords.item.type === "milestone" ? targetCoords.startX + 11 : targetCoords.endX;
          y1 = targetCoords.centerY;
        }
      }
      if (depDragState.mode === "create") {
        const candidatePred = depDragState.fixedItemId;
        const candidateSucc = depDragState.hoveredTargetId;
        const targetPort = depDragState.hoveredTargetPort || "start";
        const resolvedDepType = resolveDependencyTypeFromPorts(
          sourcePort,
          targetPort
        );
        const validation = canCreateNonDisplacingDependency(
          items,
          candidatePred,
          candidateSucc,
          resolvedDepType
        );
        isValidTarget = validation.allowed;
        const pItem = enrichedItemById.get(candidatePred);
        const sItem = enrichedItemById.get(candidateSucc);
        const pLabel = `#${pItem?.wbsCode || pItem?.wbs}`;
        const sLabel = `#${sItem?.wbsCode || sItem?.wbs}`;
        if (validation.allowed) {
          statusLabel = `Conectar ${pLabel} \u2192 ${sLabel} (${resolvedDepType})`;
        } else if (validation.reason === "would_shift") {
          const alt = validation.suggestedAlternative;
          statusLabel = alt ? `${resolvedDepType} bloqueado: mover\xEDa ${sLabel} (usa punto ${alt === "FF" || alt === "SF" ? "final" : "inicial"} para ${alt})` : `${resolvedDepType} bloqueado: mover\xEDa ${sLabel}`;
        } else if (validation.reason === "cycle") {
          statusLabel = "Ciclo no permitido";
        } else if (validation.reason === "duplicate") {
          statusLabel = "Dependencia ya existente";
        }
      } else if (depDragState.oldPredId && depDragState.oldSuccId) {
        const candidatePred = depDragState.mode === "move-source" ? depDragState.hoveredTargetId : depDragState.oldPredId;
        const candidateSucc = depDragState.mode === "move-target" ? depDragState.hoveredTargetId : depDragState.oldSuccId;
        const check = moveDependencyLink(
          items,
          depDragState.oldPredId,
          depDragState.oldSuccId,
          candidatePred,
          candidateSucc,
          depDragState.depType,
          false
        );
        isValidTarget = check.moved;
        if (check.moved) {
          const pItem = enrichedItemById.get(candidatePred);
          const sItem = enrichedItemById.get(candidateSucc);
          statusLabel = `Mover a #${pItem?.wbsCode || pItem?.wbs} \u2192 #${sItem?.wbsCode || sItem?.wbs}`;
        } else if (check.error === "cycle") {
          statusLabel = "Ciclo no permitido";
        } else if (check.error === "duplicate") {
          statusLabel = "Dependencia ya existente";
        } else if (targetItem && fixedItem) {
          isValidTarget = false;
        }
      }
    }
    const midX = (x1 + x2) / 2;
    const previewWaypoints = Math.abs(y1 - y2) < 2 ? [
      { x: x1, y: y1 },
      { x: x2, y: y2 }
    ] : [
      { x: x1, y: y1 },
      { x: midX, y: y1 },
      { x: midX, y: y2 },
      { x: x2, y: y2 }
    ];
    return {
      dPath: createRoundedOrthogonalPath(previewWaypoints, 6),
      x1,
      y1,
      x2,
      y2,
      isValidTarget,
      statusLabel
    };
  }, [depDragState, itemRowMap, enrichedItemById, items]);
  const totalCanvasWidth = timelineDays.length * dayWidth;
  const totalCanvasHeight = Math.max(displayRows.length * ROW_HEIGHT + 56, 360) + collapseBottomSpacerPx;
  const milestoneGuides = useMemo(() => {
    const list = visibleMilestones.map((m) => {
      const mCoords = itemRowMap.get(m.id);
      const milestoneX = mCoords ? mCoords.startX : differenceInCalendarDays2(parseDateSafe(m.startDate), timelineStart) * dayWidth + dayWidth / 2;
      return { milestone: m, milestoneX };
    });
    list.sort((a, b) => a.milestoneX - b.milestoneX);
    let lastX = -9999;
    let currentTier = 0;
    return list.map((entry) => {
      if (Math.abs(entry.milestoneX - lastX) < 76) {
        currentTier = (currentTier + 1) % 3;
      } else {
        currentTier = 0;
      }
      lastX = entry.milestoneX;
      const halfBadge = 50;
      let badgeClampOffset = 0;
      if (entry.milestoneX < halfBadge + 4) {
        badgeClampOffset = halfBadge + 4 - entry.milestoneX;
      } else if (entry.milestoneX > totalCanvasWidth - halfBadge - 4) {
        badgeClampOffset = totalCanvasWidth - halfBadge - 4 - entry.milestoneX;
      }
      return {
        ...entry,
        tier: currentTier,
        badgeClampOffset
      };
    });
  }, [visibleMilestones, itemRowMap, timelineStart, dayWidth, totalCanvasWidth]);
  const releaseMilestoneGuides = useMemo(() => {
    if (releaseGuideVisibility === "none" || !releases || releases.length === 0) {
      return [];
    }
    const targetReleaseIds = /* @__PURE__ */ new Set();
    if (releaseGuideVisibility === "all") {
      for (const r of releases) targetReleaseIds.add(r.id);
    } else if (releaseGuideVisibility === "assigned") {
      for (const r of releases) {
        if (projects.some((p) => p.releaseId === r.id)) {
          targetReleaseIds.add(r.id);
        }
      }
    } else {
      if (activeReleaseId) {
        targetReleaseIds.add(activeReleaseId);
      } else {
        const visibleRelIds = visibleProjectGroups.map((g) => g.project.releaseId).filter(Boolean);
        if (visibleRelIds.length > 0) {
          for (const id of visibleRelIds) targetReleaseIds.add(id);
        } else {
          const firstWithProj = releases.find(
            (r) => projects.some((p) => p.releaseId === r.id)
          );
          targetReleaseIds.add(firstWithProj?.id || releases[0]?.id);
        }
      }
    }
    if (hiddenReleaseIds && hiddenReleaseIds.length > 0) {
      for (const hid of hiddenReleaseIds) {
        targetReleaseIds.delete(hid);
      }
    }
    const areas = [];
    if (groupingMode === "release") {
      let currentRel = null;
      let startIdx = 0;
      for (let i = 0; i < displayRows.length; i++) {
        const row = displayRows[i];
        if (row.kind === "release") {
          if (currentRel && targetReleaseIds.has(currentRel.id)) {
            areas.push({
              release: currentRel,
              topY: startIdx * ROW_HEIGHT,
              height: (i - startIdx) * ROW_HEIGHT
            });
          }
          currentRel = row.group.release.id !== "__unassigned__" ? releases.find((r) => r.id === row.group.release.id) || null : null;
          startIdx = i;
        }
      }
      if (currentRel && targetReleaseIds.has(currentRel.id)) {
        areas.push({
          release: currentRel,
          topY: startIdx * ROW_HEIGHT,
          height: (displayRows.length - startIdx) * ROW_HEIGHT
        });
      }
    } else {
      let currentProjRel = null;
      let projStartIdx = 0;
      for (let i = 0; i < displayRows.length; i++) {
        const row = displayRows[i];
        if (row.kind === "project") {
          if (currentProjRel && targetReleaseIds.has(currentProjRel.id)) {
            areas.push({
              release: currentProjRel,
              topY: projStartIdx * ROW_HEIGHT,
              height: (i - projStartIdx) * ROW_HEIGHT
            });
          }
          const relId = row.group.project.releaseId;
          currentProjRel = relId && targetReleaseIds.has(relId) ? releases.find((r) => r.id === relId) || null : null;
          projStartIdx = i;
        }
      }
      if (currentProjRel && targetReleaseIds.has(currentProjRel.id)) {
        areas.push({
          release: currentProjRel,
          topY: projStartIdx * ROW_HEIGHT,
          height: (displayRows.length - projStartIdx) * ROW_HEIGHT
        });
      }
    }
    if (areas.length === 0 && displayRows.length === 0) {
      for (const rId of targetReleaseIds) {
        const rel = releases.find((r) => r.id === rId);
        if (rel) {
          areas.push({
            release: rel,
            topY: 0,
            height: Math.max(ROW_HEIGHT, totalCanvasHeight)
          });
        }
      }
    }
    const list = [];
    for (const area of areas) {
      const areaItems = [];
      for (const m of area.release.milestones) {
        if (!visibleMilestoneKeys.has(m.key.toLowerCase())) continue;
        const mDate = parseDateSafe(m.date);
        const diff = differenceInCalendarDays2(mDate, timelineStart);
        const x = diff * dayWidth + dayWidth / 2;
        if (x >= -60 && x <= totalCanvasWidth + 60) {
          areaItems.push({
            guideKey: `${area.release.id}-${m.key}`,
            release: area.release,
            milestone: m,
            x,
            topY: area.topY,
            height: area.height,
            tier: 0
          });
        }
      }
      areaItems.sort((a, b) => a.x - b.x);
      let lastX = -9999;
      let tier = 0;
      for (const item of areaItems) {
        if (Math.abs(item.x - lastX) < 55) {
          tier = (tier + 1) % 2;
        } else {
          tier = 0;
        }
        item.tier = tier;
        lastX = item.x;
        list.push(item);
      }
    }
    return list;
  }, [
    releases,
    releaseGuideVisibility,
    activeReleaseId,
    projects,
    visibleProjectGroups,
    displayRows,
    groupingMode,
    timelineStart,
    dayWidth,
    totalCanvasWidth,
    totalCanvasHeight,
    visibleMilestoneKeys,
    hiddenReleaseIds
  ]);
  const handleTimelineMouseMove = (e) => {
    if (dragState || depDragState || isResizingSplitRef.current) {
      if (cursorScrubber) setCursorScrubber(null);
      return;
    }
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    if (rawX < 0 || rawX > totalCanvasWidth) {
      if (cursorScrubber) setCursorScrubber(null);
      return;
    }
    const dayIndex = Math.max(
      0,
      Math.min(timelineDays.length - 1, Math.floor(rawX / dayWidth))
    );
    const date = timelineDays[dayIndex];
    if (date) {
      setCursorScrubber({ x: rawX, date });
    }
  };
  const handleTimelineMouseLeave = () => {
    setCursorScrubber(null);
  };
  return /* @__PURE__ */ React4.createElement("div", { className: "flex flex-col flex-1 min-h-0 bg-white dark:bg-[#0C0C09] rounded-[8px] border border-[#0C0C09] dark:border-zinc-800 shadow-none" }, /* @__PURE__ */ React4.createElement(
    "div",
    {
      ref: cronogramaToolbarRef,
      "data-testid": "cronograma-toolbar",
      className: "sticky top-12 z-40 min-h-10 py-1 px-3 bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-800 flex items-center justify-between shrink-0 select-none gap-2 shadow-xs"
    },
    /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-2 min-w-0 flex-1" }, onToggleShowTable && /* @__PURE__ */ React4.createElement("div", { className: "relative group inline-flex items-center" }, /* @__PURE__ */ React4.createElement(
      "button",
      {
        type: "button",
        "data-testid": "cronograma-toggle-table-btn",
        onClick: onToggleShowTable,
        "aria-label": showTable ? "Ocultar tabla de tareas" : "Mostrar tabla de tareas",
        title: showTable ? "Ocultar tabla WBS" : "Mostrar tabla WBS",
        className: `w-7 h-7 flex items-center justify-center rounded-[3px] border transition cursor-pointer shrink-0 ${showTable ? "bg-white dark:bg-zinc-800 border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] dark:text-zinc-200 shadow-xs" : "bg-[#F4F4F1] dark:bg-zinc-800/60 border-dashed border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400"}`
      },
      showTable ? /* @__PURE__ */ React4.createElement(PanelLeftClose, { className: "w-3.5 h-3.5" }) : /* @__PURE__ */ React4.createElement(PanelLeftOpen, { className: "w-3.5 h-3.5" })
    ), /* @__PURE__ */ React4.createElement("div", { className: "pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 animate-fade-in" }, /* @__PURE__ */ React4.createElement("div", { className: "w-1.5 h-1.5 bg-[#0C0C09] dark:bg-zinc-100 rotate-45 -mb-0.5" }), /* @__PURE__ */ React4.createElement("div", { className: "bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap" }, showTable ? "Ocultar tabla WBS" : "Mostrar tabla WBS"))), /* @__PURE__ */ React4.createElement("div", { className: "h-4 w-px bg-[#E2E2DC] dark:bg-zinc-800 shrink-0 hidden sm:block" }), /* @__PURE__ */ React4.createElement(
      SearchFilterBar,
      {
        testIdPrefix: "table",
        searchQuery: tableSearchQuery,
        onChangeSearchQuery: setTableSearchQuery,
        excludeQuery: tableExcludeQuery,
        onChangeExcludeQuery: setTableExcludeQuery,
        searchFields,
        onChangeSearchFields: setSearchFields,
        selectedType: tableTypeFilter,
        onChangeSelectedType: setTableTypeFilter,
        selectedPlatform: activePlatformFilter,
        onChangeSelectedPlatform: handleSelectPlatformFilter,
        selectedAlert: tableAlertFilter,
        onChangeSelectedAlert: setTableAlertFilter,
        releases: releases.filter((r) => !hiddenReleaseIds || !hiddenReleaseIds.includes(r.id)),
        selectedRelease: tableReleaseFilter,
        onChangeSelectedRelease: setTableReleaseFilter,
        showSubtasksOnFilter,
        onChangeShowSubtasksOnFilter: setShowSubtasksOnFilter,
        initialShowSearchFieldsMenu,
        initialShowAdvancedPanel,
        enableBuiltInSavedFilters: true,
        onClearFilters: () => {
          setTableSearchQuery("");
          setTableExcludeQuery("");
          setTableTypeFilter("all");
          handleSelectPlatformFilter("all");
          setTableAlertFilter("all");
          setTableReleaseFilter("all");
          setShowSubtasksOnFilter(false);
          setSearchFields({ ...DEFAULT_GANTT_SEARCH_FIELDS });
        }
      }
    )),
    /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-1.5 shrink-0" }, /* @__PURE__ */ React4.createElement("div", { className: "relative group inline-flex items-center" }, /* @__PURE__ */ React4.createElement(
      "button",
      {
        type: "button",
        "data-testid": "header-toggle-row-separators-btn",
        onClick: handleToggleRowSeparators,
        "aria-label": "L\xEDneas horizontales",
        title: "L\xEDneas de separaci\xF3n entre filas",
        className: `w-7 h-7 flex items-center justify-center rounded-[3px] border transition cursor-pointer shrink-0 ${showRowSeparators ? "bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:border-white dark:text-[#0C0C09]" : "bg-white dark:bg-zinc-800 border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white hover:border-[#0C0C09] dark:hover:border-zinc-500"}`
      },
      /* @__PURE__ */ React4.createElement(Rows, { className: "w-3.5 h-3.5" })
    ), /* @__PURE__ */ React4.createElement("div", { className: "pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 animate-fade-in" }, /* @__PURE__ */ React4.createElement("div", { className: "w-1.5 h-1.5 bg-[#0C0C09] dark:bg-zinc-100 rotate-45 -mb-0.5" }), /* @__PURE__ */ React4.createElement("div", { className: "bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap" }, "L\xEDneas de separaci\xF3n"))), /* @__PURE__ */ React4.createElement("div", { className: "relative group inline-flex items-center" }, /* @__PURE__ */ React4.createElement(
      "button",
      {
        type: "button",
        "data-testid": "header-toggle-weekend-shading-btn",
        onClick: handleToggleWeekendShading,
        "aria-label": "Fines de semana",
        title: "Sombreado de fines de semana",
        className: `w-7 h-7 flex items-center justify-center rounded-[3px] border transition cursor-pointer shrink-0 ${showWeekendShading ? "bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:border-white dark:text-[#0C0C09]" : "bg-white dark:bg-zinc-800 border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white hover:border-[#0C0C09] dark:hover:border-zinc-500"}`
      },
      /* @__PURE__ */ React4.createElement(CalendarDays, { className: "w-3.5 h-3.5" })
    ), /* @__PURE__ */ React4.createElement("div", { className: "pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 animate-fade-in" }, /* @__PURE__ */ React4.createElement("div", { className: "w-1.5 h-1.5 bg-[#0C0C09] dark:bg-zinc-100 rotate-45 -mb-0.5" }), /* @__PURE__ */ React4.createElement("div", { className: "bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap" }, "Sombreado de fines de semana"))), /* @__PURE__ */ React4.createElement("div", { className: "relative group inline-flex items-center" }, /* @__PURE__ */ React4.createElement(
      "button",
      {
        type: "button",
        "data-testid": "header-toggle-critical-path-btn",
        onClick: handleToggleCriticalPath,
        "aria-label": "Ruta Cr\xEDtica",
        title: "Ruta Cr\xEDtica (CPM)",
        className: `w-7 h-7 flex items-center justify-center rounded-[3px] border transition cursor-pointer shrink-0 ${showCriticalPath ? "bg-amber-500/20 border-[#D97706] text-[#D97706] dark:text-amber-400 font-bold" : "bg-white dark:bg-zinc-800 border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white hover:border-[#0C0C09] dark:hover:border-zinc-500"}`
      },
      /* @__PURE__ */ React4.createElement(Flame, { className: "w-3.5 h-3.5 text-current" })
    ), /* @__PURE__ */ React4.createElement("div", { className: "pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 animate-fade-in" }, /* @__PURE__ */ React4.createElement("div", { className: "w-1.5 h-1.5 bg-[#0C0C09] dark:bg-zinc-100 rotate-45 -mb-0.5" }), /* @__PURE__ */ React4.createElement("div", { className: "bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap" }, "Ruta Cr\xEDtica (CPM)"))), /* @__PURE__ */ React4.createElement("div", { ref: milestonesMenuRef, className: "relative group inline-flex items-center", "data-dropdown-container": "true" }, /* @__PURE__ */ React4.createElement(
      "button",
      {
        type: "button",
        "data-testid": "toggle-milestones-menu-btn",
        onClick: () => setShowMilestonesMenu((prev) => !prev),
        "aria-label": "Configurar hitos de release visibles",
        title: "Hitos de release visibles en cronograma (Por defecto: QG4, QG5)",
        className: `w-7 h-7 flex items-center justify-center rounded-[3px] border transition cursor-pointer shrink-0 ${showMilestonesMenu ? "bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:border-white dark:text-[#0C0C09]" : "bg-white dark:bg-zinc-800 border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white hover:border-[#0C0C09] dark:hover:border-zinc-500"}`
      },
      /* @__PURE__ */ React4.createElement(Diamond, { className: "w-3.5 h-3.5" })
    ), !showMilestonesMenu && /* @__PURE__ */ React4.createElement("div", { className: "pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 animate-fade-in" }, /* @__PURE__ */ React4.createElement("div", { className: "w-1.5 h-1.5 bg-[#0C0C09] dark:bg-zinc-100 rotate-45 -mb-0.5" }), /* @__PURE__ */ React4.createElement("div", { className: "bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap" }, "Hitos de release visibles")), showMilestonesMenu && /* @__PURE__ */ React4.createElement(
      "div",
      {
        "data-testid": "milestones-visibility-menu",
        className: "absolute right-0 top-full mt-1.5 w-60 p-2 bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[4px] shadow-xl z-50 text-xs flex flex-col gap-1.5"
      },
      /* @__PURE__ */ React4.createElement("div", { className: "flex items-center justify-between pb-1.5 border-b border-[#E2E2DC] dark:border-zinc-800" }, /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React4.createElement(Diamond, { className: "w-3 h-3 text-amber-500 fill-current" }), /* @__PURE__ */ React4.createElement("span", { className: "text-[10px] font-mono font-bold uppercase tracking-wider text-[#0C0C09] dark:text-zinc-200" }, "Hitos de Release")), /* @__PURE__ */ React4.createElement("span", { className: "text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-300 font-bold" }, visibleMilestoneKeys.size, "/16")),
      /* @__PURE__ */ React4.createElement("div", { className: "grid grid-cols-3 gap-1 pb-1 border-b border-[#E2E2DC] dark:border-zinc-800 text-[10px]" }, /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-testid": "milestones-preset-default",
          onClick: () => setVisibleMilestoneKeys(/* @__PURE__ */ new Set(["qg4", "qg5"])),
          className: "px-1 py-0.5 rounded bg-[#F4F4F1] dark:bg-zinc-800 hover:bg-[#0C0C09] hover:text-white dark:hover:bg-zinc-100 dark:hover:text-black font-medium transition cursor-pointer text-center",
          title: "Mostrar \xFAnicamente QG4 y QG5 (valor por defecto)"
        },
        "QG4/QG5"
      ), /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-testid": "milestones-preset-all",
          onClick: () => setVisibleMilestoneKeys(
            new Set(RELEASE_MILESTONE_DEFINITIONS.map((d) => d.id.toLowerCase()))
          ),
          className: "px-1 py-0.5 rounded bg-[#F4F4F1] dark:bg-zinc-800 hover:bg-[#0C0C09] hover:text-white dark:hover:bg-zinc-100 dark:hover:text-black font-medium transition cursor-pointer text-center",
          title: "Mostrar todos los 16 hitos"
        },
        "Todos"
      ), /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-testid": "milestones-preset-none",
          onClick: () => setVisibleMilestoneKeys(/* @__PURE__ */ new Set()),
          className: "px-1 py-0.5 rounded bg-[#F4F4F1] dark:bg-zinc-800 hover:bg-[#0C0C09] hover:text-white dark:hover:bg-zinc-100 dark:hover:text-black font-medium transition cursor-pointer text-center",
          title: "Ocultar todos los hitos"
        },
        "Ninguno"
      )),
      /* @__PURE__ */ React4.createElement("div", { className: "max-h-56 overflow-y-auto flex flex-col gap-0.5 pr-0.5" }, RELEASE_MILESTONE_DEFINITIONS.map((def) => {
        const isChecked = visibleMilestoneKeys.has(def.id.toLowerCase());
        return /* @__PURE__ */ React4.createElement(
          "label",
          {
            key: def.id,
            "data-testid": `milestone-toggle-${def.id}`,
            className: "flex items-center justify-between px-2 py-1 rounded-[2px] hover:bg-[#F4F4F1] dark:hover:bg-zinc-800/60 cursor-pointer select-none"
          },
          /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-2 overflow-hidden" }, /* @__PURE__ */ React4.createElement(
            "input",
            {
              type: "checkbox",
              checked: isChecked,
              onChange: () => {
                setVisibleMilestoneKeys((prev) => {
                  const next = new Set(prev);
                  const k = def.id.toLowerCase();
                  if (next.has(k)) next.delete(k);
                  else next.add(k);
                  return next;
                });
              },
              className: "rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09] cursor-pointer"
            }
          ), /* @__PURE__ */ React4.createElement("span", { className: "font-mono font-bold text-[11px] text-[#0C0C09] dark:text-zinc-200" }, def.code)),
          /* @__PURE__ */ React4.createElement(
            "span",
            {
              className: "text-[10px] text-[#6B6B66] dark:text-zinc-400 truncate max-w-[110px]",
              title: def.name
            },
            def.category
          )
        );
      }))
    )), /* @__PURE__ */ React4.createElement("div", { className: "relative group inline-flex items-center" }, /* @__PURE__ */ React4.createElement(
      "button",
      {
        type: "button",
        "data-fit-timeline-btn": "true",
        "data-fit-project-header-btn": "true",
        onClick: () => handleFitProjectAction(),
        "aria-label": "Ajustar a Proyecto",
        title: isFocusMode && focusEntity ? `Ajustar zoom a ${focusEntity.type === "release" ? "la release enfocada" : focusEntity.type === "project" ? "el proyecto enfocado" : "la tarea enfocada"} (${focusEntity.name || focusEntity.id})` : "Ajustar a Proyecto (ajustar zoom al proyecto completo)",
        className: "w-7 h-7 flex items-center justify-center rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white hover:border-[#0C0C09] dark:hover:border-zinc-500 transition cursor-pointer shrink-0"
      },
      /* @__PURE__ */ React4.createElement(Maximize2, { className: "w-3.5 h-3.5" })
    ), /* @__PURE__ */ React4.createElement("div", { className: "pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 animate-fade-in" }, /* @__PURE__ */ React4.createElement("div", { className: "w-1.5 h-1.5 bg-[#0C0C09] dark:bg-zinc-100 rotate-45 -mb-0.5" }), /* @__PURE__ */ React4.createElement("div", { className: "bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap" }, isFocusMode && focusEntity ? focusEntity.type === "release" ? "Ajustar zoom a la release enfocada" : focusEntity.type === "project" ? "Ajustar zoom al proyecto enfocado" : "Ajustar zoom al enfoque activo" : "Ajustar zoom al proyecto"))), /* @__PURE__ */ React4.createElement("div", { className: "relative group inline-flex items-center" }, /* @__PURE__ */ React4.createElement(
      "button",
      {
        type: "button",
        "data-testid": "header-scroll-today-btn",
        onClick: handleScrollToToday,
        "aria-label": "Ir a Hoy",
        title: "Ir al d\xEDa de hoy",
        className: "w-7 h-7 flex items-center justify-center rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white hover:border-[#0C0C09] dark:hover:border-zinc-500 transition cursor-pointer shrink-0"
      },
      /* @__PURE__ */ React4.createElement(Compass, { className: "w-3.5 h-3.5" })
    ), /* @__PURE__ */ React4.createElement("div", { className: "pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 animate-fade-in" }, /* @__PURE__ */ React4.createElement("div", { className: "w-1.5 h-1.5 bg-[#0C0C09] dark:bg-zinc-100 rotate-45 -mb-0.5" }), /* @__PURE__ */ React4.createElement("div", { className: "bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap" }, "Ir a Hoy"))), /* @__PURE__ */ React4.createElement("div", { className: "relative group inline-flex items-center" }, /* @__PURE__ */ React4.createElement(
      "button",
      {
        ref: metricsToggleBtnRef,
        type: "button",
        "data-testid": "header-toggle-metrics-btn",
        onClick: handleToggleMetrics,
        "aria-label": "M\xE9tricas del proyecto",
        title: "M\xE9tricas del proyecto",
        className: `w-7 h-7 flex items-center justify-center rounded-[3px] border transition cursor-pointer shrink-0 ${showMetricsDrawer ? "bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:border-white dark:text-[#0C0C09]" : "bg-white dark:bg-zinc-800 border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white hover:border-[#0C0C09] dark:hover:border-zinc-500"}`
      },
      /* @__PURE__ */ React4.createElement(BarChart3, { className: "w-3.5 h-3.5" })
    ), /* @__PURE__ */ React4.createElement("div", { className: "pointer-events-none absolute top-full mt-1.5 right-0 hidden group-hover:flex flex-col items-end z-50 animate-fade-in" }, /* @__PURE__ */ React4.createElement("div", { className: "w-1.5 h-1.5 bg-[#0C0C09] dark:bg-zinc-100 rotate-45 -mb-0.5 mr-2" }), /* @__PURE__ */ React4.createElement("div", { className: "bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap" }, "M\xE9tricas del proyecto"))))
  ), /* @__PURE__ */ React4.createElement("div", { ref: splitPaneRef, className: "flex flex-1 min-h-0 overflow-hidden relative" }, showTable && /* @__PURE__ */ React4.createElement(React4.Fragment, null, /* @__PURE__ */ React4.createElement(
    "div",
    {
      style: { width: splitWidth },
      className: "relative shrink-0 flex flex-col border-r border-[#0C0C09] dark:border-zinc-800 bg-white dark:bg-[#0C0C09] overflow-hidden select-none"
    },
    /* @__PURE__ */ React4.createElement(
      "div",
      {
        style: { height: HEADER_HEIGHT },
        className: "absolute top-0 right-0 z-30 flex items-center justify-center pr-2 pl-1.5 bg-[#F4F4F1] dark:bg-[#18181b] border-b border-[#0C0C09] dark:border-zinc-800"
      },
      /* @__PURE__ */ React4.createElement("div", { ref: columnsMenuRef, className: "relative", "data-dropdown-container": "true" }, /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          onClick: () => setShowColumnsMenu((prev) => !prev),
          className: "p-1 rounded-[4px] hover:bg-black/5 dark:hover:bg-white/10 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white transition cursor-pointer",
          "aria-label": "Configurar columnas",
          title: "Columnas visibles"
        },
        /* @__PURE__ */ React4.createElement(SlidersHorizontal2, { className: "w-3.5 h-3.5" })
      ), showColumnsMenu && /* @__PURE__ */ React4.createElement("div", { className: "absolute right-0 top-8 w-44 p-1.5 bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[4px] shadow-xl z-50 text-xs flex flex-col gap-1" }, /* @__PURE__ */ React4.createElement("div", { className: "px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 border-b border-[#E2E2DC] dark:border-zinc-800" }, "Mostrar Columnas"), /* @__PURE__ */ React4.createElement("label", { className: "flex items-center gap-2 px-2 py-1 rounded-[2px] hover:bg-[#F4F4F1] dark:hover:bg-zinc-800/60 cursor-pointer" }, /* @__PURE__ */ React4.createElement(
        "input",
        {
          type: "checkbox",
          checked: visibleColumns.team,
          onChange: () => toggleVisibleColumn("team"),
          className: "rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09]"
        }
      ), /* @__PURE__ */ React4.createElement("span", { className: "text-[#0C0C09] dark:text-zinc-300 font-medium" }, "Equipo")), /* @__PURE__ */ React4.createElement("label", { className: "flex items-center gap-2 px-2 py-1 rounded-[2px] hover:bg-[#F4F4F1] dark:hover:bg-zinc-800/60 cursor-pointer" }, /* @__PURE__ */ React4.createElement(
        "input",
        {
          type: "checkbox",
          checked: visibleColumns.dates,
          onChange: () => toggleVisibleColumn("dates"),
          className: "rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09]"
        }
      ), /* @__PURE__ */ React4.createElement("span", { className: "text-[#0C0C09] dark:text-zinc-300 font-medium" }, "Fechas")), /* @__PURE__ */ React4.createElement("label", { className: "flex items-center gap-2 px-2 py-1 rounded-[2px] hover:bg-[#F4F4F1] dark:hover:bg-zinc-800/60 cursor-pointer" }, /* @__PURE__ */ React4.createElement(
        "input",
        {
          type: "checkbox",
          checked: visibleColumns.dur,
          onChange: () => toggleVisibleColumn("dur"),
          className: "rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09]"
        }
      ), /* @__PURE__ */ React4.createElement("span", { className: "text-[#0C0C09] dark:text-zinc-300 font-medium" }, "Duraci\xF3n")), /* @__PURE__ */ React4.createElement("label", { className: "flex items-center gap-2 px-2 py-1 rounded-[2px] hover:bg-[#F4F4F1] dark:hover:bg-zinc-800/60 cursor-pointer" }, /* @__PURE__ */ React4.createElement(
        "input",
        {
          type: "checkbox",
          checked: visibleColumns.slack,
          onChange: () => toggleVisibleColumn("slack"),
          className: "rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09]"
        }
      ), /* @__PURE__ */ React4.createElement("span", { className: "text-[#0C0C09] dark:text-zinc-300 font-medium" }, "Slack")), /* @__PURE__ */ React4.createElement("label", { className: "flex items-center gap-2 px-2 py-1 rounded-[2px] hover:bg-[#F4F4F1] dark:hover:bg-zinc-800/60 cursor-pointer" }, /* @__PURE__ */ React4.createElement(
        "input",
        {
          type: "checkbox",
          checked: visibleColumns.deps,
          onChange: () => toggleVisibleColumn("deps"),
          className: "rounded-[2px] border-[#0C0C09] dark:border-zinc-700 text-[#0C0C09]"
        }
      ), /* @__PURE__ */ React4.createElement("span", { className: "text-[#0C0C09] dark:text-zinc-300 font-medium" }, "Dependencias")), /* @__PURE__ */ React4.createElement("div", { className: "pt-1.5 mt-1 border-t border-[#E2E2DC] dark:border-zinc-800 flex flex-col gap-1" }, /* @__PURE__ */ React4.createElement("div", { className: "px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400" }, "Truncar Nombres"), /* @__PURE__ */ React4.createElement("div", { className: "flex items-center justify-between px-2 py-0.5 gap-2" }, /* @__PURE__ */ React4.createElement("span", { className: "text-[11px] text-[#0C0C09] dark:text-zinc-300" }, "L\xEDmite car.:"), /* @__PURE__ */ React4.createElement(
        "input",
        {
          type: "number",
          min: 10,
          max: 120,
          "data-testid": "columns-truncate-input",
          value: effectiveTruncateLimit,
          onChange: (e) => {
            const val = parseInt(e.target.value, 10);
            if (Number.isFinite(val)) {
              handleUpdateTruncateLimit(val);
            }
          },
          className: "w-14 px-1 py-0.5 rounded border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-mono text-center font-bold"
        }
      )), /* @__PURE__ */ React4.createElement("div", { className: "flex items-center justify-between px-2 pt-0.5 pb-1 gap-1" }, [25, 37, 50, 75].map((preset) => /* @__PURE__ */ React4.createElement(
        "button",
        {
          key: preset,
          type: "button",
          "data-testid": `truncate-preset-btn-${preset}`,
          onClick: () => handleUpdateTruncateLimit(preset),
          className: `px-1.5 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${effectiveTruncateLimit === preset ? "bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] font-bold" : "bg-[#F4F4F1] dark:bg-zinc-800 text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09]"}`
        },
        preset
      ))))))
    ),
    /* @__PURE__ */ React4.createElement("div", { className: "overflow-x-auto flex-1 flex flex-col" }, /* @__PURE__ */ React4.createElement("div", { className: "min-w-full flex-1 flex flex-col" }, /* @__PURE__ */ React4.createElement(
      "div",
      {
        ref: tableHeaderRef,
        "data-testid": "wbs-table-header",
        style: { height: HEADER_HEIGHT, minWidth: tableMinWidth },
        className: "flex items-center justify-between px-3 bg-[#F4F4F1] dark:bg-[#18181b] border-b border-[#0C0C09] dark:border-zinc-800 text-[10px] font-mono font-bold uppercase tracking-wider text-[#0C0C09] dark:text-zinc-300 shrink-0 select-none shadow-xs sticky top-0 z-20"
      },
      /* @__PURE__ */ React4.createElement(
        "div",
        {
          style: { width: nameColumnWidth },
          className: "flex items-center gap-2 shrink-0"
        }
      ),
      /* @__PURE__ */ React4.createElement("div", { className: "flex items-center shrink-0" }, visibleColumns.dates && /* @__PURE__ */ React4.createElement("span", { className: "w-44 text-center text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400 uppercase font-bold" }, "Fechas"), visibleColumns.dur && /* @__PURE__ */ React4.createElement("span", { className: "w-16 text-center text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400 uppercase font-bold" }, "Dur."), visibleColumns.slack && /* @__PURE__ */ React4.createElement(
        "span",
        {
          className: "w-14 text-center text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400 uppercase font-bold",
          title: "Holgura Libre calculada autom\xE1ticamente dadas las tareas siguientes (sucesoras)"
        },
        "Slack"
      ), visibleColumns.deps && /* @__PURE__ */ React4.createElement("span", { className: "w-20 text-center text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400 uppercase font-bold" }, "Deps"), /* @__PURE__ */ React4.createElement("div", { className: "w-28 shrink-0 pr-1" }))
    ), hiddenReleaseIds && hiddenReleaseIds.length > 0 && onResetHiddenReleases && /* @__PURE__ */ React4.createElement(
      "div",
      {
        "data-testid": "hidden-releases-banner",
        style: { minWidth: tableMinWidth },
        className: "flex items-center justify-between px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300"
      },
      /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React4.createElement(EyeOff, { className: "w-3.5 h-3.5 shrink-0" }), /* @__PURE__ */ React4.createElement("span", null, "Hay ", hiddenReleaseIds.length, " release", hiddenReleaseIds.length > 1 ? "s" : "", " oculta", hiddenReleaseIds.length > 1 ? "s" : "", " y sus proyectos no se muestran.")),
      /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-testid": "table-reset-hidden-releases-btn",
          onClick: onResetHiddenReleases,
          className: "font-bold underline hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer flex items-center gap-1"
        },
        /* @__PURE__ */ React4.createElement(Eye, { className: "w-3 h-3" }),
        /* @__PURE__ */ React4.createElement("span", null, "Mostrar todas")
      )
    ), /* @__PURE__ */ React4.createElement("div", { className: `relative z-10 ${showRowSeparators ? "divide-y divide-[#E2E2DC] dark:divide-zinc-800/60" : ""}` }, visibleProjectGroups.length === 0 && /* @__PURE__ */ React4.createElement(
      "div",
      {
        "data-empty-selected-projects": "true",
        style: { minWidth: tableMinWidth },
        className: "flex flex-col items-center justify-center py-12 px-6 text-center bg-slate-50/40 dark:bg-zinc-900/30"
      },
      tableSearchQuery.trim() || tableExcludeQuery.trim() || tableTypeFilter !== "all" || tablePlatformFilter !== "all" || tableAlertFilter !== "all" || tableReleaseFilter !== "all" ? /* @__PURE__ */ React4.createElement(React4.Fragment, null, /* @__PURE__ */ React4.createElement(Search2, { className: "w-8 h-8 text-slate-400 dark:text-zinc-500 mb-2" }), /* @__PURE__ */ React4.createElement("p", { className: "text-sm font-bold text-slate-700 dark:text-zinc-200" }, "No se encontraron proyectos o tareas coincidentes"), /* @__PURE__ */ React4.createElement("p", { className: "text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md" }, "Ning\xFAn elemento coincide con la b\xFAsqueda o los filtros seleccionados."), /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-testid": "table-reset-filters-btn",
          onClick: () => {
            setTableSearchQuery("");
            setTableExcludeQuery("");
            setTableTypeFilter("all");
            setTablePlatformFilter("all");
            setTableAlertFilter("all");
            setTableReleaseFilter("all");
            setShowSubtasksOnFilter(false);
            setSearchFields({ ...DEFAULT_GANTT_SEARCH_FIELDS });
          },
          className: "mt-3 px-3.5 py-1.5 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1.5"
        },
        /* @__PURE__ */ React4.createElement(X3, { className: "w-3.5 h-3.5" }),
        /* @__PURE__ */ React4.createElement("span", null, "Restablecer b\xFAsqueda y filtros")
      )) : hiddenReleaseIds && hiddenReleaseIds.length > 0 ? /* @__PURE__ */ React4.createElement(React4.Fragment, null, /* @__PURE__ */ React4.createElement(EyeOff, { className: "w-8 h-8 text-amber-500 mb-2" }), /* @__PURE__ */ React4.createElement("p", { className: "text-sm font-bold text-slate-700 dark:text-zinc-200" }, "Hay ", hiddenReleaseIds.length, " release", hiddenReleaseIds.length > 1 ? "s" : "", " oculta", hiddenReleaseIds.length > 1 ? "s" : ""), /* @__PURE__ */ React4.createElement("p", { className: "text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md" }, "Los proyectos seleccionados pertenecen a releases que est\xE1n actualmente ocultas. Restablece la visibilidad para verlos en el diagrama Gantt."), onResetHiddenReleases && /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-testid": "empty-state-reset-hidden-releases-btn",
          onClick: onResetHiddenReleases,
          className: "mt-3 px-3.5 py-1.5 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1.5"
        },
        /* @__PURE__ */ React4.createElement(Eye, { className: "w-3.5 h-3.5 text-amber-400 dark:text-amber-600" }),
        /* @__PURE__ */ React4.createElement("span", null, "Restablecer visibilidad (Mostrar todas las releases)")
      )) : /* @__PURE__ */ React4.createElement(React4.Fragment, null, /* @__PURE__ */ React4.createElement(FolderKanban, { className: "w-8 h-8 text-slate-400 dark:text-zinc-500 mb-2" }), /* @__PURE__ */ React4.createElement("p", { className: "text-sm font-bold text-slate-700 dark:text-zinc-200" }, "No hay proyectos seleccionados para mostrar en el diagrama Gantt"), /* @__PURE__ */ React4.createElement("p", { className: "text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md" }, "Abre la vista de Lista de Proyectos y marca al menos un proyecto para visualizar su cronograma aqu\xED."), onCreateProject ? /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-testid": "empty-state-create-project-btn",
          onClick: () => onCreateProject({
            id: `proj-${Date.now()}`,
            name: "Nuevo Proyecto",
            color: "indigo",
            collapsed: false,
            isDemo: false,
            releaseId: releases[0]?.id || "rel-t-26-12-1"
          }),
          className: "mt-3 px-3.5 py-1.5 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-1.5"
        },
        /* @__PURE__ */ React4.createElement(Plus2, { className: "w-3.5 h-3.5" }),
        /* @__PURE__ */ React4.createElement("span", null, "Crear Proyecto")
      ) : onOpenProjectsView ? /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          onClick: onOpenProjectsView,
          className: "mt-3 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
        },
        "Ir a Lista de Proyectos"
      ) : null)
    ), displayRows.length > 0 && /* @__PURE__ */ React4.createElement(
      "div",
      {
        style: { height: displayRows.length * ROW_HEIGHT, minWidth: tableMinWidth },
        className: `relative ${isCollapseAnimating ? "transition-[height] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]" : ""}`
      },
      displayRows.map((row, rowIndex) => {
        const rowShiftY = rowDragShiftYByRowId.get(row.rowId) || 0;
        const rowShiftStyle = rowShiftY ? { transform: `translateY(${rowShiftY}px)` } : void 0;
        const rowShiftClass = isAnyRowOrProjectDragging ? "transition-transform duration-200 ease-out" : isCollapseAnimating ? "transition-[top] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]" : "";
        const rowExpandClass = isRowCollapsing(row) ? "animate-gantt-row-collapse" : isRowJustExpanded(row) ? "animate-gantt-row-expand" : "";
        if (row.kind === "release") {
          const { group: rGroup } = row;
          const isCollapsed = collapsedReleaseIds.has(rGroup.release.id);
          return /* @__PURE__ */ React4.createElement(
            "div",
            {
              key: row.rowId,
              "data-release-group": rGroup.release.id,
              style: { top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT, minWidth: tableMinWidth },
              className: `absolute left-0 right-0 flex items-center justify-start px-3 text-xs font-bold ${rowShiftClass} ${showRowSeparators ? "border-y border-[#0C0C09] dark:border-zinc-700" : "border-y-0"} bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]`
            },
            /* @__PURE__ */ React4.createElement(
              "div",
              {
                style: { width: nameColumnWidth },
                className: "flex items-center gap-2 pr-2 shrink-0 pl-1 min-w-0 overflow-hidden"
              },
              /* @__PURE__ */ React4.createElement(
                "button",
                {
                  type: "button",
                  "data-testid": `toggle-collapse-release-${rGroup.release.id}`,
                  onClick: () => handleToggleReleaseCollapse(rGroup.release.id),
                  className: "p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 transition cursor-pointer shrink-0"
                },
                /* @__PURE__ */ React4.createElement(
                  ChevronRight,
                  {
                    className: `w-4 h-4 transition-transform duration-200 ease-out ${isCollapsed ? "rotate-0" : "rotate-90"}`
                  }
                )
              ),
              /* @__PURE__ */ React4.createElement("span", { className: "font-mono text-xs px-1.5 py-0.5 rounded bg-white/20 dark:bg-black/10 shrink-0" }, rGroup.release.code),
              /* @__PURE__ */ React4.createElement(
                "span",
                {
                  "data-release-duration-badge": rGroup.release.id,
                  className: "px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-white/20 dark:bg-black/10 shrink-0",
                  title: `Duraci\xF3n completa de la release: ${rGroup.duration} d\xEDas`
                },
                rGroup.duration,
                "d"
              ),
              onToggleHideRelease && /* @__PURE__ */ React4.createElement(
                "button",
                {
                  type: "button",
                  "data-testid": `hide-release-${rGroup.release.id}`,
                  onClick: (e) => {
                    e.stopPropagation();
                    onToggleHideRelease(rGroup.release.id);
                  },
                  className: "p-1 rounded-[2px] flex items-center justify-center bg-white/20 hover:bg-white/30 text-white dark:bg-black/10 dark:hover:bg-black/20 dark:text-black transition cursor-pointer shrink-0",
                  title: `Ocultar release ${rGroup.release.code} y todos sus proyectos asociados`,
                  "aria-label": `Ocultar release ${rGroup.release.code}`
                },
                /* @__PURE__ */ React4.createElement(EyeOff, { className: "w-3.5 h-3.5" })
              ),
              onSetFocusEntity && (() => {
                const isCurrentRelFocused = isFocusMode && focusEntity?.type === "release" && focusEntity?.id === rGroup.release.id;
                return /* @__PURE__ */ React4.createElement(
                  "button",
                  {
                    type: "button",
                    "data-testid": `focus-release-${rGroup.release.id}`,
                    onClick: (e) => {
                      e.stopPropagation();
                      if (isCurrentRelFocused) {
                        onExitFocusMode ? onExitFocusMode() : onSetFocusEntity(null);
                      } else {
                        onSetFocusEntity({
                          type: "release",
                          id: rGroup.release.id,
                          name: rGroup.release.name
                        });
                      }
                    },
                    className: `p-1 rounded-[2px] flex items-center justify-center transition cursor-pointer shrink-0 ${isCurrentRelFocused ? "bg-amber-400 text-black font-bold ring-2 ring-amber-300 shadow-xs" : "bg-white/20 hover:bg-white/30 text-white dark:bg-black/10 dark:hover:bg-black/20 dark:text-black"}`,
                    title: isCurrentRelFocused ? `Salir de la modalidad enfoque de ${rGroup.release.code} (clic o tecla ESC)` : `Enfocar release ${rGroup.release.code} y sus proyectos`,
                    "aria-label": isCurrentRelFocused ? `Salir de enfoque ${rGroup.release.code}` : `Enfocar release ${rGroup.release.code}`
                  },
                  /* @__PURE__ */ React4.createElement(Sparkles, { className: `w-3.5 h-3.5 ${isCurrentRelFocused ? "text-black fill-current" : "text-amber-300"}` })
                );
              })(),
              rGroup.violationsCount > 0 && /* @__PURE__ */ React4.createElement(
                "span",
                {
                  "data-testid": `release-violations-badge-${rGroup.release.code}`,
                  className: "flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500 text-black text-[10px] font-mono font-bold shrink-0"
                },
                /* @__PURE__ */ React4.createElement(AlertTriangle2, { className: "w-3 h-3" }),
                /* @__PURE__ */ React4.createElement("span", null, rGroup.violationsCount, " desalineaciones")
              ),
              /* @__PURE__ */ React4.createElement(
                "span",
                {
                  className: "px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/15 dark:bg-black/10 opacity-80 shrink-0",
                  title: `${rGroup.projectGroups.length} proyectos y ${rGroup.tasksCount} tareas asociadas`
                },
                rGroup.projectGroups.length,
                " proj \xB7 ",
                rGroup.tasksCount,
                " tareas"
              )
            ),
            /* @__PURE__ */ React4.createElement("div", { className: "flex items-center shrink-0" }, visibleColumns.dates && /* @__PURE__ */ React4.createElement(
              "div",
              {
                className: "w-44 shrink-0 text-center font-mono text-[10px] opacity-90",
                "data-release-dates-cell": rGroup.release.id,
                title: `Fechas de la Release: ${rGroup.startDate} \u2192 ${rGroup.endDate} (${rGroup.duration} d\xEDas)`
              },
              `${formatDateDisplay(rGroup.startDate, "dd/MM")} \u2192 ${formatDateDisplay(rGroup.endDate, "dd/MM")}`
            ), visibleColumns.dur && /* @__PURE__ */ React4.createElement(
              "div",
              {
                className: "w-16 shrink-0 text-center",
                "data-release-duration-cell": rGroup.release.id,
                title: `Duraci\xF3n completa de la release: ${rGroup.duration} d\xEDas`
              },
              /* @__PURE__ */ React4.createElement("span", { className: "px-1.5 py-0.5 rounded bg-white/20 dark:bg-black/15 font-mono text-[10px] font-bold" }, rGroup.duration, "d")
            ), visibleColumns.slack && /* @__PURE__ */ React4.createElement("div", { className: "w-14 shrink-0 text-center font-mono text-[10px] opacity-40" }, "\u2014"), visibleColumns.deps && /* @__PURE__ */ React4.createElement("div", { className: "w-20 shrink-0 text-center font-mono text-[10px] opacity-40" }, "\u2014"), /* @__PURE__ */ React4.createElement("div", { className: "w-28 shrink-0 flex items-center justify-end pr-2 font-mono text-[11px] font-bold" }, /* @__PURE__ */ React4.createElement("span", { className: "px-1.5 py-0.5 rounded bg-white/20 dark:bg-black/15" }, rGroup.progress, "%")))
          );
        }
        if (row.kind === "project") {
          const { group: group2 } = row;
          const projTheme = COLOR_STYLES[group2.project.color] || COLOR_STYLES.indigo;
          const isCollapsed = Boolean(group2.project.collapsed);
          const isProjectDragTarget = dragOverRow?.id === `project:${group2.project.id}`;
          const sameReleaseProjects = visibleProjectGroups.filter(
            (g) => (g.project.releaseId || "") === (group2.project.releaseId || "")
          );
          const currentProjIdxInRelease = sameReleaseProjects.findIndex(
            (g) => g.project.id === group2.project.id
          );
          const isFirstInRelease = currentProjIdxInRelease <= 0;
          const isLastInRelease = currentProjIdxInRelease >= sameReleaseProjects.length - 1;
          const isProjectNameExpanded = focusedProjectInputId === group2.project.id || hoveredNameId === group2.project.id;
          const displayProjectName = isProjectNameExpanded || !group2.project.name || group2.project.name.length <= effectiveTruncateLimit ? group2.project.name || "Proyecto" : group2.project.name.slice(0, effectiveTruncateLimit) + "\u2026";
          const isProjectSelected = effectiveSelectedProjectId === group2.project.id;
          const isProjectMultiSelected = multiSelectedProjectIds.has(group2.project.id);
          const isDraggingThisProject = draggingProjectId === group2.project.id;
          const isProjectReorderTargetBefore = dragOverProject?.id === group2.project.id && dragOverProject.position === "before";
          const isProjectReorderTargetAfter = dragOverProject?.id === group2.project.id && dragOverProject.position === "after";
          const projAccent2 = getProjectAccent(group2.project.color);
          const hasProjectStateBg = isDraggingThisProject || isProjectReorderTargetBefore || isProjectReorderTargetAfter || isProjectDragTarget || isProjectSelected || isProjectMultiSelected;
          return /* @__PURE__ */ React4.createElement(
            "div",
            {
              key: row.rowId,
              "data-project-group": group2.project.id,
              "data-selected-project-row": isProjectSelected ? "true" : void 0,
              "data-project-locked": group2.project.locked ? "true" : "false",
              "data-multi-selected": isProjectMultiSelected ? "true" : "false",
              "data-project-accent-rail": group2.project.id,
              style: {
                top: rowIndex * ROW_HEIGHT,
                height: ROW_HEIGHT,
                minWidth: tableMinWidth,
                boxShadow: `inset 4px 0 0 ${projAccent2.hex}`,
                ...hasProjectStateBg ? {} : { backgroundColor: `rgba(${projAccent2.rgb}, 0.09)` },
                ...rowShiftStyle
              },
              onMouseDown: (e) => handleProjectRowPointerMouseDown(e, group2.project.id, false),
              onContextMenu: (e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({
                  type: "project",
                  id: group2.project.id,
                  x: e.clientX,
                  y: e.clientY
                });
              },
              onClick: (e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) {
                  e.stopPropagation();
                  toggleMultiSelectProject(group2.project.id, e.shiftKey);
                  return;
                }
                const targetEl = e.target;
                if (targetEl?.closest("button")) return;
                const isFormControl = Boolean(targetEl?.closest("input, select, textarea, a"));
                if (isFormControl && isProjectSelected) return;
                handleSelectProject(group2.project);
              },
              onDragOver: (e) => handleDragRowOver(e, `project:${group2.project.id}`),
              onDragLeave: handleDragRowLeave,
              onDrop: (e) => handleDropRow(e, `project:${group2.project.id}`),
              className: `absolute left-0 right-0 group flex items-center justify-start px-3 text-xs font-semibold ${rowShiftClass} ${rowExpandClass} ${showRowSeparators ? "border-y border-slate-200/80 dark:border-zinc-800/80" : "border-y-0"} ${isDraggingThisProject ? "opacity-40 bg-indigo-50/50 dark:bg-indigo-950/30 cursor-grabbing" : isProjectReorderTargetBefore ? "border-t-2 border-t-indigo-600 dark:border-t-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40" : isProjectReorderTargetAfter ? "border-b-2 border-b-indigo-600 dark:border-b-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40" : isProjectDragTarget ? "ring-2 ring-inset ring-indigo-500 bg-indigo-100/70 dark:bg-indigo-950/60" : isProjectSelected ? "ring-2 ring-inset ring-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40" : isProjectMultiSelected ? "ring-1 ring-inset ring-indigo-500 bg-indigo-50/90 dark:bg-indigo-950/50" : projTheme.groupRowBg}`
            },
            /* @__PURE__ */ React4.createElement(
              "div",
              {
                style: { width: nameColumnWidth },
                className: `flex items-center gap-2 pr-2 shrink-0 pl-1 min-w-0 ${isProjectNameExpanded ? "" : "overflow-hidden"}`
              },
              isProjectMultiSelected && /* @__PURE__ */ React4.createElement(
                "button",
                {
                  type: "button",
                  "data-testid": `multi-select-project-${group2.project.id}`,
                  onClick: (e) => {
                    e.stopPropagation();
                    toggleMultiSelectProject(group2.project.id, e.shiftKey);
                  },
                  title: "Quitar proyecto de la selecci\xF3n m\xFAltiple",
                  "aria-label": `Quitar selecci\xF3n del proyecto ${group2.project.name}`,
                  className: "w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center shrink-0 transition cursor-pointer bg-indigo-600 border-indigo-600 text-white"
                },
                /* @__PURE__ */ React4.createElement(Check2, { className: "w-2.5 h-2.5 stroke-[3]" })
              ),
              /* @__PURE__ */ React4.createElement(
                "span",
                {
                  "data-testid": `project-drag-handle-${group2.project.id}`,
                  onMouseDown: (e) => handleProjectRowPointerMouseDown(e, group2.project.id, true),
                  title: "Arrastrar proyecto para reordenarlo dentro de su release",
                  className: "p-0.5 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                },
                /* @__PURE__ */ React4.createElement(GripVertical, { className: "w-3.5 h-3.5" })
              ),
              /* @__PURE__ */ React4.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => handleToggleProjectCollapse(group2.project.id, isCollapsed),
                  className: "p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 shrink-0 transition-colors",
                  style: { color: projAccent2.hex },
                  title: isCollapsed ? "Expandir proyecto" : "Colapsar proyecto"
                },
                /* @__PURE__ */ React4.createElement(
                  ChevronRight,
                  {
                    className: `w-4 h-4 transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${isCollapsed ? "rotate-0" : "rotate-90"}`
                  }
                )
              ),
              /* @__PURE__ */ React4.createElement(
                "button",
                {
                  type: "button",
                  "data-testid": `project-id-badge-${group2.project.id}`,
                  onClick: () => useRightSidebarInspector ? handleSelectProject(group2.project) : setInspectingProject(group2.project),
                  className: `px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white shrink-0 hover:opacity-85 transition cursor-pointer ${projTheme.badge}`,
                  title: group2.project.id === EXTERNAL_MILESTONES_GROUP_ID ? "Hitos externos independientes de proyectos y releases" : `Configuraci\xF3n de ${group2.project.name} (Release, descripci\xF3n, color)`
                },
                group2.project.id === EXTERNAL_MILESTONES_GROUP_ID ? "\u25C6 EXT" : `P${group2.projectIndex}`
              ),
              (() => {
                const projPlatform = normalizePlatform(group2.project.platform);
                if (!projPlatform) return null;
                const showIos = projPlatform === "iOS" || projPlatform === "iOS/Android";
                const showAndroid = projPlatform === "Android" || projPlatform === "iOS/Android";
                return /* @__PURE__ */ React4.createElement(
                  "span",
                  {
                    "data-testid": `project-platform-badge-${group2.project.id}`,
                    "data-platform": projPlatform,
                    className: `inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 border ${projPlatform === "iOS" ? "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800" : projPlatform === "Android" ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" : "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"}`,
                    title: `Plataforma: ${projPlatform}`,
                    "aria-label": `Plataforma: ${projPlatform}`
                  },
                  showIos && /* @__PURE__ */ React4.createElement(
                    AppleIosIcon,
                    {
                      testId: `platform-icon-ios-${group2.project.id}`,
                      className: "w-3 h-3 shrink-0"
                    }
                  ),
                  showAndroid && /* @__PURE__ */ React4.createElement(
                    AndroidIcon,
                    {
                      testId: `platform-icon-android-${group2.project.id}`,
                      className: "w-3 h-3 shrink-0"
                    }
                  )
                );
              })(),
              (() => {
                const alertLevel = group2.project.alertLevel ?? 0;
                const alertConfig = ALERT_LEVEL_CONFIG[alertLevel];
                return /* @__PURE__ */ React4.createElement(
                  "button",
                  {
                    type: "button",
                    "data-testid": `project-alert-badge-${group2.project.id}`,
                    "data-alert-level": alertLevel,
                    onClick: () => useRightSidebarInspector ? handleSelectProject(group2.project) : setInspectingProject(group2.project),
                    className: `inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 border cursor-pointer hover:opacity-85 transition ${alertConfig.className}`,
                    title: `${alertConfig.title} (clic para configurar)`,
                    "aria-label": alertConfig.title
                  },
                  /* @__PURE__ */ React4.createElement("span", { className: `w-1.5 h-1.5 rounded-full shrink-0 ${alertConfig.dotColor}` }),
                  /* @__PURE__ */ React4.createElement("span", null, alertConfig.label)
                );
              })(),
              /* @__PURE__ */ React4.createElement(
                "div",
                {
                  className: `inline-grid items-center transition-all duration-150 ${isProjectNameExpanded ? "relative z-50 shrink-0 bg-white dark:bg-zinc-900 shadow-md ring-1 ring-[#0C0C09]/15 dark:ring-zinc-700 rounded-[3px]" : "min-w-0 shrink max-w-full"}`,
                  "data-testid": `project-name-container-${group2.project.id}`,
                  "data-name-truncated": group2.project.name && group2.project.name.length > effectiveTruncateLimit,
                  "data-name-expanded": isProjectNameExpanded,
                  onMouseEnter: () => setHoveredNameId(group2.project.id),
                  onMouseLeave: () => setHoveredNameId((prev) => prev === group2.project.id ? null : prev)
                },
                /* @__PURE__ */ React4.createElement(
                  "span",
                  {
                    "aria-hidden": "true",
                    className: `invisible col-start-1 row-start-1 font-bold text-xs px-1.5 py-0.5 pointer-events-none select-none ${isProjectNameExpanded ? "whitespace-pre" : "truncate"}`
                  },
                  displayProjectName
                ),
                /* @__PURE__ */ React4.createElement(
                  "input",
                  {
                    type: "text",
                    value: displayProjectName,
                    onFocus: () => setFocusedProjectInputId(group2.project.id),
                    onChange: (e) => guardedUpdateProject(
                      {
                        ...group2.project,
                        name: e.target.value
                      },
                      "renombrar proyecto bloqueado"
                    ),
                    onBlur: (e) => {
                      setFocusedProjectInputId(null);
                      if (group2.project.locked) return;
                      const trimmed = e.target.value.trim();
                      if (!trimmed) {
                        guardedUpdateProject(
                          {
                            ...group2.project,
                            name: `Proyecto ${group2.projectIndex}`
                          },
                          "renombrar proyecto bloqueado"
                        );
                      } else if (trimmed !== group2.project.name) {
                        guardedUpdateProject(
                          {
                            ...group2.project,
                            name: trimmed
                          },
                          "renombrar proyecto bloqueado"
                        );
                      }
                    },
                    className: `col-start-1 row-start-1 w-full min-w-[24px] bg-transparent font-bold text-[#0C0C09] dark:text-white focus:bg-white dark:focus:bg-zinc-800 px-1.5 py-0.5 rounded-[2px] outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${draggingRowId ? "pointer-events-none" : ""}`,
                    title: "Haz clic para renombrar este proyecto",
                    "data-project-name-input": group2.project.id
                  }
                )
              ),
              group2.project.locked && /* @__PURE__ */ React4.createElement(
                "span",
                {
                  "data-project-locked": "true",
                  title: "Proyecto bloqueado en el cronograma (clic derecho para desbloquear)",
                  className: "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[3px] text-[9px] font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 shrink-0"
                },
                /* @__PURE__ */ React4.createElement(Lock2, { className: "w-2.5 h-2.5 shrink-0" })
              ),
              /* @__PURE__ */ React4.createElement(
                "span",
                {
                  className: `px-1.5 py-0.5 rounded-full text-[10px] font-mono border shrink-0 ${projTheme.groupBadgeBg}`,
                  title: `${group2.tasksCount} tarea(s) y ${group2.milestonesCount} hito(s)`
                },
                group2.items.length,
                " \xEDtems"
              ),
              group2.items.length === 0 && /* @__PURE__ */ React4.createElement(
                "button",
                {
                  type: "button",
                  "data-testid": `project-header-add-task-btn-${group2.project.id}`,
                  onClick: (e) => {
                    e.stopPropagation();
                    guardedQuickAdd("task", group2.project.id);
                  },
                  className: "px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer flex items-center gap-0.5 shrink-0",
                  title: "A\xF1adir primera tarea a este proyecto"
                },
                /* @__PURE__ */ React4.createElement(Plus2, { className: "w-3 h-3" }),
                /* @__PURE__ */ React4.createElement("span", null, "Tarea")
              )
            ),
            /* @__PURE__ */ React4.createElement("div", { className: "flex items-center shrink-0" }, visibleColumns.dates && /* @__PURE__ */ React4.createElement("div", { className: "w-44 shrink-0 text-center font-mono text-[10px] text-slate-600 dark:text-zinc-400" }, group2.items.length > 0 ? `${formatDateDisplay(group2.startDate, "dd/MM")} \u2192 ${formatDateDisplay(group2.endDate, "dd/MM")}` : "\u2014"), visibleColumns.dur && /* @__PURE__ */ React4.createElement("div", { className: "w-16 shrink-0 text-center" }, /* @__PURE__ */ React4.createElement("span", { className: "px-1.5 py-0.5 rounded bg-white/80 dark:bg-zinc-800 font-mono text-[10px] font-bold text-slate-800 dark:text-zinc-200 border border-slate-200/70 dark:border-zinc-700" }, group2.duration, "d")), visibleColumns.slack && /* @__PURE__ */ React4.createElement(
              "div",
              {
                className: "w-14 shrink-0 text-center font-mono text-[10px] text-amber-600 dark:text-amber-400 font-semibold",
                title: `Holgura acumulada del proyecto: +${group2.totalFreeSlack ?? group2.totalSlack}d`
              },
              "+",
              group2.totalFreeSlack ?? group2.totalSlack,
              "d"
            ), visibleColumns.deps && /* @__PURE__ */ React4.createElement("div", { className: "w-20 shrink-0 text-slate-400 text-center text-[10px]" }, "\u2014"), /* @__PURE__ */ React4.createElement("div", { className: "w-28 shrink-0 flex items-center justify-end gap-1.5 pr-2" }, /* @__PURE__ */ React4.createElement("span", { className: "font-mono text-[10px] font-bold text-slate-500 dark:text-zinc-400" }, group2.progress, "%"), /* @__PURE__ */ React4.createElement(
              "button",
              {
                type: "button",
                "data-testid": `project-context-menu-btn-${group2.project.id}`,
                onClick: (e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setContextMenu({
                    type: "project",
                    id: group2.project.id,
                    x: rect.right - 220,
                    y: rect.bottom + 4
                  });
                },
                className: "p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-[#0C0C09] dark:hover:text-white transition cursor-pointer opacity-70 group-hover:opacity-100",
                title: "Acciones del proyecto (o clic derecho en la fila)"
              },
              /* @__PURE__ */ React4.createElement(MoreHorizontal, { className: "w-3.5 h-3.5" })
            )))
          );
        }
        if (row.kind === "empty-project") {
          const { group: group2 } = row;
          const targetRel = releases?.find((r) => r.id === group2.project.releaseId);
          const projAccent2 = getProjectAccent(group2.project.color);
          return /* @__PURE__ */ React4.createElement(
            "div",
            {
              key: row.rowId,
              "data-empty-project-row": group2.project.id,
              "data-project-child-band": group2.project.id,
              style: {
                top: rowIndex * ROW_HEIGHT,
                height: ROW_HEIGHT,
                minWidth: tableMinWidth,
                boxShadow: `inset 3px 0 0 rgba(${projAccent2.rgb}, 0.65)`,
                backgroundColor: `rgba(${projAccent2.rgb}, 0.045)`,
                ...showRowSeparators ? { borderBottom: `2px solid rgba(${projAccent2.rgb}, 0.55)` } : {},
                ...rowShiftStyle
              },
              className: `absolute left-0 right-0 flex items-center justify-start px-3 text-xs ${rowShiftClass} ${rowExpandClass} ${showRowSeparators ? "border-b border-[#E2E2DC] dark:border-zinc-800/60" : "border-b-0"}`
            },
            /* @__PURE__ */ React4.createElement("div", { className: "h-full flex items-center gap-1.5 pl-2 pr-3" }, /* @__PURE__ */ React4.createElement(
              "div",
              {
                "data-testid": `project-tree-rail-footer-${group2.project.id}`,
                "aria-hidden": "true",
                className: "relative self-stretch w-5 shrink-0"
              },
              /* @__PURE__ */ React4.createElement(
                "span",
                {
                  className: "absolute top-0 h-1/2 left-2 w-[2px]",
                  style: { backgroundColor: `rgba(${projAccent2.rgb}, 0.45)` }
                }
              ),
              /* @__PURE__ */ React4.createElement(
                "span",
                {
                  className: "absolute top-1/2 left-2 w-2.5 h-[2px]",
                  style: { backgroundColor: `rgba(${projAccent2.rgb}, 0.45)` }
                }
              )
            ), /* @__PURE__ */ React4.createElement(
              "button",
              {
                type: "button",
                "data-testid": `project-empty-add-task-btn-${group2.project.id}`,
                onClick: () => guardedCreateTaskDirect(group2.project.id),
                style: { color: projAccent2.hex },
                className: "px-2 py-1 text-[11px] font-semibold rounded hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer flex items-center gap-1",
                title: targetRel ? `Crear nueva tarea en ${group2.project.name} (Release ${targetRel.code})` : `Crear primera tarea en ${group2.project.name}`
              },
              /* @__PURE__ */ React4.createElement(Plus2, { className: "w-3.5 h-3.5" }),
              /* @__PURE__ */ React4.createElement("span", null, "Nueva Tarea")
            ))
          );
        }
        if (row.kind === "add-task") {
          const { group: group2 } = row;
          const targetRel = releases?.find((r) => r.id === group2.project.releaseId);
          const projAccent2 = getProjectAccent(group2.project.color);
          return /* @__PURE__ */ React4.createElement(
            "div",
            {
              key: row.rowId,
              "data-add-task-row": group2.project.id,
              "data-project-child-band": group2.project.id,
              style: {
                top: rowIndex * ROW_HEIGHT,
                height: ROW_HEIGHT,
                minWidth: tableMinWidth,
                boxShadow: `inset 3px 0 0 rgba(${projAccent2.rgb}, 0.65)`,
                backgroundColor: `rgba(${projAccent2.rgb}, 0.045)`,
                ...showRowSeparators ? { borderBottom: `2px solid rgba(${projAccent2.rgb}, 0.55)` } : {},
                ...rowShiftStyle
              },
              className: `absolute left-0 right-0 flex items-center justify-start px-3 text-xs ${rowShiftClass} ${rowExpandClass} ${showRowSeparators ? "border-b border-[#E2E2DC] dark:border-zinc-800/60" : "border-b-0"}`
            },
            /* @__PURE__ */ React4.createElement("div", { className: "h-full flex items-center gap-1.5 pl-2 pr-3 shrink-0" }, /* @__PURE__ */ React4.createElement(
              "div",
              {
                "data-testid": `project-tree-rail-footer-${group2.project.id}`,
                "aria-hidden": "true",
                className: "relative self-stretch w-5 shrink-0"
              },
              /* @__PURE__ */ React4.createElement(
                "span",
                {
                  className: "absolute top-0 h-1/2 left-2 w-[2px]",
                  style: { backgroundColor: `rgba(${projAccent2.rgb}, 0.45)` }
                }
              ),
              /* @__PURE__ */ React4.createElement(
                "span",
                {
                  className: "absolute top-1/2 left-2 w-2.5 h-[2px]",
                  style: { backgroundColor: `rgba(${projAccent2.rgb}, 0.45)` }
                }
              )
            ), /* @__PURE__ */ React4.createElement(
              "button",
              {
                type: "button",
                "data-testid": `project-footer-add-task-btn-${group2.project.id}`,
                onClick: () => group2.project.id === EXTERNAL_MILESTONES_GROUP_ID ? onQuickAdd("milestone") : guardedCreateTaskDirect(group2.project.id),
                style: { color: projAccent2.hex },
                className: "px-2 py-1 text-[11px] font-semibold rounded hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer flex items-center gap-1",
                title: group2.project.id === EXTERNAL_MILESTONES_GROUP_ID ? "Crear nuevo hito externo independiente" : targetRel ? `Crear nueva tarea en ${group2.project.name} (Release ${targetRel.code})` : `Crear nueva tarea al final de ${group2.project.name}`
              },
              /* @__PURE__ */ React4.createElement(Plus2, { className: "w-3.5 h-3.5" }),
              /* @__PURE__ */ React4.createElement("span", null, group2.project.id === EXTERNAL_MILESTONES_GROUP_ID ? "Nuevo Hito Externo" : "Nueva Tarea")
            ))
          );
        }
        if (row.kind === "add-project") {
          const { group: rGroup } = row;
          return /* @__PURE__ */ React4.createElement(
            "div",
            {
              key: row.rowId,
              "data-add-project-row": rGroup.release.id,
              style: { top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT, minWidth: tableMinWidth },
              className: `absolute left-0 right-0 flex items-center justify-start px-3 text-xs bg-indigo-50/20 dark:bg-zinc-900/40 ${rowShiftClass} ${rowExpandClass} ${showRowSeparators ? "border-b border-[#E2E2DC] dark:border-zinc-800/60" : "border-b-0"} pl-6`
            },
            /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-2 pr-3 shrink-0" }, /* @__PURE__ */ React4.createElement(
              "button",
              {
                type: "button",
                "data-testid": `release-add-project-btn-${rGroup.release.id}`,
                onClick: () => onCreateProject?.({
                  id: `proj-${Date.now()}`,
                  name: "Nuevo Proyecto",
                  color: "indigo",
                  releaseId: rGroup.release.id,
                  collapsed: false,
                  isDemo: false
                }),
                className: "px-2 py-1 text-[11px] font-semibold rounded text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/50 transition cursor-pointer flex items-center gap-1",
                title: `Crear nuevo proyecto en ${rGroup.release.code}`
              },
              /* @__PURE__ */ React4.createElement(Plus2, { className: "w-3.5 h-3.5" }),
              /* @__PURE__ */ React4.createElement("span", null, "Nuevo Proyecto")
            ))
          );
        }
        const { item, group } = row;
        const itemEffectiveColor = getItemEffectiveColor(item);
        const isHovered = hoveredId === item.id;
        const isCrit = showCriticalPath && item.isCritical;
        const itemIndexInGroup = group.items.findIndex((x) => x.id === item.id);
        const isFirstInGroup = groupByProject ? itemIndexInGroup === 0 : rowIndex === 0;
        const isLastInGroup = groupByProject ? itemIndexInGroup === group.items.length - 1 : rowIndex === displayRows.length - 1;
        const isBeingDragged = draggingRowId === item.id || Boolean(draggingMultiRowIds?.has(item.id));
        const isDropBefore = dragOverRow?.id === item.id && dragOverRow.position === "before";
        const isDropAfter = dragOverRow?.id === item.id && dragOverRow.position === "after";
        const effectiveReleaseId = item.releaseId || group.project.releaseId;
        const itemRelease = effectiveReleaseId ? releases?.find((r) => r.id === effectiveReleaseId) : void 0;
        const releaseViolations = itemRelease ? checkTaskReleaseCompliance(item, group.project, itemRelease) : [];
        const isRowSelected = effectiveSelectedItemId === item.id;
        const isMultiSelectedItem = effectiveMultiItemIds.has(item.id);
        const projAccent = getProjectAccent(group.project.color);
        const nextDisplayRow = displayRows[rowIndex + 1];
        const isLastRowInProject = groupByProject && !(nextDisplayRow && (nextDisplayRow.kind === "item" || nextDisplayRow.kind === "add-task" || nextDisplayRow.kind === "empty-project") && nextDisplayRow.group.project.id === group.project.id);
        const hasItemStateBg = isDropBefore || isDropAfter || isBeingDragged || isRowSelected || isMultiSelectedItem || item.hidden || isHovered || isCrit;
        return /* @__PURE__ */ React4.createElement(
          "div",
          {
            key: row.rowId,
            "data-task-row": item.id,
            "data-selected-task-row": isRowSelected ? "true" : void 0,
            "data-multi-selected": isMultiSelectedItem ? "true" : "false",
            "data-project-child-band": groupByProject ? group.project.id : void 0,
            draggable: true,
            style: {
              top: rowIndex * ROW_HEIGHT,
              height: ROW_HEIGHT,
              minWidth: tableMinWidth,
              ...groupByProject ? {
                boxShadow: `inset 3px 0 0 rgba(${projAccent.rgb}, 0.65)`,
                ...!hasItemStateBg ? { backgroundColor: `rgba(${projAccent.rgb}, 0.045)` } : {},
                ...isLastRowInProject && showRowSeparators && !isDropAfter ? { borderBottom: `2px solid rgba(${projAccent.rgb}, 0.55)` } : {}
              } : {},
              ...rowShiftStyle
            },
            onClick: (e) => handleSelectTaskFromTable(item, e),
            onMouseEnter: () => setHoveredId(item.id),
            onMouseLeave: () => setHoveredId(null),
            onMouseDown: (e) => handleRowPointerMouseDown(e, item.id, false),
            onContextMenu: (e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({
                type: "task",
                id: item.id,
                x: e.clientX,
                y: e.clientY
              });
            },
            onDragStart: (e) => handleDragRowStart(e, item.id),
            onDragEnd: handleDragRowEnd,
            onDragOver: (e) => handleDragRowOver(e, item.id),
            onDragLeave: handleDragRowLeave,
            onDrop: (e) => handleDropRow(e, item.id),
            className: `absolute left-0 right-0 group flex items-center justify-start px-3 text-xs ${rowShiftClass} ${rowExpandClass} ${showRowSeparators ? "border-b border-[#E2E2DC] dark:border-zinc-800" : "border-b-0"} ${isDropBefore ? "border-t-2 border-t-indigo-600 dark:border-t-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30" : isDropAfter ? "border-b-2 border-b-indigo-600 dark:border-b-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30" : ""} ${isBeingDragged ? "opacity-35 border-dashed border-indigo-400 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20" : ""} ${isRowSelected ? item.hasConflict ? "ring-2 ring-inset ring-rose-500 bg-rose-50/70 dark:bg-rose-950/30 text-[#0C0C09] dark:text-zinc-100" : "ring-2 ring-inset ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-[#0C0C09] dark:text-zinc-100" : isMultiSelectedItem ? "ring-1 ring-inset ring-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-[#0C0C09] dark:text-zinc-100" : item.hidden ? "opacity-60 bg-zinc-50/70 dark:bg-zinc-900/30" : isHovered ? "bg-[#F4F4F1] dark:bg-zinc-900/60" : isCrit ? "bg-[#DC2626]/5 dark:rose-950/10" : "bg-white dark:bg-[#0C0C09] hover:bg-[#F4F4F1] dark:hover:bg-zinc-900/40 text-[#0C0C09] dark:text-zinc-100"}`
          },
          /* @__PURE__ */ React4.createElement(
            "div",
            {
              style: { width: nameColumnWidth },
              className: `h-full flex items-center gap-1.5 pr-2 shrink-0 ${groupByProject ? "pl-2" : ""} ${focusedTaskInputId === item.id || hoveredNameId === item.id ? "" : "overflow-hidden"}`
            },
            groupByProject && /* @__PURE__ */ React4.createElement(
              "div",
              {
                "data-testid": `project-tree-rail-${item.id}`,
                "aria-hidden": "true",
                className: "relative self-stretch w-5 shrink-0"
              },
              /* @__PURE__ */ React4.createElement(
                "span",
                {
                  className: `absolute top-0 ${isLastRowInProject ? "h-1/2" : "bottom-0"} left-2 w-[2px]`,
                  style: { backgroundColor: `rgba(${projAccent.rgb}, 0.45)` }
                }
              ),
              /* @__PURE__ */ React4.createElement(
                "span",
                {
                  className: "absolute top-1/2 left-2 w-2.5 h-[2px]",
                  style: { backgroundColor: `rgba(${projAccent.rgb}, 0.45)` }
                }
              )
            ),
            isMultiSelectedItem && /* @__PURE__ */ React4.createElement(
              "button",
              {
                type: "button",
                "data-testid": `multi-select-item-${item.id}`,
                onClick: (e) => {
                  e.stopPropagation();
                  toggleMultiSelectItem(item.id, e.shiftKey);
                },
                title: "Quitar de la selecci\xF3n m\xFAltiple",
                "aria-label": `Quitar selecci\xF3n de ${item.name}`,
                className: "w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center shrink-0 transition cursor-pointer bg-indigo-600 border-indigo-600 text-white"
              },
              /* @__PURE__ */ React4.createElement(Check2, { className: "w-2.5 h-2.5 stroke-[3]" })
            ),
            /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-0.5 shrink-0" }, /* @__PURE__ */ React4.createElement(
              "span",
              {
                draggable: true,
                onMouseDown: (e) => handleRowPointerMouseDown(e, item.id, true),
                onDragStart: (e) => handleDragRowStart(e, item.id),
                onDragEnd: handleDragRowEnd,
                style: { WebkitUserDrag: "element" },
                className: "cursor-grab active:cursor-grabbing p-1 text-[#6B6B66] dark:text-zinc-500 hover:text-[#0C0C09] dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-[2px]",
                title: "Arrastra para reordenar la posici\xF3n de la tarea",
                "data-row-drag-handle": item.id
              },
              /* @__PURE__ */ React4.createElement(GripVertical, { className: "w-3.5 h-3.5" })
            )),
            (() => {
              const taskDisplayId = item.displayId || (groupByProject && group.projectIndex ? `P${group.projectIndex}T${item.taskIndex || item.wbs}` : `T${item.taskIndex || item.wbs}`);
              const badgeBg = COLOR_STYLES[itemEffectiveColor]?.badge || "bg-indigo-500";
              return /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-1 shrink-0" }, /* @__PURE__ */ React4.createElement(
                "span",
                {
                  "data-testid": `task-id-badge-${item.id}`,
                  className: `px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white shrink-0 inline-flex items-center gap-1 ${badgeBg}`,
                  title: `ID ${taskDisplayId} \xB7 WBS ${item.wbsCode || item.wbs}`
                },
                item.type === "milestone" && /* @__PURE__ */ React4.createElement(Diamond, { className: "w-2.5 h-2.5 fill-current shrink-0" }),
                /* @__PURE__ */ React4.createElement("span", null, taskDisplayId)
              ), item.type === "milestone" && item.isExternal && /* @__PURE__ */ React4.createElement(
                "span",
                {
                  "data-testid": `milestone-external-badge-${item.id}`,
                  title: "Hito externo (no pertenece a la release)",
                  className: "px-1 py-0.2 rounded text-[8.5px] font-mono font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shrink-0"
                },
                "EXT"
              ));
            })(),
            (item.alertLevel ?? 0) > 0 && (() => {
              const taskAlert = item.alertLevel ?? 0;
              const alertCfg = ALERT_LEVEL_CONFIG[taskAlert];
              return /* @__PURE__ */ React4.createElement(
                "button",
                {
                  type: "button",
                  "data-testid": `task-alert-badge-${item.id}`,
                  "data-alert-level": taskAlert,
                  onClick: (e) => {
                    e.stopPropagation();
                    setSelectedDepLink(null);
                    setSelectedDiagramProjectId(null);
                    setSelectedDiagramReleaseId(null);
                    setSelectedItemId(item.id);
                    onSelectEntity?.({ type: "task", id: item.id, name: item.name });
                  },
                  className: `inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 border cursor-pointer hover:opacity-85 transition ${alertCfg.className}`,
                  title: `${alertCfg.title} (clic para ver detalles)`,
                  "aria-label": alertCfg.title
                },
                /* @__PURE__ */ React4.createElement("span", { className: `w-1.5 h-1.5 rounded-full shrink-0 ${alertCfg.dotColor}` }),
                /* @__PURE__ */ React4.createElement("span", null, alertCfg.label)
              );
            })(),
            (() => {
              const isTaskNameExpanded = focusedTaskInputId === item.id || hoveredNameId === item.id;
              const displayTaskName = isTaskNameExpanded || !item.name || item.name.length <= effectiveTruncateLimit ? item.name || "Tarea" : item.name.slice(0, effectiveTruncateLimit) + "\u2026";
              return /* @__PURE__ */ React4.createElement(React4.Fragment, { key: "task-name-block" }, /* @__PURE__ */ React4.createElement(
                "div",
                {
                  className: `inline-grid items-center transition-all duration-150 ${isTaskNameExpanded ? "relative z-50 bg-white dark:bg-zinc-900 shadow-md ring-1 ring-[#0C0C09]/15 dark:ring-zinc-700 rounded-[3px] shrink-0" : "min-w-0 shrink max-w-full"}`,
                  "data-testid": `task-name-container-${item.id}`,
                  "data-name-truncated": item.name && item.name.length > effectiveTruncateLimit,
                  "data-name-expanded": isTaskNameExpanded,
                  onMouseEnter: () => setHoveredNameId(item.id),
                  onMouseLeave: () => setHoveredNameId((prev) => prev === item.id ? null : prev)
                },
                /* @__PURE__ */ React4.createElement(
                  "span",
                  {
                    "aria-hidden": "true",
                    className: `invisible col-start-1 row-start-1 font-medium text-xs px-1.5 py-0.5 pointer-events-none select-none ${isTaskNameExpanded ? "whitespace-pre" : "truncate"}`
                  },
                  displayTaskName
                ),
                /* @__PURE__ */ React4.createElement(
                  "input",
                  {
                    type: "text",
                    value: displayTaskName,
                    onFocus: () => setFocusedTaskInputId(item.id),
                    onChange: (e) => guardedUpdateItem({ ...item, name: e.target.value }, false),
                    onBlur: (e) => {
                      setFocusedTaskInputId(null);
                      if (group.project.locked) return;
                      const trimmed = e.target.value.trim();
                      if (!trimmed) {
                        guardedUpdateItem(
                          {
                            ...item,
                            name: item.type === "milestone" ? "Nuevo Hito" : "Nueva Tarea"
                          },
                          false
                        );
                      } else if (trimmed !== item.name || isReleaseAssociatedTask({ name: trimmed, assignee: item.assignee })) {
                        if (isReleaseAssociatedTask({ name: trimmed, assignee: item.assignee })) {
                          const targetRelId = item.releaseId || group.project.releaseId || releases?.[0]?.id;
                          const targetRelObj = targetRelId ? releases?.find((r) => r.id === targetRelId) : void 0;
                          const span = targetRelObj ? getReleaseDateSpan(targetRelObj) : null;
                          guardedUpdateItem(
                            {
                              ...item,
                              name: trimmed,
                              releaseId: targetRelId || item.releaseId,
                              ...span ? {
                                startDate: span.startDate,
                                endDate: span.endDate,
                                duration: Math.max(1, span.duration)
                              } : {}
                            },
                            false
                          );
                        } else {
                          guardedUpdateItem({ ...item, name: trimmed }, false);
                        }
                      }
                    },
                    className: `col-start-1 row-start-1 w-full min-w-[24px] bg-transparent text-xs font-medium text-[#0C0C09] dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 px-1.5 py-0.5 rounded-[2px] outline-none focus:ring-1 focus:ring-[#0C0C09] ${draggingRowId ? "pointer-events-none" : ""}`,
                    title: `${item.name} (${group.project.name})`,
                    "data-task-name-input": item.id
                  }
                )
              ));
            })(),
            item.hidden && /* @__PURE__ */ React4.createElement(
              "span",
              {
                "data-testid": `task-hidden-badge-${item.id}`,
                title: "Oculta del diagrama de cronograma",
                className: "px-1 py-0.5 rounded-[2px] bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[9px] font-mono shrink-0 border border-zinc-300 dark:border-zinc-700"
              },
              "Oculta"
            ),
            itemRelease && (Boolean(item.releaseId) || isReleaseAssociatedTask(item)) && /* @__PURE__ */ React4.createElement(
              "span",
              {
                "data-testid": `task-release-badge-${item.id}`,
                title: `Release asociada: ${itemRelease.code}`,
                className: "px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-semibold shrink-0 border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
              },
              itemRelease.code
            ),
            (() => {
              const taskPlatform = normalizePlatform(item.platform);
              if (!taskPlatform) return null;
              return /* @__PURE__ */ React4.createElement(
                "span",
                {
                  "data-testid": `task-platform-badge-${item.id}`,
                  title: `Plataforma espec\xEDfica de tarea: ${taskPlatform}`,
                  className: `px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-semibold shrink-0 border ${taskPlatform === "iOS" ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700" : taskPlatform === "Android" ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700" : "bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700"}`
                },
                taskPlatform
              );
            })(),
            isCrit && /* @__PURE__ */ React4.createElement(
              "span",
              {
                title: "En Ruta Cr\xEDtica (Slack = 0)",
                className: "px-1 py-0.5 rounded-[2px] bg-[#DC2626]/10 text-[#DC2626] text-[9px] font-mono font-bold shrink-0 border border-[#DC2626]/20"
              },
              "CR\xCDT"
            ),
            item.hasConflict && /* @__PURE__ */ React4.createElement(
              "span",
              {
                title: item.conflictMessage,
                className: "text-[#DC2626] shrink-0"
              },
              /* @__PURE__ */ React4.createElement(AlertTriangle2, { className: "w-3.5 h-3.5" })
            ),
            releaseViolations.length > 0 && /* @__PURE__ */ React4.createElement(
              "span",
              {
                "data-testid": `task-release-violation-${item.id}`,
                title: `Excede hito de ${itemRelease?.code}: ${releaseViolations.map((v) => `${v.milestoneCode} (+${v.daysLate}d)`).join(", ")}`,
                className: "px-1.5 py-0.5 rounded-[2px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[9px] font-mono font-bold flex items-center gap-1 shrink-0"
              },
              /* @__PURE__ */ React4.createElement(AlertTriangle2, { className: "w-2.5 h-2.5 text-amber-600" }),
              /* @__PURE__ */ React4.createElement("span", null, "+", releaseViolations[0].daysLate, "d ", releaseViolations[0].milestoneCode)
            ),
            visibleColumns.team && (item.assignee ? /* @__PURE__ */ React4.createElement(
              "span",
              {
                "data-assignee-badge": item.assignee,
                className: `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-medium truncate max-w-[120px] shrink-0 border ${(TEAM_BADGE_STYLES[itemEffectiveColor] || TEAM_BADGE_STYLES.indigo).container}`,
                title: `Equipo / Responsable: ${item.assignee}`
              },
              /* @__PURE__ */ React4.createElement(
                "span",
                {
                  className: `w-1.5 h-1.5 rounded-full shrink-0 ${(TEAM_BADGE_STYLES[itemEffectiveColor] || TEAM_BADGE_STYLES.indigo).dot}`
                }
              ),
              /* @__PURE__ */ React4.createElement("span", { className: "truncate" }, item.assignee)
            ) : /* @__PURE__ */ React4.createElement(
              "span",
              {
                "data-assignee-badge": "Sin asignar",
                className: "px-1.5 py-0.5 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09]/60 dark:text-zinc-400 text-[10px] font-mono shrink-0 border border-[#E2E2DC] dark:border-zinc-700",
                title: "Sin asignar"
              },
              "\u2014"
            ))
          ),
          /* @__PURE__ */ React4.createElement("div", { className: `flex items-center shrink-0 ${draggingRowId ? "pointer-events-none" : ""}` }, visibleColumns.dates && /* @__PURE__ */ React4.createElement("div", { className: "w-44 shrink-0 flex items-center justify-center gap-1 font-mono text-[10px]" }, /* @__PURE__ */ React4.createElement(
            "input",
            {
              type: "date",
              value: item.startDate,
              onChange: (e) => {
                const newStart = e.target.value;
                if (!newStart) return;
                const newEnd = item.type === "milestone" ? newStart : calculateEndDateFromDuration(
                  newStart,
                  item.duration,
                  "task"
                );
                guardedUpdateItem(
                  { ...item, startDate: newStart, endDate: newEnd },
                  autoCascade
                );
              },
              className: "w-[82px] px-1 py-0.5 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border border-[#E2E2DC] dark:border-zinc-700 text-[10px] font-mono outline-none focus:ring-1 focus:ring-[#0C0C09] cursor-pointer",
              title: "Fecha de inicio (haz clic para editar)"
            }
          ), /* @__PURE__ */ React4.createElement("span", { className: "text-[#6B6B66] text-[9px]" }, "\u2192"), /* @__PURE__ */ React4.createElement(
            "input",
            {
              type: "date",
              disabled: item.type === "milestone",
              value: item.endDate,
              onChange: (e) => {
                const newEnd = e.target.value;
                if (!newEnd) return;
                const newDur = Math.max(
                  1,
                  calculateDurationFromDates(item.startDate, newEnd, "task")
                );
                guardedUpdateItem(
                  { ...item, endDate: newEnd, duration: newDur },
                  autoCascade
                );
              },
              className: `w-[82px] px-1 py-0.5 rounded-[2px] text-[10px] font-mono outline-none focus:ring-1 focus:ring-[#0C0C09] ${item.type === "milestone" ? "opacity-40 cursor-not-allowed bg-transparent" : "bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border border-[#E2E2DC] dark:border-zinc-700 cursor-pointer"}`,
              title: item.type === "milestone" ? "Hito (fecha \xFAnica)" : "Fecha de fin (haz clic para editar)"
            }
          )), visibleColumns.dur && /* @__PURE__ */ React4.createElement("div", { className: "w-16 shrink-0 flex items-center justify-center" }, item.type === "milestone" ? /* @__PURE__ */ React4.createElement("span", { className: "font-mono text-[10px] text-[#6B6B66]" }, "0d") : /* @__PURE__ */ React4.createElement(
            "input",
            {
              type: "number",
              min: 1,
              max: 365,
              value: item.duration,
              onChange: (e) => {
                const dur = Math.max(1, parseInt(e.target.value, 10) || 1);
                const newEnd = calculateEndDateFromDuration(
                  item.startDate,
                  dur,
                  "task"
                );
                guardedUpdateItem(
                  { ...item, duration: dur, endDate: newEnd },
                  autoCascade
                );
              },
              className: "w-11 px-1 py-0.5 text-center font-mono text-[10px] rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border border-[#E2E2DC] dark:border-zinc-700 outline-none focus:ring-1 focus:ring-[#0C0C09]",
              title: "Duraci\xF3n en d\xEDas (haz clic para editar)"
            }
          )), visibleColumns.slack && /* @__PURE__ */ React4.createElement("div", { className: "w-14 shrink-0 flex items-center justify-center font-mono text-[10px]" }, item.type === "milestone" ? /* @__PURE__ */ React4.createElement("span", { className: "text-[#6B6B66] dark:text-zinc-500" }, "\u2014") : /* @__PURE__ */ React4.createElement(
            "button",
            {
              type: "button",
              "data-testid": `task-slack-badge-${item.id}`,
              onClick: () => guardedEditModal(item),
              title: item.hasSuccessors ? `Holgura libre autom\xE1tica: ${item.freeSlack >= 0 ? `+${item.freeSlack}` : item.freeSlack}d
Limitada por siguiente tarea: ${item.drivingSuccessorName ? `\xAB${item.drivingSuccessorName}\xBB` : `#${item.drivingSuccessorId}`}
Tareas siguientes directas (${item.successorIds.length}): ${item.successorIds.join(", ")}
(Clic para abrir detalles o editar buffer)` : `Sin tareas siguientes directas.
Holgura hasta fin de proyecto: +${item.freeSlack}d
(Clic para abrir detalles o editar buffer)`,
              className: `w-11 px-1 py-0.5 rounded-[2px] font-mono text-[10px] transition cursor-pointer flex items-center justify-center gap-0.5 select-none ${item.freeSlack < 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800" : item.freeSlack === 0 ? item.isCritical ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900/50" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 font-medium border border-zinc-200 dark:border-zinc-700" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/50"}`
            },
            /* @__PURE__ */ React4.createElement("span", null, item.freeSlack > 0 ? `+${item.freeSlack}d` : `${item.freeSlack}d`),
            !item.hasSuccessors && /* @__PURE__ */ React4.createElement(
              "span",
              {
                className: "text-[8px] opacity-60 leading-none",
                title: "Sin tareas siguientes directas (hasta fin proyecto)"
              },
              "*"
            )
          )), visibleColumns.deps && /* @__PURE__ */ React4.createElement("div", { className: "w-20 shrink-0 text-center font-mono text-[10px]" }, /* @__PURE__ */ React4.createElement(
            "span",
            {
              className: "text-[#0C0C09] dark:text-zinc-300 font-mono text-[10px] truncate block px-1 font-semibold",
              title: `Dependencias: ${item.dependencies.length > 0 ? item.dependencies.map((d) => `#${d}`).join(", ") : "Ninguna"}`
            },
            item.dependencies.length > 0 ? item.dependencies.map((depId) => {
              const found = enrichedItemById.get(depId);
              if (!found) return "";
              return groupByProject ? `#${found.wbsCode || found.wbs}` : `#${found.wbs}`;
            }).filter(Boolean).join(",") : "\u2014"
          )), /* @__PURE__ */ React4.createElement("div", { className: "w-28 shrink-0 flex items-center justify-end gap-1 pr-2" }, /* @__PURE__ */ React4.createElement(
            "button",
            {
              type: "button",
              "data-testid": `task-context-menu-btn-${item.id}`,
              onClick: (e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setContextMenu({
                  type: "task",
                  id: item.id,
                  x: rect.right - 220,
                  y: rect.bottom + 4
                });
              },
              className: "p-1 rounded-[2px] hover:bg-black/5 dark:hover:bg-white/10 text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-white transition cursor-pointer opacity-70 group-hover:opacity-100",
              title: "Acciones del \xEDtem (o clic derecho en la fila)"
            },
            /* @__PURE__ */ React4.createElement(MoreHorizontal, { className: "w-3.5 h-3.5" })
          )))
        );
      })
    ), /* @__PURE__ */ React4.createElement(
      "div",
      {
        ref: newProjectFormRef,
        style: { minHeight: 48, minWidth: tableMinWidth },
        className: "flex items-center gap-2 px-3 py-2 bg-slate-50/50 dark:bg-zinc-900/50 border-t border-slate-200/70 dark:border-zinc-800/70"
      },
      /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-quick-add-task-btn": "true",
          onClick: () => {
            if (onCreateUnassignedTask) {
              onCreateUnassignedTask();
            } else {
              const unassignedProj = projects.find((p) => !p.releaseId);
              guardedQuickAdd("task", unassignedProj?.id);
            }
          },
          className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer",
          title: "Crear nueva tarea sin release"
        },
        /* @__PURE__ */ React4.createElement(Plus2, { className: "w-3.5 h-3.5" }),
        /* @__PURE__ */ React4.createElement("span", null, "Nueva Tarea")
      ),
      /* @__PURE__ */ React4.createElement("div", { className: "w-px h-4 bg-slate-200 dark:bg-zinc-800" }),
      /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-quick-add-milestone-btn": "true",
          onClick: () => onQuickAdd("milestone"),
          className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer",
          title: "Crear nuevo hito externo (independiente de proyectos y releases)"
        },
        /* @__PURE__ */ React4.createElement(Plus2, { className: "w-3.5 h-3.5" }),
        /* @__PURE__ */ React4.createElement("span", null, "Nuevo Hito")
      ),
      /* @__PURE__ */ React4.createElement("div", { className: "w-px h-4 bg-slate-200 dark:bg-zinc-800" }),
      !isCreatingProject ? /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-create-project-btn": "true",
          onClick: () => {
            setIsCreatingProject(true);
            setNewProjectName("");
            setNewProjectColor("indigo");
            setNewProjectReleaseId("");
          },
          className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer",
          title: "Crear nuevo proyecto sin release"
        },
        /* @__PURE__ */ React4.createElement(Plus2, { className: "w-3.5 h-3.5" }),
        /* @__PURE__ */ React4.createElement("span", null, "Nuevo Proyecto")
      ) : /* @__PURE__ */ React4.createElement(
        "form",
        {
          onSubmit: (e) => {
            e.preventDefault();
            const trimmed = newProjectName.trim();
            if (!trimmed) return;
            onCreateProject?.({
              id: `proj-${Date.now()}`,
              name: trimmed,
              color: newProjectColor,
              releaseId: newProjectReleaseId || void 0,
              collapsed: false,
              isDemo: false
            });
            setIsCreatingProject(false);
            setNewProjectName("");
          },
          className: "flex flex-wrap items-center gap-2.5 w-full text-xs"
        },
        /* @__PURE__ */ React4.createElement(
          "input",
          {
            type: "text",
            autoFocus: true,
            value: newProjectName,
            onChange: (e) => setNewProjectName(e.target.value),
            onKeyDown: (e) => {
              if (e.key === "Escape") {
                setIsCreatingProject(false);
                setNewProjectName("");
              }
            },
            placeholder: "Nombre del nuevo proyecto...",
            className: "flex-1 min-w-[140px] px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:ring-1 focus:ring-indigo-500"
          }
        ),
        /* @__PURE__ */ React4.createElement(
          "select",
          {
            "data-testid": "create-project-release-select",
            value: newProjectReleaseId,
            onChange: (e) => setNewProjectReleaseId(e.target.value),
            className: "px-2 py-1 text-xs rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono",
            title: "Release asociada"
          },
          /* @__PURE__ */ React4.createElement("option", { value: "" }, "Sin release"),
          releases.map((rel) => /* @__PURE__ */ React4.createElement("option", { key: rel.id, value: rel.id }, rel.code, " (", rel.name, ")"))
        ),
        /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-1.5" }, PROJECT_COLORS.map((c) => /* @__PURE__ */ React4.createElement(
          "button",
          {
            key: c.value,
            type: "button",
            onClick: () => setNewProjectColor(c.value),
            className: `w-4 h-4 rounded-full ${c.bg} flex items-center justify-center transition-transform ${newProjectColor === c.value ? "ring-2 ring-offset-1 ring-indigo-600 scale-110" : "opacity-65 hover:opacity-100"}`,
            title: c.value
          },
          newProjectColor === c.value && /* @__PURE__ */ React4.createElement(Check2, { className: "w-2.5 h-2.5 text-white" })
        ))),
        /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React4.createElement(
          "button",
          {
            type: "submit",
            disabled: !newProjectName.trim(),
            className: "px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-xs transition"
          },
          "Crear"
        ), /* @__PURE__ */ React4.createElement(
          "button",
          {
            type: "button",
            onClick: () => {
              setIsCreatingProject(false);
              setNewProjectName("");
            },
            className: "px-2 py-1 text-xs rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition"
          },
          "Cancelar"
        ))
      )
    ))))
  ), /* @__PURE__ */ React4.createElement(
    "div",
    {
      onMouseDown: handleSplitMouseDown,
      className: "w-1 cursor-col-resize bg-[#0C0C09] dark:bg-zinc-700 hover:bg-[#312C85] dark:hover:bg-[#312C85] transition-colors flex items-center justify-center group shrink-0",
      title: "Arrastra para redimensionar la tabla"
    },
    /* @__PURE__ */ React4.createElement(GripHorizontal, { className: "w-3 h-3 text-white rotate-90" })
  )), /* @__PURE__ */ React4.createElement(
    "div",
    {
      ref: scrollContainerRef,
      onClick: () => {
        setSelectedItemId(null);
        setSelectedDiagramProjectId(null);
        setSelectedDiagramReleaseId(null);
        setSelectedDepLink(null);
        onSelectEntity?.(null);
      },
      onMouseMove: handleTimelineMouseMove,
      onMouseLeave: handleTimelineMouseLeave,
      className: "flex-1 overflow-x-auto overflow-y-hidden relative bg-white dark:bg-[#0C0C09] select-none"
    },
    /* @__PURE__ */ React4.createElement(
      "div",
      {
        ref: canvasRef,
        style: { width: totalCanvasWidth, minHeight: totalCanvasHeight },
        className: "relative"
      },
      cursorScrubber && (() => {
        const halfBadge = 56;
        let badgeClampOffset = 0;
        if (cursorScrubber.x < halfBadge + 4) {
          badgeClampOffset = halfBadge + 4 - cursorScrubber.x;
        } else if (cursorScrubber.x > totalCanvasWidth - halfBadge - 4) {
          badgeClampOffset = totalCanvasWidth - halfBadge - 4 - cursorScrubber.x;
        }
        return /* @__PURE__ */ React4.createElement(
          "div",
          {
            id: "timeline-cursor-scrubber",
            "data-cursor-x": cursorScrubber.x,
            "data-cursor-date": formatScrubberDate(cursorScrubber.date),
            style: { left: cursorScrubber.x },
            className: "absolute top-0 bottom-0 pointer-events-none z-30 w-0"
          },
          /* @__PURE__ */ React4.createElement(
            "div",
            {
              style: {
                transform: `translateX(calc(-50% + ${badgeClampOffset}px))`
              },
              className: "sticky top-2 flex items-center justify-center px-2.5 py-0.5 rounded-md bg-[#09090b] text-white border border-zinc-700/90 shadow-2xl text-[11px] font-mono font-bold tracking-widest uppercase w-max shrink-0 z-50 transition-transform"
            },
            /* @__PURE__ */ React4.createElement("span", null, formatScrubberDate(cursorScrubber.date))
          ),
          /* @__PURE__ */ React4.createElement("div", { className: "absolute top-0 bottom-0 left-0 w-[1.5px] -translate-x-1/2 bg-[#0C0C09] dark:bg-white/90 shadow-[0_0_4px_rgba(12,12,9,0.35)] dark:shadow-[0_0_6px_rgba(255,255,255,0.4)]" }),
          /* @__PURE__ */ React4.createElement("div", { className: "absolute top-0 left-0 w-1.5 h-1 bg-[#0C0C09] dark:bg-white rounded-xs -translate-x-1/2" })
        );
      })(),
      /* @__PURE__ */ React4.createElement(
        "div",
        {
          ref: calendarHeaderRef,
          "data-testid": "timeline-calendar-header",
          style: { height: HEADER_HEIGHT },
          className: "sticky top-0 z-20 bg-[#F4F4F1] dark:bg-[#18181b] border-b-2 border-[#0C0C09] dark:border-zinc-700 shadow-xs flex flex-col select-none"
        },
        /* @__PURE__ */ React4.createElement("div", { className: "flex h-7 border-b border-[#E2E2DC] dark:border-zinc-800" }, monthGroups.map((group, idx) => {
          const groupPx = group.count * dayWidth;
          return /* @__PURE__ */ React4.createElement(
            "div",
            {
              key: idx,
              style: { width: groupPx },
              className: "pl-2.5 flex items-center text-[11px] font-mono font-bold uppercase tracking-widest text-[#0C0C09] dark:text-zinc-200 border-l border-dashed border-[#0C0C09]/20 dark:border-zinc-800/90 first:border-l-0 truncate",
              title: group.label
            },
            groupPx >= 28 ? group.shortLabel : ""
          );
        })),
        /* @__PURE__ */ React4.createElement("div", { className: "flex flex-1 items-center" }, timelineDays.map((day, idx) => {
          const isToday = idx === todayIndex;
          const wknd = isWeekend(day);
          const dayNum = format2(day, "d");
          const dayLetter = format2(day, "EEEEE", { locale: es2 }).toUpperCase();
          const isMonday = day.getDay() === 1;
          const isMonthStart = day.getDate() === 1;
          const isBiWeekly = day.getDate() === 1 || day.getDate() === 8 || day.getDate() === 15 || day.getDate() === 22;
          const showNumber = dayWidth >= 28 ? true : dayWidth >= 16 ? isMonday || isMonthStart : dayWidth >= 7 ? isBiWeekly : isMonthStart || day.getDate() === 15;
          return /* @__PURE__ */ React4.createElement(
            "div",
            {
              key: idx,
              style: { width: dayWidth },
              className: `relative h-full flex flex-col items-center justify-center text-[10px] font-mono select-none ${isMonthStart && idx > 0 ? "border-l border-dashed border-[#0C0C09]/20 dark:border-zinc-800/90" : ""} ${showWeekendShading && wknd ? "bg-[#E5E5DF] dark:bg-zinc-800/80 text-[#0C0C09] dark:text-zinc-200" : isToday ? "font-bold" : "text-[#6B6B66] dark:text-zinc-400"}`
            },
            showNumber && (dayWidth >= 34 ? /* @__PURE__ */ React4.createElement("div", { className: `flex items-center gap-0.5 mt-0.5 ${isToday ? "px-1 py-0.2 rounded-[2px] bg-[#0C0C09] text-[#F4F4F1] dark:bg-zinc-100 dark:text-[#0C0C09]" : ""}` }, /* @__PURE__ */ React4.createElement("span", { className: "opacity-60 text-[9px]" }, dayLetter), /* @__PURE__ */ React4.createElement("span", { className: "font-semibold" }, dayNum)) : /* @__PURE__ */ React4.createElement("span", { className: `mt-0.5 ${isToday ? "px-1 py-0.2 rounded-[2px] bg-[#0C0C09] text-[#F4F4F1] dark:bg-zinc-100 dark:text-[#0C0C09] font-bold" : isMonthStart ? "font-bold" : ""}` }, dayNum))
          );
        }))
      ),
      /* @__PURE__ */ React4.createElement("div", { className: "relative z-10", style: { height: displayRows.length * ROW_HEIGHT + 52 } }, /* @__PURE__ */ React4.createElement("div", { className: "absolute inset-0 flex pointer-events-none z-[1]" }, timelineDays.map((day, idx) => {
        const wknd = isWeekend(day);
        const isHoliday = Boolean(
          workCalendar?.workdaysOnly && workCalendar.holidays?.includes(formatDateISO(day))
        );
        return /* @__PURE__ */ React4.createElement(
          "div",
          {
            key: idx,
            style: { width: dayWidth },
            className: `h-full ${isHoliday ? "bg-rose-100/70 dark:bg-rose-950/35" : showWeekendShading && wknd ? "bg-[#E5E5DF]/70 dark:bg-zinc-800/60" : ""}`
          }
        );
      })), /* @__PURE__ */ React4.createElement("div", { className: "absolute inset-0 flex pointer-events-none z-[5]" }, monthGroups.map((group, mIdx) => /* @__PURE__ */ React4.createElement(
        "div",
        {
          key: `month-divider-${mIdx}`,
          "data-month-divider": mIdx,
          style: { width: group.count * dayWidth },
          className: `h-full shrink-0 border-r border-dashed border-[#0C0C09]/20 dark:border-zinc-800/90 ${mIdx === monthGroups.length - 1 ? "border-r-transparent" : ""}`
        }
      ))), milestoneGuides.map(
        ({ milestone: m, milestoneX, tier, badgeClampOffset }) => {
          const isCrit = showCriticalPath && m.isCritical;
          const tierTopClass = tier === 1 ? "top-6" : tier === 2 ? "top-[46px]" : "top-0.5";
          const mTheme = COLOR_STYLES[m.color] || COLOR_STYLES.amber;
          return /* @__PURE__ */ React4.createElement(
            "div",
            {
              key: `milestone-guide-${m.id}`,
              "data-milestone-guide": m.id,
              "data-milestone-x": milestoneX,
              "data-milestone-color": m.color,
              style: { left: milestoneX },
              className: "absolute top-0 bottom-0 pointer-events-none z-10 w-0"
            },
            /* @__PURE__ */ React4.createElement(
              "div",
              {
                style: {
                  left: 0,
                  transform: `translateX(calc(-50% + ${badgeClampOffset}px))`
                },
                className: `absolute ${tierTopClass} flex items-center justify-center gap-1 px-2 py-0.5 rounded-[2px] text-[9px] font-mono font-bold shadow-none whitespace-nowrap z-20 ${isCrit ? "bg-[#DC2626] text-white ring-1 ring-rose-400" : mTheme.guidePill}`,
                title: `Hito: ${m.name} (${formatDateDisplay(m.startDate, "dd MMM yyyy")})`
              },
              /* @__PURE__ */ React4.createElement("span", { className: "text-[8px] leading-none shrink-0" }, "\u25C6"),
              /* @__PURE__ */ React4.createElement("span", { className: "max-w-[80px] sm:max-w-[120px] truncate text-center" }, m.name)
            ),
            /* @__PURE__ */ React4.createElement(
              "div",
              {
                className: `absolute top-0 bottom-0 left-0 w-0 -translate-x-1/2 border-l-2 border-dashed ${mTheme.guideLine}`
              }
            )
          );
        }
      ), releaseMilestoneGuides.map(
        ({ guideKey, release: rel, milestone: m, x, topY, height, tier }, idx) => {
          const isLineHidden = hiddenReleaseGuideKeys.has(guideKey);
          const diamondWidth = 20;
          const diamondHeight = 20;
          const points = "10,6 17,13 10,20 3,13";
          const diamondTop = 15;
          return /* @__PURE__ */ React4.createElement(
            "div",
            {
              key: `rel-guide-${rel.id}-${m.id}-${topY}-${idx}`,
              "data-testid": `release-milestone-guide-${rel.id}-${m.key}`,
              style: {
                left: x,
                top: topY,
                height
              },
              className: "absolute pointer-events-none w-0 overflow-visible"
            },
            /* @__PURE__ */ React4.createElement(
              "div",
              {
                style: {
                  left: 0,
                  transform: "translateX(-50%)",
                  top: `${diamondTop}px`
                },
                className: "absolute z-30 pointer-events-auto flex flex-col items-center"
              },
              /* @__PURE__ */ React4.createElement(
                "button",
                {
                  type: "button",
                  "data-testid": `release-milestone-diamond-${rel.id}-${m.key}`,
                  onClick: (e) => {
                    e.stopPropagation();
                    handleToggleReleaseGuideLine(guideKey);
                  },
                  title: `${m.code} \xB7 ${formatScrubberDate(m.date)}`,
                  className: `group relative flex items-center justify-center cursor-pointer transition-all select-none outline-none ${isLineHidden ? "opacity-65 hover:opacity-100 hover:scale-105" : "opacity-100 hover:scale-110 drop-shadow-sm"}`,
                  style: { width: diamondWidth, height: diamondHeight }
                },
                /* @__PURE__ */ React4.createElement(
                  "svg",
                  {
                    width: diamondWidth,
                    height: diamondHeight,
                    viewBox: `0 0 ${diamondWidth} ${diamondHeight}`,
                    className: "overflow-visible"
                  },
                  /* @__PURE__ */ React4.createElement(
                    "polygon",
                    {
                      points,
                      className: isLineHidden ? "fill-white dark:fill-zinc-900 stroke-slate-400 dark:stroke-zinc-500 stroke-[1.5]" : "fill-amber-400 dark:fill-amber-400 stroke-[#0C0C09] dark:stroke-zinc-900 stroke-[1.5]",
                      strokeDasharray: isLineHidden ? "2 2" : void 0
                    }
                  )
                )
              ),
              /* @__PURE__ */ React4.createElement(
                "span",
                {
                  "data-testid": `release-milestone-label-${rel.id}-${m.key}`,
                  style: tier === 1 ? { top: "5px", left: "19px" } : { top: "21px", left: "50%", transform: "translateX(-50%)" },
                  className: `absolute px-1 py-0 rounded-[3px] text-[9px] font-mono font-bold tracking-tight whitespace-nowrap leading-[13px] pointer-events-none select-none border shadow-xs ${isLineHidden ? "bg-white/90 dark:bg-zinc-900/90 border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-400" : "bg-white/95 dark:bg-zinc-900/95 border-amber-500/50 dark:border-amber-400/40 text-[#0C0C09] dark:text-amber-300"}`
                },
                m.code
              )
            ),
            !isLineHidden && /* @__PURE__ */ React4.createElement(
              "div",
              {
                "data-testid": `release-milestone-line-${rel.id}-${m.key}`,
                style: {
                  top: `${diamondTop + diamondHeight}px`,
                  bottom: 0
                },
                className: "absolute left-0 w-0 z-10 -translate-x-1/2 border-l-2 border-dashed border-amber-500/75 dark:border-amber-400/65 pointer-events-none"
              }
            )
          );
        }
      ), todayIndex >= 0 && /* @__PURE__ */ React4.createElement(
        "div",
        {
          id: "gantt-today-marker",
          "data-today-x": todayIndex * dayWidth + dayWidth / 2,
          style: { left: todayIndex * dayWidth + dayWidth / 2 },
          className: "absolute top-0 bottom-0 w-0.5 bg-[#0C0C09] dark:bg-zinc-400 z-30 pointer-events-none"
        },
        /* @__PURE__ */ React4.createElement("div", { className: "absolute -top-0.5 -translate-x-1/2 px-1.5 py-0.5 rounded-[2px] bg-[#0C0C09] text-[#F4F4F1] text-[9px] font-mono font-bold tracking-wider shadow-none" }, "HOY")
      ), displayRows.map((row, rowBgIndex) => {
        const rowBgExpandClass = isRowCollapsing(row) ? "animate-gantt-row-collapse" : isRowJustExpanded(row) ? "animate-gantt-row-expand" : "";
        if (row.kind === "release") {
          return /* @__PURE__ */ React4.createElement(
            "div",
            {
              key: `row-bg-${row.rowId}`,
              style: { height: ROW_HEIGHT },
              className: `${showRowSeparators ? "border-b border-[#E2E2DC] dark:border-zinc-800" : "border-b-0"} bg-[#F4F4F1]/30 dark:bg-zinc-900/30`
            }
          );
        }
        if (row.kind === "project") {
          const projAccent2 = getProjectAccent(row.group.project.color);
          return /* @__PURE__ */ React4.createElement(
            "div",
            {
              key: `row-bg-${row.rowId}`,
              "data-timeline-project-band": row.group.project.id,
              style: {
                height: ROW_HEIGHT,
                backgroundColor: `rgba(${projAccent2.rgb}, 0.09)`
              },
              className: `${rowBgExpandClass} ${showRowSeparators ? "border-b border-[#0C0C09]/25 dark:border-zinc-800" : "border-b-0"}`
            }
          );
        }
        if (row.kind === "empty-project" || row.kind === "add-task") {
          const projAccent2 = getProjectAccent(row.group.project.color);
          return /* @__PURE__ */ React4.createElement(
            "div",
            {
              key: `row-bg-${row.rowId}`,
              "data-timeline-project-band": row.group.project.id,
              style: {
                height: ROW_HEIGHT,
                backgroundColor: `rgba(${projAccent2.rgb}, 0.045)`,
                ...showRowSeparators ? { borderBottom: `2px solid rgba(${projAccent2.rgb}, 0.55)` } : {}
              },
              className: `${rowBgExpandClass} ${showRowSeparators ? "border-b border-[#E2E2DC] dark:border-zinc-800/60" : "border-b-0"}`
            }
          );
        }
        if (row.kind === "add-project") {
          return /* @__PURE__ */ React4.createElement(
            "div",
            {
              key: `row-bg-${row.rowId}`,
              style: { height: ROW_HEIGHT },
              className: `${rowBgExpandClass} ${showRowSeparators ? "border-b border-[#E2E2DC] dark:border-zinc-800/60" : "border-b-0"} bg-indigo-50/15 dark:bg-zinc-900/20`
            }
          );
        }
        const isHovered = hoveredId === row.item.id;
        const projAccent = getProjectAccent(row.group.project.color);
        const nextBgRow = displayRows[rowBgIndex + 1];
        const isLastBgRowInProject = groupByProject && !(nextBgRow && (nextBgRow.kind === "item" || nextBgRow.kind === "add-task" || nextBgRow.kind === "empty-project") && nextBgRow.group.project.id === row.group.project.id);
        return /* @__PURE__ */ React4.createElement(
          "div",
          {
            key: `row-bg-${row.rowId}`,
            "data-timeline-project-band": groupByProject ? row.group.project.id : void 0,
            style: {
              height: ROW_HEIGHT,
              ...groupByProject ? {
                ...!isHovered ? { backgroundColor: `rgba(${projAccent.rgb}, 0.045)` } : {},
                ...isLastBgRowInProject && showRowSeparators ? { borderBottom: `2px solid rgba(${projAccent.rgb}, 0.55)` } : {}
              } : {}
            },
            onMouseEnter: () => setHoveredId(row.item.id),
            onMouseLeave: () => setHoveredId(null),
            className: `${rowBgExpandClass} ${showRowSeparators ? "border-b border-[#E2E2DC] dark:border-zinc-800/70" : "border-b-0"} transition-colors ${isHovered ? "bg-[#F4F4F1]/80 dark:bg-zinc-900/40" : "bg-white dark:bg-[#0C0C09]"}`
          }
        );
      }), (arrowVisibility !== "none" || depDragPreview) && /* @__PURE__ */ React4.createElement(
        "svg",
        {
          width: totalCanvasWidth,
          height: displayRows.length * ROW_HEIGHT + 52,
          className: "absolute inset-0 pointer-events-none z-[25] overflow-visible",
          ...arrowVisibility !== "none" ? { "data-arrow-visibility": arrowVisibility } : {}
        },
        /* @__PURE__ */ React4.createElement("defs", null, /* @__PURE__ */ React4.createElement(
          "marker",
          {
            id: "arrow-normal",
            viewBox: "0 0 10 10",
            refX: "7",
            refY: "5",
            markerWidth: "5",
            markerHeight: "5",
            orient: "auto-start-reverse"
          },
          /* @__PURE__ */ React4.createElement("path", { d: "M 0 1.5 L 8 5 L 0 8.5 z", fill: "#71717A" })
        ), /* @__PURE__ */ React4.createElement(
          "marker",
          {
            id: "arrow-active",
            viewBox: "0 0 10 10",
            refX: "7",
            refY: "5",
            markerWidth: "5",
            markerHeight: "5",
            orient: "auto-start-reverse"
          },
          /* @__PURE__ */ React4.createElement("path", { d: "M 0 1.5 L 8 5 L 0 8.5 z", fill: "#0C0C09" })
        ), /* @__PURE__ */ React4.createElement(
          "marker",
          {
            id: "arrow-critical",
            viewBox: "0 0 10 10",
            refX: "7",
            refY: "5",
            markerWidth: "5",
            markerHeight: "5",
            orient: "auto-start-reverse"
          },
          /* @__PURE__ */ React4.createElement("path", { d: "M 0 1.5 L 8 5 L 0 8.5 z", fill: "#D97706" })
        )),
        dependencyLinks.map((link) => {
          const isInteractiveActive = link.isSelectedLink || link.isHoveredLink;
          const canInteract = !depDragState && !dragState;
          return /* @__PURE__ */ React4.createElement(
            "g",
            {
              key: link.key,
              "data-dep-link": `${link.predId}->${link.succId}`,
              "data-inter-project-link": link.isInterProject ? "true" : void 0
            },
            /* @__PURE__ */ React4.createElement(
              "path",
              {
                d: link.dPath,
                "data-dep-arrow": `${link.predId}->${link.succId}`,
                "data-dep-type": link.depType,
                fill: "none",
                stroke: link.strokeColor,
                strokeWidth: link.strokeWidth,
                strokeDasharray: link.hasConflict ? "4 3" : void 0,
                markerEnd: link.markerEnd,
                className: "transition-opacity duration-150",
                style: {
                  opacity: hoveredId && !link.isHighlighted ? 0.25 : 0.95
                }
              }
            ),
            /* @__PURE__ */ React4.createElement(
              "path",
              {
                d: link.dPath,
                "data-dep-hit-area": `${link.predId}->${link.succId}`,
                fill: "none",
                stroke: "transparent",
                strokeWidth: 14,
                style: {
                  pointerEvents: canInteract ? "stroke" : "none"
                },
                className: "cursor-pointer",
                onMouseEnter: () => setHoveredDepKey(link.key),
                onMouseLeave: () => setHoveredDepKey(
                  (prev) => prev === link.key ? null : prev
                ),
                onClick: (e) => {
                  e.stopPropagation();
                  setSelectedItemId(null);
                  setConnectModeSource(null);
                  setReconnectMode(null);
                  setSelectedDepLink(
                    (prev) => prev?.predId === link.predId && prev?.succId === link.succId ? null : { predId: link.predId, succId: link.succId }
                  );
                }
              },
              /* @__PURE__ */ React4.createElement("title", null, `Dependencia (${link.depType}) \u2014 Haz clic para editar, mover o eliminar`)
            ),
            /* @__PURE__ */ React4.createElement(
              "circle",
              {
                "data-dep-handle-source": `${link.predId}->${link.succId}`,
                cx: link.x1,
                cy: link.y1,
                r: isInteractiveActive ? 5 : 3.5,
                style: {
                  pointerEvents: isInteractiveActive && canInteract ? "all" : "none",
                  opacity: isInteractiveActive ? 1 : 0
                },
                onMouseEnter: () => setHoveredDepKey(link.key),
                onMouseLeave: () => setHoveredDepKey(
                  (prev) => prev === link.key ? null : prev
                ),
                onMouseDown: (e) => handleStartDependencyDrag(e, {
                  mode: "move-source",
                  oldPredId: link.predId,
                  oldSuccId: link.succId,
                  fixedItemId: link.succId,
                  depType: link.depType
                }),
                className: "cursor-grab active:cursor-grabbing fill-white dark:fill-slate-900 stroke-indigo-600 dark:stroke-indigo-400 stroke-2 transition-opacity"
              },
              /* @__PURE__ */ React4.createElement("title", null, "Arrastra este extremo para mover la tarea predecesora (origen)")
            ),
            /* @__PURE__ */ React4.createElement(
              "circle",
              {
                "data-dep-handle-target": `${link.predId}->${link.succId}`,
                cx: link.x2,
                cy: link.y2,
                r: isInteractiveActive ? 5.5 : 4,
                style: {
                  pointerEvents: isInteractiveActive && canInteract ? "all" : "none",
                  opacity: isInteractiveActive ? 1 : 0
                },
                onMouseEnter: () => setHoveredDepKey(link.key),
                onMouseLeave: () => setHoveredDepKey(
                  (prev) => prev === link.key ? null : prev
                ),
                onMouseDown: (e) => handleStartDependencyDrag(e, {
                  mode: "move-target",
                  oldPredId: link.predId,
                  oldSuccId: link.succId,
                  fixedItemId: link.predId,
                  depType: link.depType
                }),
                className: "cursor-grab active:cursor-grabbing fill-indigo-600 dark:fill-indigo-400 stroke-white dark:stroke-slate-900 stroke-2 transition-opacity"
              },
              /* @__PURE__ */ React4.createElement("title", null, "Arrastra la punta de la flecha para mover la tarea sucesora (destino)")
            ),
            /* @__PURE__ */ React4.createElement(
              "g",
              {
                "data-dep-midpoint": `${link.predId}->${link.succId}`,
                transform: `translate(${link.midPoint.x}, ${link.midPoint.y})`,
                style: {
                  pointerEvents: isInteractiveActive && canInteract ? "all" : "none",
                  opacity: isInteractiveActive ? 1 : 0
                },
                onMouseEnter: () => setHoveredDepKey(link.key),
                onMouseLeave: () => setHoveredDepKey(
                  (prev) => prev === link.key ? null : prev
                ),
                className: "transition-opacity duration-150"
              },
              /* @__PURE__ */ React4.createElement(
                "rect",
                {
                  x: -22,
                  y: -9,
                  width: 44,
                  height: 18,
                  rx: 3,
                  className: "fill-white dark:fill-zinc-900 stroke-[#0C0C09] dark:stroke-zinc-400 stroke-[1] shadow-none"
                }
              ),
              /* @__PURE__ */ React4.createElement(
                "g",
                {
                  "data-dep-midpoint-select": `${link.predId}->${link.succId}`,
                  onClick: (e) => {
                    e.stopPropagation();
                    setSelectedItemId(null);
                    setSelectedDepLink({
                      predId: link.predId,
                      succId: link.succId
                    });
                  },
                  className: "cursor-pointer"
                },
                /* @__PURE__ */ React4.createElement("title", null, `Editar o reconectar dependencia (${link.depType})`),
                /* @__PURE__ */ React4.createElement(
                  "text",
                  {
                    x: -7,
                    y: 3.5,
                    textAnchor: "middle",
                    className: "fill-[#0C0C09] dark:fill-zinc-200 text-[9px] font-mono font-bold select-none"
                  },
                  link.depType
                )
              ),
              /* @__PURE__ */ React4.createElement(
                "g",
                {
                  "data-dep-quick-delete": `${link.predId}->${link.succId}`,
                  onClick: (e) => {
                    e.stopPropagation();
                    commitRemoveDependency(link.predId, link.succId);
                  },
                  className: "cursor-pointer"
                },
                /* @__PURE__ */ React4.createElement("title", null, "Eliminar dependencia inmediatamente"),
                /* @__PURE__ */ React4.createElement(
                  "circle",
                  {
                    cx: 11,
                    cy: 0,
                    r: 6.5,
                    className: "fill-rose-500 hover:fill-rose-600 transition-colors"
                  }
                ),
                /* @__PURE__ */ React4.createElement(
                  "path",
                  {
                    d: "M 8.5 -2.5 L 13.5 2.5 M 13.5 -2.5 L 8.5 2.5",
                    stroke: "#ffffff",
                    strokeWidth: 1.6,
                    strokeLinecap: "round"
                  }
                )
              )
            )
          );
        }),
        depDragPreview && /* @__PURE__ */ React4.createElement(
          "g",
          {
            id: "gantt-dep-drag-preview",
            "data-dep-drag-preview": "true",
            className: "pointer-events-none"
          },
          /* @__PURE__ */ React4.createElement(
            "path",
            {
              d: depDragPreview.dPath,
              fill: "none",
              stroke: depDragPreview.isValidTarget ? "#4f46e5" : "#f43f5e",
              strokeWidth: 2.4,
              strokeDasharray: "5 3",
              markerEnd: depDragPreview.isValidTarget ? "url(#arrow-active)" : "url(#arrow-critical)"
            }
          ),
          /* @__PURE__ */ React4.createElement(
            "circle",
            {
              cx: depDragPreview.x1,
              cy: depDragPreview.y1,
              r: 4.5,
              fill: depDragPreview.isValidTarget ? "#4f46e5" : "#f43f5e"
            }
          ),
          /* @__PURE__ */ React4.createElement(
            "circle",
            {
              cx: depDragPreview.x2,
              cy: depDragPreview.y2,
              r: 5,
              fill: depDragPreview.isValidTarget ? "#10b981" : "#f43f5e"
            }
          )
        )
      ), depDragPreview && depDragState && /* @__PURE__ */ React4.createElement(
        "div",
        {
          style: {
            left: Math.max(
              12,
              Math.min(totalCanvasWidth - 180, depDragState.cursorX + 14)
            ),
            top: Math.max(8, depDragState.cursorY - 28)
          },
          className: `absolute z-50 pointer-events-none px-2.5 py-1 rounded-full text-[10px] font-semibold shadow-lg border whitespace-nowrap ${depDragPreview.isValidTarget ? "bg-indigo-600 text-white border-indigo-400" : "bg-rose-600 text-white border-rose-400"}`
        },
        depDragPreview.statusLabel
      ), displayRows.map((row, rowIndex) => {
        const timelineRowShiftY = rowDragShiftYByRowId.get(row.rowId) || 0;
        const timelineRowShiftStyle = timelineRowShiftY ? { transform: `translateY(${timelineRowShiftY}px)` } : void 0;
        const timelineRowShiftClass = isAnyRowOrProjectDragging ? "transition-transform duration-200 ease-out" : isCollapseAnimating ? "transition-[top] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]" : "";
        const timelineRowExpandClass = isRowCollapsing(row) ? "animate-gantt-timeline-collapse" : isRowJustExpanded(row) ? "animate-gantt-row-expand" : "";
        if (row.kind === "release") {
          const { group: rGroup } = row;
          const relSpan = getReleaseDateSpan(rGroup.release);
          const releaseMilestones = rGroup.release.milestones || [];
          const validMilestoneDates = releaseMilestones.map((m) => m.date).filter((d) => Boolean(d && typeof d === "string")).sort();
          const firstMilestoneDate = validMilestoneDates[0];
          const lastMilestoneDate = validMilestoneDates[validMilestoneDates.length - 1];
          const effectiveStartDate = firstMilestoneDate || rGroup.startDate || relSpan.startDate;
          const effectiveEndDate = lastMilestoneDate || rGroup.endDate || relSpan.endDate;
          const rStart = parseDateSafe(effectiveStartDate);
          const rEnd = parseDateSafe(effectiveEndDate);
          const startOffsetDays = differenceInCalendarDays2(
            rStart,
            timelineStart
          );
          const rStartX = startOffsetDays * dayWidth;
          const spanDays = Math.max(
            relSpan.duration,
            differenceInCalendarDays2(rEnd, rStart) + 1
          );
          const rWidth = Math.max(dayWidth, spanDays * dayWidth);
          const isReleaseSelected = effectiveSelectedReleaseId === rGroup.release.id;
          return /* @__PURE__ */ React4.createElement(
            "div",
            {
              key: `release-summary-bar-${rGroup.release.id}`,
              "data-release-summary-bar": rGroup.release.id,
              "data-selected-release-id": isReleaseSelected ? rGroup.release.id : void 0,
              style: {
                top: rowIndex * ROW_HEIGHT,
                height: ROW_HEIGHT,
                ...timelineRowShiftStyle
              },
              className: `absolute left-0 right-0 flex items-center pointer-events-none z-20 ${timelineRowShiftClass}`
            },
            /* @__PURE__ */ React4.createElement(
              "div",
              {
                style: { left: rStartX, width: rWidth },
                onClick: (e) => {
                  e.stopPropagation();
                  handleSelectRelease(rGroup.release);
                },
                onDoubleClick: (e) => {
                  e.stopPropagation();
                  handleToggleReleaseCollapse(rGroup.release.id);
                },
                className: "relative z-20 h-full flex flex-col justify-start pt-1 pointer-events-auto cursor-pointer group overflow-visible select-none",
                title: `${rGroup.release.name}: ${effectiveStartDate} \u2192 ${effectiveEndDate} (${spanDays}d \xB7 Duraci\xF3n completa de la release \xB7 Acotado hasta su \xFAltimo hito: ${effectiveEndDate} \xB7 Clic para seleccionar release en diagrama, doble clic para colapsar)`
              },
              /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-1.5 text-[10px] font-mono text-slate-700 dark:text-slate-200 mb-1 px-0.5 whitespace-nowrap overflow-visible z-10 pointer-events-none" }, /* @__PURE__ */ React4.createElement("span", { className: "px-1 py-0.2 rounded bg-indigo-600 text-white font-mono text-[8.5px] font-bold tracking-wider uppercase" }, "REL"), /* @__PURE__ */ React4.createElement("span", { className: "font-bold" }, rGroup.release.code), /* @__PURE__ */ React4.createElement("span", { className: "text-[9px] opacity-80 font-normal" }, effectiveStartDate.split("-").slice(1).reverse().join("/"), " \u2192 ", effectiveEndDate.split("-").slice(1).reverse().join("/")), /* @__PURE__ */ React4.createElement("span", { className: "px-1 py-0.2 rounded bg-zinc-200/80 dark:bg-zinc-800 font-mono text-[9px] font-bold" }, `(${spanDays}d)`), /* @__PURE__ */ React4.createElement("span", { className: "px-1.5 py-0.2 rounded bg-zinc-200/80 dark:bg-zinc-800 text-[9px] font-bold" }, rGroup.progress, "%")),
              /* @__PURE__ */ React4.createElement(
                "div",
                {
                  className: `relative h-3 rounded-t-[2px] bg-[#0C0C09] dark:bg-zinc-200 overflow-visible shadow-none transition-all group-hover:bg-zinc-800 dark:group-hover:bg-zinc-300 ${isReleaseSelected ? "ring-3 ring-indigo-500" : ""}`
                },
                /* @__PURE__ */ React4.createElement(
                  "div",
                  {
                    style: { width: `${rGroup.progress}%` },
                    className: "h-full rounded-tl-[2px] transition-all bg-indigo-500"
                  }
                ),
                /* @__PURE__ */ React4.createElement("div", { className: "absolute -bottom-1.5 left-0 w-2 h-2 bg-[#0C0C09] dark:bg-zinc-200 group-hover:bg-zinc-800 dark:group-hover:bg-zinc-300 transition-colors clip-path-bracket-left" }),
                /* @__PURE__ */ React4.createElement("div", { className: "absolute -bottom-1.5 left-2 w-2 h-2 bg-[#0C0C09] dark:bg-zinc-200 group-hover:bg-zinc-800 dark:group-hover:bg-zinc-300 transition-colors clip-path-bracket-left" }),
                /* @__PURE__ */ React4.createElement("div", { className: "absolute -bottom-1.5 right-0 w-2 h-2 bg-[#0C0C09] dark:bg-zinc-200 group-hover:bg-zinc-800 dark:group-hover:bg-zinc-300 transition-colors clip-path-bracket-right" }),
                /* @__PURE__ */ React4.createElement("div", { className: "absolute -bottom-1.5 right-2 w-2 h-2 bg-[#0C0C09] dark:bg-zinc-200 group-hover:bg-zinc-800 dark:group-hover:bg-zinc-300 transition-colors clip-path-bracket-right" })
              )
            )
          );
        }
        if (row.kind === "empty-project" || row.kind === "add-task" || row.kind === "add-project") {
          return null;
        }
        if (row.kind === "project") {
          const { group } = row;
          const targetRel = releases?.find((r) => r.id === group.project.releaseId);
          const isProjectSelected = effectiveSelectedProjectId === group.project.id;
          if (group.items.length === 0) {
            const relSpan = targetRel ? getReleaseDateSpan(targetRel) : null;
            const groupStartDateStr = relSpan ? relSpan.startDate : group.startDate;
            const groupDuration = relSpan ? relSpan.duration : Math.max(1, group.duration || 14);
            const groupEndDateStr = relSpan ? relSpan.endDate : group.endDate;
            const groupStart2 = parseDateSafe(groupStartDateStr);
            const startOffsetDays2 = differenceInCalendarDays2(
              groupStart2,
              timelineStart
            );
            const groupStartX2 = startOffsetDays2 * dayWidth;
            const groupWidth2 = Math.max(dayWidth, groupDuration * dayWidth);
            return /* @__PURE__ */ React4.createElement(
              "div",
              {
                key: `summary-bar-${group.project.id}`,
                "data-project-summary-bar": group.project.id,
                "data-empty-project-timeline-bar": "true",
                "data-project-locked": group.project.locked ? "true" : "false",
                "data-selected-project-id": isProjectSelected ? group.project.id : void 0,
                "data-multi-selected": multiSelectedProjectIds.has(group.project.id) ? "true" : void 0,
                style: {
                  top: rowIndex * ROW_HEIGHT,
                  height: ROW_HEIGHT,
                  ...timelineRowShiftStyle
                },
                className: `absolute left-0 right-0 flex items-center pointer-events-none ${draggingProjectId === group.project.id ? "z-40" : "z-20"} ${timelineRowShiftClass} ${timelineRowExpandClass}`
              },
              /* @__PURE__ */ React4.createElement(
                "div",
                {
                  style: { left: groupStartX2, width: groupWidth2 },
                  onMouseDown: (e) => handleProjectBarMouseDown(e, group),
                  onClick: (e) => {
                    e.stopPropagation();
                    if (hasDraggedRef.current) {
                      hasDraggedRef.current = false;
                      return;
                    }
                    if (e.metaKey || e.ctrlKey || e.shiftKey) {
                      toggleMultiSelectProject(group.project.id, e.shiftKey);
                      return;
                    }
                    handleSelectProject(group.project);
                  },
                  onDoubleClick: (e) => {
                    e.stopPropagation();
                    handleToggleProjectCollapse(group.project.id, group.project.collapsed);
                  },
                  title: `${group.project.name}${group.project.locked ? " \xB7 \u{1F512} Bloqueado" : ""} (Sin tareas a\xFAn \xB7 ${targetRel ? `Release ${targetRel.code}` : "Ventana estimada"}: ${formatDateDisplay(groupStartDateStr, "dd MMM")} \u2192 ${formatDateDisplay(groupEndDateStr, "dd MMM yyyy")} \xB7 Clic para seleccionar proyecto en diagrama)`,
                  className: `relative z-20 flex flex-col justify-center cursor-pointer pointer-events-auto group overflow-visible ${isProjectSelected || multiSelectedProjectIds.has(group.project.id) ? "ring-2 ring-indigo-500 rounded-[4px] p-0.5" : ""}`
                },
                /* @__PURE__ */ React4.createElement(
                  "div",
                  {
                    "data-timeline-project-name": group.project.name,
                    className: "flex items-center gap-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 mb-1 px-0.5 whitespace-nowrap overflow-visible z-10 pointer-events-none"
                  },
                  group.project.locked && /* @__PURE__ */ React4.createElement(
                    "span",
                    {
                      "data-timeline-project-locked": group.project.id,
                      className: "inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                    },
                    /* @__PURE__ */ React4.createElement(Lock2, { className: "w-2.5 h-2.5" }),
                    /* @__PURE__ */ React4.createElement("span", null, "Bloqueado")
                  ),
                  /* @__PURE__ */ React4.createElement("span", { className: "whitespace-nowrap font-semibold" }, group.project.name),
                  /* @__PURE__ */ React4.createElement("span", { className: "px-1 py-0.2 rounded text-[9px] font-mono bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700" }, "0 tareas")
                ),
                /* @__PURE__ */ React4.createElement("div", { className: "h-4 rounded-[3px] border-2 border-dashed border-indigo-400 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 flex items-center justify-between px-2 text-[10px] text-indigo-700 dark:text-indigo-300 font-mono shadow-xs" }, /* @__PURE__ */ React4.createElement("span", { className: "truncate" }, "Ventana estimada ", targetRel ? `(${targetRel.code})` : ""), /* @__PURE__ */ React4.createElement("span", { className: "shrink-0 font-bold" }, groupDuration, "d"))
              )
            );
          }
          const groupStart = parseDateSafe(group.startDate);
          const startOffsetDays = differenceInCalendarDays2(
            groupStart,
            timelineStart
          );
          const groupStartX = startOffsetDays * dayWidth;
          const groupWidth = Math.max(dayWidth, group.duration * dayWidth);
          const projTheme = COLOR_STYLES[group.project.color] || COLOR_STYLES.indigo;
          const isDraggingProjectBar = dragState?.mode === "move" && (dragState.itemId === `project:${group.project.id}` || Boolean(dragState.multiItems) && group.items.length > 0 && group.items.every((it) => dragState.multiItems.has(it.id)));
          const projectSmoothOffsetX = isDraggingProjectBar && typeof dragState?.pixelDeltaX === "number" ? dragState.pixelDeltaX - dragState.dayDelta * dayWidth : 0;
          return /* @__PURE__ */ React4.createElement(
            "div",
            {
              key: `summary-bar-${group.project.id}`,
              "data-project-summary-bar": group.project.id,
              "data-project-locked": group.project.locked ? "true" : "false",
              "data-selected-project-id": isProjectSelected ? group.project.id : void 0,
              "data-multi-selected": multiSelectedProjectIds.has(group.project.id) ? "true" : void 0,
              style: {
                top: rowIndex * ROW_HEIGHT,
                height: ROW_HEIGHT,
                ...timelineRowShiftStyle
              },
              className: `absolute left-0 right-0 flex items-center pointer-events-none ${draggingProjectId === group.project.id ? "z-40" : "z-20"} ${timelineRowShiftClass} ${timelineRowExpandClass}`
            },
            /* @__PURE__ */ React4.createElement(
              "div",
              {
                style: { left: groupStartX + projectSmoothOffsetX, width: groupWidth },
                onMouseDown: (e) => handleProjectBarMouseDown(e, group),
                onClick: (e) => {
                  e.stopPropagation();
                  if (hasDraggedRef.current) {
                    hasDraggedRef.current = false;
                    return;
                  }
                  if (e.metaKey || e.ctrlKey || e.shiftKey) {
                    toggleMultiSelectProject(group.project.id, e.shiftKey);
                    return;
                  }
                  handleSelectProject(group.project);
                },
                onDoubleClick: (e) => {
                  e.stopPropagation();
                  handleToggleProjectCollapse(group.project.id, group.project.collapsed);
                },
                title: `${group.project.name}${group.project.locked ? " \xB7 \u{1F512} Bloqueado" : ""}: ${formatDateDisplay(
                  group.startDate,
                  "dd MMM"
                )} \u2192 ${formatDateDisplay(group.endDate, "dd MMM yyyy")} (${group.duration} d\xEDas \xB7 Arrastra para mover todo el proyecto, Cmd/Ctrl+Clic para multiselecci\xF3n, doble clic para colapsar)`,
                className: `relative z-20 flex flex-col justify-center cursor-grab active:cursor-grabbing pointer-events-auto group overflow-visible ${isProjectSelected || multiSelectedProjectIds.has(group.project.id) ? "ring-2 ring-indigo-500 rounded-[4px] p-0.5" : ""}`
              },
              /* @__PURE__ */ React4.createElement(
                "div",
                {
                  "data-timeline-project-name": group.project.name,
                  className: "flex items-center gap-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 mb-1 px-0.5 whitespace-nowrap overflow-visible z-10 pointer-events-none"
                },
                group.project.locked && /* @__PURE__ */ React4.createElement(
                  "span",
                  {
                    "data-timeline-project-locked": group.project.id,
                    className: "inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                  },
                  /* @__PURE__ */ React4.createElement(Lock2, { className: "w-2.5 h-2.5" }),
                  /* @__PURE__ */ React4.createElement("span", null, "Bloqueado")
                ),
                /* @__PURE__ */ React4.createElement("span", { className: "whitespace-nowrap font-semibold" }, group.project.name),
                (() => {
                  const projPlatform = normalizePlatform(group.project.platform);
                  if (!projPlatform) return null;
                  return /* @__PURE__ */ React4.createElement(
                    "span",
                    {
                      "data-timeline-project-platform": projPlatform,
                      className: `px-1.5 py-0.2 rounded text-[9px] font-bold border ${projPlatform === "iOS" ? "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800" : projPlatform === "Android" ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" : "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"}`
                    },
                    projPlatform
                  );
                })(),
                /* @__PURE__ */ React4.createElement("span", { className: "text-zinc-500 dark:text-zinc-400 font-normal" }, "(", group.duration, "d)"),
                /* @__PURE__ */ React4.createElement("span", { className: "font-mono text-[#0C0C09] dark:text-zinc-200 font-bold ml-1" }, group.progress, "%")
              ),
              /* @__PURE__ */ React4.createElement("div", { className: `relative h-3 rounded-t-[2px] ${projTheme.badge} overflow-visible shadow-none` }, /* @__PURE__ */ React4.createElement(
                "div",
                {
                  style: { width: `${group.progress}%` },
                  className: `h-full rounded-tl-[2px] transition-all ${projTheme.fillBg}`
                }
              ), /* @__PURE__ */ React4.createElement("div", { className: `absolute -bottom-1.5 left-0 w-2 h-2 ${projTheme.badge} clip-path-bracket-left` }), /* @__PURE__ */ React4.createElement("div", { className: `absolute -bottom-1.5 right-0 w-2 h-2 ${projTheme.badge} clip-path-bracket-right` }))
            )
          );
        }
        const { item } = row;
        if (item.hidden) return null;
        const coords = itemRowMap.get(item.id);
        if (!coords) return null;
        const isHovered = hoveredId === item.id;
        const isSelected = selectedItemId === item.id;
        const isDepDropTarget = depDragState?.hoveredTargetId === item.id;
        const isStartDropTarget = isDepDropTarget && (depDragState?.mode !== "create" || (depDragState?.hoveredTargetPort || "start") === "start");
        const isEndDropTarget = isDepDropTarget && depDragState?.mode === "create" && depDragState?.hoveredTargetPort === "end";
        const isDepDropValid = Boolean(depDragPreview?.isValidTarget);
        const isConnectSource = connectModeSource?.itemId === item.id;
        const isStartConnectSource = isConnectSource && (connectModeSource?.port === "start" || !connectModeSource?.port && connectModeSource?.role === "succ");
        const isEndConnectSource = isConnectSource && !isStartConnectSource;
        const isDimmed = (hoveredId !== null || selectedItemId !== null || selectedDepLink !== null) && !relatedIds.has(item.id) && !isDepDropTarget && !isConnectSource;
        const isCrit = showCriticalPath && item.isCritical;
        const isMultiSelectedThis = effectiveMultiItemIds.has(item.id);
        const isDraggingThis = Boolean(
          dragState && (dragState.itemId === item.id || dragState.multiItems?.has(item.id))
        );
        const itemEffectiveColor = getItemEffectiveColor(item);
        const styleTheme = COLOR_STYLES[itemEffectiveColor] || COLOR_STYLES.indigo;
        const showPortHandles = isHovered || isSelected || isDepDropTarget || isConnectSource || Boolean(depDragState) || Boolean(connectModeSource) || Boolean(reconnectMode);
        const barLeft = item.type === "milestone" ? coords.startX - 10 : coords.startX;
        const barWidth = item.type === "milestone" ? 20 : Math.max(6, dayWidth, coords.endX - coords.startX);
        const smoothMoveOffsetX = isDraggingThis && dragState?.mode === "move" && typeof dragState.pixelDeltaX === "number" ? dragState.pixelDeltaX - dragState.dayDelta * dayWidth : 0;
        const isActivelyMovingBar = isDraggingThis && dragState?.mode === "move" && Math.abs(dragState.pixelDeltaX ?? 0) > 3;
        const autoSlackDays = Math.max(0, item.freeSlack ?? 0);
        const totalSlackDays = item.slack > 0 ? item.slack : autoSlackDays;
        const slackWidth = item.type === "task" && totalSlackDays > 0 ? totalSlackDays * dayWidth : 0;
        const effectiveSlackEndDateStr = totalSlackDays > 0 ? calculateEndDateFromDuration(
          coords.effectiveEndStr,
          totalSlackDays + 1,
          "task"
        ) : coords.effectiveEndStr;
        const isDraggingVerticalThis = draggingRowId === item.id || Boolean(draggingMultiRowIds?.has(item.id));
        const effectiveTimelineRowShiftStyle = isDraggingVerticalThis ? { transform: `translateY(${dragVerticalDeltaY}px)` } : timelineRowShiftStyle;
        return /* @__PURE__ */ React4.createElement(
          "div",
          {
            key: `bar-${item.id}`,
            "data-timeline-bar-row": item.id,
            style: {
              top: coords.index * ROW_HEIGHT,
              height: ROW_HEIGHT,
              ...effectiveTimelineRowShiftStyle
            },
            onMouseEnter: () => setHoveredId(item.id),
            onMouseLeave: () => setHoveredId(null),
            className: `absolute left-0 right-0 flex items-center pointer-events-none ${isDraggingVerticalThis || draggingProjectId === item.projectId ? "z-40" : "z-20"} ${isDraggingVerticalThis ? "opacity-95" : isAnyRowOrProjectDragging ? "transition-[transform,opacity] duration-200 ease-out" : isCollapseAnimating ? "transition-[top,opacity] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]" : "transition-opacity"} ${timelineRowExpandClass} ${isDimmed ? "opacity-40" : "opacity-100"}`
          },
          item.type === "milestone" ? /* @__PURE__ */ React4.createElement(React4.Fragment, null, isActivelyMovingBar && /* @__PURE__ */ React4.createElement(
            "div",
            {
              "data-testid": "timeline-drag-snap-ghost",
              style: { left: barLeft },
              className: "absolute w-5 h-5 rotate-45 rounded-[4px] border-2 border-dashed border-indigo-400/80 bg-indigo-500/15 pointer-events-none z-10"
            }
          ), /* @__PURE__ */ React4.createElement(
            "div",
            {
              style: { left: barLeft + smoothMoveOffsetX },
              onMouseDown: (e) => handleBarMouseDown(e, item, "move"),
              onClick: (e) => handleBarClick(e, item.id),
              onDoubleClick: () => guardedEditModal(item),
              "data-timeline-milestone": item.id,
              "data-milestone-color": item.color,
              className: `absolute z-20 flex items-center pointer-events-auto group cursor-grab active:cursor-grabbing ${isDraggingThis ? "z-40" : ""}`
            },
            /* @__PURE__ */ React4.createElement(
              "button",
              {
                type: "button",
                "data-dep-port-in": item.id,
                "data-dep-port-role": "in",
                onMouseDown: (e) => handleStartDependencyDrag(e, {
                  mode: "create",
                  originPort: "in",
                  fixedItemId: item.id
                }),
                onClick: (e) => e.stopPropagation(),
                title: "Punto de Inicio (S): arrastra para crear SS/SF o suelta aqu\xED para FS/SS sin mover fechas",
                className: `absolute -left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-500 hover:bg-indigo-600 hover:scale-125 shadow-sm transition-all cursor-crosshair z-30 ${showPortHandles ? "opacity-100 scale-105" : "opacity-0 group-hover:opacity-100"} ${isStartDropTarget ? isDepDropValid ? "ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100" : "ring-2 ring-rose-400 bg-rose-500 scale-125 opacity-100" : isStartConnectSource ? "ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100" : ""}`
              }
            ),
            /* @__PURE__ */ React4.createElement(
              "button",
              {
                type: "button",
                "data-dep-port-out": item.id,
                "data-dep-port-role": "out",
                onMouseDown: (e) => handleStartDependencyDrag(e, {
                  mode: "create",
                  originPort: "out",
                  fixedItemId: item.id
                }),
                onClick: (e) => e.stopPropagation(),
                title: "Punto de Fin (F): arrastra para crear FS/FF o suelta aqu\xED para FF/SF sin mover fechas",
                className: `absolute left-[22px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-600 hover:bg-indigo-500 hover:scale-125 shadow-sm transition-all cursor-crosshair z-30 ${showPortHandles ? "opacity-100 scale-105" : "opacity-0 group-hover:opacity-100"} ${isEndDropTarget ? isDepDropValid ? "ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100" : "ring-2 ring-rose-400 bg-rose-500 scale-125 opacity-100" : isEndConnectSource ? "ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100" : ""}`
              }
            ),
            isDraggingThis && /* @__PURE__ */ React4.createElement("div", { className: "absolute -top-7 left-2.5 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-[10px] font-mono font-bold shadow-xl border border-slate-700/60 dark:border-zinc-300/60 pointer-events-none whitespace-nowrap z-50" }, "\u25C6 ", formatDateDisplay(coords.effectiveStartStr, "d MMM yyyy")),
            /* @__PURE__ */ React4.createElement(
              "div",
              {
                "data-multi-selected": isMultiSelectedThis ? "true" : void 0,
                className: `w-5 h-5 rotate-45 rounded-[4px] border-2 shadow-md transition-transform group-hover:scale-125 ${isDraggingThis ? "scale-125 ring-2 ring-indigo-500 shadow-xl" : isMultiSelectedThis ? "scale-125 ring-2 ring-indigo-500 shadow-lg" : isDepDropTarget ? "scale-125 ring-2 ring-emerald-500" : isConnectSource ? "scale-125 ring-2 ring-indigo-500" : isSelected ? "scale-125 ring-2 ring-indigo-500" : ""} ${isCrit ? "bg-rose-500 border-white dark:border-slate-900 ring-2 ring-rose-500" : item.isExternal ? "bg-amber-500/90 border-dashed border-2 border-[#0C0C09] dark:border-white" : styleTheme.diamondBg}`
              }
            ),
            /* @__PURE__ */ React4.createElement(
              "div",
              {
                className: `ml-4 px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap shadow-sm ${styleTheme.diamondPill} ${item.isExternal ? "border-amber-400 ring-1 ring-amber-400/50" : ""}`
              },
              `\u25C6 ${item.isExternal ? "[EXT] " : ""}${item.name} `,
              /* @__PURE__ */ React4.createElement("span", { className: "font-mono text-[10px] opacity-75" }, "(", formatDateDisplay(coords.effectiveStartStr, "dd MMM"), ")")
            )
          )) : /* @__PURE__ */ React4.createElement(React4.Fragment, null, isActivelyMovingBar && /* @__PURE__ */ React4.createElement(
            "div",
            {
              "data-testid": "timeline-drag-snap-ghost",
              style: { left: barLeft, width: barWidth },
              className: "absolute h-7 rounded-[4px] border-2 border-dashed border-indigo-400/80 dark:border-indigo-400/70 bg-indigo-500/10 pointer-events-none z-10"
            }
          ), /* @__PURE__ */ React4.createElement(
            "div",
            {
              style: { left: barLeft + smoothMoveOffsetX },
              className: `absolute z-20 flex items-center pointer-events-auto group ${isDraggingThis ? "z-40" : ""}`
            },
            isDraggingThis && /* @__PURE__ */ React4.createElement("div", { className: "absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-[10px] font-mono font-bold shadow-xl border border-slate-700/60 dark:border-zinc-300/60 pointer-events-none whitespace-nowrap z-50" }, formatDateDisplay(coords.effectiveStartStr, "d MMM"), " \u2192 ", formatDateDisplay(coords.effectiveEndStr, "d MMM"), " (", coords.effectiveDuration, "d)"),
            /* @__PURE__ */ React4.createElement("div", { className: "relative flex items-center" }, /* @__PURE__ */ React4.createElement(
              "div",
              {
                "data-timeline-task-name": item.id,
                className: "absolute bottom-full mb-[2px] left-0 flex items-center gap-1.5 pointer-events-none select-none z-10 whitespace-nowrap"
              },
              /* @__PURE__ */ React4.createElement("span", { className: "text-[10.5px] font-semibold text-[#0C0C09] dark:text-zinc-100 drop-shadow-xs leading-none" }, item.name),
              /* @__PURE__ */ React4.createElement("span", { className: "text-[9.5px] font-mono text-[#6B6B66] dark:text-zinc-400 font-medium leading-none" }, `(${coords.effectiveDuration}d)`)
            ), /* @__PURE__ */ React4.createElement(
              "button",
              {
                type: "button",
                "data-dep-port-in": item.id,
                "data-dep-port-role": "in",
                onMouseDown: (e) => handleStartDependencyDrag(e, {
                  mode: "create",
                  originPort: "in",
                  fixedItemId: item.id
                }),
                onClick: (e) => e.stopPropagation(),
                title: "Punto de Inicio (S): arrastra para crear SS/SF o suelta aqu\xED para FS/SS sin mover fechas",
                className: `absolute -left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-500 hover:bg-indigo-600 hover:scale-125 shadow-sm transition-all cursor-crosshair z-30 ${showPortHandles ? "opacity-100 scale-105" : "opacity-0 group-hover:opacity-100"} ${isStartDropTarget ? isDepDropValid ? "ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100" : "ring-2 ring-rose-400 bg-rose-500 scale-125 opacity-100" : isStartConnectSource ? "ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100" : ""}`
              }
            ), /* @__PURE__ */ React4.createElement(
              "div",
              {
                style: { width: barWidth },
                onMouseDown: (e) => handleBarMouseDown(e, item, "move"),
                onClick: (e) => handleBarClick(e, item.id),
                onDoubleClick: () => guardedEditModal(item),
                "data-timeline-task": item.id,
                "data-multi-selected": isMultiSelectedThis ? "true" : void 0,
                className: `relative h-7 rounded-[4px] border overflow-hidden cursor-grab active:cursor-grabbing shadow-none transition-shadow ${styleTheme.barBg} ${isDraggingThis ? "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-black shadow-2xl scale-[1.02] opacity-95" : isMultiSelectedThis ? "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-black" : isDepDropTarget ? "ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-black" : isConnectSource ? "ring-2 ring-[#0C0C09] ring-offset-1 dark:ring-offset-black" : isSelected ? "ring-2 ring-[#0C0C09] ring-offset-1 dark:ring-offset-black" : isCrit ? "border-rose-500 ring-2 ring-rose-500/40" : item.hasConflict ? "border-rose-500 ring-2 ring-rose-500/30" : styleTheme.border}`
              },
              /* @__PURE__ */ React4.createElement(
                "div",
                {
                  style: { width: `${item.progress}%` },
                  className: `h-full transition-all ${isCrit ? "bg-rose-600 dark:bg-rose-500" : styleTheme.fillBg}`
                }
              ),
              barWidth >= 28 && /* @__PURE__ */ React4.createElement(
                "div",
                {
                  "data-testid": `task-progress-handle-${item.id}`,
                  onMouseDown: (e) => handleBarMouseDown(e, item, "progress"),
                  style: {
                    left: `clamp(14px, ${item.progress}%, calc(100% - 14px))`
                  },
                  title: `Arrastra para ajustar el avance (${item.progress}%)`,
                  className: "absolute bottom-0 -translate-x-1/2 w-3.5 h-2.5 cursor-ew-resize opacity-75 group-hover:opacity-100 hover:scale-125 transition flex items-end justify-center z-20"
                },
                /* @__PURE__ */ React4.createElement(
                  "div",
                  {
                    style: {
                      width: 0,
                      height: 0,
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderBottom: "7px solid rgba(255, 255, 255, 0.95)",
                      filter: "drop-shadow(0 0 1px rgba(0,0,0,0.6))"
                    }
                  }
                )
              ),
              item.progress > 0 && barWidth >= 40 && /* @__PURE__ */ React4.createElement("div", { className: "absolute inset-0 px-2 flex items-center justify-center text-[9px] font-mono font-bold text-white/90 drop-shadow-xs pointer-events-none select-none" }, item.progress, "%"),
              /* @__PURE__ */ React4.createElement(
                "div",
                {
                  "data-testid": `task-resize-start-${item.id}`,
                  onMouseDown: (e) => handleBarMouseDown(e, item, "resize-start"),
                  title: "Arrastra el borde izquierdo para cambiar la fecha de inicio (fin fijo)",
                  className: "absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-white/20 flex items-center justify-center z-10"
                },
                /* @__PURE__ */ React4.createElement("div", { className: "w-0.5 h-3.5 bg-white/70 rounded-[1px]" })
              ),
              /* @__PURE__ */ React4.createElement(
                "div",
                {
                  "data-testid": `task-resize-end-${item.id}`,
                  onMouseDown: (e) => handleBarMouseDown(e, item, "resize"),
                  title: "Arrastra el borde derecho para cambiar la duraci\xF3n",
                  className: "absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-white/20 flex items-center justify-center z-10"
                },
                /* @__PURE__ */ React4.createElement("div", { className: "w-0.5 h-3.5 bg-white/70 rounded-[1px]" })
              )
            ), baselineItemMap && (() => {
              const baseItem = baselineItemMap.get(item.id);
              if (!baseItem) return null;
              const baseStartOffset = differenceInCalendarDays2(
                parseDateSafe(baseItem.startDate),
                timelineStart
              );
              const baseDur = Math.max(
                1,
                differenceInCalendarDays2(
                  parseDateSafe(baseItem.endDate),
                  parseDateSafe(baseItem.startDate)
                ) + 1
              );
              const baseLeftPx = baseStartOffset * dayWidth - (barLeft + smoothMoveOffsetX);
              const baseWidthPx = Math.max(6, baseDur * dayWidth);
              const varianceDays = differenceInCalendarDays2(
                parseDateSafe(item.endDate),
                parseDateSafe(baseItem.endDate)
              );
              return /* @__PURE__ */ React4.createElement(React4.Fragment, null, /* @__PURE__ */ React4.createElement(
                "div",
                {
                  "data-testid": `timeline-baseline-bar-${item.id}`,
                  style: { left: baseLeftPx, width: baseWidthPx },
                  title: `L\xEDnea base (${baselineSnapshot?.label || "Commit"}): ${formatDateDisplay(
                    baseItem.startDate,
                    "dd MMM"
                  )} \u2192 ${formatDateDisplay(baseItem.endDate, "dd MMM yyyy")}`,
                  className: "absolute -bottom-2 h-1.5 rounded-[2px] bg-slate-400/80 dark:bg-zinc-500/80 border border-slate-500/50 dark:border-zinc-400/40 pointer-events-none"
                }
              ), varianceDays !== 0 && /* @__PURE__ */ React4.createElement(
                "span",
                {
                  "data-testid": `timeline-baseline-variance-${item.id}`,
                  className: `ml-2 px-1.5 py-0.2 rounded-[3px] text-[9px] font-mono font-bold whitespace-nowrap pointer-events-none ${varianceDays > 0 ? "bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800" : "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"}`,
                  title: `Desviaci\xF3n respecto a l\xEDnea base: ${varianceDays > 0 ? `+${varianceDays}d retraso` : `${varianceDays}d adelanto`}`
                },
                varianceDays > 0 ? `+${varianceDays}d` : `${varianceDays}d`
              ));
            })(), /* @__PURE__ */ React4.createElement(
              "button",
              {
                type: "button",
                "data-dep-port-out": item.id,
                "data-dep-port-role": "out",
                onMouseDown: (e) => handleStartDependencyDrag(e, {
                  mode: "create",
                  originPort: "out",
                  fixedItemId: item.id
                }),
                onClick: (e) => e.stopPropagation(),
                title: "Punto de Fin (F): arrastra para crear FS/FF o suelta aqu\xED para FF/SF sin mover fechas",
                className: `absolute -right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-600 hover:bg-indigo-500 hover:scale-125 shadow-sm transition-all cursor-crosshair z-30 ${showPortHandles ? "opacity-100 scale-105" : "opacity-0 group-hover:opacity-100"} ${isEndDropTarget ? isDepDropValid ? "ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100" : "ring-2 ring-rose-400 bg-rose-500 scale-125 opacity-100" : isEndConnectSource ? "ring-2 ring-emerald-400 bg-emerald-500 scale-125 opacity-100" : ""}`
              }
            )),
            slackWidth > 0 && /* @__PURE__ */ React4.createElement(
              "div",
              {
                "data-testid": `timeline-slack-bar-${item.id}`,
                style: {
                  width: slackWidth,
                  backgroundImage: "repeating-linear-gradient(45deg, rgba(245, 158, 11, 0.22) 0px, rgba(245, 158, 11, 0.22) 5px, transparent 5px, transparent 10px)"
                },
                onClick: () => guardedEditModal(item),
                title: `Holgura (Slack): +${totalSlackDays} d\xEDa(s) hasta el ${formatDateDisplay(
                  effectiveSlackEndDateStr,
                  "dd MMM yyyy"
                )}${item.hasSuccessors ? item.drivingSuccessorName ? ` (limitada por \xAB${item.drivingSuccessorName}\xBB)` : " (seg\xFAn tareas siguientes)" : " (sin tareas siguientes directas)"}`,
                className: "h-6 -ml-0.5 rounded-r-lg border-y border-r border-dashed border-amber-500/80 dark:border-amber-400/80 flex items-center justify-center px-1.5 cursor-pointer hover:bg-amber-500/10 transition"
              },
              /* @__PURE__ */ React4.createElement("span", { className: "font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-300 truncate" }, "+", totalSlackDays, "d slack")
            )
          ))
        );
      }))
    )
  ), (connectModeSource || reconnectMode) && /* @__PURE__ */ React4.createElement(
    "div",
    {
      id: "gantt-connect-mode-banner",
      "data-connect-mode-source": connectModeSource?.itemId || `${reconnectMode?.oldPredId}->${reconnectMode?.oldSuccId}`,
      onClick: (e) => e.stopPropagation(),
      className: "absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium shadow-xl border border-indigo-400/60"
    },
    /* @__PURE__ */ React4.createElement(GitBranch, { className: "w-4 h-4 shrink-0" }),
    connectModeSource ? /* @__PURE__ */ React4.createElement("span", null, "Modo conexi\xF3n desde", " ", /* @__PURE__ */ React4.createElement("strong", null, "#", enrichedItemById.get(connectModeSource.itemId)?.wbsCode || enrichedItemById.get(connectModeSource.itemId)?.wbs, " ", enrichedItemById.get(connectModeSource.itemId)?.name, " ", "(", (connectModeSource.port || (connectModeSource.role === "succ" ? "start" : "end")) === "start" ? "Inicio" : "Fin", ")"), " ", "\u2014 Haz clic en el punto Inicio o Fin de la tarea destino (solo sin mover fechas)") : /* @__PURE__ */ React4.createElement("span", null, "Reconectando", " ", /* @__PURE__ */ React4.createElement("strong", null, reconnectMode?.endpoint === "source" ? "origen (predecesora)" : "destino (sucesora)"), " ", "de la dependencia \u2014 Haz clic en la nueva tarea del diagrama"),
    /* @__PURE__ */ React4.createElement(
      "button",
      {
        type: "button",
        "data-cancel-connect-mode": "true",
        onClick: () => {
          setConnectModeSource(null);
          setReconnectMode(null);
        },
        className: "px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold transition cursor-pointer"
      },
      "Cancelar (Esc)"
    )
  ), depFeedback && /* @__PURE__ */ React4.createElement(
    "div",
    {
      id: "gantt-dep-feedback-toast",
      "data-dep-feedback-toast": depFeedback.tone,
      className: `absolute bottom-3 right-3 z-40 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xl border transition-all ${depFeedback.tone === "error" ? "bg-rose-600 text-white border-rose-400" : depFeedback.tone === "success" ? "bg-emerald-600 text-white border-emerald-400" : "bg-slate-800 text-white border-slate-700"}`
    },
    /* @__PURE__ */ React4.createElement(GitBranch, { className: "w-3.5 h-3.5 shrink-0" }),
    /* @__PURE__ */ React4.createElement("span", null, depFeedback.message)
  ), selectedDepLink && (() => {
    const predItem = enrichedItemById.get(selectedDepLink.predId);
    const succItem = enrichedItemById.get(selectedDepLink.succId);
    if (!predItem || !succItem || !succItem.dependencies.includes(predItem.id)) {
      return null;
    }
    const currentDepType = succItem.dependencyTypes?.[predItem.id] || "FS";
    const itemsWithoutCurrentLink = removeDependencyLink(
      items,
      predItem.id,
      succItem.id,
      false
    ).items;
    return /* @__PURE__ */ React4.createElement(
      "aside",
      {
        ref: depPopoverRef,
        id: "gantt-dependency-popover",
        "data-selected-dependency": `${predItem.id}->${succItem.id}`,
        onClick: (e) => e.stopPropagation(),
        onMouseDown: (e) => e.stopPropagation(),
        className: "absolute top-3 right-3 z-40 w-80 max-w-[calc(100%-24px)] bg-white dark:bg-[#0C0C09] rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 shadow-xl p-3.5 text-xs flex flex-col gap-3 transition-all"
      },
      /* @__PURE__ */ React4.createElement("div", { className: "flex items-start justify-between gap-2 pb-2 border-b border-[#E2E2DC] dark:border-zinc-800" }, /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-2 min-w-0" }, /* @__PURE__ */ React4.createElement("div", { className: "p-1.5 rounded-[4px] bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] shrink-0" }, /* @__PURE__ */ React4.createElement(GitBranch, { className: "w-4 h-4" })), /* @__PURE__ */ React4.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React4.createElement("span", { className: "font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400" }, "#", predItem.wbsCode || predItem.wbs, " \u2192 #", succItem.wbsCode || succItem.wbs), /* @__PURE__ */ React4.createElement("span", { className: "px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-mono text-[10px] font-bold" }, currentDepType)), /* @__PURE__ */ React4.createElement("h4", { className: "font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5 text-sm" }, "Editar / Mover Dependencia"))), /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-close-dep-popover": "true",
          onClick: () => {
            setSelectedDepLink(null);
            setReconnectMode(null);
          },
          className: "p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition shrink-0 cursor-pointer",
          title: "Cerrar inspector de dependencia"
        },
        /* @__PURE__ */ React4.createElement(X3, { className: "w-4 h-4" })
      )),
      /* @__PURE__ */ React4.createElement("div", { className: "flex flex-col gap-1" }, /* @__PURE__ */ React4.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React4.createElement("label", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400" }, "Tarea Origen (Predecesora)"), /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-dep-reconnect-source-btn": "true",
          onClick: () => setReconnectMode({
            oldPredId: predItem.id,
            oldSuccId: succItem.id,
            endpoint: "source",
            depType: currentDepType
          }),
          className: "text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer",
          title: "Haz clic aqu\xED y luego en otra tarea del diagrama para cambiar el origen"
        },
        "Elegir en diagrama"
      )), /* @__PURE__ */ React4.createElement(
        "select",
        {
          "data-dep-move-pred-select": "true",
          value: predItem.id,
          onChange: (e) => {
            const nextPredId = e.target.value;
            if (nextPredId && nextPredId !== predItem.id) {
              commitMoveDependency(
                predItem.id,
                succItem.id,
                nextPredId,
                succItem.id,
                currentDepType
              );
            }
          },
          className: "w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        },
        items.filter((it) => it.id !== succItem.id).map((candidate) => {
          const enriched = enrichedItemById.get(candidate.id) || candidate;
          const createsCycle = wouldCreateCycle(
            itemsWithoutCurrentLink,
            succItem.id,
            candidate.id
          );
          const isDuplicate = candidate.id !== predItem.id && succItem.dependencies.includes(candidate.id);
          return /* @__PURE__ */ React4.createElement(
            "option",
            {
              key: candidate.id,
              value: candidate.id,
              disabled: createsCycle || isDuplicate
            },
            "#",
            enriched.wbsCode || enriched.wbs,
            " ",
            enriched.name,
            createsCycle ? " (Ciclo)" : isDuplicate ? " (Ya conectada)" : ""
          );
        })
      )),
      /* @__PURE__ */ React4.createElement("div", { className: "flex flex-col gap-1" }, /* @__PURE__ */ React4.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React4.createElement("label", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400" }, "Tarea Destino (Sucesora)"), /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-dep-reconnect-target-btn": "true",
          onClick: () => setReconnectMode({
            oldPredId: predItem.id,
            oldSuccId: succItem.id,
            endpoint: "target",
            depType: currentDepType
          }),
          className: "text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer",
          title: "Haz clic aqu\xED y luego en otra tarea del diagrama para cambiar el destino"
        },
        "Elegir en diagrama"
      )), /* @__PURE__ */ React4.createElement(
        "select",
        {
          "data-dep-move-succ-select": "true",
          value: succItem.id,
          onChange: (e) => {
            const nextSuccId = e.target.value;
            if (nextSuccId && nextSuccId !== succItem.id) {
              commitMoveDependency(
                predItem.id,
                succItem.id,
                predItem.id,
                nextSuccId,
                currentDepType
              );
            }
          },
          className: "w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        },
        items.filter((it) => it.id !== predItem.id).map((candidate) => {
          const enriched = enrichedItemById.get(candidate.id) || candidate;
          const createsCycle = wouldCreateCycle(
            itemsWithoutCurrentLink,
            candidate.id,
            predItem.id
          );
          const isDuplicate = candidate.id !== succItem.id && candidate.dependencies.includes(predItem.id);
          return /* @__PURE__ */ React4.createElement(
            "option",
            {
              key: candidate.id,
              value: candidate.id,
              disabled: createsCycle || isDuplicate
            },
            "#",
            enriched.wbsCode || enriched.wbs,
            " ",
            enriched.name,
            createsCycle ? " (Ciclo)" : isDuplicate ? " (Ya conectada)" : ""
          );
        })
      )),
      /* @__PURE__ */ React4.createElement("div", { className: "flex flex-col gap-1" }, /* @__PURE__ */ React4.createElement("label", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400" }, "Tipo de Relaci\xF3n"), /* @__PURE__ */ React4.createElement("div", { className: "grid grid-cols-4 gap-1.5" }, [
        { id: "FS", label: "FS", desc: "Fin \u2192 Inicio" },
        { id: "SS", label: "SS", desc: "Inicio \u2192 Inicio" },
        { id: "FF", label: "FF", desc: "Fin \u2192 Fin" },
        { id: "SF", label: "SF", desc: "Inicio \u2192 Fin" }
      ].map((opt) => /* @__PURE__ */ React4.createElement(
        "button",
        {
          key: opt.id,
          type: "button",
          "data-dep-type-btn": opt.id,
          onClick: () => commitUpdateDependencyType(
            predItem.id,
            succItem.id,
            opt.id
          ),
          title: opt.desc,
          className: `py-1 px-1.5 rounded-lg border font-mono text-[10px] font-bold transition cursor-pointer ${currentDepType === opt.id ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"}`
        },
        opt.label
      )))),
      /* @__PURE__ */ React4.createElement("div", { className: "flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800" }, /* @__PURE__ */ React4.createElement("span", { className: "text-[10px] text-slate-400" }, "O arrastra los extremos de la flecha"), /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-dep-delete-btn": "true",
          onClick: () => commitRemoveDependency(predItem.id, succItem.id),
          className: "px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
        },
        /* @__PURE__ */ React4.createElement(Trash22, { className: "w-3.5 h-3.5" }),
        /* @__PURE__ */ React4.createElement("span", null, "Eliminar Dependencia")
      ))
    );
  })(), !useRightSidebarInspector && selectedItem && /* @__PURE__ */ React4.createElement(
    "aside",
    {
      ref: inspectionPanelRef,
      id: "gantt-inspection-panel",
      "data-selected-item-id": selectedItem.id,
      onClick: (e) => e.stopPropagation(),
      onMouseDown: (e) => e.stopPropagation(),
      className: "absolute top-3 right-3 z-40 w-80 max-w-[calc(100%-24px)] bg-white dark:bg-[#0C0C09] rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 shadow-xl p-3.5 text-xs flex flex-col gap-2.5 transition-all"
    },
    (() => {
      const selectedEffectiveColor = getItemEffectiveColor(selectedItem);
      return /* @__PURE__ */ React4.createElement("div", { className: "flex items-start justify-between gap-2 pb-2 border-b border-[#E2E2DC] dark:border-zinc-800" }, /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-2 min-w-0" }, selectedItem.type === "milestone" ? /* @__PURE__ */ React4.createElement(
        Diamond,
        {
          className: `w-4 h-4 ${(COLOR_STYLES[selectedEffectiveColor] || COLOR_STYLES.amber).diamondText} fill-current shrink-0`
        }
      ) : /* @__PURE__ */ React4.createElement(
        "span",
        {
          className: `w-3 h-3 rounded-[2px] shrink-0 ${COLOR_STYLES[selectedEffectiveColor]?.badge || "bg-indigo-500"}`
        }
      ), /* @__PURE__ */ React4.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-1.5 flex-wrap" }, /* @__PURE__ */ React4.createElement("span", { className: "font-mono text-[11px] font-bold text-slate-500 dark:text-zinc-400" }, "#", selectedItem.wbsCode || selectedItem.wbs), /* @__PURE__ */ React4.createElement(
        "span",
        {
          className: `text-[10px] font-semibold px-1.5 py-0.5 rounded-[2px] border ${selectedItem.type === "milestone" ? (COLOR_STYLES[selectedEffectiveColor] || COLOR_STYLES.amber).diamondPill : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700"}`
        },
        selectedItem.type === "milestone" ? "Hito" : "Tarea"
      ), selectedItem.isCritical && /* @__PURE__ */ React4.createElement("span", { className: "text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center gap-0.5 border border-rose-500/20" }, /* @__PURE__ */ React4.createElement(Flame, { className: "w-3 h-3 fill-current" }), "Cr\xEDtica"), selectedItem.assignee && /* @__PURE__ */ React4.createElement(
        "span",
        {
          className: `inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] font-medium border shrink-0 ${(TEAM_BADGE_STYLES[selectedEffectiveColor] || TEAM_BADGE_STYLES.indigo).container}`,
          title: `Equipo: ${selectedItem.assignee}`
        },
        /* @__PURE__ */ React4.createElement(
          "span",
          {
            className: `w-1.5 h-1.5 rounded-full shrink-0 ${(TEAM_BADGE_STYLES[selectedEffectiveColor] || TEAM_BADGE_STYLES.indigo).dot}`
          }
        ),
        /* @__PURE__ */ React4.createElement("span", { className: "truncate" }, selectedItem.assignee)
      ), selectedItem.hidden && /* @__PURE__ */ React4.createElement(
        "span",
        {
          "data-testid": `panel-hidden-badge-${selectedItem.id}`,
          className: "text-[10px] font-medium px-1.5 py-0.5 rounded-[2px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
        },
        "Oculta en diagrama"
      ), (() => {
        const itemProj = projects.find((p) => p.id === selectedItem.projectId);
        const effRelId = selectedItem.releaseId || itemProj?.releaseId;
        const effRel = effRelId ? releases?.find((r) => r.id === effRelId) : void 0;
        if (!effRel) return null;
        return /* @__PURE__ */ React4.createElement(
          "span",
          {
            "data-testid": `panel-release-badge-${selectedItem.id}`,
            className: "text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-[2px] border bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
            title: `Release: ${effRel.code}${selectedItem.releaseId ? " (espec\xEDfica de la tarea)" : " (heredada del proyecto)"}`
          },
          effRel.code
        );
      })(), (() => {
        const itemProj = projects.find((p) => p.id === selectedItem.projectId);
        const effPlatform = normalizePlatform(
          selectedItem.platform || itemProj?.platform
        );
        if (!effPlatform) return null;
        return /* @__PURE__ */ React4.createElement(
          "span",
          {
            "data-testid": `panel-platform-badge-${selectedItem.id}`,
            className: `text-[10px] font-semibold px-1.5 py-0.5 rounded-[2px] border ${effPlatform === "iOS" ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20" : effPlatform === "Android" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" : "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20"}`,
            title: `Plataforma: ${effPlatform}${selectedItem.platform ? " (espec\xEDfica de la tarea)" : " (heredada del proyecto)"}`
          },
          effPlatform
        );
      })()), /* @__PURE__ */ React4.createElement(
        "h4",
        {
          className: "font-bold text-[#0C0C09] dark:text-zinc-100 mt-1 text-sm leading-tight break-words",
          title: selectedItem.name
        },
        selectedItem.name
      ))), /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-close-inspection-panel": "true",
          onClick: () => {
            setSelectedItemId(null);
            onSelectEntity?.(null);
          },
          className: "p-1 rounded-[2px] hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-[#0C0C09] dark:hover:text-white transition shrink-0 cursor-pointer",
          title: "Cerrar panel de detalles"
        },
        /* @__PURE__ */ React4.createElement(X3, { className: "w-4 h-4" })
      ));
    })(),
    selectedItem.hasConflict && /* @__PURE__ */ React4.createElement(
      "div",
      {
        "data-testid": `panel-conflict-alert-${selectedItem.id}`,
        className: "flex items-start gap-2 p-2.5 rounded-[4px] bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-[11px]"
      },
      /* @__PURE__ */ React4.createElement(AlertTriangle2, { className: "w-4 h-4 text-rose-500 shrink-0 mt-0.5" }),
      /* @__PURE__ */ React4.createElement("div", null, /* @__PURE__ */ React4.createElement("span", { className: "font-bold block" }, "Conflicto de dependencia"), /* @__PURE__ */ React4.createElement("span", null, selectedItem.conflictMessage || "La fecha inicial es anterior a la fecha final de sus tareas predecesoras."))
    ),
    /* @__PURE__ */ React4.createElement("div", { className: "flex flex-col gap-1 p-2.5 rounded-[4px] bg-[#F4F4F1]/60 dark:bg-zinc-900/60 border border-[#E2E2DC] dark:border-zinc-800 text-[11px]" }, /* @__PURE__ */ React4.createElement("span", { className: "text-[10px] font-mono uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 font-bold" }, "Descripci\xF3n / Notas"), /* @__PURE__ */ React4.createElement(
      "p",
      {
        className: `text-xs ${selectedItem.notes?.trim() ? "text-[#0C0C09] dark:text-zinc-200 whitespace-pre-wrap" : "text-[#6B6B66]/80 dark:text-zinc-500 italic"}`
      },
      selectedItem.notes?.trim() || "Sin descripci\xF3n ni notas registradas."
    )),
    /* @__PURE__ */ React4.createElement("div", { className: "grid grid-cols-2 gap-2 p-2.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-800 font-mono text-[11px]" }, /* @__PURE__ */ React4.createElement("div", null, /* @__PURE__ */ React4.createElement("span", { className: "text-[#6B6B66] dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider block" }, "Inicio"), /* @__PURE__ */ React4.createElement("span", { className: "font-semibold text-[#0C0C09] dark:text-zinc-200" }, formatDateDisplay(selectedItem.startDate, "dd MMM yyyy"))), /* @__PURE__ */ React4.createElement("div", null, /* @__PURE__ */ React4.createElement("span", { className: "text-[#6B6B66] dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider block" }, "Fin"), /* @__PURE__ */ React4.createElement("span", { className: "font-semibold text-[#0C0C09] dark:text-zinc-200" }, selectedItem.type === "milestone" ? "-" : formatDateDisplay(selectedItem.endDate, "dd MMM yyyy"))), /* @__PURE__ */ React4.createElement("div", null, /* @__PURE__ */ React4.createElement("span", { className: "text-[#6B6B66] dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider block" }, "Duraci\xF3n"), /* @__PURE__ */ React4.createElement("span", { className: "font-semibold text-[#0C0C09] dark:text-zinc-200" }, selectedItem.duration, "d", selectedItem.slack > 0 ? ` (+${selectedItem.slack}d)` : "")), /* @__PURE__ */ React4.createElement("div", null, /* @__PURE__ */ React4.createElement("span", { className: "text-[#6B6B66] dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider block" }, "Progreso"), /* @__PURE__ */ React4.createElement("span", { className: "font-semibold text-indigo-600 dark:text-indigo-400" }, selectedItem.progress, "%"))),
    /* @__PURE__ */ React4.createElement("div", { className: "flex flex-col gap-1.5 p-2.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-800 text-[11px]" }, /* @__PURE__ */ React4.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React4.createElement("span", { className: "text-[10px] font-mono uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 font-bold" }, "Holgura Libre (Slack)"), /* @__PURE__ */ React4.createElement(
      "span",
      {
        "data-testid": `panel-free-slack-${selectedItem.id}`,
        className: `font-mono text-xs font-bold px-1.5 py-0.5 rounded-[2px] ${selectedItem.freeSlack < 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800" : selectedItem.freeSlack === 0 ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"}`
      },
      selectedItem.freeSlack > 0 ? `+${selectedItem.freeSlack}d` : `${selectedItem.freeSlack}d`,
      selectedItem.freeSlack === 0 && " (Cr\xEDtica)"
    )), /* @__PURE__ */ React4.createElement("div", { className: "pt-1 border-t border-[#E2E2DC]/70 dark:border-zinc-800/70" }, /* @__PURE__ */ React4.createElement("span", { className: "text-[10px] font-mono uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 font-semibold block mb-1" }, "Tareas Siguientes (", selectedItem.successorIds?.length || 0, "):"), selectedItem.successorIds && selectedItem.successorIds.length > 0 ? /* @__PURE__ */ React4.createElement("div", { className: "flex flex-col gap-1" }, selectedItem.successorIds.map((succId) => {
      const succItem = items.find((it) => it.id === succId);
      const isDriving = succId === selectedItem.drivingSuccessorId;
      return /* @__PURE__ */ React4.createElement(
        "div",
        {
          key: succId,
          "data-testid": `panel-successor-item-${succId}`,
          onClick: () => setSelectedItemId(succId),
          className: `flex items-center justify-between px-2 py-1 rounded-[3px] text-[11px] cursor-pointer transition ${isDriving ? "bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20" : "bg-white dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700 hover:bg-[#F4F4F1] dark:hover:bg-zinc-700"}`,
          title: `Clic para inspeccionar esta tarea siguiente. ${isDriving ? "Esta tarea limita el slack libre." : ""}`
        },
        /* @__PURE__ */ React4.createElement("span", { className: "truncate max-w-[170px] font-medium" }, succItem ? succItem.name : `#${succId}`),
        isDriving && /* @__PURE__ */ React4.createElement("span", { className: "text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold" }, "L\xEDmite")
      );
    })) : /* @__PURE__ */ React4.createElement("span", { className: "text-[10px] text-[#6B6B66] dark:text-zinc-400 italic" }, "Sin tareas siguientes directas (holgura calculada hasta fin de proyecto: +", selectedItem.freeSlack, "d)."))),
    selectedGroup?.project.locked && /* @__PURE__ */ React4.createElement("div", { className: "flex items-center justify-between gap-2 px-2 py-1 rounded-[3px] bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-[10px] text-amber-900 dark:text-amber-200" }, /* @__PURE__ */ React4.createElement("span", { className: "flex items-center gap-1 font-semibold" }, /* @__PURE__ */ React4.createElement(Lock2, { className: "w-3 h-3 shrink-0" }), /* @__PURE__ */ React4.createElement("span", null, "Proyecto bloqueado")), /* @__PURE__ */ React4.createElement(
      "button",
      {
        type: "button",
        onClick: () => handleToggleProjectLock(selectedGroup.project, false),
        className: "font-bold underline hover:text-amber-700 dark:hover:text-amber-100 cursor-pointer"
      },
      "Desbloquear"
    )),
    /* @__PURE__ */ React4.createElement("div", { className: "flex items-center justify-between gap-2 pt-1 border-t border-[#E2E2DC] dark:border-zinc-800" }, /* @__PURE__ */ React4.createElement(
      "button",
      {
        type: "button",
        "data-testid": `panel-toggle-task-visibility-${selectedItem.id}`,
        onClick: () => {
          guardedUpdateItem({ ...selectedItem, hidden: !selectedItem.hidden }, false);
        },
        className: `px-2 py-1 rounded-[3px] border text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer ${selectedItem.hidden ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20" : "border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-700"}`,
        title: selectedItem.hidden ? "Mostrar en el diagrama" : "Ocultar del diagrama"
      },
      selectedItem.hidden ? /* @__PURE__ */ React4.createElement(EyeOff, { className: "w-3.5 h-3.5" }) : /* @__PURE__ */ React4.createElement(Eye, { className: "w-3.5 h-3.5" }),
      /* @__PURE__ */ React4.createElement("span", null, selectedItem.hidden ? "Mostrar en diagrama" : "Ocultar en diagrama")
    ), onSetFocusEntity && (() => {
      const isCurrentTaskFocused = isFocusMode && focusEntity?.type === "task" && focusEntity?.id === selectedItem.id;
      return /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-testid": "panel-focus-mode-btn",
          onClick: () => {
            if (isCurrentTaskFocused) {
              onExitFocusMode ? onExitFocusMode() : onSetFocusEntity(null);
            } else {
              onSetFocusEntity({
                type: "task",
                id: selectedItem.id,
                name: selectedItem.name
              });
            }
          },
          className: `px-2 py-1 rounded-[3px] border text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer ${isCurrentTaskFocused ? "bg-amber-400 border-amber-500 text-black font-bold ring-1 ring-amber-300 shadow-xs" : "border-indigo-400/40 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"}`,
          title: isCurrentTaskFocused ? "Salir de la modalidad enfoque (clic o tecla ESC)" : "Aislar y enfocar esta tarea y su cadena de dependencias"
        },
        /* @__PURE__ */ React4.createElement(
          Sparkles,
          {
            className: `w-3.5 h-3.5 ${isCurrentTaskFocused ? "text-black fill-current" : "text-indigo-600 dark:text-indigo-400"}`
          }
        ),
        /* @__PURE__ */ React4.createElement("span", null, isCurrentTaskFocused ? "Enfocado (Salir)" : "Enfoque")
      );
    })(), /* @__PURE__ */ React4.createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          const target = selectedItem;
          if (!guardItemUnlocked(target, `editar \xAB${target.name}\xBB`)) return;
          onEditModal(target);
          setSelectedItemId(null);
        },
        className: "px-2.5 py-1 rounded-[4px] bg-[#0C0C09] hover:bg-black/80 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
      },
      /* @__PURE__ */ React4.createElement(Edit3, { className: "w-3.5 h-3.5" }),
      /* @__PURE__ */ React4.createElement("span", null, "Editar \xCDtem")
    ))
  ), inspectingProject && /* @__PURE__ */ React4.createElement(
    "div",
    {
      role: "dialog",
      "aria-modal": "true",
      "data-testid": "project-details-modal",
      onClick: (e) => {
        if (e.target === e.currentTarget) {
          setInspectingProject(null);
        }
      },
      className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    },
    /* @__PURE__ */ React4.createElement(
      "div",
      {
        onClick: (e) => e.stopPropagation(),
        className: "w-full max-w-lg bg-white dark:bg-[#0C0C09] border border-[#0C0C09] dark:border-zinc-700 rounded-[8px] shadow-2xl p-5 space-y-4"
      },
      /* @__PURE__ */ React4.createElement("div", { className: "flex items-center justify-between border-b border-[#E2E2DC] dark:border-zinc-800 pb-3" }, /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React4.createElement(
        "span",
        {
          className: `px-2 py-0.5 rounded text-[11px] font-mono font-bold text-white shrink-0 ${COLOR_STYLES[inspectingProject.color]?.badge || "bg-indigo-500"}`
        },
        "Proyecto"
      ), /* @__PURE__ */ React4.createElement("h3", { className: "text-sm font-bold text-[#0C0C09] dark:text-white truncate" }, inspectingProject.name)), /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-testid": "close-project-modal-btn",
          onClick: () => setInspectingProject(null),
          className: "p-1 rounded-[4px] hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-[#0C0C09] dark:hover:text-white transition cursor-pointer"
        },
        /* @__PURE__ */ React4.createElement(X3, { className: "w-4 h-4" })
      )),
      /* @__PURE__ */ React4.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React4.createElement("div", null, /* @__PURE__ */ React4.createElement("label", { className: "block text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 mb-1" }, "Nombre del Proyecto"), /* @__PURE__ */ React4.createElement(
        "input",
        {
          type: "text",
          "data-testid": "project-modal-name-input",
          value: inspectingProject.name,
          onChange: (e) => setInspectingProject({
            ...inspectingProject,
            name: e.target.value
          }),
          className: "w-full px-3 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-[#0C0C09] dark:text-zinc-100 outline-none focus:ring-1 focus:ring-indigo-500"
        }
      )), /* @__PURE__ */ React4.createElement("div", null, /* @__PURE__ */ React4.createElement("label", { className: "block text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 mb-1.5" }, "Color del Proyecto"), /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-1.5 flex-wrap" }, PROJECT_COLORS.map((c) => /* @__PURE__ */ React4.createElement(
        "button",
        {
          key: c.value,
          type: "button",
          onClick: () => setInspectingProject({
            ...inspectingProject,
            color: c.value
          }),
          "data-testid": `project-color-opt-${c.value}`,
          title: c.value,
          className: `w-6 h-6 rounded-full ${c.bg} flex items-center justify-center transition cursor-pointer ${inspectingProject.color === c.value ? "ring-2 ring-offset-2 ring-[#0C0C09] dark:ring-white scale-110" : "opacity-70 hover:opacity-100"}`
        },
        inspectingProject.color === c.value && /* @__PURE__ */ React4.createElement(Check2, { className: "w-3 h-3 text-white" })
      ))), onChangeProjectColor && /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-testid": "apply-color-to-all-tasks-modal-btn",
          onClick: () => {
            guardedChangeProjectColor(inspectingProject.id, inspectingProject.color);
          },
          className: "mt-2 w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[4px] border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
        },
        /* @__PURE__ */ React4.createElement(Palette, { className: "w-3.5 h-3.5" }),
        /* @__PURE__ */ React4.createElement("span", null, "Aplicar este color a todas las tareas del proyecto")
      )), /* @__PURE__ */ React4.createElement("div", null, /* @__PURE__ */ React4.createElement("label", { className: "block text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 mb-1" }, "Bloqueo en el Cronograma"), /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-testid": "project-modal-lock-toggle",
          onClick: () => setInspectingProject({
            ...inspectingProject,
            locked: !inspectingProject.locked
          }),
          className: `w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[4px] border text-xs font-semibold transition cursor-pointer ${inspectingProject.locked ? "border-amber-500/50 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200" : "border-[#E2E2DC] dark:border-zinc-700 bg-[#F4F4F1]/60 dark:bg-zinc-800/70 text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800"}`
        },
        /* @__PURE__ */ React4.createElement("span", { className: "flex items-center gap-2" }, inspectingProject.locked ? /* @__PURE__ */ React4.createElement(Lock2, { className: "w-4 h-4 text-amber-600 dark:text-amber-400" }) : /* @__PURE__ */ React4.createElement(Unlock2, { className: "w-4 h-4 text-slate-500 dark:text-zinc-400" }), /* @__PURE__ */ React4.createElement("span", null, inspectingProject.locked ? "Proyecto bloqueado (evita movimientos accidentales)" : "Proyecto desbloqueado (editable libremente)")),
        /* @__PURE__ */ React4.createElement("span", { className: "text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/80 dark:bg-zinc-900 border border-current/20" }, inspectingProject.locked ? "Desbloquear" : "Bloquear")
      )), /* @__PURE__ */ React4.createElement("div", null, /* @__PURE__ */ React4.createElement("label", { className: "block text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 mb-1" }, "Release Asociada"), /* @__PURE__ */ React4.createElement(
        "select",
        {
          "data-testid": "project-modal-release-select",
          value: inspectingProject.releaseId || "",
          onChange: (e) => setInspectingProject({
            ...inspectingProject,
            releaseId: e.target.value || void 0
          }),
          className: "w-full px-2.5 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-[#0C0C09] dark:text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500"
        },
        /* @__PURE__ */ React4.createElement("option", { value: "" }, "Ninguna (Sin Release asignada)"),
        releases?.map((r) => /* @__PURE__ */ React4.createElement("option", { key: r.id, value: r.id }, r.code, " ", r.name ? `\u2014 ${r.name}` : ""))
      )), /* @__PURE__ */ React4.createElement("div", null, /* @__PURE__ */ React4.createElement("label", { className: "block text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 mb-1" }, "Plataforma"), /* @__PURE__ */ React4.createElement(
        "select",
        {
          "data-testid": "project-modal-platform-select",
          value: normalizePlatform(inspectingProject.platform) || "iOS/Android",
          onChange: (e) => setInspectingProject({
            ...inspectingProject,
            platform: e.target.value
          }),
          className: "w-full px-2.5 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-[#0C0C09] dark:text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
        },
        /* @__PURE__ */ React4.createElement("option", { value: "iOS/Android" }, "iOS/Android"),
        /* @__PURE__ */ React4.createElement("option", { value: "iOS" }, "iOS"),
        /* @__PURE__ */ React4.createElement("option", { value: "Android" }, "Android")
      )), /* @__PURE__ */ React4.createElement("div", null, /* @__PURE__ */ React4.createElement("label", { className: "block text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 mb-1" }, "Nivel de Alerta"), /* @__PURE__ */ React4.createElement(
        "select",
        {
          "data-testid": "project-modal-alert-select",
          value: inspectingProject.alertLevel ?? 0,
          onChange: (e) => setInspectingProject({
            ...inspectingProject,
            alertLevel: Number(e.target.value)
          }),
          className: "w-full px-2.5 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-[#0C0C09] dark:text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
        },
        /* @__PURE__ */ React4.createElement("option", { value: 0 }, "Nivel 0 \u2014 Normal (Sin alerta)"),
        /* @__PURE__ */ React4.createElement("option", { value: 1 }, "Nivel 1 \u2014 Baja (Alerta leve)"),
        /* @__PURE__ */ React4.createElement("option", { value: 2 }, "Nivel 2 \u2014 Media (Alerta moderada)"),
        /* @__PURE__ */ React4.createElement("option", { value: 3 }, "Nivel 3 \u2014 Alta (Alerta cr\xEDtica)")
      )), /* @__PURE__ */ React4.createElement("div", null, /* @__PURE__ */ React4.createElement("label", { className: "block text-[11px] font-mono font-bold uppercase tracking-wider text-[#6B6B66] dark:text-zinc-400 mb-1" }, "Informaci\xF3n / Descripci\xF3n del Proyecto"), /* @__PURE__ */ React4.createElement(
        "textarea",
        {
          rows: 4,
          "data-testid": "project-modal-description-input",
          value: inspectingProject.description || "",
          onChange: (e) => setInspectingProject({
            ...inspectingProject,
            description: e.target.value
          }),
          placeholder: "Describe los objetivos del proyecto, alcance, entregables clave, notas o enlaces de documentaci\xF3n...",
          className: "w-full px-3 py-2 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-[#0C0C09] dark:text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500 resize-y min-h-[68px]"
        }
      ))),
      (() => {
        const grp = allProjectGroups.find((g) => g.project.id === inspectingProject.id);
        if (!grp) return null;
        return /* @__PURE__ */ React4.createElement("div", { className: "grid grid-cols-3 gap-2 p-2.5 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-900 border border-[#E2E2DC] dark:border-zinc-800 text-[11px] font-mono" }, /* @__PURE__ */ React4.createElement("div", null, /* @__PURE__ */ React4.createElement("span", { className: "text-[#6B6B66] dark:text-zinc-400 block text-[10px] uppercase font-bold" }, "Fechas"), /* @__PURE__ */ React4.createElement("span", { className: "font-semibold text-[#0C0C09] dark:text-zinc-200" }, grp.items.length > 0 ? `${formatDateDisplay(grp.startDate, "dd/MM/yy")} \u2192 ${formatDateDisplay(grp.endDate, "dd/MM/yy")}` : "\u2014")), /* @__PURE__ */ React4.createElement("div", null, /* @__PURE__ */ React4.createElement("span", { className: "text-[#6B6B66] dark:text-zinc-400 block text-[10px] uppercase font-bold" }, "Duraci\xF3n"), /* @__PURE__ */ React4.createElement("span", { className: "font-semibold text-[#0C0C09] dark:text-zinc-200" }, grp.duration, "d (", grp.items.length, " \xEDtems)")), /* @__PURE__ */ React4.createElement("div", null, /* @__PURE__ */ React4.createElement("span", { className: "text-[#6B6B66] dark:text-zinc-400 block text-[10px] uppercase font-bold" }, "Progreso"), /* @__PURE__ */ React4.createElement("span", { className: "font-semibold text-indigo-600 dark:text-indigo-400" }, grp.progress, "%")));
      })(),
      /* @__PURE__ */ React4.createElement("div", { className: "flex items-center justify-between gap-2 pt-2 border-t border-[#E2E2DC] dark:border-zinc-800" }, onSetFocusEntity && (() => {
        const isCurrentProjFocused = isFocusMode && focusEntity?.type === "project" && focusEntity?.id === inspectingProject.id;
        return /* @__PURE__ */ React4.createElement(
          "button",
          {
            type: "button",
            "data-testid": "project-modal-focus-btn",
            onClick: () => {
              if (isCurrentProjFocused) {
                onExitFocusMode ? onExitFocusMode() : onSetFocusEntity(null);
              } else {
                onSetFocusEntity({
                  type: "project",
                  id: inspectingProject.id,
                  name: inspectingProject.name
                });
              }
              setInspectingProject(null);
            },
            className: `px-2.5 py-1.5 rounded-[4px] border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${isCurrentProjFocused ? "bg-amber-400 border-amber-500 text-black font-bold ring-1 ring-amber-300 shadow-xs" : "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"}`,
            title: isCurrentProjFocused ? "Salir de la modalidad enfoque (clic o tecla ESC)" : "Enfocar este proyecto en el diagrama Gantt"
          },
          /* @__PURE__ */ React4.createElement(
            Sparkles,
            {
              className: `w-3.5 h-3.5 ${isCurrentProjFocused ? "text-black fill-current" : "text-indigo-600 dark:text-indigo-400"}`
            }
          ),
          /* @__PURE__ */ React4.createElement("span", null, isCurrentProjFocused ? "Salir de Enfoque" : "Modo Enfoque")
        );
      })(), /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-2 ml-auto" }, /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          onClick: () => setInspectingProject(null),
          className: "px-3 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-[#0C0C09] dark:text-zinc-200 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 transition cursor-pointer"
        },
        "Cancelar"
      ), /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-testid": "save-project-details-btn",
          onClick: () => {
            const savedProj = projectsRef.current.find(
              (p) => p.id === inspectingProject.id
            );
            const hasNonLockEdits = !savedProj || savedProj.name !== inspectingProject.name || savedProj.color !== inspectingProject.color || (savedProj.releaseId || "") !== (inspectingProject.releaseId || "") || (savedProj.platform || "") !== (inspectingProject.platform || "") || (savedProj.alertLevel ?? 0) !== (inspectingProject.alertLevel ?? 0) || (savedProj.description || "") !== (inspectingProject.description || "");
            if (savedProj?.locked && inspectingProject.locked) {
              if (hasNonLockEdits) {
                guardedUpdateProject(
                  inspectingProject,
                  "editar propiedades de proyecto bloqueado"
                );
                return;
              }
              setInspectingProject(null);
              return;
            }
            onUpdateProject?.(inspectingProject);
            setInspectingProject(null);
          },
          className: "px-4 py-1.5 rounded-[4px] bg-[#0C0C09] hover:bg-[#312C85] dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-[#0C0C09] font-medium text-xs transition cursor-pointer"
        },
        "Guardar Informaci\xF3n"
      )))
    )
  ), hasMultiSelection && /* @__PURE__ */ React4.createElement(
    "div",
    {
      "data-testid": "multi-select-action-bar",
      className: "fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 rounded-[6px] border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm shadow-lg text-xs"
    },
    /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-1.5 pr-2 border-r border-zinc-200 dark:border-zinc-700" }, /* @__PURE__ */ React4.createElement(MoveHorizontal, { className: "w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" }), /* @__PURE__ */ React4.createElement("span", { className: "font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap" }, effectiveMultiItemIds.size, " ", effectiveMultiItemIds.size === 1 ? "tarea" : "tareas", multiSelectedProjectIds.size > 0 ? ` \xB7 ${multiSelectedProjectIds.size} ${multiSelectedProjectIds.size === 1 ? "proyecto" : "proyectos"}` : "")),
    /* @__PURE__ */ React4.createElement("div", { className: "flex items-center gap-1" }, [
      { label: "-7d", days: -7 },
      { label: "-1d", days: -1 },
      { label: "+1d", days: 1 },
      { label: "+7d", days: 7 }
    ].map((step) => /* @__PURE__ */ React4.createElement(
      "button",
      {
        key: step.label,
        type: "button",
        "data-testid": `multi-shift-${step.days}`,
        onClick: () => shiftItemsByDays(
          effectiveMultiItemIds,
          step.days,
          `mover selecci\xF3n m\xFAltiple (${step.label})`
        ),
        disabled: effectiveMultiItemIds.size === 0,
        title: `Desplazar selecci\xF3n ${step.label}`,
        className: "px-2 py-1 rounded-[4px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 dark:hover:bg-indigo-950/50 dark:hover:border-indigo-700 dark:hover:text-indigo-300 font-mono text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 disabled:opacity-40 transition cursor-pointer"
      },
      step.label
    ))),
    /* @__PURE__ */ React4.createElement(
      "button",
      {
        type: "button",
        "data-testid": "multi-select-clear",
        onClick: clearMultiSelection,
        className: "ml-1 px-2 py-1 rounded-[4px] text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
      },
      "Limpiar"
    )
  ), dragRowPreview && (() => {
    const enrichedDragged = enrichedItemById.get(dragRowPreview.itemId);
    const draggedItem = enrichedDragged || effectiveItems.find((it) => it.id === dragRowPreview.itemId) || items.find((it) => it.id === dragRowPreview.itemId);
    if (!draggedItem) return null;
    const draggedEffectiveColor = getItemEffectiveColor(draggedItem);
    const draggedStyleTheme = COLOR_STYLES[draggedEffectiveColor] || COLOR_STYLES.indigo;
    const draggedWbsLabel = enrichedDragged?.wbsCode || `${draggedItem.wbs}.`;
    const sourceGroup = allProjectGroups.find(
      (g) => g.items.some((it) => it.id === draggedItem.id)
    );
    const sourceProjectId = sourceGroup?.project.id || draggedItem.projectId || projects[0]?.id;
    let targetProjId;
    if (dragOverRow) {
      if (dragOverRow.id.startsWith("project:")) {
        targetProjId = dragOverRow.id.slice("project:".length);
      } else {
        const targetItem = items.find((it) => it.id === dragOverRow.id);
        targetProjId = targetItem?.projectId || projects[0]?.id;
      }
    }
    const targetProjectName = targetProjId && targetProjId !== sourceProjectId ? projects.find((p) => p.id === targetProjId)?.name || null : null;
    const previewItems = draggingMultiRowIds && draggingMultiRowIds.size > 1 ? displayRows.filter(
      (r) => r.kind === "item" && draggingMultiRowIds.has(r.item.id)
    ).map((r) => r.item) : [draggedItem];
    return /* @__PURE__ */ React4.createElement(
      "div",
      {
        "data-testid": "task-row-drag-ghost",
        "data-dragging-item-id": draggedItem.id,
        className: "fixed top-0 left-0 pointer-events-none z-[100] select-none",
        style: {
          width: dragRowPreview.width,
          transform: `translate3d(${Math.round(dragRowPreview.x - dragRowPreview.offsetX)}px, ${Math.round(dragRowPreview.y - dragRowPreview.offsetY)}px, 0)`,
          willChange: "transform"
        }
      },
      /* @__PURE__ */ React4.createElement("div", { className: "bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-2 border-indigo-600 dark:border-indigo-400 rounded-[6px] shadow-2xl ring-4 ring-indigo-500/15 overflow-hidden divide-y divide-indigo-100 dark:divide-zinc-800" }, previewItems.map((pItem, pIdx) => {
        const pColor = getItemEffectiveColor(pItem);
        const pTheme = COLOR_STYLES[pColor] || COLOR_STYLES.indigo;
        const pWbsLabel = enrichedItemById.get(pItem.id)?.wbsCode || `${pItem.wbs}.`;
        return /* @__PURE__ */ React4.createElement(
          "div",
          {
            key: `ghost-item-${pItem.id}`,
            style: { height: ROW_HEIGHT },
            className: "px-3 flex items-center gap-2 text-xs"
          },
          /* @__PURE__ */ React4.createElement(GripVertical, { className: "w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" }),
          /* @__PURE__ */ React4.createElement("span", { className: "font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-300 border border-[#E2E2DC] dark:border-zinc-700 shrink-0 font-semibold" }, pWbsLabel),
          pItem.type === "milestone" ? /* @__PURE__ */ React4.createElement(Diamond, { className: `w-3.5 h-3.5 ${pTheme.diamondText} fill-current shrink-0` }) : /* @__PURE__ */ React4.createElement("span", { className: `w-2.5 h-2.5 rounded-[2px] shrink-0 ${pTheme.badge}` }),
          /* @__PURE__ */ React4.createElement("span", { className: "font-semibold text-[#0C0C09] dark:text-zinc-100 truncate flex-1" }, pItem.name || (pItem.type === "milestone" ? "Hito" : "Tarea")),
          pIdx === 0 && previewItems.length > 1 && /* @__PURE__ */ React4.createElement(
            "span",
            {
              "data-testid": "task-row-drag-ghost-count",
              className: "px-1.5 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px] font-bold shrink-0"
            },
            previewItems.length,
            " tareas"
          ),
          /* @__PURE__ */ React4.createElement("span", { className: "font-mono text-[10px] text-[#6B6B66] dark:text-zinc-300 bg-[#F4F4F1] dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0" }, formatDateDisplay(pItem.startDate, "dd MMM"), pItem.type === "task" ? ` \xB7 ${pItem.duration}d` : "")
        );
      })),
      targetProjectName && /* @__PURE__ */ React4.createElement("div", { className: "mt-1 inline-flex items-center px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-semibold shadow-lg" }, `\u2192 Mover a: ${targetProjectName}`)
    );
  })(), dragProjectPreview && (() => {
    const draggedGroup = allProjectGroups.find(
      (g) => g.project.id === dragProjectPreview.projectId
    );
    const draggedProject = draggedGroup?.project || projects.find((p) => p.id === dragProjectPreview.projectId);
    if (!draggedProject) return null;
    const draggedProjTheme = COLOR_STYLES[draggedProject.color] || COLOR_STYLES.indigo;
    const projectBadgeLabel = draggedGroup?.projectIndex != null ? `P${draggedGroup.projectIndex}` : typeof draggedProject.projectIndex === "number" ? `P${draggedProject.projectIndex}` : "P";
    const targetProject = dragOverProject ? projects.find((p) => p.id === dragOverProject.id) || null : null;
    return /* @__PURE__ */ React4.createElement(
      "div",
      {
        "data-testid": "project-row-drag-ghost",
        "data-dragging-project-id": draggedProject.id,
        className: "fixed top-0 left-0 pointer-events-none z-[100] select-none",
        style: {
          width: dragProjectPreview.width,
          transform: `translate3d(${Math.round(dragProjectPreview.x - dragProjectPreview.offsetX)}px, ${Math.round(dragProjectPreview.y - dragProjectPreview.offsetY)}px, 0)`,
          willChange: "transform"
        }
      },
      /* @__PURE__ */ React4.createElement(
        "div",
        {
          style: { height: ROW_HEIGHT },
          className: "bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-2 border-indigo-600 dark:border-indigo-400 rounded-[6px] shadow-2xl ring-4 ring-indigo-500/15 px-3 flex items-center gap-2 text-xs font-semibold"
        },
        /* @__PURE__ */ React4.createElement(GripVertical, { className: "w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" }),
        /* @__PURE__ */ React4.createElement(
          "span",
          {
            className: `px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white shrink-0 ${draggedProjTheme.badge}`
          },
          projectBadgeLabel
        ),
        /* @__PURE__ */ React4.createElement("span", { className: "font-semibold text-[#0C0C09] dark:text-zinc-100 truncate flex-1" }, draggedProject.name || "Proyecto"),
        /* @__PURE__ */ React4.createElement("span", { className: "font-mono text-[10px] text-[#6B6B66] dark:text-zinc-300 bg-[#F4F4F1] dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0" }, draggedGroup ? `${draggedGroup.duration}d \xB7 ${draggedGroup.progress}%` : "Proyecto")
      ),
      targetProject && /* @__PURE__ */ React4.createElement("div", { className: "mt-1 inline-flex items-center px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-semibold shadow-lg" }, dragOverProject?.position === "before" ? `\u2191 Antes de: ${targetProject.name}` : `\u2193 Despu\xE9s de: ${targetProject.name}`)
    );
  })(), contextMenu && (() => {
    const maxLeft = typeof window !== "undefined" ? Math.max(8, window.innerWidth - 252) : 960;
    const maxTop = typeof window !== "undefined" ? Math.max(8, window.innerHeight - 340) : 500;
    const menuLeft = Math.max(8, Math.min(contextMenu.x, maxLeft));
    const menuTop = Math.max(8, Math.min(contextMenu.y, maxTop));
    if (contextMenu.type === "project") {
      const targetProject = projects.find((p) => p.id === contextMenu.id);
      if (!targetProject) return null;
      const isCurrentProjFocused = isFocusMode && focusEntity?.type === "project" && focusEntity?.id === targetProject.id;
      return /* @__PURE__ */ React4.createElement(
        "div",
        {
          "data-testid": "wbs-context-menu",
          "data-context-type": "project",
          "data-context-id": targetProject.id,
          style: { left: menuLeft, top: menuTop },
          onClick: (e) => e.stopPropagation(),
          className: "fixed z-[110] w-60 bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[6px] shadow-2xl py-1.5 text-xs text-[#0C0C09] dark:text-zinc-100 select-none"
        },
        /* @__PURE__ */ React4.createElement("div", { className: "px-3 py-1.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2" }, /* @__PURE__ */ React4.createElement("span", { className: "font-bold truncate" }, targetProject.name || "Proyecto"), /* @__PURE__ */ React4.createElement("span", { className: "text-[10px] font-mono text-slate-400 uppercase shrink-0" }, "Proyecto")),
        (() => {
          const projUrl = resolveElementUrl(targetProject);
          if (!projUrl) return null;
          return /* @__PURE__ */ React4.createElement(
            "a",
            {
              href: projUrl,
              target: "_blank",
              rel: "noopener noreferrer",
              "data-testid": `context-open-url-project-${targetProject.id}`,
              onClick: () => setContextMenu(null),
              className: "w-full px-3 py-1.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center gap-2 cursor-pointer font-medium",
              title: projUrl
            },
            /* @__PURE__ */ React4.createElement(ExternalLink, { className: "w-3.5 h-3.5 shrink-0" }),
            /* @__PURE__ */ React4.createElement("span", { className: "truncate" }, "Abrir enlace")
          );
        })(),
        /* @__PURE__ */ React4.createElement(
          "button",
          {
            type: "button",
            "data-testid": `project-info-btn-${targetProject.id}`,
            onClick: () => {
              setInspectingProject(targetProject);
              setContextMenu(null);
            },
            className: "w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
          },
          /* @__PURE__ */ React4.createElement(FileText, { className: "w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" }),
          /* @__PURE__ */ React4.createElement("span", null, "Detalles, notas y release")
        ),
        /* @__PURE__ */ React4.createElement(
          "button",
          {
            type: "button",
            "data-testid": `project-lock-btn-${targetProject.id}`,
            "data-project-locked": targetProject.locked ? "true" : "false",
            onClick: () => {
              handleToggleProjectLock(targetProject);
              setContextMenu(null);
            },
            className: "w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
          },
          targetProject.locked ? /* @__PURE__ */ React4.createElement(React4.Fragment, null, /* @__PURE__ */ React4.createElement(Unlock2, { className: "w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" }), /* @__PURE__ */ React4.createElement("span", null, "Desbloquear proyecto")) : /* @__PURE__ */ React4.createElement(React4.Fragment, null, /* @__PURE__ */ React4.createElement(Lock2, { className: "w-3.5 h-3.5 text-slate-500 shrink-0" }), /* @__PURE__ */ React4.createElement("span", null, "Bloquear proyecto"))
        ),
        onSetFocusEntity && /* @__PURE__ */ React4.createElement(
          "button",
          {
            type: "button",
            "data-testid": `focus-project-${targetProject.id}`,
            onClick: () => {
              if (isCurrentProjFocused) {
                onExitFocusMode ? onExitFocusMode() : onSetFocusEntity(null);
              } else {
                onSetFocusEntity({
                  type: "project",
                  id: targetProject.id,
                  name: targetProject.name
                });
              }
              setContextMenu(null);
            },
            className: "w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
          },
          /* @__PURE__ */ React4.createElement(Sparkles, { className: `w-3.5 h-3.5 shrink-0 ${isCurrentProjFocused ? "text-amber-500 fill-current" : "text-slate-500"}` }),
          /* @__PURE__ */ React4.createElement("span", null, isCurrentProjFocused ? "Salir de modo enfoque" : "Enfocar proyecto")
        ),
        /* @__PURE__ */ React4.createElement(
          "button",
          {
            type: "button",
            "data-fit-project-row": targetProject.id,
            onClick: () => {
              handleFitProjectAction(targetProject.id);
              setContextMenu(null);
            },
            className: "w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
          },
          /* @__PURE__ */ React4.createElement(Maximize2, { className: "w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" }),
          /* @__PURE__ */ React4.createElement("span", null, "Encajar en pantalla")
        ),
        /* @__PURE__ */ React4.createElement("div", { className: "my-1 border-t border-slate-200 dark:border-zinc-800" }),
        /* @__PURE__ */ React4.createElement(
          "button",
          {
            type: "button",
            onClick: () => {
              guardedQuickAdd("task", targetProject.id);
              setContextMenu(null);
            },
            className: "w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
          },
          /* @__PURE__ */ React4.createElement(Plus2, { className: "w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" }),
          /* @__PURE__ */ React4.createElement("span", null, "A\xF1adir tarea")
        ),
        /* @__PURE__ */ React4.createElement(
          "button",
          {
            type: "button",
            onClick: () => {
              guardedQuickAdd("milestone", targetProject.id);
              setContextMenu(null);
            },
            className: "w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
          },
          /* @__PURE__ */ React4.createElement(Diamond, { className: "w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" }),
          /* @__PURE__ */ React4.createElement("span", null, "A\xF1adir hito")
        ),
        /* @__PURE__ */ React4.createElement("div", { className: "my-1 border-t border-slate-200 dark:border-zinc-800" }),
        /* @__PURE__ */ React4.createElement("div", { className: "px-3 py-1.5", "data-testid": `project-color-picker-btn-${targetProject.id}` }, /* @__PURE__ */ React4.createElement("div", { className: "text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5" }, /* @__PURE__ */ React4.createElement(Palette, { className: "w-3 h-3" }), /* @__PURE__ */ React4.createElement("span", null, "Color de proyecto")), /* @__PURE__ */ React4.createElement("div", { className: "grid grid-cols-5 gap-1.5" }, PROJECT_COLORS.map((c) => /* @__PURE__ */ React4.createElement(
          "button",
          {
            key: c.value,
            type: "button",
            "data-testid": `project-inline-color-opt-${c.value}`,
            onClick: () => {
              if (!guardProjectUnlocked(targetProject.id, "cambiar color de proyecto bloqueado")) {
                setContextMenu(null);
                return;
              }
              guardedChangeProjectColor(targetProject.id, c.value);
              setContextMenu(null);
            },
            title: c.value,
            className: `w-5 h-5 rounded-full ${c.bg} flex items-center justify-center transition cursor-pointer hover:scale-110 ${targetProject.color === c.value ? "ring-2 ring-black dark:ring-white ring-offset-1" : ""}`
          },
          targetProject.color === c.value && /* @__PURE__ */ React4.createElement(Check2, { className: "w-2.5 h-2.5 text-white" })
        )))),
        onDeleteProject && /* @__PURE__ */ React4.createElement(React4.Fragment, null, /* @__PURE__ */ React4.createElement("div", { className: "my-1 border-t border-slate-200 dark:border-zinc-800" }), /* @__PURE__ */ React4.createElement(
          "button",
          {
            type: "button",
            "data-testid": `delete-project-row-btn-${targetProject.id}`,
            onClick: () => {
              setContextMenu(null);
              guardedDeleteProject(targetProject.id);
            },
            className: "w-full px-3 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer font-medium"
          },
          /* @__PURE__ */ React4.createElement(Trash22, { className: "w-3.5 h-3.5 shrink-0" }),
          /* @__PURE__ */ React4.createElement("span", null, "Eliminar proyecto")
        ))
      );
    }
    const targetItem = enrichedItemById.get(contextMenu.id) || effectiveItems.find((it) => it.id === contextMenu.id) || items.find((it) => it.id === contextMenu.id);
    if (!targetItem) return null;
    return /* @__PURE__ */ React4.createElement(
      "div",
      {
        "data-testid": "wbs-context-menu",
        "data-context-type": "task",
        "data-context-id": targetItem.id,
        style: { left: menuLeft, top: menuTop },
        onClick: (e) => e.stopPropagation(),
        className: "fixed z-[110] w-56 bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[6px] shadow-2xl py-1.5 text-xs text-[#0C0C09] dark:text-zinc-100 select-none"
      },
      /* @__PURE__ */ React4.createElement("div", { className: "px-3 py-1.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2" }, /* @__PURE__ */ React4.createElement("span", { className: "font-bold truncate" }, targetItem.name || (targetItem.type === "milestone" ? "Hito" : "Tarea")), /* @__PURE__ */ React4.createElement("span", { className: "text-[10px] font-mono text-slate-400 uppercase shrink-0" }, targetItem.type === "milestone" ? "Hito" : "Tarea")),
      (() => {
        const itemUrl = resolveElementUrl(targetItem);
        if (!itemUrl) return null;
        return /* @__PURE__ */ React4.createElement(
          "a",
          {
            href: itemUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            "data-testid": `context-open-url-task-${targetItem.id}`,
            onClick: () => setContextMenu(null),
            className: "w-full px-3 py-1.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center gap-2 cursor-pointer font-medium",
            title: itemUrl
          },
          /* @__PURE__ */ React4.createElement(ExternalLink, { className: "w-3.5 h-3.5 shrink-0" }),
          /* @__PURE__ */ React4.createElement("span", { className: "truncate" }, "Abrir enlace")
        );
      })(),
      /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          "data-testid": `toggle-task-visibility-${targetItem.id}`,
          onClick: () => {
            guardedUpdateItem({ ...targetItem, hidden: !targetItem.hidden }, false);
            setContextMenu(null);
          },
          className: "w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
        },
        targetItem.hidden ? /* @__PURE__ */ React4.createElement(React4.Fragment, null, /* @__PURE__ */ React4.createElement(Eye, { className: "w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" }), /* @__PURE__ */ React4.createElement("span", null, "Mostrar en el diagrama")) : /* @__PURE__ */ React4.createElement(React4.Fragment, null, /* @__PURE__ */ React4.createElement(EyeOff, { className: "w-3.5 h-3.5 text-slate-500 shrink-0" }), /* @__PURE__ */ React4.createElement("span", null, "Ocultar del diagrama"))
      ),
      /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            guardedEditModal(targetItem);
            setContextMenu(null);
          },
          className: "w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
        },
        /* @__PURE__ */ React4.createElement(Edit3, { className: "w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" }),
        /* @__PURE__ */ React4.createElement("span", null, "Editar detalles completos")
      ),
      /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            guardedDuplicateItem(targetItem);
            setContextMenu(null);
          },
          className: "w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
        },
        /* @__PURE__ */ React4.createElement(Copy, { className: "w-3.5 h-3.5 text-slate-500 shrink-0" }),
        /* @__PURE__ */ React4.createElement("span", null, "Duplicar \xEDtem")
      ),
      /* @__PURE__ */ React4.createElement("div", { className: "my-1 border-t border-slate-200 dark:border-zinc-800" }),
      /* @__PURE__ */ React4.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            setContextMenu(null);
            guardedDeleteItem(targetItem.id);
          },
          className: "w-full px-3 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer font-medium"
        },
        /* @__PURE__ */ React4.createElement(Trash22, { className: "w-3.5 h-3.5 shrink-0" }),
        /* @__PURE__ */ React4.createElement("span", null, "Eliminar \xEDtem")
      )
    );
  })(), /* @__PURE__ */ React4.createElement(
    ProjectLockedAlertModal,
    {
      project: lockedAlertState?.project || null,
      attemptedAction: lockedAlertState?.attemptedAction,
      onUnlock: (proj) => handleToggleProjectLock(proj, false),
      onClose: () => setLockedAlertState(null)
    }
  )));
};

// src/components/ReportsView.tsx
import React6, { useState as useState4, useMemo as useMemo3, useRef as useRef3, useEffect as useEffect5 } from "react";
import {
  FileSpreadsheet,
  Download,
  Layers,
  FolderKanban as FolderKanban2,
  FolderPlus as FolderPlus2,
  Flag,
  Eye as Eye2,
  Crosshair,
  Rocket as Rocket2,
  CheckCircle2,
  AlertTriangle as AlertTriangle3,
  Flame as Flame2,
  Link2,
  X as X5,
  ChevronDown as ChevronDown2,
  SlidersHorizontal as SlidersHorizontal3,
  Check as Check4,
  LayoutTemplate,
  Plus as Plus4,
  Trash2 as Trash24,
  Pencil as Pencil2,
  Bookmark as Bookmark2
} from "lucide-react";

// src/components/ProjectWizardModal.tsx
import React5, { useEffect as useEffect4, useMemo as useMemo2, useState as useState3 } from "react";
import {
  Calendar as Calendar2,
  Check as Check3,
  FolderPlus,
  Plus as Plus3,
  RotateCcw,
  Sparkles as Sparkles2,
  Trash2 as Trash23,
  X as X4
} from "lucide-react";
var WIZARD_SUBTASK_PRESETS = {
  DIGI: { label: "+ DIGI", name: "DIGI", team: "MC" },
  ARQ: { label: "+ ARQ", name: "ARQ", team: "ARQ" },
  QA: { label: "+ QA", name: "QA", team: "QA" }
};
function getReleaseQg5Date(release) {
  if (!release) return void 0;
  const qg5 = (release.milestones || []).find(
    (m) => m && m.date && (m.key?.toLowerCase() === "qg5" || m.code?.trim().toUpperCase() === "QG5")
  );
  if (qg5?.date) return qg5.date;
  const span = getReleaseDateSpan(release);
  return span.endDate || release.endDate;
}
var PLATFORMS = ["iOS/Android", "iOS", "Android"];
var BASE_TEAMS = ["ARQ", "MC", "QA", "Arquitectura", "AWS/DevOps", "Core"];
function diffCalendarDays(start, end) {
  const d1 = /* @__PURE__ */ new Date(`${start}T00:00:00`);
  const d2 = /* @__PURE__ */ new Date(`${end}T00:00:00`);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 1;
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 864e5) + 1);
}
var ProjectWizardModal = ({
  isOpen,
  onClose,
  releases,
  existingTeams = [],
  initialReleaseId,
  initialStep = 1,
  onCreate
}) => {
  const todayISO = useMemo2(() => formatDateISO(/* @__PURE__ */ new Date()), []);
  const defaultReleaseId = initialReleaseId || releases[0]?.id || "";
  const initialRelease = releases.find((r) => r.id === defaultReleaseId) || releases[0];
  const initialQg5 = getReleaseQg5Date(initialRelease) || todayISO;
  const [step, setStep] = useState3(initialStep);
  const [releaseId, setReleaseId] = useState3(defaultReleaseId);
  const [name, setName] = useState3("");
  const [platform, setPlatform] = useState3("iOS/Android");
  const [team, setTeam] = useState3("MC");
  const [startMode, setStartMode] = useState3("today");
  const [startDate, setStartDate] = useState3(todayISO);
  const [endDate, setEndDate] = useState3(initialQg5);
  const [endDateEdited, setEndDateEdited] = useState3(false);
  const [subtasks, setSubtasks] = useState3([]);
  const [nextId, setNextId] = useState3(1);
  useEffect4(() => {
    if (!isOpen) return;
    const relId = initialReleaseId || releases[0]?.id || "";
    const rel = releases.find((r) => r.id === relId) || releases[0];
    const qg5 = getReleaseQg5Date(rel) || todayISO;
    setStep(initialStep);
    setReleaseId(relId);
    setName("");
    setPlatform("iOS/Android");
    setTeam("MC");
    setStartMode("today");
    setStartDate(todayISO);
    setEndDate(qg5);
    setEndDateEdited(false);
    setSubtasks([]);
    setNextId(1);
  }, [isOpen, initialReleaseId, initialStep, releases, todayISO]);
  useEffect4(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);
  const teamOptions = useMemo2(() => {
    const set = new Set(BASE_TEAMS);
    for (const t of existingTeams) {
      if (t && t.trim()) set.add(t.trim());
    }
    return Array.from(set);
  }, [existingTeams]);
  const selectedRelease = useMemo2(
    () => releases.find((r) => r.id === releaseId),
    [releases, releaseId]
  );
  const currentQg5 = useMemo2(() => getReleaseQg5Date(selectedRelease), [selectedRelease]);
  const propagate = (nextStart, nextEnd, nextPlat, nextTeam) => {
    setSubtasks(
      (prev) => prev.map((st) => ({
        ...st,
        startDate: st.overrides.startDate ? st.startDate : nextStart,
        endDate: st.overrides.endDate ? st.endDate : nextEnd,
        platform: st.overrides.platform ? st.platform : nextPlat,
        team: st.overrides.team ? st.team : nextTeam
      }))
    );
  };
  const handleReleaseChange = (nextRelId) => {
    setReleaseId(nextRelId);
    const rel = releases.find((r) => r.id === nextRelId);
    const qg5 = getReleaseQg5Date(rel);
    if (qg5 && !endDateEdited) {
      setEndDate(qg5);
      propagate(startDate, qg5, platform, team);
    }
  };
  const handleStartModeChange = (mode) => {
    setStartMode(mode);
    if (mode === "today") {
      setStartDate(todayISO);
      propagate(todayISO, endDate, platform, team);
    }
  };
  const handleStartDateChange = (val) => {
    setStartDate(val);
    setStartMode(val === todayISO ? "today" : "custom");
    propagate(val, endDate, platform, team);
  };
  const handleEndDateChange = (val) => {
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
  const handlePlatformChange = (nextPlat) => {
    setPlatform(nextPlat);
    propagate(startDate, endDate, nextPlat, team);
  };
  const handleTeamChange = (nextTeam) => {
    setTeam(nextTeam);
    propagate(startDate, endDate, platform, nextTeam);
  };
  const handleAddPresetSubtask = (presetKey) => {
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
            team: preset.team !== team
          }
        }
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
        overrides: { startDate: false, endDate: false, platform: false, team: false }
      }
    ]);
  };
  const handleUpdateSubtask = (id, field, value) => {
    setSubtasks(
      (prev) => prev.map((st) => {
        if (st.id !== id) return st;
        const next = { ...st, [field]: value };
        if (field === "startDate") next.overrides = { ...st.overrides, startDate: value !== startDate };
        if (field === "endDate") next.overrides = { ...st.overrides, endDate: value !== endDate };
        if (field === "platform") next.overrides = { ...st.overrides, platform: value !== platform };
        if (field === "team") next.overrides = { ...st.overrides, team: value !== team };
        return next;
      })
    );
  };
  const handleReInheritSubtask = (id) => {
    setSubtasks(
      (prev) => prev.map(
        (st) => st.id === id ? {
          ...st,
          startDate,
          endDate,
          platform,
          team,
          overrides: { startDate: false, endDate: false, platform: false, team: false }
        } : st
      )
    );
  };
  const handleRemoveSubtask = (id) => {
    setSubtasks((prev) => prev.filter((st) => st.id !== id));
  };
  const handleSubmit = () => {
    const trimmedName = name.trim() || "Nuevo Proyecto";
    onCreate({
      project: {
        name: trimmedName,
        releaseId: releaseId || void 0,
        platform,
        color: "indigo"
      },
      subtasks: subtasks.map((st) => ({
        name: st.name.trim() || "Subtarea",
        startDate: st.startDate || startDate,
        endDate: st.endDate >= st.startDate ? st.endDate : st.startDate,
        platform: st.platform,
        assignee: st.team.trim() || void 0
      }))
    });
    onClose();
  };
  if (!isOpen) return null;
  const hasAnyOverride = (st) => st.overrides.startDate || st.overrides.endDate || st.overrides.platform || st.overrides.team;
  const allStarts = [startDate, ...subtasks.map((s) => s.startDate)].filter(Boolean);
  const allEnds = [endDate, ...currentQg5 ? [currentQg5] : [], ...subtasks.map((s) => s.endDate)].filter(Boolean);
  const minD = allStarts.reduce((a, b) => a < b ? a : b, startDate);
  const maxD = allEnds.reduce((a, b) => a > b ? a : b, endDate);
  const totalSpan = Math.max(1, diffCalendarDays(minD, maxD));
  const pct = (d) => Math.max(0, Math.min(100, (diffCalendarDays(minD, d) - 1) / totalSpan * 100));
  const qg5Left = currentQg5 ? Math.min(98, pct(currentQg5)) : null;
  return /* @__PURE__ */ React5.createElement(
    "div",
    {
      "data-testid": "project-wizard-modal",
      className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-4",
      onMouseDown: (e) => {
        if (e.target === e.currentTarget) onClose();
      }
    },
    /* @__PURE__ */ React5.createElement("div", { className: "w-full max-w-3xl rounded-[8px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" }, /* @__PURE__ */ React5.createElement("div", { className: "px-5 py-3.5 border-b border-[#E2E2DC] dark:border-zinc-800 bg-[#F4F4F1] dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-3" }, /* @__PURE__ */ React5.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React5.createElement(FolderPlus, { className: "w-4 h-4 text-indigo-600 dark:text-indigo-400" }), /* @__PURE__ */ React5.createElement("h2", { className: "text-sm font-bold text-[#0C0C09] dark:text-zinc-100" }, "Asistente de Nuevo Proyecto")), /* @__PURE__ */ React5.createElement("div", { className: "flex items-center gap-1.5" }, [
      { num: 1, label: "1. Proyecto" },
      { num: 2, label: `2. Subtareas (${subtasks.length})` },
      { num: 3, label: "3. Resumen" }
    ].map((s) => /* @__PURE__ */ React5.createElement(
      "button",
      {
        key: s.num,
        type: "button",
        "data-testid": `wizard-step-tab-${s.num}`,
        onClick: () => setStep(s.num),
        className: `px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition ${step === s.num ? "bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]" : step > s.num ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300" : "border border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400"}`
      },
      s.label
    )), /* @__PURE__ */ React5.createElement(
      "button",
      {
        type: "button",
        "data-testid": "wizard-close-btn",
        onClick: onClose,
        className: "ml-1 p-1 rounded text-[#6B6B66] hover:text-[#0C0C09] dark:hover:text-white cursor-pointer",
        "aria-label": "Cerrar asistente"
      },
      /* @__PURE__ */ React5.createElement(X4, { className: "w-4 h-4" })
    ))), /* @__PURE__ */ React5.createElement("div", { className: "p-5 overflow-y-auto flex-1 space-y-4 text-xs" }, step === 1 && /* @__PURE__ */ React5.createElement("div", { "data-testid": "wizard-step-1", className: "space-y-4" }, /* @__PURE__ */ React5.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ React5.createElement("div", null, /* @__PURE__ */ React5.createElement("label", { className: "block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1" }, "Release"), /* @__PURE__ */ React5.createElement(
      "select",
      {
        "data-testid": "wizard-release-select",
        value: releaseId,
        onChange: (e) => handleReleaseChange(e.target.value),
        className: "w-full px-2.5 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
      },
      /* @__PURE__ */ React5.createElement("option", { value: "" }, "Sin release"),
      releases.map((r) => {
        const qg5 = getReleaseQg5Date(r);
        return /* @__PURE__ */ React5.createElement("option", { key: r.id, value: r.id }, r.code, " ", qg5 ? `(QG5: ${qg5})` : "");
      })
    )), /* @__PURE__ */ React5.createElement("div", null, /* @__PURE__ */ React5.createElement("label", { className: "block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1" }, "Nombre del Proyecto"), /* @__PURE__ */ React5.createElement(
      "input",
      {
        type: "text",
        "data-testid": "wizard-project-name-input",
        value: name,
        onChange: (e) => setName(e.target.value),
        placeholder: "Ej. HDEV-747747: Xcode 27",
        className: "w-full px-2.5 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium"
      }
    ))), /* @__PURE__ */ React5.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ React5.createElement("div", null, /* @__PURE__ */ React5.createElement("label", { className: "block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1" }, "Plataforma"), /* @__PURE__ */ React5.createElement("div", { className: "grid grid-cols-3 gap-1 p-0.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-[#FAFAF8] dark:bg-zinc-800/60" }, PLATFORMS.map((p) => /* @__PURE__ */ React5.createElement(
      "button",
      {
        key: p,
        type: "button",
        "data-testid": `wizard-platform-${p}`,
        onClick: () => handlePlatformChange(p),
        className: `py-1 px-2 rounded-[3px] text-[11px] font-semibold cursor-pointer transition ${platform === p ? "bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]" : "text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-white"}`
      },
      p
    )))), /* @__PURE__ */ React5.createElement("div", null, /* @__PURE__ */ React5.createElement("label", { className: "block text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 mb-1" }, "Equipo por defecto"), /* @__PURE__ */ React5.createElement(
      "input",
      {
        type: "text",
        list: "wizard-team-options",
        "data-testid": "wizard-team-input",
        value: team,
        onChange: (e) => handleTeamChange(e.target.value),
        placeholder: "Ej. MC, ARQ, QA...",
        className: "w-full px-2.5 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
      }
    ), /* @__PURE__ */ React5.createElement("datalist", { id: "wizard-team-options" }, teamOptions.map((t) => /* @__PURE__ */ React5.createElement("option", { key: t, value: t }))))), /* @__PURE__ */ React5.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-[6px] bg-[#FAFAF8] dark:bg-zinc-800/40 border border-[#E2E2DC] dark:border-zinc-800" }, /* @__PURE__ */ React5.createElement("div", null, /* @__PURE__ */ React5.createElement("div", { className: "flex items-center justify-between mb-1.5" }, /* @__PURE__ */ React5.createElement("label", { className: "text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400 flex items-center gap-1" }, /* @__PURE__ */ React5.createElement(Calendar2, { className: "w-3 h-3" }), /* @__PURE__ */ React5.createElement("span", null, "Fecha de Inicio")), /* @__PURE__ */ React5.createElement("div", { className: "inline-flex rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 overflow-hidden text-[10px]" }, /* @__PURE__ */ React5.createElement(
      "button",
      {
        type: "button",
        "data-testid": "wizard-start-today-btn",
        onClick: () => handleStartModeChange("today"),
        className: `px-2 py-0.5 cursor-pointer font-semibold ${startMode === "today" ? "bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]" : "text-[#6B6B66] dark:text-zinc-400"}`
      },
      "Hoy"
    ), /* @__PURE__ */ React5.createElement(
      "button",
      {
        type: "button",
        "data-testid": "wizard-start-custom-btn",
        onClick: () => handleStartModeChange("custom"),
        className: `px-2 py-0.5 cursor-pointer font-semibold ${startMode === "custom" ? "bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09]" : "text-[#6B6B66] dark:text-zinc-400"}`
      },
      "Otra fecha"
    ))), /* @__PURE__ */ React5.createElement(
      "input",
      {
        type: "date",
        "data-testid": "wizard-start-date-input",
        value: startDate,
        disabled: startMode === "today",
        onChange: (e) => handleStartDateChange(e.target.value),
        className: "w-full px-2.5 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs disabled:opacity-60"
      }
    )), /* @__PURE__ */ React5.createElement("div", null, /* @__PURE__ */ React5.createElement("div", { className: "flex items-center justify-between mb-1.5" }, /* @__PURE__ */ React5.createElement("label", { className: "text-[10px] font-mono uppercase font-bold text-[#6B6B66] dark:text-zinc-400" }, "Fecha L\xEDmite"), currentQg5 && (endDateEdited ? /* @__PURE__ */ React5.createElement(
      "button",
      {
        type: "button",
        "data-testid": "wizard-reset-qg5-btn",
        onClick: handleResetToQg5,
        className: "text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-0.5"
      },
      /* @__PURE__ */ React5.createElement(RotateCcw, { className: "w-2.5 h-2.5" }),
      /* @__PURE__ */ React5.createElement("span", null, `QG5 (${currentQg5})`)
    ) : /* @__PURE__ */ React5.createElement(
      "span",
      {
        "data-testid": "wizard-qg5-badge",
        className: "px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
      },
      `= QG5 ${selectedRelease?.code || ""}`
    ))), /* @__PURE__ */ React5.createElement(
      "input",
      {
        type: "date",
        "data-testid": "wizard-end-date-input",
        value: endDate,
        onChange: (e) => handleEndDateChange(e.target.value),
        className: "w-full px-2.5 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
      }
    )))), step === 2 && /* @__PURE__ */ React5.createElement("div", { "data-testid": "wizard-step-2", className: "space-y-3" }, /* @__PURE__ */ React5.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E2E2DC] dark:border-zinc-800" }, /* @__PURE__ */ React5.createElement("div", { className: "text-[11px] text-[#6B6B66] dark:text-zinc-400" }, "Hereda por defecto:", " ", /* @__PURE__ */ React5.createElement("strong", { className: "font-mono text-[#0C0C09] dark:text-zinc-200" }, startDate, " \u2192 ", endDate), " ", "\xB7 ", /* @__PURE__ */ React5.createElement("strong", { className: "text-[#0C0C09] dark:text-zinc-200" }, platform), " \xB7", " ", /* @__PURE__ */ React5.createElement("strong", { className: "text-[#0C0C09] dark:text-zinc-200" }, team || "Sin equipo")), /* @__PURE__ */ React5.createElement("div", { className: "flex items-center gap-1.5 flex-wrap" }, /* @__PURE__ */ React5.createElement(
      "button",
      {
        type: "button",
        "data-testid": "wizard-add-preset-DIGI",
        onClick: () => handleAddPresetSubtask("DIGI"),
        className: "px-2 py-1 rounded-[3px] border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold hover:bg-indigo-100 cursor-pointer",
        title: "Crear subtarea DIGI asignada al equipo MC"
      },
      "+ DIGI ",
      /* @__PURE__ */ React5.createElement("span", { className: "opacity-70 font-mono text-[10px]" }, "(MC)")
    ), /* @__PURE__ */ React5.createElement(
      "button",
      {
        type: "button",
        "data-testid": "wizard-add-preset-ARQ",
        onClick: () => handleAddPresetSubtask("ARQ"),
        className: "px-2 py-1 rounded-[3px] border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-[11px] font-semibold hover:bg-violet-100 cursor-pointer",
        title: "Crear subtarea ARQ asignada al equipo ARQ"
      },
      "+ ARQ ",
      /* @__PURE__ */ React5.createElement("span", { className: "opacity-70 font-mono text-[10px]" }, "(ARQ)")
    ), /* @__PURE__ */ React5.createElement(
      "button",
      {
        type: "button",
        "data-testid": "wizard-add-preset-QA",
        onClick: () => handleAddPresetSubtask("QA"),
        className: "px-2 py-1 rounded-[3px] border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold hover:bg-emerald-100 cursor-pointer",
        title: "Crear subtarea QA asignada al equipo QA"
      },
      "+ QA ",
      /* @__PURE__ */ React5.createElement("span", { className: "opacity-70 font-mono text-[10px]" }, "(QA)")
    ), /* @__PURE__ */ React5.createElement(
      "button",
      {
        type: "button",
        "data-testid": "wizard-add-subtask-btn",
        onClick: () => handleAddPresetSubtask(),
        className: "px-2.5 py-1 rounded-[3px] bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
      },
      /* @__PURE__ */ React5.createElement(Plus3, { className: "w-3 h-3" }),
      /* @__PURE__ */ React5.createElement("span", null, "Subtarea")
    ))), subtasks.length === 0 ? /* @__PURE__ */ React5.createElement("div", { className: "py-8 text-center rounded-[6px] border border-dashed border-[#E2E2DC] dark:border-zinc-700 text-[#6B6B66] dark:text-zinc-400" }, "Sin subtareas todav\xEDa. A\xF1ade subtareas con los botones r\xE1pidos (", /* @__PURE__ */ React5.createElement("strong", null, "+ DIGI"), ",", " ", /* @__PURE__ */ React5.createElement("strong", null, "+ ARQ"), ", ", /* @__PURE__ */ React5.createElement("strong", null, "+ QA"), ") o contin\xFAa para crear solo el proyecto.") : /* @__PURE__ */ React5.createElement("div", { className: "space-y-2" }, subtasks.map((st) => {
      const overQg5 = Boolean(currentQg5 && st.endDate > currentQg5);
      return /* @__PURE__ */ React5.createElement(
        "div",
        {
          key: st.id,
          "data-testid": `wizard-subtask-row-${st.id}`,
          className: "p-2.5 rounded-[5px] bg-[#FAFAF8] dark:bg-zinc-800/40 border border-[#E2E2DC] dark:border-zinc-700 space-y-2"
        },
        /* @__PURE__ */ React5.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React5.createElement(
          "input",
          {
            type: "text",
            value: st.name,
            onChange: (e) => handleUpdateSubtask(st.id, "name", e.target.value),
            className: "flex-1 px-2 py-1 rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium"
          }
        ), /* @__PURE__ */ React5.createElement(
          "span",
          {
            className: `px-1.5 py-0.5 rounded text-[10px] font-mono ${hasAnyOverride(st) ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800" : "bg-white dark:bg-zinc-900 text-[#6B6B66] dark:text-zinc-400 border border-[#E2E2DC] dark:border-zinc-700"}`
          },
          hasAnyOverride(st) ? "Editado" : "Heredado"
        ), hasAnyOverride(st) && /* @__PURE__ */ React5.createElement(
          "button",
          {
            type: "button",
            onClick: () => handleReInheritSubtask(st.id),
            title: "Restaurar fechas, plataforma y equipo del proyecto",
            className: "p-1 text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          },
          /* @__PURE__ */ React5.createElement(RotateCcw, { className: "w-3 h-3" })
        ), /* @__PURE__ */ React5.createElement(
          "button",
          {
            type: "button",
            onClick: () => handleRemoveSubtask(st.id),
            title: "Eliminar subtarea",
            className: "p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
          },
          /* @__PURE__ */ React5.createElement(Trash23, { className: "w-3.5 h-3.5" })
        )),
        /* @__PURE__ */ React5.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2" }, /* @__PURE__ */ React5.createElement(
          "input",
          {
            type: "date",
            value: st.startDate,
            onChange: (e) => handleUpdateSubtask(st.id, "startDate", e.target.value),
            className: "px-2 py-1 rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px]"
          }
        ), /* @__PURE__ */ React5.createElement(
          "input",
          {
            type: "date",
            value: st.endDate,
            onChange: (e) => handleUpdateSubtask(st.id, "endDate", e.target.value),
            className: `px-2 py-1 rounded-[3px] border bg-white dark:bg-zinc-900 text-[11px] ${overQg5 ? "border-rose-500 text-rose-600 dark:text-rose-400" : "border-[#E2E2DC] dark:border-zinc-700"}`
          }
        ), /* @__PURE__ */ React5.createElement(
          "select",
          {
            value: st.platform,
            onChange: (e) => handleUpdateSubtask(st.id, "platform", e.target.value),
            className: "px-2 py-1 rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px]"
          },
          PLATFORMS.map((p) => /* @__PURE__ */ React5.createElement("option", { key: p, value: p }, p))
        ), /* @__PURE__ */ React5.createElement(
          "input",
          {
            type: "text",
            list: "wizard-team-options",
            value: st.team,
            onChange: (e) => handleUpdateSubtask(st.id, "team", e.target.value),
            placeholder: "Equipo...",
            className: "px-2 py-1 rounded-[3px] border border-[#E2E2DC] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px]"
          }
        ))
      );
    }))), step === 3 && /* @__PURE__ */ React5.createElement("div", { "data-testid": "wizard-step-3", className: "space-y-4" }, /* @__PURE__ */ React5.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2" }, /* @__PURE__ */ React5.createElement("div", { className: "p-2.5 rounded-[5px] bg-[#FAFAF8] dark:bg-zinc-800/40 border border-[#E2E2DC] dark:border-zinc-800" }, /* @__PURE__ */ React5.createElement("div", { className: "text-[10px] font-mono uppercase text-[#6B6B66] dark:text-zinc-400" }, "Release"), /* @__PURE__ */ React5.createElement("div", { className: "font-bold font-mono mt-0.5" }, selectedRelease?.code || "Sin release")), /* @__PURE__ */ React5.createElement("div", { className: "p-2.5 rounded-[5px] bg-[#FAFAF8] dark:bg-zinc-800/40 border border-[#E2E2DC] dark:border-zinc-800" }, /* @__PURE__ */ React5.createElement("div", { className: "text-[10px] font-mono uppercase text-[#6B6B66] dark:text-zinc-400" }, "Plataforma"), /* @__PURE__ */ React5.createElement("div", { className: "font-bold mt-0.5" }, platform)), /* @__PURE__ */ React5.createElement("div", { className: "p-2.5 rounded-[5px] bg-[#FAFAF8] dark:bg-zinc-800/40 border border-[#E2E2DC] dark:border-zinc-800" }, /* @__PURE__ */ React5.createElement("div", { className: "text-[10px] font-mono uppercase text-[#6B6B66] dark:text-zinc-400" }, "Equipo base"), /* @__PURE__ */ React5.createElement("div", { className: "font-bold mt-0.5" }, team || "\u2014")), /* @__PURE__ */ React5.createElement("div", { className: "p-2.5 rounded-[5px] bg-[#FAFAF8] dark:bg-zinc-800/40 border border-[#E2E2DC] dark:border-zinc-800" }, /* @__PURE__ */ React5.createElement("div", { className: "text-[10px] font-mono uppercase text-[#6B6B66] dark:text-zinc-400" }, "Ventana"), /* @__PURE__ */ React5.createElement("div", { className: "font-bold font-mono mt-0.5" }, diffCalendarDays(startDate, endDate), "d"))), /* @__PURE__ */ React5.createElement("div", { className: "p-3 rounded-[6px] border border-[#E2E2DC] dark:border-zinc-800 bg-[#FAFAF8] dark:bg-zinc-900/60 space-y-2" }, /* @__PURE__ */ React5.createElement("div", { className: "flex items-center justify-between text-[10px] font-mono text-[#6B6B66] dark:text-zinc-400" }, /* @__PURE__ */ React5.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React5.createElement(Sparkles2, { className: "w-3 h-3 text-indigo-500" }), `Vista previa (${minD} \u2192 ${maxD})`), currentQg5 && /* @__PURE__ */ React5.createElement("span", { className: "text-amber-700 dark:text-amber-400 font-semibold" }, `\u2502 QG5 ${selectedRelease?.code || ""}: ${currentQg5}`)), /* @__PURE__ */ React5.createElement("div", { className: "space-y-1.5" }, /* @__PURE__ */ React5.createElement("div", { className: "grid grid-cols-12 items-center gap-2 text-[11px]" }, /* @__PURE__ */ React5.createElement("div", { className: "col-span-5 truncate font-semibold" }, name.trim() || "Nuevo Proyecto"), /* @__PURE__ */ React5.createElement("div", { className: "col-span-7 relative h-4 rounded bg-white dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700 overflow-hidden" }, /* @__PURE__ */ React5.createElement(
      "div",
      {
        style: {
          left: `${pct(startDate)}%`,
          width: `${Math.min(100 - pct(startDate), Math.max(4, diffCalendarDays(startDate, endDate) / totalSpan * 100))}%`
        },
        className: "absolute top-0 bottom-0 rounded bg-indigo-500/85"
      }
    ), qg5Left !== null && /* @__PURE__ */ React5.createElement("div", { style: { left: `${qg5Left}%` }, className: "absolute top-0 bottom-0 w-0.5 bg-amber-500" }))), subtasks.map((st) => {
      const l = pct(st.startDate);
      const w = Math.max(4, diffCalendarDays(st.startDate, st.endDate) / totalSpan * 100);
      const over = Boolean(currentQg5 && st.endDate > currentQg5);
      return /* @__PURE__ */ React5.createElement("div", { key: st.id, className: "grid grid-cols-12 items-center gap-2 text-[11px]" }, /* @__PURE__ */ React5.createElement("div", { className: "col-span-5 truncate pl-3 text-[#6B6B66] dark:text-zinc-400" }, `\u21B3 ${st.name} (${st.team || "\u2014"})`), /* @__PURE__ */ React5.createElement("div", { className: "col-span-7 relative h-3.5 rounded bg-white dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700 overflow-hidden" }, /* @__PURE__ */ React5.createElement(
        "div",
        {
          style: { left: `${l}%`, width: `${Math.min(100 - l, w)}%` },
          className: `absolute top-0 bottom-0 rounded ${over ? "bg-rose-500/85" : "bg-emerald-500/80"}`
        }
      ), qg5Left !== null && /* @__PURE__ */ React5.createElement("div", { style: { left: `${qg5Left}%` }, className: "absolute top-0 bottom-0 w-0.5 bg-amber-500" })));
    }))))), /* @__PURE__ */ React5.createElement("div", { className: "px-5 py-3 border-t border-[#E2E2DC] dark:border-zinc-800 bg-[#FAFAF8] dark:bg-zinc-900 flex items-center justify-between" }, /* @__PURE__ */ React5.createElement(
      "button",
      {
        type: "button",
        disabled: step === 1,
        onClick: () => setStep((s) => s === 3 ? 2 : 1),
        className: "px-3 py-1.5 rounded-[4px] border border-[#E2E2DC] dark:border-zinc-700 text-xs font-medium cursor-pointer disabled:opacity-40"
      },
      "\u2190 Anterior"
    ), step < 3 ? /* @__PURE__ */ React5.createElement(
      "button",
      {
        type: "button",
        "data-testid": "wizard-next-btn",
        onClick: () => setStep((s) => s === 1 ? 2 : 3),
        className: "px-4 py-1.5 rounded-[4px] bg-[#0C0C09] text-white dark:bg-zinc-100 dark:text-[#0C0C09] text-xs font-semibold cursor-pointer"
      },
      "Siguiente \u2192"
    ) : /* @__PURE__ */ React5.createElement(
      "button",
      {
        type: "button",
        "data-testid": "wizard-confirm-create-btn",
        onClick: handleSubmit,
        className: "px-4 py-1.5 rounded-[4px] bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
      },
      /* @__PURE__ */ React5.createElement(Check3, { className: "w-3.5 h-3.5" }),
      /* @__PURE__ */ React5.createElement("span", null, subtasks.length > 0 ? `Crear proyecto y ${subtasks.length} subtarea(s)` : "Crear proyecto")
    )))
  );
};

// src/utils/excelExportEngine.ts
import * as XLSX2 from "xlsx";
var CRONOGRAMA_HEADER = [
  "Jerarqu\xEDa",
  "Nombre",
  "Release Asignada",
  "Proyecto",
  "Plataforma",
  "Equipo",
  "Nivel de Alerta",
  "Tipo",
  "Fecha Inicio",
  "Fecha Fin",
  "Duraci\xF3n (D\xEDas)",
  "Holgura / Slack (D\xEDas)",
  "Progreso (%)",
  "Dependencia (Predecesora)",
  "Ruta Cr\xEDtica",
  "Hito Externo",
  "Cumplimiento Release",
  "Notas / Descripci\xF3n"
];
var RELEASE_SUMMARY_HEADER = [
  "C\xF3digo",
  "Nombre",
  "Mes",
  "Fecha Inicio",
  "Fecha Fin",
  "Duraci\xF3n (D\xEDas)",
  "Proyectos Asignados",
  "Hitos Clave"
];
function resolveDependencyName(depId, allItems, item) {
  const target = allItems.find(
    (it) => it.id === depId || String(it.wbs ?? "") === depId
  );
  const depType = item.dependencyTypes?.[depId] || "FS";
  if (target) {
    return `${target.name} (${depType})`;
  }
  return `${depId} (${depType})`;
}
function collectProjectTeams(items) {
  const uniqueTeams = Array.from(
    new Set(items.map((it) => it.assignee ? it.assignee.trim() : "").filter(Boolean))
  );
  return uniqueTeams.length > 0 ? uniqueTeams.join(", ") : "\u2014";
}
function generateCronogramaCompletoRows(releases, projects, items) {
  const rows = [];
  if (releases && releases.length > 0) {
    const releaseGroups = groupItemsByReleaseAndProject(items, projects, releases);
    for (const rg of releaseGroups) {
      rows.push({
        rowId: `rel-${rg.release.id}`,
        level: "RELEASE",
        hierarchyLabel: "RELEASE",
        displayId: rg.release.code,
        wbsCode: rg.release.code,
        name: rg.release.name,
        releaseCode: rg.release.code,
        releaseId: rg.release.id,
        projectName: "\u2014",
        platform: "\u2014",
        team: "\u2014",
        alertLevel: void 0,
        type: "Release",
        startDate: rg.startDate,
        endDate: rg.endDate,
        duration: rg.duration,
        slack: 0,
        progress: `${rg.progress}%`,
        dependency: "\u2014",
        dependencyPredecessorName: "\u2014",
        isCritical: false,
        isExternal: false,
        compliance: "Conforme",
        notes: "\u2014"
      });
      for (const pg of rg.projectGroups) {
        const platformLabel = normalizePlatform(pg.project.platform) || "iOS/Android";
        rows.push({
          rowId: `proj-${pg.project.id}`,
          level: "PROYECTO",
          hierarchyLabel: "  \u2514\u2500 PROYECTO",
          displayId: `P${pg.projectIndex}`,
          wbsCode: `P${pg.projectIndex}`,
          name: pg.project.name,
          releaseCode: rg.release.code,
          releaseId: rg.release.id,
          projectName: pg.project.name,
          projectId: pg.project.id,
          platform: platformLabel,
          team: collectProjectTeams(pg.items),
          alertLevel: pg.project.alertLevel ?? 0,
          type: "Proyecto",
          startDate: pg.startDate,
          endDate: pg.endDate,
          duration: pg.duration,
          slack: 0,
          progress: `${pg.progress}%`,
          dependency: "\u2014",
          dependencyPredecessorName: "\u2014",
          isCritical: false,
          isExternal: false,
          compliance: "Conforme",
          notes: pg.project.description?.trim() || "\u2014"
        });
        for (const item of pg.items) {
          const isMilestone = item.type === "milestone";
          const typeLabel = isMilestone ? "Hito" : "Tarea";
          const levelLabel = isMilestone ? "      \u2514\u2500 HITO" : "      \u2514\u2500 TAREA";
          const wbsCode = String(item.wbs ?? item.id);
          const isCritical = Boolean(item.isCritical);
          const isExternal = Boolean(item.isExternal);
          const effectiveRel = item.releaseId ? releases.find((r) => r.id === item.releaseId) || rg.release : rg.release;
          const effectiveReleaseCode = effectiveRel?.code || rg.release.code;
          const effectiveReleaseId = effectiveRel?.id || rg.release.id;
          const violations = checkTaskReleaseCompliance(item, pg.project, effectiveRel);
          const complianceLabel = violations.length === 0 ? "Conforme" : `Alerta: ${violations[0].milestoneCode} (+${violations[0].daysLate}d)`;
          const deps = item.dependencies || [];
          const depNames = deps.map((depId) => resolveDependencyName(depId, items, item));
          const depTargetNames = deps.map((depId) => {
            const targetItem = items.find(
              (it) => it.id === depId || String(it.wbs ?? "") === depId
            );
            return targetItem ? targetItem.name : depId;
          });
          rows.push({
            rowId: `${item.id}-0`,
            itemId: item.id,
            level: isMilestone ? "HITO" : "TAREA",
            hierarchyLabel: levelLabel,
            displayId: item.displayId || (item.projectId ? `P${pg.projectIndex}T${item.taskIndex || item.wbs}` : `T${item.taskIndex || item.wbs}`),
            wbsCode,
            name: item.name,
            releaseCode: effectiveReleaseCode,
            releaseId: effectiveReleaseId,
            projectName: pg.project.name,
            projectId: pg.project.id,
            platform: normalizePlatform(item.platform) || platformLabel,
            team: item.assignee?.trim() || "\u2014",
            alertLevel: item.alertLevel ?? pg.project.alertLevel ?? 0,
            type: typeLabel,
            startDate: item.startDate,
            endDate: item.endDate,
            duration: item.duration,
            slack: item.slack || 0,
            progress: `${item.progress || 0}%`,
            dependency: depNames.length > 0 ? depNames.join(", ") : "\u2014",
            dependencyPredecessorName: depTargetNames.length > 0 ? depTargetNames.join(", ") : "\u2014",
            isCritical,
            isExternal,
            compliance: complianceLabel,
            notes: item.notes?.trim() || "\u2014",
            isDepRow: false
          });
        }
      }
    }
  } else {
    const projectGroups = groupItemsByProject(items, projects);
    for (const pg of projectGroups) {
      const platformLabel = normalizePlatform(pg.project.platform) || "iOS/Android";
      rows.push({
        rowId: `proj-${pg.project.id}`,
        level: "PROYECTO",
        hierarchyLabel: "PROYECTO",
        displayId: `P${pg.projectIndex}`,
        wbsCode: `P${pg.projectIndex}`,
        name: pg.project.name,
        releaseCode: "\u2014",
        projectName: pg.project.name,
        projectId: pg.project.id,
        platform: platformLabel,
        team: collectProjectTeams(pg.items),
        alertLevel: pg.project.alertLevel ?? 0,
        type: "Proyecto",
        startDate: pg.startDate,
        endDate: pg.endDate,
        duration: pg.duration,
        slack: 0,
        progress: `${pg.progress}%`,
        dependency: "\u2014",
        dependencyPredecessorName: "\u2014",
        isCritical: false,
        isExternal: false,
        compliance: "Conforme",
        notes: pg.project.description?.trim() || "\u2014"
      });
      for (const item of pg.items) {
        const isMilestone = item.type === "milestone";
        const typeLabel = isMilestone ? "Hito" : "Tarea";
        const levelLabel = isMilestone ? "  \u2514\u2500 HITO" : "  \u2514\u2500 TAREA";
        const wbsCode = String(item.wbs ?? item.id);
        const isCritical = Boolean(item.isCritical);
        const isExternal = Boolean(item.isExternal);
        const deps = item.dependencies || [];
        const depNames = deps.map((depId) => resolveDependencyName(depId, items, item));
        const depTargetNames = deps.map((depId) => {
          const targetItem = items.find(
            (it) => it.id === depId || String(it.wbs ?? "") === depId
          );
          return targetItem ? targetItem.name : depId;
        });
        rows.push({
          rowId: `${item.id}-0`,
          itemId: item.id,
          level: isMilestone ? "HITO" : "TAREA",
          hierarchyLabel: levelLabel,
          displayId: item.displayId || (item.projectId ? `P${pg.projectIndex}T${item.taskIndex || item.wbs}` : `T${item.taskIndex || item.wbs}`),
          wbsCode,
          name: item.name,
          releaseCode: "\u2014",
          projectName: pg.project.name,
          projectId: pg.project.id,
          platform: normalizePlatform(item.platform) || platformLabel,
          team: item.assignee?.trim() || "\u2014",
          alertLevel: item.alertLevel ?? pg.project.alertLevel ?? 0,
          type: typeLabel,
          startDate: item.startDate,
          endDate: item.endDate,
          duration: item.duration,
          slack: item.slack > 0 ? item.slack : typeof item.freeSlack === "number" ? item.freeSlack : item.slack || 0,
          progress: `${item.progress || 0}%`,
          dependency: depNames.length > 0 ? depNames.join(", ") : "\u2014",
          dependencyPredecessorName: depTargetNames.length > 0 ? depTargetNames.join(", ") : "\u2014",
          isCritical,
          isExternal,
          compliance: "Conforme",
          notes: item.notes?.trim() || "\u2014",
          isDepRow: false
        });
      }
    }
  }
  return rows;
}
function generateProjectSummaryRows(releases, projects, items) {
  const pGroups = groupItemsByProject(items, projects);
  const rows = [];
  for (const pg of pGroups) {
    const assignedRelease = releases.find((r) => r.id === pg.project.releaseId);
    const taskCount = pg.items.filter((it) => it.type !== "milestone").length;
    const milestoneCount = pg.items.filter((it) => it.type === "milestone").length;
    const alertLevel = pg.project.alertLevel ?? 0;
    const projDesc = (pg.project.description || "").trim();
    const taskLines = [];
    for (const it of pg.items) {
      const itDesc = (it.notes || it.description || "").trim().replace(/\r?\n+/g, " ");
      if (itDesc) {
        taskLines.push(`* ${it.name} ${itDesc}`);
      } else {
        taskLines.push(`* ${it.name}`);
      }
    }
    let description = "";
    if (projDesc && taskLines.length > 0) {
      description = `${projDesc}

${taskLines.join("\n")}`;
    } else if (projDesc) {
      description = projDesc;
    } else if (taskLines.length > 0) {
      description = taskLines.join("\n");
    }
    rows.push({
      projectId: pg.project.id,
      code: `P${pg.projectIndex}`,
      projectName: pg.project.name,
      platform: normalizePlatform(pg.project.platform) || "iOS/Android",
      team: collectProjectTeams(pg.items),
      alertLevel,
      alertLevelLabel: `Nivel ${alertLevel}`,
      releaseCode: assignedRelease ? assignedRelease.code : "Sin asignar",
      startDate: pg.startDate,
      endDate: pg.endDate,
      duration: pg.duration,
      progress: pg.progress,
      tasksCount: taskCount,
      milestonesCount: milestoneCount,
      description
    });
  }
  return rows;
}
function generateReleaseSummaryRows(releases, projects) {
  const rows = [];
  for (const rel of releases) {
    const relProjects = projects.filter((p) => p.releaseId === rel.id);
    const assignedProjs = relProjects.map((p) => p.name).join(", ");
    const keyMilestones = rel.milestones.map((m) => `${m.code} (${m.date})`).join("; ");
    const span = getReleaseDateSpan(rel);
    rows.push({
      code: rel.code,
      name: rel.name,
      month: rel.month || "\u2014",
      startDate: span.startDate,
      endDate: span.endDate,
      duration: span.duration || 0,
      assignedProjects: assignedProjs || "Ninguno",
      keyMilestones: keyMilestones || "Sin hitos",
      releaseId: rel.id,
      projectIds: relProjects.map((p) => p.id),
      platforms: relProjects.map((p) => normalizePlatform(p.platform) || "iOS/Android"),
      alertLevels: relProjects.map((p) => p.alertLevel ?? 0)
    });
  }
  return rows;
}
function exportFullGanttToWorkbook(releases, projects, items) {
  const wb = XLSX2.utils.book_new();
  const cronoRows = generateCronogramaCompletoRows(releases, projects, items);
  const cronoAoa = [
    CRONOGRAMA_HEADER,
    ...cronoRows.map((r) => [
      r.hierarchyLabel,
      r.name,
      r.releaseCode,
      r.projectName,
      r.platform,
      r.team,
      r.alertLevel !== void 0 ? `Nivel ${r.alertLevel}` : "\u2014",
      r.type,
      r.startDate,
      r.endDate,
      r.duration,
      r.slack,
      r.progress,
      r.dependency,
      r.isCritical ? "S\xCD" : "NO",
      r.isExternal ? "S\xCD" : "NO",
      r.compliance,
      r.notes
    ])
  ];
  const wsHierarchy = XLSX2.utils.aoa_to_sheet(cronoAoa);
  wsHierarchy["!cols"] = [
    { wch: 18 },
    // Jerarquía
    { wch: 38 },
    // Nombre
    { wch: 16 },
    // Release Asignada
    { wch: 28 },
    // Proyecto
    { wch: 18 },
    // Plataforma
    { wch: 18 },
    // Equipo
    { wch: 14 },
    // Nivel de Alerta
    { wch: 12 },
    // Tipo
    { wch: 14 },
    // Fecha Inicio
    { wch: 14 },
    // Fecha Fin
    { wch: 14 },
    // Duración
    { wch: 18 },
    // Holgura
    { wch: 14 },
    // Progreso
    { wch: 36 },
    // Dependencia (Predecesora)
    { wch: 12 },
    // Ruta Crítica
    { wch: 12 },
    // Hito Externo
    { wch: 30 },
    // Cumplimiento Release
    { wch: 42 }
    // Notas / Descripción
  ];
  XLSX2.utils.book_append_sheet(wb, wsHierarchy, "Informe Planificaci\xF3n");
  if (releases && releases.length > 0) {
    const relRows = generateReleaseSummaryRows(releases, projects);
    const relAoa = [
      RELEASE_SUMMARY_HEADER,
      ...relRows.map((r) => [
        r.code,
        r.name,
        r.month,
        r.startDate,
        r.endDate,
        r.duration,
        r.assignedProjects,
        r.keyMilestones
      ])
    ];
    const wsReleases = XLSX2.utils.aoa_to_sheet(relAoa);
    wsReleases["!cols"] = [
      { wch: 16 },
      { wch: 30 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 40 },
      { wch: 50 }
    ];
    XLSX2.utils.book_append_sheet(wb, wsReleases, "Cat\xE1logo Releases");
  }
  return wb;
}
function downloadGanttExcelFile(releases, projects, items, filename = "GanttFlow_Cronograma_Completo.xlsx") {
  const wb = exportFullGanttToWorkbook(releases, projects, items);
  XLSX2.writeFile(wb, filename);
}

// src/components/ReportsView.tsx
var CRONO_COLUMNS = [
  { key: "hierarchy", label: "Jerarqu\xEDa", defaultWidth: 125 },
  { key: "name", label: "Nombre del Elemento", defaultWidth: 250 },
  { key: "releaseCode", label: "Release", defaultWidth: 135 },
  { key: "projectName", label: "Proyecto", defaultWidth: 185 },
  { key: "platform", label: "Plataforma", defaultWidth: 125 },
  { key: "team", label: "Equipo", defaultWidth: 150 },
  { key: "alertLevel", label: "Nivel de Alerta", defaultWidth: 135 },
  { key: "type", label: "Tipo", defaultWidth: 105 },
  { key: "startDate", label: "Inicio", defaultWidth: 135 },
  { key: "endDate", label: "Fin", defaultWidth: 135 },
  { key: "duration", label: "Duraci\xF3n (D\xEDas)", defaultWidth: 120, align: "right" },
  { key: "slack", label: "Holgura", defaultWidth: 95, align: "right" },
  { key: "progress", label: "Progreso", defaultWidth: 105, align: "center" },
  { key: "dependency", label: "Dependencia Predecesora (Nombre)", defaultWidth: 230 },
  { key: "isCritical", label: "Ruta Cr\xEDtica", defaultWidth: 105, align: "center" },
  { key: "isExternal", label: "Hito Ext.", defaultWidth: 95, align: "center" },
  { key: "compliance", label: "Cumplimiento Release", defaultWidth: 170 },
  { key: "notes", label: "Notas / Descripci\xF3n", defaultWidth: 250 }
];
var PROJECT_COLUMNS = [
  { key: "code", label: "C\xF3digo", defaultWidth: 85 },
  { key: "projectName", label: "Proyecto", defaultWidth: 225 },
  { key: "platform", label: "Plataforma", defaultWidth: 130 },
  { key: "team", label: "Equipo", defaultWidth: 165 },
  { key: "alertLevel", label: "Nivel de Alerta", defaultWidth: 145 },
  { key: "releaseCode", label: "Release Asignada", defaultWidth: 145 },
  { key: "startDate", label: "Fecha Inicio", defaultWidth: 120 },
  { key: "endDate", label: "Fecha Fin", defaultWidth: 120 },
  { key: "duration", label: "Duraci\xF3n (D\xEDas)", defaultWidth: 120, align: "right" },
  { key: "progress", label: "Progreso", defaultWidth: 125, align: "center" },
  { key: "tasksCount", label: "Tareas", defaultWidth: 85, align: "right" },
  { key: "milestonesCount", label: "Hitos", defaultWidth: 85, align: "right" },
  { key: "description", label: "Descripci\xF3n", defaultWidth: 260 }
];
var RELEASE_COLUMNS = [
  { key: "code", label: "C\xF3digo Release", defaultWidth: 140 },
  { key: "name", label: "Nombre", defaultWidth: 220 },
  { key: "month", label: "Mes", defaultWidth: 110 },
  { key: "startDate", label: "Fecha Inicio", defaultWidth: 120 },
  { key: "endDate", label: "Fecha Fin", defaultWidth: 120 },
  { key: "duration", label: "Duraci\xF3n (D\xEDas)", defaultWidth: 120, align: "right" },
  { key: "assignedProjects", label: "Proyectos Asignados", defaultWidth: 230 },
  { key: "keyMilestones", label: "Hitos Clave", defaultWidth: 300 }
];
var COLUMNS_BY_TAB = {
  cronograma: CRONO_COLUMNS,
  projects: PROJECT_COLUMNS,
  releases: RELEASE_COLUMNS
};
var REPORT_COL_WIDTH_LIMITS = {
  hierarchy: { min: 76, max: 114, extraPx: 28 },
  name: { min: 140, max: 320, extraPx: 44, maxHeaderPx: 140 },
  releaseCode: { min: 74, max: 130, extraPx: 24 },
  code: { min: 70, max: 130, extraPx: 24 },
  projectName: { min: 108, max: 230, extraPx: 26, maxHeaderPx: 120 },
  platform: { min: 80, max: 124, extraPx: 30 },
  team: { min: 70, max: 165, extraPx: 24 },
  alertLevel: { min: 82, max: 120, extraPx: 26, maxHeaderPx: 104 },
  type: { min: 64, max: 94, extraPx: 22 },
  startDate: { min: 96, max: 120, extraPx: 30 },
  endDate: { min: 96, max: 120, extraPx: 30 },
  duration: { min: 72, max: 108, extraPx: 22, maxHeaderPx: 98 },
  slack: { min: 64, max: 88, extraPx: 20 },
  progress: { min: 72, max: 98, extraPx: 26 },
  dependency: { min: 84, max: 230, extraPx: 24, maxHeaderPx: 116 },
  isCritical: { min: 76, max: 100, extraPx: 22 },
  isExternal: { min: 68, max: 92, extraPx: 20 },
  compliance: { min: 82, max: 160, extraPx: 26, maxHeaderPx: 112 },
  notes: { min: 108, max: 255, extraPx: 26, maxHeaderPx: 116 },
  description: { min: 108, max: 255, extraPx: 26, maxHeaderPx: 116 },
  tasksCount: { min: 62, max: 84, extraPx: 20 },
  milestonesCount: { min: 62, max: 84, extraPx: 20 },
  month: { min: 72, max: 110, extraPx: 22 },
  assignedProjects: { min: 108, max: 230, extraPx: 26, maxHeaderPx: 124 },
  keyMilestones: { min: 116, max: 270, extraPx: 26, maxHeaderPx: 124 }
};
function extractReportCellText(row, key) {
  const r = row;
  if (key === "hierarchy") {
    return String(r.level ?? "");
  }
  if (key === "name") {
    const displayId = typeof r.displayId === "string" && r.displayId ? `${r.displayId} ` : "";
    return `${displayId}${String(r.name ?? "")}`.trim();
  }
  if (key === "alertLevel") {
    const lvl = r.alertLevel;
    if (lvl === void 0 || lvl === null) return "\u2014";
    return lvl === 0 ? "Normal" : `Nivel ${lvl}`;
  }
  if (key === "duration") {
    const val = r.duration;
    return val === void 0 || val === null || val === "" ? "\u2014" : `${val}d`;
  }
  if (key === "slack") {
    const val = r.slack;
    return val === void 0 || val === null || val === "" ? "\u2014" : `${val}d`;
  }
  if (key === "progress") {
    const val = r.progress;
    return val === void 0 || val === null || val === "" ? "\u2014" : `${val}%`;
  }
  if (key === "isCritical") {
    return r.isCritical === "S\xED" || r.isCritical === true ? "Cr\xEDtica" : "\u2014";
  }
  if (key === "isExternal") {
    return r.isExternal ? "Ext." : "\u2014";
  }
  const raw = r[key];
  if (raw === void 0 || raw === null) return "";
  return String(raw);
}
function computeAutoFitReportColumnWidths(tab, rows, columns = COLUMNS_BY_TAB[tab]) {
  const result = {};
  for (const col of columns) {
    const limits = REPORT_COL_WIDTH_LIMITS[col.key] || {
      min: 68,
      max: Math.max(col.defaultWidth, 240),
      extraPx: 24
    };
    const rawHeaderPx = Math.ceil(col.label.length * 6.2 + 24);
    const headerPx = limits.maxHeaderPx !== void 0 ? Math.min(rawHeaderPx, limits.maxHeaderPx) : rawHeaderPx;
    let maxLineChars = 0;
    for (const row of rows) {
      const text = extractReportCellText(row, col.key).trim();
      if (!text || text === "\u2014") continue;
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const len = line.trim().length;
        if (len > maxLineChars) maxLineChars = len;
      }
    }
    const contentPx = maxLineChars > 0 ? Math.ceil(maxLineChars * 6.5 + limits.extraPx) : limits.min;
    const ideal = Math.max(limits.min, headerPx, contentPx);
    result[col.key] = Math.min(limits.max, ideal);
  }
  return result;
}
var REPORT_HIDDEN_COLS_KEY = "ganttflow_report_hidden_cols_v1";
var REPORT_COL_WIDTHS_KEY = "ganttflow_report_col_widths_v1";
var REPORT_COL_ORDER_KEY = "ganttflow_report_col_order_v1";
var REPORT_COLUMN_PRESETS_KEY = "gantt_report_column_presets_v1";
var REPORT_ACTIVE_PRESET_KEY = "gantt_report_active_preset_v1";
var REPORT_PRESET_NAMES_KEY = "gantt_report_preset_names_v1";
var DEFAULT_COLUMN_PRESETS = [
  {
    id: "preset-all",
    name: "Formato Completo (Todas)",
    tab: "cronograma",
    visibleColKeys: CRONO_COLUMNS.map((c) => c.key),
    colOrder: CRONO_COLUMNS.map((c) => c.key),
    isCustom: false
  },
  {
    id: "preset-releases-all",
    name: "Formato Completo (Releases)",
    tab: "releases",
    visibleColKeys: RELEASE_COLUMNS.map((c) => c.key),
    colOrder: RELEASE_COLUMNS.map((c) => c.key),
    isCustom: false
  }
];
function computeColOrderFromPreset(tab, preset, allColumns = COLUMNS_BY_TAB[tab]) {
  const defaultKeys = allColumns.map((c) => c.key);
  if (!preset.colOrder || !Array.isArray(preset.colOrder) || preset.colOrder.length === 0) {
    return defaultKeys;
  }
  const validSet = new Set(defaultKeys);
  const kept = [];
  const seen = /* @__PURE__ */ new Set();
  for (const k of preset.colOrder) {
    if (validSet.has(k) && !seen.has(k)) {
      kept.push(k);
      seen.add(k);
    }
  }
  for (const k of defaultKeys) {
    if (!seen.has(k)) {
      kept.push(k);
    }
  }
  return kept;
}
var REPORT_SAVED_FILTERS_KEY = "gantt_report_saved_filters_v1";
var REPORT_ACTIVE_FILTER_KEY = "gantt_report_active_filter_v1";
function createSavedFilter(params) {
  return {
    id: `filter-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: params.name.trim(),
    searchQuery: params.searchQuery ?? "",
    excludeQuery: params.excludeQuery ?? "",
    searchFields: params.searchFields ? { ...params.searchFields } : void 0,
    selectedType: params.selectedType ?? "all",
    selectedPlatform: params.selectedPlatform ?? "all",
    selectedAlert: params.selectedAlert ?? "all",
    selectedRelease: params.selectedRelease ?? "all",
    showSubtasksOnFilter: params.showSubtasksOnFilter ?? false,
    formatPresetId: params.formatPresetId,
    visibleColKeys: params.visibleColKeys ? [...params.visibleColKeys] : void 0,
    colOrder: params.colOrder ? [...params.colOrder] : void 0,
    formatLabel: params.formatLabel
  };
}
function formatSavedFilterSummary(f) {
  const parts = [];
  if (f.selectedType && f.selectedType !== "all") {
    const label = f.selectedType === "RELEASE" ? "Release" : f.selectedType === "PROYECTO" ? "Proyecto" : f.selectedType === "TAREA" ? "Tarea" : "Hito";
    parts.push(label);
  }
  if (f.selectedPlatform && f.selectedPlatform !== "all") {
    parts.push(f.selectedPlatform);
  }
  if (f.selectedAlert !== "all" && f.selectedAlert !== void 0) {
    parts.push(`Nivel ${f.selectedAlert}`);
  }
  if (f.selectedRelease && f.selectedRelease !== "all") {
    parts.push(f.selectedRelease);
  }
  if (f.searchQuery && f.searchQuery.trim()) {
    parts.push(`"${f.searchQuery.trim()}"`);
  }
  if (f.excludeQuery && f.excludeQuery.trim()) {
    parts.push(`-"${f.excludeQuery.trim()}"`);
  }
  return parts.length > 0 ? parts.join(" \xB7 ") : "Sin filtros de fila";
}
var EditableReportTextCell = ({
  value,
  onCommit,
  placeholder = "\u2014",
  className = "",
  testId,
  multiline = false
}) => {
  const [draft, setDraft] = useState4(value);
  useEffect5(() => {
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
    const rowCount = Math.min(6, Math.max(2, (draft || "").split("\n").length));
    return /* @__PURE__ */ React6.createElement(
      "textarea",
      {
        "data-testid": testId,
        value: draft,
        rows: rowCount,
        placeholder,
        onChange: (e) => setDraft(e.target.value),
        onBlur: commit,
        onKeyDown: (e) => {
          if (e.key === "Escape") {
            setDraft(value);
            e.currentTarget.blur();
          }
        },
        className: `w-full bg-transparent px-1.5 py-0.5 rounded-[2px] border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 outline-none resize-y leading-relaxed ${className}`
      }
    );
  }
  return /* @__PURE__ */ React6.createElement(
    "input",
    {
      type: "text",
      "data-testid": testId,
      value: draft,
      placeholder,
      onChange: (e) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          setDraft(value);
          e.currentTarget.blur();
        }
      },
      className: `w-full bg-transparent px-1.5 py-0.5 rounded-[2px] border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 outline-none truncate ${className}`
    }
  );
};
var ReportsView = ({
  releases,
  projects,
  items,
  initialTab = "cronograma",
  initialShowColumnsMenu = false,
  initialShowFormatMenu = false,
  initialShowSavedFiltersMenu = false,
  initialCustomPresets,
  initialActivePresetId,
  initialSavedFilters,
  initialActiveSavedFilterId,
  initialTypeFilter = "all",
  initialSearchQuery,
  initialExcludeQuery,
  initialSearchFields,
  initialShowSubtasksOnFilter = false,
  initialShowSearchFieldsMenu = false,
  initialShowAdvancedPanel = false,
  initialContextMenu = null,
  initialFocusedProjectIds = [],
  initialShowWizard = false,
  selectedEntity = null,
  onSelectEntity,
  onUpdateItem,
  onUpdateProject,
  onUpdateRelease,
  onCreateProject,
  onCreateProjectFromWizard,
  onCreateTask,
  onCreateMilestone
}) => {
  const [activeTab, setActiveTab] = useState4(initialTab === "projects" ? "cronograma" : initialTab);
  const [showFormatColumnsMenu, setShowFormatColumnsMenu] = useState4(
    initialShowFormatMenu || initialShowColumnsMenu
  );
  const [formatColumnsTab, setFormatColumnsTab] = useState4(
    initialShowColumnsMenu && !initialShowFormatMenu ? "columns" : "format"
  );
  const formatColumnsMenuRef = useRef3(null);
  const [focusedProjectIds, setFocusedProjectIds] = useState4(initialFocusedProjectIds);
  const [wizardOpen, setWizardOpen] = useState4(initialShowWizard);
  const [wizardInitialReleaseId, setWizardInitialReleaseId] = useState4(void 0);
  const [newPresetName, setNewPresetName] = useState4("");
  const [showSavedFiltersMenu, setShowSavedFiltersMenu] = useState4(initialShowSavedFiltersMenu);
  const savedFiltersMenuRef = useRef3(null);
  const [newFilterName, setNewFilterName] = useState4("");
  const [newFilterFormatChoice, setNewFilterFormatChoice] = useState4("__current__");
  const [savedFilters, setSavedFilters] = useState4(() => {
    if (initialSavedFilters && Array.isArray(initialSavedFilters)) {
      return initialSavedFilters;
    }
    try {
      const saved = typeof localStorage !== "undefined" ? localStorage.getItem(REPORT_SAVED_FILTERS_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
    }
    return [];
  });
  const [activeSavedFilterId, setActiveSavedFilterId] = useState4(() => {
    if (initialActiveSavedFilterId) return initialActiveSavedFilterId;
    try {
      return typeof localStorage !== "undefined" ? localStorage.getItem(REPORT_ACTIVE_FILTER_KEY) : null;
    } catch {
    }
    return null;
  });
  const [editingFilterId, setEditingFilterId] = useState4(null);
  const [editingFilterName, setEditingFilterName] = useState4("");
  const [editingFilterFormatChoice, setEditingFilterFormatChoice] = useState4("__keep__");
  const initialMatchedSavedFilter = initialActiveSavedFilterId ? savedFilters.find((f) => f.id === initialActiveSavedFilterId) : void 0;
  const [presetNameOverrides, setPresetNameOverrides] = useState4(() => {
    try {
      const saved = typeof localStorage !== "undefined" ? localStorage.getItem(REPORT_PRESET_NAMES_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      }
    } catch {
    }
    return {};
  });
  const [editingPresetId, setEditingPresetId] = useState4(null);
  const [editingPresetName, setEditingPresetName] = useState4("");
  const [customPresets, setCustomPresets] = useState4(() => {
    if (initialCustomPresets && Array.isArray(initialCustomPresets)) {
      return initialCustomPresets;
    }
    try {
      const saved = typeof localStorage !== "undefined" ? localStorage.getItem(REPORT_COLUMN_PRESETS_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
    }
    return [];
  });
  const [activePresetByTab, setActivePresetByTab] = useState4(() => {
    const defaultMap = {
      cronograma: "preset-all",
      projects: "preset-all",
      releases: "preset-releases-all"
    };
    if (initialActivePresetId) {
      defaultMap[initialTab === "projects" ? "cronograma" : initialTab] = initialActivePresetId;
      return defaultMap;
    }
    try {
      const saved = typeof localStorage !== "undefined" ? localStorage.getItem(REPORT_ACTIVE_PRESET_KEY) : null;
      if (saved) {
        if (saved.startsWith("{")) {
          const parsed = JSON.parse(saved);
          return { ...defaultMap, ...parsed };
        }
        return { ...defaultMap, cronograma: saved };
      }
    } catch {
    }
    return defaultMap;
  });
  const [hiddenColsByTab, setHiddenColsByTab] = useState4(() => {
    try {
      if (initialMatchedSavedFilter && initialMatchedSavedFilter.formatPresetId !== "__none__") {
        const linkedPresetId = initialMatchedSavedFilter.formatPresetId;
        const cronoPresets = [...DEFAULT_COLUMN_PRESETS, ...initialCustomPresets || []];
        const linkedPreset = linkedPresetId && linkedPresetId !== "__current__" ? cronoPresets.find((p) => p.id === linkedPresetId) : void 0;
        const keys = linkedPreset ? linkedPreset.visibleColKeys : initialMatchedSavedFilter.visibleColKeys;
        if (keys && keys.length > 0) {
          const visibleSet = new Set(keys);
          const hiddenMap = {};
          for (const col of COLUMNS_BY_TAB.cronograma) {
            if (!visibleSet.has(col.key)) {
              hiddenMap[col.key] = true;
            }
          }
          return { cronograma: hiddenMap, projects: {}, releases: {} };
        }
      }
      if (!initialActivePresetId) {
        const saved = typeof localStorage !== "undefined" ? localStorage.getItem(REPORT_HIDDEN_COLS_KEY) : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            cronograma: parsed.cronograma || {},
            projects: parsed.projects || {},
            releases: parsed.releases || {}
          };
        }
      }
      const targetPresetId = initialActivePresetId || (typeof localStorage !== "undefined" ? localStorage.getItem(REPORT_ACTIVE_PRESET_KEY) : null);
      if (targetPresetId && targetPresetId !== "preset-all" && targetPresetId !== "custom") {
        let custom = initialCustomPresets || [];
        if (custom.length === 0) {
          try {
            const savedCustom = localStorage.getItem(REPORT_COLUMN_PRESETS_KEY);
            if (savedCustom) custom = JSON.parse(savedCustom);
          } catch {
          }
        }
        const preset = [...DEFAULT_COLUMN_PRESETS, ...custom].find((p) => p.id === targetPresetId);
        if (preset) {
          const visibleSet = new Set(preset.visibleColKeys);
          const hiddenMap = {};
          for (const col of COLUMNS_BY_TAB[preset.tab] || []) {
            if (!visibleSet.has(col.key)) {
              hiddenMap[col.key] = true;
            }
          }
          return {
            cronograma: preset.tab === "cronograma" ? hiddenMap : {},
            projects: preset.tab === "projects" ? hiddenMap : {},
            releases: preset.tab === "releases" ? hiddenMap : {}
          };
        }
      }
    } catch {
    }
    return { cronograma: {}, projects: {}, releases: {} };
  });
  const [colWidthsByTab, setColWidthsByTab] = useState4(() => {
    try {
      const saved = typeof localStorage !== "undefined" ? localStorage.getItem(REPORT_COL_WIDTHS_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          cronograma: parsed.cronograma || {},
          projects: parsed.projects || {},
          releases: parsed.releases || {}
        };
      }
    } catch {
    }
    return { cronograma: {}, projects: {}, releases: {} };
  });
  const [colOrderByTab, setColOrderByTab] = useState4(() => {
    const defaults = {
      cronograma: CRONO_COLUMNS.map((c) => c.key),
      projects: PROJECT_COLUMNS.map((c) => c.key),
      releases: RELEASE_COLUMNS.map((c) => c.key)
    };
    try {
      if (initialMatchedSavedFilter && initialMatchedSavedFilter.formatPresetId !== "__none__") {
        const linkedPresetId = initialMatchedSavedFilter.formatPresetId;
        const cronoPresets = [...DEFAULT_COLUMN_PRESETS, ...initialCustomPresets || []];
        const linkedPreset = linkedPresetId && linkedPresetId !== "__current__" ? cronoPresets.find((p) => p.id === linkedPresetId) : void 0;
        const orderKeys = linkedPreset?.colOrder || initialMatchedSavedFilter.colOrder;
        if (orderKeys && orderKeys.length > 0) {
          return {
            ...defaults,
            cronograma: computeColOrderFromPreset("cronograma", {
              id: "init",
              name: "init",
              tab: "cronograma",
              visibleColKeys: linkedPreset ? linkedPreset.visibleColKeys : initialMatchedSavedFilter.visibleColKeys || [],
              colOrder: orderKeys
            })
          };
        }
      }
      if (!initialActivePresetId) {
        const saved = typeof localStorage !== "undefined" ? localStorage.getItem(REPORT_COL_ORDER_KEY) : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          const mergeOrder = (tab) => {
            const base = Array.isArray(parsed[tab]) ? parsed[tab] : [];
            const validKeys = new Set(defaults[tab]);
            const kept = base.filter((k) => validKeys.has(k));
            const missing = defaults[tab].filter((k) => !kept.includes(k));
            return [...kept, ...missing];
          };
          return {
            cronograma: mergeOrder("cronograma"),
            projects: mergeOrder("projects"),
            releases: mergeOrder("releases")
          };
        }
      }
      const targetPresetId = initialActivePresetId || (typeof localStorage !== "undefined" ? localStorage.getItem(REPORT_ACTIVE_PRESET_KEY) : null);
      if (targetPresetId && targetPresetId !== "custom") {
        let custom = initialCustomPresets || [];
        if (custom.length === 0) {
          try {
            const savedCustom = localStorage.getItem(REPORT_COLUMN_PRESETS_KEY);
            if (savedCustom) custom = JSON.parse(savedCustom);
          } catch {
          }
        }
        const preset = [...DEFAULT_COLUMN_PRESETS, ...custom].find((p) => p.id === targetPresetId);
        if (preset && preset.colOrder && Array.isArray(preset.colOrder)) {
          return {
            ...defaults,
            [preset.tab]: computeColOrderFromPreset(preset.tab, preset)
          };
        }
      }
    } catch {
    }
    return defaults;
  });
  const [draggingCol, setDraggingCol] = useState4(null);
  const [dragOverColKey, setDragOverColKey] = useState4(null);
  const [searchQuery, setSearchQuery] = useState4(
    initialSearchQuery !== void 0 ? initialSearchQuery : initialMatchedSavedFilter?.searchQuery ?? ""
  );
  const [excludeQuery, setExcludeQuery] = useState4(
    initialExcludeQuery !== void 0 ? initialExcludeQuery : initialMatchedSavedFilter?.excludeQuery ?? ""
  );
  const [searchFields, setSearchFields] = useState4(() => ({
    ...DEFAULT_GANTT_SEARCH_FIELDS,
    ...initialMatchedSavedFilter?.searchFields || {},
    ...initialSearchFields || {}
  }));
  const [showSubtasksOnFilter, setShowSubtasksOnFilter] = useState4(
    initialShowSubtasksOnFilter || Boolean(initialMatchedSavedFilter?.showSubtasksOnFilter)
  );
  const [selectedType, setSelectedType] = useState4(
    initialTypeFilter !== "all" ? initialTypeFilter : initialMatchedSavedFilter?.selectedType ?? "all"
  );
  const [selectedPlatform, setSelectedPlatform] = useState4(
    initialMatchedSavedFilter?.selectedPlatform ?? "all"
  );
  const [selectedAlert, setSelectedAlert] = useState4(
    initialMatchedSavedFilter?.selectedAlert ?? "all"
  );
  const [selectedRelease, setSelectedRelease] = useState4(
    initialMatchedSavedFilter?.selectedRelease ?? "all"
  );
  const [toastMessage, setToastMessage] = useState4(null);
  const [contextMenu, setContextMenu] = useState4(initialContextMenu);
  const contextMenuRef = useRef3(null);
  const openRowContextMenu = (e, payload) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 240;
    const menuHeight = 220;
    const maxX = typeof window !== "undefined" ? Math.max(8, window.innerWidth - menuWidth - 8) : e.clientX;
    const maxY = typeof window !== "undefined" ? Math.max(8, window.innerHeight - menuHeight - 8) : e.clientY;
    setContextMenu({
      ...payload,
      x: Math.min(e.clientX, maxX),
      y: Math.min(e.clientY, maxY)
    });
  };
  useEffect5(() => {
    const handleOutsideClick = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
      if (formatColumnsMenuRef.current && !formatColumnsMenuRef.current.contains(e.target)) {
        setShowFormatColumnsMenu(false);
      }
      if (savedFiltersMenuRef.current && !savedFiltersMenuRef.current.contains(e.target)) {
        setShowSavedFiltersMenu(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, []);
  useEffect5(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setContextMenu(null);
        setShowFormatColumnsMenu(false);
        setShowSavedFiltersMenu(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  const isColVisible = (tab, key) => {
    return !hiddenColsByTab[tab]?.[key];
  };
  const getOrderedColumns = (tab) => {
    const defs = COLUMNS_BY_TAB[tab];
    const order = colOrderByTab[tab] || [];
    const byKey = new Map(defs.map((c) => [c.key, c]));
    const ordered = [];
    for (const k of order) {
      const def = byKey.get(k);
      if (def) {
        ordered.push(def);
        byKey.delete(k);
      }
    }
    for (const rem of byKey.values()) {
      ordered.push(rem);
    }
    return ordered;
  };
  const defaultPresetsForTab = DEFAULT_COLUMN_PRESETS.filter((p) => p.tab === activeTab);
  const customPresetsForTab = customPresets.filter((p) => (p.tab || "cronograma") === activeTab);
  const allPresetsForTab = [...defaultPresetsForTab, ...customPresetsForTab];
  const currentVisibleColKeysInOrder = getOrderedColumns(activeTab).filter((c) => isColVisible(activeTab, c.key)).map((c) => c.key);
  const doesPresetMatchLayout = (tab, preset, visibleColsInOrder) => {
    if (preset.visibleColKeys.length !== visibleColsInOrder.length) return false;
    const set = new Set(preset.visibleColKeys);
    if (!visibleColsInOrder.every((k) => set.has(k))) return false;
    if (preset.colOrder && Array.isArray(preset.colOrder) && preset.colOrder.length > 0) {
      const expectedVisibleOrder = computeColOrderFromPreset(tab, preset).filter((k) => set.has(k));
      if (expectedVisibleOrder.length !== visibleColsInOrder.length) return false;
      return expectedVisibleOrder.every((k, idx) => k === visibleColsInOrder[idx]);
    }
    return true;
  };
  const activePresetId = useMemo3(() => {
    const preferredId = activePresetByTab[activeTab];
    if (preferredId && preferredId !== "custom") {
      const found = allPresetsForTab.find((p) => p.id === preferredId);
      if (found && doesPresetMatchLayout(activeTab, found, currentVisibleColKeysInOrder)) {
        return found.id;
      }
    }
    const matched = allPresetsForTab.find(
      (p) => doesPresetMatchLayout(activeTab, p, currentVisibleColKeysInOrder)
    );
    if (matched) return matched.id;
    return "custom";
  }, [activeTab, activePresetByTab, allPresetsForTab, currentVisibleColKeysInOrder]);
  const getPresetDisplayName = (preset) => {
    return presetNameOverrides[preset.id] || preset.name;
  };
  const activePreset = allPresetsForTab.find((p) => p.id === activePresetId);
  let activePresetDisplayName = "Personalizado";
  if (activePreset) {
    if (presetNameOverrides[activePreset.id]) {
      activePresetDisplayName = presetNameOverrides[activePreset.id];
    } else if (activePreset.id === "preset-all" || activePreset.id === "preset-releases-all") {
      activePresetDisplayName = "Completo";
    } else {
      activePresetDisplayName = activePreset.name.replace(/^Formato\s+/i, "");
    }
  }
  const startRenamePreset = (preset, e) => {
    e.stopPropagation();
    setEditingPresetId(preset.id);
    setEditingPresetName(getPresetDisplayName(preset));
  };
  const handleSaveRename = (presetId) => {
    const trimmed = editingPresetName.trim();
    if (trimmed) {
      const nextOverrides = { ...presetNameOverrides, [presetId]: trimmed };
      setPresetNameOverrides(nextOverrides);
      try {
        localStorage.setItem(REPORT_PRESET_NAMES_KEY, JSON.stringify(nextOverrides));
      } catch {
      }
      const nextCustom = customPresets.map(
        (p) => p.id === presetId ? { ...p, name: trimmed } : p
      );
      if (nextCustom.some((p) => p.id === presetId)) {
        setCustomPresets(nextCustom);
        try {
          localStorage.setItem(REPORT_COLUMN_PRESETS_KEY, JSON.stringify(nextCustom));
        } catch {
        }
      }
      setToastMessage(`Formato renombrado a "${trimmed}".`);
      setTimeout(() => setToastMessage(null), 3e3);
    }
    setEditingPresetId(null);
    setEditingPresetName("");
  };
  const handleCancelRename = () => {
    setEditingPresetId(null);
    setEditingPresetName("");
  };
  const applyPreset = (preset) => {
    const visibleSet = new Set(preset.visibleColKeys);
    const newHidden = {};
    for (const col of COLUMNS_BY_TAB[preset.tab] || []) {
      if (!visibleSet.has(col.key)) {
        newHidden[col.key] = true;
      }
    }
    setHiddenColsByTab((prev) => {
      const next = { ...prev, [preset.tab]: newHidden };
      try {
        localStorage.setItem(REPORT_HIDDEN_COLS_KEY, JSON.stringify(next));
      } catch {
      }
      return next;
    });
    const nextOrder = computeColOrderFromPreset(preset.tab, preset);
    setColOrderByTab((prev) => {
      const next = { ...prev, [preset.tab]: nextOrder };
      try {
        localStorage.setItem(REPORT_COL_ORDER_KEY, JSON.stringify(next));
      } catch {
      }
      return next;
    });
    setActivePresetByTab((prev) => {
      const next = { ...prev, [preset.tab]: preset.id };
      try {
        localStorage.setItem(REPORT_ACTIVE_PRESET_KEY, preset.id);
      } catch {
      }
      return next;
    });
    setShowFormatColumnsMenu(false);
  };
  const handleSavePreset = () => {
    const trimmed = newPresetName.trim();
    if (!trimmed) return;
    const orderedCols = getOrderedColumns(activeTab);
    const currentOrder = orderedCols.map((c) => c.key);
    const currentVisible = orderedCols.filter((c) => isColVisible(activeTab, c.key)).map((c) => c.key);
    const existingIndex = customPresets.findIndex(
      (p) => (p.tab || "cronograma") === activeTab && p.name.toLowerCase() === trimmed.toLowerCase()
    );
    let savedId;
    let nextCustom;
    if (existingIndex >= 0) {
      savedId = customPresets[existingIndex].id;
      nextCustom = customPresets.map(
        (p, idx) => idx === existingIndex ? { ...p, visibleColKeys: currentVisible, colOrder: currentOrder } : p
      );
    } else {
      savedId = `preset-custom-${Date.now()}`;
      const newPreset = {
        id: savedId,
        name: trimmed,
        tab: activeTab,
        visibleColKeys: currentVisible,
        colOrder: currentOrder,
        isCustom: true
      };
      nextCustom = [...customPresets, newPreset];
    }
    setCustomPresets(nextCustom);
    try {
      localStorage.setItem(REPORT_COLUMN_PRESETS_KEY, JSON.stringify(nextCustom));
    } catch {
    }
    setActivePresetByTab((prev) => {
      const next = { ...prev, [activeTab]: savedId };
      try {
        localStorage.setItem(REPORT_ACTIVE_PRESET_KEY, savedId);
      } catch {
      }
      return next;
    });
    setNewPresetName("");
    setToastMessage(`Formato "${trimmed}" guardado correctamente.`);
    setTimeout(() => setToastMessage(null), 3e3);
  };
  const handleDeletePreset = (presetId) => {
    const nextCustom = customPresets.filter((p) => p.id !== presetId);
    setCustomPresets(nextCustom);
    try {
      localStorage.setItem(REPORT_COLUMN_PRESETS_KEY, JSON.stringify(nextCustom));
    } catch {
    }
    if (presetNameOverrides[presetId]) {
      const nextOverrides = { ...presetNameOverrides };
      delete nextOverrides[presetId];
      setPresetNameOverrides(nextOverrides);
      try {
        localStorage.setItem(REPORT_PRESET_NAMES_KEY, JSON.stringify(nextOverrides));
      } catch {
      }
    }
    if (activePresetId === presetId) {
      const fallbackPreset = DEFAULT_COLUMN_PRESETS.find((p) => p.tab === activeTab) || DEFAULT_COLUMN_PRESETS[0];
      applyPreset(fallbackPreset);
    }
    setToastMessage("Formato personalizado eliminado.");
    setTimeout(() => setToastMessage(null), 3e3);
  };
  const cronoPresetsList = [
    ...DEFAULT_COLUMN_PRESETS.filter((p) => p.tab === "cronograma"),
    ...customPresets.filter((p) => (p.tab || "cronograma") === "cronograma")
  ];
  const activeSavedFilter = useMemo3(() => {
    if (!activeSavedFilterId) return void 0;
    const found = savedFilters.find((f) => f.id === activeSavedFilterId);
    if (!found) return void 0;
    const criteriaMatch = found.searchQuery === searchQuery && found.selectedType === selectedType && found.selectedPlatform === selectedPlatform && found.selectedAlert === selectedAlert && found.selectedRelease === selectedRelease;
    return criteriaMatch ? found : void 0;
  }, [activeSavedFilterId, savedFilters, searchQuery, selectedType, selectedPlatform, selectedAlert, selectedRelease]);
  const applyCustomColumnSnapshot = (tab, visibleColKeys, colOrder) => {
    const visibleSet = new Set(visibleColKeys);
    const newHidden = {};
    for (const col of COLUMNS_BY_TAB[tab] || []) {
      if (!visibleSet.has(col.key)) {
        newHidden[col.key] = true;
      }
    }
    setHiddenColsByTab((prev) => {
      const next = { ...prev, [tab]: newHidden };
      try {
        localStorage.setItem(REPORT_HIDDEN_COLS_KEY, JSON.stringify(next));
      } catch {
      }
      return next;
    });
    if (colOrder && colOrder.length > 0) {
      const mergedOrder = computeColOrderFromPreset(tab, {
        id: "snapshot",
        name: "snapshot",
        tab,
        visibleColKeys,
        colOrder
      });
      setColOrderByTab((prev) => {
        const next = { ...prev, [tab]: mergedOrder };
        try {
          localStorage.setItem(REPORT_COL_ORDER_KEY, JSON.stringify(next));
        } catch {
        }
        return next;
      });
    }
    setActivePresetByTab((prev) => {
      const next = { ...prev, [tab]: "custom" };
      try {
        localStorage.setItem(REPORT_ACTIVE_PRESET_KEY, "custom");
      } catch {
      }
      return next;
    });
  };
  const getSavedFilterFormatLabel = (filter) => {
    if (filter.formatPresetId === "__none__") return "Sin formato fijo";
    if (filter.formatPresetId && filter.formatPresetId !== "__current__") {
      const linked = cronoPresetsList.find((p) => p.id === filter.formatPresetId);
      if (linked) {
        return getPresetDisplayName(linked).replace(/^Formato\s+/i, "");
      }
    }
    if (filter.formatLabel) return filter.formatLabel;
    if (filter.visibleColKeys && filter.visibleColKeys.length > 0) {
      return `${filter.visibleColKeys.length} cols`;
    }
    return "Formato actual";
  };
  const applySavedFilter = (filter) => {
    setSearchQuery(filter.searchQuery ?? "");
    setExcludeQuery(filter.excludeQuery ?? "");
    setSearchFields(filter.searchFields ? { ...DEFAULT_GANTT_SEARCH_FIELDS, ...filter.searchFields } : { ...DEFAULT_GANTT_SEARCH_FIELDS });
    setShowSubtasksOnFilter(Boolean(filter.showSubtasksOnFilter));
    setSelectedType(filter.selectedType ?? "all");
    setSelectedPlatform(filter.selectedPlatform ?? "all");
    setSelectedAlert(filter.selectedAlert ?? "all");
    setSelectedRelease(filter.selectedRelease ?? "all");
    if (filter.formatPresetId && filter.formatPresetId !== "__none__" && filter.formatPresetId !== "__current__") {
      const matchedPreset = cronoPresetsList.find((p) => p.id === filter.formatPresetId);
      if (matchedPreset) {
        applyPreset(matchedPreset);
      } else if (filter.visibleColKeys && filter.visibleColKeys.length > 0) {
        applyCustomColumnSnapshot("cronograma", filter.visibleColKeys, filter.colOrder);
      }
    } else if (filter.formatPresetId !== "__none__" && filter.visibleColKeys && filter.visibleColKeys.length > 0) {
      applyCustomColumnSnapshot("cronograma", filter.visibleColKeys, filter.colOrder);
    }
    setActiveSavedFilterId(filter.id);
    try {
      localStorage.setItem(REPORT_ACTIVE_FILTER_KEY, filter.id);
    } catch {
    }
    setShowSavedFiltersMenu(false);
  };
  const resolveFormatFieldsFromChoice = (choice, existingFilter) => {
    if (choice === "__keep__" && existingFilter) {
      return {
        formatPresetId: existingFilter.formatPresetId,
        visibleColKeys: existingFilter.visibleColKeys,
        colOrder: existingFilter.colOrder,
        formatLabel: existingFilter.formatLabel
      };
    }
    if (choice === "__none__") {
      return {
        formatPresetId: "__none__",
        visibleColKeys: void 0,
        colOrder: void 0,
        formatLabel: "Sin formato fijo"
      };
    }
    if (choice === "__current__") {
      const cronoOrdered = getOrderedColumns("cronograma");
      const currentOrder = cronoOrdered.map((c) => c.key);
      const currentVisible = cronoOrdered.filter((c) => isColVisible("cronograma", c.key)).map((c) => c.key);
      return {
        formatPresetId: "__current__",
        visibleColKeys: currentVisible,
        colOrder: currentOrder,
        formatLabel: `${currentVisible.length} cols`
      };
    }
    const chosen = cronoPresetsList.find((p) => p.id === choice);
    if (chosen) {
      return {
        formatPresetId: chosen.id,
        visibleColKeys: [...chosen.visibleColKeys],
        colOrder: chosen.colOrder ? [...chosen.colOrder] : void 0,
        formatLabel: getPresetDisplayName(chosen).replace(/^Formato\s+/i, "")
      };
    }
    return {
      formatPresetId: "__none__",
      visibleColKeys: void 0,
      colOrder: void 0,
      formatLabel: "Sin formato fijo"
    };
  };
  const handleSaveFilter = () => {
    const trimmed = newFilterName.trim();
    if (!trimmed) return;
    const formatFields = resolveFormatFieldsFromChoice(newFilterFormatChoice);
    const existingIdx = savedFilters.findIndex(
      (f) => f.name.toLowerCase() === trimmed.toLowerCase()
    );
    let savedId;
    let nextFilters;
    if (existingIdx >= 0) {
      savedId = savedFilters[existingIdx].id;
      nextFilters = savedFilters.map(
        (f, idx) => idx === existingIdx ? {
          ...f,
          name: trimmed,
          searchQuery,
          excludeQuery,
          searchFields: { ...searchFields },
          showSubtasksOnFilter,
          selectedType,
          selectedPlatform,
          selectedAlert,
          selectedRelease,
          ...formatFields
        } : f
      );
    } else {
      const created = createSavedFilter({
        name: trimmed,
        searchQuery,
        excludeQuery,
        searchFields: { ...searchFields },
        showSubtasksOnFilter,
        selectedType,
        selectedPlatform,
        selectedAlert,
        selectedRelease,
        ...formatFields
      });
      savedId = created.id;
      nextFilters = [...savedFilters, created];
    }
    setSavedFilters(nextFilters);
    try {
      localStorage.setItem(REPORT_SAVED_FILTERS_KEY, JSON.stringify(nextFilters));
    } catch {
    }
    setActiveSavedFilterId(savedId);
    try {
      localStorage.setItem(REPORT_ACTIVE_FILTER_KEY, savedId);
    } catch {
    }
    setNewFilterName("");
    setToastMessage(`Filtro "${trimmed}" guardado correctamente.`);
    setTimeout(() => setToastMessage(null), 3e3);
  };
  const handleSaveExternalSavedFilter = (name, existingId) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const formatFields = resolveFormatFieldsFromChoice("__current__");
    const targetIdx = existingId ? savedFilters.findIndex((f) => f.id === existingId) : savedFilters.findIndex((f) => f.name.toLowerCase() === trimmed.toLowerCase());
    let savedId;
    let nextFilters;
    if (targetIdx >= 0) {
      savedId = savedFilters[targetIdx].id;
      nextFilters = savedFilters.map(
        (f, idx) => idx === targetIdx ? {
          ...f,
          name: trimmed,
          searchQuery,
          excludeQuery,
          searchFields: { ...searchFields },
          showSubtasksOnFilter,
          selectedType,
          selectedPlatform,
          selectedAlert,
          selectedRelease,
          ...formatFields
        } : f
      );
    } else {
      const created = createSavedFilter({
        name: trimmed,
        searchQuery,
        excludeQuery,
        searchFields: { ...searchFields },
        showSubtasksOnFilter,
        selectedType,
        selectedPlatform,
        selectedAlert,
        selectedRelease,
        ...formatFields
      });
      savedId = created.id;
      nextFilters = [...savedFilters, created];
    }
    setSavedFilters(nextFilters);
    try {
      localStorage.setItem(REPORT_SAVED_FILTERS_KEY, JSON.stringify(nextFilters));
    } catch {
    }
    setActiveSavedFilterId(savedId);
    try {
      localStorage.setItem(REPORT_ACTIVE_FILTER_KEY, savedId);
    } catch {
    }
    setToastMessage(`Filtro "${trimmed}" guardado con criterios y columnas.`);
    setTimeout(() => setToastMessage(null), 3e3);
  };
  const startRenameSavedFilter = (filter, e) => {
    e.stopPropagation();
    setEditingFilterId(filter.id);
    setEditingFilterName(filter.name);
    setEditingFilterFormatChoice("__keep__");
  };
  const handleSaveFilterRename = (filterId) => {
    const trimmed = editingFilterName.trim();
    if (trimmed) {
      const target = savedFilters.find((f) => f.id === filterId);
      const formatFields = resolveFormatFieldsFromChoice(editingFilterFormatChoice, target);
      const nextFilters = savedFilters.map(
        (f) => f.id === filterId ? {
          ...f,
          name: trimmed,
          ...formatFields
        } : f
      );
      setSavedFilters(nextFilters);
      try {
        localStorage.setItem(REPORT_SAVED_FILTERS_KEY, JSON.stringify(nextFilters));
      } catch {
      }
      setToastMessage(`Filtro actualizado a "${trimmed}".`);
      setTimeout(() => setToastMessage(null), 3e3);
    }
    setEditingFilterId(null);
    setEditingFilterName("");
    setEditingFilterFormatChoice("__keep__");
  };
  const handleCancelFilterRename = () => {
    setEditingFilterId(null);
    setEditingFilterName("");
    setEditingFilterFormatChoice("__keep__");
  };
  const handleDeleteSavedFilter = (filterId) => {
    const nextFilters = savedFilters.filter((f) => f.id !== filterId);
    setSavedFilters(nextFilters);
    try {
      localStorage.setItem(REPORT_SAVED_FILTERS_KEY, JSON.stringify(nextFilters));
    } catch {
    }
    if (activeSavedFilterId === filterId) {
      setActiveSavedFilterId(null);
      try {
        localStorage.removeItem(REPORT_ACTIVE_FILTER_KEY);
      } catch {
      }
    }
    setToastMessage("Filtro guardado eliminado.");
    setTimeout(() => setToastMessage(null), 3e3);
  };
  const toggleReportCol = (tab, key) => {
    setHiddenColsByTab((prev) => {
      const tabHidden = { ...prev[tab] || {} };
      const allCols = COLUMNS_BY_TAB[tab] || [];
      const currentlyHidden = Boolean(tabHidden[key]);
      if (!currentlyHidden) {
        const visibleCount = allCols.filter((c) => !tabHidden[c.key]).length;
        if (visibleCount <= 1) return prev;
        tabHidden[key] = true;
      } else {
        delete tabHidden[key];
      }
      const next = { ...prev, [tab]: tabHidden };
      try {
        localStorage.setItem(REPORT_HIDDEN_COLS_KEY, JSON.stringify(next));
      } catch {
      }
      const currentVisibleInOrder = getOrderedColumns(tab).filter((c) => !tabHidden[c.key]).map((c) => c.key);
      const allPresets = [
        ...DEFAULT_COLUMN_PRESETS.filter((p) => p.tab === tab),
        ...customPresets.filter((p) => (p.tab || "cronograma") === tab)
      ];
      const matched = allPresets.find(
        (p) => doesPresetMatchLayout(tab, p, currentVisibleInOrder)
      );
      const newPresetId = matched ? matched.id : "custom";
      setActivePresetByTab((old) => {
        const updated = { ...old, [tab]: newPresetId };
        try {
          localStorage.setItem(REPORT_ACTIVE_PRESET_KEY, newPresetId);
        } catch {
        }
        return updated;
      });
      return next;
    });
  };
  const resetReportCols = (tab) => {
    setHiddenColsByTab((prev) => {
      const next = { ...prev, [tab]: {} };
      try {
        localStorage.setItem(REPORT_HIDDEN_COLS_KEY, JSON.stringify(next));
      } catch {
      }
      return next;
    });
    setColOrderByTab((prev) => {
      const next = { ...prev, [tab]: (COLUMNS_BY_TAB[tab] || []).map((c) => c.key) };
      try {
        localStorage.setItem(REPORT_COL_ORDER_KEY, JSON.stringify(next));
      } catch {
      }
      return next;
    });
    const defaultAllPreset = DEFAULT_COLUMN_PRESETS.find((p) => p.tab === tab && (p.id === "preset-all" || p.id === "preset-releases-all"));
    const allId = defaultAllPreset ? defaultAllPreset.id : "preset-all";
    setActivePresetByTab((prev) => {
      const next = { ...prev, [tab]: allId };
      try {
        localStorage.setItem(REPORT_ACTIVE_PRESET_KEY, allId);
      } catch {
      }
      return next;
    });
  };
  const reorderReportCols = (tab, fromKey, toKey) => {
    if (fromKey === toKey) return;
    setColOrderByTab((prev) => {
      const current = getOrderedColumns(tab).map((c) => c.key);
      const fromIdx = current.indexOf(fromKey);
      const toIdx = current.indexOf(toKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const nextOrder = [...current];
      const [moved] = nextOrder.splice(fromIdx, 1);
      nextOrder.splice(toIdx, 0, moved);
      const next = { ...prev, [tab]: nextOrder };
      try {
        localStorage.setItem(REPORT_COL_ORDER_KEY, JSON.stringify(next));
      } catch {
      }
      const tabHidden = hiddenColsByTab[tab] || {};
      const nextVisibleInOrder = nextOrder.filter((k) => !tabHidden[k]);
      const allPresets = [
        ...DEFAULT_COLUMN_PRESETS.filter((p) => p.tab === tab),
        ...customPresets.filter((p) => (p.tab || "cronograma") === tab)
      ];
      const matched = allPresets.find(
        (p) => doesPresetMatchLayout(tab, p, nextVisibleInOrder)
      );
      const newPresetId = matched ? matched.id : "custom";
      setActivePresetByTab((old) => {
        const updated = { ...old, [tab]: newPresetId };
        try {
          localStorage.setItem(REPORT_ACTIVE_PRESET_KEY, newPresetId);
        } catch {
        }
        return updated;
      });
      return next;
    });
  };
  const itemById = useMemo3(() => new Map(items.map((it) => [it.id, it])), [items]);
  const projectById = useMemo3(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const releaseById = useMemo3(() => new Map(releases.map((r) => [r.id, r])), [releases]);
  const cronoRows = useMemo3(
    () => generateCronogramaCompletoRows(releases, projects, items),
    [releases, projects, items]
  );
  const projectRows = useMemo3(
    () => generateProjectSummaryRows(releases, projects, items),
    [releases, projects, items]
  );
  const releaseRows = useMemo3(
    () => generateReleaseSummaryRows(releases, projects),
    [releases, projects]
  );
  const autoFitColWidths = useMemo3(
    () => ({
      cronograma: computeAutoFitReportColumnWidths("cronograma", cronoRows),
      projects: computeAutoFitReportColumnWidths("projects", projectRows),
      releases: computeAutoFitReportColumnWidths("releases", releaseRows)
    }),
    [cronoRows, projectRows, releaseRows]
  );
  const getColWidth = (tab, col) => {
    return colWidthsByTab[tab]?.[col.key] ?? autoFitColWidths[tab]?.[col.key] ?? col.defaultWidth;
  };
  const resetColWidthToAutoFit = (tab, key) => {
    setColWidthsByTab((prev) => {
      const tabMap = { ...prev[tab] || {} };
      delete tabMap[key];
      const next = { ...prev, [tab]: tabMap };
      try {
        localStorage.setItem(REPORT_COL_WIDTHS_KEY, JSON.stringify(next));
      } catch {
      }
      return next;
    });
  };
  const startColResize = (e, tab, key, startWidth) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    let latestWidth = startWidth;
    const onMove = (moveEvent) => {
      latestWidth = Math.max(64, Math.min(720, Math.round(startWidth + (moveEvent.clientX - startX))));
      setColWidthsByTab((prev) => ({
        ...prev,
        [tab]: { ...prev[tab] || {}, [key]: latestWidth }
      }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (typeof document !== "undefined") {
        document.body.style.cursor = "";
      }
      setColWidthsByTab((prev) => {
        const next = {
          ...prev,
          [tab]: { ...prev[tab] || {}, [key]: latestWidth }
        };
        try {
          localStorage.setItem(REPORT_COL_WIDTHS_KEY, JSON.stringify(next));
        } catch {
        }
        return next;
      });
    };
    if (typeof document !== "undefined") {
      document.body.style.cursor = "col-resize";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const renderResizableTh = (tab, col, extraClass = "") => {
    if (!isColVisible(tab, col.key)) return null;
    const width = getColWidth(tab, col);
    const alignClass = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
    const isDragOver = draggingCol?.tab === tab && dragOverColKey === col.key;
    const isDragging = draggingCol?.tab === tab && draggingCol?.key === col.key;
    return /* @__PURE__ */ React6.createElement(
      "th",
      {
        key: col.key,
        "data-testid": `report-col-header-${tab}-${col.key}`,
        "data-col-key": col.key,
        draggable: true,
        onDragStart: (e) => {
          const target = e.target;
          if (target?.closest('[data-testid^="report-col-resizer-"]')) {
            e.preventDefault();
            return;
          }
          setDraggingCol({ tab, key: col.key });
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
            try {
              e.dataTransfer.setData("text/plain", col.key);
            } catch {
            }
          }
        },
        onDragOver: (e) => {
          if (draggingCol && draggingCol.tab === tab && draggingCol.key !== col.key) {
            e.preventDefault();
            if (dragOverColKey !== col.key) setDragOverColKey(col.key);
          }
        },
        onDragLeave: () => {
          if (dragOverColKey === col.key) setDragOverColKey(null);
        },
        onDrop: (e) => {
          e.preventDefault();
          if (draggingCol && draggingCol.tab === tab && draggingCol.key !== col.key) {
            reorderReportCols(tab, draggingCol.key, col.key);
          }
          setDraggingCol(null);
          setDragOverColKey(null);
        },
        onDragEnd: () => {
          setDraggingCol(null);
          setDragOverColKey(null);
        },
        style: { width, minWidth: width },
        title: "Arrastra el encabezado para reordenar esta columna",
        className: `relative px-2.5 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 whitespace-nowrap select-none cursor-grab active:cursor-grabbing transition-colors ${alignClass} ${extraClass} ${isDragging ? "opacity-50" : ""} ${isDragOver ? "border-l-2 border-l-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40" : ""}`
      },
      /* @__PURE__ */ React6.createElement("span", { className: "truncate block pr-2" }, col.label),
      /* @__PURE__ */ React6.createElement(
        "div",
        {
          "data-testid": `report-col-resizer-${tab}-${col.key}`,
          onMouseDown: (e) => {
            e.stopPropagation();
            startColResize(e, tab, col.key, width);
          },
          onDoubleClick: (e) => {
            e.stopPropagation();
            resetColWidthToAutoFit(tab, col.key);
          },
          title: "Arrastra para redimensionar \xB7 Doble clic para auto-ajustar al contenido",
          className: "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/60 active:bg-indigo-600 transition-colors z-10"
        }
      )
    );
  };
  const filteredCronoRows = useMemo3(() => {
    const matchesSearchQuery = (row, q) => {
      if (searchFields.name && row.name.toLowerCase().includes(q)) return true;
      if (searchFields.description && row.notes.toLowerCase().includes(q)) return true;
      if (searchFields.assignee && row.team.toLowerCase().includes(q)) return true;
      if (searchFields.platform && row.platform.toLowerCase().includes(q)) return true;
      if (searchFields.predecessors && row.dependency.toLowerCase().includes(q)) return true;
      if (searchFields.displayId && (row.wbsCode.toLowerCase().includes(q) || row.displayId.toLowerCase().includes(q))) {
        return true;
      }
      return false;
    };
    const matchesNonReleaseRow = (row) => {
      if (selectedRelease !== "all" && row.releaseCode !== selectedRelease) {
        return false;
      }
      if (selectedAlert !== "all") {
        if (row.alertLevel !== selectedAlert) {
          return false;
        }
      }
      if (selectedPlatform !== "all") {
        if (row.platform !== "\u2014") {
          if (selectedPlatform === "iOS/Android") {
            if (row.platform !== "iOS/Android" && row.platform !== "Multiplataforma") {
              return false;
            }
          } else if (row.platform !== selectedPlatform) {
            return false;
          }
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!matchesSearchQuery(row, q)) {
          return false;
        }
      }
      if (excludeQuery.trim()) {
        const exQ = excludeQuery.trim().toLowerCase();
        if (matchesSearchQuery(row, exQ)) {
          return false;
        }
      }
      return true;
    };
    const hasFocusFilter = focusedProjectIds.length > 0;
    const focusedProjectSet = hasFocusFilter ? new Set(focusedProjectIds) : null;
    const baseCronoRows = hasFocusFilter && focusedProjectSet ? (() => {
      const allowedReleaseCodes = /* @__PURE__ */ new Set();
      for (const r of cronoRows) {
        if (r.projectId && focusedProjectSet.has(r.projectId) && r.releaseCode && r.releaseCode !== "\u2014") {
          allowedReleaseCodes.add(r.releaseCode);
        }
      }
      return cronoRows.filter((r) => {
        if (r.level === "RELEASE") return allowedReleaseCodes.has(r.releaseCode);
        return Boolean(r.projectId && focusedProjectSet.has(r.projectId));
      });
    })() : cronoRows;
    const hasFilters = selectedType !== "all" || selectedRelease !== "all" || selectedAlert !== "all" || selectedPlatform !== "all" || Boolean(searchQuery.trim()) || Boolean(excludeQuery.trim());
    if (!hasFilters) {
      return baseCronoRows;
    }
    const directlyMatchingProjectIds = /* @__PURE__ */ new Set();
    for (const r of baseCronoRows) {
      if (r.level === "PROYECTO" && r.projectId && matchesNonReleaseRow(r)) {
        directlyMatchingProjectIds.add(r.projectId);
      }
    }
    if (selectedType !== "all") {
      if (selectedType === "RELEASE" && (selectedPlatform !== "all" || selectedAlert !== "all")) {
        const matchingReleaseCodes2 = /* @__PURE__ */ new Set();
        for (const r of baseCronoRows) {
          if (r.level !== "RELEASE" && matchesNonReleaseRow(r) && r.releaseCode && r.releaseCode !== "\u2014") {
            matchingReleaseCodes2.add(r.releaseCode);
          }
        }
        return baseCronoRows.filter((row) => {
          if (row.level !== "RELEASE") return false;
          if (selectedRelease !== "all" && row.releaseCode !== selectedRelease) return false;
          if (!matchingReleaseCodes2.has(row.releaseCode)) return false;
          if (searchQuery.trim() && !matchesNonReleaseRow(row)) return false;
          return true;
        });
      }
      return baseCronoRows.filter((row) => {
        if (row.level !== selectedType) return false;
        if (matchesNonReleaseRow(row)) return true;
        if (showSubtasksOnFilter && (selectedType === "TAREA" || selectedType === "HITO") && row.projectId && directlyMatchingProjectIds.has(row.projectId)) {
          return true;
        }
        return false;
      });
    }
    const matchingRowIds = /* @__PURE__ */ new Set();
    const matchingProjectIds = /* @__PURE__ */ new Set();
    const matchingReleaseCodes = /* @__PURE__ */ new Set();
    for (const r of baseCronoRows) {
      if (r.level !== "RELEASE") {
        if (matchesNonReleaseRow(r)) {
          matchingRowIds.add(r.rowId);
          if (r.projectId) matchingProjectIds.add(r.projectId);
          if (r.releaseCode && r.releaseCode !== "\u2014") matchingReleaseCodes.add(r.releaseCode);
        }
      }
    }
    return baseCronoRows.filter((row) => {
      if (row.level === "RELEASE") {
        if (selectedRelease !== "all" && row.releaseCode !== selectedRelease) {
          return false;
        }
        return matchingReleaseCodes.has(row.releaseCode);
      }
      if (row.level === "PROYECTO") {
        if (matchingRowIds.has(row.rowId)) return true;
        return row.projectId ? matchingProjectIds.has(row.projectId) : false;
      }
      if (matchingRowIds.has(row.rowId)) return true;
      if (showSubtasksOnFilter && row.projectId && directlyMatchingProjectIds.has(row.projectId)) {
        return true;
      }
      return false;
    });
  }, [cronoRows, focusedProjectIds, selectedType, selectedPlatform, selectedAlert, selectedRelease, searchQuery, excludeQuery, searchFields, showSubtasksOnFilter]);
  const filteredProjectRows = useMemo3(() => {
    const matchesProjectText = (row, q) => searchFields.name && row.projectName.toLowerCase().includes(q) || searchFields.displayId && row.code.toLowerCase().includes(q) || searchFields.description && row.description.toLowerCase().includes(q) || searchFields.platform && row.platform.toLowerCase().includes(q) || searchFields.assignee && row.team.toLowerCase().includes(q);
    return projectRows.filter((row) => {
      if (selectedPlatform !== "all") {
        if (selectedPlatform === "iOS/Android") {
          if (row.platform !== "iOS/Android" && row.platform !== "Multiplataforma") {
            return false;
          }
        } else if (row.platform !== selectedPlatform) {
          return false;
        }
      }
      if (selectedAlert !== "all" && row.alertLevel !== selectedAlert) {
        return false;
      }
      if (selectedRelease !== "all" && row.releaseCode !== selectedRelease) {
        return false;
      }
      if (searchQuery.trim() && !matchesProjectText(row, searchQuery.trim().toLowerCase())) {
        return false;
      }
      if (excludeQuery.trim() && matchesProjectText(row, excludeQuery.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [projectRows, selectedPlatform, selectedAlert, selectedRelease, searchQuery, excludeQuery, searchFields]);
  const filteredReleaseRows = useMemo3(() => {
    const matchesReleaseText = (row, q) => searchFields.name && (row.name.toLowerCase().includes(q) || row.code.toLowerCase().includes(q)) || searchFields.displayId && row.code.toLowerCase().includes(q) || searchFields.description && (row.assignedProjects.toLowerCase().includes(q) || row.month.toLowerCase().includes(q)) || searchFields.platform && Boolean(row.platforms?.some((pl) => pl.toLowerCase().includes(q)));
    return releaseRows.filter((row) => {
      if (selectedRelease !== "all" && row.code !== selectedRelease) {
        return false;
      }
      if (selectedPlatform !== "all") {
        const plats = row.platforms || [];
        if (selectedPlatform === "iOS/Android") {
          const hasMulti = plats.some((p) => p === "iOS/Android" || p === "Multiplataforma");
          if (!hasMulti) return false;
        } else {
          if (!plats.includes(selectedPlatform)) return false;
        }
      }
      if (selectedAlert !== "all") {
        const alerts = row.alertLevels || [];
        if (!alerts.includes(selectedAlert)) return false;
      }
      if (searchQuery.trim() && !matchesReleaseText(row, searchQuery.trim().toLowerCase())) {
        return false;
      }
      if (excludeQuery.trim() && matchesReleaseText(row, excludeQuery.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [releaseRows, selectedPlatform, selectedAlert, selectedRelease, searchQuery, excludeQuery, searchFields]);
  const handleDownloadExcel = () => {
    try {
      downloadGanttExcelFile(releases, projects, items);
      setToastMessage("Archivo Excel descargado correctamente (Informe Planificaci\xF3n y Cat\xE1logo Releases).");
      setTimeout(() => setToastMessage(null), 3500);
    } catch {
      setToastMessage("Error al generar el archivo Excel.");
      setTimeout(() => setToastMessage(null), 3500);
    }
  };
  return /* @__PURE__ */ React6.createElement(
    "div",
    {
      "data-testid": "reports-view",
      className: "flex flex-col flex-1 bg-white dark:bg-[#0C0C09] border border-[#0C0C09] dark:border-zinc-800 rounded-[4px] shadow-sm overflow-hidden min-h-0"
    },
    /* @__PURE__ */ React6.createElement("div", { className: "flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#0C0C09] dark:border-zinc-800 shrink-0" }, /* @__PURE__ */ React6.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React6.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React6.createElement("div", { className: "p-1.5 rounded-[3px] bg-emerald-700 text-white shrink-0" }, /* @__PURE__ */ React6.createElement(FileSpreadsheet, { className: "w-4 h-4" })), /* @__PURE__ */ React6.createElement("div", null, /* @__PURE__ */ React6.createElement("h1", { className: "text-sm font-bold font-display text-[#0C0C09] dark:text-zinc-100 leading-tight" }, "Planificaci\xF3n"), /* @__PURE__ */ React6.createElement("p", { className: "text-[11px] text-[#6B6B66] dark:text-zinc-400" }, "Visualizaci\xF3n tabular de la planificaci\xF3n con formato Excel y edici\xF3n directa.")))), /* @__PURE__ */ React6.createElement("div", { className: "flex items-center gap-2" }, toastMessage && /* @__PURE__ */ React6.createElement(
      "span",
      {
        className: `px-2.5 py-1 rounded-[3px] text-xs font-medium animate-fade-in ${toastMessage.includes("Error") ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"}`
      },
      toastMessage
    ), /* @__PURE__ */ React6.createElement(
      "button",
      {
        type: "button",
        "data-testid": "reports-download-excel-btn",
        onClick: handleDownloadExcel,
        className: "flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer",
        title: "Exportar libro completo (.xlsx) con las 3 pesta\xF1as",
        "aria-label": "Descargar Excel (.xlsx)"
      },
      /* @__PURE__ */ React6.createElement(Download, { className: "w-3.5 h-3.5" }),
      /* @__PURE__ */ React6.createElement("span", null, "Descargar Excel (.xlsx)")
    ))),
    /* @__PURE__ */ React6.createElement("div", { className: "flex items-center justify-between px-4 bg-[#EAEAE6] dark:bg-zinc-900/90 border-b border-[#0C0C09] dark:border-zinc-800 shrink-0" }, /* @__PURE__ */ React6.createElement("div", { className: "flex items-center gap-1 overflow-x-auto py-1" }, /* @__PURE__ */ React6.createElement(
      "button",
      {
        type: "button",
        "data-testid": "reports-tab-cronograma",
        onClick: () => setActiveTab("cronograma"),
        className: `flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-[4px] border-t-2 transition cursor-pointer shrink-0 ${activeTab === "cronograma" ? "bg-white dark:bg-[#0C0C09] text-[#0C0C09] dark:text-zinc-100 border-emerald-600 shadow-xs" : "bg-transparent text-[#6B6B66] dark:text-zinc-400 border-transparent hover:text-[#0C0C09] dark:hover:text-zinc-200"}`
      },
      /* @__PURE__ */ React6.createElement(Layers, { className: "w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" }),
      /* @__PURE__ */ React6.createElement("span", null, "Planificaci\xF3n"),
      /* @__PURE__ */ React6.createElement("span", { className: "px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#F4F4F1] dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700" }, cronoRows.length)
    )), /* @__PURE__ */ React6.createElement("div", { className: "hidden md:flex items-center gap-2 text-[11px] font-mono text-[#6B6B66] dark:text-zinc-400" }, /* @__PURE__ */ React6.createElement("span", null, "Excel View"), /* @__PURE__ */ React6.createElement("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-500" }), /* @__PURE__ */ React6.createElement("span", null, "Sincronizado"))),
    /* @__PURE__ */ React6.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2.5 px-4 py-2 bg-[#F4F4F1] dark:bg-zinc-900 border-b border-[#E2E2DC] dark:border-zinc-800 text-xs shrink-0" }, /* @__PURE__ */ React6.createElement(
      SearchFilterBar,
      {
        testIdPrefix: "reports",
        searchQuery,
        onChangeSearchQuery: setSearchQuery,
        excludeQuery,
        onChangeExcludeQuery: setExcludeQuery,
        searchFields,
        onChangeSearchFields: setSearchFields,
        selectedType,
        onChangeSelectedType: setSelectedType,
        showTypeFilter: activeTab === "cronograma",
        selectedPlatform,
        onChangeSelectedPlatform: setSelectedPlatform,
        selectedAlert,
        onChangeSelectedAlert: setSelectedAlert,
        releases,
        selectedRelease,
        onChangeSelectedRelease: setSelectedRelease,
        showSubtasksOnFilter,
        onChangeShowSubtasksOnFilter: setShowSubtasksOnFilter,
        showSubtasksToggle: activeTab === "cronograma",
        searchInputClassName: "w-56 sm:w-64",
        initialShowSearchFieldsMenu,
        initialShowAdvancedPanel,
        columns: getOrderedColumns(activeTab).map((c) => ({
          key: c.key,
          label: c.label,
          visible: isColVisible(activeTab, c.key)
        })),
        onToggleColumn: (key) => toggleReportCol(activeTab, key),
        onResetColumns: () => resetReportCols(activeTab),
        enableBuiltInSavedFilters: activeTab === "cronograma",
        externalSavedFilters: activeTab === "cronograma" ? savedFilters : void 0,
        externalActiveSavedFilterId: activeTab === "cronograma" ? activeSavedFilterId : null,
        onSelectExternalSavedFilter: (f) => applySavedFilter(f),
        onSaveExternalSavedFilter: handleSaveExternalSavedFilter,
        onDeleteExternalSavedFilter: handleDeleteSavedFilter,
        savedFiltersSlot: activeTab === "cronograma" ? /* @__PURE__ */ React6.createElement("div", { className: "relative shrink-0", ref: savedFiltersMenuRef }, /* @__PURE__ */ React6.createElement(
          "button",
          {
            type: "button",
            "data-testid": "reports-saved-filters-btn",
            onClick: () => {
              setShowSavedFiltersMenu((prev) => {
                const next = !prev;
                if (next) {
                  setNewFilterFormatChoice(activePresetId !== "custom" ? activePresetId : "__current__");
                }
                return next;
              });
              setShowFormatColumnsMenu(false);
            },
            className: `flex items-center gap-1.5 px-2.5 py-0.5 rounded-[3px] border text-[10px] font-semibold transition cursor-pointer h-6.5 ${activeSavedFilter ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300" : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`,
            title: activeSavedFilter ? `Filtro activo: ${activeSavedFilter.name}` : "Guardar y aplicar filtros con formato de columnas"
          },
          /* @__PURE__ */ React6.createElement(Bookmark2, { className: "w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" }),
          /* @__PURE__ */ React6.createElement("span", { className: "truncate max-w-[140px] sm:max-w-[180px]" }, activeSavedFilter ? `Filtro: ${activeSavedFilter.name}` : "Filtros guardados"),
          savedFilters.length > 0 && !activeSavedFilter && /* @__PURE__ */ React6.createElement("span", { className: "px-1 py-0.1 rounded bg-zinc-100 dark:bg-zinc-700 text-[9px] font-mono" }, savedFilters.length),
          /* @__PURE__ */ React6.createElement(ChevronDown2, { className: "w-3 h-3 text-zinc-500 shrink-0" })
        ), showSavedFiltersMenu && /* @__PURE__ */ React6.createElement(
          "div",
          {
            "data-testid": "reports-saved-filters-menu",
            className: "absolute right-0 top-full mt-1 w-80 max-h-[26rem] overflow-y-auto bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[4px] shadow-2xl z-50 p-2 flex flex-col gap-1.5"
          },
          /* @__PURE__ */ React6.createElement("div", { className: "px-1.5 py-1 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between" }, /* @__PURE__ */ React6.createElement("span", { className: "text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400" }, "Filtros guardados"), /* @__PURE__ */ React6.createElement("span", { className: "text-[9px] font-mono text-zinc-400" }, "Filtro + Formato")),
          savedFilters.length === 0 ? /* @__PURE__ */ React6.createElement(
            "p",
            {
              "data-testid": "reports-saved-filters-empty",
              className: "px-2 py-2 text-[11px] text-zinc-500 dark:text-zinc-400 italic"
            },
            "No hay filtros guardados. Configura tus filtros y formato de columnas y gu\xE1rdalos abajo."
          ) : /* @__PURE__ */ React6.createElement("div", { className: "flex flex-col gap-1" }, savedFilters.map((filter) => {
            const isActive = activeSavedFilter?.id === filter.id;
            const isEditing = editingFilterId === filter.id;
            if (isEditing) {
              return /* @__PURE__ */ React6.createElement(
                "div",
                {
                  key: filter.id,
                  className: "flex flex-col gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-800 rounded border border-indigo-400",
                  onClick: (e) => e.stopPropagation()
                },
                /* @__PURE__ */ React6.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React6.createElement(
                  "input",
                  {
                    type: "text",
                    "data-testid": `reports-saved-filter-rename-input-${filter.id}`,
                    autoFocus: true,
                    value: editingFilterName,
                    onChange: (e) => setEditingFilterName(e.target.value),
                    onKeyDown: (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveFilterRename(filter.id);
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        handleCancelFilterRename();
                      }
                    },
                    className: "flex-1 px-1.5 py-0.5 text-xs rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
                  }
                ), /* @__PURE__ */ React6.createElement(
                  "button",
                  {
                    type: "button",
                    "data-testid": `reports-saved-filter-rename-save-${filter.id}`,
                    onClick: () => handleSaveFilterRename(filter.id),
                    className: "p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer",
                    title: "Guardar cambios"
                  },
                  /* @__PURE__ */ React6.createElement(Check4, { className: "w-3.5 h-3.5 stroke-[3]" })
                ), /* @__PURE__ */ React6.createElement(
                  "button",
                  {
                    type: "button",
                    "data-testid": `reports-saved-filter-rename-cancel-${filter.id}`,
                    onClick: handleCancelFilterRename,
                    className: "p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer",
                    title: "Cancelar"
                  },
                  /* @__PURE__ */ React6.createElement(X5, { className: "w-3.5 h-3.5" })
                )),
                /* @__PURE__ */ React6.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React6.createElement("span", { className: "text-[10px] font-mono text-zinc-500 shrink-0" }, "Formato:"), /* @__PURE__ */ React6.createElement(
                  "select",
                  {
                    "data-testid": `reports-saved-filter-edit-format-${filter.id}`,
                    value: editingFilterFormatChoice,
                    onChange: (e) => setEditingFilterFormatChoice(e.target.value),
                    className: "flex-1 px-1.5 py-0.5 text-[10px] rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
                  },
                  /* @__PURE__ */ React6.createElement("option", { value: "__keep__" }, "Mantener (", getSavedFilterFormatLabel(filter), ")"),
                  /* @__PURE__ */ React6.createElement("option", { value: "__current__" }, "Actualizar a columnas actuales (", currentVisibleColKeysInOrder.length, " cols)"),
                  cronoPresetsList.map((p) => /* @__PURE__ */ React6.createElement("option", { key: p.id, value: p.id }, getPresetDisplayName(p), " (", p.visibleColKeys.length, " cols)")),
                  /* @__PURE__ */ React6.createElement("option", { value: "__none__" }, "Sin formato fijo")
                ))
              );
            }
            return /* @__PURE__ */ React6.createElement(
              "div",
              {
                key: filter.id,
                className: `flex items-start justify-between px-2 py-1.5 rounded-[3px] text-xs transition group ${isActive ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300" : "text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`
              },
              /* @__PURE__ */ React6.createElement(
                "button",
                {
                  type: "button",
                  "data-testid": `reports-saved-filter-option-${filter.id}`,
                  "data-active-filter": isActive ? "true" : "false",
                  onClick: () => applySavedFilter(filter),
                  className: "flex items-start gap-2 flex-1 min-w-0 text-left cursor-pointer"
                },
                /* @__PURE__ */ React6.createElement(
                  "span",
                  {
                    className: `mt-0.5 w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center shrink-0 ${isActive ? "bg-indigo-600 border-indigo-600 text-white" : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"}`
                  },
                  isActive && /* @__PURE__ */ React6.createElement(Check4, { className: "w-2.5 h-2.5 stroke-[3]" })
                ),
                /* @__PURE__ */ React6.createElement("div", { className: "flex flex-col min-w-0" }, /* @__PURE__ */ React6.createElement("span", { className: `truncate ${isActive ? "font-semibold" : "font-medium"}` }, filter.name), /* @__PURE__ */ React6.createElement("span", { className: "text-[10px] text-zinc-500 dark:text-zinc-400 truncate" }, formatSavedFilterSummary(filter)), /* @__PURE__ */ React6.createElement("span", { className: "text-[9px] font-mono text-emerald-700 dark:text-emerald-400 truncate" }, "Formato: ", getSavedFilterFormatLabel(filter)))
              ),
              /* @__PURE__ */ React6.createElement("div", { className: "flex items-center gap-0.5 shrink-0 ml-1" }, /* @__PURE__ */ React6.createElement(
                "button",
                {
                  type: "button",
                  "data-testid": `reports-saved-filter-rename-btn-${filter.id}`,
                  onClick: (e) => startRenameSavedFilter(filter, e),
                  className: "p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded cursor-pointer transition opacity-70 group-hover:opacity-100",
                  title: "Renombrar filtro o cambiar su formato"
                },
                /* @__PURE__ */ React6.createElement(Pencil2, { className: "w-3 h-3" })
              ), /* @__PURE__ */ React6.createElement(
                "button",
                {
                  type: "button",
                  "data-testid": `reports-saved-filter-delete-${filter.id}`,
                  onClick: (e) => {
                    e.stopPropagation();
                    handleDeleteSavedFilter(filter.id);
                  },
                  className: "p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded cursor-pointer transition",
                  title: "Eliminar este filtro"
                },
                /* @__PURE__ */ React6.createElement(Trash24, { className: "w-3 h-3" })
              ))
            );
          })),
          /* @__PURE__ */ React6.createElement("div", { className: "pt-2 mt-1 border-t border-slate-200 dark:border-zinc-800 flex flex-col gap-1.5 px-1" }, /* @__PURE__ */ React6.createElement("span", { className: "text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400" }, "+ Guardar filtro actual"), /* @__PURE__ */ React6.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React6.createElement("span", { className: "text-[10px] font-mono text-zinc-500 shrink-0" }, "Formato:"), /* @__PURE__ */ React6.createElement(
            "select",
            {
              "data-testid": "reports-saved-filter-format-select",
              value: newFilterFormatChoice,
              onChange: (e) => setNewFilterFormatChoice(e.target.value),
              className: "flex-1 px-1.5 py-1 text-[10px] rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer truncate"
            },
            /* @__PURE__ */ React6.createElement("option", { value: "__current__" }, "Columnas y orden actuales (", currentVisibleColKeysInOrder.length, " cols)"),
            cronoPresetsList.map((p) => /* @__PURE__ */ React6.createElement("option", { key: p.id, value: p.id }, getPresetDisplayName(p), " (", p.visibleColKeys.length, " cols)")),
            /* @__PURE__ */ React6.createElement("option", { value: "__none__" }, "Sin formato fijo (solo filtros)")
          )), newFilterFormatChoice === "__current__" && /* @__PURE__ */ React6.createElement(
            "div",
            {
              "data-testid": "reports-saved-filter-columns-picker",
              className: "rounded-[4px] border border-zinc-200 dark:border-zinc-700 bg-[#FAFAF8] dark:bg-zinc-800/50 p-1.5 space-y-1"
            },
            /* @__PURE__ */ React6.createElement("div", { className: "flex items-center justify-between px-1" }, /* @__PURE__ */ React6.createElement("span", { className: "text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400" }, "Columnas del perfil (", currentVisibleColKeysInOrder.length, "/", CRONO_COLUMNS.length, ")"), /* @__PURE__ */ React6.createElement(
              "button",
              {
                type: "button",
                onClick: () => resetReportCols("cronograma"),
                className: "text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              },
              "Todas"
            )),
            /* @__PURE__ */ React6.createElement("div", { className: "grid grid-cols-2 gap-0.5 max-h-36 overflow-y-auto" }, getOrderedColumns("cronograma").map((col) => {
              const visible = isColVisible("cronograma", col.key);
              return /* @__PURE__ */ React6.createElement(
                "button",
                {
                  key: col.key,
                  type: "button",
                  "data-testid": `saved-filter-col-toggle-${col.key}`,
                  onClick: () => toggleReportCol("cronograma", col.key),
                  className: "flex items-center gap-1.5 px-1.5 py-0.5 rounded-[2px] text-[10px] text-left hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                },
                /* @__PURE__ */ React6.createElement(
                  "span",
                  {
                    className: `w-3 h-3 rounded-[2px] border flex items-center justify-center shrink-0 ${visible ? "bg-indigo-600 border-indigo-600 text-white" : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"}`
                  },
                  visible && /* @__PURE__ */ React6.createElement(Check4, { className: "w-2 h-2 stroke-[3]" })
                ),
                /* @__PURE__ */ React6.createElement("span", { className: "truncate" }, col.label)
              );
            }))
          ), /* @__PURE__ */ React6.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React6.createElement(
            "input",
            {
              type: "text",
              "data-testid": "reports-saved-filter-name-input",
              placeholder: "Nombre del filtro...",
              value: newFilterName,
              onChange: (e) => setNewFilterName(e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSaveFilter();
                }
              },
              className: "flex-1 px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 outline-none focus:border-indigo-500"
            }
          ), /* @__PURE__ */ React6.createElement(
            "button",
            {
              type: "button",
              "data-testid": "reports-saved-filter-save-btn",
              onClick: handleSaveFilter,
              disabled: !newFilterName.trim(),
              className: "flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition shrink-0",
              title: "Guardar filtro y formato de columnas"
            },
            /* @__PURE__ */ React6.createElement(Plus4, { className: "w-3 h-3" }),
            /* @__PURE__ */ React6.createElement("span", null, "Guardar")
          )))
        )) : void 0,
        onClearFilters: () => {
          setSearchQuery("");
          setExcludeQuery("");
          setSearchFields({ ...DEFAULT_GANTT_SEARCH_FIELDS });
          setSelectedType("all");
          setSelectedPlatform("all");
          setSelectedAlert("all");
          setSelectedRelease("all");
          setShowSubtasksOnFilter(false);
          setActiveSavedFilterId(null);
          try {
            localStorage.removeItem(REPORT_ACTIVE_FILTER_KEY);
          } catch {
          }
        }
      }
    ), /* @__PURE__ */ React6.createElement("div", { className: "flex items-center gap-2 shrink-0" }, activeTab === "cronograma" && (onCreateProjectFromWizard || onCreateProject) && /* @__PURE__ */ React6.createElement(
      "button",
      {
        type: "button",
        "data-testid": "reports-open-wizard-btn",
        onClick: () => {
          const relMatch = selectedRelease !== "all" ? releases.find((r) => r.code === selectedRelease)?.id : void 0;
          setWizardInitialReleaseId(relMatch);
          setWizardOpen(true);
        },
        className: "flex items-center gap-1.5 px-2.5 py-0.5 rounded-[3px] border border-[#0C0C09] dark:border-zinc-600 bg-[#0C0C09] dark:bg-zinc-100 text-white dark:text-[#0C0C09] hover:opacity-90 text-[10px] font-semibold transition cursor-pointer h-6.5",
        title: "Crear nuevo proyecto con subtareas mediante asistente guiado"
      },
      /* @__PURE__ */ React6.createElement(FolderPlus2, { className: "w-3 h-3 shrink-0" }),
      /* @__PURE__ */ React6.createElement("span", null, "Nuevo Proyecto")
    ), /* @__PURE__ */ React6.createElement("div", { className: "relative shrink-0", ref: formatColumnsMenuRef }, /* @__PURE__ */ React6.createElement(
      "button",
      {
        type: "button",
        "data-testid": "reports-format-columns-btn",
        onClick: () => {
          setShowFormatColumnsMenu((prev) => !prev);
          setShowSavedFiltersMenu(false);
        },
        className: "flex items-center gap-1.5 px-2.5 py-0.5 rounded-[3px] border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer h-6.5",
        title: `Formato: ${activePresetDisplayName} \xB7 Columnas visibles`
      },
      /* @__PURE__ */ React6.createElement(LayoutTemplate, { className: "w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" }),
      /* @__PURE__ */ React6.createElement("span", { className: "truncate max-w-[130px] sm:max-w-[170px]" }, `Formato: ${activePresetDisplayName}`),
      /* @__PURE__ */ React6.createElement("span", { className: "px-1 rounded bg-zinc-100 dark:bg-zinc-700 font-mono text-[9px] text-indigo-700 dark:text-indigo-300" }, COLUMNS_BY_TAB[activeTab].filter((c) => isColVisible(activeTab, c.key)).length, "/", COLUMNS_BY_TAB[activeTab].length),
      /* @__PURE__ */ React6.createElement(ChevronDown2, { className: "w-3 h-3 text-zinc-500 shrink-0" })
    ), showFormatColumnsMenu && /* @__PURE__ */ React6.createElement(
      "div",
      {
        "data-testid": "reports-format-columns-menu",
        className: "absolute right-0 top-full mt-1 w-72 max-h-[28rem] overflow-y-auto bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-700 rounded-[4px] shadow-2xl z-50 p-1.5 flex flex-col gap-1.5"
      },
      /* @__PURE__ */ React6.createElement("div", { className: "grid grid-cols-2 gap-1 p-0.5 rounded-[3px] bg-[#F4F4F1] dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700" }, /* @__PURE__ */ React6.createElement(
        "button",
        {
          type: "button",
          "data-testid": "reports-format-btn",
          onClick: () => setFormatColumnsTab("format"),
          className: `flex items-center justify-center gap-1 py-1 px-2 rounded-[2px] text-[10px] font-semibold cursor-pointer transition ${formatColumnsTab === "format" ? "bg-white dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-100 shadow-xs" : "text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-zinc-200"}`
        },
        /* @__PURE__ */ React6.createElement(LayoutTemplate, { className: "w-3 h-3 text-emerald-600 dark:text-emerald-400" }),
        /* @__PURE__ */ React6.createElement("span", null, "Formatos")
      ), /* @__PURE__ */ React6.createElement(
        "button",
        {
          type: "button",
          "data-testid": "reports-columns-btn",
          onClick: () => setFormatColumnsTab("columns"),
          className: `flex items-center justify-center gap-1 py-1 px-2 rounded-[2px] text-[10px] font-semibold cursor-pointer transition ${formatColumnsTab === "columns" ? "bg-white dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-100 shadow-xs" : "text-[#6B6B66] dark:text-zinc-400 hover:text-[#0C0C09] dark:hover:text-zinc-200"}`
        },
        /* @__PURE__ */ React6.createElement(SlidersHorizontal3, { className: "w-3 h-3 text-indigo-600 dark:text-indigo-400" }),
        /* @__PURE__ */ React6.createElement("span", null, "Columnas (", COLUMNS_BY_TAB[activeTab].filter((c) => isColVisible(activeTab, c.key)).length, "/", COLUMNS_BY_TAB[activeTab].length, ")")
      )),
      formatColumnsTab === "format" ? /* @__PURE__ */ React6.createElement("div", { "data-testid": "reports-format-menu", className: "flex flex-col gap-1" }, /* @__PURE__ */ React6.createElement("div", { className: "px-2 py-1 border-b border-slate-200 dark:border-zinc-800" }, /* @__PURE__ */ React6.createElement("span", { className: "text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400" }, "Formatos predeterminados")), defaultPresetsForTab.map((preset) => {
        const isActive = activePresetId === preset.id;
        const isEditing = editingPresetId === preset.id;
        if (isEditing) {
          return /* @__PURE__ */ React6.createElement(
            "div",
            {
              key: preset.id,
              className: "flex items-center gap-1.5 px-2 py-1 bg-zinc-50 dark:bg-zinc-800 rounded border border-indigo-400",
              onClick: (e) => e.stopPropagation()
            },
            /* @__PURE__ */ React6.createElement(
              "input",
              {
                type: "text",
                "data-testid": `reports-preset-rename-input-${preset.id}`,
                autoFocus: true,
                value: editingPresetName,
                onChange: (e) => setEditingPresetName(e.target.value),
                onKeyDown: (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveRename(preset.id);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    handleCancelRename();
                  }
                },
                className: "flex-1 px-1.5 py-0.5 text-xs rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
              }
            ),
            /* @__PURE__ */ React6.createElement(
              "button",
              {
                type: "button",
                "data-testid": `reports-preset-rename-save-${preset.id}`,
                onClick: () => handleSaveRename(preset.id),
                className: "p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer",
                title: "Guardar nombre"
              },
              /* @__PURE__ */ React6.createElement(Check4, { className: "w-3.5 h-3.5 stroke-[3]" })
            ),
            /* @__PURE__ */ React6.createElement(
              "button",
              {
                type: "button",
                "data-testid": `reports-preset-rename-cancel-${preset.id}`,
                onClick: handleCancelRename,
                className: "p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer",
                title: "Cancelar"
              },
              /* @__PURE__ */ React6.createElement(X5, { className: "w-3.5 h-3.5" })
            )
          );
        }
        return /* @__PURE__ */ React6.createElement(
          "div",
          {
            key: preset.id,
            className: `flex items-center justify-between px-2 py-1.5 rounded-[3px] text-xs transition group ${isActive ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold" : "text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`
          },
          /* @__PURE__ */ React6.createElement(
            "button",
            {
              type: "button",
              "data-testid": `reports-preset-option-${preset.id}`,
              "data-active-preset": isActive ? "true" : "false",
              onClick: () => applyPreset(preset),
              className: "flex items-center gap-2 truncate flex-1 text-left cursor-pointer"
            },
            /* @__PURE__ */ React6.createElement(
              "span",
              {
                className: `w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center shrink-0 ${isActive ? "bg-indigo-600 border-indigo-600 text-white" : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"}`
              },
              isActive && /* @__PURE__ */ React6.createElement(Check4, { className: "w-2.5 h-2.5 stroke-[3]" })
            ),
            /* @__PURE__ */ React6.createElement("span", { className: "truncate" }, getPresetDisplayName(preset))
          ),
          /* @__PURE__ */ React6.createElement("div", { className: "flex items-center gap-1 shrink-0 ml-1" }, /* @__PURE__ */ React6.createElement("span", { className: "text-[10px] font-mono text-zinc-400 dark:text-zinc-500" }, preset.visibleColKeys.length, " cols"), /* @__PURE__ */ React6.createElement(
            "button",
            {
              type: "button",
              "data-testid": `reports-preset-rename-btn-${preset.id}`,
              onClick: (e) => startRenamePreset(preset, e),
              className: "p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded cursor-pointer transition opacity-70 group-hover:opacity-100",
              title: "Editar nombre de este formato"
            },
            /* @__PURE__ */ React6.createElement(Pencil2, { className: "w-3 h-3" })
          ))
        );
      }), customPresetsForTab.length > 0 && /* @__PURE__ */ React6.createElement(React6.Fragment, null, /* @__PURE__ */ React6.createElement("div", { className: "px-2 pt-2 pb-1 border-b border-slate-200 dark:border-zinc-800" }, /* @__PURE__ */ React6.createElement("span", { className: "text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400" }, "Formatos personalizados")), customPresetsForTab.map((preset) => {
        const isActive = activePresetId === preset.id;
        const isEditing = editingPresetId === preset.id;
        if (isEditing) {
          return /* @__PURE__ */ React6.createElement(
            "div",
            {
              key: preset.id,
              className: "flex items-center gap-1.5 px-2 py-1 bg-zinc-50 dark:bg-zinc-800 rounded border border-indigo-400",
              onClick: (e) => e.stopPropagation()
            },
            /* @__PURE__ */ React6.createElement(
              "input",
              {
                type: "text",
                "data-testid": `reports-preset-rename-input-${preset.id}`,
                autoFocus: true,
                value: editingPresetName,
                onChange: (e) => setEditingPresetName(e.target.value),
                onKeyDown: (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveRename(preset.id);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    handleCancelRename();
                  }
                },
                className: "flex-1 px-1.5 py-0.5 text-xs rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
              }
            ),
            /* @__PURE__ */ React6.createElement(
              "button",
              {
                type: "button",
                "data-testid": `reports-preset-rename-save-${preset.id}`,
                onClick: () => handleSaveRename(preset.id),
                className: "p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer",
                title: "Guardar nombre"
              },
              /* @__PURE__ */ React6.createElement(Check4, { className: "w-3.5 h-3.5 stroke-[3]" })
            ),
            /* @__PURE__ */ React6.createElement(
              "button",
              {
                type: "button",
                "data-testid": `reports-preset-rename-cancel-${preset.id}`,
                onClick: handleCancelRename,
                className: "p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer",
                title: "Cancelar"
              },
              /* @__PURE__ */ React6.createElement(X5, { className: "w-3.5 h-3.5" })
            )
          );
        }
        return /* @__PURE__ */ React6.createElement(
          "div",
          {
            key: preset.id,
            className: `flex items-center justify-between px-2 py-1.5 rounded-[3px] text-xs transition group ${isActive ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold" : "text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`
          },
          /* @__PURE__ */ React6.createElement(
            "button",
            {
              type: "button",
              "data-testid": `reports-preset-option-${preset.id}`,
              "data-active-preset": isActive ? "true" : "false",
              onClick: () => applyPreset(preset),
              className: "flex items-center gap-2 truncate flex-1 text-left cursor-pointer"
            },
            /* @__PURE__ */ React6.createElement(
              "span",
              {
                className: `w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center shrink-0 ${isActive ? "bg-indigo-600 border-indigo-600 text-white" : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"}`
              },
              isActive && /* @__PURE__ */ React6.createElement(Check4, { className: "w-2.5 h-2.5 stroke-[3]" })
            ),
            /* @__PURE__ */ React6.createElement("span", { className: "truncate" }, getPresetDisplayName(preset))
          ),
          /* @__PURE__ */ React6.createElement("div", { className: "flex items-center gap-1 shrink-0 ml-1" }, /* @__PURE__ */ React6.createElement("span", { className: "text-[10px] font-mono text-zinc-400 dark:text-zinc-500" }, preset.visibleColKeys.length, " cols"), /* @__PURE__ */ React6.createElement(
            "button",
            {
              type: "button",
              "data-testid": `reports-preset-rename-btn-${preset.id}`,
              onClick: (e) => startRenamePreset(preset, e),
              className: "p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded cursor-pointer transition opacity-70 group-hover:opacity-100",
              title: "Editar nombre de este formato"
            },
            /* @__PURE__ */ React6.createElement(Pencil2, { className: "w-3 h-3" })
          ), /* @__PURE__ */ React6.createElement(
            "button",
            {
              type: "button",
              "data-testid": `reports-preset-delete-${preset.id}`,
              onClick: (e) => {
                e.stopPropagation();
                handleDeletePreset(preset.id);
              },
              className: "p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded cursor-pointer transition",
              title: "Eliminar este formato"
            },
            /* @__PURE__ */ React6.createElement(Trash24, { className: "w-3 h-3" })
          ))
        );
      }))) : /* @__PURE__ */ React6.createElement(
        "div",
        {
          "data-testid": "reports-columns-menu",
          className: "flex flex-col gap-0.5 max-h-60 overflow-y-auto"
        },
        /* @__PURE__ */ React6.createElement("div", { className: "flex items-center justify-between px-2 py-1 border-b border-slate-200 dark:border-zinc-800 mb-1" }, /* @__PURE__ */ React6.createElement("span", { className: "text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400" }, "Columnas visibles"), /* @__PURE__ */ React6.createElement(
          "button",
          {
            type: "button",
            "data-testid": "reports-columns-reset-btn",
            onClick: () => resetReportCols(activeTab),
            className: "text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
          },
          "Mostrar todas"
        )),
        getOrderedColumns(activeTab).map((col) => {
          const visible = isColVisible(activeTab, col.key);
          return /* @__PURE__ */ React6.createElement(
            "button",
            {
              key: col.key,
              type: "button",
              "data-testid": `report-col-toggle-${activeTab}-${col.key}`,
              onClick: () => toggleReportCol(activeTab, col.key),
              className: "flex items-center gap-2 px-2 py-1 rounded-[3px] text-[11px] text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 cursor-pointer"
            },
            /* @__PURE__ */ React6.createElement(
              "span",
              {
                className: `w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center shrink-0 ${visible ? "bg-indigo-600 border-indigo-600 text-white" : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"}`
              },
              visible && /* @__PURE__ */ React6.createElement(Check4, { className: "w-2.5 h-2.5 stroke-[3]" })
            ),
            /* @__PURE__ */ React6.createElement("span", { className: "truncate" }, col.label)
          );
        })
      ),
      /* @__PURE__ */ React6.createElement("div", { className: "pt-2 mt-1 border-t border-slate-200 dark:border-zinc-800 flex flex-col gap-1.5 px-1" }, /* @__PURE__ */ React6.createElement("span", { className: "text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400" }, "+ Guardar formato actual"), /* @__PURE__ */ React6.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React6.createElement(
        "input",
        {
          type: "text",
          "data-testid": "reports-preset-name-input",
          placeholder: "Nombre del perfil / formato...",
          value: newPresetName,
          onChange: (e) => setNewPresetName(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSavePreset();
            }
          },
          className: "flex-1 px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 outline-none focus:border-indigo-500"
        }
      ), /* @__PURE__ */ React6.createElement(
        "button",
        {
          type: "button",
          "data-testid": "reports-preset-save-btn",
          onClick: handleSavePreset,
          disabled: !newPresetName.trim(),
          className: "flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition shrink-0",
          title: "Guardar perfil actual de columnas"
        },
        /* @__PURE__ */ React6.createElement(Plus4, { className: "w-3 h-3" }),
        /* @__PURE__ */ React6.createElement("span", null, "Guardar")
      )))
    )))),
    activeTab === "cronograma" && focusedProjectIds.length > 0 && /* @__PURE__ */ React6.createElement(
      "div",
      {
        "data-testid": "reports-focus-banner",
        className: "flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 bg-indigo-600 text-white text-xs shrink-0"
      },
      /* @__PURE__ */ React6.createElement("div", { className: "flex items-center gap-1.5 flex-wrap" }, /* @__PURE__ */ React6.createElement(Crosshair, { className: "w-3.5 h-3.5 shrink-0" }), /* @__PURE__ */ React6.createElement("span", { className: "font-mono font-bold text-[10px] uppercase tracking-wider" }, "Enfoque (", focusedProjectIds.length, "):"), focusedProjectIds.map((pid) => {
        const p = projectById.get(pid);
        if (!p) return null;
        return /* @__PURE__ */ React6.createElement(
          "span",
          {
            key: pid,
            "data-testid": `reports-focus-chip-${pid}`,
            className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 border border-white/30 text-[11px] font-medium"
          },
          /* @__PURE__ */ React6.createElement("span", { className: "truncate max-w-[180px]" }, p.name),
          /* @__PURE__ */ React6.createElement(
            "button",
            {
              type: "button",
              onClick: () => setFocusedProjectIds((prev) => prev.filter((id) => id !== pid)),
              className: "hover:text-amber-200 cursor-pointer",
              title: "Quitar proyecto del enfoque"
            },
            /* @__PURE__ */ React6.createElement(X5, { className: "w-3 h-3" })
          )
        );
      }), projects.filter((p) => !focusedProjectIds.includes(p.id)).length > 0 && /* @__PURE__ */ React6.createElement(
        "select",
        {
          "data-testid": "reports-focus-add-select",
          value: "",
          onChange: (e) => {
            const val = e.target.value;
            if (val && !focusedProjectIds.includes(val)) {
              setFocusedProjectIds((prev) => [...prev, val]);
            }
          },
          className: "px-2 py-0.5 rounded-[3px] bg-white/15 border border-white/30 text-white text-[10px] font-medium outline-none cursor-pointer"
        },
        /* @__PURE__ */ React6.createElement("option", { value: "", className: "text-zinc-900" }, "+ A\xF1adir proyecto..."),
        projects.filter((p) => !focusedProjectIds.includes(p.id)).map((p) => /* @__PURE__ */ React6.createElement("option", { key: p.id, value: p.id, className: "text-zinc-900" }, p.name))
      )),
      /* @__PURE__ */ React6.createElement(
        "button",
        {
          type: "button",
          "data-testid": "reports-focus-clear-btn",
          onClick: () => setFocusedProjectIds([]),
          className: "px-2 py-0.5 rounded-[3px] bg-white/20 hover:bg-white/30 text-[10px] font-semibold cursor-pointer shrink-0"
        },
        "Salir de enfoque"
      )
    ),
    /* @__PURE__ */ React6.createElement("div", { className: "flex-1 overflow-auto bg-white dark:bg-[#0C0C09] min-h-0 select-text" }, activeTab === "cronograma" && /* @__PURE__ */ React6.createElement("div", { className: "min-w-full inline-block align-middle" }, /* @__PURE__ */ React6.createElement("table", { className: "w-max table-fixed border-collapse text-left text-xs" }, /* @__PURE__ */ React6.createElement("thead", { className: "sticky top-0 z-10 bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border-b-2 border-[#0C0C09] dark:border-zinc-700 font-mono text-[11px] font-bold uppercase tracking-wider" }, /* @__PURE__ */ React6.createElement("tr", null, /* @__PURE__ */ React6.createElement(
      "th",
      {
        "data-testid": "report-col-id-header",
        className: "px-2.5 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 w-20 text-center bg-[#ECECE8] dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-200 select-none"
      },
      "ID"
    ), getOrderedColumns("cronograma").map(
      (col) => renderResizableTh(
        "cronograma",
        col,
        col.key === "dependency" ? "bg-amber-50/50 dark:bg-amber-950/20 text-amber-950 dark:text-amber-200" : ""
      )
    ))), /* @__PURE__ */ React6.createElement("tbody", { className: "divide-y divide-[#E2E2DC] dark:divide-zinc-800 font-mono text-[11px]" }, filteredCronoRows.length === 0 ? /* @__PURE__ */ React6.createElement("tr", null, /* @__PURE__ */ React6.createElement(
      "td",
      {
        colSpan: 1 + CRONO_COLUMNS.filter((c) => isColVisible("cronograma", c.key)).length,
        className: "px-4 py-8 text-center text-[#6B6B66] dark:text-zinc-400 font-sans"
      },
      "No se encontraron elementos en el cronograma que coincidan con los filtros."
    )) : filteredCronoRows.map((row, idx) => {
      const isRelease = row.level === "RELEASE";
      const isProject = row.level === "PROYECTO";
      const isMilestone = row.level === "HITO";
      const isDepSubRow = row.isDepRow;
      const linkedItem = !isRelease && !isProject ? itemById.get(row.itemId || row.rowId.replace(/-\d+$/, "")) : void 0;
      const linkedProject = isProject && row.projectId ? projectById.get(row.projectId) : void 0;
      const linkedRelease = isRelease && row.releaseId ? releaseById.get(row.releaseId) : void 0;
      const rowBgClass = isRelease ? "bg-slate-100/80 dark:bg-zinc-800/80 font-bold text-[#0C0C09] dark:text-zinc-100" : isProject ? "bg-indigo-50/40 dark:bg-indigo-950/20 font-semibold text-[#0C0C09] dark:text-zinc-200" : idx % 2 === 0 ? "bg-white dark:bg-[#0C0C09]" : "bg-[#FAFAF8] dark:bg-zinc-900/30";
      const isSelectedRow = Boolean(
        isRelease && linkedRelease && selectedEntity?.type === "release" && selectedEntity.id === linkedRelease.id || isProject && linkedProject && selectedEntity?.type === "project" && selectedEntity.id === linkedProject.id || !isRelease && !isProject && linkedItem && selectedEntity?.type === "task" && selectedEntity.id === linkedItem.id
      );
      return /* @__PURE__ */ React6.createElement(
        "tr",
        {
          key: row.rowId,
          "data-report-row": row.rowId,
          "data-selected-report-row": isSelectedRow ? "true" : void 0,
          onClick: () => {
            if (!onSelectEntity) return;
            if (isRelease && linkedRelease) {
              onSelectEntity({ type: "release", id: linkedRelease.id, name: linkedRelease.name || linkedRelease.code });
            } else if (isProject && linkedProject) {
              onSelectEntity({ type: "project", id: linkedProject.id, name: linkedProject.name });
            } else if (linkedItem) {
              onSelectEntity({ type: "task", id: linkedItem.id, name: linkedItem.name });
            }
          },
          onContextMenu: (e) => {
            const resolvedProjectId = isProject ? linkedProject?.id || row.projectId : linkedItem?.projectId || row.projectId;
            const resolvedReleaseId = isRelease ? linkedRelease?.id || row.releaseId : isProject ? linkedProject?.releaseId : linkedItem?.releaseId || (resolvedProjectId ? projectById.get(resolvedProjectId)?.releaseId : void 0);
            openRowContextMenu(e, {
              level: row.level,
              label: row.name || row.releaseCode || row.displayId || "Elemento",
              projectId: resolvedProjectId,
              releaseId: resolvedReleaseId,
              itemId: linkedItem?.id
            });
          },
          className: `${rowBgClass} ${isSelectedRow ? "ring-2 ring-inset ring-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/50" : "hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40"} cursor-pointer transition-colors`
        },
        /* @__PURE__ */ React6.createElement(
          "td",
          {
            "data-testid": `report-crono-id-${row.rowId}`,
            className: "px-2 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 text-center text-[10px] font-mono font-bold text-[#0C0C09] dark:text-zinc-200 bg-[#ECECE8]/40 dark:bg-zinc-900/50 select-none whitespace-nowrap"
          },
          row.displayId
        ),
        getOrderedColumns("cronograma").filter((c) => isColVisible("cronograma", c.key)).map((col) => {
          switch (col.key) {
            case "hierarchy":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap overflow-hidden" }, isRelease ? /* @__PURE__ */ React6.createElement("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-slate-800 text-white dark:bg-zinc-100 dark:text-[#0C0C09] text-[10px] font-bold" }, /* @__PURE__ */ React6.createElement(Rocket2, { className: "w-2.5 h-2.5" }), " RELEASE") : isProject ? /* @__PURE__ */ React6.createElement("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-indigo-700 text-white text-[10px] font-bold" }, /* @__PURE__ */ React6.createElement(FolderKanban2, { className: "w-2.5 h-2.5" }), " PROYECTO") : isMilestone ? /* @__PURE__ */ React6.createElement("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/40 text-[10px] font-semibold" }, "\u25C6 HITO") : isDepSubRow ? /* @__PURE__ */ React6.createElement("span", { className: "text-slate-400 dark:text-zinc-500 text-[10px] pl-4" }, "\u2514\u2500 Dependencia") : /* @__PURE__ */ React6.createElement("span", { className: "text-slate-600 dark:text-zinc-400 text-[10px]" }, "TAREA"));
            case "name":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 font-sans text-xs font-medium text-[#0C0C09] dark:text-zinc-100" }, linkedItem && onUpdateItem && !isDepSubRow ? /* @__PURE__ */ React6.createElement(
                EditableReportTextCell,
                {
                  testId: `report-crono-name-${linkedItem.id}`,
                  value: linkedItem.name,
                  onCommit: (next) => onUpdateItem({ ...linkedItem, name: next || linkedItem.name }, false)
                }
              ) : linkedProject && onUpdateProject ? /* @__PURE__ */ React6.createElement(
                EditableReportTextCell,
                {
                  testId: `report-crono-proj-name-${linkedProject.id}`,
                  value: linkedProject.name,
                  className: "font-semibold",
                  onCommit: (next) => onUpdateProject({ ...linkedProject, name: next || linkedProject.name })
                }
              ) : linkedRelease && onUpdateRelease ? /* @__PURE__ */ React6.createElement(
                EditableReportTextCell,
                {
                  testId: `report-crono-rel-name-${linkedRelease.id}`,
                  value: linkedRelease.name,
                  className: "font-bold",
                  onCommit: (next) => onUpdateRelease({ ...linkedRelease, name: next || linkedRelease.name })
                }
              ) : /* @__PURE__ */ React6.createElement("span", { className: "truncate block px-1.5" }, row.name));
            case "releaseCode":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#6B6B66] dark:text-zinc-300" }, linkedItem && onUpdateItem && !isDepSubRow ? /* @__PURE__ */ React6.createElement(
                "select",
                {
                  "data-testid": `report-crono-release-${linkedItem.id}`,
                  value: linkedItem.releaseId || "",
                  onChange: (e) => onUpdateItem(
                    { ...linkedItem, releaseId: e.target.value || void 0 },
                    false
                  ),
                  className: "w-full bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[11px] outline-none cursor-pointer"
                },
                /* @__PURE__ */ React6.createElement("option", { value: "" }, "Heredada"),
                releases.map((r) => /* @__PURE__ */ React6.createElement("option", { key: r.id, value: r.id }, r.code))
              ) : linkedProject && onUpdateProject ? /* @__PURE__ */ React6.createElement(
                "select",
                {
                  "data-testid": `report-crono-proj-release-${linkedProject.id}`,
                  value: linkedProject.releaseId || "",
                  onChange: (e) => onUpdateProject({
                    ...linkedProject,
                    releaseId: e.target.value || void 0
                  }),
                  className: "w-full bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[11px] outline-none cursor-pointer"
                },
                /* @__PURE__ */ React6.createElement("option", { value: "" }, "Sin asignar"),
                releases.map((r) => /* @__PURE__ */ React6.createElement("option", { key: r.id, value: r.id }, r.code))
              ) : /* @__PURE__ */ React6.createElement("span", { className: "px-1" }, row.releaseCode));
            case "projectName":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap font-sans text-xs text-[#0C0C09] dark:text-zinc-200 overflow-hidden" }, /* @__PURE__ */ React6.createElement("div", { className: "flex items-center gap-1.5 min-w-0" }, /* @__PURE__ */ React6.createElement("span", { className: "truncate" }, row.projectName), (isProject || row.alertLevel !== void 0 && row.alertLevel > 0) && row.alertLevel !== void 0 && /* @__PURE__ */ React6.createElement(
                "span",
                {
                  "data-testid": `cronograma-project-alert-badge-${row.wbsCode}`,
                  className: `inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border shrink-0 ${row.alertLevel === 1 ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" : row.alertLevel === 2 ? "bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800" : row.alertLevel === 3 ? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800" : "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"}`,
                  title: `Nivel de alerta: ${row.alertLevel}`
                },
                /* @__PURE__ */ React6.createElement(
                  "span",
                  {
                    className: `w-1.5 h-1.5 rounded-full shrink-0 ${row.alertLevel === 1 ? "bg-amber-500" : row.alertLevel === 2 ? "bg-orange-500" : row.alertLevel === 3 ? "bg-rose-500" : "bg-zinc-400"}`
                  }
                ),
                /* @__PURE__ */ React6.createElement("span", null, row.alertLevel)
              )));
            case "platform":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap" }, linkedItem && onUpdateItem && !isDepSubRow ? /* @__PURE__ */ React6.createElement(
                "select",
                {
                  "data-testid": `report-crono-platform-${linkedItem.id}`,
                  value: linkedItem.platform || "",
                  onChange: (e) => onUpdateItem(
                    {
                      ...linkedItem,
                      platform: e.target.value || void 0
                    },
                    false
                  ),
                  className: "w-full bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[10px] font-bold outline-none cursor-pointer"
                },
                /* @__PURE__ */ React6.createElement("option", { value: "" }, "Heredada (", row.platform, ")"),
                /* @__PURE__ */ React6.createElement("option", { value: "iOS" }, "iOS"),
                /* @__PURE__ */ React6.createElement("option", { value: "Android" }, "Android"),
                /* @__PURE__ */ React6.createElement("option", { value: "iOS/Android" }, "iOS/Android")
              ) : linkedProject && onUpdateProject ? /* @__PURE__ */ React6.createElement(
                "select",
                {
                  "data-testid": `report-crono-proj-platform-${linkedProject.id}`,
                  value: normalizePlatform(linkedProject.platform) || "iOS/Android",
                  onChange: (e) => onUpdateProject({
                    ...linkedProject,
                    platform: e.target.value
                  }),
                  className: "w-full bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[10px] font-bold outline-none cursor-pointer"
                },
                /* @__PURE__ */ React6.createElement("option", { value: "iOS" }, "iOS"),
                /* @__PURE__ */ React6.createElement("option", { value: "Android" }, "Android"),
                /* @__PURE__ */ React6.createElement("option", { value: "iOS/Android" }, "iOS/Android")
              ) : row.platform !== "\u2014" ? /* @__PURE__ */ React6.createElement(
                "span",
                {
                  className: `px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold ${row.platform === "iOS" ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300" : row.platform === "Android" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"}`
                },
                row.platform
              ) : /* @__PURE__ */ React6.createElement("span", { className: "text-slate-400 px-1" }, "\u2014"));
            case "team":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap" }, linkedItem && onUpdateItem && !isDepSubRow ? /* @__PURE__ */ React6.createElement(
                EditableReportTextCell,
                {
                  testId: `report-crono-team-${linkedItem.id}`,
                  value: linkedItem.assignee || "",
                  placeholder: "Sin equipo",
                  onCommit: (val) => onUpdateItem(
                    { ...linkedItem, assignee: val.trim() || void 0 },
                    false
                  )
                }
              ) : /* @__PURE__ */ React6.createElement(
                "span",
                {
                  "data-testid": `report-crono-team-text-${row.rowId}`,
                  className: "px-1.5 text-[11px] text-slate-600 dark:text-zinc-300 truncate block",
                  title: row.team
                },
                row.team
              ));
            case "alertLevel": {
              const alertVal = row.alertLevel ?? 0;
              const alertSelectClass = alertVal === 1 ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" : alertVal === 2 ? "bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800" : alertVal === 3 ? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800" : "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap" }, linkedItem && onUpdateItem && !isDepSubRow ? /* @__PURE__ */ React6.createElement(
                "select",
                {
                  "data-testid": `report-crono-alert-${linkedItem.id}`,
                  value: linkedItem.alertLevel ?? 0,
                  onChange: (e) => onUpdateItem(
                    {
                      ...linkedItem,
                      alertLevel: Number(e.target.value)
                    },
                    false
                  ),
                  className: `w-full px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border outline-none cursor-pointer ${alertSelectClass}`
                },
                /* @__PURE__ */ React6.createElement("option", { value: 0 }, "Nivel 0"),
                /* @__PURE__ */ React6.createElement("option", { value: 1 }, "Nivel 1"),
                /* @__PURE__ */ React6.createElement("option", { value: 2 }, "Nivel 2"),
                /* @__PURE__ */ React6.createElement("option", { value: 3 }, "Nivel 3")
              ) : linkedProject && onUpdateProject ? /* @__PURE__ */ React6.createElement(
                "select",
                {
                  "data-testid": `report-crono-proj-alert-${linkedProject.id}`,
                  value: linkedProject.alertLevel ?? 0,
                  onChange: (e) => onUpdateProject({
                    ...linkedProject,
                    alertLevel: Number(e.target.value)
                  }),
                  className: `w-full px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border outline-none cursor-pointer ${alertSelectClass}`
                },
                /* @__PURE__ */ React6.createElement("option", { value: 0 }, "Nivel 0"),
                /* @__PURE__ */ React6.createElement("option", { value: 1 }, "Nivel 1"),
                /* @__PURE__ */ React6.createElement("option", { value: 2 }, "Nivel 2"),
                /* @__PURE__ */ React6.createElement("option", { value: 3 }, "Nivel 3")
              ) : /* @__PURE__ */ React6.createElement("span", { className: "text-slate-400 px-1" }, "\u2014"));
            }
            case "type":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#6B6B66] dark:text-zinc-400" }, linkedItem && onUpdateItem && !isDepSubRow ? /* @__PURE__ */ React6.createElement(
                "select",
                {
                  "data-testid": `report-crono-type-${linkedItem.id}`,
                  value: linkedItem.type,
                  onChange: (e) => {
                    const nextType = e.target.value;
                    onUpdateItem(
                      {
                        ...linkedItem,
                        type: nextType,
                        duration: nextType === "milestone" ? 0 : Math.max(1, linkedItem.duration || 1),
                        endDate: nextType === "milestone" ? linkedItem.startDate : calculateEndDateFromDuration(
                          linkedItem.startDate,
                          Math.max(1, linkedItem.duration || 1),
                          "task"
                        )
                      },
                      false
                    );
                  },
                  className: "w-full bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[11px] outline-none cursor-pointer"
                },
                /* @__PURE__ */ React6.createElement("option", { value: "task" }, "Tarea"),
                /* @__PURE__ */ React6.createElement("option", { value: "milestone" }, "Hito")
              ) : /* @__PURE__ */ React6.createElement("span", { className: "px-1" }, row.type));
            case "startDate":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#0C0C09] dark:text-zinc-300" }, linkedItem && onUpdateItem && !isDepSubRow ? /* @__PURE__ */ React6.createElement(
                "input",
                {
                  type: "date",
                  "data-testid": `report-crono-start-${linkedItem.id}`,
                  value: linkedItem.startDate,
                  onChange: (e) => {
                    const nextStart = e.target.value;
                    if (!nextStart) return;
                    const nextEnd = linkedItem.type === "milestone" ? nextStart : calculateEndDateFromDuration(
                      nextStart,
                      Math.max(1, linkedItem.duration || 1),
                      "task"
                    );
                    onUpdateItem(
                      { ...linkedItem, startDate: nextStart, endDate: nextEnd },
                      true
                    );
                  },
                  className: "w-full bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[11px] outline-none"
                }
              ) : /* @__PURE__ */ React6.createElement("span", { className: "px-1" }, row.startDate));
            case "endDate":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#0C0C09] dark:text-zinc-300" }, linkedItem && onUpdateItem && !isDepSubRow && linkedItem.type === "task" ? /* @__PURE__ */ React6.createElement(
                "input",
                {
                  type: "date",
                  "data-testid": `report-crono-end-${linkedItem.id}`,
                  value: linkedItem.endDate,
                  min: linkedItem.startDate,
                  onChange: (e) => {
                    const nextEnd = e.target.value;
                    if (!nextEnd || nextEnd < linkedItem.startDate) return;
                    const nextDur = Math.max(
                      1,
                      calculateDurationFromDates(linkedItem.startDate, nextEnd, "task")
                    );
                    onUpdateItem(
                      { ...linkedItem, endDate: nextEnd, duration: nextDur },
                      true
                    );
                  },
                  className: "w-full bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[11px] outline-none"
                }
              ) : /* @__PURE__ */ React6.createElement("span", { className: "px-1" }, row.endDate));
            case "duration":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right font-bold" }, linkedItem && onUpdateItem && !isDepSubRow && linkedItem.type === "task" ? /* @__PURE__ */ React6.createElement(
                "input",
                {
                  type: "number",
                  min: 1,
                  "data-testid": `report-crono-duration-${linkedItem.id}`,
                  value: linkedItem.duration,
                  onChange: (e) => {
                    const nextDur = Math.max(1, parseInt(e.target.value, 10) || 1);
                    const nextEnd = calculateEndDateFromDuration(
                      linkedItem.startDate,
                      nextDur,
                      "task"
                    );
                    onUpdateItem(
                      { ...linkedItem, duration: nextDur, endDate: nextEnd },
                      true
                    );
                  },
                  className: "w-14 text-right bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[11px] font-bold outline-none"
                }
              ) : /* @__PURE__ */ React6.createElement("span", null, row.duration, " d"));
            case "slack":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right text-slate-500" }, linkedItem && onUpdateItem && !isDepSubRow && linkedItem.type === "task" ? /* @__PURE__ */ React6.createElement(
                "input",
                {
                  type: "number",
                  min: 0,
                  "data-testid": `report-crono-slack-${linkedItem.id}`,
                  value: linkedItem.slack || 0,
                  onChange: (e) => {
                    const nextSlack = Math.max(0, parseInt(e.target.value, 10) || 0);
                    onUpdateItem({ ...linkedItem, slack: nextSlack }, false);
                  },
                  className: "w-12 text-right bg-transparent px-1 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[11px] outline-none"
                }
              ) : /* @__PURE__ */ React6.createElement("span", null, row.slack, " d"));
            case "progress":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-2 py-1 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-center" }, linkedItem && onUpdateItem && !isDepSubRow && linkedItem.type === "task" ? /* @__PURE__ */ React6.createElement(
                "input",
                {
                  type: "number",
                  min: 0,
                  max: 100,
                  step: 5,
                  "data-testid": `report-crono-progress-${linkedItem.id}`,
                  value: linkedItem.progress ?? 0,
                  onChange: (e) => {
                    const nextProg = Math.max(
                      0,
                      Math.min(100, parseInt(e.target.value, 10) || 0)
                    );
                    onUpdateItem({ ...linkedItem, progress: nextProg }, false);
                  },
                  className: "w-12 text-center bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded-[2px] border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-indigo-500 text-[10px] font-bold outline-none"
                }
              ) : /* @__PURE__ */ React6.createElement("span", { className: "px-1.5 py-0.5 rounded-[2px] bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold" }, row.progress));
            case "dependency":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 bg-amber-50/20 dark:bg-amber-950/10 font-sans text-xs overflow-hidden" }, row.dependency !== "\u2014" ? /* @__PURE__ */ React6.createElement("div", { className: "flex flex-wrap items-center gap-1.5 max-w-full" }, row.dependency.split(", ").map((depStr, idx2) => /* @__PURE__ */ React6.createElement(
                "span",
                {
                  key: idx2,
                  className: "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300/60 dark:border-amber-700/60 font-medium max-w-full"
                },
                /* @__PURE__ */ React6.createElement(Link2, { className: "w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" }),
                /* @__PURE__ */ React6.createElement("span", { className: "font-semibold truncate" }, depStr)
              ))) : /* @__PURE__ */ React6.createElement("span", { className: "text-slate-400 font-mono" }, "\u2014"));
            case "isCritical":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-center" }, row.isCritical ? /* @__PURE__ */ React6.createElement("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[10px]" }, /* @__PURE__ */ React6.createElement(Flame2, { className: "w-3 h-3 text-rose-600" }), " S\xCD") : /* @__PURE__ */ React6.createElement("span", { className: "text-slate-400" }, "NO"));
            case "isExternal":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-center" }, linkedItem && onUpdateItem && !isDepSubRow ? /* @__PURE__ */ React6.createElement(
                "input",
                {
                  type: "checkbox",
                  "data-testid": `report-crono-external-${linkedItem.id}`,
                  checked: Boolean(linkedItem.isExternal),
                  onChange: (e) => onUpdateItem({ ...linkedItem, isExternal: e.target.checked }, false),
                  title: "Marcar como hito/tarea externa",
                  className: "w-3.5 h-3.5 accent-amber-600 cursor-pointer align-middle"
                }
              ) : row.isExternal ? /* @__PURE__ */ React6.createElement("span", { className: "px-1.5 py-0.5 rounded-[2px] bg-amber-100 text-amber-800 text-[10px] font-bold" }, "S\xCD") : /* @__PURE__ */ React6.createElement("span", { className: "text-slate-400" }, "NO"));
            case "compliance":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-3 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap overflow-hidden" }, row.compliance === "Conforme" ? /* @__PURE__ */ React6.createElement("span", { className: "inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]" }, /* @__PURE__ */ React6.createElement(CheckCircle2, { className: "w-3 h-3 shrink-0" }), " Conforme") : /* @__PURE__ */ React6.createElement("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-800" }, /* @__PURE__ */ React6.createElement(AlertTriangle3, { className: "w-3 h-3 text-amber-600 shrink-0" }), /* @__PURE__ */ React6.createElement("span", { className: "truncate" }, row.compliance)));
            case "notes":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-2 py-1.5 font-sans text-xs text-[#6B6B66] dark:text-zinc-400 whitespace-pre-line leading-relaxed" }, linkedItem && onUpdateItem && !isDepSubRow ? /* @__PURE__ */ React6.createElement(
                EditableReportTextCell,
                {
                  testId: `report-crono-notes-${linkedItem.id}`,
                  value: linkedItem.notes || "",
                  placeholder: "A\xF1adir notas...",
                  multiline: true,
                  onCommit: (next) => onUpdateItem(
                    { ...linkedItem, notes: next.trim() || void 0 },
                    false
                  )
                }
              ) : linkedProject && onUpdateProject ? /* @__PURE__ */ React6.createElement(
                EditableReportTextCell,
                {
                  testId: `report-crono-proj-desc-${linkedProject.id}`,
                  value: linkedProject.description || "",
                  placeholder: "A\xF1adir descripci\xF3n...",
                  multiline: true,
                  onCommit: (next) => onUpdateProject({ ...linkedProject, description: next })
                }
              ) : /* @__PURE__ */ React6.createElement("span", { className: "px-1" }, row.notes || "\u2014"));
            default:
              return null;
          }
        })
      );
    })))), activeTab === "releases" && /* @__PURE__ */ React6.createElement("div", { className: "min-w-full inline-block align-middle" }, /* @__PURE__ */ React6.createElement("table", { className: "w-max table-fixed border-collapse text-left text-xs" }, /* @__PURE__ */ React6.createElement("thead", { className: "sticky top-0 z-10 bg-[#F4F4F1] dark:bg-zinc-800 text-[#0C0C09] dark:text-zinc-200 border-b-2 border-[#0C0C09] dark:border-zinc-700 font-mono text-[11px] font-bold uppercase tracking-wider" }, /* @__PURE__ */ React6.createElement("tr", null, /* @__PURE__ */ React6.createElement(
      "th",
      {
        "data-testid": "report-col-id-header",
        className: "px-2.5 py-2 border-r border-[#E2E2DC] dark:border-zinc-700 w-20 text-center bg-[#ECECE8] dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-200 select-none"
      },
      "ID"
    ), getOrderedColumns("releases").map((col) => renderResizableTh("releases", col)))), /* @__PURE__ */ React6.createElement("tbody", { className: "divide-y divide-[#E2E2DC] dark:divide-zinc-800 font-mono text-[11px]" }, filteredReleaseRows.length === 0 ? /* @__PURE__ */ React6.createElement("tr", null, /* @__PURE__ */ React6.createElement(
      "td",
      {
        colSpan: 1 + RELEASE_COLUMNS.filter((c) => isColVisible("releases", c.key)).length,
        className: "px-4 py-8 text-center text-[#6B6B66] dark:text-zinc-400 font-sans"
      },
      "No hay releases registradas o ninguna coincide con los filtros aplicados."
    )) : filteredReleaseRows.map((row, idx) => {
      const linkedRel = row.releaseId ? releaseById.get(row.releaseId) : releases.find((r) => r.code === row.code);
      const isSelectedRel = Boolean(
        linkedRel && selectedEntity?.type === "release" && selectedEntity.id === linkedRel.id
      );
      return /* @__PURE__ */ React6.createElement(
        "tr",
        {
          key: row.releaseId || row.code,
          "data-report-row": row.releaseId || row.code,
          "data-selected-report-row": isSelectedRel ? "true" : void 0,
          onClick: () => {
            if (linkedRel && onSelectEntity) {
              onSelectEntity({ type: "release", id: linkedRel.id, name: linkedRel.name || linkedRel.code });
            }
          },
          onContextMenu: (e) => {
            openRowContextMenu(e, {
              level: "RELEASE",
              label: row.name || row.code,
              releaseId: linkedRel?.id || row.releaseId
            });
          },
          className: `${isSelectedRel ? "ring-2 ring-inset ring-indigo-500 bg-amber-50/70 dark:bg-amber-950/40" : "bg-white dark:bg-[#0C0C09] hover:bg-amber-50/40 dark:hover:bg-amber-950/20"} cursor-pointer transition-colors`
        },
        /* @__PURE__ */ React6.createElement(
          "td",
          {
            "data-testid": `report-rel-id-${row.code}`,
            className: "px-2 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 text-center text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-[#ECECE8]/40 dark:bg-zinc-900 select-none whitespace-nowrap"
          },
          row.code
        ),
        getOrderedColumns("releases").filter((c) => isColVisible("releases", c.key)).map((col) => {
          switch (col.key) {
            case "code":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-2 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap" }, linkedRel && onUpdateRelease ? /* @__PURE__ */ React6.createElement(
                EditableReportTextCell,
                {
                  testId: `report-rel-code-${linkedRel.id}`,
                  value: linkedRel.code,
                  className: "font-bold text-amber-700 dark:text-amber-400",
                  onCommit: (next) => onUpdateRelease({ ...linkedRel, code: next || linkedRel.code })
                }
              ) : row.code);
            case "name":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-2 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 font-sans text-xs font-bold text-[#0C0C09] dark:text-zinc-100" }, linkedRel && onUpdateRelease ? /* @__PURE__ */ React6.createElement(
                EditableReportTextCell,
                {
                  testId: `report-rel-name-${linkedRel.id}`,
                  value: linkedRel.name,
                  className: "font-bold",
                  onCommit: (next) => onUpdateRelease({ ...linkedRel, name: next || linkedRel.name })
                }
              ) : row.name);
            case "month":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-2 py-1.5 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-[#6B6B66] dark:text-zinc-300" }, linkedRel && onUpdateRelease ? /* @__PURE__ */ React6.createElement(
                EditableReportTextCell,
                {
                  testId: `report-rel-month-${linkedRel.id}`,
                  value: linkedRel.month || "",
                  onCommit: (next) => onUpdateRelease({ ...linkedRel, month: next || linkedRel.month })
                }
              ) : row.month);
            case "startDate":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap" }, row.startDate);
            case "endDate":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap" }, row.endDate);
            case "duration":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 whitespace-nowrap text-right font-bold" }, row.duration, " d");
            case "assignedProjects":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-3 py-2 border-r border-[#E2E2DC] dark:border-zinc-800 font-sans text-xs text-[#0C0C09] dark:text-zinc-200 truncate" }, row.assignedProjects);
            case "keyMilestones":
              return /* @__PURE__ */ React6.createElement("td", { key: col.key, className: "px-3 py-2 font-mono text-[10px] text-[#6B6B66] dark:text-zinc-400 truncate" }, row.keyMilestones);
            default:
              return null;
          }
        })
      );
    }))))),
    /* @__PURE__ */ React6.createElement("div", { className: "flex items-center justify-between px-4 py-1.5 bg-[#F4F4F1] dark:bg-zinc-900 border-t border-[#0C0C09] dark:border-zinc-800 text-[11px] font-mono text-[#6B6B66] dark:text-zinc-400 shrink-0" }, /* @__PURE__ */ React6.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React6.createElement("span", { className: "flex items-center gap-1 font-semibold text-[#0C0C09] dark:text-zinc-300" }, /* @__PURE__ */ React6.createElement("span", { className: "w-2 h-2 rounded-full bg-emerald-500 inline-block" }), "Listo"), /* @__PURE__ */ React6.createElement("span", null, "Pesta\xF1a activa:", " ", /* @__PURE__ */ React6.createElement("strong", { className: "text-[#0C0C09] dark:text-zinc-200" }, activeTab === "cronograma" ? "Planificaci\xF3n" : "Cat\xE1logo Releases")), /* @__PURE__ */ React6.createElement("span", null, "Registros:", " ", /* @__PURE__ */ React6.createElement("strong", { className: "text-[#0C0C09] dark:text-zinc-200" }, activeTab === "cronograma" ? `${filteredCronoRows.length} de ${cronoRows.length}` : `${filteredReleaseRows.length} de ${releaseRows.length}`))), /* @__PURE__ */ React6.createElement("div", { className: "hidden sm:flex items-center gap-3" }, /* @__PURE__ */ React6.createElement("span", null, "Formato: XLSX Compatible"), /* @__PURE__ */ React6.createElement("span", null, "100% Sincronizado"))),
    contextMenu && /* @__PURE__ */ React6.createElement(
      "div",
      {
        ref: contextMenuRef,
        "data-testid": "report-row-context-menu",
        style: { left: contextMenu.x, top: contextMenu.y },
        className: "fixed z-50 w-60 rounded-[6px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl py-1.5 text-xs select-none"
      },
      /* @__PURE__ */ React6.createElement("div", { className: "px-3 py-1.5 border-b border-[#E2E2DC] dark:border-zinc-800 flex items-center gap-1.5" }, /* @__PURE__ */ React6.createElement("span", { className: "px-1.5 py-0.2 rounded-[2px] text-[9px] font-mono font-bold uppercase bg-[#F4F4F1] dark:bg-zinc-800 text-[#6B6B66] dark:text-zinc-300 border border-[#E2E2DC] dark:border-zinc-700 shrink-0" }, contextMenu.level), /* @__PURE__ */ React6.createElement("span", { className: "truncate font-semibold text-[11px] text-[#0C0C09] dark:text-zinc-100" }, contextMenu.label)),
      /* @__PURE__ */ React6.createElement("div", { className: "py-1 flex flex-col" }, onCreateTask && contextMenu.projectId && /* @__PURE__ */ React6.createElement(
        "button",
        {
          type: "button",
          "data-testid": "report-ctx-create-task",
          onClick: () => {
            onCreateTask(contextMenu.projectId);
            setContextMenu(null);
          },
          className: "w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#0C0C09] dark:text-zinc-100 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer transition-colors"
        },
        /* @__PURE__ */ React6.createElement(Plus4, { className: "w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" }),
        /* @__PURE__ */ React6.createElement("span", null, "Nueva tarea en este proyecto")
      ), onCreateMilestone && contextMenu.projectId && /* @__PURE__ */ React6.createElement(
        "button",
        {
          type: "button",
          "data-testid": "report-ctx-create-milestone",
          onClick: () => {
            onCreateMilestone(contextMenu.projectId);
            setContextMenu(null);
          },
          className: "w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#0C0C09] dark:text-zinc-100 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer transition-colors"
        },
        /* @__PURE__ */ React6.createElement(Flag, { className: "w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" }),
        /* @__PURE__ */ React6.createElement("span", null, "Nuevo hito en este proyecto")
      ), (onCreateProjectFromWizard || onCreateProject) && /* @__PURE__ */ React6.createElement(
        "button",
        {
          type: "button",
          "data-testid": "report-ctx-create-project",
          onClick: () => {
            if (onCreateProjectFromWizard) {
              setWizardInitialReleaseId(contextMenu.releaseId);
              setWizardOpen(true);
            } else if (onCreateProject) {
              onCreateProject(
                contextMenu.releaseId ? { releaseId: contextMenu.releaseId } : void 0
              );
            }
            setContextMenu(null);
          },
          className: "w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#0C0C09] dark:text-zinc-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer transition-colors"
        },
        /* @__PURE__ */ React6.createElement(FolderPlus2, { className: "w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" }),
        /* @__PURE__ */ React6.createElement("span", null, contextMenu.releaseId ? "Nuevo proyecto en esta release" : "Nuevo proyecto")
      ), onCreateMilestone && /* @__PURE__ */ React6.createElement(
        "button",
        {
          type: "button",
          "data-testid": "report-ctx-create-external-milestone",
          onClick: () => {
            onCreateMilestone(void 0);
            setContextMenu(null);
          },
          className: "w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#0C0C09] dark:text-zinc-100 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer transition-colors"
        },
        /* @__PURE__ */ React6.createElement(Flag, { className: "w-3.5 h-3.5 text-orange-500 shrink-0" }),
        /* @__PURE__ */ React6.createElement("span", null, "Nuevo hito externo")
      ), contextMenu.projectId && /* @__PURE__ */ React6.createElement(
        "button",
        {
          type: "button",
          "data-testid": "report-ctx-focus-project",
          onClick: () => {
            const pid = contextMenu.projectId;
            setFocusedProjectIds(
              (prev) => prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
            );
            setContextMenu(null);
          },
          className: "w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#0C0C09] dark:text-zinc-100 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer transition-colors"
        },
        /* @__PURE__ */ React6.createElement(Crosshair, { className: "w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" }),
        /* @__PURE__ */ React6.createElement("span", null, focusedProjectIds.includes(contextMenu.projectId) ? "Quitar del enfoque" : focusedProjectIds.length > 0 ? "A\xF1adir proyecto al enfoque" : "Enfocar este proyecto")
      )),
      onSelectEntity && /* @__PURE__ */ React6.createElement("div", { className: "pt-1 border-t border-[#E2E2DC] dark:border-zinc-800" }, /* @__PURE__ */ React6.createElement(
        "button",
        {
          type: "button",
          "data-testid": "report-ctx-view-details",
          onClick: () => {
            if (contextMenu.level === "RELEASE" && contextMenu.releaseId) {
              onSelectEntity({ type: "release", id: contextMenu.releaseId, name: contextMenu.label });
            } else if (contextMenu.level === "PROYECTO" && contextMenu.projectId) {
              onSelectEntity({ type: "project", id: contextMenu.projectId, name: contextMenu.label });
            } else if (contextMenu.itemId) {
              onSelectEntity({ type: "task", id: contextMenu.itemId, name: contextMenu.label });
            }
            setContextMenu(null);
          },
          className: "w-full px-3 py-1.5 text-left flex items-center gap-2 text-[#6B6B66] dark:text-zinc-400 hover:bg-[#F4F4F1] dark:hover:bg-zinc-800 hover:text-[#0C0C09] dark:hover:text-zinc-100 cursor-pointer transition-colors"
        },
        /* @__PURE__ */ React6.createElement(Eye2, { className: "w-3.5 h-3.5 shrink-0" }),
        /* @__PURE__ */ React6.createElement("span", null, "Ver detalles")
      ))
    ),
    /* @__PURE__ */ React6.createElement(
      ProjectWizardModal,
      {
        isOpen: wizardOpen,
        onClose: () => setWizardOpen(false),
        releases,
        existingTeams: Array.from(
          new Set(items.map((it) => it.assignee?.trim()).filter((x) => Boolean(x)))
        ),
        initialReleaseId: wizardInitialReleaseId,
        onCreate: (payload) => {
          if (onCreateProjectFromWizard) {
            onCreateProjectFromWizard(payload);
          } else if (onCreateProject) {
            onCreateProject(payload.project);
          }
        }
      }
    )
  );
};
export {
  GanttWorkspace,
  default2 as React,
  ReportsView,
  computeGanttMetrics,
  createSavedFilter,
  renderToString
};
