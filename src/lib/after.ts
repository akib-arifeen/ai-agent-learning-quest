import { after } from 'next/server'

/** Log background failures; never let them escape into the response or crash the instance. */
const report = (e: unknown) => console.error('background task failed', e)

/**
 * Run `task` after the response is sent when Next's request context supports it. Outside
 * a request (tests, scripts, a runtime without `after`) the task still runs, and all
 * rejections are caught and logged.
 */
export function runAfter(task: () => Promise<void>) {
  const run = () => Promise.resolve().then(task).catch(report)
  try {
    after(run)
  } catch {
    void run()
  }
}
