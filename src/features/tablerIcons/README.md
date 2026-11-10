# tablerIcons

Renders [Tabler](https://tabler.io/icons), [Garden](https://github.com/zendeskgarden/svg-icons) and [Streamline](https://streamlinehq.com) icons with the app's existing icon
props. For contributors updating icons, `mapping.json` inventories the 180
generated modules, including compatibility exports and notification glyphs.
Unmapped upstream modules still require a licensing audit; brand marks and
verification badges deliberately retain their distinct product meaning.

## Why a new helper

The upstream helpers in `src/components/icons/TEMPLATE.tsx` cannot render an outline icon:

| Helper                   | Paths | Stroke | Fill rule |
| --------------------------| -------| --------| -----------|
| `createSinglePathSVG`    | 1     | yes    | evenodd   |
| `createMultiPathSVG`     | many  | no     | evenodd   |
| `createTablerIcon`       | many  | yes    | -         |
| `createTablerFilledIcon` | many  | no     | nonzero   |

Tabler filled icons declare no fill rule, so they assume the SVG default of
`nonzero`. `createMultiPathSVG` forces `evenodd`, which turns an overlapping
subpath into a hole, so filled icons need their own helper too.

Both helpers accept a `rotate` option. Tabler ships one glyph where the app has
a mirrored pair: the opening quote is the closing quote turned through 180
degrees, and Tabler has only the closing form.

`createTablerIcon` takes its stroke on a 24 unit canvas and scales it by the
glyph's view box, so a source that draws on a larger canvas renders at the same
line weight as the rest. An outline icon's module therefore always declares its
source `strokeWidth` alongside any non-standard `viewBox`, and the helper
repeats neither the source's name nor its size.

Weight and size are separate knobs. Icon sets also disagree about how much of
their canvas the artwork fills: Tabler leaves an eighth of it free, Streamline
draws to the edge. A glyph that reads larger than its neighbours sets a
`scale`, which changes only its footprint, so shrinking a heavy glyph does not
thin its line. `svgStrokeWidth` reports the weight before that scale, as it
does for every other icon; the rendered width is `svgStrokeWidth * scale`.

Line width on the canvas is not the same as weight to the eye. A glyph built
from a few long strokes covers far less ink than a busy one at the same width,
and it reads thin beside icons that carry more detail. `density` corrects for
that: the ink the glyph carries relative to the set's average, where less than
1 widens the stroke by `1 / sqrt(density)`. Measure it by rendering the glyph
and its neighbours at the same size and comparing their total ink coverage; two
glyphs with equal coverage carry equal weight.

Bluesky icons are fill-based: one path, `fillRule="evenodd"`, no stroke. Tabler
outline icons are stroke-based, and most have 2 or more paths. Both properties
are needed at once.

`createTablerIcon` lives here rather than in `TEMPLATE.tsx` because
`TEMPLATE.tsx` is an upstream file. An additive file adds no merge conflict
surface. See the fork rules in `AGENTS.md`.

## Contract

`createTablerIcon` takes the same props and sets the same `svgPaths`,
`svgViewBox` and `svgStrokeWidth` metadata as the upstream helpers, so a
generated icon is a drop-in replacement at every call site. No call site
changed during the conversion.

One inversion matters: `useCommonSVGProps` resolves the icon color into `fill`.
A stroke icon applies that color to `stroke` and sets `fill="none"`.

## Stroke width

`DEFAULT_STROKE_WIDTH` is 1.75. Tabler draws at 2, which reads heavy at 16px,
the size most of the app's icons render at.

A call site can pass `strokeWidth` to override it. The feed's post controls do:
they render at 18px, where the default reads thin, so they ask for
`FEED_ICON_STROKE_WIDTH`.

The generator only writes a `strokeWidth` into a module when that icon needs a
non-default weight, so changing `DEFAULT_STROKE_WIDTH` restyles every generated
icon at once. No regeneration is needed.

Two weights are pinned per-icon:

- `_Stroke1_` exports draw at 1.25, preserving the lighter variant the app had.
- `CheckThick` draws at 2.5, preserving its contrast against `Check`.

## Regenerating

```bash
node scripts/generate-tabler-icons.mjs
node scripts/icons/generate.mts --check
```

The SVGs under `src/assets/tabler/{outline,filled}` are the source of truth, so
a regeneration needs no external checkout. Only the icons the mapping names are
vendored, along with Tabler's MIT licence.

A Streamline glyph is copied in by hand from a
[streamline-vectors](https://github.com/webalys-hq/streamline-vectors) checkout,
under `src/assets/streamline/outline/<name>.svg`. The generator only vendors
Tabler files by itself.

When the mapping starts naming a Tabler icon that is not vendored yet, point the
generator at a [tabler/tabler-icons](https://github.com/tabler/tabler-icons)
checkout once and it copies the file in:

```bash
TABLER_ICONS_PATH=/path/to/tabler-icons node scripts/generate-tabler-icons.mjs
```

`mapping.json` is the source of truth: it maps each export name to an icon, with
an optional stroke width. The generator refuses to write a module unless the
mapping covers every export that module currently has, so a conversion cannot
silently drop an export and break its import sites. The tests pin the same
agreement in the committed tree.

## Icon sets

Each mapping entry names its glyph under the key of the set it comes from:

| Key          | Assets                    | Licence    |
| ------------ | ------------------------- | ---------- |
| `tabler`     | `src/assets/tabler`       | MIT        |
| `garden`     | `src/assets/gardenSvg`    | Apache 2.0 |
| `streamline` | `src/assets/streamline`   | CC BY 4.0  |

Garden is simply another icon set. It supplies the repost mark, which Tabler has
no equivalent for.

Streamline supplies the Bluemoji sticker mark. Its mapping entry sets a `scale`
that lands it on the same footprint as the photo mark beside it, and a `density`
of 0.5, because its long rounded outline carries much less ink than the icons it
sits next to and reads light without one. CC BY 4.0 requires attribution,
so its `LICENSE.md` must travel with any glyph copied from
`src/assets/streamline`. A Streamline export paints its stroke black; change it
to `currentColor` in the vendored file, because the generator refuses to emit a
glyph that cannot inherit the icon colour.

Streamline also supplies `EditImagePhoto`, which marks "choose an image". Tabler
draws that scene with a dot where the small image is, which disappears at the
16px most buttons use, so the glyph comes from a set that draws it larger. Its
canvas is 14 units, where `SOURCE_CANVAS` assumes 48: the mapping entry declares
`strokeWidth: 1` to keep the line at the source weight and a `scale` of 1.05 to
bring the artwork out to Tabler's footprint.

Set a `density` where a glyph must read as heavy as its neighbours, and only
there. The generated tree leaves it unset so every icon draws at the default
stroke; `DEFAULT_STROKE_WIDTH` is the single knob. The usual reason to set one
is an icon-only button, whose glyph has no text beside it to carry weight: the
Bluemoji sticker and choose-image buttons are the cases so far.

Garden draws on a 12 unit view box where Tabler draws on 24, so the generator
reads the view box out of each SVG and writes it into the module whenever it
differs from Tabler's. Garden's stroke-styled icons are drawn as fills, so they
map to `createTablerFilledIcon` and ignore any stroke width.

## What is not converted

Four modules stay upstream because they carry product meaning that the nearest
Tabler glyph loses: `Logo` (the brand mark) and the three verification badges
`Verified`, `VerifiedCheck` and `VerifierCheck`. The badges encode three
distinct trust states, and Tabler has one rosette.

## Known gaps

Seven exports named `Filled` render an outline glyph, because Tabler has no
filled twin for them: `Bot`, `CircleAndSquare`, `Contacts`, `Hashtag`,
`PersonPlus`, `Reply` and `UserCircle`. Those icons therefore look the same in
their active and inactive states.

The upstream `icons:generate` entrypoint delegates to this generator. It does not
write commercial SVG modules or regenerate nano fonts over mapped SVG icons.
