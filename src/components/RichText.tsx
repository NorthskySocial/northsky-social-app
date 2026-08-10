import {type ReactNode, useMemo} from 'react'
import {type StyleProp, type TextStyle, View} from 'react-native'
import {AppBskyRichtextFacet, RichText as RichTextAPI} from '@atproto/api'

// northsky: Markdown-style code and emphasis in post text
import {
  hasFormatting,
  type RichTextItem,
  segmentsWithCode,
} from '#/lib/code/ranges'
import {toShortUrl} from '#/lib/strings/url-helpers'
import {atoms as a, flatten, ios, type TextStyleProp} from '#/alf'
import {isOnlyEmoji} from '#/alf/typography'
import {InlineLinkText, type LinkProps} from '#/components/Link'
import {ProfileHoverCard} from '#/components/ProfileHoverCard'
import {
  type CodePart,
  codePart,
  emphasisTextStyle,
  textPart,
} from '#/components/RichTextCode'
import {RichTextTag} from '#/components/RichTextTag'
import {Text, type TextProps} from '#/components/Typography'

const WORD_WRAP = {wordWrap: 1}
// lifted from facet detection in `RichText` impl, _without_ `gm` flags
const URL_REGEX =
  /(^|\s|\()((https?:\/\/[\S]+)|((?<domain>[a-z][a-z0-9]*(\.[a-z0-9]+)+)[\S]*))/i

export type RichTextProps = TextStyleProp &
  Pick<TextProps, 'selectable' | 'onLayout' | 'onTextLayout'> & {
    value: RichTextAPI | string
    testID?: string
    numberOfLines?: number
    disableLinks?: boolean
    enableTags?: boolean
    /**
     * northsky: render Markdown-style formatting in the text - inline `code`
     * See `#/components/RichTextCode`.
     */
    enableCode?: boolean
    /**
     * northsky: this is the single, full post view rather than a row in a list.
     * Only then may a fenced block render as a scrollable `<View>` panel; inside
     * a feed or thread list its nested scroll would fight the list's own
     * gesture. Callers declare this - it cannot be inferred from
     * `numberOfLines`, which is undefined for any post short enough to escape
     * clamping.
     */
    fullView?: boolean
    authorHandle?: string
    onLinkPress?: LinkProps['onPress']
    interactiveStyle?: StyleProp<TextStyle>
    emojiMultiplier?: number
    shouldProxyLinks?: boolean
    suffix?: React.ReactNode
    /**
     * How far below the text baseline `suffix` extends, in px.
     *
     * Inline views inside `Text` sit with their bottom edge on the baseline, so
     * a suffix nudged below it overflows the `Text`'s measured bounds and iOS
     * clips it. We reserve this much room as bottom padding and cancel it with
     * an equal negative margin, so the suffix can paint without moving anything
     * after it. Pass the same offset the suffix nudges itself by.
     *
     * Overrides any `paddingBottom`/`marginBottom` set via `style`.
     */
    suffixOffset?: number
    /**
     * DANGEROUS: Disable facet lexicon validation
     *
     * `detectFacetsWithoutResolution()` generates technically invalid facets,
     * with a handle in place of the DID. This means that RichText that uses it
     * won't be able to render links.
     *
     * Use with care - only use if you're rendering facets you're generating yourself.
     */
    disableMentionFacetValidation?: true
  }

export function RichText({
  testID,
  value,
  style,
  numberOfLines,
  disableLinks,
  selectable,
  enableTags = false,
  enableCode = false,
  fullView = false,
  authorHandle,
  onLinkPress,
  interactiveStyle,
  emojiMultiplier = 1.85,
  onLayout,
  onTextLayout,
  shouldProxyLinks,
  suffix,
  suffixOffset = 0,
  disableMentionFacetValidation,
}: RichTextProps) {
  const richText = useMemo(() => {
    if (value instanceof RichTextAPI) {
      return value
    } else {
      const rt = new RichTextAPI({text: value})
      rt.detectFacetsWithoutResolution()
      return rt
    }
  }, [value])

  const plainStyles = style
  const suffixStyles =
    suffix && suffixOffset
      ? ios({paddingBottom: suffixOffset, marginBottom: -suffixOffset})
      : null
  const interactiveStyles = [plainStyles, interactiveStyle]

  const {text, facets} = richText

  // northsky: fast guard - only run the formatting pipeline when the post
  // actually contains a marker.
  const codeActive = enableCode && hasFormatting(text)
  const blockMode = codeActive && fullView && !numberOfLines

  // northsky: a fenced code <View> cannot live inside a <Text>, so when one is
  // present the inline parts are grouped into <Text> runs and the blocks emitted
  // as siblings. Without blocks this is the single <Text> upstream renders.
  const renderParts = (parts: CodePart[]): ReactNode => {
    if (!parts.some(p => p.block)) {
      return (
        <Text
          emoji
          selectable={selectable}
          testID={testID}
          style={[plainStyles, suffixStyles]}
          numberOfLines={numberOfLines}
          onLayout={onLayout}
          onTextLayout={onTextLayout}
          // @ts-ignore web only -prf
          dataSet={WORD_WRAP}>
          {parts.map(p => p.node)}
          {suffix ? ' ' : null}
          {suffix}
        </Text>
      )
    }
    const out: ReactNode[] = []
    let run: ReactNode[] = []
    /**
     * `trailing` is the suffix, passed only to the final flush so it lands at
     * the end of the post. It forces a run even when there is no trailing text
     * (a post ending in a fenced block), so the suffix is never dropped.
     */
    const flushRun = (trailing?: ReactNode) => {
      if (run.length === 0 && !trailing) return
      const children = run
      out.push(
        <Text
          key={`run${out.length}`}
          emoji
          selectable={selectable}
          style={[plainStyles, trailing ? suffixStyles : null]}
          // @ts-ignore web only -prf
          dataSet={WORD_WRAP}>
          {children}
          {trailing ? ' ' : null}
          {trailing}
        </Text>,
      )
      run = []
    }
    for (const part of parts) {
      if (part.block) {
        flushRun()
        out.push(part.node)
      } else {
        run.push(part.node)
      }
    }
    flushRun(suffix)
    // NOTE: testID lands on a <View> here rather than the usual single <Text>,
    // so E2E/a11y logic expecting one text node sees a different shape.
    // onTextLayout is Text-only and is dropped on this path, which is only
    // reached in full views where no caller measures with it.
    return (
      <View testID={testID} style={a.flex_1} onLayout={onLayout}>
        {out}
      </View>
    )
  }

  if (!facets?.length && !codeActive) {
    if (isOnlyEmoji(text)) {
      const flattenedStyle = flatten(style) ?? {}
      const fontSize =
        (flattenedStyle.fontSize ?? a.text_sm.fontSize) * emojiMultiplier
      return (
        <Text
          emoji
          selectable={selectable}
          testID={testID}
          style={[plainStyles, {fontSize}, suffixStyles]}
          onLayout={onLayout}
          onTextLayout={onTextLayout}
          // @ts-ignore web only -prf
          dataSet={WORD_WRAP}>
          {text}
          {suffix ? ' ' : null}
          {suffix}
        </Text>
      )
    }
    return (
      <Text
        emoji
        selectable={selectable}
        testID={testID}
        style={[plainStyles, suffixStyles]}
        numberOfLines={numberOfLines}
        onLayout={onLayout}
        onTextLayout={onTextLayout}
        // @ts-ignore web only -prf
        dataSet={WORD_WRAP}>
        {text}
        {suffix ? ' ' : null}
        {suffix}
      </Text>
    )
  }

  const parts: CodePart[] = []
  let key = 0
  // northsky: with formatting active, code and emphasis are resolved over the
  // full text before facets, so a fence containing a link stays a fence.
  // See `#/lib/code/ranges`.
  const items: RichTextItem[] = codeActive
    ? segmentsWithCode(richText)
    : Array.from(richText.segments(), segment => ({
        kind: 'segment' as const,
        segment,
      }))

  for (const item of items) {
    if (item.kind === 'code') {
      parts.push(codePart(item.token, `c${key}`, blockMode, selectable))
      key++
      continue
    }

    // northsky: emphasis is a style overlay, so it composes with whatever the
    // segment renders as - a bolded link is still a link.
    const emphasis = emphasisTextStyle(item.style)

    if (item.kind === 'text') {
      parts.push(textPart(item.text, key, emphasis))
      key++
      continue
    }

    const segment = item.segment
    const link = segment.link
    const mention = segment.mention
    const tag = segment.tag

    if (
      mention &&
      (disableMentionFacetValidation ||
        AppBskyRichtextFacet.validateMention(mention).success) &&
      !disableLinks
    ) {
      parts.push({
        block: false,
        node: (
          <ProfileHoverCard key={key} did={mention.did}>
            <InlineLinkText
              selectable={selectable}
              to={`/profile/${mention.did}`}
              style={[interactiveStyles, emphasis]}
              // @ts-ignore TODO
              dataSet={WORD_WRAP}
              shouldProxy={shouldProxyLinks}
              onPress={onLinkPress}>
              {segment.text}
            </InlineLinkText>
          </ProfileHoverCard>
        ),
      })
    } else if (link && AppBskyRichtextFacet.validateLink(link).success) {
      const isValidLink = URL_REGEX.test(link.uri)
      if (!isValidLink || disableLinks) {
        parts.push({block: false, node: toShortUrl(segment.text)})
      } else {
        parts.push({
          block: false,
          node: (
            <InlineLinkText
              selectable={selectable}
              key={key}
              to={link.uri}
              style={[interactiveStyles, emphasis]}
              // @ts-ignore TODO
              dataSet={WORD_WRAP}
              shareOnLongPress
              shouldProxy={shouldProxyLinks}
              onPress={onLinkPress}
              emoji>
              {toShortUrl(segment.text)}
            </InlineLinkText>
          ),
        })
      }
    } else if (
      !disableLinks &&
      enableTags &&
      tag &&
      AppBskyRichtextFacet.validateTag(tag).success
    ) {
      parts.push({
        block: false,
        node: (
          <RichTextTag
            key={key}
            display={segment.text}
            tag={tag.tag}
            textStyle={[interactiveStyles, emphasis]}
            authorHandle={authorHandle}
          />
        ),
      })
    } else {
      parts.push(textPart(segment.text, key, emphasis))
    }
    key++
  }

  return renderParts(parts)
}
