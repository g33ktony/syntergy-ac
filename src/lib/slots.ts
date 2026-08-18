export type SlotSelection = {
  id: string
  vehicleId: string
  versionId: string
}

export function createSlot(): SlotSelection {
  return { id: crypto.randomUUID(), vehicleId: '', versionId: '' }
}
