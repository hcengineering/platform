<script lang="ts">
  import { SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import tags from '@hcengineering/tags'
  import {
    CheckBox,
    Component,
    IconMoreH,
    IconMoreV2,
    Spinner,
    eventToHTMLElement,
    getEventPositionElement,
    showPopup,
    showPanel,
    Icon
  } from '@hcengineering/ui'
  import { showMenu, Menu, FixedColumn } from '@hcengineering/view-resources'
  import time, { ToDo, WorkSlot } from '@hcengineering/time'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../plugin'
  import EditToDo from './EditToDo.svelte'
  import PriorityPresenter from './PriorityPresenter.svelte'
  import ToDoDuration from './ToDoDuration.svelte'
  import WorkItemPresenter from './WorkItemPresenter.svelte'

  export let todo: ToDo
  export let size: 'small' | 'large' = 'small'
  export let planned: boolean = true
  export let draggable: boolean = true
  export let isNew: boolean = false

  const dispatch = createEventDispatcher()
  const client = getClient()
  let updating: Promise<any> | undefined = undefined
  let isDrag: boolean = false

  async function markDone (): Promise<void> {
    await updating
    updating = client.update(todo, { doneOn: todo.doneOn == null ? Date.now() : null })
    await updating
    updating = undefined
  }

  let events: WorkSlot[] = []
  const query = createQuery()
  $: query.query(
    plugin.class.WorkSlot,
    {
      attachedTo: todo._id
    },
    (res) => {
      events = res
    },
    { sort: { date: SortingOrder.Descending } }
  )

  let hovered = false
  async function onMenuClick (ev: MouseEvent): Promise<void> {
    hovered = true
    showMenu(ev, { object: todo }, () => {
      hovered = false
    })
  }

  function dragStart (todo: ToDo, event: DragEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
    event.currentTarget.classList.add('dragged')
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'all'
    dispatch('dragstart', todo)
  }

  function dragEnd (event: DragEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
    event.currentTarget.classList.remove('dragged')
    dispatch('dragend')
  }

  function open (e: MouseEvent): void {
    // hovered = true
    showPanel(time.component.EditToDo, todo._id, todo._class, 'content')
  }

  $: isTodo = todo.attachedTo === time.ids.NotAttached
</script>

<button
  class="hulyToDoLine-container {size}"
  class:hovered
  class:isDrag
  on:click|stopPropagation={open}
  on:contextmenu={(e) => {
    showMenu(e, { object: todo })
  }}
  {draggable}
  on:dragstart={(e) => {
    isDrag = true
    dragStart(todo, e)
  }}
  on:dragend={(e) => {
    isDrag = false
    dragEnd(e)
  }}
>
  <div class="flex-row-top flex-grow flex-gap-2">
    <div class="flex-row-center flex-no-shrink">
      <button class="hulyToDoLine-dragbox" class:isNew on:contextmenu={onMenuClick}>
        <Icon icon={IconMoreV2} size={'small'} />
      </button>
      <div class="hulyToDoLine-checkbox" class:updating>
        {#if updating !== undefined}
          <Spinner size={'small'} />
        {:else}
          <CheckBox on:value={markDone} checked={todo.doneOn != null} kind={'todo'} size={'medium'} />
        {/if}
      </div>
    </div>
    {#if isTodo}
      {#if size === 'small'}
        <div class="hulyToDoLine-top-align top-12 text-left font-regular-14 secondary-textColor overflow-label">
          {todo.title}
        </div>
      {:else}
        <div class="flex-col flex-gap-1 flex-grow text-left">
          <div class="hulyToDoLine-top-align top-12 text-left font-regular-14 secondary-textColor">
            {todo.title}
          </div>
          <div class="flex-row-center flex-grow flex-gap-2">
            <Component is={tags.component.LabelsPresenter} props={{ object: todo, value: todo.labels, kind: 'todo' }} />
            <PriorityPresenter value={todo.priority} />
          </div>
        </div>
      {/if}
    {:else}
      <div class="flex-col flex-gap-1 flex-grow text-left">
        <div
          class="hulyToDoLine-top-align text-left top-12 font-bold-12 secondary-textColor"
          class:overflow-label={size === 'small'}
        >
          {todo.title}
        </div>
        <WorkItemPresenter {todo} kind={'todo-line'} {size} withoutSpace>
          {#if size === 'large'}
            <div class="flex-row-top flex-grow flex-gap-2">
              <Component
                is={tags.component.LabelsPresenter}
                props={{ object: todo, value: todo.labels, kind: 'todo' }}
              />
              <PriorityPresenter value={todo.priority} />
            </div>
          {/if}
        </WorkItemPresenter>
      </div>
    {/if}
  </div>
  <div class="flex-row-top flex-no-shrink flex-gap-2">
    {#if size === 'small'}
      <div class="flex-row-center min-h-6 max-h-6 flex-gap-2">
        <Component
          is={tags.component.LabelsPresenter}
          props={{ object: todo, value: todo.labels, kind: 'todo-compact' }}
        />
        <PriorityPresenter value={todo.priority} />
      </div>
    {/if}
    {#if events.length > 0}
      <span class="hulyToDoLine-top-align top-12 font-regular-12 secondary-textColor">
        <ToDoDuration {events} />
      </span>
    {/if}
  </div>
</button>
