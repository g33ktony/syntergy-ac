import type { ChargingPoi, LatLng } from '../types'

export type RouteOverlay = {
  id: string
  outboundPath: LatLng[]
  inboundPath?: LatLng[]
  focused?: boolean
  stops?: ChargingPoi[]
}

export function overlayPolylineStyle(input: { focused: boolean }): {
  color: string
  weight: number
  dashArray?: string
  opacity: number
} {
  if (input.focused) {
    return { color: '#1c1a16', weight: 5, opacity: 1 }
  }
  return { color: '#6b6152', weight: 3, dashArray: '8 6', opacity: 0.85 }
}
