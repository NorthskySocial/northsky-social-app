export type AnimatedFormat = 'gif' | 'apng' | 'webp'

const ascii = (b: Uint8Array, start: number, text: string) => {
  for (let i = 0; i < text.length; i++) {
    if (b[start + i] !== text.charCodeAt(i)) return false
  }
  return b.length >= start + text.length
}

function indexOfAscii(b: Uint8Array, text: string, from = 0): number {
  outer: for (let i = from; i <= b.length - text.length; i++) {
    for (let j = 0; j < text.length; j++) {
      if (b[i + j] !== text.charCodeAt(j)) continue outer
    }
    return i
  }
  return -1
}

function gifFrameCount(b: Uint8Array): number {
  // Graphic Control Extension introducer: 0x21 0xF9 0x04
  let n = 0
  for (let i = 0; i < b.length - 2; i++) {
    if (b[i] === 0x21 && b[i + 1] === 0xf9 && b[i + 2] === 0x04) n++
  }
  return n
}

/**
 * Which animated format `bytes` is, or `undefined` for a still image (or
 * anything unrecognised). Only the head of the file is needed: a GIF is judged
 * by its loop extension or a second frame header, an APNG by its `acTL` chunk
 * (which must precede the first `IDAT`), and a WebP by the animation flag in
 * its `VP8X` chunk.
 */
export function detectAnimatedFormat(
  bytes: Uint8Array,
): AnimatedFormat | undefined {
  if (ascii(bytes, 0, 'GIF8')) {
    if (indexOfAscii(bytes, 'NETSCAPE2.0') !== -1 || gifFrameCount(bytes) > 1) {
      return 'gif'
    }
    return undefined
  }

  // PNG signature, then 8 bytes of chunk header at 8
  if (bytes[0] === 0x89 && ascii(bytes, 1, 'PNG')) {
    const actl = indexOfAscii(bytes, 'acTL', 8)
    const idat = indexOfAscii(bytes, 'IDAT', 8)
    return actl !== -1 && (idat === -1 || actl < idat) ? 'apng' : undefined
  }

  if (ascii(bytes, 0, 'RIFF') && ascii(bytes, 8, 'WEBP')) {
    if (ascii(bytes, 12, 'VP8X') && (bytes[20] & 0x02) !== 0) return 'webp'
    return undefined
  }

  return undefined
}
