export type MxTollCorridor = {
  id: string
  name: string
  aliasesA: string[]
  aliasesB: string[]
  costMxn: number
  /** Optional bounding box [south, west, north, east] for path matching. */
  bbox?: [number, number, number, number]
}

/**
 * Approximate auto (cars) caseta totals for common MX corridors.
 * Figures are rounded CAPUFE/IAVE-style estimates, not live tariffs.
 */
export const MX_TOLL_CORRIDORS: MxTollCorridor[] = [
  {
    id: 'cdmx-queretaro',
    name: 'México–Querétaro (M40D/57D)',
    aliasesA: ['cdmx', 'ciudad de mexico', 'mexico', 'cdmx, mx'],
    aliasesB: ['queretaro', 'querétaro'],
    costMxn: 320,
    bbox: [19.3, -100.6, 20.8, -98.9],
  },
  {
    id: 'cdmx-puebla',
    name: 'México–Puebla (M150D)',
    aliasesA: ['cdmx', 'ciudad de mexico', 'mexico'],
    aliasesB: ['puebla'],
    costMxn: 160,
    bbox: [18.9, -99.3, 19.5, -98.1],
  },
  {
    id: 'cdmx-toluca',
    name: 'México–Toluca',
    aliasesA: ['cdmx', 'ciudad de mexico', 'mexico'],
    aliasesB: ['toluca'],
    costMxn: 95,
  },
  {
    id: 'cdmx-cuernavaca',
    name: 'México–Cuernavaca (M95D)',
    aliasesA: ['cdmx', 'ciudad de mexico', 'mexico'],
    aliasesB: ['cuernavaca'],
    costMxn: 110,
  },
  {
    id: 'cdmx-morelia',
    name: 'México–Morelia',
    aliasesA: ['cdmx', 'ciudad de mexico', 'mexico'],
    aliasesB: ['morelia'],
    costMxn: 480,
  },
  {
    id: 'gdl-cdmx',
    name: 'Guadalajara–México',
    aliasesA: ['guadalajara', 'gdl'],
    aliasesB: ['cdmx', 'ciudad de mexico', 'mexico'],
    costMxn: 820,
  },
  {
    id: 'gdl-vallarta',
    name: 'Guadalajara–Puerto Vallarta',
    aliasesA: ['guadalajara', 'gdl'],
    aliasesB: ['puerto vallarta', 'vallarta'],
    costMxn: 420,
  },
  {
    id: 'mty-cdmx',
    name: 'Monterrey–México',
    aliasesA: ['monterrey', 'mty'],
    aliasesB: ['cdmx', 'ciudad de mexico', 'mexico'],
    costMxn: 1250,
  },
  {
    id: 'mty-saltillo',
    name: 'Monterrey–Saltillo',
    aliasesA: ['monterrey', 'mty'],
    aliasesB: ['saltillo'],
    costMxn: 85,
  },
  {
    id: 'leon-gdl',
    name: 'León–Guadalajara',
    aliasesA: ['leon', 'león'],
    aliasesB: ['guadalajara', 'gdl'],
    costMxn: 290,
  },
]
