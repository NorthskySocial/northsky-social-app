# Northsky Social App

Welcome friends! This is the codebase for the Northsky social app, a client for
the AT Protocol.

Northsky is a fork of Bluesky's [social-app](https://github.com/bluesky-social/social-app),
rebranded and extended for the Northsky network. See [AGENTS.md](./AGENTS.md)
for the fork model and how we stay mergeable with upstream.

Get the app itself:

- **Web: [northsky.app](https://northsky.app)**
- ~~**iOS: App Store**~~ - not released yet
- ~~**Android: Play Store**~~ - not released yet

## Development Resources

This is a [React Native](https://reactnative.dev/) application, written in the TypeScript programming language. It builds on the `atproto` TypeScript packages (like [`@atproto/api`](https://www.npmjs.com/package/@atproto/api)), which are also open source, but in [a different git repository](https://github.com/bluesky-social/atproto).

There is a small amount of Go language source code (in `./bskyweb/`), for a web service that returns the React Native Web application.

The [Build Instructions](./docs/build.md) are a good place to get started with the app itself. [AGENTS.md](./AGENTS.md) is the canonical development guide: project structure, styling with the ALF design system, state management, i18n, and the commit/test policy.

The Authenticated Transfer Protocol ("AT Protocol" or "atproto") is a decentralized social media protocol. You don't *need* to understand AT Protocol to work with this application, but it can help. Learn more at:

- [Overview and Guides](https://atproto.com/guides/overview)
- [GitHub Discussions](https://github.com/bluesky-social/atproto/discussions) 👈 Great place to ask questions
- [Protocol Specifications](https://atproto.com/specs/atp)

## Telemetry

The analytics, metrics, and feature-gate pipelines inherited from upstream are
**disabled**. Northsky does not operate those backends, and this fork does not
send telemetry to Bluesky's backends.


## Contributions

> [!NOTE]
> While we do accept contributions, we prioritize high-quality issues and pull requests. Adhering to the below guidelines will ensure a more timely review.

**Guidelines:**

- Check for existing issues before filing a new one please.
- Open an issue and give some time for discussion before submitting a PR.
- Keep changes scoped. Every line we change in a file we share with upstream is a future merge conflict, so prefer the extension points described in [AGENTS.md](./AGENTS.md).
- When you open a pull request, use the [pull request template](./.github/pull_request_template.md) and complete its checklist.

## Forking guidelines

You have our blessing to fork this application! However, it's very important to
be clear to users when you're giving them a fork.

Please be sure to:

- Change all branding in the repository and UI to clearly differentiate from Northsky and from Bluesky.
- Change any support links (feedback, email, terms of service, etc) to your own systems.
- Replace any analytics or error-collection systems with your own so we don't get super confused.
- Replace the landing-screen illustration in `assets/illustrations/`. It is commissioned artwork licensed to Bluesky alone, and our MIT license does not cover it.
- Source your own UI icons. The glyph set in `assets/icons/` is licensed to us by a third party for our own use, and that license does not extend to you.
- Replace the Bluesky logo, app icons, and other brand assets. Our trademarks are not licensed with the code.

Please read [./ASSETS.md](./ASSETS.md) before you ship. Not every file in this repository is
covered by our MIT license — some of the artwork, icons, fonts, and brand assets are licensed to
us by third parties or are trademarks, and `ASSETS.md` says which ones and what to do about them.
That file is new. Its absence is why some forks have shipped assets they did not have rights to,
and that was our omission rather than theirs.

## Security disclosures

If you discover any security issues, please send an email to
security@northskysocial.com. We'll respond promptly.

## License (MIT)

See [./LICENSE](./LICENSE) for the full license, which covers the source code in this repository.

It does not cover every file. Certain images, icons, fonts, and brand assets are licensed to us
by third parties, or are trademarks, and are carved out — see [./ASSETS.md](./ASSETS.md). Required
third-party attribution notices are collected in [./NOTICE.md](./NOTICE.md).

This codebase derives from Bluesky's social-app. Bluesky Social PBC has committed to a software patent non-aggression pledge. For details see [the original announcement](https://bsky.social/about/blog/10-01-2025-patent-pledge).

## Support Us

If you love the things we do at Northsky Social, [become a sponsor!](https://github.com/sponsors/NorthskySocial)
