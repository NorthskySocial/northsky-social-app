import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {
  type AiPreferenceKey,
  type AiPreferencesRecord,
  type AiPreferenceValue,
  preferenceToValue,
} from '#/lib/ai-preferences'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {
  useAiPreferencesMutation,
  useAiPreferencesQuery,
} from '#/state/queries/ai-preferences'
import * as SettingsList from '#/screens/Settings/components/SettingsList'
import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Divider} from '#/components/Divider'
import * as ToggleButton from '#/components/forms/ToggleButton'
import {Robot_Stroke2_Corner2_Rounded as RobotIcon} from '#/components/icons/Robot'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import * as LabelPreference from '#/components/moderation/LabelPreference'
import {ItemTextWithSubtitle} from './NotificationSettings/components/ItemTextWithSubtitle'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'AiSettings'>
export function AiSettingsScreen({}: Props) {
  const {data: aiPreferences, isPending, isError} = useAiPreferencesQuery()

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>AI Preferences</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <SettingsList.Container>
          <SettingsList.Item style={[a.align_start]}>
            <SettingsList.ItemIcon icon={RobotIcon} />
            <ItemTextWithSubtitle
              bold
              titleText={<Trans>Determine how AI may use your data</Trans>}
              subtitleText={
                <Trans>
                  You can adjust these settings to configure how AI systems may
                  use your data across the AT Protocol network. In an open
                  source system, your data stays public, but you can say how AI
                  should handle it.{'\n'}
                  {'\n'}
                  Northsky will follow the preferences you set here. We will
                  share your preferences with other AT Protocol services who can
                  choose to respect them. Bad actors may ignore these signals
                  and work around them, which is outside the control of
                  Northsky, your PDS operator, and other intermediary services
                  on the network.{'\n'}
                  {'\n'}
                  Safety tools like spam and bot detection aren't affected. They
                  stay on for everyone.
                </Trans>
              }
            />
          </SettingsList.Item>
          <View style={[a.px_xl, a.pt_md, a.gap_md]}>
            {isError ? (
              <Admonition type="error">
                <Trans>Failed to load preferences.</Trans>
              </Admonition>
            ) : isPending ? (
              <View style={[a.w_full, a.pt_5xl, a.align_center]}>
                <Loader size="xl" />
              </View>
            ) : (
              <Inner record={aiPreferences.value} />
            )}
            <Admonition type="info">
              <Trans>
                Note: these are declared preferences, not technical
                restrictions. Services choose whether to honor them.
              </Trans>
            </Admonition>
          </View>
        </SettingsList.Container>
      </Layout.Content>
    </Layout.Screen>
  )
}

function Inner({record}: {record: AiPreferencesRecord}) {
  const t = useTheme()
  const {_} = useLingui()

  return (
    <View
      style={[
        a.w_full,
        a.rounded_md,
        a.overflow_hidden,
        t.atoms.bg_contrast_25,
      ]}>
      <PreferenceRow
        prefKey="training"
        record={record}
        name={_(msg`Training`)}
        description={_(
          msg`Use your data to build or train new AI models. Once your work is in a model, it stays there, even if you delete your account later.`,
        )}
      />
      <Divider />
      <PreferenceRow
        prefKey="inference"
        record={record}
        name={_(msg`Inference`)}
        description={_(
          msg`Look up your data when AI is answering someone's question. The AI doesn't keep it, but it might quote or reference it in real time.`,
        )}
      />
      <Divider />
      <PreferenceRow
        prefKey="syntheticContent"
        record={record}
        name={_(msg`Synthetic content`)}
        description={_(
          msg`Generate new content or interactions modeled on your data. This includes AI imitations of your writing, AI-generated versions of your photos or audio, or bots designed to sound like you.`,
        )}
      />
      <Divider />
      <PreferenceRow
        prefKey="embedding"
        record={record}
        name={_(msg`Embedding`)}
        description={_(
          msg`Use your data in AI search and recommendation systems. This is how AI finds similar accounts, groups users by interests, and decides what to show in personalized feeds (e.g. 'discover', 'for you', etc.)`,
        )}
      />
    </View>
  )
}

function PreferenceRow({
  prefKey,
  record,
  name,
  description,
}: {
  prefKey: AiPreferenceKey
  record: AiPreferencesRecord
  name: string
  description: string
}) {
  const {_} = useLingui()
  const {mutate} = useAiPreferencesMutation()
  const value = preferenceToValue(record.preferences[prefKey])

  return (
    <LabelPreference.Outer>
      <LabelPreference.Content name={name} description={description} />
      <View style={[{minHeight: 35}, a.w_full]}>
        <ToggleButton.Group
          label={_(msg`Configure AI usage preference for: ${name}`)}
          values={[value]}
          onChange={values => {
            const next = values[0] as AiPreferenceValue | undefined
            if (next && next !== value) {
              mutate({key: prefKey, value: next})
            }
          }}>
          <ToggleButton.Button name="allow" label={_(msg`Allow`)}>
            <ToggleButton.ButtonText>
              <Trans>Allow</Trans>
            </ToggleButton.ButtonText>
          </ToggleButton.Button>
          <ToggleButton.Button name="unset" label={_(msg`No preference`)}>
            <ToggleButton.ButtonText>
              <Trans>No preference</Trans>
            </ToggleButton.ButtonText>
          </ToggleButton.Button>
          <ToggleButton.Button name="deny" label={_(msg`Deny`)}>
            <ToggleButton.ButtonText>
              <Trans>Deny</Trans>
            </ToggleButton.ButtonText>
          </ToggleButton.Button>
        </ToggleButton.Group>
      </View>
    </LabelPreference.Outer>
  )
}
