import {
  AI_PREFERENCES_COLLECTION,
  type AiPreferencesRecord,
  buildUpdatedRecord,
  preferenceToValue,
} from '../ai-preferences'

describe('preferenceToValue', () => {
  it('returns unset for an omitted preference', () => {
    expect(preferenceToValue(undefined)).toBe('unset')
  })

  it('returns allow when permitted', () => {
    expect(
      preferenceToValue({allow: true, updatedAt: '2026-01-01T00:00:00.000Z'}),
    ).toBe('allow')
  })

  it('returns deny when denied', () => {
    expect(
      preferenceToValue({allow: false, updatedAt: '2026-01-01T00:00:00.000Z'}),
    ).toBe('deny')
  })
})

describe('buildUpdatedRecord', () => {
  const existing: AiPreferencesRecord = {
    $type: AI_PREFERENCES_COLLECTION,
    scope: {$type: `${AI_PREFERENCES_COLLECTION}#globalScope`},
    updatedAt: '2026-01-01T00:00:00.000Z',
    preferences: {
      training: {allow: false, updatedAt: '2026-01-01T00:00:00.000Z'},
      embedding: {allow: true, updatedAt: '2026-01-02T00:00:00.000Z'},
    },
  }

  it('creates a default global-scope record when none exists', () => {
    const record = buildUpdatedRecord(undefined, 'training', 'deny')
    expect(record.$type).toBe(AI_PREFERENCES_COLLECTION)
    expect(record.scope.$type).toBe(`${AI_PREFERENCES_COLLECTION}#globalScope`)
    expect(record.preferences.training).toMatchObject({allow: false})
    expect(record.preferences.embedding).toBeUndefined()
  })

  it('only touches the changed preference timestamp', () => {
    const record = buildUpdatedRecord(existing, 'training', 'allow')
    expect(record.preferences.training?.allow).toBe(true)
    expect(record.preferences.training?.updatedAt).not.toBe(
      '2026-01-01T00:00:00.000Z',
    )
    expect(record.preferences.embedding).toEqual({
      allow: true,
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
  })

  it('bumps the record-level updatedAt', () => {
    const record = buildUpdatedRecord(existing, 'inference', 'deny')
    expect(record.updatedAt).not.toBe('2026-01-01T00:00:00.000Z')
    expect(record.preferences.inference).toMatchObject({allow: false})
  })

  it('omits a preference when set back to unset', () => {
    const record = buildUpdatedRecord(existing, 'training', 'unset')
    expect(record.preferences.training).toBeUndefined()
    expect('training' in record.preferences).toBe(false)
    expect(record.preferences.embedding).toEqual({
      allow: true,
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
  })

  it('does not mutate the existing record', () => {
    buildUpdatedRecord(existing, 'embedding', 'deny')
    expect(existing.preferences.embedding?.allow).toBe(true)
  })
})
