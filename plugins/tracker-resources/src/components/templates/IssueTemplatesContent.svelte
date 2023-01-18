<script lang="ts">
  import { DocumentQuery, WithLookup } from '@hcengineering/core'
  import { IssueTemplate } from '@hcengineering/tracker'
  import { Component } from '@hcengineering/ui'
  import { Viewlet, ViewOptions } from '@hcengineering/view'
  import tracker from '../../plugin'
  import CreateIssueTemplate from './CreateIssueTemplate.svelte'

  export let viewlet: WithLookup<Viewlet>
  export let viewOptions: ViewOptions
  export let query: DocumentQuery<IssueTemplate> = {}

  const createItemDialog = CreateIssueTemplate
  const createItemLabel = tracker.string.IssueTemplate
</script>

{#if viewlet?.$lookup?.descriptor?.component}
  <Component
    is={viewlet.$lookup.descriptor.component}
    props={{
      _class: tracker.class.IssueTemplate,
      config: viewlet.config,
      options: viewlet.options,
      createItemDialog,
      createItemLabel,
      viewOptions,
      viewOptionsConfig: viewlet.viewOptions?.other,
      viewlet,
      query
    }}
  />
{/if}
