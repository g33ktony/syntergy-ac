import { describe, expect, it } from 'vitest'
import { MX_TOLL_CORRIDORS } from './mx-tolls'

describe('MX_TOLL_CORRIDORS data integrity', () => {
  it('has unique, non-empty ids', () => {
    const ids = MX_TOLL_CORRIDORS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id.length).toBeGreaterThan(0)
    }
  })

  it('has a positive, finite one-way cost for every corridor', () => {
    for (const corridor of MX_TOLL_CORRIDORS) {
      expect(Number.isFinite(corridor.costMxn)).toBe(true)
      expect(corridor.costMxn).toBeGreaterThan(0)
    }
  })

  it('gives every corridor at least one alias on each end', () => {
    for (const corridor of MX_TOLL_CORRIDORS) {
      expect(corridor.aliasesA.length).toBeGreaterThan(0)
      expect(corridor.aliasesB.length).toBeGreaterThan(0)
    }
  })

  it('never repeats the same city pair as both A and B on one corridor', () => {
    for (const corridor of MX_TOLL_CORRIDORS) {
      const overlap = corridor.aliasesA.filter((a) =>
        corridor.aliasesB.includes(a),
      )
      expect(overlap).toEqual([])
    }
  })

  it('has a valid [south, west, north, east] bbox when present', () => {
    for (const corridor of MX_TOLL_CORRIDORS) {
      if (!corridor.bbox) continue
      const [south, west, north, east] = corridor.bbox
      expect(south).toBeLessThan(north)
      expect(west).toBeLessThan(east)
      // Mexico's approximate lat/lng envelope — catches swapped coordinates.
      expect(south).toBeGreaterThan(10)
      expect(north).toBeLessThan(33)
      expect(west).toBeGreaterThan(-118)
      expect(east).toBeLessThan(-86)
    }
  })

  // Recalibrated August 2026 against post-13-abr-2026 CAPUFE figures —
  // pin the two corridors with a solid single-source "total route" quote
  // so a future recalibration pass can't silently drift without updating
  // both the value and this note.
  it('pins the two corridors with a verified total-route quote', () => {
    const queretaro = MX_TOLL_CORRIDORS.find((c) => c.id === 'cdmx-queretaro')
    const puebla = MX_TOLL_CORRIDORS.find((c) => c.id === 'cdmx-puebla')
    expect(queretaro?.costMxn).toBe(385)
    expect(puebla?.costMxn).toBe(460)
  })

  it('reflects that Guadalajara–Puerto Vallarta is one of the pricier corridors, not a short hop', () => {
    // Was badly stale at $420 (a short-corridor price); real one-way is
    // ~$1,400 (round trip reported at ~$2,820). Regression guard against
    // silently reintroducing the stale low estimate.
    const gdlVallarta = MX_TOLL_CORRIDORS.find((c) => c.id === 'gdl-vallarta')
    expect(gdlVallarta?.costMxn).toBeGreaterThan(1000)
  })
})
