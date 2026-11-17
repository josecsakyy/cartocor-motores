export const DEPOT = 'Depósito';

export const PLANT = 'Planta';

export const REPAIR_SHOP = 'Taller de Mantenimiento';

export const LOCATIONS = [PLANT, DEPOT, REPAIR_SHOP];

// "En funcionamiento" es solo para motores instalados en planta. Un motor guardado en
// depósito (o en el taller) que está en condiciones de usarse figura como "Operativo".
export const RUNNING = 'En funcionamiento';
export const OPERATIVE = 'Operativo';
export const CONDITIONS = [RUNNING, OPERATIVE, 'Esperando repuesto', 'En reparación', 'No operativo', 'Retirado'];

export const PENDING_CONDITIONS = ['Esperando repuesto', 'En reparación'];

export const FLANGES = ['Con brida', 'Sin brida', 'Sin dato'];

export const DEFAULT_USER = 'Mantenimiento Arroyito';

export const BRAND_GREEN = '#78BC1B';

export const CONDITION_STYLES = {
  'En funcionamiento': {
    rowBg: 'bg-emerald-50/40 hover:bg-emerald-50/70',
    border: 'border-emerald-300',
    badge: 'bg-emerald-600 text-white',
    hex: BRAND_GREEN,
  },
  Operativo: {
    rowBg: 'bg-sky-50/40 hover:bg-sky-50/70',
    border: 'border-sky-300',
    badge: 'bg-sky-600 text-white',
    hex: '#0284c7',
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
  'No operativo': {
    rowBg: 'bg-red-50/40 hover:bg-red-50/70',
    border: 'border-red-300',
    badge: 'bg-red-600 text-white',
    hex: '#dc2626',
  },
  Retirado: {
    rowBg: 'bg-slate-100/60 hover:bg-slate-100',
    border: 'border-slate-300',
    badge: 'bg-slate-600 text-white',
    hex: '#64748b',
  },
};

export const conditionStyle = (condition) => CONDITION_STYLES[condition] ?? CONDITION_STYLES.Retirado;
