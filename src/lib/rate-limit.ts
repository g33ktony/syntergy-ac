/**
 * Browser-side 1 req/s queue for public geocoding/routing APIs.
 * Public OSRM / Photon / OpenTopoData ToS: do not hammer the demo servers.
 */
let chain: Promise<void> = Promise.resolve()
let lastAt = 0
const MIN_GAP_MS = import.meta.env.MODE === 'test' ? 0 : 1100

export function enqueuePublicRequest<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastAt))
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
    lastAt = Date.now()
    return fn()
  })
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}
