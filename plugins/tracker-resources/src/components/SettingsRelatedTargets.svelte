<script lang="ts">
  import { Space } from '@hcengineering/core'
  import { Header, Breadcrumb } from '@hcengineering/ui'
  import tracker from '../plugin'
  import EditRelatedTargets from './EditRelatedTargets.svelte'

  export let value: Space | undefined
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={tracker.icon.Relations} label={tracker.string.RelatedIssues} size={'large'} isCurrent />
  </Header>
  <EditRelatedTargets {value} />
</div>

<style lang="scss">
  .bordered {
    padding: 0.25rem 0.5rem;
    background-color: var(--theme-comp-header-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.25rem;
  }
</style>
