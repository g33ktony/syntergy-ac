import { calcAnyTrip, type AnyTripResult } from '../lib/calc'
import { RESERVE_PERCENT } from '../lib/constants'
import type {
  AnyVehicle,
  AnyVersion,
  DriveStyle,
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
      })
    }
  }
}

function renderResultCard(
  vehicle: AnyVehicle,
  result: AnyTripResult,
  mode: TripMode,
  unitSystem: UnitSystem,
) {
  switch (vehicle.type) {
    case 'BEV':
      return (
        <ResultCard result={result as never} mode={mode} unitSystem={unitSystem} />
      )
    case 'ICE':
    case 'HEV':
      return (
        <FuelResultCard
          result={result as never}
          mode={mode}
          unitSystem={unitSystem}
        />
      )
    case 'PHEV':
      return (
        <PhevResultCard
          result={result as never}
          mode={mode}
          unitSystem={unitSystem}
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
        {vehicle ? <PowertrainBadge type={vehicle.type} /> : null}
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
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.brand} {v.model}
            </option>
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
      ) : result ? (
        renderResultCard(vehicle, result, mode, unitSystem)
      ) : null}
    </section>
  )
}
