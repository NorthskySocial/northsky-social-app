/**
 * @jest-environment jsdom
 */
import {afterEach, describe, expect, it, jest} from '@jest/globals'
import {QueryClient} from '@tanstack/react-query'
import {Editor} from '@tiptap/core'
import {Document} from '@tiptap/extension-document'
import {Paragraph} from '@tiptap/extension-paragraph'
import {Text} from '@tiptap/extension-text'

import {BLUEMOJI_NODE, BluemojiNode, nodeAttrsFor} from '../editor/BluemojiNode'
import {DismissState} from '../editor/popupState'
import {
  lookupVisible,
  stripAdultNodes,
  visibleItems,
} from '../editor/visibility'
import {COLLECTION_INDEX_ROOT, invalidateBluemoji} from '../queryKeys'
import {type BluemojiItemView} from '../types'

const item = (name: string, adultOnly = false): BluemojiItemView => ({
  uri: `at://did:plc:a/blue.moji.collection.item/${name}`,
  did: 'did:plc:a',
  name: `:${name}:`,
  adultOnly,
  formats: {png_128: {ref: {$link: `bafk${name}`}}},
})

describe('adult-only emoji in the composer', () => {
  const items = [item('cat'), item('spicy', true)]

  it('are left out of completions unless visible', () => {
    expect(visibleItems(items, false).map(i => i.name)).toEqual([':cat:'])
    expect(visibleItems(items, true).map(i => i.name)).toEqual([
      ':cat:',
      ':spicy:',
    ])
  })

  it('are not turned into images by a finished :alias: unless visible', () => {
    const map = new Map(items.map(i => [i.name.replace(/:/g, ''), i]))
    expect(lookupVisible(map, 'spicy', false)).toBeUndefined()
    expect(lookupVisible(map, 'spicy', true)?.name).toBe(':spicy:')
    expect(lookupVisible(map, 'cat', false)?.name).toBe(':cat:')
  })

  it('are marked on the node so they can be taken back out later', () => {
    expect(nodeAttrsFor(item('spicy', true)).adult).toBe(true)
    expect(nodeAttrsFor(item('cat')).adult).toBe(false)
  })

  describe('already in the draft when visibility is switched off', () => {
    function editorWith(...emoji: BluemojiItemView[]) {
      const editor = new Editor({
        extensions: [Document, Paragraph, Text, BluemojiNode],
        content: '',
      })
      for (const e of emoji) editor.commands.insertBluemoji(e)
      return editor
    }

    it('are turned back into their text, leaving the others as images', () => {
      const editor = editorWith(item('cat'), item('spicy', true))
      expect(stripAdultNodes(editor)).toBe(1)
      const kinds = (editor.getJSON().content?.[0].content ?? []).map(
        n => n.type + (n.text ? `:${n.text}` : ''),
      )
      expect(kinds).toContain(BLUEMOJI_NODE)
      // the restored text joins the space that followed it into one text node
      expect(kinds).toContain('text: :spicy: ')
      expect(editor.getText()).toBe(':cat: :spicy: ')
    })

    it('does nothing when there is nothing to strip', () => {
      expect(stripAdultNodes(editorWith(item('cat')))).toBe(0)
    })

    it('copes with several, in any order', () => {
      const editor = editorWith(
        item('a', true),
        item('b'),
        item('c', true),
        item('d', true),
      )
      expect(stripAdultNodes(editor)).toBe(3)
      expect(editor.getText()).toBe(':a: :b: :c: :d: ')
    })
  })
})

describe('DismissState', () => {
  it('holds for the same query and ends when it changes', () => {
    const d = new DismissState()
    expect(d.isDismissed('ca')).toBe(false)
    d.dismiss('ca')
    expect(d.isDismissed('ca')).toBe(true)
    expect(d.isDismissed('cat')).toBe(false)
  })

  it('a new session starts undismissed', () => {
    const d = new DismissState()
    d.dismiss('ca')
    d.reset()
    expect(d.isDismissed('ca')).toBe(false)
  })
})

describe('invalidateBluemoji', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('marks the composer index stale along with the lists and items', () => {
    const qc = new QueryClient()
    for (const root of [
      COLLECTION_INDEX_ROOT,
      'bluemoji-collection',
      'bluemoji-item',
    ]) {
      qc.setQueryData([root, {did: 'did:plc:a'}], ['x'])
    }
    qc.setQueryData(['something-else', {did: 'did:plc:a'}], ['y'])
    invalidateBluemoji(qc)
    const stale = (root: string) =>
      qc.getQueryCache().find({queryKey: [root, {did: 'did:plc:a'}]})?.state
        .isInvalidated
    expect(stale(COLLECTION_INDEX_ROOT)).toBe(true)
    expect(stale('bluemoji-collection')).toBe(true)
    expect(stale('bluemoji-item')).toBe(true)
    expect(stale('something-else')).toBe(false)
  })

  it('runs again after the AppView has had time to index the write', () => {
    jest.useFakeTimers()
    const qc = new QueryClient()
    const spy = jest.spyOn(qc, 'invalidateQueries')
    invalidateBluemoji(qc)
    expect(spy).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(6000)
    expect(spy).toHaveBeenCalledTimes(3)
  })
})
