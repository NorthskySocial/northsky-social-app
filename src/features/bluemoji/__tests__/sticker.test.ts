import {describe, expect, it} from '@jest/globals'

import {
  buildStickerEmbed,
  isStickerCapable,
  parseStickerEmbed,
  pickStickerCid,
  stickerMatchesItem,
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

describe('stickerMatchesItem', () => {
  const posted = buildStickerEmbed(item).sticker

  it('accepts the emoji the sticker was posted with', () => {
    expect(stickerMatchesItem(posted, item)).toBe(true)
  })

  it('still matches after a metadata edit changes the record CID', () => {
    // post -> edit description/license/adult flag (new record CID, same art)
    // -> the view the AppView serves afterwards -> the old post
    const edited: BluemojiItemView = {
      ...item,
      cid: 'bafynewrecordversion',
      alt: 'a better description',
      license: 'CC-BY-4.0',
      source: 'https://example.com/art',
      adultOnly: true,
    }
    expect(edited.cid).not.toBe(posted.record?.cid)
    expect(stickerMatchesItem(posted, edited)).toBe(true)
  })

  it('does not match if the art was replaced under the old post', () => {
    const swapped: BluemojiItemView = {
      ...item,
      cid: 'bafynewrecordversion',
      stickerFormats: {png_512: {ref: {$link: 'bafkDIFFERENT'}}},
    }
    expect(stickerMatchesItem(posted, swapped)).toBe(false)
  })

  it('does not match a different record, or an embed with no renditions', () => {
    expect(
      stickerMatchesItem(
        {...posted, record: {uri: 'at://did:plc:abc/x/other', cid: 'c'}},
        item,
      ),
    ).toBe(false)
    expect(stickerMatchesItem({...posted, formats: {}}, item)).toBe(false)
  })

  it('matches on any one shared rendition', () => {
    const grew: BluemojiItemView = {
      ...item,
      stickerFormats: {
        ...item.stickerFormats,
        webp_512: {ref: {$link: 'bafkwebp'}},
      },
    }
    expect(stickerMatchesItem(posted, grew)).toBe(true)
  })
})
