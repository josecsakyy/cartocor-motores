import { useEffect, useMemo, useRef, useState } from 'react';
import { ConditionSelect, LocationSelect } from '../../components/ui/Selects';
import { LOCATIONS, conditionStyle } from '../../domain/constants';
import { formatSlot } from '../../domain/warehouse';
import { useMotors } from '../../store/MotorsProvider';
import { MotorActions } from '../motors/MotorActions';
import { usePanZoom } from './usePanZoom';

const PLAN_URL = `${import.meta.env.BASE_URL}plano.png`;
const FALLBACK_ASPECT = 16 / 10;
const ALL = 'Todos';
const DRAG_THRESHOLD_PX = 4;

/** Carga public/plano.png y devuelve su proporción; null mientras carga, false si no existe. */
function usePlanImage() {
  const [state, setState] = useState({ status: 'loading', aspect: FALLBACK_ASPECT });
  useEffect(() => {
    const img = new Image();
    img.onload = () => setState({ status: 'ok', aspect: img.naturalWidth / img.naturalHeight });
    img.onerror = () => setState({ status: 'missing', aspect: FALLBACK_ASPECT });
    img.src = PLAN_URL;
  }, []);
  return state;
}

export function PlanView() {
  const { motors, setPlanPosition } = useMotors();
  const plan = usePlanImage();
  const { viewportRef, view, panHandlers, zoomIn, zoomOut, reset } = usePanZoom(plan.aspect);
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const [dragPos, setDragPos] = useState(null); // { id, x, y }
  const [selectedId, setSelectedId] = useState(null);
  const [sector, setSector] = useState(ALL);

  const visible = useMemo(() => (sector === ALL ? motors : motors.filter((m) => m.location === sector)), [motors, sector]);
  const selected = motors.find((m) => m.id === selectedId) ?? null; // si se borra, el panel se cierra solo

  const toPercent = (clientX, clientY) => {
    const rect = stageRef.current.getBoundingClientRect();
    const clamp = (v) => Math.min(98, Math.max(2, v));
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100),
    };
  };

  const pinHandlers = (motor) => ({
    onPointerDown: (e) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      dragRef.current = { id: motor.id, startX: e.clientX, startY: e.clientY, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      const drag = dragRef.current;
      if (!drag || drag.id !== motor.id) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      setDragPos({ id: motor.id, ...toPercent(e.clientX, e.clientY) });
    },
    onPointerUp: (e) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag) return;
      if (drag.moved) {
        const { x, y } = toPercent(e.clientX, e.clientY);
        setPlanPosition(motor.id, Math.round(x * 10) / 10, Math.round(y * 10) / 10).finally(() => setDragPos(null));
      } else {
        setSelectedId(motor.id);
      }
    },
  });

  return (
    <div className="flex h-full min-h-[600px] flex-col gap-4">
      <div className="card flex shrink-0 flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Lay out Planta Papel · Cartocor Arroyito</h2>
          <p className="text-xs text-slate-500">
            Arrastrá un motor para ubicarlo · clic para ver su ficha · rueda del mouse para zoom · arrastrá el fondo para moverte
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-600">Sector:</span>
            <select value={sector} onChange={(e) => setSector(e.target.value)} className="input w-auto">
              {[ALL, ...LOCATIONS].map((l) => (
                <option key={l} value={l}>
                  {l === ALL ? 'Todo el predio' : l}
                </option>
              ))}
            </select>
          </label>
          <div className="flex overflow-hidden rounded-xl border border-slate-300 text-sm font-bold">
            <button type="button" onClick={zoomOut} className="px-3 py-1.5 hover:bg-slate-100" aria-label="Alejar">
              −
            </button>
            <button type="button" onClick={reset} className="border-x border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100">
              {Math.round(view.scale * 100)}%
            </button>
            <button type="button" onClick={zoomIn} className="px-3 py-1.5 hover:bg-slate-100" aria-label="Acercar">
              +
            </button>
          </div>
        </div>
      </div>

      <div
        ref={viewportRef}
        {...panHandlers}
        className={`relative min-h-[560px] flex-1 cursor-grab touch-none overflow-hidden rounded-2xl border border-slate-300 shadow-inner select-none active:cursor-grabbing ${
          plan.status === 'ok' ? 'bg-white' : 'blueprint-grid'
        }`}
      >
        <div
          ref={stageRef}
          className="absolute top-0 left-0 w-full origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, aspectRatio: plan.aspect }}
        >
          {plan.status === 'ok' ? (
            <img src={PLAN_URL} alt="Lay out Planta Papel" draggable={false} className="pointer-events-none block h-full w-full" />
          ) : (
            <FallbackSchematic missing={plan.status === 'missing'} />
          )}

          {visible.map((motor) => {
            const style = conditionStyle(motor.condition);
            const pos = dragPos?.id === motor.id ? dragPos : motor;
            const isSelected = motor.id === selectedId;
            return (
              <div
                key={motor.id}
                {...pinHandlers(motor)}
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: `translate(-50%, -50%) scale(${1 / view.scale})` }}
                className={`absolute z-20 cursor-grab touch-none active:cursor-grabbing ${isSelected ? 'z-30' : ''}`}
                title={`${motor.tag} · ${motor.condition}`}
              >
                <div
                  className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 whitespace-nowrap shadow-lg transition-colors ${style.border} ${
                    isSelected ? 'bg-slate-900 text-white ring-2 ring-emerald-500' : 'bg-white text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: style.hex }} />
                  <span className="font-mono text-xs font-bold">{motor.tag}</span>
                  {motor.power && <span className={`hidden text-[10px] sm:inline ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>({motor.power})</span>}
                </div>
              </div>
            );
          })}
        </div>

        {selected && <MotorDetailPanel motor={selected} onClose={() => setSelectedId(null)} />}
      </div>
    </div>
  );
}

function MotorDetailPanel({ motor, onClose }) {
  const { changeCondition, changeLocation } = useMotors();
  return (
    <div
      className="absolute right-4 bottom-4 z-40 w-80 cursor-default rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 shadow-2xl"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold">{motor.tag}</span>
          <h3 className="mt-1 text-sm font-bold">
            {motor.power || '—'} · {motor.rpm ? `${motor.rpm} RPM` : '—'}
          </h3>
          {motor.palletNum && <p className="text-[11px] font-semibold text-emerald-700">{formatSlot(motor.palletNum)}</p>}
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1 font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-900" aria-label="Cerrar">
          ✕
        </button>
      </div>
      <p className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">{motor.description || 'Sin descripción.'}</p>
      <div className="mb-4 space-y-3 text-xs">
        <label className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Área / sector:</span>
          <LocationSelect value={motor.location} onChange={(l) => changeLocation(motor.id, l)} className="input w-44 py-1 text-xs font-semibold" />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Condición:</span>
          <ConditionSelect value={motor.condition} onChange={(c) => changeCondition(motor.id, c)} className="input w-44 py-1 text-xs font-semibold" />
        </label>
      </div>
      <MotorActions motor={motor} />
    </div>
  );
}

function FallbackSchematic({ missing }) {
  const box = 'w-[45%] rounded-xl border-2 border-slate-400 bg-slate-800/10 p-4 text-center text-sm font-black tracking-wider text-slate-300';
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 opacity-60">
      <div className="flex items-center justify-between border-b-2 border-dashed border-slate-500 pb-4">
        <div className={box}>DEPÓSITO / RACKS</div>
        <div className={box}>SALA DE MÁQUINA PAPEL</div>
      </div>
      {missing && <p className="text-center text-xs text-slate-300">Falta el archivo public/plano.png</p>}
      <div className="flex items-center justify-between pt-4">
        <div className={box}>TALLER DE MANTENIMIENTO</div>
        <div className={box}>PLANTA SECTOR A</div>
      </div>
    </div>
  );
}
