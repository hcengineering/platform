import type { IncomingMessage } from 'http'

export const ETagSupport = {
  isWeak (etag: string): boolean {
    return etag.startsWith('W/"')
  },

  isStrong (etag: string): boolean {
    return etag.startsWith('"')
  },

  opaqueTag (etag: string): string {
    if (this.isWeak(etag)) {
      return etag.substring(2)
    }

    return etag
  },
  weakMatch (a: string, b: string): boolean {
    return this.opaqueTag(a) === this.opaqueTag(b)
  },

  strongMatch (a: string, b: string): boolean {
    return this.isStrong(a) && this.isStrong(b) && a === b
  }
}

function toList (value: string): string[] {
  return value.split(',').map((s) => s.trim())
}

export const preConditions = {
  IfMatch: (headers: IncomingMessage['headers'], state: { etag: string }): 'fetch' | 'notModified' => {
    const header = (headers as any)['if-match']
    if (header == null) {
      return 'fetch'
    }
    if (header === '*') {
      return 'fetch'
    }
    return toList(header).some((etag) => ETagSupport.strongMatch(etag, state.etag)) ? 'notModified' : 'fetch'
  },
  IfNoneMatch: (headers: IncomingMessage['headers'], state: { etag: string }): 'fetch' | 'notModified' => {
    const header = (headers as any)['if-none-match']
    if (header == null) {
      return 'fetch'
    }

    if (header === '*') {
      return 'fetch'
    } else {
      return toList(header).some((etag) => ETagSupport.weakMatch(etag, state.etag)) ? 'notModified' : 'fetch'
    }
  },
  IfModifiedSince: (headers: IncomingMessage['headers'], state: { lastModified: Date }): 'fetch' | 'notModified' => {
    if ((headers as any)['if-none-match'] != null) {
      return 'fetch'
    }
    const header = (headers as any)['if-modified-since']
    if (header == null) {
      return 'fetch'
    }

    const date = Date.parse(header)
    if (isNaN(date)) {
      return 'fetch'
    }
    return state.lastModified.getTime() <= date ? 'notModified' : 'fetch'
  },
  IfUnmodifiedSince: (headers: IncomingMessage['headers'], state: { lastModified: Date }): 'fetch' | 'failed' => {
    if ((headers as any)['if-match'] != null) {
      return 'fetch'
    }
    const header = (headers as any)['if-unmodified-since']
    if (header == null) {
      return 'fetch'
    }

    const date = Date.parse(header)
    if (isNaN(date)) {
      return 'fetch'
    }
    return state.lastModified.getTime() > date ? 'failed' : 'fetch'
  }
}
