import {describe, expect, it, jest} from '@jest/globals'

jest.mock('#/lib/api/upload-blob', () => ({uploadBlob: jest.fn()}))
jest.mock('#/lib/media/image-manipulator', () => ({renderImage: jest.fn()}))
jest.mock('#/lib/media/uriSize', () => ({getUriSize: jest.fn()}))

import {buildItemRecord} from '../upload'

const blob = (n: string) => ({
  $type: 'blob',
  ref: n,
  mimeType: 'image/png',
  size: 1,
})

describe('buildItemRecord', () => {
  const base = {
    alias: ':BlobCat:',
    alt: '  a cat  ',
    adultOnly: false,
    inline: {format: 'png' as const, blob: blob('a') as never},
    createdAt: '2026-01-01T00:00:00.000Z',
  }

  it('writes a canonical colon-wrapped name and formats_v1', () => {
    const r = buildItemRecord(base)
    expect(r).toMatchObject({
      $type: 'blue.moji.collection.item',
      name: ':blobcat:',
      alt: 'a cat',
      formats: {
        $type: 'blue.moji.collection.item#formats_v1',
        png_128: base.inline.blob,
      },
    })
    expect(r).not.toHaveProperty('stickerFormats')
    expect(r).not.toHaveProperty('adultOnly')
  })

  it('marks sticker-capable items with stickerFormats', () => {
    const r = buildItemRecord({
      ...base,
      sticker: {format: 'webp', blob: blob('b') as never},
    })
    expect(r.stickerFormats).toMatchObject({
      $type: 'blue.moji.collection.item#stickerFormats_v0',
      webp_512: expect.anything(),
    })
  })

  it('omits empty alt and records adultOnly', () => {
    const r = buildItemRecord({...base, alt: ' ', adultOnly: true})
    expect(r).not.toHaveProperty('alt')
    expect(r.adultOnly).toBe(true)
  })

  it('rejects invalid aliases', () => {
    expect(() => buildItemRecord({...base, alias: 'has space'})).toThrow()
  })
})
