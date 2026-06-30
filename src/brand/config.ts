import brand from './brand.json'

/**
 * Northsky brand configuration. This is the single source of truth for all
 * brand-specific identity, service, and feed values. The primitive values live
 * in `brand.json` so they can also be consumed by `app.config.js` (CommonJS,
 * via `require`) without a TS/ESM interop step.
 *
 * Anything brand-specific belongs here so that the surrounding upstream files
 * stay as close to `bluesky-social/social-app` as possible, keeping upstream
 * merges cheap. See `src/brand/README.md`.
 */
export type BrandConfig = typeof brand

export const BRAND: BrandConfig = brand
