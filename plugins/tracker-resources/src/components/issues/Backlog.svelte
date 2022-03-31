<script lang='ts'>
  import { Ref } from '@anticrm/core'
  import { IssueStatus, Team } from '@anticrm/tracker'
  import Issues from './Issues.svelte'
  export let currentSpace: Ref<Team>
</script>
<Issues {currentSpace} categories={[IssueStatus.Backlog]}></Issues>