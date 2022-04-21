<script lang="ts">
  import { Button, Icon, Label, showPopup, SelectPopup, eventToHTMLElement } from '@anticrm/ui'
  import { ProjectStatus } from '@anticrm/tracker'
  import tracker from '../../plugin'
  import { projectStatuses } from '../../utils'

  export let status: ProjectStatus
  export let kind: 'button' | 'icon' = 'button'
  export let shouldShowLabel: boolean = true
  export let onStatusChange: ((newStatus: ProjectStatus | undefined) => void) | undefined = undefined
  export let isEditable: boolean = true

  const statusesInfo = [
    ProjectStatus.Planned,
    ProjectStatus.InProgress,
    ProjectStatus.Paused,
    ProjectStatus.Completed,
    ProjectStatus.Canceled
  ].map((s) => ({ id: s, ...projectStatuses[s] }))

  const handleStatusEditorOpened = (event: MouseEvent) => {
    if (!isEditable) {
      return
    }
    showPopup(
      SelectPopup,
      { value: statusesInfo, placeholder: tracker.string.SetStatus, searchable: true },
      eventToHTMLElement(event),
      onStatusChange
    )
  }
</script>

{#if kind === 'button'}
  <Button
    label={shouldShowLabel ? projectStatuses[status].label : undefined}
    icon={projectStatuses[status].icon}
    width="min-content"
    size="small"
    kind="no-border"
    on:click={handleStatusEditorOpened}
  />
{:else if kind === 'icon'}
  <div class={isEditable ? 'flex-presenter' : 'presenter'} on:click={handleStatusEditorOpened}>
    <div class="statusIcon">
      <Icon icon={projectStatuses[status].icon} size="small" />
    </div>
    {#if shouldShowLabel}
      <div class="label nowrap ml-2">
        <Label label={projectStatuses[status].label} />
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .presenter {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
  }

  .statusIcon {
    width: 1rem;
    height: 1rem;
  }
</style>
