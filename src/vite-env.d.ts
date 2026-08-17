/// <reference types="vite/client" />

type SyntergyAcConfig = {
  googleMapsApiKey?: string
  /** See src/lib/providers/abrp.ts — Planning API is partner-gated. */
  abrpApiKey?: string
  openRouteServiceApiKey?: string
  openChargeMapApiKey?: string
}

interface Window {
  SYNTERGY_AC_CONFIG?: SyntergyAcConfig
}
