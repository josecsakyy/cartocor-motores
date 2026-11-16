import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useMotors } from '../../store/MotorsProvider';

export function ImportReportModal({ report, onClose }) {
  const { saveMany } = useMotors();
  const [saving, setSaving] = useState(false);
  const toSave = [...report.newMotors, ...report.changes.map((c) => c.after)];

  const apply = async () => {
    setSaving(true);
    const ok = await saveMany(toSave, `Excel aplicado: ${report.newMotors.length} nuevos, ${report.changes.length} actualizados`);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      dark
      size="max-w-2xl"
      title="Contraste con Excel"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={apply} disabled={saving || toSave.length === 0} className="btn-brand disabled:opacity-50">
            {saving ? 'Aplicando…' : 'Aplicar cambios'}
          </button>
        </>
      }
    >
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <Stat value={report.total} label="Filas en Excel" />
          <Stat value={report.newMotors.length} label="Motores nuevos" tone="emerald" />
          <Stat value={report.changes.length} label="Con cambios" tone="amber" />
          <Stat value={report.unchanged + report.duplicates} label="Sin cambios / repetidos" />
        </div>
        <p className="text-xs text-slate-500">
          De los motores existentes solo se actualizan código, potencia, RPM, descripción y tarima. El historial, la condición y la
          posición en el plano se conservan, y se agrega un evento al historial.
        </p>

        {report.newMotors.length > 0 && (
          <List title="Nuevos">
            {report.newMotors.map((m) => (
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
