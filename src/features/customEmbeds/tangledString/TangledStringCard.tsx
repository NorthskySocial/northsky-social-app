import {type ReactElement, type ReactNode} from 'react'
import {type StyleProp, View, type ViewStyle} from 'react-native'
import {useLingui} from '@lingui/react/macro'

import {useCodePanelColor} from '#/lib/code/theme'
import {useHaptics} from '#/lib/haptics'
import {toNiceDomain} from '#/lib/strings/url-helpers'
import {atoms as a, useTheme} from '#/alf'
import {Code_Stroke2_Corner2_Rounded as CodeIcon} from '#/components/icons/Code'
import {Link} from '#/components/Link'
import {Text} from '#/components/Typography'

/**
 * Card frame shared by the rendered snippet and its composer preview: the
 * panel, and a header linking back to the snippet on Tangled.
 */
export function TangledStringCard({
  uri,
  filename,
  onOpen,
  style,
  children,
}: {
  uri: string
  filename: string
  onOpen?: () => void
  style?: StyleProp<ViewStyle>
  children: ReactNode
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const playHaptic = useHaptics()
  const panelBg = useCodePanelColor()
  const domain = toNiceDomain(uri)

  const onPress = () => {
    playHaptic('Light')
    onOpen?.()
  }

  return (
    <View
      style={[
        a.rounded_md,
        a.overflow_hidden,
        a.w_full,
        a.border,
        t.atoms.border_contrast_low,
        {backgroundColor: panelBg},
        style,
      ]}>
      <View style={[a.flex_row, a.align_center, a.gap_sm, a.px_md, a.py_sm]}>
        <CodeIcon size="sm" style={t.atoms.text_contrast_medium} />
        <Link
          label={l`Open ${filename} on ${domain}`}
          to={uri}
          shouldProxy
          onPress={onPress}
          style={[a.flex_1, {minWidth: 0}]}>
          <Text
            emoji
            numberOfLines={1}
            style={[a.text_sm, a.font_bold, a.leading_snug]}>
            {filename}
          </Text>
        </Link>
        <TangledStringLink uri={uri} onOpen={onOpen}>
          <Text style={[a.text_xs, t.atoms.text_contrast_low]}>{domain}</Text>
        </TangledStringLink>
      </View>

      {children}
    </View>
  )
}

/** "Open on tangled.org" affordance, used for the header domain and footers. */
export function TangledStringLink({
  uri,
  onOpen,
  children,
}: {
  uri: string
  onOpen?: () => void
  children: ReactElement
}) {
  const {t: l} = useLingui()
  const playHaptic = useHaptics()

  return (
    <Link
      label={l`Open on ${toNiceDomain(uri)}`}
      to={uri}
      shouldProxy
      onPress={() => {
        playHaptic('Light')
        onOpen?.()
      }}>
      {children}
    </Link>
  )
}
