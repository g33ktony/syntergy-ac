/// <reference types="vite/client" />

type SyntergyAcConfig = {
  googleMapsApiKey?: string
}

interface Window {
  SYNTERGY_AC_CONFIG?: SyntergyAcConfig
}
