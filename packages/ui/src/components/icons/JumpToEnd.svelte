<!--
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
-->
<!--
  "Jump to end" icon — visually a right arrow with a vertical bar pinned
  to the right side (→|). Used in the Gantt toolbar so the affordance reads
  as "skip to last" rather than "go one step right" (which is what a plain
  ArrowRight suggests).

  Composed of two paths inside the same 32×32 viewBox as ArrowRight so the
  icon matches the existing arrow + nav-button sizing. The arrow itself is
  the ArrowRight glyph shifted left by 2px to clear room for the bar.
-->
<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M16 6L14.57 7.393L22.15 15H3C2.44771 15 2 15.4477 2 16C2 16.5523 2.44772 17 3 17H22.15L14.57 24.573L16 26L26 16L16 6Z"
  />
  <rect x="27.5" y="5" width="2.5" height="22" rx="1" />
</svg>
