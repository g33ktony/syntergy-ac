/**
 * Optional Google Maps / Distance Matrix key.
 * Optional ABRP (A Better Route Planner) Planning API key — this is a paid,
 * partner-gated product from Iternio (contact@iternio.com); see
 * src/lib/providers/abrp.ts for details. Leaving it blank hides the ABRP
 * route-source option and the app works exactly as before.
 * Copy this file to public/config.js (gitignored) for local use.
 * Prefer Settings UI override > this file.
 *
 * window.SYNTERGY_AC_CONFIG = {
 *   googleMapsApiKey: '',
 *   abrpApiKey: '',
 *   openRouteServiceApiKey: '',
 *   openChargeMapApiKey: '',
 * };
 */
window.SYNTERGY_AC_CONFIG = {
  googleMapsApiKey: '',
  abrpApiKey: '',
  openRouteServiceApiKey: '',
  openChargeMapApiKey: '',
};
