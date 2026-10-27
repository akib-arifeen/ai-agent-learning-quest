import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const next = vi.hoisted(() => ({ after: vi.fn<(task: () => void | Promise<void>) => void>() }))
vi.mock('next/server', () => ({ after: next.after }))

import { runAfter } from '../after'

let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  errorSpy.mockRestore()
})

describe('runAfter', () => {
  it('schedules the task with Next after when available', async () => {
    let scheduled: (() => void | Promise<void>) | undefined
    next.after.mockImplementation((task) => {
      scheduled = task
    })
    const task = vi.fn(async () => undefined)

    runAfter(task)
    expect(next.after).toHaveBeenCalledTimes(1)
    expect(task).not.toHaveBeenCalled()

    await scheduled?.()
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('runs the task directly when after is unavailable outside a request', async () => {
    next.after.mockImplementation(() => {
      throw new Error('after() was called outside a request scope')
    })
    const task = vi.fn(async () => undefined)

    runAfter(task)
    await Promise.resolve()
    await Promise.resolve()
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('catches and logs a rejected background task', async () => {
    let scheduled: (() => void | Promise<void>) | undefined
    next.after.mockImplementation((task) => {
      scheduled = task
    })
    const task = vi.fn(async () => {
      throw new Error('background boom')
    })

    runAfter(task)
    await scheduled?.()

    expect(errorSpy).toHaveBeenCalledWith('background task failed', expect.any(Error))
  })
})
