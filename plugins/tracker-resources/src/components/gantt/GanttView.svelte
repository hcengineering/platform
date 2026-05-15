<!--
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
-->
<script lang="ts">
  import { type Class, type Doc, type DocumentQuery, type Ref, type Space } from '@hcengineering/core'
  import { type Viewlet, type ViewOptions } from '@hcengineering/view'
  import { Label } from '@hcengineering/ui'
  import tracker from '../../plugin'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined
  export let query: DocumentQuery<Doc> = {}
  export let viewlet: Viewlet
  export let viewOptions: ViewOptions
</script>

<div class="root">
  <div class="placeholder">
    <Label label={tracker.string.Gantt} />
    <span class="hint">— coming in Task 12</span>
  </div>
</div>

<style lang="scss">
  .root {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--theme-content-color);
  }
  .placeholder {
    font-size: 1.25rem;
  }
  .hint {
    margin-left: 0.5rem;
    color: var(--theme-darker-color);
  }
</style>
