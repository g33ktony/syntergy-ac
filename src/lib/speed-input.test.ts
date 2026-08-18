import { describe, expect, it } from 'vitest'
import { MAX_SPEED_KMH, MIN_SPEED_KMH } from './constants'
import {
  commitSpeedKmh,
  formatSpeedDraft,
  liveSpeedKmhFromDraft,
  parseSpeedDraftKmh,
} from './speed-input'
import { miToKm } from './units'

describe('formatSpeedDraft', () => {
  it('rounds metric km/h and imperial mph', () => {
    expect(formatSpeedDraft(90, 'metric')).toBe('90')
    expect(formatSpeedDraft(90, 'imperial')).toBe('56')
  })
})

describe('parseSpeedDraftKmh', () => {
  it('returns null for empty or non-numeric drafts', () => {
    expect(parseSpeedDraftKmh('', 'metric')).toBeNull()
    expect(parseSpeedDraftKmh('   ', 'metric')).toBeNull()
    expect(parseSpeedDraftKmh('abc', 'metric')).toBeNull()
  })

  it('parses metric as km/h and imperial as mph', () => {
    expect(parseSpeedDraftKmh('90', 'metric')).toBe(90)
    expect(parseSpeedDraftKmh('56', 'imperial')).toBeCloseTo(miToKm(56), 8)
  })
})

describe('liveSpeedKmhFromDraft', () => {
  it('does not apply partial keystrokes below the floor (e.g. "9" of "90")', () => {
    expect(liveSpeedKmhFromDraft('4', 'metric')).toBeNull()
    expect(liveSpeedKmhFromDraft('9', 'metric')).toBeNull()
    expect(liveSpeedKmhFromDraft('39', 'metric')).toBeNull()
  })

  it('applies complete in-range values immediately', () => {
    expect(liveSpeedKmhFromDraft('40', 'metric')).toBe(MIN_SPEED_KMH)
    expect(liveSpeedKmhFromDraft('90', 'metric')).toBe(90)
    expect(liveSpeedKmhFromDraft('130', 'metric')).toBe(MAX_SPEED_KMH)
  })

  it('does not apply values above the ceiling until commit', () => {
    expect(liveSpeedKmhFromDraft('131', 'metric')).toBeNull()
    expect(liveSpeedKmhFromDraft('999', 'metric')).toBeNull()
  })

  it('uses converted imperial bounds so 24 mph stays draft-only', () => {
    expect(liveSpeedKmhFromDraft('24', 'imperial')).toBeNull()
    const at25 = liveSpeedKmhFromDraft('25', 'imperial')
    expect(at25).not.toBeNull()
    expect(at25!).toBeGreaterThanOrEqual(MIN_SPEED_KMH)
  })
})

describe('commitSpeedKmh', () => {
  it('clamps out-of-range drafts on commit', () => {
    expect(commitSpeedKmh('9', 'metric', 90)).toBe(MIN_SPEED_KMH)
    expect(commitSpeedKmh('999', 'metric', 90)).toBe(MAX_SPEED_KMH)
  })

  it('reverts empty or invalid drafts to the last committed speed', () => {
    expect(commitSpeedKmh('', 'metric', 90)).toBe(90)
    expect(commitSpeedKmh('abc', 'metric', 77)).toBe(77)
  })
})
