import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookupTrip, usesGoogleGeometry } from './lookup-trip'

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

describe('lookupTrip', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('falls back to OSM and attaches MX casetas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input)
        if (url.includes('photon.komoot.io/api')) {
          return jsonResponse({
            features: [
              {
                geometry: { coordinates: [-99.13, 19.43] },
                properties: { name: 'CDMX' },
              },
            ],
          })
        }
        if (url.includes('router.project-osrm.org')) {
          return jsonResponse({
            code: 'Ok',
            routes: [
              {
                distance: 220000,
                duration: 9000,
                geometry: {
                  coordinates: [
                    [-99.13, 19.43],
                    [-100.39, 20.59],
                  ],
                },
              },
            ],
          })
        }
        if (url.includes('opentopodata.org')) {
          return jsonResponse({
            results: [{ elevation: 2200 }, { elevation: 1800 }],
          })
        }
        if (url.includes('openchargemap.io')) {
          return jsonResponse([])
        }
        throw new Error(`unexpected fetch ${url}`)
      }),
    )

    const route = await lookupTrip({
      query: { from: 'CDMX', to: 'Querétaro' },
      preference: 'google',
      googleKey: null,
    })
    expect(route.source).toBe('osm')
    expect(route.distanceKm).toBe(220)
    expect(route.tolls?.source).toBe('mx-table')
    expect(route.tolls?.costMxn).toBe(226)
    expect(route.outbound?.path.length).toBeGreaterThan(0)
  })
})

describe('usesGoogleGeometry', () => {
  it('uses Google for ABRP-only when a Google key is present', () => {
    expect(usesGoogleGeometry('abrp', 'key')).toBe(true)
    expect(usesGoogleGeometry('google', 'key')).toBe(true)
    expect(usesGoogleGeometry('both', 'key')).toBe(true)
  })

  it('does not use Google without a key', () => {
    expect(usesGoogleGeometry('abrp', null)).toBe(false)
    expect(usesGoogleGeometry('google', undefined)).toBe(false)
  })
})
