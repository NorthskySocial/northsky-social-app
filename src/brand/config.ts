import identity from './brand.json'

/**
 * Single source of truth for brand identity, service, and feed values. See
 * `src/brand/README.md`. Identity lives in `brand.json` since `app.config.js`
 * (CommonJS) needs it via `require`; runtime values are `as const` here so
 * consumers relying on literal types keep working (e.g. upstream's
 * ServerInput dialog).
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
