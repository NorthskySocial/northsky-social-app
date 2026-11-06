import {describe, expect, it, jest} from '@jest/globals'

import {deleteItem, diffItemChanges, rkeyOfItem, updateItem} from '../edit'
import {type BluemojiItemView} from '../types'

type Call = {method: string; input: Record<string, unknown>}

const STORED = {
  $type: 'blue.moji.collection.item',
  name: ':blobcat:',
  alt: 'old alt',
  adultOnly: true,
  license: 'MIT',
  source: 'https://example.com/old',
  createdAt: '2026-01-01T00:00:00.000Z',
  copyOf: 'at://did:plc:src/blue.moji.collection.item/blobcat',
  formats: {
    $type: 'blue.moji.collection.item#formats_v1',
    png_128: {$type: 'blob', ref: {$link: 'bafkpng'}, size: 10},
  },
  somethingNewer: {kept: true},
}

function fakeClient(currentCid = 'bafyrecord') {
  const calls: Call[] = []
  const client = {
    call: jest.fn((def: {$nsid: string}, input: Record<string, unknown>) => {
      const method = def.$nsid.split('.').pop()!
      calls.push({method, input})
      return Promise.resolve(
        method === 'getRecord'
          ? {uri: 'u', cid: currentCid, value: STORED}
          : method === 'putRecord'
            ? {uri: 'u', cid: 'bafynew'}
            : {},
      )
    }),
  }
  return {client: client as never, calls}
}

const DID = 'did:plc:me'
const written = (calls: Call[]) =>
  calls.find(c => c.method === 'putRecord')!.input.record as Record<
    string,
    unknown
  >

describe('rkeyOfItem', () => {
  it('takes the last path segment', () => {
    expect(
      rkeyOfItem('at://did:plc:a/blue.moji.collection.item/xn--mnchen-3ya'),
    ).toBe('xn--mnchen-3ya')
  })
})

describe('updateItem', () => {
  it('changes only the fields given, and carries everything else through', async () => {
    const {client, calls} = fakeClient()
    await updateItem(client, DID, 'blobcat', {alt: ' new alt '})
    const rec = written(calls)
    expect(rec.alt).toBe('new alt')
    // blobs, provenance of the copy, and fields this app does not know about
    expect(rec.formats).toEqual(STORED.formats)
    expect(rec.copyOf).toBe(STORED.copyOf)
    expect(rec.somethingNewer).toEqual({kept: true})
    expect(rec.createdAt).toBe(STORED.createdAt)
    expect(rec.license).toBe('MIT')
    expect(rec.adultOnly).toBe(true)
  })

  it('is pinned to the record it read, so a concurrent edit is refused', async () => {
    const {client, calls} = fakeClient()
    await updateItem(client, DID, 'blobcat', {alt: 'x'})
    const put = calls.find(c => c.method === 'putRecord')!
    expect(put.input).toMatchObject({rkey: 'blobcat', swapRecord: 'bafyrecord'})
  })

  it('clears fields with empty values', async () => {
    const {client, calls} = fakeClient()
    await updateItem(client, DID, 'blobcat', {
      alt: '',
      adultOnly: false,
      license: '',
      source: '',
    })
    const rec = written(calls)
    expect(rec).not.toHaveProperty('alt')
    expect(rec).not.toHaveProperty('adultOnly')
    expect(rec).not.toHaveProperty('license')
    expect(rec).not.toHaveProperty('source')
  })

  it('normalises a license and source on the way in', async () => {
    const {client, calls} = fakeClient()
    await updateItem(client, DID, 'blobcat', {
      license: 'cc-by-4.0',
      source: ' https://example.com/new ',
    })
    expect(written(calls)).toMatchObject({
      license: 'CC-BY-4.0',
      source: 'https://example.com/new',
    })
  })

  it('refuses a bad license or source without writing', async () => {
    const {client, calls} = fakeClient()
    await expect(
      updateItem(client, DID, 'blobcat', {license: 'NONE'}),
    ).rejects.toMatchObject({code: 'invalid-provenance'})
    await expect(
      updateItem(client, DID, 'blobcat', {source: 'javascript:alert(1)'}),
    ).rejects.toMatchObject({code: 'invalid-provenance'})
    expect(calls.some(c => c.method === 'putRecord')).toBe(false)
  })
})

describe('stale form saves', () => {
  it('refuses a save when the record is no longer the version the form opened on', async () => {
    // Device A opened the form at v1. Device B then saved, so the record is v2.
    // A's save-time read sees v2; swapRecord alone would happily overwrite it.
    const {client, calls} = fakeClient('bafyV2')
    await expect(
      updateItem(
        client,
        DID,
        'blobcat',
        {alt: 'from A'},
        {expectedCid: 'bafyV1'},
      ),
    ).rejects.toMatchObject({code: 'stale'})
    expect(calls.some(c => c.method === 'putRecord')).toBe(false)
  })

  it('goes ahead when the record is still the version the form opened on', async () => {
    const {client} = fakeClient('bafyV1')
    await expect(
      updateItem(client, DID, 'blobcat', {alt: 'ok'}, {expectedCid: 'bafyV1'}),
    ).resolves.toEqual({cid: 'bafynew'})
  })

  it('still works for an item whose view carried no CID', async () => {
    const {client} = fakeClient('bafyV2')
    await expect(
      updateItem(client, DID, 'blobcat', {alt: 'x'}),
    ).resolves.toBeDefined()
  })
})

describe('diffItemChanges', () => {
  const baseline: BluemojiItemView = {
    uri: 'at://did:plc:me/blue.moji.collection.item/blobcat',
    did: DID,
    name: ':blobcat:',
    alt: 'a cat',
    adultOnly: false,
    license: 'CC-BY-4.0',
    source: 'https://example.com/art',
    formats: {},
  }
  const same = {
    alt: 'a cat',
    adultOnly: false,
    license: 'CC-BY-4.0',
    source: 'https://example.com/art',
  }

  it('is empty when nothing changed', () => {
    expect(diffItemChanges(baseline, same)).toEqual({})
  })

  it('does not count tidying (case, spacing, a trailing slash) as a change', () => {
    expect(
      diffItemChanges(baseline, {
        ...same,
        alt: '  a cat ',
        license: ' cc-by-4.0 ',
        source: 'https://example.com/art ',
      }),
    ).toEqual({})
    expect(
      diffItemChanges(
        {...baseline, source: 'https://example.com/'},
        {...same, source: 'https://example.com'},
      ),
    ).toEqual({})
  })

  it('reports only the field that changed, so untouched fields are never rewritten', () => {
    expect(diffItemChanges(baseline, {...same, license: 'MIT'})).toEqual({
      license: 'MIT',
    })
    expect(diffItemChanges(baseline, {...same, adultOnly: true})).toEqual({
      adultOnly: true,
    })
    expect(diffItemChanges(baseline, {...same, alt: 'a dog'})).toEqual({
      alt: 'a dog',
    })
  })

  it('treats clearing a field as a change', () => {
    expect(diffItemChanges(baseline, {...same, license: ''})).toEqual({
      license: '',
    })
    expect(diffItemChanges(baseline, {...same, source: ''})).toEqual({
      source: '',
    })
  })

  it('handles an item that started with nothing', () => {
    const bare: BluemojiItemView = {
      ...baseline,
      alt: undefined,
      license: undefined,
      source: undefined,
    }
    expect(
      diffItemChanges(bare, {
        alt: '',
        adultOnly: false,
        license: '',
        source: '',
      }),
    ).toEqual({})
  })
})

describe('deleteItem', () => {
  it('deletes the item record', async () => {
    const {client, calls} = fakeClient()
    await deleteItem(client, DID, 'blobcat')
    expect(calls[0]).toMatchObject({
      method: 'deleteRecord',
      input: {collection: 'blue.moji.collection.item', rkey: 'blobcat'},
    })
  })
})
