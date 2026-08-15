import {type ReactNode} from 'react'
import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {act, renderHook} from '@testing-library/react-native'

import {
  Provider,
  usePostNaming,
  usePostVocabulary,
  useSetPostNaming,
} from '#/features/postVocabulary'

/* In-memory stand-in for the MMKV-backed device storage. */
const mockStore = new Map<string, unknown>()
const mockListeners = new Set<() => void>()
jest.mock('#/storage', () => ({
  device: {
    get: ([key]: [string]) => mockStore.get(key),
    set: ([key]: [string], data: unknown) => {
      mockStore.set(key, data)
      mockListeners.forEach(fn => fn())
    },
    addOnValueChangedListener: (_scopes: [string], callback: () => void) => {
      mockListeners.add(callback)
      return {remove: () => mockListeners.delete(callback)}
    },
  },
}))

i18n.loadAndActivate({locale: 'en', messages: {}})

function wrapper({children}: {children: ReactNode}) {
  return (
    <I18nProvider i18n={i18n}>
      <Provider>{children}</Provider>
    </I18nProvider>
  )
}

function renderVocabulary() {
  return renderHook(
    () => ({
      vocab: usePostVocabulary(),
      naming: usePostNaming(),
      setNaming: useSetPostNaming(),
    }),
    {wrapper},
  )
}

beforeEach(() => {
  mockStore.clear()
  mockListeners.clear()
})

describe('post naming', () => {
  it('ships the skeet wording, so an untouched install reads as before', () => {
    const {result} = renderVocabulary()

    expect(result.current.naming).toBe('skeet')
    expect(result.current.vocab.post).toBe('Skeet')
    expect(result.current.vocab.repost).toBe('Reskeet')
  })

  it('reads the stored choice', () => {
    mockStore.set('postNaming', 'post')
    const {result} = renderVocabulary()

    expect(result.current.vocab.newPost).toBe('New post')
    expect(result.current.vocab.repost).toBe('Repost')
  })

  it('persists a change and applies it without a reload', () => {
    const {result} = renderVocabulary()

    act(() => result.current.setNaming('post'))

    expect(mockStore.get('postNaming')).toBe('post')
    expect(result.current.vocab.post).toBe('Post')
    expect(result.current.vocab.newPost).toBe('New post')
  })
})

describe('counted wordings', () => {
  it('agrees with the naming in both the singular and the plural', () => {
    const {result} = renderVocabulary()

    expect(result.current.vocab.repostCount(1)).toBe('1 reskeet')
    expect(result.current.vocab.repostCount(2)).toBe('2 reskeets')
    expect(result.current.vocab.repostNoun(1)).toBe('reskeet')
    expect(result.current.vocab.repostA11yLabel(3)).toBe('Reskeet (3 reskeets)')

    act(() => result.current.setNaming('post'))

    expect(result.current.vocab.repostCount(1)).toBe('1 repost')
    expect(result.current.vocab.repostNoun(2)).toBe('reposts')
    expect(result.current.vocab.undoRepostA11yLabel(3)).toBe(
      'Undo repost (3 reposts)',
    )
  })
})

type Vocabulary = ReturnType<typeof usePostVocabulary>

/** Resolves a field to the string it renders, whether or not it takes an argument. */
function read(vocab: Vocabulary, key: keyof Vocabulary): string {
  if (key === 'repostedBy') return vocab.repostedBy('Sakura')
  const value = vocab[key]
  return typeof value === 'function' ? value(2) : value
}

describe('coverage', () => {
  /*
   * A field authored on only one branch would silently show the wrong wording
   * for one of the two settings, and no call site would reveal it.
   */
  it('gives every field a different wording per naming', () => {
    mockStore.set('postNaming', 'skeet')
    const {result: asSkeet} = renderVocabulary()
    mockStore.set('postNaming', 'post')
    const {result: asPost} = renderVocabulary()

    const skeetVocab = asSkeet.current.vocab
    const postVocab = asPost.current.vocab
    const keys = Object.keys(skeetVocab) as (keyof Vocabulary)[]

    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect([key, read(skeetVocab, key)]).not.toEqual([
        key,
        read(postVocab, key),
      ])
    }
  })
})
