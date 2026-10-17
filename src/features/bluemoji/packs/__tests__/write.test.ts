import {beforeEach, describe, expect, it, jest} from '@jest/globals'

jest.mock('#/lib/api/upload-blob', () => ({
  uploadBlob: jest.fn((_c: unknown, blob: Blob) =>
    Promise.resolve({
      blob: {$type: 'blob', ref: `ref-${blob.size}`, mimeType: blob.type},
    }),
  ),
}))
jest.mock('#/lib/media/image-manipulator', () => ({renderImage: jest.fn()}))
jest.mock('#/lib/media/uriSize', () => ({getUriSize: jest.fn()}))
jest.mock('#/lib/xrpc-error', () => ({
  isRecordNotFoundError: (e: unknown) =>
    (e as {code?: string})?.code === 'RecordNotFound',
}))

import {type BluemojiItemView} from '../../types'
import {
  addToPack,
  createPack,
  deletePack,
  installItem,
  installPack,
  removeFromPack,
  updatePack,
} from '../write'

const DID = 'did:plc:me'
const SRC = 'did:plc:src'

function source(name = ':blobcat:', over: Partial<BluemojiItemView> = {}) {
  return {
    uri: `at://${SRC}/blue.moji.collection.item/${name.replace(/:/g, '')}`,
    did: SRC,
    name,
    alt: 'a cat',
    formats: {png_128: {ref: {$link: 'bafkpng'}}},
    ...over,
  } satisfies BluemojiItemView
}

type Input = {
  rkey: string
  collection: string
  record: Record<string, unknown>
  writes: {collection: string; rkey: string}[]
}
type Call = {method: string; input: Input}

/** A fake lex client recording calls; `existing` are rkeys already in the repo. */
function fakeClient(existing: string[] = []) {
  const calls: Call[] = []
  const handle = (def: {$nsid: string}, input: Input) => {
    const method = def.$nsid.split('.').pop()!
    calls.push({method, input})
    if (method === 'getRecord') {
      if (existing.includes(input.rkey)) {
        return {uri: 'u', cid: 'c', value: {name: 'Old', extra: 1}}
      }
      throw Object.assign(new Error('nf'), {code: 'RecordNotFound'})
    }
    if (method === 'createRecord')
      return {uri: `at://${DID}/${input.collection}/new`}
    if (method === 'listRecords') {
      return {
        records: [
          {uri: `at://${DID}/x/a`, value: {pack: 'at://p/1'}},
          {uri: `at://${DID}/x/b`, value: {pack: 'at://p/other'}},
        ],
      }
    }
    return {}
  }
  const client = {
    call: jest.fn(
      (def: {$nsid: string}, input: Input) =>
        new Promise((resolve, reject) => {
          try {
            resolve(handle(def, input))
          } catch (e) {
            reject(e instanceof Error ? e : new Error(String(e)))
          }
        }),
    ),
  }
  return {client: client as never, calls}
}

const fetchBlob = () => Promise.resolve(new Blob(['x'], {type: 'image/png'}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('pack records', () => {
  it('creates a pack with only the fields that were given', async () => {
    const {client, calls} = fakeClient()
    await createPack(client, DID, {
      name: ' Cats ',
      description: ' ',
      adultOnly: false,
    })
    const rec = calls[0].input.record
    expect(rec).toMatchObject({$type: 'blue.moji.packs.pack', name: 'Cats'})
    expect(rec).not.toHaveProperty('description')
    expect(rec).not.toHaveProperty('adultOnly')
  })

  it('updates by read-modify-write, keeping unknown fields', async () => {
    const {client, calls} = fakeClient(['tid1'])
    await updatePack(client, DID, `at://${DID}/blue.moji.packs.pack/tid1`, {
      name: 'New',
    })
    const put = calls.find(c => c.method === 'putRecord')!
    expect(put.input.record).toEqual({name: 'New', extra: 1})
    expect(put.input.rkey).toBe('tid1')
  })

  it('adds and removes memberships', async () => {
    const {client, calls} = fakeClient()
    await addToPack(client, DID, 'at://p/1', 'at://i/1')
    expect(calls[0].input.record).toMatchObject({
      $type: 'blue.moji.packs.packitem',
      subject: 'at://i/1',
      pack: 'at://p/1',
    })
    await removeFromPack(client, DID, `at://${DID}/blue.moji.packs.packitem/m1`)
    expect(calls[1].input).toMatchObject({
      collection: 'blue.moji.packs.packitem',
      rkey: 'm1',
    })
  })

  it('deletes a pack with only its own memberships, pack last', async () => {
    const {client, calls} = fakeClient()
    await deletePack(client, DID, 'at://p/1')
    const writes = calls.find(c => c.method === 'applyWrites')!.input.writes
    expect(writes.map(w => `${w.collection}/${w.rkey}`)).toEqual([
      'blue.moji.packs.packitem/a',
      'blue.moji.packs.pack/1',
    ])
  })
})

describe('installItem', () => {
  it('re-uploads the bytes and records where it was copied from', async () => {
    const {client, calls} = fakeClient()
    const src = source(':blobcat:', {
      stickerFormats: {png_512: {ref: {$link: 'bafkbig'}}},
      adultOnly: true,
    })
    await installItem({client, did: DID, source: src, fetchBlob})
    const rec = calls.find(c => c.method === 'createRecord')!.input
    expect(rec.rkey).toBe('blobcat')
    expect(rec.record).toMatchObject({
      name: ':blobcat:',
      alt: 'a cat',
      adultOnly: true,
      copyOf: src.uri,
      formats: {$type: 'blue.moji.collection.item#formats_v1'},
      stickerFormats: {$type: 'blue.moji.collection.item#stickerFormats_v0'},
    })
    const record = rec.record as {
      formats: Record<string, unknown>
      stickerFormats: Record<string, unknown>
    }
    expect(record.formats.png_128).toBeDefined()
    expect(record.stickerFormats.png_512).toBeDefined()
  })

  it('can rename on the way in, and the rkey follows the new alias', async () => {
    const {client, calls} = fakeClient()
    await installItem({
      client,
      did: DID,
      source: source(),
      renameTo: ':Meow:',
      fetchBlob,
    })
    const rec = calls.find(c => c.method === 'createRecord')!.input
    expect(rec.rkey).toBe('meow')
    expect(rec.record.name).toBe(':meow:')
  })

  it('refuses to overwrite an alias the user already has', async () => {
    const {client} = fakeClient(['blobcat'])
    await expect(
      installItem({client, did: DID, source: source(), fetchBlob}),
    ).rejects.toMatchObject({code: 'alias-taken'})
  })

  it('rejects an invalid new name before downloading anything', async () => {
    const {client} = fakeClient()
    const dl = jest.fn(fetchBlob)
    await expect(
      installItem({
        client,
        did: DID,
        source: source(),
        renameTo: 'no spaces',
        fetchBlob: dl,
      }),
    ).rejects.toMatchObject({code: 'invalid-alias'})
    expect(dl).not.toHaveBeenCalled()
  })

  it('fails if no rendition could be downloaded', async () => {
    const {client} = fakeClient()
    await expect(
      installItem({
        client,
        did: DID,
        source: source(),
        fetchBlob: () => Promise.resolve(undefined),
      }),
    ).rejects.toThrow(/Could not download/)
  })
})

describe('installPack', () => {
  it('installs new emoji, skips ones the user has, and keeps going after a failure', async () => {
    const {client} = fakeClient()
    const items = [
      source(':a1:'),
      source(':have:'),
      source(':boom:', {formats: {}}),
      source(':b2:'),
    ]
    const progress: number[] = []
    const results = await installPack({
      client,
      did: DID,
      items,
      haveAliases: new Set(['have']),
      fetchBlob,
      onProgress: done => progress.push(done),
    })
    expect(results.map(r => r.outcome.status)).toEqual([
      'installed',
      'exists',
      'failed',
      'installed',
    ])
    expect(progress).toEqual([1, 2, 3, 4])
  })

  it('treats two same-named emoji in one pack as a collision, not an overwrite', async () => {
    const {client} = fakeClient()
    const results = await installPack({
      client,
      did: DID,
      items: [source(':dup:'), source(':dup:')],
      haveAliases: new Set(),
      fetchBlob,
    })
    expect(results.map(r => r.outcome.status)).toEqual(['installed', 'exists'])
  })
})
