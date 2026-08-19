# Asset licensing

Northsky is a fork of Bluesky's social-app. The upstream project publishes its own asset
notice explaining that its MIT license does not cover every file in its tree: the interface
icons are licensed to Bluesky by a third party, the illustrations are commissioned, and the
marks are trademarks. Bleusky requires you replace all of that with little guidance on how to.

**Our goal is that every asset Northsky ships is one you may redistribute.** Where upstream
had to say "this is not ours to pass on," we would rather replace the asset with something
openly licensed. That work is well underway but not complete; [Section 5](#5-still-to-replace)
contains what is left.

Two rules follow from the goal.

1. **A third-party asset carries its license in its own directory.** If you want to know
what covers a file, look for a license file beside it. That is the whole lookup. We do not want
a forker cross-referencing a central table against a directory listing, because that is the
step people skip.

2. **The Northsky branding is ours, and a fork of Northsky must replace them.** Opening up
everything else does not open up our identity. See [Section 3](#3-northsky-brand-assets).

---

## 1. Third-party assets we ship

Every entry here is redistributable on its own terms. Those terms travel with the files, and
you must keep them there.

| Asset                 | Path                                       | License                  | License file                                     |
| -----------------------| --------------------------------------------| --------------------------| --------------------------------------------------|
| Tabler Icons          | `src/assets/tabler`                        | MIT, (c) Pawel Kuna      | `src/assets/tabler/LICENSE`                      |
| Zendesk Garden icons  | `src/assets/gardenSvg`                     | Apache 2.0               | `src/assets/gardenSvg/LICENSE`                   |
| Inter typeface        | `assets/fonts/inter`                       | SIL OFL 1.1              | `assets/fonts/inter/OFL.txt`                     |
| Geist typeface        | `assets/fonts/geist`                       | SIL OFL 1.1              | `assets/fonts/geist/Geist-OFL.txt`               |
| MuseoModerno typeface | `assets/fonts/museomoderno`                | SIL OFL 1.1              | `assets/fonts/museomoderno/MuseoModerno-OFL.txt` |
| country-flag-icons    | `assets/icons/flags`                       | MIT, (c) @catamphetamine | `assets/icons/flags/README.md`                   |
| Material Icons        | `bskyweb/static/media/MaterialIcons.*.ttf` | Apache 2.0               | `licenses/APACHE-2.0.txt`                        |

Inter, Geist, and MuseoModerno are all under the SIL Open Font License, which includes a
Reserved Font Name provision. If you modify or subset one of these fonts, you may not
distribute the result under its original name. We do ask that you also change the fonts as 
they are part of our branding.

Material Icons is build output rather than a source asset. The Expo toolchain pulls it in and
emits it into the web build, which is why its notice sits in `licenses/APACHE-2.0.txt` and
`NOTICE.md` rather than beside the file.

See `NOTICE.md` for the consolidated attribution text.

## 2. Icons, and the asset map

Upstream's interface glyphs come from a commercial icon system licensed to Bluesky for
Bluesky's own products. We replaced the set.

156 of the 160 modules in `src/components/icons` are now generated from openly licensed
sources: Tabler for almost everything, and Zendesk Garden for the repost mark.

**Use the asset map as your guide when replacing icons.**

`src/features/tablerIcons/mapping.json` maps every exported icon name to the glyph that draws
it. It is the complete inventory of what the interface needs, name by name, which makes it the
right starting point for a swap:

- To change one icon, edit its entry and regenerate.
- To move to a different icon set entirely, the map tells you exactly how many glyphs you need
  and what each one is for.
- The generator refuses to write a module unless the map covers every export that module
  already has, so a swap cannot silently drop an export and break its import sites.

```bash
node scripts/generate-tabler-icons.mjs
npx prettier --write src/components/icons
```

`src/features/tablerIcons/README.md` covers the helpers, stroke weights, vendoring a glyph
that is not yet in the tree, and the known gaps.

## 3. Northsky brand assets

These are our identity. They are not covered by our MIT license, and replacing them is the
first thing to do if you fork Northsky.

- `assets/favicon.png`
- `bskyweb/static/favicon.png`, `bskyweb/static/favicon-16x16.png`, `bskyweb/static/favicon-32x32.png`
- `bskyweb/static/apple-touch-icon.png`
- `bskyweb/static/safari-pinned-tab.svg`
- `bskyweb/static/social-card-default.png`, `bskyweb/static/social-card-default-gradient.png`
- `bskyweb/embedr-static/favicon.png`, `bskyweb/embedr-static/favicon-16x16.png`, `bskyweb/embedr-static/favicon-32x32.png`
- `bskyweb/embedr-static/apple-touch-icon.png`, `bskyweb/embedr-static/safari-pinned-tab.svg`
- `bskyembed/assets/logo.svg`
- Inline vector path data in `src/brand/assets/Logo.tsx` and `src/brand/assets/Logotype.tsx`
- Inline vector path data in `src/view/icons/Logo.tsx` and `src/view/icons/Logotype.tsx`

Brand configuration lives in `src/brand/brand.json`. Re-branding the app is a matter of
changing that file and replacing the assets above, not of editing components. See
`src/brand/README.md`.

You may refer to Northsky by name to describe interoperability or origin. You may not use our
marks as the identity of your own product, or in any way likely to suggest that Northsky
publishes or endorses it.

## 4. Third-party trademarks

These marks belong to other companies and appear in the interface to identify their services.
We neither grant nor withhold permission, because it is not ours to give.

- `assets/icons/community/` - Leaflet, Offprint, pckt, Standard.site, and Germ Network
- Inline vector path data in `src/components/icons/Logo.tsx`, which is still imported by two
  screens, and in the verification badges `src/components/icons/Verified.tsx`,
  `src/components/icons/VerifiedCheck.tsx`, and `src/components/icons/VerifierCheck.tsx`

The verification badges were deliberately left out of the icon conversion: they encode three
distinct trust states that a generic icon set collapses into one rosette. They still need
Northsky artwork.

## 5. Still to replace

These are inherited from upstream and still carry Bluesky's bytes. **Treat everything in this
section as outside our MIT license and not licensed for your use.** We are working through it;
until then, a fork of Northsky needs to replace these for the same reasons a fork of Bluesky
would.

**Commissioned artwork.** `assets/illustrations/` - the landing-screen illustration by Owen D.
Pomery, licensed to Bluesky exclusively. It cannot be sublicensed, so there is no point
approaching the artist. Replace it.

**Product imagery.** `assets/images/` - onboarding art, chat backgrounds, and announcement
graphics. Some of it is commissioned. The line is drawn at the directory rather than file by
file.

**Bluesky marks still in the tree.**

- `assets/app-icons/` - all iOS and Android app icon variants
- `assets/splash/` - splash screens and the splash logomark
- `assets/logo.png`, `assets/default-avatar.png`
- `assets/icon-android-foreground.png`, `assets/icon-android-monochrome.png`, `assets/icon-android-notification.png`
- `assets/icons/starterPack_stroke2_corner0_rounded.svg`, `bskyembed/assets/starterPack.svg`
- `modules/BlueskyClip/Images.xcassets/AppIcon.appiconset/`


**Community artwork.** `assets/kawaii.png` and `assets/kawaii_smol.png`, by
[@sawaratsuki.bsky.social](https://bsky.app/profile/sawaratsuki.bsky.social), and
`assets/icons/custom_logo_japan.svg`, the winning entry from the Bluesky Japan logo contest.
Credited in the app, but not ours to license on.

**Remaining upstream glyphs.** `bskyembed/assets/arrowBottom_stroke2_corner0_rounded.svg`,
`bskyembed/assets/circleInfo_stroke2_corner0_rounded.svg`, and
`bskyembed/assets/play_filled_corner0_rounded.svg` in the embed service are from the licensed
icon system and were not part of the app-side conversion.

---

## If you fork Northsky

1. **Replace the Northsky marks** in [Section 3](#3-northsky-brand-assets) and set your own
   values in `src/brand/brand.json`.
2. **Replace everything in [Section 5](#5-still-to-replace)**, or ship without it. This is the
   part that carries real licensing risk, because none of it is ours to pass on.
3. **Keep the license files** for the third-party assets in [Section 1](#1-third-party-assets-we-ship).
   They must travel with the files.
4. **Check your own position** on the third-party marks in [Section 4](#4-third-party-trademarks).
5. **Swap icons through the asset map**, not by editing generated modules. See
   [Section 2](#2-icons-and-the-asset-map).

## Keeping this document honest

`scripts/check-asset-notices.mjs` verifies that every path named here and in `NOTICE.md` still
exists. A notice that points at a moved or deleted file quietly stops meaning anything, which
is the failure mode that produced the problem in the first place.

```bash
node scripts/check-asset-notices.mjs
```

Run it after moving or deleting an asset. If it fails, update the notice rather than silencing
the check. The upstream CI workflow that runs this on every pull request has not been ported to
this fork yet, so for now it is a manual step.

## Questions

If something in this repository looks like it should be listed here and is not, or you are
unsure whether an asset is covered, open an issue. We would much rather answer the question
than have someone guess.

---

*This document describes the licensing position of assets in this repository. It is not a grant
of rights, and it does not modify the MIT license in `LICENSE` as it applies to source code.*
