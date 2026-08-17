import { calcAnyTrip, type AnyTripResult } from '../lib/calc'
import { RESERVE_PERCENT } from '../lib/constants'
import { POWERTRAIN_GROUP_LABELS, POWERTRAIN_GROUP_ORDER } from '../lib/format'
import type {
  AnyVehicle,
  AnyVersion,
  DriveStyle,
  FuelType,
  Route,
  TripMode,
  UnitSystem,
} from '../types'
import { FuelResultCard } from './FuelResultCard'
import { PhevResultCard } from './PhevResultCard'
import { PowertrainBadge } from './PowertrainBadge'
import { ResultCard } from './ResultCard'

export type SlotSelection = {
  vehicleId: string
  versionId: string
}

type VehicleSlotProps = {
  slotIndex: number
  vehicles: AnyVehicle[]
  selection: SlotSelection
  onChange: (next: SlotSelection) => void
  route: Route | null
  mode: TripMode
  driveStyle: DriveStyle
  pricePerKWh: number
  pricePerLiter: number
  unitSystem: UnitSystem
}

/** `AnyVersion`'s variants aren't tagged; distinguish by their unique fields. */
function versionSubtitle(version: AnyVersion): string {
  if ('electricRangeKmOfficial' in version) {
    return `${version.name} · ${version.electricRangeKmOfficial} km eléctricos`
  }
  if ('consumptionKWhPer100' in version) {
    return `${version.name} · ${version.batteryKWh} kWh · ${version.rangeKmOfficial} km`
  }
  return `${version.name} · ${version.tankLiters} L · ${version.rangeKmOfficial} km`
}

function calcResultForVehicle(
  vehicle: AnyVehicle,
  versionId: string,
  route: Route,
  mode: TripMode,
  driveStyle: DriveStyle,
  pricePerKWh: number,
  pricePerLiter: number,
): AnyTripResult | null {
  switch (vehicle.type) {
    case 'BEV': {
      const version = vehicle.versions.find((v) => v.id === versionId)
      if (!version) return null
      return calcAnyTrip({
        vehicleType: 'BEV',
        distanceKm: route.distanceKm,
        version,
        driveStyle,
        pricePerKWh,
        reservePercent: RESERVE_PERCENT,
        mode,
        driveHoursOneWay: route.driveHoursOneWay,
        elevationGainM: route.elevationGainM,
        elevationLossM: route.elevationLossM,
      })
    }
    case 'ICE':
    case 'HEV': {
      const version = vehicle.versions.find((v) => v.id === versionId)
      if (!version) return null
      return calcAnyTrip({
        vehicleType: vehicle.type,
        distanceKm: route.distanceKm,
        version,
        driveStyle,
        pricePerLiter,
        mode,
        driveHoursOneWay: route.driveHoursOneWay,
        elevationGainM: route.elevationGainM,
        elevationLossM: route.elevationLossM,
      })
    }
    case 'PHEV': {
      const version = vehicle.versions.find((v) => v.id === versionId)
      if (!version) return null
      return calcAnyTrip({
        vehicleType: 'PHEV',
        distanceKm: route.distanceKm,
        version,
        driveStyle,
        pricePerKWh,
        pricePerLiter,
        mode,
        driveHoursOneWay: route.driveHoursOneWay,
        elevationGainM: route.elevationGainM,
        elevationLossM: route.elevationLossM,
      })
    }
  }
}

function versionFuel(version: AnyVersion | null): FuelType | undefined {
  return version && 'fuel' in version ? version.fuel : undefined
}

function vehiclesByPowertrain(vehicles: AnyVehicle[]) {
  return POWERTRAIN_GROUP_ORDER.map((type) => ({
    type,
    label: POWERTRAIN_GROUP_LABELS[type],
    items: vehicles.filter((vehicle) => vehicle.type === type),
  })).filter((group) => group.items.length > 0)
}

function renderResultCard(
  result: AnyTripResult,
  mode: TripMode,
  unitSystem: UnitSystem,
  route: Route,
) {
  const routeProps = {
    avgSpeedLimitKmh: route.avgSpeedLimitKmh,
    avgTravelSpeedKmh: route.avgTravelSpeedKmh,
    elevationGainM: route.elevationGainM,
    elevationLossM: route.elevationLossM,
  }
  switch (result.vehicleType) {
    case 'BEV':
      return (
        <ResultCard
          result={result}
          mode={mode}
          unitSystem={unitSystem}
          {...routeProps}
        />
      )
    case 'ICE':
    case 'HEV':
      return (
        <FuelResultCard
          result={result}
          mode={mode}
          unitSystem={unitSystem}
          {...routeProps}
        />
      )
    case 'PHEV':
      return (
        <PhevResultCard
          result={result}
          mode={mode}
          unitSystem={unitSystem}
          {...routeProps}
        />
      )
  }
}

export function VehicleSlot({
  slotIndex,
  vehicles,
  selection,
  onChange,
  route,
  mode,
  driveStyle,
  pricePerKWh,
  pricePerLiter,
  unitSystem,
}: VehicleSlotProps) {
  const vehicle: AnyVehicle | null =
    vehicles.find((v) => v.id === selection.vehicleId) ?? null
  const version: AnyVersion | null =
    vehicle?.versions.find((v) => v.id === selection.versionId) ?? null

  const result =
    route && vehicle && version
      ? calcResultForVehicle(
          vehicle,
          selection.versionId,
          route,
          mode,
          driveStyle,
          pricePerKWh,
          pricePerLiter,
        )
      : null

  return (
    <section className="vehicle-slot" aria-label={`Vehículo ${slotIndex + 1}`}>
      <header className="slot-header">
        <span className="slot-index">Vehículo {slotIndex + 1}</span>
        {vehicle ? (
          <PowertrainBadge type={vehicle.type} fuel={versionFuel(version)} />
        ) : null}
      </header>

      <label className="field">
        <span>Modelo</span>
        <select
          value={selection.vehicleId}
          onChange={(e) => {
            const nextVehicle = vehicles.find((v) => v.id === e.target.value)
            onChange({
              vehicleId: e.target.value,
              versionId: nextVehicle?.versions[0]?.id ?? '',
            })
          }}
        >
          <option value="">Elegir modelo…</option>
          {vehiclesByPowertrain(vehicles).map((group) => (
            <optgroup key={group.type} label={group.label}>
              {group.items.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Versión</span>
        <select
          value={selection.versionId}
          disabled={!vehicle}
          onChange={(e) =>
            onChange({
              vehicleId: selection.vehicleId,
              versionId: e.target.value,
            })
          }
        >
          <option value="">
            {vehicle ? 'Elegir versión…' : 'Primero elige modelo'}
          </option>
          {vehicle?.versions.map((v) => (
            <option key={v.id} value={v.id}>
              {versionSubtitle(v)}
            </option>
          ))}
        </select>
      </label>

      {!route ? (
        <p className="slot-hint">Selecciona una ruta para ver resultados.</p>
      ) : !vehicle || !version ? (
        <p className="slot-hint">Elige modelo y versión.</p>
      ) : result && route ? (
        renderResultCard(result, mode, unitSystem, route)
      ) : null}
    </section>
  )
}
