<script lang="ts">
  import { DocumentQuery, WithLookup } from '@anticrm/core'
  import { Component } from '@anticrm/ui'
  import { Viewlet } from '@anticrm/view'
  import { Issue } from '@anticrm/tracker'
  import { viewOptionsStore } from '../../viewOptions'

  export let viewlet: WithLookup<Viewlet>
  export let query: DocumentQuery<Issue> = {}
</script>

{#if viewlet?.$lookup?.descriptor?.component}
  <Component
    is={viewlet.$lookup.descriptor.component}
    props={{
      config: viewlet.config,
      options: viewlet.options,
      viewlet,
      query,
      viewOptions: $viewOptionsStore
    }}
  />
{/if}
