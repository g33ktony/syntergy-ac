import { calcTrip } from '../lib/calc'
import { RESERVE_PERCENT } from '../lib/constants'
import type {
  DriveStyle,
  Route,
  TripMode,
  Vehicle,
  VehicleVersion,
} from '../types'
import { ResultCard } from './ResultCard'

export type SlotSelection = {
  vehicleId: string
  versionId: string
}

type VehicleSlotProps = {
  slotIndex: number
  vehicles: Vehicle[]
  selection: SlotSelection
  onChange: (next: SlotSelection) => void
  route: Route | null
  mode: TripMode
  driveStyle: DriveStyle
  pricePerKWh: number
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
}: VehicleSlotProps) {
  const vehicle =
    vehicles.find((v) => v.id === selection.vehicleId) ?? null
  const version: VehicleVersion | null =
    vehicle?.versions.find((v) => v.id === selection.versionId) ?? null

  const result =
    route && version
      ? calcTrip({
          distanceKm: route.distanceKm,
          version,
          driveStyle,
          pricePerKWh,
          reservePercent: RESERVE_PERCENT,
          mode,
          driveHoursOneWay: route.driveHoursOneWay,
        })
      : null

  return (
    <section className="vehicle-slot" aria-label={`Vehículo ${slotIndex + 1}`}>
      <header className="slot-header">
        <span className="slot-index">Vehículo {slotIndex + 1}</span>
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
              {v.name} · {v.batteryKWh} kWh · {v.rangeKmOfficial} km
            </option>
          ))}
        </select>
      </label>

      {!route ? (
        <p className="slot-hint">Selecciona una ruta para ver resultados.</p>
      ) : !version ? (
        <p className="slot-hint">Elige modelo y versión.</p>
      ) : result ? (
        <ResultCard result={result} mode={mode} />
      ) : null}
    </section>
  )
}
