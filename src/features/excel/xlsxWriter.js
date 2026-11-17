// Escritor de .xlsx con formato (colores, bordes, anchos, impresión).
// SheetJS libre no guarda estilos, así que este módulo arma el archivo a mano:
// un .xlsx es un zip con unos pocos XML. Sin dependencias.

const encoder = new TextEncoder();

// ---------- zip (sin compresión) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function zip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const DOS_TIME = 0;
  const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
  files.forEach(({ name, data }) => {
    const nameBytes = encoder.encode(name);
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    const crc = crc32(bytes);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nombres en UTF-8
    local.setUint16(8, 0, true); // sin compresión
    local.setUint16(10, DOS_TIME, true);
    local.setUint16(12, DOS_DATE, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, bytes.length, true);
    local.setUint32(22, bytes.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), nameBytes, bytes);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, DOS_TIME, true);
    cd.setUint16(14, DOS_DATE, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, bytes.length, true);
    cd.setUint32(24, bytes.length, true);
    cd.setUint16(28, nameBytes.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), nameBytes);
    offset += 30 + nameBytes.length + bytes.length;
  });
  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ---------- estilos ----------
const esc = (v) =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

const FONTS = [
  '<font><sz val="10"/><name val="Arial"/></font>', // 0 normal
  '<font><b/><sz val="15"/><color rgb="FF1E293B"/><name val="Arial"/></font>', // 1 título
  '<font><sz val="9"/><color rgb="FF475569"/><name val="Arial"/></font>', // 2 subtítulo
  '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>', // 3 blanco negrita
  '<font><b/><sz val="10"/><color rgb="FF1E293B"/><name val="Arial"/></font>', // 4 negrita
  '<font><sz val="13"/><name val="Arial"/></font>', // 5 casilla
  '<font><b/><sz val="10"/><color rgb="FFC2410C"/><name val="Arial"/></font>', // 6 naranja
  '<font><b/><sz val="10"/><color rgb="FFB91C1C"/><name val="Arial"/></font>', // 7 rojo
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>', // 8 sección
];
const FILLS = [
  '<fill><patternFill patternType="none"/></fill>',
  '<fill><patternFill patternType="gray125"/></fill>',
  '<fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/><bgColor indexed="64"/></patternFill></fill>', // 2 encabezado
  '<fill><patternFill patternType="solid"><fgColor rgb="FF4D7C0F"/><bgColor indexed="64"/></patternFill></fill>', // 3 sección (verde)
  '<fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill>', // 4 grupo
  '<fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>', // 5 cebra
];
const BORDERS = [
  '<border><left/><right/><top/><bottom/><diagonal/></border>',
  '<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>',
  '<border><left/><right/><top/><bottom style="thin"><color rgb="FF94A3B8"/></bottom><diagonal/></border>',
];

/** Nombres de estilo → [fuente, relleno, borde, alineación]. Los "*Z" son la versión cebra. */
const STYLE_DEFS = {
  default: [0, 0, 0, ''],
  title: [1, 0, 0, '<alignment vertical="center"/>'],
  subtitle: [2, 0, 0, '<alignment vertical="center"/>'],
  signature: [4, 0, 2, '<alignment vertical="bottom"/>'],
  header: [3, 2, 1, '<alignment horizontal="center" vertical="center" wrapText="1"/>'],
  section: [8, 3, 1, '<alignment vertical="center"/>'],
  group: [4, 4, 1, '<alignment vertical="center"/>'],
  check: [5, 0, 1, '<alignment horizontal="center" vertical="center"/>'],
  tag: [4, 0, 1, '<alignment vertical="center"/>'],
  text: [0, 0, 1, '<alignment vertical="center"/>'],
  wrap: [0, 0, 1, '<alignment vertical="center" wrapText="1"/>'],
  center: [0, 0, 1, '<alignment horizontal="center" vertical="center"/>'],
  warn: [6, 0, 1, '<alignment vertical="center"/>'],
  bad: [7, 0, 1, '<alignment vertical="center"/>'],
};
const STYLE_NAMES = [];
const STYLE_XFS = [];
Object.entries(STYLE_DEFS).forEach(([name, [font, fill, border, align]]) => {
  const variants = name === 'default' || ['title', 'subtitle', 'signature', 'header', 'section', 'group'].includes(name) ? [false] : [false, true];
  variants.forEach((zebra) => {
    const f = zebra ? 5 : fill;
    STYLE_NAMES.push(zebra ? `${name}Z` : name);
    STYLE_XFS.push(
      `<xf numFmtId="0" fontId="${font}" fillId="${f}" borderId="${border}" xfId="0" applyFont="1" applyFill="1" applyBorder="1"${align ? ' applyAlignment="1"' : ''}>${align}</xf>`,
    );
  });
});
const styleId = (name) => {
  const i = STYLE_NAMES.indexOf(name);
  return i < 0 ? 0 : i;
};

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="${FONTS.length}">${FONTS.join('')}</fonts>
<fills count="${FILLS.length}">${FILLS.join('')}</fills>
<borders count="${BORDERS.length}">${BORDERS.join('')}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${STYLE_XFS.length}">${STYLE_XFS.join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

// ---------- hojas ----------
export const colName = (i) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/**
 * sheet = {
 *   name, columns: [{ width }], rows: [{ height?, cells: [{ v, s } | null] }],
 *   merges: ['A1:K1'], freezeRows, autoFilter: 'A1:K10', printTitleRows: [from, to],
 *   validations: [{ ref: 'A6:A90', list: ['☐','☑'] }], landscape, footer
 * }
 */
function sheetXml(sheet) {
  const lastCol = colName(Math.max(0, sheet.columns.length - 1));
  const rowsXml = sheet.rows
    .map((row, r) => {
      const cells = row.cells
        .map((c, ci) => {
          if (!c) return '';
          const ref = `${colName(ci)}${r + 1}`;
          const s = styleId(c.s ?? 'default');
          if (c.v === null || c.v === undefined || c.v === '') return `<c r="${ref}" s="${s}"/>`;
          if (typeof c.v === 'number') return `<c r="${ref}" s="${s}"><v>${c.v}</v></c>`;
          return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
        })
        .join('');
      const ht = row.height ? ` ht="${row.height}" customHeight="1"` : '';
      return `<row r="${r + 1}"${ht}>${cells}</row>`;
    })
    .join('');
  const freeze = sheet.freezeRows
    ? `<pane ySplit="${sheet.freezeRows}" topLeftCell="A${sheet.freezeRows + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${sheet.freezeRows + 1}" sqref="A${sheet.freezeRows + 1}"/>`
    : '';
  const cols = sheet.columns.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width}" customWidth="1"/>`).join('');
  const merges = sheet.merges?.length ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
  const validations = sheet.validations?.length
    ? `<dataValidations count="${sheet.validations.length}">${sheet.validations
        .map((v) => `<dataValidation type="list" allowBlank="1" showDropDown="0" sqref="${v.ref}"><formula1>"${esc(v.list.join(','))}"</formula1></dataValidation>`)
        .join('')}</dataValidations>`
    : '';
  const footer = sheet.footer ? `<headerFooter><oddFooter>${esc(sheet.footer)}</oddFooter></headerFooter>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${lastCol}${Math.max(1, sheet.rows.length)}"/>
<sheetViews><sheetView workbookViewId="0" zoomScale="100">${freeze}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${rowsXml}</sheetData>
${sheet.autoFilter ? `<autoFilter ref="${sheet.autoFilter}"/>` : ''}${merges}${validations}
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.6" header="0.2" footer="0.3"/>
<pageSetup paperSize="9" orientation="${sheet.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>
${footer}
</worksheet>`;
}

/** Arma el .xlsx y devuelve un Blob. */
export function buildXlsx(sheets) {
  const names = sheets.map((s) => esc(s.name.slice(0, 31)));
  const definedNames = sheets
    .map((s, i) => {
      const parts = [];
      if (s.printTitleRows) parts.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${i}">'${names[i]}'!$${s.printTitleRows[0]}:$${s.printTitleRows[1]}</definedName>`);
      if (s.autoFilter) {
        const [a, b] = s.autoFilter.split(':');
        const abs = (ref) => ref.replace(/([A-Z]+)(\d+)/, '$$$1$$$2');
        parts.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${names[i]}'!${abs(a)}:${abs(b)}</definedName>`);
      }
      return parts.join('');
    })
    .join('');
  const files = [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView activeTab="0"/></bookViews>
<sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
${definedNames ? `<definedNames>${definedNames}</definedNames>` : ''}
</workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}
<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { name: 'xl/styles.xml', data: STYLES_XML },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) })),
  ];
  return zip(files);
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
