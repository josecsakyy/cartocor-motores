import { useMotorDialogs } from '../../store/MotorDialogsProvider';

/** Botones Historial / Editar / Eliminar, idénticos en las tres vistas. */
export function MotorActions({ motor, compact = false, onAction }) {
  const { openHistory, openEdit, requestDelete } = useMotorDialogs();
  const size = compact ? 'px-1.5 py-0.5 text-[10px]' : '';
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={() => { onAction?.(); openHistory(motor.id); }}
        className={`chip-btn border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 ${size}`}
        title="Ver historial"
      >
        {compact ? '📜' : `📜 Historial (${motor.history.length})`}
      </button>
      <button
        type="button"
        onClick={() => { onAction?.(); openEdit(motor.id); }}
        className={`chip-btn border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 ${size}`}
        title="Editar motor"
      >
        {compact ? '✏️' : 'Editar'}
      </button>
      <button
        type="button"
        onClick={() => { onAction?.(); requestDelete(motor.id); }}
        className={`chip-btn border-red-200 bg-red-50 text-red-600 hover:bg-red-100 ${size}`}
        title="Eliminar motor"
      >
        {compact ? '🗑️' : 'Eliminar'}
      </button>
    </div>
  );
}
