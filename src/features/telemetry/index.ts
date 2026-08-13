/**
 * Master switch for the telemetry that this fork gets from upstream. Northsky
 * does not operate the Bluesky metrics or feature gate backends, so the switch
 * stays `false` until Northsky operates its own collector.
 *
 * The switch controls two pipelines:
 *
 * - the metrics client in `src/analytics/metrics`, which sends event batches
 * - the GrowthBook feature gate fetches in `src/analytics/features`
 *
 * While the switch is `false`, the app fetches no gate definitions. Each
 * feature gate then gives the default value that the caller supplies.
 *
 * Sentry and Bitdrift are not part of this switch. Both stay off while
 * `EXPO_PUBLIC_SENTRY_DSN` and `EXPO_PUBLIC_BITDRIFT_API_KEY` are empty.
 *
 * To send telemetry again, set this to `true`. Then point
 * `EXPO_PUBLIC_METRICS_API_HOST` and the `EXPO_PUBLIC_GROWTHBOOK_*` values at
 * Northsky services.
 */
export const TELEMETRY_ENABLED = false
