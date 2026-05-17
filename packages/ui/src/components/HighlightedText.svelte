<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<!--
  Wraps occurrences of `query` inside `text` with a <mark> element.
  Case-insensitive substring match. Consumer should pass the RAW user
  search text (not the encoded $search wire-form) — see
  HighlightedText.helpers.ts for the prefix-stripping fall-back when an
  encoded string slips through.
-->
<script lang="ts">
  import { splitHighlightSegments } from './HighlightedText.helpers'

  export let text: string = ''
  export let query: string = ''
  $: segments = splitHighlightSegments(text, query)
</script>

{#each segments as seg}
  {#if seg.match}<mark>{seg.text}</mark>{:else}{seg.text}{/if}
{/each}

<style>
  mark {
    background: var(--global-warning-BackgroundColor, #fff3a3);
    color: inherit;
    padding: 0 0.05em;
    border-radius: 2px;
  }
</style>
