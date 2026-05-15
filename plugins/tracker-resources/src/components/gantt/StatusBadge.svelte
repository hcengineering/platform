<!--
// Copyright © 2026 Hardcore Engineering Inc.
-->
<script lang="ts">
  import type { Issue } from '@hcengineering/tracker'
  import { statusStore } from '@hcengineering/view-resources'

  export let issue: Issue

  $: status = $statusStore.byId.get(issue.status as any)
  $: category = (status as { category?: string } | undefined)?.category
  $: statusName = (status as { name?: string } | undefined)?.name ?? ''
  $: color = mapColor(category)

  function mapColor (cat: string | undefined): string {
    switch (cat) {
      case 'task:statusCategory:UnStarted':
      case 'tracker:statusCategory:Backlog':
        return '#9ca3af'
      case 'task:statusCategory:ToDo':
        return '#3b82f6'
      case 'task:statusCategory:Active':
        return '#f59e0b'
      case 'task:statusCategory:Won':
        return '#10b981'
      case 'task:statusCategory:Lost':
        return '#9ca3af'
      default:
        return 'var(--theme-divider-color)'
    }
  }
</script>

<span
  class="status-dot"
  style="background-color: {color};"
  title={statusName}
/>

<style lang="scss">
  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.1);
    display: inline-block;
  }
</style>
