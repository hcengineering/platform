<script lang="ts">
  import { Ref } from '@anticrm/core'
  import { IssueStatus, Team, IssuesDateModificationPeriod } from '@anticrm/tracker'
  import Issues from './Issues.svelte'
  import tracker from '../../plugin'

  export let currentSpace: Ref<Team>

  const completedIssuesPeriod: IssuesDateModificationPeriod | null = null
</script>

<Issues
  {currentSpace}
  {completedIssuesPeriod}
  includedGroups={{ status: [IssueStatus.InProgress, IssueStatus.Todo] }}
  title={tracker.string.ActiveIssues}
/>
