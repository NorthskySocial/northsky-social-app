# Bluemoji

northsky: custom emoji and stickers via the [Bluemoji](https://moji.blue)
standard (`blue.moji.*` lexicons). Self-contained here; the few edits to upstream
files are marked `// northsky:`.

## What is wired up

| Piece                  | Where                                                     | Upstream touch point                         |
| ---------------------- | --------------------------------------------------------- | -------------------------------------------- |
| Inline rendering       | `BluemojiInline.tsx`                                      | `components/RichText.tsx`                    |
| Facet creation on post | `facets.ts` (`attachBluemojiFacets`)                      | `lib/api/index.ts` (`resolveRT`)             |
| Picker tab (web)       | `pickerData.ts`                                           | `components/EmojiPicker/*`, `Composer.tsx`   |
| Upload UI              | `screens/Settings/BluemojiSettings.tsx`, `upload.ts`      | `routes.ts`, `Navigation.tsx`, `Settings.tsx` |

## Trust model

A `blue.moji.richtext.facet` is written by the poster and never checked by the
PDS, so **nothing is rendered from the facet itself**. `BluemojiInline` looks the
emoji up through `blue.moji.collection.getItem` (the AppView indexes records from
firehose-verified commits) and draws the image, alt text and `adultOnly` flag from
that. Until the lookup resolves, or if it fails or the emoji is gone, the
`:alias:` text shows. Emoji marked `adultOnly` also render as text, since inline
text has no tap-to-reveal.

On the write side, facets are built from the same verified lookup (against the
author's own collection), never from what the user typed.

## Behaviour worth knowing

- **Authoring uses `:alias:` text.** Typing or picking inserts the alias; the
  facet is created at post time. Aliases that do not exist in the author's own
  collection stay plain text. Using another user's emoji means copying it into
  your own collection first (Bluemoji packs), by design.
- **rkey = alias** (RFC 0005). Always go through `aliasToRkey()`; `alias.ts` is a
  copy of the reference implementation and should stay in sync with it.
- **Uploads** are centre-cropped to a square, rendered as PNG (WebP if PNG is over
  the lexicon's blob limit) at 128px, plus 512px if "also a sticker" is ticked.
  Animated images are handled as described under Animation. Uploading refuses to
  overwrite an existing alias.
- **AppView** is `BLUEMOJI_APPVIEW` in `constants.ts`.

## Stickers

- **Attach:** a sticker button in the composer toolbar lists the user's
  sticker-capable emoji (those with a 512px rendition). Choosing one sets the
  post's embed to `blue.moji.embed.sticker`, rebuilt at post time from a fresh
  verified lookup. A sticker cannot be combined with other media or a quote.
- **Render:** Bluesky's AppView does not hydrate embeds it does not know, so
  there is no embed view; `BluemojiSticker` reads the post *record* instead and
  is rendered next to the embed in the feed, thread and post components. The
  embed is self-attested, so only the emoji it names is used: the image and
  adult flag come from the verified record, which must match the embed's strong
  ref. Failures show the `:name:` text.

## Animation

Animated GIF, APNG and WebP uploads keep their original file when it fits the
blob limit (the image manipulator can only flatten them), plus a still. Larger
animations are saved as stills and the user is told. Renderers prefer the
animated rendition, and the still when reduce motion or autoplay-off is set.
Lottie is not rendered.

## Adult-only emoji

Moderation has a Show/Hide row (default Hide) stored on the device. It only
takes effect with adult content enabled, so it cannot loosen existing settings.

## Composer

The web editor shows an emoji as an image while you write (`editor/`). A
`BluemojiNode` is an inline atom that serialises to its `:alias:` text, so posting
is unchanged. Typing `:` plus a non-space character opens a completion popup
(your emoji first, then Unicode); finishing a `:alias:` that is in your collection
swaps it for the image. The collection is loaded once and filtered locally, so
completion does not hit the network per keystroke.

## Load on the AppView

Every lookup (`getItem`) is a request to moji.blue, so the client is deliberately
frugal, but the larger lever is the edge:

- **Client:** found items are trusted for 2h (in memory), misses for 5m,
  concurrent requests are capped at 6, and a circuit breaker stops sending after
  repeated failures for 30s (`requestGate.ts`). Emoji fall back to `:alias:` text
  meanwhile.
- **Edge (Cloudflare, not in this repo):** `/img/*` is already cached. The XRPC
  reads are `cf-cache-status: DYNAMIC` with no `Cache-Control`, so each one reaches
  the origin. Add a Cache Rule for
  `/xrpc/blue.moji.collection.getItem` (and `getPack`, `getPacks`,
  `listCollection` if wanted): eligible for cache, Edge TTL 1h, Browser TTL 5-10m,
  cache key includes the query string. This also gives repeat page loads a
  browser-cache hit without any client code. Purge by URL on a takedown.

## Not done yet

- Reactions UI.
- Drafts: stickers and Bluemoji facets are not saved with drafts.
- DMs do not create Bluemoji facets.
- Resizing animations on device (needs a transcoder; the AppView's
  `transcodeAnimation` requires a moji.blue login this app does not have).
