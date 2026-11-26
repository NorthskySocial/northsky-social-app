import {fallbackMediaUrl} from './routing'

export class MediaFallbackSession {
  preferBlackskyUploads = false
  private preferredOrigins = new Set<string>()

  constructor(
    readonly did: string | undefined,
    readonly enabled: boolean,
  ) {}

  alternateUrl(uri: string) {
    return this.enabled ? fallbackMediaUrl(uri) : undefined
  }

  preferredUrl(uri: string) {
    const alternate = this.alternateUrl(uri)
    return alternate && this.preferredOrigins.has(new URL(alternate).origin)
      ? alternate
      : uri
  }

  rememberRead(primary: string) {
    const alternate = this.alternateUrl(primary)
    if (alternate) this.preferredOrigins.add(new URL(alternate).origin)
  }
}
