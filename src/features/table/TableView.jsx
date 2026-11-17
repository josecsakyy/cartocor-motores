import { useMemo } from 'react';
import { ConditionSelect, LocationSelect } from '../../components/ui/Selects';
import { CONDITIONS, DEPOT, LOCATIONS, PENDING_CONDITIONS, PLANT, conditionStyle } from '../../domain/constants';
import { searchableText } from '../../domain/motor';
import { formatSlot } from '../../domain/warehouse';
import { SECTORS, sectorLabel } from '../../domain/sectors';
import { useMotors } from '../../store/MotorsProvider';
import { MotorActions } from '../motors/MotorActions';

export const ALL = 'Todas';
export const PENDING = 'Pendientes';

export const filterMotors = (motors, { search, location, condition, sector = ALL }) => {
  const term = search.trim().toLowerCase();
  return motors.filter(
    (m) =>
      (!term || searchableText(m).includes(term)) &&
      (location === ALL || m.location === location) &&
      (sector === ALL || (m.location === PLANT && m.sector === sector)) &&
      (condition === ALL || (condition === PENDING ? PENDING_CONDITIONS.includes(m.condition) : m.condition === condition)),
  );
};

export function TableView({ filters, onFiltersChange }) {
  const { motors, status, changeCondition, changeLocation } = useMotors();
  const visible = useMemo(() => filterMotors(motors, filters), [motors, filters]);
  const setFilter = (key) => (value) => onFiltersChange({ ...filters, [key]: value });

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Buscar por tag, código, tarima, descripción..."
            value={filters.search}
            onChange={(e) => setFilter('search')(e.target.value)}
            className="input min-w-[240px] flex-1 bg-white"
          />
          <FilterSelect label="Ubicación" value={filters.location} onChange={setFilter('location')} options={[ALL, ...LOCATIONS]} />
          <FilterSelect
            label="Sector"
            value={filters.sector ?? ALL}
            onChange={setFilter('sector')}
            options={[ALL, ...SECTORS.map((s) => s.id)]}
            format={(o) => (o === ALL ? ALL : sectorLabel(o))}
          />
          <FilterSelect label="Condición" value={filters.condition} onChange={setFilter('condition')} options={[ALL, PENDING, ...CONDITIONS]} />
        </div>
        <div className="text-xs font-medium text-slate-500">
          Mostrando <span className="font-bold text-slate-900">{visible.length}</span> de {motors.length} registros
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="sticky top-0 z-10 bg-slate-900 text-xs tracking-wider text-white uppercase">
              {['Código', 'Potencia', 'RPM', 'Ubicación', 'Sector / tarima', 'Condición', 'Equipo'].map((h) => (
                <th key={h} className="px-4 py-3.5 font-semibold">
                  {h}
                </th>
              ))}
              <th className="px-4 py-3.5 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-400">
                  {status === 'loading'
                    ? 'Cargando motores…'
                    : motors.length === 0
                      ? 'Todavía no hay motores cargados. Agregá uno o importá un Excel.'
                      : 'No hay motores que coincidan con los filtros.'}
                </td>
              </tr>
            ) : (
              visible.map((motor) => {
                const style = conditionStyle(motor.condition);
                return (
                  <tr key={motor.id} className={`${style.rowBg} transition-colors`}>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: style.hex }} />
                        {motor.tag}
                      </div>
                      {motor.code && <div className="pl-5 text-[11px] font-normal text-slate-500">Cod: {motor.code}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-800">{motor.power || '—'}</td>
                    <td className="px-4 py-3 text-slate-800">{motor.rpm ? `${motor.rpm} RPM` : '—'}</td>
                    <td className="px-4 py-3">
                      <LocationSelect
                        value={motor.location}
                        onChange={(loc) => changeLocation(motor.id, loc)}
                        className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {motor.location === DEPOT ? (
                        <span className="inline-flex rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-bold text-emerald-900">
                          {formatSlot(motor.palletNum)}
                        </span>
                      ) : motor.location === PLANT ? (
                        <div className="text-xs">
                          <div className="font-bold text-slate-800">{sectorLabel(motor.sector)}</div>
                          {motor.panel && <div className="text-[11px] text-slate-500">{motor.panel}</div>}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">{motor.location}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ConditionSelect
                        value={motor.condition}
                        onChange={(c) => changeCondition(motor.id, c)}
                        className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-bold ${style.badge}`}
                      />
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-slate-600" title={[motor.description, motor.notes].filter(Boolean).join(' · ')}>
                      <div className="truncate">{motor.description || 'Sin descripción'}</div>
                      {motor.notes && <div className="truncate text-[11px] text-slate-400">{motor.notes}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <MotorActions motor={motor} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, format = (o) => o }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-600">{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input w-auto bg-white">
        {options.map((o) => (
          <option key={o} value={o}>
            {format(o)}
          </option>
        ))}
      </select>
    </label>
  );
}
