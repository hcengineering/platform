<script lang="ts">
  import { Ref } from '@anticrm/core'
  import { IssueStatus, Team } from '@anticrm/tracker'
  import Issues from './Issues.svelte'
  import tracker from '../../plugin'

  export let currentSpace: Ref<Team>
</script>

<Issues
  {currentSpace}
  includedGroups={{ status: [IssueStatus.InProgress, IssueStatus.Todo] }}
  title={tracker.string.ActiveIssues}
/>
