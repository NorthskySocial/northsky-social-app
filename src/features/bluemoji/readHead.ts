import {EncodingType, readAsStringAsync} from 'expo-file-system/legacy'

/** Enough to see a GIF's frame headers or an APNG/WebP's animation marker. */
const HEAD_BYTES = 65536

/** The first bytes of a picked image, for sniffing its format. */
export async function readHead(uri: string): Promise<Uint8Array> {
  const b64 = await readAsStringAsync(uri, {
    encoding: EncodingType.Base64,
    position: 0,
    length: HEAD_BYTES,
  })
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
