import { loadStoredAbrpApiKey, loadStoredApiKey } from './storage'

function configFileKey(): string | null {
  const key = window.SYNTERGY_AC_CONFIG?.googleMapsApiKey?.trim()
  return key && key.length > 0 ? key : null
}

/**
 * Preferencia: override de Ajustes (localStorage) > config.js.
 */
export function getGoogleApiKey(): string | null {
  return loadStoredApiKey() ?? configFileKey()
}

export function hasGoogleApiKey(): boolean {
  return getGoogleApiKey() != null
}

function configFileAbrpKey(): string | null {
  const key = window.SYNTERGY_AC_CONFIG?.abrpApiKey?.trim()
  return key && key.length > 0 ? key : null
}

/**
 * Preferencia: override de Ajustes (localStorage) > config.js.
 * See `src/lib/providers/abrp.ts` for the caveat that ABRP's Planning API
 * is partner-gated — having a key configured doesn't guarantee the
 * endpoint/response shape here matches Iternio's real contract yet.
 */
export function getAbrpApiKey(): string | null {
  return loadStoredAbrpApiKey() ?? configFileAbrpKey()
}

export function hasAbrpApiKey(): boolean {
  return getAbrpApiKey() != null
}
