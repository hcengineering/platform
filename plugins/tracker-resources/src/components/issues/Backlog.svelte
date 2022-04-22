<script lang="ts">
  import { Ref } from '@anticrm/core'
  import { IssueStatus, Team, IssuesDateModificationPeriod } from '@anticrm/tracker'
  import Issues from './Issues.svelte'
  import tracker from '../../plugin'

  export let currentSpace: Ref<Team>

  const completedIssuesPeriod: IssuesDateModificationPeriod | null = null
</script>

<Issues
  title={tracker.string.BacklogIssues}
  {currentSpace}
  {completedIssuesPeriod}
  includedGroups={{ status: [IssueStatus.Backlog] }}
/>
