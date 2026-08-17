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
 * Approximate auto (cars, "clase 1") one-way caseta totals for common MX
 * corridors. Recalibrated August 2026 against CAPUFE/concessionaire figures
 * published after the April 13, 2026 nationwide toll increase — still
 * rounded estimates, not live tariffs, and not authoritative for trip
 * planning. Where sources disagreed (aggregators frequently report
 * different partial-segment sums for the same corridor), the figure below
 * favors the fuller "total route" quote or a per-km rate consistent with
 * the corridors that did have a solid source, documented per entry.
 */
export const MX_TOLL_CORRIDORS: MxTollCorridor[] = [
  {
    id: 'cdmx-queretaro',
    name: 'México–Querétaro (57D)',
    aliasesA: ['cdmx', 'ciudad de mexico', 'mexico', 'cdmx, mx'],
    aliasesB: ['queretaro', 'querétaro'],
    // 4 casetas, $385 total (post 13-abr-2026 increase).
    costMxn: 385,
    bbox: [19.3, -100.6, 20.8, -98.9],
  },
  {
    id: 'cdmx-puebla',
    name: 'México–Puebla (150D)',
    aliasesA: ['cdmx', 'ciudad de mexico', 'mexico'],
    aliasesB: ['puebla'],
    // 6 casetas, $460 total (post 13-abr-2026 increase).
    costMxn: 460,
    bbox: [18.9, -99.3, 19.5, -98.1],
  },
  {
    id: 'cdmx-toluca',
    name: 'México–Toluca',
    aliasesA: ['cdmx', 'ciudad de mexico', 'mexico'],
    aliasesB: ['toluca'],
    // Main caseta (La Marquesa) $116 (post 13-abr-2026 increase).
    costMxn: 116,
  },
  {
    id: 'cdmx-cuernavaca',
    name: 'México–Cuernavaca (95D)',
    aliasesA: ['cdmx', 'ciudad de mexico', 'mexico'],
    aliasesB: ['cuernavaca'],
    // Sources split $108–$156 for the 2-caseta total; midpoint estimate.
    costMxn: 150,
  },
  {
    id: 'cdmx-morelia',
    name: 'México–Morelia',
    aliasesA: ['cdmx', 'ciudad de mexico', 'mexico'],
    aliasesB: ['morelia'],
    // No single published "total" found; estimated from comparable
    // Toluca/Maravatío-area segment tariffs along the same corridor.
    costMxn: 420,
  },
  {
    id: 'gdl-cdmx',
    name: 'Guadalajara–México',
    aliasesA: ['guadalajara', 'gdl'],
    aliasesB: ['cdmx', 'ciudad de mexico', 'mexico'],
    // No single published total found; ~5% bump on prior estimate in line
    // with the April 2026 nationwide increase.
    costMxn: 860,
  },
  {
    id: 'gdl-vallarta',
    name: 'Guadalajara–Puerto Vallarta',
    aliasesA: ['guadalajara', 'gdl'],
    aliasesB: ['puerto vallarta', 'vallarta'],
    // Reported round trip ~$2,820 (one-way ≈ $1,410); previous estimate
    // ($420) was badly stale — this corridor is one of the priciest in MX.
    costMxn: 1400,
    bbox: [20.3, -105.4, 21.0, -103.2],
  },
  {
    id: 'mty-cdmx',
    name: 'Monterrey–México',
    aliasesA: ['monterrey', 'mty'],
    aliasesB: ['cdmx', 'ciudad de mexico', 'mexico'],
    // Sources conflicted ($475 partial vs. per-km rate from verified
    // corridors ~$1.8/km × ~900 km ≈ $1,600); used the per-km estimate as
    // more consistent with every other verified corridor on this list.
    costMxn: 1550,
  },
  {
    id: 'mty-saltillo',
    name: 'Monterrey–Saltillo',
    aliasesA: ['monterrey', 'mty'],
    aliasesB: ['saltillo'],
    // Aggregator "total" ($52) undercounts vs. its own per-segment
    // breakdown (~$143); used a per-km-consistent middle estimate.
    costMxn: 90,
  },
  {
    id: 'leon-gdl',
    name: 'León–Guadalajara',
    aliasesA: ['leon', 'león'],
    aliasesB: ['guadalajara', 'gdl'],
    // Sources split $448–$651 for the 3-caseta, ~220 km total; used the
    // figure closer to per-km rate from verified corridors.
    costMxn: 440,
  },
]
