import {useFonts} from 'expo-font'

/*
 * IMPORTANT: This is unused. Expo statically extracts these fonts.
 *
 * All used fonts MUST be configured here. Unused fonts can be commented out.
 *
 * This is used for both web fonts and native fonts.
 */
export function DO_NOT_USE() {
  return useFonts({
    // northsky: brand fonts (Geist body + MuseoModerno display) replace Inter;
    // requiring the woff2s makes webpack emit them to /static/media/.
    Geist: require('../../../assets/fonts/geist/Geist-Variable.woff2'),
    MuseoModerno: require('../../../assets/fonts/museomoderno/MuseoModerno-Variable.woff2'),
    'MuseoModerno-Italic': require('../../../assets/fonts/museomoderno/MuseoModerno-Italic-Variable.woff2'),
  })
}
