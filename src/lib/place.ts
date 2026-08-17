import type { LatLng, PlaceRef } from '../types'

export function isLatLng(place: PlaceRef): place is LatLng {
  return typeof place === 'object' && Number.isFinite(place.lat) && Number.isFinite(place.lng)
}

export function placeRefToQuery(place: PlaceRef): string {
  if (typeof place === 'string') return place.trim()
  return `${place.lat},${place.lng}`
}

export function placeLabel(place: PlaceRef): string {
  if (typeof place === 'string') return place.trim()
  return `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`
}
