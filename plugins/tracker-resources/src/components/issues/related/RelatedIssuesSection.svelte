<script lang="ts">
  import { Doc, DocumentQuery } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { configurationStore } from '@hcengineering/presentation'
  import tracker, { Issue, trackerId } from '@hcengineering/tracker'
  import { Icon, Label } from '@hcengineering/ui'
  import QueryIssuesList from '../edit/QueryIssuesList.svelte'

  export let object: Doc
  export let label: IntlString

  let query: DocumentQuery<Issue>
  $: query = { 'relations._id': object._id, 'relations._class': object._class }
</script>

{#if $configurationStore.has(trackerId)}
  <QueryIssuesList {object} {query} createParams={{ relatedTo: object }} hasSubIssues>
    <svelte:fragment slot="header">
      <div class="flex-row-center mb-3">
        <div class="antiSection-header__icon">
          <Icon icon={tracker.icon.Issue} size={'small'} />
        </div>
        <span class="antiSection-header__title short">
          <Label {label} />
        </span>
      </div>
    </svelte:fragment>
  </QueryIssuesList>
{/if}
