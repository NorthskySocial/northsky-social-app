import {t} from '@lingui/core/macro'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {
  AI_PREFERENCES_COLLECTION,
  type AiPreferenceKey,
  type AiPreferencesRecord,
  type AiPreferenceValue,
  buildUpdatedRecord,
  createDefaultRecord,
} from '#/lib/ai-preferences'
import {useAgent, useSession} from '#/state/session'
import * as Toast from '#/components/Toast'

export const RQKEY_getAiPreferences = ['ai-preferences']

export function useAiPreferencesQuery() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  return useQuery({
    queryKey: RQKEY_getAiPreferences,
    queryFn: async () => {
      try {
        const response = await agent.com.atproto.repo.getRecord({
          repo: currentAccount!.did,
          collection: AI_PREFERENCES_COLLECTION,
          rkey: 'self',
        })
        return {
          uri: response.data.uri,
          cid: response.data.cid,
          value: response.data.value as unknown as AiPreferencesRecord,
        }
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.startsWith('Could not locate record')
        ) {
          return {
            uri: undefined as string | undefined,
            cid: undefined as string | undefined,
            value: createDefaultRecord(),
          }
        } else {
          throw err
        }
      }
    },
  })
}

export function useAiPreferencesMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      key,
      value,
    }: {
      key: AiPreferenceKey
      value: AiPreferenceValue
    }) => {
      if (!currentAccount) throw new Error('Not signed in')
      const current = queryClient.getQueryData<{
        value: AiPreferencesRecord
      }>(RQKEY_getAiPreferences)
      const record = buildUpdatedRecord(current?.value, key, value)
      const response = await agent.com.atproto.repo.putRecord({
        repo: currentAccount.did,
        collection: AI_PREFERENCES_COLLECTION,
        rkey: 'self',
        record,
      })
      return response
    },
    onMutate: ({key, value}) => {
      queryClient.setQueryData(
        RQKEY_getAiPreferences,
        (old?: {uri?: string; cid?: string; value: AiPreferencesRecord}) => {
          if (!old) return old
          return {
            ...old,
            value: buildUpdatedRecord(old.value, key, value),
          }
        },
      )
    },
    onError: () => {
      Toast.show(t`Failed to update AI preferences`)
      void queryClient.invalidateQueries({
        queryKey: RQKEY_getAiPreferences,
      })
    },
  })
}
