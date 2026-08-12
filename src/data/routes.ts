import type { Route } from '../types'

/** Precargadas: tramos comunes en México (km aproximados carretera). */
export const presetRoutes: Route[] = [
  {
    id: 'cdmx-queretaro',
    from: 'CDMX',
    to: 'Querétaro',
    distanceKm: 220,
    source: 'preset',
    driveHoursOneWay: 2.5,
  },
  {
    id: 'cdmx-puebla',
    from: 'CDMX',
    to: 'Puebla',
    distanceKm: 130,
    source: 'preset',
    driveHoursOneWay: 1.75,
  },
  {
    id: 'cdmx-toluca',
    from: 'CDMX',
    to: 'Toluca',
    distanceKm: 70,
    source: 'preset',
    driveHoursOneWay: 1.1,
  },
  {
    id: 'cdmx-cuernavaca',
    from: 'CDMX',
    to: 'Cuernavaca',
    distanceKm: 85,
    source: 'preset',
    driveHoursOneWay: 1.25,
  },
  {
    id: 'cdmx-morelia',
    from: 'CDMX',
    to: 'Morelia',
    distanceKm: 310,
    source: 'preset',
    driveHoursOneWay: 3.75,
  },
  {
    id: 'gdl-cdmx',
    from: 'Guadalajara',
    to: 'CDMX',
    distanceKm: 540,
    source: 'preset',
    driveHoursOneWay: 6.5,
  },
  {
    id: 'gdl-vallarta',
    from: 'Guadalajara',
    to: 'Puerto Vallarta',
    distanceKm: 300,
    source: 'preset',
    driveHoursOneWay: 3.75,
  },
  {
    id: 'mty-cdmx',
    from: 'Monterrey',
    to: 'CDMX',
    distanceKm: 900,
    source: 'preset',
    driveHoursOneWay: 10.5,
  },
  {
    id: 'mty-saltillo',
    from: 'Monterrey',
    to: 'Saltillo',
    distanceKm: 85,
    source: 'preset',
    driveHoursOneWay: 1.1,
  },
  {
    id: 'leon-gdl',
    from: 'León',
    to: 'Guadalajara',
    distanceKm: 220,
    source: 'preset',
    driveHoursOneWay: 2.75,
  },
]

export function routeLabel(route: Route): string {
  return `${route.from} → ${route.to} (${route.distanceKm} km)`
}
