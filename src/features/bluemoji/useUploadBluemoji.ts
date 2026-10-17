import {useMutation} from '@tanstack/react-query'

import {usePdsClient, useSession} from '#/state/session'
import {useInvalidateBluemoji} from './queries'
import {uploadBluemojiItem, type UploadParams} from './upload'

export function useUploadBluemoji() {
  const client = usePdsClient()
  const {currentAccount} = useSession()
  const invalidate = useInvalidateBluemoji()

  return useMutation({
    mutationFn: (params: Omit<UploadParams, 'client' | 'did'>) =>
      uploadBluemojiItem({client, did: currentAccount!.did, ...params}),
    /*
     * The AppView indexes from the firehose, so the new item may take a moment
     * to appear in the list; invalidating still refetches as soon as it can.
     */
    onSuccess: invalidate,
  })
}
