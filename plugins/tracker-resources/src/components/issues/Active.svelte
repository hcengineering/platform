<script lang='ts'>
  import { Ref } from '@anticrm/core'
  import { IssueStatus, Team } from '@anticrm/tracker'
  import Issues from './Issues.svelte'
  export let currentSpace: Ref<Team>

  let todalIssues = 0
</script>
<div class='fs-title'>
  Active issues {todalIssues}
</div>
<Issues currentSpace={currentSpace} categories={[IssueStatus.InProgress, IssueStatus.Todo]} on:content={(evt) => { todalIssues = evt.detail.length } }></Issues>