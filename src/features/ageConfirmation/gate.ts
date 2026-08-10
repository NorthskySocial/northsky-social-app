import {useEffect} from 'react'

import {isAppPassword} from '#/lib/jwt'
import {logger} from '#/logger'
import {useSession} from '#/state/session'
import {ADULT_AGE_GATE_ENABLED} from '#/ageAssurance/const'
import {useOtherRequiredDataQuery} from '#/ageAssurance/data'
import {account, useStorage} from '#/storage'

/**
 * What the app must show before the current account can use it.
 *
 * - `none` lets the account through to the router.
 * - `confirm` blocks with the age questions.
 * - `appPasswordNotice` blocks with the limits an App Password session gets,
 *   which the person can accept or leave.
 */
export type AgeConfirmationGate = 'none' | 'confirm' | 'appPasswordNotice'

/**
 * `isAppPassword` calls `jwtDecode` without a guard, so an empty or malformed
 * token throws. Treat a token we cannot read as a normal session, because a
 * normal session can answer the questions and an App Password cannot.
 */
function isAppPasswordSession(accessJwt: string | undefined): boolean {
  if (!accessJwt) return false
  try {
    return isAppPassword(accessJwt)
  } catch {
    return false
  }
}

/**
 * Decides which gate the current account needs.
 *
 * A missing birthdate is the signal that the account has never declared an age.
 * The read behind it already accepts the `isOverAge13/16/18` flags that a PDS
 * derives, so an account that declared an age on another service passes
 * through.
 *
 * A failed or pending read returns `none` on purpose. The gate must never lock
 * an account out because the network failed. The next successful read applies
 * the gate.
 */
export function resolveAgeConfirmationGate({
  isGateEnabled,
  hasSession,
  isAppPasswordSession: isAppPassword,
  hasAcknowledgedNotice,
  isReadSuccessful,
  birthdate,
}: {
  isGateEnabled: boolean
  hasSession: boolean
  isAppPasswordSession: boolean
  hasAcknowledgedNotice: boolean
  isReadSuccessful: boolean
  birthdate: string | undefined
}): AgeConfirmationGate {
  if (!isGateEnabled) return 'none'
  if (!hasSession) return 'none'
  if (!isReadSuccessful) return 'none'
  if (birthdate) return 'none'
  if (isAppPassword) {
    return hasAcknowledgedNotice ? 'none' : 'appPasswordNotice'
  }
  return 'confirm'
}

/**
 * Reads the acknowledgement of the App Password notice for an account. The
 * empty scope keeps the hook unconditional while no account is signed in.
 */
export function useAppPasswordNoticeAcknowledgement(did: string | undefined) {
  return useStorage(account, [did ?? '', 'ageConfirmationNoticeAckAt'])
}

export function useAgeConfirmationGate(): AgeConfirmationGate {
  const {hasSession, currentAccount} = useSession()
  const {data, isSuccess, isError, error} = useOtherRequiredDataQuery()
  const [acknowledgedAt] = useAppPasswordNoticeAcknowledgement(
    currentAccount?.did,
  )

  useEffect(() => {
    if (!isError) return
    logger.warn(`ageConfirmation: could not read the declared age`, {
      safeMessage: (error as Error | undefined)?.message,
    })
  }, [isError, error])

  return resolveAgeConfirmationGate({
    isGateEnabled: ADULT_AGE_GATE_ENABLED,
    hasSession: hasSession && !!currentAccount,
    isAppPasswordSession: isAppPasswordSession(currentAccount?.accessJwt),
    hasAcknowledgedNotice: !!acknowledgedAt,
    isReadSuccessful: isSuccess,
    birthdate: data?.birthdate,
  })
}
