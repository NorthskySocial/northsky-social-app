import {RichText} from '@atproto/api'
import {Extension} from '@tiptap/core'
import {type Node as ProseMirrorNode} from '@tiptap/pm/model'
import {Plugin, PluginKey, type Selection} from '@tiptap/pm/state'
import {Decoration, DecorationSet, type EditorView} from '@tiptap/pm/view'

import {
  highlightToLines,
  isHighlighterReady,
  languageFromName,
  loadHighlighter,
} from '#/lib/code/highlight'
import {colorForScope} from '#/lib/code/palette'
import {findFormattingRanges, type FormattingRange} from '#/lib/code/ranges'

type SourceSegment = {
  sourceStart: number
  sourceEnd: number
  pmStart: number
  pmEnd: number
  kind: 'text' | 'node'
}

type SourceBlock = {
  sourceStart: number
  sourceEnd: number
  pmStart: number
  pmEnd: number
}

export type DocumentSourceMap = {
  text: string
  segments: SourceSegment[]
  blocks: SourceBlock[]
}

type MarkdownTheme = {
  codeBackground: string
  codeColors: Record<string, string>
  inlineCodeBackground: string
  monoFont: string
}

const REFRESH_HIGHLIGHTER = 'refresh-highlighter'

function sourceTextForNode(node: ProseMirrorNode): string {
  if (node.isText) return node.text ?? ''
  if (node.type.name === 'hardBreak') return '\n'
  if (node.type.name === 'mention') return `@${node.attrs.id ?? ''}`
  return node.textContent
}

/**
 * Maps the editor's block document to the newline-separated text that the
 * composer stores in RichText.
 */
export function documentToSourceMap(doc: ProseMirrorNode): DocumentSourceMap {
  let text = ''
  const segments: SourceSegment[] = []
  const blocks: SourceBlock[] = []

  doc.forEach((block, blockOffset, blockIndex) => {
    if (blockIndex > 0) text += '\n'
    const sourceStart = text.length

    block.descendants((node, relativePos) => {
      const value = sourceTextForNode(node)
      if (!value || (!node.isText && !node.isAtom)) return

      const segmentStart = text.length
      text += value
      segments.push({
        sourceStart: segmentStart,
        sourceEnd: text.length,
        pmStart: blockOffset + 1 + relativePos,
        pmEnd: blockOffset + 1 + relativePos + node.nodeSize,
        kind: node.isText ? 'text' : 'node',
      })
    })

    blocks.push({
      sourceStart,
      sourceEnd: text.length,
      pmStart: blockOffset,
      pmEnd: blockOffset + block.nodeSize,
    })
  })

  return {text, segments, blocks}
}

function sourceToPm(
  map: DocumentSourceMap,
  sourceOffset: number,
  bias: 'start' | 'end',
): number {
  for (const segment of map.segments) {
    if (
      sourceOffset >= segment.sourceStart &&
      sourceOffset <= segment.sourceEnd
    ) {
      if (segment.kind === 'node') {
        return bias === 'start' ? segment.pmStart : segment.pmEnd
      }
      return (
        segment.pmStart +
        Math.min(
          sourceOffset - segment.sourceStart,
          segment.pmEnd - segment.pmStart,
        )
      )
    }
  }

  const previous = [...map.segments]
    .reverse()
    .find(segment => segment.sourceEnd <= sourceOffset)
  if (previous) return previous.pmEnd
  return map.segments[0]?.pmStart ?? 0
}

function selectionIntersects(
  selection: Selection,
  map: DocumentSourceMap,
  range: FormattingRange,
): boolean {
  const from = sourceToPm(map, range.start, 'start')
  const to = sourceToPm(map, range.end, 'end')
  if (selection.empty) return selection.from >= from && selection.from <= to
  return selection.from < to && selection.to > from
}

function styleString(style: Record<string, string | undefined>): string {
  return Object.entries(style)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([property, value]) => `${property}:${value}`)
    .join(';')
}

function decorateSourceRange(
  map: DocumentSourceMap,
  start: number,
  end: number,
  attrs: Record<string, string>,
): Decoration[] {
  const decorations: Decoration[] = []
  for (const segment of map.segments) {
    const overlapStart = Math.max(start, segment.sourceStart)
    const overlapEnd = Math.min(end, segment.sourceEnd)
    if (overlapStart >= overlapEnd) continue

    if (segment.kind === 'node') {
      decorations.push(Decoration.node(segment.pmStart, segment.pmEnd, attrs))
    } else {
      decorations.push(
        Decoration.inline(
          segment.pmStart + overlapStart - segment.sourceStart,
          segment.pmStart + overlapEnd - segment.sourceStart,
          attrs,
        ),
      )
    }
  }
  return decorations
}

function hideSourceRange(
  map: DocumentSourceMap,
  start: number,
  end: number,
): Decoration[] {
  const decorations: Decoration[] = []
  const hiddenBlocks = new Set<number>()

  map.blocks.forEach((block, index) => {
    if (
      block.sourceStart >= start &&
      block.sourceEnd <= end &&
      block.sourceStart < block.sourceEnd
    ) {
      hiddenBlocks.add(index)
      decorations.push(
        Decoration.node(block.pmStart, block.pmEnd, {
          class: 'ns-markdown-hidden-block',
        }),
      )
    }
  })

  for (const segment of map.segments) {
    const blockIndex = map.blocks.findIndex(
      block =>
        segment.sourceStart >= block.sourceStart &&
        segment.sourceEnd <= block.sourceEnd,
    )
    if (hiddenBlocks.has(blockIndex)) continue

    const overlapStart = Math.max(start, segment.sourceStart)
    const overlapEnd = Math.min(end, segment.sourceEnd)
    if (overlapStart >= overlapEnd) continue

    if (segment.kind === 'node') {
      decorations.push(
        Decoration.node(segment.pmStart, segment.pmEnd, {
          class: 'ns-markdown-hidden',
        }),
      )
    } else {
      decorations.push(
        Decoration.inline(
          segment.pmStart + overlapStart - segment.sourceStart,
          segment.pmStart + overlapEnd - segment.sourceStart,
          {class: 'ns-markdown-hidden'},
        ),
      )
    }
  }

  return decorations
}

function emphasisStyle(range: Extract<FormattingRange, {kind: 'emphasis'}>) {
  return styleString({
    'font-weight': range.style.bold ? '700' : undefined,
    'font-style': range.style.italic ? 'italic' : undefined,
    'text-decoration': range.style.strike ? 'line-through' : undefined,
  })
}

function highlightedDecorations(
  map: DocumentSourceMap,
  range: Extract<FormattingRange, {kind: 'code'}>,
  colors: Record<string, string>,
): Decoration[] {
  if (range.token.type !== 'fence') return []

  const lines = highlightToLines(
    range.token.value,
    languageFromName(range.token.lang),
  )
  const decorations: Decoration[] = []
  let offset = 0

  lines.forEach((line, lineIndex) => {
    for (const span of line) {
      const start = range.contentStart + offset
      const end = start + span.value.length
      const color = colorForScope(span.scope, colors)
      if (color) {
        decorations.push(
          ...decorateSourceRange(map, start, end, {
            style: `color:${color}`,
          }),
        )
      }
      offset += span.value.length
    }
    if (lineIndex < lines.length - 1) offset++
  })

  return decorations
}

export function createMarkdownDecorations(
  doc: ProseMirrorNode,
  selection: Selection,
  theme: MarkdownTheme,
): DecorationSet {
  const map = documentToSourceMap(doc)
  const richText = new RichText({text: map.text})
  richText.detectFacetsWithoutResolution()
  const decorations: Decoration[] = []

  for (const range of findFormattingRanges(richText)) {
    if (selectionIntersects(selection, map, range)) continue

    decorations.push(
      ...hideSourceRange(map, range.start, range.contentStart),
      ...hideSourceRange(map, range.contentEnd, range.end),
    )

    if (range.kind === 'emphasis') {
      decorations.push(
        ...decorateSourceRange(map, range.contentStart, range.contentEnd, {
          style: emphasisStyle(range),
        }),
      )
    } else if (range.token.type === 'inline') {
      decorations.push(
        ...decorateSourceRange(map, range.contentStart, range.contentEnd, {
          class: 'ns-markdown-inline-code',
          style: styleString({
            'background-color': theme.inlineCodeBackground,
            'font-family': theme.monoFont,
          }),
        }),
      )
    } else {
      for (const block of map.blocks) {
        const isTrailingEmptyCodeLine =
          block.sourceStart === block.sourceEnd &&
          block.sourceStart === range.contentEnd
        if (
          block.sourceStart >= range.contentStart &&
          block.sourceEnd <= range.contentEnd &&
          (block.sourceStart < range.contentEnd || isTrailingEmptyCodeLine)
        ) {
          decorations.push(
            Decoration.node(block.pmStart, block.pmEnd, {
              class: 'ns-markdown-code-block',
              style: styleString({
                'background-color': theme.codeBackground,
                'font-family': theme.monoFont,
              }),
            }),
          )
        }
      }
      decorations.push(...highlightedDecorations(map, range, theme.codeColors))
    }
  }

  return DecorationSet.create(doc, decorations)
}

function hasFence(doc: ProseMirrorNode): boolean {
  const map = documentToSourceMap(doc)
  const richText = new RichText({text: map.text})
  richText.detectFacetsWithoutResolution()
  return findFormattingRanges(richText).some(
    range => range.kind === 'code' && range.token.type === 'fence',
  )
}

function markdownDecoratorPlugin(theme: MarkdownTheme) {
  const key = new PluginKey<DecorationSet>('northsky-markdown-decorator')
  let loading = false

  const loadSyntaxHighlighting = (view: EditorView) => {
    if (loading || isHighlighterReady() || !hasFence(view.state.doc)) return
    loading = true
    void loadHighlighter().then(loaded => {
      if (loaded && !view.isDestroyed) {
        view.dispatch(view.state.tr.setMeta(key, REFRESH_HIGHLIGHTER))
      }
    })
  }

  let plugin: Plugin<DecorationSet>
  plugin = new Plugin<DecorationSet>({
    key,
    state: {
      init: (_, state) =>
        createMarkdownDecorations(state.doc, state.selection, theme),
      apply: (transaction, decorations, _oldState, newState) => {
        if (
          transaction.docChanged ||
          transaction.selectionSet ||
          transaction.getMeta(key) === REFRESH_HIGHLIGHTER
        ) {
          return createMarkdownDecorations(
            newState.doc,
            newState.selection,
            theme,
          )
        }
        return decorations.map(transaction.mapping, transaction.doc)
      },
    },
    props: {
      decorations(state) {
        return plugin.getState(state)
      },
    },
    view(view) {
      loadSyntaxHighlighting(view)
      return {
        update(nextView, previousState) {
          if (nextView.state.doc !== previousState.doc) {
            loadSyntaxHighlighting(nextView)
          }
        },
      }
    },
  })

  return plugin
}

export const MarkdownDecorator = Extension.create<MarkdownTheme>({
  name: 'northsky-markdown-decorator',

  addOptions() {
    return {
      codeBackground: 'transparent',
      codeColors: {},
      inlineCodeBackground: 'transparent',
      monoFont: 'monospace',
    }
  },

  addProseMirrorPlugins() {
    return [markdownDecoratorPlugin(this.options)]
  },
})
