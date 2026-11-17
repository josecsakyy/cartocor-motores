import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useMotors } from '../../store/MotorsProvider';

export function ImportReportModal({ report, onClose }) {
  const { applyChanges } = useMotors();
  const [saving, setSaving] = useState(false);
  const toSave = [...report.newMotors, ...report.changes.map((c) => c.after)];
  const toRemove = report.removed.map((m) => m.id);
  const isReplace = report.mode === 'replace';

  const apply = async () => {
    setSaving(true);
    const ok = await applyChanges(
      { save: toSave, remove: toRemove },
      `Inventario actualizado: ${report.newMotors.length} nuevos, ${report.changes.length} actualizados, ${toRemove.length} eliminados`,
    );
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      dark
      size="max-w-2xl"
      title={isReplace ? 'Inventario maestro: reemplazar la base' : 'Contraste con Excel'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={apply} disabled={saving || toSave.length + toRemove.length === 0} className="btn-brand disabled:opacity-50">
            {saving ? 'Aplicando…' : isReplace ? 'Reemplazar inventario' : 'Aplicar cambios'}
          </button>
        </>
      }
    >
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <Stat value={report.total} label="Filas en Excel" />
          <Stat value={report.newMotors.length} label="Motores nuevos" tone="emerald" />
          <Stat value={report.changes.length} label="Con cambios" tone="amber" />
          {isReplace ? (
            <Stat value={toRemove.length} label="A eliminar" tone="red" />
          ) : (
            <Stat value={report.unchanged + report.duplicates} label="Sin cambios / repetidos" />
          )}
        </div>
        {isReplace ? (
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p>
              La base quedará <strong>igual al Excel</strong>: {report.summary.plant} motores en planta, {report.summary.depot} de repuesto en
              depósito y {report.summary.repair} en reparación. Los motores en planta se ubican en el plano según su sector.
            </p>
            {toRemove.length > 0 && (
              <p>
                <strong>Se eliminarán {toRemove.length} motores</strong> que no están en el Excel:{' '}
                {report.removed
                  .slice(0, 12)
                  .map((m) => m.tag)
                  .join(', ')}
                {toRemove.length > 12 ? '…' : ''}
              </p>
            )}
            <p className="text-amber-800">Por sector: {report.summary.sectors.join(' · ')}</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            De los motores existentes solo se actualizan código, potencia, RPM, descripción y tarima. El historial, la condición y la
            posición en el plano se conservan, y se agrega un evento al historial.
          </p>
        )}

        {report.newMotors.length > 0 && (
          <List title="Nuevos">
            {report.newMotors.slice(0, 300).map((m) => (
              <div key={m.id} className="flex justify-between">
                <span>
                  {m.tag} {m.code && `(${m.code})`}
                </span>
                <span className="font-bold text-emerald-700">
                  {m.power} · {m.location}
                </span>
              </div>
            ))}
          </List>
        )}

        {report.changes.length > 0 && (
          <List title="A actualizar">
            {report.changes.map(({ before, fields }) => (
              <div key={before.id} className="flex justify-between">
                <span>{before.tag}</span>
                <span className="font-bold text-amber-700">{fields.join(', ')}</span>
              </div>
            ))}
          </List>
        )}
      </div>
    </Modal>
  );
}

function Stat({ value, label, tone }) {
  const styles = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red: 'bg-red-50 border-red-200 text-red-800',
  };
  return (
    <div className={`rounded-xl border p-3 ${styles[tone] ?? 'border-slate-200 bg-slate-100 text-slate-900'}`}>
      <div className="text-lg font-black">{value}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  );
}

function List({ title, children }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-bold text-slate-700 uppercase">{title}</h4>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs">{children}</div>
    </div>
  );
}
