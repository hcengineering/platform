<script lang="ts">
  import { getMetadata } from '@hcengineering/platform'
  import presentation, { copyTextToClipboard, createQuery } from '@hcengineering/presentation'
  import { Issue, IssueStatus } from '@hcengineering/tracker'
  import { Button, Notification, navigate, parseLocation, NotificationToast } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  import { statusStore } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import IssuePresenter from './IssuePresenter.svelte'
  import IssueStatusIcon from './IssueStatusIcon.svelte'

  export let notification: Notification
  export let onRemove: () => void

  const issueQuery = createQuery()

  let issue: Issue | undefined = undefined
  let status: IssueStatus | undefined = undefined

  const { subTitle, params } = notification

  $: issueQuery.query(
    tracker.class.Issue,
    { _id: params?.issueId },
    (res) => {
      issue = res[0]
    },
    { limit: 1 }
  )

  $: if (issue?.status !== undefined) {
    status = $statusStore.byId.get(issue.status)
  }

  function handleIssueOpened (): void {
    if (params?.issueUrl) {
      const url = new URL(params?.issueUrl)
      const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin

      if (url.origin === frontUrl) {
        navigate(parseLocation(url))
      }
    }

    onRemove()
  }

  function handleCopyUrl (): void {
    if (issue !== undefined) {
      void copyTextToClipboard(params?.issueUrl)
    }
  }
</script>

<NotificationToast title={notification.title} severity={notification.severity} onClose={onRemove}>
  <svelte:fragment slot="content">
    <div class="flex-row-center flex-wrap gap-2 reverse">
      {#if status === undefined && issue}
        <IssueStatusIcon value={status} space={issue.space} size="small" />
      {/if}
      {#if issue}
        <IssuePresenter value={issue} />
      {/if}
      <span class="overflow-label">
        {subTitle}
      </span>
      <span class="content-dark-color">
        {params?.subTitlePostfix}
      </span>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="buttons">
    <Button label={tracker.string.ViewIssue} on:click={handleIssueOpened} />
    <Button icon={view.icon.CopyLink} label={tracker.string.CopyIssueUrl} on:click={handleCopyUrl} />
  </svelte:fragment>
</NotificationToast>
