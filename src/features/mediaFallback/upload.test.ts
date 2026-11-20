import {type Client} from '@atproto/lex'
import {type I18n} from '@lingui/core'

import {uploadVideoMultipart} from '#/lib/media/video/multipart/upload'
import {uploadVideo} from '#/lib/media/video/upload'
import {
  getServiceAuthToken,
  getVideoUploadLimits,
} from '#/lib/media/video/upload.shared'
import {sendVideo} from './sendVideo'
import {MediaFallbackSession} from './session'

jest.mock('#/lib/media/video/multipart/upload', () => ({
  uploadVideoMultipart: jest.fn(),
}))
jest.mock('#/lib/media/video/upload.shared', () => ({
  getVideoUploadLimits: jest.fn(),
  getServiceAuthToken: jest.fn(),
  serviceAuthExp: () => 123,
}))
jest.mock('./sendVideo', () => ({sendVideo: jest.fn()}))

const options = {
  mediaSession: new MediaFallbackSession(),
  client: {} as Client,
  i18n: {} as I18n,
  did: 'did:plc:alice' as const,
  dispatchUrl: 'https://example.test',
  video: {uri: 'file:///clip.mp4', mimeType: 'video/mp4', size: 50},
  signal: new AbortController().signal,
  setProgress: jest.fn(),
}

beforeEach(() => {
  jest.resetAllMocks()
  options.mediaSession = new MediaFallbackSession()
})

it.each(['limits', 'multipart'])(
  'switches transport and poll host on a %s rejection',
  async stage => {
    const denial = new Error('User is not allowed to upload videos')
    if (stage === 'limits')
      jest.mocked(getVideoUploadLimits).mockRejectedValueOnce(denial)
    else jest.mocked(uploadVideoMultipart).mockRejectedValueOnce(denial)
    jest.mocked(sendVideo).mockResolvedValue({
      body: '{"jobId":"secondary"}',
      headers: {},
      status: 200,
    })
    jest.mocked(getServiceAuthToken).mockResolvedValue('scoped-token')
    await expect(uploadVideo(options)).resolves.toEqual({
      jobId: 'secondary',
      service: 'https://video.blacksky.community',
    })
    const primaryCalls = jest.mocked(uploadVideoMultipart).mock.calls.length
    jest.mocked(getVideoUploadLimits).mockClear()
    await uploadVideo(options)
    expect(uploadVideoMultipart).toHaveBeenCalledTimes(primaryCalls)
    expect(getVideoUploadLimits).toHaveBeenCalledTimes(1)
    expect(getVideoUploadLimits).toHaveBeenLastCalledWith(
      options.client,
      options.i18n,
      'https://video.blacksky.community',
      'did:web:video.blacksky.community',
    )
    expect(getServiceAuthToken).toHaveBeenCalledWith({
      client: options.client,
      dispatchUrl: options.dispatchUrl,
      lxm: 'com.atproto.repo.uploadBlob',
      exp: 123,
    })
    expect(sendVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        video: options.video,
        url: expect.stringContaining(
          'https://video.blacksky.community/xrpc/app.bsky.video.uploadVideo?did=did%3Aplc%3Aalice&name=',
        ),
        headers: {
          Authorization: 'Bearer scoped-token',
          'Content-Type': 'video/mp4',
        },
      }),
    )
  },
)

it('keeps accepted uploads and ambiguous failures on the primary service', async () => {
  jest.mocked(uploadVideoMultipart).mockResolvedValueOnce({
    jobId: 'primary',
    did: options.did,
    state: 'processing',
  })
  await expect(uploadVideo(options)).resolves.toMatchObject({
    jobId: 'primary',
    service: 'https://video.bsky.app',
  })
  jest
    .mocked(uploadVideoMultipart)
    .mockRejectedValueOnce(new Error('Network request failed'))
  await expect(uploadVideo(options)).rejects.toThrow('Network request failed')
  expect(sendVideo).not.toHaveBeenCalled()
})
