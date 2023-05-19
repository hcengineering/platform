<script lang="ts">
  import { DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { Milestone } from '@hcengineering/tracker'
  import { Component } from '@hcengineering/ui'
  import { Viewlet, ViewOptions } from '@hcengineering/view'
  import tracker from '../../plugin'
  import NewMilestone from './NewMilestone.svelte'

  export let viewlet: WithLookup<Viewlet>
  export let query: DocumentQuery<Milestone> = {}
  export let space: Ref<Space> | undefined

  // Extra properties
  export let viewOptions: ViewOptions

  const createItemDialog = NewMilestone
  const createItemLabel = tracker.string.CreateMilestone
</script>

{#if viewlet?.$lookup?.descriptor?.component}
  <Component
    is={viewlet.$lookup.descriptor.component}
    props={{
      _class: tracker.class.Milestone,
      config: viewlet.config,
      options: viewlet.options,
      createItemDialog,
      createItemLabel,
      viewlet,
      viewOptions,
      viewOptionsConfig: viewlet.viewOptions?.other,
      space,
      query,
      props: {}
    }}
  />
{/if}
