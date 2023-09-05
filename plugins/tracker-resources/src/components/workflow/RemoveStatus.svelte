<script lang="ts">
  import { Ref } from '@hcengineering/core'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { getStates } from '@hcengineering/task'
  import { Issue, IssueStatus, Project } from '@hcengineering/tracker'
  import { Button, Label, SelectPopup, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { StatusPresenter, statusStore } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import IssueStatusIcon from '../issues/IssueStatusIcon.svelte'

  export let projectId: Ref<Project>
  export let issues: Issue[]
  export let status: IssueStatus

  let processing = false

  let _space: Project | undefined = undefined

  const query = createQuery()
  $: query.query(tracker.class.Project, { space: projectId }, (result) => {
    _space = result[0]
  })

  const client = getClient()

  $: newStatus =
    statuses.find((s) => s._id !== status._id && s.category === status.category && s.space === projectId) ??
    statuses.find((s) => s._id !== status._id && s.space === projectId) ??
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
    if (_space) {
      await client.update(_space, { $pull: { states: status._id } })
    }
    processing = false
    dispatch('close')
  }

  $: statuses = getStates(_space, $statusStore).filter((p) => p._id !== status._id)
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
        newStatus = $statusStore.get(val) ?? newStatus
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
          <IssueStatusIcon value={newStatus} space={projectId} size="inline" />
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
