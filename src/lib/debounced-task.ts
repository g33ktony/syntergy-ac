export type DebouncedTask = {
  schedule: (fn: (isStale: () => boolean) => void, delayMs: number) => void
  cancel: () => void
}

/** One pending timeout at a time; cancel drops it so a later action can win. */
export function createDebouncedTask(): DebouncedTask {
  let timer: ReturnType<typeof setTimeout> | null = null
  let generation = 0

  return {
    schedule(fn, delayMs) {
      if (timer != null) clearTimeout(timer)
      const scheduled = ++generation
      timer = setTimeout(() => {
        timer = null
        fn(() => scheduled !== generation)
      }, delayMs)
    },
    cancel() {
      generation += 1
      if (timer != null) {
        clearTimeout(timer)
        timer = null
      }
    },
  }
}
