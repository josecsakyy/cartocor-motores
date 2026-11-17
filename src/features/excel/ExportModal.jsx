import { useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { PLANT } from '../../domain/constants';
import { SECTORS } from '../../domain/sectors';
import { RACKS } from '../../domain/warehouse';
import { EXPORT_SCOPES, exportChecklist, selectMotors } from './checklistExport';

/** Ventana para elegir qué lista de control descargar. */
export function ExportModal({ motors, onClose, onDone }) {
  const sectorsInUse = useMemo(() => SECTORS.filter((s) => motors.some((m) => m.location === PLANT && m.sector === s.id)), [motors]);
  const [options, setOptions] = useState({ scope: 'all', sector: sectorsInUse[0]?.id ?? '', rack: RACKS[0], includeData: true });
  const set = (patch) => setOptions((o) => ({ ...o, ...patch }));
  const count = selectMotors(motors, options).length;

  const download = () => {
    const n = exportChecklist(motors, options);
    onDone(n);
  };

  return (
    <Modal
      title="Descargar lista de control (Excel)"
      size="max-w-lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={download} disabled={count === 0} className="btn-primary bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50">
            📥 Descargar ({count} motores)
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5 text-sm">
        <p className="text-xs text-slate-500">
          Planilla prolija para imprimir o completar: una casilla ☐ por motor para tildar, agrupada por tarima o por sector, con espacio para
          observaciones y firma.
        </p>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-bold text-slate-700">¿Qué motores?</legend>
          {EXPORT_SCOPES.map((s) => (
            <label key={s.id} className="flex items-center gap-2">
              <input type="radio" name="scope" checked={options.scope === s.id} onChange={() => set({ scope: s.id })} />
              <span>{s.label}</span>
              {s.id === 'sector' && options.scope === 'sector' && (
                <select value={options.sector} onChange={(e) => set({ sector: e.target.value })} className="input ml-auto w-56 py-1 text-xs">
                  {sectorsInUse.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.label}
                    </option>
                  ))}
                </select>
              )}
              {s.id === 'rack' && options.scope === 'rack' && (
                <select value={options.rack} onChange={(e) => set({ rack: e.target.value })} className="input ml-auto w-32 py-1 text-xs">
                  {RACKS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ))}
        </fieldset>

        <label className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs">
          <input type="checkbox" checked={options.includeData} onChange={(e) => set({ includeData: e.target.checked })} />
          Agregar hojas con todos los datos y el historial (sirven para volver a importar)
        </label>
      </div>
    </Modal>
  );
}
