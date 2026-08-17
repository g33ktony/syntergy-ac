import { describe, expect, it } from 'vitest'
import { reserveStatusCopy } from './reserve-copy'

describe('reserveStatusCopy', () => {
  it('does not say the driver arrives with 15%', () => {
    const ok = reserveStatusCopy(true)
    expect(ok).toBe('Se mantiene ≥15% de reserva por imprevistos.')
    expect(ok.toLowerCase()).not.toMatch(/llega con/)
    const bad = reserveStatusCopy(false)
    expect(bad).toBe(
      'Por debajo de la reserva del 15% (imprevistos). No alcanza sin cargar.',
    )
  })
})
