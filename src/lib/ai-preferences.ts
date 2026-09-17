/**
 * northsky: types and pure helpers for the community.lexicon.preference.ai
 * lexicon, which has no generated schema in `#/lexicons`. See
 * https://lexicon.garden/lexicon/did:plc:mtr7qrqtcyseedx3jyr5o7db/community.lexicon.preference.ai
 */
export const AI_PREFERENCES_COLLECTION = 'community.lexicon.preference.ai'

export type AiPreference = {
  allow: boolean
  updatedAt: string
}

export type AiPreferenceSet = {
  training?: AiPreference
  embedding?: AiPreference
  inference?: AiPreference
  syntheticContent?: AiPreference
}

export type AiPreferenceKey = keyof AiPreferenceSet

export type AiPreferencesRecord = {
  $type: typeof AI_PREFERENCES_COLLECTION
  scope: {
    $type: `${typeof AI_PREFERENCES_COLLECTION}#globalScope`
  }
  updatedAt: string
  preferences: AiPreferenceSet
}

/**
 * Tri-state value shown in the UI. `unset` means the preference is omitted
 * from the record entirely (no declared preference).
 */
export type AiPreferenceValue = 'allow' | 'deny' | 'unset'

export function createDefaultRecord(): AiPreferencesRecord {
  return {
    $type: AI_PREFERENCES_COLLECTION,
    scope: {
      $type: `${AI_PREFERENCES_COLLECTION}#globalScope`,
    },
    updatedAt: new Date().toISOString(),
    preferences: {},
  }
}

export function preferenceToValue(pref?: AiPreference): AiPreferenceValue {
  if (!pref) return 'unset'
  return pref.allow ? 'allow' : 'deny'
}

/**
 * Merges a single preference change into the existing record, only touching
 * the changed key's timestamp so other preferences keep their `updatedAt`.
 */
export function buildUpdatedRecord(
  current: AiPreferencesRecord | undefined,
  key: AiPreferenceKey,
  value: AiPreferenceValue,
): AiPreferencesRecord {
  const now = new Date().toISOString()
  const base = current ?? createDefaultRecord()
  const preferences: AiPreferenceSet = {...base.preferences}
  if (value === 'unset') {
    delete preferences[key]
  } else {
    preferences[key] = {
      allow: value === 'allow',
      updatedAt: now,
    }
  }
  return {
    $type: AI_PREFERENCES_COLLECTION,
    scope: {
      $type: `${AI_PREFERENCES_COLLECTION}#globalScope`,
    },
    updatedAt: now,
    preferences,
  }
}
