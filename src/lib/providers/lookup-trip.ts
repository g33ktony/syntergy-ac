import { getAbrpApiKey, getGoogleApiKey, getOpenChargeMapApiKey, getOrsApiKey } from '../config'
import { placeLabel, placeRefToQuery } from '../place'
import { enrichmentToRoute } from '../route-enrichment'
import { estimateTolls } from '../tolls'
import type { Route, RouteQuery, RouteSourcePreference } from '../../types'
import { createAbrpProvider } from './abrp'
import { createGoogleProvider } from './google'
import { lookupRoute } from './merge'
import { fetchChargingPoisAlongPath } from './openchargemap'
import { createOsmProvider } from './osm'
import type { RouteProvider } from './types'

export type LookupTripOptions = {
  query: RouteQuery
  preference: RouteSourcePreference
  googleKey?: string | null
  abrpKey?: string | null
  orsKey?: string | null
  ocmKey?: string | null
}

function routingProviders(options: LookupTripOptions): RouteProvider[] {
  const googleKey = options.googleKey
  const orsKey = options.orsKey
  const preference = options.preference
  const wantsGoogle = preference === 'google' || preference === 'both'
  const providers: RouteProvider[] = []
  if (googleKey && (wantsGoogle || preference === 'abrp')) {
    // Even ABRP-only still needs geometry; Google is preferred when present.
    if (wantsGoogle) providers.push(createGoogleProvider(googleKey))
  }
  if (providers.length === 0) {
    providers.push(createOsmProvider(orsKey))
  }
  const abrpKey = options.abrpKey
  const wantsAbrp = preference === 'abrp' || preference === 'both'
  if (wantsAbrp && abrpKey) providers.push(createAbrpProvider(abrpKey))
  return providers
}

/**
 * Google (if key) → ORS/OSRM, then ABRP fills non-geometry gaps.
 * Tolls and OpenChargeMap run after a path exists.
 */
export async function lookupTrip(options: LookupTripOptions): Promise<Route> {
  const query = options.query
  let providers = routingProviders(options)
  let merged
  try {
    merged = await lookupRoute(providers, query)
  } catch (err) {
    const googleUsed = providers.some((p) => p.id === 'google')
    if (!googleUsed) throw err
    providers = [
      createOsmProvider(options.orsKey),
      ...providers.filter((p) => p.id === 'abrp'),
    ]
    merged = await lookupRoute(providers, query)
  }

  const from = placeRefToQuery(query.from)
  const to = placeRefToQuery(query.to)
  const route = enrichmentToRoute(from, to, merged)
  route.from = typeof query.from === 'string' ? query.from.trim() : placeLabel(query.from)
  route.to = typeof query.to === 'string' ? query.to.trim() : placeLabel(query.to)

  const path = route.outbound?.path ?? merged.outbound?.path
  route.tolls = estimateTolls({
    from: route.from,
    to: route.to,
    path,
    likelyTolls: route.likelyTolls,
    roundTrip: Boolean(query.roundTrip),
  })

  try {
    if (path && path.length >= 2) {
      route.chargingPois = await fetchChargingPoisAlongPath(path, options.ocmKey)
    }
  } catch {
    route.chargingPois = []
  }

  return route
}

export function lookupTripFromConfig(
  query: RouteQuery,
  preference: RouteSourcePreference,
): Promise<Route> {
  return lookupTrip({
    query,
    preference,
    googleKey: getGoogleApiKey(),
    abrpKey: getAbrpApiKey(),
    orsKey: getOrsApiKey(),
    ocmKey: getOpenChargeMapApiKey(),
  })
}
