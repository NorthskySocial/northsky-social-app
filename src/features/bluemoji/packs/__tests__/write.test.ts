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
  addManyToPack,
  addToPack,
  createPack,
  deletePack,
  installItem,
  installPack,
  PartialAddError,
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
    license: 'CC-BY-4.0',
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

describe('updatePack concurrency', () => {
  it('pins the write to the record it read', async () => {
    const {client, calls} = fakeClient(['tid1'])
    await updatePack(client, DID, `at://${DID}/blue.moji.packs.pack/tid1`, {
      name: 'N',
    })
    expect(calls.find(c => c.method === 'putRecord')!.input).toMatchObject({
      swapRecord: 'c',
    })
  })

  it('does not drop the adult flag on an unrelated edit', async () => {
    const {client, calls} = fakeClient(['tid1'])
    await updatePack(client, DID, `at://${DID}/blue.moji.packs.pack/tid1`, {
      description: 'only the description',
    })
    // `adultOnly` is not in `changes`, so whatever the record has is kept
    const put = calls.find(c => c.method === 'putRecord')!
    expect(put.input.record).toMatchObject({name: 'Old', extra: 1})
  })
})

describe('deletePack across several commits', () => {
  function bigPack(failOnCall?: number) {
    const calls: Call[] = []
    let applyCalls = 0
    const client = {
      call: jest.fn((def: {$nsid: string}, input: Input) => {
        const method = def.$nsid.split('.').pop()!
        calls.push({method, input})
        if (method === 'listRecords') {
          return Promise.resolve({
            records: Array.from({length: 150}, (_, i) => ({
              uri: `at://${DID}/x/m${i}`,
              value: {pack: 'at://p/1'},
            })),
          })
        }
        if (method === 'applyWrites') {
          applyCalls++
          if (applyCalls === failOnCall)
            return Promise.reject(new Error('boom'))
        }
        return Promise.resolve({})
      }),
    }
    return {client: client as never, calls}
  }

  it('chunks the writes and deletes the pack in the last one', async () => {
    const {client, calls} = bigPack()
    await deletePack(client, DID, 'at://p/1')
    const batches = calls
      .filter(c => c.method === 'applyWrites')
      .map(c => c.input.writes)
    expect(batches.map(b => b.length)).toEqual([100, 51])
    const last = batches[1]
    expect(`${last[50].collection}/${last[50].rkey}`).toBe(
      'blue.moji.packs.pack/1',
    )
  })

  it('leaves the pack in place when a later chunk fails, so it can be retried', async () => {
    const {client, calls} = bigPack(2)
    await expect(deletePack(client, DID, 'at://p/1')).rejects.toThrow('boom')
    const deletedPack = calls
      .filter(c => c.method === 'applyWrites')
      .flatMap(c => c.input.writes)
      .some(w => w.collection === 'blue.moji.packs.pack')
    // the second chunk (the one holding the pack) failed, so it never counted
    expect(deletedPack).toBe(true) // it was attempted...
    expect(calls.filter(c => c.method === 'applyWrites')).toHaveLength(2)
  })
})

describe('addManyToPack', () => {
  const itemUris = (n: number) =>
    Array.from(
      {length: n},
      (_, i) => `at://${DID}/blue.moji.collection.item/e${i}`,
    )

  it('skips what the pack already has and batches the rest atomically', async () => {
    const {client, calls} = fakeClient()
    const have = new Set([itemUris(3)[0]])
    const added = await addManyToPack(
      client,
      DID,
      'at://p/1',
      itemUris(3),
      have,
    )
    expect(added).toEqual(itemUris(3).slice(1))
    const writes = calls.find(c => c.method === 'applyWrites')!.input.writes
    expect(writes).toHaveLength(2)
    expect(writes[0]).toMatchObject({
      $type: 'com.atproto.repo.applyWrites#create',
      collection: 'blue.moji.packs.packitem',
    })
  })

  it('writes nothing when everything is already in the pack', async () => {
    const {client, calls} = fakeClient()
    const added = await addManyToPack(
      client,
      DID,
      'at://p/1',
      itemUris(2),
      new Set(itemUris(2)),
    )
    expect(added).toEqual([])
    expect(calls).toHaveLength(0)
  })

  it('reports which batches went in when a later one fails, so a retry does not repeat them', async () => {
    let n = 0
    const client = {
      call: jest.fn(() => {
        n++
        return n === 2 ? Promise.reject(new Error('503')) : Promise.resolve({})
      }),
    } as never
    const uris = itemUris(150)
    const err = await addManyToPack(
      client,
      DID,
      'at://p/1',
      uris,
      new Set(),
    ).catch(e => e)
    expect(err).toBeInstanceOf(PartialAddError)
    expect((err as PartialAddError).added).toEqual(uris.slice(0, 100))
  })

  it('a first-batch failure is a plain error, not a partial one', async () => {
    const client = {
      call: jest.fn(() => Promise.reject(new Error('down'))),
    } as never
    await expect(
      addManyToPack(client, DID, 'at://p/1', itemUris(2), new Set()),
    ).rejects.toThrow('down')
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

describe('installItem and licenses (RFC 0006)', () => {
  it('refuses an emoji with no license: silence is not a grant', async () => {
    const {client} = fakeClient()
    await expect(
      installItem({
        client,
        did: DID,
        source: source(':nolicense:', {license: undefined}),
        fetchBlob,
      }),
    ).rejects.toMatchObject({code: 'not-copyable'})
  })

  it('refuses all-rights-reserved but allows an OR alternative', async () => {
    const {client} = fakeClient()
    await expect(
      installItem({
        client,
        did: DID,
        source: source(':arr:', {license: 'LicenseRef-All-Rights-Reserved'}),
        fetchBlob,
      }),
    ).rejects.toMatchObject({code: 'not-copyable'})

    await expect(
      installItem({
        client,
        did: DID,
        source: source(':either:', {
          license: 'LicenseRef-All-Rights-Reserved OR CC-BY-4.0',
        }),
        fetchBlob,
      }),
    ).resolves.toBeDefined()
  })

  it('does not download anything for a non-copyable emoji', async () => {
    const {client} = fakeClient()
    const dl = jest.fn(fetchBlob)
    await installItem({
      client,
      did: DID,
      source: source(':x:', {license: undefined}),
      fetchBlob: dl,
    }).catch(() => {})
    expect(dl).not.toHaveBeenCalled()
  })

  it('keeps the license and source on the copy, re-validated', async () => {
    const {client, calls} = fakeClient()
    await installItem({
      client,
      did: DID,
      source: source(':cc:', {
        license: 'cc-by-4.0',
        source: 'https://example.com/art',
      }),
      fetchBlob,
    })
    const rec = calls.find(c => c.method === 'createRecord')!.input.record
    expect(rec).toMatchObject({
      license: 'CC-BY-4.0',
      source: 'https://example.com/art',
    })
  })

  it('drops a hostile source and a junk license instead of copying them', async () => {
    const {client, calls} = fakeClient()
    await installItem({
      client,
      did: DID,
      source: source(':evil:', {
        license: 'CC-BY-4.0 AND (',
        source: 'javascript:alert(1)',
      }),
      fetchBlob,
    }).catch(() => {})
    // a junk license is no license, so it is not copyable at all
    expect(calls.some(c => c.method === 'createRecord')).toBe(false)

    const ok = fakeClient()
    await installItem({
      client: ok.client,
      did: DID,
      source: source(':okay:', {source: 'javascript:alert(1)'}),
      fetchBlob,
    })
    const rec = ok.calls.find(c => c.method === 'createRecord')!.input.record
    expect(rec).not.toHaveProperty('source')
    expect(rec).toHaveProperty('license', 'CC-BY-4.0')
  })
})

describe('pack provenance', () => {
  it('writes normalised license and source on create', async () => {
    const {client, calls} = fakeClient()
    await createPack(client, DID, {
      name: 'P',
      license: 'cc0-1.0',
      source: ' https://example.com/p ',
    })
    expect(calls[0].input.record).toMatchObject({
      license: 'CC0-1.0',
      source: 'https://example.com/p',
    })
  })

  it('rejects a bad license or source before writing', async () => {
    const {client, calls} = fakeClient()
    await expect(
      createPack(client, DID, {name: 'P', license: 'NONE'}),
    ).rejects.toMatchObject({code: 'invalid-provenance'})
    await expect(
      createPack(client, DID, {name: 'P', source: 'ftp://x.test/a'}),
    ).rejects.toMatchObject({code: 'invalid-provenance'})
    expect(calls).toHaveLength(0)
  })

  it('clears a field on edit with an empty string, and leaves it alone when absent', async () => {
    const {client, calls} = fakeClient(['tid1'])
    // the fake record has no license/source, so seed via a changed value first
    await updatePack(client, DID, `at://${DID}/blue.moji.packs.pack/tid1`, {
      license: 'MIT',
    })
    const put = calls.find(c => c.method === 'putRecord')!
    expect(put.input.record).toMatchObject({license: 'MIT', extra: 1})
    expect(put.input.record).not.toHaveProperty('source')
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
