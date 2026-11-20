import {type CompressedVideo} from '#/lib/media/video/types'

export type Transfer = {
  url: string
  video: CompressedVideo
  headers: Record<string, string>
  signal: AbortSignal
  setProgress: (progress: number) => void
}
