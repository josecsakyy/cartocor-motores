import { useRef, useState } from 'react';
import { AppHeader } from './components/layout/AppHeader';
import { useToast } from './components/ui/Toast';
import { ImportReportModal } from './features/excel/ImportReportModal';
import { buildImportReport, exportMotorsToExcel, parseMotorsWorkbook } from './features/excel/excelService';
import { PlanView } from './features/plan/PlanView';
import { ALL, PENDING, TableView } from './features/table/TableView';
import { WarehouseView } from './features/warehouse/WarehouseView';
import { useMotorStats } from './hooks/useMotorStats';
import { useMotorDialogs } from './store/MotorDialogsProvider';
import { useMotors } from './store/MotorsProvider';

const TABS = [
  { id: 'table', label: 'Registro (tabla)' },
  { id: 'warehouse', label: 'Depósito (tarimas 1-24)' },
  { id: 'plan', label: 'Plano lay out' },
];

export default function App() {
  const { motors, status } = useMotors();
  const { openCreate } = useMotorDialogs();
  const toast = useToast();
  const stats = useMotorStats(motors);
  const fileInput = useRef(null);

  const [tab, setTab] = useState('table');
  const [filters, setFilters] = useState({ search: '', location: ALL, condition: ALL });
  const [importReport, setImportReport] = useState(null);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    try {
      const rows = await parseMotorsWorkbook(file);
      if (rows.length === 0) return toast.error('No se encontraron motores en el archivo.');
      setImportReport(buildImportReport(rows, motors));
    } catch (err) {
      console.error(err);
      toast.error('No se pudo leer el Excel. Verificá que sea un archivo .xlsx válido.');
    }
  };

  const handleExport = () => {
    exportMotorsToExcel(motors);
    toast.success('Excel descargado');
  };

  const showPending = () => {
    setTab('table');
    setFilters({ search: '', location: ALL, condition: PENDING });
  };

  const showAlert = status !== 'loading' && motors.length > 0 && (stats.depotStock <= 1 || stats.pending > 0);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AppHeader status={status} stats={stats} />

      {showAlert && (
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-xs text-amber-900">
          <span>
            <strong>Alerta operativa:</strong>{' '}
            {stats.depotStock <= 1 && 'Stock operativo en depósito bajo (≤ 1 unidad disponible). '}
            {stats.pending > 0 && `${stats.pending} motor(es) en reparación o esperando repuesto.`}
          </span>
          {stats.pending > 0 && (
            <button type="button" onClick={showPending} className="shrink-0 font-bold underline hover:text-amber-950">
              Ver pendientes
            </button>
          )}
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3">
        <nav className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                tab === t.id ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => fileInput.current?.click()} className="btn-primary bg-slate-800">
            📊 Importar / contrastar Excel
          </button>
          <input ref={fileInput} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <button type="button" onClick={handleExport} disabled={motors.length === 0} className="btn-primary bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50">
            📥 Descargar Excel
          </button>
          <button type="button" onClick={openCreate} disabled={status === 'loading'} className="btn-brand disabled:opacity-50">
            + Agregar motor
          </button>
        </div>
      </div>

      <main className="relative flex flex-1 flex-col overflow-y-auto p-6">
        {tab === 'table' && <TableView filters={filters} onFiltersChange={setFilters} />}
        {tab === 'warehouse' && <WarehouseView />}
        {tab === 'plan' && <PlanView />}
      </main>

      {importReport && <ImportReportModal report={importReport} onClose={() => setImportReport(null)} />}
    </div>
  );
}
