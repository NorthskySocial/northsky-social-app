import {MAX_PRONOUNS, normalizePronouns} from '../pronouns'

describe('normalizePronouns', () => {
  it('returns undefined for an empty string', () => {
    expect(normalizePronouns('')).toBeUndefined()
  })

  it('returns undefined for whitespace-only input', () => {
    expect(normalizePronouns('   ')).toBeUndefined()
  })

  it('trims trailing whitespace', () => {
    expect(normalizePronouns('they/them   ')).toBe('they/them')
  })

  it('preserves leading whitespace (only trailing is trimmed)', () => {
    expect(normalizePronouns('  she/her')).toBe('  she/her')
  })

  it('returns the value unchanged when already normalized', () => {
    expect(normalizePronouns('he/him')).toBe('he/him')
  })
})

describe('MAX_PRONOUNS', () => {
  it('caps the field at 20 graphemes', () => {
    expect(MAX_PRONOUNS).toBe(20)
  })
})
