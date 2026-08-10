/**
 * Color data for rendered code: the panel backgrounds and the GitHub-style
 * token palettes keyed by highlight.js scope.
 *
 * Kept apart from `theme.ts` because that module reaches into ALF, which pulls
 * in native modules a unit test cannot boot. The contrast guard in
 * `palette.test.ts` needs the numbers, not the hooks.
 */

// `bg_contrast_25` goes the wrong way in dark themes (lighter than bg), so the
// panel backgrounds are set explicitly.
export const PANEL_BG: Record<string, string> = {
  light: '#EDEBE5', // a touch darker than the off-white base
  dim: '#101010', // darker than the dim #1A1A1A base
  dark: '#141414', // dark base is pure black, so go a touch lighter instead
}

// Scopes not listed (operators, punctuation, params, ...) inherit the base text
// color, which reads best as plain code. Lookups fall back from the full scope
// (e.g. `title.function_`) to its first segment (`title`).
//
// Every color must reach 4.5:1 against its panel background. The light palette
// therefore takes GitHub's high-contrast cuts for the scopes where the default
// light theme falls short. `palette.test.ts` holds that line.
export const DARK_COLORS: Record<string, string> = {
  keyword: '#ff7b72',
  built_in: '#ffa657',
  type: '#ff7b72',
  literal: '#79c0ff',
  number: '#79c0ff',
  string: '#a5d6ff',
  regexp: '#a5d6ff',
  comment: '#8b949e',
  meta: '#8b949e',
  title: '#d2a8ff',
  'title.function_': '#d2a8ff',
  'title.class_': '#ffa657',
  attr: '#79c0ff',
  attribute: '#79c0ff',
  property: '#79c0ff',
  variable: '#ffa657',
  symbol: '#79c0ff',
  tag: '#7ee787',
  name: '#7ee787',
  'selector-tag': '#7ee787',
}

export const LIGHT_COLORS: Record<string, string> = {
  keyword: '#a0111f',
  built_in: '#953800',
  type: '#a0111f',
  literal: '#0550ae',
  number: '#0550ae',
  string: '#0a3069',
  regexp: '#0a3069',
  comment: '#5c6570',
  meta: '#5c6570',
  title: '#622cbc',
  'title.function_': '#622cbc',
  'title.class_': '#953800',
  attr: '#0550ae',
  attribute: '#0550ae',
  property: '#0550ae',
  variable: '#953800',
  symbol: '#0550ae',
  tag: '#116329',
  name: '#116329',
  'selector-tag': '#116329',
}

export function colorForScope(
  scope: string | undefined,
  colors: Record<string, string>,
): string | undefined {
  if (!scope) return undefined
  return colors[scope] ?? colors[scope.split('.')[0]]
}
