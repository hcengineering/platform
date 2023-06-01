<script lang="ts">
  import { DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { Issue } from '@hcengineering/tracker'
  import { Component, Loading } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import tracker from '../../plugin'
  import CreateIssue from '../CreateIssue.svelte'
  import { createQuery } from '@hcengineering/presentation'

  export let viewlet: WithLookup<Viewlet>
  export let query: DocumentQuery<Issue> = {}
  export let space: Ref<Space> | undefined

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

  const createItemDialog = CreateIssue
  const createItemLabel = tracker.string.AddIssueTooltip
</script>

{#if viewlet?.$lookup?.descriptor?.component}
  {#if loading}
    <Loading />
  {:else}
    <Component
      is={viewlet.$lookup.descriptor.component}
      props={{
        _class: tracker.class.Issue,
        config: preference?.config ?? viewlet.config,
        options: viewlet.options,
        createItemDialog,
        createItemLabel,
        viewlet,
        viewOptions,
        viewOptionsConfig: viewlet.viewOptions?.other,
        space,
        query
      }}
    />
  {/if}
{/if}
