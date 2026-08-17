import type { HevVehicle } from '../types'

/**
 * Phase 2 HEV catalog (MX-oriented approximate public specs). HEV versions
 * share the ICE liquid-fuel shape (design §5) — hybridization shows up as
 * lower combined L/100km, not a distinct calc path.
 */
export const hevVehicles: HevVehicle[] = [
  {
    id: 'toyota-corolla-hybrid',
    brand: 'Toyota',
    model: 'Corolla Hybrid',
    type: 'HEV',
    versions: [
      {
        // LE: ~43 L tank, ~4.2 L/100 combined (Toyota HSD)
        id: 'corolla-hybrid-le',
        name: 'LE',
        tankLiters: 43,
        rangeKmOfficial: 1000,
        consumptionLPer100: 4.2,
        fuel: 'gasolina',
      },
      {
        // XLE: same hybrid system, heavier trim
        id: 'corolla-hybrid-xle',
        name: 'XLE',
        tankLiters: 43,
        rangeKmOfficial: 950,
        consumptionLPer100: 4.5,
        fuel: 'gasolina',
      },
    ],
  },
  {
    id: 'honda-civic-hybrid',
    brand: 'Honda',
    model: 'Civic Hybrid',
    type: 'HEV',
    versions: [
      {
        // Sport Hybrid: ~40 L tank, ~4.6 L/100 combined
        id: 'civic-hybrid-sport',
        name: 'Sport Hybrid',
        tankLiters: 40,
        rangeKmOfficial: 850,
        consumptionLPer100: 4.6,
        fuel: 'gasolina',
      },
    ],
  },
  {
    id: 'nissan-kicks-epower',
    brand: 'Nissan',
    model: 'Kicks e-POWER',
    type: 'HEV',
    versions: [
      {
        // Advance: series hybrid (engine only charges battery), ~41 L tank
        id: 'kicks-epower-advance',
        name: 'Advance',
        tankLiters: 41,
        rangeKmOfficial: 900,
        consumptionLPer100: 4.6,
        fuel: 'gasolina',
      },
      {
        // Exclusive: top trim, same powertrain
        id: 'kicks-epower-exclusive',
        name: 'Exclusive',
        tankLiters: 41,
        rangeKmOfficial: 870,
        consumptionLPer100: 4.8,
        fuel: 'gasolina',
      },
    ],
  },
]
