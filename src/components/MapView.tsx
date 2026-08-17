import { useEffect, useRef } from 'react'
import type { LatLng } from '../types'
import { loadMapsJs } from '../lib/google'
import { getGoogleApiKey } from '../lib/config'

type MapViewProps = {
  origin?: LatLng
  dest?: LatLng
  outboundPath?: LatLng[]
  inboundPath?: LatLng[]
  useGoogle: boolean
  onPinsChange: (origin: LatLng, dest: LatLng) => void
}

export function MapView(props: MapViewProps) {
  if (props.useGoogle) return <GoogleMapCanvas {...props} />
  return <OsmMapCanvas {...props} />
}

function GoogleMapCanvas({
  origin,
  dest,
  outboundPath,
  inboundPath,
  onPinsChange,
}: MapViewProps) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapsRef = useRef<{
    map?: googleMap
    originMarker?: googleMarker
    destMarker?: googleMarker
    outLine?: googleLine
    inLine?: googleLine
  }>({})

  useEffect(() => {
    const apiKey = getGoogleApiKey()
    const el = elRef.current
    if (!apiKey || !el) return
    let cancelled = false
    void loadMapsJs(apiKey).then(() => {
      if (cancelled || !window.google?.maps) return
      const g = window.google.maps as unknown as GoogleMapsUi
      const center = origin ?? dest ?? { lat: 23.6, lng: -102.5 }
      const map = new g.Map(el, {
        center,
        zoom: origin && dest ? 7 : 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })
      mapsRef.current.map = map
      const originMarker = new g.Marker({
        map,
        position: origin ?? center,
        draggable: true,
        label: 'A',
      })
      const destMarker = new g.Marker({
        map,
        position: dest ?? center,
        draggable: true,
        label: 'B',
      })
      originMarker.addListener('dragend', () => {
        const o = latLngOf(originMarker)
        const d = latLngOf(destMarker)
        if (o && d) onPinsChange(o, d)
      })
      destMarker.addListener('dragend', () => {
        const o = latLngOf(originMarker)
        const d = latLngOf(destMarker)
        if (o && d) onPinsChange(o, d)
      })
      mapsRef.current.originMarker = originMarker
      mapsRef.current.destMarker = destMarker
      mapsRef.current.outLine = new g.Polyline({
        map,
        strokeColor: '#1c4b73',
        strokeWeight: 4,
      })
      mapsRef.current.inLine = new g.Polyline({
        map,
        strokeColor: '#8a4b12',
        strokeWeight: 3,
        strokeOpacity: 0.7,
      })
      syncGoogle(mapsRef.current, origin, dest, outboundPath, inboundPath)
    })
    return () => {
      cancelled = true
    }
    // Intentionally once: subsequent updates go through the sync effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    syncGoogle(mapsRef.current, origin, dest, outboundPath, inboundPath)
  }, [origin, dest, outboundPath, inboundPath])

  return <div className="route-map" ref={elRef} role="img" aria-label="Mapa de la ruta" />
}

type googleMap = { fitBounds: (b: unknown) => void }
type googleMarker = {
  setPosition: (p: LatLng) => void
  getPosition: () => { lat: () => number; lng: () => number } | null
  addListener: (ev: string, fn: () => void) => void
}
type googleLine = { setPath: (p: LatLng[]) => void }
type GoogleMapsUi = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => googleMap
  Marker: new (opts: Record<string, unknown>) => googleMarker
  Polyline: new (opts: Record<string, unknown>) => googleLine
  LatLngBounds: new () => { extend: (p: LatLng) => void }
}

function latLngOf(marker: googleMarker): LatLng | null {
  const p = marker.getPosition()
  if (!p) return null
  return { lat: p.lat(), lng: p.lng() }
}

function syncGoogle(
  refs: {
    map?: googleMap
    originMarker?: googleMarker
    destMarker?: googleMarker
    outLine?: googleLine
    inLine?: googleLine
  },
  origin?: LatLng,
  dest?: LatLng,
  outboundPath?: LatLng[],
  inboundPath?: LatLng[],
) {
  const g = window.google?.maps as unknown as GoogleMapsUi | undefined
  if (!g || !refs.map) return
  if (origin) refs.originMarker?.setPosition(origin)
  if (dest) refs.destMarker?.setPosition(dest)
  refs.outLine?.setPath(outboundPath ?? [])
  refs.inLine?.setPath(inboundPath ?? [])
  const bounds = new g.LatLngBounds()
  const pts = [...(outboundPath ?? []), ...(inboundPath ?? [])]
  if (origin) pts.push(origin)
  if (dest) pts.push(dest)
  if (pts.length === 0) return
  for (const p of pts) bounds.extend(p)
  refs.map.fitBounds(bounds)
}

function OsmMapCanvas({
  origin,
  dest,
  outboundPath,
  inboundPath,
  onPinsChange,
}: MapViewProps) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<{
    map?: import('leaflet').Map
    originMarker?: import('leaflet').Marker
    destMarker?: import('leaflet').Marker
    outLine?: import('leaflet').Polyline
    inLine?: import('leaflet').Polyline
  }>({})

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    let cancelled = false
    void import('leaflet').then(async (L) => {
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !elRef.current) return
      const center = origin ?? dest ?? { lat: 23.6, lng: -102.5 }
      const map = L.map(elRef.current).setView(
        [center.lat, center.lng],
        origin && dest ? 7 : 5,
      )
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map)
      const originIcon = L.divIcon({
        className: 'map-pin map-pin-a',
        html: 'A',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
      const destIcon = L.divIcon({
        className: 'map-pin map-pin-b',
        html: 'B',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
      const originMarker = L.marker([center.lat, center.lng], {
        draggable: true,
        icon: originIcon,
      }).addTo(map)
      const destMarker = L.marker([center.lat, center.lng], {
        draggable: true,
        icon: destIcon,
      }).addTo(map)
      originMarker.on('dragend', () => {
        const o = originMarker.getLatLng()
        const d = destMarker.getLatLng()
        onPinsChange({ lat: o.lat, lng: o.lng }, { lat: d.lat, lng: d.lng })
      })
      destMarker.on('dragend', () => {
        const o = originMarker.getLatLng()
        const d = destMarker.getLatLng()
        onPinsChange({ lat: o.lat, lng: o.lng }, { lat: d.lat, lng: d.lng })
      })
      mapRef.current = {
        map,
        originMarker,
        destMarker,
        outLine: L.polyline([], { color: '#1c4b73', weight: 4 }).addTo(map),
        inLine: L.polyline([], { color: '#8a4b12', weight: 3, opacity: 0.7 }).addTo(map),
      }
      syncOsm(mapRef.current, origin, dest, outboundPath, inboundPath)
    })
    return () => {
      cancelled = true
      mapRef.current.map?.remove()
      mapRef.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    syncOsm(mapRef.current, origin, dest, outboundPath, inboundPath)
  }, [origin, dest, outboundPath, inboundPath])

  return <div className="route-map" ref={elRef} role="img" aria-label="Mapa de la ruta" />
}

function syncOsm(
  refs: {
    map?: import('leaflet').Map
    originMarker?: import('leaflet').Marker
    destMarker?: import('leaflet').Marker
    outLine?: import('leaflet').Polyline
    inLine?: import('leaflet').Polyline
  },
  origin?: LatLng,
  dest?: LatLng,
  outboundPath?: LatLng[],
  inboundPath?: LatLng[],
) {
  if (!refs.map) return
  if (origin) refs.originMarker?.setLatLng([origin.lat, origin.lng])
  if (dest) refs.destMarker?.setLatLng([dest.lat, dest.lng])
  refs.outLine?.setLatLngs((outboundPath ?? []).map((p) => [p.lat, p.lng]))
  refs.inLine?.setLatLngs((inboundPath ?? []).map((p) => [p.lat, p.lng]))
  const pts = [...(outboundPath ?? []), ...(inboundPath ?? [])]
  if (origin) pts.push(origin)
  if (dest) pts.push(dest)
  if (pts.length >= 2) {
    refs.map.fitBounds(pts.map((p) => [p.lat, p.lng]) as [number, number][])
  }
}
