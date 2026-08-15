# postVocabulary

Northsky calls a post a skeet. This module lets the user choose the wording on
the two compose buttons.

The setting lives under **Settings > Appearance**, is titled "They're called",
and offers **Post** and **Skeets**. It defaults to **Skeets**, which is what the
app shipped before the setting existed.

## Scope

The setting reaches two buttons:

- the compose button in the desktop left sidebar
- the publish button in the composer, and the label a screen reader reads for it

Nothing else follows the setting. Feed lines, screen headers, notification text,
and the repost controls keep the skeet wording that commit `24c2ff3ff` gave
them. Keeping the scope this small keeps the upstream merge surface small: the
whole setting is two edited upstream files.

## Why a module

A Lingui macro compiles to a fixed message at build time, so a running app
cannot re-point one. Both wordings have to be authored. Authoring them here
keeps each upstream edit down to a token swap, which is the cheapest thing to
re-apply during an upstream sync. See the fork rules in `AGENTS.md`.

## The two hooks

`usePostVocabulary()` returns the button strings for the current setting:

```tsx
const vocab = usePostVocabulary()
;<ButtonText>{vocab.newPost}</ButtonText>
```

`usePostNaming()` returns `'post'` or `'skeet'`. Only the setting screen needs
it, to show which choice is active.

## Realtime

The setting screen and the left sidebar are siblings. A change has to relabel
the compose button while the setting is still on screen, so the provider holds
the value in React state and shares it through context. `useStorage` cannot do
that job: it opens an MMKV listener per caller and rebuilds it every render.
