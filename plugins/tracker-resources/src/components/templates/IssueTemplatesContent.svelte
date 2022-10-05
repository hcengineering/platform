<script lang="ts">
  import { DocumentQuery, WithLookup } from '@hcengineering/core'
  import { IssueTemplate, ViewOptions } from '@hcengineering/tracker'
  import { Viewlet } from '@hcengineering/view'
  import { viewOptionsStore } from '@hcengineering/view-resources'
  import TemplatesList from './TemplatesList.svelte'
  import tracker from '../../plugin'

  export let viewlet: WithLookup<Viewlet>
  export let query: DocumentQuery<IssueTemplate> = {}

  $: vo = $viewOptionsStore as ViewOptions
</script>

{#if viewlet?.$lookup?.descriptor?.component}
  <TemplatesList _class={tracker.class.IssueTemplate} config={viewlet.config} {query} viewOptions={vo} />
{/if}
