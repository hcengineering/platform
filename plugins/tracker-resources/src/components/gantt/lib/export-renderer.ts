//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Issue, IssueRelation } from '@hcengineering/tracker'
import { anchorOf, arrowheadPoints, bezierPath, endpointPx, type BarRect } from './dependency-router'
import { kindCode, signedLag } from './predecessor-format'
import type { TimeScale } from './time-scale'
import type { LayoutRow, SummaryRange } from './types'

const SIDEBAR_WIDTH = 360
const HEADER_HEIGHT = 64
const BAR_HEIGHT = 16
const LEFT_PAD = 14
const CHART_PAD_RIGHT = 24

export interface GanttExportInput {
  rows: LayoutRow[]
  relations: IssueRelation[]
  summaryRanges: Map<string, SummaryRange>
  timeScale: TimeScale
  range: [number, number]
  chartWidth: number
  title?: string
}

function esc (s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function issueCode (issue: Issue): string {
  return (issue as unknown as { identifier?: string }).identifier ?? String(issue._id)
}

function issueTitle (issue: Issue): string {
  return (issue as unknown as { title?: string }).title ?? ''
}

function rowBottom (rows: LayoutRow[]): number {
  let bottom = 0
  for (const r of rows) bottom = Math.max(bottom, r.y + r.height)
  return bottom
}

function barRange (row: LayoutRow, summaryRanges: Map<string, SummaryRange>): { start: number, end: number } | null {
  if (row.kind === 'milestone' && row.milestone !== null) {
    return { start: row.milestone.startDate ?? row.milestone.targetDate, end: row.milestone.targetDate }
  }
  if (row.issue === null) return null
  if (row.isSummary) {
    const summary = summaryRanges.get(String(row.issue._id)) ?? summaryRanges.get(row.id)
    if (summary?.startDate != null && summary.dueDate != null) return { start: summary.startDate, end: summary.dueDate }
  }
  if (row.issue.startDate == null || row.issue.dueDate == null) return null
  return { start: row.issue.startDate, end: row.issue.dueDate }
}

function renderIssueList (rows: LayoutRow[]): string {
  const out: string[] = []
  out.push(`<rect x="0" y="0" width="${SIDEBAR_WIDTH}" height="${HEADER_HEIGHT + rowBottom(rows)}" fill="#f8fafc"/>`)
  out.push(`<text x="${LEFT_PAD}" y="25" font-size="14" font-weight="700" fill="#0f172a">Issues</text>`)
  for (const row of rows) {
    const y = HEADER_HEIGHT + row.y
    out.push(`<line x1="0" y1="${y + row.height}" x2="${SIDEBAR_WIDTH}" y2="${y + row.height}" stroke="#e2e8f0"/>`)
    if (row.kind === 'group-header') {
      out.push(`<rect x="0" y="${y}" width="${SIDEBAR_WIDTH}" height="${row.height}" fill="#e2e8f0"/>`)
      out.push(`<text x="${LEFT_PAD}" y="${y + 20}" font-size="12" font-weight="700" fill="#334155">${esc(row.groupLabel ?? row.id)} ${row.groupCount ?? ''}</text>`)
      continue
    }
    if (row.kind === 'milestone' && row.milestone !== null) {
      out.push(`<text x="${LEFT_PAD + row.depth * 18}" y="${y + 23}" font-size="12" fill="#475569">◆ ${esc(row.milestone.label)}</text>`)
      continue
    }
    if (row.issue !== null) {
      const x = LEFT_PAD + row.depth * 18
      const code = issueCode(row.issue)
      const title = issueTitle(row.issue)
      out.push(`<text x="${x}" y="${y + 15}" font-size="11" font-weight="700" fill="#0f172a">${esc(code)}</text>`)
      out.push(`<text x="${x}" y="${y + 30}" font-size="11" fill="#334155">${esc(title)}</text>`)
    }
  }
  out.push(`<line x1="${SIDEBAR_WIDTH}" y1="0" x2="${SIDEBAR_WIDTH}" y2="${HEADER_HEIGHT + rowBottom(rows)}" stroke="#cbd5e1"/>`)
  return out.join('')
}

function renderHeader (input: GanttExportInput, chartWidth: number): string {
  const out: string[] = []
  out.push(`<rect class="chart-bg" x="${SIDEBAR_WIDTH}" y="0" width="${chartWidth}" height="${HEADER_HEIGHT}" fill="#ffffff"/>`)
  for (const tick of input.timeScale.ticks(input.range)) {
    const x = SIDEBAR_WIDTH + input.timeScale.toX(tick.date)
    if (x < SIDEBAR_WIDTH - 1 || x > SIDEBAR_WIDTH + chartWidth + 1) continue
    const stroke = tick.level === 'major' ? '#cbd5e1' : '#e2e8f0'
    out.push(`<line x1="${x}" y1="0" x2="${x}" y2="${HEADER_HEIGHT + rowBottom(input.rows)}" stroke="${stroke}"/>`)
    if (tick.secondaryLabel != null) {
      out.push(`<text x="${x + 4}" y="18" font-size="11" font-weight="700" fill="#334155">${esc(tick.secondaryLabel)}</text>`)
    }
    out.push(`<text x="${x + 4}" y="42" font-size="10" fill="#475569">${esc(tick.label)}</text>`)
  }
  if (input.title != null && input.title !== '') {
    out.push(`<text x="${SIDEBAR_WIDTH + 10}" y="60" font-size="11" fill="#64748b">${esc(input.title)}</text>`)
  }
  return out.join('')
}

function renderRowsAndBars (input: GanttExportInput): { svg: string, rects: Map<string, BarRect> } {
  const out: string[] = []
  const rects = new Map<string, BarRect>()
  for (const row of input.rows) {
    const y = HEADER_HEIGHT + row.y
    const fill = row.kind === 'group-header' ? '#f1f5f9' : row.y % 72 === 0 ? '#ffffff' : '#fbfdff'
    out.push(`<rect x="${SIDEBAR_WIDTH}" y="${y}" width="${input.chartWidth}" height="${row.height}" fill="${fill}"/>`)
    out.push(`<line x1="${SIDEBAR_WIDTH}" y1="${y + row.height}" x2="${SIDEBAR_WIDTH + input.chartWidth}" y2="${y + row.height}" stroke="#e2e8f0"/>`)
    const range = barRange(row, input.summaryRanges)
    if (range === null) continue
    const x = SIDEBAR_WIDTH + input.timeScale.toX(range.start)
    const right = SIDEBAR_WIDTH + input.timeScale.toX(range.end)
    const w = Math.max(4, right - x)
    const barY = y + Math.max(4, (row.height - BAR_HEIGHT) / 2)
    if (row.kind === 'milestone') {
      const cx = SIDEBAR_WIDTH + input.timeScale.toX(range.end)
      const cy = y + row.height / 2
      out.push(`<polygon points="${cx},${cy - 7} ${cx + 7},${cy} ${cx},${cy + 7} ${cx - 7},${cy}" fill="#7c3aed" stroke="#5b21b6"/>`)
      continue
    }
    const color = row.isSummary ? '#334155' : '#2563eb'
    out.push(`<rect x="${x}" y="${barY}" width="${w}" height="${BAR_HEIGHT}" rx="3" fill="${color}" stroke="#1e40af"/>`)
    if (row.issue !== null) {
      const label = esc(issueCode(row.issue))
      out.push(`<text x="${x + 5}" y="${barY + 12}" font-size="10" fill="#ffffff">${label}</text>`)
      rects.set(String(row.issue._id), { left: x, right: x + w, top: barY, bottom: barY + BAR_HEIGHT })
    }
  }
  return { svg: out.join(''), rects }
}

function renderDependencies (relations: IssueRelation[], rects: Map<string, BarRect>): string {
  const out: string[] = []
  for (const rel of relations) {
    const source = rects.get(String(rel.attachedTo))
    const target = rects.get(String(rel.target))
    if (source === undefined || target === undefined) continue
    const p1 = endpointPx(source, anchorOf(rel.kind, 'source'))
    const p2 = endpointPx(target, anchorOf(rel.kind, 'target'))
    const path = bezierPath(p1, p2)
    const tri = arrowheadPoints(p1, p2).map(p => `${p.x},${p.y}`).join(' ')
    const lag = signedLag(rel.lag)
    out.push(`<g class="dependency"><path d="${path}" fill="none" stroke="#64748b" stroke-width="1.5"/><polygon points="${tri}" fill="#64748b"/>`)
    if (lag !== '') {
      out.push(`<text x="${(p1.x + p2.x) / 2}" y="${(p1.y + p2.y) / 2 - 4}" font-size="10" fill="#475569">${kindCode(rel.kind)}${esc(lag)}</text>`)
    }
    out.push('</g>')
  }
  return out.join('')
}

export function buildGanttExportSvg (input: GanttExportInput): string {
  const chartWidth = Math.max(1, Math.ceil(input.chartWidth + CHART_PAD_RIGHT))
  const height = HEADER_HEIGHT + rowBottom(input.rows)
  const width = SIDEBAR_WIDTH + chartWidth
  const body = renderRowsAndBars({ ...input, chartWidth })
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<style>text{font-family:Inter,Arial,sans-serif}.dependency{pointer-events:none}</style>',
    `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>`,
    renderIssueList(input.rows),
    renderHeader({ ...input, chartWidth }, chartWidth),
    body.svg,
    renderDependencies(input.relations, body.rects),
    '</svg>'
  ].join('')
}
