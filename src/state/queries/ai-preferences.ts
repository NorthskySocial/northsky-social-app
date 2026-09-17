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
import {isRecordNotFoundError} from '#/lib/xrpc-error'
import {usePdsClient, useSession} from '#/state/session'
import * as Toast from '#/components/Toast'
import {com} from '#/lexicons'

export const RQKEY_getAiPreferences = ['ai-preferences']

export function useAiPreferencesQuery() {
  const pdsClient = usePdsClient()
  const {currentAccount} = useSession()
  return useQuery({
    queryKey: RQKEY_getAiPreferences,
    queryFn: async () => {
      try {
        const res = await pdsClient.call(com.atproto.repo.getRecord, {
          repo: currentAccount!.did,
          collection: AI_PREFERENCES_COLLECTION,
          rkey: 'self',
        })
        return {
          uri: res.uri,
          cid: res.cid,
          value: res.value as unknown as AiPreferencesRecord,
        }
      } catch (err) {
        if (isRecordNotFoundError(err)) {
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
  const pdsClient = usePdsClient()
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
      return await pdsClient.call(com.atproto.repo.putRecord, {
        repo: currentAccount.did,
        collection: AI_PREFERENCES_COLLECTION,
        rkey: 'self',
        record,
      })
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
