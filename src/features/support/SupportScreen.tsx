import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {atoms as a, useTheme} from '#/alf'
import {ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {Link} from '#/components/Link'
import {Text} from '#/components/Typography'
import {BRAND} from '#/brand'
import {Checkout} from './Checkout'
import {DONATIONS} from './links'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'Support'>

export function SupportScreen({}: Props) {
  const t = useTheme()
  const {t: l} = useLingui()

  return (
    <Layout.Screen testID="supportScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Support</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content contentContainerStyle={[a.p_lg, a.gap_lg]}>
        <View style={[a.gap_sm, a.p_lg, a.rounded_md, t.atoms.bg_contrast_25]}>
          <Text style={[a.text_lg, a.font_bold]}>
            <Trans>Why support {BRAND.appName}?</Trans>
          </Text>
          <Text style={[a.text_md, a.leading_snug]}>
            <Trans>
              {BRAND.appName} is funded by the community. Your support helps us
              improve and maintain the platform.
            </Trans>
          </Text>
        </View>

        {DONATIONS ? (
          <View
            style={[a.gap_md, a.p_lg, a.rounded_md, t.atoms.bg_contrast_25]}>
            <Text style={[a.text_lg, a.font_bold]}>
              <Trans>Make a donation</Trans>
            </Text>
            <Checkout config={DONATIONS} />
          </View>
        ) : (
          <View
            style={[a.gap_md, a.p_lg, a.rounded_md, t.atoms.bg_contrast_25]}>
            <Text style={[a.text_md, a.leading_snug]}>
              <Trans>
                Donations are not set up in this build. You can still support us
                on our website.
              </Trans>
            </Text>
            <Link
              to={BRAND.supportUsUrl}
              label={l`Support ${BRAND.appName} on our website`}
              size="small"
              variant="solid"
              color="primary"
              style={[a.rounded_full, a.justify_center]}>
              <ButtonText>
                <Trans>Support us</Trans>
              </ButtonText>
            </Link>
          </View>
        )}
      </Layout.Content>
    </Layout.Screen>
  )
}
