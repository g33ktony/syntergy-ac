import { describe, expect, it } from 'vitest'
import { FUEL_MX_FACTOR, MX_FACTOR } from './constants'

describe('MX highway realism factors', () => {
  it('are surcharges vs official combined-cycle ratings', () => {
    expect(MX_FACTOR).toBeGreaterThan(1)
    expect(FUEL_MX_FACTOR).toBeGreaterThan(1)
  })
})
