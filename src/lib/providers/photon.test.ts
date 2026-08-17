import { afterEach, describe, expect, it, vi } from 'vitest'
import { photonGeocode, photonReverse, photonSuggest } from './photon'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body }
}

describe('photonSuggest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not send unsupported lang=es (Photon 400s on it)', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        features: [
          {
            geometry: { coordinates: [-99.13, 19.43] },
            properties: { name: 'Ciudad de México', country: 'México' },
          },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const hits = await photonSuggest('CDMX')
    expect(hits).toEqual([
      { label: 'Ciudad de México, México', latlng: { lat: 19.43, lng: -99.13 } },
    ])
    const called = fetchMock.mock.calls as unknown as Array<[string | URL]>
    const url = String(called[0][0])
    expect(url).toContain('photon.komoot.io/api')
    expect(url).toContain('q=CDMX')
    expect(url).not.toMatch(/[?&]lang=es\b/)
  })

  it('prefers city/state hits over POIs with the same name', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          features: [
            {
              geometry: { coordinates: [-99.1, 19.4] },
              properties: {
                name: 'CDMX',
                osm_value: 'artwork',
                street: 'Avenida 1',
                country: 'México',
              },
            },
            {
              geometry: { coordinates: [-99.13, 19.43] },
              properties: {
                name: 'Ciudad de México',
                osm_value: 'state',
                country: 'México',
              },
            },
          ],
        }),
      ),
    )

    const hits = await photonSuggest('CDMX')
    expect(hits[0]?.label).toContain('Ciudad de México')
  })
})

describe('photon reverse/geocode URLs', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('omits lang=es on reverse geocode', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        features: [
          {
            geometry: { coordinates: [-99.13, 19.43] },
            properties: { name: 'Roma Norte', city: 'Ciudad de México' },
          },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    await photonReverse({ lat: 19.43, lng: -99.13 })
    const called = fetchMock.mock.calls as unknown as Array<[string | URL]>
    expect(String(called[0][0])).not.toMatch(/[?&]lang=es\b/)
  })

  it('geocodes via suggest', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          features: [
            {
              geometry: { coordinates: [-100.39, 20.59] },
              properties: { name: 'Querétaro', country: 'México', osm_value: 'city' },
            },
          ],
        }),
      ),
    )
    const loc = await photonGeocode('Querétaro')
    expect(loc).toEqual({ lat: 20.59, lng: -100.39 })
  })
})
