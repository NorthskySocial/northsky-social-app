import {useCallback} from 'react'
import {moderateProfile, type ModerationOpts} from '@bsky/sdk/moderation'
import {keepPreviousData, useQuery, useQueryClient} from '@tanstack/react-query'

import {isJustAMute, moduiContainsHideableOffense} from '#/lib/moderation'
// northsky: typeahead routing
import {searchActorsTypeaheadVia} from '#/lib/typeahead/client'
import {logger} from '#/logger'
import {STALE} from '#/state/queries'
import {useAppview, useAppviewClient} from '#/state/session'
import {type app} from '#/lexicons'
import {useModerationOpts} from '../preferences/moderation-opts'
import {DEFAULT_LOGGED_OUT_PREFERENCES} from './preferences'

const DEFAULT_MOD_OPTS = {
  userDid: undefined,
  prefs: DEFAULT_LOGGED_OUT_PREFERENCES.moderationPrefs,
}

const RQKEY_ROOT = 'actor-autocomplete'
export const RQKEY = (prefix: string) => [RQKEY_ROOT, prefix]

export function useActorAutocompleteQuery(
  prefix: string,
  maintainData?: boolean,
  limit?: number,
) {
  const moderationOpts = useModerationOpts()
  const client = useAppviewClient()
  const appview = useAppview() // northsky: typeahead may come from another service

  prefix = prefix.toLowerCase().trim()
  if (prefix.endsWith('.')) {
    // Going from "foo" to "foo." should not clear matches.
    prefix = prefix.slice(0, -1)
  }

  return useQuery<app.bsky.actor.defs.ProfileViewBasic[]>({
    staleTime: STALE.MINUTES.ONE,
    // northsky: appended appview so switching accounts does not reuse results
    queryKey: [...RQKEY(prefix || ''), appview.did],
    async queryFn() {
      if (!prefix) return []
      // northsky: appviews without typeahead use the brand service
      return searchActorsTypeaheadVia(appview, client, {
        q: prefix,
        limit: limit || 8,
      })
    },
    select: useCallback(
      (data: app.bsky.actor.defs.ProfileViewBasic[]) => {
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
  const client = useAppviewClient()
  const appview = useAppview() // northsky: typeahead may come from another service

  return useCallback(
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
              searchActorsTypeaheadVia(appview, client, {q: query, limit}),
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
    [queryClient, moderationOpts, client, appview],
  )
}

function computeSuggestions({
  q,
  searched = [],
  moderationOpts,
}: {
  q?: string
  searched?: app.bsky.actor.defs.ProfileViewBasic[]
  moderationOpts: ModerationOpts
}) {
  let items: app.bsky.actor.defs.ProfileViewBasic[] = []
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
