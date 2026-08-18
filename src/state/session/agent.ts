import {
  Agent as BaseAgent,
  type AppBskyActorProfile,
  AtpAgent,
  type AtprotoServiceType,
  type AtpSessionData,
  type AtpSessionEvent,
  type Did,
  type Un$Typed,
} from '@atproto/api'
import {TID} from '@atproto/common-web'

import {networkRetry} from '#/lib/async/retry'
import {
  BLUESKY_PROXY_HEADER,
  BSKY_SERVICE,
  DISCOVER_SAVED_FEED,
  IS_PROD_SERVICE,
  PUBLIC_BSKY_SERVICE,
  TIMELINE_SAVED_FEED,
} from '#/lib/constants'
import {logger} from '#/logger'
import {snoozeBirthdateUpdateAllowedForDid} from '#/state/birthdate'
import {restrictChatSettings} from '#/state/queries/messages/restrictChatSettings'
import {snoozeEmailConfirmationPrompt} from '#/state/shell/reminders'
import {
  prefetchAgeAssuranceServerData,
  setBirthdateForDid,
  setCreatedAtForDid,
} from '#/ageAssurance/data'
import {unsafeGetAndComputeAgeAssurance} from '#/ageAssurance/state'
import {features} from '#/analytics'
// northsky: PDS-to-appview routing
import {
  type AppView,
  FALLBACK_APPVIEW,
  resolveAppViewForService,
} from '#/brand/appview'
// northsky: mute state import from the fallback appview
import {reconcileMutes} from '#/features/muteSync'
import {emitNetworkConfirmed, emitNetworkLost} from '../events'
import {addSessionErrorLog} from './logging'
import {
  configureModerationForAccount,
  configureModerationForGuest,
} from './moderation'
import {type SessionAccount} from './types'
import {isSessionExpired, isSignupQueued} from './util'

export type ProxyHeaderValue = `${Did}#${AtprotoServiceType}`

/*
 * northsky: configure the `atproto-proxy` header on `agent` so PDS requests
 * for appview lexicons go to the appview routed for the hosting provider the
 * user selected at login, and store the resolved appview on `agent.appview`
 * for direct-to-appview call sites (notifications, age assurance). An E2E
 * override via BLUESKY_PROXY_HEADER takes precedence over the header only;
 * `agent.appview` still reflects the resolved route.
 */
export function configureAppviewProxy(agent: BskyAppAgent) {
  const resolved = resolveAppViewForService(agent.serviceUrl?.toString())
  agent.appview = resolved

  const override = BLUESKY_PROXY_HEADER.override
  if (override) {
    agent.configureProxy(override)
    return
  }
  agent.configureProxy(`${resolved.did}#bsky_appview`)
}

/**
 * northsky: returns the resolved appview for the given agent. Agents that
 * never went through configureAppviewProxy (e.g. the temporary agents built
 * for logout push-token cleanup) resolve from their service URL.
 */
export function getAppviewForAgent(agent: AtpAgent | BaseAgent): AppView {
  const appAgent = agent as BskyAppAgent
  return (
    appAgent.appview ??
    resolveAppViewForService(appAgent.serviceUrl?.toString())
  )
}

export function createPublicAgent() {
  configureModerationForGuest() // Side effect but only relevant for tests

  const agent = new BskyAppAgent({service: PUBLIC_BSKY_SERVICE})
  configureAppviewProxy(agent)
  return agent
}

export async function createAgentAndResume(
  storedAccount: SessionAccount,
  onSessionChange: (
    agent: AtpAgent,
    did: string,
    event: AtpSessionEvent,
  ) => void,
) {
  const agent = new BskyAppAgent({service: storedAccount.service})
  if (storedAccount.pdsUrl) {
    agent.sessionManager.pdsUrl = new URL(storedAccount.pdsUrl)
  }
  const gates = features.refresh({
    strategy: 'prefer-low-latency',
  })
  const moderation = configureModerationForAccount(agent, storedAccount)
  const prevSession: AtpSessionData = sessionAccountToSession(storedAccount)
  if (isSessionExpired(storedAccount)) {
    await networkRetry(1, () => agent.resumeSession(prevSession))
  } else {
    agent.sessionManager.session = prevSession
  }

  // after session is attached
  const aa = prefetchAgeAssuranceServerData({agent})

  configureAppviewProxy(agent)
  // northsky: import mute state from the fallback appview, best-effort
  void reconcileMutes(agent, agent.appview)

  return agent.prepare({
    resolvers: [gates, moderation, aa],
    onSessionChange,
  })
}

export async function createAgentAndLogin(
  {
    service,
    identifier,
    password,
    authFactorToken,
  }: {
    service: string
    identifier: string
    password: string
    authFactorToken?: string
  },
  onSessionChange: (
    agent: AtpAgent,
    did: string,
    event: AtpSessionEvent,
  ) => void,
) {
  const agent = new BskyAppAgent({service})
  await agent.login({
    identifier,
    password,
    authFactorToken,
    allowTakendown: true,
  })

  const account = agentToSessionAccountOrThrow(agent)
  const gates = features.refresh({strategy: 'prefer-fresh-gates'})
  const moderation = configureModerationForAccount(agent, account)
  const aa = prefetchAgeAssuranceServerData({agent})

  configureAppviewProxy(agent)
  // northsky: import mute state from the fallback appview, best-effort
  void reconcileMutes(agent, agent.appview)

  return agent.prepare({
    resolvers: [gates, moderation, aa],
    onSessionChange,
  })
}

export async function createAgentAndCreateAccount(
  {
    service,
    email,
    password,
    handle,
    birthDate,
    inviteCode,
    verificationPhone,
    verificationCode,
  }: {
    service: string
    email: string
    password: string
    handle: string
    birthDate: Date
    inviteCode?: string
    verificationPhone?: string
    verificationCode?: string
  },
  onSessionChange: (
    agent: AtpAgent,
    did: string,
    event: AtpSessionEvent,
  ) => void,
) {
  const agent = new BskyAppAgent({service})
  await agent.createAccount({
    email,
    password,
    handle,
    inviteCode,
    verificationPhone,
    verificationCode,
  })
  const account = agentToSessionAccountOrThrow(agent)
  const gates = features.refresh({strategy: 'prefer-fresh-gates'})
  const moderation = configureModerationForAccount(agent, account)

  const createdAt = new Date().toISOString()
  const birthdate = birthDate.toISOString()

  /*
   * Since we have a race with account creation, profile creation, and AA
   * state, set these values locally to ensure sync reads. Values are written
   * to the server in the next step, so on subsequent reloads, the server will
   * be the source of truth.
   */
  setCreatedAtForDid({did: account.did, createdAt})
  setBirthdateForDid({did: account.did, birthdate})
  snoozeBirthdateUpdateAllowedForDid(account.did)
  // do this last
  const aa = prefetchAgeAssuranceServerData({agent})

  // Not awaited so that we can still get into onboarding.
  // This is OK because we won't let you toggle adult stuff until you set the date.
  if (IS_PROD_SERVICE(service)) {
    void Promise.allSettled([
      networkRetry(3, () => {
        return agent.setPersonalDetails({
          birthDate: birthdate,
        })
      }).catch(e => {
        logger.info(`createAgentAndCreateAccount: failed to set birthDate`)
        throw e
      }),
      networkRetry(3, () => {
        return agent.upsertProfile(prev => {
          const next: Un$Typed<AppBskyActorProfile.Record> = prev || {}
          next.displayName = handle
          next.createdAt = createdAt
          return next
        })
      }).catch(e => {
        logger.info(
          `createAgentAndCreateAccount: failed to set initial profile`,
        )
        throw e
      }),
      networkRetry(1, () => {
        return agent.overwriteSavedFeeds([
          {
            ...DISCOVER_SAVED_FEED,
            id: TID.nextStr(),
          },
          {
            ...TIMELINE_SAVED_FEED,
            id: TID.nextStr(),
          },
        ])
      }).catch(e => {
        logger.info(`createAgentAndCreateAccount: failed to set initial feeds`)
        throw e
      }),
      // wait for AA data to load first, then check state
      aa.then(() => {
        const {flags} = unsafeGetAndComputeAgeAssurance({did: account.did})
        if (flags?.chatDisabled || flags?.groupChatDisabled) {
          void restrictChatSettings({
            agent,
            restrictIncoming: flags.chatDisabled,
            restrictGroupInvites: flags.groupChatDisabled,
          })
        }
      }),
    ]).then(promises => {
      const rejected = promises.filter(p => p.status === 'rejected')
      if (rejected.length > 0) {
        logger.error(
          `session: createAgentAndCreateAccount failed to save personal details and feeds`,
        )
      }
    })
  } else {
    void Promise.allSettled([
      networkRetry(3, () => {
        return agent.setPersonalDetails({
          birthDate: birthDate.toISOString(),
        })
      }).catch(e => {
        logger.info(`createAgentAndCreateAccount: failed to set birthDate`)
        throw e
      }),
      networkRetry(3, () => {
        return agent.upsertProfile(prev => {
          const next: Un$Typed<AppBskyActorProfile.Record> = prev || {}
          next.createdAt = prev?.createdAt || new Date().toISOString()
          return next
        })
      }).catch(e => {
        logger.info(
          `createAgentAndCreateAccount: failed to set initial profile`,
        )
        throw e
      }),
    ]).then(promises => {
      const rejected = promises.filter(p => p.status === 'rejected')
      if (rejected.length > 0) {
        logger.error(
          `session: createAgentAndCreateAccount failed to save personal details and feeds`,
        )
      }
    })
  }

  try {
    // snooze first prompt after signup, defer to next prompt
    snoozeEmailConfirmationPrompt()
  } catch (e: any) {
    logger.error(e, {message: `session: failed snoozeEmailConfirmationPrompt`})
  }

  configureAppviewProxy(agent)

  return agent.prepare({
    resolvers: [gates, moderation, aa],
    onSessionChange,
  })
}

export function agentToSessionAccountOrThrow(agent: AtpAgent): SessionAccount {
  const account = agentToSessionAccount(agent)
  if (!account) {
    throw Error('Expected an active session')
  }
  return account
}

export function agentToSessionAccount(
  agent: AtpAgent,
): SessionAccount | undefined {
  if (!agent.session) {
    return undefined
  }
  return {
    service: agent.serviceUrl.toString(),
    did: agent.session.did,
    handle: agent.session.handle,
    email: agent.session.email,
    emailConfirmed: agent.session.emailConfirmed || false,
    emailAuthFactor: agent.session.emailAuthFactor || false,
    refreshJwt: agent.session.refreshJwt,
    accessJwt: agent.session.accessJwt,
    signupQueued: isSignupQueued(agent.session.accessJwt),
    active: agent.session.active,
    status: agent.session.status,
    pdsUrl: agent.pdsUrl?.toString(),
    isSelfHosted: !agent.serviceUrl.toString().startsWith(BSKY_SERVICE),
  }
}

export function sessionAccountToSession(
  account: SessionAccount,
): AtpSessionData {
  return {
    // Sorted in the same property order as when returned by BskyAgent (alphabetical).
    accessJwt: account.accessJwt ?? '',
    did: account.did,
    email: account.email,
    emailAuthFactor: account.emailAuthFactor,
    emailConfirmed: account.emailConfirmed,
    handle: account.handle,
    refreshJwt: account.refreshJwt ?? '',
    /**
     * @see https://github.com/bluesky-social/atproto/blob/c5d36d5ba2a2c2a5c4f366a5621c06a5608e361e/packages/api/src/agent.ts#L188
     */
    active: account.active ?? true,
    status: account.status,
  }
}

export class Agent extends BaseAgent {
  constructor(
    proxyHeader: ProxyHeaderValue | null,
    ...options: ConstructorParameters<typeof BaseAgent>
  ) {
    super(...options)
    if (proxyHeader) {
      this.configureProxy(proxyHeader)
    }
  }
}

// Not exported. Use factories above to create it.
// WARN: In the factories above, we _manually set a proxy header_ for the agent after we do whatever it is we are supposed to do.
// Ideally, we wouldn't be doing this. However, since there is so much logic that requires making calls to the PDS right now, it
// feels safer to just let those run as-is and set the header afterward.
/*
 * northsky: `getPreferences` and `putPreferences` are served by the PDS
 * itself, not by an appview. The agent sets a global `atproto-proxy` header
 * and the PDS honors it, so it forwards these two calls to the Blacksky
 * appview, which answers `501 MethodNotImplemented`. That breaks app load and
 * makes setting writes fail silently. Remove the header for these methods so
 * the PDS answers them locally.
 */
const PDS_LOCAL_PROXY_EXEMPT_METHODS = [
  'app.bsky.actor.getPreferences',
  'app.bsky.actor.putPreferences',
]

function isRequest(input: RequestInfo | URL): input is Request {
  return typeof input === 'object' && input !== null && 'headers' in input
}

/*
 * northsky: this function compares the path exactly. A substring test also
 * matches a request that carries a method name somewhere else, such as a
 * search for that text, and sends that request to the wrong service.
 *
 * Some `URL` implementations add a trailing slash to a path that has no query
 * string, so the comparison removes one. React Native does this, and its
 * `URL` stands in whenever the Expo runtime does not replace it.
 */
function isPdsLocalMethodUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/$/, '')
    return PDS_LOCAL_PROXY_EXEMPT_METHODS.some(
      method => path === `/xrpc/${method}`,
    )
  } catch {
    return false
  }
}

/**
 * northsky: removes the appview proxy header from requests to PDS-local
 * methods, and returns the `init` to send.
 *
 * `CredentialSession.fetchHandler` builds a `Request` and calls fetch with
 * that alone, so the headers are on the request rather than in `init`. That
 * request is edited in place, because rebuilding it would have to move the
 * body as well.
 *
 * Requests without an `authorization` header are left alone. These methods
 * need auth anyway, and the session manager only omits the header when there
 * is no access token, which is the signup path. Stripping there made account
 * creation fail with a bare 401 in the Blacksky fork.
 */
export function stripAppviewProxyForPdsLocalMethods(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
): RequestInit | undefined {
  const url = isRequest(input) ? input.url : input.toString()
  if (!isPdsLocalMethodUrl(url)) {
    return init
  }

  const initHeaders = new Headers(init?.headers)
  const hasAuth =
    initHeaders.has('authorization') ||
    (isRequest(input) && input.headers.has('authorization'))
  if (!hasAuth) {
    return init
  }

  if (isRequest(input)) {
    input.headers.delete('atproto-proxy')
  }
  if (!init?.headers) {
    return init
  }
  initHeaders.delete('atproto-proxy')
  return {...init, headers: initHeaders}
}

let realFetch = globalThis.fetch
class BskyAppAgent extends AtpAgent {
  persistSessionHandler: ((event: AtpSessionEvent) => void) | undefined =
    undefined
  /*
   * northsky: resolved appview for this agent's account. The default is the
   * fallback; configureAppviewProxy replaces it once the PDS host is known.
   */
  appview: AppView = FALLBACK_APPVIEW

  constructor({service}: {service: string}) {
    super({
      service,
      async fetch(input, init) {
        // northsky: keep PDS-local methods off the appview proxy
        const patchedInit = stripAppviewProxyForPdsLocalMethods(input, init)
        let success = false
        try {
          const result = await realFetch(input, patchedInit)
          success = true
          return result
        } catch (e) {
          success = false
          throw e
        } finally {
          if (success) {
            emitNetworkConfirmed()
          } else {
            emitNetworkLost()
          }
        }
      },
      persistSession: (event: AtpSessionEvent) => {
        if (this.persistSessionHandler) {
          this.persistSessionHandler(event)
        }
      },
    })
  }

  async prepare({
    resolvers,
    onSessionChange,
  }: {
    // Not awaited in the calling code so we can delay blocking on them.
    resolvers: Promise<unknown>[]
    onSessionChange: (
      agent: AtpAgent,
      did: string,
      event: AtpSessionEvent,
    ) => void
  }) {
    // There's nothing else left to do, so block on them here.
    await Promise.all(resolvers)

    // Now the agent is ready.
    const account = agentToSessionAccountOrThrow(this)
    this.persistSessionHandler = event => {
      onSessionChange(this, account.did, event)
      if (event !== 'create' && event !== 'update') {
        addSessionErrorLog(account.did, event)
      }
    }
    return {account, agent: this}
  }

  dispose() {
    this.sessionManager.session = undefined
    this.persistSessionHandler = undefined
  }
}

export type {BskyAppAgent}
