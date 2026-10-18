import {type Client, type LexMap} from '@atproto/lex'
import {type AtIdentifierString} from '@atproto/syntax'

import {com} from '#/lexicons'
import {cleanProvenance} from './provenance'
import {BLUEMOJI_ITEM_COLLECTION} from './types'
import {BluemojiUploadError} from './upload'

export type ItemChanges = {
  alt?: string
  adultOnly?: boolean
  /** An empty string clears it; undefined leaves it alone. */
  license?: string
  source?: string
}

/** The record key (last path segment) of an item's AT-URI. */
export const rkeyOfItem = (uri: string) => uri.slice(uri.lastIndexOf('/') + 1)

/**
 * Edits an existing emoji's description, adult flag, license and source.
 *
 * The name (which is the record key) and the images are not editable here:
 * renaming would orphan every post that uses the old name, and changing the
 * image would change what old posts show. Both are better done as a new emoji.
 *
 * Reads the current record and writes it back with only those fields changed,
 * pinned to the CID that was read so a concurrent edit from another device is
 * refused rather than overwritten. Blobs and anything this app does not know
 * about are carried through untouched.
 */
export async function updateItem(
  client: Client,
  did: AtIdentifierString,
  rkey: string,
  changes: ItemChanges,
): Promise<void> {
  const current = await client.call(com.atproto.repo.getRecord, {
    repo: did,
    collection: BLUEMOJI_ITEM_COLLECTION,
    rkey,
  })
  const record: LexMap = {...current.value}

  if (changes.alt !== undefined) {
    const alt = changes.alt.trim()
    if (alt) record.alt = alt
    else delete record.alt
  }
  if (changes.adultOnly !== undefined) {
    if (changes.adultOnly) record.adultOnly = true
    else delete record.adultOnly
  }
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
    collection: BLUEMOJI_ITEM_COLLECTION,
    rkey,
    validate: false,
    swapRecord: current.cid,
    record,
  })
}

/**
 * Deletes an emoji. Posts that used it keep their `:name:` text, which shows as
 * plain text once the emoji is gone; copies other people made are unaffected,
 * since copying duplicates the bytes. Pack memberships that point at it are
 * left for the AppView to ignore.
 */
export async function deleteItem(
  client: Client,
  did: AtIdentifierString,
  rkey: string,
): Promise<void> {
  await client.call(com.atproto.repo.deleteRecord, {
    repo: did,
    collection: BLUEMOJI_ITEM_COLLECTION,
    rkey,
  })
}
