import type { LatLng } from '../types'

const EARTH_RADIUS_KM = 6371

export function gainLossFromElevations(samples: number[]): {
  gainM: number
  lossM: number
} {
  let gainM = 0
  let lossM = 0
  for (let i = 1; i < samples.length; i++) {
    const delta = samples[i]! - samples[i - 1]!
    if (delta > 0) gainM += delta
    else lossM -= delta
  }
  return { gainM, lossM }
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function pathLengthKm(path: LatLng[]): number {
  let total = 0
  for (let i = 1; i < path.length; i++) {
    total += haversineKm(path[i - 1]!, path[i]!)
  }
  return total
}

/** Distance along `path` to the nearest projection of `point` onto a segment. */
export function alongKmOnPath(path: LatLng[], point: LatLng): number {
  if (path.length < 2) return 0
  let bestDist = Infinity
  let bestAlong = 0
  let acc = 0
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!
    const b = path[i]!
    const segKm = haversineKm(a, b)
    const dLat = b.lat - a.lat
    const dLng = b.lng - a.lng
    const seg2 = dLat * dLat + dLng * dLng
    const t =
      seg2 === 0
        ? 0
        : Math.max(0, Math.min(1, ((point.lat - a.lat) * dLat + (point.lng - a.lng) * dLng) / seg2))
    const proj = { lat: a.lat + dLat * t, lng: a.lng + dLng * t }
    const dist = haversineKm(point, proj)
    if (dist < bestDist) {
      bestDist = dist
      bestAlong = acc + t * segKm
    }
    acc += segKm
  }
  return bestAlong
}

/** `alongKmOnPath` scaled so the path end equals `lengthKm` (router distance). */
export function alongKmOnPathScaled(path: LatLng[], point: LatLng, lengthKm: number): number {
  const geom = pathLengthKm(path)
  const along = alongKmOnPath(path, point)
  return geom > 0 ? (along / geom) * lengthKm : along
}

/** Evenly pick at most `maxPoints` vertices (OpenTopoData cap is 100). */
export function samplePath(path: LatLng[], maxPoints = 100): LatLng[] {
  if (path.length <= maxPoints) return path
  if (maxPoints < 2) return path.slice(0, 1)
  const out: LatLng[] = []
  const step = (path.length - 1) / (maxPoints - 1)
  for (let i = 0; i < maxPoints; i++) {
    out.push(path[Math.round(i * step)]!)
  }
  return out
}

/** Sample along the polyline about every `everyKm` (plus endpoints). */
export function samplePathEveryKm(path: LatLng[], everyKm: number): LatLng[] {
  if (path.length === 0) return []
  if (path.length === 1) return path
  const out: LatLng[] = [path[0]!]
  let acc = 0
  for (let i = 1; i < path.length; i++) {
    acc += haversineKm(path[i - 1]!, path[i]!)
    if (acc >= everyKm) {
      out.push(path[i]!)
      acc = 0
    }
  }
  const last = path[path.length - 1]!
  const prev = out[out.length - 1]!
  if (prev.lat !== last.lat || prev.lng !== last.lng) out.push(last)
  return out
}
