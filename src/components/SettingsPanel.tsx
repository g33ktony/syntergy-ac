import { useState, type FormEvent } from 'react'
import {
  clearStoredAbrpApiKey,
  clearStoredApiKey,
  clearStoredOcmApiKey,
  clearStoredOrsApiKey,
  loadStoredAbrpApiKey,
  loadStoredApiKey,
  loadStoredOcmApiKey,
  loadStoredOrsApiKey,
  saveRouteSourcePreference,
  saveStoredAbrpApiKey,
  saveStoredApiKey,
  saveStoredOcmApiKey,
  saveStoredOrsApiKey,
  saveUnitSystem,
} from '../lib/storage'
import type { RouteSourcePreference, UnitSystem } from '../types'

type SettingsPanelProps = {
  onApiKeyChange: () => void
  unitSystem: UnitSystem
  onUnitSystemChange: (next: UnitSystem) => void
  routeSourcePreference: RouteSourcePreference
  onRouteSourcePreferenceChange: (next: RouteSourcePreference) => void
}

export function SettingsPanel({
  onApiKeyChange,
  unitSystem,
  onUnitSystemChange,
  routeSourcePreference,
  onRouteSourcePreferenceChange,
}: SettingsPanelProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => loadStoredApiKey() ?? '')
  const [savedHint, setSavedHint] = useState<string | null>(null)
  const [abrpDraft, setAbrpDraft] = useState(() => loadStoredAbrpApiKey() ?? '')
  const [abrpSavedHint, setAbrpSavedHint] = useState<string | null>(null)
  const [orsDraft, setOrsDraft] = useState(() => loadStoredOrsApiKey() ?? '')
  const [orsSavedHint, setOrsSavedHint] = useState<string | null>(null)
  const [ocmDraft, setOcmDraft] = useState(() => loadStoredOcmApiKey() ?? '')
  const [ocmSavedHint, setOcmSavedHint] = useState<string | null>(null)

  function handleSave(e: FormEvent) {
    e.preventDefault()
    saveStoredApiKey(draft)
    setSavedHint(
      draft.trim()
        ? 'Clave guardada en este navegador.'
        : 'Clave eliminada. Se usará config.js si existe.',
    )
    onApiKeyChange()
  }

  function handleClear() {
    clearStoredApiKey()
    setDraft('')
    setSavedHint('Clave eliminada. Se usará config.js si existe.')
    onApiKeyChange()
  }

  function handleAbrpSave(e: FormEvent) {
    e.preventDefault()
    saveStoredAbrpApiKey(abrpDraft)
    setAbrpSavedHint(
      abrpDraft.trim()
        ? 'Clave guardada en este navegador.'
        : 'Clave eliminada. Se usará config.js si existe.',
    )
    onApiKeyChange()
  }

  function handleAbrpClear() {
    clearStoredAbrpApiKey()
    setAbrpDraft('')
    setAbrpSavedHint('Clave eliminada. Se usará config.js si existe.')
    onApiKeyChange()
  }

  function handleUnitSystem(next: UnitSystem) {
    saveUnitSystem(next)
    onUnitSystemChange(next)
  }

  function handleRouteSourcePreference(next: RouteSourcePreference) {
    saveRouteSourcePreference(next)
    onRouteSourcePreferenceChange(next)
  }

  return (
    <section className="settings-panel" aria-labelledby="settings-heading">
      <button
        type="button"
        className="btn-text settings-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Ocultar ajustes' : 'Ajustes'}
      </button>

      {open ? (
        <div className="settings-body">
          <h2 id="settings-heading">Ajustes</h2>

          <fieldset className="settings-fieldset">
            <legend>Unidades</legend>
            <p className="section-lead">
              Solo cambia km/mi, L/gal, etc. La interfaz sigue en español.
            </p>
            <div className="segmented" role="group" aria-label="Sistema de unidades">
              <button
                type="button"
                className={unitSystem === 'metric' ? 'seg active' : 'seg'}
                aria-pressed={unitSystem === 'metric'}
                onClick={() => handleUnitSystem('metric')}
              >
                México (métrico)
              </button>
              <button
                type="button"
                className={unitSystem === 'imperial' ? 'seg active' : 'seg'}
                aria-pressed={unitSystem === 'imperial'}
                onClick={() => handleUnitSystem('imperial')}
              >
                EE.UU. (imperial)
              </button>
            </div>
          </fieldset>

          <p className="section-lead">
            API key de Google (Maps JS, Directions, Places, Elevation). Tiene
            prioridad sobre <code>config.js</code>. Nunca se sube al
            repositorio.
          </p>
          <form className="settings-form" onSubmit={handleSave}>
            <label className="field">
              <span>Google Maps API key</span>
              <input
                type="password"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="AIza…"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <div className="btn-row">
              <button type="submit" className="btn-primary">
                Guardar clave
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleClear}
              >
                Borrar clave
              </button>
            </div>
          </form>
          {savedHint ? <p className="form-hint">{savedHint}</p> : null}

          <p className="section-lead">
            API key de ABRP (A Better Route Planner). Producto de pago con
            acceso de partner (contacta a Iternio) — sin clave, esta opción
            queda oculta y la app sigue usando Google/rutas manuales. Tiene
            prioridad sobre <code>config.js</code>. Nunca se sube al
            repositorio.
          </p>
          <form className="settings-form" onSubmit={handleAbrpSave}>
            <label className="field">
              <span>ABRP API key</span>
              <input
                type="password"
                value={abrpDraft}
                onChange={(e) => setAbrpDraft(e.target.value)}
                placeholder="abrp-…"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <div className="btn-row">
              <button type="submit" className="btn-primary">
                Guardar clave
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleAbrpClear}
              >
                Borrar clave
              </button>
            </div>
          </form>
          {abrpSavedHint ? <p className="form-hint">{abrpSavedHint}</p> : null}

          <p className="section-lead">
            OpenRouteService (cuenta gratis). Sin esta clave se usa OSRM
            público. Nunca se sube al repositorio.
          </p>
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault()
              saveStoredOrsApiKey(orsDraft)
              setOrsSavedHint(
                orsDraft.trim()
                  ? 'Clave guardada en este navegador.'
                  : 'Clave eliminada. Se usará config.js si existe.',
              )
              onApiKeyChange()
            }}
          >
            <label className="field">
              <span>OpenRouteService API key</span>
              <input
                type="password"
                value={orsDraft}
                onChange={(e) => setOrsDraft(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <div className="btn-row">
              <button type="submit" className="btn-primary">
                Guardar clave
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  clearStoredOrsApiKey()
                  setOrsDraft('')
                  setOrsSavedHint('Clave eliminada. Se usará config.js si existe.')
                  onApiKeyChange()
                }}
              >
                Borrar clave
              </button>
            </div>
          </form>
          {orsSavedHint ? <p className="form-hint">{orsSavedHint}</p> : null}

          <p className="section-lead">
            OpenChargeMap (cuenta gratis) para cargadores en la ruta.
          </p>
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault()
              saveStoredOcmApiKey(ocmDraft)
              setOcmSavedHint(
                ocmDraft.trim()
                  ? 'Clave guardada en este navegador.'
                  : 'Clave eliminada. Se usará config.js si existe.',
              )
              onApiKeyChange()
            }}
          >
            <label className="field">
              <span>OpenChargeMap API key</span>
              <input
                type="password"
                value={ocmDraft}
                onChange={(e) => setOcmDraft(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <div className="btn-row">
              <button type="submit" className="btn-primary">
                Guardar clave
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  clearStoredOcmApiKey()
                  setOcmDraft('')
                  setOcmSavedHint('Clave eliminada. Se usará config.js si existe.')
                  onApiKeyChange()
                }}
              >
                Borrar clave
              </button>
            </div>
          </form>
          {ocmSavedHint ? <p className="form-hint">{ocmSavedHint}</p> : null}

          {abrpDraft.trim() ? (
            <fieldset className="settings-fieldset">
              <legend>Fuente de rutas</legend>
              <p className="section-lead">
                Con clave de ABRP puedes elegir de dónde vienen los datos de
                ruta (distancia, duración y, cuando ABRP los dé, elevación /
                límites de velocidad).
              </p>
              <div
                className="segmented"
                role="group"
                aria-label="Fuente de rutas"
              >
                <button
                  type="button"
                  className={
                    routeSourcePreference === 'google' ? 'seg active' : 'seg'
                  }
                  aria-pressed={routeSourcePreference === 'google'}
                  onClick={() => handleRouteSourcePreference('google')}
                >
                  Google
                </button>
                <button
                  type="button"
                  className={
                    routeSourcePreference === 'abrp' ? 'seg active' : 'seg'
                  }
                  aria-pressed={routeSourcePreference === 'abrp'}
                  onClick={() => handleRouteSourcePreference('abrp')}
                >
                  ABRP
                </button>
                <button
                  type="button"
                  className={
                    routeSourcePreference === 'both' ? 'seg active' : 'seg'
                  }
                  aria-pressed={routeSourcePreference === 'both'}
                  onClick={() => handleRouteSourcePreference('both')}
                >
                  Ambas
                </button>
              </div>
            </fieldset>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
