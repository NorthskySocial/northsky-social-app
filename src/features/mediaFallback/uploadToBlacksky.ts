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

export class FallbackVideoUploadError extends Error {}

export async function uploadToBlacksky({
  client,
  mediaSession,
  i18n,
  dispatchUrl,
  video,
  did,
  signal,
  setProgress,
}: UploadOptions) {
  if (signal.aborted) throw new AbortError()
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
  let result: {jobId?: string; error?: string} | null
  try {
    result = JSON.parse(response.body)
  } catch (cause) {
    throw new FallbackVideoUploadError(undefined, {cause})
  }
  if (
    typeof result?.jobId !== 'string' ||
    !result.jobId ||
    (response.status >= 400 && result.error !== 'already_exists')
  ) {
    throw new FallbackVideoUploadError()
  }
  mediaSession.preferBlackskyUploads = true
  return {jobId: result.jobId, service: BRAND.fallbackVideoService}
}
