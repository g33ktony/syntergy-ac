import { mergeRouteEnrichment, type MergedRouteEnrichment } from '../route-enrichment'
import type { RouteProvider } from './types'

/**
 * Look up a route from the given providers per the user's source
 * preference (design §7.2/§4.3). "both" queries in parallel and merges;
 * if one side fails, the other's result is still used (source stays that
 * single provider, not 'merged') rather than failing the whole lookup.
 */
export async function lookupRoute(
  providers: RouteProvider[],
  from: string,
  to: string,
): Promise<MergedRouteEnrichment> {
  if (providers.length === 0) {
    throw new Error('No hay proveedor de rutas configurado.')
  }

  const settled = await Promise.allSettled(
    providers.map((p) => p.lookup(from, to)),
  )
  const results = settled
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<RouteProvider['lookup']>>> => r.status === 'fulfilled')
    .map((r) => r.value)

  if (results.length === 0) {
    const firstError = settled.find((r) => r.status === 'rejected') as
      | PromiseRejectedResult
      | undefined
    const message =
      firstError?.reason instanceof Error
        ? firstError.reason.message
        : 'No se pudo obtener la ruta de ningún proveedor.'
    throw new Error(message)
  }

  return mergeRouteEnrichment(results)
}
