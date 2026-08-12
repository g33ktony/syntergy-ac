import type { Route } from '../types'

const CUSTOM_ROUTES_KEY = 'syntergy-ac:custom-routes'
const API_KEY_KEY = 'syntergy-ac:google-api-key'

function canUseStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

export function loadCustomRoutes(): Route[] {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(CUSTOM_ROUTES_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isRoute)
  } catch {
    return []
  }
}

export function saveCustomRoutes(routes: Route[]): void {
  if (!canUseStorage()) return
  localStorage.setItem(CUSTOM_ROUTES_KEY, JSON.stringify(routes))
}

export function addCustomRoute(input: {
  from: string
  to: string
  distanceKm: number
  driveHoursOneWay?: number
}): Route {
  const route: Route = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from: input.from.trim(),
    to: input.to.trim(),
    distanceKm: input.distanceKm,
    source: 'custom',
    driveHoursOneWay: input.driveHoursOneWay,
  }
  const next = [...loadCustomRoutes(), route]
  saveCustomRoutes(next)
  return route
}

export function removeCustomRoute(id: string): Route[] {
  const next = loadCustomRoutes().filter((r) => r.id !== id)
  saveCustomRoutes(next)
  return next
}

/** Returns stored UI key, or null if unset. */
export function loadStoredApiKey(): string | null {
  if (!canUseStorage()) return null
  const value = localStorage.getItem(API_KEY_KEY)
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function saveStoredApiKey(key: string): void {
  if (!canUseStorage()) return
  const trimmed = key.trim()
  if (trimmed.length === 0) {
    localStorage.removeItem(API_KEY_KEY)
    return
  }
  localStorage.setItem(API_KEY_KEY, trimmed)
}

export function clearStoredApiKey(): void {
  if (!canUseStorage()) return
  localStorage.removeItem(API_KEY_KEY)
}

function isRoute(value: unknown): value is Route {
  if (!value || typeof value !== 'object') return false
  const r = value as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.from === 'string' &&
    typeof r.to === 'string' &&
    typeof r.distanceKm === 'number' &&
    (r.source === 'preset' || r.source === 'custom' || r.source === 'google')
  )
}
