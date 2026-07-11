import {
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {IS_LIQUID_GLASS} from '#/env'

export function Header({
  renderLeft,
  renderRight,
  children,
  style,
  onLayout,
}: {
  renderLeft?: () => React.ReactNode
  renderRight?: () => React.ReactNode
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
  onLayout?: (event: LayoutChangeEvent) => void
}) {
  const t = useTheme()
  return (
    <View
      onLayout={onLayout}
      style={[
        a.sticky,
        a.top_0,
        a.relative,
        a.w_full,
        a.py_sm,
        a.flex_row,
        a.justify_center,
        a.align_center,
        {minHeight: IS_LIQUID_GLASS ? 64 : 50},
        a.border_b,
        t.atoms.border_contrast_medium,
        t.atoms.bg,
        // northsky: match the 32px dialog container / bottom-sheet corners
        // (rounded_xl) so the sticky header's top corners don't under-round
        {borderTopLeftRadius: a.rounded_xl.borderRadius},
        {borderTopRightRadius: a.rounded_xl.borderRadius},
        style,
      ]}>
      {renderLeft && (
        <View style={[a.absolute, {left: IS_LIQUID_GLASS ? 12 : 6}]}>
          {renderLeft()}
        </View>
      )}
      {children}
      {renderRight && (
        <View style={[a.absolute, {right: IS_LIQUID_GLASS ? 12 : 6}]}>
          {renderRight()}
        </View>
      )}
    </View>
  )
}

export function HeaderText({
  children,
  style,
}: {
  children?: React.ReactNode
  style?: StyleProp<TextStyle>
}) {
  return (
    <Text
      style={[a.text_lg, a.text_center, a.font_semi_bold, style]}
      maxFontSizeMultiplier={2}>
      {children}
    </Text>
  )
}
