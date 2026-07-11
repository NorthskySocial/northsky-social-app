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
    // northsky: Geist body + MuseoModerno display static cuts replace Inter.
    'Geist-Regular': require('../../../assets/fonts/geist/Geist-Regular.ttf'),
    'Geist-Medium': require('../../../assets/fonts/geist/Geist-Medium.ttf'),
    'Geist-SemiBold': require('../../../assets/fonts/geist/Geist-SemiBold.ttf'),
    'Geist-Bold': require('../../../assets/fonts/geist/Geist-Bold.ttf'),
    'MuseoModerno-SemiBold': require('../../../assets/fonts/museomoderno/MuseoModerno-SemiBold.ttf'),
    'MuseoModerno-SemiBoldItalic': require('../../../assets/fonts/museomoderno/MuseoModerno-SemiBoldItalic.ttf'),
  })
}
