import { Logo } from '../ui/Logo';

const STATUS = {
  loading: { label: 'Conectando…', dot: 'bg-slate-400 animate-pulse', chip: 'bg-slate-100 text-slate-600' },
  synced: { label: 'Nube sincronizada', dot: 'bg-emerald-600 animate-pulse', chip: 'bg-emerald-100 text-emerald-800' },
  offline: { label: 'Sin conexión · se sincroniza al volver', dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800' },
  local: { label: 'Modo local (solo este navegador)', dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-600' },
};

export function AppHeader({ status, stats }) {
  const s = STATUS[status] ?? STATUS.loading;
  return (
    <header className="flex shrink-0 flex-col items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3 shadow-sm md:flex-row">
      <div className="flex items-center gap-4">
        <Logo className="h-14 w-auto" />
        <div className="hidden border-l border-slate-300 pl-4 sm:block">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">Arroyito CBA · Planta Papel</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.chip}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
          </div>
          <h1 className="text-sm font-black text-slate-900">Gestión industrial de motores y depósito</h1>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <StatChip color="bg-slate-900" label="Total" value={stats.total} />
        <StatChip color="bg-brand" label="Stock depósito" value={stats.depotStock} />
        <StatChip color="bg-blue-600" label="En planta" value={stats.inPlant} />
      </div>
    </header>
  );
}

function StatChip({ color, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="font-medium text-slate-600">{label}:</span>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}
