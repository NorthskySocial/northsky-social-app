import {type ImagePickerAsset} from 'expo-image-picker'
import {type Client} from '@atproto/lex'
import {setupI18n} from '@lingui/core'

import {compressVideo} from '#/lib/media/video/compress'
import {type VideoTelemetry} from '#/lib/media/video/telemetry'
import {uploadVideo} from '#/lib/media/video/upload'
import {createTokenlessVideoServiceClient} from '#/lib/media/video/util'
import {
  createVideoState,
  processVideo,
  videoReducer,
  type VideoState,
} from '#/view/com/composer/state/video'
import {MediaFallbackSession} from './session'
import {FallbackVideoUploadError, uploadToBlacksky} from './uploadToBlacksky'

jest.mock('#/lib/media/video/compress', () => ({compressVideo: jest.fn()}))
jest.mock('#/lib/media/video/upload', () => ({uploadVideo: jest.fn()}))
jest.mock('#/lib/media/video/util', () => ({
  createTokenlessVideoServiceClient: jest.fn(),
}))
jest.mock('./uploadToBlacksky', () => ({
  ...jest.requireActual<typeof import('./uploadToBlacksky')>(
    './uploadToBlacksky',
  ),
  uploadToBlacksky: jest.fn(),
}))
jest.mock('./sendVideo', () => ({sendVideo: jest.fn()}))
const primary = 'https://video.bsky.app'
const secondary = 'https://video.blacksky.community'
const initialPoll = jest.fn()
const secondaryPoll = jest.fn()

beforeEach(() => {
  jest.resetAllMocks()
  jest
    .mocked(compressVideo)
    .mockResolvedValue({uri: 'clip.mp4', mimeType: 'video/mp4', size: 50})
  jest.mocked(uploadVideo).mockResolvedValue({jobId: 'first', service: primary})
  jest
    .mocked(uploadToBlacksky)
    .mockResolvedValue({jobId: 'second', service: secondary})
  jest.mocked(createTokenlessVideoServiceClient).mockImplementation(
    service =>
      ({
        call: service === primary ? initialPoll : secondaryPoll,
      }) as unknown as Client,
  )
  secondaryPoll.mockResolvedValue({
    jobStatus: {state: 'JOB_STATE_COMPLETED', blob: {ref: 'result'}},
  })
})

async function run(enabled = true) {
  const controller = new AbortController()
  const telemetry = {
    compressStarted: jest.fn(),
    compressCompleted: jest.fn(),
    uploadStarted: jest.fn(),
    uploadFailed: jest.fn(),
    uploadCompleted: jest.fn(),
    processingStarted: jest.fn(),
    processingFailed: jest.fn(),
    processingCompleted: jest.fn(),
  } as unknown as VideoTelemetry
  const asset = {uri: 'clip.mp4'} as ImagePickerAsset
  let state: VideoState = createVideoState(asset, controller, telemetry)
  const phases: string[] = []
  const i18n = setupI18n({locale: 'en', messages: {en: {}}})
  await processVideo(
    asset,
    action => {
      state = videoReducer(state, action)
      phases.push(state.status)
    },
    {} as Client,
    'https://pds.test',
    'did:plc:alice',
    new MediaFallbackSession('alice', enabled),
    controller.signal,
    i18n,
    telemetry,
  )
  return {phases, state: state as VideoState}
}

it.each(['failed job', 'permission failure code', 'forbidden poll'])(
  'reuploads the compressed file once after a primary %s',
  async kind => {
    if (kind === 'failed job')
      initialPoll.mockResolvedValue({
        jobStatus: {state: 'JOB_STATE_FAILED', error: 'AccountTakedown'},
      })
    else if (kind === 'permission failure code')
      initialPoll.mockResolvedValue({
        jobStatus: {
          state: 'JOB_STATE_FAILED',
          failureCode: 'permission_denied',
        },
      })
    else initialPoll.mockRejectedValue({status: 403})
    expect((await run()).phases).toEqual([
      'uploading',
      'processing',
      'uploading',
      'processing',
      'done',
    ])
    expect(compressVideo).toHaveBeenCalledTimes(1)
    expect(uploadToBlacksky).toHaveBeenCalledTimes(1)
    expect(initialPoll).toHaveBeenCalledTimes(1)
    expect(secondaryPoll).toHaveBeenCalledWith(expect.anything(), {
      jobId: 'second',
    })
  },
)

it('finishes without another upload if the fallback poll also denies access', async () => {
  initialPoll.mockRejectedValue({status: 403})
  secondaryPoll.mockRejectedValue({status: 401})
  expect((await run()).state.status).toBe('error')
  expect(uploadToBlacksky).toHaveBeenCalledTimes(1)
  expect(secondaryPoll).toHaveBeenCalledTimes(1)
})

it('keeps late denials on the primary for other AppViews', async () => {
  initialPoll.mockRejectedValue({status: 403})
  expect((await run(false)).state.status).toBe('error')
  expect(uploadToBlacksky).not.toHaveBeenCalled()
})

it('translates the typed fallback upload failure after a late denial', async () => {
  initialPoll.mockRejectedValue({status: 403})
  jest
    .mocked(uploadToBlacksky)
    .mockRejectedValue(new FallbackVideoUploadError())
  expect((await run()).state).toMatchObject({
    status: 'error',
    error: 'Failed to upload video',
  })
})
