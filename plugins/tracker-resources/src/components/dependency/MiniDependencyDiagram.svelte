<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { translate } from '@hcengineering/platform'
  import { themeStore } from '@hcengineering/ui'
  import type { IntlString } from '@hcengineering/platform'
  import tracker from '../../plugin'
  import {
    type DiagramKindCode,
    getDiagramSvgPaths
  } from './diagram-helpers'

  /**
   * One of the four mini SVG diagrams used by the Visual DependencyEditor
   * (Tier-4 #11). Renders predecessor + successor rectangles plus the
   * kind-specific arrow polyline inside a fixed 80×50 viewBox. The wrapping
   * `<button role="radio">` provides native keyboard focus + click events
   * for the grid; the parent grid forwards arrow-key navigation via
   * `diagramGridIndex`.
   */
  export let kind: DiagramKindCode
  export let selected: boolean = false
  export let compact: boolean = false
  export let disabled: boolean = false

  const dispatch = createEventDispatcher<{ pick: DiagramKindCode }>()

  const HINT_LABELS: Record<DiagramKindCode, IntlString> = {
    FS: tracker.string.DependencyKindHintFS,
    SS: tracker.string.DependencyKindHintSS,
    FF: tracker.string.DependencyKindHintFF,
    SF: tracker.string.DependencyKindHintSF
  }
  const SHORT_LABELS: Record<DiagramKindCode, IntlString> = {
    FS: tracker.string.DependencyKindFS,
    SS: tracker.string.DependencyKindSS,
    FF: tracker.string.DependencyKindFF,
    SF: tracker.string.DependencyKindSF
  }

  $: paths = getDiagramSvgPaths(kind)
  $: hintLabel = HINT_LABELS[kind]
  $: shortLabel = SHORT_LABELS[kind]
  $: ariaText = ''
  $: void translate(hintLabel, {}, $themeStore.language).then((t) => {
    ariaText = t
  })
  $: shortText = ''
  $: void translate(shortLabel, {}, $themeStore.language).then((t) => {
    shortText = t
  })

  function onClick (): void {
    if (disabled) return
    dispatch('pick', kind)
  }
</script>

<button
  type="button"
  role="radio"
  aria-checked={selected}
  aria-label={ariaText}
  title={ariaText}
  class="mini-diagram"
  class:selected
  class:compact
  {disabled}
  tabindex={selected ? 0 : -1}
  data-kind={kind}
  on:click={onClick}
>
  <svg viewBox="0 0 80 50" class="diagram-svg" aria-hidden="true">
    <defs>
      <marker
        id={`mdd-arrow-${kind}`}
        viewBox="0 0 6 6"
        refX="5"
        refY="3"
        markerWidth="5"
        markerHeight="5"
        orient="auto-start-reverse"
      >
        <path d="M0,0 L6,3 L0,6 z" class="arrow-head" />
      </marker>
    </defs>
    {#each paths.rects as r, i}
      <rect
        x={r.x}
        y={r.y}
        width={r.w}
        height={r.h}
        rx="2"
        ry="2"
        class={i === 0 ? 'rect-pred' : 'rect-succ'}
      />
    {/each}
    <polyline
      points={paths.arrow.points}
      class="arrow-line"
      marker-end={`url(#mdd-arrow-${kind})`}
      fill="none"
    />
  </svg>
  <span class="code-label">{kind}</span>
  {#if shortText !== ''}
    <span class="sr-only">{shortText}</span>
  {/if}
</button>

<style lang="scss">
  .mini-diagram {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    width: 80px;
    height: 60px;
    padding: 4px;
    border: 1px solid var(--theme-button-border);
    border-radius: 6px;
    background: var(--theme-button-default);
    color: var(--theme-content-color);
    cursor: pointer;
    transition: border-color 0.12s ease, background 0.12s ease;

    &:hover:not([disabled]) {
      border-color: var(--theme-button-pressed-border, var(--theme-link-color));
      background: var(--theme-button-hovered);
    }
    &:focus-visible {
      outline: 2px solid var(--theme-link-color);
      outline-offset: 2px;
    }
    &.selected {
      border-color: var(--theme-link-color);
      border-width: 2px;
      padding: 3px;
      background: var(--theme-button-pressed, var(--theme-button-default));
    }
    &.compact {
      width: 140px;
      height: 80px;
    }
    &[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  .diagram-svg {
    width: 100%;
    height: 38px;
  }
  .compact .diagram-svg {
    height: 58px;
  }
  .rect-pred,
  .rect-succ {
    fill: var(--theme-button-default);
    stroke: var(--theme-content-color);
    stroke-width: 1.2;
  }
  .selected .rect-pred,
  .selected .rect-succ {
    stroke: var(--theme-link-color);
  }
  .arrow-line {
    stroke: var(--theme-content-color);
    stroke-width: 1.4;
  }
  .arrow-head {
    fill: var(--theme-content-color);
  }
  .selected .arrow-line {
    stroke: var(--theme-link-color);
  }
  .selected .arrow-head {
    fill: var(--theme-link-color);
  }
  .code-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: var(--theme-content-color);
  }
  .selected .code-label {
    color: var(--theme-link-color);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
</style>
