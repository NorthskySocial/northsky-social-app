import {useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {useCleanError} from '#/lib/hooks/useCleanError'
import {logger} from '#/logger'
import {useBirthdateMutation} from '#/state/birthdate'
import {ErrorMessage} from '#/view/com/util/error/ErrorMessage'
import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {AgeConfirmationFields} from '#/features/ageConfirmation/AgeConfirmationFields'
import {GateLayout} from '#/features/ageConfirmation/GateLayout'
import {
  type AgeConfirmation,
  EMPTY_AGE_CONFIRMATION,
} from '#/features/ageConfirmation/types'
import {
  birthdateFromAgeConfirmation,
  isAgeConfirmationComplete,
} from '#/features/ageConfirmation/util'

/**
 * Blocks the app until the account declares an age.
 *
 * An account created in this app answers at signup, so it never reaches this
 * screen. An account created somewhere else arrives with no declared age, and
 * the adult age gate reads that as under age, so the app asks once here.
 *
 * There is no dismiss action on purpose. A saved answer clears the gate, and
 * the layout offers a sign out for anyone who would rather use another
 * account.
 */
export function AgeConfirmationScreen() {
  const t = useTheme()
  const {t: l} = useLingui()
  const cleanError = useCleanError()
  const [confirmation, setConfirmation] = useState<AgeConfirmation>(
    EMPTY_AGE_CONFIRMATION,
  )
  const {isPending, error, mutateAsync: setBirthdate} = useBirthdateMutation()

  const birthdate = birthdateFromAgeConfirmation(confirmation)
  const canSave = isAgeConfirmationComplete(confirmation) && !!birthdate

  const onSave = async () => {
    if (!birthdate) return
    try {
      await setBirthdate({birthDate: birthdate})
    } catch (e) {
      logger.error(`AgeConfirmationScreen: failed to save the age`, {
        message: (e as Error).message,
      })
    }
  }

  const {raw, clean} = cleanError(error)
  const errorMessage = error ? clean || raw : undefined

  return (
    <GateLayout>
      <View style={[a.gap_lg]}>
        <Text style={[a.text_xl, a.font_semi_bold, a.leading_snug]}>
          <Trans>Confirm your age</Trans>
        </Text>
        <Text style={[a.text_md, a.leading_snug, t.atoms.text_contrast_medium]}>
          <Trans>
            We ask once so we can give you the right experience. Your answers
            are private, stored in your account, and not shared with other
            users.
          </Trans>
        </Text>

        <AgeConfirmationFields
          value={confirmation}
          onChange={setConfirmation}
        />

        {errorMessage ? (
          <ErrorMessage message={errorMessage} style={[a.rounded_sm]} />
        ) : undefined}

        <Button
          testID="ageConfirmationSaveButton"
          label={l`Save`}
          size="large"
          variant="solid"
          color="primary"
          disabled={!canSave || isPending}
          onPress={() => void onSave()}>
          <ButtonText>
            <Trans>Save</Trans>
          </ButtonText>
          {isPending && <ButtonIcon icon={Loader} />}
        </Button>

        <Admonition type="tip">
          <Trans>
            For an organizational account, answer for the person who is
            responsible for the account.
          </Trans>
        </Admonition>
      </View>
    </GateLayout>
  )
}
