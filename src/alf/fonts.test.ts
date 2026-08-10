import {type TextStyle} from 'react-native'

// The jest preset is `jest-expo/ios`, so the Android branch of `applyFonts` is
// unreachable without faking the platform flags.
jest.mock('#/env', () => ({
  ...jest.requireActual('#/env'),
  IS_ANDROID: true,
  IS_WEB: false,
}))

const {applyFonts} = require('./fonts') as typeof import('./fonts')

function themed(style: TextStyle): TextStyle {
  const s = {...style}
  applyFonts(s, 'theme')
  return s
}

describe('applyFonts on Android', () => {
  it('keeps the weight for italic text so bold italic stays bold', () => {
    // Geist ships one variable italic, so the family cannot encode the weight.
    // Dropping fontWeight here would render `***bold italic***` at 400.
    expect(themed({fontStyle: 'italic', fontWeight: '700'})).toMatchObject({
      fontFamily: 'Geist-Italic',
      fontWeight: '700',
    })
  })

  it('drops fontStyle for italic text, since the family carries it', () => {
    expect(themed({fontStyle: 'italic'}).fontStyle).toBeUndefined()
  })

  it('encodes the weight in the family name for upright text', () => {
    expect(themed({fontWeight: '700'})).toMatchObject({
      fontFamily: 'Geist-Bold',
    })
    expect(themed({fontWeight: '600'})).toMatchObject({
      fontFamily: 'Geist-SemiBold',
    })
  })

  it('drops the weight for upright text so it is not double-applied', () => {
    const s = themed({fontWeight: '700'})
    expect(s.fontWeight).toBeUndefined()
    expect(s.fontStyle).toBeUndefined()
  })

  it('falls back to the regular cut for an unmapped weight', () => {
    // The map only covers 400-900; the lighter cuts are not shipped.
    expect(themed({fontWeight: '200'})).toMatchObject({
      fontFamily: 'Geist-Regular',
    })
  })
})
