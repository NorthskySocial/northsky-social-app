import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {useAppPasswordNoticeAcknowledgement} from '#/features/ageConfirmation/gate'
import {GateLayout} from '#/features/ageConfirmation/GateLayout'

/**
 * Blocks an App Password session until the person accepts the limits.
 *
 * An App Password cannot write personal details, so this session cannot answer
 * the age questions. Without a declared age the adult age gate treats the
 * account as under age. The person can accept that and continue, or sign out
 * and sign in with the main account password.
 *
 * The acceptance is stored per account, so the notice does not return on every
 * launch.
 */
export function AppPasswordNoticeScreen() {
  const t = useTheme()
  const {t: l} = useLingui()
  const {currentAccount} = useSession()
  const [, setAcknowledgedAt] = useAppPasswordNoticeAcknowledgement(
    currentAccount?.did,
  )

  return (
    <GateLayout>
      <View style={[a.gap_lg]}>
        <Text style={[a.text_xl, a.font_semi_bold, a.leading_snug]}>
          <Trans>We cannot confirm your age</Trans>
        </Text>
        <Text style={[a.text_md, a.leading_snug, t.atoms.text_contrast_medium]}>
          <Trans>
            You signed in with an App Password. An App Password cannot save your
            age, so we have to treat this account as under age.
          </Trans>
        </Text>

        <View style={[a.gap_sm]}>
          <Text style={[a.text_md, a.font_semi_bold, a.leading_snug]}>
            <Trans>What stays off</Trans>
          </Text>
          <Text
            style={[a.text_md, a.leading_snug, t.atoms.text_contrast_medium]}>
            <Trans>Adult content stays hidden.</Trans>
          </Text>
          <Text
            style={[a.text_md, a.leading_snug, t.atoms.text_contrast_medium]}>
            <Trans>Group chat invites stay off.</Trans>
          </Text>
        </View>

        <Text style={[a.text_md, a.leading_snug, t.atoms.text_contrast_medium]}>
          <Trans>
            To remove these limits, sign out and sign in again with your main
            account password.
          </Trans>
        </Text>

        <Button
          testID="ageConfirmationNoticeContinueButton"
          label={l`Continue with these limits`}
          size="large"
          variant="solid"
          color="primary"
          onPress={() => setAcknowledgedAt(new Date().toISOString())}>
          <ButtonText>
            <Trans>Continue</Trans>
          </ButtonText>
        </Button>
      </View>
    </GateLayout>
  )
}
