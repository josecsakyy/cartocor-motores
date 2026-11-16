import { useMemo } from 'react';
import { DEPOT, PENDING_CONDITIONS } from '../domain/constants';

export function useMotorStats(motors) {
  return useMemo(
    () => ({
      total: motors.length,
      depotStock: motors.filter((m) => m.location === DEPOT && m.condition === 'En funcionamiento').length,
      inPlant: motors.filter((m) => m.location !== DEPOT).length,
      pending: motors.filter((m) => PENDING_CONDITIONS.includes(m.condition)).length,
    }),
    [motors],
  );
}
