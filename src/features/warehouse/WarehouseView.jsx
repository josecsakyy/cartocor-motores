import { useMemo, useState } from 'react';
import { DEPOT, conditionStyle } from '../../domain/constants';
import { FLOORS, PALLETS, RACKS, palletNumberOf } from '../../domain/warehouse';
import { useMotors } from '../../store/MotorsProvider';
import { MotorQuickModal } from './MotorQuickModal';

export function WarehouseView() {
  const { motors, movePallet } = useMotors();
  const [openId, setOpenId] = useState(null);
  const openMotor = openId ? motors.find((m) => m.id === openId) ?? null : null;

  const byPallet = useMemo(() => {
    const map = new Map();
    motors
      .filter((m) => m.location === DEPOT)
      .forEach((m) => map.set(m.palletNum, [...(map.get(m.palletNum) ?? []), m]));
    return map;
  }, [motors]);

  const depotCount = [...byPallet.values()].reduce((n, list) => n + list.length, 0);
  const floorsTopDown = [...FLOORS.keys()].reverse();

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-col items-start justify-between gap-4 p-5 md:flex-row md:items-center">
        <div>
          <h2 className="text-base font-bold text-slate-900">Depósito de motores · Tarimas 1 a 24</h2>
          <p className="mt-1 text-xs text-slate-500">
            Esquema de los 4 racks. Arrastrá un motor de una tarima a otra para moverlo. Tocá un motor para ver su ficha y las opciones (mover, historial, editar, eliminar).
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs">
          <span className="font-semibold text-slate-700">Motores en depósito: </span>
          <span className="font-bold text-slate-900">{depotCount}</span>
        </div>
      </div>

      {(byPallet.get(null)?.length ?? 0) > 0 && (
        <section className="card p-4">
          <h3 className="mb-2 text-sm font-bold text-slate-900">
            En depósito sin tarima asignada ({byPallet.get(null).length}) · arrastralos a una tarima para ubicarlos
          </h3>
          <PalletCell number={null} motors={byPallet.get(null)} onMove={movePallet} onOpen={setOpenId} wide />
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {RACKS.map((rack, r) => {
          const rackCount = FLOORS.flatMap((_, f) => PALLETS.map((_, p) => byPallet.get(palletNumberOf(r, f, p)) ?? [])).flat().length;
          return (
            <section key={rack} className="card flex flex-col overflow-hidden">
              <header className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
                <span className="text-sm font-black tracking-wide">{rack}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold">{rackCount} motores</span>
              </header>
              <div className="flex flex-1 flex-col gap-3 bg-slate-50/50 p-4">
                {floorsTopDown.map((f) => (
                  <div key={f} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-2 border-b border-slate-100 pb-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      {FLOORS[f]}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {PALLETS.map((_, p) => {
                        const number = palletNumberOf(r, f, p);
                        return <PalletCell key={number} number={number} motors={byPallet.get(number) ?? []} onMove={movePallet} onOpen={setOpenId} />;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {openMotor && <MotorQuickModal motor={openMotor} onMove={movePallet} onClose={() => setOpenId(null)} />}
    </div>
  );
}

const DRAG_TYPE = 'application/x-cartocor-motor';

function PalletCell({ number, motors, onMove, onOpen, wide = false }) {
  const [isOver, setIsOver] = useState(false);

  const dropHandlers = {
    onDragOver: (e) => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsOver(true);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setIsOver(false);
    },
    onDrop: (e) => {
      e.preventDefault();
      setIsOver(false);
      const { id, from } = JSON.parse(e.dataTransfer.getData(DRAG_TYPE) || '{}');
      if (id && from !== number) onMove(id, number);
    },
  };

  return (
    <div
      {...dropHandlers}
      className={`flex min-h-[95px] flex-col rounded-lg border p-2 transition-colors ${
        isOver ? 'border-2 border-dashed border-brand bg-emerald-50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="mb-1 flex items-center justify-between rounded bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
        <span>{number ? `Tarima #${number}` : 'Sin tarima'}</span>
        {motors.length > 0 && <span className="rounded bg-emerald-600 px-1.5 text-[9px] font-black text-white">{motors.length}</span>}
      </div>
      <div
        className={
          wide
            ? 'grid max-h-[320px] grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'
            : 'flex max-h-[180px] flex-col gap-1.5 overflow-y-auto'
        }
      >
        {motors.length === 0 ? (
          <div className="py-2 text-center text-[10px] text-slate-300 italic">Vacía</div>
        ) : (
          motors.map((motor) => {
            const style = conditionStyle(motor.condition);
            return (
              <button
                type="button"
                key={motor.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ id: motor.id, from: number }));
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => onOpen(motor.id)}
                title={`${motor.description || motor.tag} · clic para ver opciones, arrastrá para mover`}
                className={`flex w-full cursor-grab items-center gap-1.5 rounded-md border bg-white px-1.5 py-1 text-left hover:bg-slate-50 active:cursor-grabbing ${style.border}`}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: style.hex }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[11px] font-bold text-slate-900">{motor.tag}</span>
                  <span className="block truncate text-[10px] text-slate-500">
                    {[motor.power, motor.brand].filter(Boolean).join(' · ') || '—'}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
