import {File} from 'expo-file-system'

import {type Transfer} from './types'

export function sendVideo({
  url,
  video,
  headers,
  signal,
  setProgress,
}: Transfer) {
  return new File(video.uri).upload(url, {
    headers,
    signal,
    onProgress: p => {
      if (p.totalBytes > 0) setProgress(p.bytesSent / p.totalBytes)
    },
  })
}
