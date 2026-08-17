import type {
  FieldSource,
  FieldSources,
  LatLng,
  Route,
  RouteEnrichmentFields,
  RouteLeg,
  RouteSource,
} from '../types'
import type { RouteProviderId as ProviderId } from './providers/types'

/**
 * Raw fields a single provider returned for one lookup.
 * Distance is required; geometry is opt-in for routing providers.
 */
export type ProviderEnrichment = RouteEnrichmentFields & {
  provider: ProviderId
  distanceKm: number
  driveHoursOneWay?: number
  origin?: LatLng
  dest?: LatLng
  outbound?: RouteLeg
  inbound?: RouteLeg
  likelyTolls?: boolean
  path?: LatLng[]
}

export type MergedRouteEnrichment = RouteEnrichmentFields & {
  distanceKm: number
  driveHoursOneWay?: number
  source: RouteSource
  fieldSources: FieldSources
  origin?: LatLng
  dest?: LatLng
  outbound?: RouteLeg
  inbound?: RouteLeg
  likelyTolls?: boolean
}

type NumericFieldKey = 'distanceKm' | 'driveHoursOneWay' | keyof RouteEnrichmentFields

const GEOMETRY_PRIORITY: ProviderId[] = ['google', 'ors', 'osm']

function mergeNumericField(
  values: Array<{ provider: ProviderId; value: number | undefined }>,
): { value: number | undefined; source: FieldSource | undefined } {
  const present = values.filter(
    (v): v is { provider: ProviderId; value: number } => v.value != null,
  )
  if (present.length === 0) return { value: undefined, source: undefined }
  if (present.length === 1) {
    return { value: present[0].value, source: present[0].provider }
  }
  const avg = present.reduce((sum, v) => sum + v.value, 0) / present.length
  return { value: avg, source: 'merged' }
}

function pluck(
  providers: ProviderEnrichment[],
  key: NumericFieldKey,
): Array<{ provider: ProviderId; value: number | undefined }> {
  return providers.map((p) => ({
    provider: p.provider,
    value: (p as unknown as Record<string, number | undefined>)[key],
  }))
}

function hasGeometry(p: ProviderEnrichment): boolean {
  return (p.outbound?.path.length ?? p.path?.length ?? 0) > 0
}

function pickGeometryOwner(
  providers: ProviderEnrichment[],
): ProviderEnrichment | undefined {
  for (const id of GEOMETRY_PRIORITY) {
    const match = providers.find((p) => p.provider === id && hasGeometry(p))
    if (match) return match
  }
  return providers.find(hasGeometry)
}

/**
 * Merge rules:
 * 1. Do not average polylines. Geometry + elevation come from the routing
 *    provider (Google > ORS > OSRM). ABRP only fills speed-limit / kWh hint gaps.
 * 2. If nobody has geometry, fall back to averaging numeric fields.
 * 3. No duration anywhere → don't invent avg travel speed or elevation.
 */
export function mergeRouteEnrichment(
  providers: ProviderEnrichment[],
): MergedRouteEnrichment {
  if (providers.length === 0) {
    throw new Error('mergeRouteEnrichment requires at least one provider result')
  }

  const fieldSources: FieldSources = {}
  const geometry = pickGeometryOwner(providers)
  const others = geometry
    ? providers.filter((p) => p !== geometry)
    : providers

  const distance = geometry
    ? { value: geometry.distanceKm, source: geometry.provider as FieldSource }
    : mergeNumericField(pluck(providers, 'distanceKm'))
  const duration = geometry
    ? {
        value: geometry.driveHoursOneWay,
        source: geometry.driveHoursOneWay != null
          ? (geometry.provider as FieldSource)
          : undefined,
      }
    : mergeNumericField(pluck(providers, 'driveHoursOneWay'))

  const speedLimit = mergeNumericField(pluck(providers, 'avgSpeedLimitKmh'))
  const priceHint = mergeNumericField(pluck(providers, 'suggestedPricePerKWh'))

  const gain = geometry?.elevationGainM != null
    ? { value: geometry.elevationGainM, source: geometry.provider as FieldSource }
    : mergeNumericField(pluck(others.length ? others : providers, 'elevationGainM'))
  const loss = geometry?.elevationLossM != null
    ? { value: geometry.elevationLossM, source: geometry.provider as FieldSource }
    : mergeNumericField(pluck(others.length ? others : providers, 'elevationLossM'))

  if (speedLimit.source) fieldSources.avgSpeedLimitKmh = speedLimit.source
  if (gain.source) fieldSources.elevationGainM = gain.source
  if (loss.source) fieldSources.elevationLossM = loss.source
  if (priceHint.source) fieldSources.suggestedPricePerKWh = priceHint.source

  let avgTravelSpeedKmh: number | undefined
  if (distance.value != null && duration.value != null && duration.value > 0) {
    avgTravelSpeedKmh = distance.value / duration.value
    fieldSources.avgTravelSpeedKmh =
      duration.source === 'merged' || distance.source === 'merged'
        ? 'merged'
        : 'derived'
  }

  const usedProviders = new Set(providers.map((p) => p.provider))
  const source: RouteSource =
    usedProviders.size > 1
      ? 'merged'
      : (providers[0].provider as RouteSource)

  return {
    distanceKm: distance.value ?? providers[0].distanceKm,
    driveHoursOneWay: duration.value,
    avgTravelSpeedKmh,
    avgSpeedLimitKmh: speedLimit.value,
    elevationGainM: gain.value,
    elevationLossM: loss.value,
    suggestedPricePerKWh: priceHint.value,
    source,
    fieldSources,
    origin: geometry?.origin,
    dest: geometry?.dest,
    outbound: geometry?.outbound,
    inbound: geometry?.inbound,
    likelyTolls: geometry?.likelyTolls,
  }
}

/** Turns a merged provider lookup into a `Route` the rest of the app understands. */
export function enrichmentToRoute(
  from: string,
  to: string,
  merged: MergedRouteEnrichment,
): Route {
  return {
    id: `${merged.source}-${Date.now()}`,
    from: from.trim(),
    to: to.trim(),
    distanceKm: Math.round(merged.distanceKm),
    source: merged.source,
    driveHoursOneWay: merged.driveHoursOneWay,
    avgTravelSpeedKmh: merged.avgTravelSpeedKmh,
    avgSpeedLimitKmh: merged.avgSpeedLimitKmh,
    elevationGainM: merged.elevationGainM,
    elevationLossM: merged.elevationLossM,
    suggestedPricePerKWh: merged.suggestedPricePerKWh,
    fieldSources: merged.fieldSources,
    origin: merged.origin,
    dest: merged.dest,
    outbound: merged.outbound,
    inbound: merged.inbound,
    likelyTolls: merged.likelyTolls,
  }
}
