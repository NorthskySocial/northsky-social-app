# Asset licensing

<<<<<<< HEAD
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
=======
The [MIT license](./LICENSE) in this repository covers our source code. It does not cover every file in the tree.

Some of the images, icons, fonts, and brand assets here are licensed to Bluesky Social PBC by third parties, or are our trademarks, or are third-party trademarks. We cannot pass those rights on to you. This document identifies them and names who holds them.

## This is not a license change

The MIT license on our source code is unchanged. This document records rights that Bluesky never held, and therefore could never have granted you.

We updated this file in August 2026 so the repository no longer carries a blanket MIT license with no asset carve-out and forking guidelines that ignored commissioned artwork.

For the assets Bluesky itself owns, we are not treating anyone's past use as bad faith. For the rest we are not the rights holder. The tables below name them. If you have shipped one of these in a fork, the [If you are forking](#if-you-are-forking) checklist is the shortest path to a clean position.

## Summary

| Where | Rights holder | Our MIT license covers it? | If you fork |
|---|---|---|---|
| [`assets/illustrations/`](#1-commissioned-artwork--licensed-to-bluesky-only) | Owen D. Pomery, via Brilliant Artists Ltd | No | Replace |
| [`assets/icons/`](#2-licensed-icon-system--not-ours-to-pass-on) (top level), Central icon glyphs in `bskyembed/assets/` except the Starter Pack mark | Iconists (David & Storm GbR) | No | Source your own |
| [Bluesky marks](#3-bluesky-trademarks-and-brand-assets) — app icons, logos, favicons | Bluesky Social PBC | No | Replace |
| [`assets/kawaii.png`, `assets/kawaii_smol.png`](#4-community-and-contest-artwork--credited-but-not-ours-to-license) | [@sawaratsuki.bsky.social](https://bsky.app/profile/sawaratsuki.bsky.social) | No | Replace or remove |
| [`assets/icons/custom_logo_japan.svg`](#4-community-and-contest-artwork--credited-but-not-ours-to-license) | A Bluesky Japan logo contest entrant | No | Replace or remove |
| [`assets/icons/apple_logo.svg`](#5-third-party-trademarks) | Apple Inc. | No | Rests on your own basis |
| [`assets/icons/android_logo.svg`](#5-third-party-trademarks) | Google LLC | No | Rests on your own basis |
| [`assets/icons/community/`](#5-third-party-trademarks) | Leaflet, Offprint, pckt, Standard.site, Germ Network | No | Rests on your own basis |
| [`assets/fonts/inter/`](#6-third-party-assets-you-may-redistribute), Inter files in `bskyogcard/src/assets/fonts/` | The Inter Project Authors | Separate — OFL 1.1 | **Keep, with the notice** |
| [Noto fonts downloaded by `bskyogcard/scripts/install-fonts.ts`](#6-third-party-assets-you-may-redistribute) | Adobe, Google LLC, and The Noto Project Authors | Separate — OFL 1.1 | **Keep, with the notice** |
| [`assets/icons/flags/`](#6-third-party-assets-you-may-redistribute) | @catamphetamine | Separate — MIT | **Keep, with the license** |
| [`bskyweb/static/media/MaterialIcons.*.ttf`](#6-third-party-assets-you-may-redistribute) | Google, Inc. | Separate — Apache 2.0 | **Keep, with the notice** |
| [`assets/images/`](#7-product-imagery--provenance-being-documented) | Mixed, and not yet fully documented — see Section 7 | No | Replace or ship without |

Everything in [Section 6](#6-third-party-assets-you-may-redistribute) is already permissively licensed. It is the largest group of files listed here and it needs no action from you beyond keeping the notices in place.

Assets are scoped by directory wherever possible, so that adding a file to a carved-out directory does not require an edit here. Individual paths are listed only where an asset does not sit in a dedicated directory.
>>>>>>> upstream/main

---

## 1. Third-party assets we ship

Every entry here is redistributable on its own terms. Those terms travel with the files, and
you must keep them there.

<<<<<<< HEAD
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
=======
The landing-screen illustration, in light and dark variants (`assets/illustrations/illustration-mobile.png` and `assets/illustrations/illustration-mobile-dark.png`), used by `src/view/com/auth/SplashScreen.tsx`.

**Rights holder: Owen D. Pomery**, represented by Brilliant Artists Ltd. Bluesky Social PBC commissioned the work and holds a usage license. Copyright remains with the artist. Our license is limited to Bluesky's own products and channels, is exclusive to us, and does not permit us to sublicense the artwork or to distribute modified versions of it.

**If you are forking this repository, replace these files.** Because our license is exclusive, the artwork is not available for separate third-party licensing while that license runs. Please do not approach the artist or his agent for permission — the constraint is our agreement, not their willingness. If you have already shipped it, contact us and we will help you sort it out rather than leaving you to guess.

See [`assets/illustrations/README.md`](./assets/illustrations/README.md).
>>>>>>> upstream/main

See `NOTICE.md` for the consolidated attribution text.

<<<<<<< HEAD
## 2. Icons, and the asset map

Upstream's interface glyphs come from a commercial icon system licensed to Bluesky for
Bluesky's own products. We replaced the set.

156 of the 160 modules in `src/components/icons` are now generated from openly licensed
sources: Tabler for almost everything, and Zendesk Garden for the repost mark.

**Use the asset map as your guide when replacing icons.**
=======
**`assets/icons/` (top level), and the Central icon glyphs in `bskyembed/assets/`, except `bskyembed/assets/starterPack.svg`**

**Rights holder: Iconists (David & Storm GbR).** The user-interface glyphs come from their [Central icon system](https://iconists.co/central). Bluesky Social PBC licenses them for use in our own products. **That license is for our own use. It does not include the right to pass any rights to the icons on to you.**

The fact that we have our own license does not mean that you cannot use these icons. It means that any right you have to use them has to come from Iconists, not us. Licenses are available from [iconists.co](https://iconists.co), and there are openly licensed alternatives if you prefer that.

This section covers every file at the top level of `assets/icons/` **except** those named elsewhere in this document — specifically `assets/icons/logomark.svg`, `assets/icons/newskie.svg`, `assets/icons/verifiedCheck.svg`, `assets/icons/verifierCheck.svg`, `assets/icons/starterPack.svg`, `assets/icons/starterPack_stroke2_corner0_rounded.svg`, `assets/icons/custom_logo_japan.svg`, `assets/icons/apple_logo.svg`, and `assets/icons/android_logo.svg`. The `assets/icons/flags/` and `assets/icons/community/` subdirectories are covered by [Section 6](#6-third-party-assets-you-may-redistribute) and [Section 5](#5-third-party-trademarks) respectively.
>>>>>>> upstream/main

`src/features/tablerIcons/mapping.json` maps every exported icon name to the glyph that draws
it. It is the complete inventory of what the interface needs, name by name, which makes it the
right starting point for a swap:

- To change one icon, edit its entry and regenerate.
- To move to a different icon set entirely, the map tells you exactly how many glyphs you need
  and what each one is for.
- The generator refuses to write a module unless the map covers every export that module
  already has, so a swap cannot silently drop an export and break its import sites.

<<<<<<< HEAD
```bash
node scripts/generate-tabler-icons.mjs
npx prettier --write src/components/icons
```

`src/features/tablerIcons/README.md` covers the helpers, stroke weights, vendoring a glyph
that is not yet in the tree, and the known gaps.

## 3. Northsky brand assets

These are our identity. They are not covered by our MIT license, and replacing them is the
first thing to do if you fork Northsky.
=======
**Rights holder: Bluesky Social PBC.** Our name, logo, butterfly mark, logotype, and app icons are our trademarks. They are not licensed to you under the MIT license or by this document. Use of them is governed by our [Trademark Policy](https://bsky.social/about/support/trademarks) and [Brand Guidelines](https://bsky.social/about/support/branding).

You may refer to Bluesky by name to describe interoperability or origin — for example, "a client for Bluesky," or "based on the Bluesky app." You may not use our marks as the identity of your own product or service, or in any way likely to suggest that Bluesky publishes, endorses, or supports it.
>>>>>>> upstream/main

- `assets/favicon.png`
<<<<<<< HEAD
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
=======
- `assets/logo.png`
- `assets/default-avatar.png`
- `assets/icon-android-foreground.png`
- `assets/icon-android-monochrome.png`
- `assets/icon-android-notification.png`
- `assets/splash/splash.png`
- `assets/splash/splash-dark.png`
- `assets/splash/android-splash-logo-white.png`
- `assets/icons/logomark.svg`
- `assets/icons/newskie.svg`
- `assets/icons/verifiedCheck.svg`
- `assets/icons/verifierCheck.svg`
- `assets/icons/starterPack.svg`
- `assets/icons/starterPack_stroke2_corner0_rounded.svg`
- `bskyembed/assets/logo.svg`
- `bskyembed/assets/logo_full_name.svg`
- `bskyembed/assets/starterPack.svg`
- `bskyweb/static/favicon.png`
- `bskyweb/static/favicon-16x16.png`
- `bskyweb/static/favicon-32x32.png`
- `bskyweb/static/apple-touch-icon.png`
- `bskyweb/static/safari-pinned-tab.svg`
- `bskyweb/static/social-card-default.png`
- `bskyweb/static/social-card-default-gradient.png`
- `bskyweb/embedr-static/favicon.png`
- `bskyweb/embedr-static/favicon-16x16.png`
- `bskyweb/embedr-static/favicon-32x32.png`
- `modules/BlueskyClip/Images.xcassets/AppIcon.appiconset/`
- Inline vector path data in `src/view/icons/Logo.tsx`, `src/view/icons/Logomark.tsx`, `src/view/icons/LogomarkWithType.tsx`, and `src/view/icons/Logotype.tsx`

These files stay in this repository because the app needs them to build. **If you fork, replace them with your own** — that is the one thing this section asks of you. Shipping an app that looks like Bluesky is also a problem under the app stores' own rules on copycat apps, quite apart from trademark.
>>>>>>> upstream/main

You may refer to Northsky by name to describe interoperability or origin. You may not use our
marks as the identity of your own product, or in any way likely to suggest that Northsky
publishes or endorses it.

<<<<<<< HEAD
## 4. Third-party trademarks

These marks belong to other companies and appear in the interface to identify their services.
We neither grant nor withhold permission, because it is not ours to give.

- `assets/icons/community/` - Leaflet, Offprint, pckt, Standard.site, and Germ Network
- Inline vector path data in `src/components/icons/Logo.tsx`, which is still imported by two
  screens, and in the verification badges `src/components/icons/Verified.tsx`,
  `src/components/icons/VerifiedCheck.tsx`, and `src/components/icons/VerifierCheck.tsx`
=======
These are third-party artworks that appear in the app with attribution. We hold no license that lets us pass rights to them on to you.

- `assets/kawaii.png` and `assets/kawaii_smol.png` — **rights holder:
  [@sawaratsuki.bsky.social](https://bsky.app/profile/sawaratsuki.bsky.social)**. Shown as an opt-in variant and credited in `src/view/shell/Drawer.tsx` and `src/view/shell/desktop/RightNav.tsx`.
- `assets/icons/custom_logo_japan.svg` — **rights holder: the entrant who won the Bluesky Japan logo contest.**

Replace or remove these if you fork. If you want to use them, contact the artist.
>>>>>>> upstream/main

The verification badges were deliberately left out of the icon conversion: they encode three
distinct trust states that a generic icon set collapses into one rosette. They still need
Northsky artwork.

<<<<<<< HEAD
## 5. Still to replace

These are inherited from upstream and still carry Bluesky's bytes. **Treat everything in this
section as outside our MIT license and not licensed for your use.** We are working through it;
until then, a fork of Northsky needs to replace these for the same reasons a fork of Bluesky
would.

**Commissioned artwork.** `assets/illustrations/` - the landing-screen illustration by Owen D.
Pomery, licensed to Bluesky exclusively. It cannot be sublicensed, so there is no point
approaching the artist. Replace it.
=======
These marks belong to other companies. We include them to identify their services in our UI — sign-in buttons, store badges, and links to third-party applications. We are neither granting nor withholding permission, because it is not ours to give. Your use of them rests on your own nominative-use basis or on permission from the mark owner.

- `assets/icons/apple_logo.svg` — **Apple Inc.**
- `assets/icons/android_logo.svg` — **Google LLC**
- `assets/icons/community/leaflet.svg` — **Leaflet**
- `assets/icons/community/offprint.svg` — **Offprint**
- `assets/icons/community/pckt.svg` and `assets/icons/community/pckt-full.svg` — **pckt**
- `assets/icons/community/standard-site.svg` — **Standard.site**
- `assets/icons/community/germ_logo.webp` — **Germ Network**

Apple's and Google's marks in particular carry their own brand guidelines governing size, spacing, and permitted contexts. If you ship a sign-in button or a store badge, follow their guidelines.
>>>>>>> upstream/main

**Product imagery.** `assets/images/` - onboarding art, chat backgrounds, and announcement
graphics. Some of it is commissioned. The line is drawn at the directory rather than file by
file.

<<<<<<< HEAD
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
=======
These are licensed on terms that permit redistribution. Nothing in this document restricts them. We list them so you know they are safe, and so you know to carry their notices. This is the largest group of assets in this document.

| Asset | Path | Rights holder | License | Notice |
|---|---|---|---|---|
| Inter typeface | `assets/fonts/inter/`, `bskyogcard/src/assets/fonts/Inter-*.ttf` | The Inter Project Authors | SIL Open Font License 1.1 | [`OFL.txt`](./assets/fonts/inter/OFL.txt) |
| Noto Sans families (OG card service) | Downloaded by `bskyogcard/scripts/install-fonts.ts` | Adobe, Google LLC, and The Noto Project Authors | SIL Open Font License 1.1 | [`README.md`](./bskyogcard/src/assets/fonts/README.md) |
| country-flag-icons | `assets/icons/flags/` | @catamphetamine | MIT | [`LICENSE`](./assets/icons/flags/LICENSE) |
| Material Icons | `bskyweb/static/media/MaterialIcons.*.ttf` | Google, Inc. | Apache License 2.0 | [`NOTICE.md`](./NOTICE.md) |

Build output under `bskyweb/static/media/` also contains compiled Inter files. They are the same OFL-licensed typeface, emitted by the web build. The bundled Inter license does not designate a Reserved Font Name.

The OG card build downloads Noto Sans fonts into `bskyogcard/src/assets/fonts/` and copies them into its build output. Their copyright notices and OFL text are in [`bskyogcard/src/assets/fonts/OFL-NOTO.txt`](./bskyogcard/src/assets/fonts/OFL-NOTO.txt). The CJK fonts reserve the name "Source."

See [`NOTICE.md`](./NOTICE.md) for the consolidated third-party notices.

## 7. Product imagery — provenance being documented

**`assets/images/`**

Product illustration and announcement imagery — onboarding art, chat backgrounds, feature announcement graphics, and similar.

**Rights holder: mixed, and we have not finished documenting it.** Some of this is Bluesky's own work. Some was commissioned from outside illustrators, on terms that do not let us pass rights on. We are working out which is which.

Until we have, **treat the whole directory as outside the MIT license and not licensed for your use.**

When this is resolved, one of two things will happen: this section will name the rights holder for each file, or the directory will be split so that the boundary itself carries the answer. If you need a specific file's status before then, ask us and we will find out.

If you are forking, replace these or ship without them. See [`assets/images/README.md`](./assets/images/README.md).
>>>>>>> upstream/main

---

## If you fork Northsky

<<<<<<< HEAD
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
=======
You have our blessing to fork this application. These steps map one-to-one to the sections above.

1. **Replace `assets/illustrations/`** — commissioned artwork, licensed to Bluesky only. [Section 1](#1-commissioned-artwork--licensed-to-bluesky-only)
2. **Source your own UI icons** — the glyph set in `assets/icons/` is licensed to us for our own use. [Section 2](#2-licensed-icon-system--not-ours-to-pass-on)
3. **Replace the Bluesky marks** — app icons, favicons, logo files, and the inline logo paths in `src/view/icons/`. [Section 3](#3-bluesky-trademarks-and-brand-assets)
4. **Replace or remove the community and contest artwork.** [Section 4](#4-community-and-contest-artwork--credited-but-not-ours-to-license)
5. **Check your own position on the third-party marks.** [Section 5](#5-third-party-trademarks)
6. **Keep the assets you may redistribute, and keep their notices with them.** [Section 6](#6-third-party-assets-you-may-redistribute)
7. **Replace `assets/images/`, or ship without it.** [Section 7](#7-product-imagery--provenance-being-documented)

Then change your branding, support links, and analytics as described in the [Forking guidelines](./README.md#forking-guidelines). That part is not about licensing — it is what makes a fork clearly distinguishable from Bluesky, which matters both for your users and for app store review.

## Questions

If something in this repository looks like it should be on this list and is not, if a rights holder named here is wrong, or if you are unsure whether an asset is covered, open an issue or email [atmosphere@blueskyweb.xyz](mailto:atmosphere@blueskyweb.xyz).

## History

- **August 2026** — this document added, along with [`NOTICE.md`](./NOTICE.md), per-directory notices, and the required Apache 2.0 and OFL license texts. It documents pre-existing rights; it does not change the [MIT license](./LICENSE) or relicense any file.
- **Before that** — the repository carried a blanket MIT license with no asset carve-out, and the forking guidelines did not mention commissioned artwork, trademarks, or licensed icons.

---

*This document describes the licensing position of assets in this repository. It is not a grant of rights, and it does not modify the [MIT license](./LICENSE) as it applies to source code.*
>>>>>>> upstream/main
