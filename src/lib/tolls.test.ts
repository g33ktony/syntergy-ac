import { describe, expect, it } from 'vitest'
import { applyTollOverride, estimateTolls } from './tolls'

describe('estimateTolls', () => {
  it('returns zero when there is no match and no cuota signal', () => {
    const result = estimateTolls({ from: 'Tijuana', to: 'Ensenada' })
    expect(result.costMxn).toBe(0)
    expect(result.source).toBe('none')
    expect(result.likelyTolls).toBe(false)
  })

  it('matches a preset corridor by city names', () => {
    const result = estimateTolls({ from: 'CDMX', to: 'Querétaro' })
    expect(result.source).toBe('mx-table')
    expect(result.costMxn).toBe(385)
    expect(result.likelyTolls).toBe(true)
  })

  it('doubles casetas on round trip when only one corridor matches', () => {
    const result = estimateTolls({
      from: 'CDMX',
      to: 'Puebla',
      roundTrip: true,
    })
    expect(result.costMxn).toBe(920)
  })

  it('keeps likelyTolls with zero cost when OSM/Google flagged cuota without a table hit', () => {
    const result = estimateTolls({
      from: 'A',
      to: 'B',
      likelyTolls: true,
    })
    expect(result.likelyTolls).toBe(true)
    expect(result.costMxn).toBe(0)
    expect(result.source).toBe('osm')
  })

  it('applies a manual override', () => {
    const base = estimateTolls({ from: 'CDMX', to: 'Querétaro' })
    const next = applyTollOverride(base, 500)
    expect(next.source).toBe('manual')
    expect(next.costMxn).toBe(500)
  })
})
