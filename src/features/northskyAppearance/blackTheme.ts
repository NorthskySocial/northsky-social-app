import {useThemePrefs} from '#/state/shell'
import {useThemeName} from '#/alf/util/useColorModeTheme'
import {isBlackTheme} from '#/brand/theme'

/** True while the app shows the black theme (see `isBlackTheme`). */
export function useIsBlackTheme() {
  const {darkTheme} = useThemePrefs()
  return isBlackTheme(useThemeName(), darkTheme)
}
