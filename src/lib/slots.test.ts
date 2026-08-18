import { describe, expect, it } from 'vitest'
import { createSlot } from './slots'

describe('createSlot', () => {
  it('gives each new slot a unique id', () => {
    const a = createSlot()
    const b = createSlot()
    expect(a.id).toBeTruthy()
    expect(b.id).toBeTruthy()
    expect(a.id).not.toBe(b.id)
    expect(a).toMatchObject({ vehicleId: '', versionId: '' })
  })
})
