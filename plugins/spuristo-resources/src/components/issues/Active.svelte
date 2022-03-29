<script lang='ts'>
  import { IssueStatus, Team } from '@anticrm/spuristo'

  import Issues from './Issues.svelte'
  export let currentTeam: Team

  let todalIssues = 0
</script>
<div class='fs-title'>
  Active issues {todalIssues}
</div>
<Issues {currentTeam} categories={[IssueStatus.InProgress, IssueStatus.Todo]} on:content={(evt) => { todalIssues = evt.detail.length } }></Issues>