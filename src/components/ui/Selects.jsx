import { CONDITIONS, LOCATIONS } from '../../domain/constants';
import { WAREHOUSE_SLOTS } from '../../domain/warehouse';
import { SECTORS } from '../../domain/sectors';

export function LocationSelect({ value, onChange, className = 'input', ...props }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className} {...props}>
      {LOCATIONS.map((loc) => (
        <option key={loc} value={loc}>
          {loc}
        </option>
      ))}
    </select>
  );
}

export function ConditionSelect({ value, onChange, className = 'input', ...props }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className} {...props}>
      {CONDITIONS.map((c) => (
        <option key={c} value={c} className="bg-white text-slate-900">
          {c}
        </option>
      ))}
    </select>
  );
}

export function PalletSelect({ value, onChange, short = false, className = 'input', ...props }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className={className}
      {...props}
    >
      <option value="">{short ? 'Sin tarima' : 'Sin tarima asignada'}</option>
      {WAREHOUSE_SLOTS.map((s) => (
        <option key={s.number} value={s.number}>
          {short ? `#${s.number} (${s.rack})` : s.label}
        </option>
      ))}
    </select>
  );
}

export function SectorSelect({ value, onChange, className = 'input', ...props }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className} {...props}>
      {SECTORS.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
