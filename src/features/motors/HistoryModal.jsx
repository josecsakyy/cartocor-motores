import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { DEFAULT_USER } from '../../domain/constants';
import { useMotors } from '../../store/MotorsProvider';

export function HistoryModal({ motor, onClose }) {
  const { addHistoryEntry } = useMotors();
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');
  const [user, setUser] = useState(DEFAULT_USER);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!action.trim()) return;
    const ok = await addHistoryEntry(motor.id, action, notes, user);
    if (ok) {
      setAction('');
      setNotes('');
    }
  };

  return (
    <Modal
      dark
      size="max-w-xl"
      title="Historial de mantenimiento y eventos"
      subtitle={<span className="rounded bg-emerald-600 px-2 py-0.5 font-mono text-xs font-bold text-white">{motor.tag}</span>}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className="btn-primary">
          Cerrar
        </button>
      }
    >
      <div className="space-y-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-xs font-bold tracking-wider text-slate-700 uppercase">Agregar evento</h4>
          <input
            className="input bg-white text-xs"
            required
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Acción / evento (ej. Cambio de rodamientos, rebobinado)..."
          />
          <textarea
            rows={2}
            className="input bg-white text-xs"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones, repuestos utilizados o notas técnicas..."
          />
          <div className="flex items-center justify-between gap-3">
            <input className="input max-w-[220px] bg-white text-xs" value={user} onChange={(e) => setUser(e.target.value)} placeholder="Registrado por" />
            <button type="submit" className="btn-brand text-xs">
              + Registrar en historial
            </button>
          </div>
        </form>

        <div className="space-y-3">
          <h4 className="text-xs font-bold tracking-wider text-slate-700 uppercase">Registro histórico ({motor.history.length})</h4>
          {motor.history.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400 italic">No hay eventos registrados.</p>
          ) : (
            motor.history.map((item, idx) => (
              <div key={`${item.date}-${idx}`} className="space-y-1 rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{item.action}</span>
                  <span className="font-mono text-[11px] text-slate-400">{item.date}</span>
                </div>
                <p className="text-xs text-slate-600">{item.notes}</p>
                <div className="border-t border-slate-100 pt-1 text-[10px] text-slate-400">
                  Registrado por: <strong>{item.user || '—'}</strong>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
