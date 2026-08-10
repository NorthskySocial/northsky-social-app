import {useEffect, useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {useCleanError} from '#/lib/hooks/useCleanError'
import {isAppPassword} from '#/lib/jwt'
import {logger} from '#/logger'
import {useBirthdateMutation} from '#/state/birthdate'
import {useSession} from '#/state/session'
import {ErrorMessage} from '#/view/com/util/error/ErrorMessage'
import {atoms as a, useTheme, web} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {ADULT_AGE_GATE_ENABLED} from '#/ageAssurance/const'
import {useOtherRequiredDataQuery} from '#/ageAssurance/data'
import {AgeConfirmationFields} from '#/features/ageConfirmation/AgeConfirmationFields'
import {
  type AgeConfirmation,
  EMPTY_AGE_CONFIRMATION,
} from '#/features/ageConfirmation/types'
import {
  birthdateFromAgeConfirmation,
  isAgeConfirmationComplete,
} from '#/features/ageConfirmation/util'

/**
 * Whether to ask the current account the age questions.
 *
 * An account created in this app answers during signup, so it already has a
 * declared age and never sees this dialog. An account created somewhere else
 * reaches the app with no declared age, which the adult age gate reads as
 * under age. This asks that account once.
 *
 * An app password cannot write personal details, so those sessions are
 * skipped. Otherwise the dialog would return on every launch with no way to
 * answer it.
 *
 * The birthdate read must succeed first. On a fresh install there is no cached
 * value, so an account that already has a birthdate would otherwise see the
 * dialog for the moment before the query resolves. A failed read asks nothing.
 */
function useShouldConfirmAge() {
  const {hasSession, currentAccount} = useSession()
  const {data, isSuccess} = useOtherRequiredDataQuery()
  if (!ADULT_AGE_GATE_ENABLED) return false
  if (!hasSession || !currentAccount) return false
  if (isAppPassword(currentAccount.accessJwt || '')) return false
  if (!isSuccess) return false
  return !data?.birthdate
}

export function AgeConfirmationDialog() {
  const control = Dialog.useDialogControl()
  const shouldConfirmAge = useShouldConfirmAge()

  useEffect(() => {
    if (shouldConfirmAge) {
      control.open()
    }
  }, [shouldConfirmAge, control])

  return (
    <Dialog.Outer control={control} nativeOptions={{preventExpansion: true}}>
      <Dialog.Handle />
      <Inner />
    </Dialog.Outer>
  )
}

function Inner() {
  const t = useTheme()
  const {t: l} = useLingui()
  const control = Dialog.useDialogContext()
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
      control.close()
    } catch (e) {
      logger.error(`AgeConfirmationDialog: failed to save age`, {
        message: (e as Error).message,
      })
    }
  }

  const {raw, clean} = cleanError(error)
  const errorMessage = error ? clean || raw : undefined

  return (
    <Dialog.ScrollableInner
      label={l`Confirm your age`}
      style={web({maxWidth: 400})}>
      <View style={[a.gap_md]}>
        <Text style={[a.text_xl, a.font_semi_bold]}>
          <Trans>Confirm your age</Trans>
        </Text>
        <Text style={[a.text_md, a.leading_snug, t.atoms.text_contrast_medium]}>
          <Trans>
            We ask once so we can give you the right experience. Your answers
            are private, stored in your account, and not shared.
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
      </View>

      <Dialog.Close />
    </Dialog.ScrollableInner>
  )
}
