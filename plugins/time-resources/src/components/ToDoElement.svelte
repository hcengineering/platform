<!--
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { SortingOrder, WithLookup } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import tags from '@hcengineering/tags'
  import { Component, IconMoreV2, Spinner, showPanel, Icon } from '@hcengineering/ui'
  import { showMenu } from '@hcengineering/view-resources'
  import time, { ToDo, ToDoPriority, WorkSlot } from '@hcengineering/time'
  import plugin from '../plugin'
  import ToDoDuration from './ToDoDuration.svelte'
  import WorkItemPresenter from './WorkItemPresenter.svelte'
  import ToDoCheckbox from './ToDoCheckbox.svelte'
  import ToDoPriorityPresenter from './ToDoPriorityPresenter.svelte'

  export let todo: WithLookup<ToDo>
  export let planned: boolean = true
  export let isNew: boolean = false

  const client = getClient()
  let updating: Promise<any> | undefined = undefined

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

  function open (e: MouseEvent): void {
    showPanel(time.component.EditToDo, todo._id, todo._class, 'content')
  }

  $: isDone = todo.doneOn != null
</script>

<button
  class="hulyToDoLine-container"
  class:hovered
  class:isDone
  on:click|stopPropagation={open}
  on:contextmenu={(e) => {
    showMenu(e, { object: todo })
  }}
>
  <div class="flex-row-top flex-grow flex-gap-2">
    <div class="flex-row-center flex-no-shrink">
      <button class="hulyToDoLine-dragbox" class:isNew on:contextmenu={onMenuClick}>
        <Icon icon={IconMoreV2} size={'small'} />
      </button>
      <div class="hulyToDoLine-statusPriority">
        <div class="hulyToDoLine-checkbox" class:updating>
          {#if updating !== undefined}
            <Spinner size={'small'} />
          {:else}
            <ToDoCheckbox checked={isDone} priority={todo.priority} on:value={markDone} />
          {/if}
        </div>
        <ToDoPriorityPresenter value={todo.priority} muted={isDone} />
      </div>
    </div>
    <WorkItemPresenter {todo} kind={'todo-line'} withoutSpace />
    <div class="hulyToDoLine-title hulyToDoLine-top-align top-12 text-left font-regular-14 overflow-label">
      {todo.title}
    </div>
  </div>
  <div class="flex-row-top flex-no-shrink flex-gap-2">
    <div class="flex-row-center min-h-6 max-h-6 flex-gap-2">
      <Component
        is={tags.component.LabelsPresenter}
        props={{ object: todo, value: todo.labels, kind: 'todo-compact' }}
      />
    </div>
  </div>
  <div class="flex flex-no-shrink flex-gap-3 pl-2">
    {#if events.length > 0}
      <span class="hulyToDoLine-top-align top-12 font-regular-12 secondary-textColor">
        <ToDoDuration {events} />
      </span>
    {/if}
    {#if todo.dueDate}
      <span class="hulyToDoLine-top-align top-12 font-regular-12 secondary-textColor">
        {new Date(todo.dueDate).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
      </span>
    {/if}
  </div>
</button>
