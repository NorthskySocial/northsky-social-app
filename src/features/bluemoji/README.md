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
  Animated images are flattened to a still for now. Uploading refuses to overwrite
  an existing alias.
- **AppView** is `BLUEMOJI_APPVIEW` in `constants.ts`.

## Not done yet

- Sticker embed rendering (`blue.moji.embed.sticker`) and attaching one in the
  composer. Stickers can be uploaded but not yet posted.
- Reactions UI.
- A picker for native. Upstream has no native emoji picker (the keyboard is used),
  so there was nothing to add a tab to; `:alias:` typed by hand still works.
- Animated emoji (APNG/Lottie/GIF renditions).
- Drafts and DMs do not create Bluemoji facets.
