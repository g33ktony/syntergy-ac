import type { IceVehicle } from '../types'

/**
 * Phase 2 ICE catalog (MX-oriented approximate public specs; combined-cycle
 * L/100km and tank size from manufacturer spec sheets / press kits, rounded
 * for compare UX — not exact per-trim figures).
 */
export const iceVehicles: IceVehicle[] = [
  {
    id: 'vw-virtus',
    brand: 'Volkswagen',
    model: 'Virtus',
    type: 'ICE',
    versions: [
      {
        // Comfortline 1.6: ~50 L tank, ~600 km claimed range, ~7.5 L/100
        id: 'virtus-comfortline',
        name: 'Comfortline',
        tankLiters: 50,
        rangeKmOfficial: 600,
        consumptionLPer100: 7.5,
        fuel: 'gasolina',
      },
      {
        // Highline TSI: same tank, slightly thirstier turbo trim
        id: 'virtus-highline-tsi',
        name: 'Highline TSI',
        tankLiters: 50,
        rangeKmOfficial: 580,
        consumptionLPer100: 8.0,
        fuel: 'gasolina',
      },
    ],
  },
  {
    id: 'nissan-sentra',
    brand: 'Nissan',
    model: 'Sentra',
    type: 'ICE',
    versions: [
      {
        // Sense 2.0: ~52 L tank, ~7 L/100 combined
        id: 'sentra-sense',
        name: 'Sense',
        tankLiters: 52,
        rangeKmOfficial: 700,
        consumptionLPer100: 7.0,
        fuel: 'gasolina',
      },
      {
        // Exclusive: same engine, slightly more equipment weight
        id: 'sentra-exclusive',
        name: 'Exclusive',
        tankLiters: 52,
        rangeKmOfficial: 680,
        consumptionLPer100: 7.2,
        fuel: 'gasolina',
      },
    ],
  },
  {
    id: 'mazda-mazda3',
    brand: 'Mazda',
    model: 'Mazda3',
    type: 'ICE',
    versions: [
      {
        // i Sedán 2.0 Skyactiv-G: ~51 L tank, ~6.8 L/100 combined
        id: 'mazda3-i-sedan',
        name: 'i Sedán',
        tankLiters: 51,
        rangeKmOfficial: 720,
        consumptionLPer100: 6.8,
        fuel: 'gasolina',
      },
      {
        // s Grand Touring 2.5: bigger engine, thirstier
        id: 'mazda3-s-grand-touring',
        name: 's Grand Touring',
        tankLiters: 51,
        rangeKmOfficial: 650,
        consumptionLPer100: 7.8,
        fuel: 'gasolina',
      },
    ],
  },
  {
    id: 'chevrolet-onix',
    brand: 'Chevrolet',
    model: 'Onix',
    type: 'ICE',
    versions: [
      {
        // LT 1.0 Turbo: ~44 L tank, ~5.9 L/100 combined
        id: 'onix-lt',
        name: 'LT',
        tankLiters: 44,
        rangeKmOfficial: 700,
        consumptionLPer100: 5.9,
        fuel: 'gasolina',
      },
      {
        // Premier: same engine, more comfort features
        id: 'onix-premier',
        name: 'Premier',
        tankLiters: 44,
        rangeKmOfficial: 680,
        consumptionLPer100: 6.1,
        fuel: 'gasolina',
      },
    ],
  },
  {
    id: 'ford-mustang-gt',
    brand: 'Ford',
    model: 'Mustang GT',
    type: 'ICE',
    versions: [
      {
        // 5.0 V8: ~61 L tank, ~13 L/100 combined — deliberate high-thirst
        // contrast entry per plan's "stretch" suggestion.
        id: 'mustang-gt',
        name: 'GT',
        tankLiters: 61,
        rangeKmOfficial: 470,
        consumptionLPer100: 13.0,
        fuel: 'gasolina',
      },
    ],
  },
]
