import {type Client} from '@atproto/lex'
import {type I18n} from '@lingui/core'

import {AbortError} from '#/lib/async/cancelable'
import {VIDEO_SERVICE} from '#/lib/constants'
import {type CompressedVideo} from '#/lib/media/video/types'
import {isAccessDenial} from '#/features/mediaFallback/routing'
import {type MediaFallbackSession} from '#/features/mediaFallback/session'
import {uploadToBlacksky} from '#/features/mediaFallback/uploadToBlacksky'
import {uploadVideoMultipart} from './multipart/upload'
import {getVideoUploadLimits} from './upload.shared'

export type UploadOptions = {
  video: CompressedVideo
  client: Client
  /** The account's PDS/dispatch URL, for the uploadBlob service-auth token. */
  dispatchUrl: string | URL
  setProgress: (progress: number) => void
  signal: AbortSignal
  mediaSession: MediaFallbackSession
  did: string
  i18n: I18n
}

export async function uploadVideo(options: UploadOptions) {
  const {client, i18n, signal} = options
  if (signal.aborted) {
    throw new AbortError()
  }
  // northsky: Blacksky accepts a binary upload and owns the resulting job.
  if (options.mediaSession.preferBlackskyUploads)
    return uploadToBlacksky(options)
  try {
    await getVideoUploadLimits(client, i18n)
    const job = await uploadVideoMultipart(options)
    return {jobId: job.jobId, service: VIDEO_SERVICE}
  } catch (error) {
    if (signal.aborted) throw new AbortError()
    if (!isAccessDenial(error)) throw error
  }
  const result = await uploadToBlacksky(options)
  options.mediaSession.preferBlackskyUploads = true
  return result
}
