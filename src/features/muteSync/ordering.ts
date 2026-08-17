/*
 * Reconciliation reads a snapshot of both appviews and writes later. Without
 * ordering, an import write can restore a mute that the user removed after
 * the snapshot was read. Both user mute writes and import writes run through
 * this module, so a user action always wins.
 *
 * Two rules do that work:
 *  - Writes for one subject run in order, so a user write lands after an
 *    import write that is already in flight for the same subject.
 *  - A user write during a reconciliation run drops that subject from the
 *    run's remaining imports.
 *
 * A subject is an actor DID or a mute list URI.
 */

/** Subjects the user changed while a reconciliation run is active. */
let userWrites: Set<string> | null = null
let activeRuns = 0

/** Tail of the write chain per subject. The stored promise never rejects. */
const chainTails = new Map<string, Promise<void>>()

function enqueue<T>(subject: string, write: () => Promise<T>): Promise<T> {
  const prior = chainTails.get(subject) ?? Promise.resolve()
  const run = prior.then(write)
  const settled = run.then(
    () => {},
    () => {},
  )
  chainTails.set(subject, settled)
  void settled.then(() => {
    if (chainTails.get(subject) === settled) {
      chainTails.delete(subject)
    }
  })
  return run
}

/**
 * Runs a mute write the user asked for. The subject is marked before the
 * write starts, so a concurrent reconciliation run cannot import a stale
 * mute for it.
 */
export function runUserMuteWrite<T>(
  subject: string,
  write: () => Promise<T>,
): Promise<T> {
  userWrites?.add(subject)
  return enqueue(subject, write)
}

/**
 * Runs one import write from a reconciliation snapshot. The write is dropped
 * when the user changed the same subject during the run. The check runs when
 * the write reaches the front of the subject's chain, not when it is queued.
 */
export function runImportMuteWrite(
  subject: string,
  write: () => Promise<unknown>,
): Promise<'written' | 'superseded'> {
  return enqueue(subject, async () => {
    if (userWrites?.has(subject)) {
      return 'superseded'
    }
    await write()
    return 'written'
  })
}

/** Tracks user mute writes for the length of one reconciliation run. */
export async function trackUserMuteWrites<T>(
  run: () => Promise<T>,
): Promise<T> {
  activeRuns++
  userWrites ??= new Set()
  try {
    return await run()
  } finally {
    activeRuns--
    if (activeRuns === 0) {
      userWrites = null
    }
  }
}
