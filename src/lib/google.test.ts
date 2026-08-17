import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchRoute } from './google'

function ll(lat: number, lng: number) {
  return { lat: () => lat, lng: () => lng }
}

describe('fetchRoute (Directions + Elevation)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns path, duration and elevation from Google services', async () => {
    const route = vi.fn((_req, cb: (res: unknown, status: string) => void) => {
      cb(
        {
          routes: [
            {
              overview_path: [ll(19.4, -99.1), ll(20.6, -100.4)],
              legs: [
                {
                  distance: { value: 220_000 },
                  duration: { value: 9000 },
                  start_location: ll(19.4, -99.1),
                  end_location: ll(20.6, -100.4),
                },
              ],
            },
          ],
        },
        'OK',
      )
    })
    const getElevationAlongPath = vi.fn(
      (_req, cb: (res: unknown, status: string) => void) => {
        cb([{ elevation: 2200 }, { elevation: 1800 }], 'OK')
      },
    )

    const maps = {
      DirectionsService: function DirectionsService() {
        return { route }
      },
      ElevationService: function ElevationService() {
        return { getElevationAlongPath }
      },
      TravelMode: { DRIVING: 'DRIVING' },
    }
    vi.stubGlobal('window', { google: { maps } })

    const result = await fetchRoute('CDMX', 'Querétaro', 'fake-key', false)
    expect(result.distanceKm).toBe(220)
    expect(result.driveHoursOneWay).toBe(2.5)
    expect(result.outbound.path).toHaveLength(2)
    expect(result.elevationLossM).toBe(400)
    expect(result.inbound).toBeUndefined()
    expect(route).toHaveBeenCalled()
  })
})
