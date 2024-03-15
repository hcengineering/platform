<script lang="ts">
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { getStates } from '@hcengineering/task'
  import { typeStore } from '@hcengineering/task-resources'
  import tracker, { Issue, IssueStatus, Project } from '@hcengineering/tracker'
  import { AssigneeEditor, IssueStatusIcon, StatusPresenter } from '@hcengineering/tracker-resources'
  import { activeProjects } from '@hcengineering/tracker-resources/src/utils'
  import { Label, SelectPopup, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'

  export let value: Issue
  export let withoutSpace: boolean
  export let isEditable: boolean = false
  export let shouldShowAvatar: boolean = false
  export let kind: 'todo-line' | 'todo-line-large' | undefined = undefined

  let space: Project | undefined = undefined
  const defaultIssueStatus: Ref<IssueStatus> | undefined = undefined

  const client = getClient()

  $: space = $activeProjects.get(value.space)

  $: st = $statusStore.byId.get(value.status)

  const changeStatus = async (newStatus: Ref<IssueStatus> | undefined, refocus: boolean = true) => {
    if (!isEditable || newStatus === undefined || value.status === newStatus) {
      return
    }

    if ('_class' in value) {
      await client.update(value, { status: newStatus })
    }
  }
  function getSelectedStatus (
    statuses: IssueStatus[] | undefined,
    value: Issue,
    defaultStatus: Ref<IssueStatus> | undefined
  ): IssueStatus | undefined {
    if (value.status !== undefined) {
      const current = statuses?.find((status) => status._id === value.status)
      if (current) return current
    }
    if (defaultIssueStatus !== undefined) {
      const res = statuses?.find((status) => status._id === defaultStatus)
      changeStatus(res?._id, false)
      return res
    }
  }

  $: selectedStatus = getSelectedStatus(statuses, value, defaultIssueStatus)
  $: statuses = getStates(space, $typeStore, $statusStore.byId)
  $: statusesInfo = statuses?.map((s) => {
    return {
      id: s._id,
      component: StatusPresenter,
      props: { value: s, size: 'small', space: value.space },
      isSelected: selectedStatus?._id === s._id ?? false
    }
  })

  const handleStatusEditorOpened = (event: MouseEvent) => {
    if (!isEditable) {
      return
    }

    showPopup(SelectPopup, { value: statusesInfo }, eventToHTMLElement(event), changeStatus)
  }
</script>

{#if kind === 'todo-line'}
  <button class="hulyToDoLine-reference flex-row-top flex-no-shrink flex-gap-2 relative" on:click>
    {#if st}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="hulyToDoLine-icon"
        class:cursor-pointer={isEditable}
        on:click|stopPropagation={handleStatusEditorOpened}
      >
        <IssueStatusIcon value={st} size={'small'} space={value.space} />
      </div>
    {/if}
    <span class="hulyToDoLine-label overflow-label font-medium-12 text-left secondary-textColor">
      {value.identifier}
    </span>
  </button>
{:else if kind === 'todo-line-large'}
  <button class="hulyToDoLine-reference flex-row-top flex-no-shrink flex-gap-2 relative" on:click>
    {#if st}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="hulyToDoLine-icon"
        class:cursor-pointer={isEditable}
        on:click|stopPropagation={handleStatusEditorOpened}
      >
        <IssueStatusIcon value={st} size={'small'} space={value.space} />
      </div>
    {/if}
    <div class="flex-col flex-gap-2 flex-grow text-left">
      <div class="hulyToDoLine-label large font-medium-12 secondary-textColor">
        {value.identifier}
      </div>
      <slot />
    </div>
  </button>
{:else if shouldShowAvatar}
  <div class="flex-between">
    <div class="flex-col flex-grow mr-3">
      {#if !withoutSpace}
        <div class="flex-row-center">
          <Label label={tracker.string.ConfigLabel} />
          /
          {space?.name}
        </div>
      {/if}
      <div class="flex-row-center">
        {#if st}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="flex-no-shrink" class:cursor-pointer={isEditable} on:click={handleStatusEditorOpened}>
            <IssueStatusIcon value={st} size={'small'} space={value.space} />
          </div>
        {/if}
        <span class="ml-1-5 overflow-label">{value.title}</span>
      </div>
    </div>
    <div class="hideOnDrag flex-no-shrink">
      <AssigneeEditor object={value} avatarSize={'smaller'} shouldShowName={false} />
    </div>
  </div>
{:else}
  {#if !withoutSpace}
    <div class="flex-row-center">
      <Label label={tracker.string.ConfigLabel} />
      /
      {space?.name}
    </div>
  {/if}
  <div class="flex-row-center">
    {#if st}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="flex-no-shrink mr-1-5" class:cursor-pointer={isEditable} on:click={handleStatusEditorOpened}>
        <IssueStatusIcon value={st} size={'small'} space={value.space} />
      </div>
    {/if}
    <span class="overflow-label">{value.title}</span>
  </div>
{/if}

<style lang="scss">
  button {
    margin: 0;
    padding: 0;
    text-align: left;
    border: none;
    outline: none;
  }
</style>
