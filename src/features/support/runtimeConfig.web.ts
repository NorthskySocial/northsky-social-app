declare global {
  // eslint-disable-next-line no-var
  var __NORTHSKY_DONATIONS__: string | undefined
}

/**
 * bskyweb writes the donation config into the document, so a deployment can
 * change it without a new bundle. See `bskyweb/templates/base.html`.
 */
export function getRuntimeDonationsConfig(): string | undefined {
  return globalThis.__NORTHSKY_DONATIONS__
}
