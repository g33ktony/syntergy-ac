import type { Route } from '../types'

type DistanceMatrixResponse = {
  distanceKm: number
  driveHoursOneWay: number
}

type GoogleDistanceMatrixService = {
  getDistanceMatrix: (
    request: {
      origins: string[]
      destinations: string[]
      travelMode: string
      unitSystem: number
    },
    callback: (
      response: {
        rows?: Array<{
          elements?: Array<{
            status: string
            distance?: { value: number }
            duration?: { value: number }
          }>
        }>
      } | null,
      status: string,
    ) => void,
  ) => void
}

type GoogleMapsNamespace = {
  maps: {
    DistanceMatrixService: new () => GoogleDistanceMatrixService
    TravelMode: { DRIVING: string }
    UnitSystem: { METRIC: number }
  }
}

declare global {
  interface Window {
    google?: GoogleMapsNamespace
    __syntergyAcMapsReady?: () => void
  }
}

let mapsLoadPromise: Promise<void> | null = null

function loadMapsJs(apiKey: string): Promise<void> {
  if (window.google?.maps?.DistanceMatrixService) {
    return Promise.resolve()
  }
  if (mapsLoadPromise) return mapsLoadPromise

  mapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-syntergy-maps]',
    )
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () =>
        reject(new Error('No se pudo cargar Google Maps')),
      )
      return
    }

    const callbackName = '__syntergyAcMapsReady'
    window[callbackName] = () => {
      delete window[callbackName]
      resolve()
    }

    const script = document.createElement('script')
    script.dataset.syntergyMaps = '1'
    script.async = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}`
    script.onerror = () => {
      mapsLoadPromise = null
      reject(new Error('No se pudo cargar Google Maps'))
    }
    document.head.appendChild(script)
  })

  return mapsLoadPromise
}

/**
 * Consulta Distance Matrix (JS API) para origen → destino.
 * Lanza Error con mensaje en español si falla.
 */
export async function fetchRouteDistance(
  from: string,
  to: string,
  apiKey: string,
): Promise<DistanceMatrixResponse> {
  const origin = from.trim()
  const destination = to.trim()
  if (!origin || !destination) {
    throw new Error('Indica ciudad de origen y destino')
  }

  await loadMapsJs(apiKey)
  const maps = window.google?.maps
  if (!maps?.DistanceMatrixService) {
    throw new Error('Google Maps no está disponible')
  }

  const service = new maps.DistanceMatrixService()

  return new Promise((resolve, reject) => {
    service.getDistanceMatrix(
      {
        origins: [origin],
        destinations: [destination],
        travelMode: maps.TravelMode.DRIVING,
        unitSystem: maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status !== 'OK' || !response?.rows?.[0]?.elements?.[0]) {
          reject(
            new Error(
              'No se pudo obtener la distancia. Prueba con nombres más específicos o km manual.',
            ),
          )
          return
        }

        const element = response.rows[0].elements[0]
        if (element.status !== 'OK' || !element.distance || !element.duration) {
          reject(
            new Error(
              'Ruta no encontrada. Usa una ruta precargada o agrega km manualmente.',
            ),
          )
          return
        }

        resolve({
          distanceKm: Math.round(element.distance.value / 1000),
          driveHoursOneWay: element.duration.value / 3600,
        })
      },
    )
  })
}

export function makeGoogleRoute(
  from: string,
  to: string,
  distanceKm: number,
  driveHoursOneWay: number,
): Route {
  return {
    id: `google-${Date.now()}`,
    from: from.trim(),
    to: to.trim(),
    distanceKm,
    source: 'google',
    driveHoursOneWay,
  }
}
