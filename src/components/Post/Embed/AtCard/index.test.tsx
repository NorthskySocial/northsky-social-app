import {type ReactNode} from 'react'
import {moderateProfile} from '@bsky/sdk/moderation'
import {render, screen} from '@testing-library/react-native'

import {useProfileQuery} from '#/state/queries/profile'
import {AtCard} from './index'

jest.mock('@lingui/react', () => ({useLingui: () => ({_: () => 'Visit site'})}))
jest.mock('@bsky/sdk/moderation', () => ({moderateProfile: jest.fn()}))
jest.mock('#/lib/haptics', () => ({useHaptics: () => jest.fn()}))
jest.mock('#/lib/sharing', () => ({shareUrl: jest.fn()}))
jest.mock('#/state/preferences/moderation-opts', () => ({
  useModerationOpts: () => ({}),
}))
jest.mock('#/state/queries/profile', () => ({useProfileQuery: jest.fn()}))
jest.mock('#/alf', () => ({
  atoms: new Proxy({}, {get: () => ({})}),
  useTheme: () => ({atoms: {}}),
  useBreakpoints: () => ({gtPhone: true}),
}))
jest.mock('#/components/Divider', () => ({Divider: () => null}))
jest.mock('#/components/Typography', () => ({
  Text: jest.requireActual<typeof import('react-native')>('react-native').Text,
}))
jest.mock('#/components/Link', () => ({
  Link: ({children}: {children: (state: object) => ReactNode}) => children({}),
}))
jest.mock('#/view/com/util/UserAvatar', () => ({
  UserAvatar: ({moderation}: {moderation?: {blur: boolean}}) => {
    const {View} =
      jest.requireActual<typeof import('react-native')>('react-native')
    return (
      <View testID="avatar" accessibilityState={{disabled: moderation?.blur}} />
    )
  },
}))
jest.mock('./providers', () => ({
  getAtCardProvider: () => ({name: 'Attie', CtaIcon: () => null}),
}))

function draw(filtered = false, blurred = false) {
  jest.mocked(useProfileQuery).mockReturnValue({
    data: {
      did: 'did:plc:creator',
      handle: 'creator.example',
      displayName: 'Creator ✅',
    },
  } as unknown as ReturnType<typeof useProfileQuery>)
  jest.mocked(moderateProfile).mockReturnValue({
    ui: (context: string) => ({
      filter: context === 'profileList' && filtered,
      blur: blurred,
    }),
  } as ReturnType<typeof moderateProfile>)
  return render(
    <AtCard
      view={{
        uri: 'https://example.attie.site',
        title: 'Site title',
        description: 'Description',
      }}
      authorDid="did:plc:creator"
    />,
  )
}

it('sanitizes publisher-attributed display names', () => {
  draw()
  expect(screen.getByText('Creator')).toBeTruthy()
  expect(screen.queryByText('Creator ✅')).toBeNull()
  expect(moderateProfile).toHaveBeenCalled()
})

it('applies profile avatar and display name blurring', () => {
  draw(false, true)
  expect(screen.getByTestId('avatar').props.accessibilityState).toEqual({
    disabled: true,
  })
  expect(screen.queryByText('Creator')).toBeNull()
})

it('omits filtered creator attribution while preserving the external card', () => {
  draw(true)
  expect(screen.queryByTestId('avatar')).toBeNull()
  expect(screen.queryByText('@creator.example')).toBeNull()
  expect(screen.getByText('Site title')).toBeTruthy()
})
