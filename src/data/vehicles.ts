import type { Vehicle } from '../types'

/**
 * Phase 1 BEV catalog (MX-oriented approximate public specs).
 * Sources noted as comments; figures may be rounded for compare UX.
 */
export const vehicles: Vehicle[] = [
  {
    id: 'chevrolet-spark-euv',
    brand: 'Chevrolet',
    model: 'Spark EUV',
    type: 'BEV',
    versions: [
      {
        // MX Activ: ~42 kWh LFP, ~385 km NEDC, CCS1
        id: 'spark-euv-activ',
        name: 'Activ',
        batteryKWh: 42,
        rangeKmOfficial: 385,
        consumptionKWhPer100: 10.91,
        powerKW: 75,
        connector: 'CCS1',
      },
    ],
  },
  {
    id: 'byd-dolphin-mini',
    brand: 'BYD',
    model: 'Dolphin Mini',
    type: 'BEV',
    versions: [
      {
        // Entry ~300 km NEDC, 30.08 kWh Blade, GB/T, ~10 kWh/100
        id: 'dolphin-mini-300',
        name: '300 km',
        batteryKWh: 30.08,
        rangeKmOfficial: 300,
        consumptionKWhPer100: 10,
        powerKW: 55,
        connector: 'GB/T',
      },
      {
        // Plus / top ~380 km NEDC, 38 kWh
        id: 'dolphin-mini-plus',
        name: 'Plus',
        batteryKWh: 38,
        rangeKmOfficial: 380,
        consumptionKWhPer100: 10,
        powerKW: 55,
        connector: 'GB/T',
      },
    ],
  },
  {
    id: 'geely-ex2',
    brand: 'Geely',
    model: 'EX2',
    type: 'BEV',
    versions: [
      {
        // MX GL entry: 39.4 kWh, 395 km NEDC, 11.8 kWh/100
        id: 'ex2-gl',
        name: 'GL',
        batteryKWh: 39.4,
        rangeKmOfficial: 395,
        consumptionKWhPer100: 11.8,
        powerKW: 85,
        connector: 'other', // MX: Tipo 2 / CCS2
      },
      {
        // MX GF top trim (same pack/range; equipment differ)
        id: 'ex2-gf',
        name: 'GF',
        batteryKWh: 39.4,
        rangeKmOfficial: 395,
        consumptionKWhPer100: 11.8,
        powerKW: 85,
        connector: 'other',
      },
    ],
  },
  {
    id: 'gac-aion-ut',
    brand: 'GAC',
    model: 'AION UT',
    type: 'BEV',
    versions: [
      {
        // China base: ~34.9 kWh / ~330 km CLTC
        id: 'aion-ut-base',
        name: 'Base 330',
        batteryKWh: 34.9,
        rangeKmOfficial: 330,
        consumptionKWhPer100: 11.4,
        powerKW: 100,
        connector: 'GB/T',
      },
      {
        // Top: ~44.1 kWh / ~420 km CLTC
        id: 'aion-ut-top',
        name: 'Top 420',
        batteryKWh: 44.1,
        rangeKmOfficial: 420,
        consumptionKWhPer100: 11.4,
        powerKW: 100,
        connector: 'GB/T',
      },
    ],
  },
]

export function getAllVehicles(): Vehicle[] {
  return vehicles
}

export function getVehicleById(id: string): Vehicle | undefined {
  return vehicles.find((v) => v.id === id)
}
