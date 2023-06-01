<script lang="ts">
  import { DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { Milestone } from '@hcengineering/tracker'
  import { Component, Loading } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import tracker from '../../plugin'
  import NewMilestone from './NewMilestone.svelte'
  import { createQuery } from '@hcengineering/presentation'

  export let viewlet: WithLookup<Viewlet>
  export let query: DocumentQuery<Milestone> = {}
  export let space: Ref<Space> | undefined

  // Extra properties
  export let viewOptions: ViewOptions

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined
  let loading = true

  $: viewlet &&
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        attachedTo: viewlet._id
      },
      (res) => {
        preference = res[0]
        loading = false
      },
      { limit: 1 }
    )

  const createItemDialog = NewMilestone
  const createItemLabel = tracker.string.CreateMilestone
</script>

{#if viewlet?.$lookup?.descriptor?.component}
  {#if loading}
    <Loading />
  {:else}
    <Component
      is={viewlet.$lookup.descriptor.component}
      props={{
        _class: tracker.class.Milestone,
        config: preference?.config ?? viewlet.config,
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
{/if}
