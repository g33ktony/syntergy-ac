export type Powertrain = 'BEV' | 'HEV' | 'PHEV' | 'ICE'

export type VehicleVersion = {
  id: string
  name: string
  batteryKWh: number
  rangeKmOfficial: number
  consumptionKWhPer100: number
  powerKW?: number
  connector: 'CCS1' | 'GB/T' | 'NACS' | 'other'
}

export type Vehicle = {
  id: string
  brand: string
  model: string
  type: Powertrain
  versions: VehicleVersion[]
}

// ---------------------------------------------------------------------------
// Route enrichment (Lane B) — shared contract from
// docs/superpowers/specs/2026-08-12-route-enrichment-abrp-design.md §4.
// Additive: existing `preset`/`custom`/`google` routes keep working with
// every enrichment field left undefined.
// ---------------------------------------------------------------------------

export type RouteSource = 'preset' | 'custom' | 'google' | 'abrp' | 'merged'

/** Per-field provenance, so the UI can show "de dónde salió este número". */
export type FieldSource =
  | 'preset'
  | 'google'
  | 'abrp'
  | 'derived'
  | 'merged'
  | 'manual'

export type RouteEnrichmentFields = {
  /** distanceKm / driveHours when a provider gives duration. */
  avgTravelSpeedKmh?: number
  /** Length-weighted average of posted speed limits along the route. */
  avgSpeedLimitKmh?: number
  elevationGainM?: number
  elevationLossM?: number
  /** Route-sourced $/kWh hint. Never overwrites the manual price by itself. */
  suggestedPricePerKWh?: number
}

export type FieldSources = Partial<
  Record<keyof RouteEnrichmentFields, FieldSource>
>

export type Route = {
  id: string
  from: string
  to: string
  distanceKm: number
  source: RouteSource
  driveHoursOneWay?: number
} & RouteEnrichmentFields & {
    fieldSources?: FieldSources
  }

/** User's preferred route data source(s) — persisted like the Google key. */
export type RouteSourcePreference = 'google' | 'abrp' | 'both'

export type DriveStyle = 'eco' | 'normal' | 'aggressive'

export type TripMode = 'oneWay' | 'roundTrip'

/** Display preference only — calculations stay metric/SI. */
export type UnitSystem = 'metric' | 'imperial'

export type SpeedDisplayKind = 'limits' | 'estimated' | 'fallback'

export type TripInput = {
  distanceKm: number
  version: VehicleVersion
  driveStyle: DriveStyle
  pricePerKWh: number
  reservePercent: number
  mode: TripMode
  driveHoursOneWay?: number
}

export type TripResultBase = {
  distanceKm: number
  driveHours: number
  energyKWh: number
  costMxn: number
  arrivalSocPercent: number
  reachesWithReserve: boolean
  chargeStopsEstimate: number
  chargeStopsRoundTripEstimate?: number
  connector: string
}

export type TripResult = TripResultBase & {
  oneWay?: TripResultBase
}

// ---------------------------------------------------------------------------
// Phase 2 — multi-fuel (ICE / HEV / PHEV) extensions.
// Purely additive: nothing above this line changes shape, so Phase 1's BEV
// flow (Vehicle/VehicleVersion/TripInput/TripResult, calcTrip, VehicleSlot,
// ResultCard) keeps compiling untouched.
// ---------------------------------------------------------------------------

/** BEV version, aliased for symmetry with the new fuel-based version types. */
export type BevVersion = VehicleVersion

export type FuelType = 'gasolina' | 'diesel'

export type IceVersion = {
  id: string
  name: string
  tankLiters: number
  rangeKmOfficial: number
  consumptionLPer100: number // combined claim
  fuel: FuelType
}

/** Same liquid-fuel metrics as ICE; kept distinct for readability/UI badges. */
export type HevVersion = IceVersion

export type PhevVersion = {
  id: string
  name: string
  batteryKWh: number
  electricRangeKmOfficial: number
  tankLiters: number
  consumptionLPer100ChargeSustaining: number
  fuel: FuelType
  connector?: 'CCS1' | 'GB/T' | 'NACS' | 'other'
}

export type BevVehicle = {
  id: string
  brand: string
  model: string
  type: 'BEV'
  versions: BevVersion[]
}

export type IceVehicle = {
  id: string
  brand: string
  model: string
  type: 'ICE'
  versions: IceVersion[]
}

export type HevVehicle = {
  id: string
  brand: string
  model: string
  type: 'HEV'
  versions: HevVersion[]
}

export type PhevVehicle = {
  id: string
  brand: string
  model: string
  type: 'PHEV'
  versions: PhevVersion[]
}

/** Discriminated union across all powertrains (superset of Phase 1 `Vehicle`). */
export type AnyVehicle = BevVehicle | IceVehicle | HevVehicle | PhevVehicle
export type AnyVersion = BevVersion | IceVersion | HevVersion | PhevVersion

export type FuelTripInput = {
  distanceKm: number
  version: IceVersion | HevVersion
  driveStyle: DriveStyle
  pricePerLiter: number
  mode: TripMode
  driveHoursOneWay?: number
}

export type FuelTripResultBase = {
  distanceKm: number
  driveHours: number
  litersUsed: number
  costMxn: number
  arrivalFuelPercent: number
  reachesWithoutStop: boolean
  fuelStopsEstimate: number
  fuel: FuelType
}

export type FuelTripResult = FuelTripResultBase & {
  oneWay?: FuelTripResultBase
}

export type PhevTripInput = {
  distanceKm: number
  version: PhevVersion
  driveStyle: DriveStyle
  pricePerKWh: number
  pricePerLiter: number
  mode: TripMode
  driveHoursOneWay?: number
  /** Conservative default: no recharge at destination on round trips. */
  rechargeAtDestination?: boolean
}

export type PhevTripResultBase = {
  distanceKm: number
  driveHours: number
  electricKmUsed: number
  fuelKmUsed: number
  energyKWh: number
  litersUsed: number
  costMxn: number
  arrivalFuelPercent: number
  reachesWithoutStop: boolean
  fuelStopsEstimate: number
  usedElectricOnly: boolean
  fuel: FuelType
  /** Echo of the input flag; only meaningful on round-trip results. */
  rechargeAtDestination: boolean
}

export type PhevTripResult = PhevTripResultBase & {
  oneWay?: PhevTripResultBase
}

/** Shape every powertrain's result can be reduced to for side-by-side comparison. */
export type ComparisonRow = {
  vehicleId: string
  versionId: string
  type: Powertrain
  totalCostMxn: number
  costPerKm: number
  feasibleWithoutStop: boolean
  feasibilityReason: string
  driveHours: number
}
