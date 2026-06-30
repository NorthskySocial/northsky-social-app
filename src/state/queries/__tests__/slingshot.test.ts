import {TID} from '@atproto/common-web'

import {_rkeyFromUri as rkeyFromUri, isRecentTid} from '../slingshot'

describe('isRecentTid', () => {
  it('returns true for a TID created just now', () => {
    const tid = TID.next()
    expect(isRecentTid(tid.toString())).toBe(true)
  })

  it('returns false for an invalid TID', () => {
    expect(isRecentTid('not-a-tid')).toBe(false)
    expect(isRecentTid('')).toBe(false)
  })

  it('returns false for a very old TID', () => {
    // Create a TID from a timestamp 30 days ago
    const thirtyDaysAgoUs = (Date.now() - 30 * 24 * 60 * 60 * 1000) * 1000
    const tid = TID.fromTime(thirtyDaysAgoUs, 0)
    expect(isRecentTid(tid.toString())).toBe(false)
  })

  it('returns true for a TID from 3 days ago', () => {
    const threeDaysAgoUs = (Date.now() - 3 * 24 * 60 * 60 * 1000) * 1000
    const tid = TID.fromTime(threeDaysAgoUs, 0)
    expect(isRecentTid(tid.toString())).toBe(true)
  })

  it('returns false for a TID from 8 days ago', () => {
    const eightDaysAgoUs = (Date.now() - 8 * 24 * 60 * 60 * 1000) * 1000
    const tid = TID.fromTime(eightDaysAgoUs, 0)
    expect(isRecentTid(tid.toString())).toBe(false)
  })
})

describe('rkeyFromUri', () => {
  it('extracts rkey from a standard at-uri', () => {
    expect(rkeyFromUri('at://did:plc:abc123/app.bsky.feed.post/3abcxyz')).toBe(
      '3abcxyz',
    )
  })

  it('returns undefined for too-short URIs', () => {
    expect(rkeyFromUri('at://did:plc:abc123')).toBeUndefined()
    expect(
      rkeyFromUri('at://did:plc:abc123/app.bsky.feed.post'),
    ).toBeUndefined()
  })

  it('handles URIs with extra segments', () => {
    expect(rkeyFromUri('at://did:plc:abc/app.bsky.feed.post/3abc/extra')).toBe(
      '3abc',
    )
  })

  it('returns undefined for empty string', () => {
    expect(rkeyFromUri('')).toBeUndefined()
  })
})
