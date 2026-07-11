import {borderRadius} from '@bsky.app/alf/dist/tokens'

/**
 * Northsky pill shape language.
 *
 * The brand leans on generous rounding: stadium pills (999) for buttons,
 * chips, inputs and toasts, plus larger corner radii on surfaces (16px list
 * items, 20px dropdowns, 32px cards and dialogs). These `radius` values shadow
 * the upstream `borderRadius` token via `#/alf/tokens` and feed the re-derived
 * `rounded_md/lg/xl` atoms in `#/alf/atoms`.
 *
 * Only `md`, `lg` and `xl` diverge from upstream (12/16/20 -> 16/20/32);
 * `_2xs`, `xs`, `sm` and `full` match the package so untouched consumers keep
 * their current radii. Shape and keys mirror `@bsky.app/alf`'s `borderRadius`
 * so the re-export stays type-compatible.
 */
export const radius = {
  ...borderRadius,
  // northsky: only md/lg/xl diverge from upstream (12/16/20 -> 16/20/32)
  md: 16,
  lg: 20,
  xl: 32,
} as const
