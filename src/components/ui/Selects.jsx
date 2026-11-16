import { CONDITIONS, LOCATIONS } from '../../domain/constants';
import { WAREHOUSE_SLOTS } from '../../domain/warehouse';

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
    <select value={value ?? 1} onChange={(e) => onChange(Number(e.target.value))} className={className} {...props}>
      {WAREHOUSE_SLOTS.map((s) => (
        <option key={s.number} value={s.number}>
          {short ? `#${s.number} (${s.rack})` : s.label}
        </option>
      ))}
    </select>
  );
}
