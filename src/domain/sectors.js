// Sectores de la planta (columna "Sector" del inventario maestro) y su punto
// de referencia sobre public/plano.png, en % del ancho y alto del plano.
// Las coordenadas y los números entre paréntesis son los del LAY OUT PLANTA PAPEL
// 2024 (planta baja, referencias de la tabla del plano).
export const SECTORS = [
  // Sectores con motores en el inventario maestro (nombre y n° según el plano).
  { id: 'HUMEDO', short: 'Húmedo (1)', label: 'Máquina de papel N°2 · Sección húmeda (1)', anchor: { x: 15.5, y: 7.4 }, spread: { x: 2.3, y: 0.35 } },
  { id: 'SECADO', short: 'Secado (1)', label: 'Máquina de papel N°2 · Secado (1)', anchor: { x: 26.0, y: 7.2 }, spread: { x: 2.3, y: 0.35 } },
  { id: 'REBOBINADORA', short: 'Rebobinadora (1)', label: 'Máquina de papel N°2 · Rebobinadora (1)', anchor: { x: 36.5, y: 8.0 } },
  { id: 'PULPADO', short: 'Pulpado (11)', label: 'Pulpado (11) · planta alta y piletas', anchor: { x: 66.5, y: 22.0 } },
  { id: 'ZARANDAS', short: 'Zarandas y vacío', label: 'Zarandas y bombas de vacío', anchor: { x: 18.4, y: 17.6 } },
  { id: 'ALMIDON', short: 'Almidón', label: 'Depósito de almidón cocido', anchor: { x: 21.8, y: 19.4 } },
  { id: 'EFLUENTES', short: 'Efluentes', label: 'Planta de tratamiento de efluentes', anchor: { x: 11.0, y: 32.0 } },
  { id: 'DEPOSITO BOBINAS', short: 'Dep. bobinas (12)', label: 'Depósito de bobinas (12)', anchor: { x: 27.5, y: 20.4 } },
  { id: 'SUBESTACION 1', short: 'Subestación (3)', label: 'Subestación transformadora (3)', anchor: { x: 8.6, y: 10.2 } },
  { id: 'TALLER CHAPA', short: 'Dep. chapas (13)', label: 'Depósito de chapas (13)', anchor: { x: 8.8, y: 42.8 } },
  { id: 'TALLER SOLDADURA', short: 'Soldadura (13)', label: 'Taller de soldadura (13)', anchor: { x: 9.5, y: 45.7 } },
  { id: 'TALLER MECANICO', short: 'Taller y pañol (14)', label: 'Taller central de mantenimiento y pañol (14)', anchor: { x: 7.2, y: 68.9 } },
  // Otros sectores del plano, para asignar motores a mano.
  { id: 'ANEXO SUBESTACION', short: 'Anexo subest. (5)', label: 'Anexo subestación (5)', anchor: { x: 9.5, y: 15.2 } },
  { id: 'SALA TRANSFORMADORES', short: 'Transformadores (6)', label: 'Sala de transformadores nueva (6)', anchor: { x: 21.9, y: 16.7 } },
  { id: 'SALA TABLEROS', short: 'Tableros (7)', label: 'Sala de tableros máquina papel (7)', anchor: { x: 25.1, y: 15.4 } },
  { id: 'DEPOSITO MATERIALES', short: 'Dep. materiales (10)', label: 'Depósito de materiales auxiliares (10)', anchor: { x: 37.3, y: 23.4 } },
  { id: 'PLAYA FARDOS', short: 'Playa fardos (15)', label: 'Playa interna de fardos (15)', anchor: { x: 19.9, y: 37.3 } },
  { id: 'SIN SECTOR', short: 'Sin sector', label: 'Sin sector asignado', anchor: { x: 30.0, y: 33.0 } },
];

export const DEFAULT_SECTOR = 'SIN SECTOR';

const BY_ID = new Map(SECTORS.map((s) => [s.id, s]));

// Variantes que aparecen en el Excel → sector correcto.
const ALIASES = {
  HUMED0: 'HUMEDO',
  'DEPOSITO BIBINAS': 'DEPOSITO BOBINAS',
};

const clean = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');

/** Devuelve el id de sector válido para cualquier texto del Excel o del formulario. */
export const normalizeSector = (value) => {
  const key = clean(value);
  const id = ALIASES[key] ?? key;
  return BY_ID.has(id) ? id : DEFAULT_SECTOR;
};

export const sectorLabel = (id) => BY_ID.get(id)?.label ?? id;

export const sectorAnchor = (id) => (BY_ID.get(id) ?? BY_ID.get(DEFAULT_SECTOR)).anchor;

export const PLAN_ASPECT = 1.4; // ancho / alto del plano: 1 % de x mide 1,4 veces más que 1 % de y
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
export const SPIRAL_SPACING = 0.45;

export const sectorSpread = (id) => (BY_ID.get(id) ?? BY_ID.get(DEFAULT_SECTOR)).spread ?? { x: 1, y: 1 };

/**
 * Posición del motor número `index` de un sector: espiral alrededor del punto
 * del sector, para que no queden todos encimados. Los sectores alargados (la
 * máquina de papel) usan `spread` para repartir los motores a lo largo.
 */
export const positionInSector = (sectorId, index) => {
  const { x, y } = sectorAnchor(sectorId);
  const spread = sectorSpread(sectorId);
  const r = SPIRAL_SPACING * Math.sqrt(index);
  const angle = index * GOLDEN_ANGLE;
  const clamp = (v) => Math.round(Math.min(98, Math.max(2, v)) * 10) / 10;
  return { x: clamp(x + r * Math.cos(angle) * spread.x), y: clamp(y + r * Math.sin(angle) * PLAN_ASPECT * spread.y) };
};
