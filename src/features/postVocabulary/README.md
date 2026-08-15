# postVocabulary

Northsky calls a post a skeet and a repost a reskeet. This module makes that a
user preference instead of a hardcoded rename.

The setting lives under **Settings > Appearance**, is titled "They're called",
and offers **Post** and **Skeets**. It defaults to **Skeets**, which is what the
app shipped before the setting existed.

## Why a module

Commit `24c2ff3ff` renamed the wording in place, inside Lingui macros across 14
files. A Lingui macro compiles to a fixed message at build time, so a running
app cannot re-point one. Both wordings have to be authored.

Authoring them at every call site would put a ternary in 20 upstream files.
Authoring them here keeps each upstream edit down to a token swap, which is the
cheapest thing to re-apply during an upstream sync. See the fork rules in
`AGENTS.md`.

## The two hooks

`usePostVocabulary()` returns one object of translated strings. Most call sites
want this:

```tsx
const vocab = usePostVocabulary()
;<Button label={vocab.repost} />
```

`usePostNaming()` returns `'post'` or `'skeet'`. Five call sites need it,
because their message interpolates a React element and so cannot collapse to a
string. Those pick between two complete `<Trans>` blocks.

## Adding a string

Add a field to `vocabulary.ts` with both wordings. Take the skeet wording from
`git show 24c2ff3ff` where that commit already wrote it, so the two stay in
agreement, and take the post wording from what that commit replaced.

A field that varies with a count is a function, so that `plural()` sees the
count. `repostCount` and `repostNoun` differ in whether the number is part of
the returned string.

## Performance

The state provider reads device storage once and shares the value through
context. `useStorage` cannot do that job: it opens an MMKV listener per caller
and rebuilds it every render, and the repost button renders once per feed row.
