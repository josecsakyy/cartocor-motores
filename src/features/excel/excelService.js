import * as XLSX from 'xlsx';
import { DEPOT } from '../../domain/constants';
import { createHistoryEntry, newId, normalizeMotor, withLocation } from '../../domain/motor';
import { getSlot, isValidPallet } from '../../domain/warehouse';

const findColumn = (header, keywords) => header.findIndex((h) => keywords.some((k) => h.includes(k)));
const cell = (row, idx) => (idx >= 0 && row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : '');

/** Lee todas las hojas del Excel y devuelve filas con los datos de motor que trae cada una. */
export async function parseMotorsWorkbook(file) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const rows = [];

  workbook.SheetNames.forEach((sheetName) => {
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, blankrows: false });
    if (data.length < 2) return;

    const header = data[0].map((h) => String(h ?? '').trim().toUpperCase());
    const col = {
      tag: findColumn(header, ['TAG', 'NRO', 'NUMERO', 'NÚMERO']),
      code: findColumn(header, ['CODIGO', 'CÓDIGO', 'COD']),
      description: findColumn(header, ['DESCRIPCION', 'DESCRIPCIÓN', 'OBSERVACION', 'OBSERVACIÓN', 'UBICACION', 'UBICACIÓN']),
      power: findColumn(header, ['HP', 'POTENCIA']),
      rpm: findColumn(header, ['RPM', 'R.P.M']),
      pallet: findColumn(header, ['TARIMA']),
    };
    const isSpareSheet = sheetName.toUpperCase().includes('REPUESTO');

    data.slice(1).forEach((row) => {
      const description = cell(row, col.description);
      const powerRaw = cell(row, col.power);
      if (!description && !powerRaw) return;

      const palletRaw = cell(row, col.pallet);
      const palletNum = isValidPallet(palletRaw) ? Number(palletRaw) : null;
      const tagRaw = cell(row, col.tag);

      rows.push({
        sheetName,
        tag: tagRaw ? (/^MOT/i.test(tagRaw) ? tagRaw.toUpperCase() : `MOT-${tagRaw}`) : '',
        code: cell(row, col.code),
        description,
        power: powerRaw ? (/hp|kw/i.test(powerRaw) ? powerRaw : `${powerRaw} HP`) : '',
        rpm: cell(row, col.rpm),
        location: palletNum || isSpareSheet ? DEPOT : null,
        palletNum,
      });
    });
  });

  return rows;
}

const SPEC_FIELDS = ['code', 'description', 'power', 'rpm'];

/**
 * Contrasta las filas del Excel con la base actual.
 * - nuevos: motores que no existen (por tag o código).
 * - cambios: motores existentes con algún dato distinto. Se actualizan solo los
 *   datos que trae el Excel; el historial, la condición y la posición en el plano se conservan.
 */
export function buildImportReport(rows, motors) {
  const byTag = new Map(motors.map((m) => [m.tag.toLowerCase(), m]));
  const byCode = new Map(motors.filter((m) => m.code).map((m) => [m.code.toLowerCase(), m]));
  const seen = new Set();
  const newMotors = [];
  const changes = [];
  let unchanged = 0;
  let duplicates = 0;
  const usedTags = new Set([...byTag.keys(), ...rows.filter((r) => r.tag).map((r) => r.tag.toLowerCase())]);
  let autoTag = motors.length;

  rows.forEach((row) => {
    const key = (row.tag || row.code || row.description).toLowerCase();
    if (seen.has(key)) {
      duplicates += 1;
      return;
    }
    seen.add(key);

    const existing = (row.tag && byTag.get(row.tag.toLowerCase())) || (row.code && byCode.get(row.code.toLowerCase()));

    if (!existing) {
      let tag = row.tag;
      while (!tag) {
        const candidate = `MOT-${String(++autoTag).padStart(3, '0')}`;
        if (!usedTags.has(candidate.toLowerCase())) tag = candidate;
      }
      usedTags.add(tag.toLowerCase());
      newMotors.push(
        normalizeMotor(
          {
            ...row,
            tag,
            location: row.location ?? 'Sala de Máquina',
            description: row.description || `Importado de hoja ${row.sheetName}`,
            x: 50,
            y: 50,
            history: [createHistoryEntry(`Importado desde Excel (${row.sheetName})`, 'Carga masiva.', 'Sistema')],
          },
          newId(),
        ),
      );
      return;
    }

    const fields = SPEC_FIELDS.filter((f) => row[f] && row[f] !== existing[f]);
    let updated = { ...existing, ...Object.fromEntries(fields.map((f) => [f, row[f]])) };
    if (row.palletNum && (existing.location !== DEPOT || existing.palletNum !== row.palletNum)) {
      updated = withLocation(updated, DEPOT, row.palletNum);
      fields.push('tarima');
    }
    if (fields.length === 0) {
      unchanged += 1;
      return;
    }
    updated.history = [
      createHistoryEntry(`Actualizado desde Excel (${row.sheetName})`, `Campos modificados: ${fields.join(', ')}.`, 'Sistema'),
      ...existing.history,
    ];
    changes.push({ before: existing, after: updated, fields });
  });

  return { total: rows.length, newMotors, changes, unchanged, duplicates };
}

export function exportMotorsToExcel(motors) {
  const inventory = motors.map((m) => {
    const slot = getSlot(m.palletNum);
    return {
      Tag: m.tag,
      'Código interno': m.code,
      Potencia: m.power,
      RPM: m.rpm,
      'Carcasa / brida': m.flange,
      Ubicación: m.location,
      Tarima: slot?.number ?? '',
      Rack: slot?.rack ?? '',
      Piso: slot?.floor ?? '',
      Condición: m.condition,
      Descripción: m.description,
      'Eventos en historial': m.history.length,
    };
  });
  const history = motors.flatMap((m) =>
    m.history.map((h) => ({ Tag: m.tag, Fecha: h.date, Acción: h.action, Observaciones: h.notes, 'Registrado por': h.user })),
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(inventory), 'Inventario Motores');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(history), 'Historial');
  XLSX.writeFile(workbook, 'Inventario_Motores_Cartocor_Arroyito.xlsx');
}
