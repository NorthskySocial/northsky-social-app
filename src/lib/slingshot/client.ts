import {BRAND} from '#/brand/config'
import {type SlingshotMiniDoc, type SlingshotRecord} from './types'

// northsky: service host is configurable via the brand module
export const SLINGSHOT_SERVICE = BRAND.slingshotServiceUrl

const TIMEOUT_MS = 5_000
const MAX_CONCURRENT = 5

// Simple semaphore for concurrency limiting
let active = 0
const waiting: Array<() => void> = []

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++
    return Promise.resolve()
  }
  return new Promise(resolve => {
    waiting.push(resolve)
  })
}

function release() {
  active--
  const next = waiting.shift()
  if (next) {
    active++
    next()
  }
}

async function slingshotFetch(url: string): Promise<Response> {
  await acquire()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(url, {signal: controller.signal})
      return res
    } finally {
      clearTimeout(timeout)
    }
  } finally {
    release()
  }
}

export async function getRecordByUri(
  atUri: string,
): Promise<SlingshotRecord | undefined> {
  try {
    const url = `${SLINGSHOT_SERVICE}/xrpc/blue.microcosm.repo.getRecordByUri?at_uri=${encodeURIComponent(atUri)}`
    const res = await slingshotFetch(url)
    if (!res.ok) return undefined
    return (await res.json()) as SlingshotRecord
  } catch {
    return undefined
  }
}

export async function resolveMiniDoc(
  identifier: string,
): Promise<SlingshotMiniDoc | undefined> {
  try {
    const url = `${SLINGSHOT_SERVICE}/xrpc/blue.microcosm.identity.resolveMiniDoc?identifier=${encodeURIComponent(identifier)}`
    const res = await slingshotFetch(url)
    if (!res.ok) return undefined
    return (await res.json()) as SlingshotMiniDoc
  } catch {
    return undefined
  }
}
