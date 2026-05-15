//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Browser-side Gantt PNG/PDF export.
 *
 * The Gantt view is a CSS-grid composition of an HTML sidebar
 * (`GanttSidebar` — issue/milestone rows as `<div>`s) and an SVG canvas
 * (`<svg class="gantt-canvas">` — bars + arrows). Earlier versions of this
 * module serialised only the SVG, which produced PNGs containing only the
 * bar geometry without any of the row labels — effectively useless.
 *
 * The new pipeline rasterises the entire `.gantt-root` element (sidebar +
 * sticky header + canvas) via the `html2canvas` library, then either
 * `toBlob`s the result as PNG or feeds it into `jsPDF` for a proper PDF
 * download. Both libs are well-maintained MIT/BSD-licensed pure-browser
 * code.
 *
 * Bundle-size mitigation: both libs are pulled in via **dynamic
 * `import()`** so they only land in the user's browser when the export
 * button is actually clicked. The main tracker-resources bundle remains
 * unaffected; the export chunk is ~750 KB combined (~300 KB gzipped).
 *
 * Capture trick for sticky / scrolling layouts: html2canvas captures the
 * element as currently sized. Because the Gantt uses an internal vertical
 * scroller (`.gantt-scroller`) and a sticky horizontal proxy bar
 * (`.hscroll-inner` with `transform: translateX(...)`), we must
 * temporarily expand the scroller to its full content height and reset
 * the horizontal transforms before the snapshot, then restore everything
 * in a `finally` block so the user's view is unchanged even if rendering
 * throws.
 *
 * Limitations:
 *   - Custom CSS that html2canvas does not understand (some `mask-image`,
 *     advanced `filter` chains, `position: sticky` inside transformed
 *     ancestors) may render slightly differently from the live view.
 *   - Web fonts must be loaded before export — Huly's fonts are loaded
 *     at app startup so this is fine in practice.
 *   - Very tall Gantts may hit the browser's max-canvas-pixel limit
 *     (Chrome: 32 767 × 32 767, Safari: 4096 × 4096). For PDFs the
 *     output is scaled to fit A4 landscape so this is rarely a problem.
 */

export interface ExportOptions {
  /** Pixel scaling factor — 2 produces a retina-quality PNG. Defaults to devicePixelRatio. */
  scale?: number
  /** Background fill behind transparent areas. Defaults to white. */
  background?: string
  /** Suggested filename for the download. */
  filename?: string
}

/**
 * Snapshot of mutated inline styles so they can be restored. Each tuple
 * is `[element, property, originalValue]` — originalValue is empty string
 * when the property was not set inline before we touched it.
 */
type StyleSnapshot = Array<[HTMLElement, string, string]>

/**
 * Expand the Gantt root + scroller to their full content size so
 * html2canvas captures everything, not just the visible viewport.
 * Returns the list of style mutations for later restoration.
 */
function expandForCapture (root: HTMLElement): StyleSnapshot {
  const snapshot: StyleSnapshot = []
  const mutate = (el: HTMLElement, prop: string, next: string): void => {
    snapshot.push([el, prop, el.style.getPropertyValue(prop)])
    el.style.setProperty(prop, next)
  }

  // Root: remove any overflow clipping.
  mutate(root, 'overflow', 'visible')
  mutate(root, 'max-height', 'none')
  mutate(root, 'height', 'auto')

  // Internal vertical scroller must show all rows.
  const scroller = root.querySelector('.gantt-scroller') as HTMLElement | null
  if (scroller !== null) {
    mutate(scroller, 'overflow', 'visible')
    mutate(scroller, 'max-height', 'none')
    mutate(scroller, 'height', String(scroller.scrollHeight) + 'px')
  }

  // Horizontal proxy: reset the translateX so the chart is captured
  // from x=0 instead of from the user's current scroll position.
  const hscrollInner = root.querySelector('.hscroll-inner') as HTMLElement | null
  if (hscrollInner !== null) {
    mutate(hscrollInner, 'transform', 'translateX(0)')
  }

  // The header-cell wraps hscroll-inner and may clip overflow; unclip it
  // so the full time axis is rendered.
  root.querySelectorAll<HTMLElement>('.cell.header-cell').forEach((el) => {
    mutate(el, 'overflow', 'visible')
  })

  return snapshot
}

/** Restore every recorded mutation. Safe to call multiple times. */
function restoreSnapshot (snapshot: StyleSnapshot): void {
  for (const [el, prop, value] of snapshot) {
    if (value === '') {
      el.style.removeProperty(prop)
    } else {
      el.style.setProperty(prop, value)
    }
  }
}

/**
 * Rasterise a DOM element to an HTMLCanvasElement using html2canvas.
 * Dynamically imports the library so it stays out of the main bundle.
 */
async function rasteriseElement (el: HTMLElement, options: ExportOptions): Promise<HTMLCanvasElement> {
  const scale = options.scale ?? Math.max(1, Math.min(2, window.devicePixelRatio ?? 1))
  const background = options.background ?? '#ffffff'

  const mod = await import('html2canvas')
  const html2canvas = mod.default

  const snapshot = expandForCapture(el)
  try {
    const canvas = await html2canvas(el, {
      backgroundColor: background,
      scale,
      useCORS: true,
      logging: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight
    })
    return canvas
  } finally {
    restoreSnapshot(snapshot)
  }
}

/** Convert an HTMLCanvasElement to a PNG Blob. */
async function canvasToPngBlob (canvas: HTMLCanvasElement): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) reject(new Error('canvas.toBlob returned null'))
      else resolve(blob)
    }, 'image/png')
  })
}

/**
 * Rasterise a DOM element (typically the Gantt `.gantt-root`) to a PNG
 * Blob. Captures sidebar + header + canvas in a single image.
 */
export async function exportElementToPng (el: HTMLElement, options: ExportOptions = {}): Promise<Blob> {
  const canvas = await rasteriseElement(el, options)
  return await canvasToPngBlob(canvas)
}

/**
 * Trigger a browser download of the Blob as `<filename>.png`. Convenience
 * wrapper around URL.createObjectURL + `<a download>` click.
 */
export function downloadBlob (blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.png') ? filename : filename + '.png'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after the click event has time to fire.
  setTimeout(() => { URL.revokeObjectURL(url) }, 1000)
}

/** Convenience: render `el` to PNG and trigger a browser download. */
export async function exportElementAndDownloadPng (
  el: HTMLElement,
  filename: string = 'gantt-export',
  options: ExportOptions = {}
): Promise<void> {
  const blob = await exportElementToPng(el, options)
  downloadBlob(blob, filename)
}

/**
 * Render `el` to a PDF file and trigger a browser download. Uses jsPDF
 * via dynamic import. The PDF is landscape A4 with the chart scaled to
 * fit while preserving aspect ratio.
 *
 * The intermediate raster is encoded as JPEG (quality 0.95) rather than
 * PNG because charts compress dramatically better with JPEG (~5×
 * smaller files) and the quality loss is invisible on bar/line geometry.
 */
export async function exportElementToPdf (
  el: HTMLElement,
  filename: string = 'gantt-export',
  options: ExportOptions = {}
): Promise<void> {
  // High DPI for crisp PDF rendering — overrides default scale.
  const canvas = await rasteriseElement(el, { ...options, scale: options.scale ?? 2 })

  const mod = await import('jspdf')
  const JsPdfCtor = mod.jsPDF

  // A4 landscape in mm.
  const pageW = 297
  const pageH = 210
  // Margin in mm.
  const margin = 8
  const maxW = pageW - margin * 2
  const maxH = pageH - margin * 2

  // Fit canvas to page preserving aspect ratio.
  const aspect = canvas.width / canvas.height
  let w = maxW
  let h = maxW / aspect
  if (h > maxH) {
    h = maxH
    w = maxH * aspect
  }
  const x = (pageW - w) / 2
  const y = (pageH - h) / 2

  const pdf = new JsPdfCtor({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
  pdf.addImage(dataUrl, 'JPEG', x, y, w, h)
  pdf.save(filename.endsWith('.pdf') ? filename : filename + '.pdf')
}

// --- Deprecated SVG-only path -----------------------------------------------
//
// Kept for backward compatibility with any external callers; new code should
// use `exportElementToPng` / `exportElementToPdf` which capture the full
// sidebar+header+canvas composition.

/**
 * Serialise an SVG element into a stand-alone XML string with inline
 * computed styles.
 *
 * @deprecated Captures only SVG geometry; use `exportElementToPng` with
 *             `.gantt-root` instead so the sidebar/header are included.
 */
function serializeSvgWithInlineStyles (svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  inlineStyles(svg, clone)
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  if (!clone.getAttribute('xmlns:xlink')) clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  const bbox = svg.getBoundingClientRect()
  clone.setAttribute('width', String(bbox.width))
  clone.setAttribute('height', String(bbox.height))
  return new XMLSerializer().serializeToString(clone)
}

function inlineStyles (source: Element, clone: Element): void {
  const srcStyle = window.getComputedStyle(source)
  const cssText: string[] = []
  for (let i = 0; i < srcStyle.length; i++) {
    const name = srcStyle.item(i)
    const value = srcStyle.getPropertyValue(name)
    if (name.startsWith('font-') || name === 'fill' || name === 'stroke' || name === 'stroke-width' ||
        name === 'stroke-dasharray' || name === 'stroke-opacity' || name === 'fill-opacity' ||
        name === 'opacity' || name === 'color') {
      cssText.push(`${name}:${value}`)
    }
  }
  if (cssText.length > 0) {
    (clone as HTMLElement).setAttribute('style', cssText.join(';'))
  }
  for (let i = 0; i < source.children.length; i++) {
    if (clone.children[i] !== undefined) {
      inlineStyles(source.children[i], clone.children[i])
    }
  }
}

/**
 * Rasterise an SVG element to a PNG Blob.
 *
 * @deprecated Captures only the SVG layer (bars + arrows) without the
 *             sidebar row labels — the resulting image is rarely useful.
 *             Use `exportElementToPng(containerEl)` instead.
 */
export async function exportGanttSvgToPng (
  svg: SVGSVGElement,
  options: ExportOptions = {}
): Promise<Blob> {
  const scale = options.scale ?? Math.max(1, window.devicePixelRatio ?? 1)
  const background = options.background ?? '#ffffff'

  const xml = serializeSvgWithInlineStyles(svg)
  const bbox = svg.getBoundingClientRect()
  const width = Math.max(1, Math.round(bbox.width * scale))
  const height = Math.max(1, Math.round(bbox.height * scale))

  const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)))

  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => { resolve() }
    img.onerror = (e) => { reject(new Error(`SVG image load failed: ${String(e)}`)) }
    img.src = dataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('2D canvas context unavailable')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) reject(new Error('canvas.toBlob returned null'))
      else resolve(blob)
    }, 'image/png')
  })
}

/**
 * @deprecated Use `exportElementAndDownloadPng` with the gantt-root
 *             element instead — it captures sidebar + header + canvas.
 */
export async function exportAndDownload (
  svg: SVGSVGElement,
  filename: string = 'gantt-export',
  options: ExportOptions = {}
): Promise<void> {
  const blob = await exportGanttSvgToPng(svg, options)
  downloadBlob(blob, filename)
}
