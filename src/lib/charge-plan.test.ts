import { describe, expect, it } from 'vitest'
import { poiMatchesConnector } from './charge-plan'

describe('poiMatchesConnector', () => {
  it('matches CCS1 to Combo/CCS titles', () => {
    expect(poiMatchesConnector('CCS1', ['IEC 62196-3 CCS Combo 2'])).toBe(true)
    expect(poiMatchesConnector('CCS1', ['Type 2'])).toBe(false)
  })
  it('matches GB/T', () => {
    expect(poiMatchesConnector('GB/T', ['GB/T'])).toBe(true)
    expect(poiMatchesConnector('GB/T', ['GBT'])).toBe(true)
  })
  it('matches NACS / Tesla', () => {
    expect(poiMatchesConnector('NACS', ['NACS'])).toBe(true)
    expect(poiMatchesConnector('NACS', ['Tesla'])).toBe(true)
  })
  it('does not filter when connector is other', () => {
    expect(poiMatchesConnector('other', ['anything'])).toBe(true)
    expect(poiMatchesConnector('other', [])).toBe(true)
  })
})
