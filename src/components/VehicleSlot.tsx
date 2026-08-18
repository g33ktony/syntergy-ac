import { useEffect, useRef, useState } from 'react'
import { calcAnyTrip, type AnyTripResult } from '../lib/calc'
import {
  CHARGE_TARGET_PERCENT,
  DEFAULT_HIGHWAY_KMH,
  MAX_CHARGE_STOPS,
  RESERVE_PERCENT,
} from '../lib/constants'
import { bevKWhPerKm, lookupTripViaStopsFromConfig } from '../lib/charge-legs'
import {
  arrivalSocOnPath,
  inboundPlanGeometry,
  planChargeStops,
  poisForInboundPlan,
  type ChargePlan,
} from '../lib/charge-plan'
import { alongKmOnPathScaled } from '../lib/elevation-profile'
import { POWERTRAIN_GROUP_LABELS, POWERTRAIN_GROUP_ORDER } from '../lib/format'
import { tollCostForTripMode } from '../lib/tolls'
import type { SlotSelection } from '../lib/slots'
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

type ChargeMode = 'none' | 'withStops'

type VehicleSlotProps = {
  slotIndex: number
  vehicles: AnyVehicle[]
  selection: SlotSelection
  onChange: (next: SlotSelection) => void
  onRemove?: () => void
  route: Route | null
  mode: TripMode
  driveStyle: DriveStyle
  pricePerKWh: number
  pricePerLiter: number
  unitSystem: UnitSystem
  averageSpeedKmh?: number
  onFocus?: () => void
  onSlotRouteChange?: (route: Route | null) => void
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
  phevRechargeAtDestination: boolean,
  averageSpeedKmh: number,
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
        elevationGainM: route.outbound?.elevationGainM ?? route.elevationGainM,
        elevationLossM: route.outbound?.elevationLossM ?? route.elevationLossM,
        returnElevationGainM: route.inbound?.elevationGainM,
        returnElevationLossM: route.inbound?.elevationLossM,
        returnDistanceKm: route.inbound?.distanceKm,
        returnDriveHoursOneWay: route.inbound?.driveHours,
        tollCostMxn: tollCostForTripMode(route.tolls?.costMxn, mode),
        averageSpeedKmh,
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
        elevationGainM: route.outbound?.elevationGainM ?? route.elevationGainM,
        elevationLossM: route.outbound?.elevationLossM ?? route.elevationLossM,
        returnElevationGainM: route.inbound?.elevationGainM,
        returnElevationLossM: route.inbound?.elevationLossM,
        returnDistanceKm: route.inbound?.distanceKm,
        returnDriveHoursOneWay: route.inbound?.driveHours,
        tollCostMxn: tollCostForTripMode(route.tolls?.costMxn, mode),
        averageSpeedKmh,
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
        elevationGainM: route.outbound?.elevationGainM ?? route.elevationGainM,
        elevationLossM: route.outbound?.elevationLossM ?? route.elevationLossM,
        returnElevationGainM: route.inbound?.elevationGainM,
        returnElevationLossM: route.inbound?.elevationLossM,
        returnDistanceKm: route.inbound?.distanceKm,
        returnDriveHoursOneWay: route.inbound?.driveHours,
        tollCostMxn: tollCostForTripMode(route.tolls?.costMxn, mode),
        averageSpeedKmh,
        rechargeAtDestination: phevRechargeAtDestination,
      })
    }
  }
}

function versionFuel(version: AnyVersion | null): FuelType | undefined {
  return version && 'fuel' in version ? version.fuel : undefined
}

function chargePlanFailureMessage(reason: ChargePlan['reason']) {
  return reason === 'max-stops'
    ? 'No se pudo completar el viaje con el máximo de paradas.'
    : 'No se encontró un cargador compatible en la ruta.'
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
  cruiseSpeedKmh: number,
) {
  const routeProps = {
    cruiseSpeedKmh,
    avgSpeedLimitKmh: route.avgSpeedLimitKmh,
    avgTravelSpeedKmh: route.avgTravelSpeedKmh,
    elevationGainM: route.outbound?.elevationGainM ?? route.elevationGainM,
    elevationLossM: route.outbound?.elevationLossM ?? route.elevationLossM,
    returnElevationGainM: route.inbound?.elevationGainM,
    returnElevationLossM: route.inbound?.elevationLossM,
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
  onRemove,
  route,
  mode,
  driveStyle,
  pricePerKWh,
  pricePerLiter,
  unitSystem,
  averageSpeedKmh = DEFAULT_HIGHWAY_KMH,
  onFocus,
  onSlotRouteChange,
}: VehicleSlotProps) {
  const [phevRecharge, setPhevRecharge] = useState(false)
  const [chargeMode, setChargeMode] = useState<ChargeMode>('none')
  const [viaStopsRoute, setViaStopsRoute] = useState<Route | null>(null)
  const [chargePlanError, setChargePlanError] = useState<string | null>(null)
  const [chargePlanBusy, setChargePlanBusy] = useState(false)
  const onSlotRouteChangeRef = useRef(onSlotRouteChange)
  onSlotRouteChangeRef.current = onSlotRouteChange

  const vehicle: AnyVehicle | null =
    vehicles.find((v) => v.id === selection.vehicleId) ?? null
  const version: AnyVersion | null =
    vehicle?.versions.find((v) => v.id === selection.versionId) ?? null

  const baseResult =
    route && vehicle && version
      ? calcResultForVehicle(
          vehicle,
          selection.versionId,
          route,
          mode,
          driveStyle,
          pricePerKWh,
          pricePerLiter,
          phevRecharge,
          averageSpeedKmh,
        )
      : null

  const showChargeStopsToggle =
    baseResult != null &&
    baseResult.vehicleType === 'BEV' &&
    !baseResult.reachesWithReserve

  useEffect(() => {
    if (!showChargeStopsToggle) {
      setChargeMode('none')
    }
  }, [showChargeStopsToggle])

  useEffect(() => {
    let cancelled = false

    const clearChargeRoute = () => {
      setViaStopsRoute(null)
      onSlotRouteChangeRef.current?.(null)
    }

    if (chargeMode !== 'withStops' || !route || vehicle?.type !== 'BEV' || !version) {
      clearChargeRoute()
      setChargePlanError(null)
      setChargePlanBusy(false)
      return
    }
    const bevVersion = version as Extract<AnyVersion, { batteryKWh: number; connector: string }>
    const origin = route.origin ?? route.from
    const dest = route.dest ?? route.to
    const path = route.outbound?.path
    if (!path || path.length === 0) {
      setChargePlanError('La ruta no tiene geometría; no se pueden planear cargas.')
      clearChargeRoute()
      setChargePlanBusy(false)
      return
    }

    setChargePlanBusy(true)
    setChargePlanError(null)

    const kWhPerKm = bevKWhPerKm({
      consumptionKWhPer100: bevVersion.consumptionKWhPer100,
      driveStyle,
      averageSpeedKmh,
    })

    const planInput = {
      pois: route.chargingPois ?? [],
      batteryKWh: bevVersion.batteryKWh,
      kWhPerKm,
      reservePercent: RESERVE_PERCENT,
      chargeToPercent: CHARGE_TARGET_PERCENT,
      maxStops: MAX_CHARGE_STOPS,
      connector: bevVersion.connector,
    }

    const outboundPlan = planChargeStops({
      ...planInput,
      path,
      pathLengthKm: route.distanceKm,
      startSocPercent: 100,
    })

    if (!outboundPlan.feasible) {
      setChargePlanBusy(false)
      setChargePlanError(chargePlanFailureMessage(outboundPlan.reason))
      clearChargeRoute()
      return
    }

    void (async () => {
      const outboundStops = outboundPlan.stops.map((s) => s.poi)
      const outboundStitched = await lookupTripViaStopsFromConfig({
        origin,
        dest,
        stops: outboundStops,
        roundTrip: false,
        preference: 'both',
      })
      if (cancelled) return
      if (!outboundStitched) {
        setChargePlanBusy(false)
        setChargePlanError('No se pudo trazar la ruta con paradas de carga. Se usa la ruta base.')
        clearChargeRoute()
        return
      }

      let stitched = outboundStitched
      if (mode === 'roundTrip') {
        const lastStop = outboundPlan.stops.at(-1)
        const stitchedPath = outboundStitched.outbound?.path
        const lastChargeAlongKm =
          lastStop && stitchedPath && stitchedPath.length >= 2
            ? alongKmOnPathScaled(stitchedPath, lastStop.poi, outboundStitched.distanceKm)
            : lastStop?.alongKm
        const inboundStartSoc = arrivalSocOnPath({
          pathLengthKm: outboundStitched.distanceKm,
          batteryKWh: bevVersion.batteryKWh,
          kWhPerKm,
          startSocPercent: 100,
          chargeToPercent: CHARGE_TARGET_PERCENT,
          lastChargeAlongKm,
        })
        const inboundGeom = inboundPlanGeometry(path, route.distanceKm, route.inbound)
        const inboundPlan = planChargeStops({
          ...planInput,
          path: inboundGeom.path,
          pathLengthKm: inboundGeom.pathLengthKm,
          pois: poisForInboundPlan(planInput.pois, route.distanceKm, inboundGeom),
          startSocPercent: inboundStartSoc,
        })
        if (!inboundPlan.feasible) {
          setChargePlanBusy(false)
          setChargePlanError(chargePlanFailureMessage(inboundPlan.reason))
          clearChargeRoute()
          return
        }
        const roundTrip = await lookupTripViaStopsFromConfig({
          origin,
          dest,
          stops: outboundStops,
          inboundStops: inboundPlan.stops.map((s) => s.poi),
          outboundRoute: outboundStitched,
          roundTrip: true,
          preference: 'both',
        })
        if (cancelled) return
        if (!roundTrip) {
          setChargePlanBusy(false)
          setChargePlanError('No se pudo trazar la ruta con paradas de carga. Se usa la ruta base.')
          clearChargeRoute()
          return
        }
        stitched = roundTrip
      }

      if (cancelled) return
      setChargePlanBusy(false)
      setViaStopsRoute(stitched)
      onSlotRouteChangeRef.current?.(stitched)
    })()

    return () => {
      cancelled = true
    }
  }, [chargeMode, route, vehicle, version, driveStyle, averageSpeedKmh, mode])

  const activeRoute = chargeMode === 'withStops' && viaStopsRoute ? viaStopsRoute : route

  const result =
    activeRoute && vehicle && version
      ? calcResultForVehicle(
          vehicle,
          selection.versionId,
          activeRoute,
          mode,
          driveStyle,
          pricePerKWh,
          pricePerLiter,
          phevRecharge,
          averageSpeedKmh,
        )
      : baseResult

  const showPhevRechargeToggle =
    vehicle?.type === 'PHEV' && mode === 'roundTrip'

  return (
    <section
      className="vehicle-slot"
      aria-label={`Vehículo ${slotIndex + 1}`}
      onFocus={onFocus}
      onClick={onFocus}
    >
      <header className="slot-header">
        <span className="slot-index">Vehículo {slotIndex + 1}</span>
        {onRemove ? (
          <button
            type="button"
            className="btn-text"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            onFocus={(e) => e.stopPropagation()}
          >
            Quitar
          </button>
        ) : null}
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
              id: selection.id,
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
              id: selection.id,
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

      {showPhevRechargeToggle ? (
        <fieldset className="mode-toggle">
          <legend>Recarga en destino</legend>
          <div
            className="segmented"
            role="group"
            aria-label="Recarga en destino (PHEV, redondo)"
          >
            <button
              type="button"
              className={!phevRecharge ? 'seg active' : 'seg'}
              aria-pressed={!phevRecharge}
              onClick={() => setPhevRecharge(false)}
            >
              Sin recarga
            </button>
            <button
              type="button"
              className={phevRecharge ? 'seg active' : 'seg'}
              aria-pressed={phevRecharge}
              onClick={() => setPhevRecharge(true)}
            >
              Con recarga
            </button>
          </div>
        </fieldset>
      ) : null}

      {vehicle?.type === 'BEV' ? (
        showChargeStopsToggle ? (
          <fieldset className="mode-toggle">
            <legend>Cargas en ruta</legend>
            <div className="segmented" role="group" aria-label="Cargas en ruta">
              <button
                type="button"
                className={chargeMode === 'none' ? 'seg active' : 'seg'}
                aria-pressed={chargeMode === 'none'}
                onClick={() => setChargeMode('none')}
              >
                Sin cargas
              </button>
              <button
                type="button"
                className={chargeMode === 'withStops' ? 'seg active' : 'seg'}
                aria-pressed={chargeMode === 'withStops'}
                onClick={() => setChargeMode('withStops')}
              >
                {chargePlanBusy ? 'Calculando…' : 'Con cargas'}
              </button>
            </div>
            {chargePlanError ? (
              <p className="form-error" role="alert">
                {chargePlanError}
              </p>
            ) : null}
          </fieldset>
        ) : (
          <p className="form-hint">No hace falta cargar en ruta.</p>
        )
      ) : null}

      {!activeRoute ? (
        <p className="slot-hint">Selecciona una ruta para ver resultados.</p>
      ) : !vehicle || !version ? (
        <p className="slot-hint">Elige modelo y versión.</p>
      ) : result && activeRoute ? (
        renderResultCard(result, mode, unitSystem, activeRoute, averageSpeedKmh)
      ) : null}
    </section>
  )
}
