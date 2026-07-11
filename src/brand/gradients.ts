/**
 * Northsky brand gradients.
 *
 * Same shape and keys as upstream's `gradients` in `@bsky.app/alf` /
 * `src/alf/tokens.ts` (each entry is `{values: [pos, hex][], hover_value}`), so
 * the consumers (`components/icons/common.tsx`, `components/GradientFill.tsx`,
 * `components/LinearGradientBackground.tsx`, `VerificationReminder.tsx`) need no
 * changes. Colors are the Northsky spectrum: the signature magenta->mint
 * (`primary`) plus a family of brand-tinted variants.
 *
 * `as const` preserves the narrow tuple types the consumers cast against.
 */
export const gradients = {
  primary: {
    values: [
      [0, '#BB0FFB'],
      [0.35, '#9F3DEF'],
      [0.65, '#718ADA'],
      [1, '#2AFFBA'],
    ],
    hover_value: '#8A5FE5',
  },
  sky: {
    values: [
      [0, '#7780DC'],
      [1, '#2AFFBA'],
    ],
    hover_value: '#53BCCC',
  },
  midnight: {
    values: [
      [0, '#1F0B35'],
      [1, '#7780DC'],
    ],
    hover_value: '#2B1548',
  },
  sunrise: {
    values: [
      [0, '#53BCCC'],
      [0.4, '#718ADA'],
      [0.8, '#9F3DEF'],
      [1, '#C400FF'],
    ],
    hover_value: '#718ADA',
  },
  sunset: {
    values: [
      [0, '#3E1960'],
      [0.6, '#8A5FE5'],
      [1, '#C400FF'],
    ],
    hover_value: '#8A5FE5',
  },
  summer: {
    values: [
      [0, '#9A45EC'],
      [0.3, '#BB0FFB'],
      [1, '#EC4899'],
    ],
    hover_value: '#BB0FFB',
  },
  nordic: {
    values: [
      [0, '#1F0B35'],
      [1, '#2AFFBA'],
    ],
    hover_value: '#258578',
  },
  bonfire: {
    values: [
      [0, '#2B1548'],
      [0.4, '#6B2FA4'],
      [0.8, '#B272F1'],
      [1, '#DFC3F9'],
    ],
    hover_value: '#6B2FA4',
  },
} as const
