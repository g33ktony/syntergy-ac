import type { PhevVehicle } from '../types'

/**
 * Phase 2 PHEV catalog (MX-oriented approximate public specs; EV range and
 * charge-sustaining L/100km from manufacturer sheets, rounded for compare
 * UX).
 */
export const phevVehicles: PhevVehicle[] = [
  {
    id: 'toyota-rav4-prime',
    brand: 'Toyota',
    model: 'RAV4 Prime',
    type: 'PHEV',
    versions: [
      {
        // ~18.1 kWh, ~68 km EV range, 45 L tank, ~6 L/100 charge-sustaining
        id: 'rav4-prime',
        name: 'Prime',
        batteryKWh: 18.1,
        electricRangeKmOfficial: 68,
        tankLiters: 45,
        consumptionLPer100ChargeSustaining: 6.0,
        fuel: 'gasolina',
        connector: 'other',
      },
    ],
  },
  {
    id: 'byd-song-plus-dmi',
    brand: 'BYD',
    model: 'Song Plus DM-i',
    type: 'PHEV',
    versions: [
      {
        // ~18.3 kWh, ~120 km CLTC EV range, 50 L tank, ~5 L/100 CS
        id: 'song-plus-dmi',
        name: 'DM-i',
        batteryKWh: 18.3,
        electricRangeKmOfficial: 120,
        tankLiters: 50,
        consumptionLPer100ChargeSustaining: 5.0,
        fuel: 'gasolina',
        connector: 'GB/T',
      },
    ],
  },
  {
    id: 'mitsubishi-outlander-phev',
    brand: 'Mitsubishi',
    model: 'Outlander PHEV',
    type: 'PHEV',
    versions: [
      {
        // ~20 kWh, ~54 km EV range, 56 L tank, ~7 L/100 CS
        id: 'outlander-phev',
        name: 'PHEV',
        batteryKWh: 20.0,
        electricRangeKmOfficial: 54,
        tankLiters: 56,
        consumptionLPer100ChargeSustaining: 7.0,
        fuel: 'gasolina',
        connector: 'other',
      },
    ],
  },
]
