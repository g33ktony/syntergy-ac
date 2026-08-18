import { describe, expect, it } from 'vitest'
import { overlayPolylineStyle } from './map-overlays'

describe('overlayPolylineStyle', () => {
  it('makes the focused overlay solid and thicker', () => {
    const focused = overlayPolylineStyle({ focused: true })
    const other = overlayPolylineStyle({ focused: false })
    expect(focused.weight).toBeGreaterThan(other.weight)
    expect(focused.dashArray).toBeUndefined()
    expect(other.dashArray).toBe('8 6')
    expect(focused.color).toBe('#1c1a16')
    expect(other.color).toBe('#6b6152')
  })
})
