export const DEPOT = 'Depósito';

export const LOCATIONS = [DEPOT, 'Sala de Máquina', 'Planta Sector A', 'Taller de Mantenimiento'];

export const CONDITIONS = ['En funcionamiento', 'Esperando repuesto', 'En reparación', 'Retirado'];

export const PENDING_CONDITIONS = ['Esperando repuesto', 'En reparación'];

export const FLANGES = ['Con brida', 'Sin brida'];

export const DEFAULT_USER = 'Mantenimiento Arroyito';

export const BRAND_GREEN = '#78BC1B';

export const CONDITION_STYLES = {
  'En funcionamiento': {
    rowBg: 'bg-emerald-50/40 hover:bg-emerald-50/70',
    border: 'border-emerald-300',
    badge: 'bg-emerald-600 text-white',
    hex: BRAND_GREEN,
  },
  'Esperando repuesto': {
    rowBg: 'bg-amber-50/40 hover:bg-amber-50/70',
    border: 'border-amber-300',
    badge: 'bg-amber-500 text-white',
    hex: '#d97706',
  },
  'En reparación': {
    rowBg: 'bg-orange-50/40 hover:bg-orange-50/70',
    border: 'border-orange-300',
    badge: 'bg-orange-600 text-white',
    hex: '#ea580c',
  },
  Retirado: {
    rowBg: 'bg-slate-100/60 hover:bg-slate-100',
    border: 'border-slate-300',
    badge: 'bg-slate-600 text-white',
    hex: '#64748b',
  },
};

export const conditionStyle = (condition) => CONDITION_STYLES[condition] ?? CONDITION_STYLES.Retirado;
