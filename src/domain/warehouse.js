// Depósito: 4 racks × 3 pisos × 2 tarimas = 24 tarimas numeradas.
export const RACKS = ['Rack 1', 'Rack 2', 'Rack 3', 'Rack 4'];
export const FLOORS = ['Piso 1', 'Piso 2', 'Piso 3'];
export const PALLETS = ['Tarima 1', 'Tarima 2'];

export const PALLETS_PER_RACK = FLOORS.length * PALLETS.length;
export const TOTAL_PALLETS = RACKS.length * PALLETS_PER_RACK;

export const palletNumberOf = (rackIndex, floorIndex, palletIndex) =>
  rackIndex * PALLETS_PER_RACK + floorIndex * PALLETS.length + palletIndex + 1;

export const WAREHOUSE_SLOTS = RACKS.flatMap((rack, r) =>
  FLOORS.flatMap((floor, f) =>
    PALLETS.map((pallet, p) => {
      const number = palletNumberOf(r, f, p);
      return { number, rack, floor, pallet, label: `Tarima #${number} (${rack} - ${floor} - ${pallet})` };
    }),
  ),
);

export const isValidPallet = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= TOTAL_PALLETS;
};

/** Devuelve la tarima o null si el número no es válido. */
export const getSlot = (value) => (isValidPallet(value) ? WAREHOUSE_SLOTS[Number(value) - 1] : null);

/** Reconstruye el número de tarima a partir de los campos rack/piso/tarima de registros viejos. */
export const palletFromLegacyFields = ({ rack, floor, pallet }) => {
  const r = RACKS.indexOf(rack);
  const f = FLOORS.indexOf(floor);
  const p = PALLETS.indexOf(pallet);
  return r >= 0 && f >= 0 && p >= 0 ? palletNumberOf(r, f, p) : null;
};

export const formatSlot = (palletNum) => {
  const slot = getSlot(palletNum);
  return slot ? `Tarima #${slot.number} (${slot.rack} - ${slot.floor})` : 'Sin tarima asignada';
};
