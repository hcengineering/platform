//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Browser-side Gantt SVG → PNG export.
 *
 * The Gantt view renders into an `<svg class="gantt-canvas">` overlaid on
 * the sidebar (`<div class="sidebar-rows">`). Server-side rasterization
 * would require headless Chromium; we instead serialize the live SVG,
 * apply inline computed styles (so theme colours and fonts survive
 * outside the document's `<style>` cascade), draw it to an HTMLCanvas at
 * the user's chosen device-pixel-ratio scale, and `toBlob()` the result
 * as PNG. The whole pipeline is synchronous-ish (one image.onload await)
 * and runs entirely in the user's browser — no upload, no extra round-trip.
 *
 * Limitations:
 *   - SVG `<foreignObject>` content (rare in Gantt) is rasterised by the
 *     browser using its own font fallbacks; results may differ slightly
 *     from the on-screen rendering.
 *   - Custom CSS that targets pseudo-elements (`::before`, `::after`) is
 *     not serialized — Huly's Gantt does not use them.
 */

export interface ExportOptions {
  /** Pixel scaling factor — 2 produces a retina-quality PNG. Defaults to devicePixelRatio. */
  scale?: number
  /** Background fill behind transparent SVG areas. Defaults to white. */
  background?: string
  /** Suggested filename for the download. */
  filename?: string
}

/**
 * Serialise an SVG element into a stand-alone XML string with inline
 * computed styles. Required because the browser renders the SVG from
 * its CSS context; once dumped to an `<img>` source the original
 * stylesheet is gone.
 */
function serializeSvgWithInlineStyles (svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  inlineStyles(svg, clone)
  // Ensure the namespace is present — required for `<img src="data:..."` rasterization.
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  if (!clone.getAttribute('xmlns:xlink')) clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  // Set explicit width/height so the rasteriser knows the dimensions.
  const bbox = svg.getBoundingClientRect()
  clone.setAttribute('width', String(bbox.width))
  clone.setAttribute('height', String(bbox.height))
  return new XMLSerializer().serializeToString(clone)
}

/** Walks source + clone in parallel, copying computed styles into the clone. */
function inlineStyles (source: Element, clone: Element): void {
  const srcStyle = window.getComputedStyle(source)
  const cssText: string[] = []
  for (let i = 0; i < srcStyle.length; i++) {
    const name = srcStyle.item(i)
    const value = srcStyle.getPropertyValue(name)
    // Skip layout-only properties that don't affect SVG rendering.
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
 * Implementation: serialize → `<img src="data:image/svg+xml;base64,...">` →
 * `<canvas>.drawImage()` → `toBlob('image/png')`. Each step is well-supported
 * since Chrome 60 / Firefox 56 / Safari 11.
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

/** Convenience: export the named SVG to PNG and trigger a browser download. */
export async function exportAndDownload (
  svg: SVGSVGElement,
  filename: string = 'gantt-export',
  options: ExportOptions = {}
): Promise<void> {
  const blob = await exportGanttSvgToPng(svg, options)
  downloadBlob(blob, filename)
}
