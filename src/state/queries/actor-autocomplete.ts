import {useCallback, useEffect, useMemo, useRef} from 'react'
import {
  type AppBskyActorDefs,
  moderateProfile,
  type ModerationOpts,
} from '@atproto/api'
import {keepPreviousData, useQuery, useQueryClient} from '@tanstack/react-query'
import debounce from 'lodash.debounce'

import {useDebouncedValue} from '#/lib/hooks/useDebouncedValue'
import {isJustAMute, moduiContainsHideableOffense} from '#/lib/moderation'
// northsky: typeahead routing
import {searchActorsTypeaheadVia} from '#/lib/typeahead/client'
import {logger} from '#/logger'
import {STALE} from '#/state/queries'
import {useAgent, useAppview} from '#/state/session'
import {useModerationOpts} from '../preferences/moderation-opts'
import {DEFAULT_LOGGED_OUT_PREFERENCES} from './preferences'

const DEFAULT_MOD_OPTS = {
  userDid: undefined,
  prefs: DEFAULT_LOGGED_OUT_PREFERENCES.moderationPrefs,
}
// northsky: wait for typing to settle before requesting profile typeahead
const PROFILE_DEBOUNCE_MS = 300

const RQKEY_ROOT = 'actor-autocomplete'
export const RQKEY = (prefix: string) => [RQKEY_ROOT, prefix]

export function useActorAutocompleteQuery(
  prefix: string,
  maintainData?: boolean,
  limit?: number,
) {
  const moderationOpts = useModerationOpts()
  const agent = useAgent()
  const appview = useAppview() // northsky: typeahead may come from another service

  prefix = prefix.toLowerCase().trim()
  if (prefix.endsWith('.')) {
    // Going from "foo" to "foo." should not clear matches.
    prefix = prefix.slice(0, -1)
  }
  // northsky: debounce profile requests so fast typing sends one lookup
  const debouncedPrefix = useDebouncedValue(prefix, PROFILE_DEBOUNCE_MS)

  return useQuery<AppBskyActorDefs.ProfileViewBasic[]>({
    staleTime: STALE.MINUTES.ONE,
    // northsky: appended appview so switching accounts does not reuse results
    queryKey: [...RQKEY(prefix || ''), appview.did],
    async queryFn() {
      if (!prefix) return []
      // northsky: appviews without typeahead use the brand service
      return searchActorsTypeaheadVia(appview, agent, {
        q: debouncedPrefix,
        limit: limit || 8,
      })
    },
    enabled: prefix === debouncedPrefix,
    select: useCallback(
      (data: AppBskyActorDefs.ProfileViewBasic[]) => {
        return computeSuggestions({
          q: prefix,
          searched: data,
          moderationOpts: moderationOpts || DEFAULT_MOD_OPTS,
        })
      },
      [prefix, moderationOpts],
    ),
    placeholderData: maintainData ? keepPreviousData : undefined,
  })
}

export type ActorAutocompleteFn = ReturnType<typeof useActorAutocompleteFn>
export function useActorAutocompleteFn() {
  const queryClient = useQueryClient()
  const moderationOpts = useModerationOpts()
  const agent = useAgent()
  const appview = useAppview() // northsky: typeahead may come from another service

  const autocomplete = useCallback(
    async ({query, limit = 8}: {query: string; limit?: number}) => {
      query = query.toLowerCase()
      let res
      if (query) {
        try {
          res = await queryClient.fetchQuery({
            staleTime: STALE.MINUTES.ONE,
            // northsky: appended appview so switching accounts does not reuse results
            queryKey: [...RQKEY(query || ''), appview.did],
            // northsky: appviews without typeahead use the brand service
            queryFn: () =>
              searchActorsTypeaheadVia(appview, agent, {q: query, limit}),
          })
        } catch (e) {
          logger.error('useActorSearch: searchActorsTypeahead failed', {
            message: e,
          })
        }
      }

      return computeSuggestions({
        q: query,
        searched: res,
        moderationOpts: moderationOpts || DEFAULT_MOD_OPTS,
      })
    },
    [queryClient, moderationOpts, agent, appview],
  )

  const pendingResolve = useRef<
    ((value: AppBskyActorDefs.ProfileViewBasic[]) => void) | null
  >(null)
  // northsky: debounce the promise-based web composer autocomplete callback
  const debouncedAutocomplete = useMemo(
    () =>
      debounce(
        (
          args: {query: string; limit?: number},
          resolve: (value: AppBskyActorDefs.ProfileViewBasic[]) => void,
        ) => {
          pendingResolve.current = null
          void autocomplete(args).then(resolve)
        },
        PROFILE_DEBOUNCE_MS,
      ),
    [autocomplete],
  )

  useEffect(() => {
    return () => {
      debouncedAutocomplete.cancel()
      pendingResolve.current?.([])
    }
  }, [debouncedAutocomplete])

  return useCallback(
    (args: {query: string; limit?: number}) =>
      new Promise<AppBskyActorDefs.ProfileViewBasic[]>(resolve => {
        pendingResolve.current?.([])
        pendingResolve.current = resolve
        debouncedAutocomplete(args, resolve)
      }),
    [debouncedAutocomplete],
  )
}

function computeSuggestions({
  q,
  searched = [],
  moderationOpts,
}: {
  q?: string
  searched?: AppBskyActorDefs.ProfileViewBasic[]
  moderationOpts: ModerationOpts
}) {
  let items: AppBskyActorDefs.ProfileViewBasic[] = []
  for (const item of searched) {
    if (!items.find(item2 => item2.handle === item.handle)) {
      items.push(item)
    }
  }
  return items.filter(profile => {
    const modui = moderateProfile(profile, moderationOpts).ui('profileList')
    const isExactMatch = q && profile.handle.toLowerCase() === q
    return (
      (isExactMatch && !moduiContainsHideableOffense(modui)) ||
      !modui.filter ||
      isJustAMute(modui)
    )
  })
}
