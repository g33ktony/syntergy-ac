import type {
  FieldSource,
  FieldSources,
  Route,
  RouteEnrichmentFields,
  RouteSource,
} from '../types'

/**
 * Raw fields a single provider (Google, ABRP) returned for one lookup.
 * Distance is required; everything else is opt-in per provider capability
 * (design §7.1).
 */
export type ProviderEnrichment = RouteEnrichmentFields & {
  provider: 'google' | 'abrp'
  distanceKm: number
  driveHoursOneWay?: number
}

export type MergedRouteEnrichment = RouteEnrichmentFields & {
  distanceKm: number
  driveHoursOneWay?: number
  source: RouteSource
  fieldSources: FieldSources
}

type NumericFieldKey = 'distanceKm' | 'driveHoursOneWay' | keyof RouteEnrichmentFields

function mergeNumericField(
  values: Array<{ provider: 'google' | 'abrp'; value: number | undefined }>,
): { value: number | undefined; source: FieldSource | undefined } {
  const present = values.filter(
    (v): v is { provider: 'google' | 'abrp'; value: number } =>
      v.value != null,
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
): Array<{ provider: 'google' | 'abrp'; value: number | undefined }> {
  return providers.map((p) => ({
    provider: p.provider,
    value: (p as unknown as Record<string, number | undefined>)[key],
  }))
}

/**
 * Apply the merge rules from design §4.3:
 * 1. One provider has a field → use it, source = that provider.
 * 2. Both have the same numeric field → average, source = 'merged'.
 * 3. No duration anywhere → don't derive avg travel speed or invent elevation.
 * 4. suggestedPricePerKWh is recorded like any other field but is a hint —
 *    callers must never auto-apply it to the active price (design §4.3.4).
 */
export function mergeRouteEnrichment(
  providers: ProviderEnrichment[],
): MergedRouteEnrichment {
  if (providers.length === 0) {
    throw new Error('mergeRouteEnrichment requires at least one provider result')
  }

  const fieldSources: FieldSources = {}
  const distance = mergeNumericField(pluck(providers, 'distanceKm'))
  const duration = mergeNumericField(pluck(providers, 'driveHoursOneWay'))
  const speedLimit = mergeNumericField(pluck(providers, 'avgSpeedLimitKmh'))
  const gain = mergeNumericField(pluck(providers, 'elevationGainM'))
  const loss = mergeNumericField(pluck(providers, 'elevationLossM'))
  const priceHint = mergeNumericField(pluck(providers, 'suggestedPricePerKWh'))

  if (speedLimit.source) fieldSources.avgSpeedLimitKmh = speedLimit.source
  if (gain.source) fieldSources.elevationGainM = gain.source
  if (loss.source) fieldSources.elevationLossM = loss.source
  if (priceHint.source) fieldSources.suggestedPricePerKWh = priceHint.source

  // avgTravelSpeedKmh is always derived from distance/duration, not carried
  // verbatim from a provider — rule 3: no duration anywhere ⇒ leave unset.
  let avgTravelSpeedKmh: number | undefined
  if (distance.value != null && duration.value != null && duration.value > 0) {
    avgTravelSpeedKmh = distance.value / duration.value
    fieldSources.avgTravelSpeedKmh = duration.source === 'merged' || distance.source === 'merged'
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
  }
}
