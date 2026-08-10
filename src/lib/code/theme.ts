/**
 * Shared theming for rendered code: monospace font, layout constants, and the
 * hooks that pick a palette for the active theme. The color data itself lives
 * in `./palette`, which stays free of ALF so a test can read it directly.
 */
import {useAlf} from '#/alf'
import {MONOSPACE_FONT_FAMILY} from '#/brand/fonts'
import {DARK_COLORS, LIGHT_COLORS, PANEL_BG} from './palette'

export {colorForScope} from './palette'

/**
 * Monospace family for rendered code. Re-exported from the brand module so it
 * stays the exact constant `applyFonts` checks against - otherwise the body
 * font would override it. See src/brand/fonts.ts and src/alf/fonts.ts.
 */
export const MONO_FONT = MONOSPACE_FONT_FAMILY

/**
 * Fixed per-line height for rendered code. The viewport caps below rely on it
 * being exact, since they bound height in pixels rather than line count.
 */
export const CODE_LINE_HEIGHT = 18

/**
 * Vertical padding above and below rendered code (`a.py_sm`). The viewport caps
 * add it back explicitly so a clip lands on a whole row boundary.
 */
export const CODE_PADDING_Y = 8

/** Collapsed preview height, in lines. */
export const PREVIEW_LINES = 10

/**
 * Expanded viewport cap, in lines. Past this the block scrolls internally
 * instead of growing, so a long snippet cannot take over the screen.
 */
export const SCROLL_LINES = 25

/**
 * Panel color for code surfaces.
 *
 * Reads `themeName` from the ALF context (the same source `useTheme()` uses)
 * rather than the standalone `useThemeName()`. The latter subscribes to
 * useColorScheme/useThemePrefs directly and does not re-render these code
 * components on a live light/dark toggle, so the panel background stayed stale
 * until reload.
 */
export function useCodePanelColor(): string {
  const {themeName} = useAlf()
  return PANEL_BG[themeName] ?? PANEL_BG.dark
}

/** Returns the token palette for the active theme (light vs dark/dim). */
export function useCodeColors(): Record<string, string> {
  // ALF context (not the standalone useThemeName) so token colors update on a
  // live theme toggle - see the note on useCodePanelColor.
  const {themeName} = useAlf()
  return themeName === 'light' ? LIGHT_COLORS : DARK_COLORS
}
