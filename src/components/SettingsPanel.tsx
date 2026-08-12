import { useState, type FormEvent } from 'react'
import {
  clearStoredApiKey,
  loadStoredApiKey,
  saveStoredApiKey,
} from '../lib/storage'

type SettingsPanelProps = {
  onApiKeyChange: () => void
}

export function SettingsPanel({ onApiKeyChange }: SettingsPanelProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => loadStoredApiKey() ?? '')
  const [savedHint, setSavedHint] = useState<string | null>(null)

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
          <p className="section-lead">
            API key de Google (Distance Matrix). Tiene prioridad sobre{' '}
            <code>config.js</code>. Nunca se sube al repositorio.
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
        </div>
      ) : null}
    </section>
  )
}
