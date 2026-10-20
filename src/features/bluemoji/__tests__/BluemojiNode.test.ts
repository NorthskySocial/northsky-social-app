/**
 * @jest-environment jsdom
 */
import {describe, expect, it} from '@jest/globals'
import {Editor} from '@tiptap/core'
import {Document} from '@tiptap/extension-document'
import {Paragraph} from '@tiptap/extension-paragraph'
import {Text} from '@tiptap/extension-text'
import {PluginKey} from '@tiptap/pm/state'

import {BLUEMOJI_NODE, BluemojiNode} from '../editor/BluemojiNode'
import {type BluemojiItemView} from '../types'

const cat: BluemojiItemView = {
  uri: 'at://did:plc:a/blue.moji.collection.item/cat',
  did: 'did:plc:a',
  name: ':cat:',
  alt: 'a cat',
  formats: {png_128: {ref: {$link: 'bafkcat'}}},
}

function makeEditor(suggestion?: Record<string, unknown>) {
  return new Editor({
    extensions: [
      Document,
      Paragraph,
      Text,
      BluemojiNode.configure({
        find: name => (name === ':cat:' ? cat : undefined),
        ...(suggestion ? {suggestion: suggestion as never} : {}),
      }),
    ],
    content: '',
  })
}

/** Types one character the way the browser does, through ProseMirror's hook. */
function type(editor: Editor, text: string) {
  for (const ch of text) {
    const {from, to} = editor.state.selection
    const handled = editor.view.someProp('handleTextInput', f =>
      f(editor.view, from, to, ch, () => editor.state.tr),
    )
    if (!handled) editor.view.dispatch(editor.state.tr.insertText(ch, from, to))
  }
}

describe('BluemojiNode suggestion trigger', () => {
  function setup() {
    const queries: string[] = []
    const editor = makeEditor({
      char: ':',
      pluginKey: new PluginKey('t'),
      items: ({query}: {query: string}) => {
        queries.push(query)
        return []
      },
      render: () => ({}),
    })
    return {editor, queries}
  }

  it('starts once a character follows the colon', () => {
    const {editor, queries} = setup()
    type(editor, ':')
    type(editor, 'c')
    expect(queries).toContain('c')
  })

  it('starts after whitespace but not mid-word', () => {
    const a = setup()
    type(a.editor, 'hi :c')
    expect(a.queries).toContain('c')

    const b = setup()
    type(b.editor, 'https://x')
    expect(b.queries).toEqual([])
  })
})

describe('BluemojiNode', () => {
  it('swaps a finished :alias: for an image node', () => {
    const editor = makeEditor()
    type(editor, 'hi :cat:')
    const json = editor.getJSON()
    const content = json.content?.[0].content ?? []
    expect(content.map(n => n.type)).toEqual(['text', BLUEMOJI_NODE])
    expect(content[0].text).toBe('hi ')
    expect(content[1].attrs).toMatchObject({
      name: ':cat:',
      src: expect.stringContaining('bafkcat'),
    })
  })

  it('leaves unknown aliases as text', () => {
    const editor = makeEditor()
    type(editor, ':nope:')
    expect(editor.getText()).toBe(':nope:')
    expect(editor.getJSON().content?.[0].content?.[0].type).toBe('text')
  })

  it('does not convert inside a word or a URL', () => {
    const editor = makeEditor()
    type(editor, 'see x:cat:')
    expect(editor.getJSON().content?.[0].content?.[0].type).toBe('text')
  })

  it('serialises back to its alias', () => {
    const editor = makeEditor()
    type(editor, ':cat:')
    expect(editor.getText()).toBe(':cat:')
  })

  it('inserts from the picker with a trailing space', () => {
    const editor = makeEditor()
    editor.commands.insertBluemoji(cat)
    expect(editor.getText()).toBe(':cat: ')
  })
})
