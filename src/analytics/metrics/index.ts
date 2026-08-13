import {MetricsClient} from '#/analytics/metrics/client'
import {type Events} from '#/analytics/metrics/types'
import {TELEMETRY_ENABLED} from '#/features/telemetry'

export type {Events as Metrics} from '#/analytics/metrics/types'
export * from '#/analytics/metrics/utils'
// northsky: see `src/features/telemetry` for why the client is off
export const metrics = new MetricsClient<Events>({enabled: TELEMETRY_ENABLED})
