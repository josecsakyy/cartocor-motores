import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createFirestoreRepository } from '../services/firestoreRepository';
import { createLocalRepository } from '../services/localRepository';
import { compareByTag, createHistoryEntry, newId, normalizeMotor, withLocation } from '../domain/motor';
import { formatSlot } from '../domain/warehouse';
import { useToast } from '../components/ui/Toast';

const MotorsContext = createContext(null);

/**
 * Única fuente de verdad de los motores.
 * Tabla, Depósito y Plano leen de acá y escriben solo a través de estas acciones,
 * así que un alta, un cambio o un borrado se ve igual en las tres vistas
 * (y en todas las ventanas abiertas, porque los datos llegan siempre del repositorio).
 */
export function MotorsProvider({ children }) {
  const toast = useToast();
  const [motors, setMotors] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | synced | offline | local
  const repoRef = useRef(null);
  const motorsRef = useRef(motors);
  motorsRef.current = motors;

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    const attach = (repo) => {
      repoRef.current = repo;
      unsubscribe = repo.subscribe(
        (list, meta) => {
          setMotors([...list].sort(compareByTag));
          setStatus(repo.mode === 'local' ? 'local' : meta.fromCache ? 'offline' : 'synced');
        },
        (error) => {
          console.error('Error de sincronización con Firebase:', error);
          toast.error('Se perdió la conexión con la nube. Trabajando en modo local.');
          unsubscribe();
          if (!cancelled) attach(createLocalRepository());
        },
      );
    };

    createFirestoreRepository()
      .then((repo) => !cancelled && attach(repo))
      .catch((error) => {
        console.error('No se pudo iniciar Firebase:', error);
        if (!cancelled) attach(createLocalRepository());
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [toast]);

  const run = useCallback(
    async (operation, successMessage) => {
      if (!repoRef.current) {
        toast.error('Todavía se están cargando los datos. Probá de nuevo en un momento.');
        return false;
      }
      try {
        await operation(repoRef.current);
        if (successMessage) toast.success(successMessage);
        return true;
      } catch (error) {
        console.error(error);
        toast.error('No se pudo guardar el cambio. Revisá la conexión e intentá de nuevo.');
        return false;
      }
    },
    [toast],
  );

  /** Aplica un cambio a un motor existente y registra el evento en su historial. */
  const update = useCallback(
    (id, change, historyAction, successMessage) => {
      const current = motorsRef.current.find((m) => m.id === id);
      if (!current) {
        toast.error('Ese motor ya no existe (pudo haber sido eliminado en otra ventana).');
        return Promise.resolve(false);
      }
      const updated = change(current);
      if (historyAction) {
        updated.history = [createHistoryEntry(historyAction, 'Modificación rápida en sistema.'), ...current.history];
      }
      return run((repo) => repo.save(normalizeMotor(updated)), successMessage);
    },
    [run, toast],
  );

  const actions = useMemo(
    () => ({
      getById: (id) => motorsRef.current.find((m) => m.id === id) ?? null,

      isTagTaken: (tag, exceptId) =>
        motorsRef.current.some((m) => m.id !== exceptId && m.tag.toLowerCase() === tag.trim().toLowerCase()),

      createMotor: (data) => {
        const motor = normalizeMotor(
          { ...data, history: [createHistoryEntry('Registro inicial en sistema', 'Alta de motor en inventario.')] },
          newId(),
        );
        return run((repo) => repo.save(motor), `Motor ${motor.tag} registrado`);
      },

      editMotor: (id, data) =>
        update(id, (current) => ({ ...current, ...data, id, history: current.history }), null, 'Cambios guardados'),

      deleteMotor: (id) => {
        const motor = motorsRef.current.find((m) => m.id === id);
        return run((repo) => repo.remove(id), motor ? `Motor ${motor.tag} eliminado` : 'Motor eliminado');
      },

      changeCondition: (id, condition) =>
        update(id, (m) => ({ ...m, condition }), `Cambio de condición a: ${condition}`, 'Condición actualizada'),

      changeLocation: (id, location) =>
        update(id, (m) => withLocation(m, location), `Cambio de ubicación a: ${location}`, 'Ubicación actualizada'),

      movePallet: (id, palletNum) =>
        update(
          id,
          (m) => withLocation(m, m.location, palletNum),
          `Reubicado en ${formatSlot(palletNum)}`,
          `Movido a Tarima #${palletNum}`,
        ),

      setPlanPosition: (id, x, y) => update(id, (m) => ({ ...m, x, y }), null, null),

      addHistoryEntry: (id, action, notes, user) =>
        update(
          id,
          (m) => ({ ...m, history: [createHistoryEntry(action, notes, user), ...m.history] }),
          null,
          'Evento agregado al historial',
        ),

      saveMany: (list, successMessage) => run((repo) => repo.saveMany(list.map((m) => normalizeMotor(m))), successMessage),
    }),
    [run, update],
  );

  const value = useMemo(() => ({ motors, status, ...actions }), [motors, status, actions]);

  return <MotorsContext.Provider value={value}>{children}</MotorsContext.Provider>;
}

export function useMotors() {
  const ctx = useContext(MotorsContext);
  if (!ctx) throw new Error('useMotors debe usarse dentro de <MotorsProvider>');
  return ctx;
}
