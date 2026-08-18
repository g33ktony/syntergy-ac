import type { ChargingPoi, LatLng } from '../types'
import { alongKmOnPathScaled, pathLengthKm as geometryLengthKm } from './elevation-profile'

export function poiMatchesConnector(
  connector: 'CCS1' | 'GB/T' | 'NACS' | 'other',
  titles: string[] | undefined,
): boolean {
  if (connector === 'other') return true
  const blob = (titles ?? []).join(' ').toLowerCase()
  if (connector === 'CCS1') return blob.includes('ccs') || blob.includes('combo')
  if (connector === 'GB/T') return blob.includes('gb/t') || blob.includes('gbt')
  return blob.includes('nacs') || blob.includes('tesla')
}

export type ChargePlanStop = { poi: ChargingPoi; alongKm: number }

export type ChargePlan = {
  feasible: boolean
  stops: ChargePlanStop[]
  reason?: 'already-feasible' | 'no-poi' | 'max-stops'
  /** SoC at the end of this path after the planned stops. */
  arrivalSocPercent: number
}

export type ChargePlanInput = {
  path: LatLng[]
  pathLengthKm: number
  pois: ChargingPoi[]
  batteryKWh: number
  kWhPerKm: number
  reservePercent: number
  startSocPercent: number
  chargeToPercent: number
  maxStops: number
  connector: 'CCS1' | 'GB/T' | 'NACS' | 'other'
}

export type InboundPlanGeometry = {
  path: LatLng[]
  pathLengthKm: number
  fromInboundGeometry: boolean
}

/** Path + length the inbound planner should use; never mix outbound alongKm with a different length. */
export function inboundPlanGeometry(
  outboundPath: LatLng[],
  outboundLengthKm: number,
  inbound?: { path?: LatLng[]; distanceKm?: number },
): InboundPlanGeometry {
  const fromInboundGeometry = Boolean(inbound?.path && inbound.path.length > 0)
  const path = fromInboundGeometry ? inbound!.path! : [...outboundPath].reverse()
  const pathLengthKm =
    inbound?.distanceKm ?? (fromInboundGeometry ? geometryLengthKm(path) : outboundLengthKm)
  return { path, pathLengthKm, fromInboundGeometry }
}

/** Place POIs on the inbound path in the same units as `inbound.pathLengthKm`. */
export function poisForInboundPlan(
  pois: ChargingPoi[],
  outboundLengthKm: number,
  inbound: InboundPlanGeometry,
): ChargingPoi[] {
  if (inbound.fromInboundGeometry) {
    return pois.map((poi) => ({
      ...poi,
      alongKm: alongKmOnPathScaled(inbound.path, poi, inbound.pathLengthKm),
    }))
  }
  if (outboundLengthKm <= 0) {
    return pois.map((poi) =>
      poi.alongKm === undefined ? poi : { ...poi, alongKm: inbound.pathLengthKm },
    )
  }
  return pois.map((poi) =>
    poi.alongKm === undefined
      ? poi
      : { ...poi, alongKm: inbound.pathLengthKm * (1 - poi.alongKm / outboundLengthKm) },
  )
}

/** Arrival SoC after driving `pathLengthKm`, charging to `chargeToPercent` at `lastChargeAlongKm` if set. */
export function arrivalSocOnPath(input: {
  pathLengthKm: number
  batteryKWh: number
  kWhPerKm: number
  startSocPercent: number
  chargeToPercent: number
  lastChargeAlongKm?: number
}): number {
  const charged = input.lastChargeAlongKm != null
  const soc = charged ? input.chargeToPercent : input.startSocPercent
  const fromKm = input.lastChargeAlongKm ?? 0
  const remainingKm = Math.max(0, input.pathLengthKm - fromKm)
  return soc - (100 * (remainingKm * input.kWhPerKm)) / input.batteryKWh
}

export function planChargeStops(input: ChargePlanInput): ChargePlan {
  const {
    pathLengthKm,
    pois,
    batteryKWh,
    kWhPerKm,
    reservePercent,
    startSocPercent,
    chargeToPercent,
    maxStops,
    connector,
  } = input

  const candidates = pois.filter((poi) => poiMatchesConnector(connector, poi.connectors))
  const stops: ChargePlanStop[] = []
  const usedIds = new Set<string>()

  let soc = startSocPercent
  let coveredKm = 0

  while (true) {
    const remainingKm = pathLengthKm - coveredKm
    const arrivalSoc = soc - (100 * (remainingKm * kWhPerKm)) / batteryKWh

    if (arrivalSoc >= reservePercent) {
      return {
        feasible: true,
        stops,
        reason: stops.length === 0 ? 'already-feasible' : undefined,
        arrivalSocPercent: arrivalSoc,
      }
    }

    if (stops.length >= maxStops) {
      return { feasible: false, stops, reason: 'max-stops', arrivalSocPercent: arrivalSoc }
    }

    const usableKWh = (batteryKWh * (soc - reservePercent)) / 100
    const rangeKm = usableKWh / kWhPerKm
    const mustStopKm = coveredKm + rangeKm
    const windowStart = mustStopKm - 60

    const inWindow = candidates.filter(
      (poi) =>
        !usedIds.has(poi.id) &&
        poi.alongKm !== undefined &&
        poi.alongKm >= windowStart &&
        poi.alongKm <= mustStopKm &&
        poi.alongKm > coveredKm,
    )

    if (inWindow.length === 0) {
      return { feasible: false, stops, reason: 'no-poi', arrivalSocPercent: arrivalSoc }
    }

    const chosen = inWindow.reduce((best, poi) =>
      Math.abs((poi.alongKm as number) - mustStopKm) < Math.abs((best.alongKm as number) - mustStopKm)
        ? poi
        : best,
    )

    stops.push({ poi: chosen, alongKm: chosen.alongKm as number })
    usedIds.add(chosen.id)
    soc = chargeToPercent
    coveredKm = chosen.alongKm as number
  }
}
