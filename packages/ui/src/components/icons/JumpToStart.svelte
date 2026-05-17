<!--
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
-->
<!--
  "Jump to start" icon — visually a left arrow with a vertical bar pinned
  to the left side (|←). Used in the Gantt toolbar so the affordance reads
  as "skip to first" rather than "go one step left" (which is what a plain
  ArrowLeft suggests).

  Composed of two paths inside the same 32×32 viewBox as ArrowLeft so the
  icon matches the existing arrow + nav-button sizing. The arrow itself is
  the ArrowLeft glyph shifted right by 2px to clear room for the bar.
-->
<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="5" width="2.5" height="22" rx="1" />
  <path
    d="M16 26L17.41 24.59L9.83 17H29C29.5523 17 30 16.5523 30 16C30 15.4477 29.5523 15 29 15H9.83L17.41 7.41L16 6L6 16L16 26Z"
  />
</svg>
