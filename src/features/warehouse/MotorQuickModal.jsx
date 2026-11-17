import { Modal } from '../../components/ui/Modal';
import { PalletSelect } from '../../components/ui/Selects';
import { conditionStyle } from '../../domain/constants';
import { powerKw } from '../../domain/motor';
import { formatSlot } from '../../domain/warehouse';
import { MotorActions } from '../motors/MotorActions';

/** Ventanita con la ficha resumida del motor y todas sus acciones. */
export function MotorQuickModal({ motor, onMove, onClose }) {
  const style = conditionStyle(motor.condition);
  const rows = [
    ['Código', motor.code],
    ['Potencia', motor.power],
    ['kW', powerKw(motor)],
    ['RPM', motor.rpm],
    ['Marca', motor.brand],
    ['Carcasa', motor.frame],
    ['Brida', motor.flange],
    ['Rodamiento del.', motor.details?.['Rodamiento delantero']],
    ['Rodamiento tras.', motor.details?.['Rodamiento trasero']],
    ['Conexión', motor.details?.['Conexión']],
    ['I máx.', motor.details?.['I máx.'] && `${motor.details['I máx.']} A`],
    ['Descripción', motor.description],
    ['Observaciones', motor.notes],
  ].filter(([, v]) => v);

  return (
    <Modal
      title={motor.tag}
      size="max-w-sm"
      onClose={onClose}
      subtitle={
        <span className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: style.hex }} />
          {motor.condition} · {formatSlot(motor.palletNum)}
        </span>
      }
    >
      <div className="flex flex-col gap-4 px-6 py-5">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-semibold text-slate-500">{k}</dt>
              <dd className="text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
          Mover a tarima
          <PalletSelect value={motor.palletNum} onChange={(n) => onMove(motor.id, n)} />
        </label>

        <div className="border-t border-slate-100 pt-3">
          <MotorActions motor={motor} onAction={onClose} />
        </div>
      </div>
    </Modal>
  );
}
