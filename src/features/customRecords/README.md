# Custom records

northsky: extension point for rendering custom AT Protocol lexicons that
upstream social-app does not know about.

## How it works

- `registry.ts` holds a `$type -> renderer` map (`registerCustomRecord`,
  `getCustomRecordRenderer`).
- `CustomRecordRenderer` takes a raw embed, reads its `$type`, and renders the
  registered component (or nothing).
- The embed router (`src/components/Post/Embed/index.tsx`) calls
  `CustomRecordRenderer` from its `default` case - the branch that handles
  embeds upstream classifies as `unknown`. Known `app.bsky.*` embeds are
  untouched, so this is purely additive.

## Adding a custom lexicon renderer

Create a new file in this directory that defines a renderer and registers it.
No edit to the upstream embed pipeline is needed.

```tsx
import {registerCustomRecord} from '#/features/customRecords/registry'

function WidgetEmbed({record}: {record: Record<string, unknown>}) {
  // render your custom lexicon
  return null
}

registerCustomRecord('com.example.widget', WidgetEmbed)
```

Import that file once during app startup so the registration runs (e.g. from an
index module that the app already imports).

## Status

The registry and wiring exist and are unit-tested. No custom lexicons are
registered yet - this is the scaffolding for future ones.
