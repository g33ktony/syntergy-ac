import { useState, type FormEvent } from 'react'
import { addCustomRoute, removeCustomRoute } from '../lib/storage'
import type { Route } from '../types'
import { routeLabel } from '../data/routes'

type RouteManagerProps = {
  customRoutes: Route[]
  onCustomRoutesChange: (routes: Route[]) => void
  onRouteCreated?: (route: Route) => void
}

export function RouteManager({
  customRoutes,
  onCustomRoutesChange,
  onRouteCreated,
}: RouteManagerProps) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [km, setKm] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const distanceKm = Number(km)
    if (!from.trim() || !to.trim()) {
      setError('Indica ciudad A y ciudad B.')
      return
    }
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
      setError('Los kilómetros deben ser un número mayor a 0.')
      return
    }

    const route = addCustomRoute({
      from,
      to,
      distanceKm,
    })
    const next = [...customRoutes, route]
    onCustomRoutesChange(next)
    onRouteCreated?.(route)
    setFrom('')
    setTo('')
    setKm('')
  }

  function handleRemove(id: string) {
    const next = removeCustomRoute(id)
    onCustomRoutesChange(next)
  }

  return (
    <section className="route-manager" aria-labelledby="route-manager-heading">
      <h2 id="route-manager-heading">Agregar ruta</h2>
      <p className="section-lead">
        Ciudad A, ciudad B y km. Se guarda en este navegador.
      </p>

      <form className="route-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Desde</span>
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Ej. CDMX"
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>Hasta</span>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Ej. Querétaro"
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>Kilómetros</span>
          <input
            type="number"
            min={1}
            step={1}
            value={km}
            onChange={(e) => setKm(e.target.value)}
            placeholder="220"
          />
        </label>
        <button type="submit" className="btn-primary">
          Guardar ruta
        </button>
      </form>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {customRoutes.length > 0 ? (
        <ul className="custom-route-list">
          {customRoutes.map((route) => (
            <li key={route.id}>
              <span>{routeLabel(route)}</span>
              <button
                type="button"
                className="btn-text"
                onClick={() => handleRemove(route.id)}
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
