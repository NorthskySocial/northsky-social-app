/*
 * northsky: brand constants for the embed widget.
 *
 * bskyembed is a separate pnpm workspace and cannot import `#/brand`. Keep
 * these values in sync with `src/brand/brand.json` and `src/brand/config.ts`
 * by hand; bskyembed has no test runner to guard against drift.
 */
export const BRAND = {
  /** `baseUrl` from src/brand/brand.json */
  baseUrl: 'https://northsky.app',
  /** `embedServiceUrl` from src/brand/config.ts */
  embedServiceUrl: 'https://embed.northsky.app',
  /** `publicAppViewUrl` from src/brand/config.ts */
  publicAppViewUrl: 'https://api.blacksky.community',
} as const
