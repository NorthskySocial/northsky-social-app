# tablerIcons

Renders [Tabler](https://tabler.io/icons) icons with the app's existing icon
props. 156 of the 160 modules in `src/components/icons` are generated from
Tabler SVG source. The four that are not are the brand mark and the three
verification badges, which carry product meaning Tabler cannot express.

## Why a new helper

The upstream helpers in `src/components/icons/TEMPLATE.tsx` cannot render a
Tabler outline icon:

| Helper                   | Paths | Stroke | Fill rule |
| ------------------------ | ----- | ------ | --------- |
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
npx prettier --write src/components/icons
```

The SVGs under `src/assets/tabler/{outline,filled}` are the source of truth, so
a regeneration needs no external checkout. Only the icons the mapping names are
vendored, along with Tabler's MIT licence.

When the mapping starts naming an icon that is not vendored yet, point the
generator at a [tabler/tabler-icons](https://github.com/tabler/tabler-icons)
checkout once and it copies the file in:

```bash
TABLER_ICONS_PATH=/path/to/tabler-icons node scripts/generate-tabler-icons.mjs
```

`mapping.json` is the source of truth: it maps each export name to a Tabler
outline icon, with an optional stroke width. The generator refuses to write a
module unless the mapping covers every export that module currently has, so a
conversion cannot silently drop an export and break its import sites. The tests
pin the same agreement in the committed tree.

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
