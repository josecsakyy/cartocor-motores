import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { ConditionSelect, LocationSelect, PalletSelect } from '../../components/ui/Selects';
import { CONDITIONS, DEPOT, FLANGES } from '../../domain/constants';
import { nextCode, nextTag, withLocation } from '../../domain/motor';
import { useMotors } from '../../store/MotorsProvider';

const FIELDS = ['tag', 'code', 'power', 'rpm', 'flange', 'location', 'palletNum', 'condition', 'description'];

const initialForm = (motor, motors) =>
  motor
    ? Object.fromEntries(FIELDS.map((f) => [f, motor[f] ?? '']))
    : {
        tag: nextTag(motors),
        code: nextCode(motors),
        power: '10 HP',
        rpm: '1500',
        flange: FLANGES[0],
        location: DEPOT,
        palletNum: 1,
        condition: CONDITIONS[0],
        description: '',
      };

/** Alta y edición de motores. Con `motor` = null crea uno nuevo. */
export function MotorFormModal({ motor, onClose }) {
  const { motors, createMotor, editMotor, isTagTaken } = useMotors();
  const [form, setForm] = useState(() => initialForm(motor, motors));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(motor);

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));
  const setLocation = (location) => setForm((f) => withLocation(f, location));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tag = form.tag.trim();
    if (!tag) return setError('El tag del motor es obligatorio.');
    if (isTagTaken(tag, motor?.id)) return setError(`Ya existe otro motor con el tag ${tag}.`);

    setSaving(true);
    const data = { ...withLocation(form, form.location, form.palletNum), tag };
    const ok = isEditing ? await editMotor(motor.id, data) : await createMotor({ ...data, x: 50, y: 50 });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal title={isEditing ? `Editar ficha de ${motor.tag}` : 'Registrar nuevo motor'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tag del motor *">
            <input className="input font-mono" value={form.tag} onChange={(e) => set('tag')(e.target.value)} placeholder="Ej. MOT-007" required />
          </Field>
          <Field label="Código interno">
            <input className="input font-mono" value={form.code} onChange={(e) => set('code')(e.target.value)} placeholder="Ej. ME-PU07" />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Potencia">
            <input className="input" value={form.power} onChange={(e) => set('power')(e.target.value)} placeholder="Ej. 15 HP" />
          </Field>
          <Field label="RPM">
            <input className="input" inputMode="numeric" value={form.rpm} onChange={(e) => set('rpm')(e.target.value)} placeholder="Ej. 1500" />
          </Field>
          <Field label="Carcasa">
            <select className="input" value={form.flange} onChange={(e) => set('flange')(e.target.value)}>
              {FLANGES.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Ubicación general">
            <LocationSelect value={form.location} onChange={setLocation} />
          </Field>
          <Field label="Condición">
            <ConditionSelect value={form.condition} onChange={set('condition')} />
          </Field>
        </div>

        {form.location === DEPOT && (
          <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <label className="block text-xs font-bold tracking-wider text-emerald-900 uppercase">Tarima en el depósito (1 al 24)</label>
            <PalletSelect value={form.palletNum} onChange={set('palletNum')} className="input bg-white font-semibold" />
          </div>
        )}

        <Field label="Descripción / observaciones">
          <textarea
            rows={2}
            className="input"
            value={form.description}
            onChange={(e) => set('description')(e.target.value)}
            placeholder="Detalles del motor, repuestos faltantes o notas..."
          />
        </Field>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Registrar motor'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
