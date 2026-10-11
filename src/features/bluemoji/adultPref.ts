import {useSyncExternalStore} from 'react'

import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {useAgeAssurance} from '#/ageAssurance'
import {device} from '#/storage'

export type AdultEmojiPref = 'show' | 'hide'

/** Adult-only emoji show as their `:alias:` text unless the user opts in. */
export const DEFAULT_ADULT_EMOJI_PREF: AdultEmojiPref = 'hide'

const read = (): AdultEmojiPref =>
  device.get(['bluemojiAdultOnly']) ?? DEFAULT_ADULT_EMOJI_PREF

/*
 * One store for the whole app. Every inline emoji reads this, so a listener
 * per emoji (what `useStorage` would open) is not an option in a long feed.
 */
let current = read()
const listeners = new Set<() => void>()
let sub: {remove: () => void} | undefined

function subscribe(cb: () => void) {
  if (!listeners.size) {
    current = read()
    sub = device.addOnValueChangedListener(['bluemojiAdultOnly'], () => {
      current = read()
      listeners.forEach(l => l())
    })
  }
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
    if (!listeners.size) {
      sub?.remove()
      sub = undefined
    }
  }
}

export function useAdultEmojiPref(): AdultEmojiPref {
  return useSyncExternalStore(subscribe, () => current, read)
}

export function setAdultEmojiPref(pref: AdultEmojiPref) {
  device.set(['bluemojiAdultOnly'], pref)
}

/**
 * Whether adult-only emoji may be drawn. Needs both this preference and the
 * account-level adult content switch (which age assurance can force off), so
 * the emoji setting can never loosen what the user's moderation settings
 * already forbid.
 */
export function useAdultEmojiVisible(): boolean {
  const pref = useAdultEmojiPref()
  const adultContentEnabled = !!useModerationOpts()?.prefs.adultContentEnabled
  const aa = useAgeAssurance()
  return (
    pref === 'show' && adultContentEnabled && !aa.flags.adultContentDisabled
  )
}
