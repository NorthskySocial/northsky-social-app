import {type BlobRef, type Client, type LexMap} from '@atproto/lex'
import {type AtIdentifierString} from '@atproto/syntax'

import {uploadBlob} from '#/lib/api/upload-blob'
import {com} from '#/lexicons'
import {aliasToRkey, normalizeAlias} from '../alias'
import {blobCid, bluemojiImageUrl} from '../api'
import {cleanProvenance, isCopyable, viewProvenance} from '../provenance'
import {BLUEMOJI_ITEM_COLLECTION, type BluemojiItemView} from '../types'
import {BluemojiUploadError, recordExists} from '../upload'
import {
  PACK_COLLECTION,
  PACK_ITEM_COLLECTION,
  type PackInput,
  rkeyOf,
} from './types'

type Did = AtIdentifierString

const INLINE_KEYS = [
  'png_128',
  'webp_128',
  'gif_128',
  'apng_128',
  'lottie',
] as const
const STICKER_KEYS = ['png_512', 'webp_512', 'gif_512', 'apng_512'] as const

/* ---------------------------------------------------------------- packs */

/** Creates a pack and returns its AT-URI. */
export async function createPack(
  client: Client,
  did: Did,
  input: PackInput,
): Promise<string> {
  const provenance = cleanProvenance(input.license, input.source)
  if ('error' in provenance) {
    throw new BluemojiUploadError('invalid-provenance', provenance.error)
  }
  const res = await client.call(com.atproto.repo.createRecord, {
    repo: did,
    collection: PACK_COLLECTION,
    validate: false,
    record: {
      $type: PACK_COLLECTION,
      name: input.name.trim(),
      ...(input.description?.trim()
        ? {description: input.description.trim()}
        : {}),
      ...(input.adultOnly ? {adultOnly: true} : {}),
      ...provenance,
      createdAt: new Date().toISOString(),
    },
  })
  return res.uri
}

/**
 * Edits a pack's name, description or adult flag. Reads the current record and
 * writes it back with only those fields changed, so anything else on it (the
 * icon, labels, a field a newer client added) survives.
 */
export async function updatePack(
  client: Client,
  did: Did,
  packUri: string,
  changes: Partial<PackInput>,
): Promise<void> {
  const rkey = rkeyOf(packUri)
  const current = await client.call(com.atproto.repo.getRecord, {
    repo: did,
    collection: PACK_COLLECTION,
    rkey,
  })
  const record: LexMap = {...current.value}
  if (changes.name !== undefined) record.name = changes.name.trim()
  if (changes.description !== undefined) {
    const d = changes.description.trim()
    if (d) record.description = d
    else delete record.description
  }
  if (changes.adultOnly !== undefined) {
    if (changes.adultOnly) record.adultOnly = true
    else delete record.adultOnly
  }
  // An empty string clears the field; absent leaves it alone.
  if (changes.license !== undefined || changes.source !== undefined) {
    const next = cleanProvenance(
      changes.license ?? (record.license as string | undefined),
      changes.source ?? (record.source as string | undefined),
    )
    if ('error' in next) {
      throw new BluemojiUploadError('invalid-provenance', next.error)
    }
    if (changes.license !== undefined) {
      if (next.license) record.license = next.license
      else delete record.license
    }
    if (changes.source !== undefined) {
      if (next.source) record.source = next.source
      else delete record.source
    }
  }
  await client.call(com.atproto.repo.putRecord, {
    repo: did,
    collection: PACK_COLLECTION,
    rkey,
    validate: false,
    record,
  })
}

/**
 * Deletes a pack along with the pack-item records that point at it, in one
 * commit, so no orphaned memberships are left behind in the repo.
 */
export async function deletePack(
  client: Client,
  did: Did,
  packUri: string,
): Promise<void> {
  const memberships: string[] = []
  let cursor: string | undefined
  do {
    const page = await client.call(com.atproto.repo.listRecords, {
      repo: did,
      collection: PACK_ITEM_COLLECTION,
      limit: 100,
      cursor,
    })
    for (const r of page.records) {
      if ((r.value as {pack?: string}).pack === packUri) {
        memberships.push(rkeyOf(r.uri))
      }
    }
    cursor = page.cursor
  } while (cursor)

  const writes = [
    ...memberships.map(rkey => ({
      $type: 'com.atproto.repo.applyWrites#delete' as const,
      collection: PACK_ITEM_COLLECTION,
      rkey,
    })),
    {
      $type: 'com.atproto.repo.applyWrites#delete' as const,
      collection: PACK_COLLECTION,
      rkey: rkeyOf(packUri),
    },
  ]
  // applyWrites is capped per call; chunk, and delete the pack last.
  const CHUNK = 100
  for (let i = 0; i < writes.length; i += CHUNK) {
    await client.call(com.atproto.repo.applyWrites, {
      repo: did,
      writes: writes.slice(i, i + CHUNK),
    })
  }
}

/** Adds an emoji (by its item record's AT-URI) to a pack. */
export async function addToPack(
  client: Client,
  did: Did,
  packUri: string,
  itemUri: string,
): Promise<string> {
  const res = await client.call(com.atproto.repo.createRecord, {
    repo: did,
    collection: PACK_ITEM_COLLECTION,
    validate: false,
    record: {
      $type: PACK_ITEM_COLLECTION,
      subject: itemUri,
      pack: packUri,
      createdAt: new Date().toISOString(),
    },
  })
  return res.uri
}

/** Removes a membership. `packItemUri` is the pack-item record, not the emoji. */
export async function removeFromPack(
  client: Client,
  did: Did,
  packItemUri: string,
): Promise<void> {
  await client.call(com.atproto.repo.deleteRecord, {
    repo: did,
    collection: PACK_ITEM_COLLECTION,
    rkey: rkeyOf(packItemUri),
  })
}

/* -------------------------------------------------------------- install */

export type InstallOutcome =
  | {status: 'installed'; rkey: string}
  | {status: 'exists'}
  /** The creator has not granted copying (see RFC 0006). */
  | {status: 'not-copyable'}
  | {status: 'failed'; error: unknown}

type Fetcher = (url: string) => Promise<Blob | undefined>

/** Downloads one rendition through the AppView's cached image proxy. */
const defaultFetchBlob: Fetcher = async url => {
  const res = await fetch(url)
  return res.ok ? res.blob() : undefined
}

async function copyRenditions(
  client: Client,
  source: BluemojiItemView,
  values: Record<string, unknown> | undefined,
  keys: readonly string[],
  fetchBlob: Fetcher,
): Promise<Record<string, BlobRef>> {
  const out: Record<string, BlobRef> = {}
  for (const key of keys) {
    const cid = blobCid(values?.[key] as never)
    if (!cid) continue
    const blob = await fetchBlob(bluemojiImageUrl(source.did, cid))
    if (!blob) continue
    out[key] = (await uploadBlob(client, blob, blob.type || undefined)).blob
  }
  return out
}

/**
 * Copies one emoji into the user's own collection. Copying is duplication by
 * design: the bytes are fetched and re-uploaded to the copier's repo, so the
 * emoji keeps working if the original account goes away. `copyOf` records where
 * it came from.
 *
 * `renameTo` is the alias to save it as (the rkey follows it). Throws
 * `alias-taken` if the user already has that alias, and `not-copyable` unless
 * the emoji carries a license that permits copying (RFC 0006: no license is no
 * grant). The copy keeps the license and source it was shared under. Both are
 * re-validated here, since the AppView's copy of them is the owner's say-so.
 */
export async function installItem({
  client,
  did,
  source,
  renameTo,
  fetchBlob = defaultFetchBlob,
}: {
  client: Client
  did: Did
  source: BluemojiItemView
  renameTo?: string
  fetchBlob?: Fetcher
}): Promise<{rkey: string; uri: string}> {
  const provenance = viewProvenance(source.license, source.source)
  if (!isCopyable(provenance.license)) {
    throw new BluemojiUploadError(
      'not-copyable',
      `${source.name} does not allow copying`,
    )
  }

  let alias: string
  let rkey: string
  try {
    alias = normalizeAlias(renameTo?.trim() || source.name)
    rkey = aliasToRkey(alias)
  } catch (e) {
    throw new BluemojiUploadError(
      'invalid-alias',
      e instanceof Error ? e.message : 'Invalid name',
    )
  }

  if (await recordExists(client, did, rkey)) {
    throw new BluemojiUploadError('alias-taken', `:${alias}: already exists`)
  }

  const formats = await copyRenditions(
    client,
    source,
    source.formats,
    INLINE_KEYS,
    fetchBlob,
  )
  if (!Object.keys(formats).length) {
    throw new Error(`Could not download ${source.name}`)
  }
  const stickerFormats = await copyRenditions(
    client,
    source,
    source.stickerFormats,
    STICKER_KEYS,
    fetchBlob,
  )

  const res = await client.call(com.atproto.repo.createRecord, {
    repo: did,
    collection: BLUEMOJI_ITEM_COLLECTION,
    rkey,
    validate: false,
    record: {
      $type: BLUEMOJI_ITEM_COLLECTION,
      name: `:${alias}:`,
      ...(source.alt ? {alt: source.alt} : {}),
      createdAt: new Date().toISOString(),
      formats: {$type: 'blue.moji.collection.item#formats_v1', ...formats},
      ...(Object.keys(stickerFormats).length
        ? {
            stickerFormats: {
              $type: 'blue.moji.collection.item#stickerFormats_v0',
              ...stickerFormats,
            },
          }
        : {}),
      ...(source.adultOnly ? {adultOnly: true} : {}),
      ...provenance,
      copyOf: source.uri,
    },
  })
  return {rkey, uri: res.uri}
}

/**
 * Installs every emoji in a pack, one at a time (each is a download and an
 * upload, so parallelism would mostly pile up memory). Emoji whose alias the
 * user already has are skipped rather than overwritten; they can be installed
 * individually under a new name. One failure does not stop the rest.
 */
export async function installPack({
  client,
  did,
  items,
  haveAliases,
  onProgress,
  fetchBlob,
}: {
  client: Client
  did: Did
  items: BluemojiItemView[]
  /** Canonical aliases already in the user's collection. */
  haveAliases: ReadonlySet<string>
  onProgress?: (done: number, total: number) => void
  fetchBlob?: Fetcher
}): Promise<{item: BluemojiItemView; outcome: InstallOutcome}[]> {
  const results: {item: BluemojiItemView; outcome: InstallOutcome}[] = []
  const taken = new Set(haveAliases)

  for (const item of items) {
    let outcome: InstallOutcome
    let alias: string | undefined
    try {
      alias = normalizeAlias(item.name)
    } catch {
      alias = undefined
    }
    if (alias && taken.has(alias)) {
      outcome = {status: 'exists'}
    } else {
      try {
        const {rkey} = await installItem({client, did, source: item, fetchBlob})
        if (alias) taken.add(alias)
        outcome = {status: 'installed', rkey}
      } catch (e) {
        outcome =
          e instanceof BluemojiUploadError && e.code === 'alias-taken'
            ? {status: 'exists'}
            : e instanceof BluemojiUploadError && e.code === 'not-copyable'
              ? {status: 'not-copyable'}
              : {status: 'failed', error: e}
      }
    }
    results.push({item, outcome})
    onProgress?.(results.length, items.length)
  }
  return results
}
