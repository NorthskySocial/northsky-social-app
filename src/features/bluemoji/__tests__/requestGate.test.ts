import {describe, expect, it} from '@jest/globals'

import {CircuitOpenError, RequestGate} from '../requestGate'

const fail = () => Promise.reject(new Error('503'))

function gate(
  over: Partial<ConstructorParameters<typeof RequestGate>[0]> = {},
) {
  let t = 0
  const g = new RequestGate({
    maxConcurrent: 2,
    failureThreshold: 3,
    cooldownMs: 1000,
    now: () => t,
    ...over,
  })
  return {g, advance: (ms: number) => (t += ms)}
}

describe('RequestGate', () => {
  it('limits concurrency and drains the queue', async () => {
    const {g} = gate()
    let running = 0
    let peak = 0
    const task = async () => {
      running++
      peak = Math.max(peak, running)
      await new Promise(r => setTimeout(r, 5))
      running--
    }
    await Promise.all(Array.from({length: 8}, () => g.run(task)))
    expect(peak).toBe(2)
  })

  it('opens after consecutive failures, then recovers after the cool-down', async () => {
    const {g, advance} = gate()
    for (let i = 0; i < 3; i++) await g.run(fail).catch(() => {})
    expect(g.isOpen).toBe(true)

    const never = jest.fn(() => Promise.resolve(1))
    await expect(g.run(never)).rejects.toBeInstanceOf(CircuitOpenError)
    expect(never).not.toHaveBeenCalled()

    advance(1001)
    await expect(g.run(() => Promise.resolve('ok'))).resolves.toBe('ok')
  })

  it('a success resets the failure count', async () => {
    const {g} = gate()
    await g.run(fail).catch(() => {})
    await g.run(fail).catch(() => {})
    await g.run(() => Promise.resolve(1))
    await g.run(fail).catch(() => {})
    expect(g.isOpen).toBe(false)
  })

  it('does not count aborted requests as failures', async () => {
    const {g} = gate()
    const abort = () => Promise.reject(new DOMException('x', 'AbortError'))
    for (let i = 0; i < 5; i++) await g.run(abort).catch(() => {})
    expect(g.isOpen).toBe(false)
  })
})
