/**
 * northsky: renders Markdown-style formatting in post text - inline `code`,
 * fenced ```lang\n...``` blocks, and emphasis.
 *
 * Inline code and (in truncated previews) fenced code stay inside the parent
 * RichText `<Text>`. In full post views a fenced block renders as a `<View>`
 * panel, which RichText splices between prose `<Text>` runs - a `<View>` cannot
 * live inside a `<Text>`. See `#/lib/code/ranges` for how the code, facet and
 * emphasis layers are resolved into one stream.
 *
 * Opt-in: only used when RichText is given `enableCode` (post bodies).
 */
import {type ReactNode} from 'react'
import {ScrollView, type TextStyle, View} from 'react-native'

import {CodeSpans} from '#/lib/code/CodeSpans'
import {type EmphasisStyle} from '#/lib/code/emphasis'
import {languageFromName} from '#/lib/code/highlight'
import {type CodeToken} from '#/lib/code/parse'
import {
  CODE_LINE_HEIGHT,
  CODE_PADDING_Y,
  MONO_FONT,
  SCROLL_LINES,
  useCodePanelColor,
} from '#/lib/code/theme'
import {useHighlightedLines} from '#/lib/code/useHighlighter'
import {atoms as a, useTheme} from '#/alf'
import {CopyCodeButton} from '#/components/CopyCodeButton'
import {Text} from '#/components/Typography'

/** A part of a text run: either inline (lives in a `<Text>`) or a block. */
export type CodePart = {block: boolean; node: ReactNode}

/** Plain text, wrapped in a `<Text>` only when emphasis applies to it. */
export function textPart(
  text: string,
  key: number,
  emphasis: TextStyle | undefined,
): CodePart {
  return {
    block: false,
    node: emphasis ? (
      <Text key={key} emoji style={emphasis}>
        {text}
      </Text>
    ) : (
      text
    ),
  }
}

export function emphasisTextStyle(
  style: EmphasisStyle | undefined,
): TextStyle | undefined {
  if (!style) return undefined
  return {
    // 700, not 600: Geist registers Regular, Bold and Italic under one family
    // name, so a 600 request has no upright face to match and font matching
    // (fontconfig on Linux, CoreText on iOS) can return the italic cut instead.
    ...(style.bold ? {fontWeight: '700' as const} : null),
    ...(style.italic ? {fontStyle: 'italic' as const} : null),
    ...(style.strike ? {textDecorationLine: 'line-through' as const} : null),
  }
}

function InlineCode({value}: {value: string}) {
  const t = useTheme()
  return (
    <Text
      style={[
        a.rounded_xs,
        {
          fontFamily: MONO_FONT,
          backgroundColor: t.atoms.bg_contrast_50.backgroundColor,
          paddingHorizontal: 3,
        },
      ]}>
      {value}
    </Text>
  )
}

function HighlightedLines({value, lang}: {value: string; lang?: string}) {
  const lines = useHighlightedLines(value, languageFromName(lang))
  return (
    <>
      {lines.map((line, i) => (
        // Each nested Text re-applies a font family, so set MONO_FONT on every
        // level - otherwise the inner spans revert to the body UI font.
        <Text key={i} style={{fontFamily: MONO_FONT}}>
          <CodeSpans line={line} />
          {i < lines.length - 1 ? '\n' : null}
        </Text>
      ))}
    </>
  )
}

/**
 * Inline fenced code - stays in the text flow (so it respects `numberOfLines`),
 * but the background hugs each line. Used in truncated previews.
 */
function FencedCodeInline({value, lang}: {value: string; lang?: string}) {
  const t = useTheme()
  return (
    <Text
      style={[
        a.rounded_xs,
        {
          fontFamily: MONO_FONT,
          backgroundColor: t.atoms.bg_contrast_25.backgroundColor,
        },
      ]}>
      {'\n'}
      <HighlightedLines value={value} lang={lang} />
      {'\n'}
    </Text>
  )
}

/**
 * Block fenced code - a rounded panel behind the whole block. Used in full post
 * views. Long lines wrap rather than scrolling horizontally, which reads badly
 * in a feed.
 *
 * The viewport is capped at `SCROLL_LINES` worth of pixels and scrolls
 * internally past that, so a long snippet cannot take over the screen. The cap
 * is in pixels rather than line count because a single long line wraps to many
 * rows, which a logical-line slice cannot bound.
 *
 * This only ever renders in full post views (see `blockMode` in `codeParts`),
 * so the nested vertical scroll never appears inside the feed, where it would
 * fight the feed's own scroll gesture.
 */
function FencedCodeBlock({
  value,
  lang,
  selectable,
}: {
  value: string
  lang?: string
  selectable?: boolean
}) {
  const t = useTheme()
  const bg = useCodePanelColor()
  return (
    <View
      style={[a.rounded_sm, a.my_xs, a.overflow_hidden, {backgroundColor: bg}]}>
      <ScrollView
        style={{
          maxHeight: SCROLL_LINES * CODE_LINE_HEIGHT + CODE_PADDING_Y * 2,
        }}
        nestedScrollEnabled
        showsVerticalScrollIndicator>
        <View style={[a.px_md, a.py_sm]}>
          <Text
            selectable={selectable}
            style={[
              a.text_sm,
              t.atoms.text,
              {fontFamily: MONO_FONT, lineHeight: CODE_LINE_HEIGHT},
            ]}>
            <HighlightedLines value={value} lang={lang} />
          </Text>
        </View>
      </ScrollView>
      <CopyCodeButton value={value} />
    </View>
  )
}

/**
 * Renders one code token. `blockMode` renders fenced blocks as `<View>` panels
 * (full views); otherwise they stay inline (truncated previews, where a block
 * View would break `numberOfLines`).
 */
export function codePart(
  token: Exclude<CodeToken, {type: 'text'}>,
  key: string,
  blockMode: boolean,
  selectable?: boolean,
): CodePart {
  if (token.type === 'inline') {
    // Inline code renders verbatim (not highlighted), so strip any stray CR.
    const value = token.value.replace(/\r/g, '')
    return {block: false, node: <InlineCode key={key} value={value} />}
  }
  if (blockMode) {
    return {
      block: true,
      node: (
        <FencedCodeBlock
          key={key}
          value={token.value}
          lang={token.lang}
          selectable={selectable}
        />
      ),
    }
  }
  return {
    block: false,
    node: <FencedCodeInline key={key} value={token.value} lang={token.lang} />,
  }
}
