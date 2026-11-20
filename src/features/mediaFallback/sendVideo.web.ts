import {AbortError} from '#/lib/async/cancelable'
import {type Transfer} from './types'

export async function sendVideo({
  url,
  video,
  headers,
  signal,
  setProgress,
}: Transfer) {
  const body = video.bytes ?? (await (await fetch(video.uri, {signal})).blob())
  if (signal.aborted) throw new AbortError()
  const xhr = new XMLHttpRequest()
  const abort = () => xhr.abort()
  try {
    return await new Promise<{status: number; body: string}>(
      (resolve, reject) => {
        xhr.open('POST', url)
        for (const [key, value] of Object.entries(headers))
          xhr.setRequestHeader(key, value)
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) setProgress(e.loaded / e.total)
        }
        xhr.onload = () => resolve({status: xhr.status, body: xhr.responseText})
        xhr.onerror = () => reject(new TypeError('Network request failed'))
        xhr.onabort = () => reject(new AbortError())
        signal.addEventListener('abort', abort)
        xhr.send(body)
      },
    )
  } finally {
    signal.removeEventListener('abort', abort)
  }
}
