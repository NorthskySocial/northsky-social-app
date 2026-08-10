import {View} from 'react-native'
import {plural} from '@lingui/core/macro'
import {Plural, Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import * as SegmentedControl from '#/components/forms/SegmentedControl'
import {Text} from '#/components/Typography'
import {MIN_ACCESS_AGE} from '#/ageAssurance/const'
import {type AgeConfirmation} from '#/features/ageConfirmation/types'
import {
  withLegalAdultAnswer,
  withMinAccessAgeAnswer,
} from '#/features/ageConfirmation/util'

type Answer = 'yes' | 'no' | 'unset'

function toAnswer(value: boolean | undefined): Answer {
  if (value === undefined) return 'unset'
  return value ? 'yes' : 'no'
}

/**
 * The two age questions the app asks in place of a birthdate. The parent owns
 * the answers, so signup and the first sign-in dialog can share this view.
 *
 * The adult question appears only after the person confirms the minimum
 * access age. This keeps the pair of answers consistent, because a person who
 * is under the minimum cannot also be an adult.
 */
export function AgeConfirmationFields({
  value,
  onChange,
}: {
  value: AgeConfirmation
  onChange: (next: AgeConfirmation) => void
}) {
  const {t: l} = useLingui()

  return (
    <View style={[a.gap_lg]} testID="ageConfirmationFields">
      <Question
        testID="ageConfirmMinAccessAge"
        label={plural(MIN_ACCESS_AGE, {
          other: 'Are you # years of age or older?',
        })}
        value={toAnswer(value.isOverMinAccessAge)}
        onChange={answer => {
          onChange(withMinAccessAgeAnswer(value, answer === 'yes'))
        }}>
        <QuestionText>
          <Plural
            value={MIN_ACCESS_AGE}
            other="Are you # years of age or older?"
          />
        </QuestionText>
      </Question>

      {value.isOverMinAccessAge === true && (
        <Question
          testID="ageConfirmLegalAdult"
          label={l`Are you legally considered an adult in the country and/or state where you live?`}
          value={toAnswer(value.isLegalAdult)}
          onChange={answer => {
            onChange(withLegalAdultAnswer(value, answer === 'yes'))
          }}>
          <QuestionText>
            <Trans>
              Are you legally considered an adult in the country and/or state
              where you live?
            </Trans>
          </QuestionText>
        </Question>
      )}
    </View>
  )
}

function QuestionText({children}: {children: React.ReactNode}) {
  const t = useTheme()
  return (
    <Text style={[a.text_md, a.leading_snug, t.atoms.text_contrast_high]}>
      {children}
    </Text>
  )
}

function Question({
  children,
  label,
  value,
  onChange,
  testID,
}: {
  children: React.ReactNode
  label: string
  value: Answer
  onChange: (value: Answer) => void
  testID: string
}) {
  const {t: l} = useLingui()

  return (
    <View style={[a.gap_sm]} testID={testID}>
      {children}
      <SegmentedControl.Root
        type="radio"
        label={label}
        value={value}
        onChange={onChange}>
        <SegmentedControl.Item
          value="yes"
          label={l`Yes`}
          testID={`${testID}-yes`}>
          <SegmentedControl.ItemText>
            <Trans>Yes</Trans>
          </SegmentedControl.ItemText>
        </SegmentedControl.Item>
        <SegmentedControl.Item value="no" label={l`No`} testID={`${testID}-no`}>
          <SegmentedControl.ItemText>
            <Trans>No</Trans>
          </SegmentedControl.ItemText>
        </SegmentedControl.Item>
      </SegmentedControl.Root>
    </View>
  )
}
