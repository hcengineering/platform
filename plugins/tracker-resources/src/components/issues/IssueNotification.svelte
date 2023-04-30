<script lang="ts">
  import { copyTextToClipboard, createQuery } from '@hcengineering/presentation'
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
  import { fade } from 'svelte/transition'

  import tracker from '../../plugin'
  import IssuePresenter from './IssuePresenter.svelte'
  import IssueStatusIcon from './IssueStatusIcon.svelte'

  export let notification: Notification
  export let onRemove: () => void

  const issueQuery = createQuery()
  const statusQuery = createQuery()

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
    statusQuery.query(
      tracker.class.IssueStatus,
      { _id: issue.status },
      (res) => {
        status = res[0]
      },
      { limit: 1 }
    )
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

      if (url.origin === window.location.origin) {
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

<div class="root" in:fade out:fade>
  {#if icon}
    <Icon {icon} size="medium" fill={getIconColor()} />
  {/if}

  <div class="content">
    <div class="title">
      {title}
    </div>
    <div class="row">
      <div class="issue">
        {#if status}
          <IssueStatusIcon value={status} size="small" />
        {/if}
        {#if issue}
          <IssuePresenter value={issue} />
        {/if}
        <div class="sub-title">
          {subTitle}
        </div>
        <div class="postfix">
          {params?.subTitlePostfix}
        </div>
      </div>
    </div>
    <div class="row">
      <div class="view-issue-button">
        <Button label={tracker.string.ViewIssue} kind="link" size="medium" on:click={handleIssueOpened} />
      </div>
      <div class="copy-link-button">
        <Button
          icon={tracker.icon.CopyURL}
          kind={'link'}
          label={tracker.string.CopyIssueUrl}
          on:click={handleCopyUrl}
        />
      </div>
    </div>
  </div>

  <div class="close-button">
    <Button icon={IconClose} kind="transparent" size="small" on:click={onRemove} />
  </div>
</div>

<style lang="scss">
  .root {
    position: relative;
    display: flex;
    margin: 10px;
    box-shadow: 0 4px 10px var(--divider-color);
    height: 100px;
    width: 400px;
    overflow: hidden;
    color: var(--caption-color);
    background-color: var(--body-color);
    border: 1px solid var(--divider-color);
    border-radius: 6px;
    padding: 10px;
  }

  .sub-title {
    max-width: 210px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .content {
    margin-left: 10px;
  }

  .issue {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .view-issue-button {
    margin-top: 10px;
    margin-left: -5px;
  }

  .copy-link-button {
    margin-top: 10px;
    margin-left: 5px;
  }

  .title {
    display: flex;
    align-items: center;
    color: var(--caption-color);
    font-weight: 500;
    margin-bottom: 10px;
  }

  .close-button {
    position: absolute;
    top: 5px;
    right: 5px;
  }

  .row {
    display: flex;
    align-items: center;
  }

  .postfix {
    color: var(--dark-color);
  }
</style>
