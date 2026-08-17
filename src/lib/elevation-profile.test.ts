import { describe, expect, it } from 'vitest'
import {
  gainLossFromElevations,
  samplePath,
  samplePathEveryKm,
} from './elevation-profile'

describe('gainLossFromElevations', () => {
  it('returns zeros for a flat profile', () => {
    expect(gainLossFromElevations([100, 100, 100])).toEqual({ gainM: 0, lossM: 0 })
  })

  it('splits climb and descent', () => {
    expect(gainLossFromElevations([0, 50, 20])).toEqual({ gainM: 50, lossM: 30 })
  })
})

describe('samplePath', () => {
  it('keeps short paths intact', () => {
    const path = [
      { lat: 1, lng: 1 },
      { lat: 2, lng: 2 },
    ]
    expect(samplePath(path, 100)).toEqual(path)
  })

  it('caps long paths including endpoints', () => {
    const path = Array.from({ length: 50 }, (_, i) => ({ lat: i, lng: i }))
    const sampled = samplePath(path, 5)
    expect(sampled).toHaveLength(5)
    expect(sampled[0]).toEqual(path[0])
    expect(sampled[4]).toEqual(path[49])
  })
})

describe('samplePathEveryKm', () => {
  it('always includes start and end', () => {
    const path = [
      { lat: 19.4, lng: -99.15 },
      { lat: 19.5, lng: -99.2 },
      { lat: 20.6, lng: -100.4 },
    ]
    const sampled = samplePathEveryKm(path, 50)
    expect(sampled[0]).toEqual(path[0])
    expect(sampled[sampled.length - 1]).toEqual(path[2])
  })
})
