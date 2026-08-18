import {Schema} from '@tiptap/pm/model'
import {TextSelection} from '@tiptap/pm/state'
import {type Decoration} from '@tiptap/pm/view'

import {loadHighlighter} from '#/lib/code/highlight'
import {DARK_COLORS, PANEL_BG} from '#/lib/code/palette'
import {
  createMarkdownDecorations,
  documentToSourceMap,
} from './MarkdownDecorator'

const schema = new Schema({
  nodes: {
    doc: {content: 'paragraph+'},
    paragraph: {content: 'inline*', group: 'block'},
    text: {group: 'inline'},
    hardBreak: {inline: true, group: 'inline', atom: true},
  },
})

const theme = {
  codeBackground: PANEL_BG.dark,
  codeColors: DARK_COLORS,
  inlineCodeBackground: '#303030',
  monoFont: 'monospace',
}

function paragraph(...content: ({type: string; text?: string} | string)[]) {
  return {
    type: 'paragraph',
    content: content.map(node =>
      typeof node === 'string' ? {type: 'text', text: node} : node,
    ),
  }
}

function doc(...content: ReturnType<typeof paragraph>[]) {
  return schema.nodeFromJSON({type: 'doc', content})
}

function attrs(decoration: Decoration): Record<string, string> {
  return (decoration.type as unknown as {attrs: Record<string, string>}).attrs
}

describe('documentToSourceMap', () => {
  it('matches the composer serializer across paragraphs and hard breaks', () => {
    const value = doc(
      paragraph('one', {type: 'hardBreak'}, 'two'),
      paragraph('three'),
    )

    expect(documentToSourceMap(value).text).toBe('one\ntwo\nthree')
  })
})

describe('createMarkdownDecorations', () => {
  it('hides emphasis delimiters and styles content outside the range', () => {
    const value = doc(paragraph('**bold** after'))
    const selection = TextSelection.create(value, 10)
    const decorations = createMarkdownDecorations(
      value,
      selection,
      theme,
    ).find()

    expect(
      decorations.map(decoration => ({
        from: decoration.from,
        to: decoration.to,
        class: attrs(decoration).class,
        style: attrs(decoration).style,
      })),
    ).toEqual(
      expect.arrayContaining([
        {from: 1, to: 3, class: 'ns-markdown-hidden', style: undefined},
        {from: 7, to: 9, class: 'ns-markdown-hidden', style: undefined},
        {
          from: 3,
          to: 7,
          class: undefined,
          style: 'font-weight:700',
        },
      ]),
    )
  })

  it('reveals delimiters when the caret is at the end of a formatted range', () => {
    const value = doc(paragraph('**bold**'))
    const selection = TextSelection.create(value, 9)

    expect(createMarkdownDecorations(value, selection, theme).find()).toEqual(
      [],
    )
  })

  it('shows the complete source when the caret enters a formatted range', () => {
    const value = doc(paragraph('before `code` after'))
    const selection = TextSelection.create(value, 10)

    expect(createMarkdownDecorations(value, selection, theme).find()).toEqual(
      [],
    )
  })

  it('keeps independent ranges previewed while one range is edited', () => {
    const value = doc(paragraph('**bold** and `code`'))
    const selection = TextSelection.create(value, 5)
    const decorations = createMarkdownDecorations(
      value,
      selection,
      theme,
    ).find()

    expect(
      decorations.some(
        decoration => attrs(decoration).class === 'ns-markdown-inline-code',
      ),
    ).toBe(true)
    expect(
      decorations.some(
        decoration => attrs(decoration).style === 'font-weight:700',
      ),
    ).toBe(false)
  })

  it('renders fenced code as a block and hides fence paragraphs', () => {
    const value = doc(
      paragraph('```ts'),
      paragraph('const x = 1'),
      paragraph(),
      paragraph('```'),
      paragraph('after'),
    )
    const selection = TextSelection.create(value, value.content.size - 1)
    const decorations = createMarkdownDecorations(
      value,
      selection,
      theme,
    ).find()

    expect(
      decorations.filter(
        decoration => attrs(decoration).class === 'ns-markdown-hidden-block',
      ),
    ).toHaveLength(2)
    expect(
      decorations.filter(
        decoration => attrs(decoration).class === 'ns-markdown-code-block',
      ),
    ).toHaveLength(2)
  })

  it('uses the existing syntax palette after grammars load', async () => {
    await expect(loadHighlighter()).resolves.toBe(true)
    const value = doc(
      paragraph('```ts'),
      paragraph('const value = true'),
      paragraph('```'),
      paragraph('after'),
    )
    const selection = TextSelection.create(value, value.content.size - 1)
    const decorations = createMarkdownDecorations(
      value,
      selection,
      theme,
    ).find()

    expect(
      decorations.some(
        decoration =>
          attrs(decoration).style === `color:${DARK_COLORS.keyword}`,
      ),
    ).toBe(true)
  })

  it('leaves incomplete markup and URL underscores literal', () => {
    const value = doc(
      paragraph('unfinished **bold and https://example.com/a_b_c'),
    )
    const selection = TextSelection.create(value, value.content.size - 1)

    expect(createMarkdownDecorations(value, selection, theme).find()).toEqual(
      [],
    )
  })

  it('reveals a whole nested emphasis range for a crossing selection', () => {
    const value = doc(paragraph('**bold *italic* text**'))
    const selection = TextSelection.create(value, 9, 15)

    expect(createMarkdownDecorations(value, selection, theme).find()).toEqual(
      [],
    )
  })
})
