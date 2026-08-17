import {
  loadStoredAbrpApiKey,
  loadStoredApiKey,
  loadStoredOcmApiKey,
  loadStoredOrsApiKey,
} from './storage'

function configFileKey(): string | null {
  const key = window.SYNTERGY_AC_CONFIG?.googleMapsApiKey?.trim()
  return key && key.length > 0 ? key : null
}

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

export function getAbrpApiKey(): string | null {
  return loadStoredAbrpApiKey() ?? configFileAbrpKey()
}

export function hasAbrpApiKey(): boolean {
  return getAbrpApiKey() != null
}

function configFileOrsKey(): string | null {
  const key = window.SYNTERGY_AC_CONFIG?.openRouteServiceApiKey?.trim()
  return key && key.length > 0 ? key : null
}

export function getOrsApiKey(): string | null {
  return loadStoredOrsApiKey() ?? configFileOrsKey()
}

function configFileOcmKey(): string | null {
  const key = window.SYNTERGY_AC_CONFIG?.openChargeMapApiKey?.trim()
  return key && key.length > 0 ? key : null
}

export function getOpenChargeMapApiKey(): string | null {
  return loadStoredOcmApiKey() ?? configFileOcmKey()
}
