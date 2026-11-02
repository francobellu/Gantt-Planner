import * as XLSX from 'xlsx';
import {
  GanttItem,
  GanttProject,
  Release,
  ReleaseMilestone,
  ReleaseMilestoneDefinition,
  TaskColor,
} from '../types/gantt';

export const RELEASE_MILESTONE_DEFINITIONS: ReleaseMilestoneDefinition[] = [
  {
    id: 'qg1',
    code: 'QG1',
    name: 'Sign off Release QG1',
    category: 'SCOPE RELEASE',
    color: 'cyan',
  },
  {
    id: 'qg2',
    code: 'QG2',
    name: 'Sign off Release QG2',
    category: 'SCOPE RELEASE',
    color: 'cyan',
  },
  {
    id: 'qg3',
    code: 'QG3',
    name: 'Sign off Release QG3',
    category: 'SCOPE RELEASE',
    color: 'cyan',
  },
  {
    id: 'qg4',
    code: 'QG4',
    name: 'Sign Off Release QG4 Pruebas PT',
    category: 'Entorno ACEP',
    color: 'violet',
  },
  {
    id: 'qg5',
    code: 'QG5',
    name: 'Sign off Release QG5 Pruebas VCP & UAT',
    category: 'Entorno ACEP',
    color: 'violet',
  },
  {
    id: 'rc_ini',
    code: 'RC INI',
    name: 'Merge & Deploy RC - INI',
    category: 'MERGE & DEPLOY RC',
    color: 'slate',
  },
  {
    id: 'rc_fin',
    code: 'RC FIN',
    name: 'Merge & Deploy RC - FIN',
    category: 'MERGE & DEPLOY RC',
    color: 'slate',
  },
  {
    id: 'uat_ini',
    code: 'UAT INI',
    name: 'Entorno UAT - INI',
    category: 'Entorno UAT',
    color: 'indigo',
  },
  {
    id: 'qg5_1_6',
    code: 'QG5.1,6',
    name: 'Sign off Release QG5.1 y QG6 Pruebas FAT',
    category: 'Entorno UAT',
    color: 'indigo',
  },
  {
    id: 'pre_ini',
    code: 'PREPRO INI',
    name: 'Entorno PREPRO - INI',
    category: 'Entorno PREPRO',
    color: 'pink',
  },
  {
    id: 'pre_fin',
    code: 'PREPRO FIN',
    name: 'Entorno PREPRO - FIN',
    category: 'Entorno PREPRO',
    color: 'pink',
  },
  {
    id: 'qg7',
    code: 'QG7',
    name: 'Sign off Release QG7 Subida a 1L + P4',
    category: 'PROD',
    color: 'sky',
  },
  {
    id: 'prod_1l',
    code: '1L',
    name: 'PROD 1L',
    category: 'PROD',
    color: 'emerald',
  },
  {
    id: 'qg8',
    code: 'QG8',
    name: 'Sign off Release QG8',
    category: 'PROD',
    color: 'emerald',
  },
  {
    id: 'iop',
    code: 'IOP',
    name: 'PROD IOP',
    category: 'PROD',
    color: 'lime',
  },
  {
    id: 'qg9',
    code: 'QG9',
    name: 'Signoff Release QG9',
    category: 'QG9',
    color: 'amber',
  },
];

interface RawReleaseRow {
  code: string;
  month: string;
  year: number;
  dates: Record<string, string>; // definition id -> 'DD/MM/YYYY'
}

function parseDmyToIso(dmy: string | undefined): string {
  if (!dmy || typeof dmy !== 'string') return '';
  const match = dmy.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return '';
  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3];
  return `${year}-${month}-${day}`;
}

const RAW_DEFAULT_RELEASES_DATA: RawReleaseRow[] = [
  {
    code: 'T_26.12.1',
    month: 'DICIEMBRE',
    year: 2026,
    dates: {
      qg1: '05/10/2026',
      qg2: '12/10/2026',
      qg3: '19/10/2026',
      qg4: '30/10/2026',
      qg5: '13/11/2026',
      rc_ini: '16/11/2026',
      rc_fin: '19/11/2026',
      uat_ini: '20/11/2026',
      qg5_1_6: '02/12/2026',
      pre_ini: '03/12/2026',
      pre_fin: '04/12/2026',
      qg7: '03/12/2026',
      prod_1l: '06/12/2026',
      qg8: '10/12/2026',
      iop: '12/12/2026',
      qg9: '25/12/2026',
    },
  },
  {
    code: 'T_27.1.1',
    month: 'ENERO',
    year: 2027,
    dates: {
      qg1: '04/11/2026',
      qg2: '11/11/2026',
      qg3: '18/11/2026',
      qg4: '02/12/2026',
      qg5: '16/12/2026',
      rc_ini: '17/12/2026',
      rc_fin: '22/12/2026',
      uat_ini: '23/12/2026',
      qg5_1_6: '05/01/2027',
      pre_ini: '07/01/2027',
      pre_fin: '08/01/2027',
      qg7: '07/01/2027',
      prod_1l: '10/01/2027',
      qg8: '14/01/2027',
      iop: '16/01/2027',
      qg9: '29/01/2027',
    },
  },
  {
    code: 'T_27.2.1',
    month: 'FEBRERO',
    year: 2027,
    dates: {
      qg1: '30/11/2026',
      qg2: '07/12/2026',
      qg3: '15/12/2026',
      qg4: '30/12/2026',
      qg5: '15/01/2027',
      rc_ini: '18/01/2027',
      rc_fin: '21/01/2027',
      uat_ini: '22/01/2027',
      qg5_1_6: '03/02/2027',
      pre_ini: '04/02/2027',
      pre_fin: '05/02/2027',
      qg7: '04/02/2027',
      prod_1l: '07/02/2027',
      qg8: '12/02/2027',
      iop: '13/02/2027',
      qg9: '26/02/2027',
    },
  },
  {
    code: 'T_27.3.1',
    month: 'MARZO',
    year: 2027,
    dates: {
      qg1: '30/12/2026',
      qg2: '08/01/2027',
      qg3: '15/01/2027',
      qg4: '29/01/2027',
      qg5: '12/02/2027',
      rc_ini: '15/02/2027',
      rc_fin: '18/02/2027',
      uat_ini: '19/02/2027',
      qg5_1_6: '03/03/2027',
      pre_ini: '04/03/2027',
      pre_fin: '05/03/2027',
      qg7: '04/03/2027',
      prod_1l: '07/03/2027',
      qg8: '12/03/2027',
      iop: '13/03/2027',
      qg9: '30/03/2027',
    },
  },
  {
    code: 'T_27.4.1',
    month: 'ABRIL',
    year: 2027,
    dates: {
      qg1: '29/01/2027',
      qg2: '05/02/2027',
      qg3: '12/02/2027',
      qg4: '26/02/2027',
      qg5: '12/03/2027',
      rc_ini: '15/03/2027',
      rc_fin: '18/03/2027',
      uat_ini: '19/03/2027',
      qg5_1_6: '02/04/2027',
      pre_ini: '08/04/2027',
      pre_fin: '09/04/2027',
      qg7: '08/04/2027',
      prod_1l: '11/04/2027',
      qg8: '16/04/2027',
      iop: '17/04/2027',
      qg9: '30/04/2027',
    },
  },
  {
    code: 'T_27.5.1',
    month: 'MAYO',
    year: 2027,
    dates: {
      qg1: '03/03/2027',
      qg2: '10/03/2027',
      qg3: '17/03/2027',
      qg4: '02/04/2027',
      qg5: '16/04/2027',
      rc_ini: '19/04/2027',
      rc_fin: '22/04/2027',
      uat_ini: '23/04/2027',
      qg5_1_6: '05/05/2027',
      pre_ini: '06/05/2027',
      pre_fin: '07/05/2027',
      qg7: '06/05/2027',
      prod_1l: '09/05/2027',
      qg8: '14/05/2027',
      iop: '15/05/2027',
      qg9: '28/05/2027',
    },
  },
  {
    code: 'T_27.6.1',
    month: 'JUNIO',
    year: 2027,
    dates: {
      qg1: '02/04/2027',
      qg2: '09/04/2027',
      qg3: '16/04/2027',
      qg4: '30/04/2027',
      qg5: '14/05/2027',
      rc_ini: '17/05/2027',
      rc_fin: '20/05/2027',
      uat_ini: '21/05/2027',
      qg5_1_6: '02/06/2027',
      pre_ini: '03/06/2027',
      pre_fin: '04/06/2027',
      qg7: '03/06/2027',
      prod_1l: '06/06/2027',
      qg8: '11/06/2027',
      iop: '12/06/2027',
      qg9: '28/06/2027',
    },
  },
  {
    code: 'T_27.7.1',
    month: 'JULIO',
    year: 2027,
    dates: {
      qg1: '06/05/2027',
      qg2: '13/05/2027',
      qg3: '20/05/2027',
      qg4: '03/06/2027',
      qg5: '17/06/2027',
      rc_ini: '18/06/2027',
      rc_fin: '23/06/2027',
      uat_ini: '25/06/2027',
      qg5_1_6: '07/07/2027',
      pre_ini: '08/07/2027',
      pre_fin: '09/07/2027',
      qg7: '08/07/2027',
      prod_1l: '11/07/2027',
      qg8: '16/07/2027',
      iop: '17/07/2027',
      qg9: '30/07/2027',
    },
  },
  {
    code: 'T_27.8.1',
    month: 'AGOSTO',
    year: 2027,
    dates: {},
  },
  {
    code: 'T_27.9.1',
    month: 'SEPTIEMBRE',
    year: 2027,
    dates: {
      qg1: '02/07/2027',
      qg2: '09/07/2027',
      qg3: '16/07/2027',
      qg4: '30/07/2027',
      qg5: '13/08/2027',
      rc_ini: '16/08/2027',
      rc_fin: '19/08/2027',
      uat_ini: '20/08/2027',
      qg5_1_6: '01/09/2027',
      pre_ini: '02/09/2027',
      pre_fin: '03/09/2027',
      qg7: '03/09/2027',
      prod_1l: '06/09/2027',
      qg8: '10/09/2027',
      iop: '12/09/2027',
      qg9: '24/09/2027',
    },
  },
  {
    code: 'T_27.10.1',
    month: 'OCTUBRE',
    year: 2027,
    dates: {
      qg1: '06/08/2027',
      qg2: '13/08/2027',
      qg3: '20/08/2027',
      qg4: '03/09/2027',
      qg5: '17/09/2027',
      rc_ini: '20/09/2027',
      rc_fin: '23/09/2027',
      uat_ini: '24/09/2027',
      qg5_1_6: '06/10/2027',
      pre_ini: '07/10/2027',
      pre_fin: '08/10/2027',
      qg7: '07/10/2027',
      prod_1l: '10/10/2027',
      qg8: '14/10/2027',
      iop: '16/10/2027',
      qg9: '29/10/2027',
    },
  },
  {
    code: 'T_27.11.1',
    month: 'NOVIEMBRE',
    year: 2027,
    dates: {
      qg1: '01/09/2027',
      qg2: '08/09/2027',
      qg3: '15/09/2027',
      qg4: '29/09/2027',
      qg5: '14/10/2027',
      rc_ini: '15/10/2027',
      rc_fin: '20/10/2027',
      uat_ini: '21/10/2027',
      qg5_1_6: '03/11/2027',
      pre_ini: '04/11/2027',
      pre_fin: '05/11/2027',
      qg7: '04/11/2027',
      prod_1l: '07/11/2027',
      qg8: '11/11/2027',
      iop: '13/11/2027',
      qg9: '26/11/2027',
    },
  },
  {
    code: 'T_27.12.1',
    month: 'DICIEMBRE',
    year: 2027,
    dates: {
      qg1: '30/09/2027',
      qg2: '07/10/2027',
      qg3: '15/10/2027',
      qg4: '28/10/2027',
      qg5: '12/11/2027',
      rc_ini: '15/11/2027',
      rc_fin: '18/11/2027',
      uat_ini: '19/11/2027',
      qg5_1_6: '01/12/2027',
      pre_ini: '02/12/2027',
      pre_fin: '03/12/2027',
      qg7: '02/12/2027',
      prod_1l: '05/12/2027',
      qg8: '09/12/2027',
      iop: '11/12/2027',
      qg9: '24/12/2027',
    },
  },
  {
    code: 'T_28.1.1',
    month: 'ENERO +1',
    year: 2028,
    dates: {
      qg1: '02/11/2027',
      qg2: '09/11/2027',
      qg3: '16/11/2027',
      qg4: '30/11/2027',
      qg5: '16/12/2027',
      rc_ini: '17/12/2027',
      rc_fin: '22/12/2027',
      uat_ini: '23/12/2027',
      qg5_1_6: '04/01/2028',
      pre_ini: '05/01/2028',
      pre_fin: '07/01/2028',
      qg7: '06/01/2028',
      prod_1l: '09/01/2028',
      qg8: '13/01/2028',
      iop: '15/01/2028',
      qg9: '28/01/2028',
    },
  },
];

const RELEASE_COLOR_CYCLE: TaskColor[] = [
  'indigo',
  'blue',
  'teal',
  'emerald',
  'violet',
  'cyan',
  'amber',
  'orange',
  'pink',
  'slate',
  'sky',
];

/**
 * Builds the pre-defined catalog of releases from the extracted Excel table.
 */
export function getPredefinedReleases(): Release[] {
  return RAW_DEFAULT_RELEASES_DATA.map((row, idx) => {
    const releaseId = `rel-${row.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const name = `${row.code} ${row.month} ${row.year}`;
    const color = RELEASE_COLOR_CYCLE[idx % RELEASE_COLOR_CYCLE.length];

    const milestones: ReleaseMilestone[] = [];
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
          color: def.color,
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
      projectIds: [],
    };
  });
}

export const DEFAULT_PREDEFINED_RELEASES: Release[] = getPredefinedReleases();

/**
 * Parses an Excel or CSV file buffer containing the releases schedule table.
 * Resolves milestone columns dynamically based on headers (QG1, QG2, INI, FIN, etc.).
 */
export function parseExcelReleases(
  fileData: ArrayBuffer | Uint8Array | string
): { releases: Release[]; rowCount: number } {
  let workbook: XLSX.WorkBook;
  if (typeof fileData === 'string') {
    let text = fileData;
    if (text.includes(';')) {
      text = text.replace(/;/g, '\t');
    }
    workbook = XLSX.read(text, { type: 'string', raw: true });
  } else {
    workbook = XLSX.read(fileData, { type: 'array' });
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('El archivo Excel no contiene ninguna hoja.');
  }

  const sheet = workbook.Sheets[sheetName];
  // Convert sheet to array of rows (header: 1 returns 2D array)
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: true,
  });

  if (rows.length === 0) {
    throw new Error('La hoja de cálculo está vacía.');
  }

  // Find header row with milestone codes (QG1, QG2, QG3, etc.)
  let headerRowIndex = -1;
  const colMapping = new Map<number, string>(); // colIndex -> definitionId

  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    let matchCount = 0;
    const tempMapping = new Map<number, string>();

    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '').trim().toUpperCase();
      if (!val) continue;

      if (val === 'QG1' || val.includes('QG1')) {
        tempMapping.set(c, 'qg1');
        matchCount++;
      } else if (val === 'QG2' || val.includes('QG2')) {
        tempMapping.set(c, 'qg2');
        matchCount++;
      } else if (val === 'QG3' || val.includes('QG3')) {
        tempMapping.set(c, 'qg3');
        matchCount++;
      } else if (val === 'QG4' || val.includes('QG4')) {
        tempMapping.set(c, 'qg4');
        matchCount++;
      } else if (val === 'QG5' || val === 'QG 5') {
        tempMapping.set(c, 'qg5');
        matchCount++;
      } else if (val === 'QG5.1,6' || val.includes('5.1') || val.includes('QG6')) {
        tempMapping.set(c, 'qg5_1_6');
        matchCount++;
      } else if (val === 'QG7' || val.includes('QG7')) {
        tempMapping.set(c, 'qg7');
        matchCount++;
      } else if (val === '1L' || val === 'L1') {
        tempMapping.set(c, 'prod_1l');
        matchCount++;
      } else if (val === 'QG8' || val.includes('QG8')) {
        tempMapping.set(c, 'qg8');
        matchCount++;
      } else if (val === 'IOP') {
        tempMapping.set(c, 'iop');
        matchCount++;
      } else if (val === 'QG9' || val.includes('QG9')) {
        tempMapping.set(c, 'qg9');
        matchCount++;
      } else if (val === 'RC INI' || (val.includes('RC') && val.includes('INI'))) {
        tempMapping.set(c, 'rc_ini');
        matchCount++;
      } else if (val === 'RC FIN' || (val.includes('RC') && val.includes('FIN'))) {
        tempMapping.set(c, 'rc_fin');
        matchCount++;
      } else if (val === 'UAT INI' || (val.includes('UAT') && val.includes('INI'))) {
        tempMapping.set(c, 'uat_ini');
        matchCount++;
      } else if (val === 'PREPRO INI' || (val.includes('PRE') && val.includes('INI'))) {
        tempMapping.set(c, 'pre_ini');
        matchCount++;
      } else if (val === 'PREPRO FIN' || (val.includes('PRE') && val.includes('FIN'))) {
        tempMapping.set(c, 'pre_fin');
        matchCount++;
      }
    }

    if (matchCount >= 4) {
      headerRowIndex = r;
      // Copy over mappings
      for (const [col, defId] of tempMapping) {
        colMapping.set(col, defId);
      }
      break;
    }
  }

  // If standard header row found, also check previous row for INI/FIN contexts
  if (headerRowIndex >= 0) {
    const subRow = rows[headerRowIndex];
    const prevRow = headerRowIndex > 0 ? rows[headerRowIndex - 1] : [];

    for (let c = 0; c < subRow.length; c++) {
      if (colMapping.has(c)) continue;
      const subVal = String(subRow[c] || '').trim().toUpperCase();
      const prevVal = String(prevRow[c] || '').trim().toUpperCase();

      if (subVal === 'INI') {
        if (prevVal.includes('MERGE') || prevVal.includes('RC')) {
          colMapping.set(c, 'rc_ini');
        } else if (prevVal.includes('UAT')) {
          colMapping.set(c, 'uat_ini');
        } else if (prevVal.includes('PREPRO') || prevVal.includes('PRE')) {
          colMapping.set(c, 'pre_ini');
        }
      } else if (subVal === 'FIN') {
        if (prevVal.includes('MERGE') || prevVal.includes('RC')) {
          colMapping.set(c, 'rc_fin');
        } else if (prevVal.includes('PREPRO') || prevVal.includes('PRE')) {
          colMapping.set(c, 'pre_fin');
        }
      }
    }
  }

  // Parse release rows
  const parsedReleases: Release[] = [];
  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    // First cell or second cell should have T_ code (e.g. T_26.12.1)
    let code = '';
    let month = '';
    let codeCol = -1;

    for (let c = 0; c < Math.min(4, row.length); c++) {
      const cellStr = String(row[c] || '').trim();
      if (/^T_\d+(\.\d+)*/i.test(cellStr)) {
        code = cellStr.toUpperCase();
        codeCol = c;
        break;
      }
    }

    if (!code) continue;

    // Check next column for month name (DICIEMBRE, ENERO, etc.)
    if (codeCol >= 0 && codeCol + 1 < row.length) {
      const nextCell = String(row[codeCol + 1] || '').trim();
      if (nextCell && !/^\d{1,2}[/-]\d{1,2}/.test(nextCell)) {
        month = nextCell;
      }
    }

    // Determine year from code or dates
    const yearMatch = code.match(/T_(\d{2})\./);
    const yearNumber = yearMatch ? 2000 + parseInt(yearMatch[1], 10) : new Date().getFullYear();
    const releaseId = `rel-${code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const cleanMonth = month.replace(new RegExp(`\\s*${yearNumber}$`, 'i'), '').trim();
    const name = cleanMonth ? `${code} ${cleanMonth} ${yearNumber}` : code;
    const color = RELEASE_COLOR_CYCLE[parsedReleases.length % RELEASE_COLOR_CYCLE.length];

    const milestones: ReleaseMilestone[] = [];

    // Extract dates for each column mapped
    for (const [colIdx, defId] of colMapping.entries()) {
      if (colIdx >= row.length) continue;
      const cellVal = row[colIdx];
      const rawDate = String(cellVal || '').trim();
      if (!cellVal && !rawDate) continue;

      let iso = '';
      if (typeof cellVal === 'number' && cellVal > 20000) {
        const dateObj = XLSX.SSF.parse_date_code(cellVal);
        if (dateObj) {
          const y = String(dateObj.y).padStart(4, '0');
          const m = String(dateObj.m).padStart(2, '0');
          const d = String(dateObj.d).padStart(2, '0');
          iso = `${y}-${m}-${d}`;
        }
      } else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(rawDate)) {
        iso = parseDmyToIso(rawDate);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        iso = rawDate;
      }

      if (iso) {
        const def = RELEASE_MILESTONE_DEFINITIONS.find((d) => d.id === defId);
        if (def) {
          milestones.push({
            id: `${releaseId}-${def.id}`,
            key: def.id,
            code: def.code,
            name: def.name,
            category: def.category,
            date: iso,
            color: def.color,
          });
        }
      }
    }

    parsedReleases.push({
      id: releaseId,
      code,
      name,
      month,
      year: yearNumber,
      color,
      milestones,
      projectIds: [],
    });
  }

  if (parsedReleases.length === 0) {
    throw new Error(
      'No se encontraron filas con el formato de Release (prefijo T_...) en el archivo Excel.'
    );
  }

  return { releases: parsedReleases, rowCount: parsedReleases.length };
}

/**
 * Exports releases to an Excel workbook adhering to the table format.
 */
export function exportReleasesToWorkbook(releases: Release[]): XLSX.WorkBook {
  const wsData: string[][] = [];

  // Row 1: Header Category Names
  const row1 = [
    'IOP',
    'MES',
    ...RELEASE_MILESTONE_DEFINITIONS.map((d) => d.category),
  ];
  // Row 2: Milestone Codes
  const row2 = [
    'ID / Código',
    'Mes',
    ...RELEASE_MILESTONE_DEFINITIONS.map((d) => d.code),
  ];

  wsData.push(row1);
  wsData.push(row2);

  for (const rel of releases) {
    const datesMap = new Map(rel.milestones.map((m) => [m.key, m.date]));
    const row = [
      rel.code,
      rel.month || '',
      ...RELEASE_MILESTONE_DEFINITIONS.map((d) => {
        const iso = datesMap.get(d.id);
        if (!iso) return '';
        const parts = iso.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }),
    ];
    wsData.push(row);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Calendario Releases');
  return wb;
}

/**
 * Checks whether an item belonging to a project violates any release milestone.
 * For example:
 * - A QA/Test task ending after QG5.1,6 or QG7
 * - A dev task ending after Merge RC or Code Freeze
 * - Any task ending after QG8 / IOP
 */
export interface ReleaseComplianceViolation {
  milestoneKey: string;
  milestoneCode: string;
  milestoneName: string;
  milestoneDate: string;
  itemEndDate: string;
  daysLate: number;
}

export function checkTaskReleaseCompliance(
  item: GanttItem,
  project: GanttProject | undefined,
  release: Release | undefined
): ReleaseComplianceViolation[] {
  if (item.isExternal) {
    return [];
  }

  if (!project || !release || !release.milestones || release.milestones.length === 0) {
    return [];
  }

  const itemEnd = item.endDate || item.startDate;
  if (!itemEnd) return [];

  const violations: ReleaseComplianceViolation[] = [];

  // Key control milestones:
  // 1. Final release sign-off (QG8 or IOP or QG9)
  const finalMilestone =
    release.milestones.find((m) => m.key === 'iop') ||
    release.milestones.find((m) => m.key === 'qg8') ||
    release.milestones[release.milestones.length - 1];

  if (finalMilestone && itemEnd > finalMilestone.date) {
    const d1 = new Date(itemEnd).getTime();
    const d2 = new Date(finalMilestone.date).getTime();
    const daysLate = Math.max(1, Math.round((d1 - d2) / (1000 * 60 * 60 * 24)));
    violations.push({
      milestoneKey: finalMilestone.key,
      milestoneCode: finalMilestone.code,
      milestoneName: finalMilestone.name,
      milestoneDate: finalMilestone.date,
      itemEndDate: itemEnd,
      daysLate,
    });
  }

  // 2. RC FIN or QG5 check for dev tasks
  const isQa = item.assignee && /qa|test|calidad|pruebas/i.test(item.assignee);
  if (!isQa) {
    const rcFin = release.milestones.find((m) => m.key === 'rc_fin');
    if (rcFin && itemEnd > rcFin.date) {
      const d1 = new Date(itemEnd).getTime();
      const d2 = new Date(rcFin.date).getTime();
      const daysLate = Math.max(1, Math.round((d1 - d2) / (1000 * 60 * 60 * 24)));
      violations.push({
        milestoneKey: rcFin.key,
        milestoneCode: rcFin.code,
        milestoneName: rcFin.name,
        milestoneDate: rcFin.date,
        itemEndDate: itemEnd,
        daysLate,
      });
    }
  }

  return violations;
}

/**
 * Calculates the bounding start date, end date, and total calendar duration
 * of a Release based on its milestones (from first milestone to last milestone).
 */
export function getReleaseDateSpan(release?: Release | null): {
  startDate: string;
  endDate: string;
  duration: number;
} {
  const defaultToday = new Date().toISOString().slice(0, 10);
  if (!release || !release.milestones || release.milestones.length === 0) {
    return {
      startDate: defaultToday,
      endDate: defaultToday,
      duration: 1,
    };
  }

  const validMilestoneDates = release.milestones
    .map((m) => m.date)
    .filter((d): d is string => Boolean(d && typeof d === 'string'))
    .sort();

  if (validMilestoneDates.length === 0) {
    return {
      startDate: defaultToday,
      endDate: defaultToday,
      duration: 1,
    };
  }

  const startDate = validMilestoneDates[0];
  const endDate = validMilestoneDates[validMilestoneDates.length - 1];

  const d1 = new Date(startDate + 'T00:00:00Z').getTime();
  const d2 = new Date(endDate + 'T00:00:00Z').getTime();
  const duration = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);

  return {
    startDate,
    endDate,
    duration,
  };
}
