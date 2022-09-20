<script lang="ts">
  import { DocumentQuery, WithLookup } from '@hcengineering/core'
  import { Component } from '@hcengineering/ui'
  import { Viewlet } from '@hcengineering/view'
  import { Issue } from '@hcengineering/tracker'
  import { viewOptionsStore } from '@hcengineering/view-resources'

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
