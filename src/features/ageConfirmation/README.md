# Age confirmation

Replaces the date-of-birth input with two Yes/No questions:

1. Are you `MIN_ACCESS_AGE` years of age or older?
2. Are you of legal adult age in the country or state where you live?

The second question appears only after a Yes to the first, so the two answers
cannot contradict each other.

This feature is active only when `ageAssurance.adultAgeGateEnabled` is `true`
in `src/brand/brand.json`. When the gate is off, nothing reads the declared
age, so the app keeps the upstream date field and asks nothing extra.

## Why a synthetic birthdate

The app cannot store a boolean age declaration. `DeclaredAgePref`
(`isOverAge13` / `isOverAge16` / `isOverAge18`) in `@atproto/api` is read-only,
and the PDS derives it from the birthdate that `setPersonalDetails` writes.

So `birthdateFromAgeConfirmation` turns the answers into a birthdate:

| Answers | Stored age |
| --- | --- |
| Legal adult | 18 |
| Over the minimum age, not an adult | 13 |
| Under the minimum age | 12 |

Every consumer of `metadata.declaredAge` keeps working without a change, and
the PDS derives the `isOverAge*` flags for free. The under-age value of 12 is
deliberate: it makes the existing signup checks block the account, so signup
needs no separate rule for that answer.

## Where the questions appear

| Surface | Behavior |
| --- | --- |
| Signup, `src/screens/Signup/StepInfo/` | Replaces the date field. The answers set `state.dateOfBirth`, so all existing validation and `createAccount` are untouched. |
| First sign-in, `AgeConfirmationScreen` | Blocks the app when an account has no declared age. Accounts created in this app already answered at signup and never see it. |
| Settings, account, birthdate | Unchanged. The date picker stays, so a person can still correct an exact age. |

## The gate

`gate.ts` decides which screen the shell shows. `resolveAgeConfirmationGate` is
pure and holds every rule, so the decision is tested without rendering. The
`useAgeConfirmationGate` hook reads the inputs and both shells call it in
`Shell()`, next to the age assurance `NoAccessScreen` check.

| Result | Meaning |
| --- | --- |
| `none` | The account reaches the router. |
| `confirm` | `AgeConfirmationScreen` blocks until the answers save. |
| `appPasswordNotice` | `AppPasswordNoticeScreen` blocks until the person accepts the limits. |

Three rules are worth knowing:

- **A declared age from another service counts.** The read behind the gate
  (`getOtherRequiredData` in `src/ageAssurance/data.tsx`) turns the
  `isOverAge13/16/18` flags a PDS derives into a birthdate, so an account that
  declared an age elsewhere passes straight through and is never asked.
- **A failed or pending read opens the gate.** Blocking on a network error would
  lock an account out of the app. The failure is logged at warn and the next
  successful read applies the gate.
- **App Password sessions cannot answer.** `setPersonalDetails` rejects them, so
  they get a notice that states the limits (adult content hidden, group chat
  invites off) with a choice to continue or sign out. The acceptance is stored
  per account in `ageConfirmationNoticeAckAt`, so it is asked once.

## Known limit

A person who answers "over the minimum age" but "not an adult" is stored as
13. In a region whose `minAccessAge` is above 13, the age assurance rules then
read them as under that regional minimum, even if they are 17. This does not
apply while age assurance is off, because the fallback region config uses
`MIN_ACCESS_AGE`. Add a third question if a region above 13 is ever needed.
