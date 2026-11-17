import { DEPOT, PENDING_CONDITIONS, PLANT, REPAIR_SHOP } from '../../domain/constants';
import { compareByTag, powerKw, todayISO } from '../../domain/motor';
import { SECTORS, sectorLabel } from '../../domain/sectors';
import { getSlot } from '../../domain/warehouse';
import { buildXlsx, colName, downloadBlob } from './xlsxWriter';

const UNCHECKED = '☐';
const CHECKED = '☑';
const COLUMNS = [
  { title: '✔', width: 5 },
  { title: 'Código', width: 13 },
  { title: 'Equipo / observación', width: 38 },
  { title: 'Potencia', width: 10 },
  { title: 'kW', width: 9 },
  { title: 'RPM', width: 9 },
  { title: 'Marca', width: 12 },
  { title: 'Carcasa', width: 11 },
  { title: 'Brida', width: 10 },
  { title: 'Rodamientos (del. / tras.)', width: 22 },
  { title: 'Condición', width: 16 },
  { title: 'Ubicación', width: 30 },
  { title: 'Observaciones del control', width: 28 },
];
const LAST_COL = 'M';
const SPAN = COLUMNS.length - 1;

/** Alcances que se pueden descargar. */
export const EXPORT_SCOPES = [
  { id: 'all', label: 'Todos los motores' },
  { id: 'depot', label: 'Depósito (agrupado por tarima)' },
  { id: 'plant', label: 'Planta (agrupado por sector)' },
  { id: 'pending', label: 'Pendientes (en reparación, esperando repuesto o no operativos)' },
  { id: 'sector', label: 'Un sector de planta' },
  { id: 'rack', label: 'Un rack del depósito' },
];

const PENDING = [...PENDING_CONDITIONS, 'No operativo'];

function selectMotors(motors, { scope, sector, rack }) {
  switch (scope) {
    case 'depot':
      return motors.filter((m) => m.location === DEPOT);
    case 'plant':
      return motors.filter((m) => m.location === PLANT);
    case 'pending':
      return motors.filter((m) => PENDING.includes(m.condition));
    case 'sector':
      return motors.filter((m) => m.location === PLANT && m.sector === sector);
    case 'rack':
      return motors.filter((m) => m.location === DEPOT && getSlot(m.palletNum)?.rack === rack);
    default:
      return motors;
  }
}

export function scopeTitle({ scope, sector, rack }) {
  if (scope === 'sector') return `Sector: ${sectorLabel(sector)}`;
  if (scope === 'rack') return `Depósito · ${rack}`;
  return EXPORT_SCOPES.find((s) => s.id === scope)?.label ?? 'Todos los motores';
}

const SECTOR_ORDER = new Map(SECTORS.map((s, i) => [s.id, i]));

/** Agrupa: sección (ubicación) → grupo (tarima o sector) → motores. */
function groupMotors(list) {
  const sections = [
    { key: DEPOT, title: 'DEPÓSITO', motors: list.filter((m) => m.location === DEPOT) },
    { key: PLANT, title: 'PLANTA', motors: list.filter((m) => m.location === PLANT) },
    { key: REPAIR_SHOP, title: 'TALLER DE MANTENIMIENTO', motors: list.filter((m) => m.location === REPAIR_SHOP) },
  ].filter((s) => s.motors.length);

  return sections.map((section) => {
    const groups = new Map();
    section.motors.forEach((m) => {
      let key;
      let title;
      let order;
      if (section.key === DEPOT) {
        const slot = getSlot(m.palletNum);
        key = slot ? `t${slot.number}` : 'none';
        title = slot ? `Tarima #${slot.number} · ${slot.rack} · ${slot.floor} · ${slot.pallet}` : 'Sin tarima asignada';
        order = slot ? slot.number : 999;
      } else if (section.key === PLANT) {
        key = m.sector;
        title = sectorLabel(m.sector);
        order = SECTOR_ORDER.get(m.sector) ?? 999;
      } else {
        key = 'all';
        title = '';
        order = 0;
      }
      if (!groups.has(key)) groups.set(key, { title, order, motors: [] });
      groups.get(key).motors.push(m);
    });
    const sorted = [...groups.values()].sort((a, b) => a.order - b.order);
    sorted.forEach((g) => g.motors.sort((a, b) => (a.panel || '').localeCompare(b.panel || '', 'es') || compareByTag(a, b)));
    return { ...section, groups: sorted };
  });
}

const equipmentText = (m) => {
  const generic = !m.description || /^motor (de repuesto|en reparaci)/i.test(m.description);
  if (generic) return m.notes || (m.location === DEPOT ? 'Repuesto' : '');
  return m.description;
};

const locationText = (m) => {
  if (m.location === DEPOT) {
    const slot = getSlot(m.palletNum);
    return slot ? `Tarima #${slot.number} (${slot.rack}, ${slot.floor})` : 'Depósito, sin tarima';
  }
  if (m.location === PLANT) return m.panel ? `Tablero ${m.panel}` : sectorLabel(m.sector);
  return 'Taller de mantenimiento';
};

const bearings = (m) => {
  const front = m.details?.['Rodamiento delantero'] ?? '';
  const rear = m.details?.['Rodamiento trasero'] ?? '';
  return front || rear ? `${front || '—'} / ${rear || '—'}` : '';
};

const conditionStyle = (c) => (c === 'No operativo' || c === 'Retirado' ? 'bad' : PENDING_CONDITIONS.includes(c) ? 'warn' : 'text');

const formatDate = (iso) => iso.split('-').reverse().join('/');

function checklistSheet(list, options) {
  const rows = [];
  const merges = [];
  const full = (r) => merges.push(`A${r}:${LAST_COL}${r}`);
  const blankRow = (cells = []) => ({ cells });

  rows.push({ height: 26, cells: [{ v: 'CARTOCOR ARROYITO · Planta Papel — Lista de control de motores', s: 'title' }] });
  full(1);
  rows.push({ cells: [{ v: `${scopeTitle(options)} · ${list.length} motores · generado el ${formatDate(todayISO())}`, s: 'subtitle' }] });
  full(2);
  rows.push({
    height: 24,
    cells: [
      { v: 'Controló:', s: 'signature' },
      { v: '', s: 'signature' },
      { v: '', s: 'signature' },
      { v: 'Fecha:', s: 'signature' },
      { v: '', s: 'signature' },
      { v: '', s: 'signature' },
      { v: 'Firma:', s: 'signature' },
      { v: '', s: 'signature' },
      { v: '', s: 'signature' },
      { v: '', s: 'signature' },
      { v: '', s: 'signature' },
      { v: '', s: 'signature' },
      { v: `Marcar ${CHECKED} cada motor verificado`, s: 'subtitle' },
    ],
  });
  rows.push(blankRow());
  rows.push({ height: 20, cells: COLUMNS.map((c) => ({ v: c.title, s: 'header' })) });
  const headerRow = rows.length;

  let firstData = null;
  groupMotors(list).forEach((section) => {
    rows.push({ height: 20, cells: [{ v: `${section.title} — ${section.motors.length} motores`, s: 'section' }, ...Array(SPAN).fill({ v: '', s: 'section' })] });
    full(rows.length);
    section.groups.forEach((group) => {
      if (group.title) {
        rows.push({ cells: [{ v: `${group.title} (${group.motors.length})`, s: 'group' }, ...Array(SPAN).fill({ v: '', s: 'group' })] });
        full(rows.length);
      }
      group.motors.forEach((m, i) => {
        const z = i % 2 === 1 ? 'Z' : '';
        rows.push({
          height: 18,
          cells: [
            { v: UNCHECKED, s: `check${z}` },
            { v: m.tag, s: `tag${z}` },
            { v: equipmentText(m), s: `text${z}` },
            { v: m.power, s: `center${z}` },
            { v: powerKw(m).replace(' kW', ''), s: `center${z}` },
            { v: m.rpm, s: `center${z}` },
            { v: m.brand, s: `text${z}` },
            { v: m.frame, s: `center${z}` },
            { v: m.flange === 'Sin dato' ? '' : m.flange, s: `center${z}` },
            { v: bearings(m), s: `center${z}` },
            { v: m.condition, s: `${conditionStyle(m.condition)}${z}` },
            { v: locationText(m), s: `text${z}` },
            { v: '', s: `text${z}` },
          ],
        });
        if (firstData === null) firstData = rows.length;
      });
    });
  });

  return {
    name: 'Lista de control',
    columns: COLUMNS,
    rows,
    merges,
    freezeRows: headerRow,
    printTitleRows: [headerRow, headerRow],
    validations: firstData ? [{ ref: `A${firstData}:A${rows.length}`, list: [UNCHECKED, CHECKED] }] : [],
    landscape: true,
    footer: '&L&8Cartocor Arroyito · Lista de control de motores&R&8Página &P de &N',
  };
}

/** Hoja plana con todos los datos (sirve también para volver a importar). */
function dataSheet(list) {
  const detailKeys = [...new Set(list.flatMap((m) => Object.keys(m.details ?? {})))].filter((k) => k !== 'kW').sort((a, b) => a.localeCompare(b, 'es'));
  const head = ['Código', 'Código SIMP', 'Equipo', 'Potencia', 'kW', 'RPM', 'Marca', 'Carcasa', 'Montaje', 'Ubicación', 'Sector', 'Tablero', 'Tarima', 'Rack', 'Piso', 'Condición', 'Observaciones', ...detailKeys];
  const rows = [{ height: 20, cells: head.map((h) => ({ v: h, s: 'header' })) }];
  [...list].sort(compareByTag).forEach((m, i) => {
    const slot = getSlot(m.palletNum);
    const z = i % 2 === 1 ? 'Z' : '';
    const values = [
      m.tag,
      m.code,
      m.description,
      m.power,
      powerKw(m).replace(' kW', ''),
      m.rpm,
      m.brand,
      m.frame,
      m.flange,
      m.location,
      m.location === PLANT ? sectorLabel(m.sector) : '',
      m.panel,
      slot?.number ?? '',
      slot?.rack ?? '',
      slot?.floor ?? '',
      m.condition,
      m.notes,
      ...detailKeys.map((k) => m.details?.[k] ?? ''),
    ];
    rows.push({ cells: values.map((v, ci) => ({ v, s: `${ci === 0 ? 'tag' : 'text'}${z}` })) });
  });
  const widths = [13, 14, 36, 10, 9, 9, 13, 12, 11, 22, 32, 30, 8, 9, 9, 17, 40, ...detailKeys.map(() => 14)];
  return {
    name: 'Datos completos',
    columns: widths.map((width) => ({ width })),
    rows,
    freezeRows: 1,
    autoFilter: `A1:${colName(head.length - 1)}${rows.length}`,
    landscape: true,
  };
}

function historySheet(list) {
  const head = ['Código', 'Fecha', 'Acción', 'Nota', 'Registrado por'];
  const rows = [{ height: 20, cells: head.map((h) => ({ v: h, s: 'header' })) }];
  let i = 0;
  [...list].sort(compareByTag).forEach((m) =>
    m.history.forEach((h) => {
      const z = i++ % 2 === 1 ? 'Z' : '';
      rows.push({ cells: [{ v: m.tag, s: `tag${z}` }, { v: formatDate(h.date || ''), s: `center${z}` }, { v: h.action, s: `text${z}` }, { v: h.notes, s: `text${z}` }, { v: h.user, s: `text${z}` }] });
    }),
  );
  return { name: 'Historial', columns: [13, 12, 34, 60, 22].map((width) => ({ width })), rows, freezeRows: 1, autoFilter: `A1:E${rows.length}`, landscape: true };
}

/** Arma el libro según las opciones y lo descarga. Devuelve la cantidad de motores. */
export function exportChecklist(motors, options) {
  const list = selectMotors(motors, options);
  const sheets = [checklistSheet(list, options)];
  if (options.includeData) sheets.push(dataSheet(list), historySheet(list));
  const slug = scopeTitle(options)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, '')
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  downloadBlob(buildXlsx(sheets), `Control_motores_${slug}_${todayISO()}.xlsx`);
  return list.length;
}

export { selectMotors };
