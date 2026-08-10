export {AgeConfirmationFields} from '#/features/ageConfirmation/AgeConfirmationFields'
export {AgeConfirmationScreen} from '#/features/ageConfirmation/AgeConfirmationScreen'
export {AppPasswordNoticeScreen} from '#/features/ageConfirmation/AppPasswordNoticeScreen'
export {
  type AgeConfirmationGate,
  resolveAgeConfirmationGate,
  useAgeConfirmationGate,
} from '#/features/ageConfirmation/gate'
export {
  type AgeConfirmation,
  EMPTY_AGE_CONFIRMATION,
} from '#/features/ageConfirmation/types'
export {
  ADULT_AGE,
  birthdateFromAgeConfirmation,
  isAgeConfirmationComplete,
} from '#/features/ageConfirmation/util'
