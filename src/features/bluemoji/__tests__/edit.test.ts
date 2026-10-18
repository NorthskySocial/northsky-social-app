import {describe, expect, it, jest} from '@jest/globals'

import {deleteItem, rkeyOfItem, updateItem} from '../edit'

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

function fakeClient() {
  const calls: Call[] = []
  const client = {
    call: jest.fn((def: {$nsid: string}, input: Record<string, unknown>) => {
      const method = def.$nsid.split('.').pop()!
      calls.push({method, input})
      return Promise.resolve(
        method === 'getRecord'
          ? {uri: 'u', cid: 'bafyrecord', value: STORED}
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
