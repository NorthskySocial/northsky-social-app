import {createRef} from 'react'
import {describe, expect, it, jest} from '@jest/globals'
import {act, fireEvent, render, screen} from '@testing-library/react-native'

import {
  type EmojiSuggestion,
  suggestionLabel,
  SuggestionList,
} from '../editor/suggestion'
import {type BluemojiItemView} from '../types'

jest.mock('@tiptap/react', () => ({ReactRenderer: class {}}))
jest.mock('tippy.js', () => ({__esModule: true, default: () => []}))
jest.mock('expo-image', () => ({Image: () => null}))
jest.mock('#/alf', () => ({
  atoms: new Proxy({}, {get: () => ({})}),
  useTheme: () => ({atoms: {}}),
}))
jest.mock('#/components/Typography', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Text: (require('react-native') as typeof import('react-native')).Text,
}))

const cat: BluemojiItemView = {
  uri: 'at://did:plc:a/blue.moji.collection.item/cat',
  did: 'did:plc:a',
  name: ':cat:',
  alt: 'a round cat',
  formats: {png_128: {ref: {$link: 'bafkcat'}}},
}
const dog: BluemojiItemView = {
  ...cat,
  uri: cat.uri + '2',
  name: ':dog:',
  alt: undefined,
}

const items: EmojiSuggestion[] = [
  {key: 'a', kind: 'bluemoji', item: cat},
  {key: 'b', kind: 'bluemoji', item: dog},
  {key: 'c', kind: 'unicode', native: '😸', id: 'smile_cat'},
]

function setup() {
  const command = jest.fn()
  const ref = createRef<{
    onKeyDown: (p: {event: KeyboardEvent}) => boolean
  }>()
  render(
    // @ts-expect-error only the props the list reads
    <SuggestionList ref={ref} items={items} command={command} />,
  )
  return {command, ref}
}

describe('suggestionLabel', () => {
  it('leads with the description, then the alias', () => {
    expect(suggestionLabel(items[0])).toBe('a round cat, :cat:')
    expect(suggestionLabel(items[1])).toBe(':dog:')
    expect(suggestionLabel(items[2])).toBe('😸 :smile_cat:')
  })
})

describe('SuggestionList', () => {
  it('gives every row an accessible name, a role and a stable test id', () => {
    setup()
    items.forEach((entry, i) => {
      const row = screen.getByTestId(`bluemojiSuggestion-${i}`)
      expect(row.props.accessibilityRole).toBe('button')
      expect(row.props.accessibilityLabel).toBe(suggestionLabel(entry))
    })
  })

  it('marks the highlighted row as selected for screen readers', () => {
    const {ref} = setup()
    const selected = (i: number) =>
      (
        screen.getByTestId(`bluemojiSuggestion-${i}`).props as {
          accessibilityState: {selected: boolean}
        }
      ).accessibilityState.selected
    expect([selected(0), selected(1)]).toEqual([true, false])
    act(() => {
      ref.current!.onKeyDown({event: {key: 'ArrowDown'} as KeyboardEvent})
    })
    expect([selected(0), selected(1)]).toEqual([false, true])
  })

  it('picks with the keyboard, and with a press', () => {
    const {ref, command} = setup()
    act(() => {
      ref.current!.onKeyDown({event: {key: 'ArrowDown'} as KeyboardEvent})
    })
    let handled = false
    act(() => {
      handled = ref.current!.onKeyDown({event: {key: 'Enter'} as KeyboardEvent})
    })
    expect(handled).toBe(true)
    expect(command).toHaveBeenLastCalledWith({item: dog})

    fireEvent.press(screen.getByTestId('bluemojiSuggestion-2'))
    expect(command).toHaveBeenLastCalledWith({native: '😸'})
  })
})
