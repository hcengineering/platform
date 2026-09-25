// Copyright © 2026 Huly Contributors. Licensed under the Eclipse Public License, Version 2.0.

export const defaultIdentityColor = '#64748b'

/** @public */
export function normalizeIdentityColor (value?: string | null): string | undefined {
  if (typeof value !== 'string') return undefined
  const color = value.trim().toLowerCase()
  return /^#[0-9a-f]{6}$/.test(color) ? color : undefined
}

/** Mix visible pixels in linear RGB. Transparent padding contributes no colour. @public */
export function mixLogoColor (pixels: Uint8ClampedArray): string {
  const total = [0, 0, 0]
  let weight = 0
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255
    weight += alpha
    for (let channel = 0; channel < 3; channel++) {
      const srgb = pixels[i + channel] / 255
      total[channel] += (srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4) * alpha
    }
  }
  if (weight === 0) return defaultIdentityColor
  return '#' + total.map((sum) => {
    const linear = sum / weight
    const srgb = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055
    return Math.round(Math.max(0, Math.min(1, srgb)) * 255).toString(16).padStart(2, '0')
  }).join('')
}

/** @public */
export interface WorkspaceIdentityImage {
  color: string
  favicon?: string
}

/** @public */
export interface WorkspaceFaviconOptions {
  syncLogo: boolean
  showColor: boolean
  defaultIconUrl?: string
}

const originalIcons = new WeakMap<Document, HTMLLinkElement[]>()
const cacheRevisions = new WeakMap<Document, number>()
const faviconCachePrefix = 'huly.workspace-favicon:'

function faviconCacheKey (ownerDocument: Document): string | undefined {
  const workspace = ownerDocument.location?.pathname.match(/^\/workbench\/[^/]+/)
  return workspace != null ? faviconCachePrefix + workspace[0] : undefined
}

function readCachedFavicon (ownerDocument: Document, key?: string): string | undefined {
  try {
    const icon = key === undefined ? null : ownerDocument.defaultView?.localStorage.getItem(key)
    if (icon != null && icon.length <= 16384 && /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(icon)) return icon
  } catch {
    // Storage denial must not prevent normal favicon updates.
  }
}

function cacheFavicon (ownerDocument: Document, key: string | undefined, icon?: string): void {
  if (key === undefined) return
  try {
    const storage = ownerDocument.defaultView?.localStorage
    if (icon === undefined) storage?.removeItem(key)
    else if (icon.length <= 16384) storage?.setItem(key, icon)
  } catch {
    // Quota exhaustion must not prevent normal favicon updates.
  }
}

/** Remove local workspace artwork when signing out of this browser. @public */
export function clearWorkspaceFaviconCache (ownerDocument: Document = document): void {
  // Invalidate in-flight updates so they cannot repopulate the cache after logout.
  cacheRevisions.set(ownerDocument, (cacheRevisions.get(ownerDocument) ?? 0) + 1)
  try {
    const storage = ownerDocument.defaultView?.localStorage
    if (storage === undefined) return
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i)
      if (key?.startsWith(faviconCachePrefix) === true) storage.removeItem(key)
    }
  } catch {
    // Signing out must also work when storage is unavailable.
  }
}

function getOriginalIcons (ownerDocument: Document): HTMLLinkElement[] {
  let icons = originalIcons.get(ownerDocument)
  if (icons === undefined) {
    icons = Array.from(ownerDocument.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]:not(#workspace-favicon)'))
      .map((icon) => {
        // The initial page keeps fallback icons inert while a cached workspace icon is visible.
        if (icon.dataset.defaultHref === undefined) return icon
        const original = icon.cloneNode(true) as HTMLLinkElement
        original.href = new URL(icon.dataset.defaultHref, ownerDocument.baseURI).href
        delete original.dataset.defaultHref
        return original
      })
    originalIcons.set(ownerDocument, icons)
  }
  return icons
}

/** Resolve the site's icon even while the workspace favicon owns the head links. @public */
export function getDefaultWorkspaceFaviconUrl (ownerDocument: Document = document): string {
  const icons = getOriginalIcons(ownerDocument)
  return icons[icons.length - 1]?.href ?? new URL('/favicon.ico', ownerDocument.baseURI).href
}

async function decodeIcon (url: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Unable to load icon')
  const objectUrl = URL.createObjectURL(await response.blob())
  try {
    const image = new Image()
    image.src = objectUrl
    await image.decode()
    signal?.throwIfAborted()
    return image
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** Decode a logo once, without changing the stored asset. @public */
export async function renderWorkspaceIdentity (
  logoUrl?: string,
  manualColor?: string | null,
  signal?: AbortSignal,
  options: WorkspaceFaviconOptions = { syncLogo: true, showColor: true }
): Promise<WorkspaceIdentityImage> {
  const override = normalizeIdentityColor(manualColor)
  let color = override ?? defaultIdentityColor
  if (!options.syncLogo && !options.showColor) return { color }
  let logo: HTMLImageElement | undefined
  if (logoUrl !== undefined && (options.syncLogo || (options.showColor && override === undefined))) {
    try {
      logo = await decodeIcon(logoUrl, signal)
    } catch {
      signal?.throwIfAborted()
      // A removed/unavailable workspace logo falls back to the original site icon.
    }
  }
  if (logo !== undefined && options.showColor && override === undefined) {
    const sample = document.createElement('canvas')
    const ratio = Math.min(64 / logo.naturalWidth, 64 / logo.naturalHeight)
    sample.width = Math.max(1, Math.round(logo.naturalWidth * ratio))
    sample.height = Math.max(1, Math.round(logo.naturalHeight * ratio))
    const sampleContext = sample.getContext('2d', { willReadFrequently: true })
    if (sampleContext === null) throw new Error('Canvas is unavailable')
    sampleContext.drawImage(logo, 0, 0, sample.width, sample.height)
    color = mixLogoColor(sampleContext.getImageData(0, 0, sample.width, sample.height).data)
  }
  let image = options.syncLogo ? logo : undefined
  if (image === undefined) {
    if (!options.showColor || options.defaultIconUrl === undefined) return { color }
    image = await decodeIcon(options.defaultIconUrl, signal)
  }
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  const context = canvas.getContext('2d')
  if (context === null) throw new Error('Canvas is unavailable')
  // Keep the full favicon footprint; the badge overlays the artwork without reserving space.
  const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight)
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale
  context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
  if (options.showColor) {
    // Cut a transparent arc around the marker so the browser's own background separates it from the logo.
    context.save()
    context.globalCompositeOperation = 'destination-out'
    context.beginPath()
    context.arc(25, 25, 7, 0, Math.PI * 2)
    context.fill()
    context.restore()
    context.beginPath()
    context.arc(25, 25, 4.75, 0, Math.PI * 2)
    context.fillStyle = color
    context.fill()
  }
  return { color, favicon: canvas.toDataURL('image/png') }
}

/** Own favicon links only; preserve touch icons/manifest and restore on disposal. @public */
export function createWorkspaceFavicon (ownerDocument: Document = document): {
  update: (logoUrl?: string, color?: string | null, options?: WorkspaceFaviconOptions) => Promise<void>
  dispose: () => void
} {
  const defaults = getOriginalIcons(ownerDocument)
  const cacheKey = faviconCacheKey(ownerDocument)
  const cacheRevision = cacheRevisions.get(ownerDocument) ?? 0
  const link = ownerDocument.querySelector<HTMLLinkElement>('link#workspace-favicon') ?? ownerDocument.createElement('link')
  link.rel = 'icon'
  link.type = 'image/png'
  link.sizes.value = '32x32'
  link.id = 'workspace-favicon'
  let revision = 0
  let disposed = false
  let request: AbortController | undefined
  function removeDefaultLinks (): void {
    for (const icon of ownerDocument.head.querySelectorAll('link[rel~="icon"]:not(#workspace-favicon)')) icon.remove()
  }
  function restore (): void {
    link.remove()
    removeDefaultLinks()
    for (const original of defaults) {
      if (!original.isConnected) ownerDocument.head.appendChild(original)
    }
  }
  const cached = readCachedFavicon(ownerDocument, cacheKey)
  if (!link.isConnected && cached !== undefined) {
    link.href = cached
    removeDefaultLinks()
    ownerDocument.head.appendChild(link)
  }
  return {
    async update (logoUrl, color, options) {
      if (disposed || cacheRevision !== (cacheRevisions.get(ownerDocument) ?? 0)) return
      const current = ++revision
      request?.abort()
      request = new AbortController()
      try {
        const result = await renderWorkspaceIdentity(logoUrl, color, request.signal,
          options === undefined ? undefined : { ...options, defaultIconUrl: getDefaultWorkspaceFaviconUrl(ownerDocument) })
        if (disposed || current !== revision || faviconCacheKey(ownerDocument) !== cacheKey) return
        if (cacheRevision !== (cacheRevisions.get(ownerDocument) ?? 0)) return
        if (result.favicon === undefined) {
          cacheFavicon(ownerDocument, cacheKey)
          restore()
          return
        }
        link.href = result.favicon
        cacheFavicon(ownerDocument, cacheKey, result.favicon)
        removeDefaultLinks()
        if (!link.isConnected) ownerDocument.head.appendChild(link)
      } catch {
        // A transient load failure must not erase a valid icon restored during startup.
        if (!disposed && current === revision && !link.isConnected) restore()
      }
    },
    dispose () {
      disposed = true
      revision++
      request?.abort()
      restore()
    }
  }
}
