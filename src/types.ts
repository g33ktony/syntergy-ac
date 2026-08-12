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

export type Route = {
  id: string
  from: string
  to: string
  distanceKm: number
  source: 'preset' | 'custom' | 'google'
  driveHoursOneWay?: number
}

export type DriveStyle = 'eco' | 'normal' | 'aggressive'

export type TripMode = 'oneWay' | 'roundTrip'

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
