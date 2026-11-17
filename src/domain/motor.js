import { CONDITIONS, DEFAULT_USER, DEPOT, FLANGES, LOCATIONS, OPERATIVE, PLANT, RUNNING } from './constants';
import { normalizeSector, sectorLabel } from './sectors';
import { getSlot, isValidPallet, palletFromLegacyFields } from './warehouse';

/** Fecha local (no UTC) en formato AAAA-MM-DD. */
export const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const str = (value) => (value === null || value === undefined ? '' : String(value).trim());

const clampPercent = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(98, Math.max(2, n)) : fallback;
};

export const createHistoryEntry = (action, notes = '', user = DEFAULT_USER) => ({
  date: todayISO(),
  action: str(action),
  user: str(user) || DEFAULT_USER,
  notes: str(notes) || 'Sin observaciones adicionales.',
});

/** "En funcionamiento" solo existe en planta; fuera de planta un motor útil está "Operativo". */
export const conditionFor = (location, condition) => {
  if (location !== PLANT && condition === RUNNING) return OPERATIVE;
  if (location === PLANT && condition === OPERATIVE) return RUNNING;
  return condition;
};

/**
 * Convierte cualquier registro (Firestore, localStorage, Excel, formulario)
 * en un motor con forma garantizada. Es el único lugar donde se decide
 * qué campos tiene un motor y qué valores son válidos.
 */
export const normalizeMotor = (raw, id = raw?.id) => {
  const location = LOCATIONS.includes(raw?.location) ? raw.location : PLANT;
  let palletNum = null;
  if (location === DEPOT) {
    // En el depósito puede haber motores sin tarima asignada (palletNum = null).
    palletNum = isValidPallet(raw?.palletNum) ? Number(raw.palletNum) : palletFromLegacyFields(raw ?? {});
  }

  const condition = conditionFor(location, CONDITIONS.includes(raw?.condition) ? raw.condition : CONDITIONS[0]);

  return {
    id: str(id),
    tag: str(raw?.tag),
    code: str(raw?.code),
    power: str(raw?.power),
    rpm: str(raw?.rpm),
    flange: FLANGES.includes(raw?.flange) ? raw.flange : FLANGES[0],
    brand: str(raw?.brand),
    frame: str(raw?.frame),
    location,
    sector: normalizeSector(raw?.sector),
    panel: str(raw?.panel),
    palletNum,
    condition,
    description: str(raw?.description),
    notes: str(raw?.notes),
    details:
      raw?.details && typeof raw.details === 'object'
        ? Object.fromEntries(
            Object.entries(raw.details)
              .map(([k, v]) => [str(k), str(v)])
              .filter(([k, v]) => k && v),
          )
        : {},
    x: clampPercent(raw?.x, 50),
    y: clampPercent(raw?.y, 50),
    history: Array.isArray(raw?.history)
      ? raw.history.filter(Boolean).map((h) => ({
          date: str(h.date),
          action: str(h.action),
          user: str(h.user),
          notes: str(h.notes),
        }))
      : [],
  };
};

/** Objeto listo para guardar: sin campos undefined y con rack/piso/tarima derivados (compatibilidad). */
export const toStorage = (motor) => {
  const m = normalizeMotor(motor);
  const slot = getSlot(m.palletNum);
  return { ...m, rack: slot?.rack ?? '', floor: slot?.floor ?? '', pallet: slot?.pallet ?? '' };
};

/** Cambia la ubicación respetando la regla: solo los motores en Depósito tienen tarima (opcional). */
export const withLocation = (motor, location, palletNum) => {
  if (location !== DEPOT) return { ...motor, location, palletNum: null };
  if (palletNum === null || palletNum === '') return { ...motor, location, palletNum: null };
  const pallet = isValidPallet(palletNum) ? Number(palletNum) : isValidPallet(motor.palletNum) ? Number(motor.palletNum) : null;
  return { ...motor, location, palletNum: pallet };
};

const nextNumber = (motors, pattern) =>
  motors.reduce((max, m) => {
    const match = pattern.exec(m.tag ?? '') ?? pattern.exec(m.code ?? '');
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;

/** Próximo tag libre (no se repite aunque se hayan borrado motores). */
export const nextTag = (motors) => `MOT-${String(nextNumber(motors, /^MOT-(\d+)$/i)).padStart(3, '0')}`;

export const nextCode = (motors) => {
  const n = motors.reduce((max, m) => {
    const match = /^ME-PU(\d+)$/i.exec(m.code ?? '');
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `ME-PU${String(n + 1).padStart(2, '0')}`;
};

export const searchableText = (m) =>
  [
    m.tag,
    m.code,
    m.description,
    m.notes,
    m.power,
    m.rpm,
    m.brand,
    m.panel,
    m.location,
    sectorLabel(m.sector),
    m.palletNum ? `tarima #${m.palletNum}` : '',
  ]
    .join(' ')
    .toLowerCase();

export const compareByTag = (a, b) => a.tag.localeCompare(b.tag, 'es', { numeric: true });

/**
 * Potencia en kW: la del dato "kW" del inventario si está cargada; si no,
 * se calcula desde la potencia (1 HP = 0,7457 kW · 1 CV = 0,7355 kW).
 */
export const powerKw = (m) => {
  const match = /^\s*([\d.,]+)\s*(HP|CV)\b/i.exec(m?.power ?? '');
  const nominal = match && !(m.power ?? '').includes('/') ? Number(match[1].replace(',', '.')) * (match[2].toUpperCase() === 'HP' ? 0.7457 : 0.7355) : null;
  const fromDetails = Number(String(m?.details?.kW ?? '').replace(',', '.'));
  const detail = Number.isFinite(fromDetails) && fromDetails > 0 ? fromDetails : null;
  // Si el dato del inventario no coincide con la potencia (error de carga), manda la potencia.
  let kw = detail;
  if (nominal && (!detail || Math.abs(detail - nominal) / nominal > 0.3)) kw = nominal;
  if (!kw || !Number.isFinite(kw)) return '';
  const rounded = kw < 1 ? Math.round(kw * 100) / 100 : Math.round(kw * 10) / 10;
  return `${String(rounded).replace('.', ',')} kW`;
};

/** "30 HP · 22,4 kW" */
export const powerLabel = (m) => [m?.power, powerKw(m)].filter(Boolean).join(' · ');
