import {
  _resetCustomRecords,
  getCustomRecordRenderer,
  registerCustomRecord,
} from '../registry'

function DummyRenderer() {
  return null
}

beforeEach(() => {
  _resetCustomRecords()
})

describe('custom record registry', () => {
  it('returns undefined for an unregistered $type', () => {
    expect(getCustomRecordRenderer('com.example.unknown')).toBeUndefined()
  })

  it('returns the registered renderer for a $type', () => {
    registerCustomRecord('com.example.widget', DummyRenderer)
    expect(getCustomRecordRenderer('com.example.widget')).toBe(DummyRenderer)
  })

  it('does not leak renderers across resets', () => {
    registerCustomRecord('com.example.widget', DummyRenderer)
    _resetCustomRecords()
    expect(getCustomRecordRenderer('com.example.widget')).toBeUndefined()
  })

  it('overwrites a renderer when the same $type is registered twice', () => {
    function Other() {
      return null
    }
    registerCustomRecord('com.example.widget', DummyRenderer)
    registerCustomRecord('com.example.widget', Other)
    expect(getCustomRecordRenderer('com.example.widget')).toBe(Other)
  })
})
