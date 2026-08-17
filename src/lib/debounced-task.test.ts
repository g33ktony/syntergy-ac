import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDebouncedTask } from './debounced-task'

describe('createDebouncedTask', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not run a pending pin-drag lookup after cancel (named-route apply)', () => {
    vi.useFakeTimers()
    const task = createDebouncedTask()
    const lookup = vi.fn()

    task.schedule(lookup, 800)
    task.cancel()
    vi.advanceTimersByTime(800)

    expect(lookup).not.toHaveBeenCalled()
  })

  it('runs the scheduled callback after the delay when not cancelled', () => {
    vi.useFakeTimers()
    const task = createDebouncedTask()
    const lookup = vi.fn()

    task.schedule(lookup, 800)
    vi.advanceTimersByTime(799)
    expect(lookup).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(lookup).toHaveBeenCalledTimes(1)
  })

  it('replaces a pending callback when scheduled again', () => {
    vi.useFakeTimers()
    const task = createDebouncedTask()
    const first = vi.fn()
    const second = vi.fn()

    task.schedule(first, 800)
    vi.advanceTimersByTime(400)
    task.schedule(second, 800)
    vi.advanceTimersByTime(800)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('lets in-flight work detect cancel after the timer already fired', () => {
    vi.useFakeTimers()
    const task = createDebouncedTask()
    let isStale: (() => boolean) | undefined

    task.schedule((stale) => {
      isStale = stale
    }, 800)
    vi.advanceTimersByTime(800)

    expect(isStale?.()).toBe(false)
    task.cancel()
    expect(isStale?.()).toBe(true)
  })
})
