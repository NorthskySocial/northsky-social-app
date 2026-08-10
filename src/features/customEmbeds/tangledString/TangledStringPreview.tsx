import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {sanitizeHandle} from '#/lib/strings/handles'
import {atoms as a, useTheme} from '#/alf'
import {Divider} from '#/components/Divider'
import {Text} from '#/components/Typography'
import {type CustomEmbedComponentProps} from '#/features/customEmbeds/types'
import {parseTangledString} from './detect'
import {TangledStringCard} from './TangledStringCard'

/**
 * northsky: the composer's stand-in for a Tangled snippet card.
 */
export function TangledStringPreview({
  view,
  onOpen,
  style,
}: CustomEmbedComponentProps) {
  const t = useTheme()
  const {t: l} = useLingui()

  const ref = parseTangledString(view.uri)
  // A raw DID would be noise, so the byline is handle-only.
  const byline =
    ref && !ref.actor.startsWith('did:')
      ? sanitizeHandle(ref.actor, '@')
      : undefined

  return (
    <TangledStringCard
      uri={view.uri}
      filename={view.title || l`Snippet`}
      onOpen={onOpen}
      style={style}>
      <View style={[a.px_md, a.py_lg, a.align_center]}>
        <Text style={[a.text_sm, t.atoms.text_contrast_low]}>
          <Trans>Code snippet</Trans>
        </Text>
      </View>

      {byline ? (
        <>
          <Divider />
          <View style={[a.flex_row, a.align_center, a.px_md, a.py_xs]}>
            <Text
              emoji
              numberOfLines={1}
              style={[a.text_sm, t.atoms.text_contrast_medium, a.flex_1]}>
              {byline}
            </Text>
          </View>
        </>
      ) : null}
    </TangledStringCard>
  )
}
