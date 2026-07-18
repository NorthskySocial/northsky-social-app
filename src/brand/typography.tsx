/**
 * MuseoModerno italic display text for hero surfaces (onboarding, splash
 * headline). Stamps the `NS_DISPLAY_FONT` sentinel that `applyFonts`
 * intercepts and `applyDisplayFont` resolves to the real font/weight/italic.
 * `text_3xl` is just a default - pass your own text atom in `style` to override.
 */
import {type TextStyle} from 'react-native'

import {atoms as a} from '#/alf'
import {Text, type TextProps} from '#/components/Typography'
import {NS_DISPLAY_FONT} from '#/brand/fonts'

const DISPLAY_STYLE: TextStyle = {fontFamily: NS_DISPLAY_FONT}

export function DisplayText({style, ...rest}: TextProps) {
  return <Text {...rest} style={[a.text_3xl, DISPLAY_STYLE, style]} />
}
