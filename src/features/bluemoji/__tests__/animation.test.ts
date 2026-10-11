import {describe, expect, it} from '@jest/globals'

import {detectAnimatedFormat} from '../animation'
import {pickInlineCid} from '../api'

const bytes = (...parts: (number[] | string)[]) =>
  Uint8Array.from(
    parts.flatMap(p =>
      typeof p === 'string' ? [...p].map(c => c.charCodeAt(0)) : p,
    ),
  )

describe('detectAnimatedFormat', () => {
  it('detects a looping GIF', () => {
    expect(detectAnimatedFormat(bytes('GIF89a', [0, 0], 'NETSCAPE2.0'))).toBe(
      'gif',
    )
  })

  it('detects a GIF by its second frame header', () => {
    const gce = [0x21, 0xf9, 0x04, 0, 0, 0, 0, 0]
    expect(detectAnimatedFormat(bytes('GIF89a', gce, gce))).toBe('gif')
  })

  it('treats a one-frame GIF as a still', () => {
    const gce = [0x21, 0xf9, 0x04, 0, 0, 0, 0, 0]
    expect(detectAnimatedFormat(bytes('GIF89a', gce))).toBeUndefined()
  })

  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  it('detects APNG by acTL before IDAT', () => {
    expect(detectAnimatedFormat(bytes(sig, 'IHDR....acTL....IDAT'))).toBe(
      'apng',
    )
  })

  it('ignores a PNG whose acTL comes after IDAT', () => {
    expect(
      detectAnimatedFormat(bytes(sig, 'IHDR....IDAT....acTL')),
    ).toBeUndefined()
  })

  it('reads the animation flag of a WebP', () => {
    const header = (flags: number) =>
      bytes('RIFF....WEBPVP8X', [10, 0, 0, 0, flags])
    expect(detectAnimatedFormat(header(0x02))).toBe('webp')
    expect(detectAnimatedFormat(header(0x10))).toBeUndefined()
  })

  it('returns undefined for unknown data', () => {
    expect(detectAnimatedFormat(bytes('nope'))).toBeUndefined()
  })
})

describe('pickInlineCid', () => {
  const formats = {png_128: 'png', gif_128: 'gif', webp_128: 'webp'}

  it('prefers animation by default', () => {
    expect(pickInlineCid(formats)).toBe('gif')
  })

  it('prefers a still when animation is off', () => {
    expect(pickInlineCid(formats, {animate: false})).toBe('png')
  })

  it('still shows an animation that has no still', () => {
    expect(pickInlineCid({gif_128: 'gif'}, {animate: false})).toBe('gif')
  })

  it('ignores v0 booleans', () => {
    expect(pickInlineCid({apng_128: true, lottie: true})).toBeUndefined()
  })
})
