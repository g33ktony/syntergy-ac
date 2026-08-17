import { describe, expect, it } from 'vitest'
import { lookupRoute } from './merge'
import type { RouteProvider } from './types'

function fakeProvider(
  id: 'google' | 'abrp',
  result: Partial<{ distanceKm: number; driveHoursOneWay: number }>,
): RouteProvider {
  return {
    id,
    async lookup() {
      return { provider: id, distanceKm: result.distanceKm ?? 220, ...result }
    },
  }
}

function failingProvider(id: 'google' | 'abrp', message: string): RouteProvider {
  return {
    id,
    async lookup() {
      throw new Error(message)
    },
  }
}

const QUERY = { from: 'CDMX', to: 'Querétaro' }

describe('lookupRoute', () => {
  it('returns a single provider result untouched', async () => {
    const google = fakeProvider('google', { distanceKm: 220, driveHoursOneWay: 2.5 })
    const result = await lookupRoute([google], QUERY)
    expect(result.distanceKm).toBe(220)
    expect(result.source).toBe('google')
  })

  it('merges two successful providers', async () => {
    const google = fakeProvider('google', { distanceKm: 220, driveHoursOneWay: 2.4 })
    const abrp = fakeProvider('abrp', { distanceKm: 224, driveHoursOneWay: 2.6 })
    const result = await lookupRoute([google, abrp], QUERY)
    expect(result.source).toBe('merged')
    expect(result.distanceKm).toBeCloseTo(222, 5)
  })

  it('falls back to the successful provider when one fails', async () => {
    const google = fakeProvider('google', { distanceKm: 220, driveHoursOneWay: 2.5 })
    const abrp = failingProvider('abrp', 'ABRP no configurado')
    const result = await lookupRoute([google, abrp], QUERY)
    expect(result.source).toBe('google')
    expect(result.distanceKm).toBe(220)
  })

  it('throws the underlying error message when every provider fails', async () => {
    const abrp = failingProvider('abrp', 'ABRP respondió con error (401).')
    await expect(lookupRoute([abrp], QUERY)).rejects.toThrow(
      'ABRP respondió con error (401).',
    )
  })

  it('throws a clear message when no providers are configured', async () => {
    await expect(lookupRoute([], QUERY)).rejects.toThrow(
      'No hay proveedor de rutas configurado.',
    )
  })
})
