/**
 * Northsky brand typography.
 *
 * `DisplayText` renders MuseoModerno italic display copy for hero surfaces
 * (onboarding titles, the logged-out splash headline). It is a thin wrapper
 * around the app's `Text` that stamps only the `NS_DISPLAY_FONT` sentinel;
 * `applyFonts` (via `normalizeTextStyles`) intercepts it and `applyDisplayFont`
 * resolves the real MuseoModerno family together with the brand weight/italic
 * (600 / italic). Font scaling still runs (it happens before `applyFonts`), so
 * display text respects the user's size preference.
 *
 * The baked-in `text_3xl` is a default - callers can override the size by
 * passing their own text atom in `style` (it lands after and wins).
 */
import {type TextStyle} from 'react-native'

import {atoms as a} from '#/alf'
import {Text, type TextProps} from '#/components/Typography'
import {NS_DISPLAY_FONT} from '#/brand/fonts'

const DISPLAY_STYLE: TextStyle = {fontFamily: NS_DISPLAY_FONT}

export function DisplayText({style, ...rest}: TextProps) {
  return <Text {...rest} style={[a.text_3xl, DISPLAY_STYLE, style]} />
}
