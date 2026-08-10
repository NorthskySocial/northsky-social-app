import {colorForScope, DARK_COLORS, LIGHT_COLORS, PANEL_BG} from './palette'

/**
 * WCAG relative luminance: linearize each sRGB channel, then weight them.
 * See https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  const linear = channels.map(c =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** WCAG 2.1 AA for body-size text. */
const MIN_CONTRAST = 4.5

describe('contrast helper', () => {
  it('measures the defined maximum', () => {
    // Guards the helper itself, so a palette failure means a palette problem.
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
  })
})

describe('token contrast', () => {
  it.each(Object.entries(LIGHT_COLORS))(
    'renders %s legibly on the light panel',
    (_scope, color) => {
      expect(contrast(color, PANEL_BG.light)).toBeGreaterThanOrEqual(
        MIN_CONTRAST,
      )
    },
  )

  it.each(Object.entries(DARK_COLORS))(
    'renders %s legibly on the dim panel',
    (_scope, color) => {
      expect(contrast(color, PANEL_BG.dim)).toBeGreaterThanOrEqual(MIN_CONTRAST)
    },
  )

  it.each(Object.entries(DARK_COLORS))(
    'renders %s legibly on the dark panel',
    (_scope, color) => {
      expect(contrast(color, PANEL_BG.dark)).toBeGreaterThanOrEqual(
        MIN_CONTRAST,
      )
    },
  )
})

describe('colorForScope', () => {
  it('reads an exact scope', () => {
    expect(colorForScope('keyword', LIGHT_COLORS)).toBe(LIGHT_COLORS.keyword)
  })

  it('falls back to the first segment of a compound scope', () => {
    expect(colorForScope('title.method_', LIGHT_COLORS)).toBe(
      LIGHT_COLORS.title,
    )
  })

  it('prefers an exact compound scope over the fallback', () => {
    expect(colorForScope('title.class_', LIGHT_COLORS)).toBe(
      LIGHT_COLORS['title.class_'],
    )
  })

  it('returns undefined for an unlisted or missing scope', () => {
    expect(colorForScope('punctuation', LIGHT_COLORS)).toBeUndefined()
    expect(colorForScope(undefined, LIGHT_COLORS)).toBeUndefined()
  })
})
