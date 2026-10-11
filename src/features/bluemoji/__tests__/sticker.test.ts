import {describe, expect, it} from '@jest/globals'

import {
  buildStickerEmbed,
  isStickerCapable,
  parseStickerEmbed,
  pickStickerCid,
} from '../sticker'
import {type BluemojiItemView} from '../types'

const item: BluemojiItemView = {
  uri: 'at://did:plc:abc/blue.moji.collection.item/blobcat',
  cid: 'bafyrecord',
  did: 'did:plc:abc',
  name: ':blobcat:',
  alt: 'a cat',
  formats: {png_128: {ref: {$link: 'bafkinline'}}},
  stickerFormats: {
    png_512: {ref: {$link: 'bafkpng'}},
    gif_512: {ref: {$link: 'bafkgif'}},
  },
}

describe('sticker formats', () => {
  it('prefers animation, or a still when asked', () => {
    expect(pickStickerCid(item.stickerFormats)).toBe('bafkgif')
    expect(pickStickerCid(item.stickerFormats, {animate: false})).toBe(
      'bafkpng',
    )
  })

  it('only counts items with a 512px rendition as stickers', () => {
    expect(isStickerCapable(item)).toBe(true)
    expect(isStickerCapable({...item, stickerFormats: undefined})).toBe(false)
  })
})

describe('buildStickerEmbed', () => {
  it('writes CIDs and a strong ref from the verified item', () => {
    expect(buildStickerEmbed(item)).toEqual({
      $type: 'blue.moji.embed.sticker',
      sticker: {
        did: 'did:plc:abc',
        name: ':blobcat:',
        alt: 'a cat',
        record: {uri: item.uri, cid: 'bafyrecord'},
        formats: {
          $type: 'blue.moji.embed.sticker#formats_v0',
          png_512: 'bafkpng',
          gif_512: 'bafkgif',
        },
      },
    })
  })
})

describe('parseStickerEmbed', () => {
  it('finds the sticker on a post record', () => {
    const embed = buildStickerEmbed(item)
    expect(parseStickerEmbed({embed})?.name).toBe(':blobcat:')
  })

  it('ignores other embeds and malformed stickers', () => {
    expect(parseStickerEmbed({embed: {$type: 'app.bsky.embed.images'}})).toBe(
      undefined,
    )
    expect(
      parseStickerEmbed({embed: {$type: 'blue.moji.embed.sticker'}}),
    ).toBeUndefined()
    expect(parseStickerEmbed(undefined)).toBeUndefined()
  })
})
