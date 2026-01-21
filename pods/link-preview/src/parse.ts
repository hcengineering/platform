//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { MeasureContext } from '@hcengineering/core'
import * as cheerio from 'cheerio'
import { imageSize } from 'image-size'
import oembedProviders from 'oembed-providers'

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface LinkPreviewDetails {
  title?: string
  description?: string
  url?: string
  icon?: string
  image?: string
  imageWidth?: number
  imageHeight?: number
  charset?: string
  hostname?: string
  host: string
}

export interface OEmbedProvider {
  provider_name: string
  provider_url: string
  endpoints: Array<{
    url: string
    schemes?: string[]
    formats?: string[]
    discovery?: boolean
  }>
}

export interface OEmbedResponse {
  type: 'photo' | 'video' | 'link' | 'rich'
  version: string
  title?: string
  author_name?: string
  author_url?: string
  provider_name?: string
  provider_url?: string
  cache_age?: number
  thumbnail_url?: string
  thumbnail_width?: number
  thumbnail_height?: number
  url?: string
  html?: string
  width?: number
  height?: number
}

export interface Config {
  UserAgent: string
  DescriptionMaxSentences: number
  DescriptionMaxLength: number
  /** Request timeout in milliseconds (default: 10000) */
  TimeoutMs?: number
  /** Maximum image size to fetch in bytes (default: 10MB) */
  MaxImageBytes?: number
  /** Blocked IP ranges for SSRF protection */
  BlockedIpRanges?: string[]
}

interface ImageDimensions {
  width: number
  height: number
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB
const OEMBED_SERVICE_NAME = 'Huly Link Preview Service/1.0'

// Private IP ranges to block for SSRF protection
const BLOCKED_IP_PATTERNS = [
  /^127\./, // Loopback
  /^10\./, // Private Class A
  /^172\.(1[6-9]|2\d|3[01])\./, // Private Class B
  /^192\.168\./, // Private Class C
  /^169\.254\./, // Link-local
  /^0\./, // Current network
  /^localhost$/i,
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 private
  /^fe80:/i // IPv6 link-local
]

// ============================================================================
// Error Classes
// ============================================================================

export class LinkPreviewError extends Error {
  constructor (
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'LinkPreviewError'
  }
}

// ============================================================================
// URL Validation
// ============================================================================

function validateUrl (urlString: string): URL {
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    throw new LinkPreviewError(`Invalid URL: ${urlString}`)
  }

  // Only allow HTTP(S) protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new LinkPreviewError(`Invalid protocol: ${url.protocol}. Only HTTP and HTTPS are allowed.`)
  }

  // SSRF protection: block private/internal IPs
  const hostname = url.hostname
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new LinkPreviewError('Blocked URL: Access to internal addresses is not allowed.')
    }
  }

  return url
}

// ============================================================================
// Fetch Utilities
// ============================================================================

async function fetchWithTimeout (url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new LinkPreviewError(`Request timed out after ${timeoutMs}ms`, error)
    }
    throw new LinkPreviewError(
      `Failed to fetch URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

// ============================================================================
// oEmbed Functions
// ============================================================================

function findOEmbedProviderUrl (targetUrl: string): string | null {
  for (const provider of oembedProviders as OEmbedProvider[]) {
    const endpoints = provider.endpoints ?? []

    for (const endpoint of endpoints) {
      const schemes = endpoint.schemes ?? []
      if (schemes.length === 0) continue

      for (const scheme of schemes) {
        const regex = oembedSchemeToRegex(scheme)
        if (regex.test(targetUrl)) {
          const endpointUrl = endpoint.url
          if (endpointUrl != null) {
            return endpointUrl.replace('{format}', 'json').replace('{url}', encodeURIComponent(targetUrl))
          }
        }
      }
    }
  }
  return null
}

function findOEmbedDiscoveryUrl ($: ReturnType<typeof cheerio.load>, baseUrl: string): string | null {
  const jsonOembedLink = $('link[type="application/json+oembed"]').attr('href')
  const xmlOembedLink = $('link[type="text/xml+oembed"]').attr('href')

  let oembedLink: string | null = null
  if (isNonEmptyString(jsonOembedLink)) {
    oembedLink = jsonOembedLink
  } else if (isNonEmptyString(xmlOembedLink)) {
    oembedLink = xmlOembedLink
  }

  if (oembedLink === null) return null

  return oembedLink.startsWith('http') ? oembedLink : new URL(oembedLink, baseUrl).href
}

async function fetchOEmbedData (
  ctx: MeasureContext,
  $: ReturnType<typeof cheerio.load>,
  baseUrl: string,
  timeoutMs: number
): Promise<OEmbedResponse | null> {
  try {
    // Try provider registry first, then discovery
    const providerUrl = findOEmbedProviderUrl(baseUrl)
    const discoveryUrl = findOEmbedDiscoveryUrl($, baseUrl)
    const oembedUrl = providerUrl ?? discoveryUrl

    if (oembedUrl === null) return null

    ctx.info('fetching oEmbed data', { oembedUrl })

    const response = await fetchWithTimeout(oembedUrl, { headers: { 'User-Agent': OEMBED_SERVICE_NAME } }, timeoutMs)

    if (!response.ok) {
      ctx.warn('oEmbed fetch failed', {
        status: response.status,
        statusText: response.statusText
      })
      return null
    }

    const contentType = response.headers.get('content-type')
    if (contentType === null || !contentType.includes('json')) {
      ctx.warn('oEmbed response is not JSON', { contentType: contentType ?? 'null' })
      return null
    }

    const data = (await response.json()) as OEmbedResponse

    // Validate required fields per oEmbed spec
    if (data.type == null || data.version == null) {
      ctx.warn('Invalid oEmbed response: missing required fields')
      return null
    }

    ctx.info('successfully fetched oEmbed data', { type: data.type })
    return data
  } catch (error) {
    // Don't throw - oEmbed failure should fall back to OG parsing
    ctx.warn('failed to fetch oEmbed data', {
      error: error instanceof Error ? error.message : String(error)
    })
    // return null
    throw error
  }
}

function convertOEmbedToPreview (
  oembed: OEmbedResponse,
  baseUrl: string,
  hostname: string,
  host: string
): LinkPreviewDetails {
  const descriptionParts: string[] = []
  if (oembed.provider_name !== undefined && oembed.provider_name.length > 0) {
    descriptionParts.push(oembed.provider_name)
  }
  if (oembed.author_name !== undefined && oembed.author_name.length > 0) {
    descriptionParts.push(oembed.author_name)
  }
  const description = descriptionParts.length > 0 ? descriptionParts.join(' - ') : undefined

  let image: string | undefined
  if (oembed.thumbnail_url !== undefined && oembed.thumbnail_url.length > 0) {
    image = oembed.thumbnail_url
  } else if (oembed.type === 'photo' && oembed.url !== undefined && oembed.url.length > 0) {
    image = oembed.url
  }

  let imageWidth: number | undefined
  if (oembed.thumbnail_width !== undefined) {
    imageWidth = oembed.thumbnail_width
  } else if (oembed.type === 'photo' && oembed.width !== undefined) {
    imageWidth = oembed.width
  }

  let imageHeight: number | undefined
  if (oembed.thumbnail_height !== undefined) {
    imageHeight = oembed.thumbnail_height
  } else if (oembed.type === 'photo' && oembed.height !== undefined) {
    imageHeight = oembed.height
  }

  return {
    title: oembed.title,
    description,
    url: baseUrl,
    hostname,
    host,
    image,
    imageWidth,
    imageHeight
  }
}

// ============================================================================
// Charset Parsing
// ============================================================================

function parseCharset (headers: Headers, $: ReturnType<typeof cheerio.load>): string {
  // Try Content-Type header first
  const headerContentType = headers.get('content-type')
  const headerCharset = extractCharsetFromContentType(headerContentType)
  if (isNonEmptyString(headerCharset)) return headerCharset

  // Try <meta charset="...">
  const metaCharset = $('meta[charset]').attr('charset')
  if (isNonEmptyString(metaCharset)) {
    return normalizeCharset(metaCharset)
  }

  // Try <meta http-equiv="Content-Type" content="...">
  const metaContentType = $('meta[http-equiv="Content-Type" i]').attr('content')
  const bodyCharset = extractCharsetFromContentType(metaContentType)
  if (isNonEmptyString(bodyCharset)) return bodyCharset

  return 'utf-8'
}

function extractCharsetFromContentType (contentType: string | null | undefined): string | null {
  if (contentType === null || contentType === undefined) return null
  if (!contentType.includes('charset=')) return null

  const parts = contentType.split('charset=')
  if (parts.length < 2) return null

  const charsetPart = parts[1]
  if (!isNonEmptyString(charsetPart)) return null

  // Handle quoted values and trim; also handle trailing parameters
  const cleanedCharset = charsetPart.split(';')[0].split(',')[0]
  if (!isNonEmptyString(cleanedCharset)) return null

  return normalizeCharset(cleanedCharset)
}

function normalizeCharset (charset: string): string {
  return charset.toLowerCase().trim().replace(/^["']/, '').replace(/["']$/, '')
}

// ============================================================================
// Description Parsing
// ============================================================================

function parseDescription ($: ReturnType<typeof cheerio.load>, config: Config): string | undefined {
  const paragraphs = $('p')
  if (paragraphs.length === 0) return undefined

  const sentences: string[] = []
  const maxSentences = config.DescriptionMaxSentences

  for (const p of paragraphs.toArray()) {
    const rawText = $(p).text()
    if (rawText === undefined || rawText === null) continue

    const text = rawText.trim()
    if (text.length === 0) continue

    // Split on sentence-ending punctuation followed by space or end
    const extracted = extractSentences(text)
    sentences.push(...extracted)

    if (sentences.length >= maxSentences) break
  }

  if (sentences.length === 0) return undefined

  let result = sentences.slice(0, maxSentences).join(' ')

  const maxLength = config.DescriptionMaxLength
  if (result.length > maxLength && maxLength >= 3) {
    result = result.substring(0, maxLength - 3) + '...'
  }

  return result
}

function extractSentences (text: string): string[] {
  // Match sentences ending with . ? or !
  const sentenceRegex = /[^.!?]*[.!?]+/g
  const matches = text.match(sentenceRegex)

  if (matches === null || matches.length === 0) {
    // No sentence-ending punctuation, return whole text as one "sentence"
    const trimmed = text.trim()
    return trimmed.length > 0 ? [trimmed] : []
  }

  return matches.map((s) => s.trim()).filter((s) => s.length > 0)
}

// ============================================================================
// Image Size Loading
// ============================================================================

async function loadImageSize (ctx: MeasureContext, url: string, config: Config): Promise<ImageDimensions | undefined> {
  const timeoutMs = config.TimeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxBytes = config.MaxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES

  try {
    // Validate the image URL too
    validateUrl(url)

    const response = await fetchWithTimeout(url, { headers: { 'User-Agent': config.UserAgent } }, timeoutMs)

    if (!response.ok) {
      ctx.warn('failed to fetch image', { status: response.status, url })
      return undefined
    }

    // Check content length before downloading
    const contentLengthHeader = response.headers.get('content-length')
    if (isNonEmptyString(contentLengthHeader)) {
      const contentLength = parseInt(contentLengthHeader, 10)
      if (!Number.isNaN(contentLength) && contentLength > maxBytes) {
        ctx.warn('image too large', { contentLength, maxBytes, url })
        return undefined
      }
    }

    // Verify it's actually an image
    const contentType = response.headers.get('content-type')
    if (contentType === null || !contentType.startsWith('image/')) {
      ctx.warn('URL is not an image', { contentType: contentType ?? 'null', url })
      return undefined
    }

    const arrayBuffer = await response.arrayBuffer()

    // Double-check size after download (in case Content-Length was missing/wrong)
    if (arrayBuffer.byteLength > maxBytes) {
      ctx.warn('downloaded image too large', { size: arrayBuffer.byteLength, maxBytes, url })
      return undefined
    }

    const uint8Array = new Uint8Array(arrayBuffer)
    const size = imageSize(uint8Array)

    if (typeof size.width === 'number' && typeof size.height === 'number') {
      return { width: size.width, height: size.height }
    }

    return undefined
  } catch (error) {
    // Don't propagate image size errors - they're non-critical
    ctx.warn('failed to get image size', {
      error: error instanceof Error ? error.message : String(error),
      url
    })
    return undefined
  }
}

// ============================================================================
// Open Graph Parsing
// ============================================================================

function parseOpenGraphData (
  $: ReturnType<typeof cheerio.load>,
  config: Config,
  parsedUrl: URL,
  finalUrl: string
): Omit<LinkPreviewDetails, 'imageWidth' | 'imageHeight'> {
  const host = `${parsedUrl.protocol}//${parsedUrl.host}`

  const ogSiteName = $('meta[property="og:site_name"]').attr('content')
  const hostname = isNonEmptyString(ogSiteName) ? ogSiteName : parsedUrl.hostname

  // Title: OG > Twitter > title tag
  const ogTitle = $('meta[property="og:title"]').attr('content')
  const twitterTitle = $('meta[name="twitter:title"]').attr('content')
  const htmlTitle = $('title').text().trim()

  let title: string | undefined
  if (isNonEmptyString(ogTitle)) {
    title = ogTitle
  } else if (isNonEmptyString(twitterTitle)) {
    title = twitterTitle
  } else if (htmlTitle.length > 0) {
    title = htmlTitle
  }

  // Description: OG > Twitter > meta description > paragraph extraction
  const ogDescription = $('meta[property="og:description"]').attr('content')
  const twitterDescription = $('meta[name="twitter:description"]').attr('content')
  const metaDescription = $('meta[name="description"]').attr('content')

  let description: string | undefined
  if (isNonEmptyString(ogDescription)) {
    description = ogDescription
  } else if (isNonEmptyString(twitterDescription)) {
    description = twitterDescription
  } else if (isNonEmptyString(metaDescription)) {
    description = metaDescription
  } else {
    description = parseDescription($, config)
  }

  // URL: canonical > OG URL > original
  const canonicalHref = $('link[rel="canonical"]').attr('href')
  const ogUrl = $('meta[property="og:url"]').attr('content')

  let url = finalUrl
  if (isNonEmptyString(canonicalHref)) {
    url = resolveUrl(canonicalHref, finalUrl)
  } else if (isNonEmptyString(ogUrl)) {
    url = resolveUrl(ogUrl, finalUrl)
  }

  // Icon: shortcut icon > icon > apple-touch-icon
  const shortcutIcon = $('link[rel="shortcut icon"]').attr('href')
  const iconLink = $('link[rel="icon"]').attr('href')
  const appleTouchIcon = $('link[rel="apple-touch-icon"]').attr('href')

  let icon: string | undefined
  if (isNonEmptyString(shortcutIcon)) {
    icon = shortcutIcon
  } else if (isNonEmptyString(iconLink)) {
    icon = iconLink
  } else if (isNonEmptyString(appleTouchIcon)) {
    icon = appleTouchIcon
  }

  if (icon !== undefined && !icon.startsWith('http')) {
    icon = new URL(icon, finalUrl).href
  }

  // Image: OG > Twitter
  const ogImage = $('meta[property="og:image"]').attr('content')
  const ogImageUrl = $('meta[property="og:image:url"]').attr('content')
  const twitterImage = $('meta[name="twitter:image"]').attr('content')
  const twitterImageSrc = $('meta[name="twitter:image:src"]').attr('content')

  let image: string | undefined
  if (isNonEmptyString(ogImage)) {
    image = resolveUrl(ogImage, finalUrl)
  } else if (isNonEmptyString(ogImageUrl)) {
    image = resolveUrl(ogImageUrl, finalUrl)
  } else if (isNonEmptyString(twitterImage)) {
    image = resolveUrl(twitterImage, finalUrl)
  } else if (isNonEmptyString(twitterImageSrc)) {
    image = resolveUrl(twitterImageSrc, finalUrl)
  }

  return { title, description, url, hostname, host, icon, image }
}

function resolveUrl (url: string, base: string): string {
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url
  }
  try {
    return new URL(url, base).href
  } catch {
    return base
  }
}

function isNonEmptyString (value: string | undefined | null): value is string {
  return value !== undefined && value !== null && value.length > 0
}

// ============================================================================
// Main Export
// ============================================================================

export async function parseLinkPreviewDetails (
  ctx: MeasureContext,
  config: Config,
  query: string
): Promise<LinkPreviewDetails> {
  const timeoutMs = config.TimeoutMs ?? DEFAULT_TIMEOUT_MS

  // Validate URL first (SSRF protection)
  const parsedUrl = validateUrl(query)

  // Fetch the page
  const response = await fetchWithTimeout(
    query,
    {
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': config.UserAgent
      }
    },
    timeoutMs
  )

  if (!response.ok) {
    throw new LinkPreviewError(`Failed to fetch URL: ${response.status} ${response.statusText}`)
  }

  // Check if response is an image
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.startsWith('image/')) {
    const size = await loadImageSize(ctx, query, config)
    return {
      url: query,
      image: query,
      host: `${parsedUrl.protocol}//${parsedUrl.host}`,
      hostname: parsedUrl.hostname,
      imageWidth: size?.width,
      imageHeight: size?.height
    }
  }

  // Parse HTML
  const rawBody = await response.arrayBuffer()
  const utf8Body = new TextDecoder('utf-8').decode(rawBody)
  const $utf8 = cheerio.load(utf8Body)

  const detectedCharset = parseCharset(response.headers, $utf8)
  const $ = detectedCharset === 'utf-8' ? $utf8 : cheerio.load(new TextDecoder(detectedCharset).decode(rawBody))

  const host = `${parsedUrl.protocol}//${parsedUrl.host}`

  // Try oEmbed first
  const oembedData = await fetchOEmbedData(ctx, $, query, timeoutMs)
  if (oembedData !== null) {
    const ogSiteName = $('meta[property="og:site_name"]').attr('content')
    const hostname = isNonEmptyString(ogSiteName) ? ogSiteName : parsedUrl.hostname
    ctx.info('using oEmbed data', { url: query })
    return convertOEmbedToPreview(oembedData, query, hostname, host)
  }

  // Fall back to Open Graph / meta tag parsing
  ctx.info('using Open Graph data', { url: query })
  const preview = parseOpenGraphData($, config, parsedUrl, query)

  // Get image dimensions if we have an image but no dimensions
  let imageWidth: number | undefined
  let imageHeight: number | undefined

  const ogWidth = $('meta[property="og:image:width"]').attr('content')
  const ogHeight = $('meta[property="og:image:height"]').attr('content')

  if (isNonEmptyString(ogWidth) && isNonEmptyString(ogHeight)) {
    const width = parseInt(ogWidth, 10)
    const height = parseInt(ogHeight, 10)
    if (!Number.isNaN(width) && !Number.isNaN(height) && width > 0 && height > 0) {
      imageWidth = width
      imageHeight = height
    }
  }

  if (preview.image !== undefined && imageWidth === undefined) {
    const size = await loadImageSize(ctx, preview.image, config)
    if (size !== undefined) {
      imageWidth = size.width
      imageHeight = size.height
    }
  }

  return {
    ...preview,
    charset: detectedCharset,
    imageWidth,
    imageHeight
  }
}

function oembedSchemeToRegex (scheme: string): RegExp {
  // Escape special regex characters except *
  const regex = scheme
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    // ** matches anything (including slashes)
    .replace(/\*\*/g, '.*')
    // * matches anything except slashes
    .replace(/\*/g, '[^/]*')

  return new RegExp(`^${regex}$`)
}
