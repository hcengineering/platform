<script lang="ts">
  import { Ref } from '@hcengineering/core'
  import { Issue, IssueStatus, Project } from '@hcengineering/tracker'
  import { Button, Label, SelectPopup, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import presentation, { getClient } from '@hcengineering/presentation'
  import tracker from '../../plugin'
  import { createEventDispatcher } from 'svelte'
  import IssueStatusIcon from '../issues/IssueStatusIcon.svelte'
  import { StatusPresenter, statusStore } from '@hcengineering/view-resources'

  export let projectId: Ref<Project>
  export let issues: Issue[]
  export let status: IssueStatus

  let processing = false

  const client = getClient()

  let newStatus: IssueStatus =
    $statusStore
      .getDocs()
      .find((s) => s._id !== status._id && s.category === status.category && s.space === projectId) ??
    $statusStore.getDocs().find((s) => s._id !== status._id && s.space === projectId) ??
    status

  async function remove () {
    processing = true
    await Promise.all(
      issues.map(async (p) => {
        await client.update(p, {
          status: newStatus._id
        })
      })
    )
    await client.remove(status)
    processing = false
    dispatch('close')
  }

  $: statuses = $statusStore.filter((it) => it.space === projectId && it._id !== status._id)
  $: statusesInfo = statuses?.map((s) => {
    return {
      id: s._id,
      component: StatusPresenter,
      props: { value: s, size: 'small' },
      isSelected: newStatus._id === s._id ?? false
    }
  })

  const dispatch = createEventDispatcher()

  const handleStatusEditorOpened = (event: MouseEvent) => {
    showPopup(
      SelectPopup,
      { value: statusesInfo, placeholder: tracker.string.SetStatus, searchable: true },
      eventToHTMLElement(event),
      (val) => {
        newStatus = $statusStore.getIdMap().get(val) ?? newStatus
      }
    )
  }
</script>

<div class="msgbox-container">
  <div class="overflow-label fs-title mb-4"><Label label={tracker.string.DeleteWorkflowStatus} /></div>
  <div class="message">
    <Label label={tracker.string.DeleteWorkflowStatusConfirm} params={{ status: status.name }} />
    <Label
      label={tracker.string.DeleteWorkflowStatusErrorDescription}
      params={{ status: status.name, count: issues.length }}
    />
  </div>
  <div class="mt-2 mb-2">
    <Button kind={'link'} justify={'left'} width={'10rem'} on:click={handleStatusEditorOpened}>
      <span slot="content" class="flex-row-center pointer-events-none">
        {#if newStatus}
          <IssueStatusIcon value={newStatus} size="inline" />
        {/if}
        {#if newStatus}
          <span class="overflow-label disabled ml-1">
            {newStatus.name}
          </span>
        {/if}
      </span>
    </Button>
  </div>
  <div class="footer">
    <Button
      focus
      label={presentation.string.Ok}
      size={'small'}
      kind={'accented'}
      loading={processing}
      on:click={remove}
    />
    <Button
      label={presentation.string.Cancel}
      size={'small'}
      on:click={() => {
        dispatch('close', false)
      }}
    />
  </div>
</div>

<style lang="scss">
  .msgbox-container {
    display: flex;
    flex-direction: column;
    padding: 2rem 1.75rem 1.75rem;
    width: 30rem;
    max-width: 40rem;
    background: var(--popup-bg-color);
    border-radius: 1.25rem;
    user-select: none;
    box-shadow: var(--popup-shadow);

    .message {
      margin-bottom: 1.75rem;
      color: var(--accent-color);
    }
    .footer {
      flex-shrink: 0;
      display: grid;
      grid-auto-flow: column;
      direction: rtl;
      justify-content: flex-start;
      align-items: center;
      column-gap: 0.5rem;
    }
  }
</style>
