import {type ReactNode} from 'react'
import {Text} from 'react-native'
import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react-native'

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
    expect(result.current.vocab.newPost).toBe('New skeet')
    expect(result.current.vocab.post).toBe('Skeet')
    expect(result.current.vocab.postAll).toBe('Skeet All')
  })

  it('reads the stored choice', () => {
    mockStore.set('postNaming', 'post')
    const {result} = renderVocabulary()

    expect(result.current.vocab.newPost).toBe('New post')
    expect(result.current.vocab.post).toBe('Post')
  })

  it('persists a change', () => {
    const {result} = renderVocabulary()

    act(() => result.current.setNaming('post'))

    expect(mockStore.get('postNaming')).toBe('post')
  })
})

/*
 * The setting screen and the left sidebar are siblings, not parent and child.
 * The user has to see the compose button change while the setting is on screen,
 * so a change has to cross from one subtree to the other without a reload.
 */
describe('a change reaches a sibling subtree', () => {
  function SettingScreen() {
    const setNaming = useSetPostNaming()
    return <Text testID="setting" onPress={() => setNaming('post')} />
  }

  function ComposeButton() {
    const vocab = usePostVocabulary()
    return <Text testID="composeButton">{vocab.newPost}</Text>
  }

  it('relabels the compose button when the setting changes', () => {
    render(
      <>
        <SettingScreen />
        <ComposeButton />
      </>,
      {wrapper},
    )

    expect(screen.getByTestId('composeButton')).toHaveTextContent('New skeet')

    fireEvent.press(screen.getByTestId('setting'))

    expect(screen.getByTestId('composeButton')).toHaveTextContent('New post')
  })
})

type Vocabulary = ReturnType<typeof usePostVocabulary>

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
      expect([key, skeetVocab[key]]).not.toEqual([key, postVocab[key]])
    }
  })
})
