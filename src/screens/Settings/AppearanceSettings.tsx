import {useCallback} from 'react'
import Animated, {
  FadeInUp,
  FadeOutUp,
  LayoutAnimationConfig,
  LinearTransition,
} from 'react-native-reanimated'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {useSetThemePrefs, useThemePrefs} from '#/state/shell'
import {type Alf, atoms as a, native, useAlf, useTheme} from '#/alf'
import * as SegmentedControl from '#/components/forms/SegmentedControl'
import * as Toggle from '#/components/forms/Toggle'
import {ColorPalette_Stroke2_Corner0_Rounded as ColorPaletteIcon} from '#/components/icons/ColorPalette' // northsky: icon for the "Accents" setting
import {type Props as SVGIconProps} from '#/components/icons/common'
import {Moon_Stroke2_Corner0_Rounded as MoonIcon} from '#/components/icons/Moon'
import {MusicNote_Stroke2_Corner0_Rounded as MusicNoteIcon} from '#/components/icons/MusicNote'
import {Phone_Stroke2_Corner0_Rounded as PhoneIcon} from '#/components/icons/Phone'
// northsky: icon for the "They're called" setting
import {Speakerphone_Stroke2_Corner0_Rounded as SpeakerphoneIcon} from '#/components/icons/Speakerphone'
import {TextSize_Stroke2_Corner0_Rounded as TextSize} from '#/components/icons/TextSize'
import {TitleCase_Stroke2_Corner0_Rounded as Aa} from '#/components/icons/TitleCase'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {
  useListeningToEnabled,
  useSetListeningToEnabled,
} from '#/features/listeningTo'
// northsky: the "Accents" setting, brand gradient vs calm solid colour
import {useAccents, useSetAccents} from '#/features/northskyAppearance'
// northsky: the "They're called" setting, post wording vs skeet wording
import {usePostNaming, useSetPostNaming} from '#/features/postVocabulary'
import * as SettingsList from './components/SettingsList'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'AppearanceSettings'>
export function AppearanceSettingsScreen({}: Props) {
  const {_} = useLingui()
  const {fonts} = useAlf()

  const {colorMode, darkTheme} = useThemePrefs()
  const {setColorMode, setDarkTheme} = useSetThemePrefs()
  // northsky: the "They're called" setting
  const postNaming = usePostNaming()
  const setPostNaming = useSetPostNaming()
  // northsky: the "Accents" setting
  const accents = useAccents()
  const setAccents = useSetAccents()
  const listeningToEnabled = useListeningToEnabled()
  const setListeningToEnabled = useSetListeningToEnabled()

  const onChangeAppearance = useCallback(
    (value: 'light' | 'system' | 'dark') => {
      setColorMode(value)
    },
    [setColorMode],
  )

  const onChangeDarkTheme = useCallback(
    (value: 'dim' | 'dark' | 'black') => {
      setDarkTheme(value)
    },
    [setDarkTheme],
  )

  const onChangeFontFamily = useCallback(
    (value: 'system' | 'theme') => {
      fonts.setFontFamily(value)
    },
    [fonts],
  )

  const onChangeFontScale = useCallback(
    (value: Alf['fonts']['scale']) => {
      fonts.setFontScale(value)
    },
    [fonts],
  )

  return (
    <LayoutAnimationConfig skipExiting skipEntering>
      <Layout.Screen testID="preferencesThreadsScreen">
        <Layout.Header.Outer>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Appearance</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
          <Layout.Header.Slot />
        </Layout.Header.Outer>
        <Layout.Content>
          <SettingsList.Container>
            <AppearanceToggleButtonGroup
              title={_(msg`Color mode`)}
              icon={PhoneIcon}
              items={[
                {
                  label: _(msg`System`),
                  name: 'system',
                },
                {
                  label: _(msg`Light`),
                  name: 'light',
                },
                {
                  label: _(msg`Dark`),
                  name: 'dark',
                },
              ]}
              value={colorMode}
              onChange={onChangeAppearance}
            />

            {colorMode !== 'light' && (
              <Animated.View
                entering={native(FadeInUp)}
                exiting={native(FadeOutUp)}>
                <AppearanceToggleButtonGroup
                  title={_(msg`Dark theme`)}
                  icon={MoonIcon}
                  items={[
                    {
                      label: _(msg`Dim`),
                      name: 'dim',
                    },
                    {
                      label: _(msg`Dark`),
                      name: 'dark',
                    },
                    // northsky: true-black dark theme
                    {
                      label: _(msg({message: `Black`, context: 'theme'})),
                      name: 'black',
                    },
                  ]}
                  value={darkTheme ?? 'dim'}
                  onChange={onChangeDarkTheme}
                />
              </Animated.View>
            )}

            <Animated.View layout={native(LinearTransition)}>
              {/* northsky: the "Accents" setting */}
              <AppearanceToggleButtonGroup
                title={_(msg`Accents`)}
                icon={ColorPaletteIcon}
                items={[
                  {
                    label: _(msg({message: `Lively`, context: 'accents'})),
                    name: 'lively',
                  },
                  {
                    label: _(msg({message: `Calm`, context: 'accents'})),
                    name: 'calm',
                  },
                ]}
                value={accents}
                onChange={setAccents}
              />

              <SettingsList.Divider />

              <AppearanceToggleButtonGroup
                title={_(msg`Font`)}
                description={_(
                  msg`For the best experience, we recommend using the theme font.`,
                )}
                icon={Aa}
                items={[
                  {
                    label: _(msg`System`),
                    name: 'system',
                  },
                  {
                    label: _(msg`Theme`),
                    name: 'theme',
                  },
                ]}
                value={fonts.family}
                onChange={onChangeFontFamily}
              />

              <AppearanceToggleButtonGroup
                title={_(msg`Font size`)}
                icon={TextSize}
                items={[
                  {
                    label: _(msg`Smaller`),
                    name: '-1',
                  },
                  {
                    label: _(msg`Default`),
                    name: '0',
                  },
                  {
                    label: _(msg`Larger`),
                    name: '1',
                  },
                ]}
                value={fonts.scale}
                onChange={onChangeFontScale}
              />

              {/* northsky: the "They're called" setting */}
              <AppearanceToggleButtonGroup
                title={_(msg`They're called`)}
                icon={SpeakerphoneIcon}
                items={[
                  {
                    label: _(msg`Posts`),
                    name: 'post',
                  },
                  {
                    label: _(msg`Skeets`),
                    name: 'skeet',
                  },
                ]}
                value={postNaming}
                onChange={setPostNaming}
              />

              <SettingsList.Divider />

              <SettingsList.Group contentContainerStyle={[a.gap_sm]}>
                <SettingsList.ItemIcon icon={MusicNoteIcon} />
                <SettingsList.ItemText>
                  <Trans>Listening to</Trans>
                </SettingsList.ItemText>
                <Toggle.Item
                  name="listening_to"
                  label={_(msg`Show listening activity on profiles`)}
                  value={listeningToEnabled}
                  onChange={setListeningToEnabled}
                  style={[a.w_full]}>
                  <Toggle.LabelText style={[a.flex_1]}>
                    <Trans>Show listening activity on profiles</Trans>
                  </Toggle.LabelText>
                  <Toggle.Platform />
                </Toggle.Item>
              </SettingsList.Group>

              {/*{IS_NATIVE && IS_INTERNAL && (
                <>
                  <SettingsList.Divider />
                  <AppIconSettingsListItem />
                </>
              )}*/}
            </Animated.View>
          </SettingsList.Container>
        </Layout.Content>
      </Layout.Screen>
    </LayoutAnimationConfig>
  )
}

export function AppearanceToggleButtonGroup<T extends string>({
  title,
  description,
  icon: Icon,
  items,
  value,
  onChange,
}: {
  title: string
  description?: string
  icon: React.ComponentType<SVGIconProps>
  items: {
    label: string
    name: T
  }[]
  value: T
  onChange: (value: T) => void
}) {
  const t = useTheme()
  return (
    <>
      <SettingsList.Group contentContainerStyle={[a.gap_sm]} iconInset={false}>
        <SettingsList.ItemIcon icon={Icon} />
        <SettingsList.ItemText>{title}</SettingsList.ItemText>
        {description && (
          <Text
            style={[
              a.text_sm,
              a.leading_snug,
              t.atoms.text_contrast_medium,
              a.w_full,
            ]}>
            {description}
          </Text>
        )}
        <SegmentedControl.Root
          type="radio"
          label={title}
          value={value}
          onChange={onChange}>
          {items.map(item => (
            <SegmentedControl.Item
              key={item.name}
              label={item.label}
              value={item.name}>
              <SegmentedControl.ItemText>
                {item.label}
              </SegmentedControl.ItemText>
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>
      </SettingsList.Group>
    </>
  )
}
