import {type BluemojiItemView} from '../types'

export const PACK_COLLECTION = 'blue.moji.packs.pack' as const
export const PACK_ITEM_COLLECTION = 'blue.moji.packs.packitem' as const

export type PackInput = {
  name: string
  description?: string
  adultOnly?: boolean
  /** SPDX expression for the pack as a curated collection (not its items). */
  license?: string
  /** http(s) URL the pack was assembled from. */
  source?: string
}

export type PackCreator = {
  did: string
  handle: string
  displayName?: string
  avatar?: string
}

/** `blue.moji.packs.defs#packViewBasic` - a pack in a list. */
export type PackViewBasic = {
  uri: string
  cid: string
  name: string
  description?: string
  itemCount?: number
  license?: string
  source?: string
  indexedAt?: string
}

/** `blue.moji.packs.defs#packView` - a pack with its creator. */
export type PackView = {
  uri: string
  cid: string
  creator: PackCreator
  name: string
  description?: string
  packItemCount?: number
  license?: string
  source?: string
  indexedAt: string
}

/** `blue.moji.packs.defs#packItemView`. `uri` is the packitem record. */
export type PackItemView = {
  uri: string
  subject: BluemojiItemView
}

export type PackPage = {
  pack: PackView
  items: PackItemView[]
  cursor?: string
}

export type PackListPage = {packs: PackViewBasic[]; cursor?: string}

/** The record key (last path segment) of an AT-URI. */
export function rkeyOf(uri: string): string {
  return uri.slice(uri.lastIndexOf('/') + 1)
}

/** `at://did/blue.moji.packs.pack/rkey` for a pack route's params. */
export function packUriFor(did: string, rkey: string): string {
  return `at://${did}/${PACK_COLLECTION}/${rkey}`
}

/** The page anyone can open, on the Bluemoji site. Works without this app. */
export function packShareUrl(did: string, rkey: string): string {
  return `https://moji.blue/packs/${did}/${rkey}`
}
