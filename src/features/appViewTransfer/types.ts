import {type Did} from '@atproto/api'

/**
 * The transfer order is fixed, so progress renders in a stable sequence.
 * `notificationPreferences` is last, because it is the only collection that
 * replaces destination state instead of adding to it.
 */
export const APP_VIEW_TRANSFER_COLLECTIONS = [
  'mutedAccounts',
  'mutedLists',
  'bookmarks',
  'activitySubscriptions',
  'notificationPreferences',
] as const

export type AppViewTransferCollectionId =
  (typeof APP_VIEW_TRANSFER_COLLECTIONS)[number]

/** The collections the screen checks by default. Each one only adds items. */
export const DEFAULT_TRANSFER_COLLECTIONS: AppViewTransferCollectionId[] = [
  'mutedAccounts',
  'mutedLists',
  'bookmarks',
  'activitySubscriptions',
]

export type TransferEndpointId = 'bluesky' | 'blacksky'

/**
 * One side of a transfer. The checkpoint stores it, so a resume targets the
 * same services as the original run.
 */
export interface TransferEndpoint {
  id: TransferEndpointId
  did: Did
  url: string
}

export type AppViewTransferCollectionStatus =
  | 'pending'
  | 'countingSource'
  | 'countingDestination'
  | 'transferring'
  | 'complete'
  | 'unsupported'
  | 'failed'

export interface AppViewTransferCollectionProgress {
  status: AppViewTransferCollectionStatus
  sourceCount: number
  sourceScanned?: boolean
  processedCount?: number
  transferredCount: number
  /** Items the last pass could not copy, after the retries. */
  failedCount?: number
  destinationBefore?: number
  destinationScanned?: boolean
  destinationAfter?: number
  unsupportedAt?: 'source' | 'destination'
  /** XRPC details for troubleshooting. Holds no item data. */
  failureAt?: 'source' | 'destination'
  failureStatus?: number
  failureName?: string
}

export interface AppViewTransferCheckpoint {
  version: 1
  accountDid: string
  source: TransferEndpoint
  destination: TransferEndpoint
  selectedCollections: AppViewTransferCollectionId[]
  status: 'running' | 'paused' | 'complete'
  startedAt: string
  updatedAt: string
  collections: Partial<
    Record<AppViewTransferCollectionId, AppViewTransferCollectionProgress>
  >
}
