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
  downloadUrl: 'https://northsky.app/download',
  pdsServiceUrl: 'https://northsky.social',
  publicAppViewUrl: 'https://api.blacksky.community',
  publicAppViewDid: 'did:web:api.blacksky.community',
  helpUrl: 'https://tally.so/r/yPN6k6',
  feedbackUrl:
    'https://userinput.app/#/s/did:plc:23cnpffmuf4vkpsnwhgyvljw/3mrrtpve7ab2f',
  privacyPolicyUrl: 'https://northskysocial.com/posts/privacy-policy',
  termsOfServiceUrl: 'https://northskysocial.com/posts/terms-of-service',
  copyrightPolicyUrl: 'https://bsky.social/about/support/copyright',
  communityGuidelinesUrl:
    'https://northskysocial.com/posts/community-guidelines',
  supportPageUrl: 'https://tally.so/r/yPN6k6',
  nciiReportFormUrl: 'https://forms.bsky.app/f/ncii',
  aboutUrl: 'https://northskysocial.com/posts/about',
  blogUrl: 'https://northskysocial.com/profile/posts',
  supportUsUrl: 'https://northskysocial.com/profile/products',
  discoverFeedUri:
    'at://did:plc:23cnpffmuf4vkpsnwhgyvljw/app.bsky.feed.generator/NorthskySocial',
  slingshotServiceUrl: 'https://slingshot.microcosm.blue',
  constellationServiceUrl: 'https://constellation.microcosm.blue',
  /*
   * Actor typeahead for appviews that cannot serve it. This third-party
   * service publishes no privacy policy, names no operator, and calls itself
   * experimental. It sees which accounts users look for, including the
   * accounts logged-out visitors look for. To stop all use of it, remove
   * `useFallbackTypeahead` from the appviews in `./appview.ts`.
   */
  typeaheadServiceUrl: 'https://typeahead.waow.tech',
} as const

export type BrandConfig = typeof BRAND
