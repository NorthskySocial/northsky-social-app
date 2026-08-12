/**
 * Native builds carry the donation config in the bundle. Only the web server can
 * inject it at run time.
 */
export function getRuntimeDonationsConfig(): string | undefined {
  return undefined
}
