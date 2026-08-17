import type { ProviderEnrichment } from '../route-enrichment'
import type { RouteProvider } from './types'

/**
 * ABRP (A Better Route Planner) Planning API adapter.
 *
 * IMPORTANT — verified vs. inferred:
 * - Verified (public docs, Aug 2026): Iternio's API host is
 *   `api.iternio.com`, versioned `/1/...`; the free Telemetry API lives at
 *   `/1/tlm/*`. The Planning API (route distance/duration/elevation/speed
 *   limits/charging price — what this app needs) is a **paid, partner-gated
 *   product**: "setup costs and per-plan pricing vary based on your
 *   integration needs" per abetterrouteplanner.com/resources/api. A key is
 *   obtained by contacting contact@iternio.com, not self-service.
 * - NOT verified: the exact `/1/plan` path and response JSON shape below.
 *   No public documentation or open-source integration exposes the Planning
 *   endpoint's request/response contract (only Telemetry's `/1/tlm/*` is
 *   used in the wild). The path/shape here follow Iternio's own versioning
 *   convention (`/1/tlm/send` ⇒ `/1/plan`) but are our best guess pending
 *   real partner docs.
 *
 * Consequence: this client is feature-flagged off by default (design §7.3,
 * §"Build" item 5 — "no ABRP key ⇒ app still works"). It never runs unless
 * the user has both entered an `abrpApiKey` in Settings AND picked ABRP or
 * "Ambas" as the route source. Any failure (missing key, wrong endpoint,
 * network error, unexpected response shape) throws a Spanish error that the
 * caller (TripControls) catches and falls back to Google/manual km — it
 * never breaks the app. Once a real partner key + docs are available, only
 * `PLAN_ENDPOINT` and `parsePlanResponse` should need updating.
 */

const ABRP_API_BASE = 'https://api.iternio.com/1'
const PLAN_ENDPOINT = `${ABRP_API_BASE}/plan`

type AbrpPlanResponse = {
  distance_km?: number
  duration_h?: number
  avg_speed_limit_kmh?: number
  elevation_gain_m?: number
  elevation_loss_m?: number
  suggested_price_per_kwh?: number
}

function parsePlanResponse(data: unknown): ProviderEnrichment {
  if (!data || typeof data !== 'object') {
    throw new Error('Respuesta de ABRP inesperada.')
  }
  const r = data as AbrpPlanResponse
  if (typeof r.distance_km !== 'number') {
    throw new Error('ABRP no devolvió una distancia válida.')
  }

  return {
    provider: 'abrp',
    distanceKm: r.distance_km,
    driveHoursOneWay: r.duration_h,
    avgSpeedLimitKmh: r.avg_speed_limit_kmh,
    elevationGainM: r.elevation_gain_m,
    elevationLossM: r.elevation_loss_m,
    suggestedPricePerKWh: r.suggested_price_per_kwh,
  }
}

export function createAbrpProvider(apiKey: string): RouteProvider {
  return {
    id: 'abrp',
    async lookup(from, to): Promise<ProviderEnrichment> {
      const origin = from.trim()
      const destination = to.trim()
      if (!origin || !destination) {
        throw new Error('Indica ciudad de origen y destino')
      }
      if (!apiKey) {
        throw new Error('No hay API key de ABRP configurada.')
      }

      let response: Response
      try {
        response = await fetch(
          `${PLAN_ENDPOINT}?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`,
          { headers: { Authorization: `APIKEY ${apiKey}` } },
        )
      } catch {
        throw new Error(
          'No se pudo contactar a ABRP. Revisa tu conexión o usa Google/km manual.',
        )
      }

      if (!response.ok) {
        throw new Error(
          `ABRP respondió con error (${response.status}). Usa Google o km manual.`,
        )
      }

      const data: unknown = await response.json()
      return parsePlanResponse(data)
    },
  }
}
