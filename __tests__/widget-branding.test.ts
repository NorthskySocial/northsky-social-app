import {describe, expect, it, jest} from '@jest/globals'
import {type runInNewContext} from 'vm'

jest.mock('expo-widgets', () => ({
  createWidget: (_name: string, layout: string) => {
    const components = [
      'Divider',
      'HStack',
      'Image',
      'Link',
      'Spacer',
      'Text',
      'VStack',
      'Box',
      'Button',
      'Column',
      'LazyColumn',
      'Row',
    ]
    const modifiers = [
      'background',
      'clipShape',
      'containerBackground',
      'font',
      'foregroundStyle',
      'frame',
      'layoutPriority',
      'lineLimit',
      'minimumScaleFactor',
      'padding',
      'resizable',
      'widgetURL',
      'cornerRadius',
      'fillMaxSize',
      'fillMaxWidth',
      'height',
      'paddingAll',
      'size',
      'width',
    ]
    const jsx = (type: unknown, props: unknown) => ({type, props})
    const context = {
      ...Object.fromEntries(components.map(name => [name, name])),
      ...Object.fromEntries(
        modifiers.map(name => [name, (value: unknown) => ({[name]: value})]),
      ),
      _jsx: jsx,
      _jsxs: jsx,
    }
    const vm = require('vm') as {runInNewContext: typeof runInNewContext}
    return vm.runInNewContext(`(${layout})`, context) as Layout
  },
}))

import androidWidget from '../src/features/trendingWidget/TrendingTopicsWidget.android'
import iosWidget from '../src/features/trendingWidget/TrendingTopicsWidget.ios'

type Layout = (
  props: Record<string, unknown>,
  environment: {colorScheme: string; widgetFamily: string},
) => unknown

for (const [platform, widget] of [
  ['iOS', iosWidget],
  ['Android', androidWidget],
] as const) {
  describe(`${platform} initial widget branding`, () => {
    it('opens Northsky and shows branded copy before the first sync', () => {
      const tree = (widget as unknown as Layout)(
        {},
        {colorScheme: 'light', widgetFamily: 'systemMedium'},
      )
      const serialized = JSON.stringify(tree)
      expect(serialized).toContain('Trending on Northsky')
      expect(serialized).toContain('Open Northsky to load trending topics.')
      expect(serialized).toContain('Open Northsky')
      expect(serialized).toContain('https://northsky.app/search?ref_src=widget')
      expect(serialized).not.toContain('https://bsky.app')
      expect(serialized).not.toContain('Open Bluesky')
    })

    it('preserves synchronized localized copy', () => {
      const serialized = JSON.stringify(
        (widget as unknown as Layout)(
          {
            title: 'Localized title',
            emptyMessage: 'Localized empty',
            topics: [],
          },
          {colorScheme: 'dark', widgetFamily: 'systemLarge'},
        ),
      )
      expect(serialized).toContain('Localized title')
      expect(serialized).toContain('Localized empty')
      expect(serialized).not.toContain('Open Northsky')
    })
  })
}
