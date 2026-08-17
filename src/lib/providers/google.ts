import { fetchRouteDistance } from '../google'
import type { ProviderEnrichment } from '../route-enrichment'
import type { RouteProvider } from './types'

/**
 * Adapts Phase 1's `fetchRouteDistance` (Distance Matrix) to the
 * `RouteProvider` interface. Does not modify `../google.ts` — that file
 * stays Phase 1-owned; this is a thin wrapper (design §7.4).
 */
export function createGoogleProvider(apiKey: string): RouteProvider {
  return {
    id: 'google',
    async lookup(from, to): Promise<ProviderEnrichment> {
      const result = await fetchRouteDistance(from, to, apiKey)
      return {
        provider: 'google',
        distanceKm: result.distanceKm,
        driveHoursOneWay: result.driveHoursOneWay,
      }
    },
  }
}
