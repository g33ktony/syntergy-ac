import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAbrpProvider } from './abrp'

describe('createAbrpProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses a well-formed plan response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          distance_km: 220,
          duration_h: 2.4,
          avg_speed_limit_kmh: 95,
          elevation_gain_m: 450,
          elevation_loss_m: 380,
          suggested_price_per_kwh: 3.1,
        }),
      })),
    )

    const provider = createAbrpProvider('test-key')
    const result = await provider.lookup('CDMX', 'Querétaro')

    expect(result.provider).toBe('abrp')
    expect(result.distanceKm).toBe(220)
    expect(result.driveHoursOneWay).toBe(2.4)
    expect(result.avgSpeedLimitKmh).toBe(95)
    expect(result.elevationGainM).toBe(450)
    expect(result.suggestedPricePerKWh).toBe(3.1)
  })

  it('throws a Spanish error when no API key is given', async () => {
    const provider = createAbrpProvider('')
    await expect(provider.lookup('CDMX', 'Querétaro')).rejects.toThrow(
      'No hay API key de ABRP configurada.',
    )
  })

  it('throws a Spanish error on non-OK HTTP status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 401 })),
    )
    const provider = createAbrpProvider('bad-key')
    await expect(provider.lookup('CDMX', 'Querétaro')).rejects.toThrow(
      /ABRP respondió con error \(401\)/,
    )
  })

  it('throws a Spanish error when the network call itself fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    const provider = createAbrpProvider('test-key')
    await expect(provider.lookup('CDMX', 'Querétaro')).rejects.toThrow(
      'No se pudo contactar a ABRP',
    )
  })

  it('throws when the response is missing a numeric distance', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })),
    )
    const provider = createAbrpProvider('test-key')
    await expect(provider.lookup('CDMX', 'Querétaro')).rejects.toThrow(
      'ABRP no devolvió una distancia válida.',
    )
  })

  it('rejects blank origin/destination before touching the network', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const provider = createAbrpProvider('test-key')
    await expect(provider.lookup('  ', 'Querétaro')).rejects.toThrow(
      'Indica ciudad de origen y destino',
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
