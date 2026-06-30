import identity from './brand.json'

/**
 * Northsky brand configuration. This is the single source of truth for all
 * brand-specific identity, service, and feed values, so the surrounding
 * upstream files stay as close to `bluesky-social/social-app` as possible and
 * upstream merges stay cheap. See `src/brand/README.md`.
 *
 * Identity values live in `brand.json` because `app.config.js` (CommonJS) reads
 * them via `require` without a TS/ESM interop step. Runtime values are declared
 * here `as const` so consumers that depend on their literal types keep working
 * (e.g. `typeof BSKY_SERVICE` in upstream's ServerInput dialog).
 */
export const BRAND = {
  ...identity,
  baseUrl: 'https://northsky.app',
  downloadUrl: 'https://northsky.app/download',
  pdsServiceUrl: 'https://northsky.social',
  publicAppViewUrl: 'https://api.blacksky.community',
  publicAppViewDid: 'did:web:api.blacksky.community',
  embedServiceUrl: 'https://embed.northsky.app',
  discoverFeedUri:
    'at://did:plc:23cnpffmuf4vkpsnwhgyvljw/app.bsky.feed.generator/NorthskySocial',
  slingshotServiceUrl: 'https://slingshot.microcosm.blue',
  constellationServiceUrl: 'https://constellation.microcosm.blue',
} as const

export type BrandConfig = typeof BRAND
