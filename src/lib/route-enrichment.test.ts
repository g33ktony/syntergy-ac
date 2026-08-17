import { describe, expect, it } from 'vitest'
import { mergeRouteEnrichment, type ProviderEnrichment } from './route-enrichment'

describe('mergeRouteEnrichment', () => {
  it('uses a single provider field as-is with correct source attribution', () => {
    const google: ProviderEnrichment = {
      provider: 'google',
      distanceKm: 220,
      driveHoursOneWay: 2.5,
    }

    const result = mergeRouteEnrichment([google])

    expect(result.distanceKm).toBe(220)
    expect(result.driveHoursOneWay).toBe(2.5)
    // distance + duration both present ⇒ avg travel speed is derived
    expect(result.avgTravelSpeedKmh).toBeCloseTo(88, 5)
    expect(result.fieldSources?.avgTravelSpeedKmh).toBe('derived')
    expect(result.source).toBe('google')
  })

  it('derives avgTravelSpeedKmh from distance/duration when a provider gives duration', () => {
    const google: ProviderEnrichment = {
      provider: 'google',
      distanceKm: 220,
      driveHoursOneWay: 2.2,
    }

    const result = mergeRouteEnrichment([google])

    expect(result.avgTravelSpeedKmh).toBeCloseTo(100, 5)
    expect(result.fieldSources?.avgTravelSpeedKmh).toBe('derived')
  })

  it('takes a single-provider field (e.g. elevation) as-is when only one side has it', () => {
    const abrp: ProviderEnrichment = {
      provider: 'abrp',
      distanceKm: 220,
      elevationGainM: 450,
      elevationLossM: 380,
      avgSpeedLimitKmh: 95,
    }

    const result = mergeRouteEnrichment([abrp])

    expect(result.elevationGainM).toBe(450)
    expect(result.elevationLossM).toBe(380)
    expect(result.avgSpeedLimitKmh).toBe(95)
    expect(result.fieldSources?.elevationGainM).toBe('abrp')
    expect(result.fieldSources?.avgSpeedLimitKmh).toBe('abrp')
    expect(result.source).toBe('abrp')
  })

  it('averages a numeric field present on both providers and marks it merged', () => {
    const google: ProviderEnrichment = {
      provider: 'google',
      distanceKm: 220,
      driveHoursOneWay: 2.4,
    }
    const abrp: ProviderEnrichment = {
      provider: 'abrp',
      distanceKm: 224,
      driveHoursOneWay: 2.6,
    }

    const result = mergeRouteEnrichment([google, abrp])

    expect(result.distanceKm).toBeCloseTo(222, 5)
    expect(result.driveHoursOneWay).toBeCloseTo(2.5, 5)
    expect(result.fieldSources?.avgTravelSpeedKmh).toBe('merged')
    expect(result.source).toBe('merged')
  })

  it('never lets ABRP alone set suggestedPricePerKWh as the active price', () => {
    // suggestedPricePerKWh is a hint field: merge still records it + its
    // source, but callers (TripControls) must treat it as opt-in, never
    // auto-apply it to the active $/kWh input.
    const abrp: ProviderEnrichment = {
      provider: 'abrp',
      distanceKm: 220,
      suggestedPricePerKWh: 3.2,
    }

    const result = mergeRouteEnrichment([abrp])

    expect(result.suggestedPricePerKWh).toBe(3.2)
    expect(result.fieldSources?.suggestedPricePerKWh).toBe('abrp')
  })

  it('does not invent elevation when no provider has duration/elevation data', () => {
    const google: ProviderEnrichment = {
      provider: 'google',
      distanceKm: 220,
    }

    const result = mergeRouteEnrichment([google])

    expect(result.elevationGainM).toBeUndefined()
    expect(result.elevationLossM).toBeUndefined()
    expect(result.avgTravelSpeedKmh).toBeUndefined()
  })

  it('throws when given no providers', () => {
    expect(() => mergeRouteEnrichment([])).toThrow()
  })
})
