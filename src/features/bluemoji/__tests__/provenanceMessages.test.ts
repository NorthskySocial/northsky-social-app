import {afterAll, beforeAll, describe, expect, it} from '@jest/globals'
import {i18n} from '@lingui/core'

import {COMMON_LICENSES} from '../provenance'
import {provenanceProblem} from '../ProvenanceFields'
import {
  ALL_RIGHTS_RESERVED_CHIP,
  LICENSE_DESCRIPTIONS,
  licenseProblem,
  sourceProblem,
} from '../provenanceMessages'

jest.mock('#/alf', () => ({atoms: {}, useTheme: () => ({})}))
jest.mock('#/components/Button', () => ({}))
jest.mock('#/components/forms/TextField', () => ({}))
jest.mock('#/components/Typography', () => ({}))

describe('license descriptions are translatable', () => {
  it('has a description for every license offered', () => {
    for (const {id} of COMMON_LICENSES) {
      expect(LICENSE_DESCRIPTIONS[id]).toBeDefined()
    }
  })

  it('gives each message its own catalog id', () => {
    const ids = [
      ...Object.values(LICENSE_DESCRIPTIONS),
      ALL_RIGHTS_RESERVED_CHIP,
      licenseProblem('MIT OR')!,
      sourceProblem('ftp://x.test')!,
    ].map(d => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  describe('in another language', () => {
    const pseudo = (id: string | undefined) => `«${id}»`
    const descriptors = [
      ...Object.values(LICENSE_DESCRIPTIONS),
      ALL_RIGHTS_RESERVED_CHIP,
      licenseProblem('MIT OR')!,
      licenseProblem('x'.repeat(200))!,
      sourceProblem('ftp://x.test')!,
      sourceProblem(`https://example.com/${'a'.repeat(3000)}`)!,
    ]

    beforeAll(() => {
      // A catalog for a made-up locale that translates every message by id: if a
      // message were hard-coded English, or built outside Lingui, it would not
      // come out wrapped.
      i18n.load(
        'xx',
        Object.fromEntries(descriptors.map(d => [d.id, pseudo(d.id)])),
      )
      i18n.activate('xx')
    })
    afterAll(() => {
      i18n.load('en', {})
      i18n.activate('en')
    })

    it('renders every license description, error and chip from the catalog', () => {
      for (const d of descriptors) {
        expect(i18n._(d)).toBe(pseudo(d.id))
      }
    })
  })
})

describe('what is shown for bad input', () => {
  it('uses one friendly message per kind of problem, not the helper English', () => {
    expect(i18n._(licenseProblem('MIT OR')!)).not.toMatch(/ends too early/i)
    expect(licenseProblem('MIT OR')).toBe(licenseProblem('(MIT'))
    expect(licenseProblem('NONE')).not.toBeNull()
    expect(sourceProblem('javascript:alert(1)')).toBe(sourceProblem('ftp://x'))
    expect(sourceProblem('has space.com')).not.toBeNull()
  })

  it('accepts empty and valid values', () => {
    expect(licenseProblem('')).toBeNull()
    expect(licenseProblem('cc-by-4.0')).toBeNull()
    expect(licenseProblem('MIT OR Apache-2.0')).toBeNull()
    expect(sourceProblem('')).toBeNull()
    expect(sourceProblem('https://example.com/art')).toBeNull()
  })
})

describe('invalid input still blocks saving', () => {
  it('reports a problem for either field', () => {
    expect(provenanceProblem('MIT OR', '')).not.toBeNull()
    expect(provenanceProblem('', 'not a url')).not.toBeNull()
    expect(provenanceProblem('CC-BY-4.0', 'https://example.com')).toBeNull()
    expect(provenanceProblem('', '')).toBeNull()
  })
})
