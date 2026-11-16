import {useLayoutEffect} from 'react'
import {type ColorSchemeName, useColorScheme} from 'react-native'
import {type ThemeName} from '@bsky.app/alf'

import {type Schema} from '#/state/persisted'
import {useThemePrefs} from '#/state/shell'
import {dark, dim, light} from '#/alf/themes'
import {brandThemes, isBlackTheme} from '#/brand/theme' // northsky: black theme
import {IS_WEB} from '#/env'

export function useColorModeTheme(): ThemeName {
  const theme = useThemeName()
  // northsky: black renders as the `dark` theme, but the page needs its color
  const {darkTheme} = useThemePrefs()
  const isBlack = isBlackTheme(theme, darkTheme)

  useLayoutEffect(() => {
    updateDocument(theme, isBlack)
  }, [theme, isBlack])

  return theme
}

export function useThemeName(): ThemeName {
  const colorScheme = useColorScheme()
  const {colorMode, darkTheme} = useThemePrefs()

  return getThemeName(colorScheme, colorMode, darkTheme)
}

function getThemeName(
  colorScheme: ColorSchemeName | null | undefined,
  colorMode: 'system' | 'light' | 'dark',
  darkTheme?: Schema['darkTheme'], // northsky: includes 'black'
) {
  if (
    (colorMode === 'system' && colorScheme === 'light') ||
    colorMode === 'light'
  ) {
    return 'light'
  } else {
    // northsky: black is the `dark` theme with a black palette override
    return darkTheme === 'black' ? 'dark' : (darkTheme ?? 'dim')
  }
}

function updateDocument(theme: ThemeName, isBlack: boolean) {
  // northsky: `theme--black` and ALF_THEME 'black' let the pre-hydration
  // script in the HTML shell paint black before the app loads
  const docTheme = isBlack ? 'black' : theme
  if (IS_WEB && typeof window !== 'undefined') {
    const html = window.document.documentElement
    const meta = window.document.querySelector('meta[name="theme-color"]')

    // remove any other color mode classes
    html.className = html.className.replace(/(theme)--\w+/g, '')
    html.classList.add(`theme--${docTheme}`)
    // set color to 'theme-color' meta tag
    meta?.setAttribute(
      'content',
      isBlack
        ? brandThemes.black.atoms.bg.backgroundColor
        : getBackgroundColor(theme),
    )
    window.localStorage.setItem('ALF_THEME', docTheme)
  }
}

export function getBackgroundColor(theme: ThemeName): string {
  switch (theme) {
    case 'light':
      return light.atoms.bg.backgroundColor
    case 'dark':
      return dark.atoms.bg.backgroundColor
    case 'dim':
      return dim.atoms.bg.backgroundColor
  }
}
