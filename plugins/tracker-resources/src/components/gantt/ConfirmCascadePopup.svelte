<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { Button, Label } from '@hcengineering/ui'
  import type { Issue } from '@hcengineering/tracker'
  import type { PrimaryEdit, CascadeShift } from './lib/types'
  import { computeCascadeBodyHeight } from './lib/cascade-popup-layout'
  import tracker from '../../plugin'

  /**
   * PR4b cascade confirmation popup. Shows a mini-timeline with ghost
   * bars for pre-cascade positions and solid bars for the proposed new
   * positions. Reads as a Gantt-in-miniature so the user can spatially
   * verify the cascade before committing.
   */
  export let primary: PrimaryEdit[]
  export let shifts: CascadeShift[]
  export let skippedUnscheduled: number = 0
  export let lockedIssues: Issue[] = []

  const dispatch = createEventDispatcher<{ close: boolean }>()

  const DAY_MS = 86_400_000
  const ROW_HEIGHT = 22
  const LABEL_WIDTH = 220
  const LABEL_TEXT_PAD = 8
  const BAR_TOP_PADDING = 32
  // v121.2 — last bar bottom is `BAR_TOP_PADDING + (rows-1) * ROW_HEIGHT
  // + 4 (bar top offset) + 14 (bar height)` = svg_height - 4. Pair that
  // with the 4px top/bottom CSS padding of .body and the previous
  // bodyHeight clipped the bottom 8 px of the last row, so the lower
  // edge of the last bar disappeared (visible at 3 rows in the v121.1
  // test). Reserve that padding explicitly so the body fits without
  // a scrollbar in the typical N<10 case and only scrolls when needed.
  const BODY_VERTICAL_PADDING = 8
  const BODY_BOTTOM_SAFETY = 8
  const BODY_MAX_HEIGHT = 360
  const POPUP_WIDTH = 760

  type Row = {
    id: string
    label: string
    oldStart: number
    oldDue: number
    newStart: number
    newDue: number
    color: string
    role: 'primary' | 'push-successor' | 'pull-predecessor'
  }

  const COLOR_PRIMARY = '#6366f1'
  const COLOR_PUSH = '#f59e0b'
  const COLOR_PULL = '#8b5cf6'

  $: rows = buildRows(primary, shifts)
  // Title count: prefer cascade-shift count when there is one; otherwise
  // (parent-drag no-cascade case) fall back to the primary count so the
  // user sees "N issues will be shifted" reflecting the multi-issue move.
  $: titleCount = shifts.length > 0 ? shifts.length : primary.length
  $: dateRange = computeDateRange(rows)
  $: bodyHeight = computeCascadeBodyHeight({
    rowCount: rows.length,
    rowHeight: ROW_HEIGHT,
    barTopPadding: BAR_TOP_PADDING,
    bodyVerticalPadding: BODY_VERTICAL_PADDING,
    bodyBottomSafety: BODY_BOTTOM_SAFETY,
    bodyMaxHeight: BODY_MAX_HEIGHT
  })
  $: barAreaWidth = POPUP_WIDTH - LABEL_WIDTH - 32

  function labelFor (i: Issue): string {
    // Match the predecessor-column / sidebar rendering convention: prefix
    // with identifier (OSTRO-12) and append the title for human
    // disambiguation. CSS clip-path on the <text> element keeps it inside
    // the label column (LABEL_WIDTH), so the JS truncation here is just a
    // belt-and-braces fallback for cases where the user has very long
    // titles that would otherwise hammer the SVG layout engine.
    const identifier = (i as any).identifier as string | undefined
    const title = (i as any).title as string | undefined
    if (identifier !== undefined && title !== undefined) {
      const t = title.length > 28 ? title.slice(0, 27) + '…' : title
      return `${identifier} ${t}`
    }
    if (identifier !== undefined) return identifier
    if (title !== undefined) return title
    return String(i._id).slice(-6)
  }

  function buildRows (p: PrimaryEdit[], s: CascadeShift[]): Row[] {
    const out: Row[] = []
    for (const pe of p) {
      out.push({
        id: String(pe.issue._id),
        label: labelFor(pe.issue),
        oldStart: pe.issue.startDate ?? pe.newStart,
        oldDue: pe.issue.dueDate ?? pe.newDue,
        newStart: pe.newStart,
        newDue: pe.newDue,
        color: COLOR_PRIMARY,
        role: 'primary'
      })
    }
    for (const sh of s) {
      out.push({
        id: String(sh.issue._id),
        label: labelFor(sh.issue),
        oldStart: sh.oldStart,
        oldDue: sh.oldDue,
        newStart: sh.newStart,
        newDue: sh.newDue,
        color: sh.reason === 'push-successor' ? COLOR_PUSH : COLOR_PULL,
        role: sh.reason
      })
    }
    return out.sort((a, b) => a.newStart - b.newStart)
  }

  function computeDateRange (rs: Row[]): { min: number, max: number } {
    if (rs.length === 0) return { min: Date.now(), max: Date.now() + DAY_MS }
    let min = Infinity
    let max = -Infinity
    for (const r of rs) {
      min = Math.min(min, r.oldStart, r.newStart)
      max = Math.max(max, r.oldDue, r.newDue)
    }
    const padDays = 2
    return { min: min - padDays * DAY_MS, max: max + padDays * DAY_MS }
  }

  function xOf (t: number): number {
    const span = dateRange.max - dateRange.min
    if (span <= 0) return 0
    return ((t - dateRange.min) / span) * barAreaWidth
  }

  function fmtTick (t: number): string {
    return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  function ticks (): number[] {
    const span = dateRange.max - dateRange.min
    const count = 5
    const result: number[] = []
    for (let i = 0; i <= count; i++) {
      result.push(dateRange.min + (span * i) / count)
    }
    return result
  }

  function onConfirm (): void {
    if (lockedIssues.length > 0) return
    dispatch('close', true)
  }

  function onCancel (): void {
    dispatch('close', false)
  }

  function onKey (e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  let confirmWrapperEl: HTMLElement | undefined
  let cancelWrapperEl: HTMLElement | undefined

  onMount(() => {
    window.addEventListener('keydown', onKey)
    // Focus the actual <button> element inside the wrapper so Enter and
    // Space hit the click handler. Focusing the wrapper div alone has no
    // effect on keyboard activation. We bind on the wrapper because the
    // Button component doesn't forward `bind:this` to its inner element.
    if (lockedIssues.length === 0) {
      confirmWrapperEl?.querySelector('button')?.focus()
    } else {
      cancelWrapperEl?.querySelector('button')?.focus()
    }
    return () => window.removeEventListener('keydown', onKey)
  })
</script>

<div class="cascade-popup" style="width: {POPUP_WIDTH}px">
  <div class="header">
    <Label label={tracker.string.CascadeConfirmTitle} params={{ count: titleCount }} />
  </div>

  {#if primary.length > 1}
    <!-- Tier-2 Item 6 — surface the bulk-primary count above the
         skipped-unscheduled / locked-successor hints. The user sees at a
         glance that this commit moves N issues directly (in addition to
         any cascade shifts the timeline below shows). -->
    <div class="hint">
      <Label label={tracker.string.GanttBulkSelectedCount} params={{ count: primary.length }} />
    </div>
  {/if}

  {#if skippedUnscheduled > 0}
    <div class="hint">
      <Label label={tracker.string.CascadeSkippedUnscheduled} params={{ count: skippedUnscheduled }} />
    </div>
  {/if}

  {#if lockedIssues.length > 0}
    <div class="warning">
      <Label label={tracker.string.CascadeLockedSuccessors} params={{ count: lockedIssues.length }} />
    </div>
  {/if}

  <div class="body" style="max-height: {bodyHeight}px">
    <svg width={POPUP_WIDTH - 32} height={rows.length * ROW_HEIGHT + BAR_TOP_PADDING} class="timeline">
      <defs>
        <clipPath id="cascade-label-clip">
          <rect x="0" y="0" width={LABEL_WIDTH - LABEL_TEXT_PAD} height={rows.length * ROW_HEIGHT + BAR_TOP_PADDING} />
        </clipPath>
      </defs>

      {#each ticks() as t}
        <line
          x1={LABEL_WIDTH + xOf(t)}
          y1={BAR_TOP_PADDING - 4}
          x2={LABEL_WIDTH + xOf(t)}
          y2={rows.length * ROW_HEIGHT + BAR_TOP_PADDING}
          stroke="#e5e7eb"
          stroke-width="1"
        />
        <text
          x={LABEL_WIDTH + xOf(t)}
          y={BAR_TOP_PADDING - 8}
          text-anchor="middle"
          font-size="10"
          fill="#6b7280"
        >{fmtTick(t)}</text>
      {/each}

      <!-- Vertical separator between the label column and the timeline.
           Anchors the eye and prevents truncated labels from appearing to
           visually merge with the first ghost bar. -->
      <line
        x1={LABEL_WIDTH - 2}
        y1={BAR_TOP_PADDING - 4}
        x2={LABEL_WIDTH - 2}
        y2={rows.length * ROW_HEIGHT + BAR_TOP_PADDING}
        stroke="#cbd5e1"
        stroke-width="1"
      />

      {#each rows as row, idx}
        <text
          x={LABEL_TEXT_PAD / 2}
          y={BAR_TOP_PADDING + idx * ROW_HEIGHT + 14}
          font-size="11"
          fill="#374151"
          clip-path="url(#cascade-label-clip)"
        >{row.label}</text>
        <rect
          x={LABEL_WIDTH + xOf(row.oldStart)}
          y={BAR_TOP_PADDING + idx * ROW_HEIGHT + 4}
          width={Math.max(2, xOf(row.oldDue) - xOf(row.oldStart))}
          height={14}
          fill={row.color}
          fill-opacity={0.35}
          rx="2"
        />
        <rect
          x={LABEL_WIDTH + xOf(row.newStart)}
          y={BAR_TOP_PADDING + idx * ROW_HEIGHT + 4}
          width={Math.max(2, xOf(row.newDue) - xOf(row.newStart))}
          height={14}
          fill={row.color}
          rx="2"
        />
      {/each}
    </svg>
  </div>

  <!-- Color legend: explains the role-color (indigo/amber/violet) and the
       old/new shading. Placed between body and footer so the user sees it
       without scrolling. -->
  <div class="legend">
    <div class="legend-section">
      <span class="legend-swatch primary"></span>
      <Label label={tracker.string.CascadeLegendPrimary} />
      <span class="legend-swatch push"></span>
      <Label label={tracker.string.CascadeLegendPush} />
      <span class="legend-swatch pull"></span>
      <Label label={tracker.string.CascadeLegendPull} />
    </div>
    <div class="legend-section">
      <span class="legend-pair">
        <span class="legend-swatch sample old"></span>
        <span class="legend-swatch sample new"></span>
      </span>
      <Label label={tracker.string.CascadeLegendOldNew} />
    </div>
  </div>

  <div class="footer">
    <div bind:this={cancelWrapperEl}>
      <Button
        label={tracker.string.CascadeConfirmCancel}
        kind="ghost"
        on:click={onCancel}
      />
    </div>
    <div bind:this={confirmWrapperEl}>
      <Button
        label={tracker.string.CascadeConfirmConfirm}
        kind="primary"
        disabled={lockedIssues.length > 0}
        on:click={onConfirm}
      />
    </div>
  </div>
</div>

<style lang="scss">
  .cascade-popup {
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 8px;
    box-shadow: var(--theme-popup-shadow);
    color: var(--theme-content-color);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .header {
    padding: 14px 16px 8px;
    font-weight: 600;
    border-bottom: 1px solid var(--theme-popup-divider);
  }
  .hint, .warning {
    padding: 8px 16px;
    font-size: 12px;
  }
  .hint { color: var(--theme-content-trans-color); }
  .warning {
    background: var(--theme-warning-color, #fef2f2);
    color: var(--theme-error-color, #b91c1c);
  }
  .body {
    overflow-y: auto;
    overflow-x: hidden;
    padding: 4px 16px;
  }
  .timeline { display: block; }
  .legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
    padding: 8px 16px;
    font-size: 11px;
    color: var(--theme-content-trans-color);
    border-top: 1px solid var(--theme-popup-divider);
  }
  .legend-section {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .legend-swatch {
    display: inline-block;
    width: 12px;
    height: 10px;
    border-radius: 2px;
    margin-right: 2px;
    vertical-align: middle;
  }
  .legend-swatch.primary { background: #6366f1; }
  .legend-swatch.push { background: #f59e0b; }
  .legend-swatch.pull { background: #8b5cf6; }
  .legend-pair {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }
  .legend-swatch.sample.old {
    background: #6b7280;
    opacity: 0.35;
  }
  .legend-swatch.sample.new {
    background: #6b7280;
    opacity: 1;
  }
  .footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--theme-popup-divider);
  }
</style>
