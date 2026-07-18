import {tokens} from '@bsky.app/alf'

/*
 * northsky: the local `borderRadius` export at the bottom intentionally shadows
 * the package's star-exported one. ES module semantics resolve an explicit
 * local export over `export *` (verified through Babel/CommonJS for native and
 * webpack harmony modules for web, and by tsgo), so `tokens.borderRadius`
 * returns the brand pill radii. The `import-x/export` lint rule cannot model
 * this and flags the duplicate name on both export sites, so it is disabled for
 * this block.
 */
/* eslint-disable import-x/export */
export * from '@bsky.app/alf/dist/tokens'

export const color = {
  temp_purple: tokens.labelerColor.purple,
  temp_purple_dark: tokens.labelerColor.purple_dark,
} as const

export {gradients} from '#/brand/gradients' // northsky: brand gradients
// northsky: brand pill radii
export {radius as borderRadius} from '#/brand/shape'
/* eslint-enable import-x/export */
