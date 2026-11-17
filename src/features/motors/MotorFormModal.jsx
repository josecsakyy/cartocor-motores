import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { ConditionSelect, LocationSelect, PalletSelect, SectorSelect } from '../../components/ui/Selects';
import { CONDITIONS, DEPOT, FLANGES, PLANT } from '../../domain/constants';
import { nextTag, withLocation } from '../../domain/motor';
import { DEFAULT_SECTOR } from '../../domain/sectors';
import { useMotors } from '../../store/MotorsProvider';

const FIELDS = [
  'tag',
  'code',
  'power',
  'rpm',
  'flange',
  'brand',
  'frame',
  'location',
  'sector',
  'panel',
  'palletNum',
  'condition',
  'description',
  'notes',
];

const initialForm = (motor, motors) =>
  motor
    ? Object.fromEntries(FIELDS.map((f) => [f, motor[f] ?? (f === 'palletNum' ? null : '')]))
    : {
        tag: nextTag(motors),
        code: '',
        power: '',
        rpm: '1500',
        flange: FLANGES[0],
        brand: '',
        frame: '',
        location: PLANT,
        sector: DEFAULT_SECTOR,
        panel: '',
        palletNum: null,
        condition: CONDITIONS[0],
        description: '',
        notes: '',
      };

/** Alta y edición de motores. Con `motor` = null crea uno nuevo. */
export function MotorFormModal({ motor, onClose }) {
  const { motors, createMotor, editMotor, isTagTaken } = useMotors();
  const [form, setForm] = useState(() => initialForm(motor, motors));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(motor);
  const details = Object.entries(motor?.details ?? {});

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));
  const input = (field, props = {}) => (
    <input className="input" value={form[field] ?? ''} onChange={(e) => set(field)(e.target.value)} {...props} />
  );
  const setLocation = (location) => setForm((f) => withLocation(f, location));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tag = form.tag.trim();
    if (!tag) return setError('El código del motor es obligatorio.');
    if (isTagTaken(tag, motor?.id)) return setError(`Ya existe otro motor con el código ${tag}.`);

    setSaving(true);
    const data = { ...withLocation(form, form.location, form.palletNum), tag };
    const ok = isEditing ? await editMotor(motor.id, data) : await createMotor(data);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal title={isEditing ? `Ficha de ${motor.tag}` : 'Registrar nuevo motor'} onClose={onClose} size="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Código del motor *">{input('tag', { className: 'input font-mono', placeholder: 'Ej. ME-PU01', required: true })}</Field>
          <Field label="Código SIMP / interno">{input('code', { className: 'input font-mono', placeholder: 'Ej. MOT013033' })}</Field>
        </div>

        <Field label="Equipo / ubicación en planta">
          {input('description', { placeholder: 'Ej. Bomba centricleaner N° 2' })}
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Potencia">{input('power', { placeholder: 'Ej. 15 HP' })}</Field>
          <Field label="RPM">{input('rpm', { inputMode: 'numeric', placeholder: 'Ej. 1500' })}</Field>
          <Field label="Marca">{input('brand', { placeholder: 'Ej. WEG' })}</Field>
          <Field label="Carcasa / tamaño">{input('frame', { placeholder: 'Ej. 132S' })}</Field>
          <Field label="Montaje">
            <select className="input" value={form.flange} onChange={(e) => set('flange')(e.target.value)}>
              {FLANGES.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field label="Condición">
            <ConditionSelect value={form.condition} onChange={set('condition')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Ubicación general">
            <LocationSelect value={form.location} onChange={setLocation} />
          </Field>
          {form.location === PLANT && (
            <Field label="Sector">
              <SectorSelect value={form.sector} onChange={set('sector')} />
            </Field>
          )}
          {form.location === DEPOT && (
            <Field label="Tarima en el depósito">
              <PalletSelect value={form.palletNum} onChange={set('palletNum')} />
            </Field>
          )}
        </div>

        {form.location === PLANT && <Field label="Tablero">{input('panel', { placeholder: 'Ej. TF-008 TUNEL MOTORES (HUMEDO)' })}</Field>}

        <Field label="Observaciones">
          <textarea rows={2} className="input" value={form.notes} onChange={(e) => set('notes')(e.target.value)} placeholder="Notas, repuestos faltantes, estado..." />
        </Field>

        {details.length > 0 && (
          <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <summary className="cursor-pointer font-bold text-slate-700">Datos técnicos del inventario ({details.length})</summary>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {details.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-b border-slate-200 py-0.5">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-semibold text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}

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
