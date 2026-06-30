import {type ComponentType} from 'react'

/**
 * northsky: extension point for rendering custom AT Protocol lexicons.
 *
 * Upstream social-app only knows how to render the `app.bsky.*` record and
 * embed types. When we introduce our own lexicons, register a renderer here
 * keyed by the record's `$type`. The embed router consults this registry for
 * embeds it does not otherwise recognize and falls back to nothing when no
 * renderer is registered, so this never changes upstream behavior for known
 * types.
 *
 * Registering is additive: a new lexicon means a new file under
 * `src/features/customRecords/` that calls `registerCustomRecord`, with no edit
 * to the upstream embed pipeline.
 */
export type CustomRecordRendererProps = {
  /** The raw record/embed value, including its `$type`. */
  record: Record<string, unknown>
}

const registry = new Map<string, ComponentType<CustomRecordRendererProps>>()

/** Register a renderer for a custom record/embed `$type`. */
export function registerCustomRecord(
  $type: string,
  component: ComponentType<CustomRecordRendererProps>,
): void {
  registry.set($type, component)
}

/** Look up the renderer registered for a `$type`, if any. */
export function getCustomRecordRenderer(
  $type: string,
): ComponentType<CustomRecordRendererProps> | undefined {
  return registry.get($type)
}

/** Visible for testing: reset the registry between tests. */
export function _resetCustomRecords(): void {
  registry.clear()
}
