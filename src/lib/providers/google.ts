import { fetchRoute } from '../google'
import type { ProviderEnrichment } from '../route-enrichment'
import type { RouteProvider } from './types'

export function createGoogleProvider(apiKey: string): RouteProvider {
  return {
    id: 'google',
    async lookup(query): Promise<ProviderEnrichment> {
      const result = await fetchRoute(
        query.from,
        query.to,
        apiKey,
        Boolean(query.roundTrip),
      )
      return {
        provider: 'google',
        distanceKm: result.distanceKm,
        driveHoursOneWay: result.driveHoursOneWay,
        elevationGainM: result.elevationGainM,
        elevationLossM: result.elevationLossM,
        origin: result.origin,
        dest: result.dest,
        outbound: result.outbound,
        inbound: result.inbound,
        likelyTolls: result.likelyTolls,
        path: result.path,
      }
    },
  }
}
