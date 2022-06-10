<script lang="ts">
  import type { Ref, WithLookup } from '@anticrm/core'
  import { Component } from '@anticrm/ui'
  import { BuildModelKey, Viewlet } from '@anticrm/view'
  import { Team, ViewOptions } from '@anticrm/tracker'

  export let currentSpace: Ref<Team>
  export let viewlet: WithLookup<Viewlet> | undefined
  export let config: (string | BuildModelKey)[] | undefined = undefined
  export let query = {}
  export let viewOptions: ViewOptions
</script>

{#if viewlet?.$lookup?.descriptor?.component}
  <Component
    is={viewlet.$lookup?.descriptor?.component}
    props={{
      currentSpace,
      config: config ?? viewlet.config,
      options: viewlet.options,
      viewlet,
      query,
      viewOptions
    }}
  />
{/if}
