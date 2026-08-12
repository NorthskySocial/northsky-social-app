import {scaleForDelta} from '../motionScale'

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
