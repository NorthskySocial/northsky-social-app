import {fallbackMediaUrl} from './routing'

export class MediaFallbackSession {
  preferBlackskyUploads = false
  private preferredOrigins = new Set<string>()

  constructor(readonly did?: string) {}

  preferredUrl(uri: string) {
    const alternate = fallbackMediaUrl(uri)
    return alternate && this.preferredOrigins.has(new URL(alternate).origin)
      ? alternate
      : uri
  }

  rememberRead(primary: string) {
    const alternate = fallbackMediaUrl(primary)
    if (alternate) this.preferredOrigins.add(new URL(alternate).origin)
  }
}
