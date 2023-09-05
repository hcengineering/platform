<script lang="ts">
  import { getMetadata } from '@hcengineering/platform'
  import presentation, { copyTextToClipboard, createQuery } from '@hcengineering/presentation'
  import { Issue, IssueStatus } from '@hcengineering/tracker'
  import {
    AnySvelteComponent,
    Button,
    Icon,
    IconCheckCircle,
    IconClose,
    IconInfo,
    Notification,
    NotificationSeverity,
    navigate,
    parseLocation
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { fade } from 'svelte/transition'

  import { statusStore } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import IssuePresenter from './IssuePresenter.svelte'
  import IssueStatusIcon from './IssueStatusIcon.svelte'

  export let notification: Notification
  export let onRemove: () => void

  const issueQuery = createQuery()

  let issue: Issue | undefined
  let status: IssueStatus | undefined

  const { title, subTitle, severity, params } = notification

  $: issueQuery.query(
    tracker.class.Issue,
    { _id: params?.issueId },
    (res) => {
      issue = res[0]
    },
    { limit: 1 }
  )

  $: if (issue?.status !== undefined) {
    status = $statusStore.get(issue.status)
  }

  const getIcon = (): AnySvelteComponent | undefined => {
    switch (severity) {
      case NotificationSeverity.Success:
        return IconCheckCircle
      case NotificationSeverity.Error:
      case NotificationSeverity.Info:
      case NotificationSeverity.Warning:
        return IconInfo
    }
  }

  const getIconColor = () => {
    switch (severity) {
      case NotificationSeverity.Success:
        return '#34db80'
      case NotificationSeverity.Error:
        return '#eb5757'
      case NotificationSeverity.Info:
        return '#93caf3'
      case NotificationSeverity.Warning:
        return '#f2994a'
    }
  }
  const handleIssueOpened = () => {
    if (params?.issueUrl) {
      const url = new URL(params?.issueUrl)
      const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin

      if (url.origin === frontUrl) {
        navigate(parseLocation(url))
      }
    }

    onRemove()
  }
  const handleCopyUrl = () => {
    if (issue) {
      copyTextToClipboard(params?.issueUrl)
    }
  }
  $: icon = getIcon()
</script>

<div class="notify-container" in:fade out:fade>
  <div class="flex-between">
    <div class="flex-row-center">
      {#if icon}
        <div class="mr-2"><Icon {icon} size="medium" fill={getIconColor()} /></div>
      {/if}
      <span class="overflow-label fs-bold caption-color">{title}</span>
    </div>
    <Button icon={IconClose} kind="ghost" size="small" on:click={onRemove} />
  </div>

  <div class="content flex-row-center flex-wrap gap-2 reverse">
    {#if status && issue}
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
  <div class="flex-between gap-2">
    <Button label={tracker.string.ViewIssue} on:click={handleIssueOpened} />
    <Button icon={view.icon.CopyLink} label={tracker.string.CopyIssueUrl} on:click={handleCopyUrl} />
  </div>
</div>

<style lang="scss">
  .notify-container {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    margin: 0.75rem;
    padding: 0.5rem;
    min-width: 25rem;
    max-width: 35rem;
    min-height: 7rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: 0.5rem;
    box-shadow: var(--theme-popup-shadow);

    .content {
      flex-grow: 1;
      margin: 1rem 0 1.25rem;
      padding: 0 1rem;
      // border: 1px solid var(--theme-divider-color);
      border-radius: 0.5rem;
    }
  }
</style>
