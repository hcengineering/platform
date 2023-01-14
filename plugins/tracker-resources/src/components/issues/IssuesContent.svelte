<script lang="ts">
  import { DocumentQuery, Ref, Space, WithLookup } from '@hcengineering/core'
  import { Issue } from '@hcengineering/tracker'
  import { Component } from '@hcengineering/ui'
  import { Viewlet } from '@hcengineering/view'
  import tracker from '../../plugin'
  import CreateIssue from '../CreateIssue.svelte'

  export let viewlet: WithLookup<Viewlet>
  export let query: DocumentQuery<Issue> = {}
  export let space: Ref<Space> | undefined

  const createItemDialog = CreateIssue
  const createItemLabel = tracker.string.AddIssueTooltip
</script>

{#if viewlet?.$lookup?.descriptor?.component}
  <Component
    is={viewlet.$lookup.descriptor.component}
    props={{
      _class: tracker.class.Issue,
      config: viewlet.config,
      options: viewlet.options,
      createItemDialog,
      createItemLabel,
      viewlet,
      viewOptions: viewlet.viewOptions?.other,
      space,
      query
    }}
  />
{/if}
