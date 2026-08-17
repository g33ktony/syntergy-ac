import type { ProviderEnrichment } from '../route-enrichment'

export type RouteProviderId = 'google' | 'abrp'

/**
 * Common shape every route data source implements (design §7.4). Each
 * provider only fills the fields it actually knows about; distance is the
 * one thing every provider must return.
 */
export interface RouteProvider {
  id: RouteProviderId
  lookup(from: string, to: string): Promise<ProviderEnrichment>
}
