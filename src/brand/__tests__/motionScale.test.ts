import {pressScale, scaleForDelta} from '../motionScale'

describe('scaleForDelta', () => {
  it('moves each edge of a small button by the requested pixels', () => {
    // 80px wide, grown by 3px, is 83/80.
    expect(scaleForDelta(80, 3)).toBeCloseTo(1.0375)
  })

  it('keeps a full-width button close to its rest size', () => {
    // The regression: a flat 1.1 ratio threw a 400px CTA 40px past the
    // screen edges. A 3px delta moves it 3px.
    const scale = scaleForDelta(400, 3)
    expect(400 * scale - 400).toBeCloseTo(3)
    expect(scale).toBeLessThan(1.01)
  })

  it('shrinks for a negative delta', () => {
    expect(scaleForDelta(48, -3)).toBeCloseTo(0.9375)
  })

  it('caps growth on very small elements', () => {
    expect(scaleForDelta(10, 3)).toBe(1.1)
  })

  it('caps shrinkage on very small elements', () => {
    expect(scaleForDelta(10, -3)).toBe(0.9)
  })

  it('returns the rest scale before layout reports a size', () => {
    expect(scaleForDelta(0, 3)).toBe(1)
    expect(scaleForDelta(Number.NaN, 3)).toBe(1)
  })
})

describe('pressScale', () => {
  const enabled = true

  it('keeps a named scale', () => {
    expect(
      pressScale({targetScale: 0.9, width: 300, height: 44, enabled}),
    ).toBe(0.9)
  })

  it('keeps a named scale even where a press does not scale', () => {
    expect(
      pressScale({targetScale: 0.9, width: 300, height: 44, enabled: false}),
    ).toBe(0.9)
  })

  it('shrinks the longest edge of an unnamed element by a set distance', () => {
    // The regression: a flat 0.98 took 8px off a 400px reply prompt but only
    // 1px off a 56px button.
    const prompt = pressScale({width: 400, height: 44, enabled})
    const fab = pressScale({width: 56, height: 56, enabled})

    expect(400 * prompt - 400).toBeCloseTo(-3)
    expect(56 * fab - 56).toBeCloseTo(-3)
  })

  it('keeps the shape of an element that is wider than it is tall', () => {
    // One scale for both axes. Equal travel per axis would oval the avatar
    // that sits inside the reply prompt.
    const scale = pressScale({width: 400, height: 44, enabled})

    expect(400 * scale - 400).toBeCloseTo(-3)
    expect(44 * scale - 44).toBeGreaterThan(-1)
  })

  it('caps the shrink on a very small element', () => {
    // A 25px round button would otherwise shrink 12%.
    expect(pressScale({width: 25, height: 25, enabled})).toBe(0.9)
  })

  it('rests an unnamed element where a press does not scale', () => {
    expect(pressScale({width: 400, height: 44, enabled: false})).toBe(1)
  })

  it('rests an unnamed element before layout reports a size', () => {
    expect(pressScale({width: 0, height: 0, enabled})).toBe(1)
  })
})
