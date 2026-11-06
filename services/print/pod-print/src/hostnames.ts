//
// Copyright © 2026 Hardcore Engineering Inc.
//

/**
 * Targets the print service is allowed to render.
 * Either full origins (default: the front origin) or hostnames on any port (ALLOWED_HOSTNAMES).
 */
export interface AllowedTargets {
  origins: Set<string>
  hostnames: Set<string>
}

/**
 * Builds the targets the print service is allowed to render.
 * When hostnames are configured explicitly, links to them are allowed on any port.
 * Otherwise only the origin (scheme, host and port) of the configured front URL is allowed.
 */
export function getAllowedTargets (configured: string[], frontUrl: string): AllowedTargets {
  const hostnames = configured.map((it) => it.trim().toLowerCase()).filter((it) => it !== '')
  if (hostnames.length > 0) {
    return { origins: new Set(), hostnames: new Set(hostnames) }
  }

  try {
    const url = new URL(frontUrl)
    const origins = isHttpProtocol(url.protocol) && url.hostname !== '' ? [url.origin] : []
    return { origins: new Set(origins), hostnames: new Set() }
  } catch {
    return { origins: new Set(), hostnames: new Set() }
  }
}

/**
 * Checks that the link uses http(s) and points to one of the allowed targets.
 */
export function isAllowedLink (link: string, allowed: AllowedTargets): boolean {
  const url = parseUrl(link)
  return url !== undefined && isHttpProtocol(url.protocol) && matchesAllowedTargets(url, allowed)
}

/**
 * Checks a request made by the rendered page.
 * Navigations (including frames) must point to an allowed target. Other requests are allowed
 * unless they address a loopback, private or link-local host outside of the allowed targets.
 */
export function isAllowedRequest (link: string, isNavigation: boolean, allowed: AllowedTargets): boolean {
  const url = parseUrl(link)
  if (url === undefined) return false
  if (['data:', 'blob:', 'about:'].includes(url.protocol)) return true
  if (isNavigation) return isAllowedLink(link, allowed)
  if (!isHttpProtocol(url.protocol) && !['ws:', 'wss:'].includes(url.protocol)) return false
  return matchesAllowedTargets(url, allowed) || !isPrivateHostname(url.hostname)
}

/**
 * Checks if a request intercepted for the whole browser loads a document, i.e. navigates a page, popup or frame.
 * Expects a resource type as reported by the DevTools Fetch domain.
 */
export function isNavigationResourceType (resourceType: string): boolean {
  return resourceType === 'Document'
}

/**
 * Checks if a browser target created while rendering should be closed.
 * Printing only needs the rendered page itself, so popups and other pages are closed.
 */
export function isUnexpectedTarget (type: string, isRenderedPage: boolean): boolean {
  return !isRenderedPage && ['page', 'background_page', 'webview'].includes(type)
}

/**
 * Checks if the hostname is localhost or an IP literal in a loopback, private,
 * link-local or unique-local range. Expects a hostname as normalized by the URL parser.
 */
export function isPrivateHostname (hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (host === 'localhost' || host.endsWith('.localhost')) return true

  if (host.startsWith('[') && host.endsWith(']')) {
    const groups = parseIPv6(host.slice(1, -1))
    return groups !== undefined && isPrivateIPv6(groups)
  }

  const ipv4 = parseIPv4(host)
  return ipv4 !== undefined && isPrivateIPv4(ipv4)
}

function parseUrl (link: string): URL | undefined {
  try {
    return new URL(link)
  } catch {
    return undefined
  }
}

function isHttpProtocol (protocol: string): boolean {
  return protocol === 'http:' || protocol === 'https:'
}

function matchesAllowedTargets (url: URL, allowed: AllowedTargets): boolean {
  if (allowed.hostnames.has(url.hostname)) return true
  // WebSocket requests share the origin of the corresponding http(s) endpoint
  const protocol = url.protocol === 'ws:' ? 'http:' : url.protocol === 'wss:' ? 'https:' : url.protocol
  return allowed.origins.has(`${protocol}//${url.host}`)
}

function parseIPv4 (host: string): number[] | undefined {
  const parts = host.split('.')
  if (parts.length !== 4) return undefined
  const octets = parts.map((it) => (/^\d{1,3}$/.test(it) ? Number(it) : NaN))
  return octets.every((it) => it >= 0 && it <= 255) ? octets : undefined
}

function isPrivateIPv4 ([a, b, c]: number[]): boolean {
  return (
    a === 0 ||
    a === 10 ||
    (a === 100 && b >= 64 && b <= 127) || // shared address space
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) || // IETF protocol assignments
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast, reserved and broadcast
  )
}

function parseIPv6 (host: string): number[] | undefined {
  let address = host
  const lastColon = address.lastIndexOf(':')
  const last = address.slice(lastColon + 1)
  if (last.includes('.')) {
    // Embedded IPv4 address, e.g. ::ffff:127.0.0.1
    const ipv4 = parseIPv4(last)
    if (ipv4 === undefined) return undefined
    const high = ((ipv4[0] << 8) | ipv4[1]).toString(16)
    const low = ((ipv4[2] << 8) | ipv4[3]).toString(16)
    address = `${address.slice(0, lastColon + 1)}${high}:${low}`
  }

  const halves = address.split('::')
  if (halves.length > 2) return undefined
  const parseGroups = (part: string): number[] | undefined => {
    if (part === '') return []
    const groups = part.split(':').map((it) => (/^[0-9a-f]{1,4}$/.test(it) ? parseInt(it, 16) : NaN))
    return groups.some((it) => Number.isNaN(it)) ? undefined : groups
  }
  const head = parseGroups(halves[0])
  const rest = halves.length === 2 ? parseGroups(halves[1]) : []
  if (head === undefined || rest === undefined) return undefined

  const missing = 8 - head.length - rest.length
  if (halves.length === 2 ? missing < 1 : missing !== 0) return undefined
  return [...head, ...new Array<number>(missing).fill(0), ...rest]
}

function isPrivateIPv6 (groups: number[]): boolean {
  const isZero = (from: number, to: number): boolean => groups.slice(from, to).every((it) => it === 0)
  if (isZero(0, 8)) return true // unspecified ::
  if (isZero(0, 7) && groups[7] === 1) return true // loopback ::1
  if ((groups[0] & 0xfe00) === 0xfc00) return true // unique local fc00::/7
  if ((groups[0] & 0xffc0) === 0xfe80) return true // link-local fe80::/10
  if ((groups[0] & 0xffc0) === 0xfec0) return true // site-local fec0::/10
  if ((groups[0] & 0xff00) === 0xff00) return true // multicast ff00::/8
  if (isZero(0, 5) && (groups[5] === 0xffff || groups[5] === 0)) {
    // IPv4-mapped ::ffff:a.b.c.d and IPv4-compatible ::a.b.c.d
    return isPrivateIPv4([groups[6] >> 8, groups[6] & 0xff, (groups[7] >> 8) & 0xff, groups[7] & 0xff])
  }
  return false
}
