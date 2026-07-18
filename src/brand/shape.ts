import {borderRadius} from '@bsky.app/alf/dist/tokens'

/**
 * stadium pills for buttons/chips/inputs,
 * larger corners on surfaces. Only `md`/`lg`/`xl` diverge from upstream
 * (12/16/20 -> 16/20/32); other keys match the package so untouched consumers
 * keep their current radii. Feeds the re-derived `rounded_md/lg/xl` atoms in
 * `#/alf/atoms`.
 */
export const radius = {
  ...borderRadius,
  md: 16,
  lg: 20,
  xl: 32,
} as const
