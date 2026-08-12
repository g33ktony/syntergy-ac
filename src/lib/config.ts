import { loadStoredApiKey } from './storage'

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
