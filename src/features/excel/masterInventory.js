// Lectura del "Inventario Maestro de Motores" (Excel con las hojas
// "Puestos en Planta", "Repuestos Depósito" y "En Reparación").
// Funciones puras: reciben filas (arrays) y devuelven datos de motor.
import { DEPOT, PLANT, REPAIR_SHOP } from '../../domain/constants';
import { normalizeSector } from '../../domain/sectors';
import { isValidPallet } from '../../domain/warehouse';

const norm = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[´'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const text = (value) => (value === null || value === undefined ? '' : String(value).trim());

const findSheet = (sheets, keyword) => Object.keys(sheets).find((name) => norm(name).includes(keyword));

export const isMasterWorkbook = (sheets) => Boolean(findSheet(sheets, 'PUESTOS EN PLANTA') || findSheet(sheets, 'REPUESTOS DEPOSITO'));

/** Devuelve una función que lee una columna por su nombre de encabezado (sin importar tildes ni espacios). */
const columnReader = (headerRow) => {
  const header = headerRow.map(norm);
  const index = (name) => {
    const target = norm(name);
    const exact = header.indexOf(target);
    return exact >= 0 ? exact : header.findIndex((h) => h.startsWith(target));
  };
  const cache = new Map();
  return (row, name) => {
    if (!cache.has(name)) cache.set(name, index(name));
    const i = cache.get(name);
    return i >= 0 ? text(row[i]) : '';
  };
};

const details = (pairs) => Object.fromEntries(pairs.filter(([, v]) => v !== ''));

const pallet = (value) => (isValidPallet(value) ? Number(value) : null);

const yes = (value) => norm(value).startsWith('SI');

const flangeFrom = (...hints) => {
  const all = norm(hints.join(' '));
  if (/BRIDA|B5|B35|B14/.test(all)) return 'Con brida';
  if (/PATA|B3/.test(all)) return 'Sin brida';
  return 'Sin dato';
};

const join = (...parts) => [...new Set(parts.filter(Boolean))].join(' · ');

const uniqueTags = (motors) => {
  const seen = new Map();
  return motors.map((m) => {
    const key = m.tag.toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n === 1 ? m : { ...m, tag: `${m.tag}-${n}` };
  });
};

function parsePlant(rows, sheetName) {
  if (!rows?.length) return [];
  const col = columnReader(rows[0]);
  return rows
    .slice(1)
    .filter((row) => row.some((v) => v !== null && v !== undefined && v !== ''))
    .map((row, i) => {
      const rawCode = col(row, 'NUEVO CODIGO');
      const newCode = /\d/.test(rawCode) ? rawCode : ''; // descarta valores incompletos como "ME-" o "ME-+"
      const shortCode = col(row, 'UNNAMED: 0');
      const simp = col(row, 'CODIGO SIMP');
      const hp = col(row, 'HP');
      const montaje = col(row, 'UNNAMED: 33');
      const tipo = col(row, 'TIPO DE CONST');
      return {
        sheetName,
        // Sin "NUEVO CODIGO" se usa el código SIMP, el de medición PAT o uno provisorio "SC-" (sin código).
        tag:
          newCode ||
          (/^[A-Z]{2}\d+$/.test(shortCode) ? `ME-${shortCode}` : '') ||
          simp ||
          col(row, 'CODIGO PARA MEDICION PAT') ||
          `SC-${String(i + 1).padStart(3, '0')}`,
        code: simp,
        description: col(row, 'UBICACION') || col(row, 'TABLERO'),
        power: hp ? `${hp} HP` : '',
        rpm: col(row, 'R.P.M'),
        brand: col(row, 'MARCA'),
        frame: col(row, 'TAMANO'),
        flange: flangeFrom(montaje, tipo),
        location: PLANT,
        sector: normalizeSector(col(row, 'SECTOR')),
        panel: col(row, 'TABLERO'),
        palletNum: null,
        condition: 'En funcionamiento',
        notes: join(col(row, 'OBSERVACION'), col(row, 'COMENTARIO'), col(row, 'COLUMN1')),
        details: details([
          ['Código medición PAT', col(row, 'CODIGO PARA MEDICION PAT')],
          ['Uso', col(row, 'USES')],
          ['Fila', col(row, 'FILA')],
          ['kW', col(row, 'KW')],
          ['I máx.', col(row, 'I MAX')],
          ['% hs de uso', col(row, '% HS DE USO')],
          ['I medida', col(row, 'I [A] MEDIDA')],
          ['kW medido', col(row, 'KW MEDIDO')],
          ['Conexión', col(row, 'CONEXION')],
          ['Tipo de construcción', tipo],
          ['Montaje', montaje],
          ['Rodamiento delantero', col(row, 'RODAMIENTO DELANTERO')],
          ['Cód. rodamiento del.', col(row, 'CODIGO DE RODAMIENTO DEL')],
          ['Rodamiento trasero', col(row, 'RODAMIENTO TRASERO')],
          ['Cód. rodamiento tras.', col(row, 'CODIGO DE RODAMIENTO TRAS')],
          ['Retén delantero', col(row, 'RETEN DELANTERO')],
          ['Retén trasero', col(row, 'RETEN TRASERO')],
          ['Etapa', col(row, 'ETAPA')],
          ['Ventilador', col(row, 'VENTILADOR')],
          ['Instalación PTC', col(row, 'INSTALACION PTC')],
          ['Motor con PTC', col(row, 'MOTOR CON PTC')],
        ]),
      };
    });
}

/** Repuestos y motores en reparación comparten columnas. */
function parseStock(rows, sheetName, { prefix, inRepair }) {
  if (!rows?.length) return [];
  const col = columnReader(rows[0]);
  return rows
    .slice(1)
    .filter((row) => ['MARCA', 'POTENCIA [CV]', 'OBSERVACION', 'RPM'].some((name) => col(row, name) !== ''))
    .map((row, i) => {
      const number = col(row, 'NUMERO');
      const palletNum = pallet(col(row, 'TARIMA'));
      const cv = col(row, 'POTENCIA [CV]');
      const operative = col(row, 'OPERATIVO');
      const location = inRepair && !palletNum ? REPAIR_SHOP : DEPOT;
      const base = {
        sheetName,
        tag: `${prefix}-${number ? String(number).padStart(3, '0') : `S${String(i + 1).padStart(3, '0')}`}`,
        code: col(row, 'CODIGO'),
        description: col(row, 'ROTULO') || (inRepair ? 'Motor en reparación' : 'Motor de repuesto'),
        power: cv ? `${cv} CV` : '',
        rpm: col(row, 'RPM'),
        brand: col(row, 'MARCA').replace(/\|/g, ''),
        frame: col(row, 'CARCAZA'),
        flange: yes(col(row, 'BRIDA')) ? 'Con brida' : yes(col(row, 'PATAS')) ? 'Sin brida' : 'Sin dato',
        location,
        sector: 'SIN SECTOR',
        panel: '',
        palletNum: location === DEPOT ? palletNum : null,
        condition: inRepair ? 'En reparación' : norm(operative) === 'NO' ? 'No operativo' : 'En funcionamiento',
        notes: col(row, 'OBSERVACION'),
        details: details([
          ['N° en planilla', number],
          ['Tarima (planilla)', col(row, 'TARIMA')],
          ['Patas', col(row, 'PATAS')],
          ['Brida', col(row, 'BRIDA')],
          ['Ø eje [mm]', col(row, 'OEJE')],
          ['Chavetero [mm]', col(row, 'CHAVETERO')],
          ['Operativo', operative],
          ['Motor sacado de', col(row, 'MOTOR SACADO')],
        ]),
      };
      return base;
    });
}

export function parseMasterSheets(sheets) {
  const plantName = findSheet(sheets, 'PUESTOS EN PLANTA');
  const depotName = findSheet(sheets, 'REPUESTOS');
  const repairName = findSheet(sheets, 'REPARACION');
  return uniqueTags([
    ...parsePlant(sheets[plantName], plantName),
    ...parseStock(sheets[depotName], depotName, { prefix: 'DEP', inRepair: false }),
    ...parseStock(sheets[repairName], repairName, { prefix: 'REP', inRepair: true }),
  ]);
}
