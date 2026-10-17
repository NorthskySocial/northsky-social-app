/**
 * Keeps this app from piling onto the Bluemoji AppView.
 *
 * - **Concurrency cap.** A feed screen can name dozens of distinct emoji; they
 *   are queued rather than fired at once.
 * - **Circuit breaker.** After a run of failures the gate opens and rejects
 *   immediately for a cool-down, so an AppView that is struggling is not
 *   hammered by every mounted emoji retrying. Emoji fall back to their
 *   `:alias:` text meanwhile, and retry once the cool-down passes.
 *
 * Only transport and 5xx failures count. A 404 is a normal answer.
 */
export class CircuitOpenError extends Error {
  constructor() {
    super('Bluemoji AppView temporarily unavailable')
    this.name = 'CircuitOpenError'
  }
}

export class RequestGate {
  private active = 0
  private queue: (() => void)[] = []
  private failures = 0
  private openUntil = 0

  constructor(
    private readonly opts: {
      maxConcurrent: number
      failureThreshold: number
      cooldownMs: number
      now?: () => number
    },
  ) {}

  private now() {
    return (this.opts.now ?? Date.now)()
  }

  get isOpen() {
    return this.now() < this.openUntil
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.isOpen) throw new CircuitOpenError()
    await this.acquire()
    try {
      // The breaker may have opened while this task waited its turn.
      if (this.isOpen) throw new CircuitOpenError()
      const result = await task()
      this.failures = 0
      return result
    } catch (e) {
      if (!(e instanceof CircuitOpenError) && isCountable(e))
        this.recordFailure()
      throw e
    } finally {
      this.release()
    }
  }

  private recordFailure() {
    this.failures++
    if (this.failures >= this.opts.failureThreshold) {
      this.openUntil = this.now() + this.opts.cooldownMs
      this.failures = 0
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.opts.maxConcurrent) {
      this.active++
      return Promise.resolve()
    }
    return new Promise(resolve => this.queue.push(resolve))
  }

  private release() {
    const next = this.queue.shift()
    if (next) next()
    else this.active--
  }
}

/** Aborted requests are the caller's doing, not the server's. */
function isCountable(e: unknown) {
  return !(e instanceof DOMException && e.name === 'AbortError')
}
