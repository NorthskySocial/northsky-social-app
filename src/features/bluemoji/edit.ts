import {type Client, type LexMap} from '@atproto/lex'
import {type AtIdentifierString} from '@atproto/syntax'

import {com} from '#/lexicons'
import {cleanProvenance, normalizeLicense, safeHref} from './provenance'
import {BLUEMOJI_ITEM_COLLECTION, type BluemojiItemView} from './types'
import {BluemojiUploadError} from './upload'

export type ItemChanges = {
  alt?: string
  adultOnly?: boolean
  /** An empty string clears it; undefined leaves it alone. */
  license?: string
  source?: string
}

export type EditForm = {
  alt: string
  adultOnly: boolean
  license: string
  source: string
}

/**
 * The fields that differ between what the form started from and what it holds
 * now. Sending only these means a save cannot overwrite a field the user never
 * touched with the stale value the form was opened with.
 */
export function diffItemChanges(
  baseline: BluemojiItemView,
  form: EditForm,
): ItemChanges {
  const changes: ItemChanges = {}
  if (form.alt.trim() !== (baseline.alt ?? '').trim()) changes.alt = form.alt
  if (form.adultOnly !== !!baseline.adultOnly)
    changes.adultOnly = form.adultOnly

  const license = form.license.trim()
    ? normalizeLicense(form.license.trim())
    : ''
  if (license !== (baseline.license ?? '')) changes.license = form.license

  const source = form.source.trim()
  const sameSource =
    (safeHref(source) ?? source) ===
    (safeHref(baseline.source) ?? baseline.source ?? '')
  if (!sameSource) changes.source = form.source
  return changes
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
 * Reads the current record and writes it back with only those fields changed.
 * Two guards against overwriting another device's edit: `expectedCid` (the
 * version the form was opened on) must still be current, and the write itself
 * is pinned to the version just read. Blobs and anything this app does not know
 * about are carried through untouched.
 *
 * Note a metadata edit changes the record's CID but not its images, so it must
 * not break the sticker embeds in old posts; see `stickerMatchesItem`.
 */
export async function updateItem(
  client: Client,
  did: AtIdentifierString,
  rkey: string,
  changes: ItemChanges,
  {expectedCid}: {expectedCid?: string} = {},
): Promise<{cid: string}> {
  const current = await client.call(com.atproto.repo.getRecord, {
    repo: did,
    collection: BLUEMOJI_ITEM_COLLECTION,
    rkey,
  })
  /*
   * The CID of what the form was opened on. Comparing it with the record as it
   * is *now* is what catches a change made on another device while the form was
   * open; `swapRecord` below only covers the instant between this read and the
   * write.
   */
  if (expectedCid && current.cid !== expectedCid) {
    throw new BluemojiUploadError('stale', 'The emoji was changed elsewhere')
  }
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

  const res = await client.call(com.atproto.repo.putRecord, {
    repo: did,
    collection: BLUEMOJI_ITEM_COLLECTION,
    rkey,
    validate: false,
    swapRecord: current.cid,
    record,
  })
  return {cid: res.cid}
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
