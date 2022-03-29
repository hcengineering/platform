<script lang='ts'>
  import { IssueStatus, Team } from '@anticrm/spuristo'

  import Issues from './Issues.svelte'
  export let currentTeam: Team
</script>
<Issues {currentTeam} categories={[IssueStatus.Backlog]}></Issues>