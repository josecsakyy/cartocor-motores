import { normalizeMotor, toStorage } from '../domain/motor';

// Misma clave que usaba la versión anterior, así no se pierden datos locales previos.
const STORAGE_KEY = 'cartocor_motors_v3';

const read = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.map((m) => normalizeMotor(m)) : [];
  } catch {
    return [];
  }
};

/**
 * Repositorio de respaldo en el navegador (cuando Firebase no está disponible).
 * Usa el evento "storage" para que todas las pestañas abiertas se mantengan iguales.
 */
export function createLocalRepository() {
  const listeners = new Set();
  const emit = () => {
    const motors = read();
    listeners.forEach((fn) => fn(motors, { fromCache: true, pendingWrites: false }));
  };
  const write = (motors) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(motors.map(toStorage)));
    emit();
  };
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY) emit();
  };

  return {
    mode: 'local',

    subscribe(onData) {
      listeners.add(onData);
      if (listeners.size === 1) window.addEventListener('storage', onStorage);
      onData(read(), { fromCache: true, pendingWrites: false });
      return () => {
        listeners.delete(onData);
        if (listeners.size === 0) window.removeEventListener('storage', onStorage);
      };
    },

    async save(motor) {
      const motors = read();
      const i = motors.findIndex((m) => m.id === motor.id);
      if (i >= 0) motors[i] = motor;
      else motors.push(motor);
      write(motors);
    },

    async saveMany(changed) {
      const byId = new Map(read().map((m) => [m.id, m]));
      changed.forEach((m) => byId.set(m.id, m));
      write([...byId.values()]);
    },

    async remove(id) {
      write(read().filter((m) => m.id !== id));
    },
  };
}
