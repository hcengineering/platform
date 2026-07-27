//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { buildGanttExportSvg, type GanttExportInput } from './export-renderer'

/**
 * Browser-side Gantt PNG/PDF export.
 *
 * The export does not screenshot the live DOM. `buildGanttExportSvg`
 * (see `export-renderer.ts`) re-renders the chart from the same row/bar model
 * the view uses into a stand-alone SVG string — sidebar labels, time axis, bars
 * and dependency arrows included. That SVG is then:
 *
 *   - PNG: drawn onto an offscreen `<canvas>` through an `Image` at 2× scale
 *     and handed to `canvas.toBlob()`,
 *   - PDF: the same chart, but paginated — the time axis (and, for tall
 *     projects, the issue list) is split into a grid of bounded page tiles, each
 *     rasterised on its own and embedded by `jsPDF` as one page. A small Gantt
 *     stays a single page; a large one no longer overruns jsPDF's 14400
 *     UserUnit page limit or the browser's ~32767 px canvas ceiling. The result
 *     is a real file download, not a browser print dialog.
 *
 * Rendering from the model rather than the DOM keeps the output independent of
 * the user's scroll position, of virtualised rows that are not currently
 * mounted, and of CSS a DOM rasteriser would have to re-implement.
 *
 * `jsPDF` is the only export-only dependency and is pulled in via a dynamic
 * `import()`, so it lands in the browser when the PDF button is clicked and
 * never in the main tracker-resources bundle.
 *
 * Limitations:
 *   - Web fonts must be loaded before export — Huly loads its fonts at app
 *     startup, so this holds in practice.
 *   - PNG is still a single raster, so a very large PNG export can hit the
 *     browser's maximum canvas size (Chrome: 32 767 px per axis, Safari:
 *     4096 px). PDF is immune: it tiles the chart into bounded pages.
 */

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
 * Trigger a browser download of the Blob under `filename`. Convenience
 * wrapper around URL.createObjectURL + `<a download>` click.
 */
function downloadBlob (blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after the click event has time to fire.
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}

function svgSize (svg: string): { width: number, height: number } {
  const width = Number(svg.match(/\bwidth="(\d+(?:\.\d+)?)"/)?.[1] ?? 1)
  const height = Number(svg.match(/\bheight="(\d+(?:\.\d+)?)"/)?.[1] ?? 1)
  return { width, height }
}

async function svgToPngBlob (svg: string, scale = 2): Promise<Blob> {
  const { width, height } = svgSize(svg)
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        resolve()
      }
      img.onerror = () => {
        reject(new Error('Could not render Gantt export SVG'))
      }
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.ceil(width * scale))
    canvas.height = Math.max(1, Math.ceil(height * scale))
    const ctx = canvas.getContext('2d')
    if (ctx === null) throw new Error('2D canvas context unavailable')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await canvasToPngBlob(canvas)
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function blobToDataUrl (blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(String(reader.result))
    }
    reader.onerror = () => {
      reject(reader.error ?? new Error('Could not read export image'))
    }
    reader.readAsDataURL(blob)
  })
}

export async function exportGanttDataToPng (input: GanttExportInput, filename: string = 'gantt-export'): Promise<void> {
  const svg = buildGanttExportSvg(input)
  const blob = await svgToPngBlob(svg, 2)
  downloadBlob(blob, filename.endsWith('.png') ? filename : filename + '.png')
}

// PDF geometry. 1 CSS px ≈ 0.75 pt keeps the exported issue list and bars at a
// legible size instead of being squeezed to a single A4 sheet.
const PT_PER_PX = 0.75
// Raster oversampling for small charts — 2× keeps text/bars crisp (~190 DPI at
// PT_PER_PX). Wide charts are capped below (`MAX_CANVAS_DIM`) so the single
// source raster still fits the browser's canvas ceiling.
const PDF_RASTER_SCALE = 2
// Upper bound on either axis of the ONE source canvas the chart is rasterised
// into. A real project's Gantt spans tens of thousands of px on the time axis;
// the old code rasterised it at 2× straight into a >64000 px canvas and embedded
// that as one page — which overran two hard ceilings at once (jsPDF's 14400
// UserUnit page limit and the browser's ~32767 px canvas dimension), so the
// export both produced a truncated raster and stalled ~20 s re-encoding the huge
// PNG. Capping the source raster keeps it inside the browser ceiling (and lets
// the whole width render instead of being clipped); the PDF is then tiled from
// that one raster with cheap canvas blits, so there is a single parse+render.
const MAX_CANVAS_DIM = 30000
// Maximum CSS-px extent of one PDF page tile → ≤6000 pt/page, well under jsPDF's
// 14400 limit. A small Gantt is a single tile, i.e. one page.
const PDF_TILE_PX = 8000

/** Rasterise an export SVG into a single offscreen canvas at `scale`. */
async function renderSvgToCanvas (
  svg: string,
  width: number,
  height: number,
  scale: number
): Promise<HTMLCanvasElement> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        resolve()
      }
      img.onerror = () => {
        reject(new Error('Could not render Gantt export SVG'))
      }
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.ceil(width * scale))
    canvas.height = Math.max(1, Math.ceil(height * scale))
    const ctx = canvas.getContext('2d')
    if (ctx === null) throw new Error('2D canvas context unavailable')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function exportGanttDataToPdf (input: GanttExportInput, filename: string = 'gantt-export'): Promise<void> {
  const svg = buildGanttExportSvg(input)
  const { width, height } = svgSize(svg)
  const mod = await import('jspdf')
  const JsPdfCtor = mod.jsPDF

  // Rasterise the whole chart exactly once, at the highest scale that keeps both
  // canvas axes under the browser ceiling. Small charts get the full 2×; a very
  // wide one is scaled down so it fits (and renders un-clipped) rather than
  // failing. Everything below tiles THIS canvas — no second render.
  const scale = Math.max(0.1, Math.min(PDF_RASTER_SCALE, MAX_CANVAS_DIM / width, MAX_CANVAS_DIM / height))
  const source = await renderSvgToCanvas(svg, width, height, scale)

  // Tile the source canvas into bounded PDF pages via cheap canvas→canvas blits.
  // Columns walk the time axis, rows the issue list.
  const tileSrcPx = Math.max(1, Math.floor(PDF_TILE_PX * scale))
  const cols = Math.max(1, Math.ceil(source.width / tileSrcPx))
  const rows = Math.max(1, Math.ceil(source.height / tileSrcPx))

  const tileCanvas = document.createElement('canvas')
  const tctx = tileCanvas.getContext('2d')
  if (tctx === null) throw new Error('2D canvas context unavailable')

  let pdf: InstanceType<typeof JsPdfCtor> | undefined
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = c * tileSrcPx
      const sy = r * tileSrcPx
      const sw = Math.min(tileSrcPx, source.width - sx)
      const sh = Math.min(tileSrcPx, source.height - sy)

      tileCanvas.width = sw
      tileCanvas.height = sh
      tctx.fillStyle = '#ffffff'
      tctx.fillRect(0, 0, sw, sh)
      tctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)
      const dataUrl = await blobToDataUrl(await canvasToPngBlob(tileCanvas))

      // Page size in pt: source px back to CSS px (÷ scale), then × PT_PER_PX.
      const pageW = Math.max(1, (sw / scale) * PT_PER_PX)
      const pageH = Math.max(1, (sh / scale) * PT_PER_PX)
      const orientation = pageW >= pageH ? 'landscape' : 'portrait'
      if (pdf === undefined) {
        pdf = new JsPdfCtor({ orientation, unit: 'pt', format: [pageW, pageH], compress: true })
      } else {
        pdf.addPage([pageW, pageH], orientation)
      }
      // 'FAST' keeps jsPDF from re-deflating the PNG stream — the difference
      // between a snappy export and the multi-second stall the old single huge
      // image caused.
      pdf.addImage(dataUrl, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST')
    }
  }
  if (pdf === undefined) return

  // Deliver the PDF through the same `<a download>` path as PNG (jsPDF's own
  // `output('blob')` returns a Blob) instead of `pdf.save()`. `save()` reaches
  // the same result in a normal browser, but its internal write path does not
  // reliably raise a `download` event in headless Chromium, so routing both
  // formats through `downloadBlob` keeps the export mechanism consistent and
  // observable.
  downloadBlob(pdf.output('blob'), filename.endsWith('.pdf') ? filename : filename + '.pdf')
}
