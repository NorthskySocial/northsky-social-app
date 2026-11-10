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

- **Adult-only emoji** follow the same setting as everywhere else (Moderation,
  and adult content on): hidden ones are left out of completions, a finished
  `:alias:` stays as text, and if the setting is switched off while the composer
  is open, any already in the draft go back to their text.
- **Escape** closes the completion popup first (it is part of the composer's
  popup-first cancellation, so a second Escape is what offers to discard the
  draft). It stays closed for the same query and returns when the query changes.
- **Fresh after a write.** The collection index is invalidated by uploads and
  edits (now, and again after the AppView has indexed them), and the open
  composer reloads it, so a just-added emoji works without reopening.

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

## Packs

A pack (`blue.moji.packs.pack`) is a named group of emoji; membership is a
separate `packitem` record per emoji in the owner's repo. Code is in `packs/`;
screens are `screens/Settings/BluemojiPack.tsx` and the Packs section of Settings
> Bluemoji.

- **Reading** goes through the AppView (`getPack`, `getActorPacks`), so a pack
  shows verified emoji. A write is learned of from the firehose, so a read right
  after one can lag: queries are re-run after a short delay, and a just-created
  pack is polled for rather than shown as missing.
- **Create / edit / delete:** edit is read-modify-write, pinned to the CID it read
  so a concurrent edit is refused, and unknown fields survive. Delete removes the
  pack's `packitem` records and then the pack, and asks first. `applyWrites` is
  capped at 100 writes here, so a large pack is several commits: memberships
  first, the pack last. A pack small enough for one call is deleted atomically;
  for a bigger one a failure partway leaves the pack in place with some
  memberships gone, and deleting again finishes it. It never leaves memberships
  pointing at a missing pack.
- **Add your emoji to a pack:** "Add to pack" on any emoji in your collection, or
  "Add emoji" inside one of your packs (multi-select). Memberships are written in
  `applyWrites` batches (atomic per batch) after checking the whole pack, not just
  the loaded page, so nothing is added twice. If a later batch fails, the ones that
  went in are dropped from the selection so a retry does not duplicate them.
- **Install:** one emoji, with a rename field first (the alias is the record key),
  or the whole pack. Installing copies the bytes into your repo and records
  `copyOf`, so it survives the source account going away. `saveToCollection` on
  the AppView is not used: it needs a moji.blue login this app does not have.
  "Add all" skips aliases you already have (never overwrites) and reports them, so
  they can be added one at a time under a new name.
- **Share:** copy link (the moji.blue pack page, which works without this app) or
  start a post containing it.
- **Not done:** pack icons, and pack-level adult labels (items are still gated
  individually by the adult-only emoji preference).

## Icons

Buttons in the Bluemoji screens carry a glyph as well as their label, so the
screens read without latching onto text. Two of them are Bluemoji's own:
`StickerOutline` in `components/icons/Sticker.tsx` marks an emoji pack (Tabler's
`sticker`, distinct from the Streamline `Sticker` on the composer's sticker
button) and `EditImagePhoto` marks "choose an image". Both were added for these
screens and are recorded in `features/tablerIcons/mapping.json`, which is where
an icon's source set and weight are decided; see that README before adding
another. Everything else reuses an icon the app already ships: `Album` for the
collection, `Apps` for packs, plus `Plus`, `Pencil`, `Trash`, `Copy` and
`SquareArrowTopRight`.

## License and source (RFC 0006)

Items and packs can carry an optional SPDX `license` and a `source` URL. Both are
the owner's own claim and unverified. `provenance.ts` is a copy of the Bluemoji
reference implementation (keep it in sync).

- **Write:** the upload form and pack form take both (one-tap common licenses, or
  any SPDX expression). Values are validated and normalised before anything is
  uploaded.
- **Read:** every value is re-validated before it is shown (`ProvenanceLine`), so
  a `javascript:` source or junk license from a hostile record never becomes a
  link.
- **Copying needs a grant.** Installing an emoji from a pack is refused unless it
  has a license that allows copying: no license is not permission, and
  `LicenseRef-All-Rights-Reserved` withholds it. The copy keeps the license and
  source it was shared under. This is a courtesy gate, not enforcement.
- **Consequence:** emoji uploaded before this existed have no license, so others
  cannot copy them until the owner adds one (see Editing below).

## Editing

Settings > Bluemoji > Your collection > Edit changes an emoji's description,
adult flag, license and source (`edit.ts`). The name is the record key and the
images are what old posts show, so neither can be changed; add a new emoji
instead. Delete asks twice.

- **Only what changed is written.** The form is compared with the version it was
  opened on (`diffItemChanges`) and only the differing fields are sent, so a
  field you never touched is not overwritten with a stale value.
- **Stale forms are refused.** The form remembers the record CID it was opened on.
  The save reads the record again and refuses if the CID moved (an edit on another
  device while the form was open), and the write itself is pinned to what was just
  read. Blobs and unknown fields are preserved. After a save the cached CID is
  updated, so editing the same emoji twice in a row is not refused.
- **Old sticker posts survive an edit.** Any edit changes the record's CID, so a
  sticker embed cannot be verified by that CID. It is verified by its art instead:
  the embed's rendition CIDs must still be among the emoji's own
  (`stickerMatchesItem`), and its strong ref must still point at the same record.
  Editing metadata keeps old posts rendering; replacing the art under an old post
  does not.
- The AppView learns of the write from the firehose a moment later, so the list is
  patched immediately and refetched after a few seconds.

## Not done yet

- Reactions UI.
- Drafts: stickers and Bluemoji facets are not saved with drafts.
- DMs do not create Bluemoji facets.
- Resizing animations on device (needs a transcoder; the AppView's
  `transcodeAnimation` requires a moji.blue login this app does not have).
