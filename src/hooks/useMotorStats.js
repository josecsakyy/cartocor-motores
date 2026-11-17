import { useMemo } from 'react';
import { DEPOT, OPERATIVE, PENDING_CONDITIONS, PLANT } from '../domain/constants';

export function useMotorStats(motors) {
  return useMemo(
    () => ({
      total: motors.length,
      depotStock: motors.filter((m) => m.location === DEPOT && m.condition === OPERATIVE).length,
      inPlant: motors.filter((m) => m.location === PLANT).length,
      pending: motors.filter((m) => PENDING_CONDITIONS.includes(m.condition)).length,
    }),
    [motors],
  );
}
