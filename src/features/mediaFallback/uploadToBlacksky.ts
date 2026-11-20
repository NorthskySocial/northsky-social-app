import {nanoid} from 'nanoid/non-secure'

import {AbortError} from '#/lib/async/cancelable'
import {type UploadOptions} from '#/lib/media/video/upload'
import {
  getServiceAuthToken,
  getVideoUploadLimits,
  serviceAuthExp,
} from '#/lib/media/video/upload.shared'
import {mimeToExt} from '#/lib/media/video/util'
import {BRAND} from '#/brand/config'
import {sendVideo} from './sendVideo'

export async function uploadToBlacksky({
  client,
  i18n,
  dispatchUrl,
  video,
  did,
  signal,
  setProgress,
}: UploadOptions) {
  await getVideoUploadLimits(
    client,
    i18n,
    BRAND.fallbackVideoService,
    BRAND.fallbackVideoDid,
  )
  if (signal.aborted) throw new AbortError()
  const token = await getServiceAuthToken({
    client,
    dispatchUrl,
    lxm: 'com.atproto.repo.uploadBlob',
    exp: serviceAuthExp(),
  })
  const url = new URL(
    '/xrpc/app.bsky.video.uploadVideo',
    BRAND.fallbackVideoService,
  )
  url.searchParams.set('did', did)
  url.searchParams.set('name', nanoid(12) + '.' + mimeToExt(video.mimeType))
  const response = await sendVideo({
    url: url.href,
    video,
    setProgress,
    signal,
    headers: {Authorization: 'Bearer ' + token, 'Content-Type': video.mimeType},
  })
  const result = JSON.parse(response.body) as {
    jobId?: string
    error?: string
    message?: string
  } | null
  if (
    typeof result?.jobId !== 'string' ||
    !result.jobId ||
    (response.status >= 400 && result.error !== 'already_exists')
  ) {
    throw new Error(result?.message || result?.error || 'Video upload failed')
  }
  return {jobId: result.jobId, service: BRAND.fallbackVideoService}
}
