<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Ref } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import type { TodoItem } from '@anticrm/task'
  import task from '@anticrm/task'
  import { Button, CheckBox, EditWithIcon, Icon, IconMoreH, Menu, Progress, showPopup } from '@anticrm/ui'
  import { HTMLPresenter } from '@anticrm/view-resources'

  import board from '../../plugin'
  import { getPopupAlignment } from '../../utils/PopupUtils'

  export let value: TodoItem
  const client = getClient()
  let checklistItems: TodoItem[] = []
  let done = 0
  let editingName: string | undefined = undefined
  let addingItemName: string | undefined = undefined
  let hovered: Ref<TodoItem> | undefined

  async function fetch () {
    checklistItems = await client.findAll(task.class.TodoItem, { space: value.space, attachedTo: value._id })
    done = checklistItems.reduce((result: number, current: TodoItem) => {
      return current.done ? result + 1 : result
    }, 0)
  }

  function deleteChecklist () {
    if (!value) {
      return
    }
    client.removeCollection(
      value._class,
      value.space,
      value._id,
      value.attachedTo,
      value.attachedToClass,
      value.collection
    )
  }

  function startAddingItem () {
    addingItemName = ''
  }

  async function addItem () {
    const item = {
      name: addingItemName ?? '',
      assignee: null,
      dueTo: null,
      done: false
    }
    addingItemName = undefined
    if (item.name.length <= 0) {
      return
    }
    await client.addCollection(task.class.TodoItem, value.space, value._id, value._class, 'items', item)
    fetch()
  }

  function updateName () {
    if (editingName !== undefined && editingName.length > 0 && editingName !== value.name) {
      value.name = editingName
      editingName = undefined
      client.update(value, { name: value.name })
    } else {
      editingName = undefined
    }
  }

  async function setDoneToChecklistItem (item: TodoItem, event: CustomEvent<boolean>) {
    const isDone = event.detail
    if (!value) {
      return
    }
    await client.update(item, { done: isDone })
    fetch()
  }

  function showItemMenu (item: TodoItem, e?: Event) {
    showPopup(
      Menu,
      {
        actions: [
          {
            label: board.string.Delete,
            action: async () => {
              await client.removeCollection(
                item._class,
                item.space,
                item._id,
                item.attachedTo,
                item.attachedToClass,
                item.collection
              )
              fetch()
            }
          }
        ]
      },
      getPopupAlignment(e)
    )
  }

  $: if (value?.items) {
    fetch()
  } else {
    checklistItems = []
    done = 0
  }
</script>

{#if value !== undefined}
  <div class="flex-col w-full">
    <div class="flex-row-stretch mt-4 mb-2">
      <div class="w-9">
        <Icon icon={board.icon.Card} size="large" />
      </div>
      {#if editingName !== undefined}
        <EditWithIcon bind:value={editingName} on:change={updateName} />
      {:else}
        <div
          class="flex-grow fs-title"
          on:click={() => {
            editingName = value.name ?? ''
          }}
        >
          {value.name}
        </div>
        <Button label={board.string.Delete} kind="no-border" size="small" on:click={deleteChecklist} />
      {/if}
    </div>
    <div class="flex-row-stretch mb-2 mt-1">
      <div class="w-9 text-sm pl-1 pr-1">
        {checklistItems.length > 0 ? Math.round((done / checklistItems.length) * 100) : 0}%
      </div>
      <div class="flex-center flex-grow w-full">
        <Progress min={0} max={checklistItems?.length ?? 0} value={done} />
      </div>
    </div>
    {#each checklistItems as item}
      <div
        class="flex-row-stretch mb-1 mt-1 pl-1 h-7 border-radius-1"
        class:background-button-noborder-bg-hover={hovered === item._id}
        on:mouseover={() => {
          hovered = item._id
        }}
        on:focus={() => {
          hovered = item._id
        }}
        on:mouseout={() => {
          hovered = undefined
        }}
        on:blur={() => {
          hovered = undefined
        }}
      >
        <div class="w-9 flex items-center">
          <CheckBox bind:checked={item.done} on:value={(event) => setDoneToChecklistItem(item, event)} />
        </div>
        <div class="flex-col justify-center flex-gap-1 w-full" class:text-line-through={item.done}>
          <HTMLPresenter bind:value={item.name} />
        </div>
        <div class="flex-center">
          <Button icon={IconMoreH} kind="transparent" size="small" on:click={(e) => showItemMenu(item, e)} />
        </div>
      </div>
    {/each}
    <div class="flex-row-stretch mt-2 mb-2">
      <div class="w-9" />
      {#if addingItemName !== undefined}
        <div class="w-full p-1">
          <EditWithIcon bind:value={addingItemName} on:change={addItem} />
        </div>
      {:else}
        <Button label={board.string.AddChecklistItem} kind="no-border" size="small" on:click={startAddingItem} />
      {/if}
    </div>
  </div>
{/if}
