import {useState} from 'react'
import {View} from 'react-native'
import {Plural, Trans, useLingui} from '@lingui/react/macro'

import {PREVIEW_LINES, SCROLL_LINES} from '#/lib/code/theme'
import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeHandle} from '#/lib/strings/handles'
import {useProfileQuery} from '#/state/queries/profile'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {CopyCodeButton} from '#/components/CopyCodeButton'
import {Divider} from '#/components/Divider'
import {
  ChevronBottom_Stroke2_Corner0_Rounded as ChevronDown,
  ChevronTop_Stroke2_Corner0_Rounded as ChevronUp,
} from '#/components/icons/Chevron'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {type CustomEmbedComponentProps} from '#/features/customEmbeds/types'
import {CodeBlock} from './CodeBlock'
import {parseTangledString} from './detect'
import {useTangledStringQuery} from './queries'
import {TangledStringCard, TangledStringLink} from './TangledStringCard'

/**
 * northsky: renders a link to a Tangled snippet as a code card.
 *
 * Collapsed cards show a short preview; "Show more" expands the whole file into
 * a viewport capped at SCROLL_LINES tall that scrolls internally, so a long
 * snippet never takes over the feed.
 */
export function TangledStringEmbed({
  view,
  onOpen,
  style,
}: CustomEmbedComponentProps) {
  const t = useTheme()
  const {t: l} = useLingui()
  const [expanded, setExpanded] = useState(false)

  const ref = parseTangledString(view.uri)
  const query = useTangledStringQuery({
    actor: ref?.actor ?? '',
    rkey: ref?.rkey ?? '',
    enabled: !!ref,
  })
  const value = query.data?.value
  // Shares the app-wide profile cache, so a feed that already rendered this
  // author costs no fetch here and an edited profile invalidates everywhere.
  // Best-effort: the snippet still renders without a byline.
  const {data: author} = useProfileQuery({did: query.data?.did})
  // The query rejects a record it cannot render, so a success always carries a
  // string here. An empty snippet is a valid record and renders as empty code.
  const code = value?.contents ?? ''
  const lineCount = value ? code.split('\n').length : 0
  const canExpand = lineCount > PREVIEW_LINES

  return (
    <TangledStringCard
      uri={view.uri}
      filename={value?.filename || view.title || l`Snippet`}
      onOpen={onOpen}
      style={style}>
      {query.isLoading ? (
        <View style={[a.py_lg, a.align_center]}>
          <Loader size="md" />
        </View>
      ) : query.isError || !value ? (
        <View style={[a.px_md, a.py_md]}>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            <Trans>Couldn't load this snippet.</Trans>
          </Text>
        </View>
      ) : (
        // Positioning ancestor for CopyCodeButton's absolute placement.
        <View>
          <CodeBlock
            code={code}
            // The record's own filename, never the OpenGraph title - language
            // detection keys off the extension and the title has none.
            filename={value?.filename}
            maxLines={expanded ? undefined : PREVIEW_LINES}
            maxHeightLines={expanded ? SCROLL_LINES : undefined}
          />
          <CopyCodeButton value={code} />
        </View>
      )}

      {value ? <Divider /> : null}

      {(author || lineCount > 0) && (
        // Two flexible columns so the expand button stays centred between them.
        <View style={[a.flex_row, a.align_center, a.gap_sm, a.px_md, a.py_xs]}>
          <View style={[a.flex_1, a.flex_row, a.align_center, a.gap_xs]}>
            {author ? (
              <>
                <UserAvatar type="user" size={20} avatar={author.avatar} />
                <Text
                  emoji
                  numberOfLines={1}
                  style={[a.text_sm, t.atoms.text_contrast_medium, a.flex_1]}>
                  {author.displayName
                    ? sanitizeDisplayName(author.displayName)
                    : sanitizeHandle(author.handle, '@')}
                </Text>
              </>
            ) : null}
          </View>

          {canExpand && (
            <Button
              label={expanded ? l`Show less` : l`Show more`}
              onPress={() => setExpanded(e => !e)}
              size="small"
              color="secondary"
              variant="ghost">
              <ButtonText>
                {expanded ? <Trans>Show less</Trans> : <Trans>Show more</Trans>}
              </ButtonText>
              <ButtonIcon icon={expanded ? ChevronUp : ChevronDown} />
            </Button>
          )}

          <View style={[a.flex_1, a.align_end]}>
            {lineCount > 0 ? (
              <TangledStringLink uri={view.uri} onOpen={onOpen}>
                <Text style={[a.text_xs, t.atoms.text_contrast_low]}>
                  <Plural value={lineCount} one="# line" other="# lines" />
                </Text>
              </TangledStringLink>
            ) : null}
          </View>
        </View>
      )}
    </TangledStringCard>
  )
}
