import {getHostTermsOfService} from '../moderation'

describe('getHostTermsOfService', () => {
  it('resolves northsky.social to the Northsky ToS', () => {
    const result = getHostTermsOfService('https://northsky.social')
    expect(result.name).toBe('Northsky Social')
    expect(result.tosUrl).toBe(
      'https://northskysocial.com/posts/terms-of-service',
    )
  })

  it('resolves blacksky.social to the Blacksky ToS', () => {
    const result = getHostTermsOfService('https://blacksky.social/')
    expect(result.name).toBe('Blacksky')
    expect(result.tosUrl).toBe('https://blackskyweb.xyz/about/support/tos/')
  })

  it('resolves bsky.social to the Bluesky ToS', () => {
    const result = getHostTermsOfService('https://bsky.social')
    expect(result.name).toBe('Bluesky Social')
    expect(result.tosUrl).toBe('https://bsky.social/about/support/tos')
  })

  it('falls back to the Bluesky ToS for unknown hosts', () => {
    const result = getHostTermsOfService('https://pds.example.com')
    expect(result.name).toBe('Bluesky Social')
  })

  it('does not match lookalike subdomains of known hosts', () => {
    const result = getHostTermsOfService('https://northsky.social.attacker.com')
    expect(result.name).toBe('Bluesky Social')
  })

  it('falls back for missing or unparseable service URLs', () => {
    expect(getHostTermsOfService(undefined).name).toBe('Bluesky Social')
    expect(getHostTermsOfService('not a url').name).toBe('Bluesky Social')
  })
})
