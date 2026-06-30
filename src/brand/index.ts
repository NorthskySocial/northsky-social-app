/**
 * Single import surface for Northsky brand customization.
 *
 * Prefer importing from `#/brand` in feature code. `constants.ts` and other
 * very-early modules import directly from `#/brand/config` to avoid pulling in
 * the theme (which depends on ALF) before it is needed.
 */
export {BRAND, type BrandConfig} from './config'
