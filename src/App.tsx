import { vehicles } from './data/vehicles'
import './App.css'

function App() {
  return (
    <main className="app">
      <header className="app-header">
        <h1>Syntergy AC</h1>
        <p className="tagline">
          Compara autonomía y costo de viaje (fase 1 — núcleo BEV).
        </p>
      </header>

      <section className="catalog" aria-labelledby="catalog-heading">
        <h2 id="catalog-heading">Catálogo BEV (v1)</h2>
        <ul className="vehicle-list">
          {vehicles.map((vehicle) => (
            <li key={vehicle.id}>
              <strong>
                {vehicle.brand} {vehicle.model}
              </strong>{' '}
              <span className="type">{vehicle.type}</span>
              <ul className="versions">
                {vehicle.versions.map((version) => (
                  <li key={version.id}>
                    {version.name}: {version.batteryKWh} kWh ·{' '}
                    {version.rangeKmOfficial} km · {version.connector}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
